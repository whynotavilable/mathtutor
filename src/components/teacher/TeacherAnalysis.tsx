import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Users, Search, Database, Monitor, MessageCircle, FileDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { cn } from "../../lib/utils";
import { DUMMY_STUDENT } from "../../constants";

const STATIC_STUDENTS_DATA: any[] = [
  {
    id: "s1",
    name: "김민준",
    grade: "3",
    class: "1",
    number: "03",
    role: "student",
    status: "approved",
    healthStatus: "green",
    stats: { latestMisconception: "없음", latestRecommendation: "전반적으로 우수한 이해도. 심화 문제 도전 권장" },
    sessions: [
      {
        id: "sess1_1",
        title: "미분법의 기초",
        created_at: "2026-04-18T10:00:00Z",
        accuracy: 88,
        report: {
          summary: "도함수의 정의와 미분법칙을 완벽히 숙지하고 있습니다.",
          misconceptions: "없음",
          recommendations: "전반적으로 우수한 이해도. 합성함수 미분법으로 심화 학습 진행 권장.",
          created_at: "2026-04-18T11:00:00Z"
        },
        messages: [
          { role: "user", content: "선생님, $f(x) = x^2$의 미분계수가 왜 $2x$인가요?", created_at: "2026-04-18T10:05:00Z" },
          { role: "assistant", content: "좋은 질문이에요! 극한의 정의 $\\lim_{h \\to 0} \\frac{f(x+h)-f(x)}{h}$에 대입해보면 $(x+h)^2 - x^2 = 2xh + h^2$이 되고, $h$로 나누면 $2x + h$가 남죠. $h$가 0으로 갈 때 $2x$가 되는 원리입니다.", created_at: "2026-04-18T10:06:00Z" }
        ]
      }
    ]
  },
  {
    id: "s2",
    name: "박서연",
    grade: "3",
    class: "1",
    number: "07",
    role: "student",
    status: "approved",
    healthStatus: "yellow",
    stats: { latestMisconception: "등비수열과 등차수열 혼동", latestRecommendation: "반복 학습 및 공식 확인 필요" },
    sessions: [
      {
        id: "sess2_1",
        title: "수열의 극한",
        created_at: "2026-04-17T14:20:00Z",
        accuracy: 62,
        report: {
          summary: "일반항 구하는 과정에서 혼동이 보입니다.",
          misconceptions: "등비수열의 일반항 $ar^{n-1}$에서 공비와 초항의 역할을 등차수열과 혼동함.",
          recommendations: "반복 학습을 통해 공식의 유도 과정을 다시 확인해야 합니다.",
          created_at: "2026-04-17T15:00:00Z"
        },
        messages: [
          { role: "user", content: "공비가 3인 등비수열 일반항이 $a + (n-1)r$ 맞나요?", created_at: "2026-04-17T14:25:00Z" },
          { role: "assistant", content: "아니요, 그건 등차수열의 공식이에요! 등비수열은 일정한 수를 '곱하는' 수열이라서 $a_n = a_1 \\cdot r^{n-1}$ 형식이 됩니다.", created_at: "2026-04-17T14:26:00Z" }
        ]
      }
    ]
  },
  {
    id: "s3",
    name: "최준혁",
    grade: "3",
    class: "1",
    number: "11",
    role: "student",
    status: "approved",
    healthStatus: "red",
    stats: { latestMisconception: "연속과 미분가능 혼동", latestRecommendation: "즉각적 개입 및 기초 연속 개념 재정립 필요" },
    sessions: [
      {
        id: "sess3_1",
        title: "함수의 연속과 극한",
        created_at: "2026-04-16T09:15:00Z",
        accuracy: 35,
        report: {
          summary: "연속의 정의에 대한 근본적인 이해가 부족합니다.",
          misconceptions: "연속이면 무조건 미분가능하다고 생각하며, 좌극한과 우극한의 일치 조건을 무시함.",
          recommendations: "즉각적 개입 필요. 그래프를 통한 연속성 판정 기초부터 다시 지도가 필요합니다.",
          created_at: "2026-04-16T10:00:00Z"
        },
        messages: [
          { role: "user", content: "값이 있으면 다 연속 아닌가요?", created_at: "2026-04-16T09:20:00Z" },
          { role: "assistant", content: "단순히 함숫값이 있는 것만으로는 부족해요. 좌극한, 우극한, 그리고 그 함숫값이 모두 같아야 '연속'이라고 할 수 있습니다.", created_at: "2026-04-16T09:21:00Z" }
        ]
      }
    ]
  },
  {
    id: "s4",
    name: "정하윤",
    grade: "3",
    class: "1",
    number: "14",
    role: "student",
    status: "approved",
    healthStatus: "green",
    stats: { latestMisconception: "없음", latestRecommendation: "심화 문제 및 기출 고난도 풀이 권장" },
    sessions: [
      {
        id: "sess4_1",
        title: "치환적분법",
        created_at: "2026-04-15T16:00:00Z",
        accuracy: 92,
        report: {
          summary: "복잡한 치환 적분 과정을 정확하게 수행합니다.",
          misconceptions: "없음",
          recommendations: "탁월한 계산력. 평가원 기출 고난도 문항(21, 30번) 도전 권장.",
          created_at: "2026-04-15T17:00:00Z"
        },
        messages: [
          { role: "user", content: "$\\int x e^{x^2} dx$ 에서 $x^2 = t$로 치환하면 되죠?", created_at: "2026-04-15T16:05:00Z" },
          { role: "assistant", content: "완벽해요! $2x dx = dt$가 되니까 $\\frac{1}{2} \\int e^t dt$로 간단히 바뀌겠네요. 진행해 보세요!", created_at: "2026-04-15T16:06:00Z" }
        ]
      }
    ]
  },
  {
    id: "s5",
    name: "강도현",
    grade: "3",
    class: "1",
    number: "19",
    role: "student",
    status: "approved",
    healthStatus: "yellow",
    stats: { latestMisconception: "합성함수 미분 시 속미분 누락", latestRecommendation: "Chain Rule 집중 훈련 필요" },
    sessions: [
      {
        id: "sess5_1",
        title: "로그함수의 미분",
        created_at: "2026-04-14T11:00:00Z",
        accuracy: 58,
        report: {
          summary: "기본 공식은 아나 합성함수 형태에서 오류가 빈번함.",
          misconceptions: "$\\ln(3x)$ 를 미분할 때 속미분 3을 곱하지 않고 $\\frac{1}{3x}$ 로만 작성함.",
          recommendations: "합성함수 미분(Chain Rule)의 원칙을 단계별로 적는 습관이 필요합니다.",
          created_at: "2026-04-14T12:00:00Z"
        },
        messages: [
          { role: "user", content: "$\\ln(5x)$ 미분하면 $1/5x$ 아닌가요?", created_at: "2026-04-14T11:10:00Z" },
          { role: "assistant", content: "거의 맞았지만 '속미분'을 빠뜨렸어요! $( \\ln u )' = \\frac{u'}{u}$ 이므로, 여기서는 $\\frac{5}{5x}$ 가 되어 결국 $\\frac{1}{x}$ 이 됩니다.", created_at: "2026-04-14T11:11:00Z" }
        ]
      }
    ]
  },
  {
    id: "s6",
    name: "윤지아",
    grade: "3",
    class: "1",
    number: "22",
    role: "student",
    status: "approved",
    healthStatus: "green",
    stats: { latestMisconception: "없음", latestRecommendation: "응용 문제 풀이 능력 양호. 실전 모의고사 병행 권장" },
    sessions: [
      {
        id: "sess6_1",
        title: "삼각함수의 미분",
        created_at: "2026-04-13T13:00:00Z",
        accuracy: 79,
        report: {
          summary: "삼각함수의 6가지 미분 공식을 모두 암기하고 있습니다.",
          misconceptions: "없음",
          recommendations: "공식 암기는 완벽합니다. 이제 여러 가지 함수가 섞인 실전 응용 문제를 다뤄보세요.",
          created_at: "2026-04-13T14:00:00Z"
        },
        messages: [
          { role: "user", content: "$\\sec x$ 미분하면 $\\sec x \\tan x$ 맞죠?", created_at: "2026-04-13T13:10:00Z" },
          { role: "assistant", content: "네, 정확합니다! 그럼 $\\csc x$는 어떻게 될까요?", created_at: "2026-04-13T13:11:00Z" }
        ]
      }
    ]
  },
  {
    id: "s7",
    name: "임현우",
    grade: "3",
    class: "1",
    number: "25",
    role: "student",
    status: "approved",
    healthStatus: "red",
    stats: { latestMisconception: "지수법칙 기본 오류", latestRecommendation: "기초 지수/로그 성질 재학습 필수" },
    sessions: [
      {
        id: "sess7_1",
        title: "지수함수와 로그",
        created_at: "2026-04-12T15:30:00Z",
        accuracy: 28,
        report: {
          summary: "기초 연산 과정에서 심각한 오류가 관찰됨.",
          misconceptions: "$(a^b)^c = a^{b+c}$ 로 계산하는 등 지수법칙 기초가 흔들림. 로그 부등식 방향 결정 미숙.",
          recommendations: "개념서를 통한 원리 파악이 시급합니다. 중등 수학 지수 파트부터 복습이 필요할 수도 있습니다.",
          created_at: "2026-04-12T16:30:00Z"
        },
        messages: [
          { role: "user", content: "$2^3 \\cdot 2^2 = 2^6$ 인가요?", created_at: "2026-04-12T15:40:00Z" },
          { role: "assistant", content: "아니요, 지수끼리는 더해줘야 해요! $2^3 \\cdot 2^2 = 2^{3+2} = 2^5 = 32$가 됩니다.", created_at: "2026-04-12T15:41:00Z" }
        ]
      }
    ]
  },
  {
    id: "s8",
    name: "송예린",
    grade: "3",
    class: "1",
    number: "28",
    role: "student",
    status: "approved",
    healthStatus: "yellow",
    stats: { latestMisconception: "부호 처리 실수", latestRecommendation: "계산 정확도 향상 및 검산 습관 지도" },
    sessions: [
      {
        id: "sess8_1",
        title: "부분적분법",
        created_at: "2026-04-11T10:00:00Z",
        accuracy: 71,
        report: {
          summary: "부분적분 순서(로다삼지)는 잘 지키나 계산 끝에서 부호 실수가 잦음.",
          misconceptions: "$\\int u'v = uv - \\int uv'$ 과정에서 두 번째 항의 빼기(-) 부호를 더하기(+)로 잘못 처리함.",
          recommendations: "계산 과정을 한 줄씩 꼼꼼히 적는 연습이 필요합니다.",
          created_at: "2026-04-11T11:00:00Z"
        },
        messages: [
          { role: "user", content: "$\\int x \\cdot \\sin x dx$ 풀었는데 자꾸 답이 달라요.", created_at: "2026-04-11T10:15:00Z" },
          { role: "assistant", content: "부분적분 공식 $uv - \\int uv'$에서 $\\sin x$의 적분인 $-\\cos x$의 마이너스 부호를 바깥의 마이너스와 함께 잘 처리했는지 확인해 보세요!", created_at: "2026-04-11T10:16:00Z" }
        ]
      }
    ]
  }
];

