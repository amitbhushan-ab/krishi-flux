/**
 * KrishiFlux API self-test.
 *
 * Run:  npm run test:api
 *
 * Boots the real Express app on an ephemeral port and exercises the documented
 * REST contract end-to-end: happy paths, validation errors (400), not-found
 * (404) and the in-process fallback parity (the same inputs must produce the
 * same recommendation whether computed in-browser or on the server).
 */

import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createApp } from '../server/index';
import { GREEN_VALLEY, GREEN_VALLEY_CONDITIONS } from '../src/data/farms';
import { inputsFromFarm } from '../src/api/clientShared';
import { recommend } from '../src/engine/recommendation';
import { generateForecast } from '../src/data/weather';
import type { Recommendation } from '../src/lib/types';

let failures = 0;
function check(name: string, ok: boolean, detail = '') {
  console.log(`${ok ? '  PASS' : 'FAIL'}  ${name}${detail ? `\n        ${detail}` : ''}`);
  if (!ok) failures++;
}

const base = inputsFromFarm(GREEN_VALLEY, GREEN_VALLEY_CONDITIONS);

const server: Server = createApp().listen(0);
const { port } = server.address() as AddressInfo;
const url = (path: string) => `http://127.0.0.1:${port}${path}`;

async function postJson(path: string, body: unknown): Promise<{ status: number; body: any }> {
  const res = await fetch(url(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as any };
}

async function getJson(path: string): Promise<{ status: number; body: any }> {
  const res = await fetch(url(path));
  return { status: res.status, body: (await res.json()) as any };
}

try {
  // --- health ---
  const health = await getJson('/api/health');
  check('GET /api/health', health.status === 200 && health.body.ok === true);

  // --- recommendation happy path ---
  const rec = await postJson('/api/recommendation', { farmId: GREEN_VALLEY.id, inputs: base });
  check(
    'POST /api/recommendation returns a full decision',
    rec.status === 200 &&
      typeof rec.body.waterLitres === 'number' &&
      typeof rec.body.recommendedTime === 'string' &&
      typeof rec.body.confidence === 'number' &&
      Array.isArray(rec.body.factors),
    `status ${rec.status} · ${Math.round(rec.body.waterLitres ?? NaN)} L · ${rec.body.recommendedTime ?? '?'}`,
  );

  // --- parity: server recommendation === in-process engine recommendation ---
  const localRec: Recommendation = recommend(base, {
    farmId: GREEN_VALLEY.id,
    forecast: generateForecast(
      {
        temperature: base.temperature,
        humidity: base.humidity,
        rainProbability: base.rainProbability,
        rainfallForecast: base.rainfallForecast,
        solarAvailability: base.solarAvailability,
      },
      GREEN_VALLEY.id,
    ),
  });
  check(
    'Server engine matches in-process engine (same inputs → same decision)',
    Math.abs((rec.body.waterLitres as number) - localRec.waterLitres) < 0.01 &&
      rec.body.status === localRec.status &&
      rec.body.recommendedTime === localRec.recommendedTime,
    `server ${Math.round(rec.body.waterLitres)} L/${rec.body.status} · local ${Math.round(localRec.waterLitres)} L/${localRec.status}`,
  );

  // --- validation ---
  const bad = await postJson('/api/recommendation', {
    farmId: GREEN_VALLEY.id,
    inputs: { ...base, soilMoisture: 900 },
  });
  check('Invalid inputs rejected with 400 + message', bad.status === 400 && /soil moisture/.test(String(bad.body.error)), String(bad.body.error));

  const badFarm = await postJson('/api/recommendation', { farmId: '', inputs: base });
  check('Empty farmId rejected with 400', badFarm.status === 400);

  // --- not found ---
  const nf = await getJson('/api/farms/does-not-exist');
  check('Unknown farm returns 404', nf.status === 404, String(nf.body.error));

  // --- other endpoints ---
  const opt = await postJson('/api/optimize', { farmId: GREEN_VALLEY.id, inputs: base });
  check('POST /api/optimize', opt.status === 200 && opt.body != null && typeof opt.body === 'object');

  const sim = await postJson('/api/simulate', { farmId: GREEN_VALLEY.id, inputs: base, horizonDays: 60 });
  check(
    'POST /api/simulate (60-day season)',
    sim.status === 200 && sim.body.horizonDays === 60 && sim.body.baseline?.waterLitres > 0 && sim.body.saved?.costInr > 0,
    `water -${sim.body.saved?.waterPercent}% · cost -₹${sim.body.saved?.costInr}`,
  );

  const weather = await getJson(`/api/weather?farmId=${GREEN_VALLEY.id}`);
  check(
    'GET /api/weather (7-day series)',
    weather.status === 200 && Array.isArray(weather.body) && weather.body.length === 7,
  );

  const solar = await getJson(`/api/solar?farmId=${GREEN_VALLEY.id}`);
  check(
    'GET /api/solar (hourly curve + window)',
    solar.status === 200 && Array.isArray(solar.body.curve) && solar.body.today != null,
  );

  const farms = await getJson('/api/farms');
  check('GET /api/farms (FPO fleet)', farms.status === 200 && Array.isArray(farms.body) && farms.body.length === 6);

  const impact = await getJson(`/api/impact?farmId=${GREEN_VALLEY.id}&horizon=90`);
  check(
    'GET /api/impact (impact + score + risks)',
    impact.status === 200 && impact.body.impact != null && impact.body.score?.total != null && Array.isArray(impact.body.risks),
    `score ${impact.body.score?.total} · ${impact.body.risks?.length} risks`,
  );

  const crop = await postJson('/api/crop-health', { farmId: GREEN_VALLEY.id, inputs: base, fileName: 'leaf.jpg' });
  check('POST /api/crop-health (simulated: true)', crop.status === 200 && crop.body.simulated === true);

  const analytics = await getJson('/api/analytics');
  check(
    'GET /api/analytics (fleet rows)',
    analytics.status === 200 && Array.isArray(analytics.body) && analytics.body.length === 6 && analytics.body[0].score?.total != null,
  );

  // --- mask: engine crash never leaks stack traces ---
  const crash = await postJson('/api/simulate', {
    farmId: GREEN_VALLEY.id,
    inputs: { ...base, areaAcres: 0.000001 },
    horizonDays: 30,
  });
  check(
    'Degenerate input never leaks a stack trace',
    crash.status !== 200 ? !/at\s.+\(/.test(String(crash.body.error)) : true,
    `status ${crash.status}`,
  );
} catch (err) {
  failures++;
  console.error('UNEXPECTED TEST ERROR:', err);
} finally {
  // Undici (global fetch) holds keep-alive sockets open; on Windows closing
  // the server with live sockets trips a libuv assertion, so drop them first.
  server.closeAllConnections?.();
  server.close();
}

console.log(`\n${failures === 0 ? 'ALL API TESTS PASSED' : `${failures} API TEST(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
