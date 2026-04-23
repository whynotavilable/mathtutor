import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const escapeHtml = (str: string) =>
  String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

serve(async (req) => {
  const { record } = await req.json()

  const name = escapeHtml(record.name);
  const email = escapeHtml(record.email);
  const role = record.role === 'teacher' ? '교사' : '학생';
  const grade = escapeHtml(String(record.grade ?? ''));
  const cls = escapeHtml(String(record.class ?? ''));
  const number = escapeHtml(String(record.number ?? ''));

  const html = `
<h2>새 가입 신청이 들어왔습니다</h2>
<p><b>이름:</b> ${name}</p>
<p><b>이메일:</b> ${email}</p>
<p><b>역할:</b> ${role}</p>
<p><b>학년/반/번호:</b> ${grade}학년 ${cls}반 ${number}번</p>
<br/>
<p>승인하려면 Supabase 대시보드에서 해당 유저의 status를 <code>approved</code>로 변경해주세요.</p>
`

  // ... rest of the function (e.g. sending email via Resend or similar)
  // For now just returning the HTML for the user to see
  return new Response(
    JSON.stringify({ message: "Done", html }),
    { headers: { "Content-Type": "application/json" } },
  )
})
