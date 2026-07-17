'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import '@/styles/auth.css';
import { apiCall, setSession, getToken, getUser } from '@/lib/api';
import { LOGO_URL } from '@/lib/branding';

const GoogleSVG = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function AuthPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<'login'|'register'>('login');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginEye, setLoginEye] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginSuccess, setLoginSuccess] = useState('');
  const [loginEmailErr, setLoginEmailErr] = useState(false);
  const [loginPassErr, setLoginPassErr] = useState(false);
  const [reg, setReg] = useState({ name:'', email:'', role:'employee', pass:'', pass2:'', terms:false });
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [regEmailErr, setRegEmailErr] = useState('');
  const [regPassStrength, setRegPassStrength] = useState(0);
  const [regEye, setRegEye] = useState(false);
  const [regEye2, setRegEye2] = useState(false);
  const [toast, setToast] = useState('');
  const redirectDone = useRef(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const [googleReady, setGoogleReady] = useState(false);

  // ── Google Sign-In (Google Identity Services) ────────────────────────────
  const onGoogleCredential = async (resp: any) => {
    setLoginError(''); setLoginSuccess('');
    try {
      const data = await apiCall('POST', '/auth/google', { credential: resp.credential });
      setSession(data.token, data.user);
      setLoginSuccess(`Welcome, ${data.user.name.split(' ')[0]}!`);
      setTimeout(() => router.replace(data.user.role === 'admin' ? '/admin' : '/employee'), 600);
    } catch (err: any) {
      setLoginError(err.message || 'Google sign-in failed.');
    }
  };

  useEffect(() => {
    if (!mounted) return; // page renders null until mounted — wait for the real DOM
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) return; // no client ID configured — keep fallback button

    const init = () => {
      const g = (window as any).google;
      if (!g?.accounts?.id || !googleBtnRef.current) return;
      g.accounts.id.initialize({ client_id: clientId, callback: onGoogleCredential });
      g.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline', size: 'large', text: 'continue_with',
        width: googleBtnRef.current.offsetWidth || 340,
      });
      setGoogleReady(true);
    };

    if ((window as any).google?.accounts?.id) { init(); return; }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = init;
    document.body.appendChild(s);
  }, [mounted]);

  useEffect(() => {
    setMounted(true);
    if (redirectDone.current) return;
    const token = getToken();
    const user = getUser();
    if (token && user) {
      redirectDone.current = true;
      router.replace(user.role === 'admin' ? '/admin' : '/employee');
    }
  }, []);

  if (!mounted) return null;

  const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2600); };

  const fillDemo = (role: 'admin'|'employee') => {
    if (role === 'admin') { setLoginEmail('admin@designercraft.com'); setLoginPass('admin123'); }
    else { setLoginEmail('gayani@designercraft.com'); setLoginPass('emp123'); }
    setLoginError(''); setLoginSuccess('');
  };

  const calcStrength = (v: string) => {
    let s = 0;
    if (v.length >= 8) s++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
    if (/\d/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v)) s++;
    return s;
  };

  const doLogin = async () => {
    setLoginError(''); setLoginSuccess('');
    let bad = false;
    if (!validEmail(loginEmail)) { setLoginEmailErr(true); bad = true; } else setLoginEmailErr(false);
    if (!loginPass) { setLoginPassErr(true); bad = true; } else setLoginPassErr(false);
    if (bad) return;
    setLoginLoading(true);
    try {
      const data = await apiCall('POST', '/auth/login', { email: loginEmail, password: loginPass });
      setSession(data.token, data.user);
      setLoginSuccess(`Welcome back, ${data.user.name.split(' ')[0]}!`);
      setTimeout(() => router.replace(data.user.role === 'admin' ? '/admin' : '/employee'), 600);
    } catch (err: any) {
      setLoginError(err.message || 'Incorrect email or password.');
    } finally { setLoginLoading(false); }
  };

  const doRegister = async () => {
    setRegError(''); setRegEmailErr('');
    let bad = false;
    if (reg.name.length < 2) bad = true;
    if (!validEmail(reg.email)) { setRegEmailErr('Enter a valid email address'); bad = true; }
    if (reg.pass.length < 8) bad = true;
    if (reg.pass2 !== reg.pass) bad = true;
    if (!reg.terms) bad = true;
    if (bad) { setRegError('Please fix the errors above.'); return; }
    setRegLoading(true);
    try {
      const data = await apiCall('POST', '/auth/register', { name: reg.name, email: reg.email, password: reg.pass, role: reg.role });
      setSession(data.token, data.user);
      showToast(`Welcome aboard, ${data.user.name.split(' ')[0]}!`);
      setTimeout(() => router.replace(data.user.role === 'admin' ? '/admin' : '/employee'), 700);
    } catch (err: any) {
      setRegError(err.message || 'Registration failed.');
    } finally { setRegLoading(false); }
  };

  const strengthLabels = ['Use 8+ characters with a mix of letters, numbers & symbols', 'Weak — add numbers or symbols', 'Okay — could be stronger', 'Good password', 'Strong password'];

  return (
    <>
      <div className="auth-logo" style={{ justifyContent:'center', marginBottom:'var(--p-space-600)' }}>
        <img src="/authlogo.png" alt="Designer Craft" style={{ width:160, height:'auto', objectFit:'contain', display:'block' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
      </div>

      <div className="auth-card">

        {/* LOGIN VIEW */}
        {view === 'login' && (
          <div className="view active">
            <h1 className="auth-title">Sign in</h1>
            <span className="auth-sub">Continue to your dashboard</span>

            {loginError && <div className="banner critical show"><i className="ti ti-alert-circle" /><span>{loginError}</span></div>}
            {loginSuccess && <div className="banner success show"><i className="ti ti-circle-check" /><span>{loginSuccess}</span></div>}

            <div className={`field${loginEmailErr ? ' invalid' : ''}`}>
              <label htmlFor="login-email">Email</label>
              <div className="input-wrap">
                <i className="ti ti-mail lead" />
                <input type="email" className="p-input" id="login-email" placeholder="you@studio.com" autoComplete="email"
                  value={loginEmail} onChange={e => { setLoginEmail(e.target.value); setLoginEmailErr(false); }} />
              </div>
              <div className="field-error"><i className="ti ti-alert-circle" /><span>Enter a valid email address</span></div>
            </div>

            <div className={`field${loginPassErr ? ' invalid' : ''}`}>
              <label htmlFor="login-pass">Password</label>
              <div className="input-wrap has-eye">
                <i className="ti ti-lock lead" />
                <input type={loginEye ? 'text' : 'password'} className="p-input" id="login-pass" placeholder="Your password" autoComplete="current-password"
                  value={loginPass} onChange={e => { setLoginPass(e.target.value); setLoginPassErr(false); }}
                  onKeyDown={e => e.key === 'Enter' && doLogin()} />
                <button type="button" className="eye-btn" onClick={() => setLoginEye(!loginEye)} aria-label="Toggle password">
                  <i className={`ti ${loginEye ? 'ti-eye-off' : 'ti-eye'}`} />
                </button>
              </div>
              <div className="field-error"><i className="ti ti-alert-circle" /><span>Password is required</span></div>
            </div>

            <div className="row-between">
              <label className="check"><input type="checkbox" defaultChecked /> Remember me</label>
              <a className="link" href="#" onClick={e => { e.preventDefault(); showToast('Use a demo account below or register.'); }}>Forgot password?</a>
            </div>

            <button type="button" className="btn-primary" onClick={doLogin} disabled={loginLoading}>
              <i className={`ti ${loginLoading ? 'ti-loader-2' : 'ti-login-2'}`} /> {loginLoading ? 'Signing in…' : 'Sign in'}
            </button>

            <div className="divider">or</div>

            {/* Official Google button renders here when NEXT_PUBLIC_GOOGLE_CLIENT_ID is set */}
            <div ref={googleBtnRef} style={{ display: googleReady ? 'flex' : 'none', justifyContent: 'center' }} />
            {!googleReady && (
              <button type="button" className="btn-google" onClick={() => showToast('Google Sign-In is not configured yet.')}>
                <GoogleSVG /> Continue with Google
              </button>
            )}

            <div className="demo-box">
              <b>Demo accounts</b>
              <div className="demo-row"><span>Admin — admin@designercraft.com / admin123</span><button onClick={() => fillDemo('admin')}>Use</button></div>
              <div className="demo-row"><span>Employee — gayani@designercraft.com / emp123</span><button onClick={() => fillDemo('employee')}>Use</button></div>
            </div>

            <div className="auth-foot">New here? <a href="#" className="link" onClick={e => { e.preventDefault(); setView('register'); }}>Create an account</a></div>
          </div>
        )}

        {/* REGISTER VIEW */}
        {view === 'register' && (
          <div className="view active">
            <h1 className="auth-title">Create your account</h1>
            <span className="auth-sub">Start managing your work in minutes</span>

            {regError && <div className="banner critical show"><i className="ti ti-alert-circle" /><span>{regError}</span></div>}

            <div className="grid2">
              <div className={`field${reg.name.length > 0 && reg.name.length < 2 ? ' invalid' : ''}`}>
                <label htmlFor="reg-name">Full name</label>
                <div className="input-wrap">
                  <i className="ti ti-user lead" />
                  <input type="text" className="p-input" id="reg-name" placeholder="Your full name" autoComplete="name"
                    value={reg.name} onChange={e => setReg(r => ({ ...r, name: e.target.value }))} />
                </div>
                <div className="field-error"><i className="ti ti-alert-circle" /><span>Name must be at least 2 characters</span></div>
              </div>
              <div className="field">
                <label htmlFor="reg-role">Account type</label>
                <div className="input-wrap">
                  <i className="ti ti-briefcase lead" />
                  <select className="p-input" id="reg-role" value={reg.role} onChange={e => setReg(r => ({ ...r, role: e.target.value }))}>
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={`field${regEmailErr ? ' invalid' : ''}`}>
              <label htmlFor="reg-email">Email address</label>
              <div className="input-wrap">
                <i className="ti ti-mail lead" />
                <input type="email" className="p-input" id="reg-email" placeholder="you@studio.com" autoComplete="email"
                  value={reg.email} onChange={e => { setReg(r => ({ ...r, email: e.target.value })); setRegEmailErr(''); }} />
              </div>
              <div className="field-error"><i className="ti ti-alert-circle" /><span>{regEmailErr || 'Enter a valid email address'}</span></div>
            </div>

            <div className={`field${reg.pass.length > 0 && reg.pass.length < 8 ? ' invalid' : ''}`}>
              <label htmlFor="reg-pass">Password</label>
              <div className="input-wrap has-eye">
                <i className="ti ti-lock lead" />
                <input type={regEye ? 'text' : 'password'} className="p-input" id="reg-pass" placeholder="8+ characters"
                  value={reg.pass} onChange={e => { setReg(r => ({ ...r, pass: e.target.value })); setRegPassStrength(calcStrength(e.target.value)); }} />
                <button type="button" className="eye-btn" onClick={() => setRegEye(!regEye)}>
                  <i className={`ti ${regEye ? 'ti-eye-off' : 'ti-eye'}`} />
                </button>
              </div>
              <div className="field-error"><i className="ti ti-alert-circle" /><span>Password must be at least 8 characters</span></div>
              {reg.pass && (
                <>
                  <div className={`pw-meter s${regPassStrength}`} />
                  <p className="pw-hint">{strengthLabels[regPassStrength]}</p>
                </>
              )}
            </div>

            <div className={`field${reg.pass2.length > 0 && reg.pass2 !== reg.pass ? ' invalid' : ''}`}>
              <label htmlFor="reg-pass2">Confirm password</label>
              <div className="input-wrap has-eye">
                <i className="ti ti-lock-check lead" />
                <input type={regEye2 ? 'text' : 'password'} className="p-input" id="reg-pass2" placeholder="Repeat your password"
                  value={reg.pass2} onChange={e => setReg(r => ({ ...r, pass2: e.target.value }))} />
                <button type="button" className="eye-btn" onClick={() => setRegEye2(!regEye2)}>
                  <i className={`ti ${regEye2 ? 'ti-eye-off' : 'ti-eye'}`} />
                </button>
              </div>
              <div className="field-error"><i className="ti ti-alert-circle" /><span>Passwords do not match</span></div>
            </div>

            <div className="field">
              <label className="check">
                <input type="checkbox" checked={reg.terms} onChange={e => setReg(r => ({ ...r, terms: e.target.checked }))} />
                I agree to the <a href="#" className="link">terms of service</a> and <a href="#" className="link">privacy policy</a>
              </label>
            </div>

            <button type="button" className="btn-primary" id="reg-btn" onClick={doRegister} disabled={regLoading}>
              <i className={`ti ${regLoading ? 'ti-loader-2' : 'ti-user-plus'}`} /> {regLoading ? 'Creating account…' : 'Create account'}
            </button>

            <div className="auth-foot">Already have an account? <a href="#" className="link" onClick={e => { e.preventDefault(); setView('login'); }}>Sign in</a></div>
          </div>
        )}
      </div>

      {toast && <div className="toast" style={{ display:'flex' }}><i className="ti ti-circle-check" /><span>{toast}</span></div>}
    </>
  );
}
