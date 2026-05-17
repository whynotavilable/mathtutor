import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  BarChart3, BookOpen, Bot, ChevronRight, ClipboardCheck,
  MessageSquare, Users, X
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell
} from 'recharts';
import { cn, formatDate } from "../../lib/utils";
import { supabase } from "../../supabase";
import { UserProfile } from "../../lib/ai";
import { TeacherInstructions } from "../../types";
import {
  parseInstructionState, stringifyInstructionState, buildTeacherPrompt,
  DEFAULT_TEACHER_INSTRUCTIONS
} from "../../lib/instructions";
import { getClassKey, getClassLabel, isTeacherVisibleStudent } from "../../lib/userUtils";
import {
  getStudentSignal as getStudentSignalStatus,
  getStudentSignalReason as getStudentSignalReasonText,
  StudentSignalEvidence,
} from "../../lib/studentSignals";

const CLASS_PERFORMANCE_DATA = [
  { month: '3월', score: 65 },
  { month: '4월', score: 72 },
  { month: '5월', score: 78 },
  { month: '6월', score: 85 },
];

const UNIT_UNDERSTANDING_DATA = [
  { subject: '지수함수', A: 85, fullMark: 100 },
  { subject: '로그함수', A: 70, fullMark: 100 },
  { subject: '삼각함수', A: 60, fullMark: 100 },
  { subject: '미분계수', A: 90, fullMark: 100 },
  { subject: '도함수', A: 75, fullMark: 100 },
];

