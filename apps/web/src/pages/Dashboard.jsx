
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { MainLayout } from '@/components/Navigation';
import TokenShopModal from '@/components/TokenShopModal';
import { useUser } from '@/contexts/UserContext';
import HomePage from './HomePage';
import PastPapersPage from './PastPapersPage';
import AITutorPage from './AITutorPage';
import ProfilePage from './ProfilePage';
import SettingsPage from './SettingsPage';
import QuizSetupScreen from './QuizSetupScreen';
import QuizPlayScreen from './QuizPlayScreen';
import QuizResultsScreen from './QuizResultsScreen';
import CalendarPage from './CalendarPage';

export default function Dashboard() {
  const [view, setView] = useState({ path: 'home', state: null });
  const [showTokenShop, setShowTokenShop] = useState(false);
  const [searchParams] = useSearchParams();
  const { refreshTokenBalance } = useUser();

  const navigate = (path, state = null) => {
    setView({ path, state });
  };

  // Handle redirect back from Chariow after payment
  useEffect(() => {
    if (searchParams.get('payment') !== 'success') return;
    window.history.replaceState({}, '', '/app');
    toast.success('Paiement reçu ! Tes tokens seront crédités dans quelques secondes.', { duration: 6000 });
    const t1 = setTimeout(() => refreshTokenBalance(), 4000);
    const t2 = setTimeout(() => refreshTokenBalance(), 12000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Expose globals so external HTML modals can open the token shop or navigate
  useEffect(() => {
    window.passmarkNavigate = navigate;
    window.passmarkOpenTokenShop = () => setShowTokenShop(true);
    return () => {
      delete window.passmarkNavigate;
      delete window.passmarkOpenTokenShop;
    };
  }, []);

  const renderView = () => {
    switch (view.path) {
      case 'home':        return <HomePage navigate={navigate} />;
      case 'papers':      return <PastPapersPage navigate={navigate} />;
      case 'tutor':       return <AITutorPage navigate={navigate} viewState={view.state} />;
      case 'profile':     return <ProfilePage navigate={navigate} />;
      case 'settings':    return <SettingsPage navigate={navigate} />;
      case 'quiz-setup':  return <QuizSetupScreen navigate={navigate} viewState={view.state} />;
      case 'quiz-play':   return <QuizPlayScreen navigate={navigate} viewState={view.state} />;
      case 'quiz-results':return <QuizResultsScreen navigate={navigate} viewState={view.state} />;
      case 'calendar':    return <CalendarPage navigate={navigate} />;
      default:            return <HomePage navigate={navigate} />;
    }
  };

  const getActiveTab = () => {
    if (view.path.startsWith('quiz')) return 'home';
    return view.path;
  };

  return (
    <MainLayout activeTab={getActiveTab()} setActiveTab={(tab) => navigate(tab)}>
      {renderView()}
      {showTokenShop && ReactDOM.createPortal(
        <TokenShopModal onClose={() => setShowTokenShop(false)} />,
        document.body
      )}
    </MainLayout>
  );
}
