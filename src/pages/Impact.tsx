import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, BarChart3, Droplets, Gauge, Zap } from 'lucide-react';
import { useApp } from '@/state/AppContext';
import { forecastFor } from '@/api/client';
import { simulateSeason } from '@/engine/impact';
import { computeResourceScore } from '@/engine/score';
import { BASELINE } from '@/engine/baseline';
import { getCrop, stageMeta } from '@/data/crops';
import { getSoil } from '@/data/soils';
import { pick } from '@/i18n';
import { DailyImpactChart, SavingsChart, ScoreBars } from '@/components/charts';
import { AssumptionsPanel } from '@/components/rec';
import { Badge, Callout, Card, KeyValue, SectionHeading, Skeleton, StatCard } from '@/components/ui';

const HORIZONS = [
  { days: 30, en: '30 days', hi: '30 दिन' },
  { days: 60, en: '60 days', hi: '60 दिन' },
  { days: 90, en: '90 days', hi: '90 दिन' },
  { days: 120, en: 'Full season', hi: 'पूरा मौसम' },
];

const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');

export default function Impact() {
  const { inputs, conditions, forecast, farm, recommendation, language, t } = useApp();
  const hi = language === 'hi';
  const [horizon, setHorizon] = useState(90);
  const crop = getCrop(farm.crop);
  const soil = getSoil(farm.soilType);

  const season = useMemo(() => {
    try {
      const weather = forecastFor(inputs, farm.id, horizon);
      return simulateSeason({
        input: inputs,
        weather,
        horizonDays: horizon,
        initialSoilMoisture: conditions.soilMoisture,
      });
    } catch {
      return null;
    }
  }, [inputs, farm.id, horizon, conditions.soilMoisture]);

  const score = useMemo(
    () => (season ? computeResourceScore(inputs, season, forecast.slice(0, 7)) : null),
    [season, inputs, forecast],
  );

  if (!season) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const blocks: {
    key: string;
    label: string;
    icon: ReactNode;
    base: number;
    opt: number;
    unit: string;
    pct: number;
    tone: 'sky' | 'solar' | 'leaf' | 'soil';
    showBaseUnit?: boolean;
  }[] = [
    { key: 'water', label: hi ? 'पानी' : 'Water', icon: <Droplets size={16} />, base: season.baseline.waterLitres, opt: season.optimized.waterLitres, unit: ' L', pct: season.saved.waterPercent, tone: 'sky' },
    { key: 'energy', label: hi ? 'ऊर्जा' : 'Energy', icon: <Zap size={16} />, base: season.baseline.energyKwh, opt: season.optimized.energyKwh, unit: ' kWh', pct: season.saved.energyPercent, tone: 'solar' },
    { key: 'cost', label: hi ? 'लागत' : 'Cost', icon: <BarChart3 size={16} />, base: season.baseline.costInr, opt: season.optimized.costInr, unit: ' ₹', pct: season.saved.costPercent, tone: 'leaf' },
    { key: 'events', label: hi ? 'सिंचाई घटनाएं' : 'Irrigation events', icon: <Gauge size={16} />, base: season.baseline.irrigationEvents, opt: season.optimized.irrigationEvents, unit: '', pct: season.baseline.irrigationEvents > 0 ? Math.round((season.saved.irrigationEventsAvoided / season.baseline.irrigationEvents) * 100) : 0, tone: 'soil' },
  ];

  return (
    <div>
      <SectionHeading
        eyebrow={hi ? 'प्रभाव इंजन' : 'Impact engine'}
        title={hi ? 'आधार रेखा बनाम कृषिफ्लक्स' : 'Baseline vs KrishiFlux'}
        description={
          hi
            ? 'एक ही खेत दो बार चलाया गया: परंपरागत निश्चित कार्यक्रम, और कृषिफ्लक्स की गतिशील सौर-सचेत योजना। सभी आंकड़े मॉडल से निकलते हैं।'
            : 'The same farm is run twice: a conventional fixed calendar, and KrishiFlux dynamic solar-aware scheduling. Every number comes out of the model.'
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="text-sm text-soil-600">{hi ? 'समय क्षितिज' : 'Horizon'}:</span>
        {HORIZONS.map((h) => (
          <button
            key={h.days}
            type="button"
            onClick={() => setHorizon(h.days)}
            className={h.days === horizon ? 'kf-tab-active' : 'kf-tab'}
          >
            {h[language]}
          </button>
        ))}
        <Badge tone="solar">{t('prototypeNote')}</Badge>
      </div>

      {/* -------------------- KPI blocks -------------------- */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {blocks.map((b) => (
          <Card key={b.key} title={b.label}>
            <div className="mb-3 flex items-center gap-2 text-soil-400">{b.icon}</div>
            <div className="space-y-2 text-sm">
              <Row label={hi ? 'आधार' : 'Baseline'} value={`${fmt(b.base)}${b.unit}`} strong />
              <Row label="KrishiFlux" value={`${fmt(b.opt)}${b.unit}`} strong accent />
              <div className="mt-2 border-t border-soil-100 pt-2">
                <Row label={hi ? 'बचत' : 'Saved'} value={`${fmt(b.base - b.opt)}${b.unit}`} />
                <Row label={hi ? 'बचत %' : 'Saving'} value={`${b.pct}%`} />
              </div>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-soil-100">
              <div
                className="h-full rounded-full bg-leaf-600 transition-all duration-500"
                style={{ width: `${Math.max(2, Math.min(100, b.pct))}%` }}
              />
            </div>
          </Card>
        ))}
      </div>

      {/* Headline saved */}
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <StatCard
          label={hi ? 'कुल बचाया गया पानी' : 'Water saved'}
          value={`${fmt(season.saved.waterLitres)} L`}
          hint={`${season.saved.waterPercent}% ${t('saving')}`}
          tone="sky"
          icon={<Droplets size={15} />}
        />
        <StatCard
          label={hi ? 'कुल बचाई गई ऊर्जा' : 'Energy saved'}
          value={`${season.saved.energyKwh} kWh`}
          hint={`${season.saved.energyPercent}% ${t('saving')}`}
          tone="solar"
          icon={<Zap size={15} />}
        />
        <StatCard
          label={hi ? 'कुल लागत बचत' : 'Cost saved'}
          value={`₹${fmt(season.saved.costInr)}`}
          hint={`${season.saved.costPercent}% ${t('saving')}`}
          tone="leaf"
          icon={<ArrowDownRight size={15} />}
        />
      </div>

      {/* -------------------- Charts -------------------- */}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card title={hi ? 'आधार बनाम कृषिफ्लक्स' : 'Baseline vs KrishiFlux'} subtitle={hi ? `${horizon} दिन का संचयी तुलना` : `Cumulative over ${horizon} days`}>
          <SavingsChart impact={season} />
        </Card>
        <Card title={hi ? 'दिन-दर-दिन पानी' : 'Water applied day by day'} subtitle={hi ? 'कृषिफ्लक्स आधार रेखा की तुलना में चुनिंदा घटनाएं लगाता है' : 'KrishiFlux applies only the events the deficit calls for'}>
          <DailyImpactChart impact={season} />
        </Card>
      </div>

      {/* -------------------- Assumptions -------------------- */}
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card title={hi ? 'यह कैसे गणना किया गया?' : 'How is this calculated?'}>
          <div className="space-y-5">
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-soil-900">
                <span className="rounded-md bg-soil-200 px-2 py-0.5 text-xs">{hi ? 'आधार' : 'BASELINE'}</span>
                {hi ? 'मैनुअल / निश्चित सिंचाई' : 'Manual / fixed irrigation'}
              </p>
              <p className="text-sm text-soil-600">
                {hi
                  ? `हर ${crop.irrigatedBaselineFrequencyDays} दिन में एक बार, चरम-मौसम की जल मांग के आधार पर निश्चित गहराई, ${Math.round(BASELINE.irrigationEfficiency * 100)}% दक्षता, सौर बिना — सारी ऊर्जा ग्रिड/डीज़ल से।`
                  : `Every ${crop.irrigatedBaselineFrequencyDays} days, a fixed depth sized on peak-season crop water use, applied at ${Math.round(BASELINE.irrigationEfficiency * 100)}% efficiency, with no solar substitution — all energy from grid/diesel.`}
              </p>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-soil-900">
                <span className="rounded-md bg-leaf-600 px-2 py-0.5 text-xs text-white">KRISHIFLUX</span>
                {hi ? 'गतिशील सिंचाई' : 'Dynamic irrigation'}
              </p>
              <p className="text-sm text-soil-600">
                {hi
                  ? `मिट्टी दिन-दर-दिन आगे बढ़ाई जाती है; सिंचाई तब होती है जब उपलब्ध जल अनुमेय कमी सीमा के नीचे जाता है, ${Math.round(farm.irrigationEfficiency * 100)}% दक्षता पर, और पंप घंटा सौर वक्र से चुना जाता है।`
                  : `Soil moisture is carried forward daily; irrigation runs only when available water crosses the management-allowed-depletion threshold, at ${Math.round(farm.irrigationEfficiency * 100)}% efficiency, and the pump hour is picked from the solar curve.`}
              </p>
            </div>

            <KeyValue
              items={[
                { label: hi ? 'खेत क्षेत्र' : 'Farm area', value: `${farm.areaAcres} acres` },
                { label: hi ? 'फसल' : 'Crop', value: pick(crop.label, language) },
                { label: hi ? 'अवस्था' : 'Crop stage', value: stageMeta[farm.cropStage][language] },
                { label: hi ? 'मिट्टी' : 'Soil', value: pick(soil.label, language) },
                { label: hi ? 'सिंचाई दक्षता' : 'Irrigation efficiency', value: `${Math.round(farm.irrigationEfficiency * 100)}%` },
                { label: hi ? 'पंप शक्ति' : 'Pump power', value: `${farm.pumpPowerKw} kW` },
                { label: hi ? 'पंप दक्षता' : 'Pump efficiency', value: `${Math.round(farm.pumpEfficiency * 100)}%` },
                { label: hi ? 'ऊर्जा मूल्य' : 'Energy price', value: `₹${inputs.energyPricePerKwh} / kWh` },
                { label: hi ? 'आधार सिंचाई आवृत्ति' : 'Baseline frequency', value: `every ${crop.irrigatedBaselineFrequencyDays} days` },
                { label: hi ? 'जल लागत' : 'Water cost', value: '₹0.40 per kL' },
                { label: hi ? 'सौर आधार' : 'Solar basis', value: hi ? 'सौर से बची ऊर्जा = विंडो सौर × ऊर्जा' : 'Solar share = window solar × energy' },
                { label: hi ? 'क्षितिज' : 'Horizon', value: `${horizon} ${hi ? 'दिन' : 'days'}` },
                { label: hi ? 'सौर ऊर्जा' : 'Solar energy used', value: `${season.optimized.solarEnergyKwh} kWh` },
                { label: hi ? 'ग्रिड ऊर्जा' : 'Grid energy used', value: `${season.optimized.gridEnergyKwh} kWh` },
              ]}
            />
          </div>
        </Card>

        <div className="space-y-5">
          {score && (
            <Card
              title={t('resourceScore')}
              action={<Badge tone="leaf">{score.total}%</Badge>}
            >
              <ScoreBars components={score.components.map((c) => ({ label: pick(c.label, language), value: c.value }))} />
              <div className="mt-2 space-y-3">
                {score.components.map((c) => (
                  <div key={c.key} className="text-sm text-soil-600">
                    <span className="font-medium text-soil-900">
                      {pick(c.label, language)} · {c.value}% · {Math.round(c.weight * 100)}%
                    </span>
                    <br />
                    {pick(c.explanation, language)}
                  </div>
                ))}
              </div>
              <p className="mt-3 rounded-xl bg-soil-50 p-3 text-xs text-soil-600">{pick(score.method, language)}</p>
            </Card>
          )}

          <Card title={hi ? 'ऊर्जा विवरण' : 'Energy detail'}>
            <KeyValue
              items={[
                { label: hi ? 'आधार ऊर्जा' : 'Baseline energy', value: `${season.baseline.energyKwh} kWh` },
                { label: hi ? 'कृषिफ्लक्स ऊर्जा' : 'KrishiFlux energy', value: `${season.optimized.energyKwh} kWh` },
                { label: hi ? 'सौर से' : 'From solar', value: `${season.optimized.solarEnergyKwh} kWh` },
                { label: hi ? 'ग्रिड से' : 'From grid', value: `${season.optimized.gridEnergyKwh} kWh` },
                { label: hi ? 'सौर हिस्सा' : 'Solar share', value: `${season.optimized.energyKwh > 0 ? Math.round((season.optimized.solarEnergyKwh / season.optimized.energyKwh) * 100) : 0}%` },
                { label: hi ? 'पंप चक्र' : 'Pump cycles', value: `${season.optimized.irrigationEvents}` },
              ]}
            />
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card title={recommendation ? t('howCalculated') : t('assumptions')}>
          {recommendation && (
            <AssumptionsPanel
              rec={recommendation}
              energyPrice={inputs.energyPricePerKwh}
              baselineFrequency={crop.irrigatedBaselineFrequencyDays}
              language={language}
            />
          )}
        </Card>
        <Callout tone="solar" title="Prototype simulation — field validation required.">
          <p className="mb-2">
            {hi
              ? 'ये आंकड़े मॉडल के अनुमान हैं, मापे गए परिणाम नहीं। कोई उपज या आय वृद्धि का दावा नहीं है।'
              : 'These are modelled estimates, not measured results. No yield or income improvement is claimed.'}
          </p>
          <p className="mb-2">
            {hi
              ? 'सबसे मज़बूत दावे जो हम करते हैं: पानी की गणना, ऊर्जा की गणना, समय निर्धारण, अनुकूलनशील सिफारिशें और बचत सिमुलेशन।'
              : 'Our strongest claims are: water calculation, energy calculation, scheduling, adaptive recommendations and savings simulation.'}
          </p>
          <p className="text-sm text-soil-600">
            {hi ? 'चलिए सिम्युलेटर में स्थितियां बदलकर देखते हैं।' : 'Change the conditions in the simulator and watch these move.'}
          </p>
          <Link to="/simulator" className="kf-btn-secondary mt-3 inline-flex">
            {hi ? 'फार्म सिम्युलेटर खोलें' : 'Open the farm simulator'}
          </Link>
        </Callout>
      </div>
    </div>
  );
}

function Row({ label, value, strong, accent }: { label: string; value: string; strong?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-soil-500">{label}</span>
      <span className={`tabular-nums ${strong ? 'font-semibold' : 'font-medium'} ${accent ? 'text-leaf-700' : 'text-soil-900'}`}>
        {value}
      </span>
    </div>
  );
}
