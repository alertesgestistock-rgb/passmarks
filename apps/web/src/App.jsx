
import React, { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import OnboardingFlow from './components/OnboardingFlow';
import AuthPage from './pages/AuthPage';
import { UserProvider, useUser } from './contexts/UserContext';

function AppContent() {
  const { user, isLoading } = useUser();
  const [showAuth, setShowAuth] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);

  useEffect(() => {
    if (!isLoading && !user) {
      setShowAuth(true);
    }
  }, [isLoading, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#22C55E] border-t-transparent rounded-full animate-pulse"></div>
      </div>
    );
  }

  if (!user) {
    if (showAuth) {
      return (
        <AuthPage 
          onSkip={() => setShowAuth(false)} 
          onSignUp={() => { setShowAuth(false); setOnboardingStep(2); }} 
        />
      );
    }
    return <OnboardingFlow initialStep={onboardingStep} />;
  }

  return <Dashboard />;
}

function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}

export default App;
