
import React, { useState, useEffect, useRef } from 'react';
import { Send, Image as ImageIcon, FileText, Bot, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/UserContext';

export default function AITutorPage({ navigate, viewState }) {
  const { user, updateUser, addRecentActivity, isLoading: userLoading } = useUser();
  
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef(null);

  const welcomeMessage = { 
    role: 'assistant', 
    content: `Hey ${user?.name || ''}! 👋 I'm your PassMark AI Tutor. I can solve any GCE ${user?.level || ''} question — just type it, send a photo, or upload a PDF. What are you working on today?` 
  };

  const [messages, setMessages] = useState(() => {
    if (user?.chatHistory && user.chatHistory.length > 0) {
      return user.chatHistory;
    }
    return [welcomeMessage];
  });

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('claude_api_key');
    if (stored) {
      setApiKey(stored);
      setHasKey(true);
    }
  }, []);

  useEffect(() => {
    if (viewState?.initialMessage && hasKey) {
      handleSend(viewState.initialMessage);
      navigate('tutor', null);
    }
  }, [viewState, hasKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (messages.length > 0 && user) {
      updateUser({ chatHistory: messages.slice(-20) });
    }
  }, [messages]);

  const handleNewChat = () => {
    setMessages([welcomeMessage]);
  };

  const getSuggestedQuestion = (subject) => {
    const map = {
      'Physics': "Explain Newton's 3rd Law",
      'Chemistry': "What is the Born-Haber cycle?",
      'Mathematics': "Solve quadratic equations",
      'History': "Causes of World War 1",
      'Economics': "Explain price elasticity"
    };
    return map[subject] || `Help me with ${subject}`;
  };

  const callClaude = async (userText) => {
    setIsLoading(true);
    
    const systemPrompt = `You are PassMark AI Tutor, an expert GCE Cameroon exam coach for O Level and A Level students. You help students solve past paper questions step by step.`;
    
    const historyPayload = messages.slice(-19).map(m => ({
      role: m.role,
      content: m.content
    }));
    historyPayload.push({ role: 'user', content: userText });

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 1000,
          system: systemPrompt,
          messages: historyPayload
        })
      });

      if (!response.ok) throw new Error('API Error');

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.content[0].text, timestamp: new Date().toISOString() }]);
      
      const subject = user?.subjects?.[0] || 'General';
      const currentSubjectCount = user?.stats?.bySubject?.[subject] || 0;
      
      updateUser({ 
        stats: { 
          ...user.stats, 
          questionsSolved: (user.stats?.questionsSolved || 0) + 1,
          bySubject: { ...user.stats?.bySubject, [subject]: currentSubjectCount + 1 }
        } 
      });
      
      addRecentActivity({ 
        type: 'question', 
        subject: subject, 
        preview: userText.substring(0, 40), 
        date: new Date().toISOString(), 
        solved: true 
      });

    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Connection issue. Check your internet or API key and try again.", 
        isError: true,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = (textOverride) => {
    const text = typeof textOverride === 'string' ? textOverride : input.trim();
    if (!text || !hasKey || isLoading || isOffline) return;
    
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text, timestamp: new Date().toISOString() }]);
    callClaude(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (userLoading) {
    return <div className="animate-pulse h-full bg-[#1E293B] rounded-2xl m-4"></div>;
  }

  return (
    <div className="max-w-[680px] mx-auto h-[calc(100vh-140px)] lg:h-[calc(100vh-64px)] flex flex-col relative fade-in">
      
      {isOffline && (
        <div className="bg-[#1E293B] text-[#F97316] border-b-[0.5px] border-[#F97316] p-2 text-center text-[12px] shrink-0">
          You're offline. AI Tutor needs internet. Past Papers available offline.
        </div>
      )}

      {!hasKey && (
        <div className="bg-[#431407] text-[#FDBA74] p-3 text-[13px] flex items-center justify-between shrink-0 rounded-xl mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} /> Add your Claude API key in Settings to activate the AI Tutor
          </div>
          <button onClick={() => navigate('settings')} className="text-[#F97316] font-medium hover:underline">
            Go to Settings →
          </button>
        </div>
      )}

      {/* Chat Header */}
      <div className="bg-[#1E293B] rounded-2xl p-3 mb-4 flex items-center justify-between shrink-0 shadow-sm border border-[#334155]/50">
        <div className="flex items-center gap-3">
          <div className="w-[40px] h-[40px] rounded-xl bg-[#22C55E]/10 flex items-center justify-center shrink-0">
            <Bot size={20} className="text-[#22C55E]" />
          </div>
          <div>
            <h2 className="text-[14px] font-medium text-white">AI Tutor</h2>
          </div>
        </div>
        <button 
          onClick={handleNewChat}
          className="bg-[#334155] text-[#94A3B8] hover:text-white px-[10px] py-[4px] rounded-[6px] text-[11px] transition-colors scale-on-click"
        >
          New chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto mb-4 flex flex-col gap-4 pr-2 pb-4 hide-scrollbar">
        {messages.map((msg, idx) => (
          <div key={idx} className={cn("flex flex-col gap-1 w-full", msg.role === 'user' ? "items-end" : "items-start")}>
            <div className={cn(
              "max-w-[85%] md:max-w-[75%] p-4 rounded-2xl text-[14px] leading-relaxed",
              msg.role === 'user' 
                ? "bg-[#14532D] text-white rounded-br-sm" 
                : msg.isError 
                  ? "bg-[#450a0a] text-[#EF4444] border border-[#7f1d1d] rounded-bl-sm"
                  : "bg-[#1E293B] text-[#F1F5F9] rounded-bl-sm border border-[#334155]/50"
            )}>
              {msg.content}
            </div>
            {msg.timestamp && (
              <span className="text-[10px] text-[#64748B] px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        ))}
        
        {messages.length === 1 && user?.subjects?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {user.subjects.slice(0, 3).map(sub => (
              <button 
                key={sub}
                onClick={() => handleSend(getSuggestedQuestion(sub))}
                className="bg-[#1E293B] border-[0.5px] border-[#22C55E] text-[#22C55E] rounded-[20px] px-[14px] py-[6px] text-[12px] scale-on-click"
              >
                {getSuggestedQuestion(sub)}
              </button>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="flex gap-2 w-full justify-start">
            <div className="bg-[#1E293B] p-4 rounded-2xl rounded-bl-sm border border-[#334155]/50 w-[60px] h-[40px] flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 bg-[#22C55E] rounded-full animate-pulse" />
              <span className="w-1.5 h-1.5 bg-[#22C55E] rounded-full animate-pulse delay-75" />
              <span className="w-1.5 h-1.5 bg-[#22C55E] rounded-full animate-pulse delay-150" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="shrink-0 bg-[#1E293B] border border-[#334155]/50 rounded-2xl p-2 flex items-center gap-2">
        <button className="w-[40px] h-[40px] rounded-xl flex items-center justify-center text-[#94A3B8] hover:bg-[#334155] transition-colors shrink-0">
          <ImageIcon size={20} />
        </button>
        <button className="w-[40px] h-[40px] rounded-xl flex items-center justify-center text-[#94A3B8] hover:bg-[#334155] transition-colors shrink-0">
          <FileText size={20} />
        </button>
        
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question..."
          disabled={!hasKey || isLoading || isOffline}
          className="flex-1 bg-transparent border-none outline-none text-[14px] text-white px-2 placeholder:text-[#64748B] disabled:opacity-50"
        />
        
        <button 
          onClick={() => handleSend()}
          disabled={!input.trim() || !hasKey || isLoading || isOffline}
          className="w-[40px] h-[40px] rounded-xl bg-[#22C55E] flex items-center justify-center shrink-0 disabled:opacity-50 scale-on-click"
        >
          <Send size={18} className="text-[#052e16] ml-0.5" />
        </button>
      </div>

    </div>
  );
}
