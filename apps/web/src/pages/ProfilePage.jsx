import React, { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';
import OnboardingFlow from '@/components/OnboardingFlow';
import ProfileCard from '@/components/profile/ProfileCard';
import StatsGrid from '@/components/profile/StatsGrid';
import ProgressSection from '@/components/profile/ProgressSection';
import ExamCountdown from '@/components/profile/ExamCountdown';

export default function ProfilePage() {
  const { user, isLoading } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [subjectAccuracy, setSubjectAccuracy] = useState({});

  useEffect(() => {
    if (!user?.id || user.subjects.length === 0) return;

    let cancelled = false;
    supabase
      .from('quiz_sessions')
      .select('subject, score, total')
      .eq('user_id', user.id)
      .eq('completed', true)
      .then(({ data }) => {
        if (cancelled || !data) return;
        const acc = {};
        for (const row of data) {
          if (!acc[row.subject]) acc[row.subject] = { score: 0, total: 0 };
          acc[row.subject].score += row.score;
          acc[row.subject].total += row.total;
        }
        setSubjectAccuracy(acc);
      });

    return () => { cancelled = true; };
  }, [user?.id, user?.subjects?.length]);

  if (isLoading) {
    return (
      <div className="animate-pulse flex flex-col gap-4">
        <div className="h-48 bg-slate-200 dark:bg-[#1E293B] rounded-2xl" />
        <div className="h-24 bg-slate-200 dark:bg-[#1E293B] rounded-2xl" />
        <div className="h-32 bg-slate-200 dark:bg-[#1E293B] rounded-2xl" />
        <div className="h-40 bg-slate-200 dark:bg-[#1E293B] rounded-2xl" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="fade-in">
      {isEditing && (
        <OnboardingFlow isEditMode={true} onClose={() => setIsEditing(false)} />
      )}

      <ProfileCard onEdit={() => setIsEditing(true)} />

      <ExamCountdown examMonth={user.examMonth} examYear={user.examYear} />

      <StatsGrid stats={user.stats} />

      <div>
        <h2 className="text-[16px] font-medium text-slate-900 dark:text-white mb-4">My progress</h2>
        <ProgressSection subjects={user.subjects} subjectAccuracy={subjectAccuracy} />
      </div>
    </div>
  );
}
