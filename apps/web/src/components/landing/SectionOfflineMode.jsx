import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Zap, BookOpen, Clock, RefreshCw } from 'lucide-react';
import CardSpotlight from '../ui/CardSpotlight';

export default function SectionOfflineMode() {
  const [isOnline, setIsOnline] = useState(true);
  const [solvedQuestionsCount, setSolvedQuestionsCount] = useState(24);
  const [isSimulatingAction, setIsSimulatingAction] = useState(false);

  const simulateOfflineAction = () => {
    setIsSimulatingAction(true);
    setTimeout(() => {
      setSolvedQuestionsCount(prev => prev + 1);
      setIsSimulatingAction(false);
    }, 800);
  };

  return (
    <section className="py-20 px-4 bg-slate-50 dark:bg-[#0F172A] border-y border-slate-200 dark:border-white/5 relative overflow-hidden transition-colors duration-300">
      {/* Dynamic Grid Dot Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, #22C55E 1.5px, transparent 1.5px)`,
          backgroundSize: '24px 24px',
        }}
      />

      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Copywriting Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-[#1E3A5F] border border-blue-200 dark:border-[#3B82F6]/30 text-blue-700 dark:text-[#93C5FD] text-xs font-semibold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 text-[#3B82F6]" />
              Built for Cameroon conditions 🇨🇲
            </div>
            
            <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white leading-tight">
              Load-shedding? <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#22C55E] to-[#3B82F6]">
                Your AI tutor stays online.
              </span>
            </h2>
            
            <p className="text-slate-650 dark:text-[#94A3B8] text-base md:text-lg leading-relaxed">
              Don't let expensive data bundles or evening load-shedding stop your revisions. PassMark integrates an elite **Offline Mode (PWA)** technology. Once the application is loaded on your browser, it works 100% offline.
            </p>

            {/* Offline features grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-[#22C55E]/10 flex items-center justify-center text-[#22C55E] shrink-0">
                  <WifiOff size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Offline Past Papers</h4>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">Your previously opened past papers remain fully readable in the app without data.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/10 flex items-center justify-center text-[#3B82F6] shrink-0">
                  <Clock size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Persistent Chat History</h4>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">Access all your previous essay explanations and step-by-step math answers.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-[#F97316]/10 flex items-center justify-center text-[#F97316] shrink-0">
                  <RefreshCw size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Automatic Cloud Sync</h4>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">All your offline progress and quiz completions sync once your connection returns.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
                  <BookOpen size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Ultra-Lightweight App</h4>
                  <p className="text-xs text-slate-500 dark:text-[#94A3B8] mt-0.5">Under 10MB storage size. Uses far less internet bandwidth than WhatsApp.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Simulator Column */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <CardSpotlight 
              hoverLift={false}
              spotlightColor={isOnline ? "rgba(34,197,94,0.1)" : "rgba(249,115,22,0.12)"}
              className="w-full max-w-sm mx-auto border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E293B]/80 shadow-2xl relative overflow-hidden"
            >
              {/* Simulator Header */}
              <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-slate-900/60">
                <span className="text-xs font-semibold text-slate-500 dark:text-[#94A3B8] tracking-wide uppercase">Network Simulator</span>
                <button
                  onClick={() => setIsOnline(!isOnline)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all duration-300 scale-on-click ${
                    isOnline 
                      ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30' 
                      : 'bg-[#F97316]/15 text-[#F97316] border border-[#F97316]/30'
                  }`}
                >
                  {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                  {isOnline ? 'Online' : 'Offline / Outage'}
                </button>
              </div>

              {/* Simulated App Dashboard */}
              <div className="p-4 space-y-4 min-h-[260px] flex flex-col justify-between">
                
                {/* Simulated Network Alert Banner */}
                <AnimatePresence mode="wait">
                  {!isOnline && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -8, height: 0 }}
                      className="flex items-center gap-2 p-2.5 rounded-lg bg-[#431407]/10 dark:bg-[#431407]/60 border border-[#F97316]/20 text-[#C2410C] dark:text-[#FDBA74]"
                    >
                      <WifiOff size={14} className="shrink-0" />
                      <div className="text-[11px] leading-tight">
                        <span className="font-bold">Offline Mode Active</span> — Revise without consuming any data bundle.
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Dashboard Stats */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-[#0F172A]/50 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                    <div>
                      <div className="text-[10px] text-slate-500 dark:text-[#64748B] font-bold uppercase tracking-wider">Collins Obi (U6)</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">Study Streak</div>
                    </div>
                    <div className="flex items-center gap-1 bg-[#22C55E]/10 text-[#22C55E] text-xs font-bold px-2 py-0.5 rounded-full">
                      🔥 12 days
                    </div>
                  </div>

                  {/* Interactive solved exercises counter */}
                  <div className="bg-slate-50 dark:bg-[#0F172A]/50 p-3 rounded-xl border border-slate-200 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-500 dark:text-[#64748B] font-bold uppercase tracking-wider">Questions Solved</div>
                      <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{solvedQuestionsCount}</div>
                    </div>
                    <button
                      onClick={simulateOfflineAction}
                      disabled={isSimulatingAction}
                      className="px-3 py-1.5 rounded-lg bg-[#3B82F6] hover:bg-[#3B82F6]/90 disabled:bg-[#3B82F6]/50 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
                    >
                      {isSimulatingAction ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          {isOnline ? 'Solving...' : 'Caching...'}
                        </>
                      ) : (
                        <>
                          <span>⚡</span>
                          {isOnline ? 'Solve' : 'Solve (offline)'}
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Simulated persistence info */}
                <div className="text-center text-[10px] text-slate-500 dark:text-[#64748B] pt-2 border-t border-slate-100 dark:border-white/5">
                  {isOnline ? (
                    <span className="flex items-center justify-center gap-1 text-[#22C55E]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-ping" />
                      Synchronized with cloud database
                    </span>
                  ) : (
                    <span className="text-[#C2410C] dark:text-[#FDBA74] flex items-center justify-center gap-1">
                      💾 Saved locally. Auto-syncing when online.
                    </span>
                  )}
                </div>

              </div>
            </CardSpotlight>
          </div>
        </div>
      </div>
    </section>
  );
}
