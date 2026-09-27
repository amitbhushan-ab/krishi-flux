import { getCrop } from '@/data/crops';
import { LITRES_PER_HOUR_PER_KW } from '@/engine/energy';
import { ACRES_TO_M2 } from '@/engine/water';
import type { IrrigationInputs } from '@/lib/types';

/**
 * Conventional baseline assumptions.
 *
 * The baseline models how the same farm is typically irrigated without
 * KrishiFlux: a fixed calendar schedule (every N days for the crop), applying a
 * fixed depth sized on the peak-season crop water use, with a lower application
 * efficiency (flood/furrow) and no solar-aware scheduling, so all energy comes
 * from the grid or diesel.
 */
export const BASELINE = {
  irrigationEfficiency: 0.65,
  /** Fixed depth is sized on peak Kc and the calendar interval. */
  overApplication: 1.05,
  pumpEfficiency: 0.55,
  /** Solar is not used in the conventional baseline. */
  solarShare: 0,
  /** Pump running in the middle of the day regardless of irradiation. */
  scheduleHour: 11,
} as const;

/** Peak crop water use (mm/day) across all stages. */
export function peakEtc(cropId: string, et0: number): number {
  const crop = getCrop(cropId);
  const peakKc = Math.max(...Object.values(crop.stages).map((s) => s.kc));
  return et0 * peakKc;
}

/**
 * Water applied in a single conventional irrigation event, in litres.
 * Sized to cover the crop's peak water use over its calendar interval.
 */
export function baselineEventLitres(input: IrrigationInputs, et0: number): number {
  const crop = getCrop(input.cropType);
  const interval = crop.irrigatedBaselineFrequencyDays;
  const netDepth = peakEtc(input.cropType, et0) * interval * BASELINE.overApplication;
  const grossDepth = netDepth / BASELINE.irrigationEfficiency;
  return +(grossDepth * input.areaAcres * ACRES_TO_M2).toFixed(0);
}

/** Baseline pump run time in hours for a given volume. */
export function baselineDurationHours(volumeLitres: number, pumpPowerKw: number): number {
  return volumeLitres / Math.max(pumpPowerKw * LITRES_PER_HOUR_PER_KW, 1);
}
