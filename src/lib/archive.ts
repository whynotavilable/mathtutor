import { jsPDF } from "jspdf";
import { Message } from "../types";
import { supabase } from "../supabase";
import { UserProfile } from "./ai";
import { parseInstructionState, buildTeacherPrompt, TeacherInstructionContext } from "./instructions";

export const SUPABASE_HISTORY_BUCKET =
  (import.meta as any).env.VITE_SUPABASE_HISTORY_BUCKET || "student-history";

export interface LearningReport {
  id: string;
  session_id: string;
  summary: string;
  misconceptions: string;
  recommendations: string;
  created_at: string;
}

export interface ArchivedSessionDocument {
  filename: string;
  content: string;
}

export const sanitizeArchiveSegment = (value?: string) =>
  (value || "session")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "session";

export const buildArchiveFilename = (session: { id: string; title?: string; created_at?: string }) => {
  const datePrefix = session.created_at ? new Date(session.created_at).toISOString().slice(0, 10) : "session";
  return `${datePrefix}-${sanitizeArchiveSegment(session.title || session.id)}-${session.id.slice(0, 8)}.md`;
};

export const buildArchiveProfileMarkdown = (profile: UserProfile | null) => {
  if (!profile) return "";

  return [
    `# ${profile.name} Learning Archive`,
    "",
    `- Student ID: ${profile.id}`,
    `- Email: ${profile.email || "-"}`,
    `- Class: ${profile.grade && profile.class ? `${profile.grade}학년 ${profile.class}반` : "-"}`,
    `- Number: ${profile.number || "-"}`,
    `- Status: ${profile.status}`,
    "",
    "This archive is reconstructed from live Supabase learning records.",
    "- Source tables: users, chat_sessions, chat_messages, reports",
  ].join("\n");
};

export const buildArchiveTimelineMarkdown = (
  sessions: Array<{ id: string; title?: string; created_at?: string }>,
  reportsBySession: Record<string, LearningReport | undefined>,
) => {
  if (sessions.length === 0) return "";

  return [
    "# Learning Timeline",
    "",
    ...sessions.flatMap((session) => {
      const report = reportsBySession[session.id];
      return [
        `## ${(session.created_at || "").slice(0, 19)} · ${session.title || "Learning Session"}`,
        "",
        `- Session ID: ${session.id}`,
        `- Summary: ${report?.summary || "No report saved yet."}`,
        `- Misconceptions: ${report?.misconceptions || "No misconception notes yet."}`,
        `- Recommendations: ${report?.recommendations || "No recommendation notes yet."}`,
        `- Session File: ${buildArchiveFilename(session)}`,
        "",
      ];
    }),
  ]
    .join("\n")
    .trim();
};

export const buildSessionArchiveMarkdown = ({
  profile,
  session,
  report,
  messages,
  teacherContext,
}: {
  profile: UserProfile | null;
  session: { id: string; title?: string; created_at?: string };
  report?: LearningReport | null;
  messages: Message[];
  teacherContext?: TeacherInstructionContext;
}) => {
  const teacherGuidance = [
    buildTeacherPrompt(teacherContext?.classSettings, teacherContext?.classInstruction),
    buildTeacherPrompt(teacherContext?.studentSettings, teacherContext?.studentInstruction),
  ]
    .filter(Boolean)
    .join("\n\n");

  return [
    `# ${profile?.name || "Student"} Learning Session`,
    "",
    `- Student ID: ${profile?.id || "-"}`,
    `- Session ID: ${session.id}`,
    `- Session Date: ${session.created_at || "-"}`,
    `- Class: ${profile?.grade && profile?.class ? `${profile.grade}학년 ${profile.class}반` : "-"}`,
    `- Number: ${profile?.number || "-"}`,
    `- Session Title: ${session.title || "Learning Session"}`,
    "",
    "## Teacher Guidance",
    teacherGuidance || "No explicit teacher guidance saved.",
    "",
    "## Report Summary",
    report?.summary || "No summary.",
    "",
    "## Misconceptions",
    report?.misconceptions || "No misconceptions recorded.",
    "",
    "## Recommendations",
    report?.recommendations || "No recommendations recorded.",
    "",
    "## Conversation",
    ...(messages.length > 0
      ? messages.flatMap((message) => [
          `### ${message.role === "assistant" ? "Assistant" : "Student"} · ${
            message.timestamp instanceof Date ? message.timestamp.toISOString() : String(message.timestamp || "")
          }`,
          message.content || "",
          "",
        ])
      : ["No conversation saved.", ""]),
  ].join("\n");
};

