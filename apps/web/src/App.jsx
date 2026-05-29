import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './contexts/UserContext';
import { ThemeProvider } from './contexts/ThemeContext';

import LandingPage from './pages/LandingPage';
import PricingPage from './pages/PricingPage';
import FeaturesPage from './pages/FeaturesPage';
import HowItWorksPage from './pages/HowItWorksPage';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';

/* Protected route — redirects to / if not authenticated */
function ProtectedRoute({ children }) {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;
  return children;
}

/* Public route — redirects to /app if already authenticated */
function PublicRoute({ children }) {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) return <Navigate to="/app" replace />;
  return children;
}

function AppRoutes() {
  const { user, isLoading } = useUser();

  return (
    <Routes>
      {/* Public marketing pages */}
      <Route path="/" element={
        <PublicRoute><LandingPage /></PublicRoute>
      } />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />

      {/* Auth */}
      <Route path="/auth" element={
        <PublicRoute><AuthPage /></PublicRoute>
      } />

      {/* Main app — protected */}
      <Route path="/app" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />

      {/* Legacy redirects from old HTML files */}
      <Route path="/landing.html" element={<Navigate to="/" replace />} />
      <Route path="/pricing.html" element={<Navigate to="/pricing" replace />} />

      {/* 404 → landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <UserProvider>
          <AppRoutes />
        </UserProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
