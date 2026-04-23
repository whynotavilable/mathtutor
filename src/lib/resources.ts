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
}

export const SUPABASE_RESOURCE_BUCKET =
  (import.meta as any).env.VITE_SUPABASE_RESOURCE_BUCKET || "teacher-resources";

export const buildResourceObjectPath = (
  classKey: string,
  category: TeacherResourceItem["category"],
  fileName: string,
) =>
  `${classKey || "all"}__${category}__${Date.now()}__${encodeURIComponent(fileName)}`;

export const parseResourceObjectPath = (path: string) => {
  const parts = path.split("__");
  if (parts.length < 4) return null;
  const [classKey, category, uploadedAt, ...nameParts] = parts;
  const fileName = decodeURIComponent(nameParts.join("__"));
  return {
    classKey,
    category: category as TeacherResourceItem["category"],
    uploadedAt,
    fileName,
  };
};
