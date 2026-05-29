import React, { useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import CardSpotlight from '@/components/ui/CardSpotlight';
import GlowBackground from '@/components/ui/GlowBackground';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';

function Reveal({ children, delay = 0, x = 0, y = 20 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, x, y }}
      animate={inView ? { opacity: 1, x: 0, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

export default function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const goAuth = (tab = 'signup') => { 
    navigate(`/auth?tab=${tab}`); 
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0F172A] text-slate-900 dark:text-[#F1F5F9] font-sans antialiased overflow-x-hidden transition-colors duration-300">
      
      {/* Centralized Header */}
      <Header />

      {/* ── Hero Section ── */}
      <section className="relative pt-24 md:pt-36 pb-16 overflow-hidden flex flex-col items-center justify-center">
        <GlowBackground color="#22c55e" size={600} intensity={0.07} className="top-[-10%] left-1/2 -translate-x-1/2" />
        <GlowBackground color="#3b82f6" size={400} intensity={0.04} className="bottom-[5%] right-[-10%]" />
        
        <div className="w-full max-w-6xl mx-auto px-4 md:px-6 flex flex-col lg:flex-row items-center justify-between gap-12 z-10">
          
          {/* Copywriting & CTAs */}
          <div className="flex-1 space-y-6 text-center lg:text-left flex flex-col items-center lg:items-start">
            <Reveal>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#14532D]/10 dark:bg-[#14532D]/70 border border-[#22C55E]/30 text-emerald-800 dark:text-[#86EFAC] text-xs font-semibold uppercase tracking-wider shadow-[0_0_15px_rgba(34,197,94,0.05)]">
                {t('landing.hero.badge')}
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.1] max-w-2xl text-slate-900 dark:text-white">
                {t('landing.hero.headline_1')}{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#22C55E] to-[#86EFAC] drop-shadow-[0_2px_10px_rgba(34,197,94,0.1)]">
                  {t('landing.hero.headline_highlight')}
                </span>
              </h1>
            </Reveal>

            <Reveal delay={0.16}>
              <p className="text-sm sm:text-base md:text-lg text-slate-600 dark:text-[#94A3B8] max-w-xl leading-relaxed text-balance">
                {t('landing.hero.description')}
              </p>
            </Reveal>

            <Reveal delay={0.24}>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <button 
                  onClick={() => goAuth('signup')}
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold bg-[#22C55E] text-[#052e16] shadow-[0_0_24px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {t('landing.hero.cta_primary')} <ArrowRight size={16} />
                </button>
                <Link 
                  to="/how-it-works"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-white active:scale-95 transition-all text-center"
                >
                  {t('landing.hero.cta_secondary')}
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.32}>
              <p className="text-[11px] text-slate-500 dark:text-[#64748B] font-semibold tracking-wide uppercase">
                {t('landing.hero.trust')}
              </p>
            </Reveal>
          </div>

          {/* Interactive Mockup Screens (overlapping dynamic cards) */}
          <div className="flex-1 w-full flex items-center justify-center lg:justify-end relative select-none">
            <div className="relative flex items-center justify-center w-full max-w-md h-[400px]">
              
              {/* Back card: Student dashboard preview */}
              <div className="w-[280px] md:w-[310px] bg-white dark:bg-[#0F172A] border-[4px] border-slate-200 dark:border-[#334155] rounded-[36px] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.15)] dark:shadow-[0_30px_60px_rgba(0,0,0,0.6)] flex flex-col scale-95 origin-right translate-x-4 md:translate-x-8 opacity-85 shrink-0 hidden sm:flex transition-transform hover:scale-98">
                {/* Phone Notch header */}
                <div className="h-6 bg-slate-100 dark:bg-slate-950 flex items-center justify-center relative">
                  <div className="w-24 h-4 bg-slate-200 dark:bg-black rounded-b-xl absolute top-0" />
                </div>
                {/* Simulated App Bar */}
                <div className="px-4 py-3 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-slate-900/40">
                  <span className="text-xs font-black text-slate-800 dark:text-white">{t('landing.hero.phone_greeting')}</span>
                  <span className="text-[9px] font-bold bg-[#14532D]/10 dark:bg-[#14532D] text-emerald-800 dark:text-[#86EFAC] px-2 py-0.5 rounded-full">{t('landing.hero.phone_days')}</span>
                </div>
                {/* Screen contents */}
                <div className="p-3.5 space-y-3.5 bg-white dark:bg-slate-950/20 flex-1">
                  {/* Streak widget */}
                  <div className="p-3 bg-slate-50 dark:bg-[#1E293B]/60 border border-slate-200 dark:border-white/5 rounded-2xl flex items-center justify-between">
                    <div>
                      <div className="text-[8px] text-slate-500 dark:text-[#64748B] font-bold uppercase tracking-wider">{t('landing.features.f3_title')}</div>
                      <div className="text-xs font-bold text-slate-800 dark:text-white mt-0.5">🔥 12 days streak</div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#F97316]/10 flex items-center justify-center text-sm">🔥</div>
                  </div>
                  {/* Stats widget */}
                  <div className="p-3 bg-slate-50 dark:bg-[#1E293B]/60 border border-slate-200 dark:border-white/5 rounded-2xl space-y-2">
                    <div className="text-[8px] text-slate-500 dark:text-[#64748B] font-bold uppercase tracking-wider">{t('landing.hero.phone_questions')}</div>
                    <div className="grid grid-cols-7 gap-1">
                      {[1, 2, 3, 4, 5, 6, 7].map((d, i) => (
                        <div key={i} className="flex flex-col items-center gap-1">
                          <div className={`w-full aspect-square rounded-sm ${
                            i === 5 ? 'bg-[#22C55E]' : 'bg-[#3B82F6]/60'
                          }`} />
                          <span className="text-[7px] text-slate-400 dark:text-[#475569]">M</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Quick menu navigation grid */}
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="p-2.5 bg-slate-50 dark:bg-[#1E293B]/40 border border-slate-200 dark:border-white/5 rounded-xl text-center flex flex-col items-center gap-1">
                      <span className="text-xs">🤖</span>
                      <span className="text-[9px] font-bold text-slate-700 dark:text-[#94A3B8]">{t('landing.hero.phone_ai_tutor')}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 dark:bg-[#1E293B]/40 border border-slate-200 dark:border-white/5 rounded-xl text-center flex flex-col items-center gap-1">
                      <span className="text-xs">📄</span>
                      <span className="text-[9px] font-bold text-slate-700 dark:text-[#94A3B8]">{t('landing.hero.phone_past_papers')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Front card: Chat with AI Tutor */}
              <div className="w-[290px] md:w-[325px] shrink-0 bg-white dark:bg-[#0F172A] border-[5px] border-slate-200 dark:border-[#334155] rounded-[42px] overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.1)] dark:shadow-[0_30px_70px_rgba(0,0,0,0.8)] flex flex-col z-20 transform transition-transform hover:scale-102">
                {/* Notch */}
                <div className="h-6 bg-slate-100 dark:bg-slate-950 flex items-center justify-center relative">
                  <div className="w-28 h-4.5 bg-slate-200 dark:bg-black rounded-b-2xl absolute top-0" />
                </div>
                {/* Header */}
                <div className="px-4 py-3 border-b border-slate-200 dark:border-white/5 flex items-center gap-2 bg-slate-50 dark:bg-slate-900/60">
                  <div className="w-7 h-7 rounded-full bg-[#3B82F6]/10 flex items-center justify-center text-sm">🤖</div>
                  <div>
                    <div className="text-[10px] font-bold text-slate-800 dark:text-white">{t('landing.hero.phone_ai_tutor')}</div>
                    <div className="text-[8px] text-[#22C55E] flex items-center gap-1 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                      Active 24/7
                    </div>
                  </div>
                </div>
                {/* Chat items */}
                <div className="p-3.5 space-y-3.5 bg-white dark:bg-slate-950/30 flex-1 min-h-[280px] flex flex-col justify-end">
                  {/* User message */}
                  <div className="px-3.5 py-2.5 rounded-2xl rounded-tr-sm bg-[#1E3A5F]/10 dark:bg-[#1E3A5F]/80 border border-[#3B82F6]/20 text-slate-800 dark:text-white text-xs max-w-[85%] self-end">
                    {t('landing.hero.phone_question')}
                  </div>
                  {/* AI message */}
                  <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-slate-50 dark:bg-[#1E293B]/90 border border-slate-200 dark:border-white/5 text-slate-600 dark:text-[#94A3B8] text-xs max-w-[90%] self-start space-y-1.5 leading-relaxed">
                    <p>{t('landing.hero.phone_answer')}</p>
                    <div className="text-[9px] bg-[#14532D]/10 dark:bg-[#14532D]/70 border border-[#22C55E]/30 rounded-md p-1.5 text-emerald-800 dark:text-[#86EFAC] font-mono leading-tight">
                      ✓ GCE Grade A Solution
                    </div>
                  </div>
                  {/* Chat input box */}
                  <div className="mt-2 p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 flex justify-between items-center gap-2">
                    <span className="text-[10px] text-slate-400 dark:text-[#475569]">{t('landing.hero.phone_ask_placeholder')}</span>
                    <div className="w-6 h-6 rounded-lg bg-[#22C55E] flex items-center justify-center text-xs text-[#052e16] font-bold">⚡</div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ── Social Proof Row ── */}
      <Reveal delay={0.4}>
        <div className="border-y border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#1E293B]/20 py-8 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              [t('landing.social.stat_students'), t('landing.social.students'), '#22C55E'],
              [t('landing.social.stat_subjects'), t('landing.social.subjects'), '#3B82F6'],
              [t('landing.social.stat_papers'), t('landing.social.papers'), '#F97316'],
              [t('landing.social.stat_availability'), t('landing.social.availability'), '#A78BFA'],
            ].map(([num, label, color]) => (
              <div key={label} className="text-center space-y-1">
                <div className="text-2xl md:text-3xl font-black" style={{ color }}>{num}</div>
                <div className="text-[10px] sm:text-xs text-slate-500 dark:text-[#64748B] font-semibold tracking-wide uppercase">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      {/* ── Problem Section ── */}
      <section className="py-20 px-4 max-w-6xl mx-auto">
        <Reveal>
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-orange-100 dark:bg-[#431407] border border-orange-200 dark:border-[#F97316]/30 text-orange-800 dark:text-[#FDBA74] text-xs font-semibold uppercase tracking-wider">
              {t('landing.problem.label')}
            </span>
            <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">{t('landing.problem.headline')}</h2>
            <p className="text-sm md:text-base text-slate-500 dark:text-[#94A3B8] leading-relaxed">{t('landing.problem.description')}</p>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { emoji: '🧪', bg: 'rgba(59,130,246,0.12)', border: 'border-[#3B82F6]/20', key: 'card1' },
            { emoji: '💸', bg: 'rgba(249,115,22,0.12)', border: 'border-[#F97316]/20', key: 'card2' },
            { emoji: '🔌', bg: 'rgba(34,197,94,0.12)', border: 'border-[#22C55E]/20', key: 'card3' },
          ].map(({ emoji, bg, border, key }) => (
            <Reveal key={key} delay={0.1}>
              <CardSpotlight className={`p-6 border bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 h-full ${border}`}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-5" style={{ backgroundColor: bg }}>
                  {emoji}
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">{t(`landing.problem.${key}_title`)}</h3>
                <p className="text-xs text-slate-500 dark:text-[#94A3B8] leading-relaxed">{t(`landing.problem.${key}_desc`)}</p>
              </CardSpotlight>
            </Reveal>
          ))}
        </div>
      </section>



      {/* ── Bento Grid Features Section ── */}
      <section id="features" className="py-20 px-4 bg-slate-50 dark:bg-[#1E293B]/10">
        <div className="max-w-6xl mx-auto">
          
          <Reveal>
            <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#14532D]/10 dark:bg-[#14532D] border border-[#22C55E]/30 text-emerald-800 dark:text-[#86EFAC] text-xs font-semibold uppercase tracking-wider">
                {t('landing.features.label')}
              </span>
              <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">{t('landing.features.headline')}</h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Bento Item 1: AI Chat */}
            <div className="lg:col-span-7">
              <CardSpotlight spotlightColor="rgba(34,197,94,0.1)" className="h-full border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1E293B]/30 flex flex-col justify-between p-6">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-[#22C55E]/10 flex items-center justify-center text-lg">🤖</div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('landing.features.f1_title')}</h3>
                  <p className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed">{t('landing.features.f1_desc')}</p>
                  <ul className="space-y-2 pt-2">
                    {[t('landing.features.f1_b1'), t('landing.features.f1_b2'), t('landing.features.f1_b3')].map(bullet => (
                      <li key={bullet} className="flex items-start gap-2 text-xs text-slate-555 dark:text-[#94A3B8]">
                        <Check size={14} className="text-[#22C55E] shrink-0 mt-0.5" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/5 pb-2 text-[10px] text-slate-500 dark:text-[#64748B] font-mono">
                    <span>Q: {t('landing.features.f1_preview_q')}</span>
                    <span className="text-[#22C55E]">Grade A check ✓</span>
                  </div>
                  <div className="space-y-1.5 text-[11px] font-mono leading-relaxed text-slate-600 dark:text-[#94A3B8]">
                    <div>{t('landing.features.f1_preview_a1')}</div>
                    <div>{t('landing.features.f1_preview_a2')}</div>
                    <div className="text-slate-800 dark:text-white font-bold">{t('landing.features.f1_preview_a4')}</div>
                  </div>
                </div>
              </CardSpotlight>
            </div>

            {/* Bento Item 2: Past Papers */}
            <div className="lg:col-span-5">
              <CardSpotlight spotlightColor="rgba(59,130,246,0.1)" className="h-full border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1E293B]/30 flex flex-col justify-between p-6">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/10 flex items-center justify-center text-lg">📚</div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('landing.features.f2_title')}</h3>
                  <p className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed">{t('landing.features.f2_desc')}</p>
                </div>

                <div className="mt-8 space-y-2">
                  {['Physics – 2023 P1', 'Chemistry – 2023 P2', 'Maths – 2022 P1'].map(paper => (
                    <div key={paper} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 flex items-center gap-2.5 text-xs text-slate-600 dark:text-[#94A3B8] font-medium">
                      <span className="text-[#3B82F6]">📄</span>
                      <span>{paper}</span>
                    </div>
                  ))}
                </div>
              </CardSpotlight>
            </div>

            {/* Bento Item 3: Streak */}
            <div className="lg:col-span-5">
              <CardSpotlight spotlightColor="rgba(249,115,22,0.1)" className="h-full border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1E293B]/30 flex flex-col justify-between p-6">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-[#F97316]/10 flex items-center justify-center text-lg">🔥</div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('landing.features.f3_title')}</h3>
                  <p className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed">{t('landing.features.f3_desc')}</p>
                </div>

                <div className="mt-8 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200 dark:border-white/5 flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((d) => (
                      <div key={d} className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${
                        d < 5 ? 'bg-[#F97316]/10 text-[#F97316] border border-[#F97316]/30' : 'bg-slate-150 dark:bg-slate-800 text-slate-400 dark:text-[#64748B] border border-slate-200 dark:border-white/5'
                      }`}>
                        {d < 5 ? '🔥' : d}
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] bg-[#F97316]/15 text-[#F97316] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Streak</span>
                </div>
              </CardSpotlight>
            </div>

            {/* Bento Item 4: Interactive Quiz */}
            <div className="lg:col-span-7">
              <CardSpotlight spotlightColor="rgba(168,85,247,0.1)" className="h-full border border-slate-200 dark:border-white/5 bg-white dark:bg-[#1E293B]/30 flex flex-col justify-between p-6">
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-lg">🏆</div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('landing.features.f4_title')}</h3>
                  <p className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed">{t('landing.features.f4_desc')}</p>
                </div>

                <div className="mt-8 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 rounded-2xl p-4 space-y-3">
                  <div className="text-[11px] font-bold text-slate-800 dark:text-white">{t('landing.features.f4_quiz_q')}</div>
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-[#14532D]/10 dark:bg-[#14532D]/40 border border-[#22C55E]/30 text-emerald-700 dark:text-[#86EFAC] text-xs font-semibold flex items-center justify-between">
                      <span>{t('landing.features.f4_quiz_a1')}</span>
                      <span>✓ Correct</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-[#94A3B8] text-xs">
                      {t('landing.features.f4_quiz_a2')}
                    </div>
                  </div>
                </div>
              </CardSpotlight>
            </div>

          </div>

          <div className="text-center mt-12">
            <button className="px-6 py-2.5 rounded-xl font-bold bg-[#22C55E] text-[#052e16] shadow-lg active:scale-95 transition-all scale-on-click" onClick={() => goAuth('signup')}>
              {t('landing.features.cta_try')}
            </button>
          </div>

        </div>
      </section>

      {/* ── How It Works Section ── */}
      <section id="how" className="py-20 px-4 border-t border-slate-200 dark:border-white/5 relative">
        <div className="max-w-6xl mx-auto">
          
          <Reveal>
            <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-blue-55 dark:bg-[#1E3A5F] border border-blue-200 dark:border-[#3B82F6]/30 text-blue-800 dark:text-[#93C5FD] text-xs font-semibold uppercase tracking-wider">
                {t('landing.how.label')}
              </span>
              <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">{t('landing.how.headline')}</h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
            <div className="hidden md:block absolute top-[28px] left-[15%] right-[15%] h-px border-t-2 border-dashed border-slate-200 dark:border-white/10 z-0" />

            {[
              { num: 1, color: '#22C55E', shadow: 'rgba(34,197,94,0.2)', key: 'step1' },
              { num: 2, color: '#3B82F6', shadow: 'rgba(59,130,246,0.2)', key: 'step2' },
              { num: 3, color: '#F97316', shadow: 'rgba(249,115,22,0.2)', key: 'step3' },
            ].map(({ num, color, shadow, key }, i) => (
              <Reveal key={key} delay={i * 0.12}>
                <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                  <div 
                    className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-black text-white"
                    style={{ backgroundColor: color, boxShadow: `0 0 20px ${shadow}` }}
                  >
                    {num}
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{t(`landing.how.${key}_title`)}</h3>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8] leading-relaxed max-w-xs">{t(`landing.how.${key}_desc`)}</p>
                </div>
              </Reveal>
            ))}
          </div>

        </div>
      </section>

      {/* ── Pricing Teaser Section ── */}
      <section className="py-20 px-4 bg-slate-50 dark:bg-[#1E293B]/5 border-t border-slate-200 dark:border-white/5">
        <div className="max-w-6xl mx-auto">
          
          <Reveal>
            <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-550 dark:text-[#94A3B8] text-xs font-semibold uppercase tracking-wider">
                {t('landing.pricing_teaser.label')}
              </span>
              <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">{t('landing.pricing_teaser.headline')}</h2>
              <p className="text-sm text-slate-550 dark:text-[#94A3B8] leading-relaxed">{t('landing.pricing_teaser.description')}</p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Plan 1: Free */}
            <Reveal delay={0.05}>
              <CardSpotlight hoverLift={true} spotlightColor="rgba(148,163,184,0.1)" className="p-6 border border-slate-200 dark:border-white/5 flex flex-col justify-between h-full bg-white dark:bg-[#1E293B]/20 shadow-sm">
                <div className="space-y-4">
                  <span className="inline-block text-[10px] font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-full">{t('landing.pricing_teaser.free_badge')}</span>
                  <div className="space-y-1">
                    <div className="text-3xl font-black text-slate-900 dark:text-white">{t('landing.pricing_teaser.free_price')}</div>
                    <div className="text-xs text-[#64748B]">{t('landing.pricing_teaser.free_period')}</div>
                  </div>
                  <ul className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-white/5">
                    {['free_f1', 'free_f2', 'free_f3', 'free_f4'].map(feature => (
                      <li key={feature} className="flex items-start gap-2 text-xs text-slate-600 dark:text-[#94A3B8]">
                        <Check size={14} className="text-slate-400 dark:text-[#94A3B8] shrink-0 mt-0.5" />
                        <span>{t(`landing.pricing_teaser.${feature}`)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button className="w-full mt-6 py-2.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-white font-bold text-xs" onClick={() => goAuth('signup')}>
                  {t('landing.pricing_teaser.free_btn')}
                </button>
              </CardSpotlight>
            </Reveal>

            {/* Plan 2: Standard */}
            <Reveal delay={0.1}>
              <CardSpotlight hoverLift={true} spotlightColor="rgba(34,197,94,0.12)" className="p-6 border-2 border-[#22C55E] flex flex-col justify-between h-full bg-emerald-50/20 dark:bg-[#14532D]/10 shadow-[0_0_35px_rgba(34,197,94,0.05)] dark:shadow-[0_0_35px_rgba(34,197,94,0.1)] relative">
                <div className="space-y-4">
                  <span className="inline-block text-[10px] font-bold bg-[#22C55E] text-[#052e16] uppercase tracking-wider px-2.5 py-1 rounded-full">{t('landing.pricing_teaser.std_badge')}</span>
                  <div className="space-y-1">
                    <div className="text-3.5xl font-black text-[#22C55E]">{t('landing.pricing_teaser.std_price')}</div>
                    <div className="text-xs text-[#64748B]">{t('landing.pricing_teaser.std_period')}</div>
                  </div>
                  <ul className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-white/5">
                    {['std_f1', 'std_f2', 'std_f3', 'std_f4', 'std_f5'].map(feature => (
                      <li key={feature} className="flex items-start gap-2 text-xs text-slate-605 dark:text-[#94A3B8]">
                        <Check size={14} className="text-[#22C55E] shrink-0 mt-0.5" />
                        <span>{t(`landing.pricing_teaser.${feature}`)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="space-y-3 mt-6">
                  <button className="w-full py-2.5 rounded-lg bg-[#22C55E] text-[#052e16] font-bold text-xs shadow-md" onClick={() => goAuth('signup')}>
                    {t('landing.pricing_teaser.std_btn')}
                  </button>
                  <div className="flex items-center justify-center gap-2 text-[9px] text-slate-500 dark:text-[#64748B]">
                    <span>Pay with MoMo or Orange Money</span>
                  </div>
                </div>
              </CardSpotlight>
            </Reveal>

            {/* Plan 3: Seasonal Premium */}
            <Reveal delay={0.15}>
              <CardSpotlight hoverLift={true} spotlightColor="rgba(249,115,22,0.12)" className="p-6 border border-[#F97316]/30 flex flex-col justify-between h-full bg-orange-50/20 dark:bg-[#431407]/10 relative shadow-sm">
                <div className="space-y-4">
                  <span className="inline-block text-[10px] font-bold bg-amber-500/10 dark:bg-[#431407] text-amber-800 dark:text-[#FDBA74] border border-[#F97316]/30 uppercase tracking-wider px-2.5 py-1 rounded-full">{t('landing.pricing_teaser.prm_badge')}</span>
                  <div className="space-y-1">
                    <div className="text-3xl font-black text-[#F97316]">{t('landing.pricing_teaser.prm_price')}</div>
                    <div className="text-xs text-[#64748B]">{t('landing.pricing_teaser.prm_period')}</div>
                  </div>
                  <ul className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-white/5">
                    {['prm_f1', 'prm_f2', 'prm_f3', 'prm_f4', 'prm_f5'].map(feature => (
                      <li key={feature} className="flex items-start gap-2 text-xs text-slate-605 dark:text-[#94A3B8]">
                        <Check size={14} className="text-[#F97316] shrink-0 mt-0.5" />
                        <span>{t(`landing.pricing_teaser.${feature}`)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button className="w-full mt-6 py-2.5 rounded-lg bg-[#F97316] text-white font-bold text-xs shadow-md" onClick={() => goAuth('signup')}>
                  {t('landing.pricing_teaser.prm_btn')}
                </button>
              </CardSpotlight>
            </Reveal>

          </div>

          <div className="text-center mt-10">
            <Link to="/pricing" className="text-sm font-semibold text-[#22C55E] hover:underline inline-flex items-center gap-1">
              {t('landing.pricing_teaser.compare_link')}
            </Link>
          </div>

        </div>
      </section>

      {/* ── Testimonials Section ── */}
      <section className="py-20 px-4 border-t border-slate-200 dark:border-white/5">
        <div className="max-w-6xl mx-auto">
          
          <Reveal>
            <div className="text-center max-w-2xl mx-auto space-y-3 mb-16">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#14532D]/10 dark:bg-[#14532D] border border-[#22C55E]/30 text-emerald-800 dark:text-[#86EFAC] text-xs font-semibold uppercase tracking-wider">
                {t('landing.testimonials.label')}
              </span>
              <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">{t('landing.testimonials.headline')}</h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { initials: 'CO', tk: 't1', bg: 'rgba(34,197,94,0.06)' },
              { initials: 'BN', tk: 't2', bg: 'rgba(59,130,246,0.06)' },
              { initials: 'DM', tk: 't3', bg: 'rgba(249,115,22,0.06)' },
            ].map(({ initials, tk, bg }, i) => (
              <Reveal key={tk} delay={i * 0.1}>
                <CardSpotlight className="p-6 border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/5 h-full flex flex-col justify-between shadow-sm">
                  <div className="space-y-4">
                    <div className="text-yellow-500 flex gap-0.5 text-sm">
                      {[1, 2, 3, 4, 5].map((s) => <span key={s}>★</span>)}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-[#94A3B8] italic leading-relaxed">
                      {t(`landing.testimonials.${tk}_quote`)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-white/5">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-slate-700 dark:text-white shrink-0" style={{ backgroundColor: bg }}>
                      {initials}
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-slate-800 dark:text-white">{t(`landing.testimonials.${tk}_name`)}</div>
                      <div className="text-[10px] text-slate-500 dark:text-[#64748B] font-medium leading-none mt-0.5">{t(`landing.testimonials.${tk}_school`)}</div>
                    </div>
                  </div>
                </CardSpotlight>
              </Reveal>
            ))}
          </div>

        </div>
      </section>

      {/* ── Final CTA Section ── */}
      <section className="py-20 px-4 relative overflow-hidden border-t border-slate-200 dark:border-white/5">
        <GlowBackground color="#22c55e" size={600} intensity={0.07} className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        
        <div className="max-w-xl mx-auto text-center space-y-6 z-10 relative">
          <Reveal>
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-slate-50 dark:bg-[#1E293B] rounded-full p-2 border border-slate-200 dark:border-white/5">
              <svg width="48" height="48" viewBox="0 0 64 64" fill="none" className="shrink-0">
                <rect width="64" height="64" rx="16" fill="#1E293B" />
                <path d="M32 10L19 46h5.5l3.5-9h8l3.5 9H45L32 10z" stroke="#22C55E" strokeWidth="2.5" strokeLinejoin="round" fill="none" />
                <path d="M23.5 35h17" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M32 10v5" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="32" cy="8" r="3" fill="#3B82F6" />
                <path d="M30 7.5l1.5 1.5 2.5-2.5" stroke="#0F172A" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight whitespace-pre-line">
              {t('landing.cta.headline')}
            </h2>
            
            <p className="text-sm text-slate-650 dark:text-[#94A3B8] max-w-sm mx-auto leading-relaxed">
              {t('landing.cta.description')}
            </p>

            <div className="pt-4 max-w-xs mx-auto space-y-3">
              <button 
                onClick={() => goAuth('signup')}
                className="w-full py-3.5 rounded-xl font-bold bg-[#22C55E] text-[#052e16] shadow-[0_0_24px_rgba(34,197,94,0.2)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] transition-all scale-on-click"
              >
                {t('landing.cta.btn')}
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Centralized Public Footer */}
      <Footer />

    </div>
  );
}
