<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# MathTutor

학생/교사 역할 분리, 관리자 승인, 교사 지침 반영, 학생 대화 보고서 분석을 포함한 수학 튜터 앱입니다.

## Local Run

사전 준비:
- Node.js 20+

설치와 실행:
1. `npm install`
2. `.env.local`에 환경 변수 설정
3. `npm run dev`

필수 환경 변수:
```bash
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_SUPABASE_URL=https://cvieojhwmzfdzqzsgadk.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

`VITE_GEMINI_API_KEY`가 없으면 로그인과 데이터 조회는 되지만 AI 응답과 보고서 생성은 실패합니다.

## Vercel Deploy

자동 배포를 쓰려면 이 저장소를 Vercel 프로젝트에 연결한 뒤 아래 설정만 맞추면 됩니다.

- Framework Preset: `Vite`
- Build Command: `npm run build`
- Output Directory: `dist`

Vercel 환경 변수:
```bash
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_SUPABASE_URL=https://cvieojhwmzfdzqzsgadk.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

GitHub 저장소와 Vercel이 연결되어 있으면 `main` 또는 연결된 브랜치에 `push`할 때 자동 배포됩니다.
