import { getCrop } from '@/data/crops';
import { getSoil, rootZoneCapacityMm } from '@/data/soils';
import { LITRES_PER_HOUR_PER_KW } from '@/engine/energy';
import type { IrrigationInputs, WaterModelResult } from '@/lib/types';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Longest practical single pumping run within one daylight solar window. */
export const MAX_RUN_HOURS = 11;

/** Reference extra-terrestrial radiation, MJ/m2/day. Documented regional assumption. */
export const RA_MJ = 24.0;

/** 1 mm of water over 1 m2 = 1 litre. */
export const LITRES_PER_MM_M2 = 1;
export const ACRES_TO_M2 = 4046.86;

/**
 * Simplified Hargreaves-style reference evapotranspiration.
 *
 *   ET0 = 0.0023 * Ra * (Tmean + 17.8) * sqrt(Tmax - Tmin)
 *
 * The daily temperature range is not a direct input in the simulator, so it is
 * approximated from humidity and solar availability (clear, dry days have a
 * wide diurnal range). This keeps the model transparent and monotonic in the
 * inputs the farmer can actually observe.
 */
export function referenceEt0(temperature: number, humidity: number, solarAvailability: number): number {
  const rh = clamp(humidity, 20, 100) / 100;
  const solar = clamp(solarAvailability, 0, 1);
  const diurnalRange = 4 + 12 * (1 - rh) * (0.6 + 0.4 * solar);
  const et0 = 0.0023 * RA_MJ * (temperature + 17.8) * Math.sqrt(Math.max(diurnalRange, 1));
  return +clamp(et0, 0.5, 11).toFixed(2);
}

/** Effective rainfall — the share of forecast rain actually stored in the root zone. */
export function effectiveRainfall(rainfallMm: number, rainProbability: number): number {
  const expected = (rainfallMm * clamp(rainProbability, 0, 100)) / 100;
  // Light showers are lost to evaporation and runoff; ~80% effective fraction.
  return +(expected * 0.8).toFixed(2);
}

export interface WaterBalanceOptions {
  /** Net depth that must be applied, mm. Set to 0 to only compute the balance. */
  netDepthMmOverride?: number;
}

/**
 * Root-zone water balance → gross irrigation requirement → litres.
 */
export function computeWaterModel(input: IrrigationInputs): WaterModelResult {
  const crop = getCrop(input.cropType);
  const soil = getSoil(input.soilType);
  const stage = crop.stages[input.cropStage];

  const et0 = referenceEt0(input.temperature, input.humidity, input.solarAvailability);
  const etc = +(et0 * stage.kc).toFixed(2);

  const capacityMm = rootZoneCapacityMm(soil, stage.rootDepth);
  // The sensor reading is a percentage of field moisture; convert to volumetric
  // water content (m3/m3) before comparing with field capacity / wilting point.
  const sm = clamp(input.soilMoisture / 100, 0, soil.fieldCapacity + 0.05);
  const awc = Math.max(1e-6, soil.fieldCapacity - soil.wiltingPoint);
  const availableFraction = clamp((sm - soil.wiltingPoint) / awc, 0, 1);
  const deficitMm = +Math.max(0, capacityMm * (1 - availableFraction)).toFixed(2);

  const effRain = effectiveRainfall(input.rainfallForecast, input.rainProbability);

  // Crop water use over the decision horizon (1 day) net of incoming rain.
  const dailyNetUse = Math.max(0, etc - effRain);

  // Irrigate when the soil has crossed the management-allowed-depletion line,
  // and refill the root zone. The applied depth is the larger of "refill the
  // deficit" and "cover today's crop water use" so the field is never left
  // short after a single application.
  const depletionThreshold = 1 - stage.mad;
  const belowThreshold = availableFraction < depletionThreshold;
  const rainCoversDemand = effRain >= dailyNetUse * 0.85 && input.rainProbability >= 60;

  let netDepthMm = 0;
  if (belowThreshold && !rainCoversDemand) {
    netDepthMm = Math.max(deficitMm, dailyNetUse);
  } else if (rainCoversDemand) {
    netDepthMm = 0;
  }

  const irrigationEfficiency = clamp(input.irrigationEfficiency, 0.3, 1);

  // A single event is limited by the longest practical pump run in daylight.
  // A dry field is refilled progressively rather than over-running the pump.
  const areaM2Before = input.areaAcres * ACRES_TO_M2;
  const maxRunLitres = (Math.max(0.1, input.pumpPowerKw) * LITRES_PER_HOUR_PER_KW) * MAX_RUN_HOURS;
  const maxNetDepthMm = (maxRunLitres * irrigationEfficiency) / Math.max(areaM2Before, 1);
  const cappedByPump = netDepthMm > maxNetDepthMm;
  if (cappedByPump) netDepthMm = maxNetDepthMm;
  const grossDepthMm = +(netDepthMm / irrigationEfficiency).toFixed(2);
  const areaM2 = input.areaAcres * ACRES_TO_M2;
  const volumeLitres = +(grossDepthMm * areaM2 * LITRES_PER_MM_M2).toFixed(0);

  return {
    et0,
    kc: stage.kc,
    etc,
    effectiveRainfall: effRain,
    deficitMm,
    rootZoneCapacityMm: +capacityMm.toFixed(1),
    availableFraction: +availableFraction.toFixed(3),
    netDepthMm: +netDepthMm.toFixed(2),
    grossDepthMm,
    volumeLitres,
    volumeCubicMetres: +(volumeLitres / 1000).toFixed(1),
    assumptions: [
      { label: 'Reference radiation (Ra)', value: `${RA_MJ} MJ/m²/day` },
      { label: 'Crop coefficient (Kc)', value: `${stage.kc.toFixed(2)} (${input.cropStage})` },
      { label: 'Root depth', value: `${stage.rootDepth.toFixed(2)} m` },
      { label: 'Root-zone capacity', value: `${capacityMm.toFixed(1)} mm` },
      { label: 'Field capacity / wilting point', value: `${soil.fieldCapacity} / ${soil.wiltingPoint} m³/m³` },
      { label: 'Management allowed depletion', value: `${(stage.mad * 100).toFixed(0)}%` },
      { label: 'Effective rainfall fraction', value: '0.80' },
      { label: 'Irrigation efficiency', value: `${(irrigationEfficiency * 100).toFixed(0)}%` },
      { label: 'Farm area', value: `${input.areaAcres} acres (${areaM2.toFixed(0)} m²)` },
      { label: 'Conversion', value: '1 mm over 1 m² = 1 litre' },
      {
        label: 'Max single pump run',
        value: cappedByPump
          ? `${MAX_RUN_HOURS} h (applied depth capped — refill continues next cycle)`
          : `${MAX_RUN_HOURS} h (not binding)`,
      },
    ],
  };
}
