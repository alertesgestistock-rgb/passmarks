import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Image as ImageIcon, FileText, GraduationCap,
  X, ArrowLeft, Plus, MessageSquare, Pencil, Check, PanelLeftClose, PanelLeftOpen,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';
import { InsufficientTokensError } from '@/lib/apiServerClient';
import InsufficientTokensAlert from '@/components/InsufficientTokensAlert';
import TokenShopModal from '@/components/TokenShopModal';
import { downloadMessageAsPDF } from '@/lib/generatePDF';
import pdfjsLib from '@/lib/pdfjs';


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
  const isSameDay = date.toDateString() === now.toDateString();
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isSameDay) return `Today · ${time}`;
  if (isYesterday) return `Yesterday · ${time}`;
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ─────────────────────────────────────────────────────────────
// Markdown renderer (léger, sans dépendance)
// ─────────────────────────────────────────────────────────────
function MarkdownText({ content, streaming }) {
  const lines = content.split('\n');
  const elements = [];
  let i = 0;

  const renderInline = (text) => {
    const parts = [];
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
    let last = 0, m;
    while ((m = regex.exec(text)) !== null) {
      if (m.index > last) parts.push(text.slice(last, m.index));
      if (m[2]) parts.push(<strong key={m.index}>{m[2]}</strong>);
      else if (m[3]) parts.push(<em key={m.index}>{m[3]}</em>);
      else if (m[4]) parts.push(<code key={m.index} className="bg-slate-200 dark:bg-[#0F172A] px-1 py-0.5 rounded text-[12px] font-mono">{m[4]}</code>);
      last = m.index + m[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
  };

  while (i < lines.length) {
    const line = lines[i];
    if (/^#{1,3}\s/.test(line)) {
      elements.push(<p key={i} className="font-bold text-[15px] mt-2 mb-0.5">{renderInline(line.replace(/^#+\s/, ''))}</p>);
    } else if (/^[-*]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(<li key={i}>{renderInline(lines[i].replace(/^[-*]\s/, ''))}</li>);
        i++;
      }
      elements.push(<ul key={`ul-${i}`} className="list-disc pl-4 space-y-0.5">{items}</ul>);
      continue;
    } else if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(<li key={i}>{renderInline(lines[i].replace(/^\d+\.\s/, ''))}</li>);
        i++;
      }
      elements.push(<ol key={`ol-${i}`} className="list-decimal pl-4 space-y-0.5">{items}</ol>);
      continue;
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(<p key={i}>{renderInline(line)}</p>);
    }
    i++;
  }

  return (
    <div className="space-y-0.5 text-[14px] leading-relaxed">
      {elements}
      {streaming && <span className="inline-block w-[2px] h-[14px] bg-slate-500 dark:bg-slate-400 animate-pulse ml-0.5 align-middle rounded-full" />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Chat View
// ─────────────────────────────────────────────────────────────
function ChatView({ initConvId, initialMessage, initialPdfUrl, initialPdfName, onBack, user, showBackButton, onConversationCreated }) {
  const { updateUser, addRecentActivity, updateTokenBalance } = useUser();

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const [pendingPdf, setPendingPdf] = useState(null); // { name, text }
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [conversationId, setConversationId] = useState(initConvId || null);
  const [messages, setMessages] = useState([buildWelcome(user)]);
  const [noTokens, setNoTokens] = useState(false);
  const [showTokenShop, setShowTokenShop] = useState(false);

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

    // Show cached messages instantly
    const cacheKey = `pm_msgs_${initConvId}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setMessages([buildWelcome(user), ...JSON.parse(cached)]);
      }
    } catch {}

    // Refresh from DB in background
    supabase
      .from('messages')
      .select('role, content, created_at')
      .eq('conversation_id', initConvId)
      .order('created_at', { ascending: true })
      .then(({ data: msgs }) => {
        if (msgs && msgs.length > 0) {
          const mapped = msgs.map(m => ({ role: m.role, content: m.content, timestamp: m.created_at }));
          setMessages([buildWelcome(user), ...mapped]);
          try { localStorage.setItem(cacheKey, JSON.stringify(mapped)); } catch {}
        }
      });
  }, [initConvId]);

  useEffect(() => {
    if (initialMessage && !initialPdfUrl) handleSend(initialMessage);
  }, []);

  // Charge automatiquement un PDF depuis une URL (bouton "Ask AI" des Past Papers)
  useEffect(() => {
    if (!initialPdfUrl || !initialPdfName) return;
    setPdfLoading(true);
    setPdfProgress(0);
    (async () => {
      try {
        setPdfProgress(10);
        const res = await fetch(initialPdfUrl);
        const buffer = await res.arrayBuffer();
        setPdfProgress(40);
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
        const totalPages = pdf.numPages;
        setPdfProgress(60);

        let text = '';
        for (let i = 1; i <= totalPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map(item => item.str).join(' ') + '\n';
        }
        const extracted = text.trim().substring(0, 30000);

        let pdfData;
        if (extracted.length > 50) {
          pdfData = { name: initialPdfName, text: extracted, images: null, pageCount: totalPages };
        } else {
          const pageCount = Math.min(totalPages, 4);
          const images = [];
          for (let i = 1; i <= pageCount; i++) {
            const page = await pdf.getPage(i);
            const b64 = await renderPageToBase64(page);
            images.push(b64);
            setPdfProgress(60 + Math.round((i / pageCount) * 40));
          }
          pdfData = { name: initialPdfName, text: null, images, pageCount: totalPages };
        }
        setPdfProgress(100);
        setPendingPdf(pdfData);
        if (initialMessage) handleSend(initialMessage, pdfData);
      } catch {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Could not load the paper. Please try again.', isError: true, timestamp: new Date().toISOString() }]);
      } finally {
        setPdfLoading(false);
        setPdfProgress(0);
      }
    })();
  }, []);

  const getOrCreateConversation = async (firstText, onCreated) => {
    if (conversationId) return conversationId;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const title = (firstText || 'Conversation').substring(0, 60);
    const { data: conv } = await supabase
      .from('conversations')
      .insert({ user_id: session.user.id, title })
      .select('id')
      .single();
    if (conv) {
      setConversationId(conv.id);
      if (onCreated) onCreated({ id: conv.id, title, updated_at: new Date().toISOString() });
      return conv.id;
    }
    return null;
  };

  const saveMessage = async (convId, role, content) => {
    if (!convId) return;
    await supabase.from('messages').insert({ conversation_id: convId, role, content, content_type: 'text' });
    // Update local cache immediately
    try {
      const cacheKey = `pm_msgs_${convId}`;
      const cached = localStorage.getItem(cacheKey);
      const msgs = cached ? JSON.parse(cached) : [];
      msgs.push({ role, content, timestamp: new Date().toISOString() });
      localStorage.setItem(cacheKey, JSON.stringify(msgs));
    } catch {}
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

  const renderPageToBase64 = async (page) => {
    // scale 2.0 for scanned PDFs — Claude needs high-res to read math formulas
    // quality 0.8 = ~150-250KB/page × 4 pages ≈ ~800KB, well within Supabase EF limits
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
  };

  const handlePDFSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (file.size > 15 * 1024 * 1024) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'PDF too large (max 15 MB).', isError: true, timestamp: new Date().toISOString() }]);
      return;
    }
    setPdfLoading(true);
    setPdfProgress(0);
    setPendingPdf(null);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        setPdfProgress(20);
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(ev.target.result) }).promise;
        const totalPages = pdf.numPages;
        setPdfProgress(40);

        if (totalPages > 10) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `This PDF has ${totalPages} pages — too long to analyze completely.\n\nPassMark can only solve PDFs of **10 pages or less** (GCE past papers are usually 2–6 pages).\n\n**What to do:**\n- If you want help with specific questions, take a **screenshot** of those pages and send it as an image 📷\n- Or upload only the relevant section of your PDF`,
            isError: false,
            timestamp: new Date().toISOString(),
          }]);
          setPdfLoading(false);
          setPdfProgress(0);
          return;
        }

        let text = '';
        for (let i = 1; i <= totalPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map(item => item.str).join(' ') + '\n';
        }
        const extracted = text.trim().substring(0, 30000);

        if (extracted.length > 50) {
          setPdfProgress(100);
          setPendingPdf({ name: file.name, text: extracted, images: null, pageCount: totalPages });
        } else {
          const pageCount = Math.min(totalPages, 4);
          const images = [];
          for (let i = 1; i <= pageCount; i++) {
            const page = await pdf.getPage(i);
            const b64 = await renderPageToBase64(page);
            images.push(b64);
            setPdfProgress(40 + Math.round((i / pageCount) * 60));
          }
          setPendingPdf({ name: file.name, text: null, images, pageCount: totalPages });
        }
      } catch (err) {
        const detail = err?.message || err?.name || String(err) || 'unknown';
        setMessages(prev => [...prev, { role: 'assistant', content: `Error reading PDF: ${detail}`, isError: true, timestamp: new Date().toISOString() }]);
      } finally {
        setPdfLoading(false);
        setPdfProgress(0);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const buildClaudeMessages = (history, newText, image, pdf) => {
    const past = history.filter((_, i) => i !== 0).slice(-18).map(m => ({ role: m.role, content: m.content }));
    let newContent;
    if (pdf?.images) {
      // PDF scanné : envoyer les pages comme images
      newContent = [
        ...pdf.images.map(b64 => ({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } })),
        { type: 'text', text: newText || `Analyze this PDF (${pdf.name}) and explain its content.` },
      ];
    } else if (image) {
      newContent = [
        { type: 'image', source: { type: 'base64', media_type: image.mimeType, data: image.base64 } },
        { type: 'text', text: newText || 'Please analyze this image.' },
      ];
    } else {
      newContent = newText;
    }
    return [...past, { role: 'user', content: newContent }];
  };

  const handleSend = async (textOverride, pdfOverride) => {
    const rawText = typeof textOverride === 'string' ? textOverride : input.trim();
    const image = pendingImage;
    const pdf = pdfOverride !== undefined ? pdfOverride : pendingPdf;
    const pdfHeader = pdf?.text
      ? `[PDF: ${pdf.name} — ${pdf.pageCount} page(s)${pdf.truncated ? ', text truncated at 30 000 chars' : ', complete'}]\n`
      : null;
    const text = pdf?.text ? (rawText ? `${rawText}\n\n${pdfHeader}${pdf.text}` : `${pdfHeader}${pdf.text}`) : rawText;
    if ((!text && !image && !pdf?.images) || isLoading || isOffline) return;
    setNoTokens(false);
    setInput('');
    setPendingImage(null);
    setPendingPdf(null);
    setMessages(prev => [...prev, {
      role: 'user',
      content: image ? (rawText || '📷 Image') : pdf ? (rawText || `📄 ${pdf.name}`) : rawText,
      imagePreview: image?.preview,
      pdfName: pdf?.name,
      timestamp: new Date().toISOString(),
    }]);
    setIsLoading(true);

    // Abort après 140 secondes — EF Supabase supporte jusqu'à 150s
    const abortCtrl = new AbortController();
    const abortTimer = setTimeout(() => abortCtrl.abort(), 140000);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const chatUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ messages: buildClaudeMessages(messages, text, image, pdf) }),
        signal: abortCtrl.signal,
      });

      clearTimeout(abortTimer);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        if (response.status === 402) throw new InsufficientTokensError(err.balance ?? 0);
        if (response.status === 401) throw new Error('Session expired. Please refresh the page.');
        if (response.status === 429) throw new Error('Too many requests. Please wait a moment and try again.');
        if (response.status >= 500) throw new Error('Server error. Please try again in a few seconds.');
        throw new Error(err.error || 'Connection error. Please try again.');
      }

      // ── Lecture du stream SSE ──────────────────────────────
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullContent = '';
      let streamingStarted = false;
      const msgTimestamp = new Date().toISOString();

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split('\n')) {
            const clean = line.trim();
            if (!clean || clean === 'data: [DONE]') continue;
            if (!clean.startsWith('data: ')) continue;
            try {
              const json = JSON.parse(clean.slice(6));
              // Événement de solde envoyé après déduction réussie
              if (typeof json.b === 'number') { updateTokenBalance(json.b); continue; }
              // Événement d'erreur envoyé par l'EF (ex: timeout OpenRouter)
              if (json.error) throw new Error(json.error);
              const token = json.choices?.[0]?.delta?.content || '';
              if (!token) continue;
              fullContent += token;

              if (!streamingStarted) {
                streamingStarted = true;
                setIsLoading(false);
                setMessages(prev => [...prev, {
                  role: 'assistant',
                  content: fullContent,
                  isStreaming: true,
                  timestamp: msgTimestamp,
                }]);
              } else {
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullContent };
                  return updated;
                });
              }
            } catch { /* chunk partiel — ignoré */ }
          }
        }

        // Stream terminé — retirer le curseur
        setMessages(prev => {
          const updated = [...prev];
          if (updated[updated.length - 1]?.isStreaming) {
            updated[updated.length - 1] = { ...updated[updated.length - 1], isStreaming: false };
          }
          return updated;
        });

      } catch (streamErr) {
        // Nettoyer le message partiel si le stream échoue en cours de route
        setMessages(prev => {
          const updated = [...prev];
          if (updated[updated.length - 1]?.isStreaming) {
            if (fullContent.length > 0) {
              // Garder le contenu partiel mais retirer le curseur
              updated[updated.length - 1] = { ...updated[updated.length - 1], isStreaming: false };
            } else {
              // Aucun contenu reçu — supprimer le message vide
              updated.pop();
            }
          }
          return updated;
        });
        throw streamErr;
      }

      // Sauvegarde en DB
      const convId = await getOrCreateConversation(text, onConversationCreated);
      if (convId && fullContent) {
        await saveMessage(convId, 'user', image ? `[Image] ${text}` : text);
        await saveMessage(convId, 'assistant', fullContent);
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
      clearTimeout(abortTimer);
      if (error instanceof InsufficientTokensError) {
        setNoTokens(true);
        updateTokenBalance(error.balance);
      } else {
        const msg = error.name === 'AbortError'
          ? 'Request timed out (55s). The AI may be overloaded — please try again.'
          : (error.message || 'Connection error. Please try again.');
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: msg,
          isError: true,
          timestamp: new Date().toISOString(),
        }]);
      }
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
          You're offline — AI Tutor requires an internet connection.
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
          <GraduationCap size={18} className="text-[#22C55E]" />
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
            {msg.pdfName && (
              <div className="flex items-center gap-1.5 bg-[#14532D]/80 rounded-lg px-2.5 py-1.5 mb-1">
                <FileText size={12} className="text-[#86efac] shrink-0" />
                <span className="text-[11px] text-[#86efac] truncate max-w-[160px]">{msg.pdfName}</span>
              </div>
            )}
            <div
              data-ai-message={idx}
              className={cn(
                'max-w-[85%] p-4 rounded-2xl leading-relaxed',
                msg.role === 'user'
                  ? 'bg-[#14532D] text-white rounded-br-sm text-[14px]'
                  : msg.isError
                    ? 'bg-red-50 dark:bg-[#450a0a] text-red-600 dark:text-[#EF4444] border border-red-200 dark:border-[#7f1d1d] rounded-bl-sm text-[14px]'
                    : 'bg-slate-100 dark:bg-[#1E293B] text-slate-800 dark:text-[#F1F5F9] rounded-bl-sm border border-slate-200 dark:border-[#334155]/50'
              )}>
              {msg.role === 'assistant' && !msg.isError
                ? <MarkdownText content={msg.content} streaming={msg.isStreaming} />
                : msg.content}
            </div>
            <div className="flex items-center gap-2 px-1">
              {msg.timestamp && (
                <span className="text-[10px] text-slate-400 dark:text-[#64748B]">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {msg.role === 'assistant' && !msg.isError && !msg.isStreaming && (
                <button
                  onClick={() => {
                    const el = document.querySelector(`[data-ai-message="${idx}"]`);
                    if (el) downloadMessageAsPDF(el, `passmark-solution-${idx}.pdf`);
                  }}
                  title="Download as PDF"
                  className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <Download size={11} />
                  <span>PDF</span>
                </button>
              )}
            </div>
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

      {(pendingImage || pendingPdf || pdfLoading) && (
        <div className="shrink-0 mb-2 flex items-center gap-2 px-2 flex-wrap">
          {pendingImage && (
            <div className="relative">
              <img src={pendingImage.preview} alt="Pending" className="h-[56px] w-[56px] object-cover rounded-xl border border-slate-200 dark:border-[#334155]" />
              <button onClick={() => setPendingImage(null)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center">
                <X size={10} />
              </button>
            </div>
          )}
          {pendingPdf && (
            <div className="flex items-center gap-2 bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-xl px-3 py-2 max-w-[260px]">
              <FileText size={14} className="text-[#22C55E] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-[#22C55E] font-medium truncate">{pendingPdf.name}</p>
                <p className="text-[10px] text-[#22C55E]/70">
                  {pendingPdf.images
                    ? `${pendingPdf.images.length}/${pendingPdf.pageCount} page(s) · scanned`
                    : `${pendingPdf.pageCount} page(s) · text extracted`}
                </p>
              </div>
              <button onClick={() => setPendingPdf(null)} className="shrink-0 text-[#22C55E]/60 hover:text-[#22C55E]">
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      )}

      {noTokens && (
        <InsufficientTokensAlert onBuyTokens={() => setShowTokenShop(true)} />
      )}
      {showTokenShop && <TokenShopModal onClose={() => setShowTokenShop(false)} />}

      {/* PDF progress bar — just above input */}
      {pdfLoading && (
        <div className="shrink-0 mb-2 px-1">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[11px] text-slate-400 dark:text-[#64748B]">Processing PDF</span>
            <span className="text-[12px] font-semibold text-[#22C55E]">{pdfProgress}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-200 dark:bg-[#334155] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#22C55E] rounded-full transition-all duration-300"
              style={{ width: `${pdfProgress}%` }}
            />
          </div>
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
          placeholder="Ask a question..."
          disabled={isLoading || isOffline}
          className="flex-1 bg-transparent border-none outline-none text-[14px] text-slate-900 dark:text-white px-2 placeholder:text-slate-400 dark:placeholder:text-[#64748B] disabled:opacity-50"
        />
        <button
          onClick={() => handleSend()}
          disabled={(!input.trim() && !pendingImage && !pendingPdf) || isLoading || isOffline || pdfLoading || noTokens}
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
        <GraduationCap size={32} className="text-[#22C55E]" />
      </div>
      <div>
        <p className="text-[16px] font-semibold text-slate-700 dark:text-[#F1F5F9]">AI Tutor PassMark</p>
        <p className="text-[13px] text-slate-400 dark:text-[#64748B] mt-1 max-w-[240px]">
          Select a conversation or start a new one
        </p>
      </div>
      <button onClick={onNewChat} className="flex items-center gap-2 bg-[#22C55E] text-white rounded-xl px-5 py-2.5 text-[13px] font-semibold scale-on-click">
        <Plus size={16} /> New conversation
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
  // PDF props from "Ask AI" — consumed once then cleared so other conversations don't inherit them
  const [pdfInitState, setPdfInitState] = useState({
    initialMessage: viewState?.initialMessage,
    initialPdfUrl: viewState?.initialPdfUrl,
    initialPdfName: viewState?.initialPdfName,
  });
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
    if (viewState?.initialMessage || viewState?.initialPdfUrl) {
      setPdfInitState({
        initialMessage: viewState.initialMessage,
        initialPdfUrl: viewState.initialPdfUrl,
        initialPdfName: viewState.initialPdfName,
      });
      setActiveConvId(null);
      setView('chat');
    }
  }, [viewState]);

  const CONV_CACHE_KEY = `pm_convs_${user?.id}`;

  const loadConversations = async () => {
    // Show cached list instantly — no spinner if cache exists
    try {
      const cached = localStorage.getItem(CONV_CACHE_KEY);
      if (cached) {
        setConversations(JSON.parse(cached));
        setConvLoading(false);
      } else {
        setConvLoading(true);
      }
    } catch {
      setConvLoading(true);
    }

    // Refresh from DB in background
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, title, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (!error && data) {
        setConversations(data);
        try { localStorage.setItem(CONV_CACHE_KEY, JSON.stringify(data)); } catch {}
      }
    } catch {
      // keep cached data on error
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

  const openNewChat = () => { setPdfInitState({}); setActiveConvId(null); setView('chat'); };
  const openConversation = (convId) => { setPdfInitState({}); setActiveConvId(convId); setView('chat'); };
  const handleBack = () => { setView('list'); loadConversations(); navigate('tutor', null); };

  if (userLoading) return <div className="animate-pulse h-full bg-slate-200 dark:bg-[#1E293B] rounded-2xl m-4" />;

  // ── Sidebar content (réutilisé mobile + desktop) ──────────
  const sidebarContent = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo + titre + bouton collapse */}
      <div className="flex items-center gap-2 px-3 pt-4 pb-3 shrink-0">
        <div className="w-[28px] h-[28px] rounded-lg bg-[#22C55E]/10 flex items-center justify-center shrink-0">
          <GraduationCap size={14} className="text-[#22C55E]" />
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
          <Plus size={15} /> New conversation
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
            <p className="text-[12px] text-slate-400 dark:text-[#64748B]">No conversations</p>
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
          title="Show conversations"
          className="hidden lg:flex fixed top-[76px] left-[228px] xl:left-[268px] z-40 w-[32px] h-[32px] items-center justify-center rounded-lg bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] text-slate-500 dark:text-[#94A3B8] hover:text-[#22C55E] shadow-sm transition-colors"
        >
          <PanelLeftOpen size={15} />
        </button>
      )}

      {/* ── Mobile : vue liste (plein écran) ──────────────── */}
      {view === 'list' && (
        <div className="lg:hidden h-[calc(100vh-160px)] md:h-[calc(100vh-168px)] flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 mb-5 shrink-0">
            <div className="w-[44px] h-[44px] rounded-xl bg-[#22C55E]/10 flex items-center justify-center shrink-0">
              <GraduationCap size={22} className="text-[#22C55E]" />
            </div>
            <div>
              <h1 className="text-[20px] font-bold text-slate-900 dark:text-white leading-tight">AI Tutor</h1>
              <p className="text-[12px] text-slate-400 dark:text-[#64748B]">
                {conversations.length > 0 ? `${conversations.length} conversation${conversations.length > 1 ? 's' : ''}` : 'No conversations yet'}
              </p>
            </div>
          </div>
          <button onClick={openNewChat} className="w-full bg-[#22C55E] text-white rounded-2xl p-4 flex items-center justify-center gap-2 font-semibold text-[15px] mb-4 shrink-0 scale-on-click">
            <Plus size={20} /> New conversation
          </button>
          {convLoading ? (
            <div className="flex flex-col gap-3 shrink-0">{[1,2,3].map(i => <div key={i} className="h-[70px] rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155]/50 animate-pulse" />)}</div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-16">
              <MessageSquare size={28} className="text-slate-300 dark:text-[#475569] mx-auto mb-3" />
              <p className="text-[14px] font-medium text-slate-400 dark:text-[#64748B]">No conversations</p>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar flex flex-col gap-2 pb-4">
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
            initialMessage={pdfInitState.initialMessage}
            initialPdfUrl={pdfInitState.initialPdfUrl}
            initialPdfName={pdfInitState.initialPdfName}
            onBack={handleBack}
            showBackButton={view === 'chat'}
            user={user}
            onConversationCreated={(newConv) => {
              setConversations(prev => [newConv, ...prev]);
              try {
                const key = `pm_convs_${user?.id}`;
                const cached = localStorage.getItem(key);
                const list = cached ? JSON.parse(cached) : [];
                localStorage.setItem(key, JSON.stringify([newConv, ...list]));
              } catch {}
            }}
          />
        ) : (
          <DesktopEmptyState onNewChat={openNewChat} />
        )}
      </div>
    </>
  );
}
