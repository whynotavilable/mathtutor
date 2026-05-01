import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { cn } from "./lib/utils";
import { supabase } from "./supabase";
import { UserProfile } from "./lib/ai";
import { DEFAULT_STUDENT_INSTRUCTIONS, stringifyInstructionState } from "./lib/instructions";
import OnboardingTutorial from "./components/common/OnboardingTutorial";
import StudentView from "./components/student/StudentView";
import TeacherView from "./components/teacher/TeacherView";
import RoleSelection from "./components/auth/RoleSelection";
import AccountStatusScreen from "./components/auth/AccountStatusScreen";

export default function App() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  const [loading, setLoading] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  useEffect(() => {
    document.body.className = theme === "light" ? "bg-paper text-ink" : "bg-[#121212] text-gray-100";
  }, [theme]);

  const fetchProfile = async (activeSession: any) => {
    if (!activeSession?.user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      let { data, error } = await supabase.from("users").select("*").eq("id", activeSession.user.id).maybeSingle();
      if (error && error.code !== "PGRST116") throw error;

      if (!data) {
        const metadata = activeSession.user.user_metadata || {};
        const role = metadata.role === "teacher" ? "teacher" : "student";
        const { data: createdProfile, error: createError } = await supabase.from("users").upsert({
          id: activeSession.user.id,
          email: activeSession.user.email,
          name: metadata.name || metadata.full_name || activeSession.user.email?.split("@")[0],
          role,
          status: "pending",
          grade: role === "student" ? (metadata.grade || null) : null,
          class: role === "student" ? (metadata.class || null) : null,
          number: role === "student" ? (metadata.number || null) : null,
          instructions: stringifyInstructionState({
            studentSettings: { ...DEFAULT_STUDENT_INSTRUCTIONS },
            teacherContext: {},
          }),
        }).select().single();
        if (createError) throw createError;
        data = createdProfile;
      }

      setProfile(data);
    } catch (error) {
      console.error("Profile error:", error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) fetchProfile(data.session);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession) fetchProfile(nextSession);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!profile || profile.status !== "approved") return;
    const tutorialKey = `MATH_TUTOR_TUTORIAL_SEEN_${profile.role}`;
    if (!localStorage.getItem(tutorialKey)) {
      setShowTutorial(true);
    }
  }, [profile]);

  const handleLogout = async () => {
    localStorage.removeItem("ACTIVE_SESSION_ID");
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    navigate("/", { replace: true });
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

  if (!session) {
    return <RoleSelection onSelect={() => {}} />;
  }

  if (!profile) {
    return <AccountStatusScreen title="프로필 오류" body="사용자 프로필을 불러오지 못했습니다. 다시 로그인해 주세요." onLogout={handleLogout} />;
  }

  if (profile.status === "pending") {
    return <AccountStatusScreen title="승인 대기 중" body="가입 신청이 접수되었습니다. 관리자 승인 후 이용할 수 있습니다." onLogout={handleLogout} />;
  }

  if (profile.status === "rejected") {
    return <AccountStatusScreen title="승인 반려" body="가입 신청이 반려되었습니다. 관리자에게 문의해 주세요." onLogout={handleLogout} />;
  }

  return (
    <div className={cn("min-h-screen transition-colors duration-300")}>
      {showTutorial && (
        <OnboardingTutorial
          role={profile.role}
          onComplete={() => {
            localStorage.setItem(`MATH_TUTOR_TUTORIAL_SEEN_${profile.role}`, "true");
            setShowTutorial(false);
          }}
        />
      )}
      <Routes>
        <Route path="/student/*" element={profile.role === "student" ? <StudentView session={session} profile={profile} fetchProfile={fetchProfile} handleTestLogin={async () => {}} handleLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} /> : <Navigate to={profile.role === "teacher" ? "/teacher" : "/"} replace />} />
        <Route path="/teacher/*" element={profile.role === "teacher" ? <TeacherView session={session} profile={profile} handleLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} /> : <Navigate to={profile.role === "student" ? "/student" : "/"} replace />} />
        <Route path="/" element={<Navigate to={profile.role === "teacher" ? "/teacher" : "/student"} replace />} />
      </Routes>
    </div>
  );
}
