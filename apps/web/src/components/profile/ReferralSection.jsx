import React, { useState, useEffect } from 'react';
import { Gift, Copy, Check, Loader2, Users, AlertTriangle, Share2, Link } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { runMobileSafeRequest } from '@/lib/mobileRequest';
import { useUser } from '@/contexts/UserContext';

export default function ReferralSection() {
  const { user, updateTokenBalance } = useUser();

  const [referralCode, setReferralCode] = useState(null);
  const [referralCount, setReferralCount] = useState(0);
  const [codeInput, setCodeInput] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const load = async () => {
      const { data: profile } = await runMobileSafeRequest(signal => supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', user.id)
        .single()
        .abortSignal(signal));

      const { count } = await runMobileSafeRequest(signal => supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', user.id)
        .abortSignal(signal));

      if (!cancelled) {
        setReferralCode(profile?.referral_code || null);
        setReferralCount(count || 0);
        setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const isValidFormat = /^[a-zA-Z0-9]{6}$/.test(codeInput);

  const handleCodeInput = (e) => {
    setError('');
    setConfirmed(false);
    const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6);
    setCodeInput(val);
  };

  const handleConfirm = async () => {
    if (!isValidFormat || !confirmed) return;
    setSaving(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error: rpcError } = await supabase.rpc('set_referral_code', {
        p_user_id: session.user.id,
        p_code: codeInput,
      });
      if (rpcError) throw rpcError;
      if (data?.success) {
        setReferralCode(data.code);
      } else {
        setError(data?.error || 'Something went wrong.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const referralLink = referralCode
    ? `${window.location.origin}/auth?ref=${referralCode}`
    : '';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShare = () => {
    const text = `Join me on PassMark — the GCE AI Tutor! Sign up with my link and get 5 free tokens 🎓\n${referralLink}`;
    if (navigator.share) {
      navigator.share({ title: 'PassMark', text });
    } else {
      navigator.clipboard.writeText(text);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 border border-slate-200 dark:border-[#334155]/50 shadow-sm mb-4 animate-pulse h-[120px]" />
    );
  }

  return (
    <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 border border-slate-200 dark:border-[#334155]/50 shadow-sm mb-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-[#A855F7]/15 flex items-center justify-center shrink-0">
          <Users size={17} className="text-[#A855F7]" />
        </div>
        <div>
          <div className="text-[14px] font-semibold text-slate-900 dark:text-white">
            Invite &amp; Earn
          </div>
          <div className="text-[11px] text-slate-500 dark:text-[#94A3B8] font-medium mt-0.5">
            You earn <span className="text-[#A855F7] font-bold">10 tokens</span> · your friend gets <span className="text-[#A855F7] font-bold">5 tokens</span>
          </div>
        </div>
        {referralCode && (
          <div className="ml-auto flex items-center gap-1.5 bg-[#A855F7]/10 px-2.5 py-1 rounded-full">
            <Users size={11} className="text-[#A855F7]" />
            <span className="text-[12px] font-bold text-[#A855F7]">{referralCount}</span>
          </div>
        )}
      </div>

      {/* No code yet — creation form */}
      {!referralCode && (
        <>
          <p className="text-[12px] text-slate-500 dark:text-[#94A3B8] mb-4 leading-relaxed">
            Create your unique referral code to invite friends. Share it and both of you get free tokens when they sign up.
          </p>

          {/* Input */}
          <div className="relative">
            <input
              type="text"
              value={codeInput}
              onChange={handleCodeInput}
              placeholder="e.g. Mark42"
              className="w-full h-[44px] px-4 bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-xl text-[14px] font-mono font-bold uppercase tracking-widest text-slate-900 dark:text-[#F1F5F9] placeholder:text-slate-300 dark:placeholder:text-[#475569] placeholder:normal-case placeholder:tracking-normal placeholder:font-normal outline-none focus:border-[#A855F7] dark:focus:border-[#A855F7] transition-colors pr-10"
              maxLength={6}
            />
            {isValidFormat && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Check size={15} className="text-[#22C55E]" />
              </div>
            )}
          </div>

          {/* Format hint */}
          <div className="mt-2">
            <span className={`text-[11px] font-medium transition-colors ${
              codeInput.length === 0
                ? 'text-slate-400 dark:text-[#64748B]'
                : isValidFormat
                ? 'text-[#22C55E]'
                : 'text-[#F97316]'
            }`}>
              {codeInput.length === 0
                ? '6 characters — letters and numbers only'
                : isValidFormat
                ? '✓ Valid format'
                : `${codeInput.length}/6 characters`}
            </span>
          </div>

          {/* Permanent warning */}
          {isValidFormat && (
            <div className="mt-3 flex items-start gap-2 bg-amber-500/8 dark:bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5">
              <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-[1px]" />
              <p className="text-[11px] text-slate-600 dark:text-[#94A3B8] leading-relaxed">
                <span className="font-semibold text-slate-800 dark:text-[#F1F5F9]">This is permanent.</span>{' '}
                Once confirmed, your referral code <span className="font-semibold">cannot be changed</span>.
              </p>
            </div>
          )}

          {/* Confirmation checkbox */}
          {isValidFormat && (
            <label className="mt-3 flex items-center gap-2.5 cursor-pointer select-none">
              <div
                onClick={() => setConfirmed(v => !v)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                  confirmed
                    ? 'bg-[#A855F7] border-[#A855F7]'
                    : 'border-slate-300 dark:border-[#475569]'
                }`}
              >
                {confirmed && <Check size={12} className="text-white" strokeWidth={3} />}
              </div>
              <span className="text-[12px] text-slate-600 dark:text-[#94A3B8]">
                I understand my code <strong className="text-slate-800 dark:text-[#F1F5F9]">{codeInput}</strong> cannot be changed after this
              </span>
            </label>
          )}

          {error && <p className="text-[12px] text-red-500 mt-2">{error}</p>}

          {/* Confirm button */}
          <button
            onClick={handleConfirm}
            disabled={!isValidFormat || !confirmed || saving}
            className="mt-4 w-full bg-[#A855F7] text-white rounded-xl py-3 text-[14px] font-bold flex items-center justify-center gap-2 disabled:opacity-40 hover:brightness-110 active:scale-[0.98] transition-all"
          >
            {saving
              ? <Loader2 size={16} className="animate-spin" />
              : <><Gift size={15} /> Confirm my referral code</>}
          </button>
        </>
      )}

      {/* Code already set — share view */}
      {referralCode && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-[#A855F7] rounded-xl p-4 text-white">
              <div className="text-[22px] font-bold tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {referralCount * 10}
              </div>
              <div className="text-[11px] font-medium text-white/80 mt-0.5">Tokens earned</div>
            </div>
            <div className="bg-slate-50 dark:bg-white/4 rounded-xl p-4">
              <div className="text-[22px] font-bold text-slate-900 dark:text-white tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {referralCount}
              </div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-[#94A3B8] mt-0.5">
                {referralCount === 1 ? 'Friend invited' : 'Friends invited'}
              </div>
            </div>
          </div>

          {/* Code display */}
          <div className="bg-[#A855F7]/8 dark:bg-[#A855F7]/10 border border-[#A855F7]/20 rounded-xl px-4 py-3 flex items-center justify-between mb-3">
            <span className="text-[22px] font-mono font-bold tracking-[0.15em] text-[#A855F7] uppercase">
              {referralCode}
            </span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-[12px] font-semibold text-[#A855F7] hover:text-[#9333EA] transition-colors"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy code'}
            </button>
          </div>

          {/* Referral link */}
          <div className="bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-xl px-3 py-2.5 flex items-center gap-2 mb-4">
            <Link size={13} className="text-slate-400 dark:text-[#64748B] shrink-0" />
            <span className="text-[11px] text-slate-500 dark:text-[#94A3B8] font-mono truncate flex-1">
              {referralLink}
            </span>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1 text-[11px] font-semibold text-[#A855F7] hover:text-[#9333EA] transition-colors shrink-0"
            >
              {copiedLink ? <Check size={12} /> : <Copy size={12} />}
              {copiedLink ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Rewards breakdown */}
          <div className="bg-slate-50 dark:bg-white/4 rounded-xl p-3.5 mb-4">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide mb-2">
              Rewards
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-slate-200 dark:border-white/8">
              <span className="text-[12px] text-slate-600 dark:text-[#94A3B8]">You receive</span>
              <span className="text-[13px] font-bold text-[#A855F7]">+10 tokens</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-[12px] text-slate-600 dark:text-[#94A3B8]">Your friend receives</span>
              <span className="text-[13px] font-bold text-[#A855F7]">+5 tokens</span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-[#64748B] mt-2 leading-relaxed">
              Tokens are credited automatically as soon as your friend signs up with your link.
            </p>
          </div>

          {/* Share button */}
          <button
            onClick={handleShare}
            className="w-full bg-[#A855F7] text-white rounded-xl py-3 text-[14px] font-bold flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all"
          >
            <Share2 size={15} /> Share my code
          </button>
        </>
      )}
    </div>
  );
}
