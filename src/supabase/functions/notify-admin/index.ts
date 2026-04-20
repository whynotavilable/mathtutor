import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { record } = await req.json()

  const html = `
<h2>새 가입 신청이 들어왔습니다</h2>
<p><b>이름:</b> ${record.name}</p>
<p><b>이메일:</b> ${record.email}</p>
<p><b>역할:</b> ${record.role === 'teacher' ? '교사' : '학생'}</p>
<p><b>학년/반/번호:</b> ${record.grade}학년 ${record.class}반 ${record.number}번</p>
<br/>
<p>승인하려면 Supabase에서 해당 유저의 status를 approved로 변경해주세요.</p>
<p>또는 아래 SQL을 실행하세요:</p>
<pre>UPDATE users SET status = 'approved' WHERE email = '${record.email}';</pre>
`

  // ... rest of the function (e.g. sending email via Resend or similar)
  // For now just returning the HTML for the user to see
  return new Response(
    JSON.stringify({ message: "Done", html }),
    { headers: { "Content-Type": "application/json" } },
  )
})
