import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Image as ImageIcon, FileText, Bot,
  X, ArrowLeft, Plus, MessageSquare, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';
import { apiServerClient } from '@/lib/apiServerClient';

const SYSTEM_PROMPT = `You are PassMark AI Tutor, an expert GCE Cameroon exam coach for O Level and A Level students. You help students solve past paper questions step by step. Be concise, clear, and educational.`;

const SUGGESTED_QUESTIONS = {
  'Physics': "Explain Newton's 3rd Law",
  'Chemistry': 'What is the Born-Haber cycle?',
  'Mathematics': 'Solve quadratic equations',
  'History': 'Causes of World War 1',
  'Economics': 'Explain price elasticity',
};

function getSuggestedQuestion(subject) {
  return SUGGESTED_QUESTIONS[subject] || `Help me with ${subject}`;
}

function buildWelcome(user) {
  return {
    role: 'assistant',
    content: `Hey ${user?.name || ''}! 👋 I'm your PassMark AI Tutor. I can solve any GCE ${user?.level || ''} question — just type it, send a photo, or upload a PDF. What are you working on today?`,
    timestamp: new Date().toISOString(),
  };
}

function formatRelativeDate(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// ─────────────────────────────────────────────────────────────
// Sidebar — liste des conversations (desktop)
// ─────────────────────────────────────────────────────────────
function ConversationsSidebar({ conversations, activeConvId, loading, onNewChat, onSelect }) {
  return (
    <div className="flex flex-col h-full">
      <button
        onClick={onNewChat}
        className="flex items-center justify-center gap-2 bg-[#22C55E] hover:bg-[#16a34a] text-white rounded-xl px-3 py-3 text-[13px] font-semibold shrink-0 transition-colors scale-on-click shadow-sm shadow-[#22C55E]/20 mb-3"
      >
        <Plus size={16} /> Nouvelle conversation
      </button>

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1 hide-scrollbar">
        {loading ? (
          [1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-xl h-[56px] bg-slate-100 dark:bg-[#1E293B] animate-pulse" />
          ))
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 px-2">
            <MessageSquare size={24} className="text-slate-300 dark:text-[#475569] mx-auto mb-2" />
            <p className="text-[12px] text-slate-400 dark:text-[#64748B]">Aucune conversation</p>
          </div>
        ) : (
          conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all',
                activeConvId === conv.id
                  ? 'bg-[#22C55E]/10 border border-[#22C55E]/30'
                  : 'hover:bg-slate-100 dark:hover:bg-[#1E293B] border border-transparent'
              )}
            >
              <MessageSquare
                size={15}
                className={cn(
                  'shrink-0',
                  activeConvId === conv.id ? 'text-[#22C55E]' : 'text-slate-400 dark:text-[#64748B]'
                )}
              />
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-[13px] truncate leading-tight',
                  activeConvId === conv.id
                    ? 'text-[#22C55E] font-medium'
                    : 'text-slate-700 dark:text-[#CBD5E1]'
                )}>
                  {conv.title || 'Conversation'}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-[#475569] mt-0.5">
                  {formatRelativeDate(conv.updated_at)}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Chat View
// ─────────────────────────────────────────────────────────────
function ChatView({ initConvId, initialMessage, onBack, user, showBackButton }) {
  const { updateUser, addRecentActivity } = useUser();

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const [conversationId, setConversationId] = useState(initConvId || null);
  const [messages, setMessages] = useState([buildWelcome(user)]);

  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  useEffect(() => {
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Reload messages when conversation changes
  useEffect(() => {
    setConversationId(initConvId || null);
    setMessages([buildWelcome(user)]);
    if (!initConvId) return;
    supabase
      .from('messages')
      .select('role, content, created_at')
      .eq('conversation_id', initConvId)
      .order('created_at', { ascending: true })
      .then(({ data: msgs }) => {
        if (msgs && msgs.length > 0) {
          setMessages([
            buildWelcome(user),
            ...msgs.map(m => ({ role: m.role, content: m.content, timestamp: m.created_at })),
          ]);
        }
      });
  }, [initConvId]);

  useEffect(() => {
    if (initialMessage) handleSend(initialMessage);
  }, []);

  const getOrCreateConversation = async (firstText) => {
    if (conversationId) return conversationId;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const title = (firstText || 'Conversation').substring(0, 60);
    const { data: conv } = await supabase
      .from('conversations')
      .insert({ user_id: session.user.id, title })
      .select('id')
      .single();
    if (conv) { setConversationId(conv.id); return conv.id; }
    return null;
  };

  const saveMessage = async (convId, role, content) => {
    if (!convId) return;
    await supabase.from('messages').insert({ conversation_id: convId, role, content, content_type: 'text' });
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setPendingImage({ base64: dataUrl.split(',')[1], mimeType: file.type, preview: dataUrl });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handlePDFSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !window.pdfjsLib) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(ev.target.result) }).promise;
      let text = '';
      for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map(item => item.str).join(' ') + '\n';
      }
      const extracted = text.trim().substring(0, 4000);
      if (extracted) setInput(prev => prev ? `${prev}\n\n[PDF]\n${extracted}` : `[PDF]\n${extracted}`);
    };
    reader.readAsArrayBuffer(file);
  };

  const buildClaudeMessages = (history, newText, image) => {
    const past = history.filter((_, i) => i !== 0).slice(-18).map(m => ({ role: m.role, content: m.content }));
    const newContent = image
      ? [
          { type: 'image', source: { type: 'base64', media_type: image.mimeType, data: image.base64 } },
          { type: 'text', text: newText || 'Please analyze this image.' },
        ]
      : newText;
    return [...past, { role: 'user', content: newContent }];
  };

  const handleSend = async (textOverride) => {
    const text = typeof textOverride === 'string' ? textOverride : input.trim();
    const image = pendingImage;
    if ((!text && !image) || isLoading || isOffline) return;

    setInput('');
    setPendingImage(null);
    setMessages(prev => [...prev, {
      role: 'user',
      content: image ? (text || '📷 Image') : text,
      imagePreview: image?.preview,
      timestamp: new Date().toISOString(),
    }]);
    setIsLoading(true);

    try {
      const response = await apiServerClient.fetch('/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: buildClaudeMessages(messages, text, image), system: SYSTEM_PROMPT }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Erreur de connexion');
      }

      const { content } = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content, timestamp: new Date().toISOString() }]);

      const convId = await getOrCreateConversation(text);
      if (convId) {
        await saveMessage(convId, 'user', image ? `[Image] ${text}` : text);
        await saveMessage(convId, 'assistant', content);
      }

      const subject = user?.subjects?.[0] || 'General';
      updateUser({
        stats: {
          ...user.stats,
          questionsSolved: (user.stats?.questionsSolved || 0) + 1,
          bySubject: { ...user.stats?.bySubject, [subject]: (user.stats?.bySubject?.[subject] || 0) + 1 },
        },
      });
      addRecentActivity({
        type: 'question', subject,
        preview: (text || 'Image question').substring(0, 40),
        date: new Date().toISOString(), solved: true,
      });
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: error.message || 'Erreur de connexion. Réessaie.',
        isError: true,
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {isOffline && (
        <div className="bg-slate-100 dark:bg-[#1E293B] text-[#F97316] p-2 text-center text-[12px] shrink-0 rounded-xl mb-2">
          Hors ligne — le Tutor AI nécessite une connexion internet.
        </div>
      )}

      {/* Chat Header */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-3 mb-4 flex items-center gap-3 shrink-0 shadow-sm border border-slate-200 dark:border-[#334155]/50">
        {/* Back button — mobile only */}
        {showBackButton && (
          <button
            onClick={onBack}
            className="w-[36px] h-[36px] rounded-xl flex items-center justify-center text-slate-400 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#334155] transition-colors lg:hidden"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <div className="w-[36px] h-[36px] rounded-xl bg-[#22C55E]/10 flex items-center justify-center shrink-0">
          <Bot size={18} className="text-[#22C55E]" />
        </div>
        <h2 className="text-[14px] font-medium text-slate-900 dark:text-white">AI Tutor</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto mb-4 flex flex-col gap-4 pr-1 pb-4 hide-scrollbar">
        {messages.map((msg, idx) => (
          <div key={idx} className={cn('flex flex-col gap-1 w-full', msg.role === 'user' ? 'items-end' : 'items-start')}>
            {msg.imagePreview && (
              <img src={msg.imagePreview} alt="Attached" className="max-w-[200px] rounded-xl mb-1 border border-slate-200 dark:border-[#334155]" />
            )}
            <div className={cn(
              'max-w-[85%] p-4 rounded-2xl text-[14px] leading-relaxed',
              msg.role === 'user'
                ? 'bg-[#14532D] text-white rounded-br-sm'
                : msg.isError
                  ? 'bg-red-50 dark:bg-[#450a0a] text-red-600 dark:text-[#EF4444] border border-red-200 dark:border-[#7f1d1d] rounded-bl-sm'
                  : 'bg-slate-100 dark:bg-[#1E293B] text-slate-800 dark:text-[#F1F5F9] rounded-bl-sm border border-slate-200 dark:border-[#334155]/50'
            )}>
              {msg.content}
            </div>
            {msg.timestamp && (
              <span className="text-[10px] text-slate-400 dark:text-[#64748B] px-1">
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
                className="bg-white dark:bg-[#1E293B] border border-[#22C55E]/50 text-[#22C55E] rounded-[20px] px-[14px] py-[6px] text-[12px] scale-on-click hover:bg-[#22C55E]/5 transition-colors"
              >
                {getSuggestedQuestion(sub)}
              </button>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="flex w-full justify-start">
            <div className="bg-slate-100 dark:bg-[#1E293B] p-4 rounded-2xl rounded-bl-sm border border-slate-200 dark:border-[#334155]/50 w-[60px] h-[40px] flex items-center justify-center gap-1">
              <span className="w-1.5 h-1.5 bg-[#22C55E] rounded-full animate-pulse" />
              <span className="w-1.5 h-1.5 bg-[#22C55E] rounded-full animate-pulse delay-75" />
              <span className="w-1.5 h-1.5 bg-[#22C55E] rounded-full animate-pulse delay-150" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Pending image preview */}
      {pendingImage && (
        <div className="shrink-0 mb-2 flex items-center gap-2 px-2">
          <div className="relative">
            <img src={pendingImage.preview} alt="Pending" className="h-[60px] w-[60px] object-cover rounded-xl border border-slate-200 dark:border-[#334155]" />
            <button
              onClick={() => setPendingImage(null)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center"
            >
              <X size={10} />
            </button>
          </div>
          <span className="text-[12px] text-slate-500 dark:text-[#64748B]">Image prête à envoyer</span>
        </div>
      )}

      {/* Input Bar */}
      <div className="shrink-0 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155]/50 rounded-2xl p-2 flex items-center gap-2">
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
        <input ref={pdfInputRef} type="file" accept=".pdf" className="hidden" onChange={handlePDFSelect} />

        <button
          onClick={() => imageInputRef.current?.click()}
          disabled={isOffline}
          title="Joindre une image"
          className="w-[40px] h-[40px] rounded-xl flex items-center justify-center text-slate-400 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#334155] transition-colors shrink-0 disabled:opacity-40"
        >
          <ImageIcon size={20} />
        </button>
        <button
          onClick={() => pdfInputRef.current?.click()}
          disabled={isOffline}
          title="Joindre un PDF"
          className="w-[40px] h-[40px] rounded-xl flex items-center justify-center text-slate-400 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#334155] transition-colors shrink-0 disabled:opacity-40"
        >
          <FileText size={20} />
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pose une question..."
          disabled={isLoading || isOffline}
          className="flex-1 bg-transparent border-none outline-none text-[14px] text-slate-900 dark:text-white px-2 placeholder:text-slate-400 dark:placeholder:text-[#64748B] disabled:opacity-50"
        />

        <button
          onClick={() => handleSend()}
          disabled={(!input.trim() && !pendingImage) || isLoading || isOffline}
          className="w-[40px] h-[40px] rounded-xl bg-[#22C55E] flex items-center justify-center shrink-0 disabled:opacity-50 scale-on-click"
        >
          <Send size={18} className="text-[#052e16] ml-0.5" />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Empty state desktop (aucune conversation sélectionnée)
// ─────────────────────────────────────────────────────────────
function DesktopEmptyState({ onNewChat }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
      <div className="w-[72px] h-[72px] rounded-2xl bg-[#22C55E]/10 flex items-center justify-center">
        <Bot size={32} className="text-[#22C55E]" />
      </div>
      <div>
        <p className="text-[16px] font-semibold text-slate-700 dark:text-[#F1F5F9]">AI Tutor PassMark</p>
        <p className="text-[13px] text-slate-400 dark:text-[#64748B] mt-1 max-w-[240px]">
          Sélectionne une conversation ou commence-en une nouvelle
        </p>
      </div>
      <button
        onClick={onNewChat}
        className="flex items-center gap-2 bg-[#22C55E] text-white rounded-xl px-5 py-2.5 text-[13px] font-semibold scale-on-click"
      >
        <Plus size={16} /> Nouvelle conversation
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Page principale
// ─────────────────────────────────────────────────────────────
export default function AITutorPage({ navigate, viewState }) {
  const { user, isLoading: userLoading } = useUser();

  const [view, setView] = useState('list');          // mobile: 'list' | 'chat'
  const [activeConvId, setActiveConvId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [convLoading, setConvLoading] = useState(true);

  useEffect(() => {
    if (user?.id) loadConversations();
  }, [user?.id]);

  useEffect(() => {
    if (viewState?.initialMessage) {
      setActiveConvId(null);
      setView('chat');
    }
  }, [viewState]);

  const loadConversations = async () => {
    setConvLoading(true);
    const { data } = await supabase
      .from('conversations')
      .select('id, title, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    setConversations(data || []);
    setConvLoading(false);
  };

  const openNewChat = () => { setActiveConvId(null); setView('chat'); };
  const openConversation = (convId) => { setActiveConvId(convId); setView('chat'); };
  const handleBack = () => { setView('list'); loadConversations(); navigate('tutor', null); };
  // Après envoi d'un message, recharger la sidebar pour afficher la nouvelle conv
  const refreshConversations = () => { if (user?.id) loadConversations(); };

  if (userLoading) {
    return <div className="animate-pulse h-full bg-slate-200 dark:bg-[#1E293B] rounded-2xl m-4" />;
  }

  const pageHeight = 'h-[calc(100vh-140px)] lg:h-[calc(100vh-64px)]';

  return (
    <div className={cn('flex gap-4 overflow-hidden', pageHeight)}>

      {/* ── Sidebar (desktop toujours visible / mobile: visible si view=list) ── */}
      <div className={cn(
        'flex-col w-full lg:w-[260px] lg:shrink-0',
        'bg-white dark:bg-[#1E293B] rounded-2xl p-3 border border-slate-200 dark:border-[#334155]/50 shadow-sm',
        // mobile: visible seulement sur la vue liste
        view === 'list' ? 'flex' : 'hidden lg:flex',
      )}>
        {/* Header sidebar */}
        <div className="flex items-center gap-2 mb-3 shrink-0">
          <div className="w-[32px] h-[32px] rounded-lg bg-[#22C55E]/10 flex items-center justify-center">
            <Bot size={16} className="text-[#22C55E]" />
          </div>
          <span className="text-[14px] font-semibold text-slate-800 dark:text-[#F1F5F9]">AI Tutor</span>
        </div>

        <ConversationsSidebar
          conversations={conversations}
          activeConvId={activeConvId}
          loading={convLoading}
          onNewChat={openNewChat}
          onSelect={openConversation}
        />
      </div>

      {/* ── Zone chat (desktop toujours visible / mobile: visible si view=chat) ── */}
      <div className={cn(
        'flex-1 min-w-0',
        view === 'chat' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col',
      )}>
        {view === 'chat' || activeConvId !== null ? (
          <ChatView
            key={activeConvId}
            initConvId={activeConvId}
            initialMessage={viewState?.initialMessage}
            onBack={handleBack}
            showBackButton={view === 'chat'}
            user={user}
            onNewConversation={refreshConversations}
          />
        ) : (
          <DesktopEmptyState onNewChat={openNewChat} />
        )}
      </div>

    </div>
  );
}
