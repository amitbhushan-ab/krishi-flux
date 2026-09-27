import React from 'react';
import { Clock, Droplets, Info, ShieldAlert, Sun, Zap } from 'lucide-react';
import { formatDuration } from '@/engine/energy';
import { pick } from '@/i18n';
import type { IrrigationStatus, Language, Recommendation } from '@/lib/types';
import { Badge, Callout, ProgressBar } from '@/components/ui';

export const STATUS_TONE: Record<IrrigationStatus, 'leaf' | 'solar' | 'sky' | 'soil'> = {
  irrigate: 'leaf',
  delay: 'solar',
  skip: 'sky',
  monitor: 'soil',
};

export const STATUS_LABEL_KEY = {
  irrigate: 'statusIrrigate',
  delay: 'statusDelay',
  skip: 'statusSkip',
  monitor: 'statusMonitor',
} as const;

/** Dominant "what should I do today" answer. */
export function StatusBanner({
  rec,
  language,
  compact = false,
}: {
  rec: Recommendation;
  language: Language;
  compact?: boolean;
}) {
  const tone = STATUS_TONE[rec.status];
  const styles = {
    leaf: 'bg-leaf-600 text-white',
    solar: 'bg-solar-500 text-white',
    sky: 'bg-sky-500 text-white',
    soil: 'bg-soil-400 text-white',
  }[tone];

  return (
    <div className={`rounded-2xl p-5 sm:p-6 ${styles}`}>
      <p className="text-xs font-semibold uppercase tracking-widest opacity-80">
        {language === 'hi' ? 'आज का कृषि कार्य' : "Today's Farm Action"}
      </p>
      <p className={`mt-2 font-semibold ${compact ? 'text-lg' : 'text-2xl sm:text-3xl'}`}>
        {pick(
          {
            irrigate: { en: 'Irrigation recommended', hi: 'सिंचाई की सलाह है' },
            delay: { en: 'Delay irrigation', hi: 'सिंचाई टालें' },
            skip: { en: 'No irrigation needed', hi: 'सिंचाई की आवश्यकता नहीं' },
            monitor: { en: 'Monitor — no irrigation needed', hi: 'निगरानी रखें — सिंचाई नहीं' },
          }[rec.status],
          language,
        )}
      </p>
      <p className="mt-2 max-w-3xl text-sm opacity-90">{pick(rec.reason, language)}</p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric
          icon={<Droplets size={14} />}
          label={language === 'hi' ? 'पानी की आवश्यकता' : 'Water required'}
          value={rec.required ? `${Math.round(rec.waterLitres).toLocaleString('en-IN')} L` : '—'}
          sub={rec.required ? `${rec.depthMm} mm` : undefined}
        />
        <Metric
          icon={<Clock size={14} />}
          label={language === 'hi' ? 'पंप अवधि' : 'Pump duration'}
          value={rec.required ? formatDuration(rec.durationMinutes) : '—'}
        />
        <Metric
          icon={<Sun size={14} />}
          label={language === 'hi' ? 'सुझाया समय' : 'Recommended window'}
          value={rec.required ? rec.recommendedTime : '—'}
          sub={
            rec.solar.deferToNextDay
              ? language === 'hi'
                ? 'कल के सौर समय में स्थानांतरित'
                : 'Shifted to tomorrow'
              : undefined
          }
        />
        <Metric
          icon={<Zap size={14} />}
          label={language === 'hi' ? 'सौर उपयुक्तता' : 'Solar suitability'}
          value={rec.solarSuitability}
          sub={`${Math.round(rec.solar.recommendedWindow.avgSolarFraction * 100)}% in window`}
        />
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white/15 p-3 backdrop-blur">
      <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide opacity-80">
        {icon}
        {label}
      </span>
      <span className="mt-1 block text-lg font-semibold leading-tight">{value}</span>
      {sub && <span className="mt-0.5 block text-[11px] opacity-80">{sub}</span>}
    </div>
  );
}

