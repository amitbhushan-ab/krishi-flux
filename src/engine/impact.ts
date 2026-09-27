import { getCrop, stageForSeasonDay } from '@/data/crops';
import { getSoil, rootZoneCapacityMm } from '@/data/soils';
import { BASELINE, baselineEventLitres, baselineDurationHours } from '@/engine/baseline';
import { bestWindow } from '@/engine/solar';
import { LITRES_PER_HOUR_PER_KW } from '@/engine/energy';
import { computeEnergyModel } from '@/engine/energy';
import { ACRES_TO_M2, effectiveRainfall, referenceEt0, MAX_RUN_HOURS } from '@/engine/water';
import type { ImpactResult, IrrigationInputs, WeatherDay } from '@/lib/types';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Cost of abstracted water, INR per 1000 litres (diesel/electric pumping overhead). */
export const WATER_COST_PER_KL = 0.4;

export interface SeasonSimulationOptions {
  input: IrrigationInputs;
  /** Day-by-day weather for the whole horizon (length >= horizonDays). */
  weather: WeatherDay[];
  horizonDays: number;
  /** Starting soil-moisture reading in percent (the farm's current sensor value). */
  initialSoilMoisture: number;
}

/**
 * Runs the same farm forward twice — once on the conventional fixed calendar
 * schedule, once under KrishiFlux dynamic, solar-aware scheduling — and reports
 * the resource difference. Every number is produced by the model; nothing is
 * hard-coded.
 *
 * Soil moisture is carried forward as a real state variable so that today's
 * decision changes tomorrow's soil, which is what makes the season totals
 * credible rather than an accumulation of independent snapshots.
 */
