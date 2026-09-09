import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// -----------------------------------------------------------------------------
// Porte d'accès complète pour /boss — remplace l'ancienne version "mot de
// passe seul + code affiché à l'écran" (mode démo) par le flux réel demandé
// le 2026-08-08 :
//
//   1) email + mot de passe → supabase.auth.signInWithPassword (réel).
//      Identifiants invalides → "Mot de passe incorrect."
//   2) si les identifiants sont bons, contrôle SERVEUR du rôle admin via
//      is_admin(uuid) (profiles.role, réel en base depuis les migrations
//      20260808000001/000013). Pas admin → déconnexion immédiate + erreur
//      visible, pas de redirection silencieuse.
//   3) admin confirmé → un code de confirmation est envoyé PAR EMAIL via
//      Supabase Auth (signInWithOtp), plus de code affiché à l'écran. La
//      personne colle le code reçu → verifyOtp.
//
// Réglages côté Dashboard Supabase (pas accessibles depuis le code / les
// outils MCP disponibles ici) :
//   - Authentication > Providers > Email > "Email OTP expiration" → réglé à
//     300 secondes (5 min) le 2026-09-09 (défaut Supabase : 3600s/1h).
//   - Authentication > Email Templates > "Magic Link" → colle le contenu de
//     apps/web/public/emails/admin-otp.html (contient {{ .Token }}, le code
//     à 6 chiffres — sans ça l'email envoyé n'a qu'un lien "Se connecter" et
//     pas de code à copier-coller).
// -----------------------------------------------------------------------------

const STEPUP_TTL_MS = 15 * 60 * 1000; // 15 minutes — durée de la session step-up une fois validée, distincte de l'expiration du code OTP (réglée côté Supabase, cf. ci-dessus).
const STEPUP_KEY = 'passmark_admin_stepup';

function readStepUp() {
  try {
    const raw = sessionStorage.getItem(STEPUP_KEY);
    if (!raw) return null;
    const { verifiedAt, userId } = JSON.parse(raw);
    if (Date.now() - verifiedAt >= STEPUP_TTL_MS) return null;
    return userId;
  } catch {
    return null;
  }
}

function writeStepUp(userId) {
  sessionStorage.setItem(STEPUP_KEY, JSON.stringify({ verifiedAt: Date.now(), userId }));
}

function clearStepUp() {
  sessionStorage.removeItem(STEPUP_KEY);
}

export default function AdminStepUpGate({ children }) {
  const { user } = useUser();
  const [verified, setVerified] = useState(false);
  const [step, setStep] = useState('credentials'); // 'credentials' | 'otp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Session déjà vérifiée récemment dans cet onglet (< 15 min) pour ce même
  // utilisateur : on ne redemande rien.
  useEffect(() => {
    const verifiedUserId = readStepUp();
    if (verifiedUserId && user?.id === verifiedUserId) {
      setVerified(true);
    }
  }, [user]);

  const handleCredentialsSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError || !signInData?.user) {
      setBusy(false);
      setError('Mot de passe incorrect.');
      return;
    }

    // Contrôle serveur, pas frontend : is_admin() est SECURITY DEFINER,
    // lit profiles.role directement, ne peut pas être contourné côté client.
    const { data: isAdmin, error: rpcError } = await supabase.rpc('is_admin', {
      uid: signInData.user.id,
    });

    if (rpcError || !isAdmin) {
      await supabase.auth.signOut();
      clearStepUp();
      setBusy(false);
      setError("Accès refusé : ce compte n'est pas administrateur.");
      return;
    }

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    });

    setBusy(false);
    if (otpError) {
      setError("Impossible d'envoyer le code : " + otpError.message);
      return;
    }

    setCodeInput('');
    setStep('otp');
  }, [email, password]);

  const handleOtpSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    const { data, error: otpVerifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: codeInput.trim(),
      type: 'email',
    });

    setBusy(false);
    if (otpVerifyError || !data?.user) {
      setError('Code invalide ou expiré.');
      return;
    }

    writeStepUp(data.user.id);
    setVerified(true);
  }, [email, codeInput]);

  // Ni de mauvais identifiants, ni un rôle non-admin, ni un code non confirmé
  // ne font passer ce point : `children` (donc <AdminPage />, donc son chunk
  // JS) n'est rendu qu'ici.
  if (verified) return children;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {step === 'credentials' ? <Lock className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
            Accès administrateur
          </CardTitle>
          <CardDescription>
            {step === 'credentials'
              ? 'Connecte-toi avec ton compte administrateur.'
              : `Un code a été envoyé à ${email}. Il expire rapidement — colle-le ici.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'credentials' ? (
            <form onSubmit={handleCredentialsSubmit} className="space-y-3">
              <Input
                type="email"
                placeholder="Adresse email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                autoComplete="username"
              />
              <Input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={busy || !email || !password}>
                {busy ? 'Vérification…' : 'Continuer'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-3">
              <Input
                inputMode="numeric"
                placeholder="Code reçu par email"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ''))}
                maxLength={10}
                autoFocus
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={busy || codeInput.length < 6}>
                <ShieldCheck className="h-4 w-4 mr-2" /> Confirmer
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
