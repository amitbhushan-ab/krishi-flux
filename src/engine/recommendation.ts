import { getCrop, stageMeta } from '@/data/crops';
import { generateForecast } from '@/data/weather';
import { computeEnergyModel } from '@/engine/energy';
import { simulateSeason } from '@/engine/impact';
import { planSolar } from '@/engine/solar';
import { computeWaterModel, referenceEt0 } from '@/engine/water';
import type {
  CropStageId,
  IrrigationInputs,
  Recommendation,
  RecommendationFactor,
  WeatherDay,
} from '@/lib/types';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Reference ET0 upper bound used to normalise the "crop water demand" factor. */
const ET0_MAX = 9;

/** Horizon used for the estimated saving figures quoted by the optimizer. */
export const SAVINGS_HORIZON_DAYS = 30;

export interface RecommendationContext {
  farmId: string;
  /** Today followed by the coming days (at least 2 entries). */
  forecast: WeatherDay[];
}

/**
 * The AI irrigation decision engine + water–energy co-optimizer.
 *
 * Pipeline: weather/soil/crop → water balance → pump run time → solar-aware
 * window → energy split → explainable recommendation.
 */
export function recommend(input: IrrigationInputs, ctx: RecommendationContext): Recommendation {
  const crop = getCrop(input.cropType);
  const stage = crop.stages[input.cropStage];
  const today = ctx.forecast[0];
  const tomorrow = ctx.forecast[1] ?? ctx.forecast[0];

  const water = computeWaterModel(input);
  const rainCoversDemand = water.netDepthMm === 0 && input.rainProbability >= 55;

  const required = water.netDepthMm > 0;

  // ---- Co-optimization: the water requirement fixes the run time; solar chooses when ----
  const provisionalEnergy = computeEnergyModel({
    volumeLitres: water.volumeLitres,
    pumpPowerKw: input.pumpPowerKw,
    pumpEfficiency: input.pumpEfficiency,
    solarFraction: 1,
  });
  const runHours = required ? provisionalEnergy.durationHours : 0.5;

  const { plan: solarPlan, curve } = planSolar({
    durationHours: runHours,
    today,
    tomorrow,
    pumpLoadKw: input.pumpPowerKw / clamp(input.pumpEfficiency, 0.2, 1),
  });

  const energy = computeEnergyModel({
    volumeLitres: water.volumeLitres,
    pumpPowerKw: input.pumpPowerKw,
    pumpEfficiency: input.pumpEfficiency,
    solarFraction: solarPlan.recommendedWindow.avgSolarFraction,
  });

  // ---- Decision status ----
  let status: Recommendation['status'];
  if (!required) {
    status = rainCoversDemand ? 'skip' : 'monitor';
  } else if (input.rainProbability >= 55 && water.effectiveRainfall >= water.netDepthMm * 0.5) {
    status = 'delay';
  } else {
    status = 'irrigate';
  }

  // ---- Confidence (transparent, from data margins — not an ML probability) ----
  const threshold = 1 - stage.mad;
  const soilMargin = clamp(Math.abs(water.availableFraction - threshold) / Math.max(stage.mad, 0.2), 0, 1);
  const rainSpread = ctx.forecast.slice(0, 3);
  const rainMean = rainSpread.reduce((s, d) => s + d.rainProbability, 0) / Math.max(rainSpread.length, 1);
  const rainVariance =
    rainSpread.reduce((s, d) => s + Math.pow(d.rainProbability - rainMean, 2), 0) /
    Math.max(rainSpread.length, 1);
  const weatherConf = 1 - clamp(Math.sqrt(rainVariance) / 50, 0, 1);
  const solarConf = 1 - clamp(Math.abs(today.solarAvailability - solarPlan.recommendedWindow.avgSolarFraction), 0, 1);
  const confidence = +clamp(0.4 + 0.3 * soilMargin + 0.2 * weatherConf + 0.1 * solarConf, 0.4, 0.96).toFixed(2);

  // ---- Estimated savings: modelled over a 30-day horizon, not a guess ----
  // A single event can legitimately apply MORE water than the fixed baseline
  // (a dry field needs a refill), so quoting per-event savings would be
  // misleading. The number shown is what the same farm saves over 30 days.
  const savingsWeather = generateForecast(
    {
      temperature: input.temperature,
      humidity: input.humidity,
      rainProbability: input.rainProbability,
      rainfallForecast: input.rainfallForecast,
      solarAvailability: input.solarAvailability,
    },
    ctx.farmId,
    SAVINGS_HORIZON_DAYS,
  );
  const savingsSeason = simulateSeason({
    input,
    weather: savingsWeather,
    horizonDays: SAVINGS_HORIZON_DAYS,
    initialSoilMoisture: input.soilMoisture,
  });
  const estimatedWaterSavingLitres = savingsSeason.saved.waterLitres;
  const estimatedEnergySavingKwh = savingsSeason.saved.energyKwh;
  const estimatedCostSavingInr = savingsSeason.saved.costInr;
  water.assumptions.push({
    label: 'Estimated savings horizon',
    value: `${SAVINGS_HORIZON_DAYS} days (baseline vs KrishiFlux season simulation)`,
  });

  // ---- Explainability ----
  const factors: RecommendationFactor[] = [
    {
      key: 'soilMoisture',
      label: { en: 'Soil moisture (plant-available)', hi: 'मिट्टी की नमी (उपलब्ध)' },
      value: Math.round(water.availableFraction * 100),
      direction: water.availableFraction < threshold ? 'down' : 'up',
      detail: {
        en: `${input.soilMoisture.toFixed(1)}% volumetric — ${(water.availableFraction * 100).toFixed(0)}% of root-zone available water, deficit ${water.deficitMm} mm`,
        hi: `${input.soilMoisture.toFixed(1)}% मात्रा — जड़ क्षेत्र के उपलब्ध जल का ${(water.availableFraction * 100).toFixed(0)}%, कमी ${water.deficitMm} मिमी`,
      },
    },
    {
      key: 'rainProbability',
      label: { en: 'Rain probability', hi: 'बारिश की संभावना' },
      value: Math.round(input.rainProbability),
      direction: input.rainProbability >= 55 ? 'up' : 'down',
      detail: {
        en: `${input.rainProbability.toFixed(0)}% chance, ~${water.effectiveRainfall} mm effective rainfall`,
        hi: `${input.rainProbability.toFixed(0)}% संभावना, ~${water.effectiveRainfall} मिमी प्रभावी वर्षा`,
      },
    },
    {
      key: 'cropWaterDemand',
      label: { en: 'Crop water demand', hi: 'फसल जल मांग' },
      value: Math.round(clamp((water.etc / ET0_MAX) * 100, 0, 100)),
      direction: 'up',
      detail: {
        en: `ETc ${water.etc} mm/day at ${stageMeta[input.cropStage].en} (Kc ${stage.kc.toFixed(2)})`,
        hi: `${stageMeta[input.cropStage].hi} में ETc ${water.etc} मिमी/दिन (Kc ${stage.kc.toFixed(2)})`,
      },
    },
    {
      key: 'solarAvailability',
      label: { en: 'Solar availability', hi: 'सौर उपलब्धता' },
      value: Math.round(today.solarAvailability * 100),
      direction: 'up',
      detail: {
        en: `${Math.round(today.solarAvailability * 100)}% daily — ${Math.round(
          solarPlan.recommendedWindow.avgSolarFraction * 100,
        )}% across the pump window`,
        hi: `${Math.round(today.solarAvailability * 100)}% दैनिक — पंप विंडो में ${Math.round(
          solarPlan.recommendedWindow.avgSolarFraction * 100,
        )}%`,
      },
    },
  ];

  const solarWord = {
    excellent: { en: 'strong', hi: 'अच्छी' },
    good: { en: 'good', hi: 'उपयुक्त' },
    moderate: { en: 'moderate', hi: 'मध्यम' },
    poor: { en: 'limited', hi: 'कमज़ोर' },
  }[solarPlan.suitability];

  const reason = buildReason({
    status,
    input,
    stageLabel: stageMeta[input.cropStage],
    water,
    solarWord,
    defer: solarPlan.deferToNextDay,
    windowLabel: solarPlan.recommendedWindow.label,
  });

  const modelNotes = [
    {
      en: 'Prototype simulation — field validation required. Water and energy figures are modelled estimates from the transparent seasonal balance, not measured field results.',
      hi: 'प्रोटोटाइप सिमुलेशन — क्षेत्र सत्यापन आवश्यक। जल एवं ऊर्जा आंकड़े पारदर्शी मॉडल से अनुमानित हैं, मापे गए परिणाम नहीं।',
    },
    {
      en: 'No yield or income improvement is claimed. Only water, energy and cost resource differences are modelled.',
      hi: 'उपज या आय में वृद्धि का दावा नहीं है। केवल जल, ऊर्जा एवं लागत अंतर का मॉडल प्रस्तुत है।',
    },
  ];

  const recommendedTime = solarPlan.deferToNextDay
    ? `Tomorrow, ${solarPlan.recommendedWindow.label}`
    : solarPlan.recommendedWindow.label;

  return {
    farmId: ctx.farmId,
    timestamp: new Date().toISOString(),
    required,
    status,
    waterLitres: water.volumeLitres,
    depthMm: water.grossDepthMm,
    durationMinutes: required ? energy.durationMinutes : 0,
    recommendedTime: required ? recommendedTime : '—',
    solarSuitability: solarPlan.suitability,
    energyRequirementKwh: energy.energyRequiredKwh,
    solarEnergyKwh: energy.solarEnergyKwh,
    gridEnergyKwh: energy.gridEnergyKwh,
    confidence,
    estimatedCostInr: +(energy.gridEnergyKwh * input.energyPricePerKwh).toFixed(0),
    estimatedWaterSavingLitres,
    estimatedEnergySavingKwh: +estimatedEnergySavingKwh.toFixed(1),
    estimatedCostSavingInr,
    reason,
    factors,
    water,
    energy,
    solar: { ...solarPlan, curve },
    modelNotes,
  };
}

