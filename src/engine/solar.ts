import type {
  HourlySolar,
  PumpWindow,
  SolarPlan,
  SolarSuitability,
  SolarSchedulingReason,
  WeatherDay,
} from '@/lib/types';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Daylight bounds for pumping (hours, local time). */
export const DAY_START = 6;
export const DAY_END = 18.5;

/** Clear-sky shape: 0 at sunrise/sunset, 1 at solar noon (~12:00). */
export function clearSkyShape(hour: number): number {
  if (hour <= DAY_START || hour >= DAY_START + 12.5) return 0;
  return Math.sin((Math.PI * (hour - DAY_START)) / 12.5);
}

/**
 * Cloud pressure quantifies how "cloudy / unstable" the day is. It is derived
 * from three observable signals: the daily solar availability itself, ambient
 * humidity and rain probability. High cloud pressure suppresses the afternoon
 * far more than the morning — the classic pattern of convective cloud build-up
 * over Indian farmland — which is what makes the optimal pumping window slide
 * earlier on low-solar days instead of just getting dimmer in place.
 */
export function cloudPressure(dailySolar: number, humidity: number, rainProbability: number): number {
  return clamp(
    (1 - clamp(dailySolar, 0, 1)) * 0.8 + (humidity / 100) * 0.25 + (rainProbability / 100) * 0.35,
    0,
    1,
  );
}

/** Solar fraction available at a given hour, 0..1. */
export function solarAtHour(
  hour: number,
  dailySolar: number,
  humidity: number,
  rainProbability: number,
): number {
  const shape = clearSkyShape(hour);
  if (shape <= 0) return 0;
  const cp = cloudPressure(dailySolar, humidity, rainProbability);
  // Convective cloud builds earlier on cloudy, humid days, so the day's peak
  // moves from near solar noon (clear) to mid-morning (overcast). This is what
  // makes the optimal pump WINDOW move, not just dim in place.
  const afternoonStart = 13.5 - 6.5 * cp;
  const afternoon = clamp((hour - afternoonStart) / 7, 0, 1);
  // Morning haze / fog when humidity is high.
  const morning = clamp((11.5 - hour) / 5.5, 0, 1);
  const attenuation = (1 - cp * 0.95 * afternoon) * (1 - cp * 0.24 * morning);
  return clamp(dailySolar * shape * attenuation, 0, 1);
}

export interface SolarCurveOptions {
  dailySolar: number;
  humidity: number;
  rainProbability: number;
  /** Pump load in kW, used for the demand overlay. */
  pumpLoadKw: number;
  /** PV array size in kWp; defaults to a 1.4x oversized array for the pump. */
  arrayKwp?: number;
}

/** 24-hour solar availability + demand curve. */
export function buildHourlyCurve(opts: SolarCurveOptions): HourlySolar[] {
  const arrayKwp = opts.arrayKwp ?? opts.pumpLoadKw * 1.4;
  const out: HourlySolar[] = [];
  for (let h = 0; h < 24; h++) {
    const frac = solarAtHour(h, opts.dailySolar, opts.humidity, opts.rainProbability);
    out.push({
      hour: h,
      label: formatHourLabel(h),
      solarFraction: +frac.toFixed(3),
      generationKwh: +(arrayKwp * frac).toFixed(2),
      pumpDemandKwh: h >= DAY_START && h < DAY_END ? +opts.pumpLoadKw.toFixed(2) : 0,
    });
  }
  return out;
}

