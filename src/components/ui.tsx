import React from 'react';

export type Tone = 'leaf' | 'sky' | 'solar' | 'soil' | 'danger' | 'neutral';

const toneClasses: Record<Tone, { bg: string; text: string; ring: string; bar: string }> = {
  leaf: { bg: 'bg-leaf-50', text: 'text-leaf-700', ring: 'ring-leaf-200', bar: 'bg-leaf-600' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-500', ring: 'ring-sky-200', bar: 'bg-sky-500' },
  solar: { bg: 'bg-solar-400/15', text: 'text-solar-600', ring: 'ring-solar-400/40', bar: 'bg-solar-500' },
  soil: { bg: 'bg-soil-100', text: 'text-soil-700', ring: 'ring-soil-200', bar: 'bg-soil-500' },
  danger: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-200', bar: 'bg-red-500' },
  neutral: { bg: 'bg-white', text: 'text-soil-700', ring: 'ring-soil-200', bar: 'bg-soil-400' },
};

export function Card({
  title,
  subtitle,
  action,
  children,
  className = '',
  padded = true,
}: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section className={`kf-card ${className}`}>
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-soil-200/60 px-5 py-4">
          <div>
            {title && <h2 className="text-base font-semibold text-soil-900">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-soil-500">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  unit,
  hint,
  tone = 'neutral',
  icon,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  hint?: React.ReactNode;
  tone?: Tone;
  icon?: React.ReactNode;
}) {
  const t = toneClasses[tone];
  return (
    <div className="kf-card p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="kf-label">{label}</span>
        {icon && <span className={`${t.text}`}>{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tracking-tight text-soil-900">{value}</span>
        {unit && <span className="text-sm text-soil-500">{unit}</span>}
      </div>
      {hint && <div className={`mt-2 inline-flex rounded-lg px-2 py-1 text-xs font-medium ${t.bg} ${t.text}`}>{hint}</div>}
    </div>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: Tone }) {
  const t = toneClasses[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${t.bg} ${t.text} ${t.ring}`}>
      {children}
    </span>
  );
}

export function ProgressBar({
  value,
  tone = 'leaf',
  label,
  sublabel,
  showValue = true,
}: {
  value: number;
  tone?: Tone;
  label?: string;
  sublabel?: string;
  showValue?: boolean;
}) {
  const t = toneClasses[tone];
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div>
      {(label || showValue) && (
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          {label && <span className="text-sm font-medium text-soil-700">{label}</span>}
          {showValue && <span className="text-xs font-semibold tabular-nums text-soil-600">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-soil-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={`h-full rounded-full ${t.bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      {sublabel && <p className="mt-1 text-xs text-soil-500">{sublabel}</p>}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  hint,
  tone = 'leaf',
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  hint?: string;
  tone?: Tone;
}) {
  const t = toneClasses[tone];
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-soil-700">{label}</span>
        <span className={`rounded-md px-2 py-0.5 text-sm font-semibold tabular-nums ${t.bg} ${t.text}`}>
          {value}
          {unit}
        </span>
      </div>
      <input
        className="mt-2"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
      {hint && <p className="mt-1 text-xs text-soil-500">{hint}</p>}
    </label>
  );
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-soil-700">{label}</span>
      <select className="kf-input mt-1.5" value={value} onChange={(e) => onChange(e.target.value as T)} aria-label={label}>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <p className="mt-1 text-xs text-soil-500">{hint}</p>}
    </label>
  );
}

export function Callout({
  tone = 'sky',
  title,
  children,
  icon,
}: {
  tone?: Tone;
  title?: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  const t = toneClasses[tone];
  return (
    <div className={`rounded-2xl p-4 ring-1 ${t.bg} ${t.ring}`}>
      {title && (
        <div className={`flex items-center gap-2 text-sm font-semibold ${t.text}`}>
          {icon}
          {title}
        </div>
      )}
      {children && <div className="mt-1.5 text-sm text-soil-700">{children}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-semibold text-red-700">Request failed</p>
      <p className="mt-1 text-sm text-red-600">{message}</p>
      {onRetry && (
        <button type="button" className="kf-btn-secondary mt-3" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function Skeleton({ className = 'h-6 w-full' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-soil-100 ${className}`} />;
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-soil-200 bg-white px-4 py-3 text-left hover:bg-soil-50"
      aria-pressed={checked}
    >
      <span>
        <span className="block text-sm font-medium text-soil-800">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-soil-500">{hint}</span>}
      </span>
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${checked ? 'bg-leaf-600' : 'bg-soil-300'}`}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </span>
    </button>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5">
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-widest text-leaf-600">{eyebrow}</p>}
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-soil-900 sm:text-3xl">{title}</h1>
      {description && <p className="mt-1.5 max-w-3xl text-sm text-soil-600">{description}</p>}
    </div>
  );
}

export function KeyValue({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="divide-y divide-soil-100">
      {items.map((i) => (
        <div key={i.label} className="flex items-center justify-between gap-4 py-2">
          <dt className="text-sm text-soil-500">{i.label}</dt>
          <dd className="text-right text-sm font-medium tabular-nums text-soil-900">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}
