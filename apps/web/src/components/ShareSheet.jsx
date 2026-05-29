
import React, { useState, useEffect } from 'react';
import { X, Copy, Check, MessageCircle, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ShareSheet({ isOpen, onClose, shareType = 'general', quizData = null, solutionText = null }) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (isOpen) setIsRendered(true);
  }, [isOpen]);

  if (!isRendered && !isOpen) return null;

  const handleAnimationEnd = () => {
    if (!isOpen) setIsRendered(false);
  };

  const getMessage = () => {
    if (shareType === 'quiz' && quizData) {
      return `🎯 I just scored ${quizData.score}/${quizData.totalQuestions} on a GCE ${quizData.subject} quiz on PassMark! The AI tutor is 🔥 Try it free → passmark.app #GCE #Cameroon #PassMark`;
    }
    if (shareType === 'solution' && solutionText) {
      return `Check out this step-by-step solution from PassMark AI:\n\n${solutionText.substring(0, 150)}...\n\nSee full solution at passmark.app 📚`;
    }
    return '📚 Found the best GCE revision app! PassMark has AI that solves past paper questions step by step — even from photos! Free to use → passmark.app #GCECameroon #ALevels #OLevels';
  };

  const shareMessage = getMessage();
  const encodedMessage = encodeURIComponent(shareMessage);
  const shareUrl = 'https://passmark.app';

  const copyToClipboard = async (text, isLink = false) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isLink) {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else {
        toast.success('Message copied!');
      }
    } catch (e) {
      toast.error('Failed to copy');
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col justify-end">
      {/* Backdrop */}
      <div 
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div 
        className={cn(
          "relative bg-[#1E293B] rounded-t-[20px] w-full max-h-[70vh] p-5 shadow-2xl transition-transform duration-300 ease-out flex flex-col pb-safe border-t border-[#334155]/50",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
        onTransitionEnd={handleAnimationEnd}
      >
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-[#334155] rounded-full" />
        
        <div className="flex justify-between items-center mb-6 mt-4">
          <div>
            <h2 className="text-[16px] font-bold text-[#F1F5F9] tracking-tight">Share PassMark</h2>
            <p className="text-[12px] text-[#94A3B8] font-medium mt-0.5">Help your classmates discover PassMark</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-[#0F172A] rounded-full flex items-center justify-center text-[#94A3B8] hover:text-[#F1F5F9] transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <a 
            href={`https://wa.me/?text=${encodedMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#0F172A] rounded-xl p-4 flex flex-col items-center gap-2.5 active:scale-95 transition-transform border border-[#334155]/30 hover:border-[#22C55E]/50 group"
          >
            <div className="w-11 h-11 bg-[#22C55E]/10 text-[#22C55E] rounded-full flex items-center justify-center group-hover:bg-[#22C55E] group-hover:text-white transition-colors">
              <MessageCircle size={22} />
            </div>
            <span className="text-[12px] font-semibold text-[#94A3B8] group-hover:text-[#F1F5F9]">WhatsApp</span>
          </a>

          <a 
            href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodedMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#0F172A] rounded-xl p-4 flex flex-col items-center gap-2.5 active:scale-95 transition-transform border border-[#334155]/30 hover:border-[#3B82F6]/50 group"
          >
            <div className="w-11 h-11 bg-[#3B82F6]/10 text-[#3B82F6] rounded-full flex items-center justify-center group-hover:bg-[#3B82F6] group-hover:text-white transition-colors">
              <Send size={22} className="ml-[-2px]" />
            </div>
            <span className="text-[12px] font-semibold text-[#94A3B8] group-hover:text-[#F1F5F9]">Telegram</span>
          </a>

          <button 
            onClick={() => copyToClipboard(shareUrl, true)}
            className="bg-[#0F172A] rounded-xl p-4 flex flex-col items-center gap-2.5 active:scale-95 transition-transform border border-[#334155]/30 hover:border-[#94A3B8]/50 group"
          >
            <div className={cn("w-11 h-11 rounded-full flex items-center justify-center transition-colors", copiedLink ? "bg-[#22C55E] text-white" : "bg-[#334155]/50 text-[#94A3B8] group-hover:bg-[#334155] group-hover:text-[#F1F5F9]")}>
              {copiedLink ? <Check size={22} /> : <Copy size={22} />}
            </div>
            <span className={cn("text-[12px] font-semibold transition-colors", copiedLink ? "text-[#22C55E]" : "text-[#94A3B8] group-hover:text-[#F1F5F9]")}>
              {copiedLink ? 'Copied! ✓' : 'Copy Link'}
            </span>
          </button>

          <button 
            onClick={() => copyToClipboard(shareMessage, false)}
            className="bg-[#0F172A] rounded-xl p-4 flex flex-col items-center gap-2.5 active:scale-95 transition-transform border border-[#334155]/30 hover:border-[#94A3B8]/50 group"
          >
            <div className="w-11 h-11 bg-[#334155]/50 text-[#94A3B8] rounded-full flex items-center justify-center group-hover:bg-[#334155] group-hover:text-[#F1F5F9] transition-colors">
              <FileTextIcon />
            </div>
            <span className="text-[12px] font-semibold text-[#94A3B8] group-hover:text-[#F1F5F9]">Copy Message</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function FileTextIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  );
}
