import { useState } from "react";
import { cn } from "../../lib/utils";
import { supabase } from "../../supabase";
import { StudentInstructions } from "../../types";
import { UserProfile } from "../../lib/ai";
import { parseInstructionState, stringifyInstructionState } from "../../lib/instructions";

const StudentSettings = ({
  instructions,
  setInstructions,
  profile,
}: {
  instructions: StudentInstructions;
  setInstructions: (val: any) => void;
  profile: UserProfile | null;
}) => {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const parsed = parseInstructionState(profile.instructions);
      const { error } = await supabase.from('users')
        .update({
          instructions: stringifyInstructionState({
            studentSettings: instructions,
            teacherContext: parsed.teacherContext,
          })
        })
        .eq('id', profile.id);

      if (error) throw error;
      alert('설정이 성공적으로 저장되었습니다.');
    } catch (err) {
      console.error(err);
      alert('저장 실패: ' + (err as any).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-10 py-10">
      <div>
        <h2 className="text-3xl font-black text-ink uppercase tracking-tighter mb-2">나의 학습 설정</h2>
        <p className="text-xs text-secondary-text font-bold uppercase tracking-widest">나의 학습 성향과 목표를 관리하세요.</p>
      </div>

      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white border border-highlight rounded-2xl shadow-sm space-y-4">
            <label className="text-[10px] font-black text-accent uppercase tracking-widest block">문제 접근 방식</label>
            <div className="flex bg-paper p-1 rounded-xl border border-highlight">
              <button
                onClick={() => setInstructions({ ...instructions, problemSolvingApproach: 'intuitive' })}
                className={cn("flex-1 py-2 text-[10px] font-black rounded-lg transition-all cursor-pointer", instructions.problemSolvingApproach === 'intuitive' ? "bg-accent text-white" : "hover:bg-highlight text-secondary-text")}
              >직관적 연상</button>
              <button
                onClick={() => setInstructions({ ...instructions, problemSolvingApproach: 'logical' })}
                className={cn("flex-1 py-2 text-[10px] font-black rounded-lg transition-all cursor-pointer", instructions.problemSolvingApproach === 'logical' ? "bg-accent text-white" : "hover:bg-highlight text-secondary-text")}
              >논리적 추론</button>
            </div>
          </div>
          <div className="p-6 bg-white border border-highlight rounded-2xl shadow-sm space-y-4">
            <label className="text-[10px] font-black text-accent uppercase tracking-widest block">힌트 제공 수준</label>
            <div className="flex items-center gap-4">
              <input
                type="range" min="1" max="5" step="1"
                value={instructions.hintLevel}
                onChange={(e) => setInstructions({ ...instructions, hintLevel: parseInt(e.target.value) })}
                className="flex-1 accent-accent cursor-pointer"
              />
              <span className="text-[10px] font-black text-ink">{instructions.hintLevel}단계</span>
            </div>
            <p className="text-[9px] text-secondary-text font-bold">(1 = 거의 안 줌 · 5 = 충분히 줌)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-white border border-highlight rounded-2xl shadow-sm flex items-center justify-between">
            <label className="text-[10px] font-black text-accent uppercase tracking-widest block">스스로 설명 유도 여부</label>
            <button
              onClick={() => setInstructions({ ...instructions, induceSelfExplanation: !instructions.induceSelfExplanation })}
              className={cn("w-12 h-6 rounded-full relative transition-colors cursor-pointer", instructions.induceSelfExplanation ? "bg-accent" : "bg-highlight")}
            >
              <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", instructions.induceSelfExplanation ? "left-7" : "left-1")} />
            </button>
          </div>
          <div className="p-6 bg-white border border-highlight rounded-2xl shadow-sm flex items-center justify-between">
            <label className="text-[10px] font-black text-accent uppercase tracking-widest block">반복 학습 필요 여부</label>
            <button
              onClick={() => setInstructions({ ...instructions, repeatNeeded: !instructions.repeatNeeded })}
              className={cn("w-12 h-6 rounded-full relative transition-colors cursor-pointer", instructions.repeatNeeded ? "bg-accent" : "bg-highlight")}
            >
              <div className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", instructions.repeatNeeded ? "left-7" : "left-1")} />
            </button>
          </div>
        </div>

        {[
          { label: "현재 학습 목표", key: "currentGoals", desc: "도달하고 싶은 목표 (예: 이번 중간고사 1등급)" },
          { label: "선호 설명 방식", key: "preferredStyle", desc: "예: 그림을 통한 설명, 수식을 통한 증명" },
          { label: "어려운 개념", key: "difficultConcepts", desc: "더 연습하고 싶은 개념" }
        ].map((item) => (
          <div key={item.key} className="p-8 bg-white border border-highlight rounded-2xl shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <label className="text-[10px] font-black text-accent uppercase tracking-widest block mb-1">{item.label}</label>
                <p className="text-[10px] text-secondary-text font-bold">{item.desc}</p>
              </div>
              <span className="text-[10px] font-black text-green-500 bg-green-50 px-2 py-0.5 rounded border border-green-100 uppercase tracking-widest">활성</span>
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
          className="w-full py-4 bg-accent text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-sidebar transition-all shadow-xl shadow-accent/10 disabled:opacity-50 cursor-pointer"
        >
          {saving ? '저장 중...' : '저장 및 적용하기'}
        </button>
      </div>
    </div>
  );
};

export default StudentSettings;
