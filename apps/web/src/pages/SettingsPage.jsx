
import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronRight, Lock, Trash2, Download, ExternalLink, Moon, Sun, Monitor, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/UserContext';
import { toast } from 'sonner';

export default function SettingsPage({ navigate }) {
  const { user, clearUser } = useUser();
  const [settings, setSettings] = useState({
    dailyGoal: '30 min',
    quizDifficulty: 'Medium',
    dailyReminder: true,
    reminderTime: '19:00',
    examAlerts: true,
    streakReminder: true,
    sound: true,
    theme: 'Dark',
    fontSize: 'Normal',
    apiKey: localStorage.getItem('claude_api_key') || '',
    aiLanguage: 'English',
    responseStyle: 'Detailed'
  });

  const [showKey, setShowKey] = useState(false);

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
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "passmark_data.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
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

  const handleClearChat = () => {
    if (window.confirm("Are you sure you want to clear your AI Tutor history?")) {
      const stored = JSON.parse(localStorage.getItem('passmark_user'));
      stored.chatHistory = [];
      localStorage.setItem('passmark_user', JSON.stringify(stored));
      toast.success("Chat history cleared.");
    }
  };

  return (
    <div className="max-w-[600px] mx-auto pb-8">
      <button 
        onClick={() => navigate('profile')}
        className="flex items-center gap-1 text-[#22C55E] font-semibold text-[14px] mb-6 hover:underline active:scale-95 transition-all"
      >
        <ArrowLeft size={18} /> Settings
      </button>

      <h1 className="text-[28px] font-bold text-white mb-6 tracking-tight">Settings</h1>

      <div className="flex flex-col gap-6">
        
        {/* Account */}
        <section>
          <h2 className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2 px-1">Account</h2>
          <div className="bg-[#1E293B] rounded-2xl overflow-hidden border border-[#334155]/50 shadow-sm">
            <SettingRow label="Edit Profile" onClick={() => navigate('profile')} />
            <SettingRow label="Change subjects" onClick={() => navigate('profile')} />
            <SettingRow label="Change exam date" onClick={() => navigate('profile')} isLast />
          </div>
        </section>

        {/* Study Preferences */}
        <section>
          <h2 className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2 px-1">Study Preferences</h2>
          <div className="bg-[#1E293B] rounded-2xl overflow-hidden border border-[#334155]/50 shadow-sm p-1">
            
            <div className="p-3 border-b border-[#334155]/50">
              <label className="block text-[13px] font-medium text-[#F1F5F9] mb-3">Daily study goal</label>
              <div className="flex gap-2">
                {['15 min', '30 min', '1 hour'].map(opt => (
                  <Pill 
                    key={opt} active={settings.dailyGoal === opt} 
                    onClick={() => updateSetting('dailyGoal', opt)}
                  >
                    {opt}
                  </Pill>
                ))}
              </div>
            </div>

            <div className="p-3 border-b border-[#334155]/50">
              <label className="block text-[13px] font-medium text-[#F1F5F9] mb-3">Preferred subjects order</label>
              <div className="flex flex-col gap-2">
                {user?.subjects?.map((sub, i) => (
                  <div key={sub} className="bg-[#0F172A] rounded-lg p-2.5 px-3 flex justify-between items-center">
                    <span className="text-[13px] text-[#F1F5F9] font-medium">{sub}</span>
                    <div className="flex gap-2 text-[#64748B]">
                      <button className="hover:text-[#F1F5F9]">↑</button>
                      <button className="hover:text-[#F1F5F9]">↓</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3">
              <label className="block text-[13px] font-medium text-[#F1F5F9] mb-3">Quiz difficulty</label>
              <div className="flex gap-2">
                {['Easy', 'Medium', 'Hard'].map(opt => (
                  <Pill 
                    key={opt} active={settings.quizDifficulty === opt} 
                    onClick={() => updateSetting('quizDifficulty', opt)}
                  >
                    {opt}
                  </Pill>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* Notifications */}
        <section>
          <h2 className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2 px-1">Notifications</h2>
          <div className="bg-[#1E293B] rounded-2xl overflow-hidden border border-[#334155]/50 shadow-sm p-1">
            <div className="p-3 border-b border-[#334155]/50 flex justify-between items-center">
              <div>
                <label className="block text-[13px] font-medium text-[#F1F5F9]">Daily study reminder</label>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="time" 
                  value={settings.reminderTime} 
                  onChange={(e) => updateSetting('reminderTime', e.target.value)}
                  className="bg-[#0F172A] text-[#F1F5F9] px-2 py-1 rounded-md text-[13px] border border-[#334155] outline-none"
                />
                <Toggle active={settings.dailyReminder} onChange={() => updateSetting('dailyReminder', !settings.dailyReminder)} />
              </div>
            </div>
            
            <div className="p-3 border-b border-[#334155]/50 flex justify-between items-center">
              <label className="block text-[13px] font-medium text-[#F1F5F9]">Exam countdown alerts</label>
              <Toggle active={settings.examAlerts} onChange={() => updateSetting('examAlerts', !settings.examAlerts)} />
            </div>

            <div className="p-3 flex justify-between items-center">
              <label className="block text-[13px] font-medium text-[#F1F5F9]">Streak reminder</label>
              <Toggle active={settings.streakReminder} onChange={() => updateSetting('streakReminder', !settings.streakReminder)} />
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section>
          <h2 className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2 px-1">Appearance</h2>
          <div className="bg-[#1E293B] rounded-2xl overflow-hidden border border-[#334155]/50 shadow-sm p-1">
            <div className="p-3 border-b border-[#334155]/50">
              <label className="block text-[13px] font-medium text-[#F1F5F9] mb-3">Theme</label>
              <div className="flex gap-2">
                <div className="flex-1 bg-[#22C55E]/20 border border-[#22C55E]/50 text-[#86EFAC] rounded-xl py-2 flex justify-center items-center gap-2 text-[13px] font-medium">
                  <Moon size={16} /> Dark
                </div>
                <div className="flex-1 bg-[#0F172A] border border-[#334155] text-[#64748B] rounded-xl py-2 flex justify-center items-center gap-2 text-[13px] font-medium opacity-50 cursor-not-allowed relative group">
                  <Sun size={16} /> Light <Lock size={12} className="absolute top-1 right-1" />
                </div>
                <div className="flex-1 bg-[#0F172A] border border-[#334155] text-[#64748B] rounded-xl py-2 flex justify-center items-center gap-2 text-[13px] font-medium opacity-50 cursor-not-allowed relative group">
                  <Monitor size={16} /> System <Lock size={12} className="absolute top-1 right-1" />
                </div>
              </div>
            </div>

            <div className="p-3">
              <label className="block text-[13px] font-medium text-[#F1F5F9] mb-3">Font size</label>
              <div className="flex gap-2">
                {['Small', 'Normal', 'Large'].map(opt => (
                  <Pill 
                    key={opt} active={settings.fontSize === opt} 
                    onClick={() => updateSetting('fontSize', opt)}
                  >
                    {opt}
                  </Pill>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* AI & API */}
        <section>
          <h2 className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2 px-1">AI Settings</h2>
          <div className="bg-[#1E293B] rounded-2xl overflow-hidden border border-[#334155]/50 shadow-sm p-1">
            <div className="p-3 border-b border-[#334155]/50">
              <label className="block text-[13px] font-medium text-[#F1F5F9] mb-2">Claude API Key</label>
              {showKey ? (
                <input 
                  type="text" 
                  value={settings.apiKey}
                  onChange={(e) => {
                    updateSetting('apiKey', e.target.value);
                    localStorage.setItem('claude_api_key', e.target.value);
                  }}
                  onBlur={() => setShowKey(false)}
                  autoFocus
                  placeholder="sk-ant-..."
                  className="w-full bg-[#0F172A] border border-[#334155] focus:border-[#22C55E] rounded-lg px-3 py-2 text-[13px] text-white outline-none"
                />
              ) : (
                <div 
                  onClick={() => setShowKey(true)}
                  className="w-full bg-[#0F172A] border border-[#334155] rounded-lg px-3 py-2 text-[13px] text-[#94A3B8] cursor-pointer"
                >
                  {settings.apiKey ? `●●●●●●●●${settings.apiKey.slice(-6)}` : 'Tap to set API key'}
                </div>
              )}
            </div>

            <div className="p-3 border-b border-[#334155]/50">
              <label className="block text-[13px] font-medium text-[#F1F5F9] mb-3">AI Language</label>
              <div className="flex gap-2">
                {['English', 'French'].map(opt => (
                  <Pill 
                    key={opt} active={settings.aiLanguage === opt} 
                    onClick={() => updateSetting('aiLanguage', opt)}
                  >
                    {opt}
                  </Pill>
                ))}
              </div>
            </div>

            <div className="p-3">
              <label className="block text-[13px] font-medium text-[#F1F5F9] mb-3">Response style</label>
              <div className="flex gap-2">
                {['Detailed', 'Concise'].map(opt => (
                  <Pill 
                    key={opt} active={settings.responseStyle === opt} 
                    onClick={() => updateSetting('responseStyle', opt)}
                  >
                    {opt}
                  </Pill>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Data & Privacy */}
        <section>
          <h2 className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2 px-1">Data & Privacy</h2>
          <div className="bg-[#1E293B] rounded-2xl overflow-hidden border border-[#334155]/50 shadow-sm">
            <button onClick={handleExport} className="w-full p-4 text-left flex justify-between items-center border-b border-[#334155]/50 hover:bg-[#334155]/30 transition-colors">
              <span className="text-[13px] font-medium text-[#F1F5F9] flex items-center gap-2"><Download size={16} /> Export my data</span>
            </button>
            <button onClick={handleClearChat} className="w-full p-4 text-left flex justify-between items-center border-b border-[#334155]/50 hover:bg-[#431407]/30 transition-colors group">
              <span className="text-[13px] font-medium text-[#F97316] flex items-center gap-2"><Trash2 size={16} /> Clear chat history</span>
            </button>
            <button onClick={handleReset} className="w-full p-4 text-left flex justify-between items-center hover:bg-[#450a0a]/30 transition-colors group">
              <span className="text-[13px] font-bold text-[#EF4444] flex items-center gap-2"><AlertTriangle size={16} /> Reset all data</span>
            </button>
          </div>
        </section>

        {/* About */}
        <section>
          <h2 className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2 px-1">About</h2>
          <div className="bg-[#1E293B] rounded-2xl overflow-hidden border border-[#334155]/50 shadow-sm">
            <div className="p-4 border-b border-[#334155]/50 flex justify-between items-center">
              <span className="text-[13px] font-medium text-[#F1F5F9]">PassMark version</span>
              <span className="text-[12px] text-[#64748B]">v1.0.0</span>
            </div>
            <div className="p-4 border-b border-[#334155]/50 flex justify-between items-center">
              <span className="text-[13px] font-medium text-[#F1F5F9]">Powered by</span>
              <span className="text-[12px] font-semibold text-[#D97757] flex items-center gap-1">Claude <ExternalLink size={12}/></span>
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
        "w-full p-4 text-left flex justify-between items-center hover:bg-[#334155]/30 transition-colors",
        !isLast && "border-b border-[#334155]/50"
      )}
    >
      <span className="text-[13px] font-medium text-[#F1F5F9]">{label}</span>
      <ChevronRight size={18} className="text-[#64748B]" />
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
          ? "bg-[#22C55E]/20 border-[#22C55E]/50 text-[#86EFAC]" 
          : "bg-[#0F172A] border-[#334155] text-[#94A3B8] hover:border-[#475569]"
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
        active ? "bg-[#22C55E]" : "bg-[#334155]"
      )}
    >
      <div className={cn(
        "w-4 h-4 bg-white rounded-full absolute top-1 transition-transform",
        active ? "translate-x-6" : "translate-x-1"
      )} />
    </button>
  );
}
