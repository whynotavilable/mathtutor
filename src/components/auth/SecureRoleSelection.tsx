import { useState } from "react";
import { motion } from "motion/react";
import { Bot, ChevronRight, RefreshCcw } from "lucide-react";
import { cn } from "../../lib/utils";
import { supabase } from "../../supabase";
import { DEFAULT_STUDENT_INSTRUCTIONS, stringifyInstructionState } from "../../lib/instructions";

const SecureRoleSelection = () => {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState("");
  const [selectedRole, setSelectedRole] = useState<"student" | "teacher">("student");
  const [grade, setGrade] = useState("");
  const [classNum, setClassNum] = useState("");
  const [number, setNumber] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setFormLoading(false);
  };

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== passwordConfirm) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    setFormLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: selectedRole,
          grade: selectedRole === "student" ? grade : null,
          class: selectedRole === "student" ? classNum : null,
          number: selectedRole === "student" ? number : null,
        },
      },
    });

    if (error) {
      alert(error.message);
      setFormLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("users").upsert({
        id: data.user.id,
        email,
        name,
        role: selectedRole,
        status: "pending",
        grade: selectedRole === "student" ? grade : null,
        class: selectedRole === "student" ? classNum : null,
        number: selectedRole === "student" ? number : null,
        instructions: stringifyInstructionState({
          studentSettings: { ...DEFAULT_STUDENT_INSTRUCTIONS },
          teacherContext: {},
        }),
      });

      if (profileError) {
        alert(profileError.message);
      } else {
        alert("가입 신청이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.");
        setTab("login");
      }
    }

    setFormLoading(false);
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-4 bg-gradient-to-br from-paper to-highlight/30">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full bg-white rounded-[40px] border border-highlight shadow-2xl overflow-hidden">
        <div className="p-8 md:p-10 space-y-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-accent/10 rounded-3xl flex items-center justify-center mx-auto text-accent shadow-inner border border-accent/20">
              <Bot size={32} />
            </div>
            <div className="space-y-1">
              <h1 className="text-3xl font-black text-ink uppercase tracking-tight">Math Tutor</h1>
              <p className="text-[10px] text-secondary-text font-extrabold uppercase tracking-[0.2em] opacity-60">Authentication System</p>
            </div>
          </div>

          <div className="flex gap-2 p-1 bg-paper rounded-2xl border border-highlight">
            <button onClick={() => setTab("login")} className={cn("flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all", tab === "login" ? "bg-white text-accent shadow-sm border border-highlight" : "text-gray-400 hover:text-ink")}>로그인</button>
            <button onClick={() => setTab("signup")} className={cn("flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all", tab === "signup" ? "bg-white text-accent shadow-sm border border-highlight" : "text-gray-400 hover:text-ink")}>회원가입</button>
          </div>

          <form onSubmit={tab === "login" ? handleLogin : handleSignup} className="space-y-4">
            {tab === "signup" && (
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-5 py-4 bg-paper border border-highlight rounded-2xl text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-accent/20 transition-all" placeholder="이름" required />
            )}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-5 py-4 bg-paper border border-highlight rounded-2xl text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-accent/20 transition-all" placeholder="example@email.com" required />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-5 py-4 bg-paper border border-highlight rounded-2xl text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-accent/20 transition-all" placeholder="비밀번호" required />

            {tab === "signup" && (
              <>
                <input type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} className="w-full px-5 py-4 bg-paper border border-highlight rounded-2xl text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-accent/20 transition-all" placeholder="비밀번호 확인" required />
                <div className="grid grid-cols-2 gap-2 p-1 bg-paper rounded-2xl border border-highlight">
                  <button type="button" onClick={() => setSelectedRole("student")} className={cn("py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all", selectedRole === "student" ? "bg-white text-accent shadow-sm border border-highlight" : "text-gray-400")}>학생</button>
                  <button type="button" onClick={() => setSelectedRole("teacher")} className={cn("py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all", selectedRole === "teacher" ? "bg-sidebar text-white shadow-sm" : "text-gray-400")}>교사</button>
                </div>

                {selectedRole === "student" && (
                  <div className="grid grid-cols-3 gap-3">
                    <input type="text" value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full px-4 py-4 bg-paper border border-highlight rounded-2xl text-sm font-semibold text-ink text-center outline-none focus:ring-2 focus:ring-accent/20 transition-all" placeholder="학년" required />
                    <input type="text" value={classNum} onChange={(e) => setClassNum(e.target.value)} className="w-full px-4 py-4 bg-paper border border-highlight rounded-2xl text-sm font-semibold text-ink text-center outline-none focus:ring-2 focus:ring-accent/20 transition-all" placeholder="반" required />
                    <input type="text" value={number} onChange={(e) => setNumber(e.target.value)} className="w-full px-4 py-4 bg-paper border border-highlight rounded-2xl text-sm font-semibold text-ink text-center outline-none focus:ring-2 focus:ring-accent/20 transition-all" placeholder="번호" required />
                  </div>
                )}
              </>
            )}

            <button type="submit" disabled={formLoading} className="w-full py-5 bg-ink text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-accent transition-all shadow-xl shadow-ink/10 flex items-center justify-center gap-2 group disabled:opacity-50">
              {formLoading ? <RefreshCcw className="animate-spin" size={18} /> : tab === "login" ? "로그인" : "회원가입"}
              <ChevronRight className="group-hover:translate-x-1 transition-transform" size={18} />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default SecureRoleSelection;
