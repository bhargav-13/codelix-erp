import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BarChart3, Boxes, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useBlackMode } from '../../contexts/BlackModeContext';
import { Logo } from '../AppShell';
import { useSettings } from '../settings';
import { Button, Field } from '../ui';

// Offline owner view (Ctrl+Shift+B on this screen), carried over from the old login.
const _BU = 'owner';
const _BP = 'black@4bitx';

const Login: React.FC = () => {
  const { settings } = useSettings();
  const { signIn } = useAuth();
  const { activateBlackMode, deactivateBlackMode, isBlackMode } = useBlackMode();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(isBlackMode);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'B') {
        e.preventDefault();
        setOffline(prev => { if (prev) deactivateBlackMode(); return !prev; });
        setError('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deactivateBlackMode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !password) { setError('Enter your username and password'); return; }
    setLoading(true);
    if (offline) {
      if (username === _BU && password === _BP) { activateBlackMode(); navigate('/dashboard'); }
      else setError('Invalid username or password');
      setLoading(false);
      return;
    }
    try {
      await signIn({ username, password });
      navigate('/dashboard');
    } catch (err: any) {
      if (err?.status === 401 || err?.response?.status === 401) setError('Invalid username or password');
      else if (!err?.response && !err?.status) setError('Cannot reach the server. Check your connection and try again.');
      else setError(err?.response?.body?.message || 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-root grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-accent p-12 text-accent-fg lg:flex lg:flex-col">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 font-bold">
            {settings.companyName.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase()}
          </span>
          <span className="text-[18px] font-semibold">{settings.companyName}</span>
        </div>
        <div className="mt-auto max-w-md">
          <h1 className="text-[34px] font-semibold leading-tight tracking-tight">Run your whole factory from one screen.</h1>
          <p className="mt-3 text-[15px] opacity-80">Orders, stock, production, payments and people — always up to date.</p>
          <div className="mt-8 grid gap-3">
            {[
              { icon: BarChart3, t: 'Live dashboard of sales and dues' },
              { icon: Boxes, t: 'Stock, job work and production tracking' },
              { icon: Users, t: 'Face attendance and one-click payroll' },
            ].map(f => (
              <div key={f.t} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">
                <f.icon size={18} /> <span>{f.t}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10" />
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><Logo size={40} /></div>
          <h2 className="text-[24px] font-semibold tracking-tight">{offline ? 'Owner sign in' : 'Welcome back'}</h2>
          <p className="mt-1 text-ink-2">Sign in to continue to {settings.companyName}.</p>
          <div className="mt-8 space-y-4">
            <Field label="Username">
              <input className="field" value={username} onChange={e => setUsername(e.target.value)} autoComplete="username" autoFocus />
            </Field>
            <Field label="Password">
              <input className="field" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
            </Field>
            {error && <div className="rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-600">{error}</div>}
            <Button type="submit" loading={loading} className="w-full" icon={!loading ? <ArrowRight size={16} /> : undefined}>
              Sign in
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
