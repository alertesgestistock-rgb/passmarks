import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

export default function Footer() {
  const { t } = useTranslation();

  const navLinks = [
    { to: '/features', label: t('nav.features') },
    { to: '/how-it-works', label: t('nav.how_it_works') },
    { to: '/pricing', label: t('nav.pricing') },
    { to: '/auth', label: t('nav.sign_in') },
  ];

  return (
    <footer className="bg-slate-50 dark:bg-[#080F1A] border-t border-slate-200 dark:border-white/5 pt-14 pb-8 px-4 relative z-10 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">

        {/* Main Footer Grid (3 columns for balanced look) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 mb-12">

          {/* Brand Column */}
          <div className="flex flex-col gap-4">
            <Link to="/" className="flex items-center gap-2 font-black text-base text-slate-900 dark:text-white active:scale-95 transition-transform w-fit">
              <img src="/icon-192.jpg" alt="PassMark" width="28" height="28" className="shrink-0 rounded-lg" />
              <span>Pass<span className="text-[#22C55E]">Mark</span></span>
            </Link>
            <p className="text-xs text-slate-500 dark:text-[#64748B] leading-relaxed max-w-[240px]">
              Your personal AI GCE Tutor in Cameroon.
            </p>
          </div>

          {/* Navigation Column */}
          <div className="flex flex-col gap-3 sm:items-center">
            <div className="flex flex-col gap-3">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-[#64748B] mb-1">Navigation</h4>
              {navLinks.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="text-sm text-slate-650 hover:text-slate-900 dark:text-[#94A3B8] dark:hover:text-white transition-colors duration-150"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact Column */}
          <div className="flex flex-col gap-3 sm:items-end">
            <div className="flex flex-col gap-3 w-fit">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-[#64748B] mb-1">Contact</h4>
              <a
                href="https://wa.me/237683982584?text=Hello%20sir%2C%20I%20got%20your%20number%20from%20PassMark%20App"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-slate-650 hover:text-[#25D366] dark:text-[#94A3B8] dark:hover:text-[#25D366] transition-colors duration-150"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-[#25D366] shrink-0">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .1 5.392.1 11.951c0 2.096.546 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.95-5.392 11.953-11.95-.002-3.178-1.236-6.165-3.483-8.412z" />
                </svg>
                WhatsApp Support
              </a>
              <span className="text-xs text-slate-500 dark:text-[#64748B] mt-1">Yaoundé · Douala · Buea · Bamenda</span>
              <span className="text-xs text-slate-500 dark:text-[#64748B] self-start sm:self-end">Cameroon 🇨🇲</span>
            </div>
          </div>

        </div>

        {/* Divider */}
        <div className="border-t border-slate-200 dark:border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-slate-450 dark:text-[#475569] text-center sm:text-left">
            {t('common.copyright')}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-slate-450 dark:text-[#475569]">
            <span>GCE AI Tutor</span>
            <span className="text-slate-350 dark:text-[#334155]">·</span>
            <span>PWA</span>
          </div>
        </div>

      </div>

      {/* Floating WhatsApp Action Button */}
      <motion.a
        href="https://wa.me/237683982584?text=Hello%20sir%2C%20I%20got%20your%20number%20from%20PassMark%20App"
        target="_blank"
        rel="noopener noreferrer"
        whileHover={{ scale: 1.1, y: -2 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-5 right-5 w-[52px] h-[52px] rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-[0_8px_30px_rgba(37,211,102,0.4)] z-50"
        aria-label={t('common.whatsapp_label')}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .1 5.392.1 11.951c0 2.096.546 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.95-5.392 11.953-11.95-.002-3.178-1.236-6.165-3.483-8.412z" />
        </svg>
      </motion.a>
    </footer>
  );
}
