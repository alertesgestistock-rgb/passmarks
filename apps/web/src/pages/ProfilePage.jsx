
import React, { useState } from 'react';
import { Edit2 } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import OnboardingFlow from '@/components/OnboardingFlow';

export default function ProfilePage() {
  const { user, isLoading } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  if (isLoading) {
    return (
      <div className="animate-pulse flex flex-col gap-4">
        <div className="h-48 bg-slate-200 dark:bg-[#1E293B] rounded-2xl"></div>
        <div className="h-64 bg-slate-200 dark:bg-[#1E293B] rounded-2xl"></div>
      </div>
    );
  }

  if (!user) return null;

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="fade-in">
      {isEditing && (
        <OnboardingFlow isEditMode={true} onClose={() => setIsEditing(false)} />
      )}

      {showModal && (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 fade-in">
          <div className="bg-white dark:bg-[#1E293B] rounded-[12px] p-[20px] max-w-[300px] w-full text-center border border-slate-200 dark:border-transparent shadow-xl">
            <h3 className="text-[16px] font-medium text-slate-900 dark:text-white mb-2">Premium coming soon! 🚀</h3>
            <p className="text-[13px] text-slate-500 dark:text-[#94A3B8] mb-6">You'll get unlimited AI questions, all past papers, and offline mode.</p>
            <button onClick={() => setShowModal(false)} className="w-full bg-[#22C55E] text-[#052e16] py-2 rounded-[8px] font-medium scale-on-click">
              Got it
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-6 flex flex-col items-center justify-center border border-slate-200 dark:border-[#334155]/50 relative shadow-sm mb-8">
        <button
          onClick={() => setIsEditing(true)}
          className="absolute top-4 right-4 bg-slate-100 dark:bg-[#334155] text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white rounded-lg px-3 py-1.5 text-[11px] font-medium flex items-center gap-1.5 transition-colors scale-on-click"
        >
          <Edit2 size={12} /> Edit
        </button>

        <div className="w-[72px] h-[72px] rounded-full bg-[#22C55E] flex items-center justify-center text-[24px] font-medium text-[#052e16] mb-4">
          {getInitials(user.name)}
        </div>
        <h1 className="text-[20px] font-medium text-slate-900 dark:text-white mb-1">{user.name}</h1>
        <p className="text-[13px] text-slate-500 dark:text-[#94A3B8] mb-4">{user.level} · {user.subjects.length} Subjects</p>

        <div className="flex flex-col items-center gap-1">
          <span className="bg-slate-100 dark:bg-[#334155]/50 border border-slate-200 dark:border-[#475569] text-slate-700 dark:text-[#F1F5F9] px-3.5 py-1 rounded-full text-[11px] font-medium">
            Free Plan
          </span>
          <button onClick={() => setShowModal(true)} className="text-[#F97316] text-[11px] underline mt-1">
            Upgrade for unlimited AI · 1 500 FCFA/mo
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-[16px] font-medium text-slate-900 dark:text-white mb-4">My progress</h2>
        <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155]/50 rounded-2xl p-5 flex flex-col gap-5 shadow-sm">
          {user.subjects.length === 0 && (
            <p className="text-[13px] text-slate-400 dark:text-[#64748B] text-center py-4">No subjects added yet. Edit your profile to add subjects.</p>
          )}
          {user.subjects.map((sub) => {
            const solved = user.stats?.bySubject?.[sub] || 0;
            const pct = Math.min((solved / 10) * 100, 100);
            return (
              <div key={sub}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[13px] font-medium text-slate-800 dark:text-[#F1F5F9]">{sub}</span>
                  <span className="text-[11px] text-slate-500 dark:text-[#94A3B8]">{Math.round(pct)}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-[#334155] rounded-full overflow-hidden">
                  <div className="h-full bg-[#22C55E] rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
