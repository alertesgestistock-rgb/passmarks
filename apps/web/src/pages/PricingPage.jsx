import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Check, X, ChevronDown } from 'lucide-react';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import CardSpotlight from '@/components/ui/CardSpotlight';
import GlowBackground from '@/components/ui/GlowBackground';

const T = {
  bg: '#0F172A', 
  card: '#1E293B', 
  primary: '#22C55E', 
  primaryDark: '#052e16',
  blue: '#3B82F6', 
  orange: '#F97316', 
  text: '#F1F5F9', 
  muted: '#94A3B8',
  border: 'rgba(255,255,255,0.08)', 
  error: '#EF4444',
};

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white dark:bg-[#1E293B]/40 border border-slate-200 dark:border-white/5 rounded-xl overflow-hidden mb-3 shadow-sm">
      <button 
        className="w-full flex justify-between items-center p-4 text-left font-semibold text-slate-800 dark:text-white text-sm transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
        onClick={() => setOpen(!open)}
      >
        <span>{question}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={16} className="text-slate-500 dark:text-[#94A3B8]" />
        </motion.span>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        style={{ overflow: 'hidden' }}
      >
        <p className="p-4 pt-0 text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed">{answer}</p>
      </motion.div>
    </div>
  );
}

export default function PricingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [billing, setBilling] = useState('monthly');

  const goAuth = () => navigate('/auth?tab=signup');

  const compareRows = [
    ['row_price', 'kawlo_price', 'repet_price', 'free_price', 'std_price'],
    ['row_ai', 'kawlo_ai', 'repet_ai', 'free_ai', 'std_ai'],
    ['row_photo', 'kawlo_photo', 'repet_photo', 'free_photo', 'std_photo'],
    ['row_offline', 'kawlo_offline', 'repet_offline', 'free_offline', 'std_offline'],
    ['row_subjects', 'kawlo_subjects', 'repet_subjects', 'free_subjects', 'std_subjects'],
    ['row_papers', 'kawlo_papers', 'repet_papers', 'free_papers', 'std_papers'],
    ['row_essay', 'kawlo_essay', 'repet_essay', 'free_essay', 'std_essay'],
    ['row_night', 'kawlo_night', 'repet_night', 'free_night', 'std_night'],
    ['row_momo', 'kawlo_momo', 'repet_momo', 'free_momo', 'std_momo'],
  ];

  const plans = [
    {
      id: 'free', featured: false, premium: false,
      badge: 'free_badge', badgeCls: 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-[#94A3B8]',
      price: { monthly: '0', season: '0' },
      period: { monthly: 'free_period_m', season: 'free_period_s' },
      note: { monthly: 'free_note', season: 'free_note' },
      saveKey: null,
      payment: null,
      features: [
        { k: 'free_f1', ok: true }, { k: 'free_f2', ok: true }, { k: 'free_f3', ok: true },
        { k: 'free_f4', ok: true }, { k: 'free_f5', ok: true },
        { k: 'free_f6', ok: false }, { k: 'free_f7', ok: false }, { k: 'free_f8', ok: false }, { k: 'free_f9', ok: false },
      ],
      social: null, scarcity: null,
      btn: { monthly: 'free_btn', season: 'free_btn' },
      btnCls: 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10',
      priceColor: 'currentColor',
    },
    {
      id: 'standard', featured: true, premium: false,
      badge: 'std_badge', badgeCls: 'bg-[#22C55E] text-[#052e16]',
      price: { monthly: '1 500', season: '3 500' },
      period: { monthly: 'std_period_m', season: 'std_period_s' },
      note: { monthly: 'std_note_m', season: 'std_note_s' },
      saveKey: { monthly: null, season: 'std_save' },
      payment: 'std_payment',
      features: [
        { k: 'std_f1', ok: true, hi: true }, { k: 'std_f2', ok: true }, { k: 'std_f3', ok: true },
        { k: 'std_f4', ok: true }, { k: 'std_f5', ok: true }, { k: 'std_f6', ok: true }, { k: 'std_f7', ok: true },
        { k: 'std_f8', ok: false }, { k: 'std_f9', ok: false },
      ],
      social: 'std_social', scarcity: null,
      btn: { monthly: 'std_btn_m', season: 'std_btn_s' },
      btnCls: 'bg-[#22C55E] text-[#052e16] shadow-lg shadow-[#22C55E]/15 hover:brightness-105',
      priceColor: '#22C55E',
    },
    {
      id: 'premium', featured: false, premium: true,
      badge: 'prm_badge', badgeCls: 'bg-orange-50 dark:bg-[#431407] text-orange-850 dark:text-[#FDBA74] border border-[#F97316]/30',
      price: { monthly: '5 000', season: '5 000' },
      period: { monthly: 'prm_period_m', season: 'prm_period_s' },
      note: { monthly: 'prm_note', season: 'prm_note' },
      saveKey: null,
      payment: null,
      features: [
        { k: 'prm_f1', ok: true, hi: true }, { k: 'prm_f2', ok: true }, { k: 'prm_f3', ok: true },
        { k: 'prm_f4', ok: true }, { k: 'prm_f5', ok: true }, { k: 'prm_f6', ok: true }, { k: 'prm_f7', ok: true },
      ],
      social: null, scarcity: 'prm_scarcity',
      btn: { monthly: 'prm_btn', season: 'prm_btn' },
      btnCls: 'bg-[#F97316] text-white shadow-lg shadow-[#F97316]/15 hover:brightness-105',
      priceColor: '#F97316',
    },
  ];

  const faqs = ['q1','q2','q3','q4','q5','q6','q7','q8'];

  return (
    <div className="min-h-screen bg-white dark:bg-[#0F172A] text-slate-900 dark:text-[#F1F5F9] font-sans antialiased overflow-x-hidden transition-colors duration-300">
      
      {/* Central Header */}
      <Header />

      {/* ── Hero ── */}
      <section className="relative pt-24 md:pt-36 pb-16 overflow-hidden flex flex-col items-center justify-center">
        <GlowBackground color="#22c55e" size={600} intensity={0.06} className="top-[-10%] left-1/2 -translate-x-1/2" />
        
        <div className="w-full max-w-6xl mx-auto px-4 md:px-6 flex flex-col items-center text-center space-y-6 z-10">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 dark:bg-[#431407] border border-orange-200 dark:border-[#F97316]/30 text-orange-850 dark:text-[#FDBA74] text-xs font-semibold uppercase tracking-wider">
            {t('pricing.hero.badge')}
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight max-w-3xl text-slate-900 dark:text-white">
            <span className="text-slate-400 dark:text-[#64748B] line-through text-2xl sm:text-4xl block mb-2">{t('pricing.hero.strike')}</span>
            {t('pricing.hero.headline')}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#22C55E] to-[#86EFAC] drop-shadow-[0_2px_10px_rgba(34,197,94,0.15)]">
              {t('pricing.hero.highlight')}
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-[#94A3B8] max-w-xl leading-relaxed text-balance">
            {t('pricing.hero.description')}
          </p>

          {/* Value comparison anchor cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-8 w-full max-w-2xl select-none">
            
            {/* Bad Anchor (Private tutor) */}
            <motion.div whileHover={{ y: -3 }} className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-red-500/20 text-center space-y-2">
              <div className="text-2xl">👨‍🏫</div>
              <h3 className="text-sm font-bold text-slate-500 dark:text-[#94A3B8]">{t('pricing.hero.bad_label')}</h3>
              <div className="text-lg font-black text-[#EF4444]">{t('pricing.hero.bad_price')}</div>
              <div className="text-xs text-slate-400 dark:text-[#64748B]">{t('pricing.hero.bad_sub')}</div>
            </motion.div>

            {/* Good Anchor (PassMark) */}
            <motion.div whileHover={{ y: -3 }} className="p-5 rounded-2xl bg-emerald-50/20 dark:bg-[#14532D]/35 border border-[#22C55E]/40 text-center space-y-2 shadow-xl dark:shadow-[#22C55E]/5">
              <div className="text-2xl">🤖</div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">{t('pricing.hero.good_label')}</h3>
              <div className="text-lg font-black text-[#22C55E]">{t('pricing.hero.good_price')}</div>
              <div className="text-xs text-emerald-800 dark:text-[#86EFAC]">{t('pricing.hero.good_sub')}</div>
            </motion.div>

          </div>

        </div>
      </section>

      {/* ── Cost of Failure ── */}
      <section className="py-16 px-4 bg-slate-50 dark:bg-[#1E293B]/20 border-y border-slate-200 dark:border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-xs font-semibold uppercase tracking-wider">
              {t('pricing.pain.label')}
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t('pricing.pain.headline')}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {['c1','c2','c3'].map(k => (
              <CardSpotlight key={k} hoverLift={true} spotlightColor="rgba(239,68,68,0.08)" className="p-5 border border-slate-200 dark:border-white/5 h-full bg-white dark:bg-[#1E293B]/30">
                <div className="text-2xl mb-4">{k === 'c1' ? '💸' : k === 'c2' ? '⏳' : '🎓'}</div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">{t(`pricing.pain.${k}_title`)}</h3>
                <p className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed mb-4">{t(`pricing.pain.${k}_desc`)}</p>
                <div className="text-xs font-bold text-[#EF4444] mt-auto">{t(`pricing.pain.${k}_cost`)}</div>
              </CardSpotlight>
            ))}
          </div>

          <p className="text-center text-sm md:text-base text-[#22C55E] font-bold mt-10 max-w-2xl mx-auto text-balance leading-relaxed">
            {t('pricing.pain.transition')}
          </p>
        </div>
      </section>

      {/* ── Feature Comparison Table ── */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 dark:bg-[#14532D] border border-[#22C55E]/30 text-emerald-800 dark:text-[#86EFAC] text-xs font-semibold uppercase tracking-wider">
              {t('pricing.compare.label')}
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t('pricing.compare.headline')}</h2>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/5 shadow-2xl bg-white dark:bg-[#1E293B]/20">
            <table className="w-full min-w-[700px] border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-950/60 border-b border-slate-200 dark:border-white/5">
                  {['col_feature','col_kawlo','col_repet','col_free','col_std'].map((k, i) => (
                    <th key={k} className={`p-4 font-bold text-slate-600 dark:text-[#94A3B8] uppercase tracking-wider ${
                      i === 4 ? 'bg-[#14532D]/10 dark:bg-[#14532D]/40 border-x border-[#22C55E]/30 text-[#22C55E]' : ''
                    }`}>{t(`pricing.compare.${k}`)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compareRows.map(([feat, ...cells], ri) => (
                  <tr key={feat} className={`border-b border-slate-250 dark:border-white/5 transition-colors hover:bg-slate-50 dark:hover:bg-white/2 ${
                    ri % 2 === 0 ? 'bg-slate-50 dark:bg-[#0F172A]/40' : 'bg-white dark:bg-[#1E293B]/20'
                  }`}>
                    <td className="p-4 font-semibold text-slate-900 dark:text-white">{t(`pricing.compare.${feat}`)}</td>
                    {cells.map((k, ci) => (
                      <td key={k} className={`p-4 text-slate-605 dark:text-[#94A3B8] ${
                        ci === 3 ? 'bg-[#14532D]/10 dark:bg-[#14532D]/30 border-x border-[#22C55E]/20 text-emerald-800 dark:text-[#86EFAC]' : ''
                      }`}>{t(`pricing.compare.${k}`)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Real Pricing Grid ── */}
      <section className="py-20 px-4 bg-slate-50 dark:bg-[#1E293B]/10 border-t border-slate-200 dark:border-white/5" id="pricing-cards">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto space-y-5 mb-16">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-[#94A3B8] text-xs font-semibold uppercase tracking-wider">
              {t('pricing.plans.label')}
            </span>
            <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">{t('pricing.plans.headline')}</h2>
            
            {/* Toggle Billing switch */}
            <div className="inline-flex bg-slate-100 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-200 dark:border-white/5 shadow-inner">
              {[
                ['monthly', 'toggle_monthly'], 
                ['season', 'toggle_season']
              ].map(([val, lk]) => (
                <button 
                  key={val} 
                  onClick={() => setBilling(val)} 
                  className={`px-5 py-2 text-xs font-bold rounded-lg transition-all ${
                    billing === val ? 'bg-white dark:bg-[#1E293B] text-slate-950 dark:text-white shadow-md' : 'text-slate-400 dark:text-[#64748B] hover:text-slate-650 dark:hover:text-[#94A3B8]'
                  }`}
                >
                  {t(`pricing.plans.${lk}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <CardSpotlight 
                key={plan.id}
                hoverLift={true}
                spotlightColor={plan.featured ? "rgba(34,197,94,0.12)" : plan.premium ? "rgba(249,115,22,0.12)" : "rgba(148,163,184,0.08)"}
                className={`p-6 border flex flex-col justify-between h-full relative bg-white dark:bg-transparent ${
                  plan.featured ? 'border-2 border-[#22C55E] bg-emerald-50/20 dark:bg-[#14532D]/15 shadow-xl dark:shadow-[#22C55E]/5' : plan.premium ? 'border-[#F97316]/30 bg-orange-50/20 dark:bg-[#431407]/10' : 'border-slate-200 dark:border-white/5'
                }`}
              >
                {/* Visual Badge overlay */}
                {plan.featured ? (
                  <div className="absolute top-[-14px] left-1/2 -translate-x-1/2 bg-[#22C55E] text-[#052e16] text-[10px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md z-20">
                    {t(`pricing.plans.${plan.badge}`)}
                  </div>
                ) : (
                  <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-4 w-fit ${plan.badgeCls}`}>
                    {t(`pricing.plans.${plan.badge}`)}
                  </span>
                )}
                {plan.featured && <div className="h-4" />}

                {/* Price and Note */}
                <div className="space-y-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3.5xl font-black" style={{ color: plan.priceColor }}>{plan.price[billing]} FCFA</span>
                    {plan.saveKey?.[billing] && <span className="bg-[#14532D]/10 dark:bg-[#14532D] text-emerald-800 dark:text-[#86EFAC] text-[9px] font-black px-2 py-0.5 rounded">{t(`pricing.plans.${plan.saveKey[billing]}`)}</span>}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-[#64748B] font-semibold">{t(`pricing.plans.${plan.period[billing]}`)}</div>
                  <div className="text-xs text-slate-600 dark:text-[#94A3B8] italic leading-normal">{t(`pricing.plans.${plan.note[billing]}`)}</div>
                  {plan.payment && (
                    <div className="inline-block bg-[#14532D]/10 dark:bg-[#14532D]/80 text-[#16A34A] dark:text-[#86EFAC] border border-[#22C55E]/20 text-[9px] font-bold px-2 py-1 rounded-md">
                      {t(`pricing.plans.${plan.payment}`)}
                    </div>
                  )}

                  {/* Bullet features list */}
                  <ul className="space-y-3 pt-4 border-t border-slate-200 dark:border-white/5">
                    {plan.features.map(({ k, ok, hi }) => (
                      <li key={k} className={`flex items-start gap-2.5 text-xs ${ok ? 'text-slate-650 dark:text-[#94A3B8]' : 'text-slate-350 dark:text-[#475569]'}`}>
                        {ok ? (
                          <Check size={14} className="shrink-0 mt-0.5" style={{ color: plan.featured ? T.primary : plan.premium ? T.orange : T.muted }} />
                        ) : (
                          <X size={14} className="shrink-0 mt-0.5 text-slate-400 dark:text-slate-700" />
                        )}
                        <span className={hi && ok ? 'font-bold text-slate-800 dark:text-white' : ''}>{t(`pricing.plans.${k}`)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 space-y-3">
                  {plan.social && <p className="text-[10px] text-emerald-800 dark:text-[#86EFAC] text-center font-semibold">{t(`pricing.plans.${plan.social}`)}</p>}
                  {plan.scarcity && <p className="text-[10px] text-orange-800 dark:text-[#FDBA74] text-center font-bold">{t(`pricing.plans.${plan.scarcity}`)}</p>}
                  
                  <button onClick={goAuth} className={`w-full py-3 rounded-xl font-bold text-xs active:scale-98 transition-transform border ${plan.btnCls}`}>
                    {t(`pricing.plans.${plan.btn[billing]}`)}
                  </button>
                </div>
              </CardSpotlight>
            ))}
          </div>

        </div>
      </section>

      {/* ── Verification and trust boosters ── */}
      <section className="py-16 px-4 border-t border-slate-200 dark:border-white/5">
        <div className="max-w-3xl mx-auto space-y-8">
          
          <div className="grid grid-cols-3 gap-6 bg-slate-50 dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-white/5">
            {[
              ['500+', '#22C55E', 'students'], 
              ['4.8★', '#F97316', 'rating'], 
              ['93%', '#3B82F6', 'pass_rate']
            ].map(([val, color, lk]) => (
              <div key={lk} className="text-center space-y-1">
                <div className="text-2xl font-black" style={{ color }}>{val}</div>
                <div className="text-[10px] text-slate-500 dark:text-[#64748B] font-bold uppercase tracking-wider">{t(`pricing.boosters.${lk}`)}</div>
              </div>
            ))}
          </div>

          <div className="bg-[#14532D]/10 dark:bg-[#14532D]/40 border border-[#22C55E]/30 rounded-2xl p-6 flex gap-4 items-start flex-wrap sm:flex-nowrap">
            <span className="text-3xl shrink-0">⚠️</span>
            <div className="flex-1 space-y-1">
              <h4 className="text-sm font-bold text-slate-800 dark:text-white">{t('pricing.boosters.banner_title')}</h4>
              <p className="text-xs text-emerald-850 dark:text-[#86EFAC] leading-relaxed">{t('pricing.boosters.banner_desc')}</p>
            </div>
            <button onClick={goAuth} className="px-4 py-2 bg-[#22C55E] text-[#052e16] font-bold text-xs rounded-lg whitespace-nowrap active:scale-95 transition-transform">
              {t('pricing.boosters.banner_btn')}
            </button>
          </div>

          <div className="bg-slate-50 dark:bg-[#1E293B]/40 border border-slate-200 dark:border-white/5 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-950 flex items-center justify-center text-lg shrink-0">🤖</div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white">{t('pricing.boosters.authority_title')}</h4>
              <p className="text-[10px] text-slate-550 dark:text-[#94A3B8] leading-relaxed">{t('pricing.boosters.authority_desc')}</p>
            </div>
          </div>

        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-20 px-4 bg-slate-50 dark:bg-[#1E293B]/20 border-t border-slate-200 dark:border-white/5">
        <div className="max-w-2xl mx-auto">
          <div className="text-center space-y-3 mb-12">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-150 dark:bg-white/5 border border-slate-250 dark:border-white/10 text-slate-500 dark:text-[#94A3B8] text-xs font-semibold uppercase tracking-wider">
              {t('pricing.faq.label')}
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t('pricing.faq.headline')}</h2>
          </div>

          <div className="space-y-3">
            {faqs.map(k => (
              <FaqItem key={k} question={t(`pricing.faq.${k}`)} answer={t(`pricing.faq.a${k.slice(1)}`)} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-20 px-4 relative overflow-hidden border-t border-slate-200 dark:border-white/5">
        <GlowBackground color="#22c55e" size={600} intensity={0.06} className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        
        <div className="max-w-xl mx-auto text-center space-y-6 z-10 relative">
          <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-[#431407]/10 dark:bg-[#431407]/60 border border-[#F97316]/30 text-orange-850 dark:text-[#FDBA74] text-xs font-semibold uppercase tracking-wider">
            {t('pricing.cta.badge')}
          </span>
          
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight whitespace-pre-line">
            {t('pricing.cta.headline')}
          </h2>
          
          <p className="text-sm text-slate-600 dark:text-[#94A3B8] max-w-sm mx-auto leading-relaxed">
            {t('pricing.cta.description')}
          </p>

          <div className="pt-4 max-w-xs mx-auto space-y-3">
            <button 
              onClick={goAuth}
              className="w-full py-3.5 rounded-xl font-bold bg-[#22C55E] text-[#052e16] shadow-[0_0_24px_rgba(34,197,94,0.25)] hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] transition-all scale-on-click"
            >
              {t('pricing.cta.btn')}
            </button>
            <a href="#pricing-cards" className="text-xs text-slate-500 dark:text-[#94A3B8] underline hover:text-slate-800 dark:hover:text-white transition-colors block mt-2">
              {t('pricing.cta.link')}
            </a>
            <p className="text-[10px] text-slate-500 dark:text-[#64748B]">
              {t('pricing.cta.trust')}
            </p>
          </div>
        </div>
      </section>

      {/* Centralized Public Footer */}
      <Footer />

    </div>
  );
}
