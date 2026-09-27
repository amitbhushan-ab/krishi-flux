# 🌾 KrishiFlux

![React](https://img.shields.io/badge/React-18-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?logo=tailwind-css)

> **Optimizing Every Drop. Every Watt. Every Crop.**
>
> AI-powered water–energy co-optimization platform for Indian smallholder farmers.

KrishiFlux jointly decides **when** irrigation is required, **how much** water to apply, **when** the pump should run, and **whether solar availability makes that pumping window efficient**. Solar is not displayed next to irrigation — it changes the recommended pump schedule itself.

Prototype simulation — field validation required.

---

## Table of contents

1. [Problem](#problem)
2. [Innovation](#innovation)
3. [Quick start](#quick-start)
4. [Commands](#commands)
5. [Project structure](#project-structure)
6. [Architecture](#architecture)
7. [The decision engine](#the-decision-engine)
8. [Water model](#water-model)
9. [Energy model](#energy-model)
10. [Solar-aware scheduling](#solar-aware-scheduling)
11. [Impact engine (baseline vs KrishiFlux)](#impact-engine-baseline-vs-krishiflux)
12. [Farm simulator & demo scenarios](#farm-simulator--demo-scenarios)
13. [API contract](#api-contract)
14. [Data model](#data-model)
15. [Environment variables & secrets](#environment-variables--secrets)
16. [Database](#database)
17. [Languages & low-connectivity mode](#languages--low-connectivity-mode)
18. [Testing](#testing)
19. [The 5 judge proofs](#the-5-judge-proofs)
20. [Assumptions](#assumptions)
21. [Limitations](#limitations)
22. [Security](#security)
23. [Roadmap](#roadmap)

---

## Problem

Agriculture's water and energy decisions are deeply connected but are managed separately:

- **Water scarcity** — falling groundwater tables while the same crop can be grown with less water.
- **Inefficient irrigation** — fixed calendar schedules ignore soil moisture, crop stage and rainfall.
- **Rising pumping energy** — every litre lifted has an energy cost, and tariffs keep changing.
- **Unpredictable rainfall** — one untracked rain event makes planned irrigation wasteful.
- **Climate stress** — heat, dry spells and abnormal rainfall shift crop water demand.
- **Thin decision support** — advice is either too technical to act on or too generic to trust.

## Innovation

```
Crop Water Demand + Soil + Weather + Crop Stage + Solar + Pump
                    ↓
      WATER–ENERGY CO-OPTIMIZATION ENGINE
                    ↓
  WHEN TO IRRIGATE · HOW MUCH WATER · WHEN TO RUN PUMP · ENERGY
                    ↓
             EXPLAINABLE FARM ACTION
                    ↓
       IMPACT ENGINE (water + energy + cost)
```

- **Water–energy co-optimization** — water demand sets the pump *duration*; solar availability sets *when* that duration happens.
- **Dynamic irrigation** — the recommendation recalculates on every input change, live, with no page reload.
- **Explainable AI** — every decision states WHAT / HOW MUCH / WHEN / WHY with real contributing factors (no meaningless ML probabilities).
- **Farm digital twin** — a fully interactive simulator with judge-ready presets.
- **Baseline comparison** — the same farm is run twice: conventional fixed calendar vs KrishiFlux.
- **Solar-aware scheduling** — low solar moves the pump window instead of silently wasting grid energy.

---

## Quick start

Requirements: **Node.js ≥ 18** (tested on Node 25) and npm.

```bash
# 1. install dependencies
npm install

# 2. start the dev server
npm run dev
# → http://localhost:5173

# 3. (optional, separate terminal) run the engine proofs
npm run test:engine
```

Production build and preview:

```bash
npm run build          # typecheck + bundle → dist/
npm run preview        # serve dist/ locally
```

No API keys, database or backend process are required to run the prototype.

Optional real backend (the same engine over HTTP):

```bash
npm run api            # Express server on http://localhost:8787
```

The Vite dev server proxies `/api` → 8787. Enable **Settings → Backend mode**
to route the app's calls through the server; if it is not running the app
silently falls back to the in-process engine, so the demo never breaks.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR on `http://localhost:5173` |
| `npm run typecheck` | `tsc --noEmit` — full strict type check |
| `npm run build` | `tsc --noEmit && vite build` → `dist/` |
| `npm run preview` | Serve the production build |
| `npm run test:engine` | Engine self-test proving the 5 required judge interactions |
| `npm run test:api` | Boots the Express app and exercises every REST endpoint |
| `npm run api` | Real backend: the same engine over HTTP on `http://localhost:8787` |

---

## Project structure

```
/
├── index.html
├── src/
│   ├── main.tsx                 React entry, router + app provider
│   ├── App.tsx                  Route table (lazy-loaded pages)
│   ├── index.css                Tailwind entry + design tokens
│   ├── lib/types.ts             Full domain model (User, Farm, Sensor, …)
│   ├── data/
│   │   ├── crops.ts             10 crops × 5 stages: Kc, MAD, root depth, stress
│   │   ├── soils.ts             6 soil textures: field capacity, wilting point
│   │   ├── farms.ts             Demo farm + FPO fleet (deterministic)
│   │   └── weather.ts           Weather abstraction layer (simulated, seeded)
│   ├── engine/                  ← pure decision logic, zero UI imports
│   │   ├── water.ts             ET0, Kc, deficit, gross requirement, litres
│   │   ├── energy.ts            Discharge, run time, kWh, solar/grid split
│   │   ├── solar.ts             Hourly solar curve + best pump window
│   │   ├── recommendation.ts    The decision engine + explainability layer
│   │   ├── baseline.ts          Conventional fixed-irrigation baseline
│   │   ├── impact.ts            Season simulation: baseline vs KrishiFlux
│   │   ├── score.ts             Resource Efficiency Score (weighted, disclosed)
│   │   ├── risk.ts              Climate risks: RISK → IMPACT → ACTION
│   │   └── cropHealth.ts        Clearly separated SIMULATED inference layer
│   ├── api/client.ts            Service layer mirroring the REST contract
│   ├── i18n/index.ts            Bilingual { en, hi } dictionary
│   ├── state/AppContext.tsx      Farm state, live recompute, connectivity, cache
│   ├── state/scenarios.ts        The four judge demo scenarios
│   ├── components/              Layout, UI primitives, charts, rec panels
│   └── pages/                   14 routes (see below)
├── scripts/selftest.ts          Engine proof harness
├── scripts/apitest.ts           REST-contract test (boots the Express app)
├── server/index.ts              Express backend: the documented REST contract
├── tailwind.config.js
├── vite.config.ts
└── tsconfig.json
```

### Routes

| Route | Page |
| --- | --- |
| `/` | Landing page |
| `/login` | Login / signup |
| `/dashboard` | Farmer dashboard — *Today's Farm Action* |
| `/simulator` | Farm Simulator (digital twin + scenario presets) |
| `/optimizer` | Water–Energy Optimizer |
| `/weather` | Weather Intelligence |
| `/solar` | Solar Intelligence |
| `/crop-health` | Crop Health AI (simulated) |
| `/climate-risk` | Climate Risk |
| `/saarthi` | KrishiFlux Saarthi (English / Hindi) |
| `/impact` | Baseline vs KrishiFlux |
| `/analytics` | Resource analytics + sensor simulation |
| `/fpo` | FPO dashboard with drill-down |
| `/settings` | Language, connectivity, error handling, data model |
| `*` | 404 with working navigation |

Every route renders real content. There are no dead links, empty pages or
"Coming Soon" placeholders on core functionality.

---

## Architecture

```
             FARMER
                ↓
        KRISHIFLUX WEB APP            React + TypeScript + Tailwind + Recharts
                ↓
      SERVICE / API LAYER             src/api/client.ts (REST-shaped promises)
                ↓
      DATA PROCESSING LAYER           src/data (weather, crops, soils, farms)
                ↓
     SOIL + WEATHER + CROP + SOLAR + PUMP
                ↓
         AI DECISION ENGINE           src/engine/recommendation.ts
                ↓
      WATER–ENERGY OPTIMIZER          water.ts + solar.ts + energy.ts
                ↓
    WATER PLAN · ENERGY PLAN · PUMP WINDOW
                ↓
        EXPLAINABLE AI LAYER          contributing factors, WHAT/HOW/WHEN/WHY
                ↓
         FARMER ACTION
                ↓
          IMPACT ENGINE               baseline vs optimized season
                ↓
  WATER + ENERGY + COST SAVINGS
```

**Business logic is fully separated from the UI.** `src/engine/*` imports nothing
from React; every page consumes it through `src/api/client.ts`, whose functions
map 1:1 to the documented REST endpoints. Swapping the in-process engine for a
real HTTP backend is a drop-in change in one file.

---

## The decision engine

`recommend(inputs, { farmId, forecast })` runs this pipeline:

1. **Water balance** → root-zone deficit, threshold check, gross depth, litres.
2. **Pump run time** → `duration = volume / (pumpPower × specificDischarge)`.
3. **Solar scheduling** → slide a window of that run time across daylight and pick
   the highest-solar contiguous block.
4. **Energy split** → solar energy used vs grid energy required for that window.
5. **Decision status** → `irrigate | delay | skip | monitor`.
6. **Confidence** → transparent combination of margin-to-threshold, forecast
   stability and solar agreement (not an opaque ML probability).
7. **Explainability** → reason text (English + Hindi) and four factor bars.
8. **Savings estimate** → a 30-day baseline-vs-KrishiFlux season simulation.

## Water model

Transparent and FAO-56-shaped:

```
ET0   = 0.0023 × Ra × (Tmean + 17.8) × √(diurnal range)      [Hargreaves-style]
ETc   = ET0 × Kc(stage)

root-zone capacity (mm) = (Field capacity − Wilting point) × root depth × 1000
available fraction      = (θ − WP) / (FC − WP)
deficit (mm)            = capacity × (1 − available fraction)

effective rainfall      = rainfall forecast × rain probability × 0.80

trigger                 : available fraction < 1 − MAD
net requirement  (mm)   = max(deficit, ETc − effective rainfall)
gross requirement (mm)  = net / irrigation efficiency
volume (L)              = gross depth × farm area (m²)      [1 mm over 1 m² = 1 L]
```

A single event is additionally capped by the longest practical daylight pump run
(`MAX_RUN_HOURS = 11`); a very dry field is refilled progressively rather than
over-running the pump. The assumptions panel lists every input used.

## Energy model

```
discharge (L/h) = pump power (kW) × 20,000 L/h per kW
                 [from P = ρ g Q H / η at ~10 m head, 55% overall efficiency]

duration (h)    = volume / discharge
load (kW)       = pump power / pump efficiency
energy (kWh)    = load × duration
solar (kWh)     = energy × window solar fraction
grid  (kWh)     = energy − solar
```

---

## Solar-aware scheduling

This is the core innovation and is directly demonstrable.

The hourly curve is:

```
clear sky shape(h)  = sin(π (h − 6) / 12.5)           0 at dawn/dusk, 1 at noon
cloud pressure cp   = 0.8×(1 − daily solar) + 0.25×humidity + 0.35×rain probability
afternoon start     = 13.5 − 6.5 × cp                  cloud builds earlier on dull days
solar(h)            = daily solar × shape(h)
                      × (1 − cp × 0.95 × afternoon(h)) × (1 − cp × 0.24 × morning haze)
```

Because **cloud pressure depends on solar availability itself**, lowering solar
does not merely dim the curve — it moves the day's peak from near solar noon to
mid-morning, so the best contiguous window *shifts*.

Decision rules (fully disclosed in the UI):

| Condition | Decision |
| --- | --- |
| Window clears a good threshold | Pump **today** in that window |
| Window is marginal | Pump today, flag **partial grid support** |
| Window poor **and** tomorrow materially better | **Defer** to tomorrow's suitable solar window |
| Both days poor | Still pump in the best daylight window (grid-supported) — crop water demand dominates energy preference |

---

## Impact engine (baseline vs KrishiFlux)

The same farm is simulated twice, day by day, with soil moisture carried forward
as a real state variable so today's decision changes tomorrow's soil.

**Baseline (conventional)** — fixed calendar every N days for the crop, depth
sized on peak-season `ET0 × Kc`, `1.05×` over-application, `65%` flood/furrow
application efficiency, `55%` pump efficiency, **no solar substitution**.

**KrishiFlux** — irrigation only when available water crosses the
management-allowed-depletion threshold, at the farm's configured application
efficiency, with the pump hour chosen from the solar curve.

Reported metrics (all model-generated, nothing hard-coded):

- Water saved (L) and %
- Energy saved (kWh) and %
- Estimated cost saved (INR) and %
- Irrigation events avoided
- Solar energy used vs grid energy required
- **Resource Efficiency Score** — weighted water 30% + energy 30% + irrigation
  efficiency 25% + climate adaptation 15%, with every component explained

Costs use the configured energy tariff (default ₹7.5/kWh) plus ₹0.40 per
1,000 L of abstracted water.

---

## Farm simulator & demo scenarios

Any slider change triggers the engine immediately (debounced 220 ms) and updates
the recommendation without a page reload.

| Preset | Inputs | Expected outcome |
| --- | --- | --- |
| **Demo reset** | 24% moisture, 18% rain, 82% solar, Tomato/Flowering | Irrigation recommended in the high-solar window |
| **Scenario 1 — Rain expected** | 34% moisture, 75% rain, ~18 mm | Do not irrigate / delay |
| **Scenario 2 — Dry spell** | 20% moisture, 8% rain, 34°C | Irrigation required |
| **Scenario 3 — Low solar** | solar 85% → 25%, everything else fixed | **Water stays the same, pump window moves** |
| **Scenario 4 — Crop stage** | Vegetative → Flowering (moisture fixed) | **Water requirement changes** |

Deterministic: the demo farm, weather seed and season simulation are all
reproducible, so judges see identical numbers every run.

---

## API contract

`src/api/client.ts` implements these functions with realistic latency, input
validation, error mapping and an offline cache. Each maps to a REST endpoint:

**The contract is real, not just documented.** `server/index.ts` implements
every endpoint with Express on `http://localhost:8787` (`npm run api`), reusing
the same engine modules and the same validator (`src/engine/validate.ts`), so
browser and server reject exactly the same malformed inputs. `npm run test:api`
boots the server and proves parity — the identical decision (552,720 L, same
pump window) comes back over HTTP and in-process — plus 400 validation, 404
not-found and no stack traces on failure. In the app, **Settings → Backend
mode** switches between in-process and the remote server live; the Vite dev
server proxies `/api` → 8787.

| Endpoint | Function | Notes |
| --- | --- | --- |
| `POST /api/recommendation` | `postRecommendation` | Validates, runs the engine, writes the cache |
| `POST /api/optimize` | `postOptimize` | Returns the optimizer output payload |
| `POST /api/simulate` | `postSimulate` | Baseline vs KrishiFlux season |
| `GET /api/weather` | `getWeather` | 7-day simulated forecast |
| `GET /api/solar` | `getSolar` | Hourly curve + pump windows |
| `GET /api/farms` | `getFarms` | FPO fleet |
| `GET /api/farms/:id` | `getFarm` | 404 when unknown |
| `GET /api/impact` | `getImpact` | Impact + score + risks |
| `POST /api/crop-health` | `postCropHealth` | Simulated inference, `simulated: true` |
| `GET /api/analytics` | `getAnalytics` | Fleet aggregation |

Error handling: invalid inputs → `400`, unknown farm → `404`, simulated outage →
`503`. The UI shows a plain message and keeps the last good recommendation. **No
stack traces are ever exposed.** Fault injection can be toggled from
**Settings → Error handling** to demonstrate this live.

---

## Live weather (Open-Meteo)

By default the forecast is the deterministic simulation so every judge sees the
same numbers. **Settings → Data source → Live** switches to the real
[Open-Meteo](https://open-meteo.com) API — free for non-commercial use, no API
key — using each farm's approximate coordinates (Pune region).

- Mapped onto the same `WeatherDay` shape, so the engine, dashboard and solar
  scheduler consume live weather with **zero changes** to the decision logic.
- A 10-minute cache prevents re-fetching on every slider move.
- **Graceful degradation:** network failure, provider outage or bad coordinates
  silently fall back to the simulation, and the Weather page badge honestly
  reports which source is active (🛰️ Live · Open-Meteo / Simulated).
- Solar availability is derived from the provider's daily shortwave radiation
  (MJ/m² ÷ 31 clear-sky reference), clamped to the engine's 0.08–0.98 band.

---

## Data model

Defined in `src/lib/types.ts`:

| Entity | Fields |
| --- | --- |
| `User` | id · name · phone · email · role · language · createdAt |
| `Farm` | id · ownerId · name · location · area · soilType · crop · cropStage · pumpType · pumpPower · pumpEfficiency · irrigationEfficiency |
| `Sensor` | id · farmId · type · value · unit · status · lastUpdated |
| `WeatherRecord` / `WeatherDay` | farmId · timestamp · temperature · humidity · rainProbability · rainfall · solarAvailability |
| `CropProfile` | crop · stage · Kc · MAD · root depth · stage days · stress sensitivity |
| `IrrigationRecommendation` | farmId · timestamp · required · water · duration · recommendedTime · reason · confidence |
| `EnergyRecord` / `SolarPlan` | hourly solar curve · pump windows · solar/grid split |
| `Savings` / `ImpactResult` | baseline vs optimized water, energy, cost, events |

---

## Environment variables & secrets

The prototype needs **no** environment variables — there are no third-party API
keys in the bundle, and no fake keys anywhere in the source.

For a production deployment the same layer would read:

```bash
# .env  (never committed; never exposed to the browser)
DATABASE_URL=postgres://user:pass@host:5432/krishiflux
WEATHER_API_KEY=...            # server-side only
SESSION_SECRET=...
PORT=8080
```

All secret-bearing calls belong on the server; the frontend only ever receives
derived values.

## Database

The prototype is self-contained (engine in-process, state in React + a
`localStorage` cache), so no database is required to run or demo it. The
entities in [Data model](#data-model) map directly to PostgreSQL/MongoDB
collections — `User`, `Farm`, `Sensor`, `Weather`, `CropProfile`,
`IrrigationRecommendation`, `EnergyRecord`, `Savings` — and the service layer is
the seam where a real persistence backend plugs in.

## Languages & low-connectivity mode

- **English / Hindi** — every user-facing string and every recommendation reason
  is an `{ en, hi }` pair in `src/i18n` plus bilingual objects in the engine. Adding
  a third Indian language means adding one field per key and extending the
  `Language` union — no component changes.
- **Vernacular decision delivery** — Saarthi does not translate labels; it turns
  soil, rainfall and solar values into an instruction: *"Aaj paani dena zaroori hai."*
- **Saarthi** answers only from the live recommendation object, so it can never
  invent a number the engine did not produce. The intent matcher is keyword-based
  and bilingual (including romanized Hindi such as *"Kitna paani dena hai?"*).
- **Connectivity** — `🟢 Synced · 🟡 Offline — last recommendation available ·
  🔄 Sync pending`. In offline mode the last cached recommendation is served from
  `localStorage` (`krishiflux.cache.v1`, last 12 entries). Flow:
  `Cloud → Local Cache → Last Recommendation → Connectivity Restored → Sync`.
  We do **not** claim full offline operation.

---

## Testing

```bash
npm run typecheck   # strict TypeScript, zero errors
npm run test:engine # the 5 required proofs against the real engine
npm run test:api    # the REST contract, end-to-end against the real server
npm run build       # production bundle
```

`npm run test:engine` asserts:

```
A. Soil moisture changes the recommendation
B. Rainfall probability changes the recommendation
C. Solar availability changes the pump window (water unchanged)
D. Crop stage changes the water requirement
E. Baseline vs KrishiFlux produces measurable differences
   Sanity. Recommendation contains no NaN/Infinity
```

Also verified in-browser: all 15 routes render, no console errors, English ⇄
Hindi switching, offline caching, error-handling fault injection, and
desktop / tablet / mobile layouts (the dashboard is mobile-first, the FPO view
is desktop-dense).

---

## Deployment

The frontend is a static Vite build — deploy `dist/` anywhere:

```bash
npm run build
```

- **Vercel** — `vercel.json` is included (SPA rewrite `/.* → /index.html`).
- **Netlify** — `netlify.toml` is included (build `npm run build`, publish
  `dist/`, SPA redirect with status 200).
- Any static host / Nginx / S3 — serve `dist/` and rewrite all paths to
  `index.html` (client-side routing).

The optional backend (`npm run api`) is a plain Node/Express process; deploy it
to any Node host and point the Vite proxy (or a reverse proxy) at it. The app
degrades to the in-process engine when the backend is unreachable, so a static
deployment alone is fully functional.

---

## The 5 judge proofs

| Proof | Where | What happens |
| --- | --- | --- |
| **A** Soil moisture | Simulator / Dashboard | Recommendation flips `monitor ↔ irrigate`, volume changes |
| **B** Rainfall probability | Simulator | `irrigate ↔ delay/skip`, volume changes |
| **C** Solar availability | Simulator → *Solar sensitivity* | Water identical, **pump window moves** (e.g. 9:15 AM–2:47 PM → 8:00 AM–1:32 PM) |
| **D** Crop stage | Simulator | Water requirement changes with Kc / root depth / MAD |
| **E** Baseline vs KrishiFlux | Impact | Water, energy and cost calculated live from the model |
| **F** English → Hindi | Header / Saarthi | Recommendation and assistant reply switch to Hindi |
| **G** Online → Offline | Header / Settings | Last recommendation stays accessible from cache |

**3–5 minute demo story:** Landing → Dashboard → Today's Farm Action → Why →
Optimizer → Simulator → change rainfall → change solar → change crop stage →
Baseline vs KrishiFlux → savings → Saarthi.

---

## Assumptions

| Assumption | Value |
| --- | --- |
| Reference radiation Ra | 24.0 MJ/m²/day |
| Diurnal range | Derived from humidity and solar availability |
| Effective rainfall fraction | 0.80 |
| Specific pump discharge | 20,000 L/h per kW (~10 m head, 55% overall efficiency) |
| Longest single pump run | 11 h within one daylight window |
| PV array (for generation chart) | 1.4 × rated pump power |
| Energy tariff | ₹7.5 / kWh (editable) |
| Water abstraction cost | ₹0.40 / 1,000 L |
| Baseline application efficiency | 65% (flood / furrow) |
| Baseline over-application | 1.05× peak-season sizing |
| Baseline pump efficiency | 55%, no solar substitution |
| Weather / solar / sensor data | Deterministic simulation (no external API) |
| Savings quote | 30-day modelled horizon (Impact page: 30/60/90/120 days) |

Soil field-capacity/wilting-point values and Kc/MAD/root-depth tables follow
FAO-56 structure with consolidated regional approximations. They are
**not** site-calibrated measurements.

---

## Limitations

Be explicit about these — the strongest claims are water calculation, energy
calculation, scheduling, adaptive recommendations and savings simulation.

- Weather, solar, sensor, groundwater and crop-health data are **simulated by
  default** (live Open-Meteo forecasts are optional; sensors remain simulated).
- **No claim of full offline operation** — only the last recommendation is cached.
- **No yield or income increase is claimed.**
- Crop-health analysis is a **separated simulated inference layer**, always marked
  `simulated: true`, returning *possible* stress only — never a diagnosis.
- **Prototype simulation — field validation required.** No field-tested results.
- The prototype runs the engine in-process; a production deployment would move it
  behind a real API with a database (see [API contract](#api-contract)).

---

## Security

- No secrets or API keys in source; no fake keys in the bundle.
- All inputs validated before the engine runs (area, pump power, efficiencies,
  moisture, temperature, humidity, rain probability).
- Errors are mapped to plain messages; stack traces are never shown to users.
- Basic authentication screen with client-side format validation; a production
  build would use hashed credentials and an HTTP-only session cookie.

---

## Roadmap

| Phase | Scope |
| --- | --- |
| **1 — Software prototype** | Simulation + AI decision engine **(this build)** |
| **2 — Pilot farms** | Real sensors + real weather + field validation |
| **3 — Integration** | Real pump telemetry + solar pump control |
| **4 — Scale** | FPOs, districts, more crops, more Indian languages |

**Business model:** free/affordable farmer advisory → FPO subscription dashboard →
enterprise resource optimization → ecosystem integrations (solar pump providers,
irrigation companies, IoT vendors, agricultural organizations).
#   k r i s h i - f l u x 
