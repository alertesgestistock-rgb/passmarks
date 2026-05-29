import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ArrowRight, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function Header() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path;

  const goAuth = (tab = 'signup') => {
    setMenuOpen(false);
    navigate(`/auth?tab=${tab}`);
  };

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 h-14 md:h-16 flex items-center transition-all duration-300 border-b ${
        scrolled || menuOpen
          ? 'bg-white/95 dark:bg-[#0F172A]/95 border-slate-200 dark:border-white/5 shadow-lg'
          : 'bg-transparent border-transparent'
      }`}>
        <div className="w-full max-w-6xl mx-auto px-4 md:px-6 flex items-center justify-between">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-extrabold text-lg md:text-xl tracking-tight text-slate-900 dark:text-white active:scale-95 transition-transform">
            <svg width="28" height="28" viewBox="0 0 64 64" fill="none" className="shrink-0">
              <rect width="64" height="64" rx="16" fill="#1E293B" />
              <path d="M32 10L19 46h5.5l3.5-9h8l3.5 9H45L32 10z" stroke="#22C55E" strokeWidth="2.5" strokeLinejoin="round" fill="none" />
              <path d="M23.5 35h17" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M32 10v5" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="32" cy="8" r="3" fill="#3B82F6" />
              <path d="M30 7.5l1.5 1.5 2.5-2.5" stroke="#0F172A" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Pass<span className="text-[#22C55E]">Mark</span></span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link 
              to="/features" 
              className={`text-sm font-medium transition-colors ${
                isActive('/features') ? 'text-[#22C55E]' : 'text-slate-600 hover:text-slate-900 dark:text-[#94A3B8] dark:hover:text-white'
              }`}
            >
              {t('nav.features')}
            </Link>
            <Link 
              to="/how-it-works" 
              className={`text-sm font-medium transition-colors ${
                isActive('/how-it-works') ? 'text-[#22C55E]' : 'text-slate-600 hover:text-slate-900 dark:text-[#94A3B8] dark:hover:text-white'
              }`}
            >
              {t('nav.how_it_works')}
            </Link>
            <Link 
              to="/pricing" 
              className={`text-sm font-medium transition-colors ${
                isActive('/pricing') ? 'text-[#22C55E]' : 'text-slate-600 hover:text-slate-900 dark:text-[#94A3B8] dark:hover:text-white'
              }`}
            >
              {t('nav.pricing')}
            </Link>
          </div>

          {/* Desktop CTA actions */}
          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 dark:text-[#94A3B8] dark:hover:text-white transition-colors active:scale-95"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button 
              className="px-4 py-1.5 rounded-lg text-sm font-bold text-slate-600 hover:text-slate-900 dark:text-[#94A3B8] dark:hover:text-white transition-all active:scale-95" 
              onClick={() => goAuth('signin')}
            >
              {t('nav.sign_in')}
            </button>
            <button 
              className="px-4 py-1.5 rounded-lg text-sm font-bold bg-[#22C55E] text-[#052e16] shadow-[0_0_20px_rgba(34,197,94,0.2)] hover:shadow-[0_0_24px_rgba(34,197,94,0.35)] transition-all active:scale-95" 
              onClick={() => goAuth('signup')}
            >
              {t('nav.get_started')}
            </button>
          </div>

          {/* Mobile Right Controls */}
          <div className="flex md:hidden items-center gap-2">
            <button 
              onClick={toggleTheme}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-700 dark:text-[#94A3B8] active:scale-95"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button 
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-slate-700 dark:text-[#94A3B8] active:scale-95" 
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle Navigation Menu"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

        </div>
      </nav>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 top-14 md:top-16 bottom-0 bg-white/98 dark:bg-[#0F172A]/98 backdrop-blur-lg z-40 p-6 flex flex-col gap-4 overflow-y-auto"
          >
            <Link 
              to="/features" 
              className={`text-base font-semibold py-3 border-b border-slate-200 dark:border-white/5 flex items-center justify-between ${
                isActive('/features') ? 'text-[#22C55E]' : 'text-slate-900 dark:text-[#F1F5F9]'
              }`}
            >
              <span>{t('nav.features')}</span>
              <ArrowRight size={16} className="text-slate-500 dark:text-[#94A3B8]" />
            </Link>
            
            <Link 
              to="/how-it-works" 
              className={`text-base font-semibold py-3 border-b border-slate-200 dark:border-white/5 flex items-center justify-between ${
                isActive('/how-it-works') ? 'text-[#22C55E]' : 'text-slate-900 dark:text-[#F1F5F9]'
              }`}
            >
              <span>{t('nav.how_it_works')}</span>
              <ArrowRight size={16} className="text-slate-500 dark:text-[#94A3B8]" />
            </Link>
            
            <Link 
              to="/pricing" 
              className={`text-base font-semibold py-3 border-b border-slate-200 dark:border-white/5 flex items-center justify-between ${
                isActive('/pricing') ? 'text-[#22C55E]' : 'text-slate-900 dark:text-[#F1F5F9]'
              }`}
            >
              <span>{t('nav.pricing')}</span>
              <ArrowRight size={16} className="text-slate-500 dark:text-[#94A3B8]" />
            </Link>

            <div className="flex flex-col gap-3 mt-6">
              <button 
                className="w-full py-3.5 rounded-xl font-bold bg-[#22C55E] text-[#052e16] text-center active:scale-98 transition-transform" 
                onClick={() => goAuth('signup')}
              >
                {t('landing.hero.cta_primary')}
              </button>
              
              <button 
                className="w-full py-3.5 rounded-xl font-bold bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-center active:scale-98 transition-transform" 
                onClick={() => goAuth('signin')}
              >
                {t('nav.sign_in')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
