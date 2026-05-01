import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL = "shsla61@gmail.com";

const getEnv = (name: string) => {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : "";
};

const parseBody = (body: unknown) => {
  if (!body) return {};
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }
  return body as Record<string, unknown>;
};

const removeStudentHistoryFiles = async (supabaseAdmin: any, accountId: string) => {
  const bucketName = getEnv("SUPABASE_HISTORY_BUCKET") || getEnv("VITE_SUPABASE_HISTORY_BUCKET") || "student-history";
  const bucket = supabaseAdmin.storage.from(bucketName);
  const paths = [`${accountId}/profile.md`, `${accountId}/timeline.md`];
  const { data } = await bucket.list(`${accountId}/sessions`, { limit: 1000 });

  if (data?.length) {
    paths.push(...data.filter((item) => item.name).map((item) => `${accountId}/sessions/${item.name}`));
  }

  if (paths.length > 0) {
    await bucket.remove(paths);
  }
};

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const supabaseUrl = getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL");
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({
      error: "계정 삭제 API 설정이 필요합니다. Vercel 환경변수에 SUPABASE_SERVICE_ROLE_KEY를 추가해 주세요.",
    });
  }

  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : "";
  if (!token) {
    return res.status(401).json({ error: "Missing authorization token." });
  }

  const body = parseBody(req.body);
  const accountId = typeof body.accountId === "string" ? body.accountId : "";
  if (!accountId) {
    return res.status(400).json({ error: "Missing accountId." });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !authData.user) {
    return res.status(401).json({ error: "Invalid authorization token." });
  }

  if (authData.user.id === accountId) {
    return res.status(400).json({ error: "현재 로그인한 관리자 계정은 삭제할 수 없습니다." });
  }

  const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
    .from("users")
    .select("id, email, role, status")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (adminProfileError || !adminProfile || (adminProfile.email || "").toLowerCase() !== ADMIN_EMAIL) {
    return res.status(403).json({ error: "관리자 권한이 필요합니다." });
  }

  const { data: sessions, error: sessionError } = await supabaseAdmin
    .from("chat_sessions")
    .select("id")
    .eq("user_id", accountId);
  if (sessionError) {
    return res.status(500).json({ error: sessionError.message });
  }

  const sessionIds = (sessions || []).map((session) => session.id);
  if (sessionIds.length > 0) {
    const { error: messageError } = await supabaseAdmin.from("chat_messages").delete().in("session_id", sessionIds);
    if (messageError) return res.status(500).json({ error: messageError.message });

    const { error: reportError } = await supabaseAdmin.from("reports").delete().in("session_id", sessionIds);
    if (reportError) return res.status(500).json({ error: reportError.message });

    const { error: chatSessionError } = await supabaseAdmin.from("chat_sessions").delete().in("id", sessionIds);
    if (chatSessionError) return res.status(500).json({ error: chatSessionError.message });
  }

  try {
    await removeStudentHistoryFiles(supabaseAdmin, accountId);
  } catch (error) {
    console.warn("Failed to remove student history files:", error);
  }

  const { error: profileDeleteError } = await supabaseAdmin.from("users").delete().eq("id", accountId);
  if (profileDeleteError) {
    return res.status(500).json({ error: profileDeleteError.message });
  }

  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(accountId);
  if (authDeleteError) {
    return res.status(500).json({ error: authDeleteError.message });
  }

  return res.status(200).json({ ok: true });
}
