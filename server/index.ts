/**
 * KrishiFlux API server — the REST contract behind src/api/client.ts.
 *
 * Same engine, same validation, same error mapping as the browser service
 * layer, now reachable over HTTP. Run with:
 *
 *   npm run api            (http://localhost:8787)
 *
 * The Vite dev server proxies /api → 8787 (see vite.config.ts), so the
 * frontend needs no configuration. Settings → Backend lets you switch the app
 * between this server and the in-process engine live.
 */

import express from 'express';
import { pathToFileURL } from 'node:url';
import { GREEN_VALLEY_CONDITIONS, FPO_CONDITIONS, FPO_FARMS } from '../src/data/farms';
import { generateForecast } from '../src/data/weather';
import { recommend, toOptimizerOutput } from '../src/engine/recommendation';
import { simulateSeason } from '../src/engine/impact';
import { computeResourceScore } from '../src/engine/score';
import { assessClimateRisks } from '../src/engine/risk';
import { analyseImage } from '../src/engine/cropHealth';
import { buildHourlyCurve } from '../src/engine/solar';
import { validateInputs } from '../src/engine/validate';
import { inputsFromFarm, type FarmConditions } from '../src/api/clientShared';
import type { Farm, IrrigationInputs } from '../src/lib/types';

/** HttpError carries a status code; anything else becomes an opaque 500. */
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function forecastFromInputs(inputs: IrrigationInputs, farmId: string, days = 7) {
  return generateForecast(
    {
      temperature: inputs.temperature,
      humidity: inputs.humidity,
      rainProbability: inputs.rainProbability,
      rainfallForecast: inputs.rainfallForecast,
      solarAvailability: inputs.solarAvailability,
    },
    farmId,
    days,
  );
}

function clampInt(value: unknown, lo: number, hi: number, fallback: number): number {
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) return fallback;
  return Math.trunc(Math.min(hi, Math.max(lo, n)));
}

/** Defensive numeric coercion, then the canonical shared validation. */
function parseInputs(body: unknown): { farmId: string; inputs: IrrigationInputs } {
  if (typeof body !== 'object' || body === null) {
    throw new HttpError(400, 'Request body must be a JSON object with `farmId` and `inputs`.');
  }
  const { farmId, inputs } = body as { farmId?: unknown; inputs?: unknown };
  if (typeof farmId !== 'string' || farmId.length === 0) {
    throw new HttpError(400, '`farmId` must be a non-empty string.');
  }
  if (typeof inputs !== 'object' || inputs === null) {
    throw new HttpError(400, '`inputs` must be an object.');
  }
  const raw = { ...(inputs as Record<string, unknown>) };
  const numericKeys: (keyof IrrigationInputs)[] = [
    'soilMoisture',
    'temperature',
    'humidity',
    'rainProbability',
    'rainfallForecast',
    'areaAcres',
    'solarAvailability',
    'pumpPowerKw',
    'pumpEfficiency',
    'irrigationEfficiency',
    'energyPricePerKwh',
  ];
  for (const key of numericKeys) {
    const v = raw[key];
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) {
      raw[key] = Number(v);
    }
  }
  if (typeof raw.cropType !== 'string') throw new HttpError(400, '`cropType` must be a string.');
  if (typeof raw.cropStage !== 'string') throw new HttpError(400, '`cropStage` must be a string.');
  if (typeof raw.soilType !== 'string') throw new HttpError(400, '`soilType` must be a string.');

  const typed = raw as unknown as IrrigationInputs;
  validateInputs(typed);
  return { farmId, inputs: typed };
}

