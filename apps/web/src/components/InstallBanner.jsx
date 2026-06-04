
import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const isDismissed = localStorage.getItem('installBannerDismissed') === 'true';
    
    const handleBeforeInstallPrompt = (e) => {
      setDeferredPrompt(e);
      if (!isDismissed) {
        e.preventDefault();
        setShowBanner(true);
      }
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

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
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
    <div className="bg-[#1E3A5F] px-4 py-2.5 flex items-center justify-between z-40 relative shadow-md">
      <div className="flex items-center gap-2">
        <Download size={16} className="text-[#93C5FD]" />
        <span className="text-[12px] font-medium text-[#93C5FD]">Install PassMark app</span>
      </div>
      <div className="flex items-center gap-3">
        <button 
          onClick={handleInstallClick}
          className="bg-[#3B82F6] text-white rounded-md px-3 py-1 text-[12px] font-medium hover:bg-[#2563EB] active:scale-95 transition-all"
        >
          Install
        </button>
        <button onClick={handleDismiss} className="text-[#64748B] hover:text-white p-1">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
