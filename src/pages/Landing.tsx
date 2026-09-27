import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Brain,
  ChevronRight,
  CloudSun,
  Droplet,
  Droplets,
  Gauge,
  Globe,
  Leaf,
  LineChart,
  Play,
  Radio,
  ShieldCheck,
  Sprout,
  Sun,
  Thermometer,
  Waves,
  Zap,
} from 'lucide-react';
import { forecastFor, inputsFromFarm } from '@/api/client';
import { GREEN_VALLEY, GREEN_VALLEY_CONDITIONS } from '@/data/farms';
import { recommend } from '@/engine/recommendation';
import { simulateSeason } from '@/engine/impact';
import { useApp } from '@/state/AppContext';
import { Badge, Card } from '@/components/ui';

/** Everything in the hero is computed by the real engine — nothing hard-coded. */
const demoInputs = inputsFromFarm(GREEN_VALLEY, GREEN_VALLEY_CONDITIONS);
const demoRec = recommend(demoInputs, {
  farmId: GREEN_VALLEY.id,
  forecast: forecastFor(demoInputs, GREEN_VALLEY.id),
});
const demoImpact = simulateSeason({
  input: demoInputs,
  weather: forecastFor(demoInputs, GREEN_VALLEY.id, 90),
  horizonDays: 90,
  initialSoilMoisture: demoInputs.soilMoisture,
});

const f = (n: number) => n.toLocaleString('en-IN');
const recHours = Math.floor(demoRec.durationMinutes / 60);
const recMinutes = demoRec.durationMinutes % 60;
const runTime = recHours > 0 ? `${recHours} h ${recMinutes} min` : `${recMinutes} min`;

const FEATURES = [
  {
    title: 'Water intelligence',
    body: 'Determines crop-specific irrigation requirements.',
    to: '/optimizer',
    icon: <Droplets size={18} />,
    tint: 'bg-sky-50 text-sky-600 ring-sky-100',
  },
  {
    title: 'Energy intelligence',
    body: 'Aligns pumping with renewable-energy availability.',
    to: '/solar',
    icon: <Sun size={18} />,
    tint: 'bg-solar-400/15 text-solar-600 ring-solar-400/30',
  },
  {
    title: 'Adaptive AI',
    body: 'Changes recommendations as conditions change.',
    to: '/simulator',
    icon: <Brain size={18} />,
    tint: 'bg-leaf-50 text-leaf-700 ring-leaf-100',
  },
  {
    title: 'Measurable impact',
    body: 'Calculates water, energy and cost savings.',
    to: '/impact',
    icon: <BarChart3 size={18} />,
    tint: 'bg-soil-100 text-soil-700 ring-soil-200',
  },
  {
    title: 'Farmer-first delivery',
    body: 'Simple, actionable advice in your language.',
    to: '/saarthi',
    icon: <Radio size={18} />,
    tint: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  },
];

const COMPARISON: [string, string, string][] = [
  ['Manual irrigation', 'Sensor-driven irrigation', 'Sensor + weather + crop + solar'],
  ['Fixed timing', 'Dynamic water recommendation', 'Dynamic water + energy scheduling'],
  ['Water-focused', 'Primarily water-focused', 'Water–energy co-optimization'],
  ['Limited explanation', 'Technical alerts', 'Explainable recommendations'],
  ['Monitoring', 'Monitoring', 'Decision + optimization'],
  ['Limited resource comparison', 'Basic metrics', 'Water + energy + cost'],
  ['No counterfactual', 'Limited comparison', 'Baseline vs optimized simulation'],
];

