export type StudentSignal = "green" | "yellow" | "red";

type ReportLike = {
  summary?: string | null;
  misconceptions?: string | null;
  recommendations?: string | null;
  created_at?: string | null;
};

export type StudentSignalEvidence = {
  latestSessionAt?: string | null;
  userMessageCount?: number;
  totalMessageCount?: number;
  hasLearningGoal?: boolean;
  hasCareerInterest?: boolean;
  recentUserText?: string;
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
  /혼동/,
  /헷갈/,
  /주의/,
  /보완/,
  /점검/,
  /실수/,
  /추가\s*연습/,
  /반복\s*연습/,
  /불안정/,
  /다소/,
  /어려움/,
  /부족/,
  /자신감.*낮/,
  /소극/,
  /참여.*낮/,
  /흥미.*낮/,
  /동기.*부족/,
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
  /학습.*거부/,
  /참여.*거부/,
  /흥미.*없/,
  /의욕.*없/,
  /동기.*없/,
  /거의.*시도.*않/,
  /풀이.*시도.*없/,
];

const ENGAGEMENT_SEVERE_PATTERNS = [
  /하기\s*싫/,
  /공부.*싫/,
  /수학.*싫/,
  /재미\s*없/,
  /흥미\s*없/,
  /관심\s*없/,
  /의욕\s*없/,
  /못\s*하겠/,
  /안\s*할래/,
  /포기/,
  /그만/,
  /짜증/,
  /싫어/,
];

const ENGAGEMENT_MODERATE_PATTERNS = [
  /어려워/,
  /어렵다/,
  /모르겠/,
  /헷갈/,
  /귀찮/,
  /힘들/,
  /막막/,
  /별로/,
  /재미\s*없을\s*것/,
];

const countMatches = (text: string, patterns: RegExp[]) =>
  patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);

const normalize = (value?: string | null) => (value || "").trim();

const daysSince = (dateValue?: string | null) => {
  if (!dateValue) return Number.POSITIVE_INFINITY;
  const time = new Date(dateValue).getTime();
  if (!Number.isFinite(time)) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - time) / (1000 * 60 * 60 * 24));
};

const reportRiskScore = (report: ReportLike) => {
  const summary = normalize(report.summary);
  const misconceptions = normalize(report.misconceptions);
  const recommendations = normalize(report.recommendations);
  const combined = `${summary} ${misconceptions} ${recommendations}`;

  let score = 0;

  score += Math.min(3, countMatches(combined, MODERATE_PATTERNS));
  score += countMatches(combined, SEVERE_PATTERNS) * 3;

  if (!misconceptions) {
    score += 1;
  } else if (/없음|양호|우수|문제\s*없|잘\s*이해/.test(misconceptions)) {
    score -= 1;
  }

  score -= Math.min(1, countMatches(combined, POSITIVE_PATTERNS));
  return score;
};

const engagementRisk = (text?: string) => {
  const normalized = normalize(text);
  if (!normalized) return { severe: 0, moderate: 0 };
  return {
    severe: countMatches(normalized, ENGAGEMENT_SEVERE_PATTERNS),
    moderate: countMatches(normalized, ENGAGEMENT_MODERATE_PATTERNS),
  };
};

export const getStudentSignal = (
  report: ReportLike | null | undefined,
  hasSession: boolean,
  evidence: StudentSignalEvidence = {},
): StudentSignal => {
  const latestActivityDays = daysSince(evidence.latestSessionAt);
  const reportAgeDays = daysSince(report?.created_at);
  const hasLatestSessionAt = Boolean(evidence.latestSessionAt);
  const hasUserMessageCount = typeof evidence.userMessageCount === "number";
  const userMessageCount = evidence.userMessageCount ?? 0;
  const engagement = engagementRisk(evidence.recentUserText);

  if (!hasSession) {
    return "red";
  }

  if (engagement.severe >= 2 || (engagement.severe >= 1 && engagement.moderate >= 1)) {
    return "red";
  }

  if (engagement.severe >= 1 || engagement.moderate >= 2) {
    return "yellow";
  }

  if (hasLatestSessionAt && latestActivityDays > 14) {
    return "red";
  }

  if (!report) {
    return (hasLatestSessionAt && latestActivityDays > 7) || (hasUserMessageCount && userMessageCount <= 1) ? "red" : "yellow";
  }

  const riskScore = reportRiskScore(report);

  if (riskScore >= 4) return "red";
  if ((hasLatestSessionAt && latestActivityDays > 7) || reportAgeDays > 14) return riskScore >= 2 ? "red" : "yellow";
  if (hasUserMessageCount && userMessageCount <= 1) return riskScore >= 2 ? "red" : "yellow";
  if (hasUserMessageCount && !evidence.hasLearningGoal && userMessageCount <= 2) return "yellow";
  if (riskScore >= 2) return "yellow";
  if (hasUserMessageCount && riskScore >= 1 && userMessageCount <= 3) return "yellow";

  return "green";
};

export const getStudentSignalReason = (
  report: ReportLike | null | undefined,
  hasSession: boolean,
  evidence: StudentSignalEvidence = {},
) => {
  const latestActivityDays = daysSince(evidence.latestSessionAt);
  const reportAgeDays = daysSince(report?.created_at);
  const hasLatestSessionAt = Boolean(evidence.latestSessionAt);
  const hasUserMessageCount = typeof evidence.userMessageCount === "number";
  const userMessageCount = evidence.userMessageCount ?? 0;
  const engagement = engagementRisk(evidence.recentUserText);

  if (engagement.severe >= 2 || (engagement.severe >= 1 && engagement.moderate >= 1)) {
    return "최근 학생 발화에서 학습 회피나 흥미 저하 표현이 반복되어 교사 확인이 필요합니다.";
  }

  if (engagement.severe >= 1 || engagement.moderate >= 2) {
    return "최근 학생 발화에서 수학 학습에 대한 부담감이나 흥미 저하 신호가 보입니다.";
  }

  if (!hasSession) {
    return "학습 세션이 없어 교사 확인이 필요합니다.";
  }

  if (hasLatestSessionAt && latestActivityDays > 14) {
    return "최근 2주 이상 학습 기록이 없어 개입이 필요합니다.";
  }

  if (!report) {
    return hasUserMessageCount && userMessageCount <= 1
      ? "학습 시도는 있지만 대화량이 매우 적고 보고서가 없습니다."
      : "최근 세션은 있지만 보고서가 아직 없습니다.";
  }

  const misconceptions = normalize(report.misconceptions);
  const recommendations = normalize(report.recommendations);
  const summary = normalize(report.summary);
  const signal = getStudentSignal(report, hasSession, evidence);

  if (signal === "green") {
    return (summary || "최근 기록, 보고서, 참여량이 안정적입니다.").slice(0, 70);
  }

  if (hasLatestSessionAt && latestActivityDays > 7) {
    return "최근 학습 간격이 길어졌습니다.";
  }

  if (reportAgeDays > 14) {
    return "최근 보고서가 오래되어 현재 상태 재확인이 필요합니다.";
  }

  if (hasUserMessageCount && userMessageCount <= 1) {
    return "학생 발화가 매우 적어 참여도 확인이 필요합니다.";
  }

  if (misconceptions) {
    return misconceptions.slice(0, 70);
  }

  return (recommendations || "추가 확인이 필요한 학습 신호가 있습니다.").slice(0, 70);
};
