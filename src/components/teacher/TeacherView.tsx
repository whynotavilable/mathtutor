import { useState, useEffect, useRef } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard, BarChart3, BookOpen, Database, MessageSquare,
  ShieldCheck, Settings, X, Menu, LogOut, CircleUser, PanelLeftClose, PanelLeftOpen, Trash2
} from "lucide-react";
import { cn, formatDate } from "../../lib/utils";
import { supabase } from "../../supabase";
import { UserProfile } from "../../lib/ai";
import { isAdminUser, getClassKey, getClassLabel, isTeacherVisibleStudent } from "../../lib/userUtils";
import SidebarItem from "../common/SidebarItem";
import ThemeToggle from "../common/ThemeToggle";
import TeacherDashboard from "./TeacherDashboard";
import TeacherChat from "./TeacherChat";
import TeacherCurriculum from "./TeacherCurriculum";
import TeacherResource from "./TeacherResource";
import TeacherSettingsPanel from "./TeacherSettingsPanel";
import SecureTeacherAnalysis from "../auth/SecureTeacherAnalysis";

const TeacherView = ({ session, profile, handleLogout, theme, toggleTheme }: { session: any; profile: UserProfile | null; handleLogout: () => Promise<void>; theme: string; toggleTheme: () => void }) => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [enrollRequests, setEnrollRequests] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const isAdmin = isAdminUser(profile);
  const [teacherStudents, setTeacherStudents] = useState<UserProfile[]>([]);
  const [selectedClassKey, setSelectedClassKey] = useState("");
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
  const classInitializedRef = useRef(false);

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
    // 최초 1회만 첫 번째 학급으로 초기화 — ref를 먼저 설정해 동시 호출 경쟁 방지
    if (!classInitializedRef.current && nextStudents.length) {
      const firstKey = getClassKey(nextStudents[0]);
      if (firstKey) {
        classInitializedRef.current = true; // set before setState to prevent double-init on concurrent calls
        setSelectedClassKey(firstKey);
      }
    }
  };

  useEffect(() => {
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
      const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: false });
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
  }, [isAdmin]);

  const handleApprove = async (id: string, approve: boolean) => {
    try {
      const { error } = await supabase.from("users").update({ status: approve ? "approved" : "rejected" }).eq("id", id);
      if (error) throw error;
      await fetchRequests();
    } catch (err) {
      console.error("Error updating status:", err);
      alert("상태 업데이트에 실패했습니다.");
    }
  };

  const handleDeleteAccount = async (request: UserProfile) => {
    if (request.id === profile?.id) {
      alert("현재 로그인한 관리자 계정은 이 화면에서 삭제할 수 없습니다.");
      return;
    }

    const label = `${request.name || "이름 없음"} (${request.email || "이메일 없음"})`;
    if (!window.confirm(`${label} 계정을 삭제할까요?\n\n사용자 프로필과 연결된 대화/보고서 기록이 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.`)) return;

    setDeletingAccountId(request.id);
    try {
      if (!session?.access_token) {
        throw new Error("관리자 로그인 세션을 확인할 수 없습니다. 다시 로그인해 주세요.");
      }

      const response = await fetch("/api/admin-delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ accountId: request.id }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "계정 삭제 요청에 실패했습니다.");
      }

      await Promise.all([fetchRequests(), fetchTeacherStudents()]);
    } catch (err: any) {
      console.error("Error deleting account:", err);
      alert(err?.message || "계정 삭제에 실패했습니다.");
    } finally {
      setDeletingAccountId(null);
    }
  };

  const pendingCount = enrollRequests.filter((request) => request.status === "pending").length;

  return (
    <div className="flex h-screen md:h-[calc(100vh-2rem)] md:rounded-3xl overflow-hidden border border-highlight shadow-sm relative">
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

      <div
        className={cn(
          "fixed inset-y-0 left-0 flex flex-col bg-sidebar text-white py-8 flex-shrink-0 z-50 transform transition-all duration-300 overflow-hidden md:relative md:z-0",
          isSidebarCollapsed ? "w-20" : "w-64",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0",
        )}
      >
        <div className={cn("mb-10 flex items-center", isSidebarCollapsed ? "justify-center px-3" : "justify-between px-6")}>
          {!isSidebarCollapsed && <h1 className="text-xl font-black tracking-tighter text-gray-100 uppercase">{"수학 AI 튜터"}</h1>}
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-white/60 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <nav className="flex flex-col">
          <SidebarItem icon={LayoutDashboard} label="대시보드" to="/teacher" active={location.pathname === "/teacher"} onClick={() => setIsSidebarOpen(false)} id="teacher-dashboard-link" collapsed={isSidebarCollapsed} />
          <SidebarItem icon={BarChart3} label="학생 분석" to="/teacher/analysis" active={location.pathname.startsWith("/teacher/analysis")} onClick={() => setIsSidebarOpen(false)} id="teacher-analysis-link" collapsed={isSidebarCollapsed} />
          <SidebarItem icon={BookOpen} label="교육과정" to="/teacher/curriculum" active={location.pathname === "/teacher/curriculum"} onClick={() => setIsSidebarOpen(false)} collapsed={isSidebarCollapsed} badge="준비중" />
          <SidebarItem icon={Database} label="교과자료" to="/teacher/resources" active={location.pathname === "/teacher/resources"} onClick={() => setIsSidebarOpen(false)} collapsed={isSidebarCollapsed} />
          <SidebarItem icon={MessageSquare} label="교사 채팅" to="/teacher/chat" active={location.pathname === "/teacher/chat"} onClick={() => setIsSidebarOpen(false)} collapsed={isSidebarCollapsed} />
          {isAdmin && <SidebarItem icon={ShieldCheck} label="승인 관리" to="/teacher/approvals" active={location.pathname === "/teacher/approvals"} onClick={() => setIsSidebarOpen(false)} collapsed={isSidebarCollapsed} />}
          <SidebarItem icon={Settings} label="설정" to="/teacher/settings" active={location.pathname === "/teacher/settings"} onClick={() => setIsSidebarOpen(false)} collapsed={isSidebarCollapsed} />
        </nav>
        <div className={cn("mt-auto py-4 border-t border-white/10", isSidebarCollapsed ? "px-3" : "px-6")}>
          <div className={cn("flex items-center mb-4", isSidebarCollapsed ? "justify-center" : "gap-3")}>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              {session?.user?.user_metadata?.avatar_url ? (
                <img src={session.user.user_metadata.avatar_url} className="w-full h-full rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <CircleUser size={18} />
              )}
            </div>
            {!isSidebarCollapsed && <div className="flex flex-col">
              <span className="font-bold text-xs">{profile?.name || session?.user?.email?.split("@")[0]} 선생님</span>
              <span className="text-xs text-white/50">{profile?.role === "teacher" ? "교사" : "사용자"}</span>
            </div>}
          </div>
          <button
            onClick={handleLogout}
            title={isSidebarCollapsed ? "로그아웃" : undefined}
            className={cn(
              "w-full flex items-center text-xs text-white/50 hover:text-white transition-colors",
              isSidebarCollapsed ? "justify-center" : "gap-2"
            )}
          >
            <LogOut size={12} /> 로그아웃
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-hidden bg-paper flex flex-col w-full">
        <header className="h-16 px-4 md:px-8 border-b border-highlight bg-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 md:hidden text-secondary-text hover:text-accent transition-colors">
              <Menu size={20} />
            </button>
            <button
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              className="hidden md:flex p-2 text-secondary-text hover:text-accent transition-colors"
              title={isSidebarCollapsed ? "왼쪽 패널 보이기" : "왼쪽 패널 숨기기"}
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
            <select value={selectedClassKey} onChange={(e) => setSelectedClassKey(e.target.value)} className="bg-paper border border-highlight rounded-xl px-5 py-2.5 text-sm font-black outline-none focus:ring-1 focus:ring-accent min-w-36">
              <option value="">전체 학급</option>
              {classOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs font-bold text-secondary-text">
              {(() => {
                const now = new Date();
                const year = now.getFullYear();
                const semester = now.getMonth() + 1 >= 8 ? 2 : 1;
                return `현재 학기: ${year}년 ${semester}학기`;
              })()}
            </span>
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <Routes>
            <Route index element={<TeacherDashboard profile={profile} selectedClassKey={selectedClassKey} />} />
            <Route
              path="approvals"
              element={
                isAdmin ? (
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-2xl font-black text-ink uppercase tracking-tighter mb-1">가입 승인 관리</h2>
                      <p className="text-xs text-secondary-text font-bold uppercase tracking-widest">가입 요청 및 기존 계정 관리</p>
                    </div>
                    <div className="bg-white rounded-xl border border-highlight overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-paper border-b border-highlight">
                            <tr>
                              <th className="px-6 py-4 text-xs font-black text-accent uppercase tracking-widest">요청일</th>
                              <th className="px-6 py-4 text-xs font-black text-accent uppercase tracking-widest">회원 정보</th>
                              <th className="px-6 py-4 text-xs font-black text-accent uppercase tracking-widest">상태</th>
                              <th className="px-6 py-4 text-xs font-black text-accent uppercase tracking-widest text-right">처리</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-highlight">
                            {enrollRequests.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="px-6 py-20 text-center text-gray-400 font-bold text-sm">표시할 계정이 없습니다.</td>
                              </tr>
                            ) : (
                              enrollRequests.map((request) => (
                                <tr key={request.id} className="hover:bg-paper/50 transition-colors">
                                  <td className="px-6 py-4 text-[11px] font-bold text-gray-400">{request.created_at ? formatDate(new Date(request.created_at)) : "-"}</td>
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-paper flex items-center justify-center text-accent text-xs font-black border border-highlight">
                                        {request.name[0]}
                                      </div>
                                      <div>
                                        <div className="text-sm font-black text-ink">{request.name}</div>
                                        <div className="text-xs text-secondary-text font-bold">
                                          {request.role === "student" ? `${request.grade || "-"}학년 ${request.class || "-"}반 ${request.number || "-"}번` : "교사 계정"}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span
                                      className={cn(
                                        "text-[9px] font-black px-2 py-0.5 rounded uppercase",
                                        request.status === "pending"
                                          ? "bg-paper text-accent"
                                          : request.status === "approved"
                                            ? "bg-green-50 text-green-600"
                                            : "bg-red-50 text-red-600",
                                      )}
                                    >
                                      {request.status === "pending" ? "승인 대기" : request.status === "approved" ? "승인됨" : request.status === "rejected" ? "반려됨" : request.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    {request.status === "pending" ? (
                                      <div className="flex justify-end gap-2 text-xs">
                                        <button
                                          onClick={() => handleDeleteAccount(request)}
                                          disabled={deletingAccountId === request.id}
                                          className="inline-flex items-center gap-1 px-2 py-1 md:px-3 md:py-1.5 border border-red-100 text-red-500 rounded-lg font-black hover:bg-red-50 transition-all uppercase tracking-widest disabled:opacity-50"
                                        >
                                          <Trash2 size={12} /> {deletingAccountId === request.id ? "삭제 중" : "삭제"}
                                        </button>
                                        <button onClick={() => handleApprove(request.id, false)} className="px-2 py-1 md:px-3 md:py-1.5 border border-highlight text-red-500 rounded-lg font-black hover:bg-red-50 transition-all uppercase tracking-widest">반려</button>
                                        <button onClick={() => handleApprove(request.id, true)} className="px-2 py-1 md:px-3 md:py-1.5 bg-accent text-white rounded-lg font-black hover:bg-sidebar transition-all uppercase tracking-widest">승인</button>
                                      </div>
                                    ) : (
                                      <div className="flex justify-end gap-2 text-xs">
                                        <span className="inline-flex items-center text-xs text-gray-300 font-bold italic">처리 완료</span>
                                        <button
                                          onClick={() => handleDeleteAccount(request)}
                                          disabled={deletingAccountId === request.id}
                                          className="inline-flex items-center gap-1 px-2 py-1 md:px-3 md:py-1.5 border border-red-100 text-red-500 rounded-lg font-black hover:bg-red-50 transition-all uppercase tracking-widest disabled:opacity-50"
                                        >
                                          <Trash2 size={12} /> {deletingAccountId === request.id ? "삭제 중" : "삭제"}
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : <Navigate to="/teacher" replace />
              }
            />
            <Route path="analysis" element={<SecureTeacherAnalysis profile={profile} selectedClassKey={selectedClassKey} />} />
            <Route path="analysis/:studentId" element={<SecureTeacherAnalysis profile={profile} selectedClassKey={selectedClassKey} />} />
            <Route path="chat" element={<div id="teacher-chat-area" className="h-full"><TeacherChat profile={profile} session={session} selectedClassKey={selectedClassKey} /></div>} />
            <Route path="class" element={<div className="p-8 font-black text-2xl text-ink uppercase">학급 관리 기능 준비 중...</div>} />
            <Route path="curriculum" element={<TeacherCurriculum selectedClassKey={selectedClassKey} profile={profile} />} />
            <Route path="resources" element={<TeacherResource selectedClassKey={selectedClassKey} />} />
            <Route path="settings" element={<TeacherSettingsPanel profile={profile} selectedClassKey={selectedClassKey} pendingCount={pendingCount} />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default TeacherView;
