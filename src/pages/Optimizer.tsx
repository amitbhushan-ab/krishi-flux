import { useMemo, type ReactNode } from 'react';
import { Droplets, Gauge, Layers, Waves, Zap } from 'lucide-react';
import { useApp } from '@/state/AppContext';
import { cropList, getCrop, stageMeta, stageOrderList } from '@/data/crops';
import { soilList } from '@/data/soils';
import { toOptimizerOutput } from '@/engine/recommendation';
import { formatDuration } from '@/engine/energy';
import { pick } from '@/i18n';
import { AssumptionsPanel, ExplainablePanel, StatusBanner } from '@/components/rec';
import { SolarDemandChart } from '@/components/charts';
import { Callout, Card, KeyValue, SectionHeading, Select, Slider } from '@/components/ui';
import type { CropStageId, SoilTypeId } from '@/lib/types';

export default function Optimizer() {
  const { farm, patchFarm, conditions, patchConditions, recommendation, language, inputs, t, loading } = useApp();

  const out = useMemo(() => (recommendation ? toOptimizerOutput(recommendation) : null), [recommendation]);
  const crop = getCrop(farm.crop);

  return (
    <div>
      <SectionHeading
        eyebrow={language === 'hi' ? 'सह-अनुकूलन इंजन' : 'Co-optimization engine'}
        title={language === 'hi' ? 'जल–ऊर्जा ऑप्टिमाइज़र' : 'Water–Energy Optimizer'}
        description={
          language === 'hi'
            ? 'जल मांग + ऊर्जा उपलब्धता एक ही निर्णय में। पानी यह तय करता है कि पंप कितनी देर चले; सौर यह तय करता है कि वह समय कब हो।'
            : 'Water demand + energy availability resolved in one decision. Water decides how long the pump runs; solar decides when that run happens.'
        }
      />

      {/* ------------------------------ INPUTS ------------------------------ */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title={language === 'hi' ? 'मौसम और मिट्टी' : 'Weather and soil'} className="lg:col-span-1">
          <div className="space-y-5">
            <Slider label={language === 'hi' ? 'मिट्टी की नमी' : 'soilMoisture'} value={conditions.soilMoisture} min={2} max={55} unit="%" tone="sky" onChange={(v) => patchConditions({ soilMoisture: v })} />
            <Slider label={language === 'hi' ? 'तापमान' : 'temperature'} value={conditions.temperature} min={10} max={48} unit="°C" tone="solar" onChange={(v) => patchConditions({ temperature: v })} />
            <Slider label={language === 'hi' ? 'आर्द्रता' : 'humidity'} value={conditions.humidity} min={15} max={100} unit="%" tone="sky" onChange={(v) => patchConditions({ humidity: v })} />
            <Slider label={language === 'hi' ? 'बारिश संभावना' : 'rainProbability'} value={conditions.rainProbability} min={0} max={100} unit="%" tone="sky" onChange={(v) => patchConditions({ rainProbability: v })} />
            <Slider label={language === 'hi' ? 'वर्षा पूर्वानुमान' : 'rainfallForecast'} value={conditions.rainfallForecast} min={0} max={60} unit=" mm" tone="sky" onChange={(v) => patchConditions({ rainfallForecast: v })} />
            <Select label={language === 'hi' ? 'मिट्टी प्रकार' : 'soilType'} value={farm.soilType} options={soilList} onChange={(v) => patchFarm({ soilType: v as SoilTypeId })} />
          </div>
        </Card>

        <Card title={language === 'hi' ? 'फसल और क्षेत्र' : 'cropType / cropStage / farmArea'} className="lg:col-span-1">
          <div className="space-y-5">
            <Select label={language === 'hi' ? 'फसल' : 'cropType'} value={farm.crop} options={cropList} onChange={(v) => patchFarm({ crop: v })} />
            <Select
              label={language === 'hi' ? 'अवस्था' : 'cropStage'}
              value={farm.cropStage}
              options={stageOrderList.map((s) => ({ id: s, label: stageMeta[s][language] }))}
              onChange={(v) => patchFarm({ cropStage: v as CropStageId })}
            />
            <Slider label={language === 'hi' ? 'क्षेत्रफल' : 'farmArea'} value={farm.areaAcres} min={0.25} max={25} step={0.25} unit=" ac" onChange={(v) => patchFarm({ areaAcres: v })} />
            <div className="rounded-xl border border-soil-200 bg-soil-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-soil-500">
                {language === 'hi' ? 'फसल पैरामीटर' : 'Crop parameters'}
              </p>
              <div className="mt-2 space-y-1.5 text-sm text-soil-700">
                <p>· Kc = {crop.stages[farm.cropStage].kc.toFixed(2)}</p>
                <p>· {language === 'hi' ? 'मूल गहराई' : 'Root depth'} = {crop.stages[farm.cropStage].rootDepth} m</p>
                <p>· MAD = {Math.round(crop.stages[farm.cropStage].mad * 100)}%</p>
                <p>· {language === 'hi' ? 'मौसम' : 'Season'} = {crop.seasonDays} {language === 'hi' ? 'दिन' : 'days'}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card title={language === 'hi' ? 'ऊर्जा और पंप' : 'solar / pump inputs'} className="lg:col-span-1">
          <div className="space-y-5">
            <Slider label={language === 'hi' ? 'सौर उपलब्धता' : 'solarAvailability'} value={Math.round(conditions.solarAvailability * 100)} min={5} max={98} unit="%" tone="solar" onChange={(v) => patchConditions({ solarAvailability: v / 100 })} />
            <Slider label={language === 'hi' ? 'पंप शक्ति' : 'pumpPower'} value={farm.pumpPowerKw} min={0.5} max={15} step={0.5} unit=" kW" onChange={(v) => patchFarm({ pumpPowerKw: v })} />
            <Slider label={language === 'hi' ? 'पंप दक्षता' : 'pumpEfficiency'} value={Math.round(farm.pumpEfficiency * 100)} min={30} max={90} unit="%" tone="sky" onChange={(v) => patchFarm({ pumpEfficiency: v / 100 })} />
            <Slider label={language === 'hi' ? 'सिंचाई दक्षता' : 'irrigationEfficiency'} value={Math.round(farm.irrigationEfficiency * 100)} min={35} max={95} unit="%" tone="sky" onChange={(v) => patchFarm({ irrigationEfficiency: v / 100 })} />
          </div>
        </Card>
      </div>

      {/* ------------------------------ OUTPUTS ----------------------------- */}
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_1fr]">
        <div className="space-y-5">
          {recommendation && out && (
            <>
              <div className="kf-card p-4">
                <StatusBanner rec={recommendation} language={language} compact />
                {loading && <p className="mt-2 text-xs text-leaf-600">{t('recalculated')}</p>}
              </div>

              <Card
                title={language === 'hi' ? 'ऑप्टिमाइज़र आउटपुट' : 'Optimizer output'}
                subtitle="POST /api/optimize"
              >
                <KeyValue
                  items={[
                    { label: 'irrigationRequired', value: out.irrigationRequired ? 'true' : 'false' },
                    { label: 'waterRequirement', value: `${out.waterRequirement.toLocaleString('en-IN')} L` },
                    { label: 'recommendedDuration', value: `${out.recommendedDuration} min · ${formatDuration(out.recommendedDuration)}` },
                    { label: 'recommendedTime', value: out.recommendedTime },
                    { label: 'solarSuitability', value: out.solarSuitability },
                    { label: 'energyRequirement', value: `${out.energyRequirement} kWh` },
                    { label: 'gridEnergy', value: `${out.gridEnergy} kWh` },
                    { label: 'solarEnergyUsed', value: `${out.solarEnergyUsed} kWh` },
                    { label: 'confidence', value: `${Math.round(out.confidence * 100)}%` },
                    { label: 'estimatedWaterSaving', value: `${out.estimatedWaterSaving.toLocaleString('en-IN')} L` },
                    { label: 'estimatedEnergySaving', value: `${out.estimatedEnergySaving} kWh` },
                    { label: 'estimatedCostSaving', value: `₹${out.estimatedCostSaving.toLocaleString('en-IN')}` },
                    { label: 'reason', value: pick(out.reason, language) },
                  ]}
                />
              </Card>
            </>
          )}

          {recommendation && (
            <Card title={language === 'hi' ? 'जल आवश्यकता मॉडल' : 'Water requirement model'} subtitle="ET0 × Kc → effective rainfall → gross depth">
              <div className="grid gap-3 sm:grid-cols-2">
                <Step icon={<Gauge size={15} />} label="ET0 (reference)" value={`${recommendation.water.et0} mm/day`} />
                <Step icon={<Layers size={15} />} label="Kc (crop coefficient)" value={recommendation.water.kc.toFixed(2)} />
                <Step icon={<Droplets size={15} />} label="ETc = ET0 × Kc" value={`${recommendation.water.etc} mm/day`} />
                <Step icon={<Waves size={15} />} label="Effective rainfall" value={`${recommendation.water.effectiveRainfall} mm`} />
                <Step icon={<Gauge size={15} />} label="Root-zone deficit" value={`${recommendation.water.deficitMm} mm`} />
                <Step icon={<Droplets size={15} />} label="Net requirement" value={`${recommendation.water.netDepthMm} mm`} />
                <Step icon={<Waves size={15} />} label="Gross (÷ irrigation efficiency)" value={`${recommendation.water.grossDepthMm} mm`} />
                <Step icon={<Droplets size={15} />} label="Volume (× farm area)" value={`${recommendation.water.volumeLitres.toLocaleString('en-IN')} L`} />
              </div>
              <div className="mt-4 rounded-xl border border-soil-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-soil-500">
                  {language === 'hi' ? 'ऊर्जा मॉडल' : 'Energy model'}
                </p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <Step label="Pump discharge" value={`${recommendation.energy.dischargeLitresPerHour.toLocaleString('en-IN')} L/h`} />
                  <Step label="Operating time" value={`${recommendation.energy.durationHours} h`} />
                  <Step label="Load = power ÷ efficiency" value={`${recommendation.energy.effectiveLoadKw} kW`} />
                  <Step label="Energy = load × time" value={`${recommendation.energy.energyRequiredKwh} kWh`} />
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          {recommendation && (
            <Card
              title={language === 'hi' ? 'सौर समय निर्धारण' : 'Solar-aware scheduling'}
              subtitle={`${language === 'hi' ? 'अनुशंसित विंडो' : 'Recommended window'}: ${recommendation.recommendedTime}`}
            >
              <SolarDemandChart curve={recommendation.solar.curve} window={recommendation.solar.recommendedWindow} />
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-soil-50 p-3">
                  <p className="text-xs text-soil-500">{language === 'hi' ? 'आज बनाम कल' : 'Today vs tomorrow'}</p>
                  <p className="mt-0.5 font-medium text-soil-900">
                    {recommendation.solar.todayWindow.label} → {recommendation.solar.tomorrowWindow.label}
                  </p>
                </div>
                <div className="rounded-lg bg-soil-50 p-3">
                  <p className="text-xs text-soil-500">{language === 'hi' ? 'समझ' : 'Reason'}</p>
                  <p className="mt-0.5 font-medium text-soil-900">{recommendation.solar.reason.replace(/_/g, ' ')}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-soil-500">
                {recommendation.solar.deferToNextDay
                  ? language === 'hi'
                    ? 'सौर कमज़ोर होने के कारण पंपिंग कल के उपयुक्त सौर विंडो में स्थानांतरित की गई है।'
                    : 'Solar is too weak today, so pumping has been moved to tomorrow’s suitable solar window.'
                  : language === 'hi'
                    ? 'विंडो को घंटे-दर-घंटे सौर वक्र पर सबसे ऊंचे भाग के लिए चुना गया है।'
                    : 'The window is chosen from the peak of the hourly solar curve for this run time.'}
              </p>
            </Card>
          )}

          {recommendation && (
            <Card title={language === 'hi' ? 'व्याख्या' : 'Explainable output'}>
              <ExplainablePanel rec={recommendation} language={language} />
            </Card>
          )}

          {recommendation && (
            <Card title={t('howCalculated')}>
              <AssumptionsPanel
                rec={recommendation}
                energyPrice={inputs.energyPricePerKwh}
                baselineFrequency={crop.irrigatedBaselineFrequencyDays}
                language={language}
              />
            </Card>
          )}

          <Callout tone="solar" title="Prototype simulation — field validation required.">
            {language === 'hi'
              ? 'जल, ऊर्जा और लागत मानक संबंधों से मॉडल किए गए अनुमान हैं।'
              : 'Water, energy and cost figures are modelled estimates from standard relationships, not field measurements.'}
          </Callout>
        </div>
      </div>
    </div>
  );
}

function Step({ icon, label, value }: { icon?: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-soil-200 bg-white p-3">
      {icon && <span className="mt-0.5 text-leaf-600">{icon}</span>}
      <span className="min-w-0">
        <span className="block text-xs text-soil-500">{label}</span>
        <span className="block text-sm font-semibold tabular-nums text-soil-900">{value}</span>
      </span>
    </div>
  );
}