function buildReason(args: {
  status: Recommendation['status'];
  input: IrrigationInputs;
  stageLabel: { en: string; hi: string };
  water: ReturnType<typeof computeWaterModel>;
  solarWord: { en: string; hi: string };
  defer: boolean;
  windowLabel: string;
}): { en: string; hi: string } {
  const { status, input, stageLabel, water, solarWord, defer, windowLabel } = args;
  const crop = getCrop(input.cropType).label;

  switch (status) {
    case 'irrigate':
      return {
        en: `Irrigation is recommended because soil moisture (${input.soilMoisture.toFixed(
          1,
        )}%) is below the ${stageLabel.en.toLowerCase()} threshold for ${crop.en} and rainfall is not expected to cover demand. Solar availability is ${solarWord.en}, so pumping is scheduled in the highest-solar window${defer ? ' tomorrow' : ` (${windowLabel})`}.`,
        hi: `सिंचाई की सलाह है क्योंकि मिट्टी की नमी (${input.soilMoisture.toFixed(
          1,
        )}%) ${crop.hi} की ${stageLabel.hi} अवस्था के लिए तय स्तर से नीचे है और बारिश से मांग पूरी होने की संभावना कम है। सौर उपलब्धता ${solarWord.hi} है, इसलिए पंप सबसे उपयुक्त सौर समय${defer ? ' कल' : ` (${windowLabel})`} में चलाना ठीक रहेगा।`,
      };
    case 'delay':
      return {
        en: `Delay irrigation. Rain probability is ${input.rainProbability.toFixed(
          0,
        )}% with about ${water.effectiveRainfall} mm of effective rainfall expected, which should cover part of the crop water demand. Re-check after the rain.`,
        hi: `सिंचाई टालें। बारिश की संभावना ${input.rainProbability.toFixed(
          0,
        )}% है और लगभग ${water.effectiveRainfall} मिमी प्रभावी वर्षा अपेक्षित है, जो फसल की जल मांग का कुछ हिस्सा पूरा करेगी। बारिश के बाद दोबारा जांचें।`,
      };
    case 'skip':
      return {
        en: `No irrigation needed. Soil moisture is adequate for ${crop.en} at ${stageLabel.en.toLowerCase()} and rain is expected (${input.rainProbability.toFixed(
          0,
        )}% chance, ~${water.effectiveRainfall} mm).`,
        hi: `सिंचाई की आवश्यकता नहीं। ${crop.hi} की ${stageLabel.hi} अवस्था के लिए मिट्टी में पर्याप्त नमी है और बारिश की संभावना है (${input.rainProbability.toFixed(
          0,
        )}%, ~${water.effectiveRainfall} मिमी)।`,
      };
    case 'monitor':
    default:
      return {
        en: `No irrigation needed today. Soil moisture (${input.soilMoisture.toFixed(
          1,
        )}%) is adequate for ${crop.en} at ${stageLabel.en.toLowerCase()}; continue monitoring. Crop water demand is ${water.etc} mm/day.`,
        hi: `आज सिंचाई की आवश्यकता नहीं। ${crop.hi} की ${stageLabel.hi} अवस्था के लिए मिट्टी की नमी (${input.soilMoisture.toFixed(
          1,
        )}%) पर्याप्त है; निगरानी जारी रखें। फसल जल मांग ${water.etc} मिमी/दिन है।`,
      };
  }
}

