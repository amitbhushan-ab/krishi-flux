import { GREEN_VALLEY, GREEN_VALLEY_CONDITIONS } from '@/data/farms';
import type { FarmConditions } from '@/api/client';
import type { CropStageId, Farm } from '@/lib/types';

export interface Scenario {
  id: string;
  title: { en: string; hi: string };
  description: { en: string; hi: string };
  expected: { en: string; hi: string };
  apply: (state: ScenarioState) => ScenarioState;
}

export interface ScenarioState {
  farm: Farm;
  conditions: FarmConditions;
}

const base = (): ScenarioState => ({
  farm: { ...GREEN_VALLEY },
  conditions: { ...GREEN_VALLEY_CONDITIONS },
});

/**
 * The four required judge scenarios plus a reset. Each is a pure function of the
 * current farm state so scenarios can be chained during a live demo.
 */
export const SCENARIOS: Scenario[] = [
  {
    id: 'reset',
    title: { en: 'Demo reset', hi: 'डेमो रीसेट' },
    description: {
      en: 'Green Valley Farm · Tomato · Flowering · 24% soil moisture · 82% solar.',
      hi: 'ग्रीन वैली फार्म · टमाटर · फूल अवस्था · 24% नमी · 82% सौर।',
    },
    expected: {
      en: 'Irrigation recommended in the high-solar midday window.',
      hi: 'दोपहर के उच्च-सौर समय में सिंचाई की सलाह।',
    },
    apply: () => base(),
  },
  {
    id: 'rain',
    title: { en: 'Scenario 1 — Rain expected', hi: 'परिदृश्य 1 — बारिश की संभावना' },
    description: {
      en: 'Soil moisture 34%, rain probability 75%, ~18 mm forecast.',
      hi: 'मिट्टी नमी 34%, बारिश संभावना 75%, ~18 मिमी पूर्वानुमान।',
    },
    expected: {
      en: 'DO NOT IRRIGATE / DELAY — rainfall is likely and soil moisture is adequate.',
      hi: 'सिंचाई न करें / टालें — बारिश संभावित है और नमी पर्याप्त है।',
    },
    apply: (s) => ({
      farm: s.farm,
      conditions: { ...s.conditions, soilMoisture: 34, rainProbability: 75, rainfallForecast: 18 },
    }),
  },
  {
    id: 'dry',
    title: { en: 'Scenario 2 — Dry spell', hi: 'परिदृश्य 2 — सूखा दौर' },
    description: {
      en: 'Soil moisture 20%, rain probability 8%, 34°C, ~2 mm forecast.',
      hi: 'मिट्टी नमी 20%, बारिश संभावना 8%, 34°C, ~2 मिमी पूर्वानुमान।',
    },
    expected: {
      en: 'IRRIGATION REQUIRED — refill the root zone in the best solar window.',
      hi: 'सिंचाई आवश्यक — सर्वोत्तम सौर समय में जड़ क्षेत्र भरें।',
    },
    apply: (s) => ({
      farm: s.farm,
      conditions: {
        ...s.conditions,
        soilMoisture: 20,
        rainProbability: 8,
        rainfallForecast: 2,
        temperature: 34,
        humidity: 48,
      },
    }),
  },
  {
    id: 'low-solar',
    title: { en: 'Scenario 3 — Low solar', hi: 'परिदृश्य 3 — कम सौर' },
    description: {
      en: 'Identical farm, solar availability cut from 85% to 25%.',
      hi: 'वही खेत, सौर उपलब्धता 85% से घटाकर 25%।',
    },
    expected: {
      en: 'Water requirement stays broadly the same — the PUMP WINDOW changes.',
      hi: 'पानी की आवश्यकता लगभग वही रहती है — पंप समय बदल जाता है।',
    },
    apply: (s) => ({
      farm: s.farm,
      conditions: { ...s.conditions, solarAvailability: 0.25, humidity: 74, rainProbability: 42 },
    }),
  },
  {
    id: 'crop-stage',
    title: { en: 'Scenario 4 — Crop stage', hi: 'परिदृश्य 4 — फसल अवस्था' },
    description: {
      en: 'Soil moisture unchanged, stage moved Vegetative → Flowering.',
      hi: 'नमी अपरिवर्तित, अवस्था वानस्पतिक → फूल।',
    },
    expected: {
      en: 'Water requirement and recommendation change with the crop coefficient.',
      hi: 'फसल गुणांक के साथ जल आवश्यकता एवं सलाह बदलती है।',
    },
    apply: (s) => {
      const order: CropStageId[] = ['germination', 'vegetative', 'flowering', 'development', 'maturity'];
      const idx = order.indexOf(s.farm.cropStage);
      const next = order[(idx + 1) % order.length];
      return { farm: { ...s.farm, cropStage: next }, conditions: s.conditions };
    },
  },
];

export function scenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
