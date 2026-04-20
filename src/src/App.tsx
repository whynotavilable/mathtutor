import { useState, useEffect, useRef } from "react";
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { 
  BarChart3, 
  BookOpen, 
  Bot, 
  ChevronRight, 
  CircleUser, 
  ClipboardCheck, 
  Database, 
  FileText, 
  History, 
  LayoutDashboard, 
  Menu, 
  MessageSquare, 
  Monitor, 
  Moon, h
  Plus, 
  Search, 
  Settings, 
  Sun, 
  Users,
  LogOut,
  ChevronDown,
  X,
  FileDown,
  Send,
  MessageCircle,
  Paperclip,
  RefreshCcw,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  SkipForward,
  CheckCircle,
  HelpCircle,
  Lightbulb,
  Info,
  BookOpenCheck,
  GraduationCap
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, formatDate } from "./lib/utils";
import { DUMMY_STUDENT, DUMMY_CLASSES } from "./constants";
import { UserRole, Student, Session, Message, StudentInstructions, TeacherInstructions } from "./types";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { supabase } from "./supabase";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY 
    || (typeof process !== 'undefined' ? process?.env?.GEMINI_API_KEY : undefined)
    || ''
});

// --- Types for Supabase ---
interface UserProfile {
  id: string;
  email: string | undefined;
  name: string;
  grade: string;
  class: string;
  number: string;
  status: 'pending' | 'approved' | 'rejected' | 'none';
  role: 'student' | 'teacher';
  instructions?: string;
  created_at?: string;
}

interface LearningReport {
  id: string;
  session_id: string;
  summary: string;
  misconceptions: string;
  recommendations: string;
  created_at: string;
}

import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell
} from 'recharts';

// --- Types ---

interface EnrollmentRequest {
  id: string;
  name: string;
  grade: string;
  class: string;
  number: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: Date;
}

// --- Metrics & Charts Data ---

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

