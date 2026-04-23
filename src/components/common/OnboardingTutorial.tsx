import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";
import { cn } from "../../lib/utils";

const TUTORIAL_STEPS = {
  student: [
    {
      id: 'student-chat-area',
      title: 'AI 튜터 채팅',
      description: '이곳에서 수학 문제나 개념을 자유롭게 질문할 수 있습니다.',
    },
    {
      id: 'student-chat-history',
      title: '대화 기록',
      description: '이전에 학습한 기록을 확인하고 이어서 학습할 수 있습니다.',
    },
    {
      id: 'student-settings-btn',
      title: '맞춤 학습 설정',
      description: '학습 목표와 선호하는 설명 방식을 설정하면 더 개인화된 도움을 받을 수 있습니다.',
    },
    {
      id: 'student-file-upload',
      title: '파일 및 이미지 업로드',
      description: '사진이나 PDF를 업로드하여 문제 풀이 도움을 받을 수 있습니다.',
    },
    {
      id: null,
      title: '학습 시작!',
      description: '이제 AI 튜터와 함께 나만의 학습을 시작해보세요!',
    }
  ],
  teacher: [
    {
      id: 'teacher-sidebar',
      title: '메인 메뉴',
      description: '좌측 사이드바를 통해 학생 분석, 학급 관리 등 모든 기능에 접근할 수 있습니다.',
    },
    {
      id: 'teacher-stats-container',
      title: '학급 전반 요약',
      description: '우리 반 전체의 실시간 평균 성취도와 주요 통계를 한눈에 확인하세요.',
    },
    {
      id: 'teacher-insights-card',
      title: 'AI 학급 인사이트',
      description: 'AI가 학생들의 학습 패턴을 분석하여 교사에게 필요한 맞춤형 교수법을 제안합니다.',
    },
    {
      id: 'teacher-analysis-link',
      title: '학생 상세 분석',
      description: '개별 학생의 대화 기록과 오개념 리포트를 자세히 분석하려면 이곳을 이용하세요.',
    },
    {
      id: null,
      title: '준비 완료!',
      description: '이제 스마트한 AI 학급 관리를 시작해 보세요.',
    }
  ]
};

const OnboardingTutorial = ({ role, onComplete }: { role: 'student' | 'teacher', onComplete: () => void }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState<{ top: number, left: number, width: number, height: number } | null>(null);

  const currentRoleSteps = TUTORIAL_STEPS[role];

  useEffect(() => {
    const updateCoords = () => {
      const step = currentRoleSteps[currentStep];
      if (step.id) {
        const el = document.getElementById(step.id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const rect = el.getBoundingClientRect();
          setCoords({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
          });
          return;
        }
      }
      setCoords(null);
    };

    const timer = setTimeout(updateCoords, 350);
    window.addEventListener('resize', updateCoords);
    window.addEventListener('scroll', updateCoords, true);

    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
      clearTimeout(timer);
    };
  }, [currentStep, role, currentRoleSteps]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onComplete();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, onComplete]);

  const handleNext = () => {
    if (currentStep < currentRoleSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  const tooltipStyle = coords && !isMobile ? (() => {
    const margin = 20;
    const tooltipWidth = 400;
    const tooltipHeight = 260;

    let top = coords.top + coords.height + margin;
    let left = coords.left + coords.width / 2 - tooltipWidth / 2;

    if (top + tooltipHeight > window.innerHeight) {
      top = coords.top - tooltipHeight - margin;
    }

    left = Math.max(margin, Math.min(window.innerWidth - tooltipWidth - margin, left));

    return {
      position: 'fixed' as const,
      top: Math.max(margin, top),
      left,
      zIndex: 100001
    };
  })() : {
    position: 'fixed' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 100001
  };

  return (
    <div className="fixed inset-0 z-[99999] overflow-hidden pointer-events-none">
      <AnimatePresence>
        {coords ? (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute bg-[#00000080] top-0 left-0 right-0 pointer-events-auto" style={{ height: coords.top }} />
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute bg-[#00000080] bottom-0 left-0 right-0 pointer-events-auto" style={{ top: coords.top + coords.height }} />
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute bg-[#00000080] left-0 pointer-events-auto" style={{ top: coords.top, height: coords.height, width: coords.left }} />
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute bg-[#00000080] right-0 pointer-events-auto" style={{ top: coords.top, height: coords.height, left: coords.left + coords.width }} />
          </>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-[#00000080] pointer-events-auto" />
        )}
      </AnimatePresence>

      <div className="relative w-full h-full pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.95, y: isMobile ? 20 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "bg-white dark:bg-gray-900 rounded-[12px] border border-blue-100 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.2)] w-[90%] max-w-[400px] pointer-events-auto relative overflow-hidden"
            )}
            style={tooltipStyle}
          >
            {/* Step Indicator Bar */}
            <div className="h-1.5 w-full bg-gray-100 relative">
              <motion.div
                className="h-full bg-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${((currentStep + 1) / currentRoleSteps.length) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            <div className="p-8">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded uppercase tracking-wider">
                      단계 {currentStep + 1} / {currentRoleSteps.length}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                    {currentRoleSteps[currentStep].title}
                  </h3>
                </div>
                <button
                  onClick={onComplete}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <p className="text-sm font-medium text-[#444] dark:text-gray-400 leading-relaxed mb-8">
                {currentRoleSteps[currentStep].description}
              </p>

              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={onComplete}
                  className="px-2 py-1 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
                >
                  건너뛰기
                </button>

                <div className="flex gap-2">
                  {currentStep > 0 && (
                    <button
                      onClick={handlePrev}
                      className="px-4 py-2 border border-gray-200 text-sm font-bold text-gray-600 rounded-lg hover:bg-gray-50 transition-all flex items-center gap-2"
                    >
                      <ArrowLeft size={16} />
                    </button>
                  )}
                  <button
                    onClick={handleNext}
                    className="px-6 py-2.5 bg-[#3B82F6] text-white rounded-lg font-bold text-sm hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 group"
                  >
                    {currentStep === currentRoleSteps.length - 1 ? (
                      <>완료 <CheckCircle size={18} /></>
                    ) : (
                      <>다음 <ArrowRight size={18} /></>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {coords && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute border-[3px] border-[#3B82F6] shadow-[0_0_20px_rgba(59,130,246,0.6)] rounded-lg pointer-events-none z-[100000]"
            style={{
              top: coords.top - 4,
              left: coords.left - 4,
              width: coords.width + 8,
              height: coords.height + 8
            }}
          />
        )}
      </div>
    </div>
  );
};

export default OnboardingTutorial;
