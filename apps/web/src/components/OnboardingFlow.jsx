
import React, { useState } from 'react';
import { MessageSquare, FileText, List, CheckCircle2 } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { cn } from '@/lib/utils';

const SUBJECTS_LIST = [
  'Physics', 'Chemistry', 'Biology', 'Mathematics', 'Further Maths', 
  'History', 'Geography', 'Economics', 'Literature', 'French', 'CS', 'CRS'
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS = ['2025', '2026'];

export default function OnboardingFlow({ initialStep = 0, isEditMode = false, onClose = null }) {
  const { user, initializeNewUser, updateUser } = useUser();
  const [step, setStep] = useState(isEditMode ? 2 : initialStep);
  
  const [name, setName] = useState(user?.name || '');
  const [level, setLevel] = useState(user?.level || 'A Level');
  const [subjects, setSubjects] = useState(user?.subjects || []);
  const [examMonth, setExamMonth] = useState(user?.examMonth || 'Jun');
  const [examYear, setExamYear] = useState(user?.examYear || '2025');

  const toggleSubject = (sub) => {
    setSubjects(prev => 
      prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
    );
  };

  const handleSubmit = () => {
    if (!name.trim() || subjects.length === 0) return;
    
    if (isEditMode) {
      updateUser({ name, level, subjects, examMonth, examYear });
      if (onClose) onClose();
    } else {
      initializeNewUser(name, level, subjects, examMonth, examYear);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0F172A] flex flex-col items-center justify-center p-6 overflow-hidden">
      <div className="w-full max-w-[400px] flex-1 flex flex-col justify-center relative">
        
        {/* Screen 1: Welcome */}
        {step === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center fade-in">
            <div className="w-[64px] h-[64px] mb-6 text-[#22C55E]">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <path d="M3 12L9 18L21 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 2L22 12L12 22L2 12L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h1 className="text-[24px] font-medium text-[#F1F5F9] mb-2 text-center">Welcome to PassMark</h1>
            <p className="text-[16px] text-[#94A3B8] text-center mb-12 text-balance">Your personal GCE AI Tutor. Powered by Claude AI.</p>
            
            <div className="relative w-48 h-48 mb-12">
              <div className="absolute inset-0 bg-[#1E293B] rounded-3xl border border-[#334155] shadow-xl flex flex-col p-4 gap-3">
                <div className="w-3/4 h-4 bg-[#334155] rounded-full"></div>
                <div className="w-full h-12 bg-[#22C55E]/20 rounded-xl border border-[#22C55E]/50 flex items-center px-3 gap-2">
                  <CheckCircle2 size={16} className="text-[#22C55E]" />
                  <div className="w-1/2 h-2 bg-[#22C55E]/50 rounded-full"></div>
                </div>
                <div className="w-5/6 h-12 bg-[#3B82F6]/20 rounded-xl border border-[#3B82F6]/50 flex items-center px-3 gap-2">
                  <MessageSquare size={16} className="text-[#3B82F6]" />
                  <div className="w-1/2 h-2 bg-[#3B82F6]/50 rounded-full"></div>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-2 mb-8">
              <div className="w-2 h-2 rounded-full bg-[#22C55E]"></div>
              <div className="w-2 h-2 rounded-full bg-[#334155]"></div>
              <div className="w-2 h-2 rounded-full bg-[#334155]"></div>
            </div>

            <button 
              onClick={() => setStep(1)}
              className="bg-[#22C55E] text-[#052e16] rounded-[12px] px-[40px] py-[14px] font-medium scale-on-click"
            >
              Next →
            </button>
          </div>
        )}

        {/* Screen 2: Features */}
        {step === 1 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center fade-in">
            <h2 className="text-[20px] font-medium text-[#F1F5F9] mb-8 text-center">Everything you need to pass</h2>
            
            <div className="w-full flex flex-col mb-12">
              <div className="bg-[#1E293B] rounded-[12px] p-[14px] flex items-center gap-[14px] mb-[10px]">
                <div className="w-[40px] h-[40px] rounded-full bg-[#22C55E]/10 text-[#22C55E] flex items-center justify-center shrink-0">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="text-[14px] font-medium text-white mb-0.5">AI Tutor</h3>
                  <p className="text-[12px] text-[#94A3B8]">Solve any GCE question instantly</p>
                </div>
              </div>

              <div className="bg-[#1E293B] rounded-[12px] p-[14px] flex items-center gap-[14px] mb-[10px]">
                <div className="w-[40px] h-[40px] rounded-full bg-[#3B82F6]/10 text-[#3B82F6] flex items-center justify-center shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-[14px] font-medium text-white mb-0.5">Past Papers</h3>
                  <p className="text-[12px] text-[#94A3B8]">All subjects 2015–2024, offline ready</p>
                </div>
              </div>

              <div className="bg-[#1E293B] rounded-[12px] p-[14px] flex items-center gap-[14px] mb-[10px]">
                <div className="w-[40px] h-[40px] rounded-full bg-[#F97316]/10 text-[#F97316] flex items-center justify-center shrink-0">
                  <List size={20} />
                </div>
                <div>
                  <h3 className="text-[14px] font-medium text-white mb-0.5">Smart Quizzes</h3>
                  <p className="text-[12px] text-[#94A3B8]">AI-generated MCQs in exam style</p>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-2 mb-8">
              <div className="w-2 h-2 rounded-full bg-[#334155]"></div>
              <div className="w-2 h-2 rounded-full bg-[#22C55E]"></div>
              <div className="w-2 h-2 rounded-full bg-[#334155]"></div>
            </div>

            <button 
              onClick={() => setStep(2)}
              className="bg-[#22C55E] text-[#052e16] rounded-[12px] px-[40px] py-[14px] font-medium scale-on-click"
            >
              Next →
            </button>
          </div>
        )}

        {/* Screen 3: Setup Profile */}
        {step === 2 && (
          <div className="absolute inset-0 flex flex-col justify-center fade-in">
            <div className="mb-6 text-center">
              <h2 className="text-[20px] font-medium text-[#F1F5F9]">{isEditMode ? 'Edit Profile' : 'Set up your profile'}</h2>
              {!isEditMode && <p className="text-[12px] text-[#94A3B8] mt-1">30 seconds. No account needed.</p>}
            </div>

            <div className="flex flex-col gap-[12px] overflow-y-auto hide-scrollbar pb-4">
              {/* Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-[#94A3B8] ml-1">Your name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Collins Obi"
                  className="bg-[#1E293B] border-[0.5px] border-[#334155] rounded-[10px] p-[12px] text-[14px] text-[#F1F5F9] outline-none focus:border-[#22C55E]"
                />
              </div>

              {/* Level */}
              <div className="flex gap-2">
                {['O Level', 'A Level'].map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => setLevel(lvl)}
                    className={cn(
                      "flex-1 rounded-[10px] p-[12px] text-[13px] font-medium border-[0.5px] scale-on-click",
                      level === lvl ? "bg-[#22C55E] border-[#22C55E] text-[#052e16]" : "bg-[#1E293B] border-[#334155] text-[#94A3B8]"
                    )}
                  >
                    {lvl}
                  </button>
                ))}
              </div>

              {/* Subjects */}
              <div className="grid grid-cols-2 gap-2 mt-2">
                {SUBJECTS_LIST.map(sub => {
                  const isSelected = subjects.includes(sub);
                  return (
                    <button
                      key={sub}
                      onClick={() => toggleSubject(sub)}
                      className={cn(
                        "rounded-[20px] px-[12px] py-[6px] text-[11px] font-medium border scale-on-click truncate",
                        isSelected ? "bg-[#14532D] border-[#22C55E] text-[#86EFAC]" : "bg-[#1E293B] border-[#334155] text-[#94A3B8]"
                      )}
                    >
                      {sub}
                    </button>
                  );
                })}
              </div>

              {/* Exam Date */}
              <div className="flex gap-2 mt-2">
                <select 
                  value={examMonth}
                  onChange={(e) => setExamMonth(e.target.value)}
                  className="flex-1 bg-[#1E293B] border-[0.5px] border-[#334155] rounded-[8px] p-[10px] text-[14px] text-[#F1F5F9] outline-none focus:border-[#22C55E] appearance-none"
                >
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select 
                  value={examYear}
                  onChange={(e) => setExamYear(e.target.value)}
                  className="flex-1 bg-[#1E293B] border-[0.5px] border-[#334155] rounded-[8px] p-[10px] text-[14px] text-[#F1F5F9] outline-none focus:border-[#22C55E] appearance-none"
                >
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <button 
              onClick={handleSubmit}
              disabled={!name.trim() || subjects.length === 0}
              className="w-full mt-4 bg-[#22C55E] text-[#052e16] rounded-[12px] p-[14px] text-[14px] font-medium disabled:opacity-50 scale-on-click"
            >
              {isEditMode ? 'Save changes' : 'Start learning →'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
