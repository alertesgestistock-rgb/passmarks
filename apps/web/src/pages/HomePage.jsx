import React, { useState, useEffect } from 'react';
import { MessageSquare, Camera, FileText, Award, CalendarDays, Users } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';
import { getTimeGreeting, calculateDaysToExam, getStreakColor } from '@/lib/userStorage';

export default function HomePage({ navigate }) {
  const { user, streak, isLoading } = useUser();
  const [referralCount, setReferralCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_id', user.id)
      .then(({ count }) => setReferralCount(count || 0));
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className="animate-pulse flex flex-col gap-4">
        <div className="h-32 bg-slate-200 dark:bg-[#1E293B] rounded-2xl"></div>
        <div className="h-24 bg-slate-200 dark:bg-[#1E293B] rounded-2xl"></div>
      </div>
    );
  }

  if (!user) return null;

  const greeting = getTimeGreeting(user.name);
  const daysLeft = calculateDaysToExam(user.examMonth, user.examYear);

  let countdownText = '';
  let countdownColor = '';

  if (daysLeft > 60) {
    countdownText = `${daysLeft} days`;
    countdownColor = 'text-[#22C55E]';
  } else if (daysLeft > 30) {
    countdownText = `${daysLeft} days`;
    countdownColor = 'text-[#F97316]';
  } else if (daysLeft > 0) {
    countdownText = `${daysLeft} days — Final push! 🔥`;
    countdownColor = 'text-[#EF4444] font-medium';
  } else {
    countdownText = "Exam time! You've got this 🎯";
    countdownColor = 'text-[#22C55E]';
  }

  const streakColor = getStreakColor(streak.current);

  return (
    <div className="fade-in space-y-6 md:space-y-8">
      {/* Hero Section — greeting + stats côte à côte, pleine largeur */}
      <div className="flex flex-col md:flex-row gap-4 w-full">
        {/* Greeting Card — s'étend pour remplir l'espace restant */}
        <div className="flex-1 bg-white dark:bg-[#1E293B] rounded-2xl p-6 flex flex-col justify-between shadow-sm dark:shadow-lg dark:shadow-black/20 relative overflow-hidden border border-slate-200 dark:border-[#334155]/50 min-h-[140px]">
          <div className="relative z-10">
            <h1 className="text-[18px] md:text-[20px] lg:text-[22px] font-bold text-slate-900 dark:text-white mb-1 tracking-tight leading-snug">{greeting}</h1>
            <p className="text-[13px] md:text-[14px] text-slate-500 dark:text-[#94A3B8] mb-4 font-medium">{user.level} · {user.subjects.length} Subjects</p>
          </div>
          <div className="relative z-10 flex flex-wrap items-center gap-2">
            <div className={`inline-flex w-fit bg-slate-100 dark:bg-[#0F172A] ${countdownColor} px-3.5 py-1.5 rounded-full text-[12px] font-bold tracking-wide uppercase border border-current/10`}>
              {countdownText}
            </div>
            <div className={`inline-flex items-center text-[12px] font-medium ${streakColor}`}>
              🔥 {streak.current} day streak
            </div>
            <button
              onClick={() => navigate('calendar')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20 hover:bg-[#22C55E]/20 transition-colors"
            >
              <CalendarDays size={13} />
              My Calendar
            </button>
          </div>
        </div>

        {/* Stats — largeur fixe en desktop, pleine largeur en mobile */}
        <div className="flex flex-row md:flex-col gap-4 md:w-[200px] lg:w-[240px] xl:w-[280px] shrink-0">
          <div className="flex-1 md:flex-none bg-white dark:bg-[#1E293B] rounded-2xl p-5 border-l-[4px] border-[#22C55E] shadow-sm flex flex-col justify-center border border-slate-200 dark:border-[#334155]/50 border-l-[#22C55E]">
            <span className="text-[24px] md:text-[26px] lg:text-[28px] font-bold text-slate-900 dark:text-white mb-0.5 tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {user.stats.questionsSolved || 0}
            </span>
            <span className="text-[11px] md:text-[12px] text-slate-500 dark:text-[#94A3B8] font-medium leading-tight">Questions solved</span>
          </div>
          <div className="flex-1 md:flex-none bg-white dark:bg-[#1E293B] rounded-2xl p-5 border-l-[4px] border-[#3B82F6] shadow-sm flex flex-col justify-center border border-slate-200 dark:border-[#334155]/50 border-l-[#3B82F6]">
            <span className="text-[24px] md:text-[26px] lg:text-[28px] font-bold text-slate-900 dark:text-white mb-0.5 tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {user.stats.papersRead || 0}
            </span>
            <span className="text-[11px] md:text-[12px] text-slate-500 dark:text-[#94A3B8] font-medium leading-tight">Papers read</span>
          </div>
          <button
            onClick={() => navigate('referrals')}
            className="flex-1 md:flex-none bg-white dark:bg-[#1E293B] rounded-2xl p-5 border-l-[4px] border-[#A855F7] shadow-sm flex flex-col justify-center border border-slate-200 dark:border-[#334155]/50 border-l-[#A855F7] hover:border-[#A855F7]/40 hover:-translate-y-0.5 transition-all text-left"
          >
            <span className="text-[24px] md:text-[26px] lg:text-[28px] font-bold text-slate-900 dark:text-white mb-0.5 tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {referralCount}
            </span>
            <span className="text-[11px] md:text-[12px] text-slate-500 dark:text-[#94A3B8] font-medium leading-tight flex items-center gap-1">
              <Users size={10} className="text-[#A855F7]" /> Referrals
            </span>
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-[15px] md:text-[16px] font-bold text-slate-900 dark:text-white mb-4 tracking-tight">Quick actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
          <button
            onClick={() => navigate('tutor')}
            className="bg-white dark:bg-[#1E293B] h-[110px] rounded-2xl p-4 flex flex-col items-center justify-center gap-3 border border-slate-200 dark:border-[#334155]/50 hover:border-[#22C55E]/50 hover:-translate-y-1 transition-all scale-on-click"
          >
            <div className="w-12 h-12 rounded-xl bg-[#22C55E]/10 text-[#22C55E] flex items-center justify-center">
              <MessageSquare size={22} />
            </div>
            <span className="text-[13px] md:text-[14px] font-semibold text-slate-800 dark:text-[#F1F5F9]">Ask AI</span>
          </button>

          {user.subjects.slice(0, 3).map((sub, idx) => {
            const icons = [<Camera key="icon-0" size={22} />, <FileText key="icon-1" size={22} />, <Award key="icon-2" size={22} />];
            const colors = ['text-[#3B82F6]', 'text-[#F97316]', 'text-[#A855F7]'];
            const bgColors = ['bg-[#3B82F6]/10', 'bg-[#F97316]/10', 'bg-[#A855F7]/10'];
            const borderColors = ['hover:border-[#3B82F6]/50', 'hover:border-[#F97316]/50', 'hover:border-[#A855F7]/50'];
            const actions = ['tutor', 'papers', 'quiz-setup'];

            return (
              <button
                key={`subject-${sub}`}
                onClick={() => navigate(actions[idx % 3])}
                className={`bg-white dark:bg-[#1E293B] h-[110px] rounded-2xl p-4 flex flex-col items-center justify-center gap-3 border border-slate-200 dark:border-[#334155]/50 ${borderColors[idx % 3]} hover:-translate-y-1 transition-all scale-on-click`}
              >
                <div className={`w-12 h-12 rounded-xl ${bgColors[idx % 3]} ${colors[idx % 3]} flex items-center justify-center`}>
                  {icons[idx % 3]}
                </div>
                <span className="text-[13px] md:text-[14px] font-semibold text-slate-800 dark:text-[#F1F5F9] truncate w-full text-center">{sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-[15px] md:text-[16px] font-bold text-slate-900 dark:text-white mb-4 tracking-tight">Recent activity</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          {user.recentActivity && user.recentActivity.length > 0 ? (
            user.recentActivity.slice(0, 3).map((activity) => (
              <div key={`activity-${activity.id}`} className="bg-white dark:bg-[#1E293B] p-4 rounded-2xl border border-slate-200 dark:border-[#334155]/50 hover:border-slate-300 dark:hover:border-[#475569] transition-all flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  activity.type === 'quiz' ? 'bg-[#F97316]/10 text-[#F97316]' :
                  activity.type === 'paper' ? 'bg-[#3B82F6]/10 text-[#3B82F6]' :
                  'bg-[#22C55E]/10 text-[#22C55E]'
                }`}>
                  {activity.type === 'quiz' ? <Award size={20} /> :
                   activity.type === 'paper' ? <FileText size={20} /> :
                   <MessageSquare size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="text-[14px] font-semibold text-slate-900 dark:text-white truncate pr-2">{activity.subject}</h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide shrink-0 ${
                      activity.type === 'quiz' ? 'bg-[#F97316]/10 text-[#F97316]' :
                      activity.type === 'paper' ? 'bg-[#3B82F6]/10 text-[#3B82F6]' :
                      'bg-[#22C55E]/10 text-[#22C55E]'
                    }`}>
                      {activity.type === 'quiz' ? 'Quiz' : activity.type === 'paper' ? 'Paper' : 'Q&A'}
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-500 dark:text-[#94A3B8] truncate">{activity.preview || activity.paper || 'Solved'}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-8 text-center">
              <p className="text-[12px] text-slate-400 dark:text-[#64748B]">No activity yet. Ask the AI your first question! 👇</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
