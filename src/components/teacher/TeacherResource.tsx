import { useState, useEffect, useRef } from "react";
import { Plus, Database, RefreshCcw } from "lucide-react";
import { supabase } from "../../supabase";
import { TeacherResourceItem, SUPABASE_RESOURCE_BUCKET, buildResourceObjectPath, parseResourceObjectPath } from "../../lib/resources";

const TeacherResource = ({ selectedClassKey }: { selectedClassKey: string }) => {
  const [resources, setResources] = useState<TeacherResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [storageError, setStorageError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filteredResources = resources.filter((item) => !selectedClassKey || !item.classKey || item.classKey === selectedClassKey);

  const fetchResources = async () => {
    setLoading(true);
    setStorageError("");
    const { data, error } = await supabase.storage.from(SUPABASE_RESOURCE_BUCKET).list("", {
      limit: 200,
      sortBy: { column: "name", order: "desc" },
    });

    if (error) {
      setResources([]);
      setStorageError(
        `교과자료 저장소를 불러오지 못했습니다. Supabase Storage 버킷 '${SUPABASE_RESOURCE_BUCKET}'과 접근 정책을 확인해주세요.`
      );
      setLoading(false);
      return;
    }

    const mappedResources = (data || [])
      .filter((item) => item.name && !item.id?.startsWith?.("folder"))
      .map((item) => {
        const parsed = parseResourceObjectPath(item.name);
        if (!parsed) return null;
        return {
          id: item.id || item.name,
          name: parsed.fileName,
          type: item.metadata?.mimetype || "application/octet-stream",
          size: Number(item.metadata?.size || 0),
          uploadedAt: item.created_at || new Date(Number(parsed.uploadedAt || Date.now())).toISOString(),
          category: parsed.category,
          classKey: parsed.classKey === "all" ? "" : parsed.classKey,
          objectPath: item.name,
        } satisfies TeacherResourceItem;
      })
      .filter(Boolean) as TeacherResourceItem[];

    setResources(mappedResources);
    setLoading(false);
  };

  useEffect(() => {
    fetchResources();
  }, []);

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
          return objectPath;
        })
      );
      await fetchResources();
      alert(`${uploadResults.length}개 파일을 업로드했습니다.`);
    } catch (error: any) {
      const message = error?.message || "파일 업로드에 실패했습니다.";
      setStorageError(
        `${message} 저장소 버킷 '${SUPABASE_RESOURCE_BUCKET}'이 준비되어 있고 업로드 정책이 허용되는지 확인해주세요.`
      );
      alert(message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeResource = async (item: TeacherResourceItem) => {
    if (!item.objectPath) return;
    const { error } = await supabase.storage.from(SUPABASE_RESOURCE_BUCKET).remove([item.objectPath]);
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
          <p className="text-xs font-bold text-secondary-text uppercase tracking-widest">{selectedClassKey ? `${selectedClassKey.replace("-", "학년 ")}반 자료` : "전체 학급 자료"}</p>
        </div>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <button onClick={() => inputRef.current?.click()} className="p-10 border-2 border-dashed border-highlight rounded-xl bg-white flex flex-col items-center justify-center text-center gap-4 hover:border-accent hover:bg-paper transition-all cursor-pointer group shadow-sm">
          <div className="w-14 h-14 bg-paper group-hover:bg-accent group-hover:text-white rounded-full flex items-center justify-center text-accent transition-all border border-highlight">
            <Plus size={24} />
          </div>
          <div>
            <h4 className="font-black text-sm mb-1 text-ink uppercase tracking-tight">{uploading ? "업로드 중..." : "새 자료 업로드"}</h4>
            <p className="text-[10px] text-secondary-text font-bold">PDF, 이미지, 문제지, 수업안 파일 업로드</p>
          </div>
        </button>

        <div className="bg-sidebar text-white p-8 rounded-xl relative overflow-hidden flex flex-col justify-between shadow-lg">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
          <Database size={32} className="mb-6 opacity-40" />
          <div>
            <h3 className="text-lg font-black mb-3 uppercase tracking-tighter">자료 활용 가이드</h3>
            <p className="text-white/70 text-xs mb-6 leading-relaxed font-medium">
              업로드한 자료를 학급별로 정리하고, 예시 문항이나 수업 자료의 원본으로 다시 활용할 수 있습니다.
            </p>
            <div className="flex flex-wrap gap-2">
              {["문항 예시", "개념 자료", "수업 자료"].map((t) => (
                <span key={t} className="bg-white/10 text-[9px] font-black px-3 py-1.5 rounded border border-white/20 uppercase tracking-widest">{t}</span>
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
        <button
          onClick={fetchResources}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-highlight text-xs font-black text-accent"
        >
          <RefreshCcw size={14} />
          새로고침
        </button>
      </div>

      {storageError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-bold text-red-600">
          {storageError}
        </div>
      )}

      <div className="grid gap-4">
        {loading && (
          <div className="bg-white rounded-xl border border-highlight p-10 text-center text-sm font-bold text-gray-400">
            저장소 자료를 불러오는 중입니다.
          </div>
        )}
        {filteredResources.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-highlight p-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black text-ink">{item.name}</p>
              <p className="text-[10px] font-bold text-secondary-text">
                {new Date(item.uploadedAt).toLocaleString()} / {(item.size / 1024).toFixed(1)} KB / {item.classKey || "전체"} / {
                  item.category === "curriculum" ? "교육과정" : item.category === "example" ? "예시 문항" : "교과자료"
                }
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => downloadResource(item)} className="px-4 py-2 rounded-xl border border-highlight text-xs font-black text-accent">다운로드</button>
              <button onClick={() => removeResource(item)} className="px-4 py-2 rounded-xl border border-highlight text-xs font-black text-red-500">삭제</button>
            </div>
          </div>
        ))}
        {!loading && filteredResources.length === 0 && (
          <div className="bg-white rounded-xl border border-highlight p-10 text-center text-sm font-bold text-gray-400">
            업로드된 자료가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherResource;
