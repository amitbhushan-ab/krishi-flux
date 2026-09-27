import React from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { HourlySolar, ImpactResult, PumpWindow, WeatherDay } from '@/lib/types';

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="grid h-56 place-items-center rounded-xl border border-dashed border-soil-200 text-sm text-soil-500">
      {message}
    </div>
  );
}

const axisStyle = { fontSize: 11, fill: '#78716c' } as const;

export function SolarDemandChart({
  curve,
  window: win,
}: {
  curve: HourlySolar[];
  window: PumpWindow;
}) {
  if (!curve.length) return <ChartEmpty message="No solar data available." />;
  const data = curve.map((c) => ({
    ...c,
    solarPct: Math.round(c.solarFraction * 100),
  }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e1d8" vertical={false} />
          <XAxis dataKey="label" tick={axisStyle} interval={2} tickLine={false} axisLine={false} />
          <YAxis yAxisId="pct" tick={axisStyle} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
          <YAxis yAxisId="kw" orientation="right" tick={axisStyle} tickLine={false} axisLine={false} unit=" kW" />
          <Tooltip
            contentStyle={{ borderRadius: 12, border: '1px solid #e7e1d8', fontSize: 12 }}
            formatter={(value: number, name: string) =>
              name === 'Solar availability' ? [`${value}%`, name] : [`${value} kW`, name]
            }
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {win && (
            <ReferenceArea
              yAxisId="pct"
              x1={hourToLabel(win.startHour)}
              x2={hourToLabel(win.endHour)}
              fill="#339c5c"
              fillOpacity={0.12}
              stroke="#339c5c"
              strokeOpacity={0.35}
              label={{ value: 'Pump window', position: 'insideTop', fontSize: 11, fill: '#237d48' }}
            />
          )}
          <Area
            yAxisId="pct"
            type="monotone"
            dataKey="solarPct"
            name="Solar availability"
            stroke="#ef9f16"
            fill="#f5b544"
            fillOpacity={0.35}
            strokeWidth={2}
          />
          <Line
            yAxisId="kw"
            type="stepAfter"
            dataKey="pumpDemandKwh"
            name="Pump load"
            stroke="#2b8bc7"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function hourToLabel(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function ForecastChart({ days }: { days: WeatherDay[] }) {
  if (!days.length) return <ChartEmpty message="No forecast available." />;
  const data = days.map((d) => ({
    label: new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' }),
    rain: d.rainProbability,
    rainfall: d.rainfall,
    temp: Math.round(d.temperature),
    solar: Math.round(d.solarAvailability * 100),
  }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e1d8" vertical={false} />
          <XAxis dataKey="label" tick={axisStyle} tickLine={false} axisLine={false} />
          <YAxis yAxisId="pct" unit="%" tick={axisStyle} tickLine={false} axisLine={false} domain={[0, 100]} />
          <YAxis yAxisId="temp" orientation="right" unit="°C" tick={axisStyle} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e7e1d8', fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="pct" dataKey="rain" name="Rain probability %" fill="#52aade" radius={[6, 6, 0, 0]} barSize={22} />
          <Line yAxisId="pct" type="monotone" dataKey="solar" name="Solar %" stroke="#ef9f16" strokeWidth={2} dot={{ r: 3 }} />
          <Line yAxisId="temp" type="monotone" dataKey="temp" name="Temp °C" stroke="#d47f0a" strokeWidth={2} dot={false} strokeDasharray="4 3" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SavingsChart({ impact }: { impact: ImpactResult }) {
  const data = [
    {
      metric: 'Water (kL)',
      baseline: Math.round(impact.baseline.waterLitres / 1000),
      optimized: Math.round(impact.optimized.waterLitres / 1000),
    },
    {
      metric: 'Energy (kWh)',
      baseline: Math.round(impact.baseline.energyKwh),
      optimized: Math.round(impact.optimized.energyKwh),
    },
    {
      metric: 'Cost (₹)',
      baseline: impact.baseline.costInr,
      optimized: impact.optimized.costInr,
    },
    {
      metric: 'Events',
      baseline: impact.baseline.irrigationEvents,
      optimized: impact.optimized.irrigationEvents,
    },
  ];
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e1d8" vertical={false} />
          <XAxis dataKey="metric" tick={axisStyle} tickLine={false} axisLine={false} />
          <YAxis tick={axisStyle} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e7e1d8', fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="baseline" name="Baseline (conventional)" fill="#b8956a" radius={[6, 6, 0, 0]} />
          <Bar dataKey="optimized" name="KrishiFlux" fill="#339c5c" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DailyImpactChart({ impact }: { impact: ImpactResult }) {
  const data = impact.daily.map((d) => ({
    day: d.dayOffset + 1,
    baseline: Math.round(d.baselineWater / 1000),
    optimized: Math.round(d.optimizedWater / 1000),
  }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e1d8" vertical={false} />
          <XAxis dataKey="day" tick={axisStyle} tickLine={false} axisLine={false} unit="d" />
          <YAxis tick={axisStyle} tickLine={false} axisLine={false} unit=" kL" />
          <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e7e1d8', fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="baseline" name="Baseline water (kL)" fill="#d0b795" radius={[4, 4, 0, 0]} />
          <Bar dataKey="optimized" name="KrishiFlux water (kL)" fill="#57b87b" radius={[4, 4, 0, 0]} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ScoreBars({ components }: { components: { label: string; value: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={components}
          layout="vertical"
          margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e1d8" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} tick={axisStyle} tickLine={false} axisLine={false} unit="%" />
          <YAxis type="category" dataKey="label" width={130} tick={axisStyle} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e7e1d8', fontSize: 12 }} formatter={(v: number) => [`${v}%`, 'Score']} />
          <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={18}>
            {components.map((_, i) => (
              <Cell key={i} fill={['#339c5c', '#2b8bc7', '#a37a4c', '#ef9f16'][i % 4]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