export const normalizeReportText = (value?: string | null, fallback = "") => {
  const text = `${value || fallback}`.trim();
  if (!text) return fallback;
  return text.replace(/^"(.*)"$/s, "$1").trim();
};

export const exportLearningReportPdf = ({
  title,
  studentName,
  classLabel,
  sessionTitle,
  createdAt,
  summary,
  misconceptions,
  recommendations,
}: {
  title: string;
  studentName?: string;
  classLabel?: string;
  sessionTitle?: string;
  createdAt?: string;
  summary: string;
  misconceptions: string;
  recommendations: string;
}) => {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginX = 16;
  let cursorY = 18;

  const ensureSpace = (requiredHeight = 10) => {
    if (cursorY + requiredHeight > pageHeight - 18) {
      pdf.addPage();
      cursorY = 18;
    }
  };

  const addWrappedText = (label: string, value: string) => {
    ensureSpace(18);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text(label, marginX, cursorY);
    cursorY += 7;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10.5);
    const lines = pdf.splitTextToSize(value || "-", pageWidth - marginX * 2);
    lines.forEach((line: string) => {
      ensureSpace(6);
      pdf.text(line, marginX, cursorY);
      cursorY += 5.5;
    });
    cursorY += 4;
  };

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(18);
  pdf.text(title, marginX, cursorY);
  cursorY += 8;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  [
    studentName ? `Student: ${studentName}` : "",
    classLabel ? `Class: ${classLabel}` : "",
    sessionTitle ? `Session: ${sessionTitle}` : "",
    createdAt ? `Created: ${new Date(createdAt).toLocaleString()}` : "",
  ]
    .filter(Boolean)
    .forEach((line) => {
      pdf.text(line, marginX, cursorY);
      cursorY += 5;
    });

  cursorY += 4;
  addWrappedText("1. Learning Summary", summary);
  addWrappedText("2. Misconceptions", misconceptions);
  addWrappedText("3. Recommendations", recommendations);

  pdf.save(`${sanitizeArchiveSegment(studentName || "learning-report")}.pdf`);
};

export const buildStudentHistoryBasePath = (studentId: string) => `${studentId}`;
export const buildStudentHistoryProfilePath = (studentId: string) => `${buildStudentHistoryBasePath(studentId)}/profile.md`;
export const buildStudentHistoryTimelinePath = (studentId: string) => `${buildStudentHistoryBasePath(studentId)}/timeline.md`;
export const buildStudentHistorySessionPath = (studentId: string, session: { id: string; title?: string; created_at?: string }) =>
  `${buildStudentHistoryBasePath(studentId)}/sessions/${buildArchiveFilename(session)}`;

export const uploadMarkdownToHistoryBucket = async (path: string, content: string) => {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  return supabase.storage.from(SUPABASE_HISTORY_BUCKET).upload(path, blob, {
    upsert: true,
    contentType: "text/markdown;charset=utf-8",
  });
};

export const downloadMarkdownFromHistoryBucket = async (path: string) => {
  const { data, error } = await supabase.storage.from(SUPABASE_HISTORY_BUCKET).download(path);
  if (error || !data) throw error || new Error("Markdown download failed");
  return data.text();
};

