import type { EnergyModelResult } from '@/lib/types';

/**
 * Specific discharge of a typical agricultural pump, litres per hour per kW of
 * rated shaft power, from the standard hydraulic power relation
 *     P = ρ g Q H / η
 * For a low-head irrigation set (~10 m total dynamic head, 55% overall
 * efficiency):
 *     Q = 1000 W × 0.55 / (9810 N/m³ × 10 m) = 5.6e-3 m³/s = 20,000 L/h.
 * Documented as a modelling assumption in the UI (see AssumptionsPanel).
 */
export const LITRES_PER_HOUR_PER_KW = 20000;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Energy required to deliver a volume of water.
 *
 *   duration  = volume / (pumpPower * specificDischarge)
 *   load      = pumpPower / pumpEfficiency      (electrical draw)
 *   energy    = load * duration                 (kWh)
 *   solar     = energy * solarFraction(window)
 *   grid      = energy - solar
 */
export function computeEnergyModel(params: {
  volumeLitres: number;
  pumpPowerKw: number;
  pumpEfficiency: number;
  /** Average solar fraction across the chosen pumping window, 0..1. */
  solarFraction: number;
}): EnergyModelResult {
  const pumpPowerKw = Math.max(0.1, params.pumpPowerKw);
  const pumpEfficiency = clamp(params.pumpEfficiency, 0.2, 1);
  const discharge = pumpPowerKw * LITRES_PER_HOUR_PER_KW;
  const durationHours = params.volumeLitres > 0 ? params.volumeLitres / discharge : 0;
  const effectiveLoadKw = pumpPowerKw / pumpEfficiency;
  const energyRequiredKwh = effectiveLoadKw * durationHours;

  const solarFraction = clamp(params.solarFraction, 0, 1);
  const solarEnergyKwh = energyRequiredKwh * solarFraction;
  const gridEnergyKwh = energyRequiredKwh - solarEnergyKwh;

  return {
    dischargeLitresPerHour: Math.round(discharge),
    durationHours: +durationHours.toFixed(3),
    durationMinutes: Math.round(durationHours * 60),
    energyRequiredKwh: +energyRequiredKwh.toFixed(2),
    solarFraction: +solarFraction.toFixed(3),
    solarEnergyKwh: +solarEnergyKwh.toFixed(2),
    gridEnergyKwh: +gridEnergyKwh.toFixed(2),
    effectiveLoadKw: +effectiveLoadKw.toFixed(2),
  };
}

/** Formats minutes into "2 h 18 min" / "48 min". */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0 min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function formatLitres(litres: number): string {
  if (litres >= 1_000_000) return `${(litres / 1_000_000).toFixed(2)} ML`;
  if (litres >= 1000) return `${Math.round(litres).toLocaleString('en-IN')} L`;
  return `${Math.round(litres)} L`;
}
