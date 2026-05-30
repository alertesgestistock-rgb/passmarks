import React, { useMemo } from 'react';
import { CalendarClock } from 'lucide-react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function ExamCountdown({ examMonth, examYear }) {
  const countdown = useMemo(() => {
    if (!examMonth || !examYear) return null;

    const monthIndex = MONTHS.findIndex(
      (m) => m.toLowerCase() === examMonth.toLowerCase()
    );
    if (monthIndex === -1) return null;

    const examDate = new Date(Number(examYear), monthIndex, 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffMs = examDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return { diffDays, examMonth, examYear };
  }, [examMonth, examYear]);

  if (!countdown) return null;

  const { diffDays } = countdown;

  let message, colorClass;
  if (diffDays < 0) {
    message = 'Examen passé';
    colorClass = 'text-slate-400 dark:text-[#64748B]';
  } else if (diffDays === 0) {
    message = "C'est aujourd'hui !";
    colorClass = 'text-[#22C55E]';
  } else if (diffDays <= 30) {
    message = `${diffDays} jour${diffDays > 1 ? 's' : ''} avant l'examen`;
    colorClass = 'text-[#F97316]';
  } else {
    message = `${diffDays} jours avant l'examen`;
    colorClass = 'text-slate-700 dark:text-[#F1F5F9]';
  }

  return (
    <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155]/50 rounded-2xl p-4 flex items-center gap-3 shadow-sm mb-6">
      <div className="w-9 h-9 rounded-lg bg-[#22C55E]/10 flex items-center justify-center flex-shrink-0">
        <CalendarClock size={16} className="text-[#22C55E]" />
      </div>
      <div>
        <p className={`text-[13px] font-medium ${colorClass}`}>{message}</p>
        <p className="text-[11px] text-slate-400 dark:text-[#64748B]">
          {countdown.examMonth} {countdown.examYear}
        </p>
      </div>
    </div>
  );
}
