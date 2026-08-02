import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';

export default function PhoneBonusModal({ onClose, onClaimed }) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!phone.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('claim_phone_bonus', {
        p_phone: phone.trim(),
        p_phone_country: '237',
      });
      if (rpcError) throw rpcError;
      if (data?.success === false) {
        setError(lang === 'fr' ? 'Numéro invalide.' : 'Invalid phone number.');
        return;
      }
      onClaimed?.(data);
      onClose();
    } catch (e) {
      setError(lang === 'fr' ? 'Une erreur est survenue. Réessaie.' : 'Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-[380px] mx-auto bg-white dark:bg-[#1E293B] rounded-t-[20px] md:rounded-[20px] border border-slate-200 dark:border-white/10 max-h-[85dvh] overflow-y-auto pb-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <div className="text-[17px] font-bold text-slate-900 dark:text-[#F1F5F9]">
            {lang === 'fr' ? 'Ton numéro de téléphone' : 'Your phone number'}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/10 text-slate-400 dark:text-[#94A3B8] hover:text-slate-700 dark:hover:text-white transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-5 flex flex-col gap-3">
          <p className="text-[13px] text-slate-500 dark:text-[#94A3B8]">
            {lang === 'fr'
              ? "Pour te prévenir avant tes examens et t'envoyer des rappels de révision."
              : "So we can remind you before your exams and send study reminders."}
          </p>

          <input
            type="tel"
            autoFocus
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="6XX XX XX XX"
            className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-xl p-3 text-[14px] text-slate-900 dark:text-[#F1F5F9] outline-none focus:border-[#22C55E]"
          />

          {error && <p className="text-[12px] text-red-500">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={!phone.trim() || submitting}
            className="mt-1 w-full bg-[#22C55E] text-[#052e16] rounded-[12px] p-[14px] text-[14px] font-medium disabled:opacity-50 scale-on-click"
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
