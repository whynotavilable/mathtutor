import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard, BarChart3, BookOpen, Database, MessageSquare,
  ShieldCheck, Settings, X, Menu, LogOut, CircleUser
} from "lucide-react";
import { cn } from "../../lib/utils";
import { formatDate } from "../../lib/utils";
import { supabase } from "../../supabase";
import { UserProfile } from "../../lib/ai";
import { isAdminUser, getClassKey, getClassLabel, isTeacherVisibleStudent } from "../../lib/userUtils";
import SidebarItem from "../common/SidebarItem";
import TeacherDashboard from "./TeacherDashboard";
import TeacherAnalysis from "./TeacherAnalysis";
import TeacherChat from "./TeacherChat";
import TeacherCurriculum from "./TeacherCurriculum";
import TeacherResource from "./TeacherResource";
import TeacherSettingsPanel from "./TeacherSettingsPanel";
import SecureTeacherAnalysis from "../auth/SecureTeacherAnalysis";

const TeacherView = ({ session, profile, handleLogout }: { session: any, profile: UserProfile | null, handleLogout: () => Promise<void> }) => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [enrollRequests, setEnrollRequests] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = isAdminUser(profile);
  const [teacherStudents, setTeacherStudents] = useState<UserProfile[]>([]);
  const [selectedClassKey, setSelectedClassKey] = useState("");

  useEffect(() => {
    const fetchTeacherStudents = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("role", "student")
        .eq("status", "approved")
        .order("grade", { ascending: true })
        .order("class", { ascending: true })
        .order("number", { ascending: true });
      if (error) {
        console.error("Failed to fetch class options:", error);
        return;
      }
      const nextStudents = ((data || []) as UserProfile[]).filter(isTeacherVisibleStudent);
      setTeacherStudents(nextStudents);
      if (!selectedClassKey && nextStudents.length) {
        const firstKey = getClassKey(nextStudents[0]);
        if (firstKey) setSelectedClassKey(firstKey);
      }
    };
    fetchTeacherStudents();
  }, []);

  const classOptions = Array.from(new Set(teacherStudents.map((student) => getClassKey(student)).filter(Boolean))).map((key) => {
    const classStudent = teacherStudents.find((student) => getClassKey(student) === key)!;
    return { key, label: getClassLabel(classStudent) };
  });

  const fetchRequests = async () => {
    if (!isAdmin) {
      setEnrollRequests([]);
      setLoading(false);
      return;
    }
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
      alert("상태 업데이트에 실패했습니다.");
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
          <h1 className="text-xl font-black tracking-tighter text-gray-100 uppercase">수학 AI 튜터</h1>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-white/60 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <nav className="flex flex-col">
          <SidebarItem icon={LayoutDashboard} label="대시보드" to="/teacher" active={location.pathname === "/teacher"} onClick={() => setIsSidebarOpen(false)} id="teacher-dashboard-link" />
          <SidebarItem icon={BarChart3} label="학생 분석" to="/teacher/analysis" active={location.pathname.startsWith("/teacher/analysis")} onClick={() => setIsSidebarOpen(false)} id="teacher-analysis-link" />
          <SidebarItem icon={BookOpen} label="교육과정" to="/teacher/curriculum" active={location.pathname === "/teacher/curriculum"} onClick={() => setIsSidebarOpen(false)} />
          <SidebarItem icon={Database} label="교과자료" to="/teacher/resources" active={location.pathname === "/teacher/resources"} onClick={() => setIsSidebarOpen(false)} />
          <SidebarItem icon={MessageSquare} label="교사 채팅" to="/teacher/chat" active={location.pathname === "/teacher/chat"} onClick={() => setIsSidebarOpen(false)} />
          {isAdmin && <SidebarItem icon={ShieldCheck} label="승인 관리" to="/teacher/approvals" active={location.pathname === "/teacher/approvals"} onClick={() => setIsSidebarOpen(false)} />}
          <SidebarItem icon={Settings} label="설정" to="/teacher/settings" active={location.pathname === "/teacher/settings"} onClick={() => setIsSidebarOpen(false)} />
        </nav>
        <div className="mt-auto px-6 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              {session?.user?.user_metadata?.avatar_url ? (
                <img src={session.user.user_metadata.avatar_url} className="w-full h-full rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <CircleUser size={18} />
              )}
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xs">{profile?.name || session?.user?.email?.split('@')[0]} 선생님</span>
              <span className="text-xs text-white/50">{profile?.role === 'teacher' ? '교사' : '사용자'}</span>
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
            <select value={selectedClassKey} onChange={(e) => setSelectedClassKey(e.target.value)} className="bg-paper border border-highlight rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:ring-1 focus:ring-accent">
              <option value="">전체 학급</option>
              {classOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-xs font-bold text-secondary-text">{(() => { const now = new Date(); const year = now.getFullYear(); const semester = now.getMonth() + 1 >= 8 ? 2 : 1; return `현재 학기: ${year}년 ${semester}학기`; })()}</span>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <Routes>
            <Route index element={<TeacherDashboard profile={profile} selectedClassKey={selectedClassKey} />} />
            <Route path="approvals" element={isAdmin ? (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-black text-ink uppercase tracking-tighter mb-1">가입 승인 관리</h2>
                  <p className="text-xs text-secondary-text font-bold uppercase tracking-widest">신규 학생 가입 요청 관리</p>
                </div>
                <div className="bg-white rounded-xl border border-highlight overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-paper border-b border-highlight">
                        <tr>
                          <th className="px-6 py-4 text-xs font-black text-accent uppercase tracking-widest">신청일</th>
                          <th className="px-6 py-4 text-xs font-black text-accent uppercase tracking-widest">회원 정보</th>
                          <th className="px-6 py-4 text-xs font-black text-accent uppercase tracking-widest">상태</th>
                          <th className="px-6 py-4 text-xs font-black text-accent uppercase tracking-widest text-right">처리</th>
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
                                  <div className="text-xs text-secondary-text font-bold">{req.grade}학년 {req.class}반 {req.number}번</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "text-[9px] font-black px-2 py-0.5 rounded uppercase",
                                req.status === 'pending' ? "bg-paper text-accent" :
                                req.status === 'approved' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                              )}>
                                {req.status === 'pending' ? '승인 대기' : req.status === 'approved' ? '승인됨' : req.status === 'rejected' ? '반려됨' : req.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              {req.status === 'pending' ? (
                                <div className="flex justify-end gap-2 text-xs">
                                  <button
                                    onClick={() => handleApprove(req.id, false)}
                                    className="px-2 py-1 md:px-3 md:py-1.5 border border-highlight text-red-500 rounded-lg font-black hover:bg-red-50 transition-all uppercase tracking-widest"
                                  >반려</button>
                                  <button
                                    onClick={() => handleApprove(req.id, true)}
                                    className="px-2 py-1 md:px-3 md:py-1.5 bg-accent text-white rounded-lg font-black hover:bg-sidebar transition-all uppercase tracking-widest"
                                  >승인</button>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-300 font-bold italic">처리 완료</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : <Navigate to="/teacher" replace />} />
            <Route path="analysis" element={<SecureTeacherAnalysis profile={profile} selectedClassKey={selectedClassKey} />} />
            <Route path="analysis/:studentId" element={<SecureTeacherAnalysis profile={profile} selectedClassKey={selectedClassKey} />} />
            <Route path="chat" element={<div id="teacher-chat-area" className="h-full"><TeacherChat profile={profile} session={session} selectedClassKey={selectedClassKey} /></div>} />
            <Route path="class" element={<div className="p-8 font-black text-2xl text-ink uppercase">학급 관리 기능 준비 중...</div>} />
            <Route path="curriculum" element={<TeacherCurriculum selectedClassKey={selectedClassKey} />} />
            <Route path="resources" element={<TeacherResource selectedClassKey={selectedClassKey} />} />
            <Route path="settings" element={<TeacherSettingsPanel profile={profile} selectedClassKey={selectedClassKey} pendingCount={pendingCount} />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default TeacherView;
