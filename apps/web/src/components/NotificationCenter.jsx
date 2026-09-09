
import React, { useState, useRef, useEffect } from 'react';
import { Bell, BellOff, CalendarClock, Flame, Award, BookOpen, Check, ExternalLink, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/contexts/NotificationContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function NotificationCenter({ navigate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [detail, setDetail] = useState(null);
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

  // Clicking a notification opens the detail modal (full text + link, if
  // any) rather than acting immediately — for a local reminder with an
  // internal `action` and no link, the modal's own button does that
  // navigation instead.
  const handleNotificationClick = (notif) => {
    markAsRead(notif.id);
    setIsOpen(false);
    setDetail(notif);
  };

  const handleDetailAction = () => {
    if (detail?.link) {
      window.open(detail.link, '_blank', 'noopener,noreferrer');
    } else if (detail?.action && navigate) {
      navigate(detail.action);
    }
    setDetail(null);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'DAILY_STUDY_REMINDER': return <div className="w-9 h-9 rounded-full bg-[#3B82F6]/10 text-[#3B82F6] flex items-center justify-center shrink-0"><BookOpen size={18} /></div>;
      case 'EXAM_COUNTDOWN':       return <div className="w-9 h-9 rounded-full bg-[#F97316]/10 text-[#F97316] flex items-center justify-center shrink-0"><CalendarClock size={18} /></div>;
      case 'STREAK_REMINDER':      return <div className="w-9 h-9 rounded-full bg-[#EF4444]/10 text-[#EF4444] flex items-center justify-center shrink-0"><Flame size={18} /></div>;
      case 'QUIZ_CELEBRATION':     return <div className="w-9 h-9 rounded-full bg-[#22C55E]/10 text-[#22C55E] flex items-center justify-center shrink-0"><Award size={18} /></div>;
      case 'ADMIN_BROADCAST':      return <div className="w-9 h-9 rounded-full bg-[#22C55E]/10 text-[#22C55E] flex items-center justify-center shrink-0"><Megaphone size={18} /></div>;
      default:                     return <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-[#94A3B8]/10 text-slate-400 dark:text-[#94A3B8] flex items-center justify-center shrink-0"><Bell size={18} /></div>;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-[36px] h-[36px] rounded-full bg-slate-100 dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155]/50 flex items-center justify-center text-slate-500 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#334155] transition-colors relative"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EF4444] rounded-full border-2 border-white dark:border-[#0F172A]" />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] right-0 w-[320px] max-w-[calc(100vw-20px)] bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-xl shadow-lg dark:shadow-black/50 z-[500] overflow-hidden flex flex-col max-h-[320px] animate-in fade-in slide-in-from-top-2">

          {/* Header */}
          <div className="p-3 border-b border-slate-100 dark:border-[#334155] flex justify-between items-center bg-slate-50 dark:bg-[#0F172A]/50 shrink-0">
            <h3 className="text-[15px] font-bold text-slate-900 dark:text-[#F1F5F9]">Notifications</h3>
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="text-[12px] font-medium text-slate-400 dark:text-[#64748B] hover:text-slate-700 dark:hover:text-[#F1F5F9] flex items-center gap-1 transition-colors"
              >
                <Check size={12} /> Clear all
              </button>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto hide-scrollbar">
            {notifications.length > 0 ? (
              <div className="flex flex-col">
                {notifications.map(notif => (
                  <button
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={cn(
                      "p-3 text-left border-b border-slate-100 dark:border-[#334155]/50 flex gap-3 hover:bg-slate-50 dark:hover:bg-[#334155]/30 transition-colors relative",
                      !notif.read ? "bg-white dark:bg-[#1E293B]" : "opacity-60"
                    )}
                  >
                    {!notif.read && <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#22C55E]" />}
                    {getIcon(notif.type)}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[14px] font-medium text-slate-900 dark:text-[#F1F5F9] truncate mb-0.5">{notif.title}</h4>
                      <p className="text-[13px] text-slate-500 dark:text-[#94A3B8] leading-[1.5] line-clamp-2 mb-1 text-balance">
                        {notif.body}
                      </p>
                      <span className="text-[11px] text-slate-400 dark:text-[#64748B] block text-right">
                        {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 flex flex-col items-center justify-center text-center">
                <BellOff size={32} className="text-slate-300 dark:text-[#64748B] mb-3 opacity-50" />
                <p className="text-[14px] text-slate-400 dark:text-[#64748B] font-medium">No notifications yet</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Detail modal — full text (never truncated) + the link, if any, as
          its own clickable action underneath. */}
      <Dialog open={!!detail} onOpenChange={(open) => { if (!open) setDetail(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {getIcon(detail?.type)}
              <DialogTitle className="text-left">{detail?.title}</DialogTitle>
            </div>
          </DialogHeader>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{detail?.body}</p>
          {detail?.link && (
            <p className="text-xs text-primary break-all">{detail.link}</p>
          )}
          {(detail?.link || detail?.action) && (
            <DialogFooter>
              <Button onClick={handleDetailAction} className="w-full sm:w-auto gap-2">
                {detail?.link ? <>Open link <ExternalLink className="h-4 w-4" /></> : 'Open'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
