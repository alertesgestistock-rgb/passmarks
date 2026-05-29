
import React, { useState } from 'react';
import { ArrowLeft, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import apiServerClient from '@/lib/apiServerClient';

const SUBJECTS = ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Economics', 'History', 'Geography', 'French'];

export default function QuizSetupScreen({ navigate, viewState }) {
  const defaultSub = viewState?.defaultSubject || 'Physics';

  const [subject, setSubject] = useState(defaultSub);
  const [level, setLevel] = useState('A Level');
  const [numQuestions, setNumQuestions] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiServerClient.fetch('/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          level,
          numQuestions
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate quiz. Check API connection.');
      }

      const questions = await response.json();
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('Invalid quiz data received.');
      }

      navigate('quiz-play', { questions, subject });
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while generating the quiz.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-[500px] mx-auto">
      <button 
        onClick={() => navigate('home')}
        className="flex items-center gap-1 text-[#64748B] hover:text-white font-medium text-[13px] mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <h1 className="text-[24px] font-bold text-white mb-8 tracking-tight">Quick Quiz ✨</h1>

      <div className="bg-[#1E293B] rounded-2xl p-5 border border-[#334155]/50 flex flex-col gap-6 shadow-sm">
        
        {error && (
          <div className="bg-[#450a0a] text-[#EF4444] p-3 rounded-xl text-[12px] flex items-center gap-2 border border-[#7f1d1d]">
            <AlertCircle size={16} className="shrink-0" /> {error}
          </div>
        )}

        {/* Level */}
        <div>
          <label className="block text-[13px] font-semibold text-[#94A3B8] mb-3 uppercase tracking-wider">Level</label>
          <div className="flex gap-3">
            {['O Level', 'A Level'].map(lvl => (
              <button
                key={lvl}
                onClick={() => setLevel(lvl)}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-[14px] font-medium border transition-all active:scale-95",
                  level === lvl ? "bg-[#3B82F6]/20 border-[#3B82F6] text-[#93C5FD]" : "bg-[#0F172A] border-[#334155] text-[#94A3B8] hover:border-[#475569]"
                )}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-[13px] font-semibold text-[#94A3B8] mb-3 uppercase tracking-wider">Subject</label>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map(sub => (
              <button
                key={sub}
                onClick={() => setSubject(sub)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[13px] font-medium border transition-all active:scale-95",
                  subject === sub ? "bg-[#22C55E]/20 border-[#22C55E] text-[#86EFAC]" : "bg-[#0F172A] border-[#334155] text-[#94A3B8] hover:border-[#475569]"
                )}
              >
                {sub}
              </button>
            ))}
          </div>
        </div>

        {/* Number of Questions */}
        <div>
          <label className="block text-[13px] font-semibold text-[#94A3B8] mb-3 uppercase tracking-wider">Questions</label>
          <div className="flex gap-3">
            {[5, 10, 15].map(num => (
              <button
                key={num}
                onClick={() => setNumQuestions(num)}
                className={cn(
                  "flex-1 py-2.5 rounded-xl text-[14px] font-medium border transition-all active:scale-95",
                  numQuestions === num ? "bg-[#F97316]/20 border-[#F97316] text-[#FDBA74]" : "bg-[#0F172A] border-[#334155] text-[#94A3B8] hover:border-[#475569]"
                )}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full mt-4 bg-[#22C55E] text-[#052e16] rounded-xl py-3.5 text-[15px] font-bold flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 shadow-md"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-[#052e16] border-t-transparent rounded-full animate-spin" />
          ) : (
            <>Generate Quiz <Sparkles size={18} /></>
          )}
        </button>
      </div>
    </div>
  );
}
