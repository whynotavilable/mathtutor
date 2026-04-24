import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard, History, Settings, X, Menu, LogOut, CircleUser,
  ClipboardCheck, AlertCircle, RefreshCcw, PanelLeftClose, PanelLeftOpen
} from "lucide-react";
import { cn } from "../../lib/utils";
import { supabase } from "../../supabase";
import { StudentInstructions } from "../../types";
import { UserProfile } from "../../lib/ai";
import { TeacherInstructionContext, parseInstructionState, DEFAULT_STUDENT_INSTRUCTIONS } from "../../lib/instructions";
import { DUMMY_STUDENT } from "../../constants";
import SidebarItem from "../common/SidebarItem";
import StudentChat from "./StudentChat";
import StudentHistory from "./StudentHistory";
import StudentSettings from "./StudentSettings";

const StudentView = ({
  session,
  profile,
  fetchProfile,
  handleTestLogin,
  handleLogout,
}: {
  session: any;
  profile: UserProfile | null;
  fetchProfile: (session: any) => Promise<void>;
  handleTestLogin: () => Promise<void>;
  handleLogout: () => Promise<void>;
}) => {
  const location = useLocation();
  const [instructions, setInstructions] = useState<StudentInstructions>({ ...DEFAULT_STUDENT_INSTRUCTIONS });
  const [teacherContext, setTeacherContext] = useState<TeacherInstructionContext>({});

  useEffect(() => {
    const parsed = parseInstructionState(profile?.instructions);
    setInstructions(parsed.studentSettings);
    setTeacherContext(parsed.teacherContext);
  }, [profile]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    grade: profile?.grade || '',
    class: profile?.class || '',
    number: profile?.number || ''
  });

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
      alert("가입 신청에 실패했습니다. 다시 시도해 주세요.");
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
            <h1 className="text-3xl font-black text-ink uppercase tracking-tighter">학급 정보 입력</h1>
            <p className="text-xs text-secondary-text font-bold mt-2 uppercase tracking-widest">추가 정보를 입력하여 가입을 신청하세요.</p>
          </div>
          <form onSubmit={handleSubmitEnrollment} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-accent uppercase tracking-widest">이름</label>
                <input
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="홍길동"
                  className="w-full p-4 bg-paper rounded-xl border border-highlight text-sm font-bold focus:ring-1 focus:ring-accent outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-accent uppercase tracking-widest">학년</label>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-accent uppercase tracking-widest">반</label>
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
                <label className="text-xs font-black text-accent uppercase tracking-widest">번호</label>
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
            >정보 저장하기</button>
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
            <h1 className="text-2xl font-black text-ink uppercase tracking-tighter">승인 대기 중</h1>
            <p className="text-[11px] text-secondary-text font-bold mt-3 leading-relaxed">
              신청이 접수되었습니다.<br />
              선생님이 확인하시면 바로 시작할 수 있어요.<br />
              승인 후 아래 새로고침 버튼을 눌러주세요.
            </p>
          </div>
          <div className="pt-4 flex flex-col gap-2">
            <button
              onClick={() => fetchProfile(session)}
              className="flex items-center justify-center gap-2 mx-auto px-4 py-2 bg-paper border border-highlight rounded-xl text-xs text-ink font-black uppercase tracking-widest hover:bg-white transition-all"
            >
              <RefreshCcw size={14} className="text-accent" />
              새로고침
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
            <h1 className="text-2xl font-black text-ink uppercase tracking-tighter">학급 정보를 확인해주세요</h1>
            <p className="text-[11px] text-secondary-text font-bold mt-3 leading-relaxed">
              입력하신 학급 정보가 명단과 맞지 않아요.<br />
              담당 선생님께 확인 후 다시 신청해 주세요.
            </p>
          </div>
          <button
            onClick={async () => {
              await supabase.from('users').delete().eq('id', session.user.id);
              fetchProfile(session);
            }}
            className="w-full py-4 bg-red-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all shadow-xl shadow-red-500/10"
          >다시 신청하기</button>
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
        "fixed inset-y-0 left-0 flex flex-col bg-sidebar text-white py-8 flex-shrink-0 z-50 transform transition-all duration-300 overflow-hidden md:relative md:z-0",
        "w-64",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full",
        isSidebarCollapsed ? "md:w-0 md:-translate-x-full md:py-0 md:border-0" : "md:w-64 md:translate-x-0"
      )}>
        <div className={cn("mb-10 flex items-center", isSidebarCollapsed ? "justify-center px-3" : "justify-between px-6")}>
          <h1 className="text-xl font-black tracking-tighter text-gray-100 uppercase">수학 AI 튜터</h1>
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
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white"><CircleUser size={18} /></div>
            <div className="flex flex-col">
              <span className="font-bold text-xs">{profile?.name || DUMMY_STUDENT.name}</span>
              <span className="text-xs text-white/50">{profile ? `${profile.grade}학년 ${profile.class}반 ${profile.number}번` : DUMMY_STUDENT.class}</span>
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
            <button
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              className="hidden md:flex p-2 text-secondary-text hover:text-accent transition-colors"
              title={isSidebarCollapsed ? "왼쪽 패널 보이기" : "왼쪽 패널 숨기기"}
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
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
            <Route index element={<StudentChat instructions={instructions} teacherContext={teacherContext} profile={profile} session={session} />} />
            <Route path="history" element={<StudentHistory profile={profile} />} />
            <Route path="settings" element={<StudentSettings instructions={instructions} setInstructions={setInstructions} profile={profile} />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default StudentView;
