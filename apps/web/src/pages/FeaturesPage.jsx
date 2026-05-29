import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  Camera, BookOpen, Award, Flame, Bell, WifiOff,
  CheckCircle2, ArrowRight, Sparkles, Zap, Shield,
  Users, Clock
} from 'lucide-react';
import Header from '@/components/landing/Header';
import Footer from '@/components/landing/Footer';
import CardSpotlight from '@/components/ui/CardSpotlight';
import GlowBackground from '@/components/ui/GlowBackground';

function Reveal({ children, delay = 0, y = 24, x = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y, x }}
      animate={inView ? { opacity: 1, y: 0, x: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

const FEATURES = [
  {
    id: 'ai',
    icon: Camera,
    emoji: '🤖',
    color: '#22C55E',
    colorDark: '#14532D',
    colorBg: 'rgba(34,197,94,0.08)',
    colorBorder: 'rgba(34,197,94,0.2)',
    badge: 'Core Feature',
    title: 'AI Tutor & Photo-Solving',
    subtitle: 'GCE Syllabus Aligned',
    desc: 'Snap a photo of your exercise or type your question. Our AI reads the statement and generates a complete, step-by-step resolution in total compliance with the GCE Board marking scheme.',
    bullets: [
      'Detailed step-by-step explanations in simple English',
      'Handles essay subjects (History, Literature, etc.)',
      'Complete math and physics formula working',
      'Works with blurry or poorly lit photos',
    ],
    visual: (
      <div className="bg-white dark:bg-[#080F1A] rounded-2xl p-4 border border-slate-200 dark:border-white/5 space-y-3 shadow-sm">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
          <div className="w-6 h-6 rounded-full bg-[#22C55E]/15 flex items-center justify-center text-sm">🤖</div>
          <span className="text-[11px] font-bold text-slate-800 dark:text-white">PassMark AI</span>
          <span className="ml-auto text-[9px] text-[#22C55E] flex items-center gap-1 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
            Active 24/7
          </span>
        </div>
        <div className="px-3 py-2 rounded-xl bg-[#1E3A5F]/10 dark:bg-[#1E3A5F]/60 border border-[#3B82F6]/20 text-xs text-slate-800 dark:text-white self-end text-right">
          Solve: 2x² - 5x + 3 = 0
        </div>
        <div className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-[#1E293B]/80 border border-slate-200 dark:border-white/5 text-[11px] text-slate-600 dark:text-[#94A3B8] space-y-1 leading-relaxed">
          <p>Identify <span className="text-slate-900 dark:text-white font-mono">a=2, b=-5, c=3</span></p>
          <p>Discriminant: <span className="text-slate-900 dark:text-white font-mono">Δ = b² - 4ac = 1</span></p>
          <div className="mt-2 bg-[#14532D]/10 dark:bg-[#14532D]/60 border border-[#22C55E]/30 rounded-lg p-2 font-mono text-[#16A34A] dark:text-[#86EFAC] text-[10px] font-bold">
            x = 1.5 or x = 1 ✓ Grade A Answer
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'papers',
    icon: BookOpen,
    emoji: '📚',
    color: '#3B82F6',
    colorDark: '#1E3A5F',
    colorBg: 'rgba(59,130,246,0.08)',
    colorBorder: 'rgba(59,130,246,0.2)',
    badge: 'Library',
    title: 'Annales & Past Papers 2015–2024',
    subtitle: '10 Years of Official Exams',
    desc: 'Browse all official past papers of GCE Cameroon and regional mock exams without leaving the application.',
    bullets: [
      'All scientific and arts/humanities subjects',
      'Filter by year, subject, and level (O/A Level)',
      'Integrated "Ask AI" button on each paper',
      'Smooth PDF reading without downloading',
    ],
    visual: (
      <div className="bg-white dark:bg-[#080F1A] rounded-2xl p-4 border border-slate-200 dark:border-white/5 space-y-2 shadow-sm">
        <div className="text-[9px] text-slate-500 dark:text-[#64748B] font-bold uppercase tracking-wider mb-3 flex items-center justify-between">
          <span>GCE Past Papers</span>
          <span className="bg-slate-100 dark:bg-[#1E3A5F] text-slate-600 dark:text-[#93C5FD] px-2 py-0.5 rounded text-[8px]">A Level · O Level</span>
        </div>
        {[
          { subject: 'Physics', year: '2023', paper: 'P1' },
          { subject: 'Chemistry', year: '2023', paper: 'P2' },
          { subject: 'Mathematics', year: '2022', paper: 'P1' },
          { subject: 'Biology', year: '2022', paper: 'P2' },
        ].map((p, i) => (
          <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-[#1E293B]/60 border border-slate-200 dark:border-white/5 group">
            <span className="text-[#3B82F6] text-sm">📄</span>
            <span className="text-xs text-slate-700 dark:text-[#94A3B8] flex-1 font-medium">{p.subject} – {p.year} {p.paper}</span>
            <span className="text-[9px] text-[#22C55E] opacity-0 group-hover:opacity-100 transition-opacity">Ask AI →</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: 'quiz',
    icon: Award,
    emoji: '🏆',
    color: '#A78BFA',
    colorDark: '#3B0764',
    colorBg: 'rgba(167,139,250,0.08)',
    colorBorder: 'rgba(167,139,250,0.2)',
    badge: 'Self-evaluation',
    title: 'GCE Style Quiz Generator',
    subtitle: 'Timed MCQs & Instant Grading',
    desc: 'Test your knowledge by generating timed multiple-choice quizzes on the chapters of your choice. Get immediate explanations for your mistakes.',
    bullets: [
      'MCQ questions inspired by real GCE Paper 1 exams',
      'Instant grade estimation (Grade A, B, C, D)',
      'Detailed explanations for each incorrect answer',
      'Weekly progress tracking reports by discipline',
    ],
    visual: (
      <div className="bg-white dark:bg-[#080F1A] rounded-2xl p-4 border border-slate-200 dark:border-white/5 space-y-3 shadow-sm">
        <div className="text-[9px] text-slate-500 dark:text-[#64748B] font-bold uppercase tracking-wider">Quiz · Biology O Level</div>
        <div className="text-xs font-bold text-slate-800 dark:text-white leading-relaxed">What is the powerhouse of the cell?</div>
        <div className="space-y-2">
          <div className="p-2.5 rounded-xl bg-[#14532D]/10 dark:bg-[#14532D]/40 border border-[#22C55E]/40 text-[#16A34A] dark:text-[#86EFAC] text-xs font-semibold flex items-center justify-between">
            <span>A) Mitochondria</span>
            <span className="text-[#22C55E]">✓ Correct</span>
          </div>
          {['B) Nucleus', 'C) Ribosome'].map(opt => (
            <div key={opt} className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#1E293B]/60 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-[#475569] text-xs">{opt}</div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
          <span className="text-[10px] text-slate-500 dark:text-[#64748B]">Current Score</span>
          <span className="text-sm font-black text-[#A78BFA]">Grade A · 94%</span>
        </div>
      </div>
    ),
  },
  {
    id: 'streak',
    icon: Flame,
    emoji: '🔥',
    color: '#F97316',
    colorDark: '#431407',
    colorBg: 'rgba(249,115,22,0.08)',
    colorBorder: 'rgba(249,115,22,0.2)',
    badge: 'Gamification',
    title: 'Streak Tracking & Motivation',
    subtitle: 'Stay Consistent Every Day',
    desc: 'Build consistency in your daily revisions using our streak system. Every day you practice or study a past paper extends your streak.',
    bullets: [
      'Visual celebration of your achievements',
      'Direct status sharing with your schoolmates/friends',
      'Gentle reminders to preserve your study habit',
      'Weekly active revision day charts',
    ],
    visual: (
      <div className="bg-white dark:bg-[#080F1A] rounded-2xl p-4 border border-slate-200 dark:border-white/5 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-slate-500 dark:text-[#64748B] font-bold uppercase tracking-wider">Current Streak</span>
          <span className="text-xs font-black text-[#F97316]">🔥 12 Days</span>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className={`w-full aspect-square rounded-md flex items-center justify-center text-[10px] font-bold ${
                i < 5 ? 'bg-[#F97316]/20 border border-[#F97316]/30 text-[#F97316]'
                : i === 5 ? 'bg-[#22C55E]/20 border border-[#22C55E]/30 text-[#22C55E]'
                : 'bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-[#475569]'
              }`}>
                {i < 5 ? '🔥' : i === 5 ? '✓' : d}
              </div>
              <span className="text-[8px] text-slate-500 dark:text-[#475569]">{d}</span>
            </div>
          ))}
        </div>
        <div className="bg-[#431407]/10 dark:bg-[#431407]/60 border border-[#F97316]/20 rounded-xl p-2.5 text-[10px] text-[#C2410C] dark:text-[#FDBA74]">
          ⚡ Study 2 more days to unlock the Elite Badge!
        </div>
      </div>
    ),
  },
  {
    id: 'notifications',
    icon: Bell,
    emoji: '🔔',
    color: '#EF4444',
    colorDark: '#450A0A',
    colorBg: 'rgba(239,68,68,0.08)',
    colorBorder: 'rgba(239,68,68,0.2)',
    badge: 'Reminders',
    title: 'Smart Notification Center',
    subtitle: 'Exam Countdown & Study Alerts',
    desc: 'Receive configurable study alerts, live interactive countdowns to exams, and notifications of streak milestones to stay focused.',
    bullets: [
      'Customizable study reminders (e.g., 7:00 PM)',
      'Accurate countdown days before GCE written tests',
      'Streak milestone achievements (5d, 10d, 30d)',
      'Smooth sliding notifications panel',
    ],
    visual: (
      <div className="bg-white dark:bg-[#080F1A] rounded-2xl p-4 border border-slate-200 dark:border-white/5 space-y-2 shadow-sm">
        <div className="text-[9px] text-slate-500 dark:text-[#64748B] font-bold uppercase tracking-wider mb-1">Notifications</div>
        {[
          { icon: '🔥', title: 'Streak in Danger!', msg: 'Revise before midnight', time: '2m ago', color: '#F97316' },
          { icon: '⏰', title: 'GCE 2026 in 68 Days', msg: 'Physics Paper 1 — June 10', time: 'today', color: '#3B82F6' },
          { icon: '✅', title: 'Quiz Completed!', msg: 'Score: Grade A (94%)', time: 'yesterday', color: '#22C55E' },
        ].map((n, i) => (
          <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-[#1E293B]/50 border border-slate-200 dark:border-white/5">
            <span className="text-sm shrink-0 mt-0.5">{n.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold text-slate-800 dark:text-white truncate">{n.title}</div>
              <div className="text-[9px] text-slate-500 dark:text-[#64748B]">{n.msg}</div>
            </div>
            <span className="text-[8px] text-slate-400 dark:text-[#475569] shrink-0">{n.time}</span>
          </div>
        ))}
      </div>
    ),
  },
];

export default function FeaturesPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white dark:bg-[#0F172A] text-slate-900 dark:text-[#F1F5F9] font-sans antialiased overflow-x-hidden transition-colors duration-300">
      <Header />

      {/* ── Hero ── */}
      <section className="relative pt-28 md:pt-40 pb-20 overflow-hidden flex flex-col items-center justify-center">
        <GlowBackground color="#22c55e" size={700} intensity={0.07} className="top-[-15%] left-1/2 -translate-x-1/2" />
        <GlowBackground color="#3b82f6" size={400} intensity={0.04} className="bottom-[5%] right-[-10%]" />

        <div className="w-full max-w-5xl mx-auto px-4 md:px-6 flex flex-col items-center text-center space-y-6 z-10">
          <Reveal delay={0.05}>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#14532D]/10 dark:bg-[#14532D]/70 border border-[#22C55E]/30 text-emerald-800 dark:text-[#86EFAC] text-xs font-semibold uppercase tracking-wider shadow-[0_0_15px_rgba(34,197,94,0.05)]">
              <Sparkles size={12} />
              Complete GCE Toolbox
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.05] max-w-3xl text-slate-900 dark:text-white">
              Elite tools to{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#22C55E] to-[#86EFAC] drop-shadow-sm">
                secure your Grade A.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.15}>
            <p className="text-sm sm:text-base md:text-lg text-slate-650 dark:text-[#94A3B8] max-w-xl leading-relaxed text-balance">
              PassMark merges AI and GCE past papers into a single sleek application. Built specifically for Yaoundé, Douala, Buea.
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => navigate('/auth?tab=signup')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold bg-[#22C55E] text-[#052e16] shadow-[0_0_24px_rgba(34,197,94,0.2)] hover:shadow-[0_0_35px_rgba(34,197,94,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                Start for free <ArrowRight size={16} />
              </button>
              <button
                onClick={() => navigate('/pricing')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-white active:scale-95 transition-all"
              >
                View pricing
              </button>
            </div>
          </Reveal>

          {/* Stats row */}
          <Reveal delay={0.25}>
            <div className="flex items-center gap-6 pt-2 flex-wrap justify-center">
              {[
                { icon: Users, value: '500+', label: 'active students' },
                { icon: Clock, value: '24/7', label: 'available' },
                { icon: Shield, value: '100%', label: 'offline-friendly' },
              ].map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex items-center gap-2 text-slate-500 dark:text-[#64748B]">
                  <Icon size={13} className="text-[#22C55E]" />
                  <span className="text-sm font-bold text-slate-800 dark:text-white">{value}</span>
                  <span className="text-xs">{label}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Feature Pills Nav ── */}
      <section className="sticky top-14 md:top-16 z-30 bg-white/90 dark:bg-[#0F172A]/90 backdrop-blur-md border-b border-slate-200 dark:border-white/5 py-3 px-4 overflow-x-auto hide-scrollbar">
        <div className="flex gap-2 max-w-6xl mx-auto w-max md:w-full md:justify-center">
          {FEATURES.map((f) => (
            <a
              key={f.id}
              href={`#feature-${f.id}`}
              className="shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 border-slate-200 dark:border-white/5 text-slate-500 dark:text-[#64748B] hover:border-slate-300 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white"
            >
              <span>{f.emoji}</span>
              <span className="hidden sm:inline">{f.title.split(' ')[0]}</span>
            </a>
          ))}
        </div>
      </section>

      {/* ── Features — Alternating Layout ── */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto space-y-28">
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon;
            const isReversed = idx % 2 === 1;
            return (
              <Reveal key={feature.id} delay={0.05} y={30}>
                <div id={`feature-${feature.id}`} className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">

                  {/* Text side */}
                  <div className={`space-y-5 ${isReversed ? 'md:order-2' : ''}`}>
                    {/* Badge */}
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                        style={{ backgroundColor: feature.colorBg, borderColor: feature.colorBorder, color: feature.color }}
                      >
                        <Icon size={11} />
                        {feature.badge}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight">
                        {feature.emoji} {feature.title}
                      </h2>
                      <p className="text-sm font-semibold" style={{ color: feature.color }}>{feature.subtitle}</p>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-[#94A3B8] leading-relaxed">
                      {feature.desc}
                    </p>

                    <ul className="space-y-3">
                      {feature.bullets.map((b) => (
                        <li key={b} className="flex items-start gap-3 text-sm text-slate-600 dark:text-[#94A3B8]">
                          <CheckCircle2 size={16} className="shrink-0 mt-0.5" style={{ color: feature.color }} />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      onClick={() => navigate('/auth?tab=signup')}
                      className="inline-flex items-center gap-2 text-sm font-bold transition-all hover:gap-3"
                      style={{ color: feature.color }}
                    >
                      Try it for free <ArrowRight size={14} />
                    </button>
                  </div>

                  {/* Visual side */}
                  <div className={`${isReversed ? 'md:order-1' : ''}`}>
                    <CardSpotlight
                      spotlightColor={feature.colorBg}
                      className="p-4 border h-full bg-slate-50 dark:bg-[#1E293B]/20 border-slate-200 dark:border-white/5"
                    >
                      {feature.visual}
                    </CardSpotlight>
                  </div>

                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ── Comparison Table ── */}
      <section className="py-20 px-4 bg-slate-50 dark:bg-[#1E293B]/10 border-y border-slate-200 dark:border-white/5">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="text-center space-y-3 mb-12">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#431407]/10 dark:bg-[#431407]/60 border border-[#F97316]/30 text-amber-800 dark:text-[#FDBA74] text-xs font-semibold uppercase tracking-wider">
                Comparison
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">PassMark vs. Other Solutions</h2>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/5 shadow-xl bg-white dark:bg-[#0F172A]">
              <table className="w-full min-w-[500px] text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-950/80 border-b border-slate-200 dark:border-white/5">
                    <th className="p-4 text-left font-bold text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider">Feature</th>
                    <th className="p-4 text-center font-bold text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider">Kawlo</th>
                    <th className="p-4 text-center font-bold text-slate-700 dark:text-[#94A3B8] uppercase tracking-wider">Répétiteur</th>
                    <th className="p-4 text-center font-bold text-[#22C55E] uppercase tracking-wider bg-[#14532D]/10 dark:bg-[#14532D]/30 border-x border-[#22C55E]/20">PassMark ⭐</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Price', 'Free + Ads', '5,000 FCFA/hr', '0 – 1,500 FCFA/month'],
                    ['24/7 AI Tutor', '❌', '❌', '✅'],
                    ['Photo Solving', '❌', '✅ (if available)', '✅'],
                    ['Sleek Light & Dark Themes', '❌', '❌', '✅'],
                    ['All Subjects', '✅ with ads', '❌ (1 subject)', '✅'],
                    ['Past Papers 2015-2024', '✅ Watermarked', '❌', '✅'],
                    ['MTN MoMo / Orange Money', 'N/A', 'Cash Only', '✅'],
                  ].map(([feat, kawlo, rep, pm], i) => (
                    <tr key={feat} className={`border-b border-slate-200 dark:border-white/5 ${i % 2 === 0 ? 'bg-slate-50 dark:bg-[#0F172A]/30' : 'bg-white dark:bg-[#1E293B]/10'}`}>
                      <td className="p-4 font-semibold text-slate-900 dark:text-white">{feat}</td>
                      <td className="p-4 text-center text-slate-600 dark:text-[#94A3B8]">{kawlo}</td>
                      <td className="p-4 text-center text-slate-600 dark:text-[#94A3B8]">{rep}</td>
                      <td className="p-4 text-center text-emerald-800 dark:text-[#86EFAC] font-semibold bg-[#14532D]/10 dark:bg-[#14532D]/20 border-x border-[#22C55E]/15">{pm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-4 relative overflow-hidden bg-slate-50 dark:bg-transparent">
        <GlowBackground color="#22c55e" size={600} intensity={0.07} className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

        <div className="max-w-xl mx-auto text-center space-y-6 z-10 relative">
          <Reveal>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#14532D]/10 dark:bg-[#14532D]/60 border border-[#22C55E]/30 text-emerald-800 dark:text-[#86EFAC] text-xs font-semibold uppercase tracking-wider">
              <Zap size={12} />
              Free to Start
            </span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              Ready to raise your GCE scores?
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-sm text-slate-600 dark:text-[#94A3B8] max-w-sm mx-auto leading-relaxed">
              Start practicing with your personal AI tutor for free today. No card required.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="pt-2 max-w-xs mx-auto space-y-3">
              <button
                onClick={() => navigate('/auth?tab=signup')}
                className="w-full py-3.5 rounded-xl font-bold bg-[#22C55E] text-[#052e16] shadow-[0_0_24px_rgba(34,197,94,0.2)] hover:shadow-[0_0_35px_rgba(34,197,94,0.4)] transition-all active:scale-95"
              >
                Create my free profile →
              </button>
              <p className="text-[10px] text-slate-500 dark:text-[#64748B]">
                No card required · PWA installable · Works offline
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