/** WHAT / HOW MUCH / WHEN / WHY explainer. */
export function ExplainablePanel({
  rec,
  language,
  showFactors = true,
}: {
  rec: Recommendation;
  language: Language;
  showFactors?: boolean;
}) {
  const hi = language === 'hi';
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <QA
          q={hi ? 'क्या करें?' : 'What?'}
          a={
            rec.required
              ? hi
                ? `पंप चलाएं और खेत को ${rec.depthMm} मिमी गहराई तक पानी दें।`
                : `Run the pump and apply ${rec.depthMm} mm of water to the field.`
              : hi
                ? 'आज पंप न चलाएं; मौसम और मिट्टी की नमी संतुलित है।'
                : 'Do not run the pump today — soil moisture and rainfall are balanced.'
          }
        />
        <QA
          q={hi ? 'कितना?' : 'How much?'}
          a={
            rec.required
              ? `${Math.round(rec.waterLitres).toLocaleString('en-IN')} ${hi ? 'लीटर' : 'litres'} (${rec.depthMm} ${
                  hi ? 'मिमी' : 'mm'
                }, ${rec.water.volumeCubicMetres} m³) · ${rec.energy.durationMinutes} ${hi ? 'मिनट' : 'minutes'}`
              : hi
                ? 'कोई पानी आवश्यक नहीं'
                : 'No water required'
          }
        />
        <QA
          q={hi ? 'कब?' : 'When?'}
          a={
            rec.required
              ? `${rec.recommendedTime} · ${
                  rec.solar.deferToNextDay
                    ? hi
                      ? 'कल का सौर विंडो'
                      : "tomorrow's solar window"
                    : hi
                      ? 'आज का सौर विंडो'
                      : "today's solar window"
                }`
              : '—'
          }
        />
        <QA
          q={hi ? 'क्यों?' : 'Why?'}
          a={pick(rec.reason, language)}
        />
      </div>

      {showFactors && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Info size={15} className="text-leaf-600" />
            <h3 className="text-sm font-semibold text-soil-900">
              {hi ? 'योगदान देने वाले कारक' : 'Contributing factors'}
            </h3>
            <span className="text-xs text-soil-400">
              {hi ? 'कोई छिपा AI संभावना नहीं — वास्तविक माप' : 'Real measurements, not ML probabilities'}
            </span>
          </div>
          <div className="space-y-3">
            {rec.factors.map((f) => (
              <ProgressBar
                key={f.key}
                label={pick(f.label, language)}
                value={f.value}
                tone={f.direction === 'down' ? 'solar' : f.direction === 'up' ? 'leaf' : 'soil'}
                sublabel={pick(f.detail, language)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QA({ q, a }: { q: string; a: string }) {
  return (
    <div className="rounded-xl border border-soil-200 bg-soil-50/70 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-leaf-700">{q}</p>
      <p className="mt-1.5 text-sm text-soil-700">{a}</p>
    </div>
  );
}

export function EnergySplit({ rec }: { rec: Recommendation }) {
  const total = rec.energy.energyRequiredKwh;
  const solarPct = total > 0 ? (rec.solarEnergyKwh / total) * 100 : 0;
  return (
    <div className="space-y-3">
      <div className="flex h-3 overflow-hidden rounded-full bg-soil-100" role="img" aria-label={`${Math.round(solarPct)}% solar`}>
        <div className="bg-solar-500" style={{ width: `${solarPct}%` }} />
        <div className="bg-sky-500" style={{ width: `${100 - solarPct}%` }} />
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <Split label="Solar energy used" value={`${rec.solarEnergyKwh} kWh`} tone="text-solar-600" />
        <Split label="Grid energy required" value={`${rec.gridEnergyKwh} kWh`} tone="text-sky-500" />
        <Split label="Total required" value={`${rec.energyRequirementKwh} kWh`} tone="text-soil-900" />
      </div>
    </div>
  );
}

function Split({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-soil-200 p-3">
      <p className="text-xs text-soil-500">{label}</p>
      <p className={`mt-1 text-base font-semibold tabular-nums ${tone}`}>{value}</p>
    </div>
  );
}

export function AssumptionsPanel({
  rec,
  energyPrice,
  baselineFrequency,
  language,
}: {
  rec: Recommendation;
  energyPrice: number;
  baselineFrequency: number;
  language: Language;
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <ShieldAlert size={15} className="text-leaf-600" />
          <h3 className="text-sm font-semibold text-soil-900">How is this calculated?</h3>
        </div>
        <dl className="mt-3 divide-y divide-soil-100 rounded-xl border border-soil-200">
          {[
            ...rec.water.assumptions,
            { label: 'Pump discharge factor', value: `${rec.energy.dischargeLitresPerHour.toLocaleString('en-IN')} L/h` },
            { label: 'Pump energy load', value: `${rec.energy.effectiveLoadKw} kW` },
            { label: 'Energy price', value: `₹${energyPrice} per kWh` },
            { label: 'Baseline irrigation frequency', value: `every ${baselineFrequency} days` },
            { label: 'Pump window solar share', value: `${Math.round(rec.solar.recommendedWindow.avgSolarFraction * 100)}%` },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-4 px-4 py-2.5">
              <dt className="text-sm text-soil-500">{row.label}</dt>
              <dd className="text-right text-sm font-medium tabular-nums text-soil-900">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="space-y-2">
        {rec.modelNotes.map((n, i) => (
          <Callout key={i} tone="solar" title={i === 0 ? 'Prototype simulation — field validation required.' : undefined}>
            {pick(n, language)}
          </Callout>
        ))}
      </div>
    </div>
  );
}

export function SuitabilityBadge({ value }: { value: Recommendation['solarSuitability'] }) {
  const map = {
    excellent: { tone: 'leaf' as const, hi: 'उत्कृष्ट' },
    good: { tone: 'sky' as const, hi: 'उपयुक्त' },
    moderate: { tone: 'soil' as const, hi: 'मध्यम' },
    poor: { tone: 'danger' as const, hi: 'कमज़ोर' },
  }[value];
  return <Badge tone={map.tone}>{value} · {map.hi}</Badge>;
}
