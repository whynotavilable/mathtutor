import { useState, useEffect, useRef } from "react";
import { RefreshCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "../../lib/utils";
import { supabase } from "../../supabase";
import { Message } from "../../types";
import { UserProfile, ai, GEMINI_TEXT_MODEL, buildTeacherAssistantInstruction } from "../../lib/ai";
import { SUPABASE_HISTORY_BUCKET, loadStudentArchiveBundle } from "../../lib/archive";
import { getClassKey, getClassLabel, isTeacherVisibleStudent } from "../../lib/userUtils";
import { loadTeacherResourceCards, TeacherResourceItem } from "../../lib/resources";

const TeacherChat = ({ profile, session, selectedClassKey }: { profile: UserProfile | null, session: any, selectedClassKey: string }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [resourceCards, setResourceCards] = useState<TeacherResourceItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredStudents = students.filter((student) => !selectedClassKey || getClassKey(student) === selectedClassKey);

  const focusChatInput = () => {
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

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

  const fetchMessages = async (sid: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sid)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []).map(m => ({
        id: m.id,
        role: m.role as any,
        content: m.content,
        timestamp: new Date(m.created_at)
      })));
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
    const initSession = async () => {
      if (!profile) return;
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        setActiveSessionId(data[0].id);
        fetchMessages(data[0].id);
      } else {
        setMessages([
          {
            id: '1',
            role: 'assistant',
            content: '안녕하세요, 선생님! 오늘은 어떤 학생의 학습 데이터를 분석해 드릴까요? 혹은 수업 자료 제작에 도움이 필요하신가요?',
            timestamp: new Date()
          }
        ]);
      }
    };
    initSession();
  }, [profile]);

  useEffect(() => {
    if (!filteredStudents.length) {
      setSelectedStudentId("");
      return;
    }
    if (!selectedStudentId || !filteredStudents.some((student) => student.id === selectedStudentId)) {
      setSelectedStudentId(filteredStudents[0].id);
    }
  }, [selectedStudentId, filteredStudents]);

  useEffect(() => {
    if (!loading) {
      focusChatInput();
    }
  }, [loading, activeSessionId]);

  const buildTeacherArchiveContext = async () => {
    const targetStudents = selectedStudentId
      ? filteredStudents.filter((student) => student.id === selectedStudentId)
      : filteredStudents.slice(0, 4);

    if (!targetStudents.length) {
      return "학생 아카이브가 아직 없습니다. 학생이 대화를 시작하고 보고서가 생성되면 참고 근거가 축적됩니다.";
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

    return bundles.join("\n\n---\n\n");
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

  const handleSend = async () => {
    if (!input.trim() || !profile) return;
    setLoading(true);

    let sid = activeSessionId;
    if (!sid) {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: profile.id,
          title: `교사 상담: ${input.slice(0, 20)}...`
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

    const { error: msgErr } = await supabase
      .from('chat_messages')
      .insert({ session_id: sid, role: 'user', content: input });

    if (msgErr) {
      setLoading(false);
      return;
    }

    const currentInput = input;
    setInput("");
    focusChatInput();
    await fetchMessages(sid!);

    try {
      const archiveContext = await buildTeacherArchiveContext();
      const resourceContext = buildTeacherResourceContext(currentInput);
      const transcript = [...messages, { id: "draft", role: "user", content: currentInput, timestamp: new Date() } as Message]
        .map((message) => `${message.role === "assistant" ? "ASSISTANT" : "USER"}: ${message.content}`)
        .join("\n");

      const response = await ai.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: [
          buildTeacherAssistantInstruction(profile),
          `Selected class: ${selectedClassKey || "전체 학급"}`,
          `Selected student: ${filteredStudents.find((student) => student.id === selectedStudentId)?.name || "전체 학생"}`,
          "Use the following markdown archives as your primary evidence. If evidence is insufficient, say so clearly.",
          archiveContext,
          "Use the following teaching material notes as your secondary evidence source.",
          resourceContext,
          "Conversation so far:",
          transcript,
          `Teacher request: ${currentInput}`,
        ].join("\n\n"),
      });
      const resp = response.text || "응답을 받지 못했습니다.";

      await supabase
        .from('chat_messages')
        .insert({ session_id: sid!, role: 'assistant', content: resp });
      await fetchMessages(sid!);
    } catch (error: any) {
      console.error("Teacher AI error:", error);
      await supabase
        .from('chat_messages')
        .insert({ session_id: sid!, role: 'assistant', content: `오류: ${error?.message || "AI 연결 실패"}` });
      await fetchMessages(sid!);
    } finally {
      setLoading(false);
      focusChatInput();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-xl border border-highlight overflow-hidden shadow-sm relative">
      <div className="px-6 py-6 border-b border-highlight bg-gray-50/20 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-black text-ink dark:text-white uppercase tracking-tight">AI 수업 보조 어시스턴트</h2>
          <p className="text-[10px] text-secondary-text font-bold uppercase tracking-widest">학생 md 아카이브와 보고서를 근거로 답변합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-[10px] font-black text-green-600 uppercase">연결됨</span>
        </div>
      </div>

      <div className="border-b border-highlight bg-white px-6 py-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-secondary-text">대상 학생</label>
            <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="w-full rounded-xl border border-highlight bg-paper px-4 py-3 text-sm font-semibold outline-none">
              <option value="">선택 학급 전체</option>
              {filteredStudents.map((student) => (
                <option key={student.id} value={student.id}>{student.name} / {getClassLabel(student)} / {student.number || "-"}</option>
              ))}
            </select>
          </div>
          <div className="rounded-2xl border border-highlight bg-paper px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-accent">근거 소스</p>
            <p className="mt-2 text-sm font-semibold text-ink">Supabase DB + {SUPABASE_HISTORY_BUCKET} Markdown 아카이브</p>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-paper/30">
        {messages.map(m => (
          <div key={m.id} className={cn("flex flex-col max-w-[85%]", m.role === 'user' ? "ml-auto items-end" : "mr-auto items-start")}>
            <div className={cn(
              "p-4 rounded-2xl text-sm leading-relaxed shadow-sm border",
              m.role === 'user' ? "bg-blue-500 text-white border-blue-600" : "bg-white dark:bg-gray-900 border-highlight text-ink dark:text-white"
            )}>
              <ReactMarkdown>{m.content}</ReactMarkdown>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-highlight bg-white dark:bg-gray-800 shrink-0">
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              "선택한 학생의 최근 학습 변화를 md 기록 기준으로 요약해줘",
              "학급 전체에서 공통 오개념을 md 기록 기반으로 정리해줘",
              "다음 수업 피드백 문구를 학생 기록 근거로 작성해줘"
            ].map(q => (
              <button
                key={q}
                onClick={() => {
                  setInput(q);
                  focusChatInput();
                }}
                className="px-3 py-1.5 bg-paper hover:bg-highlight border border-highlight rounded-lg text-[10px] font-bold text-secondary-text transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <div className="p-1 bg-paper border border-highlight rounded-xl focus-within:ring-1 focus-within:ring-accent transition-all flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1 bg-transparent px-4 text-sm font-semibold outline-none text-ink"
            placeholder="궁금한 내용을 입력하세요..."
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className={cn(
              "px-6 py-2.5 rounded-lg font-black text-xs uppercase tracking-widest shadow-md transition-all",
              input.trim() && !loading ? "bg-accent text-white hover:bg-sidebar" : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
          >
            {loading ? <RefreshCcw size={14} className="animate-spin" /> : "질문하기"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TeacherChat;