/** Build the configured app (exported so tests can drive it without a port). */
export function createApp(): express.Express {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  /** Validation → 400, not-found → 404, anything else → masked 500. */
  const wrap =
    (fn: (req: express.Request) => unknown) =>
    (req: express.Request, res: express.Response): void => {
      try {
        res.json(fn(req));
      } catch (err) {
        if (err instanceof HttpError) {
          res.status(err.status).json({ error: err.message });
        } else if (err instanceof Error && typeof (err as { statusCode?: unknown }).statusCode === 'number') {
          res.status((err as unknown as { statusCode: number }).statusCode).json({ error: err.message });
        } else {
          // Never leak stack traces.
          res.status(500).json({ error: 'The decision engine could not complete this request. Please retry.' });
        }
      }
    };

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'krishiflux-api', engine: 'in-process' });
  });

  /** POST /api/recommendation */
  app.post(
    '/api/recommendation',
    wrap((req) => {
      const { farmId, inputs } = parseInputs(req.body);
      return recommend(inputs, { farmId, forecast: forecastFromInputs(inputs, farmId) });
    }),
  );

  /** POST /api/optimize */
  app.post(
    '/api/optimize',
    wrap((req) => {
      const { farmId, inputs } = parseInputs(req.body);
      const rec = recommend(inputs, { farmId, forecast: forecastFromInputs(inputs, farmId) });
      return toOptimizerOutput(rec);
    }),
  );

  /** POST /api/simulate — baseline vs optimized season */
  app.post(
    '/api/simulate',
    wrap((req) => {
      const { farmId, inputs } = parseInputs(req.body);
      const horizon = clampInt((req.body as { horizonDays?: unknown }).horizonDays, 30, 120, 90);
      return simulateSeason({
        input: inputs,
        weather: forecastFromInputs(inputs, farmId, horizon),
        horizonDays: horizon,
        initialSoilMoisture: inputs.soilMoisture,
      });
    }),
  );

  /** GET /api/weather?farmId=… */
  app.get(
    '/api/weather',
    wrap((req) => {
      const farmId = String(req.query.farmId ?? FPO_FARMS[0].id);
      const farm = FPO_FARMS.find((f) => f.id === farmId);
      if (!farm) throw new HttpError(404, `Farm ${farmId} not found.`);
      const cond: FarmConditions = FPO_CONDITIONS[farm.id] ?? GREEN_VALLEY_CONDITIONS;
      return forecastFromInputs(inputsFromFarm(farm, cond), farmId);
    }),
  );

  /** GET /api/solar?farmId=… */
  app.get(
    '/api/solar',
    wrap((req) => {
      const farmId = String(req.query.farmId ?? FPO_FARMS[0].id);
      const farm = FPO_FARMS.find((f) => f.id === farmId);
      if (!farm) throw new HttpError(404, `Farm ${farmId} not found.`);
      const cond: FarmConditions = FPO_CONDITIONS[farm.id] ?? GREEN_VALLEY_CONDITIONS;
      const inputs = inputsFromFarm(farm, cond);
      const forecast = forecastFromInputs(inputs, farmId, 2);
      const today = forecast[0];
      return {
        forecast,
        today,
        curve: buildHourlyCurve({
          dailySolar: today.solarAvailability,
          humidity: today.humidity,
          rainProbability: today.rainProbability,
          pumpLoadKw: inputs.pumpPowerKw / inputs.pumpEfficiency,
        }),
      };
    }),
  );

  /** GET /api/farms */
  app.get(
    '/api/farms',
    wrap(() => FPO_FARMS),
  );

  /** GET /api/farms/:id */
  app.get(
    '/api/farms/:id',
    wrap((req) => {
      const farm = FPO_FARMS.find((f) => f.id === req.params.id);
      if (!farm) throw new HttpError(404, `Farm ${req.params.id} not found.`);
      return farm;
    }),
  );

  /** GET /api/impact?farmId=…&horizon=90 */
  app.get(
    '/api/impact',
    wrap((req) => {
      const farmId = String(req.query.farmId ?? FPO_FARMS[0].id);
      const farm = FPO_FARMS.find((f) => f.id === farmId);
      if (!farm) throw new HttpError(404, `Farm ${farmId} not found.`);
      const cond: FarmConditions = FPO_CONDITIONS[farm.id] ?? GREEN_VALLEY_CONDITIONS;
      const inputs = inputsFromFarm(farm, cond);
      const horizon = clampInt(req.query.horizon, 30, 120, 90);
      const forecast = forecastFromInputs(inputs, farmId, Math.min(horizon, 7));
      const impact = simulateSeason({
        input: inputs,
        weather: forecastFromInputs(inputs, farmId, horizon),
        horizonDays: horizon,
        initialSoilMoisture: inputs.soilMoisture,
      });
      return {
        impact,
        score: computeResourceScore(inputs, impact, forecast),
        risks: assessClimateRisks(inputs, forecast),
      };
    }),
  );

  /** POST /api/crop-health — simulated inference, always `simulated: true` */
  app.post(
    '/api/crop-health',
    wrap((req) => {
      const { inputs } = parseInputs(req.body);
      const fileName = typeof (req.body as { fileName?: unknown }).fileName === 'string'
        ? (req.body as { fileName: string }).fileName
        : 'upload.jpg';
      return analyseImage(fileName, inputs);
    }),
  );

  /** GET /api/analytics — fleet aggregation for the FPO dashboard */
  app.get(
    '/api/analytics',
    wrap(() => {
      const horizon = 60;
      return FPO_FARMS.map((farm: Farm) => {
        const cond: FarmConditions = FPO_CONDITIONS[farm.id] ?? GREEN_VALLEY_CONDITIONS;
        const inputs = inputsFromFarm(farm, cond);
        const rec = recommend(inputs, { farmId: farm.id, forecast: forecastFromInputs(inputs, farm.id) });
        const impact = simulateSeason({
          input: inputs,
          weather: forecastFromInputs(inputs, farm.id, horizon),
          horizonDays: horizon,
          initialSoilMoisture: inputs.soilMoisture,
        });
        const score = computeResourceScore(inputs, impact, forecastFromInputs(inputs, farm.id, 7));
        return { farm, inputs, recommendation: rec, impact, score };
      });
    }),
  );

  return app;
}

// Run directly (`npm run api`): listen. Imported by tests: do nothing.
const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  // PORT=0 is how the OS asks for an ephemeral port — never a useful listen
  // default, so treat it as unset.
  const rawPort = Number(process.env.PORT ?? 8787);
  const PORT = Number.isFinite(rawPort) && rawPort > 0 ? rawPort : 8787;
  createApp().listen(PORT, () => {
    console.log(`KrishiFlux API listening on http://localhost:${PORT}`);
  });
}
