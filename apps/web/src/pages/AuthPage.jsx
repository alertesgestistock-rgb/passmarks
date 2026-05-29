import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export default function AuthPage({ onSkip, onSignUp }) {
  const [activeTab, setActiveTab] = useState('signup');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [level, setLevel] = useState('A Level');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignUp = async () => {
    if (!name || !email || !password) return;
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    setError('');

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, level } },
    });

    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    onSignUp();
  };

  const handleSignIn = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError('');

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    // UserContext auth state listener handles the rest
  };

  const handleForgotPassword = async () => {
    if (!email) { setError('Enter your email first.'); return; }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email);
    if (resetError) setError(resetError.message);
    else setError('Check your email for a reset link.');
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] bg-[#1E293B] rounded-[16px] p-[28px] border-[0.5px] border-[#334155] shadow-xl fade-in">

        <div className="flex flex-col items-center mb-[24px]">
          <div className="w-[48px] h-[48px] text-[#22C55E] mb-2">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <path d="M3 12L9 18L21 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 2L22 12L12 22L2 12L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-[20px] font-medium text-[#F1F5F9]">PassMark</h1>
          <p className="text-[12px] text-[#94A3B8]">GCE AI Tutor</p>
        </div>

        <div className="flex mb-6 border-b border-[#334155]">
          <button
            onClick={() => { setActiveTab('signup'); setError(''); }}
            className={cn(
              "flex-1 text-center pb-[10px] text-[14px] font-medium transition-colors",
              activeTab === 'signup' ? "border-b-2 border-[#22C55E] text-[#F1F5F9]" : "text-[#64748B]"
            )}
          >
            Sign up
          </button>
          <button
            onClick={() => { setActiveTab('signin'); setError(''); }}
            className={cn(
              "flex-1 text-center pb-[10px] text-[14px] font-medium transition-colors",
              activeTab === 'signin' ? "border-b-2 border-[#22C55E] text-[#F1F5F9]" : "text-[#64748B]"
            )}
          >
            Sign in
          </button>
        </div>

        {activeTab === 'signup' ? (
          <div className="flex flex-col fade-in">
            <input
              type="text" placeholder="Full name" value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-[#0F172A] border-[0.5px] border-[#334155] rounded-[10px] p-[12px] text-[#F1F5F9] text-[13px] mb-[12px] outline-none focus:border-[#22C55E]"
            />
            <div className="flex gap-2 mb-[12px]">
              {['O Level', 'A Level'].map(lvl => (
                <button
                  key={lvl} onClick={() => setLevel(lvl)}
                  className={cn(
                    "flex-1 rounded-[10px] p-[12px] text-[13px] font-medium border-[0.5px] transition-colors",
                    level === lvl ? "bg-[#22C55E] border-[#22C55E] text-[#052e16]" : "bg-[#0F172A] border-[#334155] text-[#94A3B8]"
                  )}
                >
                  {lvl}
                </button>
              ))}
            </div>
            <input
              type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#0F172A] border-[0.5px] border-[#334155] rounded-[10px] p-[12px] text-[#F1F5F9] text-[13px] mb-[12px] outline-none focus:border-[#22C55E]"
            />
            <div className="relative mb-[12px]">
              <input
                type={showPassword ? "text" : "password"} placeholder="Min. 6 characters" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#0F172A] border-[0.5px] border-[#334155] rounded-[10px] p-[12px] text-[#F1F5F9] text-[13px] outline-none focus:border-[#22C55E] pr-10"
              />
              <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B]">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {error && (
              <div className="bg-[#3B0000] text-[#EF4444] rounded-[8px] p-[8px] px-[12px] text-[12px] mb-3">
                {error}
              </div>
            )}
            <button
              onClick={handleSignUp} disabled={loading}
              className="w-full bg-[#22C55E] text-[#052e16] rounded-[10px] p-[13px] text-[14px] font-medium scale-on-click mt-2 disabled:opacity-60"
            >
              {loading ? 'Creating account…' : 'Create my account →'}
            </button>

            <div className="text-center text-[#64748B] text-[11px] my-4">— or continue with —</div>
            <button onClick={onSkip} className="text-[#3B82F6] text-[12px] text-center underline hover:text-[#60A5FA]">
              Continue without account
            </button>
          </div>
        ) : (
          <div className="flex flex-col fade-in">
            <input
              type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#0F172A] border-[0.5px] border-[#334155] rounded-[10px] p-[12px] text-[#F1F5F9] text-[13px] mb-[12px] outline-none focus:border-[#22C55E]"
            />
            <div className="relative mb-[12px]">
              <input
                type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#0F172A] border-[0.5px] border-[#334155] rounded-[10px] p-[12px] text-[#F1F5F9] text-[13px] outline-none focus:border-[#22C55E] pr-10"
              />
              <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B]">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="flex justify-end mb-4">
              <button onClick={handleForgotPassword} className="text-[#3B82F6] text-[11px] hover:underline">
                Forgot password?
              </button>
            </div>

            {error && (
              <div className={cn(
                "rounded-[8px] p-[8px] px-[12px] text-[12px] mb-4",
                error.startsWith('Check') ? "bg-[#052e16] text-[#22C55E]" : "bg-[#3B0000] text-[#EF4444]"
              )}>
                {error}
              </div>
            )}

            <button
              onClick={handleSignIn} disabled={loading}
              className="w-full bg-[#22C55E] text-[#052e16] rounded-[10px] p-[13px] text-[14px] font-medium scale-on-click disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </div>
        )}

        <p className="text-[#64748B] text-[11px] text-center mt-[16px]">
          Secured by Supabase. Your data is encrypted.
        </p>
      </div>
    </div>
  );
}
