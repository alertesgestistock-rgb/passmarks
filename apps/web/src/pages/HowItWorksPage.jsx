import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  UserPlus, Award, ArrowRight, Check,
  ChevronRight, Star, Zap, Shield, BookOpen, Bot
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

const STEPS = [
  {
    num: 1,
    icon: UserPlus,
    emoji: '👤',
    color: '#22C55E',
    colorDark: '#14532D',
    colorBg: 'rgba(34,197,94,0.12)',
    colorBorder: 'rgba(34,197,94,0.25)',
    shadow: '0 0 40px rgba(34,197,94,0.2)',
    duration: '30 Seconds',
    title: 'Configure Your Profile',
    subtitle: 'No credit card required',
    desc: 'Tell us which exam you are preparing: GCE Ordinary Level or Advanced Level. Select your key subjects: Mathematics, Physics, History, Literature, etc. No need to register to start — you can even explore in Guest Mode.',
    bullets: ['O Level or A Level selector', 'Choose your specific subjects', 'Guest Mode ready immediately', 'Takes less than 30 seconds'],
    visual: (
      <div className="space-y-3">
        <div className="text-[9px] text-slate-500 dark:text-[#64748B] font-bold uppercase tracking-wider">Create My Profile</div>
        <div className="space-y-2">
          <div className="text-[10px] text-slate-600 dark:text-[#94A3B8] font-semibold">Exam Level</div>
          <div className="flex gap-2">
            <div className="px-3 py-1.5 rounded-lg bg-[#14532D]/10 dark:bg-[#14532D]/60 border border-[#22C55E]/40 text-[#16A34A] dark:text-[#86EFAC] text-xs font-bold">✓ A Level</div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-500 dark:text-[#64748B] text-xs">O Level</div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-[10px] text-slate-600 dark:text-[#94A3B8] font-semibold">My Subjects</div>
          <div className="flex flex-wrap gap-1.5">
            {['Physics ✓', 'Chemistry ✓', 'Maths ✓', '+ Add'].map((s, i) => (
              <span key={s} className={`px-2 py-1 rounded text-[9px] font-bold ${
                i < 3 ? 'bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#16A34A] dark:text-[#86EFAC]'
                : 'bg-slate-100 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/10 text-slate-400 dark:text-[#475569]'
              }`}>{s}</span>
            ))}
          </div>
        </div>
        <button className="w-full py-2 rounded-xl bg-[#22C55E] text-[#052e16] text-xs font-black">
          Start for Free →
        </button>
      </div>
    ),
  },
  {
    num: 2,
    icon: Bot,
    emoji: '🤖',
    color: '#3B82F6',
    colorDark: '#1E3A5F',
    colorBg: 'rgba(59,130,246,0.12)',
    colorBorder: 'rgba(59,130,246,0.25)',
    shadow: '0 0 40px rgba(59,130,246,0.2)',
    duration: '< 10 Seconds Response',
    title: 'Ask Claude Anything',
    subtitle: 'Text, Photo or PDF',
    desc: 'Whenever you get stuck on a past paper question, just type your question, upload a PDF, or snap a photo of your handwritten homework. Your AI tutor Claude analyzes the problem and details the complete calculations step by step, available 24/7.',
    bullets: ['Text question support', 'Upload photos or PDF documents', 'Answers in under 10 seconds', 'Available 24/7 for night studies'],
    visual: (
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
          <div className="w-6 h-6 rounded-full bg-[#3B82F6]/15 flex items-center justify-center text-sm">🤖</div>
          <span className="text-[10px] font-bold text-slate-800 dark:text-white">PassMark AI Tutor</span>
          <span className="ml-auto text-[9px] text-[#22C55E] flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-[#22C55E] animate-pulse" /> Claude
          </span>
        </div>
        <div className="flex justify-end">
          <div className="px-3 py-2 rounded-xl rounded-tr-sm bg-[#1E3A5F]/10 dark:bg-[#1E3A5F]/70 border border-[#3B82F6]/20 text-xs text-slate-850 dark:text-white max-w-[85%]">
            Calculate Δ = b² - 4ac for 2x²-5x+3=0
          </div>
        </div>
        <div className="px-3 py-2.5 rounded-xl rounded-tl-sm bg-slate-50 dark:bg-[#1E293B]/80 border border-slate-200 dark:border-white/5 text-[11px] text-slate-650 dark:text-[#94A3B8] space-y-1.5 leading-relaxed max-w-[92%]">
          <p>a=2, b=-5, c=3 → <span className="text-slate-900 dark:text-white font-mono">Δ = 25 - 24 = 1</span></p>
          <div className="bg-[#14532D]/10 dark:bg-[#14532D]/60 border border-[#22C55E]/30 rounded-lg p-1.5 text-[#16A34A] dark:text-[#86EFAC] font-mono text-[9px]">
            x = (5 ± 1) / 4 → x = 1.5 or x = 1 ✓
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <div className="flex-1 bg-slate-100 dark:bg-[#1E293B]/50 border border-slate-200 dark:border-white/5 rounded-lg px-2 py-1.5 text-[9px] text-slate-400 dark:text-[#475569]">
            Ask a follow-up question...
          </div>
          <div className="w-7 h-7 rounded-lg bg-[#3B82F6] flex items-center justify-center text-xs text-white shrink-0">⚡</div>
        </div>
      </div>
    ),
  },
  {
    num: 3,
    icon: BookOpen,
    emoji: '📚',
    color: '#A78BFA',
    colorDark: '#3B0764',
    colorBg: 'rgba(167,139,250,0.12)',
    colorBorder: 'rgba(167,139,250,0.25)',
    shadow: '0 0 40px rgba(167,139,250,0.2)',
    duration: 'Papers 2015–2024',
    title: 'Review Past Papers',
    subtitle: 'All Official GCE Subjects',
    desc: 'Browse official past papers of the Buea GCE Board directly inside the app. Filter by subject, year, and level. Access the integrated "Ask AI" button on any question to get an instant explanation.',
    bullets: ['All subjects available', 'Smart filters', 'Integrated Ask AI button', 'Reads instantly without download'],
    visual: (
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-slate-500 dark:text-[#64748B] font-bold uppercase tracking-wider">Past Papers</span>
          <span className="text-[8px] text-[#A78BFA] bg-[#3B0764]/10 dark:bg-[#3B0764]/40 border border-[#A78BFA]/20 px-1.5 py-0.5 rounded">2015–2024</span>
        </div>
        {[
          { sub: 'Physics', year: '2023 P1', grade: 'A Level' },
          { sub: 'Chemistry', year: '2023 P2', grade: 'O Level' },
          { sub: 'Mathematics', year: '2022 P1', grade: 'A Level' },
        ].map((p, i) => (
          <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-[#1E293B]/60 border border-slate-200 dark:border-white/5">
            <span className="text-[#A78BFA] text-sm">📄</span>
            <div className="flex-1">
              <div className="text-xs text-slate-800 dark:text-white font-semibold">{p.sub} – {p.year}</div>
              <div className="text-[9px] text-slate-500 dark:text-[#64748B]">{p.grade}</div>
            </div>
            <span className="text-[9px] font-bold text-[#A78BFA] border border-[#A78BFA]/30 px-1.5 py-0.5 rounded">Ask AI</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    num: 4,
    icon: Award,
    emoji: '🏆',
    color: '#F97316',
    colorDark: '#431407',
    colorBg: 'rgba(249,115,22,0.12)',
    colorBorder: 'rgba(249,115,22,0.25)',
    shadow: '0 0 40px rgba(249,115,22,0.2)',
    duration: 'Grade A Guarantee*',
    title: 'Quiz & Score Reports',
    subtitle: 'Validate your knowledge',
    desc: 'Once you understand the methods, generate timed GCE-style MCQs to test your memory. Track your grade analytics and find weaknesses before the examiner does.',
    bullets: ['Timed Paper 1 MCQs', 'Instant corrections & guides', 'Weekly analytics by subject', 'Show up confident on exam day'],
    visual: (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-slate-500 dark:text-[#64748B] font-bold uppercase tracking-wider">Quiz Results</span>
          <span className="text-[9px] text-[#F97316]">Biology · O Level</span>
        </div>
        <div className="flex items-center justify-between bg-[#431407]/10 dark:bg-[#431407]/40 border border-[#F97316]/20 rounded-xl p-3">
          <div>
            <div className="text-[10px] text-slate-500 dark:text-[#64748B]">Final Score</div>
            <div className="text-2xl font-black text-slate-800 dark:text-white mt-0.5">94%</div>
          </div>
          <div className="text-center">
            <div className="text-[10px] text-slate-500 dark:text-[#64748B]">GCE Grade</div>
            <div className="text-xl font-black text-[#F97316] mt-0.5">Grade A</div>
          </div>
        </div>
        <div className="space-y-1.5">
          {[['Physics', 92], ['Chemistry', 88], ['Mathematics', 97]].map(([sub, pct]) => (
            <div key={sub} className="flex items-center gap-2">
              <span className="text-[9px] text-slate-600 dark:text-[#94A3B8] w-20 shrink-0">{sub}</span>
              <div className="flex-1 h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="h-full bg-gradient-to-r from-[#F97316] to-[#FDBA74] rounded-full"
                />
              </div>
              <span className="text-[9px] font-bold text-[#F97316] w-8 text-right">{pct}%</span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

const PERSONAS = [
  {
    name: 'Collins, Age 18',
    badge: 'Upper Sixth · GBHS Essos',
    color: '#22C55E',
    colorBg: 'rgba(34,197,94,0.08)',
    colorBorder: 'rgba(34,197,94,0.2)',
    emoji: '👨‍💻',
    method: '📸 Photo-Solving & PDF Reader',
    story: 'Studies on his Tecno Spark at night in Essos, Yaoundé. He uses PassMark to systematically tackle previous GCE chemistry papers, analyzing each calculation step-by-step to perfect his exam preparation.',
    result: 'Grade B → Grade A in Chemistry',
  },
  {
    name: 'Blessing, Age 16',
    badge: 'Form 5 · Makepe, Douala',
    color: '#3B82F6',
    colorBg: 'rgba(59,130,246,0.08)',
    colorBorder: 'rgba(59,130,246,0.2)',
    emoji: '👩‍📚',
    method: '💬 Socratic Chat & Quizzes',
    story: 'Shares her aunt\'s Infinix phone in the evening. Falling behind in English Grammar, she asks simple questions to the AI tutor without shame, progressing at her own pace with zero judgment.',
    result: 'Caught up in 6 weeks in English',
  },
  {
    name: 'Divine, Age 19',
    badge: 'Private Candidate · Biyem-Assi',
    color: '#F97316',
    colorBg: 'rgba(249,115,22,0.08)',
    colorBorder: 'rgba(249,115,22,0.2)',
    emoji: '🧑‍🏭',
    method: '✏️ Essay Correction & Photo Solver',
    story: 'Runs a Momo call box in Biyem-Assi. No school, no private répétiteur. He snaps photos of his handwritten history essays to receive methodology reviews and indicative grades from PassMark.',
    result: 'AI tutor was his only teacher',
  },
];

export default function HowItWorksPage() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0F172A] text-slate-900 dark:text-[#F1F5F9] font-sans antialiased overflow-x-hidden transition-colors duration-300">
      <Header />

      {/* ── Hero ── */}
      <section className="relative pt-28 md:pt-40 pb-20 overflow-hidden flex flex-col items-center justify-center">
        <GlowBackground color="#3b82f6" size={600} intensity={0.06} className="top-[-10%] left-1/2 -translate-x-1/2" />
        <GlowBackground color="#22c55e" size={400} intensity={0.04} className="bottom-[5%] left-[-10%]" />

        <div className="w-full max-w-5xl mx-auto px-4 md:px-6 flex flex-col items-center text-center space-y-6 z-10">
          <Reveal delay={0.05}>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#3B82F6]/10 dark:bg-[#3B82F6]/70 border border-[#3B82F6]/30 text-blue-800 dark:text-[#93C5FD] text-xs font-semibold uppercase tracking-wider">
              📖 Step-by-Step Methodology
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.05] max-w-3xl text-slate-900 dark:text-white">
              How it works?{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#22C55E] to-[#86EFAC]">
                4 steps to your Grade A.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.15}>
            <p className="text-sm sm:text-base md:text-lg text-slate-650 dark:text-[#94A3B8] max-w-xl leading-relaxed text-balance">
              No complex forms, no friction. See how PassMark turns lonely exam cramming into a structured daily habit.
            </p>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => navigate('/auth?tab=signup')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold bg-[#22C55E] text-[#052e16] shadow-[0_0_24px_rgba(34,197,94,0.2)] hover:shadow-[0_0_35px_rgba(34,197,94,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                Get Started Now <ArrowRight size={16} />
              </button>
              <button
                onClick={() => navigate('/features')}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-white active:scale-95 transition-all"
              >
                View Features
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Interactive Step Switcher ── */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center space-y-2 mb-12">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">The Student Journey</h2>
              <p className="text-sm text-slate-500 dark:text-[#64748B]">Click on any step below to see details</p>
            </div>
          </Reveal>

          {/* Step tabs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
            {STEPS.map((step, i) => (
              <button
                key={step.num}
                onClick={() => setActiveStep(i)}
                className={`p-4 rounded-2xl border text-left transition-all duration-200 ${
                  activeStep === i
                    ? 'border-opacity-100 shadow-lg'
                    : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#1E293B]/20 hover:border-slate-300 dark:hover:border-white/10'
                }`}
                style={activeStep === i ? {
                  borderColor: step.colorBorder,
                  backgroundColor: step.colorBg,
                  boxShadow: step.shadow,
                } : {}}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white mb-3 transition-all"
                  style={{ backgroundColor: activeStep === i ? step.color : 'rgba(255,255,255,0.1)' }}
                >
                  {step.num}
                </div>
                <div className="text-xs font-bold text-slate-800 dark:text-white leading-tight">{step.title}</div>
                <div className="text-[10px] mt-1" style={{ color: activeStep === i ? step.color : '#64748B' }}>
                  {step.duration}
                </div>
              </button>
            ))}
          </div>

          {/* Active step detail */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              {(() => {
                const step = STEPS[activeStep];
                const Icon = step.icon;
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    {/* Text */}
                    <div className="space-y-5">
                      <div
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                        style={{ backgroundColor: step.colorBg, borderColor: step.colorBorder, color: step.color }}
                      >
                        <Icon size={11} />
                        Step {step.num} — {step.subtitle}
                      </div>

                      <div>
                        <h3 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
                          {step.emoji} {step.title}
                        </h3>
                        <p className="text-sm mt-1 font-semibold" style={{ color: step.color }}>{step.duration}</p>
                      </div>

                      <p className="text-sm text-slate-600 dark:text-[#94A3B8] leading-relaxed">{step.desc}</p>

                      <ul className="space-y-3">
                        {step.bullets.map((b) => (
                          <li key={b} className="flex items-center gap-3 text-sm text-slate-650 dark:text-[#94A3B8]">
                            <Check size={15} className="shrink-0" style={{ color: step.color }} />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>

                      {activeStep < STEPS.length - 1 ? (
                        <button
                          onClick={() => setActiveStep(activeStep + 1)}
                          className="inline-flex items-center gap-2 text-sm font-bold transition-all hover:gap-3"
                          style={{ color: step.color }}
                        >
                          Next Step <ChevronRight size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate('/auth?tab=signup')}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95"
                          style={{ backgroundColor: step.color, color: step.colorDark || '#0F172A' }}
                        >
                          Start Free Now <ArrowRight size={15} />
                        </button>
                      )}
                    </div>

                    {/* Visual */}
                    <div>
                      <CardSpotlight
                        spotlightColor={step.colorBg}
                        className="p-5 border bg-slate-50 dark:bg-[#1E293B]/20 border-slate-200 dark:border-white/5"
                      >
                        {step.visual}
                      </CardSpotlight>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ── Full Steps Timeline ── */}
      <section className="py-20 px-4 bg-slate-50 dark:bg-[#1E293B]/10 border-y border-slate-200 dark:border-white/5">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-center space-y-3 mb-16">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#14532D]/10 dark:bg-[#14532D] border border-[#22C55E]/30 text-emerald-800 dark:text-[#86EFAC] text-xs font-semibold uppercase tracking-wider">
                Method Detail
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">The PassMark revision method explained</h2>
            </div>
          </Reveal>

          <div className="relative">
            {/* Timeline line */}
            <div className="hidden md:block absolute left-[28px] top-0 bottom-0 w-px bg-gradient-to-b from-[#22C55E]/40 via-[#3B82F6]/40 to-[#F97316]/20" />

            <div className="space-y-12">
              {STEPS.map((step, idx) => {
                return (
                  <Reveal key={step.num} delay={idx * 0.1} y={20}>
                    <div className="flex gap-6 md:gap-10 items-start">
                      {/* Number circle */}
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-black text-white shrink-0 relative z-10 shadow-xl"
                        style={{ backgroundColor: step.color, boxShadow: step.shadow }}
                      >
                        {step.num}
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-8 md:pb-0">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                          <div className="flex-1 space-y-3">
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: step.color }}>
                                {step.duration}
                              </div>
                              <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white">{step.emoji} {step.title}</h3>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-[#94A3B8] leading-relaxed">{step.desc}</p>
                          </div>

                          <div className="w-full sm:w-64 shrink-0">
                            <div
                              className="p-4 rounded-2xl border bg-white dark:bg-[#080F1A]/80 border-slate-200 dark:border-white/5"
                            >
                              {step.visual}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Personas ── */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <Reveal>
            <div className="text-center space-y-3 mb-16">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#14532D]/10 dark:bg-[#14532D] border border-[#22C55E]/30 text-emerald-800 dark:text-[#86EFAC] text-xs font-semibold uppercase tracking-wider">
                👥 Case Studies
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">How our students use PassMark</h2>
              <p className="text-sm text-slate-550 dark:text-[#64748B]">From Yaoundé to Douala to Buea — different backgrounds, same success.</p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PERSONAS.map((persona, idx) => (
              <Reveal key={persona.name} delay={idx * 0.1}>
                <CardSpotlight
                  hoverLift={true}
                  spotlightColor={persona.colorBg}
                  className="p-6 border h-full flex flex-col justify-between bg-slate-50 dark:bg-[#1E293B]/30 border-slate-200 dark:border-white/5"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">{persona.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-[#64748B] mt-0.5">{persona.badge}</div>
                      </div>
                      <span className="text-2xl">{persona.emoji}</span>
                    </div>

                    {/* Story */}
                    <p className="text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed">{persona.story}</p>

                    {/* Method */}
                    <div className="text-[10px] font-bold text-slate-500 dark:text-[#64748B] bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-lg px-3 py-2">
                      {persona.method}
                    </div>
                  </div>

                  {/* Result */}
                  <div
                    className="mt-5 pt-4 border-t flex items-center gap-2 border-slate-200 dark:border-white/5"
                  >
                    <Star size={12} style={{ color: persona.color }} className="shrink-0" />
                    <span className="text-xs font-bold" style={{ color: persona.color }}>{persona.result}</span>
                  </div>
                </CardSpotlight>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ Quick ── */}
      <section className="py-20 px-4 bg-slate-50 dark:bg-[#1E293B]/10 border-t border-slate-200 dark:border-white/5">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <div className="text-center space-y-3 mb-12">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">Quick Q&A</h2>
            </div>
          </Reveal>

          <div className="space-y-3">
            {[
              { q: 'Can I study 24/7 on my phone?', a: 'Yes. PassMark is fully responsive and optimized for mobile browsers or as a PWA, allowing you to revise your subjects and chat with the AI tutor 24/7 on any device.' },
              { q: 'How do I pay without a bank card?', a: 'You can pay with MTN Mobile Money or Orange Money directly from your phone — exactly how you buy data packages.' },
              { q: 'Does the AI know the Cameroon GCE syllabus?', a: 'Yes. PassMark is trained on official Buea GCE Board requirements. It knows what examiners expect for both O Level and A Level.' },
              { q: 'Is it really free?', a: '10 AI questions per day, all official GCE past papers, and standard features are completely free forever. No credit card required.' },
            ].map(({ q, a }, i) => (
              <Reveal key={q} delay={i * 0.05}>
                <details className="group bg-white dark:bg-[#1E293B]/40 border border-slate-200 dark:border-white/5 rounded-xl overflow-hidden shadow-sm">
                  <summary className="w-full flex justify-between items-center p-4 text-left font-semibold text-slate-800 dark:text-white text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors list-none">
                    <span>{q}</span>
                    <ChevronRight size={16} className="text-[#94A3B8] group-open:rotate-90 transition-transform shrink-0" />
                  </summary>
                  <p className="p-4 pt-0 text-xs text-slate-600 dark:text-[#94A3B8] leading-relaxed">{a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-4 relative overflow-hidden bg-slate-50 dark:bg-transparent">
        <GlowBackground color="#22c55e" size={600} intensity={0.07} className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

        <div className="max-w-xl mx-auto text-center space-y-6 z-10 relative">
          <Reveal>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#14532D]/10 dark:bg-[#14532D]/60 border border-[#22C55E]/30 text-emerald-800 dark:text-[#86EFAC] text-xs font-semibold uppercase tracking-wider">
              <Zap size={12} />
              Ready in 30 Seconds
            </span>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              Don't face the GCE alone.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="text-sm text-slate-600 dark:text-[#94A3B8] max-w-sm mx-auto leading-relaxed">
              Join Collins, Blessing, and Divine inside the PassMark revision room today.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="pt-2 max-w-xs mx-auto space-y-3">
              <button
                onClick={() => navigate('/auth?tab=signup')}
                className="w-full py-3.5 rounded-xl font-bold bg-[#22C55E] text-[#052e16] shadow-[0_0_24px_rgba(34,197,94,0.2)] hover:shadow-[0_0_35px_rgba(34,197,94,0.4)] transition-all active:scale-95"
              >
                Study for Free →
              </button>
              <p className="text-[10px] text-slate-500 dark:text-[#64748B]">
                10 free daily AI questions · PWA friendly · Sleek Dark/Light Theme
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
