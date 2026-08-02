import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  ChevronLeft, ChevronRight, Plus, X, Trash2, Clock, BookOpen,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const EVENT_TYPES = [
  { id: 'exam',     label: 'Official Exam',  color: '#EF4444' },
  { id: 'mock',     label: 'Mock Exam',       color: '#F97316' },
  { id: 'study',    label: 'Study Session',   color: '#22C55E' },
  { id: 'reminder', label: 'Reminder',        color: '#3B82F6' },
];

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOffset(year, month) {
  return new Date(year, month, 1).getDay();
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function getTypeInfo(id) {
  return EVENT_TYPES.find(t => t.id === id) || EVENT_TYPES[2];
}

// ─────────────────────────────────────────────────────────────────────────────
// EventDot
// ─────────────────────────────────────────────────────────────────────────────

function EventDot({ color }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full shrink-0 inline-block"
      style={{ backgroundColor: color }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add / Edit Event Modal
// ─────────────────────────────────────────────────────────────────────────────

function EventModal({ onClose, onSave, onDelete, initialDate, event, subjects }) {
  const todayStr = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    title:      event?.title      || '',
    type:       event?.event_type || 'exam',
    subject:    event?.subject    || '',
    date:       event?.event_date || initialDate || todayStr,
    start_time: event?.start_time ? event.start_time.slice(0, 5) : '',
    end_time:   event?.end_time   ? event.end_time.slice(0, 5)   : '',
    notes:      event?.notes      || '',
  });
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError]     = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSave = async () => {
    if (!form.title.trim()) { setError('Please enter a title.'); return; }
    if (!form.date)          { setError('Please select a date.'); return; }
    setSaving(true);
    setError('');
    await onSave({
      title:      form.title.trim(),
      event_type: form.type,
      subject:    form.subject || null,
      event_date: form.date,
      start_time: form.start_time || null,
      end_time:   form.end_time   || null,
      notes:      form.notes      || null,
    });
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(event.id);
    setDeleting(false);
  };

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155]/80 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-[440px] max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-[#334155]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#334155]/50 shrink-0">
          <h2 className="text-[16px] font-bold text-slate-900 dark:text-white">
            {event ? 'Edit Event' : 'New Event'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0F172A] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="overflow-y-auto px-5 py-4 space-y-4">

          {/* Title */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-500 dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide">
              Title *
            </label>
            <input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Chemistry Paper 2 Exam"
              autoFocus
              className="w-full h-10 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-xl px-3 text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#64748B] outline-none focus:border-[#22C55E] transition-colors"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-500 dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide">
              Event Type *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {EVENT_TYPES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => set('type', t.id)}
                  className={cn(
                    'h-9 rounded-xl text-[12px] font-semibold border transition-all',
                    form.type === t.id
                      ? 'text-white border-transparent'
                      : 'border-slate-200 dark:border-[#334155] text-slate-500 dark:text-[#94A3B8] bg-slate-50 dark:bg-[#0F172A] hover:border-slate-300 dark:hover:border-[#475569]'
                  )}
                  style={form.type === t.id ? { backgroundColor: t.color, borderColor: t.color } : {}}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-500 dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide">
              Subject
            </label>
            <select
              value={form.subject}
              onChange={e => set('subject', e.target.value)}
              className="w-full h-10 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-xl px-3 text-[14px] text-slate-900 dark:text-white outline-none focus:border-[#22C55E] transition-colors"
            >
              <option value="">All subjects / General</option>
              {subjects.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-500 dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide">
              Date *
            </label>
            <input
              type="date"
              value={form.date}
              onChange={e => set('date', e.target.value)}
              className="w-full h-10 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-xl px-3 text-[14px] text-slate-900 dark:text-white outline-none focus:border-[#22C55E] transition-colors"
            />
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-slate-500 dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide">
                Start Time
              </label>
              <input
                type="time"
                value={form.start_time}
                onChange={e => set('start_time', e.target.value)}
                className="w-full h-10 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-xl px-3 text-[14px] text-slate-900 dark:text-white outline-none focus:border-[#22C55E] transition-colors"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-500 dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide">
                End Time
              </label>
              <input
                type="time"
                value={form.end_time}
                onChange={e => set('end_time', e.target.value)}
                className="w-full h-10 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-xl px-3 text-[14px] text-slate-900 dark:text-white outline-none focus:border-[#22C55E] transition-colors"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-500 dark:text-[#94A3B8] mb-1.5 uppercase tracking-wide">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Optional notes..."
              rows={2}
              className="w-full bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-xl px-3 py-2.5 text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-[#64748B] outline-none focus:border-[#22C55E] transition-colors resize-none"
            />
          </div>

          {error && (
            <p className="text-[12px] text-red-500 font-medium">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 dark:border-[#334155]/50 shrink-0 flex gap-3">
          {event && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
            >
              <Trash2 size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-[#334155] text-slate-600 dark:text-[#94A3B8] text-[14px] font-semibold hover:bg-slate-50 dark:hover:bg-[#0F172A] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-10 rounded-xl bg-[#22C55E] text-white text-[14px] font-bold hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
          >
            {saving ? 'Saving…' : event ? 'Update' : 'Save Event'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CalendarPage
// ─────────────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { user } = useUser();
  const now = new Date();

  const [currentYear,  setCurrentYear]  = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [events,       setEvents]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selectedDay,  setSelectedDay]  = useState(null);
  const [showModal,    setShowModal]    = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [modalDate,    setModalDate]    = useState(null);
  const requestControllerRef = useRef(null);
  const requestIdRef = useRef(0);
  const retryTimerRef = useRef(null);

  const subjects = user?.subjects || [];

  // ── Load events for current month ─────────────────────────────────────────
  const [retryKey, setRetryKey] = useState(0);

  const loadEvents = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    requestControllerRef.current?.abort();
    const requestId = ++requestIdRef.current;
    setLoading(true);
    const startDate = toDateStr(currentYear, currentMonth, 1);
    const endDate   = toDateStr(currentYear, currentMonth, getDaysInMonth(currentYear, currentMonth));

    const controller = new AbortController();
    requestControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout

    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('event_date', startDate)
        .lte('event_date', endDate)
        .order('event_date', { ascending: true })
        .order('start_time', { ascending: true, nullsFirst: true })
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);

      if (requestId !== requestIdRef.current) return;
      if (!error && data) setEvents(data);
      else setEvents([]);
    } catch (err) {
      clearTimeout(timeoutId);
      if (requestId !== requestIdRef.current) return;
      if (err?.name !== 'AbortError') console.error('[CalendarPage] loadEvents failed:', err);
      setEvents([]);
    } finally {
      if (requestId === requestIdRef.current) {
        requestControllerRef.current = null;
        setLoading(false);
      }
    }
  }, [user?.id, currentYear, currentMonth]);

  useEffect(() => { loadEvents(); }, [loadEvents, retryKey]);

  // Retry on connection recovery and app visibility (coming back from background on mobile).
  // A short delay gives Supabase Auth time to restore/refresh its session first.
  useEffect(() => {
    const retryAfterReconnect = () => {
      requestControllerRef.current?.abort();
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => setRetryKey(k => k + 1), 150);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') retryAfterReconnect();
      else requestControllerRef.current?.abort();
    };
    window.addEventListener('online', retryAfterReconnect);
    window.addEventListener('focus', retryAfterReconnect);
    window.addEventListener('pageshow', retryAfterReconnect);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      requestControllerRef.current?.abort();
      clearTimeout(retryTimerRef.current);
      window.removeEventListener('online', retryAfterReconnect);
      window.removeEventListener('focus', retryAfterReconnect);
      window.removeEventListener('pageshow', retryAfterReconnect);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // ── Calendar grid ──────────────────────────────────────────────────────────
  const daysInMonth  = getDaysInMonth(currentYear, currentMonth);
  const firstOffset  = getFirstDayOffset(currentYear, currentMonth);
  const totalCells   = Math.ceil((daysInMonth + firstOffset) / 7) * 7;
  const cells        = Array.from({ length: totalCells }, (_, i) => {
    const day = i - firstOffset + 1;
    return (day >= 1 && day <= daysInMonth) ? day : null;
  });

  // Group events by date string
  const eventsByDate = {};
  events.forEach(ev => {
    if (!eventsByDate[ev.event_date]) eventsByDate[ev.event_date] = [];
    eventsByDate[ev.event_date].push(ev);
  });

  const todayStr = toDateStr(now.getFullYear(), now.getMonth(), now.getDate());

  // ── Navigation ─────────────────────────────────────────────────────────────
  const prevMonth = () => {
    setSelectedDay(null);
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    setSelectedDay(null);
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openAdd = (date) => {
    setEditingEvent(null);
    setModalDate(date || todayStr);
    setShowModal(true);
  };
  const openEdit = (ev) => {
    setEditingEvent(ev);
    setModalDate(null);
    setShowModal(true);
  };
  const closeModal = () => {
    setShowModal(false);
    setEditingEvent(null);
  };

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const handleSave = async (formData) => {
    if (!user?.id) return;
    if (editingEvent) {
      const { error } = await supabase
        .from('calendar_events')
        .update({ ...formData, updated_at: new Date().toISOString() })
        .eq('id', editingEvent.id)
        .eq('user_id', user.id);
      if (!error) { closeModal(); loadEvents(); }
    } else {
      const { error } = await supabase
        .from('calendar_events')
        .insert([{ ...formData, user_id: user.id }]);
      if (!error) { closeModal(); loadEvents(); }
    }
  };

  const handleDelete = async (eventId) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', user.id);
    if (!error) { closeModal(); loadEvents(); }
  };

  // ── Selected day ───────────────────────────────────────────────────────────
  const selectedDateStr   = selectedDay ? toDateStr(currentYear, currentMonth, selectedDay) : null;
  const selectedDayEvents = selectedDateStr ? (eventsByDate[selectedDateStr] || []) : [];

  // ── Upcoming events (today + future, max 6) ────────────────────────────────
  const upcomingEvents = events
    .filter(ev => ev.event_date >= todayStr)
    .slice(0, 6);

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="fade-in space-y-6">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] md:text-[22px] font-bold text-slate-900 dark:text-white tracking-tight">
            My Study Calendar
          </h1>
          <p className="text-[13px] text-slate-500 dark:text-[#94A3B8] mt-0.5">
            Track exams, mock tests, and study sessions
          </p>
        </div>
        <button
          onClick={() => openAdd(todayStr)}
          className="flex items-center gap-2 h-10 px-4 bg-[#22C55E] text-white rounded-xl text-[13px] font-bold hover:brightness-110 active:scale-95 transition-all shadow-md shadow-green-500/20 shrink-0"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add Event</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">

        {/* ── Calendar Card ──────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-[#334155]/50 shadow-sm overflow-hidden">

          {/* Month navigation */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-[#334155]/50">
            <button
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0F172A] transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-[16px] font-bold text-slate-900 dark:text-white">
              {MONTHS[currentMonth]} {currentYear}
            </h2>
            <button
              onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0F172A] transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day-of-week labels */}
          <div className="grid grid-cols-7 border-b border-slate-100 dark:border-[#334155]/50">
            {DAYS_SHORT.map(d => (
              <div key={d} className="py-2.5 text-center text-[11px] font-semibold text-slate-400 dark:text-[#64748B] uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (!day) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="h-14 md:h-16 border-b border-r border-slate-50 dark:border-[#334155]/20"
                  />
                );
              }

              const dateStr    = toDateStr(currentYear, currentMonth, day);
              const dayEvents  = eventsByDate[dateStr] || [];
              const isToday    = dateStr === todayStr;
              const isSelected = selectedDay === day;
              const isWeekend  = idx % 7 === 0 || idx % 7 === 6;

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={cn(
                    'h-14 md:h-16 p-1.5 flex flex-col items-center border-b border-r border-slate-50 dark:border-[#334155]/20 transition-all',
                    isSelected
                      ? 'bg-[#22C55E]/10 dark:bg-[#22C55E]/5'
                      : isWeekend
                        ? 'bg-slate-50/50 dark:bg-[#0F172A]/30 hover:bg-slate-100 dark:hover:bg-[#0F172A]/60'
                        : 'hover:bg-slate-50 dark:hover:bg-[#0F172A]/40',
                  )}
                >
                  <span className={cn(
                    'w-7 h-7 flex items-center justify-center rounded-full text-[12px] font-medium mb-0.5 transition-all',
                    isToday
                      ? 'bg-[#22C55E] text-white font-bold'
                      : isSelected
                        ? 'bg-[#22C55E]/20 text-[#22C55E] font-semibold'
                        : 'text-slate-700 dark:text-[#94A3B8]'
                  )}>
                    {day}
                  </span>
                  {/* Event dots — max 3 then +N */}
                  <div className="flex items-center justify-center gap-0.5 flex-wrap">
                    {dayEvents.slice(0, 3).map(ev => (
                      <EventDot key={ev.id} color={getTypeInfo(ev.event_type).color} />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[8px] text-slate-400 dark:text-[#64748B] font-medium">
                        +{dayEvents.length - 3}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="px-5 py-3 border-t border-slate-100 dark:border-[#334155]/50 flex flex-wrap gap-x-4 gap-y-1.5">
            {EVENT_TYPES.map(t => (
              <div key={t.id} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                <span className="text-[11px] text-slate-400 dark:text-[#64748B]">{t.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right Panel ────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Selected day panel */}
          {selectedDay && (
            <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-[#22C55E]/30 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-[#334155]/50">
                <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">
                  {MONTHS[currentMonth]} {selectedDay}
                </h3>
                <button
                  onClick={() => openAdd(toDateStr(currentYear, currentMonth, selectedDay))}
                  className="flex items-center gap-1 text-[12px] text-[#22C55E] font-semibold hover:brightness-110 transition-all"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>

              {selectedDayEvents.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-[12px] text-slate-400 dark:text-[#64748B]">
                    No events. Tap <strong>Add</strong> to create one.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50 dark:divide-[#334155]/30">
                  {selectedDayEvents.map(ev => {
                    const ti = getTypeInfo(ev.event_type);
                    return (
                      <button
                        key={ev.id}
                        onClick={() => openEdit(ev)}
                        className="w-full px-4 py-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-[#0F172A]/30 transition-colors text-left"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                          style={{ backgroundColor: ti.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                            {ev.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[11px] font-medium" style={{ color: ti.color }}>
                              {ti.label}
                            </span>
                            {ev.subject && (
                              <span className="text-[11px] text-slate-400 dark:text-[#64748B]">
                                · {ev.subject}
                              </span>
                            )}
                            {ev.start_time && (
                              <span className="text-[11px] text-slate-400 dark:text-[#64748B] flex items-center gap-1">
                                <Clock size={10} />
                                {formatTime(ev.start_time)}
                                {ev.end_time && ` – ${formatTime(ev.end_time)}`}
                              </span>
                            )}
                          </div>
                          {ev.notes && (
                            <p className="text-[11px] text-slate-400 dark:text-[#64748B] mt-0.5 truncate">
                              {ev.notes}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Upcoming Events */}
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-[#334155]/50 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-[#334155]/50">
              <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">
                Upcoming Events
              </h3>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : upcomingEvents.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#0F172A] flex items-center justify-center mx-auto mb-3">
                  <BookOpen size={18} className="text-slate-400 dark:text-[#64748B]" />
                </div>
                <p className="text-[13px] font-semibold text-slate-600 dark:text-[#94A3B8]">
                  No upcoming events
                </p>
                <p className="text-[12px] text-slate-400 dark:text-[#64748B] mt-1">
                  Add your exam dates to stay on track
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-[#334155]/30">
                {upcomingEvents.map(ev => {
                  const ti      = getTypeInfo(ev.event_type);
                  const evDate  = new Date(ev.event_date + 'T00:00:00');
                  const diffDays = Math.ceil((evDate - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
                  const badge   =
                    diffDays === 0 ? 'TODAY' :
                    diffDays === 1 ? 'TMR'   :
                    `${diffDays}d`;

                  return (
                    <button
                      key={ev.id}
                      onClick={() => openEdit(ev)}
                      className="w-full px-4 py-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-[#0F172A]/30 transition-colors text-left"
                    >
                      {/* Days badge */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: ti.color + '20' }}
                      >
                        <span className="text-[10px] font-bold" style={{ color: ti.color }}>
                          {badge}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                          {ev.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[11px] text-slate-400 dark:text-[#64748B]">
                            {evDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </span>
                          {ev.start_time && (
                            <span className="text-[11px] text-slate-400 dark:text-[#64748B] flex items-center gap-1">
                              <Clock size={10} />
                              {formatTime(ev.start_time)}
                            </span>
                          )}
                          {ev.subject && (
                            <span className="text-[11px] text-slate-400 dark:text-[#64748B] truncate">
                              · {ev.subject}
                            </span>
                          )}
                        </div>
                      </div>

                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0 mt-2"
                        style={{ backgroundColor: ti.color }}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Event Modal ─────────────────────────────────────────────────── */}
      {showModal && (
        <EventModal
          onClose={closeModal}
          onSave={handleSave}
          onDelete={handleDelete}
          initialDate={modalDate}
          event={editingEvent}
          subjects={subjects}
        />
      )}
    </div>
  );
}
