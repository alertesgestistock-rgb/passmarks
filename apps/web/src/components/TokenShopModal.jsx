import React, { useState, useEffect } from 'react';
import { X, Coins, Zap, Star, Trophy, Flame } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

const PACK_ICONS = [Coins, Zap, Star, Trophy];
const PACK_COLORS = ['#3B82F6', '#22C55E', '#F97316', '#A855F7'];

let _cachedPackages = null;
async function getPackages() {
  if (_cachedPackages) return _cachedPackages;
  const { data } = await supabase
    .from('token_packages')
    .select('*')
    .eq('is_active', true)
    .order('tokens', { ascending: true });
  _cachedPackages = data || [];
  return _cachedPackages;
}

export default function TokenShopModal({ onClose }) {
  const { tokenBalance } = useUser();
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const { theme } = useTheme();
  const textPrimary = theme === 'dark' ? '#F1F5F9' : '#0F172A';

  const [packages, setPackages] = useState(_cachedPackages || []);
  const [loading, setLoading] = useState(!_cachedPackages);
  const [buying, setBuying] = useState(null);

  useEffect(() => {
    if (_cachedPackages) return;
    getPackages().then(data => {
      setPackages(data);
      setLoading(false);
    });
  }, []);

  const handleBuy = async (pkg) => {
    setBuying(pkg.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const EF_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/checkout`;
      const res = await fetch(EF_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ package_id: pkg.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment error');
      if (data.checkout_url) window.location.href = data.checkout_url;
    } catch {
      alert(lang === 'fr'
        ? 'Erreur lors de la création du paiement. Réessayez.'
        : 'Error creating payment. Please try again.');
      setBuying(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[520px] mx-auto bg-white dark:bg-[#1E293B] rounded-t-[20px] border border-slate-200 dark:border-white/8 max-h-[92dvh] overflow-y-auto pb-safe"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-0">
          <div>
            <div className="text-[18px] font-bold text-slate-900 dark:text-[#F1F5F9]">
              {lang === 'fr' ? 'Acheter des tokens' : 'Buy Tokens'}
            </div>
            <div className="text-[12px] text-slate-400 dark:text-[#64748B] mt-0.5">
              {lang === 'fr' ? 'Solde actuel :' : 'Current balance:'}{' '}
              <span className="text-[#22C55E] font-bold">{tokenBalance ?? 0}</span> tokens
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-white/6 text-slate-400 dark:text-[#94A3B8] hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Packs */}
        <div className="p-4 flex flex-col gap-2.5">
          {loading && (
            <div className="text-center py-8 text-slate-400 dark:text-[#64748B] text-[14px]">
              {lang === 'fr' ? 'Chargement…' : 'Loading…'}
            </div>
          )}

          {packages.map((pkg, i) => {
            const Icon = PACK_ICONS[i % PACK_ICONS.length];
            const color = PACK_COLORS[i % PACK_COLORS.length];
            return (
              <div
                key={pkg.id}
                className={cn(
                  'relative flex items-center gap-3.5 rounded-[14px] p-3.5 transition-all hover:-translate-y-0.5',
                  'bg-slate-50 dark:bg-white/4',
                  pkg.is_popular
                    ? 'border-[1.5px]'
                    : 'border border-slate-200 dark:border-white/8 hover:border-slate-300 dark:hover:border-white/20'
                )}
                style={pkg.is_popular ? { borderColor: color } : {}}
              >
                {/* Popular badge */}
                {pkg.is_popular && (
                  <div
                    className="absolute -top-2.5 left-4 flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[10px] font-bold tracking-wider"
                    style={{ background: color }}
                  >
                    <Flame size={10} />
                    {lang === 'fr' ? 'POPULAIRE' : 'POPULAR'}
                  </div>
                )}

                {/* Icon */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${color}20` }}
                >
                  <Icon size={22} style={{ color }} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[15px]" style={{ color: textPrimary }}>{pkg.name}</div>
                  <div className="text-[12px] text-slate-500 dark:text-[#94A3B8] mt-0.5">
                    <span className="font-bold" style={{ color }}>{pkg.tokens}</span> tokens
                    {' · '}
                    <span className="text-[11px]">{Math.round(pkg.price_xaf / pkg.tokens)} XAF/token</span>
                  </div>
                </div>

                {/* Price + Buy */}
                <div className="text-right shrink-0">
                  <div className="text-[16px] font-extrabold" style={{ color: textPrimary }}>
                    {pkg.price_xaf.toLocaleString()} XAF
                  </div>
                  <button
                    onClick={() => handleBuy(pkg)}
                    disabled={buying === pkg.id}
                    className="mt-1.5 px-3.5 py-1.5 rounded-lg text-white font-bold text-[12px] transition-all disabled:opacity-60 hover:brightness-110 active:scale-95"
                    style={{ background: color }}
                  >
                    {buying === pkg.id
                      ? (lang === 'fr' ? 'Redirection…' : 'Redirecting…')
                      : (lang === 'fr' ? 'Acheter' : 'Buy')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 text-[11px] text-slate-400 dark:text-[#475569] text-center leading-relaxed">
          {lang === 'fr'
            ? 'Paiement sécurisé via Chariow · MTN MoMo · Orange Money · Carte'
            : 'Secure payment via Chariow · MTN MoMo · Orange Money · Card'}
        </div>
      </div>
    </div>
  );
}
