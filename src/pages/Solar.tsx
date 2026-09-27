import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Battery, Clock, Sun, Zap } from 'lucide-react';
import { useApp } from '@/state/AppContext';
import { SolarDemandChart } from '@/components/charts';
import { EnergySplit, SuitabilityBadge } from '@/components/rec';
import { Badge, Callout, Card, KeyValue, SectionHeading, StatCard } from '@/components/ui';

/** PV array sized at 1.4x rated pump power — documented assumption. */
const ARRAY_OVERSIZE = 1.4;

export default function Solar() {
  const { recommendation, language, forecast, farm, inputs, conditions } = useApp();
  const hi = language === 'hi';

  const arrayKwp = farm.pumpPowerKw * ARRAY_OVERSIZE;

  const stats = useMemo(() => {
    if (!recommendation) return null;
    const curve = recommendation.solar.curve;
    const peakHour = curve.reduce((max, c) => (c.solarFraction > max.solarFraction ? c : max), curve[0]);
    const dailyGeneration = curve.reduce((s, c) => s + c.generationKwh, 0);
    const windows = curve.filter((c) => c.solarFraction >= 0.5);
    return {
      peakHour: peakHour?.label ?? '—',
      dailyGeneration: +dailyGeneration.toFixed(1),
      usableHours: windows.length,
      pumpLoad: recommendation.energy.effectiveLoadKw,
    };
  }, [recommendation]);

  if (!recommendation) {
    return (
      <div className="grid h-64 place-items-center rounded-2xl border border-dashed border-soil-200 text-sm text-soil-500">
        {hi ? 'इंजन गणना कर रहा है…' : 'Engine is computing…'}
      </div>
    );
  }

  return (
    <div>
      <SectionHeading
        eyebrow={hi ? 'सौर बुद्धिमत्ता' : 'Solar intelligence'}
        title={hi ? 'सौर बुद्धिमत्ता' : 'Solar Intelligence'}
        description={
          hi
            ? 'सौर उपलब्धता केवल एक संख्या नहीं है — यह सीधे पंप चलाने का समय तय करती है।'
            : 'Solar availability is not a number on a dashboard — it decides the hour the pump runs.'
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label={hi ? 'सौर उपलब्धता' : 'Solar availability'}
          value={`${Math.round(conditions.solarAvailability * 100)}%`}
          hint={hi ? 'दैनिक' : 'daily'}
          tone="solar"
          icon={<Sun size={15} />}
        />
        <StatCard
          label={hi ? 'अनुमानित उत्पादन' : 'Estimated generation'}
          value={`${stats?.dailyGeneration ?? 0} kWh`}
          hint={`${arrayKwp} kWp array`}
          tone="solar"
          icon={<Battery size={15} />}
        />
        <StatCard
          label={hi ? 'पंप लोड' : 'Pump power'}
          value={`${stats?.pumpLoad ?? farm.pumpPowerKw} kW`}
          hint={`${farm.pumpPowerKw} kW × ${inputs.pumpEfficiency.toFixed(2)} η`}
          tone="soil"
          icon={<Zap size={15} />}
        />
        <StatCard
          label={hi ? 'ऊर्जा आवश्यक' : 'Energy required'}
          value={`${recommendation.energyRequirementKwh} kWh`}
          hint={recommendation.required ? `${recommendation.durationMinutes} min` : (hi ? 'कोई सिंचाई नहीं' : 'no irrigation')}
          tone="sky"
          icon={<Zap size={15} />}
        />
        <StatCard
          label={hi ? 'पीक घंटा' : 'Peak solar hour'}
          value={stats?.peakHour ?? '—'}
          hint={`${stats?.usableHours ?? 0} ${hi ? 'उपयुक्त घंटे' : 'usable hours'}`}
          tone="solar"
          icon={<Clock size={15} />}
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card
          title={hi ? 'सौर उपलब्धता बनाम सिंचाई मांग' : 'Solar availability vs irrigation demand'}
          subtitle={hi ? 'समय · सौर · पंप लोड · अनुशंसित विंडो' : 'Time · solar availability · pump load · recommended pump window'}
          action={<SuitabilityBadge value={recommendation.solarSuitability} />}
        >
          <SolarDemandChart curve={recommendation.solar.curve} window={recommendation.solar.recommendedWindow} />
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-soil-500">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-solar-400" /> {hi ? 'सौर उपलब्धता (%)' : 'Solar availability (%)'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-sky-500" /> {hi ? 'पंप लोड (kW)' : 'Pump load (kW)'}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-leaf-600/30" /> {hi ? 'अनुशंसित पंप विंडो' : 'Recommended pump window'}
            </span>
          </div>
        </Card>

        <div className="space-y-5">
          <Card title={hi ? 'अनुशंसित पंप विंडो' : 'Recommended pumping windows'}>
            <div className="space-y-3">
              <WindowRow
                tag={hi ? 'आज' : 'Today'}
                window={recommendation.solar.todayWindow.label}
                fit={Math.round(recommendation.solar.todayWindow.avgSolarFraction * 100)}
                highlight={!recommendation.solar.deferToNextDay}
              />
              <WindowRow
                tag={hi ? 'कल' : 'Tomorrow'}
                window={recommendation.solar.tomorrowWindow.label}
                fit={Math.round(recommendation.solar.tomorrowWindow.avgSolarFraction * 100)}
                highlight={recommendation.solar.deferToNextDay}
              />
            </div>

            <div className="mt-4 rounded-xl border border-leaf-200 bg-leaf-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-leaf-700">
                {hi ? 'अंतिम सिफारिश' : 'Final recommendation'}
              </p>
              <p className="mt-1 text-lg font-semibold text-soil-900">{recommendation.recommendedTime}</p>
              <p className="mt-1 text-xs text-soil-600">{recommendation.solar.reason.replace(/_/g, ' ')}</p>
              {recommendation.solar.deferToNextDay && (
                <p className="mt-2 text-xs text-leaf-800">
                  {hi
                    ? 'सौर बहुत कम है, इसलिए पंपिंग कल के उपयुक्त सौर विंडो में स्थानांतरित है।'
                    : 'Solar is too weak today, so pumping shifts to tomorrow’s suitable solar window.'}
                </p>
              )}
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-soil-500">
                {hi ? 'ऊर्जा विभाजन' : 'Energy split'}
              </p>
              <EnergySplit rec={recommendation} />
            </div>
          </Card>

          <Card title={hi ? 'मॉडल विवरण' : 'Model detail'}>
            <KeyValue
              items={[
                { label: hi ? 'सौर सरणी' : 'PV array (assumed)', value: `${arrayKwp} kWp` },
                { label: hi ? 'दैनिक उत्पादन' : 'Daily generation', value: `${stats?.dailyGeneration ?? 0} kWh` },
                { label: hi ? 'उत्पादन शिखर' : 'Peak output hour', value: stats?.peakHour ?? '—' },
                { label: hi ? 'पंप ऊर्जा आवश्यक' : 'Pump energy required', value: `${recommendation.energyRequirementKwh} kWh` },
                { label: hi ? 'सौर से पूरा' : 'Solar energy used', value: `${recommendation.solarEnergyKwh} kWh` },
                { label: hi ? 'ग्रिड से' : 'Grid energy required', value: `${recommendation.gridEnergyKwh} kWh` },
                { label: hi ? 'सौर उपयोग हिस्सा' : 'Solar share of window', value: `${Math.round(recommendation.solar.recommendedWindow.avgSolarFraction * 100)}%` },
                { label: hi ? 'ग्रिड हिस्सा' : 'Grid share', value: `${Math.round(recommendation.solar.gridShareOfEnergy * 100)}%` },
              ]}
            />
          </Card>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title={hi ? 'अगले 7 दिनों का सौर पूर्वानुमान' : '7-day solar forecast'}>
          <ul className="divide-y divide-soil-100">
            {forecast.map((d, i) => {
              const pct = Math.round(d.solarAvailability * 100);
              return (
                <li key={d.date} className="flex items-center gap-3 py-2.5">
                  <span className="w-20 text-sm font-medium text-soil-800">
                    {i === 0 ? (hi ? 'आज' : 'Today') : new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' })}
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-soil-100">
                    <span className="block h-full rounded-full bg-solar-500" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="w-10 text-right text-sm tabular-nums text-soil-700">{pct}%</span>
                  <Badge tone={pct >= 68 ? 'leaf' : pct >= 48 ? 'sky' : pct >= 28 ? 'soil' : 'danger'}>
                    {pct >= 68 ? 'excellent' : pct >= 48 ? 'good' : pct >= 28 ? 'moderate' : 'poor'}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title={hi ? 'ऊर्जा मॉडल' : 'Energy model'}>
          <KeyValue
            items={[
              { label: 'duration = volume ÷ (power × discharge factor)', value: `${recommendation.energy.durationHours} h` },
              { label: 'load = pump power ÷ pump efficiency', value: `${recommendation.energy.effectiveLoadKw} kW` },
              { label: 'energy = load × duration', value: `${recommendation.energy.energyRequiredKwh} kWh` },
              { label: hi ? 'सौर = ऊर्जा × विंडो सौर' : 'solar = energy × window solar share', value: `${recommendation.solarEnergyKwh} kWh` },
              { label: hi ? 'ग्रिड = शेष' : 'grid = remainder', value: `${recommendation.gridEnergyKwh} kWh` },
            ]}
          />
          <Link to="/optimizer" className="kf-btn-secondary mt-4">
            {hi ? 'ऑप्टिमाइज़र में समायोजित करें' : 'Adjust in the optimizer'}
          </Link>
        </Card>
      </div>

      <Callout tone="solar" title="Prototype simulation — field validation required.">
        {hi
          ? 'सौर वक्र एक स्पष्ट पारदर्शी मॉडल से बना है: स्पष्ट-आकाश आकार × दैनिक उपलब्धता × बादल दबाव (नमी, वर्षा, दैनिक सौर)।'
          : 'The solar curve comes from a transparent model: clear-sky shape × daily availability × cloud pressure (humidity, rain probability and daily solar combined).'}
      </Callout>
    </div>
  );
}

function WindowRow({ tag, window, fit, highlight }: { tag: string; window: string; fit: number; highlight: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${highlight ? 'border-leaf-400 bg-leaf-50' : 'border-soil-200'}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-soil-900">{tag}</span>
        <span className="text-xs text-soil-500">{fit}% {highlight ? '· chosen' : ''}</span>
      </div>
      <p className="mt-1 text-sm tabular-nums text-soil-700">{window}</p>
    </div>
  );
}
