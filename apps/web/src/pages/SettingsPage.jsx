
import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronRight, Lock, Trash2, Download, ExternalLink, Moon, Sun, Monitor, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/UserContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function SettingsPage({ navigate }) {
  const { user, clearUser } = useUser();
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState({
    dailyGoal: '30 min',
    quizDifficulty: 'Medium',
    dailyReminder: true,
    reminderTime: '19:00',
    examAlerts: true,
    streakReminder: true,
    sound: true,
    fontSize: 'Normal',
  });

  useEffect(() => {
    const saved = localStorage.getItem('passmark_settings');
    if (saved) {
      setSettings(prev => ({ ...prev, ...JSON.parse(saved) }));
    }
  }, []);

  const updateSetting = (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    localStorage.setItem('passmark_settings', JSON.stringify(updated));

    if (key === 'fontSize') {
      document.documentElement.style.fontSize = value === 'Small' ? '14px' : value === 'Large' ? '18px' : '16px';
    }
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(localStorage));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "passmark_data.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast.success("Data exported successfully!");
  };

  const handleReset = () => {
    if (window.confirm("This will delete ALL your progress and data. Are you sure?")) {
      clearUser();
      window.location.reload();
    }
  };

  const handleClearChat = async () => {
    if (window.confirm("Are you sure you want to clear your AI Tutor history?")) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.from('conversations').delete().eq('user_id', session.user.id);
      }
      toast.success("Chat history cleared.");
    }
  };

  const sectionHead = "text-[12px] font-bold text-slate-400 dark:text-[#94A3B8] uppercase tracking-wider mb-2 px-1";
  const card = "bg-white dark:bg-[#1E293B] rounded-2xl overflow-hidden border border-slate-200 dark:border-[#334155]/50 shadow-sm";

  return (
    <div className="max-w-[600px] mx-auto pb-8">
      <button
        onClick={() => navigate('profile')}
        className="flex items-center gap-1 text-[#22C55E] font-semibold text-[14px] mb-6 hover:underline active:scale-95 transition-all"
      >
        <ArrowLeft size={18} /> Settings
      </button>

      <h1 className="text-[28px] font-bold text-slate-900 dark:text-white mb-6 tracking-tight">Settings</h1>

      <div className="flex flex-col gap-6">

        {/* Account */}
        <section>
          <h2 className={sectionHead}>Account</h2>
          <div className={card}>
            <SettingRow label="Edit Profile" onClick={() => navigate('profile')} />
            <SettingRow label="Change exam date" onClick={() => navigate('profile')} isLast />
          </div>
        </section>

        {/* Study Preferences */}
        <section>
          <h2 className={sectionHead}>Study Preferences</h2>
          <div className={cn(card, "p-1")}>

            <div className="p-3 border-b border-slate-100 dark:border-[#334155]/50">
              <label className="block text-[13px] font-medium text-slate-800 dark:text-[#F1F5F9] mb-3">Daily study goal</label>
              <div className="flex gap-2">
                {['15 min', '30 min', '1 hour'].map(opt => (
                  <Pill key={opt} active={settings.dailyGoal === opt} onClick={() => updateSetting('dailyGoal', opt)}>
                    {opt}
                  </Pill>
                ))}
              </div>
            </div>

            <div className="p-3 border-b border-slate-100 dark:border-[#334155]/50">
              <label className="block text-[13px] font-medium text-slate-800 dark:text-[#F1F5F9] mb-3">Preferred subjects order</label>
              <div className="flex flex-col gap-2">
                {user?.subjects?.map((sub) => (
                  <div key={sub} className="bg-slate-50 dark:bg-[#0F172A] rounded-lg p-2.5 px-3 flex justify-between items-center">
                    <span className="text-[13px] text-slate-800 dark:text-[#F1F5F9] font-medium">{sub}</span>
                    <div className="flex gap-2 text-slate-400 dark:text-[#64748B]">
                      <button className="hover:text-slate-700 dark:hover:text-[#F1F5F9]">↑</button>
                      <button className="hover:text-slate-700 dark:hover:text-[#F1F5F9]">↓</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3">
              <label className="block text-[13px] font-medium text-slate-800 dark:text-[#F1F5F9] mb-3">Quiz difficulty</label>
              <div className="flex gap-2">
                {['Easy', 'Medium', 'Hard'].map(opt => (
                  <Pill key={opt} active={settings.quizDifficulty === opt} onClick={() => updateSetting('quizDifficulty', opt)}>
                    {opt}
                  </Pill>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* Notifications */}
        <section>
          <h2 className={sectionHead}>Notifications</h2>
          <div className={cn(card, "p-1")}>
            <div className="p-3 border-b border-slate-100 dark:border-[#334155]/50 flex justify-between items-center">
              <div>
                <label className="block text-[13px] font-medium text-slate-800 dark:text-[#F1F5F9]">Daily study reminder</label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="time"
                  value={settings.reminderTime}
                  onChange={(e) => updateSetting('reminderTime', e.target.value)}
                  className="bg-slate-100 dark:bg-[#0F172A] text-slate-800 dark:text-[#F1F5F9] px-2 py-1 rounded-md text-[13px] border border-slate-200 dark:border-[#334155] outline-none"
                />
                <Toggle active={settings.dailyReminder} onChange={() => updateSetting('dailyReminder', !settings.dailyReminder)} />
              </div>
            </div>

            <div className="p-3 border-b border-slate-100 dark:border-[#334155]/50 flex justify-between items-center">
              <label className="block text-[13px] font-medium text-slate-800 dark:text-[#F1F5F9]">Exam countdown alerts</label>
              <Toggle active={settings.examAlerts} onChange={() => updateSetting('examAlerts', !settings.examAlerts)} />
            </div>

            <div className="p-3 flex justify-between items-center">
              <label className="block text-[13px] font-medium text-slate-800 dark:text-[#F1F5F9]">Streak reminder</label>
              <Toggle active={settings.streakReminder} onChange={() => updateSetting('streakReminder', !settings.streakReminder)} />
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section>
          <h2 className={sectionHead}>Appearance</h2>
          <div className={cn(card, "p-1")}>
            <div className="p-3 border-b border-slate-100 dark:border-[#334155]/50">
              <label className="block text-[13px] font-medium text-slate-800 dark:text-[#F1F5F9] mb-3">Theme</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTheme('dark')}
                  className={cn(
                    "flex-1 rounded-xl py-2 flex justify-center items-center gap-2 text-[13px] font-medium border transition-all",
                    theme === 'dark'
                      ? "bg-[#22C55E]/20 border-[#22C55E]/50 text-[#22C55E]"
                      : "bg-slate-100 dark:bg-[#0F172A] border-slate-200 dark:border-[#334155] text-slate-500 dark:text-[#64748B] hover:border-slate-300"
                  )}
                >
                  <Moon size={16} /> Dark
                </button>
                <button
                  onClick={() => setTheme('light')}
                  className={cn(
                    "flex-1 rounded-xl py-2 flex justify-center items-center gap-2 text-[13px] font-medium border transition-all",
                    theme === 'light'
                      ? "bg-[#22C55E]/20 border-[#22C55E]/50 text-[#22C55E]"
                      : "bg-slate-100 dark:bg-[#0F172A] border-slate-200 dark:border-[#334155] text-slate-500 dark:text-[#64748B] hover:border-slate-300"
                  )}
                >
                  <Sun size={16} /> Light
                </button>
                <button
                  disabled
                  className="flex-1 bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] text-slate-400 dark:text-[#64748B] rounded-xl py-2 flex justify-center items-center gap-2 text-[13px] font-medium opacity-50 cursor-not-allowed relative"
                >
                  <Monitor size={16} /> System <Lock size={12} className="absolute top-1 right-1" />
                </button>
              </div>
            </div>

            <div className="p-3">
              <label className="block text-[13px] font-medium text-slate-800 dark:text-[#F1F5F9] mb-3">Font size</label>
              <div className="flex gap-2">
                {['Small', 'Normal', 'Large'].map(opt => (
                  <Pill key={opt} active={settings.fontSize === opt} onClick={() => updateSetting('fontSize', opt)}>
                    {opt}
                  </Pill>
                ))}
              </div>
            </div>
          </div>
        </section>


        {/* Data & Privacy */}
        <section>
          <h2 className={sectionHead}>Data & Privacy</h2>
          <div className={card}>
            <button onClick={handleExport} className="w-full p-4 text-left flex justify-between items-center border-b border-slate-100 dark:border-[#334155]/50 hover:bg-slate-50 dark:hover:bg-[#334155]/30 transition-colors">
              <span className="text-[13px] font-medium text-slate-800 dark:text-[#F1F5F9] flex items-center gap-2"><Download size={16} /> Export my data</span>
            </button>
            <button onClick={handleClearChat} className="w-full p-4 text-left flex justify-between items-center border-b border-slate-100 dark:border-[#334155]/50 hover:bg-orange-50 dark:hover:bg-[#431407]/30 transition-colors">
              <span className="text-[13px] font-medium text-[#F97316] flex items-center gap-2"><Trash2 size={16} /> Clear chat history</span>
            </button>
            <button onClick={handleReset} className="w-full p-4 text-left flex justify-between items-center hover:bg-red-50 dark:hover:bg-[#450a0a]/30 transition-colors">
              <span className="text-[13px] font-bold text-[#EF4444] flex items-center gap-2"><AlertTriangle size={16} /> Reset all data</span>
            </button>
          </div>
        </section>

        {/* About */}
        <section>
          <h2 className={sectionHead}>About</h2>
          <div className={card}>
            <div className="p-4 border-b border-slate-100 dark:border-[#334155]/50 flex justify-between items-center">
              <span className="text-[13px] font-medium text-slate-800 dark:text-[#F1F5F9]">PassMark version</span>
              <span className="text-[12px] text-slate-400 dark:text-[#64748B]">v1.0.0</span>
            </div>
            <div className="p-4 flex justify-between items-center">
              <span className="text-[13px] font-medium text-slate-800 dark:text-[#F1F5F9]">Powered by</span>
              <a
                href="https://wa.me/237683982584?text=Hello%20sir%2C%20I%20got%20your%20number%20from%20PassMark%20App"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] font-semibold text-[#25D366] flex items-center gap-1 hover:opacity-80 transition-opacity"
              >
                Sylvel <ExternalLink size={12}/>
              </a>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

function SettingRow({ label, onClick, isLast }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 text-left flex justify-between items-center hover:bg-slate-50 dark:hover:bg-[#334155]/30 transition-colors",
        !isLast && "border-b border-slate-100 dark:border-[#334155]/50"
      )}
    >
      <span className="text-[13px] font-medium text-slate-800 dark:text-[#F1F5F9]">{label}</span>
      <ChevronRight size={18} className="text-slate-400 dark:text-[#64748B]" />
    </button>
  );
}

function Pill({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 py-2 rounded-xl text-[13px] font-medium transition-all active:scale-95 border",
        active
          ? "bg-[#22C55E]/20 border-[#22C55E]/50 text-[#22C55E]"
          : "bg-slate-100 dark:bg-[#0F172A] border-slate-200 dark:border-[#334155] text-slate-500 dark:text-[#94A3B8] hover:border-slate-300 dark:hover:border-[#475569]"
      )}
    >
      {children}
    </button>
  );
}

function Toggle({ active, onChange }) {
  return (
    <button
      onClick={onChange}
      className={cn(
        "w-11 h-6 rounded-full transition-colors relative",
        active ? "bg-[#22C55E]" : "bg-slate-200 dark:bg-[#334155]"
      )}
    >
      <div className={cn(
        "w-4 h-4 bg-white rounded-full absolute top-1 transition-transform shadow-sm",
        active ? "translate-x-6" : "translate-x-1"
      )} />
    </button>
  );
}
