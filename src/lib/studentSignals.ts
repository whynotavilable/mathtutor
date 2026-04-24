export type StudentSignal = "green" | "yellow" | "red";

type ReportLike = {
  summary?: string | null;
  misconceptions?: string | null;
  recommendations?: string | null;
};

const POSITIVE_PATTERNS = [
  /없음/,
  /양호/,
  /우수/,
  /잘\s*이해/,
  /문제\s*없/,
  /스스로/,
  /자기주도/,
  /정확/,
  /안정적/,
  /충분히/,
];

const MODERATE_PATTERNS = [
  /오개념/,
  /헷갈/,
  /주의/,
  /보완/,
  /점검/,
  /실수/,
  /추가\s*연습/,
  /반복\s*연습/,
  /불안정/,
  /다소/,
];

const SEVERE_PATTERNS = [
  /교사.*개입/,
  /즉각.*지도/,
  /직접.*지도/,
  /전혀.*이해/,
  /기초.*부족/,
  /기초.*부터/,
  /심각/,
  /핵심.*결손/,
  /반드시.*보충/,
  /지속.*오류/,
  /개념.*자체.*어려움/,
];

const countMatches = (text: string, patterns: RegExp[]) =>
  patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);

const normalize = (value?: string | null) => (value || "").trim();

export const getStudentSignal = (report: ReportLike | null | undefined, hasSession: boolean): StudentSignal => {
  if (!report) {
    return hasSession ? "yellow" : "yellow";
  }

  const summary = normalize(report.summary);
  const misconceptions = normalize(report.misconceptions);
  const recommendations = normalize(report.recommendations);
  const combined = `${summary} ${misconceptions} ${recommendations}`;

  let score = 0;

  if (!misconceptions || /없음|양호|우수|문제\s*없|잘\s*이해/.test(misconceptions)) {
    score -= 3;
  }

  score -= Math.min(2, countMatches(combined, POSITIVE_PATTERNS));
  score += Math.min(2, countMatches(misconceptions, MODERATE_PATTERNS));
  score += countMatches(misconceptions, SEVERE_PATTERNS) * 3;
  score += countMatches(recommendations, SEVERE_PATTERNS);

  if (score >= 3) return "red";
  if (score >= 1) return "yellow";
  return "green";
};

export const getStudentSignalReason = (report: ReportLike | null | undefined, hasSession: boolean) => {
  if (!report) {
    return hasSession ? "최근 세션은 있지만 보고서가 아직 없습니다." : "학습 기록이 아직 없습니다.";
  }

  const misconceptions = normalize(report.misconceptions);
  const recommendations = normalize(report.recommendations);
  const summary = normalize(report.summary);
  const signal = getStudentSignal(report, hasSession);

  if (signal === "green") {
    return (summary || recommendations || "안정적으로 학습을 이어가고 있습니다.").slice(0, 70);
  }

  if (misconceptions) {
    return misconceptions.slice(0, 70);
  }

  return (recommendations || "추가 확인이 필요한 학습 신호가 있습니다.").slice(0, 70);
};
