import type { WeatherDay } from '@/lib/types';

/**
 * Deterministic pseudo-random generator so every judge sees the same demo.
 * (mulberry32 — small, fast, reproducible.)
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export interface WeatherSeed {
  temperature: number;
  humidity: number;
  rainProbability: number;
  rainfallForecast: number;
  solarAvailability: number;
}

/**
 * Synthetic weather series.
 *
 * This is the "weather abstraction layer": the prototype has no external API
 * key, so the forecast is generated deterministically from the farm's seed
 * conditions and clearly labelled as simulated throughout the UI. Swapping in a
 * real provider (IMD / OpenWeather / Agmarknet) only requires replacing this
 * module — the rest of the engine consumes `WeatherDay[]`.
 */
export function generateForecast(seedConditions: WeatherSeed, seedKey: string, days = 7): WeatherDay[] {
  const rand = mulberry32(hashString(seedKey));
  const out: WeatherDay[] = [];
  const today = new Date();

  for (let d = 0; d < days; d++) {
    // Day 0 IS the observed farm condition: the dashboard reading and the
    // engine input must never disagree. Days 1..n are the forecast.
    if (d === 0) {
      const date = new Date(today);
      const spread = 4 + (1 - seedConditions.humidity / 100) * 10 + (1 - seedConditions.solarAvailability) * 3;
      out.push({
        date: date.toISOString().slice(0, 10),
        dayOffset: 0,
        temperature: +seedConditions.temperature.toFixed(1),
        tempMin: +(seedConditions.temperature - spread / 2).toFixed(1),
        tempMax: +(seedConditions.temperature + spread / 2).toFixed(1),
        humidity: +seedConditions.humidity.toFixed(0),
        rainProbability: +seedConditions.rainProbability.toFixed(0),
        rainfall: +seedConditions.rainfallForecast.toFixed(1),
        solarAvailability: +seedConditions.solarAvailability.toFixed(2),
        isHeatwave: seedConditions.temperature >= 40,
      });
      continue;
    }

    // Persistence with a slow seasonal wave: the series stays anchored to the
    // farm's seed conditions instead of drifting monotonically across a season.
    const drift = (rand() - 0.5) * 2;
    const wave = Math.sin((d + 1) / 3.5);
    const rainP = clamp(
      seedConditions.rainProbability + drift * 14 + wave * 7,
      2,
      95,
    );
    const temperature = clamp(
      seedConditions.temperature + (rand() - 0.5) * 3 + d * 0.3,
      12,
      46,
    );
    const humidity = clamp(
      seedConditions.humidity + (rand() - 0.5) * 10 + (rainP > 50 ? 8 : -4),
      20,
      98,
    );
    // Forecast rain volume; whether it counts is applied by effectiveRainfall().
    const rainfall = +clamp(seedConditions.rainfallForecast * (0.5 + rand()), 0, 60).toFixed(1);
    // Cloud cover suppresses solar availability.
    const cloud = rainP / 100;
    const solarAvailability = clamp(
      seedConditions.solarAvailability * (1 - cloud * 0.6) + (rand() - 0.5) * 0.05,
      0.08,
      0.98,
    );

    const date = new Date(today);
    date.setDate(today.getDate() + d);

    const spread = 4 + (1 - humidity / 100) * 10 + (1 - solarAvailability) * 3;

    out.push({
      date: date.toISOString().slice(0, 10),
      dayOffset: d,
      temperature: +temperature.toFixed(1),
      tempMin: +(temperature - spread / 2).toFixed(1),
      tempMax: +(temperature + spread / 2).toFixed(1),
      humidity: +humidity.toFixed(0),
      rainProbability: +rainP.toFixed(0),
      rainfall,
      solarAvailability: +solarAvailability.toFixed(2),
      isHeatwave: temperature >= 40,
    });
  }

  return out;
}

/** Groundwater / reservoir level trend used by the sensor page. */
export function waterLevelTrend(seedKey: string, days = 14): { date: string; level: number }[] {
  const rand = mulberry32(hashString(`${seedKey}-water`));
  let level = 62 + rand() * 20;
  const out: { date: string; level: number }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    level = clamp(level + (rand() - 0.55) * 3.5, 8, 100);
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    out.push({ date: date.toISOString().slice(0, 10), level: +level.toFixed(1) });
  }
  return out;
}
