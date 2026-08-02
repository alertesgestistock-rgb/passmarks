import React from 'react';
import ReferralSection from '@/components/profile/ReferralSection';
import OnboardingRewardsWidget from '@/components/onboarding/OnboardingRewardsWidget';

export default function ReferralPage({ navigate }) {
  return (
    <div className="fade-in">
      <h1 className="text-[18px] font-bold text-slate-900 dark:text-white mb-6">Invite &amp; Earn</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 items-start max-w-5xl">
        <ReferralSection />
        <OnboardingRewardsWidget navigate={navigate} dismissible />
      </div>
    </div>
  );
}
