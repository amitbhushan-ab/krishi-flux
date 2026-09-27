/**
 * Live weather provider — Open-Meteo (https://open-meteo.com).
 *
 * Free for non-commercial use, requires NO API key. This module is the real
 * implementation behind the "Data source" switch in Settings; it maps the
 * provider's response onto the SAME `WeatherDay` shape the deterministic
 * simulation produces, so the rest of the engine never knows the difference.
 *
 * Failures (no network, provider outage, bad coordinates) never break the app:
 * the caller receives `null` and falls back to the simulated forecast.
 */

import type { WeatherDay } from '@/lib/types';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

/** Internal detail — Open-Meteo weather codes mapped to a simple label. */
const WEATHER_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  80: 'Rain showers',
  81: 'Moderate showers',
  82: 'Violent showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Severe thunderstorm with hail',
};

export interface LiveWeatherResult {
  days: WeatherDay[];
  /** Where the data actually came from, for honest UI display. */
  source: 'open-meteo';
  fetchedAt: string;
  /** Provider label for the response, e.g. "Pune, IN". */
  resolvedLocation: string;
  /** Human-readable description of today's condition, when the code maps. */
  condition: string;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Short-term open-meteo cache: avoids re-fetching on every slider wiggle. */
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const cache = new Map<string, { at: number; result: LiveWeatherResult }>();

/**
 * Fetch a 7-day live forecast. Returns `null` on ANY failure — callers must
 * fall back to the deterministic simulation (this is the documented graceful
 * degradation: Live → Simulated, never a broken page).
 */
export async function fetchLiveForecast(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<LiveWeatherResult | null> {
  const lat = latitude.toFixed(2);
  const lon = longitude.toFixed(2);
  const key = `${lat},${lon}`;

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.result;

  try {
    const url =
      `${OPEN_METEO_URL}?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,weather_code` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,` +
      `precipitation_probability_max,shortwave_radiation_sum` +
      `&timezone=auto&forecast_days=7`;

    const res = await fetch(url, { signal });
    if (!res.ok) return null;

    const json = (await res.json()) as OpenMeteoResponse;
    if (!json?.daily?.time?.length) return null;

    const today = new Date();
    const days: WeatherDay[] = json.daily.time.map((iso, i) => {
      const tMax = json.daily.temperature_2m_max[i];
      const tMin = json.daily.temperature_2m_min[i];
      const rainMm = json.daily.precipitation_sum[i] ?? 0;
      const rainProb = json.daily.precipitation_probability_max[i] ?? 0;
      // MJ/m²/day → fraction of a clear-reference day. ~31 MJ/m² is a strong
      // tropical clear-sky day; anything above clamps at 0.98.
      const solar = clamp((json.daily.shortwave_radiation_sum[i] ?? 0) / 31, 0.08, 0.98);

      const d = new Date(iso + 'T00:00:00');
      const dayOffset = Math.round((d.getTime() - new Date(today.toISOString().slice(0, 10) + 'T00:00:00').getTime()) / 86400000);

      return {
        date: iso,
        dayOffset,
        temperature: +(((tMax + tMin) / 2) || json.current?.temperature_2m || 25).toFixed(1),
        tempMin: +tMin.toFixed(1),
        tempMax: +tMax.toFixed(1),
        humidity: Math.round(json.current?.relative_humidity_2m ?? 60),
        rainProbability: Math.round(clamp(rainProb, 0, 100)),
        rainfall: +rainMm.toFixed(1),
        solarAvailability: +solar.toFixed(2),
        isHeatwave: tMax >= 40,
      };
    });

    const result: LiveWeatherResult = {
      days,
      source: 'open-meteo',
      fetchedAt: new Date().toISOString(),
      // Truthful label: coordinates plus the IANA timezone. (Deriving a city
      // name from the timezone is misleading — Asia/Kolkata covers all of India.)
      resolvedLocation: `${lat}, ${lon} · ${json.timezone}`,
      condition: WEATHER_CODES[json.current?.weather_code ?? -1] ?? 'Live data',
    };

    cache.set(key, { at: Date.now(), result });
    return result;
  } catch {
    // Network error / abort / provider outage — caller falls back.
    return null;
  }
}

/** Minimal typing of the Open-Meteo response (only the fields we consume). */
interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current?: {
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    shortwave_radiation_sum: number[];
  };
}
