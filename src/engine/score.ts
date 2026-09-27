import { getCrop } from '@/data/crops';
import { getSoil } from '@/data/soils';
import type { ImpactResult, IrrigationInputs, ResourceScore, WeatherDay } from '@/lib/types';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * KrishiFlux Resource Efficiency Score.
 *
 * A weighted, fully disclosed composite. No opaque model output is presented as
 * a score: each component is derived from a quantity the farmer can inspect.
 */
export function computeResourceScore(
  input: IrrigationInputs,
  impact: ImpactResult,
  forecast: WeatherDay[],
): ResourceScore {
  const soil = getSoil(input.soilType);
  const crop = getCrop(input.cropType);

  // 1. Water efficiency — how much of the conventional water use was avoided.
  const waterEfficiency = clamp(100 - impact.saved.waterPercent, 0, 100);

  // 2. Energy efficiency — how much of the conventional pumping energy was avoided.
  const energyEfficiency = clamp(100 - impact.saved.energyPercent, 0, 100);

  // 3. Irrigation efficiency — the application efficiency configured for the farm.
  const irrigationEfficiency = clamp(input.irrigationEfficiency * 100, 0, 100);

  // 4. Climate adaptation — soil water retention + rainfall stability + heat exposure.
  const retention = clamp(((soil.fieldCapacity - soil.wiltingPoint) / 0.3) * 100, 0, 100);
  const rainValues = forecast.map((d) => d.rainProbability);
  const rainMean = rainValues.reduce((a, b) => a + b, 0) / Math.max(rainValues.length, 1);
  const rainSd = Math.sqrt(
    rainValues.reduce((a, b) => a + Math.pow(b - rainMean, 2), 0) / Math.max(rainValues.length, 1),
  );
  const rainStability = clamp(100 - rainSd * 2, 0, 100);
  const heatExposure = clamp(
    100 - forecast.filter((d) => d.isHeatwave).length * 25 - Math.max(0, rainMean - 60),
    0,
    100,
  );
  const stressTolerance = clamp(crop.stages[input.cropStage].waterStressSensitivity <= 0.5 ? 90 : 70, 0, 100);
  const climateAdaptation = +(0.35 * retention + 0.25 * rainStability + 0.2 * heatExposure + 0.2 * stressTolerance).toFixed(0);

  const components = [
    {
      key: 'water',
      label: { en: 'Water efficiency', hi: 'जल दक्षता' },
      value: +waterEfficiency.toFixed(0),
      weight: 0.3,
      explanation: {
        en: `Conventional water use avoided = ${impact.saved.waterPercent}% of the fixed-schedule baseline.`,
        hi: `स्थिर कार्यक्रम की तुलना में बचाया गया जल = ${impact.saved.waterPercent}%।`,
      },
    },
    {
      key: 'energy',
      label: { en: 'Energy efficiency', hi: 'ऊर्जा दक्षता' },
      value: +energyEfficiency.toFixed(0),
      weight: 0.3,
      explanation: {
        en: `Pumping energy avoided = ${impact.saved.energyPercent}% of baseline, including solar substitution.`,
        hi: `बचाई गई पंप ऊर्जा = आधार रेखा का ${impact.saved.energyPercent}%, सौर उपयोग सहित।`,
      },
    },
    {
      key: 'irrigation',
      label: { en: 'Irrigation efficiency', hi: 'सिंचाई दक्षता' },
      value: +irrigationEfficiency.toFixed(0),
      weight: 0.25,
      explanation: {
        en: `Configured application efficiency of the irrigation system (${(input.irrigationEfficiency * 100).toFixed(0)}%).`,
        hi: `सिंचाई प्रणाली की निर्धारित दक्षता (${(input.irrigationEfficiency * 100).toFixed(0)}%)।`,
      },
    },
    {
      key: 'climate',
      label: { en: 'Climate adaptation', hi: 'जलवायु अनुकूलन' },
      value: climateAdaptation,
      weight: 0.15,
      explanation: {
        en: `Soil water retention ${retention.toFixed(0)}%, rainfall stability ${rainStability.toFixed(0)}%, heat exposure ${heatExposure.toFixed(0)}%, stage stress tolerance ${stressTolerance}.`,
        hi: `मिट्टी जल धारण ${retention.toFixed(0)}%, वर्षा स्थिरता ${rainStability.toFixed(0)}%, ताप जोखिम ${heatExposure.toFixed(0)}%, अवस्था सहनशीलता ${stressTolerance}।`,
      },
    },
  ];

  const total = Math.round(components.reduce((s, c) => s + c.value * c.weight, 0));

  return {
    total,
    components,
    method: {
      en: 'Weighted average: water 30% + energy 30% + irrigation efficiency 25% + climate adaptation 15%. Every component is derived from measured or configured inputs — there is no hidden AI score.',
      hi: 'भारित औसत: जल 30% + ऊर्जा 30% + सिंचाई दक्षता 25% + जलवायु अनुकूलन 15%. प्रत्येक घटक मापे या निर्धारित इनपुट से निकाला जाता है — कोई छिपा AI स्कोर नहीं।',
    },
  };
}
