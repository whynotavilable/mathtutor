import { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { LayoutDashboard, BarChart3, MessageSquare, ShieldCheck, X, Menu, LogOut, CircleUser } from "lucide-react";
import { cn } from "../../lib/utils";
import { UserProfile } from "../../lib/ai";
import { isAdminUser } from "../../lib/userUtils";
import SidebarItem from "../common/SidebarItem";
import SecureTeacherDashboard from "./SecureTeacherDashboard";
import SecureTeacherAnalysis from "./SecureTeacherAnalysis";
import SecureTeacherChat from "./SecureTeacherChat";
import AdminApprovalPanel from "./AdminApprovalPanel";

const SecureTeacherView = ({ session, profile, handleLogout }: { session: any; profile: UserProfile | null; handleLogout: () => Promise<void> }) => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isAdmin = isAdminUser(profile);

  return (
    <div className="flex h-screen md:h-[calc(100vh-2rem)] md:rounded-3xl overflow-hidden border border-highlight shadow-sm relative">
      <AnimatePresence>
        {isSidebarOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-sidebar/50 backdrop-blur-sm z-40 md:hidden" />}
      </AnimatePresence>
      <div className={cn("fixed inset-y-0 left-0 w-64 flex flex-col bg-sidebar text-white py-8 flex-shrink-0 z-50 transform transition-transform duration-300 md:relative md:translate-x-0 md:z-0", isSidebarOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="px-6 mb-10 flex justify-between items-center">
          <h1 className="text-xl font-black tracking-tighter text-gray-100 uppercase">Math Tutor Pro</h1>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-white/60 hover:text-white"><X size={20} /></button>
        </div>
        <nav className="flex flex-col">
          <SidebarItem icon={LayoutDashboard} label="대시보드" to="/teacher" active={location.pathname === "/teacher"} onClick={() => setIsSidebarOpen(false)} />
          <SidebarItem icon={BarChart3} label="학생 분석" to="/teacher/analysis" active={location.pathname.startsWith("/teacher/analysis")} onClick={() => setIsSidebarOpen(false)} />
          <SidebarItem icon={MessageSquare} label="교사 채팅" to="/teacher/chat" active={location.pathname === "/teacher/chat"} onClick={() => setIsSidebarOpen(false)} />
          {isAdmin && <SidebarItem icon={ShieldCheck} label="승인 관리" to="/teacher/approvals" active={location.pathname === "/teacher/approvals"} onClick={() => setIsSidebarOpen(false)} />}
        </nav>
        <div className="mt-auto px-6 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><CircleUser size={18} /></div>
            <div className="flex flex-col">
              <span className="font-bold text-xs">{profile?.name || session?.user?.email?.split("@")[0]} 선생님</span>
              <span className="text-[10px] text-white/50">{isAdmin ? "관리자" : "교사"}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 text-xs text-white/50 hover:text-white transition-colors"><LogOut size={12} /> 로그아웃</button>
        </div>
      </div>
      <main className="flex-1 overflow-hidden bg-paper flex flex-col w-full">
        <header className="h-16 px-4 md:px-8 border-b border-highlight bg-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 md:hidden text-secondary-text hover:text-accent transition-colors"><Menu size={20} /></button>
            <span className="text-sm font-bold text-accent uppercase tracking-widest">{profile?.name} Teacher Workspace</span>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <Routes>
            <Route index element={<SecureTeacherDashboard profile={profile} />} />
            <Route path="analysis" element={<SecureTeacherAnalysis profile={profile} />} />
            <Route path="analysis/:studentId" element={<SecureTeacherAnalysis profile={profile} />} />
            <Route path="chat" element={<SecureTeacherChat profile={profile} />} />
            <Route path="approvals" element={isAdmin ? <AdminApprovalPanel /> : <Navigate to="/teacher" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default SecureTeacherView;
