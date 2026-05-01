import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { History, ClipboardCheck } from "lucide-react";
import { supabase } from "../../supabase";
import { UserProfile } from "../../lib/ai";

const StudentHistory = ({ profile }: { profile: UserProfile | null }) => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!profile) return;
      try {
        const { data, error } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setSessions(data || []);
      } catch (err) {
        console.error("Error fetching history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [profile]);

  const openSession = (sessId: string) => {
    localStorage.setItem('ACTIVE_SESSION_ID', sessId);
    navigate('/student');
  };

  return (
    <div className="space-y-8 p-4 overflow-y-auto h-full pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-ink uppercase tracking-tighter">학습 기록</h2>
          <p className="text-xs text-secondary-text font-bold">대화 카드를 클릭하면 해당 대화로 이동합니다.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-accent">
          <span className="w-2 h-2 bg-accent rounded-full"></span> 총 {sessions.length}개의 세션
        </div>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-white rounded-xl border border-highlight" />)}
        </div>
      ) : sessions.length === 0 ? (
        <div className="h-[400px] flex flex-col items-center justify-center text-gray-300 gap-4">
          <History size={48} className="opacity-20" />
          <p className="font-bold text-sm">대화 기록이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map(sess => (
            <button
              key={sess.id}
              onClick={() => openSession(sess.id)}
              className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-highlight hover:border-accent hover:shadow-lg transition-all group cursor-pointer relative overflow-hidden text-left"
            >
              <div className="flex justify-between items-start mb-6">
                <span className="text-[10px] font-black uppercase tracking-widest text-accent bg-paper px-2.5 py-1 rounded border border-highlight">
                  {new Date(sess.created_at).toLocaleDateString()}
                </span>
              </div>
              <h3 className="text-lg font-bold mb-4 text-ink group-hover:text-accent transition-colors leading-tight">{sess.title}</h3>
              <div className="flex items-center gap-4 text-[10px] font-bold text-secondary-text uppercase tracking-widest">
                <div className="flex items-center gap-1.5">
                  <ClipboardCheck size={12} className="text-green-500" /> 클릭하여 대화로 이동
                </div>
              </div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-accent/5 rounded-bl-full -mr-12 -mt-12 group-hover:bg-accent/10 transition-colors" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentHistory;
