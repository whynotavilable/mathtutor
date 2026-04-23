import { Link } from "react-router-dom";
import { UserProfile } from "../../lib/ai";
import { isAdminUser } from "../../lib/userUtils";

const TeacherSettingsPanel = ({
  profile,
  selectedClassKey,
  pendingCount,
}: {
  profile: UserProfile | null;
  selectedClassKey: string;
  pendingCount: number;
}) => {
  const isAdmin = isAdminUser(profile);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black text-ink uppercase tracking-tighter">교사 설정</h2>
        <p className="mt-2 text-xs font-bold uppercase tracking-widest text-secondary-text">운영, 승인, 학급 지침, 자료 관리 기능을 한 곳에서 정리합니다.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-highlight bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-secondary-text">계정</p>
          <p className="mt-3 text-xl font-black text-ink">{profile?.name || "-"}</p>
          <p className="mt-1 text-sm font-semibold text-secondary-text">{profile?.email || "-"}</p>
          <p className="mt-4 text-xs font-bold text-accent">{isAdmin ? "관리자 권한 활성" : "일반 교사 계정"}</p>
        </div>
        <div className="rounded-2xl border border-highlight bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-secondary-text">현재 학급</p>
          <p className="mt-3 text-xl font-black text-ink">{selectedClassKey ? selectedClassKey.replace("-", "학년 ") + "반" : "전체 학급"}</p>
          <p className="mt-4 text-xs font-semibold text-secondary-text">상단 학급 선택과 연동됩니다.</p>
        </div>
        <div className="rounded-2xl border border-highlight bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-secondary-text">승인 대기</p>
          <p className="mt-3 text-3xl font-black text-ink">{pendingCount}</p>
          <p className="mt-4 text-xs font-semibold text-secondary-text">신규 가입 승인 요청 건수</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Link to="/teacher/analysis" className="rounded-2xl border border-highlight bg-white p-6 shadow-sm transition-all hover:border-accent hover:shadow-md">
          <p className="text-[10px] font-black uppercase tracking-widest text-accent">학생 분석</p>
          <h3 className="mt-3 text-xl font-black text-ink">개별 학생 분석 보기</h3>
          <p className="mt-2 text-sm font-semibold text-secondary-text">학습 보고서, 대화 기록, md 아카이브를 한 번에 확인합니다.</p>
        </Link>
        <Link to="/teacher/curriculum" className="rounded-2xl border border-highlight bg-white p-6 shadow-sm transition-all hover:border-accent hover:shadow-md">
          <p className="text-[10px] font-black uppercase tracking-widest text-accent">교육과정</p>
          <h3 className="mt-3 text-xl font-black text-ink">학급별 교육과정 관리</h3>
          <p className="mt-2 text-sm font-semibold text-secondary-text">단원, 목표, 운영 상태를 정리합니다.</p>
        </Link>
        <Link to="/teacher/resources" className="rounded-2xl border border-highlight bg-white p-6 shadow-sm transition-all hover:border-accent hover:shadow-md">
          <p className="text-[10px] font-black uppercase tracking-widest text-accent">교과자료</p>
          <h3 className="mt-3 text-xl font-black text-ink">자료 업로드 및 보관</h3>
          <p className="mt-2 text-sm font-semibold text-secondary-text">수업안, PDF, 예시 문항을 Storage에 보관합니다.</p>
        </Link>
        <Link to="/teacher/chat" className="rounded-2xl border border-highlight bg-white p-6 shadow-sm transition-all hover:border-accent hover:shadow-md">
          <p className="text-[10px] font-black uppercase tracking-widest text-accent">교사 채팅</p>
          <h3 className="mt-3 text-xl font-black text-ink">md 기반 수업 보조</h3>
          <p className="mt-2 text-sm font-semibold text-secondary-text">학생 학습 이력을 근거로 피드백과 개입 전략을 만듭니다.</p>
        </Link>
        <div className="rounded-2xl border border-highlight bg-white p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-accent">학급 지침</p>
          <h3 className="mt-3 text-xl font-black text-ink">상단 대시보드에서 관리</h3>
          <p className="mt-2 text-sm font-semibold text-secondary-text">대시보드의 "학급 학습 지시문 설정"에서 전체 학생에게 바로 적용합니다.</p>
        </div>
        {isAdmin ? (
          <Link to="/teacher/approvals" className="rounded-2xl border border-highlight bg-white p-6 shadow-sm transition-all hover:border-accent hover:shadow-md">
            <p className="text-[10px] font-black uppercase tracking-widest text-accent">승인 관리</p>
            <h3 className="mt-3 text-xl font-black text-ink">회원 승인 처리</h3>
            <p className="mt-2 text-sm font-semibold text-secondary-text">학생/교사 가입 요청을 승인 또는 반려합니다.</p>
          </Link>
        ) : (
          <div className="rounded-2xl border border-highlight bg-white p-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-widest text-accent">승인 관리</p>
            <h3 className="mt-3 text-xl font-black text-ink">관리자 전용</h3>
            <p className="mt-2 text-sm font-semibold text-secondary-text">가입 승인 기능은 관리자 계정에서만 노출됩니다.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherSettingsPanel;
