import React from 'react';
import { useTranslation } from 'react-i18next';

export default function LanguageToggle({ compact = false }) {
  const { i18n } = useTranslation();
  const current = i18n.language;

  const toggle = () => {
    const next = current === 'en' ? 'fr' : 'en';
    i18n.changeLanguage(next);
    localStorage.setItem('pm_lang', next);
  };

  return (
    <button
      onClick={toggle}
      aria-label="Switch language"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        background: 'rgba(255,255,255,0.06)',
        border: '0.5px solid rgba(255,255,255,0.12)',
        borderRadius: 20,
        padding: compact ? '4px 10px' : '5px 12px',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: compact ? 11 : 12,
        fontWeight: 600,
        letterSpacing: '0.04em',
        color: '#94A3B8',
        transition: 'all 0.15s',
        userSelect: 'none',
        backdropFilter: 'blur(4px)',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(34,197,94,0.4)'; e.currentTarget.style.color = '#F1F5F9'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#94A3B8'; }}
    >
      <span style={{ opacity: current === 'en' ? 1 : 0.4, color: current === 'en' ? '#22C55E' : 'inherit', transition: 'all 0.15s' }}>EN</span>
      <span style={{ opacity: 0.3, margin: '0 2px' }}>|</span>
      <span style={{ opacity: current === 'fr' ? 1 : 0.4, color: current === 'fr' ? '#22C55E' : 'inherit', transition: 'all 0.15s' }}>FR</span>
    </button>
  );
}
