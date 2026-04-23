import { ShieldCheck } from "lucide-react";

const AccountStatusScreen = ({ title, body, onLogout }: { title: string; body: string; onLogout: () => Promise<void> }) => (
  <div className="min-h-screen bg-paper flex items-center justify-center p-4">
    <div className="max-w-md w-full bg-white rounded-3xl border border-highlight shadow-xl p-10 text-center space-y-5">
      <ShieldCheck size={40} className="mx-auto text-accent" />
      <h1 className="text-2xl font-black text-ink uppercase tracking-tight">{title}</h1>
      <p className="text-sm text-secondary-text font-semibold leading-relaxed">{body}</p>
      <div className="flex justify-center gap-3">
        <button onClick={onLogout} className="px-5 py-3 rounded-2xl bg-ink text-white text-xs font-black uppercase tracking-widest">로그아웃</button>
      </div>
    </div>
  </div>
);

export default AccountStatusScreen;
