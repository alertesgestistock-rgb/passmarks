
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';

export default function QuizPlayScreen({ navigate, viewState }) {
  const { user, updateUser, addRecentActivity } = useUser();

  const questions = viewState?.questions || [];
  const subject = viewState?.subject || 'General';

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [answersLog, setAnswersLog] = useState([]);

  useEffect(() => {
    if (!questions.length) navigate('quiz-setup');
  }, [questions, navigate]);

  if (!questions.length) return null;

  const currentQ = questions[currentIndex];
  const progress = (currentIndex / questions.length) * 100;

  const handleSelect = (optionText) => {
    if (isAnswered) return;
    setSelectedAnswer(optionText);
  };

  const handleSubmit = () => {
    if (!selectedAnswer) return;
    const choiceLetter = selectedAnswer.split('.')[0].trim();
    const isCorrect = choiceLetter === currentQ.answer;
    setIsAnswered(true);
    if (isCorrect) setScore(s => s + 1);
    setAnswersLog(prev => [...prev, { question: currentQ.question, userAnswer: choiceLetter, correctAnswer: currentQ.answer, isCorrect }]);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(i => i + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      const finalScore = score + (selectedAnswer && selectedAnswer.split('.')[0].trim() === currentQ.answer ? 1 : 0);
      const percentage = Math.round((finalScore / questions.length) * 100);

      if (user) {
        const newQuizzesCompleted = (user.stats?.quizzesCompleted || 0) + 1;
        const currentAvg = user.stats?.totalScore || 0;
        const newAvg = Math.round(((currentAvg * (newQuizzesCompleted - 1)) + percentage) / newQuizzesCompleted);
        updateUser({
          stats: { ...user.stats, quizzesCompleted: newQuizzesCompleted, totalScore: newAvg },
          quizHistory: [{ date: new Date().toISOString(), subject, score: finalScore, total: questions.length, answers: answersLog }, ...(user.quizHistory || [])]
        });
        addRecentActivity({ type: 'quiz', subject, score: percentage });
      }

      navigate('quiz-results', { score: finalScore, totalQuestions: questions.length, subject, answersLog });
    }
  };

  const getOptionStyle = (option) => {
    const letter = option.split('.')[0].trim();
    if (!isAnswered) {
      return selectedAnswer === option
        ? "border-[#22C55E] bg-[#22C55E]/10 dark:bg-[#22C55E]/10"
        : "border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] hover:border-slate-300 dark:hover:border-[#475569]";
    }
    if (letter === currentQ.answer) return "border-[#22C55E] bg-green-50 dark:bg-[#14532D]";
    if (selectedAnswer === option && letter !== currentQ.answer) return "border-[#EF4444] bg-red-50 dark:bg-[#3B0000]";
    return "border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1E293B] opacity-50";
  };

  return (
    <div className="max-w-[600px] mx-auto h-[calc(100vh-140px)] flex flex-col">

      {/* Header & Progress */}
      <div className="mb-6 shrink-0">
        <div className="flex justify-between items-end mb-2">
          <h2 className="text-[13px] font-bold text-slate-400 dark:text-[#94A3B8] tracking-widest uppercase">{subject} Quiz</h2>
          <span className="text-[13px] font-bold text-slate-700 dark:text-white bg-slate-100 dark:bg-[#334155] px-2.5 py-0.5 rounded-full">
            {currentIndex + 1} / {questions.length}
          </span>
        </div>
        <div className="w-full h-2 bg-slate-200 dark:bg-[#1E293B] rounded-full overflow-hidden">
          <div className="h-full bg-[#22C55E] transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Content Scrollable */}
      <div className="flex-1 overflow-y-auto hide-scrollbar pb-6">
        <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 md:p-6 mb-6 shadow-sm border border-slate-200 dark:border-[#334155]/50">
          <h3 className="text-[16px] md:text-[18px] font-semibold text-slate-800 dark:text-[#F1F5F9] leading-relaxed">
            {currentQ.question}
          </h3>
        </div>

        <div className="flex flex-col gap-3">
          {currentQ.options.map((option, idx) => {
            const letter = option.split('.')[0].trim();
            const isSelected = selectedAnswer === option;
            const isCorrectOpt = isAnswered && letter === currentQ.answer;

            return (
              <button
                key={idx}
                onClick={() => handleSelect(option)}
                disabled={isAnswered}
                className={cn("w-full text-left rounded-2xl p-4 border transition-all flex items-center gap-4 group", getOptionStyle(option))}
              >
                <div className={cn(
                  "w-[32px] h-[32px] rounded-full flex items-center justify-center shrink-0 font-bold text-[14px] transition-colors",
                  (isSelected && !isAnswered) ? "bg-[#22C55E] text-[#052e16]" :
                  isCorrectOpt ? "bg-[#22C55E] text-[#052e16]" :
                  (isSelected && isAnswered) ? "bg-[#EF4444] text-white" :
                  "bg-slate-100 dark:bg-[#334155] text-slate-500 dark:text-[#94A3B8] group-hover:bg-slate-200 dark:group-hover:bg-[#475569]"
                )}>
                  {letter}
                </div>
                <span className="text-[15px] text-slate-800 dark:text-[#F1F5F9] font-medium">{option.substring(option.indexOf('.') + 1).trim()}</span>
              </button>
            );
          })}
        </div>

        {/* Explanation */}
        {isAnswered && (
          <div className={cn(
            "mt-6 p-5 rounded-2xl border animate-in slide-in-from-bottom-2",
            selectedAnswer.split('.')[0].trim() === currentQ.answer
              ? "bg-green-50 dark:bg-[#14532D]/30 border-green-200 dark:border-[#22C55E]/30"
              : "bg-red-50 dark:bg-[#3B0000]/30 border-red-200 dark:border-[#EF4444]/30"
          )}>
            <div className="flex items-center gap-2 mb-2 font-bold text-[15px]">
              {selectedAnswer.split('.')[0].trim() === currentQ.answer ? (
                <><CheckCircle2 className="text-[#22C55E]" size={20} /> <span className="text-green-700 dark:text-[#86EFAC]">Correct!</span></>
              ) : (
                <><XCircle className="text-[#EF4444]" size={20} /> <span className="text-red-600 dark:text-[#FCA5A5]">Wrong. Answer is {currentQ.answer}</span></>
              )}
            </div>
            <p className="text-[14px] text-slate-600 dark:text-[#CBD5E1] leading-relaxed">
              {currentQ.explanation}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 pt-4 border-t border-slate-200 dark:border-[#334155]">
        {!isAnswered ? (
          <button
            onClick={handleSubmit}
            disabled={!selectedAnswer}
            className="w-full bg-slate-900 dark:bg-[#F1F5F9] text-white dark:text-[#0F172A] rounded-xl py-4 text-[16px] font-bold disabled:opacity-40 disabled:bg-slate-200 dark:disabled:bg-[#334155] disabled:text-slate-400 dark:disabled:text-[#94A3B8] transition-all hover:bg-slate-800 dark:hover:bg-white active:scale-[0.98]"
          >
            Submit Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="w-full bg-[#22C55E] text-[#052e16] rounded-xl py-4 text-[16px] font-bold flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all shadow-md"
          >
            {currentIndex < questions.length - 1 ? "Next Question" : "View Results"} <ArrowRight size={20} />
          </button>
        )}
      </div>

    </div>
  );
}
