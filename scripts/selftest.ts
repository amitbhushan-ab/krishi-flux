/**
 * KrishiFlux engine self-test.
 *
 * Run:  npm run test:engine
 *
 * Proves the five interactions the judging brief requires:
 *   A change soil moisture      -> recommendation changes
 *   B change rainfall prob.     -> recommendation changes
 *   C change solar availability -> pump window changes (water stays put)
 *   D change crop stage         -> water requirement changes
 *   E baseline vs KrishiFlux    -> measurable resource differences
 */
import { GREEN_VALLEY, GREEN_VALLEY_CONDITIONS } from '../src/data/farms';
import { inputsFromFarm, forecastFor } from '../src/api/client';
import { recommend } from '../src/engine/recommendation';
import { simulateSeason } from '../src/engine/impact';

const base = inputsFromFarm(GREEN_VALLEY, GREEN_VALLEY_CONDITIONS);
const ctx = (i: typeof base) => ({ farmId: GREEN_VALLEY.id, forecast: forecastFor(i, GREEN_VALLEY.id) });

let failures = 0;
function check(name: string, ok: boolean, detail: string) {
  console.log(`${ok ? '  PASS' : 'FAIL'}  ${name}\n        ${detail}`);
  if (!ok) failures++;
}

// --- Proof A: soil moisture ---
const seed = recommend(base, ctx(base));
const wet = recommend({ ...base, soilMoisture: 45 }, ctx({ ...base, soilMoisture: 45 }));
const dry = recommend({ ...base, soilMoisture: 10 }, ctx({ ...base, soilMoisture: 10 }));
check(
  'A. Soil moisture changes the recommendation',
  seed.status !== wet.status && dry.waterLitres > seed.waterLitres,
  `24% -> "${seed.status}" ${Math.round(seed.waterLitres)} L | 45% -> "${wet.status}" ${Math.round(wet.waterLitres)} L | 10% -> "${dry.status}" ${Math.round(dry.waterLitres)} L`,
);

// --- Proof B: rainfall probability ---
const noRain = recommend({ ...base, rainProbability: 5 }, ctx({ ...base, rainProbability: 5 }));
const muchRain = recommend({ ...base, rainProbability: 90, rainfallForecast: 25 }, ctx({ ...base, rainProbability: 90, rainfallForecast: 25 }));
check(
  'B. Rainfall probability changes the recommendation',
  noRain.status !== muchRain.status,
  `5% -> "${noRain.status}" (${Math.round(noRain.waterLitres)} L) | 90% -> "${muchRain.status}" (${Math.round(muchRain.waterLitres)} L)`,
);

// --- Proof C: solar availability ---
const highSolar = recommend({ ...base, solarAvailability: 0.9 }, ctx({ ...base, solarAvailability: 0.9 }));
const lowSolar = recommend({ ...base, solarAvailability: 0.25 }, ctx({ ...base, solarAvailability: 0.25 }));
const windowMoves = highSolar.solar.recommendedWindow.label !== lowSolar.solar.recommendedWindow.label;
const waterHolds = Math.abs(highSolar.waterLitres - lowSolar.waterLitres) < 1;
check(
  'C. Solar availability changes the pump window (water unchanged)',
  windowMoves && waterHolds,
  `90% -> ${highSolar.solar.recommendedWindow.label} | 25% -> ${lowSolar.solar.recommendedWindow.label}` +
    ` | water ${Math.round(highSolar.waterLitres)} L vs ${Math.round(lowSolar.waterLitres)} L`,
);

// --- Proof D: crop stage ---
const vegetative = recommend({ ...base, cropStage: 'vegetative' }, ctx({ ...base, cropStage: 'vegetative' }));
const flowering = recommend({ ...base, cropStage: 'flowering' }, ctx({ ...base, cropStage: 'flowering' }));
const maturity = recommend({ ...base, cropStage: 'maturity' }, ctx({ ...base, cropStage: 'maturity' }));
check(
  'D. Crop stage changes the water requirement',
  vegetative.waterLitres !== flowering.waterLitres && flowering.waterLitres !== maturity.waterLitres,
  `vegetative ${Math.round(vegetative.waterLitres)} L | flowering ${Math.round(flowering.waterLitres)} L | maturity ${Math.round(maturity.waterLitres)} L`,
);

// --- Proof E: impact ---
const impact = simulateSeason({
  input: base,
  weather: forecastFor(base, GREEN_VALLEY.id, 90),
  horizonDays: 90,
  initialSoilMoisture: base.soilMoisture,
});
check(
  'E. Baseline vs KrishiFlux produces measurable differences',
  impact.baseline.waterLitres > impact.optimized.waterLitres &&
    impact.baseline.energyKwh > impact.optimized.energyKwh &&
    impact.saved.costInr > 0 &&
    impact.saved.irrigationEventsAvoided >= 0,
  `water ${impact.baseline.waterLitres} -> ${impact.optimized.waterLitres} L (-${impact.saved.waterPercent}%), ` +
    `energy ${impact.baseline.energyKwh} -> ${impact.optimized.energyKwh} kWh (-${impact.saved.energyPercent}%), ` +
    `cost -${impact.saved.costInr} INR, events ${impact.baseline.irrigationEvents} -> ${impact.optimized.irrigationEvents}`,
);

// --- Sanity: no NaN anywhere in a live recommendation ---
const nums = Object.entries(seed).filter(([, v]) => typeof v === 'number') as [string, number][];
const bad = nums.filter(([, v]) => !Number.isFinite(v));
check('Sanity. Recommendation contains no NaN/Infinity', bad.length === 0, bad.length ? bad.map(([k]) => k).join(', ') : 'all numeric fields finite');

console.log(`\n${failures === 0 ? 'ALL PROOFS PASSED' : `${failures} PROOF(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
