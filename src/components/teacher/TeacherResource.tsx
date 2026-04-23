import { useState, useEffect, useRef } from "react";
import { Plus, Database, RefreshCcw } from "lucide-react";
import { supabase } from "../../supabase";
import {
  TeacherResourceItem,
  TeacherResourceMetadata,
  SUPABASE_RESOURCE_BUCKET,
  buildResourceObjectPath,
  buildResourceMetadataPath,
  loadTeacherResourceCards,
  writeResourceMetadata,
} from "../../lib/resources";

const TeacherResource = ({ selectedClassKey }: { selectedClassKey: string }) => {
  const [resources, setResources] = useState<TeacherResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [storageError, setStorageError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [resourceDraft, setResourceDraft] = useState({
    title: "",
    subject: "",
    gradeLabel: "",
    unit: "",
    description: "",
    keyConcepts: "",
    importantExamples: "",
    commonMisconceptions: "",
  });

  const filteredResources = resources.filter((item) => !selectedClassKey || !item.classKey || item.classKey === selectedClassKey);

  const fetchResources = async () => {
    setLoading(true);
    setStorageError("");
    try {
      const cards = await loadTeacherResourceCards();
      setResources(cards);
    } catch (error: any) {
      setResources([]);
      setStorageError(
        `${error?.message || "교과자료 저장소를 불러오지 못했습니다."} Supabase Storage 버킷 '${SUPABASE_RESOURCE_BUCKET}'와 권한 설정을 확인해 주세요.`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const resetDraft = () => {
    setResourceDraft({
      title: "",
      subject: "",
      gradeLabel: "",
      unit: "",
      description: "",
      keyConcepts: "",
      importantExamples: "",
      commonMisconceptions: "",
    });
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    try {
      setUploading(true);
      setStorageError("");
      const uploadResults = await Promise.all(
        Array.from(files).map(async (file) => {
          const category: TeacherResourceItem["category"] =
            file.type.includes("pdf") ? "resource" : file.type.startsWith("image/") ? "example" : "curriculum";
          const objectPath = buildResourceObjectPath(selectedClassKey || "all", category, file.name);
          const { error } = await supabase.storage
            .from(SUPABASE_RESOURCE_BUCKET)
            .upload(objectPath, file, {
              contentType: file.type || "application/octet-stream",
              upsert: false,
            });

          if (error) throw error;

          const metadata: TeacherResourceMetadata = {
            title: resourceDraft.title.trim() || file.name.replace(/\.[^.]+$/, ""),
            subject: resourceDraft.subject.trim(),
            gradeLabel: resourceDraft.gradeLabel.trim(),
            unit: resourceDraft.unit.trim(),
            description: resourceDraft.description.trim(),
            keyConcepts: resourceDraft.keyConcepts.trim(),
            importantExamples: resourceDraft.importantExamples.trim(),
            commonMisconceptions: resourceDraft.commonMisconceptions.trim(),
            classKey: selectedClassKey || "all",
            category,
            fileName: file.name,
            uploadedAt: new Date().toISOString(),
            uploadedBy: "teacher",
          };
          await writeResourceMetadata(objectPath, metadata);
          return objectPath;
        })
      );
      await fetchResources();
      resetDraft();
      alert(`${uploadResults.length}개 파일을 업로드했습니다.`);
    } catch (error: any) {
      const message = error?.message || "파일 업로드에 실패했습니다.";
      setStorageError(`${message} 저장소 버킷 '${SUPABASE_RESOURCE_BUCKET}'와 업로드 권한을 확인해 주세요.`);
      alert(message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeResource = async (item: TeacherResourceItem) => {
    if (!item.objectPath) return;
    const { error } = await supabase.storage.from(SUPABASE_RESOURCE_BUCKET).remove([
      item.objectPath,
      buildResourceMetadataPath(item.objectPath),
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
    link.download = item.name;
    link.target = "_blank";
    link.rel = "noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-black text-ink uppercase tracking-tighter">교과자료 보관함</h2>
          <p className="text-xs font-bold text-secondary-text uppercase tracking-widest">
            {selectedClassKey ? `${selectedClassKey.replace("-", "학년 ")}반 자료` : "전체 학급 자료"}
          </p>
        </div>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-xl border border-highlight bg-white p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-lg font-black text-ink">자료 업로드 메타데이터</h3>
            <p className="mt-2 text-xs font-semibold text-secondary-text">교사가 직접 적은 핵심 개념과 오개념이 교사 채팅의 1차 근거로 사용됩니다.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <input value={resourceDraft.title} onChange={(e) => setResourceDraft((prev) => ({ ...prev, title: e.target.value }))} placeholder="자료 제목" className="rounded-xl border border-highlight bg-paper px-4 py-3 text-sm font-semibold outline-none" />
            <input value={resourceDraft.subject} onChange={(e) => setResourceDraft((prev) => ({ ...prev, subject: e.target.value }))} placeholder="과목" className="rounded-xl border border-highlight bg-paper px-4 py-3 text-sm font-semibold outline-none" />
            <input value={resourceDraft.gradeLabel} onChange={(e) => setResourceDraft((prev) => ({ ...prev, gradeLabel: e.target.value }))} placeholder="학년 (예: 3학년)" className="rounded-xl border border-highlight bg-paper px-4 py-3 text-sm font-semibold outline-none" />
            <input value={resourceDraft.unit} onChange={(e) => setResourceDraft((prev) => ({ ...prev, unit: e.target.value }))} placeholder="단원" className="rounded-xl border border-highlight bg-paper px-4 py-3 text-sm font-semibold outline-none" />
          </div>
          <textarea value={resourceDraft.description} onChange={(e) => setResourceDraft((prev) => ({ ...prev, description: e.target.value }))} placeholder="자료 설명" className="h-24 w-full rounded-xl border border-highlight bg-paper p-4 text-sm font-semibold outline-none resize-none" />
          <textarea value={resourceDraft.keyConcepts} onChange={(e) => setResourceDraft((prev) => ({ ...prev, keyConcepts: e.target.value }))} placeholder="핵심 개념" className="h-24 w-full rounded-xl border border-highlight bg-paper p-4 text-sm font-semibold outline-none resize-none" />
          <textarea value={resourceDraft.importantExamples} onChange={(e) => setResourceDraft((prev) => ({ ...prev, importantExamples: e.target.value }))} placeholder="중요 문제/예시" className="h-24 w-full rounded-xl border border-highlight bg-paper p-4 text-sm font-semibold outline-none resize-none" />
          <textarea value={resourceDraft.commonMisconceptions} onChange={(e) => setResourceDraft((prev) => ({ ...prev, commonMisconceptions: e.target.value }))} placeholder="자주 나오는 오개념" className="h-24 w-full rounded-xl border border-highlight bg-paper p-4 text-sm font-semibold outline-none resize-none" />
          <button onClick={() => inputRef.current?.click()} className="inline-flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-highlight bg-paper px-6 py-5 text-sm font-black text-accent transition-all hover:border-accent hover:bg-white">
            <Plus size={18} />
            {uploading ? "업로드 중..." : "자료 파일 선택"}
          </button>
        </div>

        <div className="bg-sidebar text-white p-8 rounded-xl relative overflow-hidden flex flex-col justify-between shadow-lg">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
          <Database size={32} className="mb-6 opacity-40" />
          <div>
            <h3 className="text-lg font-black mb-3 uppercase tracking-tighter">자료 활용 가이드</h3>
            <p className="text-white/70 text-xs mb-6 leading-relaxed font-medium">
              업로드한 PDF 원문과 함께 핵심 개념, 중요 예시, 오개념 메모가 저장됩니다. 교사 채팅은 이 메타데이터를 먼저 읽고 수업 개입안을 제안합니다.
            </p>
            <div className="flex flex-wrap gap-2">
              {['핵심 개념', '중요 문제/예시', '오개념 메모'].map((tag) => (
                <span key={tag} className="bg-white/10 text-[9px] font-black px-3 py-1.5 rounded border border-white/20 uppercase tracking-widest">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-highlight bg-paper px-5 py-4">
        <div>
          <p className="text-xs font-black tracking-widest text-secondary-text uppercase">저장 위치</p>
          <p className="text-sm font-bold text-ink">Supabase Storage / {SUPABASE_RESOURCE_BUCKET}</p>
        </div>
        <button onClick={fetchResources} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-highlight text-xs font-black text-accent">
          <RefreshCcw size={14} />
          새로고침
        </button>
      </div>

      {storageError && <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-600">{storageError}</div>}

      <div className="grid gap-4">
        {loading && <div className="bg-white rounded-xl border border-highlight p-10 text-center text-sm font-bold text-gray-400">저장소 자료를 불러오는 중입니다.</div>}
        {filteredResources.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-highlight p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-black text-ink">{item.name}</p>
                <p className="text-[10px] font-bold text-secondary-text">
                  {new Date(item.uploadedAt).toLocaleString()} / {(item.size / 1024).toFixed(1)} KB / {item.classKey || '전체'} / {item.category === 'curriculum' ? '교육과정' : item.category === 'example' ? '예시 문항' : '교과자료'}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => downloadResource(item)} className="px-4 py-2 rounded-xl border border-highlight text-xs font-black text-accent">다운로드</button>
                <button onClick={() => removeResource(item)} className="px-4 py-2 rounded-xl border border-highlight text-xs font-black text-red-500">삭제</button>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {item.subject && <div className="rounded-xl border border-highlight bg-paper px-4 py-3 text-sm font-semibold text-ink">과목: {item.subject}</div>}
              {item.unit && <div className="rounded-xl border border-highlight bg-paper px-4 py-3 text-sm font-semibold text-ink">단원: {item.unit}</div>}
              {item.description && <div className="rounded-xl border border-highlight bg-paper px-4 py-3 text-sm font-semibold text-ink md:col-span-2">자료 설명: {item.description}</div>}
              {item.keyConcepts && <div className="rounded-xl border border-highlight bg-paper px-4 py-3 text-sm font-semibold text-ink">핵심 개념: {item.keyConcepts}</div>}
              {item.importantExamples && <div className="rounded-xl border border-highlight bg-paper px-4 py-3 text-sm font-semibold text-ink">중요 문제/예시: {item.importantExamples}</div>}
              {item.commonMisconceptions && <div className="rounded-xl border border-highlight bg-paper px-4 py-3 text-sm font-semibold text-ink md:col-span-2">자주 나오는 오개념: {item.commonMisconceptions}</div>}
            </div>
          </div>
        ))}
        {!loading && filteredResources.length === 0 && <div className="bg-white rounded-xl border border-highlight p-10 text-center text-sm font-bold text-gray-400">업로드된 자료가 없습니다.</div>}
      </div>
    </div>
  );
};

export default TeacherResource;