const TeacherDashboard = ({ profile, selectedClassKey }: { profile: UserProfile | null; selectedClassKey: string }) => {
  const [showClassInstructions, setShowClassInstructions] = useState(false);

  const DEFAULT_CLASS_INSTRUCTIONS: TeacherInstructions = {
    ...DEFAULT_TEACHER_INSTRUCTIONS,
    weeklyGoals: "미분법 단원 심화 학습 및 문제 풀이",
    keyConcepts: "도함수, 합성함수의 미분, 몫의 미분법",
    solvingGuideline: "공식 암기보다는 유도 과정을 이해하고 설명하도록 유도",
    difficultyLevel: "중상 (준킬러 급)",
    feedbackStyle: "힌트 중심 (단계별 질문 피드백)",
    aiQuestionStyle: 'inductive',
    aiMisconceptionResponse: "즉시 정정하기보다 반례를 들어 스스로 깨닫게 함",
    aiEngagementStrategy: "수능 실전 응용 사례를 언급하여 동기 부여",
  };
  const [classInstructions, setClassInstructions] = useState<TeacherInstructions>(DEFAULT_CLASS_INSTRUCTIONS);
  const [saving, setSaving] = useState(false);
  const [dashboardStudents, setDashboardStudents] = useState<UserProfile[]>([]);
  const [latestSessionsByStudent, setLatestSessionsByStudent] = useState<Record<string, any>>({});
  const [latestReportByStudent, setLatestReportByStudent] = useState<Record<string, any>>({});
  const [signalEvidenceByStudent, setSignalEvidenceByStudent] = useState<Record<string, StudentSignalEvidence>>({});
  const [performanceData, setPerformanceData] = useState(CLASS_PERFORMANCE_DATA);
  const [conceptData, setConceptData] = useState(UNIT_UNDERSTANDING_DATA);
  const [insightMessage, setInsightMessage] = useState("최근 학습 데이터가 아직 충분하지 않습니다. 학생들의 첫 대화를 모아 인사이트를 생성해보세요.");
  const [stats, setStats] = useState([
    { label: "전체 학생 수", value: "0", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "오늘 학습 세션", value: "0", icon: MessageSquare, color: "text-green-600", bg: "bg-green-50" },
    { label: "평균 성취도", value: "-", icon: BarChart3, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "도움 필요 학생", value: "0", icon: ClipboardCheck, color: "text-red-600", bg: "bg-red-50" }
  ]);

  // Load saved class instructions from teacher's own profile once profile is available
  useEffect(() => {
    if (!profile) return;
    const saved = parseInstructionState(profile.instructions).teacherContext?.classSettings;
    if (saved && Object.keys(saved).length > 0) {
      setClassInstructions((prev) => ({ ...prev, ...saved }));
    }
  }, [profile?.id]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const { data: students, error: studentsError } = await supabase
          .from("users")
          .select("*")
          .eq("role", "student")
          .eq("status", "approved")
          .order("created_at", { ascending: true });

        if (studentsError) throw studentsError;

        const allApprovedStudents = ((students || []) as UserProfile[]).filter(isTeacherVisibleStudent);
        const approvedStudents = selectedClassKey
          ? allApprovedStudents.filter((student) => getClassKey(student) === selectedClassKey)
          : allApprovedStudents;
        setDashboardStudents(approvedStudents);

        const studentIds = approvedStudents.map((student) => student.id);
        const { data: sessions, error: sessionsError } = studentIds.length
          ? await supabase.from("chat_sessions").select("*").in("user_id", studentIds).order("created_at", { ascending: false })
          : { data: [], error: null } as any;

        if (sessionsError) throw sessionsError;

        const sessionIds = (sessions || []).map((session: any) => session.id);
        const { data: reports, error: reportsError } = sessionIds.length
          ? await supabase.from("reports").select("*").in("session_id", sessionIds)
          : { data: [], error: null } as any;

        if (reportsError) throw reportsError;

        const { data: messages, error: messagesError } = sessionIds.length
          ? await supabase.from("chat_messages").select("session_id, role, content, created_at").in("session_id", sessionIds).order("created_at", { ascending: true })
          : { data: [], error: null } as any;

        if (messagesError) throw messagesError;

        const latestByStudent = (sessions || []).reduce((acc: Record<string, any>, session: any) => {
          if (!acc[session.user_id]) acc[session.user_id] = session;
          return acc;
        }, {});

        setLatestSessionsByStudent(latestByStudent);

        const sessionOwnerById = Object.fromEntries((sessions || []).map((session: any) => [session.id, session.user_id]));

        // 학생별 가장 최근 보고서 인덱싱
        const reportByStudent: Record<string, any> = {};
        (reports || []).forEach((report: any) => {
          const userId = sessionOwnerById[report.session_id];
          if (!userId) return;
          const existing = reportByStudent[userId];
          if (!existing || new Date(report.created_at) > new Date(existing.created_at)) {
            reportByStudent[userId] = report;
          }
        });
        setLatestReportByStudent(reportByStudent);

        const messageStatsBySession = (messages || []).reduce((acc: Record<string, { user: number; total: number; userTexts: string[] }>, message: any) => {
          if (!acc[message.session_id]) acc[message.session_id] = { user: 0, total: 0, userTexts: [] };
          acc[message.session_id].total += 1;
          if (message.role === "user") {
            acc[message.session_id].user += 1;
            if (typeof message.content === "string" && message.content.trim()) {
              acc[message.session_id].userTexts.push(message.content.trim());
            }
          }
          return acc;
        }, {});

        const nextSignalEvidence = approvedStudents.reduce<Record<string, StudentSignalEvidence>>((acc, student) => {
          const latestSession = latestByStudent[student.id];
          const parsed = parseInstructionState(student.instructions);
          const studentSettings = parsed.studentSettings;
          const messageStats = latestSession ? messageStatsBySession[latestSession.id] : undefined;
          acc[student.id] = {
            latestSessionAt: latestSession?.created_at,
            userMessageCount: messageStats?.user || 0,
            totalMessageCount: messageStats?.total || 0,
            recentUserText: (messageStats?.userTexts || []).slice(-8).join("\n").slice(0, 2000),
            hasLearningGoal: Boolean((studentSettings.currentGoals || "").trim()),
            hasCareerInterest: Boolean((studentSettings.careerInterest || "").trim()),
          };
          return acc;
        }, {});
        setSignalEvidenceByStudent(nextSignalEvidence);

        const today = new Date().toISOString().slice(0, 10);
        const todaysSessions = (sessions || []).filter((session: any) => (session.created_at || "").slice(0, 10) === today).length;
        const reportRows = reports || [];
        const atRiskCount = approvedStudents.filter((student) =>
          getStudentSignalStatus(reportByStudent[student.id], Boolean(latestByStudent[student.id]), nextSignalEvidence[student.id]) === "red",
        ).length;

        const monthlyScoreMap = new Map<string, { month: string; total: number; count: number }>();
        const recentSessions = [...(sessions || [])].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        recentSessions.forEach((session: any) => {
          const month = `${new Date(session.created_at).getMonth() + 1}월`;
          if (!monthlyScoreMap.has(month)) monthlyScoreMap.set(month, { month, total: 0, count: 0 });
          const bucket = monthlyScoreMap.get(month)!;
          bucket.count += 1;
          const matchingReport = reportRows.find((report: any) => report.session_id === session.id);
          const misconceptionText = `${matchingReport?.misconceptions || ""}`.toLowerCase();
          const score = matchingReport
            ? misconceptionText.includes("없음") || misconceptionText.includes("양호")
              ? 88
              : misconceptionText.includes("부족") || misconceptionText.includes("혼동") || misconceptionText.includes("오개념")
                ? 68
                : 78
            : 72;
          bucket.total += score;
        });
        const nextPerformanceData = Array.from(monthlyScoreMap.values())
          .slice(-4)
          .map((bucket) => ({
            month: bucket.month,
            score: Math.round(bucket.total / Math.max(bucket.count, 1)),
          }));
        setPerformanceData(nextPerformanceData.length ? nextPerformanceData : CLASS_PERFORMANCE_DATA);

        const conceptBuckets = [
          { subject: "지수함수", keywords: ["지수"] },
          { subject: "로그함수", keywords: ["로그", "ln"] },
          { subject: "삼각함수", keywords: ["삼각", "sin", "cos", "tan"] },
          { subject: "미분계수", keywords: ["미분계수", "도함수", "합성함수", "미분"] },
          { subject: "적분", keywords: ["적분", "치환", "부분적분"] },
        ];
        const nextConceptData = conceptBuckets.map((bucket) => {
          const relatedReports = reportRows.filter((report: any) =>
            bucket.keywords.some((keyword) =>
              `${report.summary || ""} ${report.misconceptions || ""} ${report.recommendations || ""}`.includes(keyword),
            ),
          );
          if (relatedReports.length === 0) return { subject: bucket.subject, A: 72, fullMark: 100 };
          const riskReports = relatedReports.filter((report: any) =>
            /오개념|혼동|부족|어려움|필요/.test(`${report.misconceptions || ""} ${report.recommendations || ""}`),
          ).length;
          return {
            subject: bucket.subject,
            A: Math.max(45, 92 - Math.round((riskReports / relatedReports.length) * 35)),
            fullMark: 100,
          };
        });
        setConceptData(nextConceptData);

        const riskStudents = approvedStudents.filter(
          (student) => getStudentSignalStatus(reportByStudent[student.id], Boolean(latestByStudent[student.id]), nextSignalEvidence[student.id]) === "red",
        );
        setInsightMessage(
          riskStudents.length
            ? `${riskStudents.slice(0, 3).map((student) => student.name).join(", ")} 학생에게 최근 보충 개입 신호가 포착되었습니다. ${selectedClassKey ? `${selectedClassKey.replace("-", "학년 ")}반` : "현재 선택 학급"} 기준으로 오개념 보고서와 교사 개별 지침을 먼저 확인해보세요.`
            : "최근 선택한 학급에서는 심각한 위험 신호가 적습니다. 오늘 생성된 보고서와 세션 수를 기준으로 안정적으로 운영 중입니다.",
        );

        setStats([
          { label: "전체 학생 수", value: String(approvedStudents.length), icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "오늘 학습 세션", value: String(todaysSessions), icon: MessageSquare, color: "text-green-600", bg: "bg-green-50" },
          { label: "누적 보고서", value: String(reportRows.length), icon: BarChart3, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "도움 필요 학생", value: String(atRiskCount), icon: ClipboardCheck, color: "text-red-600", bg: "bg-red-50" }
        ]);
      } catch (error) {
        console.error("Failed to load teacher dashboard:", error);
      }
    };

    loadDashboard();
  }, [selectedClassKey]);

  const handleSaveClassInstructions = async () => {
    if (!profile) return;
    try {
      setSaving(true);
      const teacherContextPatch = {
        classInstruction: buildTeacherPrompt(classInstructions),
        classSettings: { ...classInstructions },
        updatedAt: new Date().toISOString(),
        updatedBy: profile.id,
        updatedByEmail: profile.email,
      };

      // 1. Save to teacher's own profile so instructions persist across sessions
      const teacherParsed = parseInstructionState(profile.instructions);
      await supabase
        .from("users")
        .update({
          instructions: stringifyInstructionState({
            studentSettings: teacherParsed.studentSettings,
            teacherContext: { ...teacherParsed.teacherContext, ...teacherContextPatch },
          }),
        })
        .eq("id", profile.id);

      // 2. Push to all students in the selected class so AI picks up the context
      const updates = dashboardStudents.map(async (student) => {
        const parsed = parseInstructionState(student.instructions);
        return supabase
          .from("users")
          .update({
            instructions: stringifyInstructionState({
              studentSettings: parsed.studentSettings,
              teacherContext: { ...parsed.teacherContext, ...teacherContextPatch },
            }),
          })
          .eq("id", student.id);
      });

      await Promise.all(updates);
      setShowClassInstructions(false);
      alert("학급 공통 지침을 저장하고 전체 학생에게 적용했습니다.");
    } catch (error: any) {
      console.error("Failed to save class instructions:", error);
      alert(`학급 지침 저장에 실패했습니다: ${error?.message || "unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const getStudentSignal = (student: UserProfile): "green" | "yellow" | "red" => {
    return getStudentSignalStatus(
      latestReportByStudent?.[student.id],
      Boolean(latestSessionsByStudent?.[student.id]),
      signalEvidenceByStudent[student.id],
    );
  };

  const getStudentSignalReason = (student: UserProfile): string => {
    return getStudentSignalReasonText(
      latestReportByStudent?.[student.id],
      Boolean(latestSessionsByStudent?.[student.id]),
      signalEvidenceByStudent[student.id],
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
      <section className="rounded-2xl border border-highlight bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-ink">교사 대시보드</h2>
            <p className="mt-1 text-xs font-bold uppercase tracking-widest text-secondary-text opacity-70">학급의 학습 흐름과 개입 신호를 확인합니다.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[520px]">
            <button
              onClick={() => setShowClassInstructions(true)}
              className="group flex cursor-pointer items-center justify-center gap-3 rounded-xl border border-highlight bg-paper px-5 py-4 text-left transition-all hover:border-accent hover:bg-white hover:shadow-md"
            >
              <BookOpen size={22} className="text-accent transition-transform group-hover:scale-110" />
              <span className="text-xs font-black uppercase tracking-widest text-ink">교사 학급 지침</span>
            </button>
            <div className="flex cursor-default items-center justify-center gap-3 rounded-xl border border-highlight bg-paper/70 px-5 py-4 opacity-80">
              <BarChart3 size={22} className="text-secondary-text" />
              <span className="text-xs font-black uppercase tracking-widest text-ink">오늘의 학습 통계 확인</span>
              <span className="rounded-full bg-white px-2 py-1 text-[9px] font-black text-secondary-text">준비중</span>
            </div>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {showClassInstructions && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-sidebar/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl border border-highlight shadow-2xl overflow-hidden"
            >
              <header className="px-10 py-8 border-b border-highlight bg-paper/30 flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black text-ink uppercase tracking-tight">교사 학급 지침</h3>
                  <p className="text-[10px] text-secondary-text font-bold uppercase tracking-widest mt-1">학급: {selectedClassKey ? selectedClassKey.replace("-", "학년 ") + "반" : "전체 학급"} • AI 튜터 동작 방식</p>
                </div>
                <button onClick={() => setShowClassInstructions(false)} className="p-2 hover:bg-paper rounded-full transition-colors"><X size={24} /></button>
              </header>
              <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h4 className="text-[11px] font-black text-accent uppercase tracking-widest border-l-4 border-accent pl-3">학급 공통 지침</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-secondary-text uppercase tracking-widest">이번 주 학습 목표</label>
                        <textarea value={classInstructions.weeklyGoals} onChange={e => setClassInstructions({ ...classInstructions, weeklyGoals: e.target.value })} className="w-full p-4 bg-paper border border-highlight rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-accent h-20 resize-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-secondary-text uppercase tracking-widest">강조 개념</label>
                        <input value={classInstructions.keyConcepts} onChange={e => setClassInstructions({ ...classInstructions, keyConcepts: e.target.value })} className="w-full p-4 bg-paper border border-highlight rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-accent" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-secondary-text uppercase tracking-widest">문제 난이도 기준</label>
                        <input value={classInstructions.difficultyLevel} onChange={e => setClassInstructions({ ...classInstructions, difficultyLevel: e.target.value })} className="w-full p-4 bg-paper border border-highlight rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-accent" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-[11px] font-black text-accent uppercase tracking-widest border-l-4 border-accent pl-3">AI 튜터 동작 지침</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-secondary-text uppercase tracking-widest">질문 및 피드백 방식</label>
                        <select value={classInstructions.aiQuestionStyle} onChange={e => setClassInstructions({ ...classInstructions, aiQuestionStyle: e.target.value as any })} className="w-full p-4 bg-paper border border-highlight rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-accent">
                          <option value="inductive">유도형 (질문을 통해 깨닫게 함)</option>
                          <option value="direct">직접 설명 (개념을 바로 설명함)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-secondary-text uppercase tracking-widest">오개념 대응 방식</label>
                        <textarea value={classInstructions.aiMisconceptionResponse} onChange={e => setClassInstructions({ ...classInstructions, aiMisconceptionResponse: e.target.value })} className="w-full p-4 bg-paper border border-highlight rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-accent h-20 resize-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-secondary-text uppercase tracking-widest">학생 참여 유도 전략</label>
                        <textarea value={classInstructions.aiEngagementStrategy} onChange={e => setClassInstructions({ ...classInstructions, aiEngagementStrategy: e.target.value })} className="w-full p-4 bg-paper border border-highlight rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-accent h-20 resize-none" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-secondary-text uppercase tracking-widest">풀이 방식 지침</label>
                  <textarea value={classInstructions.solvingGuideline} onChange={e => setClassInstructions({ ...classInstructions, solvingGuideline: e.target.value })} className="w-full p-4 bg-paper border border-highlight rounded-xl text-sm font-semibold outline-none focus:ring-1 focus:ring-accent h-24 resize-none leading-relaxed" />
                </div>
              </div>
              <footer className="px-10 py-8 border-t border-highlight bg-paper/10 flex justify-end gap-4">
                <button
                  onClick={() => setShowClassInstructions(false)}
                  className="px-8 py-4 border border-highlight rounded-2xl text-xs font-black text-secondary-text hover:bg-paper transition-all uppercase tracking-widest"
                >취소</button>
                <button
                  onClick={handleSaveClassInstructions}
                  disabled={saving}
                  className="px-10 py-4 bg-accent text-white rounded-2xl text-xs font-black hover:bg-sidebar transition-all shadow-xl shadow-accent/20 uppercase tracking-widest disabled:opacity-50"
                >{saving ? "저장 중..." : "저장 및 전체 적용"}</button>
              </footer>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="teacher-stats-container">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-highlight shadow-sm">
            <div className={cn("p-2 rounded-lg w-fit mb-4", stat.bg, stat.color)}>
              <stat.icon size={20} />
            </div>
            <p className="text-secondary-text text-xs font-semibold uppercase tracking-wider">{stat.label}</p>
            <p className="text-3xl font-black text-ink mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl border border-highlight p-8 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-sm text-ink uppercase tracking-wide">학급 평균 성취도 추이</h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-accent px-2 py-1 bg-paper rounded uppercase">월별 추이</span>
              <span className="rounded-full bg-gray-100 px-2 py-1 text-[9px] font-black text-secondary-text">준비중</span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#718096' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#718096' }} />
                <Tooltip cursor={{ fill: '#F7FAFC' }} contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px', fontWeight: 800 }} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {performanceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === performanceData.length - 1 ? '#4A5568' : '#CBD5E0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-highlight p-8 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-sm text-ink uppercase tracking-wide">단원별 이해도 분석</h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-accent px-2 py-1 bg-paper rounded uppercase">단원 이해도</span>
              <span className="rounded-full bg-gray-100 px-2 py-1 text-[9px] font-black text-secondary-text">준비중</span>
            </div>
          </div>
          <div className="h-64 flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={conceptData}>
                <PolarGrid stroke="#E2E8F0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 700, fill: '#718096' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="이해도" dataKey="A" stroke="#4A5568" fill="#4A5568" fillOpacity={0.15} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px', fontWeight: 800 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Student List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-highlight shadow-sm">
          <div className="p-5 border-b border-highlight flex justify-between items-center bg-gray-50/30 rounded-t-xl">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-sm text-ink uppercase tracking-wide">우리 반 학생 목록</h3>
              <div className="flex items-center gap-3 text-[11px] font-semibold text-secondary-text">
                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-green-400"/>정상</span>
                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-yellow-400"/>주의</span>
                <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-red-500"/>개입필요</span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-secondary-text bg-highlight px-2 py-1 rounded">전체 {dashboardStudents.length}명</span>
          </div>
          <div className="divide-y divide-highlight">
            {dashboardStudents.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm font-bold text-gray-400">표시할 학생 데이터가 없습니다.</div>
            ) : dashboardStudents.map(s => {
              const signal = getStudentSignal(s);
              const signalColor = {
                green: "bg-green-400",
                yellow: "bg-yellow-400",
                red: "bg-red-500",
              }[signal];
              const signalTitle = {
                green: "정상 학습 중",
                yellow: "학습 주의 필요",
                red: "교사 개입 필요",
              }[signal];
              return (
              <Link to={`/teacher/analysis/${s.id}`} key={s.id} className="flex items-center justify-between p-4 px-6 hover:bg-paper transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${signalColor}`} />
                    <div className="absolute bottom-full left-0 mb-2 w-56 rounded-xl bg-gray-900 px-3 py-2.5 text-[10px] font-semibold leading-relaxed text-white shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-normal">
                      <p className="font-black mb-1 text-[9px] uppercase tracking-widest opacity-60">{signalTitle}</p>
                      <p>{getStudentSignalReason(s)}</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-highlight border border-gray-200 flex items-center justify-center text-xs font-bold text-accent">
                    {s.name?.[0] ?? "?"}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ink">{s.name}</p>
                    <p className="text-[10px] text-secondary-text">
                      최근 학습: {latestSessionsByStudent[s.id]?.created_at ? formatDate(new Date(latestSessionsByStudent[s.id].created_at)) : "기록 없음"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[10px] text-secondary-text font-bold">반/번호</p>
                    <p className="text-sm font-black text-accent">{getClassLabel(s)} / {s.number || "-"}</p>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-accent transition-colors" />
                </div>
              </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Analysis Area */}
        <div className="bg-sidebar text-white p-8 rounded-xl relative overflow-hidden flex flex-col justify-end min-h-[300px] shadow-lg" id="teacher-insights-card">
          <div className="absolute top-8 left-8">
            <Bot size={40} className="text-white/20" />
          </div>
          <div>
            <div className="inline-block px-2 py-1 bg-white/10 rounded text-[10px] font-bold uppercase tracking-widest mb-4">오늘의 인사이트</div>
            <h3 className="text-xl font-bold mb-3">AI 인사이트</h3>
            <p className="text-white/70 text-sm mb-8 leading-relaxed">
              {insightMessage}
            </p>
            <Link to="/teacher/analysis" className="inline-flex bg-white text-sidebar font-black px-6 py-3 rounded-lg hover:bg-highlight hover:text-sidebar transition-all text-sm">분석 리포트 확인</Link>
          </div>
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
