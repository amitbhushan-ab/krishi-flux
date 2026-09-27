import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDown,
  ChevronUp,
  CloudRain,
  Droplets,
  Droplet,
  Gauge,
  Sun,
  Thermometer,
  Waves,
  Wind,
  Zap,
} from 'lucide-react';
import { useApp } from '@/state/AppContext';
import { getCrop, stageMeta } from '@/data/crops';
import { getSoil } from '@/data/soils';
import { simulateSeason } from '@/engine/impact';
import { computeResourceScore } from '@/engine/score';
import { SCENARIOS } from '@/state/scenarios';
import { pick } from '@/i18n';
import {
  AssumptionsPanel,
  ExplainablePanel,
  EnergySplit,
  STATUS_TONE,
  StatusBanner,
} from '@/components/rec';
import { Badge, Card, ProgressBar, SectionHeading, Skeleton, StatCard } from '@/components/ui';

const fmtL = (n: number) => Math.round(n).toLocaleString('en-IN');

export default function Dashboard() {
  const {
    farm,
    conditions,
    forecast,
    language,
    recommendation,
    loading,
    inputs,
    applyScenario,
    connectivity,
    fromCache,
    t,
  } = useApp();
  const [showWhy, setShowWhy] = useState(true);
  const crop = getCrop(farm.crop);
  const soil = getSoil(farm.soilType);

  // One season run powers the score and the 7-day plan.
  const season = useMemo(() => {
    try {
      return simulateSeason({
        input: inputs,
        weather: forecast,
        horizonDays: 60,
        initialSoilMoisture: conditions.soilMoisture,
      });
    } catch {
      return null;
    }
  }, [inputs, forecast, conditions.soilMoisture]);

  const score = useMemo(
    () => (season ? computeResourceScore(inputs, season, forecast) : null),
    [season, inputs, forecast],
  );

  const plan = useMemo(() => (season ? season.daily.slice(0, 7) : []), [season]);

  const moistureTone = recommendation?.water.availableFraction ?? 0;
  const moistureLabel =
    moistureTone < 0.3 ? (language === 'hi' ? 'कम' : 'Low') : moistureTone < 0.7 ? (language === 'hi' ? 'मध्यम' : 'Moderate') : language === 'hi' ? 'अच्छी' : 'Good';

  return (
    <div>
      <SectionHeading
        eyebrow={language === 'hi' ? 'किसान डैशबोर्ड' : 'Farmer dashboard'}
        title={t('navDashboard')}
        description={
          language === 'hi'
            ? 'आज आपको क्या करना चाहिए — यही एक सवाल है जिसका जवाब डैशबोर्ड देता है।'
            : 'One question, answered immediately: what should I do today?'
        }
      />

      {/* ---------- Farm header strip ---------- */}
      <div className="kf-card mb-5 flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
        <div>
          <p className="kf-label">{language === 'hi' ? 'खेत' : 'Farm'}</p>
          <p className="text-sm font-semibold text-soil-900">{farm.name}</p>
        </div>
        <Fact label={t('area')} value={`${farm.areaAcres} acres`} />
        <Fact label={t('crop')} value={pick(crop.label, language)} />
        <Fact label={t('cropStage')} value={stageMeta[farm.cropStage][language]} />
        <Fact label={t('soilType')} value={pick(soil.label, language)} />
        <Fact label={t('location')} value={`${farm.village}, ${farm.district}, ${farm.state}`} />
        <Fact
          label={t('connectivity')}
          value={
            fromCache
              ? connectivity === 'offline'
                ? language === 'hi'
                  ? 'ऑफ़लाइन — अंतिम सलाह उपलब्ध'
                  : 'Offline — last advice available'
                : language === 'hi'
                  ? 'कैश से'
                  : 'From cache'
              : connectivity === 'offline'
                ? language === 'hi'
                  ? 'ऑफ़लाइन'
                  : 'Offline'
                : language === 'hi'
                  ? 'सिंक'
                  : 'Synced'
          }
          accent
        />
      </div>

      {/* ---------- Live conditions ---------- */}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-soil-500">
        {t('farmConditions')}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label={t('soilMoisture')}
          value={`${conditions.soilMoisture}%`}
          hint={`${moistureLabel} · ${Math.round(moistureTone * 100)}% available`}
          tone={moistureTone < 0.4 ? 'solar' : 'sky'}
          icon={<Droplet size={15} />}
        />
        <StatCard
          label={t('temperature')}
          value={`${conditions.temperature}°C`}
          hint={conditions.temperature >= 38 ? (language === 'hi' ? 'उच्च ताप' : 'Heat stress risk') : (language === 'hi' ? 'सामान्य' : 'Normal')}
          tone={conditions.temperature >= 38 ? 'danger' : 'soil'}
          icon={<Thermometer size={15} />}
        />
        <StatCard
          label={t('humidity')}
          value={`${conditions.humidity}%`}
          hint={conditions.humidity > 70 ? (language === 'hi' ? 'उच्च' : 'High') : (language === 'hi' ? 'मध्यम' : 'Moderate')}
          tone="sky"
          icon={<Wind size={15} />}
        />
        <StatCard
          label={t('rainProbability')}
          value={`${conditions.rainProbability}%`}
          hint={language === 'hi' ? `${conditions.rainfallForecast} मिमी पूर्वानुमान` : `${conditions.rainfallForecast} mm forecast`}
          tone={conditions.rainProbability >= 55 ? 'sky' : 'soil'}
          icon={<CloudRain size={15} />}
        />
        <StatCard
          label={t('solarAvailability')}
          value={`${Math.round(conditions.solarAvailability * 100)}%`}
          hint={pick(
            {
              excellent: { en: 'Excellent', hi: 'उत्कृष्ट' },
              good: { en: 'Good', hi: 'उपयुक्त' },
              moderate: { en: 'Moderate', hi: 'मध्यम' },
              poor: { en: 'Limited', hi: 'कमज़ोर' },
            }[recommendation?.solarSuitability ?? 'moderate'],
            language,
          )}
          tone={conditions.solarAvailability >= 0.68 ? 'solar' : 'soil'}
          icon={<Sun size={15} />}
        />
        <StatCard
          label={t('pumpStatus')}
          value="OFF"
          hint={language === 'hi' ? 'सुझाए गए समय पर चलाएं' : 'Runs in recommended window'}
          tone="leaf"
          icon={<Gauge size={15} />}
        />
      </div>

      {/* ---------- Today's action ---------- */}
      <div className="mt-6">
        {loading && !recommendation && <Skeleton className="h-56 w-full rounded-2xl" />}
        {recommendation && <StatusBanner rec={recommendation} language={language} />}

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="kf-btn-secondary" onClick={() => setShowWhy((s) => !s)}>
            {showWhy ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            {showWhy ? (language === 'hi' ? 'कारण छिपाएं' : 'Hide why') : t('viewWhy')}
          </button>
          <Link to="/optimizer" className="kf-btn-primary">
            {t('openOptimizer')}
          </Link>
          <Link to="/simulator" className="kf-btn-secondary">
            {t('simulateChange')}
          </Link>
        </div>

        {/* Quick scenario chips */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="self-center text-xs text-soil-500">
            {language === 'hi' ? 'तुरंत परिदृश्य:' : 'Quick scenarios:'}
          </span>
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="rounded-full border border-soil-200 bg-white px-3 py-1.5 text-xs font-medium text-soil-700 transition hover:border-leaf-400 hover:text-leaf-700"
              onClick={() => applyScenario(s.id)}
              title={pick(s.expected, language)}
            >
              {pick(s.title, language)}
            </button>
          ))}
        </div>
      </div>

      {/* ---------- Explainability ---------- */}
      {showWhy && recommendation && (
        <div className="mt-6 grid gap-5 xl:grid-cols-[1.6fr_1fr]">
          <Card title={language === 'hi' ? 'समझाइए: यह निर्णय कैसे बना' : 'Explainable recommendation'}>
            <ExplainablePanel rec={recommendation} language={language} />
            <div className="mt-5 border-t border-soil-100 pt-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-soil-900">
                <Zap size={15} className="text-solar-600" />
                {language === 'hi' ? 'ऊर्जा विभाजन' : 'Energy split for this window'}
              </h3>
              <EnergySplit rec={recommendation} />
              <div className="mt-4 rounded-xl border border-soil-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-soil-700">
                    {language === 'hi' ? 'सिंचाई सहायता' : 'Irrigation confidence'}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-soil-900">
                    {Math.round(recommendation.confidence * 100)}%
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-soil-500">
                  {language === 'hi'
                    ? 'सीमा से दूरी, मौसम स्थिरता और सौर संगति से गणना — कोई अर्थहीन ML संभावना नहीं।'
                    : 'Derived from margin to threshold, forecast stability and solar agreement — not an opaque ML probability.'}
                </p>
                <ProgressBar value={recommendation.confidence * 100} tone="leaf" showValue={false} />
              </div>
            </div>
          </Card>

          <div className="space-y-5">
            {/* Resource efficiency score */}
            {score && (
              <Card
                title={t('resourceScore')}
                action={<Badge tone="leaf">{score.total}%</Badge>}
              >
                <div className="mb-4">
                  <ProgressBar value={score.total} label={t('resourceScore')} />
                </div>
                <div className="space-y-3">
                  {score.components.map((c) => (
                    <ProgressBar
                      key={c.key}
                      label={pick(c.label, language)}
                      value={c.value}
                      tone="sky"
                      sublabel={pick(c.explanation, language)}
                    />
                  ))}
                </div>
                <p className="mt-4 text-xs text-soil-500">{pick(score.method, language)}</p>
              </Card>
            )}

            <Card title={language === 'hi' ? '7-दिन की सिंचाई योजना' : '7-day irrigation planning'}>
              <ul className="divide-y divide-soil-100">
                {plan.map((d, i) => {
                  const day = forecast[i];
                  const irrigate = d.optimizedWater > 0;
                  return (
                    <li key={d.dayOffset} className="flex items-center justify-between gap-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-soil-900">
                          {i === 0
                            ? language === 'hi'
                              ? 'आज'
                              : 'Today'
                            : new Date(day.date).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'long' })}
                        </p>
                        <p className="text-xs text-soil-500">
                          {day.rainProbability}% {language === 'hi' ? 'बारिश' : 'rain'} ·{' '}
                          {Math.round(day.solarAvailability * 100)}% {language === 'hi' ? 'सौर' : 'solar'}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge tone={irrigate ? 'leaf' : 'sky'}>
                          {irrigate ? (language === 'hi' ? 'सिंचाई' : 'Irrigate') : (language === 'hi' ? 'छोड़ें' : 'No irrigation')}
                        </Badge>
                        {irrigate && (
                          <p className="mt-1 text-xs tabular-nums text-soil-500">{fmtL(d.optimizedWater)} L</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-xs text-soil-500">
                {language === 'hi'
                  ? 'मिट्टी की नमी दिन-दर-दिन आगे बढ़ाई जाती है, इसलिए योजना आपस में जुड़ी हुई है।'
                  : 'Soil moisture is carried forward day to day, so each plan day depends on the previous one.'}
              </p>
            </Card>

            <Card title={t('assumptions')}>
              <AssumptionsPanel
                rec={recommendation}
                energyPrice={inputs.energyPricePerKwh}
                baselineFrequency={crop.irrigatedBaselineFrequencyDays}
                language={language}
              />
            </Card>
          </div>
        </div>
      )}

      {/* ---------- Impact snapshot ---------- */}
      {season && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={language === 'hi' ? 'पानी की बचत' : 'Water saved'}
            value={`${fmtL(season.saved.waterLitres)} L`}
            hint={`${season.saved.waterPercent}% ${t('saving')}`}
            tone="sky"
            icon={<Waves size={15} />}
          />
          <StatCard
            label={language === 'hi' ? 'ऊर्जा बचत' : 'Energy saved'}
            value={`${season.saved.energyKwh} kWh`}
            hint={`${season.saved.energyPercent}% ${t('saving')}`}
            tone="solar"
            icon={<Zap size={15} />}
          />
          <StatCard
            label={language === 'hi' ? 'लागत बचत' : 'Cost saved'}
            value={`₹${fmtL(season.saved.costInr)}`}
            hint={`${season.saved.costPercent}% ${t('saving')}`}
            tone="leaf"
            icon={<Droplets size={15} />}
          />
          <StatCard
            label={language === 'hi' ? 'बची सिंचाई घटनाएं' : 'Irrigation events avoided'}
            value={season.saved.irrigationEventsAvoided}
            hint={`${season.baseline.irrigationEvents} → ${season.optimized.irrigationEvents}`}
            tone="soil"
            icon={<Gauge size={15} />}
          />
        </div>
      )}

      <p className="mt-6 text-xs text-soil-500">
        {language === 'hi' ? 'प्रोटोटाइप सिमुलेशन — क्षेत्र सत्यापन आवश्यक।' : 'Prototype simulation — field validation required.'}
        {' '}
        {language === 'hi'
          ? 'मौसम, सौर और सेंसर डेटा सिमुलेटेड हैं।'
          : 'Weather, solar and sensor data are simulated.'}
      </p>
    </div>
  );
}

function Fact({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="kf-label">{label}</p>
      <p className={`text-sm ${accent ? 'font-semibold text-leaf-700' : 'font-medium text-soil-900'}`}>{value}</p>
    </div>
  );
}
