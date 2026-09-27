import { GREEN_VALLEY_CONDITIONS, FPO_CONDITIONS, FPO_FARMS } from '@/data/farms';
import { generateForecast } from '@/data/weather';
import { fetchLiveForecast } from '@/data/liveWeather';
import { inputsFromFarm, type FarmConditions } from '@/api/clientShared';
import { recommend, toOptimizerOutput, type OptimizerOutput } from '@/engine/recommendation';
import { simulateSeason } from '@/engine/impact';
import { computeResourceScore } from '@/engine/score';
import { assessClimateRisks } from '@/engine/risk';
import { analyseImage } from '@/engine/cropHealth';
import { buildHourlyCurve } from '@/engine/solar';
import { validateInputs } from '@/engine/validate';
import type {
  ClimateRisk,
  CropHealthResult,
  Farm,
  ImpactResult,
  IrrigationInputs,
  Recommendation,
  ResourceScore,
  WeatherDay,
} from '@/lib/types';

// Re-exported so existing `from '@/api/client'` imports keep working.
export { inputsFromFarm, type FarmConditions };

/**
 * Application/API layer.
 *
 * The prototype runs the engine in-process so a live demo never depends on a
 * backend being up. Every function here maps 1:1 to a documented REST endpoint
 * (see README §API contract) and returns a Promise with realistic latency, so
 * swapping in `fetch('/api/...')` is a drop-in change without touching any UI
 * component.
 */

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** Demo-only fault injection, toggled from Settings, to prove error handling. */
let faultInjection = false;
export function setFaultInjection(on: boolean) {
  faultInjection = on;
}
export function isFaultInjectionOn() {
  return faultInjection;
}

const latency = (ms = 140) => new Promise<void>((r) => setTimeout(r, ms));

async function guard<T>(fn: () => T, ms = 140): Promise<T> {
  await latency(ms);
  if (faultInjection) {
    throw new ApiError('Simulated upstream service failure (demo fault injection is ON).', 503);
  }
  try {
    return fn();
  } catch (err) {
    // Validation / not-found errors surface with their status code; anything
    // else is masked so no stack traces ever reach the UI.
    if (err instanceof ApiError) throw err;
    if (
      err instanceof Error &&
      'statusCode' in err &&
      typeof (err as { statusCode?: unknown }).statusCode === 'number'
    ) {
      throw new ApiError(err.message, (err as { statusCode: number }).statusCode);
    }
    throw new ApiError('The decision engine could not complete this request. Please retry.', 500);
  }
}

// ------------------------------------------------------------ data source ----

/**
 * Where the forecast comes from. `simulated` is the deterministic demo series;
 * `live` uses Open-Meteo (no API key) and silently degrades to simulated.
 */
export type DataMode = 'simulated' | 'live';

let dataMode: DataMode = 'simulated';
export function setDataSource(mode: DataMode) {
  dataMode = mode;
}
export function getDataSource(): DataMode {
  return dataMode;
}

/**
 * Last live fetch outcome for honest UI display (Settings, Weather page).
 * `null` while never fetched or when the provider is unreachable.
 */
export interface LiveWeatherStatus {
  source: 'open-meteo';
  fetchedAt: string;
  resolvedLocation: string;
  condition: string;
  degradedToSimulated: boolean;
}
let lastLiveStatus: LiveWeatherStatus | null = null;
export function getLastLiveStatus(): LiveWeatherStatus | null {
  return lastLiveStatus;
}

/** Farm coordinates, when the farm record carries them. */
export interface Coords {
  latitude: number;
  longitude: number;
}

/**
 * Live forecast for a farm. Returns `null` when live mode is off, the farm has
 * no coordinates, or the provider is unreachable — callers fall back to
 * `forecastFor` in that case (Live → Simulated graceful degradation).
 */
export async function liveForecastFor(
  farmId: string,
  coords?: Coords,
): Promise<WeatherDay[] | null> {
  if (dataMode !== 'live' || !coords) return null;
  const result = await fetchLiveForecast(coords.latitude, coords.longitude);
  if (!result) {
    lastLiveStatus = {
      source: 'open-meteo',
      fetchedAt: new Date().toISOString(),
      resolvedLocation: `${coords.latitude}, ${coords.longitude}`,
      condition: 'unreachable',
      degradedToSimulated: true,
    };
    return null;
  }
  lastLiveStatus = { ...result, degradedToSimulated: false };
  return result.days;
}

/** Forecast keyed by the farm so the same inputs always produce the same series. */
export function forecastFor(input: IrrigationInputs, farmId: string, days = 7): WeatherDay[] {
  return generateForecast(
    {
      temperature: input.temperature,
      humidity: input.humidity,
      rainProbability: input.rainProbability,
      rainfallForecast: input.rainfallForecast,
      solarAvailability: input.solarAvailability,
    },
    farmId,
    days,
  );
}

// ------------------------------------------------------------------ cache ----

