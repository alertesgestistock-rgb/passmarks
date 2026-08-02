import React, { useState, useEffect } from 'react';
import { Gift, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { ONBOARDING_REWARD_KEYS } from '@/lib/onboardingRewards';

// Rendered `fixed` (not `sticky`) and as a sibling of <main>, not inside it —
// <main> has overflow-hidden, which breaks sticky's space reservation and
// makes the banner overlap the page content instead of pushing it down.
// onVisibleChange lets MainLayout reserve the matching top padding on <main>.
export function OnboardingRewardsBanner({ onVisibleChange }) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const { progress, loading } = useOnboardingProgress();
  // Dismiss is intentionally session-only (plain state, no localStorage):
  // it should reappear on refresh / next visit until all 8 steps are claimed.
  const [dismissed, setDismissed] = useState(false);

  const completed = progress ? ONBOARDING_REWARD_KEYS.filter(k => progress[k]?.claimed).length : 0;
  const total = ONBOARDING_REWARD_KEYS.length;
  const shouldShow = !loading && !!progress && !dismissed && completed < total;

  useEffect(() => {
    onVisibleChange?.(shouldShow);
    return () => onVisibleChange?.(false);
  }, [shouldShow]);

  if (!shouldShow) return null;

  const remainingTokens = ONBOARDING_REWARD_KEYS
    .filter(k => !progress[k]?.claimed)
    .reduce((sum, k) => sum + (progress[k]?.tokens || 0), 0);

  const handleOpen = () => {
    sessionStorage.setItem('pm_open_onboarding_rewards', '1');
    window.passmarkNavigate?.('home');
    window.dispatchEvent(new Event('open-onboarding-rewards'));
  };

  const handleDismiss = (e) => {
    e.stopPropagation();
    setDismissed(true);
  };

  return (
    <div
      onClick={handleOpen}
      className="fixed top-[64px] left-0 right-0 lg:left-[220px] xl:left-[260px] z-30 px-4 lg:px-8 py-2.5 flex items-center justify-between gap-3 cursor-pointer bg-orange-50/90 dark:bg-[#1E293B]/90 backdrop-blur-md border-b border-[#F97316]/20"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Gift size={16} className="text-[#F97316] shrink-0" />
        <span className="text-[12px] md:text-[13px] font-medium text-slate-700 dark:text-[#F1F5F9] truncate">
          {lang === 'fr'
            ? `Encore ${remainingTokens} tokens gratuits à récupérer — ${completed}/${total} étapes terminées.`
            : `${remainingTokens} free tokens still up for grabs — ${completed}/${total} steps done.`}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="hidden sm:inline text-[12px] font-bold text-[#F97316] whitespace-nowrap">
          {lang === 'fr' ? 'Voir mes récompenses →' : 'See my rewards →'}
        </span>
        <button
          onClick={handleDismiss}
          className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
