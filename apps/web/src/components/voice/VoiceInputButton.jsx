import React from 'react';
import { Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { cn } from '@/lib/utils';

// Bouton micro réutilisable : `<VoiceInputButton onResult={text => ...} />` suffit pour
// brancher la dictée vocale sur n'importe quel champ texte de l'app (AI Tutor, quiz...).
// Ne s'affiche pas si le navigateur ne supporte pas la reconnaissance vocale (Firefox
// notamment) — pas de bouton mort, pas de message d'erreur inutile pour cette minorité
// de navigateurs. Portée depuis Raconty (components/voice/VoiceInputButton.jsx), stylée
// ici pour matcher les boutons d'icône déjà présents dans la barre de saisie d'AITutorPage
// au lieu du composant shadcn <Button> utilisé côté Raconty.
export default function VoiceInputButton({ onResult, onInterim, className, disabled = false }) {
  const { supported, listening, toggle } = useSpeechToText({
    onResult,
    onInterim,
    onError: error => { if (error !== 'no-speech' && error !== 'aborted') toast.error('Voice input failed — please try again.'); },
  });

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      title={listening ? 'Stop voice input' : 'Start voice input'}
      aria-label={listening ? 'Stop voice input' : 'Start voice input'}
      className={cn(
        'w-[40px] h-[40px] rounded-xl flex items-center justify-center transition-colors shrink-0 disabled:opacity-40',
        listening
          ? 'text-red-500 animate-pulse hover:bg-red-50 dark:hover:bg-red-500/10'
          : 'text-slate-400 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-[#334155]',
        className,
      )}
    >
      {listening ? <MicOff size={20} /> : <Mic size={20} />}
    </button>
  );
}
