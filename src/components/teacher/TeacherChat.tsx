import { useState, useEffect, useRef } from "react";
import { RefreshCcw, Plus, Send, PanelLeftOpen, PanelLeftClose, MessageSquare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { cn, formatDate } from "../../lib/utils";
import { supabase } from "../../supabase";
import { Message } from "../../types";
import { UserProfile, ai, GEMINI_TEXT_MODEL, buildTeacherAssistantInstruction } from "../../lib/ai";
import { SUPABASE_HISTORY_BUCKET, loadStudentArchiveBundle } from "../../lib/archive";
import { getClassKey, getClassLabel, isTeacherVisibleStudent } from "../../lib/userUtils";
import { loadTeacherResourceCards, TeacherResourceItem } from "../../lib/resources";

type ChatSessionRow = {
  id: string;
  title: string | null;
  created_at: string;
  user_id: string;
};

const TEACHER_ACTIVE_SESSION_KEY = "TEACHER_ACTIVE_SESSION_ID";

const TeacherChat = ({ profile, session, selectedClassKey }: { profile: UserProfile | null, session: any, selectedClassKey: string }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSessionRow[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => localStorage.getItem(TEACHER_ACTIVE_SESSION_KEY));
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [userHasSent, setUserHasSent] = useState(false);
  const [input, setInput] = useState("");
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [resourceCards, setResourceCards] = useState<TeacherResourceItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredStudents = students.filter((student) => !selectedClassKey || getClassKey(student) === selectedClassKey);

  const focusChatInput = () => {
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const fixMathDelimiters = (content: string) =>
    content
      .replace(/\\\((.*?)\\\)/g, "$$$1$")
      .replace(/\\\[(.*?)\\\]/g, "$$$$$1$$$$");

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("role", "student")
      .eq("status", "approved")
      .order("grade", { ascending: true })
      .order("class", { ascending: true })
      .order("number", { ascending: true });
    if (error) {
      console.error("Failed to fetch teacher chat students:", error);
      return;
    }
    setStudents(((data || []) as UserProfile[]).filter(isTeacherVisibleStudent));
  };

  const fetchSessions = async () => {
    if (!profile) return;
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch teacher chat sessions:", error);
      return;
    }

    const nextSessions = (data || []) as ChatSessionRow[];
    setSessions(nextSessions);
    if (activeSessionId && !nextSessions.some((item) => item.id === activeSessionId)) {
      const fallback = nextSessions[0]?.id || null;
      setActiveSessionId(fallback);
      if (fallback) localStorage.setItem(TEACHER_ACTIVE_SESSION_KEY, fallback);
      else localStorage.removeItem(TEACHER_ACTIVE_SESSION_KEY);
    }
  };

  const fetchMessages = async (sid: string) => {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", sid)
        .order("created_at", { ascending: true });

      if (error) throw error;
      const nextMessages = (data || []).map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: new Date(m.created_at),
      }));
      setMessages(nextMessages);
      setUserHasSent(nextMessages.some((message) => message.role === "user"));
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  useEffect(() => {
    fetchStudents();
    loadTeacherResourceCards()
      .then(setResourceCards)
      .catch((error) => {
        console.error("Failed to fetch teacher resources:", error);
        setResourceCards([]);
      });
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [profile?.id]);

  useEffect(() => {
    if (!filteredStudents.length) {
      setSelectedStudentId("");
      return;
    }
    setSelectedStudentId((prev) =>
      prev && filteredStudents.some((s) => s.id === prev) ? prev : filteredStudents[0].id,
    );
  }, [filteredStudents]);

  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem(TEACHER_ACTIVE_SESSION_KEY, activeSessionId);
      fetchMessages(activeSessionId);
    } else {
      localStorage.removeItem(TEACHER_ACTIVE_SESSION_KEY);
      setMessages([]);
      setUserHasSent(false);
    }
  }, [activeSessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, isTyping]);

  useEffect(() => {
    if (!loading && !isTyping) {
      focusChatInput();
    }
  }, [loading, isTyping, activeSessionId]);

  const targetStudentsForEvidence = () => {
    if (selectedStudentId) {
      return filteredStudents.filter((student) => student.id === selectedStudentId);
    }
    return filteredStudents.slice(0, 6);
  };

  const buildStudentRawConversationContext = async () => {
    const targetStudents = targetStudentsForEvidence();
    if (!targetStudents.length) {
      return "선택된 학급 또는 학생의 원문 대화가 없습니다.";
    }

    const studentIds = targetStudents.map((student) => student.id);
    const { data: sessionRows, error: sessionError } = await supabase
      .from("chat_sessions")
      .select("id, user_id, title, created_at")
      .in("user_id", studentIds)
      .order("created_at", { ascending: false })
      .limit(selectedStudentId ? 8 : 18);

    if (sessionError) throw sessionError;
    const studentSessions = (sessionRows || []) as ChatSessionRow[];
    if (!studentSessions.length) {
      return "선택된 학생의 저장된 원문 대화 세션이 없습니다.";
    }

    const sessionIds = studentSessions.map((item) => item.id);
    const [{ data: messageRows, error: messageError }, { data: reportRows, error: reportError }] = await Promise.all([
      supabase
        .from("chat_messages")
        .select("session_id, role, content, created_at")
        .in("session_id", sessionIds)
        .order("created_at", { ascending: true }),
      supabase
        .from("reports")
        .select("session_id, summary, misconceptions, recommendations, created_at")
        .in("session_id", sessionIds),
    ]);

    if (messageError) throw messageError;
    if (reportError) throw reportError;

    const messagesBySession = (messageRows || []).reduce<Record<string, any[]>>((acc, message) => {
      if (!acc[message.session_id]) acc[message.session_id] = [];
      acc[message.session_id].push(message);
      return acc;
    }, {});
    const reportBySession = (reportRows || []).reduce<Record<string, any>>((acc, report) => {
      acc[report.session_id] = report;
      return acc;
    }, {});
    const studentById = Object.fromEntries(targetStudents.map((student) => [student.id, student]));

    return studentSessions
      .map((studentSession) => {
        const student = studentById[studentSession.user_id];
        const transcript = (messagesBySession[studentSession.id] || [])
          .slice(-80)
          .map((message) => {
            const speaker = message.role === "assistant" ? "AI 튜터" : "학생";
            return `${speaker}: ${message.content}`;
          })
          .join("\n");
        const report = reportBySession[studentSession.id];

        return [
          `# 원문 대화: ${student?.name || "학생"} / ${student ? getClassLabel(student) : ""} / ${student?.number || "-"}`,
          `세션 제목: ${studentSession.title || "제목 없음"}`,
          `세션 일시: ${studentSession.created_at}`,
          "## 학생-AI 원문 대화",
          transcript || "저장된 메시지가 없습니다.",
          report
            ? [
                "## 보조 보고서 요약",
                `요약: ${report.summary || "없음"}`,
                `오개념/막힌 지점: ${report.misconceptions || "없음"}`,
                `추천: ${report.recommendations || "없음"}`,
              ].join("\n")
            : "## 보조 보고서 요약\n보고서 없음",
        ].join("\n");
      })
      .join("\n\n---\n\n")
      .slice(0, 32000);
  };

  const buildTeacherArchiveContext = async () => {
    const targetStudents = targetStudentsForEvidence();

    if (!targetStudents.length) {
      return "학생 아카이브가 아직 없습니다. 학생 대화가 시작되고 보고서가 생성되면 참고 근거가 축적됩니다.";
    }

    const bundles = await Promise.all(
      targetStudents.map(async (student) => {
        const archive = await loadStudentArchiveBundle(student, true);
        return [
          `# Student: ${student.name}`,
          archive.profile,
          archive.timeline,
          ...archive.sessionDocuments.slice(0, 2).map((document) => document.content),
        ].join("\n\n");
      }),
    );

    return bundles.join("\n\n---\n\n").slice(0, 16000);
  };

  const buildTeacherResourceContext = (question: string) => {
    const tokens = question
      .toLowerCase()
      .split(/[\s,./!?()[\]{}:;]+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 1);

    const student = filteredStudents.find((candidate) => candidate.id === selectedStudentId);
    const scopedResources = resourceCards.filter((item) => {
      const classMatch = !selectedClassKey || !item.classKey || item.classKey === selectedClassKey;
      const gradeMatch = !student || !item.gradeLabel || item.gradeLabel.includes(`${student.grade}`);
      return classMatch && gradeMatch;
    });

    const ranked = scopedResources
      .map((item) => {
        const haystack = [
          item.name,
          item.description,
          item.subject,
          item.unit,
          item.keyConcepts,
          item.importantExamples,
          item.commonMisconceptions,
        ]
          .join(" ")
          .toLowerCase();
        const score = tokens.reduce((total, token) => total + (haystack.includes(token) ? 1 : 0), 0)
          + (selectedClassKey && item.classKey === selectedClassKey ? 2 : 0);
        return { item, score };
      })
      .filter(({ score }) => score > 0 || tokens.length === 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(({ item }) =>
        [
          `자료명: ${item.name}`,
          item.subject ? `과목: ${item.subject}` : "",
          item.gradeLabel ? `학년: ${item.gradeLabel}` : "",
          item.unit ? `단원: ${item.unit}` : "",
          item.description ? `자료 설명: ${item.description}` : "",
          item.keyConcepts ? `핵심 개념: ${item.keyConcepts}` : "",
          item.importantExamples ? `중요 문제/예시: ${item.importantExamples}` : "",
          item.commonMisconceptions ? `자주 나오는 오개념: ${item.commonMisconceptions}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      );

    return ranked.length ? ranked.join("\n\n---\n\n") : "연결된 교과자료 메타데이터가 없습니다.";
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setUserHasSent(false);
    focusChatInput();
  };

  const selectSession = (sid: string) => {
    setActiveSessionId(sid);
    focusChatInput();
  };

  const handleSend = async () => {
    if (!input.trim() || !profile || loading || isTyping) return;
    setLoading(true);
    setUserHasSent(true);

    let sid = activeSessionId;
    const currentInput = input.trim();
    if (!sid) {
      const { data, error } = await supabase
        .from("chat_sessions")
        .insert({
          user_id: profile.id,
          title: `교사 상담: ${currentInput.slice(0, 30)}${currentInput.length > 30 ? "..." : ""}`,
        })
        .select()
        .single();
      if (error) {
        setLoading(false);
        return;
      }
      sid = data.id;
      setActiveSessionId(sid);
    }

    const optimisticUserMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: currentInput,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, optimisticUserMessage]);
    setInput("");
    focusChatInput();

    const { error: msgErr } = await supabase
      .from("chat_messages")
      .insert({ session_id: sid, role: "user", content: currentInput });

    if (msgErr) {
      setLoading(false);
      return;
    }

    setIsTyping(true);
    try {
      const [rawConversationContext, archiveContext] = await Promise.all([
        buildStudentRawConversationContext(),
        buildTeacherArchiveContext(),
      ]);
      const resourceContext = buildTeacherResourceContext(currentInput);
      const transcript = [...messages, optimisticUserMessage]
        .map((message) => `${message.role === "assistant" ? "ASSISTANT" : "TEACHER"}: ${message.content}`)
        .join("\n");
      const selectedStudent = filteredStudents.find((student) => student.id === selectedStudentId);

      const response = await ai.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: [
          buildTeacherAssistantInstruction(profile),
          "중요한 근거 사용 원칙:",
          "1. 학생이 실제로 어떤 문제를 풀었는지, 어떤 말을 했는지, 어디서 막혔는지에 대한 질문은 반드시 '학생-AI 원문 대화'를 1순위 근거로 답한다.",
          "2. 보고서와 아카이브는 2차 보조 근거다. 원문 대화와 보고서가 다르면 원문 대화를 우선한다.",
          "3. 원문 대화에 근거가 없을 때만 '원문 대화에서는 확인되지 않는다'고 말한다. 보고서에 없다는 이유만으로 모른다고 하지 않는다.",
          "4. 수학식은 LaTeX로 쓴다. 인라인 수식은 $...$, 별도 줄 수식은 $$...$$ 형식을 사용한다.",
          `선택 학급: ${selectedClassKey || "전체 학급"}`,
          `선택 학생: ${selectedStudent ? `${selectedStudent.name} / ${getClassLabel(selectedStudent)} / ${selectedStudent.number || "-"}` : "선택 학급 전체"}`,
          "## 1순위 근거: 학생-AI 원문 대화",
          rawConversationContext,
          "## 2순위 근거: 학생 Markdown 아카이브",
          archiveContext,
          "## 3순위 근거: 교과자료 메타데이터",
          resourceContext,
          "## 현재 교사 채팅 흐름",
          transcript,
          `교사 질문: ${currentInput}`,
        ].join("\n\n"),
      });
      const resp = response.text || "응답을 받지 못했습니다.";

      await supabase
        .from("chat_messages")
        .insert({ session_id: sid, role: "assistant", content: resp });
      await Promise.all([fetchMessages(sid), fetchSessions()]);
    } catch (error: any) {
      console.error("Teacher AI error:", error);
      await supabase
        .from("chat_messages")
        .insert({ session_id: sid!, role: "assistant", content: `오류: ${error?.message || "AI 연결 실패"}` });
      await fetchMessages(sid!);
    } finally {
      setIsTyping(false);
      setLoading(false);
      focusChatInput();
    }
  };

  const activeSession = sessions.find((item) => item.id === activeSessionId);

  return (
    <div className="flex h-full overflow-hidden rounded-xl border border-highlight bg-white shadow-sm dark:bg-gray-800">
      <aside
        className={cn(
          "hidden border-r border-highlight bg-paper/60 transition-all md:flex md:flex-col",
          isHistoryOpen ? "w-72" : "w-16",
        )}
      >
        <div className={cn("flex items-center border-b border-highlight p-4", isHistoryOpen ? "justify-between" : "justify-center")}>
          {isHistoryOpen && <h3 className="text-xs font-black uppercase tracking-widest text-ink">교사 대화</h3>}
          <button
            onClick={() => setIsHistoryOpen((prev) => !prev)}
            className="rounded-lg p-2 text-secondary-text transition-colors hover:bg-white hover:text-accent"
            title={isHistoryOpen ? "목록 접기" : "목록 펼치기"}
          >
            {isHistoryOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
        </div>
        <div className="p-3">
          <button
            onClick={handleNewChat}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl border border-highlight bg-white px-3 py-2.5 text-xs font-black text-accent shadow-sm transition-all hover:border-accent",
              !isHistoryOpen && "px-0",
            )}
            title="새 대화"
          >
            <Plus size={14} />
            {isHistoryOpen && "새 대화"}
          </button>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {sessions.length === 0 ? (
            isHistoryOpen && <div className="px-3 py-8 text-center text-xs font-bold text-secondary-text">저장된 교사 대화가 없습니다.</div>
          ) : (
            sessions.map((item) => (
              <button
                key={item.id}
                onClick={() => selectSession(item.id)}
                className={cn(
                  "w-full rounded-xl border px-3 py-3 text-left transition-all",
                  activeSessionId === item.id
                    ? "border-accent bg-white text-accent shadow-sm"
                    : "border-transparent text-secondary-text hover:border-highlight hover:bg-white",
                  !isHistoryOpen && "flex h-10 items-center justify-center p-0",
                )}
                title={item.title || "교사 대화"}
              >
                {isHistoryOpen ? (
                  <>
                    <p className="truncate text-xs font-black text-ink">{item.title || "교사 대화"}</p>
                    <p className="mt-1 text-[10px] font-semibold text-secondary-text">{formatDate(new Date(item.created_at))}</p>
                  </>
                ) : (
                  <MessageSquare size={15} />
                )}
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="relative flex min-w-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-highlight bg-gray-50/20 px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-ink dark:text-white">AI 수업 보조 어시스턴트</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-secondary-text">
                학생 원문 대화를 우선 근거로 분석합니다.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleNewChat}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-highlight bg-paper px-3 py-1.5 text-xs font-bold text-secondary-text transition-all hover:border-accent hover:text-accent md:hidden"
              >
                <Plus size={13} /> 새 대화
              </button>
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              <span className="text-[10px] font-black uppercase text-green-600">연결됨</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-secondary-text">대상 학생</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full rounded-xl border border-highlight bg-paper px-4 py-3 text-sm font-semibold text-ink outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">선택 학급 전체</option>
                {filteredStudents.map((student) => (
                  <option key={student.id} value={student.id}>{student.name} / {getClassLabel(student)} / {student.number || "-"}</option>
                ))}
              </select>
            </div>
            <div className="rounded-2xl border border-highlight bg-paper px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-accent">근거 우선순위</p>
              <p className="mt-2 text-sm font-semibold text-ink">
                원문 대화 → {SUPABASE_HISTORY_BUCKET} 아카이브 → 보고서 → 교과자료
              </p>
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-paper/30 p-4 md:p-6">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
              <MessageSquare size={54} className="text-gray-300" />
              <h3 className="mt-5 text-lg font-black uppercase tracking-tight text-ink">교사 대화를 시작하세요</h3>
              <p className="mt-2 max-w-md text-xs font-bold leading-relaxed text-secondary-text">
                학생이 실제로 어떤 문제를 풀었는지, 어느 지점에서 막혔는지 원문 대화를 기준으로 물어볼 수 있습니다.
              </p>
            </div>
          )}
          {messages.map((m) => (
            <div key={m.id} className={cn("flex max-w-[88%] flex-col", m.role === "user" ? "ml-auto items-end" : "mr-auto items-start")}>
              <div
                className={cn(
                  "rounded-2xl border p-4 text-sm leading-relaxed shadow-sm",
                  m.role === "user"
                    ? "rounded-tr-none border-[#CBD5E0] bg-[#EDF2F7] text-ink"
                    : "rounded-tl-none border-highlight bg-[#F7FAFC] text-ink",
                )}
              >
                <div className="markdown-body prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{ img: ({ src, alt }) => <img src={src} alt={alt || ""} className="mt-2 max-h-64 max-w-full rounded-xl object-contain" /> }}
                  >
                    {fixMathDelimiters(m.content)}
                  </ReactMarkdown>
                </div>
              </div>
              <span className="mt-1.5 px-1 text-xs font-medium text-secondary-text">
                {m.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
          {(loading || isTyping) && (
            <div className="mr-auto flex max-w-[85%] flex-col items-start">
              <div className="flex items-center gap-1.5 rounded-2xl border border-highlight bg-white px-4 py-3 shadow-sm dark:bg-gray-900">
                <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-accent" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-highlight bg-white p-4 dark:bg-gray-800">
          {!userHasSent && (
            <div className="mb-4 flex flex-wrap gap-2">
              {[
                "선택한 학생이 최근에 풀었던 문제를 원문 대화 기준으로 알려줘",
                "이 학생이 어디에서 막혔는지 학생 발화와 함께 정리해줘",
                "다음 수업에서 바로 쓸 피드백 문구를 근거와 함께 만들어줘",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q);
                    focusChatInput();
                  }}
                  className="rounded-lg border border-highlight bg-paper px-3 py-1.5 text-[10px] font-bold text-secondary-text transition-all hover:border-accent hover:text-accent"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2 rounded-xl border border-highlight bg-paper p-1 transition-all focus-within:ring-1 focus-within:ring-accent">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 bg-transparent px-4 text-sm font-semibold text-ink outline-none"
              placeholder="궁금한 내용을 입력하세요..."
              disabled={loading || isTyping}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading || isTyping}
              className={cn(
                "flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs font-black uppercase tracking-widest shadow-md transition-all",
                input.trim() && !loading && !isTyping ? "bg-accent text-white hover:bg-sidebar" : "cursor-not-allowed bg-gray-100 text-gray-400",
              )}
            >
              {loading || isTyping ? <RefreshCcw size={14} className="animate-spin" /> : <Send size={14} />}
              질문하기
            </button>
          </div>
          {activeSession && (
            <p className="mt-2 text-[10px] font-semibold text-secondary-text">현재 대화: {activeSession.title || "교사 대화"}</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default TeacherChat;