const CACHE_KEY = 'krishiflux.cache.v1';
const CACHE_LIMIT = 12;

interface CacheEntry {
  farmId: string;
  savedAt: string;
  recommendation: Recommendation;
}

export function readCache(): CacheEntry[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CacheEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCache(entry: CacheEntry): void {
  try {
    const list = readCache().filter((e) => e.farmId !== entry.farmId);
    list.unshift(entry);
    localStorage.setItem(CACHE_KEY, JSON.stringify(list.slice(0, CACHE_LIMIT)));
  } catch {
    /* storage full or unavailable — caching is best-effort */
  }
}

export function lastCachedRecommendation(farmId: string): CacheEntry | undefined {
  return readCache().find((e) => e.farmId === farmId);
}

export function clearCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

// --------------------------------------------------------------- endpoints ----

/** POST /api/recommendation */
export async function postRecommendation(
  input: IrrigationInputs,
  farmId: string,
): Promise<Recommendation> {
  return guard(() => {
    validateInputs(input);
    const rec = recommend(input, { farmId, forecast: forecastFor(input, farmId) });
    writeCache({ farmId, savedAt: new Date().toISOString(), recommendation: rec });
    return rec;
  });
}

/** POST /api/optimize */
export async function postOptimize(input: IrrigationInputs, farmId: string): Promise<OptimizerOutput> {
  const rec = await postRecommendation(input, farmId);
  return toOptimizerOutput(rec);
}

/** POST /api/simulate — one season, baseline vs optimized */
export async function postSimulate(
  input: IrrigationInputs,
  farmId: string,
  horizonDays?: number,
): Promise<ImpactResult> {
  return guard(() => {
    validateInputs(input);
    const horizon = horizonDays ?? 90;
    const weather = forecastFor(input, farmId, horizon);
    return simulateSeason({
      input,
      weather,
      horizonDays: horizon,
      initialSoilMoisture: input.soilMoisture,
    });
  }, 220);
}

/** GET /api/weather */
export async function getWeather(input: IrrigationInputs, farmId: string): Promise<WeatherDay[]> {
  return guard(() => forecastFor(input, farmId), 100);
}

/** GET /api/solar */
export async function getSolar(input: IrrigationInputs, farmId: string) {
  return guard(() => {
    const forecast = forecastFor(input, farmId, 2);
    const today = forecast[0];
    return {
      forecast,
      today,
      curve: buildHourlyCurve({
        dailySolar: today.solarAvailability,
        humidity: today.humidity,
        rainProbability: today.rainProbability,
        pumpLoadKw: input.pumpPowerKw / input.pumpEfficiency,
      }),
    };
  }, 100);
}

/** GET /api/farms */
export async function getFarms(): Promise<Farm[]> {
  return guard(() => FPO_FARMS, 80);
}

/** GET /api/farms/:id */
export async function getFarm(id: string, customFarm?: Farm): Promise<Farm> {
  return guard(() => {
    const farm = customFarm ?? FPO_FARMS.find((f) => f.id === id);
    if (!farm) throw new ApiError(`Farm ${id} not found.`, 404);
    return farm;
  }, 60);
}

/** GET /api/impact */
export async function getImpact(
  input: IrrigationInputs,
  farmId: string,
  horizonDays = 90,
): Promise<{ impact: ImpactResult; score: ResourceScore; risks: ClimateRisk[] }> {
  const forecast = forecastFor(input, farmId, Math.min(horizonDays, 7));
  const impact = await postSimulate(input, farmId, horizonDays);
  return {
    impact,
    score: computeResourceScore(input, impact, forecast),
    risks: assessClimateRisks(input, forecast),
  };
}

/** POST /api/crop-health */
export async function postCropHealth(fileName: string, input: IrrigationInputs): Promise<CropHealthResult> {
  return guard(() => analyseImage(fileName, input), 600);
}

/** GET /api/analytics — fleet-level aggregation for the FPO dashboard */
export interface FleetRow {
  farm: Farm;
  inputs: IrrigationInputs;
  recommendation: Recommendation;
  impact: ImpactResult;
  score: ResourceScore;
}

export async function getAnalytics(): Promise<FleetRow[]> {
  return guard(() => {
    return FPO_FARMS.map((farm) => {
      const cond = FPO_CONDITIONS[farm.id] ?? GREEN_VALLEY_CONDITIONS;
      const inputs = inputsFromFarm(farm, cond);
      const rec = recommend(inputs, { farmId: farm.id, forecast: forecastFor(inputs, farm.id) });
      const horizon = 60;
      const impact = simulateSeason({
        input: inputs,
        weather: forecastFor(inputs, farm.id, horizon),
        horizonDays: horizon,
        initialSoilMoisture: inputs.soilMoisture,
      });
      const score = computeResourceScore(inputs, impact, forecastFor(inputs, farm.id, 7));
      return { farm, inputs, recommendation: rec, impact, score };
    });
  }, 260);
}