const loadStudentArchiveBundleFromDatabase = async (student: UserProfile) => {
  const { data: sessionRows, error: sessionError } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("user_id", student.id)
    .order("created_at", { ascending: false });
  if (sessionError) throw sessionError;

  const sessions = sessionRows || [];
  const sessionIds = sessions.map((session) => session.id);
  let reportRows: LearningReport[] = [];
  let messageRows: any[] = [];

  if (sessionIds.length > 0) {
    const [{ data: fetchedReports, error: reportError }, { data: fetchedMessages, error: messageError }] = await Promise.all([
      supabase.from("reports").select("*").in("session_id", sessionIds),
      supabase.from("chat_messages").select("*").in("session_id", sessionIds).order("created_at", { ascending: true }),
    ]);
    if (reportError) throw reportError;
    if (messageError) throw messageError;
    reportRows = fetchedReports || [];
    messageRows = fetchedMessages || [];
  }

  const reportsBySession = reportRows.reduce<Record<string, LearningReport | undefined>>((acc, currentReport) => {
    acc[currentReport.session_id] = currentReport;
    return acc;
  }, {});
  const messagesBySession = messageRows.reduce<Record<string, Message[]>>((acc, currentMessage) => {
    const mappedMessage = {
      id: currentMessage.id,
      role: currentMessage.role,
      content: currentMessage.content,
      timestamp: new Date(currentMessage.created_at),
    } as Message;
    acc[currentMessage.session_id] = [...(acc[currentMessage.session_id] || []), mappedMessage];
    return acc;
  }, {});
  const parsed = parseInstructionState(student.instructions);
  const sessionDocuments = sessions.map((session) => ({
    filename: buildArchiveFilename(session),
    content: buildSessionArchiveMarkdown({
      profile: student,
      session,
      report: reportsBySession[session.id] || null,
      messages: messagesBySession[session.id] || [],
      teacherContext: parsed.teacherContext,
    }),
  }));

  return {
    profile: buildArchiveProfileMarkdown(student),
    timeline: buildArchiveTimelineMarkdown(sessions, reportsBySession),
    sessionDocuments,
  };
};

export const persistStudentArchiveBundle = async (
  student: UserProfile,
  archive: { profile: string; timeline: string; sessionDocuments: ArchivedSessionDocument[] },
) => {
  const uploads = [
    uploadMarkdownToHistoryBucket(buildStudentHistoryProfilePath(student.id), archive.profile),
    uploadMarkdownToHistoryBucket(buildStudentHistoryTimelinePath(student.id), archive.timeline),
    ...archive.sessionDocuments.map((document) =>
      uploadMarkdownToHistoryBucket(`${buildStudentHistoryBasePath(student.id)}/sessions/${document.filename}`, document.content),
    ),
  ];
  return Promise.allSettled(uploads);
};

export const loadStudentArchiveBundle = async (student: UserProfile, persist = true) => {
  try {
    const [profileContent, timelineContent, sessionListResult] = await Promise.all([
      downloadMarkdownFromHistoryBucket(buildStudentHistoryProfilePath(student.id)),
      downloadMarkdownFromHistoryBucket(buildStudentHistoryTimelinePath(student.id)),
      supabase.storage.from(SUPABASE_HISTORY_BUCKET).list(`${buildStudentHistoryBasePath(student.id)}/sessions`, {
        limit: 200,
        sortBy: { column: "name", order: "desc" },
      }),
    ]);

    if (sessionListResult.error) throw sessionListResult.error;

    const sessionDocuments = await Promise.all(
      (sessionListResult.data || [])
        .filter((item) => item.name)
        .map(async (item) => ({
          filename: item.name,
          content: await downloadMarkdownFromHistoryBucket(`${buildStudentHistoryBasePath(student.id)}/sessions/${item.name}`),
        })),
    );

    return {
      profile: profileContent,
      timeline: timelineContent,
      sessionDocuments,
    };
  } catch {
    const archive = await loadStudentArchiveBundleFromDatabase(student);
    if (persist) {
      try {
        await persistStudentArchiveBundle(student, archive);
      } catch (error) {
        console.warn("Failed to persist archive bundle:", error);
      }
    }
    return archive;
  }
};
