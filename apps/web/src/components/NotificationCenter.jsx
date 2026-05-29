
import React, { useState, useRef, useEffect } from 'react';
import { Bell, BellOff, CalendarClock, Flame, Award, BookOpen, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/contexts/NotificationContext';

export default function NotificationCenter({ navigate }) {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, clearAll } = useNotifications();
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleNotificationClick = (notif) => {
    markAsRead(notif.id);
    setIsOpen(false);
    if (notif.action && navigate) {
      navigate(notif.action);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'DAILY_STUDY_REMINDER': return <div className="w-9 h-9 rounded-full bg-[#3B82F6]/10 text-[#3B82F6] flex items-center justify-center shrink-0"><BookOpen size={18} /></div>;
      case 'EXAM_COUNTDOWN': return <div className="w-9 h-9 rounded-full bg-[#F97316]/10 text-[#F97316] flex items-center justify-center shrink-0"><CalendarClock size={18} /></div>;
      case 'STREAK_REMINDER': return <div className="w-9 h-9 rounded-full bg-[#EF4444]/10 text-[#EF4444] flex items-center justify-center shrink-0"><Flame size={18} /></div>;
      case 'QUIZ_CELEBRATION': return <div className="w-9 h-9 rounded-full bg-[#22C55E]/10 text-[#22C55E] flex items-center justify-center shrink-0"><Award size={18} /></div>;
      default: return <div className="w-9 h-9 rounded-full bg-[#94A3B8]/10 text-[#94A3B8] flex items-center justify-center shrink-0"><Bell size={18} /></div>;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-[#1E293B] hover:bg-[#334155] flex items-center justify-center text-[#94A3B8] hover:text-[#F1F5F9] transition-colors relative"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-2 h-2 bg-[#EF4444] rounded-full border border-[#0F172A]" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] right-[-10px] sm:right-0 w-[320px] max-w-[calc(100vw-20px)] bg-[#1E293B] border border-[#334155] rounded-xl shadow-xl shadow-black/50 z-[500] overflow-hidden flex flex-col max-h-[320px] animate-in fade-in slide-in-from-top-2">
          <div className="p-3 border-b border-[#334155] flex justify-between items-center bg-[#0F172A]/50 shrink-0">
            <h3 className="text-[14px] font-bold text-[#F1F5F9]">Notifications</h3>
            {notifications.length > 0 && (
              <button onClick={clearAll} className="text-[11px] font-medium text-[#64748B] hover:text-[#F1F5F9] flex items-center gap-1 transition-colors">
                <Check size={12} /> Clear all
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto hide-scrollbar">
            {notifications.length > 0 ? (
              <div className="flex flex-col">
                {notifications.map(notif => (
                  <button 
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={cn(
                      "p-3 text-left border-b border-[#334155]/50 flex gap-3 hover:bg-[#334155]/30 transition-colors relative",
                      !notif.read ? "bg-[#1E293B]" : "opacity-60"
                    )}
                  >
                    {!notif.read && <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#22C55E]" />}
                    {getIcon(notif.type)}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[13px] font-medium text-[#F1F5F9] truncate mb-0.5">{notif.title}</h4>
                      <p className="text-[12px] text-[#94A3B8] leading-[1.5] line-clamp-2 mb-1 text-balance">
                        {notif.body}
                      </p>
                      <span className="text-[10px] text-[#64748B] block text-right">
                        {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 flex flex-col items-center justify-center text-center">
                <BellOff size={32} className="text-[#64748B] mb-3 opacity-50" />
                <p className="text-[13px] text-[#64748B] font-medium">No notifications yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