export function formatHourLabel(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatTime12(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

function windowLabel(start: number, end: number): string {
  return `${formatTime12(start)} – ${formatTime12(end)}`;
}

/** Average solar fraction across a candidate window, sampled every 15 minutes. */
function averageFraction(
  start: number,
  durationHours: number,
  dailySolar: number,
  humidity: number,
  rainProbability: number,
): number {
  const end = start + durationHours;
  let sum = 0;
  let n = 0;
  for (let t = start; t < end; t += 0.25) {
    sum += solarAtHour(t, dailySolar, humidity, rainProbability);
    n++;
  }
  return n > 0 ? sum / n : 0;
}

function classify(fraction: number): SolarSuitability {
  if (fraction >= 0.68) return 'excellent';
  if (fraction >= 0.48) return 'good';
  if (fraction >= 0.28) return 'moderate';
  return 'poor';
}

/**
 * Finds the highest-solar contiguous window of the required run time.
 * This is the core of "solar-aware scheduling": the water requirement decides
 * HOW LONG the pump runs, and the solar curve decides WHEN it runs.
 */
export function bestWindow(
  durationHours: number,
  dailySolar: number,
  humidity: number,
  rainProbability: number,
  dayOffset: number,
): PumpWindow {
  // Never let a window spill past the end of daylight.
  const clampedDuration = clamp(durationHours, 0.25, DAY_END - DAY_START);
  let bestStart = 12;
  let bestScore = -1;
  for (let start = DAY_START; start + clampedDuration <= DAY_END; start += 0.25) {
    const score = averageFraction(start, clampedDuration, dailySolar, humidity, rainProbability);
    if (score > bestScore + 1e-9) {
      bestScore = score;
      bestStart = start;
    }
  }
  const avg = averageFraction(bestStart, clampedDuration, dailySolar, humidity, rainProbability);
  const cp = cloudPressure(dailySolar, humidity, rainProbability);
  const reason: SolarSchedulingReason =
    cp > 0.62 ? 'cloud_shifted_morning' : 'peak_solar';
  return {
    startHour: +bestStart.toFixed(2),
    endHour: +(bestStart + clampedDuration).toFixed(2),
    label: windowLabel(bestStart, bestStart + clampedDuration),
    dayOffset,
    reasonKey: reason,
    avgSolarFraction: +avg.toFixed(3),
  };
}

export interface SolarPlanInput {
  durationHours: number;
  today: WeatherDay;
  tomorrow: WeatherDay;
  pumpLoadKw: number;
}

/**
 * Builds the full solar plan: today's best window, tomorrow's best window, and
 * the recommendation on whether to pump today or defer.
 *
 * Decision rules (transparent, no hidden model):
 *  - If today's window clears a good threshold, pump today in that window.
 *  - If today is marginal, pump today but flag partial grid support.
 *  - If today is poor and tomorrow is materially better, defer to tomorrow.
 *  - If both are poor, still pump in the best daylight window (grid-supported)
 *    because crop water demand dominates energy preference.
 */
export function planSolar(input: SolarPlanInput): {
  plan: Omit<SolarPlan, 'curve'>;
  curve: HourlySolar[];
} {
  const { durationHours, today, tomorrow, pumpLoadKw } = input;

  const todayWindow = bestWindow(
    durationHours,
    today.solarAvailability,
    today.humidity,
    today.rainProbability,
    0,
  );
  const tomorrowWindow = bestWindow(
    durationHours,
    tomorrow.solarAvailability,
    tomorrow.humidity,
    tomorrow.rainProbability,
    1,
  );

  const todaySuit = classify(todayWindow.avgSolarFraction);
  const tomorrowBetter = tomorrowWindow.avgSolarFraction - todayWindow.avgSolarFraction > 0.12;

  let recommendedWindow = todayWindow;
  let deferToNextDay = false;
  let reason: SolarSchedulingReason = todayWindow.reasonKey;
  let suitability: SolarSuitability = todaySuit;

  if (todayWindow.avgSolarFraction < 0.3 && tomorrowBetter) {
    recommendedWindow = tomorrowWindow;
    deferToNextDay = true;
    reason = 'deferred_next_day';
    suitability = classify(tomorrowWindow.avgSolarFraction);
  } else if (todayWindow.avgSolarFraction < 0.28) {
    recommendedWindow = todayWindow;
    reason = 'daytime_insufficient';
    suitability = 'poor';
  } else if (todayWindow.avgSolarFraction < 0.48) {
    recommendedWindow = todayWindow;
    reason = todayWindow.reasonKey === 'cloud_shifted_morning' ? 'cloud_shifted_morning' : 'partial_grid_support';
    suitability = classify(todayWindow.avgSolarFraction);
  }

  const curve = buildHourlyCurve({
    dailySolar: today.solarAvailability,
    humidity: today.humidity,
    rainProbability: today.rainProbability,
    pumpLoadKw,
  });

  const gridShare = clamp(1 - recommendedWindow.avgSolarFraction, 0, 1);

  return {
    plan: {
      todayWindow,
      tomorrowWindow,
      recommendedWindow,
      suitability,
      deferToNextDay,
      reason,
      gridShareOfEnergy: +gridShare.toFixed(3),
    },
    curve,
  };
}