/** Convenience: the water–energy optimizer endpoint payload. */
export interface OptimizerOutput {
  irrigationRequired: boolean;
  waterRequirement: number;
  recommendedDuration: number;
  recommendedTime: string;
  solarSuitability: Recommendation['solarSuitability'];
  energyRequirement: number;
  reason: { en: string; hi: string };
  confidence: number;
  estimatedWaterSaving: number;
  estimatedEnergySaving: number;
  estimatedCostSaving: number;
  status: Recommendation['status'];
  gridEnergy: number;
  solarEnergyUsed: number;
}

export function toOptimizerOutput(rec: Recommendation): OptimizerOutput {
  return {
    irrigationRequired: rec.required,
    waterRequirement: rec.waterLitres,
    recommendedDuration: rec.durationMinutes,
    recommendedTime: rec.recommendedTime,
    solarSuitability: rec.solarSuitability,
    energyRequirement: rec.energyRequirementKwh,
    reason: rec.reason,
    confidence: rec.confidence,
    estimatedWaterSaving: rec.estimatedWaterSavingLitres,
    estimatedEnergySaving: rec.estimatedEnergySavingKwh,
    estimatedCostSaving: rec.estimatedCostSavingInr,
    status: rec.status,
    gridEnergy: rec.gridEnergyKwh,
    solarEnergyUsed: rec.solarEnergyKwh,
  };
}

export const STAGE_LABELS = stageMeta;
export type { CropStageId };
