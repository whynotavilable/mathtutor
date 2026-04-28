import { Student, Class, Message } from "./types";

const dummyMessages1: Message[] = [
  { id: "1", role: "assistant", content: "안녕하세요! 오늘은 수능 수학 가형의 '미분법' 단원을 학습해보겠습니다. 먼저 도함수의 정의에 대해 얼마나 알고 계신가요?", timestamp: new Date("2024-03-20T10:00:00") },
  { id: "2", role: "user", content: "도함수의 정의는 $f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$ 인 것으로 알고 있어요.", timestamp: new Date("2024-03-20T10:01:00") },
  { id: "3", role: "assistant", content: "정확합니다! 그럼 $f(x) = x^2$의 도함수를 정의를 이용해 구해보실 수 있을까요?", timestamp: new Date("2024-03-20T10:02:00") },
];

export const DUMMY_STUDENT: Student = {
  id: "s1",
  name: "김수학",
  grade: "3",
  class: "1",
  number: "12",
  status: 'yellow',
  instructions: {
    currentGoals: "미분법 정복 및 수능 1등급",
    preferredStyle: "시각적 자료와 기하학적 설명 선호",
    difficultConcepts: "합성함수의 미분법, 변곡점의 기하학적 의미",
    careerInterest: "",
    problemSolvingApproach: 'intuitive',
    induceSelfExplanation: true,
    hintLevel: 2,
    repeatNeeded: true,
  },
  sessions: [
    {
      id: "sess1",
      date: new Date("2024-03-20"),
      summary: "미분법의 기초와 도함수 정의 학습",
      totalProblems: 5,
      correctProblems: 4,
      achievement: 80,
      messages: dummyMessages1,
      report: {
        summary: "학생이 도함수의 정의를 명확히 이해하고 있으나, 극한 계산 과정에서 사소한 연산 실수가 가끔 발생함.",
        direction: "복합한 함술의 미분 규칙(Chain Rule)을 적용하는 연습을 더 보강할 필요가 있음.",
        misconceptions: ["합성함수 미분 시 속미분을 빠뜨리는 경향"],
      },
    },
    {
      id: "sess2",
      date: new Date("2024-03-18"),
      summary: "지수함수와 로그함수의 미분",
      totalProblems: 10,
      correctProblems: 9,
      achievement: 90,
      messages: [],
      report: {
        summary: "공식을 잘 암기하고 적용함.",
        direction: "역함수의 미분법 응용 문제 풀이 권장.",
        misconceptions: [],
      },
    },
  ],
};

export const DUMMY_CLASSES: Class[] = [
  {
    id: "c1",
    name: "3학년 1반",
    students: [
      DUMMY_STUDENT, 
      { ...DUMMY_STUDENT, id: "s2", name: "이철수", number: "15" },
      { ...DUMMY_STUDENT, id: "s3", name: "박민주", number: "08" },
      { ...DUMMY_STUDENT, id: "s4", name: "한지우", number: "21" }
    ],
    teacherInstructions: {
      s1: {
        weeklyGoals: "미분법 단원 심화 학습 및 문제 풀이",
        keyConcepts: "도함수, 합성함수의 미분, 몫의 미분법",
        solvingGuideline: "공식 암기보다는 유도 과정을 이해하고 설명하도록 유도",
        difficultyLevel: "중상 (준킬러 급)",
        feedbackStyle: "힌트 중심 (단계별 질문 피드백)",
        aiQuestionStyle: 'inductive',
        aiMisconceptionResponse: "즉시 정정하기보다 반례를 들어 스스로 깨닫게 함",
        aiEngagementStrategy: "수능 실전 응용 사례를 언급하여 동기 부여",
      },
    },
  },
  { id: "c2", name: "3학년 2반", students: [], teacherInstructions: {} },
];
