import { useState, useEffect, useRef, useCallback } from "react";
import { CalendarDays, Database, Edit3, RefreshCcw, Save, UploadCloud, X } from "lucide-react";
import { supabase } from "../../supabase";
import {
  TeacherResourceItem,
  TeacherResourceMetadata,
  WeeklyResourcePlan,
  WeeklyResourcePlanItem,
  SUPABASE_RESOURCE_BUCKET,
  buildResourceObjectPath,
  buildResourceMetadataPath,
  buildResourcePagesPath,
  getWeeklyPlanItems,
  loadTeacherResourceCards,
  loadWeeklyResourcePlans,
  writeResourceMetadata,
  writeResourcePages,
  writeWeeklyResourcePlans,
} from "../../lib/resources";
import { extractPdfPages } from "../../lib/pdfExtract";

type ResourceDraft = Pick<
  TeacherResourceMetadata,
  "title" | "subject" | "gradeLabel" | "unit" | "description"
>;

const emptyResourceDraft: ResourceDraft = {
  title: "",
  subject: "",
  gradeLabel: "",
  unit: "",
  description: "",
};

const defaultWeekRange = () => {
  const today = new Date();
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(today);
  start.setDate(today.getDate() + mondayOffset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
};

const isPdfFile = (file: File) => file.type.includes("pdf") || file.name.toLowerCase().endsWith(".pdf");

type PlanResourceDraft = WeeklyResourcePlanItem;

const TeacherResource = ({ selectedClassKey }: { selectedClassKey: string }) => {
  const [resources, setResources] = useState<TeacherResourceItem[]>([]);
  const [weeklyPlans, setWeeklyPlans] = useState<WeeklyResourcePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [processingObjectPath, setProcessingObjectPath] = useState<string | null>(null);
  const [storageError, setStorageError] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [editingObjectPath, setEditingObjectPath] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [resourceDraft, setResourceDraft] = useState<ResourceDraft>(emptyResourceDraft);
  const weekRange = defaultWeekRange();
  const [planDraft, setPlanDraft] = useState({
    selectedResourceObjectPath: "",
    resourceItems: [] as PlanResourceDraft[],
    weekStartDate: weekRange.start,
    weekEndDate: weekRange.end,
    lessonStart: "",
    lessonEnd: "",
    pageStart: "",
    pageEnd: "",
    note: "",
  });

  const currentClassKey = selectedClassKey || "all";
  const filteredResources = resources.filter((item) => !selectedClassKey || !item.classKey || item.classKey === selectedClassKey);
  const classPlans = weeklyPlans.filter((plan) => plan.classKey === currentClassKey);

  const fetchResources = async () => {
    setLoading(true);
    setStorageError("");
    try {
      const [cards, plans] = await Promise.all([
        loadTeacherResourceCards(),
        loadWeeklyResourcePlans(currentClassKey),
      ]);
      setResources(cards);
      setWeeklyPlans(plans);
    } catch (error: any) {
      setResources([]);
      setWeeklyPlans([]);
      setStorageError(
        `${error?.message || "교과자료 저장소를 불러오지 못했습니다."} Supabase Storage 버킷 '${SUPABASE_RESOURCE_BUCKET}'와 권한 설정을 확인해 주세요.`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [currentClassKey]);

  const resetDraft = () => {
    setResourceDraft(emptyResourceDraft);
    setPendingFiles([]);
    setEditingObjectPath(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const selectFiles = (files: FileList | null) => {
    if (!files?.length) return;
    setPendingFiles(Array.from(files));
  };

  const buildMetadata = (file: File, category: TeacherResourceItem["category"]): TeacherResourceMetadata => ({
    title: resourceDraft.title.trim() || file.name.replace(/\.[^.]+$/, ""),
    subject: resourceDraft.subject.trim(),
    gradeLabel: resourceDraft.gradeLabel.trim(),
    unit: resourceDraft.unit.trim(),
    description: resourceDraft.description.trim(),
    keyConcepts: "",
    importantExamples: "",
    commonMisconceptions: "",
    classKey: currentClassKey,
    category,
    fileName: file.name,
    uploadedAt: new Date().toISOString(),
    uploadedBy: "teacher",
  });

  const saveNewResources = async () => {
    if (!pendingFiles.length) {
      alert("먼저 업로드할 파일을 선택해 주세요.");
      return;
    }

    try {
      setUploading(true);
      setStorageError("");
      const uploadResults = await Promise.all(
        pendingFiles.map(async (file) => {
          const category: TeacherResourceItem["category"] =
            isPdfFile(file) ? "resource" : file.type.startsWith("image/") ? "example" : "curriculum";
          const objectPath = buildResourceObjectPath(currentClassKey, category, file.name);
          const { error } = await supabase.storage
            .from(SUPABASE_RESOURCE_BUCKET)
            .upload(objectPath, file, {
              contentType: file.type || "application/octet-stream",
              upsert: false,
            });

          if (error) throw error;
          await writeResourceMetadata(objectPath, buildMetadata(file, category));
          if (isPdfFile(file)) {
            const pages = await extractPdfPages(file);
            await writeResourcePages(objectPath, pages);
          }
          return objectPath;
        })
      );
      await fetchResources();
      resetDraft();
      alert(`${uploadResults.length}개 자료를 저장했습니다.`);
    } catch (error: any) {
      const message = error?.message || "자료 저장에 실패했습니다.";
      setStorageError(`${message} 저장소 버킷 '${SUPABASE_RESOURCE_BUCKET}'와 업로드 권한을 확인해 주세요.`);
      alert(message);
    } finally {
      setUploading(false);
    }
  };

  const startEditResource = (item: TeacherResourceItem) => {
    setEditingObjectPath(item.objectPath || null);
    setPendingFiles([]);
    setResourceDraft({
      title: item.name || "",
      subject: item.subject || "",
      gradeLabel: item.gradeLabel || "",
      unit: item.unit || "",
      description: item.description || "",
    });
  };

  const saveResourceEdit = async () => {
    const target = resources.find((item) => item.objectPath === editingObjectPath);
    if (!target?.objectPath) return;

    try {
      setUploading(true);
      setStorageError("");
      await writeResourceMetadata(target.objectPath, {
        title: resourceDraft.title.trim() || target.name,
        subject: resourceDraft.subject.trim(),
        gradeLabel: resourceDraft.gradeLabel.trim(),
        unit: resourceDraft.unit.trim(),
        description: resourceDraft.description.trim(),
        keyConcepts: target.keyConcepts || "",
        importantExamples: target.importantExamples || "",
        commonMisconceptions: target.commonMisconceptions || "",
        classKey: target.classKey || currentClassKey,
        category: target.category,
        fileName: target.fileName || target.name,
        uploadedAt: target.uploadedAt,
        uploadedBy: target.uploadedBy || "teacher",
      });
      await fetchResources();
      resetDraft();
      alert("자료 정보를 저장했습니다.");
    } catch (error: any) {
      const message = error?.message || "자료 정보 저장에 실패했습니다.";
      setStorageError(message);
      alert(message);
    } finally {
      setUploading(false);
    }
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    selectFiles(e.dataTransfer.files);
  }, []);

  const removeResource = async (item: TeacherResourceItem) => {
    if (!item.objectPath) return;
    const { error } = await supabase.storage.from(SUPABASE_RESOURCE_BUCKET).remove([
      item.objectPath,
      buildResourceMetadataPath(item.objectPath),
      buildResourcePagesPath(item.objectPath),
    ]);
    if (error) {
      setStorageError(error.message);
      alert(error.message || "자료 삭제에 실패했습니다.");
      return;
    }
    await fetchResources();
  };

  const downloadResource = async (item: TeacherResourceItem) => {
    if (!item.objectPath) return;
    const { data, error } = await supabase.storage.from(SUPABASE_RESOURCE_BUCKET).createSignedUrl(item.objectPath, 60);
    if (error || !data?.signedUrl) {
      setStorageError(error?.message || "다운로드 링크를 만들지 못했습니다.");
      alert(error?.message || "다운로드 링크를 만들지 못했습니다.");
      return;
    }

    const link = document.createElement("a");
    link.href = data.signedUrl;
    link.download = item.fileName || item.name;
    link.target = "_blank";
    link.rel = "noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const reprocessResourcePages = async (item: TeacherResourceItem) => {
    if (!item.objectPath) return;

    try {
      setProcessingObjectPath(item.objectPath);
      setStorageError("");
      const { data, error } = await supabase.storage.from(SUPABASE_RESOURCE_BUCKET).download(item.objectPath);
      if (error || !data) throw error || new Error("PDF 파일을 불러오지 못했습니다.");

      const pages = await extractPdfPages(data);
      await writeResourcePages(item.objectPath, pages);
      alert(`${pages.length}쪽의 PDF 텍스트를 다시 처리했습니다.`);
    } catch (error: any) {
      const message = error?.message || "PDF 텍스트 처리에 실패했습니다.";
      setStorageError(message);
      alert(message);
    } finally {
      setProcessingObjectPath(null);
    }
  };

  const addPlanResource = () => {
    const selectedResource = resources.find((item) => item.objectPath === planDraft.selectedResourceObjectPath);
    if (!selectedResource?.objectPath) return;
    if (planDraft.resourceItems.some((item) => item.resourceObjectPath === selectedResource.objectPath)) {
      alert("이미 추가된 자료입니다.");
      return;
    }

    setPlanDraft((prev) => ({
      ...prev,
      selectedResourceObjectPath: "",
      resourceItems: [
        ...prev.resourceItems,
        {
          resourceObjectPath: selectedResource.objectPath!,
          resourceTitle: selectedResource.name,
          pageStart: prev.pageStart,
          pageEnd: prev.pageEnd,
        },
      ],
    }));
  };

  const updatePlanResource = (resourceObjectPath: string, updates: Partial<PlanResourceDraft>) => {
    setPlanDraft((prev) => ({
      ...prev,
      resourceItems: prev.resourceItems.map((item) =>
        item.resourceObjectPath === resourceObjectPath ? { ...item, ...updates } : item,
      ),
    }));
  };

  const removePlanResource = (resourceObjectPath: string) => {
    setPlanDraft((prev) => ({
      ...prev,
      resourceItems: prev.resourceItems.filter((item) => item.resourceObjectPath !== resourceObjectPath),
    }));
  };

  const saveWeeklyPlan = async () => {
    if (planDraft.resourceItems.length === 0) {
      alert("이번 주에 사용할 자료를 하나 이상 추가해 주세요.");
      return;
    }
    if (planDraft.resourceItems.some((item) => !item.pageStart.trim() || !item.pageEnd.trim())) {
      alert("추가한 모든 자료의 페이지 범위를 입력해 주세요.");
      return;
    }

    try {
      setSavingPlan(true);
      setStorageError("");
      const primaryResource = planDraft.resourceItems[0];
      const nextPlan: WeeklyResourcePlan = {
        id: crypto.randomUUID(),
        classKey: currentClassKey,
        resourceObjectPath: primaryResource.resourceObjectPath,
        resourceTitle: planDraft.resourceItems.length > 1
          ? `${primaryResource.resourceTitle} 외 ${planDraft.resourceItems.length - 1}개`
          : primaryResource.resourceTitle,
        resourceItems: planDraft.resourceItems,
        weekStartDate: planDraft.weekStartDate,
        weekEndDate: planDraft.weekEndDate,
        lessonStart: planDraft.lessonStart.trim(),
        lessonEnd: planDraft.lessonEnd.trim(),
        pageStart: primaryResource.pageStart.trim(),
        pageEnd: primaryResource.pageEnd.trim(),
        note: planDraft.note.trim(),
        active: true,
        updatedAt: new Date().toISOString(),
      };
      const nextPlans = [nextPlan, ...weeklyPlans.map((plan) => ({ ...plan, active: false }))].filter((plan) => plan.classKey === currentClassKey);
      await writeWeeklyResourcePlans(currentClassKey, nextPlans);
      setWeeklyPlans(nextPlans);
      alert("이번 주 자료 계획을 저장했습니다.");
    } catch (error: any) {
      const message = error?.message || "주간 계획 저장에 실패했습니다.";
      setStorageError(message);
      alert(message);
    } finally {
      setSavingPlan(false);
    }
  };

  const activateWeeklyPlan = async (planId: string) => {
    const nextPlans = weeklyPlans.map((plan) => (
      plan.id === planId
        ? { ...plan, active: !plan.active, updatedAt: new Date().toISOString() }
        : { ...plan, active: false }
    ));
    await writeWeeklyResourcePlans(currentClassKey, nextPlans);
    setWeeklyPlans(nextPlans);
  };

  const removeWeeklyPlan = async (planId: string) => {
    const nextPlans = weeklyPlans.filter((plan) => plan.id !== planId);
    await writeWeeklyResourcePlans(currentClassKey, nextPlans);
    setWeeklyPlans(nextPlans);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-black text-ink uppercase tracking-tighter">교과자료 보관함</h2>
          <p className="text-xs font-bold text-secondary-text uppercase tracking-widest">
            {selectedClassKey ? `${selectedClassKey.replace("-", "학년 ")}반 자료` : "전체 학급 자료"}
          </p>
        </div>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => selectFiles(e.target.files)} />
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="rounded-xl border border-highlight bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-ink">{editingObjectPath ? "자료 정보 수정" : "자료 저장"}</h3>
              <p className="mt-2 text-xs font-semibold text-secondary-text">
                파일을 먼저 대기 목록에 올린 뒤, 입력한 정보와 함께 저장합니다.
              </p>
            </div>
            {editingObjectPath && (
              <button onClick={resetDraft} className="cursor-pointer rounded-xl border border-highlight p-2 text-secondary-text hover:text-accent">
                <X size={16} />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input value={resourceDraft.title} onChange={(e) => setResourceDraft((prev) => ({ ...prev, title: e.target.value }))} placeholder="자료 제목" className="rounded-xl border border-highlight bg-paper px-4 py-3 text-sm font-semibold outline-none" />
            <input value={resourceDraft.subject} onChange={(e) => setResourceDraft((prev) => ({ ...prev, subject: e.target.value }))} placeholder="과목" className="rounded-xl border border-highlight bg-paper px-4 py-3 text-sm font-semibold outline-none" />
            <input value={resourceDraft.gradeLabel} onChange={(e) => setResourceDraft((prev) => ({ ...prev, gradeLabel: e.target.value }))} placeholder="학년 (예: 1학년)" className="rounded-xl border border-highlight bg-paper px-4 py-3 text-sm font-semibold outline-none" />
            <input value={resourceDraft.unit} onChange={(e) => setResourceDraft((prev) => ({ ...prev, unit: e.target.value }))} placeholder="단원" className="rounded-xl border border-highlight bg-paper px-4 py-3 text-sm font-semibold outline-none" />
          </div>
          <textarea value={resourceDraft.description} onChange={(e) => setResourceDraft((prev) => ({ ...prev, description: e.target.value }))} placeholder="자료 설명" className="h-16 w-full rounded-xl border border-highlight bg-paper p-3 text-sm font-semibold outline-none resize-none" />

          {!editingObjectPath && (
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => !uploading && inputRef.current?.click()}
              className={`flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 transition-all
                ${isDragOver ? "border-accent bg-accent/5 scale-[1.01]" : "border-highlight bg-paper hover:border-accent hover:bg-white"}
                ${uploading ? "cursor-not-allowed opacity-60" : ""}
              `}
            >
              <UploadCloud size={28} className={isDragOver ? "text-accent" : "text-secondary-text"} />
              <div className="text-center">
                <p className="text-sm font-black text-ink">
                  {isDragOver ? "여기에 놓으세요" : pendingFiles.length ? `${pendingFiles.length}개 파일이 저장 대기 중입니다.` : "파일을 여기에 끌어다 놓거나"}
                </p>
                <p className="mt-1 text-xs font-bold text-accent underline underline-offset-2">클릭해서 선택</p>
                <p className="mt-2 text-[11px] font-semibold text-secondary-text">드롭만으로는 업로드되지 않습니다. 아래 저장 버튼을 눌러야 반영됩니다.</p>
              </div>
            </div>
          )}

          {pendingFiles.length > 0 && (
            <div className="rounded-xl border border-highlight bg-paper p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-secondary-text">저장 대기 파일</p>
              <div className="mt-3 space-y-2">
                {pendingFiles.map((file) => (
                  <div key={`${file.name}-${file.size}`} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs font-bold text-ink">
                    <span>{file.name}</span>
                    <span className="text-secondary-text">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={editingObjectPath ? saveResourceEdit : saveNewResources}
              disabled={uploading || (!editingObjectPath && pendingFiles.length === 0)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-md transition-all hover:bg-sidebar disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={16} />
              {uploading ? "저장 중..." : editingObjectPath ? "자료 정보 저장" : "파일과 정보 저장"}
            </button>
            <button onClick={resetDraft} className="cursor-pointer rounded-xl border border-highlight px-5 py-3 text-xs font-black uppercase tracking-widest text-secondary-text">
              초기화
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-highlight bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <CalendarDays size={22} className="text-accent" />
              <div>
                <h3 className="text-lg font-black text-ink">이번 주 사용 계획</h3>
                <p className="text-xs font-semibold text-secondary-text">요일 구분 없이 차시와 페이지 범위를 지정합니다.</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <select value={planDraft.selectedResourceObjectPath} onChange={(e) => setPlanDraft((prev) => ({ ...prev, selectedResourceObjectPath: e.target.value }))} className="min-w-0 flex-1 rounded-xl border border-highlight bg-paper px-4 py-3 text-sm font-semibold outline-none">
                  <option value="">이번 주에 사용할 자료 선택</option>
                  {filteredResources.map((item) => (
                    <option key={item.objectPath} value={item.objectPath}>{item.name}</option>
                  ))}
                </select>
                <button
                  onClick={addPlanResource}
                  disabled={!planDraft.selectedResourceObjectPath}
                  className="cursor-pointer rounded-xl border border-highlight px-4 py-3 text-xs font-black text-accent transition-all hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  자료 추가
                </button>
              </div>
              {planDraft.resourceItems.length > 0 && (
                <div className="space-y-2 rounded-xl border border-highlight bg-paper p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-secondary-text">선택 자료와 페이지 범위</p>
                  {planDraft.resourceItems.map((item) => (
                    <div key={item.resourceObjectPath} className="grid grid-cols-1 gap-2 rounded-xl bg-white p-3 sm:grid-cols-[minmax(0,1fr)_90px_90px_auto] sm:items-center">
                      <p className="min-w-0 truncate text-xs font-black text-ink">{item.resourceTitle}</p>
                      <input
                        value={item.pageStart}
                        onChange={(e) => updatePlanResource(item.resourceObjectPath, { pageStart: e.target.value })}
                        placeholder="시작 쪽"
                        className="rounded-lg border border-highlight bg-paper px-3 py-2 text-xs font-semibold outline-none"
                      />
                      <input
                        value={item.pageEnd}
                        onChange={(e) => updatePlanResource(item.resourceObjectPath, { pageEnd: e.target.value })}
                        placeholder="끝 쪽"
                        className="rounded-lg border border-highlight bg-paper px-3 py-2 text-xs font-semibold outline-none"
                      />
                      <button
                        onClick={() => removePlanResource(item.resourceObjectPath)}
                        className="cursor-pointer rounded-lg border border-highlight px-3 py-2 text-xs font-black text-red-500 hover:bg-red-50"
                      >
                        제거
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <input type="date" value={planDraft.weekStartDate} onChange={(e) => setPlanDraft((prev) => ({ ...prev, weekStartDate: e.target.value }))} className="rounded-xl border border-highlight bg-paper px-4 py-3 text-sm font-semibold outline-none" />
                <input type="date" value={planDraft.weekEndDate} onChange={(e) => setPlanDraft((prev) => ({ ...prev, weekEndDate: e.target.value }))} className="rounded-xl border border-highlight bg-paper px-4 py-3 text-sm font-semibold outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input value={planDraft.lessonStart} onChange={(e) => setPlanDraft((prev) => ({ ...prev, lessonStart: e.target.value }))} placeholder="시작 차시 예: 3" className="rounded-xl border border-highlight bg-paper px-4 py-3 text-sm font-semibold outline-none" />
                <input value={planDraft.lessonEnd} onChange={(e) => setPlanDraft((prev) => ({ ...prev, lessonEnd: e.target.value }))} placeholder="끝 차시 예: 7" className="rounded-xl border border-highlight bg-paper px-4 py-3 text-sm font-semibold outline-none" />
              </div>
              <textarea value={planDraft.note} onChange={(e) => setPlanDraft((prev) => ({ ...prev, note: e.target.value }))} placeholder="이번 주 운영 지침" className="h-24 w-full rounded-xl border border-highlight bg-paper p-4 text-sm font-semibold outline-none resize-none" />
              <button onClick={saveWeeklyPlan} disabled={savingPlan} className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-sidebar px-5 py-3 text-xs font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-50">
                <Save size={16} />
                {savingPlan ? "저장 중..." : "주간 계획 저장"}
              </button>
            </div>
          </div>

          <div className="bg-sidebar text-white p-8 rounded-xl relative overflow-hidden shadow-lg">
            <Database size={32} className="mb-6 opacity-40" />
            <h3 className="text-lg font-black mb-3 uppercase tracking-tighter">자료 활용 가이드</h3>
            <p className="text-white/70 text-xs leading-relaxed font-medium">
              자료는 저장 버튼을 누를 때만 업로드됩니다. 주간 계획은 학생 채팅 프롬프트에 반영되어 해당 자료와 페이지 범위를 우선 사용하게 합니다.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-highlight bg-paper px-5 py-4">
        <div>
          <p className="text-xs font-black tracking-widest text-secondary-text uppercase">저장 위치</p>
          <p className="text-sm font-bold text-ink">Supabase Storage / {SUPABASE_RESOURCE_BUCKET}</p>
        </div>
        <button onClick={fetchResources} className="inline-flex cursor-pointer items-center gap-2 px-4 py-2 rounded-xl border border-highlight text-xs font-black text-accent">
          <RefreshCcw size={14} />
          새로고침
        </button>
      </div>

      {storageError && <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-600">{storageError}</div>}

      <div className="grid gap-4">
        <h3 className="text-lg font-black text-ink">활성 주간 계획</h3>
        {classPlans.map((plan) => {
          const planItems = getWeeklyPlanItems(plan);
          return (
            <div key={plan.id} className="rounded-xl border border-highlight bg-white p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-black text-ink">{plan.resourceTitle}</p>
                  <p className="mt-1 text-xs font-bold text-secondary-text">
                    {plan.weekStartDate} ~ {plan.weekEndDate} / {plan.lessonStart || "?"}~{plan.lessonEnd || "?"}차시
                  </p>
                  <div className="mt-3 space-y-2">
                    {planItems.map((item) => (
                      <div key={item.resourceObjectPath} className="rounded-xl bg-paper px-4 py-2 text-xs font-bold text-ink">
                        {item.resourceTitle} / {item.pageStart}~{item.pageEnd}쪽
                      </div>
                    ))}
                  </div>
                  {plan.note && <p className="mt-3 rounded-xl bg-paper px-4 py-3 text-sm font-semibold text-ink">{plan.note}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => activateWeeklyPlan(plan.id)} className={`cursor-pointer px-4 py-2 rounded-xl border text-xs font-black ${plan.active ? "border-accent bg-accent text-white" : "border-highlight text-accent hover:border-accent"}`}>
                    {plan.active ? "활성 해제" : "활성화"}
                  </button>
                  <button onClick={() => removeWeeklyPlan(plan.id)} className="cursor-pointer px-4 py-2 rounded-xl border border-highlight text-xs font-black text-red-500 hover:bg-red-50">삭제</button>
                </div>
              </div>
            </div>
          );
        })}
        {classPlans.length === 0 && <div className="bg-white rounded-xl border border-highlight p-8 text-center text-sm font-bold text-gray-400">저장된 주간 계획이 없습니다.</div>}
      </div>

      <div className="grid gap-4">
        <h3 className="text-lg font-black text-ink">저장된 자료</h3>
        {loading && <div className="bg-white rounded-xl border border-highlight p-10 text-center text-sm font-bold text-gray-400">저장소 자료를 불러오는 중입니다.</div>}
        {filteredResources.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-highlight p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-black text-ink">{item.name}</p>
                <p className="text-[10px] font-bold text-secondary-text">
                  {new Date(item.uploadedAt).toLocaleString()} / {(item.size / 1024).toFixed(1)} KB / {item.classKey || "전체"} / {item.category === "curriculum" ? "교육과정" : item.category === "example" ? "예시 문항" : "교과자료"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => startEditResource(item)} className="inline-flex cursor-pointer items-center gap-2 px-4 py-2 rounded-xl border border-highlight text-xs font-black text-accent"><Edit3 size={14} />정보 수정</button>
                {item.category === "resource" && (
                  <button
                    onClick={() => reprocessResourcePages(item)}
                    disabled={processingObjectPath === item.objectPath}
                    className="cursor-pointer px-4 py-2 rounded-xl border border-highlight text-xs font-black text-accent disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {processingObjectPath === item.objectPath ? "처리 중..." : "PDF 텍스트 재처리"}
                  </button>
                )}
                <button onClick={() => downloadResource(item)} className="cursor-pointer px-4 py-2 rounded-xl border border-highlight text-xs font-black text-accent">다운로드</button>
                <button onClick={() => removeResource(item)} className="cursor-pointer px-4 py-2 rounded-xl border border-highlight text-xs font-black text-red-500 hover:bg-red-50">삭제</button>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {item.subject && <div className="rounded-xl border border-highlight bg-paper px-4 py-3 text-sm font-semibold text-ink">과목: {item.subject}</div>}
              {item.unit && <div className="rounded-xl border border-highlight bg-paper px-4 py-3 text-sm font-semibold text-ink">단원: {item.unit}</div>}
              {item.description && <div className="rounded-xl border border-highlight bg-paper px-4 py-3 text-sm font-semibold text-ink md:col-span-2">자료 설명: {item.description}</div>}
            </div>
          </div>
        ))}
        {!loading && filteredResources.length === 0 && <div className="bg-white rounded-xl border border-highlight p-10 text-center text-sm font-bold text-gray-400">업로드된 자료가 없습니다.</div>}
      </div>
    </div>
  );
};

export default TeacherResource;
