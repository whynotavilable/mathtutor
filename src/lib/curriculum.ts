export interface CurriculumUnit {
  id: string;
  title: string;
  goals: string;
  active: boolean;
  classKey?: string;
  createdAt: string;
}

export const CURRICULUM_STORAGE_KEY = "MATH_TUTOR_CURRICULUM_UNITS";

export const DEFAULT_CURRICULUM_UNITS: CurriculumUnit[] = [
  {
    id: "unit-1",
    title: "I. 함수의 극한과 연속",
    goals: "극한의 성질 이해, 연속의 정의, 그래프 해석",
    active: false,
    classKey: "3-1",
    createdAt: new Date().toISOString(),
  },
  {
    id: "unit-2",
    title: "II. 다항함수의 미분법",
    goals: "미분계수의 의미, 도함수 활용, 접선의 방정식",
    active: false,
    classKey: "3-2",
    createdAt: new Date().toISOString(),
  },
  {
    id: "unit-3",
    title: "III. 다항함수의 적분법",
    goals: "부정적분과 정적분의 이해, 넓이 해석",
    active: false,
    classKey: "",
    createdAt: new Date().toISOString(),
  },
];

// Per-teacher storage key to avoid data sharing between different teacher accounts
const teacherStorageKey = (teacherId?: string) =>
  teacherId ? `${CURRICULUM_STORAGE_KEY}_${teacherId}` : CURRICULUM_STORAGE_KEY;

export const readCurriculumUnits = (teacherId?: string): CurriculumUnit[] => {
  try {
    const saved = localStorage.getItem(teacherStorageKey(teacherId));
    if (!saved) return DEFAULT_CURRICULUM_UNITS;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length ? parsed as CurriculumUnit[] : DEFAULT_CURRICULUM_UNITS;
  } catch {
    return DEFAULT_CURRICULUM_UNITS;
  }
};

export const writeCurriculumUnits = (units: CurriculumUnit[], teacherId?: string) => {
  localStorage.setItem(teacherStorageKey(teacherId), JSON.stringify(units));
};