export function simulateSeason(opts: SeasonSimulationOptions): ImpactResult {
  const { input, weather, horizonDays } = opts;
  const crop = getCrop(input.cropType);
  const soil = getSoil(input.soilType);
  const interval = crop.irrigatedBaselineFrequencyDays;

  let smBase = opts.initialSoilMoisture / 100; // percentage -> volumetric water content
  let smOpt = opts.initialSoilMoisture / 100;

  let baseWater = 0;
  let baseEnergy = 0;
  let baseEvents = 0;
  let optWater = 0;
  let optEnergy = 0;
  let optSolar = 0;
  let optGrid = 0;
  let optEvents = 0;

  const daily: ImpactResult['daily'] = [];

  for (let day = 0; day < horizonDays; day++) {
    const w = weather[day % weather.length];
    const stage = crop.stages[stageForSeasonDay(input.cropType, day + 1)];
    const et0 = referenceEt0(w.temperature, w.humidity, w.solarAvailability);
    const etc = et0 * stage.kc;
    const rain = effectiveRainfall(w.rainfall, w.rainProbability);

    const capacity = rootZoneCapacityMm(soil, stage.rootDepth);

    // --- advance both soil states by crop use and rain ---
    const deltaTheta = (rain - etc) / (stage.rootDepth * 1000);
    smBase = clamp(smBase + deltaTheta, soil.wiltingPoint, soil.fieldCapacity);
    smOpt = clamp(smOpt + deltaTheta, soil.wiltingPoint, soil.fieldCapacity);

    const deficitFrom = (smValue: number) => {
      const avail = clamp((smValue - soil.wiltingPoint) * stage.rootDepth * 1000, 0, capacity);
      return +(capacity - avail).toFixed(3);
    };

    // ================= BASELINE: fixed calendar, fixed depth =================
    let dayBaseWater = 0;
    let dayBaseEnergy = 0;
    if (day % interval === 0 && day > 0) {
      const litres = baselineEventLitres({ ...input }, et0);
      dayBaseWater = litres;
      baseWater += litres;
      baseEvents++;
      const hours = baselineDurationHours(litres, input.pumpPowerKw);
      dayBaseEnergy = (input.pumpPowerKw / BASELINE.pumpEfficiency) * hours;
      baseEnergy += dayBaseEnergy;
      // Fixed depth often exceeds the deficit: the field ends up at field capacity.
      smBase = soil.fieldCapacity;
    }

    // ================= KRISHIFLUX: dynamic, solar-aware =================
    let dayOptWater = 0;
    let dayOptEnergy = 0;
    const netDepth = deficitFrom(smOpt);
    const belowThreshold = netDepth > (capacity * stage.mad);
    const rainCovers = rain >= etc * 0.85 && w.rainProbability >= 55;

    if (belowThreshold && !rainCovers && day > 0) {
      // Same daylight run-time cap as the daily recommendation engine, so the
      // season simulation and "today's action" never disagree about the pump.
      const efficiency = clamp(input.irrigationEfficiency, 0.3, 1);
      const areaM2 = input.areaAcres * ACRES_TO_M2;
      const maxNet =
        (Math.max(0.1, input.pumpPowerKw) * LITRES_PER_HOUR_PER_KW * MAX_RUN_HOURS * efficiency) /
        Math.max(areaM2, 1);
      const netApplied = Math.min(netDepth, maxNet);
      const grossDepth = netApplied / efficiency;
      const litres = grossDepth * areaM2;
      dayOptWater = litres;
      optWater += litres;
      optEvents++;
      const energy = computeEnergyModel({
        volumeLitres: litres,
        pumpPowerKw: input.pumpPowerKw,
        pumpEfficiency: input.pumpEfficiency,
        solarFraction: 1,
      });
      const window = bestWindow(
        energy.durationHours,
        w.solarAvailability,
        w.humidity,
        w.rainProbability,
        day,
      );
      const solarFraction = window.avgSolarFraction;
      const actual = computeEnergyModel({
        volumeLitres: litres,
        pumpPowerKw: input.pumpPowerKw,
        pumpEfficiency: input.pumpEfficiency,
        solarFraction,
      });
      dayOptEnergy = actual.energyRequiredKwh;
      optEnergy += actual.energyRequiredKwh;
      optSolar += actual.solarEnergyKwh;
      optGrid += actual.gridEnergyKwh;
      // The applied net depth refills the root zone by exactly that amount.
      smOpt = clamp(smOpt + netApplied / (stage.rootDepth * 1000), soil.wiltingPoint, soil.fieldCapacity);
    }

    daily.push({
      dayOffset: day,
      baselineWater: Math.round(dayBaseWater),
      optimizedWater: Math.round(dayOptWater),
      baselineEnergy: +dayBaseEnergy.toFixed(2),
      optimizedEnergy: +dayOptEnergy.toFixed(2),
    });
  }

  const baseCost = baseEnergy * input.energyPricePerKwh + (baseWater / 1000) * WATER_COST_PER_KL;
  const optCost = optEnergy * input.energyPricePerKwh + (optWater / 1000) * WATER_COST_PER_KL;

  const pct = (base: number, opt: number) => (base > 0 ? +(((base - opt) / base) * 100).toFixed(1) : 0);

  return {
    horizonDays,
    baseline: {
      waterLitres: Math.round(baseWater),
      energyKwh: +baseEnergy.toFixed(1),
      costInr: Math.round(baseCost),
      irrigationEvents: baseEvents,
    },
    optimized: {
      waterLitres: Math.round(optWater),
      energyKwh: +optEnergy.toFixed(1),
      costInr: Math.round(optCost),
      irrigationEvents: optEvents,
      solarEnergyKwh: +optSolar.toFixed(1),
      gridEnergyKwh: +optGrid.toFixed(1),
    },
    saved: {
      waterLitres: Math.round(baseWater - optWater),
      waterPercent: pct(baseWater, optWater),
      energyKwh: +(baseEnergy - optEnergy).toFixed(1),
      energyPercent: pct(baseEnergy, optEnergy),
      costInr: Math.round(baseCost - optCost),
      costPercent: pct(baseCost, optCost),
      irrigationEventsAvoided: baseEvents - optEvents,
    },
    daily,
  };
}