/** Glass chip used for the floating sensor cards in the hero constellation. */
function SensorCard({
  className = '',
  floatClass = 'kf-float',
  delay = '0s',
  tone = 'dark',
  label,
  value,
  unit,
  sub,
  icon,
}: {
  className?: string;
  floatClass?: string;
  delay?: string;
  tone?: 'dark' | 'amber' | 'violet' | 'green';
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  icon: React.ReactNode;
}) {
  const tones = {
    dark: 'bg-soil-900/55 ring-white/25',
    amber: 'bg-amber-500/45 ring-amber-200/50',
    violet: 'bg-violet-600/45 ring-violet-300/50',
    green: 'bg-leaf-700/60 ring-leaf-200/50',
  }[tone];
  return (
    <div
      style={{ animationDelay: delay }}
      className={`${floatClass} lg:absolute lg:z-10 rounded-2xl px-3.5 py-2.5 text-white shadow-xl ring-1 backdrop-blur-md ${tones} ${className}`}
    >
      <div className="flex items-center gap-2">
        <span className="opacity-90">{icon}</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest opacity-80">{label}</span>
      </div>
      <p className="mt-0.5 text-lg font-bold leading-tight">
        {value}
        {unit && <span className="ml-1 text-[10px] font-medium uppercase tracking-wide opacity-75">{unit}</span>}
      </p>
      {sub && <p className="text-[11px] opacity-80">{sub}</p>}
    </div>
  );
}

