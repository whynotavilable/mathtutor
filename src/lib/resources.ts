import { supabase } from "../supabase";

export interface TeacherResourceItem {
  id: string;
  name: string;
  fileName?: string;
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

export interface WeeklyResourcePlan {
  id: string;
  classKey: string;
  resourceObjectPath: string;
  resourceTitle: string;
  weekStartDate: string;
  weekEndDate: string;
  lessonStart: string;
  lessonEnd: string;
  pageStart: string;
  pageEnd: string;
  note: string;
  active: boolean;
  updatedAt: string;
}

export interface ResourcePageText {
  pageNumber: number;
  text: string;
}

export const RESOURCE_METADATA_SUFFIX = "__meta.json";
export const RESOURCE_PAGES_SUFFIX = "__pages.json";
export const WEEKLY_PLAN_PREFIX = "weekly-plans";

export const SUPABASE_RESOURCE_BUCKET =
  (import.meta as any).env.VITE_SUPABASE_RESOURCE_BUCKET || "teacher-resources";

// 원본 파일명은 메타데이터에 보존. 저장소 키는 안전한 문자(영숫자, -, _)만 사용.
const safeExt = (fileName: string) => {
  const ext = fileName.split(".").pop() || "";
  return ext.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
};

const safePathPart = (value: string) => (value || "all").replace(/[^a-zA-Z0-9-]/g, "-");

export const buildResourceObjectPath = (
  classKey: string,
  category: TeacherResourceItem["category"],
  fileName: string,
) => {
  const ext = safeExt(fileName);
  const safeClass = safePathPart(classKey || "all");
  return `${safeClass}__${category}__${Date.now()}${ext ? "." + ext : ""}`;
};

export const buildResourceMetadataPath = (objectPath: string) => `${objectPath}${RESOURCE_METADATA_SUFFIX}`;
export const buildResourcePagesPath = (objectPath: string) => `${objectPath}${RESOURCE_PAGES_SUFFIX}`;
export const isResourceMetadataPath = (path: string) => path.endsWith(RESOURCE_METADATA_SUFFIX);
export const isResourcePagesPath = (path: string) => path.endsWith(RESOURCE_PAGES_SUFFIX);
export const buildWeeklyPlanPath = (classKey: string) => `${WEEKLY_PLAN_PREFIX}/${safePathPart(classKey)}.json`;

export const parseResourceObjectPath = (path: string) => {
  if (isResourceMetadataPath(path) || isResourcePagesPath(path)) return null;
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
  const path = buildResourceMetadataPath(objectPath);
  const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: "application/json;charset=utf-8" });
  const { error: removeError } = await supabase.storage.from(SUPABASE_RESOURCE_BUCKET).remove([path]);
  if (removeError) console.warn("writeResourceMetadata: remove failed (may not exist yet):", removeError.message);
  const { error } = await supabase.storage
    .from(SUPABASE_RESOURCE_BUCKET)
    .upload(path, blob, { contentType: "application/json;charset=utf-8" });
  if (error) throw error;
};

export const readResourcePages = async (objectPath: string) => {
  const { data, error } = await supabase.storage
    .from(SUPABASE_RESOURCE_BUCKET)
    .download(buildResourcePagesPath(objectPath));

  if (error || !data) return [] as ResourcePageText[];

  try {
    const parsed = JSON.parse(await data.text());
    return Array.isArray(parsed) ? parsed as ResourcePageText[] : [];
  } catch {
    return [] as ResourcePageText[];
  }
};

export const writeResourcePages = async (objectPath: string, pages: ResourcePageText[]) => {
  const path = buildResourcePagesPath(objectPath);
  const blob = new Blob([JSON.stringify(pages, null, 2)], { type: "application/json;charset=utf-8" });
  const { error: removeError } = await supabase.storage.from(SUPABASE_RESOURCE_BUCKET).remove([path]);
  if (removeError) console.warn("writeResourcePages: remove failed (may not exist yet):", removeError.message);
  const { error } = await supabase.storage
    .from(SUPABASE_RESOURCE_BUCKET)
    .upload(path, blob, { contentType: "application/json;charset=utf-8" });
  if (error) throw error;
};

export const loadWeeklyResourcePlans = async (classKey: string) => {
  const { data, error } = await supabase.storage
    .from(SUPABASE_RESOURCE_BUCKET)
    .download(buildWeeklyPlanPath(classKey || "all"));

  if (error || !data) return [] as WeeklyResourcePlan[];

  try {
    const parsed = JSON.parse(await data.text());
    return Array.isArray(parsed) ? parsed as WeeklyResourcePlan[] : [];
  } catch {
    return [] as WeeklyResourcePlan[];
  }
};

export const writeWeeklyResourcePlans = async (classKey: string, plans: WeeklyResourcePlan[]) => {
  const path = buildWeeklyPlanPath(classKey || "all");
  const blob = new Blob([JSON.stringify(plans, null, 2)], { type: "application/json;charset=utf-8" });

  // Delete existing file first to avoid RLS UPDATE policy requirement when upserting
  const { error: removeError } = await supabase.storage.from(SUPABASE_RESOURCE_BUCKET).remove([path]);
  if (removeError) console.warn("writeWeeklyResourcePlans: remove failed (may not exist yet):", removeError.message);

  const { error } = await supabase.storage
    .from(SUPABASE_RESOURCE_BUCKET)
    .upload(path, blob, { contentType: "application/json;charset=utf-8" });

  if (error) throw error;
};

export const getActiveWeeklyResourcePlan = async (classKey: string, date = new Date()) => {
  const plans = await loadWeeklyResourcePlans(classKey);
  const today = date.toISOString().slice(0, 10);
  return plans
    .filter((plan) => plan.active)
    .filter((plan) => (!plan.weekStartDate || plan.weekStartDate <= today) && (!plan.weekEndDate || today <= plan.weekEndDate))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] || null;
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
      .filter((item) => !isResourcePagesPath(item.name))
      .map(async (item) => {
        const parsed = parseResourceObjectPath(item.name);
        if (!parsed) return null;
        const metadata = await readResourceMetadata(item.name);
        return {
          id: item.id || item.name,
          name: metadata?.title || parsed.fileName,
          fileName: metadata?.fileName || parsed.fileName,
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
