import React from 'react';

/**
 * subjectAccuracy: { [subject]: { score: number, total: number } }
 * Falls back to 0/0 if no quiz sessions for that subject yet.
 */
export default function ProgressSection({ subjects, subjectAccuracy }) {
  if (subjects.length === 0) {
    return (
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155]/50 rounded-2xl p-5 shadow-sm">
        <p className="text-[13px] text-slate-400 dark:text-[#64748B] text-center py-4">
          Aucune matière ajoutée. Modifiez votre profil pour en ajouter.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155]/50 rounded-2xl p-5 flex flex-col gap-5 shadow-sm">
      {subjects.map((sub) => {
        const acc = subjectAccuracy?.[sub];
        const pct = acc && acc.total > 0
          ? Math.round((acc.score / acc.total) * 100)
          : 0;
        const label = acc && acc.total > 0
          ? `${pct}% · ${acc.score}/${acc.total} correct`
          : 'Pas encore de quiz';

        return (
          <div key={sub}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[13px] font-medium text-slate-800 dark:text-[#F1F5F9]">{sub}</span>
              <span className="text-[11px] text-slate-500 dark:text-[#94A3B8]">{label}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 dark:bg-[#334155] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#22C55E] rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
