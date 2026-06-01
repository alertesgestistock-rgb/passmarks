import React, { useState, useEffect } from 'react';
import { X, Coins, Zap, Star, Trophy, Flame } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';

const PACK_ICONS = [Coins, Zap, Star, Trophy];
const PACK_COLORS = ['#3B82F6', '#22C55E', '#F97316', '#A855F7'];

// Cache module-level : fetch une seule fois par session
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
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch (err) {
      alert(lang === 'fr'
        ? 'Erreur lors de la création du paiement. Réessayez.'
        : 'Error creating payment. Please try again.');
      setBuying(null);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end',
    }}
      onClick={onClose}
    >
      <style>{`
        .tsm-card:hover { border-color: rgba(255,255,255,0.2) !important; transform: translateY(-2px); }
        .tsm-btn:not(:disabled):hover { opacity: 0.88; }
        .tsm-btn:not(:disabled):active { transform: scale(0.97); }
      `}</style>

      <div
        style={{
          width: '100%', maxWidth: 520, margin: '0 auto',
          background: '#1E293B',
          borderRadius: '20px 20px 0 0',
          padding: '0 0 env(safe-area-inset-bottom)',
          border: '1px solid rgba(255,255,255,0.08)',
          maxHeight: '92dvh', overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 20px 0',
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#F1F5F9' }}>
              {lang === 'fr' ? 'Acheter des tokens' : 'Buy Tokens'}
            </div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
              {lang === 'fr' ? 'Solde actuel :' : 'Current balance:'}{' '}
              <span style={{ color: '#22C55E', fontWeight: 700 }}>{tokenBalance ?? 0}</span> tokens
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: 'none',
            borderRadius: 8, padding: 8, cursor: 'pointer', color: '#94A3B8',
            display: 'flex',
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Packs */}
        <div style={{ padding: '16px 16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 32, color: '#64748B', fontSize: 14 }}>
              {lang === 'fr' ? 'Chargement…' : 'Loading…'}
            </div>
          )}
          {packages.map((pkg, i) => {
            const Icon = PACK_ICONS[i % PACK_ICONS.length];
            const color = PACK_COLORS[i % PACK_COLORS.length];
            return (
              <div key={pkg.id} className="tsm-card" style={{
                background: 'rgba(255,255,255,0.04)',
                border: pkg.is_popular
                  ? `1.5px solid ${color}`
                  : '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14,
                padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 14,
                transition: 'all 0.15s', position: 'relative',
              }}>
                {pkg.is_popular && (
                  <div style={{
                    position: 'absolute', top: -10, left: 16,
                    background: color, color: '#fff',
                    fontSize: 10, fontWeight: 700, padding: '2px 8px',
                    borderRadius: 20, letterSpacing: '0.05em',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <Flame size={10} />
                    {lang === 'fr' ? 'POPULAIRE' : 'POPULAR'}
                  </div>
                )}

                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: `${color}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={22} style={{ color }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#F1F5F9' }}>{pkg.name}</div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                    <span style={{ color, fontWeight: 700 }}>{pkg.tokens}</span> tokens
                    {' · '}
                    <span style={{ fontSize: 11 }}>
                      {Math.round(pkg.price_xaf / pkg.tokens)} XAF/token
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#F1F5F9' }}>
                    {pkg.price_xaf.toLocaleString()} XAF
                  </div>
                  <button
                    className="tsm-btn"
                    onClick={() => handleBuy(pkg)}
                    disabled={buying === pkg.id}
                    style={{
                      marginTop: 6,
                      background: color, border: 'none', borderRadius: 8,
                      color: '#fff', fontWeight: 700, fontSize: 12,
                      padding: '6px 14px', cursor: 'pointer',
                      transition: 'all 0.15s', fontFamily: 'inherit',
                      opacity: buying === pkg.id ? 0.6 : 1,
                    }}
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
        <div style={{
          padding: '0 20px 20px',
          fontSize: 11, color: '#475569', textAlign: 'center', lineHeight: 1.6,
        }}>
          {lang === 'fr'
            ? 'Paiement sécurisé via Chariow · MTN MoMo · Orange Money · Carte'
            : 'Secure payment via Chariow · MTN MoMo · Orange Money · Card'}
        </div>
      </div>
    </div>
  );
}
