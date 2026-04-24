import { supabase } from "../supabase";

export interface TeacherResourceItem {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  category: "curriculum" | "resource" | "example";
  description?: string;
  classKey?: string;
  objectPath?: string;
  subject?: string;
  gradeLabel?: string;
  unit?: string;
  keyConcepts?: string;
  importantExamples?: string;
  commonMisconceptions?: string;
  uploadedBy?: string;
}

export interface TeacherResourceMetadata {
  title: string;
  subject: string;
  gradeLabel: string;
  unit: string;
  description: string;
  keyConcepts: string;
  importantExamples: string;
  commonMisconceptions: string;
  classKey: string;
  category: TeacherResourceItem["category"];
  fileName: string;
  uploadedAt: string;
  uploadedBy?: string;
}

export const RESOURCE_METADATA_SUFFIX = "__meta.json";

export const SUPABASE_RESOURCE_BUCKET =
  (import.meta as any).env.VITE_SUPABASE_RESOURCE_BUCKET || "teacher-resources";

// 원본 파일명은 메타데이터에 보존. 저장소 키는 안전한 문자(영숫자, -, _)만 사용.
const safeExt = (fileName: string) => {
  const ext = fileName.split(".").pop() || "";
  return ext.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
};

export const buildResourceObjectPath = (
  classKey: string,
  category: TeacherResourceItem["category"],
  fileName: string,
) => {
  const ext = safeExt(fileName);
  const safeClass = (classKey || "all").replace(/[^a-zA-Z0-9-]/g, "-");
  return `${safeClass}__${category}__${Date.now()}${ext ? "." + ext : ""}`;
};

export const buildResourceMetadataPath = (objectPath: string) => `${objectPath}${RESOURCE_METADATA_SUFFIX}`;
export const isResourceMetadataPath = (path: string) => path.endsWith(RESOURCE_METADATA_SUFFIX);

export const parseResourceObjectPath = (path: string) => {
  if (isResourceMetadataPath(path)) return null;
  const parts = path.split("__");
  if (parts.length < 3) return null;
  const [classKey, category, timestampWithExt] = parts;
  const uploadedAt = timestampWithExt?.split(".")[0] || "";
  return {
    classKey,
    category: category as TeacherResourceItem["category"],
    uploadedAt,
    fileName: path,
  };
};

export const readResourceMetadata = async (objectPath: string) => {
  const { data, error } = await supabase.storage
    .from(SUPABASE_RESOURCE_BUCKET)
    .download(buildResourceMetadataPath(objectPath));

  if (error || !data) return null;

  try {
    return JSON.parse(await data.text()) as TeacherResourceMetadata;
  } catch {
    return null;
  }
};

export const writeResourceMetadata = async (objectPath: string, metadata: TeacherResourceMetadata) => {
  const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: "application/json;charset=utf-8" });
  const { error } = await supabase.storage
    .from(SUPABASE_RESOURCE_BUCKET)
    .upload(buildResourceMetadataPath(objectPath), blob, {
      contentType: "application/json;charset=utf-8",
      upsert: true,
    });

  if (error) throw error;
};

export const loadTeacherResourceCards = async () => {
  const { data, error } = await supabase.storage.from(SUPABASE_RESOURCE_BUCKET).list("", {
    limit: 200,
    sortBy: { column: "name", order: "desc" },
  });

  if (error) throw error;

  const cards = await Promise.all(
    (data || [])
      .filter((item) => item.name && !item.id?.startsWith?.("folder"))
      .filter((item) => !isResourceMetadataPath(item.name))
      .map(async (item) => {
        const parsed = parseResourceObjectPath(item.name);
        if (!parsed) return null;
        const metadata = await readResourceMetadata(item.name);
        return {
          id: item.id || item.name,
          name: metadata?.title || parsed.fileName,
          type: item.metadata?.mimetype || "application/octet-stream",
          size: Number(item.metadata?.size || 0),
          uploadedAt: metadata?.uploadedAt || item.created_at || new Date(Number(parsed.uploadedAt || Date.now())).toISOString(),
          category: metadata?.category || parsed.category,
          classKey: metadata?.classKey ? (metadata.classKey === "all" ? "" : metadata.classKey) : (parsed.classKey === "all" ? "" : parsed.classKey),
          objectPath: item.name,
          description: metadata?.description || "",
          subject: metadata?.subject || "",
          gradeLabel: metadata?.gradeLabel || "",
          unit: metadata?.unit || "",
          keyConcepts: metadata?.keyConcepts || "",
          importantExamples: metadata?.importantExamples || "",
          commonMisconceptions: metadata?.commonMisconceptions || "",
          uploadedBy: metadata?.uploadedBy || "",
        } satisfies TeacherResourceItem;
      }),
  );

  return cards.filter(Boolean) as TeacherResourceItem[];
};
