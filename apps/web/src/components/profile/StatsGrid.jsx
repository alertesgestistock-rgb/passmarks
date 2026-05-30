import React from 'react';
import { BookOpen, CheckCircle2, FileText, TrendingUp } from 'lucide-react';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155]/50 rounded-xl p-4 flex flex-col gap-2 shadow-sm">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={15} />
      </div>
      <p className="text-[22px] font-semibold text-slate-900 dark:text-white leading-none">{value}</p>
      <p className="text-[11px] text-slate-500 dark:text-[#94A3B8]">{label}</p>
    </div>
  );
}

export default function StatsGrid({ stats }) {
  const {
    questionsSolved = 0,
    quizzesCompleted = 0,
    papersRead = 0,
    totalScore = 0,
  } = stats || {};

  const avgScore = quizzesCompleted > 0
    ? `${Math.round((totalScore / quizzesCompleted))}%`
    : '—';

  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      <StatCard
        icon={CheckCircle2}
        label="Questions solved"
        value={questionsSolved}
        color="bg-[#22C55E]/10 text-[#22C55E]"
      />
      <StatCard
        icon={TrendingUp}
        label="Quizzes completed"
        value={quizzesCompleted}
        color="bg-blue-500/10 text-blue-500"
      />
      <StatCard
        icon={FileText}
        label="Papers read"
        value={papersRead}
        color="bg-purple-500/10 text-purple-500"
      />
      <StatCard
        icon={BookOpen}
        label="Avg. score"
        value={avgScore}
        color="bg-[#F97316]/10 text-[#F97316]"
      />
    </div>
  );
}
