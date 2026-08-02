
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { Home, BookOpen, GraduationCap, User, Search, Settings, Sun, Moon, Calculator as CalcIcon, WifiOff, CalendarDays, RotateCw, Download, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useUser } from '@/contexts/UserContext';
import InstallBanner from './InstallBanner';
import NotificationCenter from './NotificationCenter';
import Calculator from './Calculator';
import TokenBalance from './TokenBalance';
import TokenShopModal from './TokenShopModal';
import { OnboardingRewardsBanner } from './onboarding/OnboardingRewardsBanner';

export function Sidebar({ activeTab, setActiveTab }) {
  const { tokenBalance } = useUser();
  const [showTokenShop, setShowTokenShop] = useState(false);
  const navItems = [
    { id: "home",     icon: Home,         label: "Home" },
    { id: "papers",   icon: BookOpen,      label: "Past Papers" },
    { id: "tutor",    icon: GraduationCap, label: "AI Tutor" },
    { id: "calendar",  icon: CalendarDays,  label: "Calendar" },
    { id: "referrals", icon: Users,         label: "Referrals" },
    { id: "profile",   icon: User,          label: "Profile" },
    { id: "settings", icon: Settings,      label: "Settings" },
  ];

  return (
    <div className="hidden lg:flex fixed top-0 left-0 h-screen w-[220px] xl:w-[260px] bg-white dark:bg-[#1E293B] border-r border-slate-200 dark:border-[#334155]/50 flex-col z-50">
      <div className="h-[64px] flex items-center px-4 gap-2 shrink-0">
        <img src="/icon-192.jpg" alt="PassMark" width="28" height="28" className="shrink-0 rounded-lg" />
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

      <div className="p-4 shrink-0 flex flex-col gap-2">
        {tokenBalance !== null ? (
          <TokenBalance balance={tokenBalance} onClick={() => setShowTokenShop(true)} />
        ) : (
          <button
            onClick={() => setShowTokenShop(true)}
            className="w-full bg-[#F97316] text-white rounded-lg py-[10px] text-[13px] font-medium hover:brightness-110 scale-on-click"
          >
            Buy Tokens
          </button>
        )}
        {showTokenShop && <TokenShopModal onClose={() => setShowTokenShop(false)} />}
      </div>
    </div>
  );
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

export function TopNav({ setActiveTab }) {
  const { user, tokenBalance } = useUser();
  const { theme, toggleTheme } = useTheme();
  const [showCalc, setShowCalc] = useState(false);
  const [showTokenShop, setShowTokenShop] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // True only when running as an installed PWA (standalone mode)
  const isPWA =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.startsWith('android-app://');

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-white dark:bg-[#0F172A] lg:bg-white/90 dark:lg:bg-[#0F172A]/90 lg:backdrop-blur-sm border-b border-slate-200 dark:border-[#334155] lg:border-none">
      <div className="h-[64px] flex items-center px-4 lg:px-8">
        {/* Mobile Logo */}
        <div className="flex lg:hidden items-center gap-2 shrink-0">
          <img src="/icon-192.jpg" alt="PassMark" width="26" height="26" className="shrink-0 rounded-lg" />
          <span className="text-[18px] font-semibold text-slate-900 dark:text-white hidden min-[390px]:inline-block">PassMark</span>
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
        <div className="flex items-center gap-2 shrink-0 flex-1 justify-end">
          {/* Offline indicator — visible only when disconnected */}
          {isOffline && (
            <div
              title="No internet connection"
              className="flex items-center gap-1.5 px-2.5 h-[36px] rounded-full bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-500 text-[12px] font-medium fade-in"
            >
              <WifiOff size={15} />
              <span className="hidden sm:inline">Offline</span>
            </div>
          )}

          {/* PWA refresh button — only visible when installed as a PWA */}
          {isPWA && (
            <button
              onClick={() => window.location.reload()}
              aria-label="Refresh app"
              title="Refresh"
              className="w-[36px] h-[36px] rounded-full bg-slate-100 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155]/50 flex items-center justify-center text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#334155] transition-colors active:rotate-180 duration-300"
            >
              <RotateCw size={16} />
            </button>
          )}

          {/* PWA Install trigger button — visible only on browser (not installed yet) */}
          {!isPWA && (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('passmark_trigger_install'))}
              aria-label="Install app"
              title="Install PassMark"
              className="w-[36px] h-[36px] rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 flex items-center justify-center text-[#22C55E] hover:bg-[#22C55E] hover:text-white transition-all scale-on-click"
            >
              <Download size={16} className="animate-pulse" />
            </button>
          )}

          {/* Calculator button */}
          <button
            onClick={() => setShowCalc(v => !v)}
            aria-label="Open calculator"
            title="Calculator"
            className="w-[36px] h-[36px] rounded-full bg-slate-100 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155]/50 flex items-center justify-center text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#334155] transition-colors"
          >
            <CalcIcon size={17} />
          </button>

          {/* Theme toggle — desktop only */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="hidden lg:flex w-[36px] h-[36px] rounded-full bg-slate-100 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155]/50 items-center justify-center text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#334155] transition-colors"
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <TokenBalance balance={tokenBalance} onClick={() => setShowTokenShop(true)} compact />
          <NotificationCenter navigate={setActiveTab} />
          {showTokenShop && ReactDOM.createPortal(
            <TokenShopModal onClose={() => setShowTokenShop(false)} />,
            document.body
          )}

          {/* Avatar — desktop: navigate directly; mobile: mini popover */}
          <div className="relative shrink-0">
            <button
              onClick={() => {
                if (window.innerWidth >= 1024) {
                  setActiveTab('profile');
                } else {
                  setShowProfileMenu(v => !v);
                }
              }}
              className="w-[36px] h-[36px] rounded-full overflow-hidden bg-gradient-to-br from-[#22C55E] to-[#16A34A] flex items-center justify-center text-white text-[14px] font-bold shadow-md hover:brightness-110 scale-on-click"
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                getInitials(user?.name)
              )}
            </button>

            {showProfileMenu && (
              <>
                {/* Backdrop to close on outside click */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowProfileMenu(false)}
                />
                <div className="absolute right-0 top-[44px] z-50 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155]/80 rounded-xl shadow-xl overflow-hidden min-w-[150px] fade-in">
                  <button
                    onClick={() => { setActiveTab('profile'); setShowProfileMenu(false); }}
                    className="flex items-center gap-2.5 w-full px-4 py-3 text-[13px] font-medium text-slate-700 dark:text-[#F1F5F9] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <User size={15} className="text-slate-400 dark:text-[#64748B]" />
                    Profile
                  </button>
                  <button
                    onClick={() => { setActiveTab('referrals'); setShowProfileMenu(false); }}
                    className="flex items-center gap-2.5 w-full px-4 py-3 text-[13px] font-medium text-slate-700 dark:text-[#F1F5F9] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-t border-slate-100 dark:border-[#334155]/50"
                  >
                    <Users size={15} className="text-[#A855F7]" />
                    Referrals
                  </button>
                  <button
                    onClick={() => { toggleTheme(); setShowProfileMenu(false); }}
                    className="flex items-center gap-2.5 w-full px-4 py-3 text-[13px] font-medium text-slate-700 dark:text-[#F1F5F9] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border-t border-slate-100 dark:border-[#334155]/50"
                  >
                    {theme === 'dark'
                      ? <Sun size={15} className="text-amber-400" />
                      : <Moon size={15} className="text-slate-400" />}
                    {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <InstallBanner />
      {showCalc && <Calculator onClose={() => setShowCalc(false)} />}
    </div>
  );
}

export function BottomNav({ activeTab, setActiveTab }) {
  const navItems = [
    { id: "home",     icon: Home,         label: "Home" },
    { id: "papers",   icon: BookOpen,      label: "Papers" },
    { id: "tutor",    icon: GraduationCap, label: "AI Tutor" },
    { id: "calendar", icon: CalendarDays,  label: "Calendar" },
    { id: "settings", icon: Settings,      label: "Settings" },
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
  const [hasBanner, setHasBanner] = useState(false);

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
      <OnboardingRewardsBanner onVisibleChange={setHasBanner} />
      <main
        className={cn(
          "flex-1 mt-[64px] mb-[64px] md:mb-[72px] lg:mb-0 lg:ml-[220px] xl:ml-[260px] px-4 lg:px-8 pb-4 lg:pb-8 min-w-0 overflow-hidden slide-transition fade-in",
          hasBanner ? "pt-[60px] lg:pt-[76px]" : "pt-4 lg:pt-8"
        )}
      >
        {children}
      </main>
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
