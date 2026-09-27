import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, ShieldCheck, Waves } from 'lucide-react';
import { useApp } from '@/state/AppContext';
import { Callout } from '@/components/ui';
import type { Language, Role } from '@/lib/types';

/**
 * Basic local authentication.
 *
 * The prototype does not ship a credential store: the form validates input
 * shape, records a session flag and routes into the app. In production this
 * screen would call an auth service with hashed credentials and an HTTP-only
 * session cookie — no secrets are ever held in the frontend bundle.
 */
export default function Login() {
  const navigate = useNavigate();
  const { language, setLanguage } = useApp();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('Ramesh Patil');
  const [identifier, setIdentifier] = useState('+91 98220 00000');
  const [role, setRole] = useState<Role>('farmer');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === 'signup' && name.trim().length < 2) {
      setError('Please enter your name.');
      return;
    }
    const looksLikePhone = /^[+]?[\d\s-]{10,15}$/.test(identifier.trim());
    const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier.trim());
    if (!looksLikePhone && !looksLikeEmail) {
      setError('Enter a valid mobile number or email address.');
      return;
    }

    setBusy(true);
    window.setTimeout(() => {
      try {
        localStorage.setItem(
          'krishiflux.session.v1',
          JSON.stringify({ name, identifier, role, language, at: new Date().toISOString() }),
        );
      } catch {
        /* session persistence is best-effort */
      }
      navigate(role === 'fpo' || role === 'admin' ? '/fpo' : '/dashboard');
    }, 400);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-soil-500 hover:text-leaf-700">
          <ArrowLeft size={15} /> Back to home
        </Link>
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-leaf-600 text-white">
            <Waves size={20} />
          </span>
          <span className="text-lg font-bold tracking-tight text-soil-900">KrishiFlux</span>
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-soil-900">
          {mode === 'login' ? 'Sign in to your farm' : 'Create your farm account'}
        </h1>
        <p className="mt-1.5 text-sm text-soil-600">
          Water–energy co-optimization needs your farm profile. No API keys or credentials are stored in this prototype.
        </p>

        <form className="mt-7 space-y-4" onSubmit={submit} noValidate>
          {mode === 'signup' && (
            <label className="block">
              <span className="text-sm font-medium text-soil-700">Full name</span>
              <input className="kf-input mt-1.5" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ramesh Patil" />
            </label>
          )}

          <label className="block">
            <span className="text-sm font-medium text-soil-700">Mobile number or email</span>
            <input
              className="kf-input mt-1.5"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="+91 98220 00000"
              autoComplete="username"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-soil-700">I am a</span>
            <select className="kf-input mt-1.5" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="farmer">Farmer</option>
              <option value="fpo">FPO / cooperative manager</option>
              <option value="admin">Administrator</option>
            </select>
          </label>

          <div>
            <span className="text-sm font-medium text-soil-700">Preferred language</span>
            <div className="mt-1.5 inline-flex rounded-xl border border-soil-200 bg-white p-0.5">
              {(['en', 'hi'] as Language[]).map((lng) => (
                <button
                  key={lng}
                  type="button"
                  onClick={() => setLanguage(lng)}
                  className={language === lng ? 'kf-tab-active' : 'kf-tab'}
                >
                  {lng === 'en' ? 'English' : 'हिंदी'}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          <button type="submit" className="kf-btn-primary w-full" disabled={busy}>
            <Lock size={15} /> {busy ? 'Signing in…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>

          <button
            type="button"
            className="w-full text-center text-sm text-leaf-700 hover:underline"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError(null);
            }}
          >
            {mode === 'login' ? 'Need an account? Sign up' : 'Already registered? Sign in'}
          </button>
        </form>

        <p className="mt-6 text-xs text-soil-500">
          Demo build: any valid-format mobile number or email signs you in and routes to your dashboard.
        </p>
      </div>

      <div className="hidden flex-col justify-center gap-4 bg-leaf-700 px-12 py-12 text-white lg:flex">
        <ShieldCheck size={28} />
        <h2 className="text-2xl font-semibold">Built for proof, not promises</h2>
        <p className="max-w-md text-sm text-leaf-50">
          Every recommendation answers four questions — what to do, how much water, when to pump, and why. Solar
          availability changes the pump window, not just a number on a chart.
        </p>
        <div className="mt-2 space-y-2 text-sm text-leaf-50">
          <p>• Transparent water balance: ET0 × Kc, effective rainfall, soil texture</p>
          <p>• Energy model with solar / grid split per pumping window</p>
          <p>• Baseline vs KrishiFlux season simulation with water, energy and cost deltas</p>
          <p>• Offline-tolerant advisory with locally cached recommendations</p>
        </div>
        <Callout tone="solar" title="Prototype simulation">
          Weather, solar, sensor and crop-health data are simulated in this build. Water, energy and cost figures are
          modelled estimates — field validation is required.
        </Callout>
      </div>
    </div>
  );
}
