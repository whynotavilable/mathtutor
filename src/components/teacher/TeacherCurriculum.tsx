import { useState, useEffect } from "react";
import { Plus, Settings } from "lucide-react";
import { CurriculumUnit, readCurriculumUnits, writeCurriculumUnits } from "../../lib/curriculum";
import { UserProfile } from "../../lib/ai";

const TeacherCurriculum = ({ selectedClassKey, profile }: { selectedClassKey: string; profile: UserProfile | null }) => {
  const teacherId = profile?.id;
  // Load units after profile resolves to avoid using shared fallback key before teacherId is known
  const [units, setUnits] = useState<CurriculumUnit[]>([]);

  useEffect(() => {
    if (!teacherId) return; // wait until profile is available
    setUnits(readCurriculumUnits(teacherId));
  }, [teacherId]);
  const [title, setTitle] = useState("");
  const [goals, setGoals] = useState("");

  const filteredUnits = units.filter((unit) => !selectedClassKey || !unit.classKey || unit.classKey === selectedClassKey);

  const handleAddUnit = () => {
    if (!title.trim() || !goals.trim()) return;
    const nextUnits = [
      {
        id: crypto.randomUUID(),
        title: title.trim(),
        goals: goals.trim(),
        active: false, // New units start as "예정" — teacher manually activates
        classKey: selectedClassKey,
        createdAt: new Date().toISOString(),
      },
      ...units,
    ];
    setUnits(nextUnits);
    writeCurriculumUnits(nextUnits, teacherId);
    setTitle("");
    setGoals("");
  };

  const toggleUnit = (id: string) => {
    const target = units.find((u) => u.id === id);
    if (!target) return;
    const nextUnits = units.map((unit) => {
      if (unit.id === id) return { ...unit, active: !unit.active };
      // If activating this unit, deactivate other units in the same class (one "진행중" per class)
      if (!target.active && unit.classKey === target.classKey && unit.active) return { ...unit, active: false };
      return unit;
    });
    setUnits(nextUnits);
    writeCurriculumUnits(nextUnits, teacherId);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-black text-ink uppercase tracking-tighter">교육과정 관리</h2>
          <p className="text-xs font-bold text-secondary-text uppercase tracking-widest">{selectedClassKey ? `${selectedClassKey.replace("-", "학년 ")}반 기준` : "전체 학급 기준"}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-[220px_320px_auto]">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="단원 제목" className="rounded-xl border border-highlight bg-white px-4 py-3 text-sm font-semibold outline-none" />
          <input value={goals} onChange={(e) => setGoals(e.target.value)} placeholder="학습 목표" className="rounded-xl border border-highlight bg-white px-4 py-3 text-sm font-semibold outline-none" />
          <button onClick={handleAddUnit} className="flex items-center justify-center gap-2 bg-accent text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-md hover:bg-sidebar transition-all">
            <Plus size={16} /> 단원 추가
          </button>
        </div>
      </div>
      <div className="space-y-4">
        {filteredUnits.map((unit, i) => (
          <div key={unit.id} className="bg-white p-6 rounded-xl border border-highlight flex justify-between items-center shadow-sm hover:shadow-md transition-shadow">
            <div className="flex gap-6 items-center">
              <div className="w-10 h-10 bg-paper border border-highlight text-accent flex items-center justify-center rounded-lg font-black text-lg">{i + 1}</div>
              <div>
                <h3 className="text-sm font-black mb-0.5 text-ink uppercase">{unit.title}</h3>
                <p className="text-[10px] text-secondary-text font-bold">학습 목표: {unit.goals}</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              {unit.active ? (
                <span className="text-[9px] font-black text-success-text bg-success-bg px-2 py-0.5 rounded uppercase tracking-widest">진행 중</span>
              ) : (
                <span className="text-[9px] font-black text-gray-400 bg-highlight px-2 py-0.5 rounded uppercase tracking-widest">예정</span>
              )}
              <button onClick={() => toggleUnit(unit.id)} className="p-2 text-gray-300 hover:text-accent transition-colors"><Settings size={18} /></button>
            </div>
          </div>
        ))}
        {filteredUnits.length === 0 && <div className="bg-white rounded-xl border border-highlight p-10 text-center text-sm font-bold text-gray-400">등록된 교육과정이 없습니다.</div>}
      </div>
    </div>
  );
};

export default TeacherCurriculum;
