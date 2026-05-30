import React from 'react';
import { Coins } from 'lucide-react';

export default function TokenBalance({ balance, onClick, compact = false }) {
  const isLow = typeof balance === 'number' && balance <= 5;
  const isNull = balance === null || balance === undefined;

  if (isNull) return null;

  return (
    <button
      onClick={onClick}
      title="Voir les packs de tokens"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: isLow ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.1)',
        border: `1px solid ${isLow ? 'rgba(239,68,68,0.35)' : 'rgba(34,197,94,0.25)'}`,
        borderRadius: 20,
        padding: compact ? '4px 10px' : '5px 12px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: compact ? 12 : 13,
        fontWeight: 700,
        color: isLow ? '#EF4444' : '#22C55E',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
        animation: isLow ? 'token-pulse 2s ease-in-out infinite' : 'none',
      }}
    >
      <style>{`
        @keyframes token-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.65; }
        }
      `}</style>
      <Coins size={compact ? 13 : 15} />
      <span>{balance}</span>
      {isLow && !compact && <span style={{ fontSize: 10, opacity: 0.8 }}>faible</span>}
    </button>
  );
}
