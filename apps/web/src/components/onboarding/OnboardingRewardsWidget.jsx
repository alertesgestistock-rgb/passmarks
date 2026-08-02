import React, { useState, useEffect, useRef } from 'react';
import { Gift, ChevronDown, ChevronUp, Check, MessageSquare, Phone, Users, Coins, FileText, Layers, Flame, HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/UserContext';
import { useOnboardingProgress } from '@/hooks/useOnboardingProgress';
import { ONBOARDING_REWARD_TOTAL } from '@/lib/onboardingRewards';
import AcquisitionSourceModal from './AcquisitionSourceModal';
import PhoneBonusModal from './PhoneBonusModal';

const STEPS = [
  { key: 'acquisition_source', icon: HelpCircle, page: null, modal: 'acquisition', color: '#3B82F6',
    fr: { title: 'Comment as-tu connu PassMark ?', todo: 'Réponds en 10 secondes' },
    en: { title: 'How did you hear about PassMark?', todo: 'Answer in 10 seconds' } },
  { key: 'phone', icon: Phone, page: null, modal: 'phone', color: '#22C55E',
    fr: { title: 'Ajouter ton numéro', todo: 'Pour les rappels d’examen' },
    en: { title: 'Add your phone number', todo: 'For exam reminders' } },
  { key: 'first_ai_question', icon: MessageSquare, page: 'tutor', color: '#22C55E',
    fr: { title: 'Poser ta 1ère question à l’IA', todo: 'Ouvre l’AI Tutor' },
    en: { title: 'Ask your 1st AI question', todo: 'Open the AI Tutor' } },
  { key: 'referral_signup', icon: Users, page: 'referrals', color: '#A855F7',
    fr: { title: 'Parrainer un ami', todo: 'Partage ton lien' },
    en: { title: 'Refer a friend', todo: 'Share your link' } },
  { key: 'first_token_purchase', icon: Coins, page: null, shop: true, color: '#F97316',
    fr: { title: 'Acheter tes premiers tokens', todo: 'Ouvre la boutique' },
    en: { title: 'Buy your first tokens', todo: 'Open the token shop' } },
  { key: 'first_paper_read', icon: FileText, page: 'papers', color: '#3B82F6',
    fr: { title: 'Consulter un sujet d’examen', todo: 'Ouvre Past Papers' },
    en: { title: 'Open a past paper', todo: 'Open Past Papers' } },
  { key: 'four_tools', icon: Layers, page: null, color: '#A855F7',
    fr: { title: 'Explorer 4 outils', todo: 'Quiz, IA Tutor, Calendrier, Past Papers' },
    en: { title: 'Explore 4 tools', todo: 'Quiz, AI Tutor, Calendar, Past Papers' } },
  { key: 'seven_day_streak', icon: Flame, page: 'tutor', action: 'continue_streak', color: '#EF4444',
    fr: { title: 'Utiliser l’IA Tutor 7 jours de suite', todo: 'Série actuelle' },
    en: { title: 'Use the AI Tutor 7 days in a row', todo: 'Current streak' } },
];

export default function OnboardingRewardsWidget({ navigate, dismissible = false }) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const { refreshTokenBalance } = useUser();
  const { progress, loading, refetch } = useOnboardingProgress();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('pm_onboarding_rewards_collapsed') === '1');
  const [modal, setModal] = useState(null); // 'acquisition' | 'phone'
  const [claiming, setClaiming] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const handleOpen = () => { setCollapsed(false); ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    if (sessionStorage.getItem('pm_open_onboarding_rewards') === '1') {
      sessionStorage.removeItem('pm_open_onboarding_rewards');
      handleOpen();
    }
    window.addEventListener('open-onboarding-rewards', handleOpen);
    return () => window.removeEventListener('open-onboarding-rewards', handleOpen);
  }, []);

  if (loading || !progress) return null;

  const completed = STEPS.filter(s => progress[s.key]?.claimed).length;
  const finished = completed === STEPS.length;
  if (finished && dismissible) return null;

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      localStorage.setItem('pm_onboarding_rewards_collapsed', !prev ? '1' : '0');
      return !prev;
    });
  };

  const claim = async (rewardKey) => {
    setClaiming(rewardKey);
    try {
      const { data } = await supabase.rpc('claim_onboarding_reward', { p_reward_type: rewardKey });
      if (data?.success) {
        refreshTokenBalance();
        refetch();
      }
    } finally {
      setClaiming(null);
    }
  };

  const act = (step) => {
    const state = progress[step.key];
    if (state?.claimed) return;
    if (state?.eligible) { claim(step.key); return; }
    if (step.modal === 'acquisition') { setModal('acquisition'); return; }
    if (step.modal === 'phone') { setModal('phone'); return; }
    if (step.shop) { window.passmarkOpenTokenShop?.(); return; }
    if (step.page) { navigate ? navigate(step.page) : window.passmarkNavigate?.(step.page); }
  };

  return (
    <div ref={ref} className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-[#334155]/50 overflow-hidden">
      <button
        onClick={toggleCollapsed}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F97316]/10 text-[#F97316] flex items-center justify-center shrink-0">
            <Gift size={20} />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">
              {lang === 'fr' ? 'Récompenses de bienvenue' : 'Welcome rewards'}
            </h3>
            <p className="text-[12px] text-slate-500 dark:text-[#94A3B8]">
              {lang === 'fr'
                ? `Débloque jusqu'à ${ONBOARDING_REWARD_TOTAL} tokens gratuits avec tes premiers pas.`
                : `Unlock up to ${ONBOARDING_REWARD_TOTAL} free tokens with your first steps.`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[14px] font-bold text-slate-900 dark:text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {completed} / {STEPS.length}
          </span>
          {collapsed ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronUp size={18} className="text-slate-400" />}
        </div>
      </button>

      {!collapsed && (
        <>
          <div className="px-5 pb-1">
            <div className="h-2 rounded-full bg-slate-100 dark:bg-[#0F172A] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#F97316] to-[#EF4444] transition-all"
                style={{ width: `${(completed / STEPS.length) * 100}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-5">
            {STEPS.map(step => {
              const state = progress[step.key] || {};
              const Icon = step.icon;
              const copy = lang === 'fr' ? step.fr : step.en;
              const isStreak = step.key === 'seven_day_streak';

              return (
                <div
                  key={step.key}
                  className={cn(
                    'rounded-xl p-3.5 border transition-all',
                    state.claimed
                      ? 'bg-[#22C55E]/5 border-[#22C55E]/30'
                      : 'bg-slate-50 dark:bg-white/5 border-transparent'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${step.color}1A`, color: step.color }}
                    >
                      {state.claimed ? <Check size={18} /> : <Icon size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">{copy.title}</h4>
                        <span className="text-[11px] font-bold text-[#F97316] shrink-0">+{state.tokens ?? '?'}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-[#94A3B8] mt-0.5">
                        {isStreak
                          ? (lang === 'fr'
                              ? `Série actuelle : ${state.current_streak ?? 0}/7 jours`
                              : `Current streak: ${state.current_streak ?? 0}/7 days`)
                          : copy.todo}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => act(step)}
                    disabled={state.claimed || claiming === step.key}
                    className={cn(
                      'w-full mt-3 py-2 rounded-lg text-[12px] font-semibold transition-colors',
                      state.claimed
                        ? 'bg-transparent text-[#22C55E] cursor-default'
                        : state.eligible
                          ? 'bg-[#22C55E] text-[#052e16] hover:brightness-105'
                          : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-[#94A3B8] hover:bg-slate-200 dark:hover:bg-white/20'
                    )}
                  >
                    {state.claimed
                      ? (lang === 'fr' ? '✓ Complété' : '✓ Done')
                      : claiming === step.key
                        ? (lang === 'fr' ? 'Réclamation...' : 'Claiming...')
                        : state.eligible
                          ? (lang === 'fr' ? 'Réclamer' : 'Claim')
                          : (lang === 'fr' ? 'Continuer' : 'Continue')}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {modal === 'acquisition' && (
        <AcquisitionSourceModal onClose={() => setModal(null)} onClaimed={() => { refreshTokenBalance(); refetch(); }} />
      )}
      {modal === 'phone' && (
        <PhoneBonusModal onClose={() => setModal(null)} onClaimed={() => { refreshTokenBalance(); refetch(); }} />
      )}
    </div>
  );
}
