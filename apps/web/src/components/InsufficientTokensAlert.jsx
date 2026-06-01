import React from 'react';
import { Coins, ShoppingCart } from 'lucide-react';

export default function InsufficientTokensAlert({ onBuyTokens }) {
  return (
    <div style={{
      margin: '8px 0',
      padding: '12px 16px',
      background: 'rgba(239,68,68,0.08)',
      border: '1px solid rgba(239,68,68,0.25)',
      borderRadius: 12,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: 'rgba(239,68,68,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Coins size={18} style={{ color: '#EF4444' }} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>
          Not enough tokens
        </div>
        <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
          Top up to keep using the AI tutor.
        </div>
      </div>

      <button
        onClick={onBuyTokens}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: '#22C55E', border: 'none', borderRadius: 8,
          color: '#052e16', fontWeight: 700, fontSize: 12,
          padding: '8px 12px', cursor: 'pointer',
          fontFamily: 'inherit', whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <ShoppingCart size={13} />
        Buy tokens
      </button>
    </div>
  );
}
