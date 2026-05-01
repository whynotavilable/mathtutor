import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bot, Plus, Search, Send, Paperclip, RefreshCcw, X, FileText,
  AlertCircle, Lightbulb, Info, BookOpenCheck, FileDown, Pencil,
  PanelLeftOpen, PanelLeftClose
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { cn } from "../../lib/utils";
import { supabase } from "../../supabase";
import { StudentInstructions, Message } from "../../types";
import { UserProfile, ai, GEMINI_TEXT_MODEL, buildStudentSystemInstruction } from "../../lib/ai";
import { TeacherInstructionContext, buildTeacherPrompt } from "../../lib/instructions";
import { LearningReport, normalizeReportText, exportLearningReportPdf, loadStudentArchiveBundle, hasSessionActivitySinceReport } from "../../lib/archive";
import { getClassLabel } from "../../lib/userUtils";
import { Type } from "@google/genai";
import { useNavigate } from "react-router-dom";

const StudentChat = ({
  instructions,
  teacherContext = {},
  profile,
  session,
}: {
  instructions: StudentInstructions;
  teacherContext?: TeacherInstructionContext;
  profile: UserProfile | null;
  session: any;
}) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => localStorage.getItem('ACTIVE_SESSION_ID') || null);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [input, setInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [resourceContext, setResourceContext] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const activeSessionRef = useRef<string | null>(activeSessionId);

  const [activeTab, setActiveTab] = useState<'chat' | 'report'>('chat');
  const [report, setReport] = useState<LearningReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const isReportStale = hasSessionActivitySinceReport(messages, report);
  const canGenerateReport = messages.length > 2 && (!report || isReportStale);

  useEffect(() => { activeSessionRef.current = activeSessionId; }, [activeSessionId]);

  const focusChatInput = () => {
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const autoResizeTextarea = (el?: HTMLTextAreaElement | null) => {
    const target = el ?? inputRef.current;
    if (!target) return;
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 120) + 'px';
  };

  const fetchSessions = async () => {
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const nextSessions = data || [];
      setSessions(nextSessions);
      if (activeSessionId && !nextSessions.some((s) => s.id === activeSessionId)) {
        const fallbackSessionId = nextSessions[0]?.id || null;
        setActiveSessionId(fallbackSessionId);
        if (fallbackSessionId) localStorage.setItem("ACTIVE_SESSION_ID", fallbackSessionId);
        else localStorage.removeItem("ACTIVE_SESSION_ID");
      }
    } catch (err) {
      console.error("Error fetching sessions:", err);
    }
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
        role: m.role,
        content: m.content,
        timestamp: new Date(m.created_at)
      })));
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  const fetchReport = async (sid: string) => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('session_id', sid)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setReport(data || null);
    } catch (err) {
      console.error("Error fetching report:", err);
    }
  };

  const generateReport = async () => {
    if (!activeSessionId || messages.length === 0 || isGenerating || !profile) return;
    setIsGenerating(true);

    try {
      const { data: existingSession, error: sessionError } = await supabase
        .from("chat_sessions")
        .select("id, title")
        .eq("id", activeSessionId)
        .eq("user_id", profile.id)
        .maybeSingle();
      if (sessionError) throw sessionError;
      if (!existingSession) {
        throw new Error("현재 보고서를 생성할 학습 세션을 찾지 못했습니다. 대화 목록에서 세션을 다시 선택하거나 새 대화를 시작해 주세요.");
      }

      const chatContext = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

      const response = await ai.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: `당신은 대한민국 고등학생 수학 학습을 분석하는 학습 리포트 작성 도우미입니다.

반드시 지켜야 할 규칙:
1. 출력 내용은 모두 자연스러운 한국어로 작성합니다.
2. JSON의 키 이름은 영어 그대로 유지하되, 각 값의 내용은 한국어로만 작성합니다.
3. summary, misconceptions, recommendations 안에는 헤더(#), 굵게(**), 기울임(_) 같은 마크다운 서식을 쓰지 않습니다.
4. 별표(*), 샵(#), 백틱(\`), 밑줄(_) 같은 강조 표시는 쓰지 않습니다. 단, 숫자 목록(1. 2. 3.)은 허용하며 각 항목 앞에 빈 줄을 넣어도 됩니다.
5. 불필요한 큰따옴표로 문장을 감싸지 않습니다.
6. 학생을 평가할 때는 단정적인 비난 대신 관찰 중심으로 씁니다.

학습 목표: 아래 대화 기록에서 학생이 이번 세션에 다룬 개념과 목표를 파악하여 활용하세요.
교사 지침:
${buildTeacherPrompt(teacherContext.classSettings, teacherContext.classInstruction) || '없음'}
${buildTeacherPrompt(teacherContext.studentSettings, teacherContext.studentInstruction) || ''}

대화 기록:
${chatContext}

다음 JSON 형식으로만 응답하세요:
{
  "summary": "오늘 학습한 내용을 정리하되, 잘한 점을 먼저 언급하고 격려하는 톤으로 작성. 학생이 직접 읽는 보고서임.",
  "misconceptions": "헷갈렸던 부분을 '이 부분이 헷갈릴 수 있어요' 톤으로 설명. 틀렸다고 단정하지 말고, 다시 살펴볼 기회로 표현.",
  "recommendations": "다음에 도전해볼 것들을 긍정적이고 구체적으로 제안. '~해보세요' 형식으로 작성."
}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              misconceptions: { type: Type.STRING },
              recommendations: { type: Type.STRING }
            },
            required: ["summary", "misconceptions", "recommendations"]
          }
        }
      });

      const text = response.text || "{}";
      const reportData = JSON.parse(text);

      const { data: existingReport } = await supabase
        .from('reports')
        .select('id')
        .eq('session_id', activeSessionId)
        .maybeSingle();

      const reportPayload = {
        session_id: activeSessionId,
        created_at: new Date().toISOString(),
        summary: normalizeReportText(reportData.summary, "요약 정보가 없습니다."),
        misconceptions: normalizeReportText(reportData.misconceptions, "뚜렷한 오개념이 발견되지 않았습니다."),
        recommendations: normalizeReportText(reportData.recommendations, "현재 학습 흐름을 유지하며 연습을 이어가세요.")
      };

      const reportQuery = existingReport
        ? supabase.from('reports').update(reportPayload).eq('id', existingReport.id)
        : supabase.from('reports').insert(reportPayload);

      const { data, error } = await reportQuery.select().single();

      if (error) throw error;
      setReport(data);
      await loadStudentArchiveBundle(profile, true);
      setActiveTab('report');
      alert('학습 보고서가 생성되었습니다.');
    } catch (err) {
      console.error("Error generating report:", err);
      alert("보고서 생성 중 오류가 발생했습니다: " + (err as any).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateTeacherReport = async (sessionId: string, sessionMessages: Message[]) => {
    if (!sessionId || sessionMessages.length === 0 || !profile) return null;

    const chatContext = sessionMessages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

    const response = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: `당신은 대한민국 고등학교 수학 담당 교사를 위한 학습 분석 보조 도구입니다.
교사가 읽는 보고서이므로 객관적이고 전문적인 어조로 작성합니다.

반드시 지켜야 할 규칙:
1. 출력 내용은 모두 자연스러운 한국어로 작성합니다.
2. JSON의 키 이름은 영어 그대로 유지하되, 각 값의 내용은 한국어로만 작성합니다.
3. 헤더(#), 굵게(**), 기울임(_) 같은 마크다운 서식을 쓰지 않습니다. 숫자 목록(1. 2. 3.)은 허용하며 각 항목 앞에 빈 줄을 넣어도 됩니다.
4. 관찰 가능한 근거에 기반하여 작성하고, 추측성 단정을 피합니다.

학습 목표: 아래 대화 기록에서 학생이 이번 세션에 다룬 개념과 목표를 파악하여 활용하세요.
교사 지침:
${buildTeacherPrompt(teacherContext.classSettings, teacherContext.classInstruction) || '없음'}
${buildTeacherPrompt(teacherContext.studentSettings, teacherContext.studentInstruction) || ''}

대화 기록:
${chatContext}

다음 JSON 형식으로만 응답하세요:
{
  "summary": "학생의 이번 세션 학습 수준을 객관적으로 평가. 이해도, 풀이 방식, 참여 태도를 관찰 중심으로 기술.",
  "misconceptions": "대화에서 드러난 구체적 오개념과 그 근거를 서술. 반복된 실수나 혼동 패턴이 있으면 명시.",
  "recommendations": "교사가 개입해야 할 지점과 구체적 지도 전략을 제안. 보충 개념, 추가 문제 유형, 개별 면담 필요 여부 등을 포함."
}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            misconceptions: { type: Type.STRING },
            recommendations: { type: Type.STRING }
          },
          required: ["summary", "misconceptions", "recommendations"]
        }
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text) as { summary: string; misconceptions: string; recommendations: string };
  };

  useEffect(() => {
    const loadResources = async () => {
      try {
        const { getActiveWeeklyResourcePlans, loadTeacherResourceCards, readResourcePages } = await import("../../lib/resources");
        const cards = await loadTeacherResourceCards();
        const classKey = profile ? `${profile.grade}-${profile.class}` : "";
        const activePlans = classKey ? await getActiveWeeklyResourcePlans(classKey) : [];
        const relevant = cards.filter(c => !c.classKey || c.classKey === classKey || c.classKey === "all");
        const plannedResources = activePlans
          .map((plan) => relevant.find((c) => c.objectPath === plan.resourceObjectPath))
          .filter(Boolean) as typeof relevant;
        const plannedResourcePaths = new Set(plannedResources.map((resource) => resource.objectPath));
        const prioritized = plannedResources.length
          ? [...plannedResources, ...relevant.filter((c) => !plannedResourcePaths.has(c.objectPath))]
          : relevant;
        const planContext = activePlans.length
          ? [
            "## 이번 주 학습 계획",
            ...activePlans.map((plan, index) => [
              `### 계획 ${index + 1}: ${plan.resourceTitle}`,
              `적용 기간: ${plan.weekStartDate || "미지정"} ~ ${plan.weekEndDate || "미지정"}`,
              plan.lessonStart || plan.lessonEnd ? `차시 범위: ${plan.lessonStart || "?"}~${plan.lessonEnd || "?"}차시` : "",
              `페이지 범위: ${plan.pageStart}~${plan.pageEnd}쪽`,
              plan.note ? `교사 운영 지침: ${plan.note}` : "",
            ].filter(Boolean).join("\n")),
            "학생이 문제 추천이나 추가 연습을 요청하면 활성화된 주간 계획들의 페이지 범위를 우선 사용하고, 범위 밖 문제를 먼저 제시하지 마세요.",
          ].filter(Boolean).join("\n\n")
          : "";
        const pageContextParts = await Promise.all(activePlans.map(async (plan) => {
          const pageStart = Number.parseInt(plan.pageStart || "", 10);
          const pageEnd = Number.parseInt(plan.pageEnd || "", 10);
          if (!plan.resourceObjectPath || !Number.isFinite(pageStart) || !Number.isFinite(pageEnd)) return "";
          const pageText = (await readResourcePages(plan.resourceObjectPath))
            .filter((page) => page.pageNumber >= Math.min(pageStart, pageEnd) && page.pageNumber <= Math.max(pageStart, pageEnd))
            .map((page) => `### ${plan.resourceTitle} / ${page.pageNumber}쪽\n${page.text}`)
            .join("\n\n");
          return pageText;
        }));
        const pageContext = pageContextParts.filter(Boolean).join("\n\n").slice(0, 18000);
        const selectedPageContext = pageContext ? `## 이번 주 지정 페이지 원문 추출\n${pageContext}` : "";
        if (prioritized.length === 0 && !planContext) return;
        const ctx = prioritized.map(c =>
          [
            `[${c.name}]`,
            c.subject ? `과목: ${c.subject}` : "",
            c.unit ? `단원: ${c.unit}` : "",
            c.keyConcepts ? `핵심 개념: ${c.keyConcepts}` : "",
            c.importantExamples ? `중요 문제/예시: ${c.importantExamples}` : "",
            c.commonMisconceptions ? `자주 나오는 오개념: ${c.commonMisconceptions}` : "",
          ].filter(Boolean).join("\n")
        ).join("\n\n---\n\n");
        setResourceContext([planContext, selectedPageContext, ctx].filter(Boolean).join("\n\n---\n\n"));
      } catch {}
    };
    loadResources();
  }, [profile]);

  useEffect(() => {
    fetchSessions();
  }, [profile]);

  useEffect(() => {
    if (activeSessionId) {
      fetchMessages(activeSessionId);
      fetchReport(activeSessionId);
      setActiveTab('chat');
      localStorage.setItem('ACTIVE_SESSION_ID', activeSessionId);
    } else {
      setMessages([]);
      setReport(null);
      setActiveTab('chat');
      localStorage.removeItem('ACTIVE_SESSION_ID');
    }
  }, [activeSessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, isTyping]);

  useEffect(() => {
    if (!loading && !isTyping && activeTab === 'chat') {
      focusChatInput();
    }
  }, [loading, isTyping, activeTab, activeSessionId]);

  const formatReportText = (text: string) =>
    text.replace(/([^\n])\n?((\d+)\.\s)/g, "$1\n\n$2");

  const fixMathDelimiters = (content: string) => {
    return content
      .replace(/\\\((.*?)\\\)/g, '$$$1$')
      .replace(/\\\[(.*?)\\\]/g, '$$$$$1$$$$');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (fileInputRef.current) fileInputRef.current.value = "";

    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';
    if (!isImage && !isPDF) {
      alert('이미지(JPG, PNG 등) 또는 PDF 파일만 업로드할 수 있습니다.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB 이하만 가능합니다.');
      return;
    }

    setLoading(true);

    let sid = activeSessionId;
    if (!sid) {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({ user_id: profile.id, title: `파일 분석: ${file.name}` })
        .select().single();
      if (error) { setLoading(false); return; }
      sid = data.id;
      setActiveSessionId(sid);
      fetchSessions();
    }

    // Use FileReader for native base64 encoding — lower memory overhead than manual Uint8Array approach
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    const base64 = dataUrl.split(',')[1];

    const userContent = isImage
      ? `![${file.name}](${dataUrl})\n\n📷 **${file.name}** 을 업로드했습니다.`
      : `📎 **${file.name}** (PDF)`;

    const userMsgId = crypto.randomUUID();
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: userContent, timestamp: new Date() }]);
    await supabase.from('chat_messages').insert({ session_id: sid, role: 'user', content: userContent });

    try {
      const systemInstruction = buildStudentSystemInstruction(instructions, teacherContext, resourceContext);
      const analysisPrompt = isImage
        ? '학생이 수학 풀이나 문제 이미지를 업로드했어. 내용을 분석하고 학습자주도성 원칙에 따라 반응해줘.'
        : `학생이 PDF 문서(${file.name})를 업로드했어. 내용을 분석하고 학습자주도성 원칙에 따라 반응해줘.`;

      const response = await ai.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        config: { systemInstruction },
        contents: [{
          role: 'user',
          parts: [
            { text: analysisPrompt },
            { inlineData: { mimeType: file.type, data: base64 } }
          ]
        }]
      });
      const botContent = response.text ?? 'AI가 파일을 분석하지 못했습니다. 잠시 후 다시 시도해 주세요.';

      // Save to DB first (belongs to the session where the file was uploaded)
      await supabase.from('chat_messages').insert({ session_id: sid, role: 'assistant', content: botContent });

      // Only stream to UI if user is still on the same session
      if (activeSessionRef.current === sid) {
        setIsTyping(true);
        const aiMsgId = crypto.randomUUID();
        setMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', content: '', timestamp: new Date() }]);
        let output = '';
        for (const char of botContent) {
          if (activeSessionRef.current !== sid) break; // stop streaming if session switched
          output += char;
          setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: output } : m));
          await new Promise(r => setTimeout(r, 15));
        }
      }
    } catch (err) {
      console.error('Vision AI 호출 실패:', err);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(), role: 'assistant',
        content: 'AI가 파일을 분석하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !profile) return;
    setLoading(true);

    const currentInput = input;
    setInput('');
    focusChatInput();

    let sid = activeSessionId;
    if (!sid) {
      try {
        const { data, error } = await supabase
          .from('chat_sessions')
          .insert({
            user_id: profile.id,
            title: currentInput.slice(0, 30)
          })
          .select().single();

        if (error) throw error;
        sid = data.id;
        setActiveSessionId(sid);
        fetchSessions();
      } catch (err) {
        console.error('세션 생성 실패:', err);
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(), role: 'assistant',
          content: '대화 세션을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.',
          timestamp: new Date(),
        }]);
        setLoading(false);
        return; // abort: don't send without a valid session
      }
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: currentInput,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const { error: msgErr } = await supabase.from('chat_messages')
        .insert({ session_id: sid, role: 'user', content: currentInput });
      if (msgErr) console.error('사용자 메시지 저장 실패:', msgErr);
    } catch (err) {
      console.error('사용자 메시지 저장 실패:', err);
    }

    try {
      const systemInstruction = buildStudentSystemInstruction(instructions, teacherContext, resourceContext);

      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

      const chat = ai.chats.create({
        model: GEMINI_TEXT_MODEL,
        config: { systemInstruction },
        history,
      });

      const response = await chat.sendMessage({ message: currentInput });
      const botContent = response.text ?? '답변을 받지 못했습니다. 질문을 다시 입력해 보세요.';

      // 응답 받은 후 사용자가 다른 세션으로 이동했으면 현재 세션에만 저장하고 표시 안 함
      const capturedSid = sid;
      const stillOnSameSession = activeSessionRef.current === capturedSid;

      // Set isTyping before loading=false so React batches them — prevents blank-indicator flash
      setIsTyping(true);
      setLoading(false);

      if (stillOnSameSession) {
        const aiMsgId = crypto.randomUUID();
        setMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', content: '', timestamp: new Date() }]);
        let output = '';
        for (let char of botContent) {
          output += char;
          setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: output } : m));
          await new Promise(r => setTimeout(r, 15));
        }
      }

      try {
        const { error: saveErr } = await supabase.from('chat_messages')
          .insert({ session_id: capturedSid, role: 'assistant', content: botContent });
        if (saveErr) console.error('AI 응답 저장 실패:', saveErr);
      } catch (err) {
        console.error('AI 응답 저장 실패:', err);
      }

    } catch (err: any) {
      console.error('AI 호출 실패:', err);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'AI 튜터에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        timestamp: new Date(),
      }]);
      setLoading(false);
    } finally {
      setIsTyping(false);
      focusChatInput();
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const fakeEvent = { target: { files: [file], value: '' }, currentTarget: { value: '' } } as any;
          await handleFileUpload({ ...fakeEvent, target: { files: [file] } } as React.ChangeEvent<HTMLInputElement>);
        }
        return;
      }
    }
  };

  const handleRenameSession = async (sessionItem: any) => {
    if (!profile) return;
    const nextTitle = window.prompt("새 대화 제목을 입력하세요.", sessionItem.title || "");
    if (!nextTitle || nextTitle.trim() === sessionItem.title) return;
    try {
      const { error } = await supabase
        .from("chat_sessions")
        .update({ title: nextTitle.trim() })
        .eq("id", sessionItem.id)
        .eq("user_id", profile.id);
      if (error) throw error;
      await fetchSessions();
    } catch (error: any) {
      alert(error?.message || "대화 제목 수정에 실패했습니다.");
    }
  };

  const handleDeleteSession = async (sessionItem: any) => {
    if (!profile) return;
    if (!window.confirm(`'${sessionItem.title || "이 대화"}'를 삭제할까요? 메시지와 보고서도 함께 삭제됩니다.`)) return;
    try {
      await Promise.all([
        supabase.from("reports").delete().eq("session_id", sessionItem.id),
        supabase.from("chat_messages").delete().eq("session_id", sessionItem.id),
      ]);
      const { error } = await supabase
        .from("chat_sessions")
        .delete()
        .eq("id", sessionItem.id)
        .eq("user_id", profile.id);
      if (error) throw error;
      if (activeSessionId === sessionItem.id) {
        setActiveSessionId(null);
        localStorage.removeItem("ACTIVE_SESSION_ID");
      }
      await fetchSessions();
    } catch (error: any) {
      alert(error?.message || "대화 삭제에 실패했습니다.");
    }
  };

  return (
    <div className="flex h-full relative">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Search/History Sidebar inside chat */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-gray-800 border-r border-highlight flex flex-col overflow-hidden shadow-lg shrink-0 transition-transform duration-300",
          `md:relative md:inset-auto md:z-0 md:w-56 lg:w-64 md:rounded-xl md:border md:shadow-sm ${isDesktopSidebarOpen ? "md:translate-x-0 md:flex" : "md:-translate-x-full md:hidden"}`,
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        id="student-chat-history"
      >
        <div className="p-4 border-b border-highlight bg-gray-50/30">
          <div className="flex items-center justify-between mb-4 md:hidden">
            <span className="text-xs font-black text-ink uppercase tracking-widest">대화 목록</span>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-secondary-text hover:text-accent transition-colors">
              <X size={18} />
            </button>
          </div>
          <button
            onClick={() => {
              setActiveSessionId(null);
              setIsSidebarOpen(false);
            }}
            className="w-full py-2.5 bg-accent text-white rounded-lg font-black text-xs uppercase tracking-widest shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-95 transition-all mb-4 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus size={14} /> 새 대화 시작
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-secondary-text" size={14} />
            <input
              type="text"
              placeholder="대화 검색..."
              className="w-full bg-white dark:bg-gray-900 border border-highlight rounded-lg py-2 pl-8 pr-3 text-xs outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-3 space-y-1">
            <div className="px-2 py-1 mb-2">
              <span className="text-xs font-bold text-secondary-text uppercase tracking-widest leading-none">최근 대화</span>
            </div>
            {sessions.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-400 font-bold italic">
                첫 대화를 시작해 보세요!
              </div>
            ) : sessions.map((s) => (
              <div
                key={s.id}
                className={cn(
                  "relative rounded-lg border p-2.5 transition-all group",
                  activeSessionId === s.id ? "bg-paper border-accent shadow-sm" : "border-transparent hover:bg-paper hover:border-highlight"
                )}
              >
                <div className="absolute right-2 top-2 z-10 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleRenameSession(s); }} className="rounded-md p-2 text-secondary-text hover:bg-white hover:text-accent" title="대화 제목 수정">
                    <Pencil size={12} />
                  </button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteSession(s); }} className="rounded-md p-2 text-secondary-text hover:bg-white hover:text-red-500" title="대화 삭제">
                    <X size={12} />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSessionId(s.id);
                    setIsSidebarOpen(false);
                  }}
                  className="w-full text-left pr-12"
                >
                  <span className={cn("text-xs font-bold truncate block group-hover:text-accent", activeSessionId === s.id ? "text-accent" : "text-ink")}>{s.title}</span>
                  <span className="text-[9px] text-secondary-text">{new Date(s.created_at).toLocaleDateString()}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-highlight overflow-hidden shadow-sm relative md:ml-4 lg:ml-6" id="student-chat-area">
        <header className="px-4 md:px-6 py-4 border-b border-highlight flex justify-between items-center bg-white dark:bg-gray-800 z-10 shrink-0">
          <div className="flex items-center gap-3 md:gap-6">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 md:hidden text-secondary-text hover:text-accent transition-colors -ml-1"
              title="대화 목록 열기"
            >
              <Plus size={20} />
            </button>
            <button
              onClick={() => setIsDesktopSidebarOpen(v => !v)}
              className="hidden md:flex items-center p-2 rounded-lg hover:bg-gray-100 text-secondary-text hover:text-accent transition-colors"
              title={isDesktopSidebarOpen ? "사이드바 닫기" : "사이드바 열기"}
            >
              {isDesktopSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-paper flex items-center justify-center text-accent"><Bot size={18} /></div>
              <div className="hidden sm:block">
                <h3 className="text-sm font-bold text-ink">수학 AI 튜터</h3>
                <p className="text-xs text-green-500 font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> 질문 대기 중</p>
              </div>
            </div>

            {activeSessionId && (
              <div className="flex bg-paper p-1 rounded-xl border border-highlight h-10 shrink-0">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={cn(
                    "px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-all cursor-pointer",
                    activeTab === 'chat' ? "bg-white text-accent shadow-sm" : "text-secondary-text hover:text-accent"
                  )}
                >
                  채팅 학습
                </button>
                <button
                  onClick={() => setActiveTab('report')}
                  className={cn(
                    "px-4 rounded-lg text-xs font-black uppercase tracking-widest transition-all cursor-pointer",
                    activeTab === 'report' ? "bg-white text-accent shadow-sm" : "text-secondary-text hover:text-accent"
                  )}
                >
                  학습 보고서
                </button>
              </div>
            )}
          </div>
          <button
            id="student-settings-btn"
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "px-4 py-2 rounded-lg transition-all border font-black text-xs uppercase tracking-widest shadow-sm cursor-pointer",
              showSettings ? "bg-accent text-white border-accent" : "bg-white text-secondary-text border-highlight hover:border-accent hover:text-accent"
            )}
          >
            학습자 지침
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
          {activeTab === 'chat' ? (
            <div className="space-y-6">
              {messages.length === 0 && (
                <div className="h-full py-20 flex flex-col items-center justify-center text-center p-10 space-y-6">
                  <Bot size={60} className="text-gray-400 opacity-30" />
                  <div className="opacity-30">
                    <h4 className="text-xl font-black text-ink uppercase tracking-tight">수학 AI 튜터와 학습을 시작하세요</h4>
                    <p className="text-xs font-bold text-secondary-text mt-2">지금 바로 질문을 입력하거나 파일을 업로드해 보세요.</p>
                  </div>
                  <div className="space-y-3 w-full max-w-sm">
                    <p className="text-[10px] font-black text-secondary-text uppercase tracking-widest flex items-center justify-center gap-1.5">
                      <span>💡</span> 이렇게 시작해 보세요
                    </p>
                    {[
                      "오늘 학습 목표와 계획을 같이 세워보자",
                      "이 개념이 잘 이해가 안 돼",
                      "문제 풀다가 막혔어",
                    ].map((text) => (
                      <button
                        key={text}
                        onClick={() => {
                          setInput(text);
                          focusChatInput();
                        }}
                        className="w-full text-left px-4 py-3 bg-white border border-highlight rounded-xl text-xs font-semibold text-ink hover:border-accent hover:text-accent transition-all shadow-sm"
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={cn("flex flex-col max-w-[85%]", m.role === 'user' ? "ml-auto items-end" : "mr-auto items-start")}>
                  <div className={cn(
                    "p-4 rounded-2xl text-sm leading-relaxed shadow-sm",
                    m.role === 'user'
                      ? "bg-[#EDF2F7] text-ink border border-[#CBD5E0] rounded-tr-none"
                      : "bg-[#F7FAFC] text-ink border border-highlight rounded-tl-none"
                  )}>
                    <div className="markdown-body prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{ img: ({ src, alt }) => <img src={src} alt={alt || ''} className="max-w-full rounded-xl max-h-64 mt-2 object-contain" /> }}
                      >
                        {fixMathDelimiters(m.content)}
                      </ReactMarkdown>
                    </div>
                  </div>
                  <span className="text-xs text-secondary-text mt-1.5 font-medium px-1">
                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              {(loading || isTyping) && (
                <div className="flex flex-col max-w-[85%] mr-auto items-start animate-in fade-in slide-in-from-bottom-2">
                  <div className="p-4 rounded-2xl text-sm leading-relaxed shadow-sm bg-[#F7FAFC] text-ink border border-highlight rounded-tl-none flex items-center gap-2">
                    <Bot size={16} className="text-accent animate-pulse" />
                    <span className="text-secondary-text font-bold">답변을 준비하고 있어요...</span>
                    <span className="flex gap-1 items-center">
                      <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0 }} className="w-1 h-1 bg-accent rounded-full"></motion.span>
                      <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }} className="w-1 h-1 bg-accent rounded-full"></motion.span>
                      <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.6 }} className="w-1 h-1 bg-accent rounded-full"></motion.span>
                    </span>
                  </div>
                </div>
              )}
              {canGenerateReport && (
                <div className="flex justify-center pt-8 pb-4">
                  <button
                    onClick={generateReport}
                    disabled={isGenerating}
                    className="px-8 py-3 bg-paper border border-highlight text-accent rounded-full text-xs font-black uppercase tracking-widest hover:bg-accent hover:text-white transition-all shadow-md flex items-center gap-2 group"
                  >
                    {isGenerating ? <RefreshCcw size={14} className="animate-spin" /> : <BookOpenCheck size={16} />}
                    {isGenerating ? "분석하고 있어요..." : "오늘 학습 마무리하기"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-3xl mx-auto py-4 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {!report ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
                  <div className="w-20 h-20 bg-paper rounded-full flex items-center justify-center text-accent/30">
                    <FileText size={40} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-ink uppercase tracking-tight">생성된 보고서가 없습니다</h4>
                    <p className="text-xs font-bold text-secondary-text mt-2">채팅 학습을 충분히 진행한 후 보고서를 생성해 보세요.</p>
                  </div>
                  <button
                    onClick={generateReport}
                    disabled={isGenerating || messages.length === 0}
                    className="px-10 py-4 bg-accent text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-accent/20 hover:scale-[1.02] transition-all"
                  >
                    {isGenerating ? <RefreshCcw size={16} className="animate-spin mr-2" /> : null}
                    {isGenerating ? "분석하고 있어요..." : "오늘 학습 돌아보기"}
                  </button>
                </div>
              ) : (
                <>
                  <header className="space-y-2 border-l-4 border-accent pl-6">
                    <div className="text-xs font-black text-accent uppercase tracking-[0.2em]">AI 학습 분석 보고서</div>
                    <h2 className="text-3xl font-black text-ink uppercase tracking-tighter">AI 학습 분석 리포트</h2>
                    <p className="text-[11px] text-secondary-text font-bold uppercase tracking-widest">{new Date(report.created_at).toLocaleDateString()} • {messages.length}개의 대화 분석</p>
                  </header>

                  {isReportStale && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-bold text-amber-700">
                      이 보고서 생성 이후 새 대화가 있어 다시 생성할 수 있습니다.
                    </div>
                  )}

                  <div className="grid gap-8">
                    <section className="bg-white rounded-3xl border border-highlight p-8 shadow-sm">
                      <h4 className="flex items-center gap-3 text-xs font-black text-accent uppercase tracking-widest mb-6">
                        <Info size={14} /> 학습 내용 요약
                      </h4>
                      <div className="p-6 bg-paper rounded-2xl border border-highlight/50 text-sm text-ink leading-relaxed">
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {formatReportText(normalizeReportText(report.summary))}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </section>

                    <section className="bg-white rounded-3xl border border-highlight p-8 shadow-sm">
                      <h4 className="flex items-center gap-3 text-xs font-black text-red-500 uppercase tracking-widest mb-6">
                        <AlertCircle size={14} /> 오개념 및 취약점 분석
                      </h4>
                      <div className="p-6 bg-red-50/30 rounded-2xl border border-red-100/50 text-sm text-ink leading-relaxed">
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {formatReportText(normalizeReportText(report.misconceptions))}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </section>

                    <section className="bg-white rounded-3xl border border-highlight p-8 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-bl-full -mr-16 -mt-16"></div>
                      <h4 className="flex items-center gap-3 text-xs font-black text-green-600 uppercase tracking-widest mb-6">
                        <Lightbulb size={14} /> 추천 학습 방향
                      </h4>
                      <div className="p-6 bg-green-50/30 rounded-2xl border border-green-100/50 text-sm text-ink leading-relaxed">
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {formatReportText(normalizeReportText(report.recommendations))}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </section>
                  </div>

                  <footer className="pt-10 flex border-t border-highlight justify-between items-center pb-20">
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest italic">AI 제안</p>
                    {isReportStale && (
                      <button
                        onClick={generateReport}
                        disabled={isGenerating}
                        className="flex items-center gap-2 rounded-xl border border-highlight px-4 py-2 text-xs font-black text-accent disabled:opacity-50"
                      >
                        {isGenerating ? <RefreshCcw size={14} className="animate-spin" /> : <BookOpenCheck size={14} />}
                        {isGenerating ? "생성 중..." : "보고서 다시 생성"}
                      </button>
                    )}
                    <button
                      onClick={() =>
                        exportLearningReportPdf({
                          title: "AI 학습 분석 보고서",
                          studentName: profile?.name,
                          classLabel: profile ? getClassLabel(profile) : undefined,
                          sessionTitle: sessions.find((sessionItem) => sessionItem.id === activeSessionId)?.title,
                          createdAt: report.created_at,
                          summary: normalizeReportText(report.summary),
                          misconceptions: normalizeReportText(report.misconceptions),
                          recommendations: normalizeReportText(report.recommendations),
                        })
                      }
                      className="flex items-center gap-2 text-xs font-black text-accent hover:underline"
                    >
                      <FileDown size={14} /> PDF로 내보내기
                    </button>
                  </footer>
                </>
              )}
            </div>
          )}
        </div>

        {activeTab === 'chat' && (
          <footer className="p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-highlight bg-white dark:bg-gray-800 shrink-0">
            <div className="flex items-center gap-2 bg-paper dark:bg-gray-900 border border-highlight rounded-xl p-1.5 pl-2 focus-within:ring-1 focus-within:ring-accent transition-all ring-offset-2 ring-offset-white">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
              />
              <button
                id="student-file-upload"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-secondary-text hover:text-accent transition-colors"
                title="파일 첨부 (이미지/PDF)"
              >
                <Paperclip size={20} />
              </button>
              <textarea
                ref={inputRef}
                value={input}
                rows={1}
                onChange={(e) => { setInput(e.target.value); autoResizeTextarea(e.target); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                onPaste={handlePaste}
                placeholder="수학 개념이나 문제를 질문해보세요... (Shift+Enter 줄바꿈)"
                className="flex-1 bg-transparent border-none outline-none text-sm py-1.5 text-ink placeholder:text-secondary-text resize-none leading-relaxed"
                style={{ maxHeight: '120px', overflowY: 'auto' }}
                disabled={loading || isTyping}
              />
              <button
                onClick={handleSend}
                className={cn("p-2.5 rounded-lg transition-all shadow-sm", input.trim() && !loading && !isTyping ? "bg-accent text-white hover:bg-sidebar" : "bg-gray-100 text-gray-300")}
                disabled={!input.trim() || loading || isTyping}
              >
                {(loading || isTyping) ? <RefreshCcw size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </footer>
        )}

        {/* Custom Instruction Overlay */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              className="absolute inset-y-0 right-0 w-80 bg-white border-l border-highlight shadow-2xl z-30 flex flex-col"
            >
              <header className="p-6 border-b border-highlight flex justify-between items-center bg-gray-50/30">
                <h4 className="font-bold text-sm text-ink flex items-center gap-2 uppercase tracking-wide">
                  학습자 지침
                </h4>
                <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-paper rounded text-secondary-text transition-colors"><X size={18} /></button>
              </header>

              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                <div className="p-4 bg-paper rounded-xl border border-highlight space-y-3">
                  <p className="text-xs font-black text-accent uppercase tracking-widest">학습자 프로필 (읽기 전용)</p>
                  <div className="space-y-4">
                    {[
                      { label: "현재 학습 목표", val: instructions.currentGoals },
                      { label: "선호 설명 방식", val: instructions.preferredStyle },
                      { label: "진행 중인 어려운 개념", val: instructions.difficultConcepts },
                      { label: "진로 또는 관심 영역", val: instructions.careerInterest },
                      { label: "문제 접근성", val: instructions.problemSolvingApproach === 'intuitive' ? '직관 위주' : '논리 위주' }
                    ].map(stat => (
                      <div key={stat.label}>
                        <div className="text-[8px] font-bold text-secondary-text uppercase mb-1">{stat.label}</div>
                        <div className="text-[11px] font-semibold text-ink leading-tight">{stat.val}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-4">
                  <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-highlight">
                    <span className="text-xs font-bold text-ink">설명 유도 모드</span>
                    <span className={cn("text-[9px] font-black px-2 py-0.5 rounded uppercase", instructions.induceSelfExplanation ? "bg-accent/10 text-accent" : "bg-gray-100 text-gray-400")}>
                      {instructions.induceSelfExplanation ? "켜짐" : "꺼짐"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-highlight">
                    <span className="text-xs font-bold text-ink">힌트 레벨</span>
                    <span className="text-[9px] font-black text-accent">{instructions.hintLevel}단계</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-6 bg-paper/50 border-t border-highlight">
                <button
                  onClick={() => {
                    setShowSettings(false);
                    navigate("/student/settings");
                  }}
                  className="w-full py-3 border border-highlight bg-white text-accent rounded-lg font-bold text-xs uppercase tracking-widest hover:border-accent transition-all shadow-sm"
                >
                  수정
                </button>
                <button
                  onClick={() => setShowSettings(false)}
                  className="w-full py-3 bg-accent text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-sidebar transition-all shadow-md"
                >
                  확인
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default StudentChat;