const TeacherAnalysis = () => {
  const [students] = useState<any[]>(STATIC_STUDENTS_DATA);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(STATIC_STUDENTS_DATA[0]);
  const [selectedSession, setSelectedSession] = useState<any | null>(STATIC_STUDENTS_DATA[0].sessions[0]);
  const [activeTab, setActiveTab] = useState<"report" | "chat">("report");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading] = useState({ students: false, sessions: false, details: false });
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [appliedInstructions, setAppliedInstructions] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('TEACHER_INSTRUCTIONS');
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    const applied: Record<string, boolean> = {};
    Object.keys(parsed).forEach(id => applied[id] = true);
    return applied;
  });

  const [tempInstructions, setTempInstructions] = useState<any>({
    weeklyGoals: "",
    keyConcepts: "",
    difficultyLevel: "",
    aiQuestionStyle: "inductive",
    aiMisconceptionResponse: "",
    aiEngagementStrategy: "",
    solvingGuideline: "",
  });

  const handleApplyInstruction = () => {
    if (!selectedStudent) return;

    const stats = selectedStudent.stats;
    const healthStatus = selectedStudent.healthStatus;
    const misconceptionsStr = stats.latestMisconception || "없음";

    let basePrompt = "";
    if (healthStatus === 'red') {
      basePrompt = `이 학생은 [${misconceptionsStr}]에 대한 심각한 오개념을 가지고 있습니다. 매우 기초적인 수준으로 천천히 설명하고, 학생이 스스로 오류를 깨달을 수 있도록 아주 쉬운 단계부터 질문을 던지세요. 절대 정답을 먼저 말하지 마세요.`;
    } else if (healthStatus === 'yellow') {
      basePrompt = `이 학생은 [${misconceptionsStr}] 부분에서 혼동을 겪고 있습니다. 기초 개념을 환기시키고 비슷한 유형의 예시를 통해 개념의 차이를 구분할 수 있게 지도하세요.`;
    } else {
      basePrompt = `이 학생은 기본 개념을 잘 이해하고 있습니다. 원리학습을 넘어 응용 문제나 기출 심화 유형을 다루며 사고력을 확장할 수 있도록 유도하세요.`;
    }

    const systemPrompt = `당신은 친절한 수학 튜터입니다.
교사의 개별 지도 지침: ${basePrompt}
작성된 학습 목표: ${tempInstructions.weeklyGoals}
강조 개념: ${tempInstructions.keyConcepts}
교수법 스타일: ${tempInstructions.aiQuestionStyle === 'inductive' ? '귀납적 발문법' : '설명 중심'}
`;

    const instructions = JSON.parse(localStorage.getItem('TEACHER_INSTRUCTIONS') || '{}');
    instructions[selectedStudent.id] = {
      systemPrompt: systemPrompt,
      appliedAt: new Date().toISOString()
    };
    localStorage.setItem('TEACHER_INSTRUCTIONS', JSON.stringify(instructions));

    setAppliedInstructions(prev => ({ ...prev, [selectedStudent.id]: true }));
    setShowInstructionModal(false);
  };

  useEffect(() => {
    if (selectedStudent) {
      const found = STATIC_STUDENTS_DATA.find(s => s.id === selectedStudent.id);
      if (found && found.sessions.length > 0) {
        setSelectedSession(found.sessions[0]);
      } else {
        setSelectedSession(null);
      }
    }
  }, [selectedStudent]);

  const report = selectedSession?.report;
  const messages = selectedSession?.messages || [];

  return (
    <div className="flex h-full flex-col md:flex-row gap-6 bg-paper overflow-hidden">
      {/* 1. Student Selection Sidebar */}
      <div className="w-full md:w-64 bg-white rounded-2xl border border-highlight flex flex-col overflow-hidden shadow-sm shrink-0 h-[400px] md:h-full">
        <header className="p-5 border-b border-highlight bg-gray-50/50">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-[10px] font-black text-secondary-text uppercase tracking-widest flex items-center gap-2">
              <Users size={14} className="text-accent" /> 학생 목록
            </h4>
            <span className="text-[10px] font-bold text-accent bg-paper px-2 py-0.5 rounded border border-highlight uppercase">3-1반</span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-secondary-text" size={12} />
            <input
              type="text"
              placeholder="학생 이름 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-paper border border-highlight rounded-lg py-2 pl-8 pr-3 text-[10px] outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-2 space-y-1" id="teacher-risk-indicators">
          {loading.students ? (
            <div className="p-10 flex flex-col items-center gap-2 opacity-40">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[9px] font-black uppercase tracking-tighter">학생 목록 호출 중</p>
            </div>
          ) : students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
            <div className="p-10 text-center opacity-40">
              <p className="text-[9px] font-black uppercase tracking-tighter">
                {searchTerm ? "검색 결과가 없습니다" : "등록된 학생이 없습니다"}
              </p>
            </div>
          ) : students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(student => {
            const stats = student.stats;
            const healthStatus = student.healthStatus;
            return (
              <div key={student.id} className="relative group">
                <button
                  onClick={() => { setSelectedStudent(student); }}
                  className={cn(
                    "w-full text-left p-3 rounded-xl transition-all border flex items-center gap-3 relative",
                    selectedStudent?.id === student.id
                      ? "bg-accent text-white border-accent shadow-md"
                      : "bg-white text-ink border-transparent hover:bg-paper hover:border-highlight"
                  )}
                >
                  <div className="relative shrink-0">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black border",
                      selectedStudent?.id === student.id ? "bg-white/20 border-white/30 text-white" : "bg-paper border-highlight text-accent"
                    )}>
                      {student.name ? student.name[0] : '?'}
                    </div>
                    <div className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                      healthStatus === 'green' ? "bg-green-500" :
                      healthStatus === 'yellow' ? "bg-yellow-500" :
                      healthStatus === 'red' ? "bg-red-500" : "bg-gray-300"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-black truncate">{student.name}</p>
                      {healthStatus === 'red' && (
                        <span className="animate-pulse flex h-1.5 w-1.5 rounded-full bg-red-500" />
                      )}
                    </div>
                    <p className={cn("text-[9px] font-bold opacity-60", selectedStudent?.id === student.id ? "text-white" : "text-secondary-text")}>
                      {student.grade}학년 {student.class}반 {student.number}번
                    </p>
                  </div>

                  <div className="absolute left-[105%] top-0 w-64 p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-highlight invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all z-[110] pointer-events-none">
                    <p className="text-[10px] font-black uppercase text-accent mb-2">최신 분석 인사이트</p>
                    {stats ? (
                      <div className="space-y-3">
                        <div>
                          <p className="text-[9px] font-black text-secondary-text uppercase mb-1">핵심 오개념</p>
                          <p className="text-[11px] font-bold text-ink line-clamp-2 leading-relaxed">{stats.latestMisconception || '기록 없음'}</p>
                        </div>
                        <div className="pt-2 border-t border-highlight">
                          <p className="text-[9px] font-black text-green-600 uppercase mb-1">추천 지도</p>
                          <p className="text-[11px] font-bold text-ink line-clamp-2 leading-relaxed">{stats.latestRecommendation || '학습 이력 부족'}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] font-bold text-gray-400 italic">분석할 데이터가 충분하지 않습니다.</p>
                    )}
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 md:gap-6 overflow-hidden min-h-0">
        {/* 2. Session List */}
        <div className="col-span-12 md:col-span-4 flex flex-col bg-white rounded-2xl border border-highlight overflow-hidden shadow-sm min-h-0">
          <header className="p-5 border-b border-highlight bg-white flex justify-between items-center shrink-0">
            <div className="flex flex-col">
              <h4 className="text-[10px] font-black text-secondary-text uppercase tracking-widest">학습 세션</h4>
              <p className="text-[10px] font-black text-accent mt-0.5">{selectedStudent?.name} 학생</p>
            </div>

            <button
              onClick={() => {
                if (selectedStudent) {
                  setTempInstructions((selectedStudent as any).instructions || DUMMY_STUDENT.instructions);
                  setShowInstructionModal(true);
                }
              }}
              className={cn(
                "px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md",
                appliedInstructions[selectedStudent?.id]
                  ? "bg-green-500 text-white hover:bg-green-600"
                  : "bg-accent text-white hover:bg-sidebar shadow-accent/10"
              )}
            >
              {appliedInstructions[selectedStudent?.id] ? "학습 지시문 적용됨 ✓" : "학습 지시문 설정"}
            </button>
          </header>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {!selectedStudent?.sessions || selectedStudent.sessions.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-10 opacity-20 text-center grayscale">
                <Database size={40} />
                <p className="text-[10px] font-black uppercase tracking-widest mt-4">최근 대화 기록이 없습니다</p>
              </div>
            ) : selectedStudent.sessions.map((sess: any) => (
              <button
                key={sess.id}
                onClick={() => setSelectedSession(sess)}
                className={cn(
                  "w-full text-left p-5 rounded-2xl border transition-all relative overflow-hidden group",
                  selectedSession?.id === sess.id
                    ? "bg-paper border-accent shadow-sm"
                    : "bg-white border-highlight hover:border-accent"
                )}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[9px] font-black text-accent uppercase tracking-widest bg-white px-2 py-1 rounded border border-highlight">{sess.created_at ? new Date(sess.created_at).toLocaleDateString() : 'N/A'}</span>
                  <span className="text-[9px] font-black text-secondary-text italic">{sess.accuracy}% Achievement</span>
                </div>
                <h5 className={cn("text-xs font-black mb-1 leading-tight text-ink group-hover:text-accent transition-colors", selectedSession?.id === sess.id && "text-accent")}>{sess.title}</h5>
                <p className="text-[9px] text-secondary-text font-medium opacity-60 uppercase tracking-widest">Session ID: {sess.id.slice(0, 8)}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 3. Detailed Analysis / Chat Log */}
        <div className="hidden md:flex md:col-span-8 flex-col bg-white rounded-2xl border border-highlight overflow-hidden shadow-sm min-h-0">
          <header className="px-8 h-16 border-b border-highlight flex items-center justify-between bg-white shrink-0">
            <div className="flex gap-8 h-full">
              {["report", "chat"].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={cn(
                    "h-full border-b-2 px-1 text-[11px] font-black uppercase tracking-widest transition-all",
                    activeTab === tab ? "border-accent text-accent" : "border-transparent text-secondary-text hover:text-ink"
                  )}
                >
                  {tab === "report" ? "Learning Report" : "Full Chat Log"}
                </button>
              ))}
            </div>
            {selectedSession && (
              <button className="flex items-center gap-2 text-[10px] font-black text-accent bg-paper px-3 py-1.5 rounded-lg border border-highlight hover:bg-highlight transition-all">
                <FileDown size={14} /> PDF Download
              </button>
            )}
          </header>

          <div className="flex-1 overflow-y-auto p-10 bg-white">
            {loading.details ? (
              <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-50 italic">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-accent rounded-full animate-spin"></div>
                <p className="text-xs font-black uppercase tracking-widest text-ink">Analyzing Session Data</p>
              </div>
            ) : selectedSession ? (
              <div className="max-w-3xl mx-auto space-y-12">
                {activeTab === "report" ? (
                  <div className="space-y-12 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-10">
                    <section>
                      <div className="flex justify-between items-end mb-6">
                        <h4 className="text-[10px] font-black text-accent uppercase tracking-widest flex items-center gap-2">
                          <div className="w-1.5 h-1.5 bg-accent rounded-full"></div> 오늘의 학습 요약
                        </h4>
                        <span className="text-[9px] font-bold text-secondary-text bg-paper px-2 py-1 rounded border border-highlight">
                          발행일: {report?.created_at ? new Date(report.created_at).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                      <div className="p-8 bg-paper border border-highlight rounded-3xl">
                        <p className="text-sm font-bold text-ink leading-relaxed italic">
                          {report?.summary || "리포트가 아직 생성되지 않았습니다."}
                        </p>
                      </div>
                    </section>

                    {report && (
                      <>
                        <div className="grid grid-cols-1 gap-10">
                          <section>
                            <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-4">학습 취약점 및 오개념 분석</h4>
                            <div className="p-8 bg-red-50/30 border border-red-100/50 rounded-3xl text-sm font-medium text-ink leading-relaxed">
                              {report.misconceptions}
                            </div>
                          </section>
                        </div>

                        <section className="pt-6 border-t border-highlight">
                          <h4 className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-6 font-bold">추천 학습 방향 및 후속 조언</h4>
                          <div className="p-8 bg-green-50/30 border border-green-100/50 rounded-3xl space-y-4">
                            <p className="text-sm text-ink font-semibold leading-relaxed">{report.recommendations}</p>
                          </div>
                        </section>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in duration-300 pb-10">
                    {messages.length === 0 ? (
                      <div className="py-20 text-center opacity-20 grayscale">
                        <MessageCircle size={40} className="mx-auto" />
                        <p className="text-[10px] font-black uppercase mt-4">메시지 내역이 없습니다</p>
                      </div>
                    ) : messages.map((m: any) => (
                      <div key={m.id} className={cn("p-6 rounded-2xl border flex flex-col gap-2", m.role === 'user' ? "bg-white border-highlight ml-12 sm:ml-4" : "bg-paper border-accent/10 mr-12 sm:mr-4 shadow-sm")}>
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black uppercase tracking-widest text-secondary-text">{m.role === 'assistant' ? 'AI Tutor' : 'Student'}</span>
                          <span className="text-[9px] font-bold text-gray-300">{new Date(m.created_at).toLocaleTimeString()}</span>
                        </div>
                        <div className="text-sm font-semibold text-ink leading-relaxed prose prose-sm max-w-none prose-slate">
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {m.content.replace(/\\\((.*?)\\\)/g, '$$$1$').replace(/\\\[(.*?)\\\]/g, '$$$$$1$$$$')}
                          </ReactMarkdown>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-6">
                <div className="w-20 h-20 bg-paper rounded-full flex items-center justify-center border border-highlight">
                  <Monitor size={32} className="opacity-30" />
                </div>
                <div className="text-center space-y-2">
                  <p className="font-black text-sm text-secondary-text uppercase tracking-widest">No Active Selection</p>
                  <p className="text-xs text-gray-400">학습 세션을 선택하여 분석 내용을 확인하세요.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Learning Instruction Modal */}
      <AnimatePresence>
        {showInstructionModal && selectedStudent && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-sidebar/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl border border-highlight shadow-2xl overflow-hidden"
            >
              <header className="px-8 py-6 border-b border-highlight bg-paper/30 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-ink uppercase tracking-tight">학습 지시문 편집</h3>
                  <p className="text-[10px] text-secondary-text font-bold uppercase tracking-widest mt-1">Student: {selectedStudent.name} ({selectedStudent.number}번)</p>
                </div>
                <button onClick={() => setShowInstructionModal(false)} className="p-2 hover:bg-paper rounded-full transition-colors"><X size={20} /></button>
              </header>
              <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-accent uppercase tracking-widest">문제 접근 방식</label>
                    <select value={tempInstructions.problemSolvingApproach} onChange={e => setTempInstructions({ ...tempInstructions, problemSolvingApproach: e.target.value as any })} className="w-full p-3 bg-paper border border-highlight rounded-xl text-xs font-bold outline-none">
                      <option value="intuitive">직관적 해결 선호</option>
                      <option value="logical">논리적 증명 선호</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-accent uppercase tracking-widest">힌트 제공 수준</label>
                    <select value={tempInstructions.hintLevel} onChange={e => setTempInstructions({ ...tempInstructions, hintLevel: parseInt(e.target.value) })} className="w-full p-3 bg-paper border border-highlight rounded-xl text-xs font-bold outline-none">
                      <option value={1}>최소 힌트 (강도 1)</option>
                      <option value={2}>적정 힌트 (강도 2)</option>
                      <option value={3}>상세 설명 (강도 3)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-paper rounded-xl border border-highlight">
                  <span className="text-xs font-black text-ink">스스로 설명 유도 여부</span>
                  <button
                    onClick={() => setTempInstructions({ ...tempInstructions, induceSelfExplanation: !tempInstructions.induceSelfExplanation })}
                    className={cn("w-12 h-6 rounded-full relative transition-colors", tempInstructions.induceSelfExplanation ? "bg-accent" : "bg-gray-200")}
                  >
                    <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", tempInstructions.induceSelfExplanation ? "left-7" : "left-1")} />
                  </button>
                </div>

                <div className="space-y-4">
                  {[
                    { label: "현재 학습 목표", key: "currentGoals" },
                    { label: "선호 설명 방식", key: "preferredStyle" },
                    { label: "어려운 개념", key: "difficultConcepts" }
                  ].map(item => (
                    <div key={item.key} className="space-y-2">
                      <label className="text-[10px] font-black text-accent uppercase tracking-widest">{item.label}</label>
                      <textarea value={(tempInstructions as any)[item.key]} onChange={e => setTempInstructions({ ...tempInstructions, [item.key]: e.target.value })} className="w-full p-4 bg-paper border border-highlight rounded-xl text-xs font-semibold h-20 resize-none outline-none focus:ring-1 focus:ring-accent" />
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between p-4 bg-paper rounded-xl border border-highlight">
                  <span className="text-xs font-black text-ink">반복 학습 필요 여부</span>
                  <button
                    onClick={() => setTempInstructions({ ...tempInstructions, repeatNeeded: !tempInstructions.repeatNeeded })}
                    className={cn("w-12 h-6 rounded-full relative transition-colors", tempInstructions.repeatNeeded ? "bg-accent" : "bg-gray-200")}
                  >
                    <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", tempInstructions.repeatNeeded ? "left-7" : "left-1")} />
                  </button>
                </div>
              </div>
              <footer className="px-8 py-6 border-t border-highlight bg-paper/10 flex justify-end gap-3">
                <button
                  onClick={() => setShowInstructionModal(false)}
                  className="px-6 py-3 border border-highlight rounded-xl text-xs font-black text-secondary-text hover:bg-paper transition-all uppercase tracking-widest font-mono"
                >Close</button>
                <button
                  onClick={handleApplyInstruction}
                  className="px-8 py-3 bg-accent text-white rounded-xl text-xs font-black hover:bg-sidebar transition-all shadow-lg shadow-accent/20 uppercase tracking-widest"
                >학습 지시문 개별 적용하기</button>
              </footer>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeacherAnalysis;
