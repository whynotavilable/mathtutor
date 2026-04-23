import { StudentInstructions, TeacherInstructions } from "../types";

export interface TeacherInstructionContext {
  classInstruction?: string;
  studentInstruction?: string;
  classSettings?: Partial<TeacherInstructions>;
  studentSettings?: Partial<TeacherInstructions>;
  updatedAt?: string;
  updatedBy?: string;
  updatedByEmail?: string;
}

export interface ParsedInstructionState {
  studentSettings: StudentInstructions;
  teacherContext: TeacherInstructionContext;
}

export const DEFAULT_STUDENT_INSTRUCTIONS: StudentInstructions = {
  currentGoals: "",
  preferredStyle: "",
  difficultConcepts: "",
  problemSolvingApproach: "intuitive",
  induceSelfExplanation: true,
  hintLevel: 2,
  repeatNeeded: false,
};

export const DEFAULT_TEACHER_INSTRUCTIONS: TeacherInstructions = {
  weeklyGoals: "",
  keyConcepts: "",
  solvingGuideline: "",
  difficultyLevel: "",
  feedbackStyle: "",
  aiQuestionStyle: "inductive",
  aiMisconceptionResponse: "",
  aiEngagementStrategy: "",
};

export const isStudentInstructionShape = (value: any): value is StudentInstructions =>
  value && typeof value === "object" && typeof value.currentGoals === "string" && typeof value.hintLevel === "number";

export const parseInstructionState = (raw?: string): ParsedInstructionState => {
  if (!raw) {
    return {
      studentSettings: { ...DEFAULT_STUDENT_INSTRUCTIONS },
      teacherContext: {},
    };
  }

  try {
    const parsed = JSON.parse(raw);

    if (parsed?.studentSettings) {
      return {
        studentSettings: {
          ...DEFAULT_STUDENT_INSTRUCTIONS,
          ...parsed.studentSettings,
        },
        teacherContext: parsed.teacherContext || {},
      };
    }

    if (isStudentInstructionShape(parsed)) {
      return {
        studentSettings: {
          ...DEFAULT_STUDENT_INSTRUCTIONS,
          ...parsed,
        },
        teacherContext: (parsed as any).teacherContext || {},
      };
    }
  } catch (error) {
    console.error("Failed to parse instructions:", error);
  }

  return {
    studentSettings: { ...DEFAULT_STUDENT_INSTRUCTIONS },
    teacherContext: {},
  };
};

export const stringifyInstructionState = (instructionState: ParsedInstructionState) =>
  JSON.stringify({
    studentSettings: instructionState.studentSettings,
    teacherContext: instructionState.teacherContext,
  });

export const buildTeacherPrompt = (settings?: Partial<TeacherInstructions>, note?: string) => {
  const activeSettings = {
    ...DEFAULT_TEACHER_INSTRUCTIONS,
    ...(settings || {}),
  };

  return [
    note ? `Instruction note: ${note}` : "",
    activeSettings.weeklyGoals ? `Weekly goals: ${activeSettings.weeklyGoals}` : "",
    activeSettings.keyConcepts ? `Key concepts: ${activeSettings.keyConcepts}` : "",
    activeSettings.solvingGuideline ? `Solving guideline: ${activeSettings.solvingGuideline}` : "",
    activeSettings.difficultyLevel ? `Difficulty level: ${activeSettings.difficultyLevel}` : "",
    activeSettings.feedbackStyle ? `Feedback style: ${activeSettings.feedbackStyle}` : "",
    activeSettings.aiQuestionStyle ? `Question style: ${activeSettings.aiQuestionStyle}` : "",
    activeSettings.aiMisconceptionResponse ? `How to respond to misconceptions: ${activeSettings.aiMisconceptionResponse}` : "",
    activeSettings.aiEngagementStrategy ? `Engagement strategy: ${activeSettings.aiEngagementStrategy}` : "",
  ]
    .filter(Boolean)
    .join("\n");
};
