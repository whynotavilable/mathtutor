import { UserProfile } from "./ai";

export const ADMIN_EMAIL = "shsla61@gmail.com";

export const isAdminUser = (profile: UserProfile | null) =>
  (profile?.email || "").toLowerCase() === ADMIN_EMAIL;

export const getClassKey = (user: Pick<UserProfile, "grade" | "class">) =>
  user.grade && user.class ? `${user.grade}-${user.class}` : "";

export const getClassLabel = (user: Pick<UserProfile, "grade" | "class">) =>
  user.grade && user.class ? `${user.grade}학년 ${user.class}반` : "미지정";

export const isTeacherVisibleStudent = (student: UserProfile) => {
  const email = (student.email || "").toLowerCase();
  const name = (student.name || "").trim();
  if (email.endsWith("@example.com")) return false;
  if (email.startsWith("codex.")) return false;
  if (/^\?+$/.test(name)) return false;
  return true;
};
