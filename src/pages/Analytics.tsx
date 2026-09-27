import { useMemo, useState } from 'react';
import { Activity, Droplet, Radio } from 'lucide-react';
import { useApp } from '@/state/AppContext';
import { forecastFor, inputsFromFarm } from '@/api/client';
import { recommend } from '@/engine/recommendation';
import { simulateSeason } from '@/engine/impact';
import { waterLevelTrend } from '@/data/weather';
import { pick } from '@/i18n';
import { DailyImpactChart } from '@/components/charts';
import { Badge, Callout, Card, SectionHeading, StatCard, Toggle } from '@/components/ui';
import type { SensorMode } from '@/lib/types';

const SENSOR_MODES: { id: SensorMode; label: string; hi: string }[] = [
  { id: 'normal', label: 'Normal', hi: 'सामान्य' },
  { id: 'dry', label: 'Dry', hi: 'सूखा' },
  { id: 'wet', label: 'Wet', hi: 'गीला' },
  { id: 'offline', label: 'Sensor offline', hi: 'सेंसर ऑफ़लाइन' },
];

export default function Analytics() {
  const {
    farm,
    baseConditions,
    conditions,
    inputs,
    sensorMode,
    setSensorMode,
    recommendation,
    language,
    forecast,
    t,
  } = useApp();
  const hi = language === 'hi';

  // --- Sensitivity sweep: how the decision moves with soil moisture (Proof A) ---
  const sweep = useMemo(() => {
    const out: { sm: number; status: string; water: number; window: string }[] = [];
    for (let sm = 8; sm <= 44; sm += 4) {
      const rec = recommend(
        { ...inputs, soilMoisture: sm },
        { farmId: farm.id, forecast: forecastFor({ ...inputs, soilMoisture: sm }, farm.id, 7) },
      );
      out.push({
        sm,
        status: rec.status,
        water: Math.round(rec.waterLitres),
        window: rec.required ? rec.recommendedTime : '—',
      });
    }
    return out;
  }, [inputs, farm.id]);

  const season = useMemo(() => {
    try {
      return simulateSeason({
        input: inputs,
        weather: forecastFor(inputs, farm.id, 90),
        horizonDays: 90,
        initialSoilMoisture: conditions.soilMoisture,
      });
    } catch {
      return null;
    }
  }, [inputs, farm.id, conditions.soilMoisture]);

  const levels = useMemo(() => waterLevelTrend(farm.id, 14), [farm.id]);

  const smStart = sweep[0];
  const smEnd = sweep[sweep.length - 1];

  return (
    <div>
      <SectionHeading
        eyebrow={hi ? 'संसाधन विश्लेषण' : 'Resource analytics'}
        title={hi ? 'विश्लेषण' : 'Analytics'}
        description={
          hi
            ? 'संवेदनशीलता, सेंसर सिमुलेशन और मौसम प्रवृत्तियां — सब एक ही इंजन से।'
            : 'Sensitivity, sensor simulation and seasonal trends — all from the same engine.'
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={hi ? 'स्थिति' : 'Status'} value={recommendation ? recommendation.status : '—'} tone="leaf" />
        <StatCard label={hi ? 'पानी' : 'Water'} value={recommendation ? `${Math.round(recommendation.waterLitres).toLocaleString('en-IN')} L` : '—'} tone="sky" icon={<Droplet size={15} />} />
        <StatCard label={hi ? 'विश्वास' : 'Confidence'} value={recommendation ? `${Math.round(recommendation.confidence * 100)}%` : '—'} tone="soil" icon={<Activity size={15} />} />
        <StatCard
          label={hi ? 'सिंचाई दक्षता' : 'Irrigation efficiency'}
          value={`${Math.round(farm.irrigationEfficiency * 100)}%`}
          tone="sky"
        />
      </div>

      {/* -------------------- Sensor simulation -------------------- */}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <Card
          title={
            <span className="flex items-center gap-2">
              <Radio size={16} className="text-leaf-600" />
              {hi ? 'सेंसर सिमुलेशन' : 'Sensor simulation'}
            </span>
          }
          subtitle={hi ? 'इंजन सिमुलेटेड रीडिंग पर प्रतिक्रिया देता है' : 'The engine reacts to the simulated readings'}
          action={<Badge tone={sensorMode === 'offline' ? 'danger' : 'leaf'}>{sensorMode}</Badge>}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {SENSOR_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSensorMode(m.id)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  sensorMode === m.id
                    ? 'border-leaf-500 bg-leaf-50 text-leaf-800'
                    : 'border-soil-200 bg-white text-soil-700 hover:border-leaf-300'
                }`}
              >
                {hi ? m.hi : m.label}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-2 rounded-xl border border-soil-200 bg-soil-50 p-4 text-sm">
            <Row label={hi ? 'सोइल मॉइस्चर सेंसर' : 'Soil moisture sensor'} value={sensorMode === 'offline' ? 'OFFLINE' : `${conditions.soilMoisture}%`} bad={sensorMode === 'offline'} />
            <Row label={hi ? 'तापमान सेंसर' : 'Temperature sensor'} value={sensorMode === 'offline' ? 'OFFLINE' : `${conditions.temperature}°C`} bad={sensorMode === 'offline'} />
            <Row label={hi ? 'आर्द्रता सेंसर' : 'Humidity sensor'} value={sensorMode === 'offline' ? 'OFFLINE' : `${conditions.humidity}%`} bad={sensorMode === 'offline'} />
            <Row label={hi ? 'पानी का स्तर' : 'Water level'} value={`${Math.round(58 + (conditions.soilMoisture - 22) * 1.1)}%`} />
            <Row label={hi ? 'पंप स्थिति' : 'Pump status'} value="OFF" />
          </div>

          <p className="mt-3 text-xs text-soil-500">
            {sensorMode === 'offline'
              ? hi
                ? 'सेंसर ऑफ़लाइन है — अंतिम ज्ञात रीडिंग बनाए रखी गई है और सिफारिश अब भी उपलब्ध है।'
                : 'Sensor offline — the last known reading is retained and the recommendation stays available.'
              : hi
                ? 'सेंसर रीडिंग बदलते ही सिफारिश अपने आप दोबारा बनती है।'
                : 'The recommendation recalculates as soon as the sensor reading changes.'}
          </p>
        </Card>

        <Card
          title={hi ? 'संवेदनशीलता विश्लेषण' : 'Sensitivity analysis'}
          subtitle={hi ? 'केवल मिट्टी नमी बदली गई है, बाकी सब वही' : 'Only soil moisture changes — everything else held constant'}
          action={<Badge tone="leaf">{hi ? 'सबूत A' : 'Proof A'}</Badge>}
        >
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-xs uppercase tracking-wide text-soil-500">
                  <th className="py-2">{hi ? 'नमी' : 'Moisture'}</th>
                  <th className="py-2">{hi ? 'निर्णय' : 'Decision'}</th>
                  <th className="py-2">{hi ? 'पानी' : 'Water'}</th>
                  <th className="py-2">{hi ? 'विंडो' : 'Window'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-soil-100">
                {sweep.map((r) => {
                  const active = Math.abs(r.sm - conditions.soilMoisture) < 2;
                  return (
                    <tr key={r.sm} className={active ? 'bg-leaf-50' : ''}>
                      <td className="py-2 tabular-nums text-soil-900">{r.sm}%</td>
                      <td className="py-2">
                        <Badge tone={r.status === 'irrigate' ? 'leaf' : r.status === 'delay' ? 'solar' : 'sky'}>{r.status}</Badge>
                      </td>
                      <td className="py-2 tabular-nums text-soil-700">{r.water > 0 ? `${r.water.toLocaleString('en-IN')} L` : '—'}</td>
                      <td className="py-2 text-soil-700">{r.window}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-soil-500">
            {hi
              ? `${smStart.sm}% पर "${smStart.status}" → ${smEnd.sm}% पर "${smEnd.status}". सीमा पार होते ही निर्णय बदल जाता है।`
              : `At ${smStart.sm}% the decision is "${smStart.status}"; at ${smEnd.sm}% it is "${smEnd.status}". The decision flips exactly at the threshold.`}
          </p>
        </Card>
      </div>

      {/* -------------------- Season trend + groundwater -------------------- */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title={hi ? 'मौसम का जल प्रवाह' : 'Season water profile'} subtitle={hi ? '90 दिन · आधार बनाम कृषिफ्लक्स' : '90 days · baseline vs KrishiFlux'}>
          {season ? <DailyImpactChart impact={season} /> : <div className="grid h-56 place-items-center text-sm text-soil-500">{hi ? 'गणना जारी…' : 'Computing…'}</div>}
        </Card>

        <Card title={hi ? 'भूजल स्तर का रुझान' : 'Groundwater level trend'} subtitle={hi ? 'सिमुलेटेड · अंतिम 14 दिन' : 'Simulated · last 14 days'}>
          <div className="h-56">
            <div className="flex h-full items-end gap-1.5">
              {levels.map((l, i) => (
                <div key={l.date} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-md bg-sky-500/80 transition-all"
                    style={{ height: `${l.level}%` }}
                    title={`${l.date}: ${l.level}%`}
                  />
                  <span className="text-[9px] text-soil-400">{i + 1}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-xs text-soil-500">
            {hi
              ? 'कृषिफ्लक्स की चुनिंदा सिंचाई से निकासी दर में अंतर आता है — यह सांकेतिक है और असली पायलट में भूजल स्तर से मिलाया जाना चाहिए।'
              : 'Selective irrigation changes the abstraction rate — this is indicative and must be calibrated against real groundwater readings in a pilot.'}
          </p>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Toggle
          checked={sensorMode !== 'normal'}
          onChange={(v) => setSensorMode(v ? 'dry' : 'normal')}
          label={hi ? 'सूखे सेंसर परिदृश्य को बनाए रखें' : 'Hold the dry-sensor scenario'}
          hint={hi ? 'चालू करने पर इंजन सूखी स्थिति पर चलता है' : 'Keeps the engine running against dry conditions'}
        />
        <Callout tone="sky" title={hi ? 'डेटा स्रोत' : 'Data sources'}>
          {hi
            ? 'सेंसर, पानी का स्तर और मौसम सभी सिमुलेटेड हैं। प्रत्येक संकेत को वास्तविक इनपुट से बदला जा सकता है बिना इंजन बदले।'
            : 'Sensors, water level and weather are all simulated. Each one can be replaced with a real feed without changing the engine.'}
        </Callout>
      </div>
    </div>
  );
}

function Row({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-soil-600">{label}</span>
      <span className={`font-medium tabular-nums ${bad ? 'text-red-600' : 'text-soil-900'}`}>{value}</span>
    </div>
  );
}
