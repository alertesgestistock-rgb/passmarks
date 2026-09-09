import { useCallback, useEffect, useRef, useState } from 'react';

// Brique réutilisable pour brancher la dictée vocale sur n'importe quel champ texte de
// l'app (AI Tutor, quiz, etc.) : `<VoiceInputButton onResult={...} />` suffit, cette
// logique ne se réécrit jamais ailleurs. Portée depuis Raconty
// (apps/web/src/hooks/useSpeechToText.js) — même approche, adaptée pour une app
// anglophone uniquement (pas de bascule de langue i18n ici, cf. mémoire
// "passmark-ui-text-english-only").
//
// Web Speech API native du navigateur (SpeechRecognition) : gratuite, aucune clé API,
// aucun appel serveur à nous — c'est le moteur du navigateur (Chrome/Edge envoient l'audio
// à Google en coulisses, Safari a son propre moteur) qui fait la transcription. Couverture
// 2026 : Chrome, Edge, Safari (≥14.1/14.5), Opera. Firefox ne la supporte pas encore
// (masqué proprement : `supported` vaut false, VoiceInputButton ne s'affiche pas).
const SpeechRecognitionImpl = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;

export function useSpeechToText({ onResult, onInterim, onError, lang = 'en-US' } = {}) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const callbacksRef = useRef({ onResult, onInterim, onError });
  callbacksRef.current = { onResult, onInterim, onError };

  const stop = useCallback(() => { recognitionRef.current?.stop(); }, []);

  const start = useCallback(() => {
    if (!SpeechRecognitionImpl || listening) return;
    const recognition = new SpeechRecognitionImpl();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = event => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i];
        if (chunk.isFinal) finalText += chunk[0].transcript;
        else interimText += chunk[0].transcript;
      }
      if (finalText.trim()) callbacksRef.current.onResult?.(finalText.trim());
      if (interimText.trim()) callbacksRef.current.onInterim?.(interimText.trim());
    };
    recognition.onerror = event => { setListening(false); callbacksRef.current.onError?.(event.error); };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    try { recognition.start(); setListening(true); } catch { /* déjà démarrée : ignoré */ }
  }, [lang, listening]);

  const toggle = useCallback(() => { if (listening) stop(); else start(); }, [listening, start, stop]);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  return { supported: !!SpeechRecognitionImpl, listening, start, stop, toggle };
}
