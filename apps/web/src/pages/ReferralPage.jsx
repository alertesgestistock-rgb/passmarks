import React from 'react';
import ReferralSection from '@/components/profile/ReferralSection';
import OnboardingRewardsWidget from '@/components/onboarding/OnboardingRewardsWidget';

export default function ReferralPage({ navigate }) {
  return (
    <div className="fade-in max-w-xl space-y-6">
      <div>
        <h1 className="text-[18px] font-bold text-slate-900 dark:text-white mb-6">Invite &amp; Earn</h1>
        <ReferralSection />
      </div>
      <OnboardingRewardsWidget navigate={navigate} dismissible />
    </div>
  );
}
