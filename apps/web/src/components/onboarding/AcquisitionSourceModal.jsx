import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const SOURCES = [
  { key: 'youtube', fr: 'YouTube', en: 'YouTube' },
  { key: 'google', fr: 'Recherche Google', en: 'Google search' },
  { key: 'facebook_instagram', fr: 'Facebook / Instagram', en: 'Facebook / Instagram' },
  { key: 'whatsapp_telegram', fr: 'WhatsApp / Telegram', en: 'WhatsApp / Telegram' },
  { key: 'tiktok', fr: 'TikTok', en: 'TikTok' },
  { key: 'friend', fr: 'Un ami / camarade', en: 'A friend / classmate' },
  { key: 'other', fr: 'Autre', en: 'Other' },
];

export default function AcquisitionSourceModal({ onClose, onClaimed }) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const [source, setSource] = useState(null);
  const [otherText, setOtherText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!source) return;
    if (source === 'other' && !otherText.trim()) {
      setError(lang === 'fr' ? 'Précise un peu plus, stp.' : 'Please add a few words.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const { data, error: rpcError } = await supabase.rpc('submit_acquisition_source', {
        p_source: source,
        p_other_text: otherText.trim() || null,
        p_timezone: timezone,
      });
      if (rpcError) throw rpcError;
      onClaimed?.(data);
      onClose();
    } catch (e) {
      setError(lang === 'fr' ? 'Une erreur est survenue. Réessaie.' : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = () => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    supabase.rpc('dismiss_acquisition_prompt', { p_timezone: timezone }).catch(() => {});
    onClose();
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={handleDismiss}>
      <div
        className="w-full max-w-[420px] mx-auto bg-white dark:bg-[#1E293B] rounded-t-[20px] md:rounded-[20px] border border-slate-200 dark:border-white/10 max-h-[85dvh] overflow-y-auto pb-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <div className="text-[17px] font-bold text-slate-900 dark:text-[#F1F5F9]">
            {lang === 'fr' ? 'Comment as-tu connu PassMark ?' : 'How did you hear about PassMark?'}
          </div>
          <button
            onClick={handleDismiss}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-[#94A3B8] hover:text-slate-700 dark:hover:text-white transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-5 flex flex-col gap-2">
          {SOURCES.map(s => (
            <button
              key={s.key}
              onClick={() => { setSource(s.key); setError(null); }}
              className={cn(
                'text-left px-4 py-3 rounded-xl text-[14px] font-medium border transition-all',
                source === s.key
                  ? 'bg-[#22C55E]/10 border-[#22C55E] text-[#22C55E]'
                  : 'bg-slate-50 dark:bg-white/5 border-transparent text-slate-700 dark:text-[#F1F5F9] hover:border-slate-300 dark:hover:border-white/20'
              )}
            >
              {lang === 'fr' ? s.fr : s.en}
            </button>
          ))}

          {source === 'other' && (
            <input
              type="text"
              autoFocus
              value={otherText}
              onChange={e => setOtherText(e.target.value.slice(0, 300))}
              placeholder={lang === 'fr' ? 'Précise...' : 'Tell us more...'}
              className="mt-1 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-xl p-3 text-[14px] text-slate-900 dark:text-[#F1F5F9] outline-none focus:border-[#22C55E]"
            />
          )}

          {error && <p className="text-[12px] text-red-500 mt-1">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={!source || submitting}
            className="mt-3 w-full bg-[#22C55E] text-[#052e16] rounded-[12px] p-[14px] text-[14px] font-medium disabled:opacity-50 scale-on-click"
          >
            {submitting
              ? (lang === 'fr' ? 'Envoi...' : 'Sending...')
              : (lang === 'fr' ? 'Valider (+2 tokens)' : 'Submit (+2 tokens)')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
