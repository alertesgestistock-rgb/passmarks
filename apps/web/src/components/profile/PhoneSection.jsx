import React, { useState } from 'react';
import { Phone, ChevronDown, Check, Loader2, Gift, MessageCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';

const COUNTRIES = [
  { name: 'Cameroun',       code: '237', iso: 'CM', digits: 9  },
  { name: "Côte d'Ivoire",  code: '225', iso: 'CI', digits: 10 },
  { name: 'Sénégal',        code: '221', iso: 'SN', digits: 9  },
  { name: 'Gabon',          code: '241', iso: 'GA', digits: 8  },
  { name: 'Congo',          code: '242', iso: 'CG', digits: 9  },
  { name: 'RDC',            code: '243', iso: 'CD', digits: 9  },
  { name: 'Mauritanie',     code: '222', iso: 'MR', digits: 8  },
  { name: 'Ghana',          code: '233', iso: 'GH', digits: 9  },
  { name: 'Nigeria',        code: '234', iso: 'NG', digits: 10 },
  { name: 'France',         code: '33',  iso: 'FR', digits: 9  },
  { name: 'USA',            code: '1',   iso: 'US', digits: 10 },
  { name: 'UK',             code: '44',  iso: 'GB', digits: 10 },
];

export default function PhoneSection() {
  const { user, updateTokenBalance } = useUser();

  const [countryCode, setCountryCode] = useState(user?.phoneCountry || '237');
  const [phone, setPhone]             = useState(user?.phone || '');
  const [showDropdown, setShowDropdown] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [claimed, setClaimed]         = useState(!!user?.phone);
  const [error, setError]             = useState('');

  const selectedCountry = COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0];
  const isValidLength   = phone.length === selectedCountry.digits;
  const isValidFormat   = /^\d+$/.test(phone) && isValidLength;

  const handlePhoneInput = (e) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= selectedCountry.digits) setPhone(val);
  };

  const handleCountryChange = (code) => {
    setCountryCode(code);
    setPhone('');
    setShowDropdown(false);
    setError('');
  };

  const handleClaim = async () => {
    if (!isValidFormat) return;
    setSaving(true);
    setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('claim_phone_bonus', {
        p_phone:         phone,
        p_phone_country: countryCode,
      });

      if (rpcError) throw rpcError;
      if (data?.success === false) {
        if (data.reason === 'already_claimed') {
          setClaimed(true);
        } else {
          setError('Something went wrong. Please try again.');
        }
        return;
      }
      if (data?.success) {
        updateTokenBalance(data.balance);
        setClaimed(true);
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#1E293B] rounded-2xl p-5 border border-slate-200 dark:border-[#334155]/50 shadow-sm mb-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-[#22C55E]/15 flex items-center justify-center shrink-0">
          <Phone size={17} className="text-[#22C55E]" />
        </div>
        <div>
          <div className="text-[14px] font-semibold text-slate-900 dark:text-white">
            Phone number
          </div>
          {!claimed && (
            <div className="flex items-center gap-1 mt-0.5">
              <Gift size={11} className="text-[#F97316]" />
              <span className="text-[11px] text-[#F97316] font-medium">
                Add your number → get 2 free tokens
              </span>
            </div>
          )}
          {claimed && (
            <div className="text-[11px] text-[#22C55E] font-medium mt-0.5">
              ✓ Number saved
</div>
          )}
        </div>
      </div>

      {/* Phone input row */}
      <div className="flex gap-2 items-stretch">
        {/* Country selector */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(v => !v)}
            className="h-[44px] px-3 bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-xl flex items-center gap-1.5 text-[13px] font-medium text-slate-700 dark:text-[#F1F5F9] min-w-[120px] hover:border-slate-300 dark:hover:border-[#475569] transition-colors"
          >
            <span>{selectedCountry.name}</span>
            <span className="text-slate-400 dark:text-[#64748B]">(+{selectedCountry.code})</span>
            <ChevronDown size={13} className="ml-auto text-slate-400 shrink-0" />
          </button>

          {showDropdown && (
            <div className="absolute top-[48px] left-0 z-50 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-xl shadow-xl overflow-y-auto max-h-[240px] w-[190px]">
              {COUNTRIES.map(c => (
                <button
                  key={c.code}
                  onClick={() => handleCountryChange(c.code)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-slate-700 dark:text-[#F1F5F9] hover:bg-slate-50 dark:hover:bg-[#0F172A] transition-colors text-left"
                >
                  {c.code === countryCode && <Check size={12} className="text-[#22C55E] shrink-0" />}
                  {c.code !== countryCode && <span className="w-3 shrink-0" />}
                  <span>{c.name}</span>
                  <span className="text-slate-400 dark:text-[#64748B] ml-auto">(+{c.code})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Phone number input */}
        <div className="relative flex-1">
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={handlePhoneInput}
            placeholder={'0'.repeat(selectedCountry.digits)}
            className="w-full h-[44px] px-4 bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-xl text-[14px] text-slate-900 dark:text-[#F1F5F9] placeholder:text-slate-300 dark:placeholder:text-[#475569] outline-none focus:border-[#22C55E] dark:focus:border-[#22C55E] transition-colors pr-10"
          />
          {isValidFormat && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Check size={15} className="text-[#22C55E]" />
            </div>
          )}
        </div>
      </div>

      {/* Format indicator */}
      <div className="mt-2 flex items-center justify-between">
        <span className={`text-[11px] font-medium transition-colors ${
          phone.length === 0
            ? 'text-slate-400 dark:text-[#64748B]'
            : isValidFormat
            ? 'text-[#22C55E]'
            : 'text-[#F97316]'
        }`}>
          {phone.length === 0
            ? `${selectedCountry.digits} digits without country code`
            : isValidFormat
            ? '✓ Correct format'
            : `${phone.length}/${selectedCountry.digits} digits`}
        </span>
      </div>

      {/* WhatsApp notice */}
      {!claimed && (
        <div className="mt-3 flex items-start gap-2 bg-[#22C55E]/8 dark:bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-xl px-3 py-2.5">
          <MessageCircle size={13} className="text-[#22C55E] shrink-0 mt-[1px]" />
          <p className="text-[11px] text-slate-600 dark:text-[#94A3B8] leading-relaxed">
            <span className="font-semibold text-slate-800 dark:text-[#F1F5F9]">WhatsApp number only.</span>{' '}
            Make sure this is your correct WhatsApp number — a confirmation will be sent to verify it before the tokens are credited.
          </p>
        </div>
      )}

      {error && (
        <p className="text-[12px] text-red-500 mt-2">{error}</p>
      )}

      {/* Save button */}
      <button
        onClick={handleClaim}
        disabled={!isValidFormat || saving}
        className="mt-4 w-full bg-[#22C55E] text-[#052e16] rounded-xl py-3 text-[14px] font-bold flex items-center justify-center gap-2 disabled:opacity-40 hover:brightness-110 active:scale-[0.98] transition-all"
      >
        {saving
          ? <Loader2 size={16} className="animate-spin" />
          : claimed
          ? '✓ Number saved'
          : <><Gift size={15} /> Confirm and get 2 free tokens</>}
      </button>
    </div>
  );
}
