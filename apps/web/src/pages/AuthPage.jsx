import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, ShieldCheck, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/contexts/UserContext';
import { useTheme } from '@/contexts/ThemeContext';
import GlowBackground from '@/components/ui/GlowBackground';

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading } = useUser();
  const { theme, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'signup');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [level, setLevel] = useState('A Level');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!isLoading && user) navigate('/app', { replace: true });
  }, [user, isLoading, navigate]);

  const handleSignUp = async () => {
    if (!name || !email || !password) return;
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true); setError(''); setSuccess('');
    const { data, error: signUpError } = await supabase.auth.signUp({
      email, password,
      options: { data: { name, level } }
    });
    setLoading(false);
    if (signUpError) { setError(signUpError.message); return; }
    if (data.session) {
      navigate('/app');
    } else {
      setSuccess('Account created! Check your inbox to confirm, then sign in.');
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) return;
    setLoading(true); setError(''); setSuccess('');
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signInError) { setError(signInError.message); return; }
    navigate('/app');
  };

  const handleForgotPassword = async () => {
    if (!email) { setError('Enter your email first.'); return; }
    const { error: e } = await supabase.auth.resetPasswordForEmail(email);
    if (e) { setError(e.message); } else { setSuccess('Check your email for a reset link.'); }
  };

  if (isLoading) return null;

  return (
    <div className="ap-root">
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        .ap-root {
          min-height: 100vh; min-height: 100dvh;
          background: #090D16;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          padding: 24px 16px 40px; font-family: 'Outfit', system-ui, -apple-system, sans-serif;
          color: #F8FAFC;
          position: relative;
          overflow: hidden;
          transition: background 0.3s ease, color 0.3s ease;
        }
        .light .ap-root {
          background: #F8FAFC;
          color: #0F172A;
        }
        
        .ap-topbar { width: 100%; max-width: 420px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; z-index: 10; }
        
        .ap-back { display: inline-flex; align-items: center; gap: 8px; color: #94A3B8; font-size: 13px; text-decoration: none; min-height: 44px; padding: 4px 12px; border-radius: 9999px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); backdrop-filter: blur(8px); transition: all 0.2s ease; }
        .light .ap-back { color: #64748B; background: rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.05); }
        .ap-back:hover { color: #FFFFFF; background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.1); transform: translateX(-2px); }
        .light .ap-back:hover { color: #0F172A; background: rgba(0,0,0,0.08); border-color: rgba(0,0,0,0.1); }
        
        .ap-theme-btn { padding: 8px; border-radius: 9999px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); color: #94A3B8; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; min-height: 40px; min-width: 40px; }
        .light .ap-theme-btn { color: #64748B; background: rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.05); }
        .ap-theme-btn:hover { color: #FFFFFF; background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.1); transform: scale(1.05); }
        .light .ap-theme-btn:hover { color: #0F172A; background: rgba(0,0,0,0.08); border-color: rgba(0,0,0,0.1); }
        
        .ap-card {
          width: 100%; max-width: 420px;
          background: rgba(30, 41, 59, 0.45);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 24px; padding: 32px 28px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3), 0 24px 60px rgba(0, 0, 0, 0.4);
          z-index: 10;
          transition: all 0.3s ease;
        }
        .light .ap-card {
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.05), 0 24px 60px rgba(0, 0, 0, 0.1);
        }
        @media (min-width: 480px) { .ap-card { padding: 40px 36px; } }
        
        .ap-logo { display: flex; flex-direction: column; align-items: center; margin-bottom: 28px; gap: 8px; }
        .ap-logo-icon {
          color: #22C55E;
          background: rgba(34, 197, 94, 0.1);
          padding: 12px;
          border-radius: 16px;
          border: 1px solid rgba(34, 197, 94, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px rgba(34,197,94,0.15);
        }
        .light .ap-logo-icon {
          background: rgba(34, 197, 94, 0.08);
          box-shadow: 0 0 15px rgba(34,197,94,0.1);
        }
        .ap-logo-title { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; color: #FFFFFF; margin-top: 4px; }
        .light .ap-logo-title { color: #0F172A; }
        .ap-logo-sub { font-size: 13px; color: #94A3B8; font-weight: 500; }
        .light .ap-logo-sub { color: #64748B; }
        
        .ap-tabs { display: flex; background: rgba(15, 23, 42, 0.6); padding: 4px; border-radius: 12px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.03); }
        .light .ap-tabs { background: rgba(0, 0, 0, 0.04); border: 1px solid rgba(0,0,0,0.01); }
        .ap-tab { flex: 1; text-align: center; padding: 8px; font-size: 14px; font-weight: 600; background: none; border: none; border-radius: 8px; cursor: pointer; transition: all .2s ease; color: #64748B; min-height: 38px; font-family: inherit; }
        .light .ap-tab { color: #64748B; }
        .ap-tab--active { color: #FFFFFF; background: rgba(255, 255, 255, 0.08); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .light .ap-tab--active { color: #0F172A; background: #FFFFFF; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        
        .ap-input {
          width: 100%; background: rgba(15, 23, 42, 0.5); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: 12px;
          padding: 14px 16px; color: #FFFFFF; font-size: 14px; outline: none;
          transition: all 0.2s ease; font-family: inherit;
          -webkit-appearance: none; appearance: none;
        }
        .light .ap-input {
          background: #FFFFFF;
          border: 1px solid rgba(0, 0, 0, 0.1);
          color: #0F172A;
        }
        .ap-input:focus { border-color: rgba(34, 197, 94, 0.5); background: rgba(15, 23, 42, 0.7); box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15); }
        .light .ap-input:focus { border-color: #22C55E; background: #FFFFFF; box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1); }
        
        .ap-input-wrap { position: relative; }
        .ap-eye { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; color: #64748B; cursor: pointer; padding: 6px; display: flex; transition: color 0.15s; }
        .ap-eye:hover { color: #F1F5F9; }
        .light .ap-eye:hover { color: #0F172A; }
        
        .ap-level-row { display: flex; gap: 10px; }
        .ap-level-btn {
          flex: 1; border-radius: 12px; padding: 12px; font-size: 14px; font-weight: 600;
          border: 1px solid rgba(255, 255, 255, 0.07); background: rgba(15, 23, 42, 0.5); color: #94A3B8; cursor: pointer;
          transition: all .2s ease; font-family: inherit; min-height: 48px;
        }
        .light .ap-level-btn {
          background: #FFFFFF; border-color: rgba(0, 0, 0, 0.1); color: #64748B;
        }
        .ap-level-btn:hover { background: rgba(15, 23, 42, 0.7); border-color: rgba(255,255,255,0.15); color: #FFFFFF; }
        .light .ap-level-btn:hover { background: rgba(0,0,0,0.02); border-color: rgba(0,0,0,0.15); color: #0F172A; }
        
        .ap-level-btn--active { background: #22C55E; border-color: #22C55E; color: #052e16; box-shadow: 0 0 16px rgba(34, 197, 94, 0.2); }
        .light .ap-level-btn--active { background: #22C55E; border-color: #22C55E; color: #052e16; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.15); }
        .ap-level-btn--active:hover { background: #22C55E; border-color: #22C55E; color: #052e16; }
        .light .ap-level-btn--active:hover { background: #22C55E; border-color: #22C55E; color: #052e16; }
        
        .ap-btn-primary {
          width: 100%; background: linear-gradient(135deg, #22C55E 0%, #10B981 100%); color: #052e16; border: none;
          border-radius: 12px; padding: 15px; font-size: 15px; font-weight: 700;
          cursor: pointer; transition: all .2s ease; font-family: inherit; min-height: 52px;
          box-shadow: 0 4px 15px rgba(34, 197, 94, 0.2);
        }
        .ap-btn-primary:disabled { opacity: .6; cursor: not-allowed; box-shadow: none; }
        .ap-btn-primary:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(34, 197, 94, 0.35); brightness: 1.05; }
        .ap-btn-primary:not(:disabled):active { transform: translateY(1px); }
        
        .ap-error { border-radius: 10px; padding: 12px 14px; font-size: 13px; line-height: 1.4; border: 1px solid transparent; }
        .ap-error--err { background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.2); color: #FCA5A5; }
        .light .ap-error--err { background: #FEE2E2; border-color: #FECACA; color: #EF4444; }
        .ap-error--ok { background: rgba(34, 197, 94, 0.1); border-color: rgba(34, 197, 94, 0.2); color: #A7F3D0; }
        .light .ap-error--ok { background: #D1FAE5; border-color: #A7F3D0; color: #065F46; }
        
        .ap-forgot { background: none; border: none; color: #3B82F6; font-size: 12px; font-weight: 500; cursor: pointer; min-height: 36px; font-family: inherit; transition: color 0.15s; }
        .ap-forgot:hover { color: #60A5FA; text-decoration: underline; }
        .light .ap-forgot:hover { color: #2563EB; }
        
        .ap-footer-text { font-size: 11px; color: #64748B; text-align: center; margin-top: 24px; line-height: 1.5; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .light .ap-footer-text { color: #64748B; }
        
        .ap-form-fields { display: flex; flex-direction: column; gap: 16px; }
      `}</style>

      {/* GPU Ambient Glows */}
      <GlowBackground color="#22c55e" size={600} intensity={0.06} className="top-[10%] left-[20%]" />
      <GlowBackground color="#3b82f6" size={500} intensity={0.04} className="bottom-[10%] right-[10%]" />

      <div className="ap-topbar">
        <Link to="/" className="ap-back">
          <ArrowLeft size={14} /> Back to home
        </Link>
        <button 
          onClick={toggleTheme}
          className="ap-theme-btn"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      <div className="ap-card">
        <div className="ap-logo">
          <div className="ap-logo-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M3 12L9 18L21 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 2L22 12L12 22L2 12L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="ap-logo-title">PassMark</div>
          <div className="ap-logo-sub">GCE AI Tutor · Free</div>
        </div>

        <div className="ap-tabs">
          {[['signup', 'Sign up'], ['signin', 'Sign in']].map(([tab, label]) => (
            <button key={tab} className={cn('ap-tab', activeTab === tab && 'ap-tab--active')}
              onClick={() => { setActiveTab(tab); setError(''); setSuccess(''); }}>
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'signup' && (
          <div className="ap-form-fields">
            <input className="ap-input" type="text" placeholder="Full name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
            
            <div className="ap-level-row">
              {['O Level', 'A Level'].map(lvl => (
                <button key={lvl} type="button" className={cn('ap-level-btn', level === lvl && 'ap-level-btn--active')} onClick={() => setLevel(lvl)}>{lvl}</button>
              ))}
            </div>
            
            <input className="ap-input" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" inputMode="email" />
            
            <div className="ap-input-wrap">
              <input className="ap-input" type={showPassword ? 'text' : 'password'} placeholder="Min. 6 characters" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" style={{ paddingRight: 44 }} />
              <button className="ap-eye" onClick={() => setShowPassword(!showPassword)} type="button" aria-label="Toggle password">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            
            {error && <div className="ap-error ap-error--err">{error}</div>}
            {success && <div className="ap-error ap-error--ok">{success}</div>}
            
            {!success && (
              <button className="ap-btn-primary" onClick={handleSignUp} disabled={loading}>
                {loading ? 'Creating account…' : 'Create my account →'}
              </button>
            )}
          </div>
        )}

        {activeTab === 'signin' && (
          <div className="ap-form-fields">
            <input className="ap-input" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" inputMode="email" />
            
            <div className="ap-input-wrap">
              <input className="ap-input" type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" style={{ paddingRight: 44 }} />
              <button className="ap-eye" onClick={() => setShowPassword(!showPassword)} type="button" aria-label="Toggle password">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            
            <div style={{ textAlign: 'right' }}>
              <button className="ap-forgot" onClick={handleForgotPassword}>Forgot password?</button>
            </div>
            
            {error && <div className="ap-error ap-error--err">{error}</div>}
            {success && <div className="ap-error ap-error--ok">{success}</div>}
            
            <button className="ap-btn-primary" onClick={handleSignIn} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </div>
        )}

        <div className="ap-footer-text">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>Secure encrypted connection. Your data is private.</span>
        </div>
      </div>
    </div>
  );
}
