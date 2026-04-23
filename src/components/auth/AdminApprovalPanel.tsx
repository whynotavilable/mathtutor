import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { UserProfile } from "../../lib/ai";
import { getClassLabel } from "../../lib/userUtils";

const AdminApprovalPanel = () => {
  const [requests, setRequests] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("users").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Failed to fetch approval requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id: string, nextStatus: "approved" | "rejected") => {
    const { error } = await supabase.from("users").update({ status: nextStatus }).eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    await fetchRequests();
  };

  const handleDeleteRecord = async (request: UserProfile) => {
    if (!window.confirm(`${request.name} (${request.email}) 승인 기록을 삭제할까요? 계정도 함께 삭제됩니다.`)) return;
    const { error } = await supabase.from("users").delete().eq("id", request.id);
    if (error) {
      alert(error.message);
      return;
    }
    await fetchRequests();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-ink uppercase tracking-tighter">Enrollment Approvals</h2>
          <p className="text-xs text-secondary-text font-bold uppercase tracking-widest">관리자 전용 승인 화면</p>
        </div>
        <button onClick={fetchRequests} className="px-4 py-2 rounded-xl border border-highlight text-xs font-black text-ink hover:bg-paper transition-all">새로고침</button>
      </div>
      <div className="bg-white rounded-xl border border-highlight overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-paper border-b border-highlight">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-accent uppercase tracking-widest">이름</th>
                <th className="px-6 py-4 text-[10px] font-black text-accent uppercase tracking-widest">이메일</th>
                <th className="px-6 py-4 text-[10px] font-black text-accent uppercase tracking-widest">역할</th>
                <th className="px-6 py-4 text-[10px] font-black text-accent uppercase tracking-widest">학급</th>
                <th className="px-6 py-4 text-[10px] font-black text-accent uppercase tracking-widest">상태</th>
                <th className="px-6 py-4 text-[10px] font-black text-accent uppercase tracking-widest text-right">처리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-highlight">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm font-bold text-gray-400">불러오는 중...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm font-bold text-gray-400">가입 요청이 없습니다.</td></tr>
              ) : requests.map((request) => (
                <tr key={request.id}>
                  <td className="px-6 py-4 text-sm font-black text-ink">{request.name}</td>
                  <td className="px-6 py-4 text-xs font-semibold text-secondary-text">{request.email}</td>
                  <td className="px-6 py-4 text-xs font-bold uppercase">{request.role}</td>
                  <td className="px-6 py-4 text-xs font-bold text-secondary-text">{request.role === "student" ? getClassLabel(request) : "-"}</td>
                  <td className="px-6 py-4 text-xs font-bold uppercase">{request.status}</td>
                  <td className="px-6 py-4 text-right">
                    {request.status === "pending" ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleDeleteRecord(request)} className="px-3 py-1.5 rounded-lg border border-highlight text-xs font-black text-red-500 hover:bg-red-50 transition-all">기록 삭제</button>
                        <button onClick={() => handleApprove(request.id, "rejected")} className="px-3 py-1.5 rounded-lg border border-highlight text-xs font-black text-red-500 hover:bg-red-50 transition-all">거절</button>
                        <button onClick={() => handleApprove(request.id, "approved")} className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-black hover:bg-sidebar transition-all">승인</button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <span className="inline-flex items-center text-[10px] text-gray-400 font-bold">처리 완료</span>
                        <button onClick={() => handleDeleteRecord(request)} className="px-3 py-1.5 rounded-lg border border-highlight text-xs font-black text-red-500 hover:bg-red-50 transition-all">기록 삭제</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminApprovalPanel;
