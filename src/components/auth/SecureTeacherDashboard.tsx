import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { supabase } from "../../supabase";
import { UserProfile } from "../../lib/ai";
import { TeacherInstructions } from "../../types";
import { DEFAULT_TEACHER_INSTRUCTIONS, parseInstructionState, stringifyInstructionState } from "../../lib/instructions";
import { isAdminUser, getClassKey, getClassLabel } from "../../lib/userUtils";

const SecureTeacherDashboard = ({ profile }: { profile: UserProfile | null }) => {
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [showClassInstructions, setShowClassInstructions] = useState(false);
  const [selectedClassKey, setSelectedClassKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [classInstructions, setClassInstructions] = useState<TeacherInstructions>({ ...DEFAULT_TEACHER_INSTRUCTIONS });

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
      console.error("Failed to fetch students:", error);
      return;
    }
    setStudents(data || []);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const classOptions = Array.from(new Set(students.map((student) => getClassKey(student)).filter(Boolean))).map((key) => {
    const target = students.find((student) => getClassKey(student) === key)!;
    return { key, label: getClassLabel(target) };
  });

  const handleApplyClassInstructions = async () => {
    if (!selectedClassKey) return;
    setSaving(true);
    try {
      const targetStudents = students.filter((student) => getClassKey(student) === selectedClassKey);
      for (const student of targetStudents) {
        const parsed = parseInstructionState(student.instructions);
        const { error } = await supabase.from("users").update({
          instructions: stringifyInstructionState({
            studentSettings: parsed.studentSettings,
            teacherContext: {
              ...parsed.teacherContext,
              classSettings: classInstructions,
              classInstruction: `${selectedClassKey} class guidance`,
              updatedAt: new Date().toISOString(),
              updatedBy: profile?.name,
              updatedByEmail: profile?.email,
            },
          }),
        }).eq("id", student.id);
        if (error) throw error;
      }
      setShowClassInstructions(false);
      await fetchStudents();
    } catch (error: any) {
      alert(error.message || "학급 지침 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-highlight rounded-2xl p-6"><p className="text-xs font-bold text-secondary-text uppercase tracking-widest">승인 학생</p><p className="text-3xl font-black text-ink mt-2">{students.length}</p></div>
        <div className="bg-white border border-highlight rounded-2xl p-6"><p className="text-xs font-bold text-secondary-text uppercase tracking-widest">관리자</p><p className="text-lg font-black text-ink mt-2">{isAdminUser(profile) ? "활성" : "일반 교사"}</p></div>
        <div className="bg-white border border-highlight rounded-2xl p-6"><button onClick={() => setShowClassInstructions(true)} className="w-full h-full text-left"><p className="text-xs font-bold text-secondary-text uppercase tracking-widest">학급 지침</p><p className="text-lg font-black text-accent mt-2">학급별 공통 지침 적용</p></button></div>
      </div>

      <div className="bg-white rounded-2xl border border-highlight overflow-hidden shadow-sm">
        <div className="p-5 border-b border-highlight flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-widest text-ink">학생 목록</h3>
          <button onClick={fetchStudents} className="text-xs font-black text-accent">새로고침</button>
        </div>
        <div className="divide-y divide-highlight">
          {students.map((student) => (
            <div key={student.id} className="px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-ink">{student.name}</p>
                <p className="text-[10px] font-bold text-secondary-text">{getClassLabel(student)} / {student.number || "-"}번 / {student.email}</p>
              </div>
              <Link to={`/teacher/analysis/${student.id}`} className="text-xs font-black text-accent uppercase tracking-widest">분석 보기</Link>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {showClassInstructions && (
          <div className="fixed inset-0 z-[220] flex items-center justify-center p-6 bg-sidebar/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-3xl bg-white rounded-3xl border border-highlight shadow-2xl overflow-hidden">
              <div className="px-8 py-6 border-b border-highlight flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-ink uppercase tracking-tight">학급 공통 지침</h3>
                  <p className="text-[10px] font-bold text-secondary-text uppercase tracking-widest">선택한 학급 학생 전체에 적용</p>
                </div>
                <button onClick={() => setShowClassInstructions(false)} className="p-2 hover:bg-paper rounded-full transition-colors"><X size={20} /></button>
              </div>
              <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
                <select value={selectedClassKey} onChange={(e) => setSelectedClassKey(e.target.value)} className="w-full rounded-xl border border-highlight bg-paper p-4 text-sm font-semibold outline-none">
                  <option value="">학급 선택</option>
                  {classOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                </select>
                {[
                  ["weeklyGoals", "주간 목표"],
                  ["keyConcepts", "핵심 개념"],
                  ["solvingGuideline", "풀이 지침"],
                  ["difficultyLevel", "난이도"],
                  ["feedbackStyle", "피드백 방식"],
                  ["aiMisconceptionResponse", "오개념 대응"],
                  ["aiEngagementStrategy", "참여 유도"],
                ].map(([field, label]) => (
                  <div key={field} className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-secondary-text">{label}</label>
                    <textarea value={(classInstructions as any)[field] || ""} onChange={(e) => setClassInstructions({ ...classInstructions, [field]: e.target.value })} className="w-full h-20 resize-none rounded-xl border border-highlight bg-paper p-4 text-sm font-semibold outline-none" />
                  </div>
                ))}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-secondary-text">질문 방식</label>
                  <select value={classInstructions.aiQuestionStyle} onChange={(e) => setClassInstructions({ ...classInstructions, aiQuestionStyle: e.target.value as "inductive" | "direct" })} className="w-full rounded-xl border border-highlight bg-paper p-4 text-sm font-semibold outline-none">
                    <option value="inductive">유도형</option>
                    <option value="direct">직접형</option>
                  </select>
                </div>
              </div>
              <div className="px-8 py-6 border-t border-highlight flex justify-end gap-3">
                <button onClick={() => setShowClassInstructions(false)} className="px-5 py-3 border border-highlight rounded-xl text-xs font-black text-secondary-text">취소</button>
                <button onClick={handleApplyClassInstructions} disabled={saving || !selectedClassKey} className="px-5 py-3 bg-accent text-white rounded-xl text-xs font-black disabled:opacity-50">{saving ? "저장 중..." : "전체 적용"}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SecureTeacherDashboard;