export default function Landing() {
  const { language, setLanguage } = useApp();
  const hi = language === 'hi';

  return (
    <div className="min-h-screen bg-white">
      {/* ------------------------------- NAV ------------------------------- */}
      <header className="sticky top-0 z-30 border-b border-soil-200/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-leaf-600 text-white">
              <Leaf size={18} />
            </span>
            <span className="text-lg font-bold tracking-tight text-soil-900">
              Krishi<span className="text-leaf-600">Flux</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-soil-600 lg:flex">
            <a href="#problem" className="hover:text-leaf-700">{hi ? 'समस्या' : 'Problem'}</a>
            <a href="#innovation" className="hover:text-leaf-700">{hi ? 'समाधान' : 'Solution'}</a>
            <a href="#impact" className="hover:text-leaf-700">{hi ? 'प्रभाव' : 'Impact'}</a>
            <a href="#proof" className="hover:text-leaf-700">{hi ? 'यह कैसे काम करता है' : 'How it works'}</a>
            <a href="#roadmap" className="hover:text-leaf-700">{hi ? 'रोडमैप' : 'Roadmap'}</a>
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLanguage(hi ? 'en' : 'hi')}
              className="inline-flex items-center gap-1.5 rounded-full border border-soil-200 px-3 py-1.5 text-xs font-semibold text-soil-700 hover:bg-soil-50"
              aria-pressed={hi}
            >
              <Globe size={13} /> {hi ? 'हिं' : 'EN'}
            </button>
            <Link to="/login" className="kf-btn-ghost hidden sm:inline-flex">
              {hi ? 'लॉग इन' : 'Log in'}
            </Link>
            <Link to="/dashboard" className="kf-btn-primary hidden md:inline-flex">
              {hi ? 'फार्म डैशबोर्ड खोलें' : 'Launch Farm Dashboard'} <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </header>

      {/* ------------------------------- HERO ------------------------------ */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-10 pt-12 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:pb-14 lg:pt-16">
          {/* Left: headline */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-leaf-50 px-3 py-1.5 text-xs font-semibold text-leaf-700 ring-1 ring-leaf-200">
              <Sprout size={13} /> {hi ? 'जलवायु-लचीली खेती के लिए AI' : 'AI for Climate-Resilient Farming'}
            </span>
            <h1 className="mt-5 text-5xl font-extrabold tracking-tight text-soil-900 sm:text-6xl">
              <span className="text-leaf-600">Krishi</span>Flux
            </h1>
            <p className="mt-3 text-3xl font-bold leading-tight tracking-tight text-soil-900 sm:text-4xl">
              {hi ? (
                <>
                  हर <span className="text-sky-500">बूँद</span>. हर <span className="text-solar-500">वॉट</span>. हर{' '}
                  <span className="text-leaf-600">फसल</span>.
                </>
              ) : (
                <>
                  Optimizing Every <span className="text-sky-500">Drop</span>. Every{' '}
                  <span className="text-solar-500">Watt</span>. Every <span className="text-leaf-600">Crop</span>.
                </>
              )}
            </p>
            <p className="mt-4 max-w-lg text-lg text-soil-600">
              {hi
                ? 'स्मार्ट, अधिक लचीली खेती के लिए AI-संचालित जल–ऊर्जा इंटेलिजेंस।'
                : 'AI-powered water–energy intelligence for smarter, more resilient farming.'}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/dashboard" className="kf-btn-primary px-5 py-3">
                <Gauge size={16} /> {hi ? 'फार्म डैशबोर्ड खोलें' : 'Launch Farm Dashboard'}
              </Link>
              <Link to="/simulator" className="kf-btn-secondary px-5 py-3">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-leaf-600 text-white">
                  <Play size={10} className="ml-0.5" />
                </span>
                {hi ? 'सिम्युलेटर देखें' : 'Explore Simulator'}
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-7 gap-y-3">
              {[
                { icon: <Sprout size={15} />, label: hi ? 'छोटे किसानों के लिए' : 'Built for Smallholder Farmers' },
                { icon: <ShieldCheck size={15} />, label: hi ? 'व्याख्या योग्य AI सिफारिशें' : 'Explainable AI Recommendations' },
                { icon: <LineChart size={15} />, label: hi ? 'मापने योग्य बचत' : 'Measurable Water, Energy & Cost Savings' },
              ].map((t) => (
                <span key={t.label} className="inline-flex items-center gap-2 text-xs font-medium text-soil-600">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-leaf-50 text-leaf-600">{t.icon}</span>
                  {t.label}
                </span>
              ))}
            </div>
          </div>

          {/* Right: the AI constellation over a farm-field gradient */}
          <div className="relative min-h-[560px] overflow-hidden rounded-3xl shadow-2xl ring-1 ring-soil-200/60">
            {/* Sky → field */}
            <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-emerald-100 to-emerald-700" />
            {/* Sun glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_8%,rgba(253,224,71,0.85),transparent_38%)]" />
            {/* Field rows */}
            <div className="absolute inset-x-0 bottom-0 top-1/2 bg-[repeating-linear-gradient(100deg,rgba(255,255,255,0.10)_0px,rgba(255,255,255,0.10)_10px,transparent_10px,transparent_26px)]" />
            {/* Soft vignette for card legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-soil-900/25 via-transparent to-transparent" />

            {/* Floating sensor cards — lg: constellation, small screens: flow grid.
                lg:absolute+inset-0: every child is absolutely positioned on lg,
                so without this the wrapper's height collapses and the percentage
                offsets all resolve to the top edge. */}
            <div className="relative z-10 grid grid-cols-2 gap-3 p-5 sm:mx-6 sm:mt-6 lg:absolute lg:inset-0 lg:mx-0 lg:mt-0 lg:block lg:p-0">
              <SensorCard
                className="lg:left-[7%] lg:top-[30%]"
                delay="0s"
                tone="dark"
                label={hi ? 'मिट्टी' : 'Soil'}
                value={`${demoInputs.soilMoisture}%`}
                unit={hi ? 'नमी' : 'Moisture'}
                icon={<Droplet size={15} />}
              />
              <SensorCard
                className="lg:left-[36%] lg:top-[6%]"
                delay="1.2s"
                tone="dark"
                label={hi ? 'मौसम' : 'Weather'}
                value={`${demoInputs.rainProbability}%`}
                sub={`${demoInputs.rainfallForecast} mm · ${demoInputs.temperature}°C`}
                icon={<CloudSun size={15} />}
              />
              <SensorCard
                className="lg:left-[6%] lg:top-[58%]"
                delay="2.1s"
                tone="green"
                label={hi ? 'फसल' : 'Crop'}
                value={hi ? 'टमाटर' : 'Tomato'}
                sub={hi ? 'फूल अवस्था' : 'Flowering Stage'}
                icon={<Leaf size={15} />}
              />
              <SensorCard
                className="lg:right-[6%] lg:top-[14%]"
                delay="0.6s"
                tone="amber"
                label={hi ? 'सौर' : 'Solar'}
                value={`${Math.round(demoInputs.solarAvailability * 100)}%`}
                unit={hi ? 'उपलब्धता' : 'Availability'}
                icon={<Sun size={15} />}
              />
              <SensorCard
                className="lg:right-[3%] lg:top-[48%]"
                delay="1.7s"
                tone="violet"
                label={hi ? 'पंप' : 'Pump'}
                value={runTime}
                unit={hi ? 'रनटाइम' : 'Runtime'}
                icon={<Zap size={15} />}
              />

              {/* Center AI node */}
              <div className="col-span-2 mt-2 flex justify-center lg:absolute lg:left-1/2 lg:top-1/2 lg:mt-0 lg:-translate-x-1/2 lg:-translate-y-1/2">
                <div className="relative grid h-44 w-44 place-items-center rounded-full border border-white/50 bg-white/20 text-center text-white ring-4 ring-white/40 backdrop-blur-md shadow-[0_0_100px_rgba(45,212,191,0.8)]">
                  <div>
                    <span className="mx-auto mb-1.5 grid h-10 w-10 place-items-center rounded-full bg-leaf-500 shadow-lg">
                      <Leaf size={20} />
                    </span>
                    <p className="text-base font-bold leading-tight">KrishiFlux AI</p>
                    <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] opacity-85">
                      {hi ? 'जल–ऊर्जा अनुकूलन' : 'Water–Energy Optimization'}
                    </p>
                  </div>
                  <span className="absolute inset-3 animate-pulse rounded-full ring-2 ring-white/30" />
                </div>
              </div>

              {/* Today's Farm Action — the live engine output, not a mock number */}
              <div className="col-span-2 lg:absolute lg:bottom-[4%] lg:right-[3%] lg:col-span-1 lg:mt-0 lg:w-72">
                <Link
                  to="/dashboard"
                  className="block rounded-2xl bg-white/95 p-4 shadow-2xl ring-1 ring-white/60 backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-soil-500">
                      {hi ? 'आज की फार्म कार्रवाई' : "Today's Farm Action"}
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-leaf-100 px-2 py-0.5 text-[10px] font-bold text-leaf-700">
                      ● {hi ? 'लाइव' : 'Live'}
                    </span>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-base font-bold text-sky-600">
                    <Droplets size={16} />
                    {demoRec.status === 'irrigate'
                      ? hi ? 'सिंचाई अनुशंसित' : 'Irrigation Recommended'
                      : hi ? 'आज सिंचाई आवश्यक नहीं' : 'No irrigation needed today'}
                    <ChevronRight size={15} className="text-soil-400" />
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-soil-600">
                    <span className="font-semibold text-soil-900">
                      {f(Math.round(demoRec.waterLitres))} L
                    </span>
                    <span>{runTime}</span>
                    <span className="font-medium text-leaf-700">{demoRec.recommendedTime}</span>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------- STATS STRIP --------------------------- */}
      <section className="border-y border-soil-200/70 bg-soil-50">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-[repeat(4,1fr)_auto] lg:items-center">
          {[
            { icon: <Droplets size={16} />, value: `${demoImpact.saved.waterPercent}%`, label: hi ? 'पानी बचाया' : 'Water Saved', bar: 'bg-sky-400', frac: Math.min(demoImpact.saved.waterPercent, 100) / 100 },
            { icon: <Zap size={16} />, value: `${demoImpact.saved.energyPercent}%`, label: hi ? 'ऊर्जा बचाई' : 'Energy Saved', bar: 'bg-solar-400', frac: Math.min(demoImpact.saved.energyPercent, 100) / 100 },
            { icon: <Leaf size={16} />, value: `${demoImpact.saved.irrigationEventsAvoided}`, label: hi ? 'कम सिंचाई घटनाएँ' : 'Fewer Irrigation Events', bar: 'bg-leaf-500', frac: Math.min(demoImpact.saved.irrigationEventsAvoided / Math.max(demoImpact.baseline.irrigationEvents, 1), 1) },
            { icon: <ShieldCheck size={16} />, value: `₹${f(demoImpact.saved.costInr)}`, label: hi ? 'लागत बचाई' : 'Cost Saved', bar: 'bg-emerald-500', frac: 0.8 },
          ].map((s) => (
            <div key={s.label}>
              <div className="flex items-center gap-2">
                <span className="text-leaf-600">{s.icon}</span>
                <span className="text-xl font-bold text-soil-900">{s.value}</span>
              </div>
              <p className="mt-0.5 text-xs font-medium text-soil-500">{s.label}</p>
              <div className="mt-1.5 h-1.5 w-full max-w-[140px] rounded-full bg-soil-200">
                <div className={`h-1.5 rounded-full ${s.bar}`} style={{ width: `${Math.max(s.frac * 100, 8)}%` }} />
              </div>
            </div>
          ))}
          <p className="text-[11px] leading-snug text-soil-400 lg:max-w-[170px]">
            {hi
              ? 'प्रोटोटाइप सिमुलेशन — क्षेत्र सत्यापन आवश्यक।'
              : 'Prototype simulation — field validation required. 90-day modelled season, Green Valley Farm.'}
          </p>
        </div>
      </section>

      {/* -------------------------- FEATURE CARDS -------------------------- */}
      <section id="proof" className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {FEATURES.map((p) => (
              <Link
                key={p.title}
                to={p.to}
                className="group rounded-2xl border border-soil-200/70 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <span className={`grid h-10 w-10 place-items-center rounded-xl ring-1 ${p.tint}`}>{p.icon}</span>
                  <ChevronRight size={16} className="mt-1 text-soil-300 transition group-hover:translate-x-0.5 group-hover:text-leaf-600" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-soil-900">{p.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-soil-500">{p.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------ PROBLEM ---------------------------- */}
      <section id="problem" className="border-t border-soil-200/70 bg-soil-50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-leaf-600">{hi ? 'समस्या' : 'The problem'}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-soil-900 sm:text-3xl">
            {hi
              ? 'पानी और ऊर्जा के निर्णय जुड़े हैं — लेकिन अलग-अलग प्रबंधित होते हैं'
              : 'Water and energy decisions are connected — but managed separately'}
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['Water scarcity', 'Groundwater tables are falling across irrigated belts while the same crop can be grown with less water.'],
              ['Inefficient irrigation', 'Fixed calendar schedules ignore soil moisture, crop stage and rainfall, causing over- or under-irrigation.'],
              ['Rising pumping energy', 'Every litre lifted has an energy cost, and grid tariffs and diesel prices keep changing.'],
              ['Unpredictable rainfall', 'A single untracked rain event can make the planned irrigation wasteful or unnecessary.'],
              ['Climate stress', 'Heatwaves, dry spells and abnormal rainfall shift crop water demand unpredictably.'],
              ['Thin decision support', 'Advice is either too technical to act on or too generic to trust.'],
            ].map(([title, body]) => (
              <div key={title} className="kf-card p-5">
                <h3 className="text-sm font-semibold text-soil-900">{title}</h3>
                <p className="mt-1.5 text-sm text-soil-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------- SOLUTION / INNOVATION ------------------ */}
      <section id="innovation" className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-leaf-600">{hi ? 'समाधान' : 'The solution'}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-soil-900 sm:text-3xl">
            Soil + Weather + Crop + Solar + Pump → one decision engine
          </h2>
          <p className="mt-3 max-w-3xl text-sm text-soil-600">
            KrishiFlux does not display solar information next to irrigation information. Solar availability changes the
            recommended pump schedule itself — the same water requirement is delivered in a different, more efficient
            window.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['Water–energy co-optimization', 'Water demand sets the run time. Solar availability sets when that run time happens.'],
              ['Dynamic irrigation', 'Recommendations recalculate on every soil, weather, crop or energy change.'],
              ['Explainable AI', 'Every decision states what, how much, when and why — with the contributing factors shown.'],
              ['Farm digital twin', 'A fully interactive simulator lets you run scenarios before spending a rupee.'],
              ['Baseline comparison', 'The same farm is modelled on a conventional fixed schedule for a measurable difference.'],
              ['Solar-aware scheduling', 'Low solar shifts the pump window instead of silently wasting grid energy.'],
            ].map(([title, body]) => (
              <div key={title} className="rounded-2xl bg-leaf-50 p-5 ring-1 ring-leaf-100">
                <h3 className="text-sm font-semibold text-leaf-800">{title}</h3>
                <p className="mt-1.5 text-sm text-soil-700">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------- IMPACT ---------------------------- */}
      <section id="impact" className="border-y border-soil-200/70 bg-soil-50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-leaf-600">{hi ? 'प्रोटोटाइप प्रभाव' : 'Prototype impact'}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-soil-900 sm:text-3xl">
            Green Valley Farm · 2 acres · Tomato
          </h2>
          <p className="mt-3 max-w-3xl text-sm text-soil-600">
            Generated by the impact engine over a {demoImpact.horizonDays}-day modelled horizon, comparing a
            conventional fixed-schedule baseline against KrishiFlux dynamic, solar-aware scheduling. Nothing here is
            hard-coded.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Water saved', value: `${f(Math.round(demoImpact.saved.waterLitres))} L`, sub: `${demoImpact.saved.waterPercent}% less water`, icon: <Droplets size={16} /> },
              { label: 'Energy saved', value: `${demoImpact.saved.energyKwh} kWh`, sub: `${demoImpact.saved.energyPercent}% less pumping energy`, icon: <Zap size={16} /> },
              { label: 'Cost saved', value: `₹${f(demoImpact.saved.costInr)}`, sub: `${demoImpact.saved.costPercent}% lower operating cost`, icon: <LineChart size={16} /> },
              { label: 'Irrigation events avoided', value: `${demoImpact.saved.irrigationEventsAvoided}`, sub: `${demoImpact.baseline.irrigationEvents} → ${demoImpact.optimized.irrigationEvents} events`, icon: <Gauge size={16} /> },
            ].map((m) => (
              <Card key={m.label} className="p-5">
                <div className="flex items-center justify-between">
                  <span className="kf-label">{m.label}</span>
                  <span className="text-leaf-600">{m.icon}</span>
                </div>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-soil-900">{m.value}</p>
                <p className="mt-1 text-xs text-soil-500">{m.sub}</p>
              </Card>
            ))}
          </div>
          <p className="mt-4 text-xs font-semibold text-solar-600">
            Prototype simulation — field validation required.
          </p>
          <div className="mt-4">
            <Link to="/impact" className="kf-btn-secondary">
              See the full baseline vs KrishiFlux breakdown <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* --------------------------- WHY KRISHIFLUX ------------------------ */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-leaf-600">Why KrishiFlux?</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-soil-900 sm:text-3xl">Conceptual differentiation</h2>
          <p className="mt-3 max-w-3xl text-sm text-soil-600">
            A conceptual comparison of decision-support approaches. It does not describe any specific product.
          </p>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[680px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left">
                  <th className="rounded-tl-xl border border-soil-200 bg-soil-100 px-4 py-3 font-semibold text-soil-700">Conventional</th>
                  <th className="border-y border-soil-200 bg-soil-100 px-4 py-3 font-semibold text-soil-700">Basic smart irrigation</th>
                  <th className="rounded-tr-xl border border-leaf-200 bg-leaf-50 px-4 py-3 font-semibold text-leaf-800">KrishiFlux</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map(([a, b, c], i) => (
                  <tr key={a}>
                    <td className={`border-x border-b border-soil-200 bg-white px-4 py-3 text-soil-600 ${i === COMPARISON.length - 1 ? 'rounded-bl-xl' : ''}`}>{a}</td>
                    <td className="border-x border-b border-soil-200 bg-white px-4 py-3 text-soil-600">{b}</td>
                    <td className={`border-x border-b border-leaf-200 bg-leaf-50/60 px-4 py-3 font-medium text-leaf-900 ${i === COMPARISON.length - 1 ? 'rounded-br-xl' : ''}`}>{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ---------------------------- ARCHITECTURE ------------------------- */}
      <section className="border-y border-soil-200/70 bg-soil-50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-leaf-600">Architecture</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-soil-900 sm:text-3xl">
            Business logic is fully separated from the UI
          </h2>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Card title="Decision engine" subtitle="src/engine — pure TypeScript, no UI imports">
              <ul className="space-y-1.5 text-sm text-soil-600">
                <li>• Water balance (ET0, Kc, deficit, efficiency)</li>
                <li>• Energy model (discharge, kWh, solar split)</li>
                <li>• Solar scheduler (hourly curve, best window)</li>
                <li>• Recommendation + explainability layer</li>
                <li>• Impact engine (baseline vs optimized season)</li>
              </ul>
            </Card>
            <Card title="Service layer" subtitle="src/api + server — the REST contract, in-process or over HTTP">
              <ul className="space-y-1.5 text-sm text-soil-600">
                <li>• POST /api/recommendation</li>
                <li>• POST /api/optimize · POST /api/simulate</li>
                <li>• GET /api/weather · /api/solar · /api/farms</li>
                <li>• GET /api/impact · /api/analytics</li>
                <li>• POST /api/crop-health (simulated layer)</li>
              </ul>
            </Card>
            <Card title="Resilience" subtitle="Built for rural connectivity">
              <ul className="space-y-1.5 text-sm text-soil-600">
                <li>• Last recommendation cached locally</li>
                <li>• Offline mode keeps advice readable</li>
                <li>• Input validation before the engine runs</li>
                <li>• Fault injection to demo error handling</li>
                <li>• No stack traces ever shown to the user</li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* ------------------------- BUSINESS + ROADMAP ---------------------- */}
      <section id="roadmap" className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-leaf-600">Business model</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-soil-900">How this scales</h2>
              <div className="mt-5 space-y-3">
                {[
                  ['Farmer', 'Affordable / free basic advisory — the recommendation and the pump window.'],
                  ['FPO / cooperative', 'Subscription dashboard for fleets: irrigation status, savings and climate alerts.'],
                  ['Enterprise', 'Resource optimization and analytics for agri-business and irrigation programs.'],
                  ['Ecosystem', 'Future integration with solar pump providers, irrigation companies, IoT vendors and agri organizations.'],
                ].map(([t, b]) => (
                  <div key={t} className="kf-card p-4">
                    <h3 className="text-sm font-semibold text-soil-900">{t}</h3>
                    <p className="mt-1 text-sm text-soil-600">{b}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-leaf-600">Roadmap</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-soil-900">From prototype to scale</h2>
              <ol className="mt-5 space-y-3">
                {[
                  ['Phase 1 — Software prototype', 'Simulation + AI decision engine. (This build.)'],
                  ['Phase 2 — Pilot farms', 'Real sensors + real weather + field validation.'],
                  ['Phase 3 — Integration', 'Real pump telemetry + solar pump control.'],
                  ['Phase 4 — Scale', 'FPOs, districts, multiple crops, multiple Indian languages.'],
                ].map(([t, b], i) => (
                  <li key={t} className="flex gap-4">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-leaf-600 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-soil-900">{t}</span>
                      <span className="block text-sm text-soil-600">{b}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <div className="mt-6 rounded-2xl bg-leaf-600 p-5 text-white">
                <p className="text-sm font-semibold">KrishiFlux doesn't just tell farmers when to irrigate.</p>
                <p className="mt-1 text-sm text-leaf-50">
                  It finds the most resource-efficient irrigation decision by jointly optimizing crop water demand and
                  renewable-energy availability.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to="/dashboard" className="kf-btn bg-white text-leaf-700 hover:bg-leaf-50">
                    Launch dashboard
                  </Link>
                  <Link to="/simulator" className="kf-btn border border-white/40 text-white hover:bg-white/10">
                    Open simulator
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-soil-200/70 bg-soil-50">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs text-soil-500 sm:px-6">
          <p className="flex items-center gap-2 text-sm font-semibold text-soil-700">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-leaf-600 text-white">
              <Leaf size={12} />
            </span>
            KrishiFlux — Optimizing Every Drop. Every Watt. Every Crop.
          </p>
          <p>
            Prototype simulation — field validation required. Weather, solar, sensor and crop-health data in this build
            are simulated; water, energy and cost figures are modelled estimates. No yield, income or disease-diagnosis
            claims are made.
          </p>
        </div>
      </footer>
    </div>
  );
}
