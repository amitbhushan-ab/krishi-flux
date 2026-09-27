import React, { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  CloudSun,
  FlaskConical,
  LayoutDashboard,
  Leaf,
  Menu,
  MessageSquare,
  Settings as SettingsIcon,
  ShieldAlert,
  Sun,
  TrendingDown,
  Users,
  Waves,
  Wifi,
  WifiOff,
  X,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '@/state/AppContext';
import { getCrop, stageMeta } from '@/data/crops';
import { Badge } from '@/components/ui';

interface NavItem {
  to: string;
  key: Parameters<ReturnType<typeof useApp>['t']>[0];
  icon: React.ReactNode;
}

const NAV: NavItem[] = [
  { to: '/dashboard', key: 'navDashboard', icon: <LayoutDashboard size={18} /> },
  { to: '/simulator', key: 'navSimulator', icon: <FlaskConical size={18} /> },
  { to: '/optimizer', key: 'navOptimizer', icon: <Waves size={18} /> },
  { to: '/weather', key: 'navWeather', icon: <CloudSun size={18} /> },
  { to: '/solar', key: 'navSolar', icon: <Sun size={18} /> },
  { to: '/crop-health', key: 'navCropHealth', icon: <Leaf size={18} /> },
  { to: '/climate-risk', key: 'navClimateRisk', icon: <ShieldAlert size={18} /> },
  { to: '/saarthi', key: 'navSaarthi', icon: <MessageSquare size={18} /> },
  { to: '/impact', key: 'navImpact', icon: <TrendingDown size={18} /> },
  { to: '/analytics', key: 'navAnalytics', icon: <BarChart3 size={18} /> },
  { to: '/fpo', key: 'navFpo', icon: <Users size={18} /> },
  { to: '/settings', key: 'navSettings', icon: <SettingsIcon size={18} /> },
];

function ConnectivityBadge() {
  const { connectivity, setConnectivity, lastSyncedAt, t } = useApp();

  const map = {
    online: { tone: 'leaf' as const, icon: <Wifi size={13} />, label: { en: 'Synced', hi: 'सिंक' } },
    offline: { tone: 'danger' as const, icon: <WifiOff size={13} />, label: { en: 'Offline — cached advice', hi: 'ऑफ़लाइन — कैश सलाह' } },
    syncing: { tone: 'solar' as const, icon: <RefreshCw size={13} />, label: { en: 'Sync pending', hi: 'सिंक बाकी' } },
  }[connectivity];

  const next = connectivity === 'offline' ? 'syncing' : 'offline';
  return (
    <button
      type="button"
      onClick={() => setConnectivity(next)}
      title={lastSyncedAt ? `Last sync ${new Date(lastSyncedAt).toLocaleTimeString()}` : t('connectivity')}
      className="inline-flex items-center gap-1.5"
    >
      <Badge tone={map.tone}>
        {map.icon}
        <span className="hidden sm:inline">{map.label.en}</span>
      </Badge>
    </button>
  );
}

function LanguageSwitch() {
  const { language, setLanguage } = useApp();
  return (
    <div className="inline-flex rounded-xl border border-soil-200 bg-white p-0.5">
      {(['en', 'hi'] as const).map((lng) => (
        <button
          key={lng}
          type="button"
          onClick={() => setLanguage(lng)}
          className={language === lng ? 'kf-tab-active' : 'kf-tab'}
          aria-pressed={language === lng}
        >
          {lng === 'en' ? 'EN' : 'हिं'}
        </button>
      ))}
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { t, language } = useApp();
  return (
    <nav className="flex h-full flex-col gap-1 px-3 py-4">
      <Link to="/" onClick={onNavigate} className="mb-4 flex items-center gap-2.5 px-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-leaf-600 text-white">
          <Waves size={18} />
        </span>
        <span>
          <span className="block text-sm font-bold tracking-tight text-soil-900">{t('appName')}</span>
          <span className="block text-[11px] text-soil-500">
            {language === 'hi' ? 'जल–ऊर्जा सह-अनुकूलन' : 'Water–energy co-optimization'}
          </span>
        </span>
      </Link>
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              isActive ? 'bg-leaf-50 text-leaf-700' : 'text-soil-600 hover:bg-soil-100'
            }`
          }
        >
          {item.icon}
          {t(item.key)}
        </NavLink>
      ))}
      <div className="mt-auto rounded-xl bg-soil-100/70 p-3 text-xs text-soil-600">
        <p className="font-semibold text-soil-700">{t('prototypeNote')}</p>
      </div>
    </nav>
  );
}

export default function Layout() {
  const { farm, language, loading, t, error } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const crop = getCrop(farm.crop);

  return (
    <div className="min-h-screen bg-soil-50">
      <div className="mx-auto flex w-full max-w-[1600px]">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-soil-200/70 bg-white lg:block">
          <SidebarContent />
        </aside>

        {/* Mobile drawer */}
        {menuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-soil-900/40" onClick={() => setMenuOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl">
              <button
                type="button"
                className="absolute right-3 top-3 rounded-lg p-2 text-soil-500 hover:bg-soil-100"
                onClick={() => setMenuOpen(false)}
                aria-label="Close navigation"
              >
                <X size={18} />
              </button>
              <SidebarContent onNavigate={() => setMenuOpen(false)} />
            </div>
          </div>
        )}

        <div className="min-w-0 flex-1">
          {/* Header */}
          <header className="sticky top-0 z-30 border-b border-soil-200/70 bg-white/90 backdrop-blur">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
              <button
                type="button"
                className="rounded-lg p-2 text-soil-600 hover:bg-soil-100 lg:hidden"
                onClick={() => setMenuOpen(true)}
                aria-label="Open navigation"
              >
                <Menu size={20} />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-sm font-semibold text-soil-900">{farm.name}</h1>
                  {loading && (
                    <span className="inline-flex items-center gap-1 text-xs text-leaf-600">
                      <Activity size={12} className="animate-pulse" />
                      {t('recalculated')}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-soil-500">
                  {farm.areaAcres} acres · {crop.label[language]} · {stageMeta[farm.cropStage][language]} ·{' '}
                  {farm.village}, {farm.district}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ConnectivityBadge />
                <span className="hidden text-xs text-soil-400 sm:inline" aria-hidden>
                  |
                </span>
                <LanguageSwitch />
              </div>
            </div>
            {error && location.pathname !== '/settings' && (
              <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 sm:px-6">
                {error} — showing the last available recommendation.
              </div>
            )}
          </header>

          <main className="px-4 py-6 sm:px-6 lg:py-8">
            <Outlet />
          </main>

          <footer className="border-t border-soil-200/70 px-4 py-6 text-xs text-soil-500 sm:px-6">
            <p className="font-medium text-soil-600">
              {t('appName')} — {t('tagline')}
            </p>
            <p className="mt-1">
              {t('prototypeNote')} Modelled estimates for water, energy and cost only. No yield or income claims.
            </p>
          </footer>
        </div>
      </div>

    </div>
  );
}
