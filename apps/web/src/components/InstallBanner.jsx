import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Download, X, Share, PlusSquare } from 'lucide-react';

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (isStandalone) return;

    const ua = window.navigator.userAgent.toLowerCase();
    const detectIos = /iphone|ipad|ipod/.test(ua);
    setIsIos(detectIos);

    const isDismissed = localStorage.getItem('installBannerDismissed') === 'true';

    if (detectIos) {
      if (!isDismissed) setShowBanner(true);
      return;
    }

    // Android / Desktop: capture the native install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isDismissed) setShowBanner(true);
    };

    const handleAppInstalled = () => {
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // S'abonner à l'événement personnalisé de clic sur le bouton de téléchargement de la TopNav
  useEffect(() => {
    const triggerInstall = () => {
      setShowBanner(true);
      if (isIos) {
        setShowIosModal(true);
      } else if (deferredPrompt) {
        handleInstallClick();
      } else {
        alert(
          window.navigator.userAgent.toLowerCase().includes('android')
            ? 'Pour installer PassMark sur Android : appuyez sur les 3 points en haut à droite du navigateur, puis sélectionnez "Installer l\'application" ou "Ajouter à l\'écran d\'accueil".'
            : 'Pour installer l\'application : utilisez le bouton d\'installation de votre navigateur en haut à droite.'
        );
      }
    };

    window.addEventListener('passmark_trigger_install', triggerInstall);
    return () => window.removeEventListener('passmark_trigger_install', triggerInstall);
  }, [isIos, deferredPrompt]);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosModal(true);
      return;
    }

    if (!deferredPrompt) {
      // Fallback if prompt is missing but we are on Android / Desktop
      alert('To install this app, tap the three dots (menu) in your browser address bar and select "Add to Home screen" or "Install".');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('installBannerDismissed', 'true');
  };

  if (!showBanner) return null;

  return (
    <>
      <div className="bg-[#22C55E]/15 border-b border-[#22C55E]/20 px-4 py-2.5 flex items-center justify-between z-40 relative shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#22C55E]/25 text-[#22C55E] flex items-center justify-center shrink-0">
            <Download size={14} className="animate-bounce" />
          </div>
          <div>
            <span className="text-[12px] font-semibold text-slate-800 dark:text-[#F1F5F9] block">
              PassMark Web App
            </span>
            <span className="text-[10px] text-slate-400 dark:text-[#64748B] block -mt-0.5">
              Install as an app for full offline support
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleInstallClick}
            className="bg-[#22C55E] text-white rounded-xl px-4 py-1.5 text-[12px] font-bold hover:brightness-110 active:scale-95 transition-all shadow-md shadow-green-500/10"
          >
            Install
          </button>
          <button 
            onClick={handleDismiss} 
            className="text-slate-400 dark:text-[#64748B] hover:text-slate-600 dark:hover:text-white p-1 transition-colors"
            aria-label="Dismiss install banner"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* iOS Install Guide Modal */}
      {showIosModal && ReactDOM.createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => setShowIosModal(false)}
        >
          <div 
            className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155]/80 w-full sm:max-w-[390px] rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 flex flex-col gap-5 text-left select-none animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <span className="text-[20px]">🍏</span>
                <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">
                  Install on iPhone / iPad
                </h3>
              </div>
              <button 
                onClick={() => setShowIosModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0F172A] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Steps */}
            <div className="flex flex-col gap-4 text-[13px] text-slate-600 dark:text-[#94A3B8]">
              <p className="leading-relaxed">
                Safari on iOS does not support one-click installation. Follow these simple steps to install the app on your home screen:
              </p>

              <div className="flex flex-col gap-3.5 mt-2">
                {/* Step 1 */}
                <div className="flex gap-3 items-start bg-slate-50 dark:bg-[#0F172A]/40 p-3 rounded-xl border border-slate-100 dark:border-[#334155]/30">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-[11px] shrink-0">
                    1
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold text-slate-900 dark:text-white block">Open in Safari browser</span>
                    Make sure you are viewing this page in Safari, not an in-app browser (like Facebook or WhatsApp).
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-3 items-start bg-slate-50 dark:bg-[#0F172A]/40 p-3 rounded-xl border border-slate-100 dark:border-[#334155]/30">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-[11px] shrink-0">
                    2
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold text-slate-900 dark:text-white block">Tap the Share button</span>
                    Tap the Share icon <Share size={15} className="inline text-blue-500 mx-0.5" /> in Safari's bottom toolbar.
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-3 items-start bg-slate-50 dark:bg-[#0F172A]/40 p-3 rounded-xl border border-slate-100 dark:border-[#334155]/30">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-[11px] shrink-0">
                    3
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold text-slate-900 dark:text-white block">Add to Home Screen</span>
                    Scroll down Safari's sharing menu and tap <span className="font-semibold text-slate-900 dark:text-white">Add to Home Screen</span> <PlusSquare size={15} className="inline text-slate-500 dark:text-slate-400 mx-0.5" />.
                  </div>
                </div>
              </div>
            </div>

            {/* Button Close */}
            <button
              onClick={() => setShowIosModal(false)}
              className="w-full bg-[#22C55E] text-white rounded-xl py-2.5 text-[13px] font-bold hover:brightness-110 active:scale-98 transition-all mt-2"
            >
              Got it
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
