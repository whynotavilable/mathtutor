import { useState } from "react";
import { cn } from "../../lib/utils";
import { Message } from "../../types";
import { UserProfile, ai, GEMINI_TEXT_MODEL, buildTeacherAssistantInstruction } from "../../lib/ai";

const SecureTeacherChat = ({ profile }: { profile: UserProfile | null }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const currentInput = input;
    setInput("");
    setLoading(true);
    const nextMessages = [...messages, { id: crypto.randomUUID(), role: "user", content: currentInput, timestamp: new Date() } as Message];
    setMessages(nextMessages);
    try {
      const history = nextMessages.slice(0, -1).map((message) => ({
        role: message.role === "user" ? "user" : "model",
        parts: [{ text: message.content }],
      }));
      const chat = ai.chats.create({ model: GEMINI_TEXT_MODEL, config: { systemInstruction: buildTeacherAssistantInstruction(profile) }, history });
      const response = await chat.sendMessage({ message: currentInput });
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: response.text || "응답을 받지 못했습니다.", timestamp: new Date() }]);
    } catch (error: any) {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: `오류: ${error?.message || "AI 연결 실패"}`, timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-highlight overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={cn("max-w-[90%] rounded-2xl px-4 py-3", message.role === "user" ? "ml-auto bg-sidebar text-white" : "border border-highlight bg-paper text-ink")}>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
          </div>
        ))}
      </div>
      <div className="p-4 border-t border-highlight flex gap-3">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }} className="flex-1 rounded-xl border border-highlight bg-paper px-4 py-3 text-sm font-semibold outline-none" placeholder="학생 분석, 피드백 문구, 수업 개입 전략 등을 물어보세요" />
        <button onClick={handleSend} disabled={loading} className="px-5 py-3 rounded-xl bg-accent text-white text-sm font-black disabled:opacity-50">{loading ? "..." : "전송"}</button>
      </div>
    </div>
  );
};

export default SecureTeacherChat;
