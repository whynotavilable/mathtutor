import { GoogleGenAI } from "@google/genai";
import { StudentInstructions, TeacherInstructions } from "../types";
import { TeacherInstructionContext } from "./instructions";
import { buildTeacherPrompt } from "./instructions";

export const ai = new GoogleGenAI({
  apiKey: (import.meta as any).env.VITE_GEMINI_API_KEY
    || (typeof process !== 'undefined' ? process?.env?.GEMINI_API_KEY : undefined)
    || ''
});

export const GEMINI_TEXT_MODEL =
  (import.meta as any).env.VITE_GEMINI_MODEL
  || "gemini-2.5-flash";

export interface UserProfile {
  id: string;
  email: string | undefined;
  name: string;
  grade: string;
  class: string;
  number: string;
  status: 'pending' | 'approved' | 'rejected' | 'none';
  role: 'student' | 'teacher';
  instructions?: string;
  created_at?: string;
}

export const buildStudentSystemInstruction = (
  instructions: StudentInstructions,
  teacherContext: TeacherInstructionContext,
) => {
  const teacherSections = [
    buildTeacherPrompt(teacherContext.classSettings, teacherContext.classInstruction),
    buildTeacherPrompt(teacherContext.studentSettings, teacherContext.studentInstruction),
  ]
    .filter(Boolean)
    .join("\n\n");

  return [
    "You are a patient Korean math tutor for high school students.",
    "Always teach step by step, use concise language, and format math with LaTeX.",
    instructions.currentGoals ? `Student goals: ${instructions.currentGoals}` : "",
    instructions.preferredStyle ? `Preferred explanation style: ${instructions.preferredStyle}` : "",
    instructions.difficultConcepts ? `Difficult concepts: ${instructions.difficultConcepts}` : "",
    `Problem solving approach preference: ${instructions.problemSolvingApproach}.`,
    `Hint level: ${instructions.hintLevel}.`,
    instructions.induceSelfExplanation ? "Ask the student to explain their reasoning before revealing the full solution." : "",
    instructions.repeatNeeded ? "Repeat key ideas and checkpoints when the student seems uncertain." : "",
    teacherSections ? `Teacher guidance:\n${teacherSections}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
};

export const buildTeacherAssistantInstruction = (profile: UserProfile | null) =>
  [
    "You are an AI pedagogical assistant for a Korean math teacher.",
    "Respond only in Korean.",
    "Your job is to help the teacher interpret student evidence, identify misconceptions, propose intervention plans, and draft precise classroom guidance.",
    "Never invent student facts, reports, scores, or conversation details that were not provided in the prompt or prior messages.",
    "If the teacher asks for a report but there is not enough evidence, say clearly what evidence is missing and provide a fill-in-ready report template instead of guessing.",
    "When evidence is available, ground every claim in that evidence and separate observation from inference.",
    "Prefer concise, actionable bullets.",
    "When writing a teacher-facing report, use this structure unless the teacher requests another format: 1. 학습 요약 2. 관찰 근거 3. 오개념/막힌 지점 4. 다음 수업 개입 전략 5. 교사 피드백 문구 예시.",
    "If a request is vague, ask at most one short clarifying question before proceeding.",
    profile?.name ? `Current teacher: ${profile.name}.` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
