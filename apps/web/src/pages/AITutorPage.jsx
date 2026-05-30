import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Image as ImageIcon, FileText, Bot,
  X, ArrowLeft, Plus, MessageSquare, Pencil, Check, PanelLeftClose, PanelLeftOpen,
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
    if (file.size > 15 * 1024 * 1024) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'PDF trop volumineux (max 15 MB).', isError: true, timestamp: new Date().toISOString() }]);
      return;
    }
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
        <div className="bg-slate-100 dark:bg-[#1E293B] text-[#F97316] p-2 text-center text-[12px] shrink-0 rounded-xl mb-3">
          Hors ligne — le Tutor AI nécessite une connexion internet.
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-3 mb-4 flex items-center gap-3 shrink-0 shadow-sm border border-slate-200 dark:border-[#334155]/50">
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

      {pendingImage && (
        <div className="shrink-0 mb-2 flex items-center gap-2 px-2">
          <div className="relative">
            <img src={pendingImage.preview} alt="Pending" className="h-[60px] w-[60px] object-cover rounded-xl border border-slate-200 dark:border-[#334155]" />
            <button onClick={() => setPendingImage(null)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center">
              <X size={10} />
            </button>
          </div>
          <span className="text-[12px] text-slate-500 dark:text-[#64748B]">Image prête à envoyer</span>
        </div>
      )}

      {/* Input Bar */}
      <div className="shrink-0 sticky bottom-0 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155]/50 rounded-2xl p-2 flex items-center gap-2">
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
        <input ref={pdfInputRef} type="file" accept=".pdf" className="hidden" onChange={handlePDFSelect} />
        <button onClick={() => imageInputRef.current?.click()} disabled={isOffline} title="Joindre une image"
          className="w-[40px] h-[40px] rounded-xl flex items-center justify-center text-slate-400 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#334155] transition-colors shrink-0 disabled:opacity-40">
          <ImageIcon size={20} />
        </button>
        <button onClick={() => pdfInputRef.current?.click()} disabled={isOffline} title="Joindre un PDF"
          className="w-[40px] h-[40px] rounded-xl flex items-center justify-center text-slate-400 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#334155] transition-colors shrink-0 disabled:opacity-40">
          <FileText size={20} />
        </button>
        <input
          type="text" value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pose une question..."
          disabled={isLoading || isOffline}
          className="flex-1 bg-transparent border-none outline-none text-[14px] text-slate-900 dark:text-white px-2 placeholder:text-slate-400 dark:placeholder:text-[#64748B] disabled:opacity-50"
        />
        <button
          onClick={() => handleSend()}
          disabled={(!input.trim() && !pendingImage) || isLoading || isOffline}
          className="w-[40px] h-[40px] rounded-xl bg-[#22C55E] flex items-center justify-center shrink-0 disabled:opacity-50 scale-on-click">
          <Send size={18} className="text-[#052e16] ml-0.5" />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Empty state desktop
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
      <button onClick={onNewChat} className="flex items-center gap-2 bg-[#22C55E] text-white rounded-xl px-5 py-2.5 text-[13px] font-semibold scale-on-click">
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

  const [view, setView] = useState('list');
  const [activeConvId, setActiveConvId] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [convLoading, setConvLoading] = useState(false);
  const [editingConvId, setEditingConvId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem('tutor_sidebar') !== 'closed'; } catch { return true; }
  });

  const toggleSidebar = () => {
    setSidebarOpen(prev => {
      const next = !prev;
      try { localStorage.setItem('tutor_sidebar', next ? 'open' : 'closed'); } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (user?.id) {
      loadConversations();
    }
  }, [user?.id]);

  useEffect(() => {
    if (viewState?.initialMessage) { setActiveConvId(null); setView('chat'); }
  }, [viewState]);

  const loadConversations = async () => {
    setConvLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, title, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .abortSignal(controller.signal);
      clearTimeout(timer);
      if (!error) setConversations(data || []);
    } catch {
      // show empty list on error or timeout
    } finally {
      setConvLoading(false);
    }
  };

  const startRename = (e, conv) => {
    e.stopPropagation();
    setEditingConvId(conv.id);
    setEditingTitle(conv.title || '');
  };

  const saveRename = async (convId) => {
    const trimmed = editingTitle.trim();
    if (trimmed) {
      await supabase.from('conversations').update({ title: trimmed }).eq('id', convId);
      setConversations(prev => prev.map(c => c.id === convId ? { ...c, title: trimmed } : c));
    }
    setEditingConvId(null);
  };

  const openNewChat = () => { setActiveConvId(null); setView('chat'); };
  const openConversation = (convId) => { setActiveConvId(convId); setView('chat'); };
  const handleBack = () => { setView('list'); loadConversations(); navigate('tutor', null); };

  if (userLoading) return <div className="animate-pulse h-full bg-slate-200 dark:bg-[#1E293B] rounded-2xl m-4" />;

  // ── Sidebar content (réutilisé mobile + desktop) ──────────
  const sidebarContent = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo + titre + bouton collapse */}
      <div className="flex items-center gap-2 px-3 pt-4 pb-3 shrink-0">
        <div className="w-[28px] h-[28px] rounded-lg bg-[#22C55E]/10 flex items-center justify-center shrink-0">
          <Bot size={14} className="text-[#22C55E]" />
        </div>
        <span className="text-[13px] font-semibold text-slate-800 dark:text-[#F1F5F9] flex-1">AI Tutor</span>
        <button
          onClick={toggleSidebar}
          title="Réduire"
          className="w-[28px] h-[28px] rounded-lg flex items-center justify-center text-slate-400 dark:text-[#64748B] hover:bg-slate-100 dark:hover:bg-[#334155] transition-colors shrink-0"
        >
          <PanelLeftClose size={15} />
        </button>
      </div>

      {/* Bouton nouvelle conversation */}
      <div className="px-3 mb-3 shrink-0">
        <button
          onClick={openNewChat}
          className="w-full flex items-center justify-center gap-2 bg-[#22C55E] hover:bg-[#16a34a] text-white rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-colors scale-on-click"
        >
          <Plus size={15} /> Nouvelle conversation
        </button>
      </div>

      {/* Séparateur */}
      <div className="border-t border-slate-100 dark:border-[#334155] mx-3 mb-3 shrink-0" />

      {/* Liste conversations */}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-4 hide-scrollbar flex flex-col gap-0.5">
        {convLoading ? (
          [1, 2, 3, 4].map(i => <div key={i} className="h-[54px] rounded-xl bg-slate-100 dark:bg-[#1E293B] animate-pulse mb-1" />)
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 px-3">
            <MessageSquare size={22} className="text-slate-300 dark:text-[#475569] mx-auto mb-2" />
            <p className="text-[12px] text-slate-400 dark:text-[#64748B]">Aucune conversation</p>
          </div>
        ) : (
          conversations.map(conv => (
            <div
              key={conv.id}
              className={cn(
                'w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all group',
                activeConvId === conv.id
                  ? 'bg-[#22C55E]/10'
                  : 'hover:bg-slate-100 dark:hover:bg-[#1E293B]'
              )}
            >
              <button onClick={() => openConversation(conv.id)} className="flex items-start gap-2.5 flex-1 min-w-0">
                <MessageSquare size={14} className={cn('shrink-0 mt-0.5', activeConvId === conv.id ? 'text-[#22C55E]' : 'text-slate-400 dark:text-[#64748B]')} />
                <div className="flex-1 min-w-0">
                  {editingConvId === conv.id ? (
                    <input
                      autoFocus
                      value={editingTitle}
                      onChange={e => setEditingTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveRename(conv.id); if (e.key === 'Escape') setEditingConvId(null); }}
                      onClick={e => e.stopPropagation()}
                      className="w-full bg-white dark:bg-[#0F172A] border border-[#22C55E]/50 rounded px-1.5 py-0.5 text-[13px] text-slate-800 dark:text-[#F1F5F9] outline-none"
                    />
                  ) : (
                    <p className={cn('text-[13px] truncate leading-tight font-medium',
                      activeConvId === conv.id ? 'text-[#22C55E]' : 'text-slate-700 dark:text-[#CBD5E1]'
                    )}>
                      {conv.title || 'Conversation'}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-400 dark:text-[#475569] mt-0.5">
                    {formatRelativeDate(conv.updated_at)}
                  </p>
                </div>
              </button>
              {editingConvId === conv.id ? (
                <button onClick={() => saveRename(conv.id)} className="shrink-0 text-[#22C55E] hover:opacity-80 mt-0.5">
                  <Check size={13} />
                </button>
              ) : (
                <button onClick={e => startRename(e, conv)} className="shrink-0 text-slate-300 dark:text-[#475569] hover:text-slate-500 dark:hover:text-[#94A3B8] opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                  <Pencil size={12} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ── Sidebar fixe desktop ────────────────────────────── */}
      <div className={cn(
        'hidden lg:block fixed top-[64px] bottom-0 left-[220px] xl:left-[260px] bg-white dark:bg-[#1E293B] border-r-2 border-slate-200 dark:border-[#334155] z-40 transition-all duration-200',
        sidebarOpen ? 'w-[260px]' : 'w-0 overflow-hidden border-r-0'
      )}>
        {sidebarContent}
      </div>

      {/* ── Bouton rouvrir sidebar (quand fermée) ────────────── */}
      {!sidebarOpen && (
        <button
          onClick={toggleSidebar}
          title="Afficher les conversations"
          className="hidden lg:flex fixed top-[76px] left-[228px] xl:left-[268px] z-40 w-[32px] h-[32px] items-center justify-center rounded-lg bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] text-slate-500 dark:text-[#94A3B8] hover:text-[#22C55E] shadow-sm transition-colors"
        >
          <PanelLeftOpen size={15} />
        </button>
      )}

      {/* ── Mobile : vue liste (plein écran) ──────────────── */}
      {view === 'list' && (
        <div className="lg:hidden h-[calc(100vh-160px)] md:h-[calc(100vh-168px)] overflow-hidden">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-[44px] h-[44px] rounded-xl bg-[#22C55E]/10 flex items-center justify-center shrink-0">
              <Bot size={22} className="text-[#22C55E]" />
            </div>
            <div>
              <h1 className="text-[20px] font-bold text-slate-900 dark:text-white leading-tight">AI Tutor</h1>
              <p className="text-[12px] text-slate-400 dark:text-[#64748B]">
                {conversations.length > 0 ? `${conversations.length} conversation${conversations.length > 1 ? 's' : ''}` : 'Aucune conversation'}
              </p>
            </div>
          </div>
          <button onClick={openNewChat} className="w-full bg-[#22C55E] text-white rounded-2xl p-4 flex items-center justify-center gap-2 font-semibold text-[15px] mb-4 scale-on-click">
            <Plus size={20} /> Nouvelle conversation
          </button>
          {convLoading ? (
            <div className="flex flex-col gap-3">{[1,2,3].map(i => <div key={i} className="h-[70px] rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155]/50 animate-pulse" />)}</div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-16">
              <MessageSquare size={28} className="text-slate-300 dark:text-[#475569] mx-auto mb-3" />
              <p className="text-[14px] font-medium text-slate-400 dark:text-[#64748B]">Aucune conversation</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto hide-scrollbar">
              {conversations.map(conv => (
                <button key={conv.id} onClick={() => openConversation(conv.id)}
                  className="bg-white dark:bg-[#1E293B] rounded-2xl p-4 flex items-center gap-3 text-left border border-slate-200 dark:border-[#334155]/50 hover:border-[#22C55E]/40 transition-all scale-on-click w-full">
                  <div className="w-[40px] h-[40px] rounded-xl bg-[#22C55E]/10 flex items-center justify-center shrink-0">
                    <MessageSquare size={17} className="text-[#22C55E]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-slate-800 dark:text-[#F1F5F9] truncate">{conv.title || 'Conversation'}</p>
                    <p className="text-[12px] text-slate-400 dark:text-[#64748B] mt-0.5">{formatRelativeDate(conv.updated_at)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Zone chat ─────────────────────────────────────────
          Desktop : toujours visible, décalée de 260px (sidebar).
          Mobile  : visible seulement en mode 'chat'.
      ────────────────────────────────────────────────────── */}
      <div className={cn(
        'h-[calc(100vh-160px)] md:h-[calc(100vh-168px)] lg:h-[calc(100vh-128px)]',
        'overflow-hidden transition-all duration-200',
        sidebarOpen ? 'lg:ml-[244px]' : 'lg:ml-0',
        view === 'chat' ? 'block' : 'hidden lg:block',
      )}>
        {view === 'chat' || activeConvId !== null ? (
          <ChatView
            key={activeConvId}
            initConvId={activeConvId}
            initialMessage={viewState?.initialMessage}
            onBack={handleBack}
            showBackButton={view === 'chat'}
            user={user}
          />
        ) : (
          <DesktopEmptyState onNewChat={openNewChat} />
        )}
      </div>
    </>
  );
}
