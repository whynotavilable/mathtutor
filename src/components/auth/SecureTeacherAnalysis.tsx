import { useState, useEffect, type MouseEvent } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { X, RefreshCcw, BookOpenCheck, FileDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { cn } from "../../lib/utils";
import { supabase } from "../../supabase";
import { Message } from "../../types";
import { TeacherInstructions } from "../../types";
import { UserProfile, ai, GEMINI_TEXT_MODEL } from "../../lib/ai";
import { DEFAULT_TEACHER_INSTRUCTIONS, parseInstructionState, stringifyInstructionState, buildTeacherPrompt } from "../../lib/instructions";
import { LearningReport, ArchivedSessionDocument, normalizeReportText, exportLearningReportPdf, loadStudentArchiveBundle, hasSessionActivitySinceReport } from "../../lib/archive";
import { getClassKey, getClassLabel, isTeacherVisibleStudent } from "../../lib/userUtils";
import { getStudentSignal as getStudentSignalStatus, getStudentSignalReason as getStudentSignalReasonText } from "../../lib/studentSignals";
import { Type } from "@google/genai";

const SecureTeacherAnalysis = ({ profile, selectedClassKey = "" }: { profile: UserProfile | null; selectedClassKey?: string }) => {
  const location = useLocation();
  const selectedStudentIdFromRoute = location.pathname.split("/").pop();
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [report, setReport] = useState<LearningReport | null>(null);
  const [activeTab, setActiveTab] = useState<"report" | "chat" | "history">("report");
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [tempInstructions, setTempInstructions] = useState<TeacherInstructions>({ ...DEFAULT_TEACHER_INSTRUCTIONS });
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveProfile, setArchiveProfile] = useState("");
  const [archiveTimeline, setArchiveTimeline] = useState("");
  const [archiveSessions, setArchiveSessions] = useState<ArchivedSessionDocument[]>([]);
  const [expandedArchiveSession, setExpandedArchiveSession] = useState<string | null>(null);
  const isReportStale = hasSessionActivitySinceReport(messages, report);
  const [latestReportByStudent, setLatestReportByStudent] = useState<Record<string, any>>({});
  const [latestSessionByStudent, setLatestSessionByStudent] = useState<Record<string, any>>({});
  const [signalTooltip, setSignalTooltip] = useState<{ x: number; y: number; label: string; reason: string } | null>(null);

  const fetchStudents = async () => {
    const { data, error } = await supabase.from("users").select("*").eq("role", "student").eq("status", "approved").order("grade", { ascending: true }).order("class", { ascending: true }).order("number", { ascending: true });
    if (error) {
      console.error("Failed to fetch students:", error);
      return;
    }
    const nextStudents = (data || []).filter(isTeacherVisibleStudent);
    setStudents(nextStudents);
    fetchAllStudentReports(nextStudents);
    setSelectedStudent((current) => {
      if (selectedStudentIdFromRoute && nextStudents.some((student) => student.id === selectedStudentIdFromRoute)) {
        return nextStudents.find((student) => student.id === selectedStudentIdFromRoute) || null;
      }
      if (!current) return nextStudents[0] || null;
      return nextStudents.find((student) => student.id === current.id) || nextStudents[0] || null;
    });
  };

  const fetchSessions = async (studentId: string) => {
    const { data, error } = await supabase.from("chat_sessions").select("*").eq("user_id", studentId).order("created_at", { ascending: false });
    if (error) {
      console.error("Failed to fetch sessions:", error);
      return;
    }
    const nextSessions = data || [];
    setSessions(nextSessions);
    setSelectedSession((current: any) => nextSessions.find((session) => session.id === current?.id) || nextSessions[0] || null);
  };

  const fetchSessionDetails = async (sessionId: string) => {
    const [{ data: messageData, error: messageError }, { data: reportData, error: reportError }] = await Promise.all([
      supabase.from("chat_messages").select("*").eq("session_id", sessionId).order("created_at", { ascending: true }),
      supabase.from("reports").select("*").eq("session_id", sessionId).maybeSingle(),
    ]);
    if (messageError) console.error("Failed to fetch session messages:", messageError);
    if (reportError && reportError.code !== "PGRST116") console.error("Failed to fetch report:", reportError);
    setMessages((messageData || []).map((message) => ({ id: message.id, role: message.role, content: message.content, timestamp: new Date(message.created_at) })));
    setReport(reportData || null);
  };

  const fetchArchive = async (student: UserProfile) => {
    setArchiveLoading(true);
    try {
      const archive = await loadStudentArchiveBundle(student, true);
      setArchiveProfile(archive.profile);
      setArchiveTimeline(archive.timeline);
      setArchiveSessions(archive.sessionDocuments);
      setExpandedArchiveSession(archive.sessionDocuments[0]?.filename || null);
    } catch (error) {
      console.error("Failed to fetch archive:", error);
      setArchiveProfile("");
      setArchiveTimeline("");
      setArchiveSessions([]);
      setExpandedArchiveSession(null);
    } finally {
      setArchiveLoading(false);
    }
  };

  const fetchAllStudentReports = async (studentList: UserProfile[]) => {
    if (!studentList.length) return;
    const ids = studentList.map((s) => s.id);
    const { data: allSessions } = await supabase.from("chat_sessions").select("id, user_id").in("user_id", ids);
    if (!allSessions?.length) return;
    const sessionOwner = Object.fromEntries(allSessions.map((s) => [s.id, s.user_id]));
    const sessionByStudent: Record<string, any> = {};
    allSessions.forEach((s) => { if (!sessionByStudent[s.user_id]) sessionByStudent[s.user_id] = s; });
    setLatestSessionByStudent(sessionByStudent);
    const sessionIds = allSessions.map((s) => s.id);
    const { data: allReports } = await supabase.from("reports").select("*").in("session_id", sessionIds).order("created_at", { ascending: false });
    const reportMap: Record<string, any> = {};
    (allReports || []).forEach((r) => {
      const userId = sessionOwner[r.session_id];
      if (userId && !reportMap[userId]) reportMap[userId] = r;
    });
    setLatestReportByStudent(reportMap);
  };

  useEffect(() => { fetchStudents(); }, []);
  useEffect(() => { setClassFilter(selectedClassKey); }, [selectedClassKey]);
  useEffect(() => {
    if (!selectedStudent?.id) {
      setSessions([]);
      setSelectedSession(null);
      setArchiveProfile("");
      setArchiveTimeline("");
      setArchiveSessions([]);
      setExpandedArchiveSession(null);
      return;
    }
    fetchSessions(selectedStudent.id);
    fetchArchive(selectedStudent);
  }, [selectedStudent?.id]);
  useEffect(() => { if (selectedSession?.id) fetchSessionDetails(selectedSession.id); else { setMessages([]); setReport(null); } }, [selectedSession?.id]);

  const filteredStudents = students.filter((student) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const matchesSearch = !normalizedSearch || student.name.toLowerCase().includes(normalizedSearch) || (student.email || "").toLowerCase().includes(normalizedSearch);
    const matchesClass = !classFilter || getClassKey(student) === classFilter;
    return matchesSearch && matchesClass;
  });
  useEffect(() => {
    if (!filteredStudents.length) {
      setSelectedStudent(null);
      setSelectedSession(null);
      return;
    }
    if (!selectedStudent || !filteredStudents.some((student) => student.id === selectedStudent.id)) {
      setSelectedStudent(filteredStudents[0]);
    }
  }, [filteredStudents, selectedStudent]);

  const classOptions = Array.from(new Set(students.map((student) => getClassKey(student)).filter(Boolean))).map((key) => {
    const classStudent = students.find((student) => getClassKey(student) === key)!;
    return { key, label: getClassLabel(classStudent) };
  });

  const getStudentSignal = (student: UserProfile): "green" | "yellow" | "red" => {
    return getStudentSignalStatus(latestReportByStudent[student.id], Boolean(latestSessionByStudent[student.id]));
  };

  const getStudentSignalReason = (student: UserProfile): string => {
    return getStudentSignalReasonText(latestReportByStudent[student.id], Boolean(latestSessionByStudent[student.id]));
  };

  const signalColorClass = { green: "bg-green-400", yellow: "bg-yellow-400", red: "bg-red-500" };
  const signalLabel = { green: "정상 학습 중", yellow: "학습 주의 필요", red: "교사 개입 필요" };

  const updateSignalTooltip = (event: MouseEvent, student: UserProfile, signal: "green" | "yellow" | "red") => {
    const width = 208;
    const estimatedHeight = 96;
    setSignalTooltip({
      x: Math.max(12, event.clientX - width - 14),
      y: Math.min(window.innerHeight - estimatedHeight - 12, event.clientY + 16),
      label: signalLabel[signal],
      reason: getStudentSignalReason(student),
    });
  };

  const openInstructionModal = () => {
    if (!selectedStudent) return;
    const parsed = parseInstructionState(selectedStudent.instructions);
    setTempInstructions({ ...DEFAULT_TEACHER_INSTRUCTIONS, ...(parsed.teacherContext.studentSettings || {}) });
    setShowInstructionModal(true);
  };

  const handleApplyStudentInstructions = async () => {
    if (!selectedStudent) return;
    setSaving(true);
    try {
      const parsed = parseInstructionState(selectedStudent.instructions);
      const { error } = await supabase.from("users").update({
        instructions: stringifyInstructionState({
          studentSettings: parsed.studentSettings,
          teacherContext: {
            ...parsed.teacherContext,
            studentSettings: tempInstructions,
            studentInstruction: `${selectedStudent.name} individual guidance`,
            updatedAt: new Date().toISOString(),
            updatedBy: profile?.name,
            updatedByEmail: profile?.email,
          },
        }),
      }).eq("id", selectedStudent.id);
      if (error) throw error;
      await fetchStudents();
      setShowInstructionModal(false);
    } catch (error: any) {
      alert(error.message || "Failed to save student guidance.");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateTeacherReport = async () => {
    if (!selectedSession?.id || !selectedStudent || messages.length === 0 || isGeneratingReport) return;
    setIsGeneratingReport(true);
    try {
      const { data: existingSession, error: sessionError } = await supabase
        .from("chat_sessions")
        .select("id")
        .eq("id", selectedSession.id)
        .eq("user_id", selectedStudent.id)
        .maybeSingle();
      if (sessionError) throw sessionError;
      if (!existingSession) {
        throw new Error("이 보고서와 연결된 학습 세션을 찾지 못했습니다. 세션 목록을 새로고침한 뒤 다시 시도해 주세요.");
      }

      const parsed = parseInstructionState(selectedStudent.instructions);
      const chatContext = messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join("\n");
      const response = await ai.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: `당신은 대한민국 고등학생 수학 학습을 분석하는 교사용 학습 리포트 작성 도우미입니다.

반드시 지켜야 할 규칙:
1. 출력 내용은 모두 자연스러운 한국어로 작성합니다.
2. JSON의 키 이름은 영어 그대로 유지하되, 각 값의 내용은 한국어로만 작성합니다.
3. summary, misconceptions, recommendations 안에는 마크다운 문법 기호를 넣지 않습니다.
4. 별표(*), 샵(#), 백틱(\`), 대시 목록(-), 밑줄(_) 같은 마크다운 표시를 쓰지 않습니다.
5. 불필요한 큰따옴표로 문장을 감싸지 않습니다.
6. 교사가 바로 활용할 수 있게 구체적으로 씁니다.

학생 이름: ${selectedStudent.name}
현재 학습 목표: ${parsed.studentSettings.currentGoals || "명시되지 않음"}
교사 지침:
${buildTeacherPrompt(parsed.teacherContext.classSettings, parsed.teacherContext.classInstruction) || "없음"}
${buildTeacherPrompt(parsed.teacherContext.studentSettings, parsed.teacherContext.studentInstruction) || ""}

대화 기록:
${chatContext}

다음 JSON 형식으로만 응답하세요:
{
  "summary": "이번 학습의 핵심 내용과 학생의 이해 정도를 한국어로 요약",
  "misconceptions": "대화에서 드러난 오개념, 실수, 혼동 지점을 한국어로 설명",
  "recommendations": "다음 학습 방향과 구체적인 개입 조언을 한국어로 제안"
}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              misconceptions: { type: Type.STRING },
              recommendations: { type: Type.STRING },
            },
            required: ["summary", "misconceptions", "recommendations"],
          },
        },
      });

      const reportData = JSON.parse(response.text || "{}");
      const reportPayload = {
        session_id: selectedSession.id,
        summary: normalizeReportText(reportData.summary, "요약 정보가 없습니다."),
        misconceptions: normalizeReportText(reportData.misconceptions, "뚜렷한 오개념이 발견되지 않았습니다."),
        recommendations: normalizeReportText(reportData.recommendations, "현재 학습 흐름을 유지하며 다음 단계를 준비하세요."),
      };
      const { data: existingReport } = await supabase
        .from("reports")
        .select("id")
        .eq("session_id", selectedSession.id)
        .maybeSingle();
      const reportQuery = existingReport
        ? supabase.from("reports").update(reportPayload).eq("id", existingReport.id)
        : supabase.from("reports").insert(reportPayload);
      const { data, error } = await reportQuery.select().single();
      if (error) throw error;
      setReport(data);
      setActiveTab("report");
      await fetchArchive(selectedStudent);
      alert("교사용 학습 보고서가 생성되었습니다.");
    } catch (error: any) {
      alert(error?.message || "보고서 생성에 실패했습니다.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const expandedSessionContent = archiveSessions.find((sessionFile) => sessionFile.filename === expandedArchiveSession)?.content || "";

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[280px_320px_minmax(0,1fr)] h-full min-h-0">
      <div className="min-h-[500px] overflow-hidden rounded-2xl border border-highlight bg-white shadow-sm">
        <div className="space-y-3 border-b border-highlight p-5">
          <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="학생 이름 또는 이메일 검색" className="w-full rounded-xl border border-highlight bg-paper px-4 py-3 text-sm font-semibold outline-none" />
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="w-full rounded-xl border border-highlight bg-paper px-4 py-3 text-sm font-semibold outline-none">
            <option value="">전체 학급</option>
            {classOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
          </select>
        </div>
        <div className="divide-y divide-highlight overflow-y-auto">
          {filteredStudents.map((student) => {
            const signal = getStudentSignal(student);
            return (
              <button key={student.id} onClick={() => setSelectedStudent(student)} className={cn("group relative w-full px-5 py-4 text-left transition-all hover:bg-paper", selectedStudent?.id === student.id && "bg-paper")}>
                <div className="flex items-center gap-2.5">
                  <div
                    className="relative flex-shrink-0"
                    onMouseEnter={(event) => updateSignalTooltip(event, student, signal)}
                    onMouseMove={(event) => updateSignalTooltip(event, student, signal)}
                    onMouseLeave={() => setSignalTooltip(null)}
                  >
                    <span className={`inline-block w-2 h-2 rounded-full ${signalColorClass[signal]}`} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-ink">{student.name}</p>
                    <p className="text-[10px] font-bold text-secondary-text">{getClassLabel(student)} / {student.number || "-"}번</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="min-h-[500px] overflow-hidden rounded-2xl border border-highlight bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-highlight p-5">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-ink">학습 세션</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-secondary-text">{selectedStudent ? `${selectedStudent.name} / ${getClassLabel(selectedStudent)}` : "학생을 선택하세요"}</p>
          </div>
          <button onClick={openInstructionModal} disabled={!selectedStudent} className="rounded-xl bg-accent px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50">교사 개별 지침</button>
        </div>
        <div className="divide-y divide-highlight overflow-y-auto">
          {sessions.map((sessionItem) => (
            <button key={sessionItem.id} onClick={() => setSelectedSession(sessionItem)} className={cn("w-full px-5 py-4 text-left transition-all hover:bg-paper", selectedSession?.id === sessionItem.id && "bg-paper")}>
              <p className="text-sm font-black text-ink">{sessionItem.title}</p>
              <p className="text-[10px] font-bold text-secondary-text">{new Date(sessionItem.created_at).toLocaleString()}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-[500px] overflow-hidden rounded-2xl border border-highlight bg-white shadow-sm flex flex-col">
        <div className="flex h-16 items-center justify-between border-b border-highlight px-6">
          <div className="flex h-full gap-6">
            {(["report", "chat", "history"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={cn("h-full border-b-2 px-1 text-[11px] font-black uppercase tracking-widest transition-all", activeTab === tab ? "border-accent text-accent" : "border-transparent text-secondary-text")}>{tab === "report" ? "보고서" : tab === "chat" ? "대화 기록" : "학습 이력"}</button>
            ))}
          </div>
          <button onClick={fetchStudents} className="text-xs font-black text-accent">새로고침</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedStudent ? (
            <div className="flex h-full items-center justify-center text-sm font-bold text-gray-400">진행 상황을 보려면 학생을 선택하세요.</div>
          ) : activeTab !== "history" && !selectedSession ? (
            <div className="flex h-full items-center justify-center text-sm font-bold text-gray-400">보고서나 원본 대화를 보려면 세션을 선택하세요.</div>
          ) : activeTab === "report" ? (
            report ? (
              <div className="space-y-6">
                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleGenerateTeacherReport}
                    disabled={isGeneratingReport || messages.length === 0}
                    className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-black text-white disabled:opacity-50"
                  >
                    {isGeneratingReport ? <RefreshCcw size={14} className="animate-spin" /> : <BookOpenCheck size={14} />}
                    {isGeneratingReport ? "생성 중..." : "보고서 다시 생성"}
                  </button>
                  <button
                    onClick={() =>
                      exportLearningReportPdf({
                        title: "Teacher Learning Report",
                        studentName: selectedStudent?.name,
                        classLabel: selectedStudent ? getClassLabel(selectedStudent) : undefined,
                        sessionTitle: selectedSession?.title,
                        createdAt: report.created_at,
                        summary: normalizeReportText(report.summary),
                        misconceptions: normalizeReportText(report.misconceptions),
                        recommendations: normalizeReportText(report.recommendations),
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-highlight px-4 py-2 text-xs font-black text-accent"
                  >
                    <FileDown size={14} />
                    PDF 내보내기
                  </button>
                </div>
                <div className="rounded-2xl border border-highlight bg-paper p-5"><p className="mb-2 text-[10px] font-black uppercase tracking-widest text-accent">학습 요약</p><div className="prose prose-sm max-w-none text-ink"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{normalizeReportText(report.summary)}</ReactMarkdown></div></div>
                <div className="rounded-2xl border border-highlight bg-paper p-5"><p className="mb-2 text-[10px] font-black uppercase tracking-widest text-accent">오개념 및 막힌 지점</p><div className="prose prose-sm max-w-none text-ink"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{normalizeReportText(report.misconceptions)}</ReactMarkdown></div></div>
                <div className="rounded-2xl border border-highlight bg-paper p-5"><p className="mb-2 text-[10px] font-black uppercase tracking-widest text-accent">추천 개입</p><div className="prose prose-sm max-w-none text-ink"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{normalizeReportText(report.recommendations)}</ReactMarkdown></div></div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="text-sm font-bold text-gray-400">이 세션에는 아직 생성된 보고서가 없습니다.</div>
                <button
                  onClick={handleGenerateTeacherReport}
                  disabled={isGeneratingReport || messages.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-xs font-black text-white disabled:opacity-50"
                >
                  {isGeneratingReport ? <RefreshCcw size={14} className="animate-spin" /> : <BookOpenCheck size={14} />}
                  {isGeneratingReport ? "보고서 생성 중..." : "보고서 생성"}
                </button>
              </div>
            )
          ) : activeTab === "chat" ? (
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={cn("max-w-[90%] rounded-2xl px-4 py-3", message.role === "user" ? "ml-auto bg-sidebar text-white" : "border border-highlight bg-paper text-ink")}>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest opacity-60">{message.role === "user" ? "학생" : "AI 튜터"}</p>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
                </div>
              ))}
            </div>
          ) : archiveLoading ? (
            <div className="flex h-full items-center justify-center text-sm font-bold text-gray-400">학습 이력을 불러오는 중입니다.</div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-2xl border border-highlight bg-paper p-5"><p className="mb-3 text-[10px] font-black uppercase tracking-widest text-accent">학생 아카이브</p><div className="prose prose-sm max-w-none"><ReactMarkdown>{archiveProfile}</ReactMarkdown></div></div>
              <div className="rounded-2xl border border-highlight bg-paper p-5"><p className="mb-3 text-[10px] font-black uppercase tracking-widest text-accent">학습 타임라인</p><div className="prose prose-sm max-w-none"><ReactMarkdown>{archiveTimeline}</ReactMarkdown></div></div>
              <div className="rounded-2xl border border-highlight bg-paper p-5">
                <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-accent">세션 문서</p>
                {archiveSessions.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {archiveSessions.map((sessionFile) => (
                        <button key={sessionFile.filename} onClick={() => setExpandedArchiveSession(sessionFile.filename)} className={cn("rounded-xl border px-3 py-2 text-xs font-black transition-all", expandedArchiveSession === sessionFile.filename ? "border-accent bg-accent text-white" : "border-highlight bg-white text-secondary-text")}>{sessionFile.filename}</button>
                      ))}
                    </div>
                    {expandedArchiveSession && <div className="rounded-2xl border border-highlight bg-white p-4"><div className="prose prose-sm max-w-none"><ReactMarkdown>{expandedSessionContent}</ReactMarkdown></div></div>}
                  </div>
                ) : <p className="text-sm font-semibold text-gray-400">아직 저장된 세션 문서가 없습니다.</p>}
              </div>
            </div>
          )}
        </div>
      </div>
      {signalTooltip && (
        <div
          className="pointer-events-none fixed z-[300] w-52 rounded-xl bg-gray-900 px-3 py-2.5 text-[10px] font-semibold leading-relaxed text-white shadow-xl whitespace-normal"
          style={{ left: signalTooltip.x, top: signalTooltip.y }}
        >
          <p className="font-black mb-1 text-[9px] uppercase tracking-widest opacity-60">{signalTooltip.label}</p>
          <p>{signalTooltip.reason}</p>
        </div>
      )}
      <AnimatePresence>
        {showInstructionModal && (
          <div className="fixed inset-0 z-[220] flex items-center justify-center bg-sidebar/60 p-6 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-3xl overflow-hidden rounded-3xl border border-highlight bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-highlight px-8 py-6">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-ink">교사 개별 지침</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-secondary-text">{selectedStudent?.name} 학생에게만 적용됩니다</p>
                </div>
                <button onClick={() => setShowInstructionModal(false)} className="rounded-full p-2 transition-colors hover:bg-paper"><X size={20} /></button>
              </div>
              <div className="max-h-[70vh] space-y-4 overflow-y-auto p-8">
                {[
                  ["weeklyGoals", "주간 학습 목표"],
                  ["keyConcepts", "핵심 개념"],
                  ["solvingGuideline", "풀이 지침"],
                  ["difficultyLevel", "난이도 기준"],
                  ["feedbackStyle", "피드백 방식"],
                  ["aiMisconceptionResponse", "오개념 대응 방식"],
                  ["aiEngagementStrategy", "학생 참여 유도 전략"],
                ].map(([field, label]) => (
                  <div key={field} className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-secondary-text">{label}</label>
                    <textarea value={(tempInstructions as any)[field] || ""} onChange={(e) => setTempInstructions({ ...tempInstructions, [field]: e.target.value })} className="h-24 w-full resize-none rounded-xl border border-highlight bg-paper p-4 text-sm font-semibold outline-none" />
                  </div>
                ))}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-secondary-text">질문 방식</label>
                  <select value={tempInstructions.aiQuestionStyle} onChange={(e) => setTempInstructions({ ...tempInstructions, aiQuestionStyle: e.target.value as "inductive" | "direct" })} className="w-full rounded-xl border border-highlight bg-paper p-4 text-sm font-semibold outline-none">
                    <option value="inductive">유도형</option>
                    <option value="direct">직접형</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-highlight px-8 py-6">
                <button onClick={() => setShowInstructionModal(false)} className="rounded-xl border border-highlight px-5 py-3 text-xs font-black text-secondary-text">취소</button>
                <button onClick={handleApplyStudentInstructions} disabled={saving} className="rounded-xl bg-accent px-5 py-3 text-xs font-black text-white disabled:opacity-50">{saving ? "저장 중..." : "지침 저장"}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SecureTeacherAnalysis;
