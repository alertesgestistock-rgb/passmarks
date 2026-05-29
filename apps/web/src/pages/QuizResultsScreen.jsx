
import React, { useState, useEffect } from 'react';
import { Share2, RefreshCw, Trophy, Home } from 'lucide-react';
import ShareSheet from '@/components/ShareSheet';
import { addNotification } from '@/lib/NotificationManager';

export default function QuizResultsScreen({ navigate, viewState }) {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [hasCelebrated, setHasCelebrated] = useState(false);

  const score = viewState?.score || 0;
  const totalQuestions = viewState?.totalQuestions || 5;
  const subject = viewState?.subject || 'General';
  const percentage = Math.round((score / totalQuestions) * 100);

  let gradeBadge = { text: "Keep studying 💪", colors: "bg-[#334155] text-[#94A3B8] border-[#475569]" };
  if (percentage >= 90) gradeBadge = { text: "Grade A ⭐", colors: "bg-[#14532D] text-[#86EFAC] border-[#22C55E]/50" };
  else if (percentage >= 70) gradeBadge = { text: "Grade B", colors: "bg-[#1E3A5F] text-[#93C5FD] border-[#3B82F6]/50" };
  else if (percentage >= 50) gradeBadge = { text: "Grade C", colors: "bg-[#431407] text-[#FDBA74] border-[#F97316]/50" };

  useEffect(() => {
    if (percentage >= 80 && !hasCelebrated) {
      addNotification({
        type: 'QUIZ_CELEBRATION',
        title: 'Outstanding Quiz Score! 🎉',
        body: `Amazing! Grade A performance 🌟 Keep it up on PassMark!`,
        action: 'profile'
      });
      setHasCelebrated(true);
    }
  }, [percentage, hasCelebrated]);

  return (
    <>
      <ShareSheet 
        isOpen={isShareOpen} 
        onClose={() => setIsShareOpen(false)} 
        shareType="quiz" 
        quizData={{ score, totalQuestions, subject }}
      />
      
      <div className="max-w-[500px] mx-auto py-8 flex flex-col items-center">
        
        <Trophy size={56} className="text-[#EAB308] mb-6 drop-shadow-[0_0_20px_rgba(234,179,8,0.4)]" />
        
        <h1 className="text-[24px] font-bold text-white mb-2 tracking-tight">Quiz Complete!</h1>
        <p className="text-[#94A3B8] text-[15px] mb-8 font-medium">{subject} · {totalQuestions} Questions</p>

        {/* Circular Progress */}
        <div className="relative w-[140px] h-[140px] mb-8 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#1E293B" strokeWidth="8" />
            <circle 
              cx="50" cy="50" r="45" fill="none" stroke="#22C55E" strokeWidth="8" strokeLinecap="round"
              strokeDasharray="282.7"
              strokeDashoffset={282.7 - (282.7 * percentage) / 100}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-[32px] font-bold text-white leading-none tracking-tighter" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {percentage}%
            </span>
          </div>
        </div>

        <div className="text-[24px] font-bold text-white mb-4">
          {score} <span className="text-[#64748B]">/</span> {totalQuestions} Correct
        </div>
        
        <div className={`px-5 py-2 rounded-full border text-[14px] font-bold uppercase tracking-wider mb-8 ${gradeBadge.colors}`}>
          {gradeBadge.text}
        </div>

        <button 
          onClick={() => setIsShareOpen(true)}
          className="mb-12 bg-[#22C55E] text-[#052e16] px-5 py-2.5 rounded-xl text-[14px] font-bold flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-md"
        >
          <Share2 size={16} /> Share my score
        </button>

        <div className="w-full flex flex-col gap-4">
          <button 
            onClick={() => navigate('quiz-setup')}
            className="w-full bg-[#1E293B] text-white border border-[#334155] rounded-xl py-4 text-[16px] font-bold flex items-center justify-center gap-2 hover:bg-[#334155] active:scale-[0.98] transition-all"
          >
            <RefreshCw size={20} /> New Quiz
          </button>
          
          <button 
            onClick={() => navigate('home')}
            className="w-full bg-[#0F172A] text-[#94A3B8] border border-[#334155] rounded-xl py-4 text-[16px] font-bold flex items-center justify-center gap-2 hover:text-[#F1F5F9] hover:border-[#475569] active:scale-[0.98] transition-all"
          >
            <Home size={18} /> Home
          </button>
        </div>

      </div>
    </>
  );
}