const ThemeToggle = ({ theme, toggleTheme }: { theme: string; toggleTheme: () => void }) => (
  <button
    onClick={toggleTheme}
    className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
  >
    {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
  </button>
);

const SidebarItem = ({ icon: Icon, label, to, active, onClick, id }: { icon: any; label: string; to: string; active?: boolean, onClick?: () => void, id?: string }) => (
  <Link
    to={to}
    onClick={onClick}
    id={id}
    className={cn(
      "flex items-center gap-3 px-6 py-3 transition-all duration-200 group text-sm",
      active 
        ? "bg-white/10 text-white border-r-4 border-highlight" 
        : "text-white/80 hover:bg-white/10 hover:text-white"
    )}
  >
    <Icon size={18} className={cn(active ? "text-white" : "text-white/80 group-hover:text-white")} />
    <span className={cn("font-medium", active && "font-semibold")}>{label}</span>
  </Link>
);

// --- Onboarding Tutorial Component ---

const TUTORIAL_STEPS = {
  student: [
    {
      id: 'student-chat-area',
      title: 'AI 튜터 채팅',
      description: '이곳에서 수학 문제나 개념을 자유롭게 질문할 수 있습니다.',
    },
    {
      id: 'student-chat-history',
      title: '대화 기록',
      description: '이전에 학습한 기록을 확인하고 이어서 학습할 수 있습니다.',
    },
    {
      id: 'student-settings-btn',
      title: '맞춤 학습 설정',
      description: '학습 목표와 선호하는 설명 방식을 설정하면 더 개인화된 도움을 받을 수 있습니다.',
    },
    {
      id: 'student-file-upload',
      title: '파일 및 이미지 업로드',
      description: '사진이나 PDF를 업로드하여 문제 풀이 도움을 받을 수 있습니다.',
    },
    {
      id: null,
      title: '학습 시작!',
      description: '이제 AI 튜터와 함께 나만의 학습을 시작해보세요!',
    }
  ],
  teacher: [
    {
      id: 'teacher-sidebar',
      title: '메인 메뉴',
      description: '좌측 사이드바를 통해 학생 분석, 학급 관리 등 모든 기능에 접근할 수 있습니다.',
    },
    {
      id: 'teacher-stats-container',
      title: '학급 전반 요약',
      description: '우리 반 전체의 실시간 평균 성취도와 주요 통계를 한눈에 확인하세요.',
    },
    {
      id: 'teacher-insights-card',
      title: 'AI 학급 인사이트',
      description: 'AI가 학생들의 학습 패턴을 분석하여 교사에게 필요한 맞춤형 교수법을 제안합니다.',
    },
    {
      id: 'teacher-analysis-link',
      title: '학생 상세 분석',
      description: '개별 학생의 대화 기록과 오개념 리포트를 자세히 분석하려면 이곳을 이용하세요.',
    },
    {
      id: null,
      title: '준비 완료!',
      description: '이제 스마트한 AI 학급 관리를 시작해 보세요.',
    }
  ]
};

const OnboardingTutorial = ({ role, onComplete }: { role: 'student' | 'teacher', onComplete: () => void }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState<{ top: number, left: number, width: number, height: number } | null>(null);

  const currentRoleSteps = TUTORIAL_STEPS[role];

  useEffect(() => {
    const updateCoords = () => {
      const step = currentRoleSteps[currentStep];
      if (step.id) {
        const el = document.getElementById(step.id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const rect = el.getBoundingClientRect();
          setCoords({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
          });
          return;
        }
      }
      setCoords(null);
    };

    const timer = setTimeout(updateCoords, 350);
    window.addEventListener('resize', updateCoords);
    window.addEventListener('scroll', updateCoords, true);
    
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
      clearTimeout(timer);
    };
  }, [currentStep, role, currentRoleSteps]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onComplete();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, onComplete]);

  const handleNext = () => {
    if (currentStep < currentRoleSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  const tooltipStyle = coords && !isMobile ? (() => {
    const margin = 20;
    const tooltipWidth = 400;
    const tooltipHeight = 260; 
    
    let top = coords.top + coords.height + margin;
    let left = coords.left + coords.width / 2 - tooltipWidth / 2;

    if (top + tooltipHeight > window.innerHeight) {
      top = coords.top - tooltipHeight - margin;
    }

    left = Math.max(margin, Math.min(window.innerWidth - tooltipWidth - margin, left));
    
    return {
      position: 'fixed' as const,
      top: Math.max(margin, top),
      left,
      zIndex: 100001
    };
  })() : {
    position: 'fixed' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 100001
  };

  return (
    <div className="fixed inset-0 z-[99999] overflow-hidden pointer-events-none">
      <AnimatePresence>
        {coords ? (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute bg-[#00000080] top-0 left-0 right-0 pointer-events-auto" style={{ height: coords.top }} />
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute bg-[#00000080] bottom-0 left-0 right-0 pointer-events-auto" style={{ top: coords.top + coords.height }} />
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute bg-[#00000080] left-0 pointer-events-auto" style={{ top: coords.top, height: coords.height, width: coords.left }} />
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute bg-[#00000080] right-0 pointer-events-auto" style={{ top: coords.top, height: coords.height, left: coords.left + coords.width }} />
          </>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-[#00000080] pointer-events-auto" />
        )}
      </AnimatePresence>

      <div className="relative w-full h-full pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.95, y: isMobile ? 20 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "bg-white dark:bg-gray-900 rounded-[12px] border border-blue-100 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] w-[90%] max-w-[400px] pointer-events-auto relative overflow-hidden"
            )}
            style={tooltipStyle}
          >
            {/* Step Indicator Bar */}
            <div className="h-1.5 w-full bg-gray-100 relative">
              <motion.div 
                className="h-full bg-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStep + 1) / currentRoleSteps.length) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            <div className="p-8">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded uppercase tracking-wider">
                      Step {currentStep + 1} / {currentRoleSteps.length}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                    {currentRoleSteps[currentStep].title}
                  </h3>
                </div>
                <button 
                  onClick={onComplete} 
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <p className="text-sm font-medium text-[#444] dark:text-gray-400 leading-relaxed mb-8">
                {currentRoleSteps[currentStep].description}
              </p>

              <div className="flex items-center justify-between gap-4">
                <button 
                  onClick={onComplete}
                  className="px-2 py-1 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Skip
                </button>
                
                <div className="flex gap-2">
                  {currentStep > 0 && (
                    <button 
                      onClick={handlePrev}
                      className="px-4 py-2 border border-gray-200 text-sm font-bold text-gray-600 rounded-lg hover:bg-gray-50 transition-all flex items-center gap-2"
                    >
                      <ArrowLeft size={16} />
                    </button>
                  )}
                  <button 
                    onClick={handleNext}
                    className="px-6 py-2.5 bg-[#3B82F6] text-white rounded-lg font-bold text-sm hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 group"
                  >
                    {currentStep === currentRoleSteps.length - 1 ? (
                      <>Complete <CheckCircle size={18} /></>
                    ) : (
                      <>Next <ArrowRight size={18} /></>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {coords && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute border-[3px] border-[#3B82F6] shadow-[0_0_20px_rgba(59,130,246,0.6)] rounded-lg pointer-events-none z-[100000]"
            style={{
              top: coords.top - 4,
              left: coords.left - 4,
              width: coords.width + 8,
              height: coords.height + 8
            }}
          />
        )}
      </div>
    </div>
  );
};

const StudentSettings = ({ instructions, setInstructions, profile }: { instructions: StudentInstructions, setInstructions: (val: any) => void, profile: UserProfile | null }) => {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('users')
        .update({
          instructions: JSON.stringify(instructions)
        })
        .eq('id', profile.id);
      
      if (error) throw error;
      alert('설정이 저장되었습니다.');
    } catch (err) {
      console.error(err);
      alert('저장 실패');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-10 py-10">
      <div>
        <h2 className="text-3xl font-black text-ink uppercase tracking-tighter mb-2">My Profile Settings</h2>
        <p className="text-xs text-secondary-text font-bold uppercase tracking-widest">나의 학습 성향과 목표를 관리하세요.</p>
      </div>

      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white border border-highlight rounded-2xl shadow-sm space-y-4">
             <label className="text-[10px] font-black text-accent uppercase tracking-widest block">문제 접근 방식</label>
             <div className="flex bg-paper p-1 rounded-xl border border-highlight">
                <button 
                  onClick={() => setInstructions({ ...instructions, problemSolvingApproach: 'intuitive' })}
                  className={cn("flex-1 py-2 text-[10px] font-black rounded-lg transition-all", instructions.problemSolvingApproach === 'intuitive' ? "bg-accent text-white" : "hover:bg-highlight text-secondary-text")}
                >직관적 연상</button>
                <button 
                  onClick={() => setInstructions({ ...instructions, problemSolvingApproach: 'logical' })}
                  className={cn("flex-1 py-2 text-[10px] font-black rounded-lg transition-all", instructions.problemSolvingApproach === 'logical' ? "bg-accent text-white" : "hover:bg-highlight text-secondary-text")}
                >논리적 추론</button>
             </div>
          </div>
          <div className="p-6 bg-white border border-highlight rounded-2xl shadow-sm space-y-4">
             <label className="text-[10px] font-black text-accent uppercase tracking-widest block">힌트 제공 수준</label>
             <div className="flex items-center gap-4">
                <input 
                  type="range" min="1" max="3" step="1"
                  value={instructions.hintLevel}
                  onChange={(e) => setInstructions({ ...instructions, hintLevel: parseInt(e.target.value) })}
                  className="flex-1 accent-accent"
                />
                <span className="text-[10px] font-black text-ink">Level {instructions.hintLevel}</span>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white border border-highlight rounded-2xl shadow-sm flex items-center justify-between">
             <label className="text-[10px] font-black text-accent uppercase tracking-widest block">스스로 설명 유도 여부</label>
             <button 
               onClick={() => setInstructions({ ...instructions, induceSelfExplanation: !instructions.induceSelfExplanation })}
               className={cn("w-12 h-6 rounded-full relative transition-colors", instructions.induceSelfExplanation ? "bg-accent" : "bg-highlight")}
             >
                <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", instructions.induceSelfExplanation ? "left-7" : "left-1")} />
             </button>
          </div>
          <div className="p-6 bg-white border border-highlight rounded-2xl shadow-sm flex items-center justify-between">
             <label className="text-[10px] font-black text-accent uppercase tracking-widest block">반복 학습 필요 여부</label>
             <button 
               onClick={() => setInstructions({ ...instructions, repeatNeeded: !instructions.repeatNeeded })}
               className={cn("w-12 h-6 rounded-full relative transition-colors", instructions.repeatNeeded ? "bg-accent" : "bg-highlight")}
             >
                <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", instructions.repeatNeeded ? "left-7" : "left-1")} />
             </button>
          </div>
        </div>

        {[
          { label: "현재 학습 목표", key: "currentGoals", desc: "도달하고 싶은 목표 (예: 이번 중간고사 1등급)" },
          { label: "선호 설명 방식", key: "preferredStyle", desc: "예: 그림을 통한 설명, 수식을 통한 증명" },
          { label: "어려운 개념", key: "difficultConcepts", desc: "집중적인 케어가 필요한 부분" }
        ].map((item) => (
          <div key={item.key} className="p-8 bg-white border border-highlight rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-start">
               <div>
                  <label className="text-[10px] font-black text-accent uppercase tracking-widest block mb-1">{item.label}</label>
                  <p className="text-[10px] text-secondary-text font-bold">{item.desc}</p>
               </div>
               <span className="text-[10px] font-black text-green-500 bg-green-50 px-2 py-0.5 rounded border border-green-100 uppercase tracking-widest">Active</span>
            </div>
            <textarea 
              value={(instructions as any)[item.key]}
              onChange={(e) => setInstructions({ ...instructions, [item.key]: e.target.value })}
              className="w-full mt-4 p-4 rounded-xl border border-highlight bg-paper text-sm font-semibold text-ink outline-none focus:ring-1 focus:ring-accent transition-all h-28 resize-none leading-relaxed"
            />
          </div>
        ))}
      </div>

      <div className="pt-6">
        <button 
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-accent text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-sidebar transition-all shadow-xl shadow-accent/10 disabled:opacity-50"
        >
          {saving ? '저장 중...' : '저장 및 적용하기'}
        </button>
      </div>
    </div>
  );
};

const StudentChat = ({ instructions, profile, session }: { instructions: StudentInstructions, profile: UserProfile | null, session: any }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [input, setInput] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'chat' | 'report'>('chat');
  const [report, setReport] = useState<LearningReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const fetchSessions = async () => {
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSessions(data || []);
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
    if (!activeSessionId || messages.length === 0 || isGenerating) return;
    setIsGenerating(true);
    
    try {
      const chatContext = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
      
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Analyze the following math study chat history between a student and an AI tutor. Provide a structured learning report in JSON format.
        
Current Study Goals: ${instructions.currentGoals}

Chat History:
${chatContext}

Provide the report in JSON following this exact field names:
{
  "summary": "Brief summary of the study session and key concepts learned",
  "misconceptions": "Detailed analysis of any misconceptions, errors or mistakes identified during the conversation",
  "recommendations": "Specific, actionable study recommendations and next steps for the student"
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

      const reportData = JSON.parse(response.text() || '{}');

      const { data, error } = await supabase
        .from('reports')
        .insert({
          session_id: activeSessionId,
          summary: reportData.summary,
          misconceptions: reportData.misconceptions,
          recommendations: reportData.recommendations
        })
        .select()
        .single();

      if (error) throw error;
      setReport(data);
      setActiveTab('report');
    } catch (err) {
      console.error("Error generating report:", err);
      alert("보고서 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [profile]);

  useEffect(() => {
    if (activeSessionId) {
      fetchMessages(activeSessionId);
      fetchReport(activeSessionId);
      setActiveTab('chat');
    } else {
      setMessages([]);
      setReport(null);
      setActiveTab('chat');
    }
  }, [activeSessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, isTyping]);

  // Helper to fix LaTeX delimiters
  const fixMathDelimiters = (content: string) => {
    return content
      .replace(/\\\((.*?)\\\)/g, '$$$1$')
      .replace(/\\\[(.*?)\\\]/g, '$$$$$1$$$$');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    
    // For simplicity, we just add a "message" with file info and trigger AI
    let sid = activeSessionId;
    if (!sid) {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({ 
          user_id: profile.id, 
          title: `파일 분석: ${file.name}` 
        })
        .select()
        .single();
      if (error) return;
      sid = data.id;
      setActiveSessionId(sid);
      fetchSessions();
    }

    const content = file.type.startsWith('image/') 
      ? `![${file.name}](https://picsum.photos/seed/${file.name}/400/300)\n\n업로드된 이미지: **${file.name}**`
      : `📎 **[${file.name}]** (PDF 업로드 완료)`;

    const { error: msgErr } = await supabase
      .from('chat_messages')
      .insert({ session_id: sid, role: 'user', content });

    if (msgErr) return;
    fetchMessages(sid!);

    // AI Response Simulation
    setTimeout(async () => {
      const resp = `제공해주신 **[${file.name}]** 파일을 확인했습니다. 관련하여 어떤 도움을 드릴까요?`;
      await supabase
        .from('chat_messages')
        .insert({ session_id: sid!, role: 'assistant', content: resp });
      fetchMessages(sid!);
    }, 1000);
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

    let sid = activeSessionId;
    if (!sid) {
      try {
        const { data } = await supabase
          .from('chat_sessions')
          .insert({
            user_id: profile.id,
            title: currentInput.slice(0, 30)
          })
          .select().single();

        if (data) {
          sid = data.id;
          setActiveSessionId(sid);
          fetchSessions();
        }
      } catch {}
      if (!sid) sid = crypto.randomUUID();
    }

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: currentInput,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      await supabase.from('chat_messages')
        .insert({
          session_id: sid,
          role: 'user',
          content: currentInput
        });
    } catch {}

    try {
      const teacherRaw = localStorage.getItem('TEACHER_INSTRUCTIONS');
      const systemInstruction = teacherRaw
        ? JSON.parse(teacherRaw)[profile.id]?.systemPrompt || `당신은 친절하고 전문적인 수학 AI 튜터입니다.
학생의 현재 목표: ${instructions.currentGoals}
어려운 개념: ${instructions.difficultConcepts}
수식은 반드시 LaTeX($...$) 형식으로 작성하세요.`
        : `당신은 친절하고 전문적인 수학 AI 튜터입니다.
학생의 현재 목표: ${instructions.currentGoals}
어려운 개념: ${instructions.difficultConcepts}
수식은 반드시 LaTeX($...$) 형식으로 작성하세요.`;

      const history = messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      }));

      const chat = ai.chats.create({
        model: 'gemini-2.0-flash',
        config: { systemInstruction },
        history,
      });

      const response = await chat.sendMessage(currentInput);
      const botContent = response.text() ?? '응답을 받지 못했습니다.';

      setLoading(false);
      setIsTyping(true);

      const aiMsgId = crypto.randomUUID();
      const aiMsg: Message = {
        id: aiMsgId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);

      // Typing animation
      let output = '';
      for (let char of botContent) {
        output += char;
        setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, content: output } : m));
        await new Promise(r => setTimeout(r, 15));
      }

      try {
        await supabase.from('chat_messages')
          .insert({
            session_id: sid,
            role: 'assistant',
            content: botContent
          });
      } catch {}

    } catch (err: any) {
      console.error('AI 호출 실패:', err);
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `오류: ${err?.message ?? 'AI 연결 실패'}`,
        timestamp: new Date(),
      }]);
      setLoading(false);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex h-full gap-6 relative">
      {/* Search/History Sidebar inside chat */}
      <div className="w-64 bg-white dark:bg-gray-800 rounded-xl border border-highlight flex flex-col overflow-hidden shadow-sm shrink-0" id="student-chat-history">
        <div className="p-4 border-b border-highlight bg-gray-50/30">
           <button 
             onClick={() => setActiveSessionId(null)}
             className="w-full py-2.5 bg-accent text-white rounded-lg font-black text-[10px] uppercase tracking-widest shadow-lg shadow-accent/20 hover:scale-[1.02] active:scale-95 transition-all mb-4 flex items-center justify-center gap-2"
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
               <span className="text-[10px] font-bold text-secondary-text uppercase tracking-widest leading-none">최근 대화</span>
            </div>
            {sessions.length === 0 ? (
              <div className="p-4 text-center text-[10px] text-gray-400 font-bold italic">
                첫 대화를 시작해 보세요!
              </div>
            ) : sessions.map((s) => (
              <button 
                key={s.id} 
                onClick={() => setActiveSessionId(s.id)}
                className={cn(
                  "w-full text-left p-2.5 rounded-lg transition-all border group",
                  activeSessionId === s.id ? "bg-paper border-accent shadow-sm" : "border-transparent hover:bg-paper hover:border-highlight"
                )}
              >
                <span className={cn("text-xs font-bold truncate block group-hover:text-accent", activeSessionId === s.id ? "text-accent" : "text-ink")}>{s.title}</span>
                <span className="text-[9px] text-secondary-text">{new Date(s.created_at).toLocaleDateString()}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-highlight overflow-hidden shadow-sm relative" id="student-chat-area">
        <header className="px-6 py-4 border-b border-highlight flex justify-between items-center bg-white dark:bg-gray-800 z-10 shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-paper flex items-center justify-center text-accent"><Bot size={18}/></div>
              <div className="hidden sm:block">
                <h3 className="text-sm font-bold text-ink">수학 AI 튜터</h3>
                <p className="text-[10px] text-green-500 font-bold flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> 질문 대기 중</p>
              </div>
            </div>

            {/* Tabs */}
            {activeSessionId && (
              <div className="flex bg-paper p-1 rounded-xl border border-highlight h-10 shrink-0">
                <button 
                  onClick={() => setActiveTab('chat')}
                  className={cn(
                    "px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                    activeTab === 'chat' ? "bg-white text-accent shadow-sm" : "text-secondary-text hover:text-accent"
                  )}
                >
                  채팅 학습
                </button>
                <button 
                  onClick={() => setActiveTab('report')}
                  className={cn(
                    "px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
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
               "px-4 py-2 rounded-lg transition-all border font-black text-[10px] uppercase tracking-widest shadow-sm", 
               showSettings ? "bg-accent text-white border-accent" : "bg-white text-secondary-text border-highlight hover:border-accent hover:text-accent"
            )}
          >
            맞춤 학습 설정
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
          {activeTab === 'chat' ? (
            <div className="space-y-6">
              {messages.length === 0 && (
                <div className="h-full py-20 flex flex-col items-center justify-center text-center p-10 space-y-6 opacity-30">
                   <Bot size={60} className="text-gray-400" />
                   <div>
                      <h4 className="text-xl font-black text-ink uppercase tracking-tight">수학 AI 튜터와 학습을 시작하세요</h4>
                      <p className="text-xs font-bold text-secondary-text mt-2">지금 바로 질문을 입력하거나 파일을 업로드해 보세요.</p>
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
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {fixMathDelimiters(m.content)}
                      </ReactMarkdown>
                    </div>
                  </div>
                  <span className="text-[10px] text-secondary-text mt-1.5 font-medium px-1">
                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
              {(loading || isTyping) && (
                <div className="flex flex-col max-w-[85%] mr-auto items-start animate-in fade-in slide-in-from-bottom-2">
                  <div className="p-4 rounded-2xl text-sm leading-relaxed shadow-sm bg-[#F7FAFC] text-ink border border-highlight rounded-tl-none flex items-center gap-2">
                    <Bot size={16} className="text-accent animate-pulse" />
                    <span className="text-secondary-text font-bold">AI가 생각 중</span>
                    <span className="flex gap-1 items-center">
                      <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0 }} className="w-1 h-1 bg-accent rounded-full"></motion.span>
                      <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }} className="w-1 h-1 bg-accent rounded-full"></motion.span>
                      <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.6 }} className="w-1 h-1 bg-accent rounded-full"></motion.span>
                    </span>
                  </div>
                </div>
              )}
              {/* Report Generation Trigger */}
              {messages.length > 2 && !report && (
                <div className="flex justify-center pt-8 pb-4">
                  <button 
                    onClick={generateReport}
                    disabled={isGenerating}
                    className="px-8 py-3 bg-paper border border-highlight text-accent rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-accent hover:text-white transition-all shadow-md flex items-center gap-2 group"
                  >
                    {isGenerating ? <RefreshCcw size={14} className="animate-spin" /> : <BookOpenCheck size={16} />}
                    {isGenerating ? "보고서 분석 중..." : "오늘의 학습 종료 및 보고서 생성"}
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
                      {isGenerating ? "보고서 분석 중..." : "AI 학습 보고서 생성하기"}
                    </button>
                 </div>
              ) : (
                <>
                   <header className="space-y-2 border-l-4 border-accent pl-6">
                      <div className="text-[10px] font-black text-accent uppercase tracking-[0.2em]">Learning Analysis Report</div>
                      <h2 className="text-3xl font-black text-ink uppercase tracking-tighter">AI 학습 분석 리포트</h2>
                      <p className="text-[11px] text-secondary-text font-bold uppercase tracking-widest">{new Date(report.created_at).toLocaleDateString()} • {messages.length}개의 대화 분석</p>
                   </header>

                   <div className="grid gap-8">
                      {/* Summary Section */}
                      <section className="bg-white rounded-3xl border border-highlight p-8 shadow-sm">
                         <h4 className="flex items-center gap-3 text-[10px] font-black text-accent uppercase tracking-widest mb-6">
                            <Info size={14} /> 학습 내용 요약
                         </h4>
                         <div className="p-6 bg-paper rounded-2xl text-sm font-semibold text-ink leading-relaxed italic border border-highlight/50">
                            "{report.summary}"
                         </div>
                      </section>

                      {/* Misconceptions Section */}
                      <section className="bg-white rounded-3xl border border-highlight p-8 shadow-sm">
                         <h4 className="flex items-center gap-3 text-[10px] font-black text-red-500 uppercase tracking-widest mb-6">
                            <AlertCircle size={14} /> 오개념 및 취약점 분석
                         </h4>
                         <div className="p-6 bg-red-50/30 rounded-2xl border border-red-100/50 text-sm font-medium text-ink leading-relaxed">
                            {report.misconceptions}
                         </div>
                      </section>

                      {/* Recommendations Section */}
                      <section className="bg-white rounded-3xl border border-highlight p-8 shadow-sm relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-bl-full -mr-16 -mt-16"></div>
                         <h4 className="flex items-center gap-3 text-[10px] font-black text-green-600 uppercase tracking-widest mb-6">
                            <Lightbulb size={14} /> 추천 학습 방향
                         </h4>
                         <div className="p-6 bg-green-50/30 rounded-2xl border border-green-100/50 text-sm font-semibold text-ink leading-relaxed">
                            {report.recommendations}
                         </div>
                      </section>
                   </div>

                   <footer className="pt-10 flex border-t border-highlight justify-between items-center pb-20">
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest italic">Math Tutor AI Insights</p>
                      <button className="flex items-center gap-2 text-[10px] font-black text-accent hover:underline">
                         <FileDown size={14} /> PDF로 내보내기
                      </button>
                   </footer>
                </>
              )}
            </div>
          )}
        </div>

        {activeTab === 'chat' && (
          <footer className="p-4 border-t border-highlight bg-white dark:bg-gray-800 shrink-0">
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
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="수학 개념이나 문제를 질문해보세요..."
                className="flex-1 bg-transparent border-none outline-none text-sm py-1.5 text-ink placeholder:text-secondary-text"
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
                   학습자 맞춤 설정
                </h4>
                <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-paper rounded text-secondary-text transition-colors"><X size={18} /></button>
              </header>

              <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                <div className="p-4 bg-paper rounded-xl border border-highlight space-y-3">
                    <p className="text-[10px] font-black text-accent uppercase tracking-widest">학습자 프로필 (읽기 전용)</p>
                    <div className="space-y-4">
                        {[
                          { label: "현재 학습 목표", val: instructions.currentGoals },
                          { label: "선호 설명 방식", val: instructions.preferredStyle },
                          { label: "진행 중인 어려운 개념", val: instructions.difficultConcepts },
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
                     <span className="text-[10px] font-bold text-ink">설명 유도 모드</span>
                     <span className={cn("text-[9px] font-black px-2 py-0.5 rounded uppercase", instructions.induceSelfExplanation ? "bg-accent/10 text-accent" : "bg-gray-100 text-gray-400")}>
                        {instructions.induceSelfExplanation ? "ON" : "OFF"}
                     </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-highlight">
                     <span className="text-[10px] font-bold text-ink">힌트 레벨</span>
                     <span className="text-[9px] font-black text-accent">LEVEL {instructions.hintLevel}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-paper/50 border-t border-highlight">
                <button 
                   onClick={() => setShowSettings(false)}
                   className="w-full py-3 bg-accent text-white rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-sidebar transition-all shadow-md"
                >
                  확인 완료
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const StudentHistory = ({ profile }: { profile: UserProfile | null }) => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!profile) return;
      try {
        const { data, error } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setSessions(data || []);
      } catch (err) {
        console.error("Error fetching history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [profile]);

  return (
    <div className="space-y-8 p-4 overflow-y-auto h-full pb-20">
      <div className="flex justify-between items-end">
          <div>
              <h2 className="text-2xl font-black text-ink uppercase tracking-tighter">My Learning History</h2>
              <p className="text-xs text-secondary-text font-bold">지금까지의 대화 및 학습 기록입니다.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-accent">
              <span className="w-2 h-2 bg-accent rounded-full"></span> 총 {sessions.length}개의 세션
          </div>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
           {[1,2,3].map(i => <div key={i} className="h-48 bg-white rounded-xl border border-highlight"></div>)}
        </div>
      ) : sessions.length === 0 ? (
        <div className="h-[400px] flex flex-col items-center justify-center text-gray-300 gap-4">
           <History size={48} className="opacity-20" />
           <p className="font-bold text-sm">대화 기록이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map(sess => (
            <div key={sess.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-highlight hover:border-accent hover:shadow-lg transition-all group cursor-pointer relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <span className="text-[10px] font-black uppercase tracking-widest text-accent bg-paper px-2.5 py-1 rounded border border-highlight">
                  {new Date(sess.created_at).toLocaleDateString()}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 hover:text-accent transition-colors"><Settings size={14}/></button>
                  <button className="p-1.5 hover:text-red-500 transition-colors"><X size={14}/></button>
                </div>
              </div>
              <h3 className="text-lg font-bold mb-4 text-ink group-hover:text-accent transition-colors leading-tight">{sess.title}</h3>
              <div className="flex items-center gap-4 text-[10px] font-bold text-secondary-text uppercase tracking-widest">
                <div className="flex items-center gap-1.5">
                  <ClipboardCheck size={12} className="text-green-500" /> 세션 ID: {sess.id.slice(0,8)}
                </div>
              </div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-bl-full -mr-12 -mt-12 group-hover:bg-accent/10 transition-colors"></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const StudentView = ({ session, profile, fetchProfile, handleTestLogin, handleLogout }: { 
  session: any, 
  profile: UserProfile | null, 
  fetchProfile: (session: any) => Promise<void>,
  handleTestLogin: () => Promise<void>,
  handleLogout: () => Promise<void>
}) => {
  const location = useLocation();
  const [instructions, setInstructions] = useState(DUMMY_STUDENT.instructions);

  useEffect(() => {
    if (profile?.instructions) {
      try {
        setInstructions(JSON.parse(profile.instructions));
      } catch (err) {
        console.error("Instructions parse error:", err);
      }
    }
  }, [profile]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    name: profile?.name || '', 
    grade: profile?.grade || '', 
    class: profile?.class || '', 
    number: profile?.number || '' 
  });

  // Update form data when profile is loaded
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || '',
        grade: profile.grade || '',
        class: profile.class || '',
        number: profile.number || ''
      });
    }
  }, [profile]);

  const enrollmentStatus = profile?.status || 'none';
  const isInfoMissing = !profile?.grade || !profile?.class || !profile?.number;

  const handleSubmitEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: formData.name,
          grade: formData.grade,
          class: formData.class,
          number: formData.number,
        })
        .eq('id', session.user.id);

      if (error) throw error;
      await fetchProfile(session);
    } catch (err) {
      console.error("Enrollment error:", err);
      alert("Registration failed. Please try again.");
    }
  };

  if (!session) {
    return <Navigate to="/" replace />;
  }

  if (isInfoMissing) {
    return (
      <div className="flex h-[calc(100vh-2rem)] items-center justify-center bg-paper rounded-3xl border border-highlight shadow-sm overflow-y-auto py-10">
        <div className="max-w-xl w-full p-10 bg-white rounded-3xl border border-highlight shadow-2xl space-y-8">
           <div className="text-center">
              <h1 className="text-3xl font-black text-ink uppercase tracking-tighter">Additional Information</h1>
              <p className="text-xs text-secondary-text font-bold mt-2 uppercase tracking-widest">추가 정보를 입력하여 가입을 신청하세요.</p>
           </div>
           <form onSubmit={handleSubmitEnrollment} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-accent uppercase tracking-widest">이름</label>
                    <input 
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="홍길동"
                      className="w-full p-4 bg-paper rounded-xl border border-highlight text-sm font-bold focus:ring-1 focus:ring-accent outline-none" 
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-accent uppercase tracking-widest">학년</label>
                    <select 
                      required
                      value={formData.grade}
                      onChange={e => setFormData({ ...formData, grade: e.target.value })}
                      className="w-full p-4 bg-paper rounded-xl border border-highlight text-sm font-bold focus:ring-1 focus:ring-accent outline-none"
                    >
                       <option value="">선택</option>
                       <option value="1">1학년</option>
                       <option value="2">2학년</option>
                       <option value="3">3학년</option>
                    </select>
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-accent uppercase tracking-widest">반</label>
                    <input 
                      required
                      type="number"
                      value={formData.class}
                      onChange={e => setFormData({ ...formData, class: e.target.value })}
                      placeholder="1"
                      className="w-full p-4 bg-paper rounded-xl border border-highlight text-sm font-bold focus:ring-1 focus:ring-accent outline-none" 
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-accent uppercase tracking-widest">번호</label>
                    <input 
                      required
                      type="number"
                      value={formData.number}
                      onChange={e => setFormData({ ...formData, number: e.target.value })}
                      placeholder="15"
                      className="w-full p-4 bg-paper rounded-xl border border-highlight text-sm font-bold focus:ring-1 focus:ring-accent outline-none" 
                    />
                 </div>
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-accent text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-sidebar transition-all shadow-xl shadow-accent/10"
              >Save Information</button>
           </form>
        </div>
      </div>
    );
  }

  if (enrollmentStatus === 'pending') {
    return (
      <div className="flex h-[calc(100vh-2rem)] items-center justify-center bg-paper rounded-3xl border border-highlight shadow-sm">
        <div className="max-w-md w-full p-12 bg-white rounded-3xl border border-highlight shadow-2xl text-center space-y-6">
           <div className="w-20 h-20 bg-paper rounded-full flex items-center justify-center mx-auto text-accent animate-pulse">
              <ClipboardCheck size={40} />
           </div>
           <div>
              <h1 className="text-2xl font-black text-ink uppercase tracking-tighter">Pending Approval</h1>
              <p className="text-[11px] text-secondary-text font-bold mt-3 leading-relaxed">
                가입 신청이 완료되었습니다.<br/>
                선생님이 승인하신 후에 서비스를 이용할 수 있습니다.<br/>
                잠시만 기다려 주세요.
              </p>
           </div>
           <div className="pt-4 flex flex-col gap-2">
               <button 
                 onClick={() => fetchProfile(session)}
                 className="flex items-center justify-center gap-2 mx-auto px-4 py-2 bg-paper border border-highlight rounded-xl text-[10px] text-ink font-black uppercase tracking-widest hover:bg-white transition-all"
               >
                 <RefreshCcw size={14} className="text-accent" />
                 Refresh Status
               </button>
               <p className="text-[9px] text-gray-400 font-bold italic">승인 완료 후 새로고침을 눌러주세요.</p>
           </div>
        </div>
      </div>
    );
  }

  if (enrollmentStatus === 'rejected') {
    return (
      <div className="flex h-[calc(100vh-2rem)] items-center justify-center bg-paper rounded-3xl border border-highlight shadow-sm">
        <div className="max-w-md w-full p-12 bg-white rounded-3xl border border-highlight shadow-2xl text-center space-y-6">
           <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
              <AlertCircle size={40} />
           </div>
           <div>
              <h1 className="text-2xl font-black text-ink uppercase tracking-tighter">Request Rejected</h1>
              <p className="text-[11px] text-secondary-text font-bold mt-3 leading-relaxed">
                가입 신청이 거절되었습니다.<br/>
                학급 정보가 올바른지 확인하신 후 다시 신청해 주세요.<br/>
                문의사항은 담당 선생님께 연락 바랍니다.
              </p>
           </div>
           <button 
             onClick={async () => {
                await supabase.from('users').delete().eq('id', session.user.id);
                fetchProfile(session);
             }}
             className="w-full py-4 bg-red-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all shadow-xl shadow-red-500/10"
           >Re-apply for Registration</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen md:h-[calc(100vh-2rem)] md:rounded-3xl overflow-hidden border border-highlight shadow-sm relative">
      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-sidebar/50 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 w-64 flex flex-col bg-sidebar text-white py-8 flex-shrink-0 z-50 transform transition-transform duration-300 md:relative md:translate-x-0 md:z-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="px-6 mb-10 flex justify-between items-center">
          <h1 className="text-xl font-black tracking-tighter text-gray-100 uppercase">Math Tutor</h1>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-white/60 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <nav className="flex flex-col">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="내 학습" 
            to="/student" 
            active={location.pathname === "/student"} 
            onClick={() => setIsSidebarOpen(false)} 
          />
          <SidebarItem 
            icon={History} 
            label="내 대화 기록" 
            to="/student/history" 
            active={location.pathname === "/student/history"} 
            onClick={() => setIsSidebarOpen(false)} 
          />
          <SidebarItem 
            icon={Settings} 
            label="내 설정" 
            to="/student/settings" 
            active={location.pathname === "/student/settings"} 
            onClick={() => setIsSidebarOpen(false)} 
          />
        </nav>
        <div className="mt-auto px-6 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white"><CircleUser size={18}/></div>
            <div className="flex flex-col">
              <span className="font-bold text-xs">{profile?.name || DUMMY_STUDENT.name}</span>
              <span className="text-[10px] text-white/50">{profile ? `${profile.grade}학년 ${profile.class}반 ${profile.number}번` : DUMMY_STUDENT.class}</span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 text-xs text-white/50 hover:text-white transition-colors"
          >
            <LogOut size={12} /> 로그아웃
          </button>
        </div>
      </div>

      {/* Main Area */}
      <main className="flex-1 overflow-hidden bg-paper flex flex-col w-full">
        <header className="h-16 px-4 md:px-8 border-b border-highlight bg-white flex items-center justify-between shrink-0">
           <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 md:hidden text-secondary-text hover:text-accent transition-colors"
              >
                <Menu size={20} />
              </button>
              <span className="text-sm font-bold text-accent uppercase tracking-widest">
                {location.pathname === "/student" && "학습 공간"}
                {location.pathname === "/student/history" && "대화 기록"}
                {location.pathname === "/student/settings" && "학습 설정"}
              </span>
           </div>
        </header>
        <div className={cn(
          "flex-1 p-4 md:p-6",
          location.pathname === "/student/settings" ? "overflow-y-auto" : "overflow-hidden"
        )}>
          <Routes>
            <Route index element={<StudentChat instructions={instructions} profile={profile} session={session} />} />
            <Route path="history" element={<StudentHistory profile={profile} />} />
            <Route path="settings" element={<StudentSettings instructions={instructions} setInstructions={setInstructions} profile={profile} />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

// --- Teacher Views ---

const TeacherDashboard = () => {
  const [showClassInstructions, setShowClassInstructions] = useState(false);
  const [classInstructions, setClassInstructions] = useState<TeacherInstructions>({
    weeklyGoals: "미분법 단원 심화 학습 및 문제 풀이",
    keyConcepts: "도함수, 합성함수의 미분, 몫의 미분법",
    solvingGuideline: "공식 암기보다는 유도 과정을 이해하고 설명하도록 유도",
    difficultyLevel: "중상 (준킬러 급)",
    feedbackStyle: "힌트 중심 (단계별 질문 피드백)",
    aiQuestionStyle: 'inductive',
    aiMisconceptionResponse: "즉시 정정하기보다 반례를 들어 스스로 깨닫게 함",
    aiEngagementStrategy: "수능 실전 응용 사례를 언급하여 동기 부여",
  });

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-black text-ink uppercase tracking-tighter">교사 대시보드</h2>
        <p className="text-sm text-secondary-text font-bold uppercase tracking-widest opacity-60">우리 학급의 학습을 실시간으로 관리하세요.</p>
        
        <div className="pt-10 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto px-4">
           {[
             { label: "학급 학습 지시문 설정", icon: BookOpen, action: () => setShowClassInstructions(true) },
             { label: "오늘의 학습 통계 확인", icon: BarChart3, action: () => {} }
           ].map((btn, idx) => (
             <button 
               key={idx}
               onClick={btn.action}
               className="flex items-center justify-center gap-3 bg-white border border-highlight p-6 rounded-3xl hover:border-accent hover:shadow-xl transition-all group"
             >
                <btn.icon size={24} className="text-accent group-hover:scale-110 transition-transform" />
                <span className="font-black text-xs uppercase tracking-widest text-ink">{btn.label}</span>
             </button>
           ))}
        </div>
      </div>

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
                    <h3 className="text-2xl font-black text-ink uppercase tracking-tight">학급 공통 학습 지시문</h3>
                    <p className="text-[10px] text-secondary-text font-bold uppercase tracking-widest mt-1">학급: 3학년 1반 • AI 튜터 시스템 프로토콜</p>
                 </div>
                 <button onClick={() => setShowClassInstructions(false)} className="p-2 hover:bg-paper rounded-full transition-colors"><X size={24}/></button>
              </header>
              <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <h4 className="text-[11px] font-black text-accent uppercase tracking-widest border-l-4 border-accent pl-3">학급 공통 지침</h4>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-secondary-text uppercase tracking-widest">이번 주 학습 목표</label>
                                <textarea value={classInstructions.weeklyGoals} onChange={e => setClassInstructions({...classInstructions, weeklyGoals: e.target.value})} className="w-full p-4 bg-paper border border-highlight rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-accent h-20 resize-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-secondary-text uppercase tracking-widest">강조 개념</label>
                                <input value={classInstructions.keyConcepts} onChange={e => setClassInstructions({...classInstructions, keyConcepts: e.target.value})} className="w-full p-4 bg-paper border border-highlight rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-accent" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-secondary-text uppercase tracking-widest">문제 난이도 기준</label>
                                <input value={classInstructions.difficultyLevel} onChange={e => setClassInstructions({...classInstructions, difficultyLevel: e.target.value})} className="w-full p-4 bg-paper border border-highlight rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-accent" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h4 className="text-[11px] font-black text-accent uppercase tracking-widest border-l-4 border-accent pl-3">AI 튜터 동작 지침</h4>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-secondary-text uppercase tracking-widest">질문 및 피드백 방식</label>
                                <select value={classInstructions.aiQuestionStyle} onChange={e => setClassInstructions({...classInstructions, aiQuestionStyle: e.target.value as any})} className="w-full p-4 bg-paper border border-highlight rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-accent">
                                    <option value="inductive">유도형 (질문을 통해 깨닫게 함)</option>
                                    <option value="direct">직접 설명 (개념을 바로 설명함)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-secondary-text uppercase tracking-widest">오개념 대응 방식</label>
                                <textarea value={classInstructions.aiMisconceptionResponse} onChange={e => setClassInstructions({...classInstructions, aiMisconceptionResponse: e.target.value})} className="w-full p-4 bg-paper border border-highlight rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-accent h-20 resize-none" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-secondary-text uppercase tracking-widest">학생 참여 유도 전략</label>
                                <textarea value={classInstructions.aiEngagementStrategy} onChange={e => setClassInstructions({...classInstructions, aiEngagementStrategy: e.target.value})} className="w-full p-4 bg-paper border border-highlight rounded-xl text-xs font-semibold outline-none focus:ring-1 focus:ring-accent h-20 resize-none" />
                            </div>
                        </div>
                    </div>
                 </div>
                 
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-secondary-text uppercase tracking-widest">풀이 방식 지침</label>
                    <textarea value={classInstructions.solvingGuideline} onChange={e => setClassInstructions({...classInstructions, solvingGuideline: e.target.value})} className="w-full p-4 bg-paper border border-highlight rounded-xl text-sm font-semibold outline-none focus:ring-1 focus:ring-accent h-24 resize-none leading-relaxed" />
                 </div>
              </div>
              <footer className="px-10 py-8 border-t border-highlight bg-paper/10 flex justify-end gap-4">
                 <button 
                   onClick={() => setShowClassInstructions(false)}
                   className="px-8 py-4 border border-highlight rounded-2xl text-xs font-black text-secondary-text hover:bg-paper transition-all uppercase tracking-widest"
                 >취소</button>
                 <button 
                   onClick={() => setShowClassInstructions(false)}
                   className="px-10 py-4 bg-accent text-white rounded-2xl text-xs font-black hover:bg-sidebar transition-all shadow-xl shadow-accent/20 uppercase tracking-widest"
                 >저장 및 전체 적용</button>
              </footer>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="teacher-stats-container">
      {[
        { label: "전체 학생 수", value: "32", icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
        { label: "오늘 학습 세션", value: "24", icon: MessageSquare, color: "text-green-600", bg: "bg-green-50" },
        { label: "평균 성취도", value: "78%", icon: BarChart3, color: "text-purple-600", bg: "bg-purple-50" },
        { label: "도움 필요 학생", value: "5", icon: ClipboardCheck, color: "text-red-600", bg: "bg-red-50" }
      ].map((stat, i) => (
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
          <span className="text-[10px] font-bold text-accent px-2 py-1 bg-paper rounded uppercase">Monthly Progress</span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={CLASS_PERFORMANCE_DATA}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#718096' }} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#718096' }} 
              />
              <Tooltip 
                cursor={{ fill: '#F7FAFC' }}
                contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px', fontWeight: 800 }}
              />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                 {CLASS_PERFORMANCE_DATA.map((entry, index) => (
                   <Cell key={`cell-${index}`} fill={index === CLASS_PERFORMANCE_DATA.length - 1 ? '#4A5568' : '#CBD5E0'} />
                 ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-highlight p-8 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-sm text-ink uppercase tracking-wide">단원별 이해도 분석</h3>
          <span className="text-[10px] font-bold text-accent px-2 py-1 bg-paper rounded uppercase">Unit Mastery</span>
        </div>
        <div className="h-64 flex justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={UNIT_UNDERSTANDING_DATA}>
              <PolarGrid stroke="#E2E8F0" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 700, fill: '#718096' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                name="이해도"
                dataKey="A"
                stroke="#4A5568"
                fill="#4A5568"
                fillOpacity={0.15}
              />
              <Tooltip 
                 contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px', fontWeight: 800 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Student List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-highlight overflow-hidden shadow-sm">
        <div className="p-5 border-b border-highlight flex justify-between items-center bg-gray-50/30">
          <h3 className="font-bold text-sm text-ink uppercase tracking-wide">우리 반 학생 목록</h3>
          <span className="text-[10px] font-bold text-secondary-text bg-highlight px-2 py-1 rounded">전체 24명</span>
        </div>
        <div className="divide-y divide-highlight">
          {DUMMY_CLASSES[0].students.map(s => (
            <Link to={`/teacher/analysis/${s.id}`} key={s.id} className="flex items-center justify-between p-4 px-6 hover:bg-paper transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-highlight border border-gray-200 flex items-center justify-center text-xs font-bold text-accent">
                  {s.name[0]}
                </div>
                <div>
                  <p className="text-sm font-bold text-ink">{s.name}</p>
                  <p className="text-[10px] text-secondary-text">최근 학습: {formatDate(s.sessions[0].date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-[10px] text-secondary-text font-bold">성취도</p>
                  <p className="text-sm font-black text-accent">{s.sessions[0].achievement}%</p>
                </div>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-accent transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Analysis Area */}
      <div className="bg-sidebar text-white p-8 rounded-xl relative overflow-hidden flex flex-col justify-end min-h-[300px] shadow-lg" id="teacher-insights-card">
        <div className="absolute top-8 left-8">
          <Bot size={40} className="text-white/20" />
        </div>
        <div>
           <div className="inline-block px-2 py-1 bg-white/10 rounded text-[10px] font-bold uppercase tracking-widest mb-4">Daily Insights</div>
          <h3 className="text-xl font-bold mb-3">AI 인사이트</h3>
          <p className="text-white/70 text-sm mb-8 leading-relaxed">
            최근 미분법 단원에서 5명의 학생이 <span className="text-white font-bold">'합성함수 미분'</span> 개념에 어려움을 겪고 있습니다.<br/>
            추가 보충 자료와 설명이 필요할 것 같습니다.
          </p>
          <button className="bg-white text-sidebar font-black px-6 py-3 rounded-lg hover:bg-highlight hover:text-sidebar transition-all text-sm">분석 리포트 확인</button>
        </div>
        <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
      </div>
    </div>
  </div>
);
};

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
          { role: "user", content: "$\sec x$ 미분하면 $\sec x \tan x$ 맞죠?", created_at: "2026-04-13T13:10:00Z" },
          { role: "assistant", content: "네, 정확합니다! 그럼 $\csc x$는 어떻게 될까요?", created_at: "2026-04-13T13:11:00Z" }
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
          { role: "user", content: "$2^3 \cdot 2^2 = 2^6$ 인가요?", created_at: "2026-04-12T15:40:00Z" },
          { role: "assistant", content: "아니요, 지수끼리는 더해줘야 해요! $2^3 \cdot 2^2 = 2^{3+2} = 2^5 = 32$가 됩니다.", created_at: "2026-04-12T15:41:00Z" }
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
          { role: "user", content: "$\\int x \cdot \sin x dx$ 풀었는데 자꾸 답이 달라요.", created_at: "2026-04-11T10:15:00Z" },
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

  // Simplified selection logic using static data
  useEffect(() => {
    if (selectedStudent) {
      // Find updated student from static data to ensure we have sessions
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
      {/* 1. Student Selection Sidebar (Always Visible) */}
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
                  onClick={() => {
                     setSelectedStudent(student);
                  }}
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
                    {/* Status Indicator */}
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

                  {/* Hover Insight Tooltip */}
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
        {/* 2. Session List for Selected Student */}
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
                <p className="text-[9px] text-secondary-text font-medium opacity-60 uppercase tracking-widest">Session ID: {sess.id.slice(0,8)}</p>
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
                    ) : messages.map(m => (
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

      {/* 4. Learning Instruction Modal (Slide or Centered) */}
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
                 <button onClick={() => setShowInstructionModal(false)} className="p-2 hover:bg-paper rounded-full transition-colors"><X size={20}/></button>
              </header>
              <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-accent uppercase tracking-widest">문제 접근 방식</label>
                       <select value={tempInstructions.problemSolvingApproach} onChange={e => setTempInstructions({...tempInstructions, problemSolvingApproach: e.target.value as any})} className="w-full p-3 bg-paper border border-highlight rounded-xl text-xs font-bold outline-none">
                          <option value="intuitive">직관적 해결 선호</option>
                          <option value="logical">논리적 증명 선호</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-accent uppercase tracking-widest">힌트 제공 수준</label>
                       <select value={tempInstructions.hintLevel} onChange={e => setTempInstructions({...tempInstructions, hintLevel: parseInt(e.target.value)})} className="w-full p-3 bg-paper border border-highlight rounded-xl text-xs font-bold outline-none">
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
                          <textarea value={(tempInstructions as any)[item.key]} onChange={e => setTempInstructions({...tempInstructions, [item.key]: e.target.value})} className="w-full p-4 bg-paper border border-highlight rounded-xl text-xs font-semibold h-20 resize-none outline-none focus:ring-1 focus:ring-accent" />
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
const TeacherChat = ({ profile, session }: { profile: UserProfile | null, session: any }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");

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
    const initSession = async () => {
      if (!profile) return;
      // For teachers, we might just want to load the latest pedagogical session or create a new one
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
        // Welcome message if no session
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

    await fetchMessages(sid!);
    const currentInput = input;
    setInput("");
    
    setTimeout(async () => {
      const resp = `**${currentInput}** 관련 분석 결과입니다. 현재 학급의 평균 성취도를 고려할 때, 해당 개념에 보충이 필요한 학생은 3명으로 파악됩니다. 상세 리포트를 생성해 드릴까요?`;
      await supabase
        .from('chat_messages')
        .insert({ session_id: sid!, role: 'assistant', content: resp });
      await fetchMessages(sid!);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-xl border border-highlight overflow-hidden shadow-sm relative">
      <div className="px-6 py-6 border-b border-highlight bg-gray-50/20 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-black text-ink dark:text-white uppercase tracking-tight">AI Pedagogical Assistant</h2>
          <p className="text-[10px] text-secondary-text font-bold uppercase tracking-widest">교과 지도 및 학생 분석 도우미</p>
        </div>
        <div className="flex items-center gap-2">
           <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
           <span className="text-[10px] font-black text-green-600 uppercase">Online</span>
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
              "전체 학생 성취도 분석해줘",
              "미분법 수업 자료 만들어줘",
              "개별 지도가 필요한 학생은?"
            ].map(q => (
              <button 
                key={q}
                onClick={() => setInput(q)}
                className="px-3 py-1.5 bg-paper hover:bg-highlight border border-highlight rounded-lg text-[10px] font-bold text-secondary-text transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <div className="p-1 bg-paper border border-highlight rounded-xl focus-within:ring-1 focus-within:ring-accent transition-all flex gap-2">
          <input 
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

const TeacherCurriculum = () => (
  <div className="space-y-8">
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-black text-ink uppercase tracking-tighter">Curriculum Management</h2>
      <button className="flex items-center gap-2 bg-accent text-white px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest shadow-md hover:bg-sidebar transition-all hover:scale-[1.02]">
        <Plus size={16} /> Add New Unit
      </button>
    </div>
    
    <div className="space-y-4">
       {[
         { title: "I. 함수의 극한과 연속", goals: "극한의 성질 이해, 연속의 정의", active: true },
         { title: "II. 다항함수의 미분법", goals: "미분계수의 의미, 도함수 활용", active: true },
         { title: "III. 다항함수의 적분법", goals: "부정적분과 정적분의 이해", active: false }
       ].map((unit, i) => (
         <div key={i} className="bg-white p-6 rounded-xl border border-highlight flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
            <div className="flex gap-6 items-center">
                <div className="w-10 h-10 bg-paper border border-highlight text-accent flex items-center justify-center rounded-lg font-black text-lg">{i+1}</div>
                <div>
                   <h3 className="text-sm font-black mb-0.5 text-ink uppercase">{unit.title}</h3>
                   <p className="text-[10px] text-secondary-text font-bold">학습 목표: {unit.goals}</p>
                </div>
            </div>
            <div className="flex items-center gap-6">
               {unit.active ? (
                 <span className="text-[9px] font-black text-success-text bg-success-bg px-2 py-0.5 rounded uppercase tracking-widest">In Progress</span>
               ) : (
                 <span className="text-[9px] font-black text-gray-400 bg-highlight px-2 py-0.5 rounded uppercase tracking-widest">Planned</span>
               )}
               <button className="p-2 text-gray-300 hover:text-accent transition-colors"><Settings size={18}/></button>
            </div>
         </div>
       ))}
    </div>
  </div>
);

const TeacherResource = () => (
  <div className="space-y-8">
    <h2 className="text-2xl font-black text-ink uppercase tracking-tighter">Resource Repository</h2>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Upload area */}
      <div className="p-10 border-2 border-dashed border-highlight rounded-xl bg-white flex flex-col items-center justify-center text-center gap-4 hover:border-accent hover:bg-paper transition-all cursor-pointer group shadow-sm">
         <div className="w-14 h-14 bg-paper group-hover:bg-accent group-hover:text-white rounded-full flex items-center justify-center text-accent transition-all border border-highlight">
            <Plus size={24} />
         </div>
         <div>
            <h4 className="font-black text-sm mb-1 text-ink uppercase tracking-tight">Upload New Resource</h4>
            <p className="text-[10px] text-secondary-text font-bold">PDF, Problem Sets, Study Guides (Max 50MB)</p>
         </div>
      </div>

      <div className="bg-sidebar text-white p-8 rounded-xl relative overflow-hidden flex flex-col justify-between shadow-lg">
         <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
         <Database size={32} className="mb-6 opacity-40" />
         <div>
            <h3 className="text-lg font-black mb-3 uppercase tracking-tighter">AI Resource Engineering</h3>
            <p className="text-white/70 text-xs mb-6 leading-relaxed font-medium">
                업로드된 자료를 분석하여 문제를 생성하거나 개념을 심층적으로 해설할 수 있습니다.
            </p>
            <div className="flex flex-wrap gap-2">
                {["Generate Problems", "Create Concept Guide", "Similar Items"].map(t => (
                <button key={t} className="bg-white/10 hover:bg-white hover:text-sidebar text-[9px] font-black px-3 py-1.5 rounded border border-white/20 transition-all uppercase tracking-widest">{t}</button>
                ))}
            </div>
         </div>
      </div>
    </div>
  </div>
);

// --- Role Selection Component ---

const RoleSelection = ({ onSelect }: { onSelect: (role: 'student' | 'teacher') => void }) => {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<'student' | 'teacher'>('student');
  const [grade, setGrade] = useState('');
  const [classNum, setClassNum] = useState('');
  const [number, setNumber] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const handleSelect = (role: 'student' | 'teacher') => {
    localStorage.setItem('MATH_TUTOR_ROLE', role);
    onSelect(role);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    const TEST_ACCOUNTS: Record<string, { id: string, role: 'student' | 'teacher', name: string }> = {
      'student1@test.com': { id: '00000000-0000-0000-0000-000000002001', role: 'student', name: '김학생' },
      'student2@test.com': { id: '00000000-0000-0000-0000-000000002002', role: 'student', name: '이학생' },
      'teacher1@test.com': { id: '00000000-0000-0000-0000-000000001001', role: 'teacher', name: '박교사' },
      'teacher2@test.com': { id: '00000000-0000-0000-0000-000000001002', role: 'teacher', name: '최교사' },
    };

    if (TEST_ACCOUNTS[email] && password === '1234') {
      const acc = TEST_ACCOUNTS[email];
      (window as any)._handleTestAccountLogin(email, acc.role, acc.name, acc.id);
      setFormLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert(error.message);
    }
    setFormLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== passwordConfirm) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }
    setFormLoading(true);
    
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: { name, role: selectedRole }
      }
    });

    if (error) {
      alert(error.message);
      setFormLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from('users').insert({
        id: data.user.id,
        email,
        name,
        role: selectedRole,
        status: 'pending',
        grade: selectedRole === 'student' ? grade : '',
        class: selectedRole === 'student' ? classNum : '',
        number: selectedRole === 'student' ? number : '',
      });

      if (profileError) {
        alert(profileError.message);
      } else {
        alert('가입 신청이 완료되었습니다. 관리자 승인 후 이용 가능합니다.');
        setTab('login');
      }
    }
    setFormLoading(false);
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4 bg-gradient-to-br from-paper to-highlight/30">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[40px] border border-highlight shadow-2xl overflow-hidden"
      >
        <div className="p-8 md:p-10 space-y-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-accent/10 rounded-3xl flex items-center justify-center mx-auto text-accent shadow-inner border border-accent/20">
              <Bot size={32} />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-black text-ink uppercase tracking-tight">수학 튜터링</h1>
              <p className="text-[10px] text-secondary-text font-extrabold uppercase tracking-[0.2em] opacity-60">Authentication System</p>
            </div>
          </div>

          <div className="flex bg-paper p-1 rounded-2xl border border-highlight">
            <button 
              onClick={() => { setTab('login'); setPasswordConfirm(''); }}
              className={cn(
                "flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                tab === 'login' ? "bg-white text-accent shadow-sm border border-highlight" : "text-gray-400 hover:text-ink"
              )}
            >
              로그인
            </button>
            <button 
              onClick={() => setTab('signup')}
              className={cn(
                "flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
                tab === 'signup' ? "bg-white text-accent shadow-sm border border-highlight" : "text-gray-400 hover:text-ink"
              )}
            >
              회원가입
            </button>
          </div>

          <form onSubmit={tab === 'login' ? handleLogin : handleSignup} className="space-y-4">
            {tab === 'signup' && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-secondary-text uppercase tracking-widest ml-2">이름</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-5 py-4 bg-paper border border-highlight rounded-2xl text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                  placeholder="홍길동"
                  required
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-secondary-text uppercase tracking-widest ml-2">이메일</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-4 bg-paper border border-highlight rounded-2xl text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                placeholder="example@email.com"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-secondary-text uppercase tracking-widest ml-2">비밀번호</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 bg-paper border border-highlight rounded-2xl text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {tab === 'signup' && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-secondary-text uppercase tracking-widest ml-2">비밀번호 확인</label>
                <input 
                  type="password" 
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className="w-full px-5 py-4 bg-paper border border-highlight rounded-2xl text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                  placeholder="비밀번호 확인"
                  required
                />
              </div>
            )}

            {tab === 'signup' && (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-secondary-text uppercase tracking-widest ml-2">역할 선택</label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-paper rounded-2xl border border-highlight">
                    <button 
                      type="button"
                      onClick={() => setSelectedRole('student')}
                      className={cn(
                        "py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                        selectedRole === 'student' ? "bg-white text-accent shadow-sm border border-highlight" : "text-gray-400"
                      )}
                    >
                      학생
                    </button>
                    <button 
                      type="button"
                      onClick={() => setSelectedRole('teacher')}
                      className={cn(
                        "py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                        selectedRole === 'teacher' ? "bg-sidebar text-white shadow-sm" : "text-gray-400"
                      )}
                    >
                      교사
                    </button>
                  </div>
                </div>

                {selectedRole === 'student' && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-secondary-text uppercase tracking-widest ml-2">학년</label>
                      <input 
                        type="text" 
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                        className="w-full px-4 py-4 bg-paper border border-highlight rounded-2xl text-sm font-semibold text-ink text-center outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                        placeholder="1"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-secondary-text uppercase tracking-widest ml-2">반</label>
                      <input 
                        type="text" 
                        value={classNum}
                        onChange={(e) => setClassNum(e.target.value)}
                        className="w-full px-4 py-4 bg-paper border border-highlight rounded-2xl text-sm font-semibold text-ink text-center outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                        placeholder="1"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-secondary-text uppercase tracking-widest ml-2">번호</label>
                      <input 
                        type="text" 
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        className="w-full px-4 py-4 bg-paper border border-highlight rounded-2xl text-sm font-semibold text-ink text-center outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                        placeholder="01"
                        required
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <button 
              type="submit"
              disabled={formLoading}
              className="w-full py-5 bg-ink text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-accent transition-all shadow-xl shadow-ink/10 flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {formLoading ? <RefreshCcw className="animate-spin" size={18} /> : (tab === 'login' ? '로그인' : '회원가입')}
              <ChevronRight className="group-hover:translate-x-1 transition-transform" size={18} />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

const TeacherView = ({ session, profile, handleLogout }: { session: any, profile: UserProfile | null, handleLogout: () => Promise<void> }) => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [enrollRequests, setEnrollRequests] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEnrollRequests(data || []);
    } catch (err) {
      console.error("Error fetching requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id: string, approve: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: approve ? 'approved' : 'rejected' })
        .eq('id', id);

      if (error) throw error;
      await fetchRequests();
    } catch (err) {
      console.error("Error updating status:", err);
      alert("Status update failed.");
    }
  };

  const pendingCount = enrollRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="flex h-screen md:h-[calc(100vh-2rem)] md:rounded-3xl overflow-hidden border border-highlight shadow-sm relative">
       {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-sidebar/50 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 w-64 flex flex-col bg-sidebar text-white py-8 flex-shrink-0 z-50 transform transition-transform duration-300 md:relative md:translate-x-0 md:z-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="px-6 mb-10 flex justify-between items-center">
          <h1 className="text-xl font-black tracking-tighter text-gray-100 uppercase">Math Tutor Pro</h1>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-white/60 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <nav className="flex flex-col">
          <SidebarItem icon={LayoutDashboard} label="대시보드" to="/teacher" active={location.pathname === "/teacher"} onClick={() => setIsSidebarOpen(false)} id="teacher-dashboard-link" />
          <SidebarItem icon={BarChart3} label="학생 분석" to="/teacher/analysis" active={location.pathname.startsWith("/teacher/analysis")} onClick={() => setIsSidebarOpen(false)} id="teacher-analysis-link" />
          <SidebarItem icon={MessageSquare} label="교사 채팅" to="/teacher/chat" active={location.pathname === "/teacher/chat"} onClick={() => setIsSidebarOpen(false)} />
          <SidebarItem icon={Settings} label="설정" to="/teacher/settings" active={location.pathname === "/teacher/settings"} onClick={() => setIsSidebarOpen(false)} />
        </nav>
        <div className="mt-auto px-6 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              {session?.user?.user_metadata?.avatar_url ? (
                <img src={session.user.user_metadata.avatar_url} className="w-full h-full rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <CircleUser size={18}/>
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xs">{profile?.name || session?.user?.email?.split('@')[0]} 선생님</span>
              <span className="text-[10px] text-white/50">{profile?.role === 'teacher' ? '교사' : '사용자'}</span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 text-xs text-white/50 hover:text-white transition-colors"
          >
            <LogOut size={12} /> 로그아웃
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-hidden bg-paper flex flex-col w-full">
        <header className="h-16 px-4 md:px-8 border-b border-highlight bg-white flex items-center justify-between shrink-0 shadow-sm">
           <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 md:hidden text-secondary-text hover:text-accent transition-colors"
              >
                <Menu size={20} />
              </button>
              <select className="bg-paper border border-highlight rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:ring-1 focus:ring-accent">
                <option>3학년 1반 (심화수학)</option>
                <option>3학년 2반 (미적분)</option>
              </select>
           </div>
           <div className="flex items-center gap-4">
              <span className="hidden sm:inline text-xs font-bold text-secondary-text">현재 학기: 2024년 1학기</span>
           </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <Routes>
            <Route index element={<TeacherDashboard />} />
            <Route path="approvals" element={
              <div className="space-y-8">
                <div>
                   <h2 className="text-2xl font-black text-ink uppercase tracking-tighter mb-1">Enrollment Approvals</h2>
                   <p className="text-xs text-secondary-text font-bold uppercase tracking-widest">신규 학생 가입 요청 관리</p>
                </div>
                <div className="bg-white rounded-xl border border-highlight overflow-hidden shadow-sm">
                   <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                         <thead className="bg-paper border-b border-highlight">
                            <tr>
                               <th className="px-6 py-4 text-[10px] font-black text-accent uppercase tracking-widest">Date</th>
                               <th className="px-6 py-4 text-[10px] font-black text-accent uppercase tracking-widest">Student Info</th>
                               <th className="px-6 py-4 text-[10px] font-black text-accent uppercase tracking-widest">Status</th>
                               <th className="px-6 py-4 text-[10px] font-black text-accent uppercase tracking-widest text-right">Actions</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-highlight">
                            {enrollRequests.length === 0 ? (
                               <tr>
                                 <td colSpan={4} className="px-6 py-20 text-center text-gray-400 font-bold text-sm">대기 중인 요청이 없습니다.</td>
                               </tr>
                            ) : enrollRequests.map(req => (
                               <tr key={req.id} className="hover:bg-paper/50 transition-colors">
                                  <td className="px-6 py-4 text-[11px] font-bold text-gray-400">{req.created_at ? formatDate(new Date(req.created_at)) : '-'}</td>
                                  <td className="px-6 py-4">
                                     <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-paper flex items-center justify-center text-accent text-xs font-black border border-highlight">
                                          {req.name[0]}
                                        </div>
                                        <div>
                                           <div className="text-sm font-black text-ink">{req.name}</div>
                                           <div className="text-[10px] text-secondary-text font-bold">{req.grade}학년 {req.class}반 {req.number}번</div>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="px-6 py-4">
                                     <span className={cn(
                                       "text-[9px] font-black px-2 py-0.5 rounded uppercase",
                                       req.status === 'pending' ? "bg-paper text-accent" :
                                       req.status === 'approved' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                                     )}>
                                       {req.status}
                                     </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                     {req.status === 'pending' ? (
                                       <div className="flex justify-end gap-2 text-[10px]">
                                          <button 
                                            onClick={() => handleApprove(req.id, false)}
                                            className="px-2 py-1 md:px-3 md:py-1.5 border border-highlight text-red-500 rounded-lg font-black hover:bg-red-50 transition-all uppercase tracking-widest"
                                          >REFUSE</button>
                                          <button 
                                            onClick={() => handleApprove(req.id, true)}
                                            className="px-2 py-1 md:px-3 md:py-1.5 bg-accent text-white rounded-lg font-black hover:bg-sidebar transition-all uppercase tracking-widest"
                                          >APPROVE</button>
                                       </div>
                                     ) : (
                                       <span className="text-[10px] text-gray-300 font-bold italic">PROCESSED</span>
                                     )}
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>
              </div>
            } />
            <Route path="analysis" element={<TeacherAnalysis />} />
            <Route path="analysis/:studentId" element={<TeacherAnalysis />} />
            <Route path="chat" element={<div id="teacher-chat-area" className="h-full"><TeacherChat profile={profile} session={session} /></div>} />
            <Route path="class" element={<div className="p-8 font-black text-2xl text-ink uppercase">Class Management Coming Soon...</div>} />
            <Route path="curriculum" element={<TeacherCurriculum />} />
            <Route path="resources" element={<TeacherResource />} />
            <Route path="settings" element={<div className="p-8 font-black text-2xl text-ink">교사 설정 준비 중...</div>} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [theme, setTheme] = useState("light");
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [currentRole, setCurrentRole] = useState<'student' | 'teacher' | null>(
    (localStorage.getItem('MATH_TUTOR_ROLE') as any) || null
  );
  
  const [showTutorial, setShowTutorial] = useState(false);

  const fetchProfile = async (session: any) => {
    if (!session) return;
    setLoading(true);
    const uid = session.user.id;

    // 테스트 세션이면 localStorage profile을 우선 사용
    const savedProfile = localStorage.getItem('TEST_USER_PROFILE');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        if (parsed.id === uid) {
          setProfile(parsed);
          setShowTutorial(true);
          setLoading(false);
          return;
        }
      } catch {}
    }

    try {
      let { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', uid)
        .single();

      if (error && error.code === 'PGRST116') {
        const metadataRole = session.user.user_metadata?.role;
        const hintedRole = metadataRole || localStorage.getItem('MATH_TUTOR_ROLE') || localStorage.getItem('role') || 'student';
        const { data: newData } = await supabase
          .from('users')
          .insert({
            id: uid,
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
            role: hintedRole,
            status: 'approved',
            grade: hintedRole === 'student' ? '3' : '',
            class: hintedRole === 'student' ? '1' : '',
            number: hintedRole === 'student' ? '99' : ''
          })
          .select()
          .single();
        data = newData;
      }

      if (data) {
        setProfile(data);
        setCurrentRole(data.role);
        localStorage.setItem('MATH_TUTOR_ROLE', data.role);
      } else {
        throw new Error('no data');
      }
      setShowTutorial(true);
    } catch {
      // DB 호출 실패 시에만 fallback 적용
      const metadataRole = session.user.user_metadata?.role;
      const hintedRole = metadataRole || localStorage.getItem('MATH_TUTOR_ROLE') || localStorage.getItem('role') || 'student';
      const fallbackProfile: UserProfile = {
        id: uid,
        email: session.user.email,
        name: hintedRole === 'teacher' ? '테스트 교사' : '테스트 학생',
        role: hintedRole as 'student' | 'teacher',
        status: 'approved',
        grade: hintedRole === 'student' ? '3' : '',
        class: hintedRole === 'student' ? '1' : '',
        number: hintedRole === 'student' ? '99' : '',
        created_at: new Date().toISOString(),
      };
      setProfile(fallbackProfile);
      setCurrentRole(fallbackProfile.role);
      localStorage.setItem('MATH_TUTOR_ROLE', fallbackProfile.role);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      // 1. Check for test session first
      const savedTestSession = localStorage.getItem('TEST_USER_SESSION');
      if (savedTestSession) {
        const parsed = JSON.parse(savedTestSession);
        setSession(parsed);
        await fetchProfile(parsed);
        return;
      }

      // 2. Fallback to Supabase
      const { data: { session: sbSession } } = await supabase.auth.getSession();
      if (sbSession) {
        setSession(sbSession);
        await fetchProfile(sbSession);
      } else {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!localStorage.getItem('TEST_USER_SESSION')) {
        setSession(session);
        if (session) fetchProfile(session);
        else {
          setProfile(null);
          setLoading(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Seed test account profiles for visibility
    const seedTestProfiles = async () => {
      const TEST_PROFILES: UserProfile[] = [
        { id: '00000000-0000-0000-0000-000000002001', email: 'student1@test.com', name: '김학생', role: 'student', status: 'approved', grade: '3', class: '1', number: '1' },
        { id: '00000000-0000-0000-0000-000000002002', email: 'student2@test.com', name: '이학생', role: 'student', status: 'approved', grade: '3', class: '1', number: '2' },
        { id: '00000000-0000-0000-0000-000000001001', email: 'teacher1@test.com', name: '박교사', role: 'teacher', status: 'approved', grade: '', class: '', number: '' },
        { id: '00000000-0000-0000-0000-000000001002', email: 'teacher2@test.com', name: '최교사', role: 'teacher', status: 'approved', grade: '', class: '', number: '' },
      ];
      await supabase.from('users').upsert(TEST_PROFILES);
    };
    seedTestProfiles();
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  useEffect(() => {
    document.body.className = theme === "light" ? "bg-paper text-ink" : "bg-[#121212] text-gray-100";
  }, [theme]);

  const handleRoleStart = async (role: 'student' | 'teacher') => {
    setLoading(true);
    localStorage.setItem('MATH_TUTOR_ROLE', role);
    localStorage.setItem('role', role);
    const testId = crypto.randomUUID();
    const mockSession = {
      user: {
        id: testId,
        email: `test_${role}_${Date.now()}@example.com`,
        user_metadata: { full_name: role === 'student' ? '테스트 학생' : '테스트 교사' }
      }
    };
    const mockProfile: UserProfile = {
      id: testId,
      email: mockSession.user.email,
      name: role === 'student' ? '테스트 학생' : '테스트 교사',
      role: role,
      status: 'approved',
      grade: role === 'student' ? '3' : '',
      class: role === 'student' ? '1' : '',
      number: role === 'student' ? '99' : '',
      created_at: new Date().toISOString(),
    };

    localStorage.setItem('TEST_USER_SESSION', JSON.stringify(mockSession));
    localStorage.setItem('TEST_USER_PROFILE', JSON.stringify(mockProfile));
    setSession(mockSession);
    setProfile(mockProfile);
    setLoading(false);
    navigate(role === 'teacher' ? '/teacher' : '/student', { replace: true });

    // Supabase 저장은 백그라운드에서 시도만 함 (실패해도 무시)
    supabase.from('users').insert({
      id: testId,
      email: mockSession.user.email,
      name: mockProfile.name,
      role: role,
      status: 'approved',
      grade: mockProfile.grade,
      class: mockProfile.class,
      number: mockProfile.number,
    }).then(() => {}, (e) => console.warn('Background user insert failed:', e));
  };

  const handleTestAccountLogin = async (email: string, role: 'student' | 'teacher', name: string, id: string) => {
    setLoading(true);
    localStorage.setItem('MATH_TUTOR_ROLE', role);
    const mockSession = {
      user: {
        id: id,
        email: email,
        user_metadata: { full_name: name }
      }
    };
    const mockProfile: UserProfile = {
      id: id,
      email: email,
      name: name,
      role: role,
      status: 'approved',
      grade: role === 'student' ? '3' : '',
      class: role === 'student' ? '1' : '',
      number: role === 'student' ? (email.includes('1') ? '1' : '2') : '',
      created_at: new Date().toISOString(),
    };

    localStorage.setItem('TEST_USER_SESSION', JSON.stringify(mockSession));
    localStorage.setItem('TEST_USER_PROFILE', JSON.stringify(mockProfile));
    setSession(mockSession);
    setProfile(mockProfile);
    setCurrentRole(role);
    
    // Ensure profile exists in DB
    await supabase.from('users').upsert([mockProfile]);
    
    // Seed initial session if none exists
    if (role === 'student') {
      const { data: sessions } = await supabase.from('chat_sessions').select('id').eq('user_id', id).limit(1);
      if (!sessions || sessions.length === 0) {
        const { data: newSession } = await supabase.from('chat_sessions').insert({
          id: crypto.randomUUID(),
          user_id: id,
          title: '지난 수학 학습 세션 (다항식의 연산)',
        }).select().single();
        
        if (newSession) {
          await supabase.from('chat_messages').insert([
            { session_id: newSession.id, role: 'user', content: '다항식의 연산이 너무 어려워요.' },
            { session_id: newSession.id, role: 'assistant', content: '걱정 마세요! 다항식의 덧셈과 뺄셈은 동류항끼리 모으는 것이 핵심입니다. 어떤 부분이 특히 어려우신가요?' }
          ]);
        }
      }
    }

    setLoading(false);
    navigate(role === 'teacher' ? '/teacher' : '/student', { replace: true });
  };

  // Expose for RoleSelection component
  (window as any)._handleRoleStart = handleRoleStart;
  (window as any)._handleTestAccountLogin = handleTestAccountLogin;

  const handleLogout = async () => {
    localStorage.removeItem('TEST_USER_SESSION');
    localStorage.removeItem('TEST_USER_PROFILE');
    localStorage.removeItem('role');
    localStorage.removeItem('MATH_TUTOR_ROLE');
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    window.location.href = '/';
  };

  const handleTestLogin = async () => {
    setLoading(true);
    const testId = crypto.randomUUID();
    const mockSession = {
      user: {
        id: testId,
        email: 'test@example.com',
        user_metadata: { full_name: '테스트 학생' }
      }
    };

    try {
      const { error } = await supabase
        .from('users')
        .insert({
          id: testId,
          email: 'test@example.com',
          name: '테스트 학생',
          role: 'student',
          status: 'approved',
          grade: '3',
          class: '1',
          number: '99'
        });

      if (error) throw error;
      
      localStorage.setItem('TEST_USER_SESSION', JSON.stringify(mockSession));
      setSession(mockSession);
      fetchProfile(mockSession);
    } catch (err) {
      console.error("Test login error:", err);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
           <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
           <p className="text-[10px] font-black text-accent uppercase tracking-widest">Initializing...</p>
        </div>
      </div>
    );
  }

  const displayRole = profile?.role || currentRole || localStorage.getItem('MATH_TUTOR_ROLE') || null;
  const isApproved = profile?.status === 'approved' || (!!localStorage.getItem('MATH_TUTOR_ROLE'));

  console.log('Current application state:', { sessionExists: !!session, role: displayRole, profileRole: profile?.role });

  if (!session) {
    return (
      <div className={cn("min-h-screen transition-colors duration-300")}>
        <RoleSelection onSelect={handleRoleStart} />
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen transition-colors duration-300")}>
      {showTutorial && displayRole && isApproved && (
        <OnboardingTutorial 
          role={displayRole as any} 
          onComplete={() => setShowTutorial(false)} 
        />
      )}
      <div className="fixed top-4 right-10 z-[100] flex gap-2 items-center">
        <div className="bg-amber-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest shadow-lg animate-pulse uppercase border border-amber-400/50">
          Test Mode Active
        </div>
        <button 
          onClick={handleLogout}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 text-xs font-black shadow-2xl hover:bg-red-50 hover:text-red-500 transition-all flex items-center gap-2"
        >
          <LogOut size={14} /> 로그아웃
        </button>
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md p-1 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl">
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        </div>
      </div>

      <Routes>
        <Route path="/student/*" element={
          <StudentView session={session} profile={profile} fetchProfile={fetchProfile} handleTestLogin={async () => {}} handleLogout={handleLogout} />
        } />
        <Route path="/teacher/*" element={
          <TeacherView session={session} profile={profile} handleLogout={handleLogout} />
        } />
        <Route path="/" element={
          displayRole === 'teacher' ? <Navigate to="/teacher" replace /> : <Navigate to="/student" replace />
        } />
      </Routes>
    </div>
  );
}
const RefreshCcwIcon = ({ size, className }: { size?: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size ?? 24} height={size ?? 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
);
