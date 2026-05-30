
import React, { useEffect, useState } from 'react';
import { Home, BookOpen, Bot, User, Search, Settings, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import InstallBanner from './InstallBanner';
import NotificationCenter from './NotificationCenter';
import Calculator from './Calculator';

export function Sidebar({ activeTab, setActiveTab }) {
  const navItems = [
    { id: "home", icon: Home, label: "Home" },
    { id: "papers", icon: BookOpen, label: "Past Papers" },
    { id: "tutor", icon: Bot, label: "AI Tutor" },
    { id: "profile", icon: User, label: "Profile" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="hidden lg:flex fixed top-0 left-0 h-screen w-[220px] xl:w-[260px] bg-white dark:bg-[#1E293B] border-r border-slate-200 dark:border-[#334155]/50 flex-col z-50">
      <div className="h-[64px] flex items-center px-4 gap-2 shrink-0">
        <div className="text-[#22C55E]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 12L9 18L21 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 2L22 12L12 22L2 12L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span className="text-[20px] font-semibold tracking-tight text-slate-900 dark:text-white">PassMark</span>
      </div>

      <nav className="flex-1 px-4 py-6 flex flex-col gap-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex items-center gap-3 h-[44px] px-4 rounded-lg transition-all duration-200 shrink-0 w-full text-left relative group",
                isActive
                  ? "bg-slate-100 dark:bg-[#0F172A] text-[#22C55E] font-medium"
                  : "text-slate-500 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#0F172A] hover:text-slate-900 dark:hover:text-[#F1F5F9] hover:-translate-y-[2px]"
              )}
            >
              {isActive && (
                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1 h-1 bg-[#22C55E] rounded-full fade-in" />
              )}
              <item.icon size={20} className={cn("shrink-0 transition-transform duration-100", isActive && "scale-110")} />
              <span className="text-[14px]">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 shrink-0">
        <button className="w-full bg-[#F97316] text-white rounded-lg py-[10px] text-[13px] font-medium hover:brightness-110 scale-on-click">
          Upgrade to Premium
        </button>
      </div>
    </div>
  );
}

export function TopNav({ setActiveTab }) {
  const { theme, toggleTheme } = useTheme();
  const [showCalc, setShowCalc] = useState(false);

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-[#0F172A] lg:bg-white/90 dark:lg:bg-[#0F172A]/90 lg:backdrop-blur-sm border-b border-slate-200 dark:border-[#334155] lg:border-none">
      <div className="h-[64px] flex items-center px-4 lg:px-8">
        {/* Mobile Logo */}
        <div className="flex lg:hidden items-center gap-2 flex-1">
          <div className="text-[#22C55E]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 12L9 18L21 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-[18px] font-semibold text-slate-900 dark:text-white">PassMark</span>
        </div>

        {/* Desktop sidebar placeholder */}
        <div className="hidden lg:block w-[220px] xl:w-[260px] shrink-0"></div>

        {/* Center Search (Desktop) */}
        <div className="hidden lg:flex flex-1 justify-center">
          <div className="relative w-full max-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#64748B]" size={16} />
            <input
              type="text"
              placeholder="Search subject or question..."
              className="w-full bg-slate-100 dark:bg-[#1E293B] text-slate-900 dark:text-[#F1F5F9] rounded-[20px] py-2 pl-9 pr-4 text-[13px] outline-none border border-transparent focus:border-slate-300 dark:focus:border-[#334155] placeholder:text-slate-400 dark:placeholder:text-[#64748B] transition-all"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0 lg:ml-auto">
          {/* Calculator button */}
          <button
            onClick={() => setShowCalc(v => !v)}
            aria-label="Ouvrir la calculatrice"
            title="Calculatrice"
            className="w-[36px] h-[36px] rounded-full bg-slate-100 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155]/50 flex items-center justify-center text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#334155] transition-colors text-[16px]"
          >
            🧮
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="w-[36px] h-[36px] rounded-full bg-slate-100 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155]/50 flex items-center justify-center text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#334155] transition-colors"
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <NotificationCenter navigate={setActiveTab} />

          <button
            onClick={() => setActiveTab('profile')}
            className="w-[36px] h-[36px] rounded-full bg-gradient-to-br from-[#22C55E] to-[#16A34A] flex items-center justify-center text-white text-[14px] font-bold shadow-md hover:brightness-110 scale-on-click"
          >
            CO
          </button>
        </div>
      </div>
      <InstallBanner />
      {showCalc && <Calculator onClose={() => setShowCalc(false)} />}
    </div>
  );
}

export function BottomNav({ activeTab, setActiveTab }) {
  const navItems = [
    { id: "home", icon: Home, label: "Home" },
    { id: "papers", icon: BookOpen, label: "Past Papers" },
    { id: "tutor", icon: Bot, label: "AI Tutor" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 w-full h-[64px] md:h-[72px] bg-white dark:bg-[#1E293B] border-t border-slate-200 dark:border-[#334155] z-50 flex justify-around items-center pb-safe">
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors relative",
              isActive ? "text-[#22C55E]" : "text-slate-400 dark:text-[#64748B]"
            )}
          >
            {isActive && (
              <div className="absolute top-1 w-1 h-1 bg-[#22C55E] rounded-full fade-in" />
            )}
            <item.icon className={cn("w-6 h-6 md:w-[24px] md:h-[24px] transition-transform duration-100", isActive && "scale-110")} />
            <span className="text-[11px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function MainLayout({ children, activeTab, setActiveTab }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey) {
        switch(e.key) {
          case '1': e.preventDefault(); setActiveTab('home'); break;
          case '2': e.preventDefault(); setActiveTab('papers'); break;
          case '3': e.preventDefault(); setActiveTab('tutor'); break;
          case '4': e.preventDefault(); setActiveTab('profile'); break;
          default: break;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTab]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F172A] flex flex-col overflow-x-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <TopNav setActiveTab={setActiveTab} />
      <main className="flex-1 mt-[64px] mb-[64px] md:mb-[72px] lg:mb-0 lg:ml-[220px] xl:ml-[260px] p-4 lg:p-8 min-w-0 overflow-hidden slide-transition fade-in">
        {children}
      </main>
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
