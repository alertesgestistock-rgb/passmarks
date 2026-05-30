import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Check, X, ChevronDown, Coins, Zap, Star, Trophy, Flame } from 'lucide-react';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import CardSpotlight from '@/components/ui/CardSpotlight';
import GlowBackground from '@/components/ui/GlowBackground';
import { useUser } from '@/contexts/UserContext';
import apiServerClient from '@/lib/apiServerClient';

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

const TOKEN_PACKS = [
  { name: 'Starter',   tokens: 50,   price: 1000,  icon: Coins,  color: '#3B82F6', popular: false },
  { name: 'Standard',  tokens: 200,  price: 3500,  icon: Zap,    color: '#22C55E', popular: true  },
  { name: 'Intensif',  tokens: 500,  price: 7500,  icon: Star,   color: '#F97316', popular: false },
  { name: 'Exam Mode', tokens: 1200, price: 15000, icon: Trophy, color: '#A855F7', popular: false },
];

export default function PricingPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUser();
  const [buying, setBuying] = useState(null);
  const lang = i18n.language;

  const goAuth = () => navigate('/auth?tab=signup');

  const handleBuyPack = async (pack) => {
    if (!user) { navigate('/auth?tab=signup'); return; }
    setBuying(pack.name);
    try {
      // Fetch package id from DB by name, then checkout
      const { supabase } = await import('@/lib/supabase');
      const { data: pkg } = await supabase
        .from('token_packages')
        .select('id')
        .eq('name', pack.name)
        .single();
      if (!pkg) throw new Error('Package not found');

      const data = await apiServerClient.json('/chariow/checkout', {
        method: 'POST',
        body: { package_id: pkg.id },
      });
      if (data.checkout_url) window.location.href = data.checkout_url;
    } catch {
      alert(lang === 'fr'
        ? 'Erreur lors du paiement. Réessayez.'
        : 'Payment error. Please try again.');
    } finally {
      setBuying(null);
    }
  };

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

      {/* ── Token Packs ── */}
      <section className="py-20 px-4 bg-slate-50 dark:bg-[#1E293B]/10 border-t border-slate-200 dark:border-white/5" id="pricing-cards">
        <div className="max-w-4xl mx-auto">
          <div className="text-center max-w-2xl mx-auto space-y-4 mb-14">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] text-xs font-semibold uppercase tracking-wider">
              <Coins size={12} />
              {lang === 'fr' ? 'Packs de tokens' : 'Token Packs'}
            </span>
            <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {lang === 'fr' ? 'Rechargez quand vous voulez' : 'Top up whenever you need'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-[#94A3B8]">
              {lang === 'fr'
                ? 'Pas d\'abonnement. Payez uniquement ce que vous utilisez. Les tokens ne expirent pas.'
                : 'No subscription. Pay only what you use. Tokens never expire.'}
            </p>
            <div className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-[#64748B] bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-white/10">
              🎁 {lang === 'fr' ? '25 tokens offerts à l\'inscription' : '25 free tokens on sign up'}
            </div>
          </div>

          {/* Packs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {TOKEN_PACKS.map((pack) => {
              const Icon = pack.icon;
              const isBuying = buying === pack.name;
              return (
                <CardSpotlight
                  key={pack.name}
                  hoverLift
                  spotlightColor={`${pack.color}18`}
                  className={`p-6 border flex flex-col gap-4 relative bg-white dark:bg-transparent ${
                    pack.popular
                      ? 'border-2 shadow-xl dark:shadow-[#22C55E]/5'
                      : 'border-slate-200 dark:border-white/8'
                  }`}
                  style={{ borderColor: pack.popular ? pack.color : undefined }}
                >
                  {pack.popular && (
                    <div className="absolute top-[-12px] left-1/2 -translate-x-1/2 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow flex items-center gap-1"
                      style={{ background: pack.color }}>
                      <Flame size={10} />
                      {lang === 'fr' ? 'Populaire' : 'Popular'}
                    </div>
                  )}
                  {pack.popular && <div className="h-1" />}

                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${pack.color}18` }}>
                      <Icon size={24} style={{ color: pack.color }} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white text-base">{pack.name}</div>
                      <div className="text-sm font-black" style={{ color: pack.color }}>
                        {pack.tokens} tokens
                      </div>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="text-xl font-black text-slate-900 dark:text-white">
                        {pack.price.toLocaleString()} XAF
                      </div>
                      <div className="text-xs text-slate-400 dark:text-[#64748B]">
                        {Math.round(pack.price / pack.tokens)} XAF/token
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-white/5 pt-4 space-y-2">
                    {[
                      `${pack.tokens} ${lang === 'fr' ? 'messages IA' : 'AI messages'}`,
                      `${Math.floor(pack.tokens / 4)} ${lang === 'fr' ? 'analyses d\'images' : 'image analyses'}`,
                      `${Math.floor(pack.tokens / 2)} ${lang === 'fr' ? 'quiz générés' : 'quizzes generated'}`,
                    ].map(f => (
                      <div key={f} className="flex items-center gap-2 text-xs text-slate-600 dark:text-[#94A3B8]">
                        <Check size={13} style={{ color: pack.color }} className="shrink-0" />
                        {f}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleBuyPack(pack)}
                    disabled={isBuying}
                    className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-98 disabled:opacity-60 mt-auto text-white"
                    style={{ background: pack.color }}
                  >
                    {isBuying
                      ? (lang === 'fr' ? 'Redirection…' : 'Redirecting…')
                      : (lang === 'fr' ? 'Acheter ce pack' : 'Buy this pack')}
                  </button>
                </CardSpotlight>
              );
            })}
          </div>

          <p className="text-center text-xs text-slate-400 dark:text-[#64748B] mt-8">
            {lang === 'fr'
              ? '🔒 Paiement sécurisé via Chariow · MTN MoMo · Orange Money · Carte bancaire'
              : '🔒 Secure payment via Chariow · MTN MoMo · Orange Money · Bank card'}
          </p>
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
