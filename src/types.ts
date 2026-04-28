export type UserRole = "student" | "teacher";

export interface StudentInstructions {
  currentGoals: string;
  preferredStyle: string;
  difficultConcepts: string;
  careerInterest: string;
  problemSolvingApproach: 'intuitive' | 'logical';
  induceSelfExplanation: boolean;
  hintLevel: number;
  repeatNeeded: boolean;
}

export interface TeacherInstructions {
  weeklyGoals: string;
  keyConcepts: string;
  solvingGuideline: string;
  difficultyLevel: string;
  feedbackStyle: string;
  aiQuestionStyle: 'inductive' | 'direct';
  aiMisconceptionResponse: string;
  aiEngagementStrategy: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface Session {
  id: string;
  date: Date;
  summary: string;
  totalProblems: number;
  correctProblems: number;
  achievement: number; // percentage
  messages: Message[];
  report: {
    summary: string;
    direction: string;
    misconceptions: string[];
  };
}

export interface Student {
  id: string;
  name: string;
  grade: string;
  class: string;
  number: string;
  status: 'green' | 'yellow' | 'red';
  instructions: StudentInstructions;
  sessions: Session[];
}

export interface Class {
  id: string;
  name: string;
  students: Student[];
  teacherInstructions: { [studentId: string]: TeacherInstructions };
}
