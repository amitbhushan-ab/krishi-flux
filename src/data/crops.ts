import type { CropProfile, CropStageId } from '@/lib/types';

const stageOrder: CropStageId[] = [
  'germination',
  'vegetative',
  'flowering',
  'development',
  'maturity',
];

export const stageMeta: Record<
  CropStageId,
  { en: string; hi: string; shortEn: string }
> = {
  germination: { en: 'Germination / Establishment', hi: 'अंकुरण / स्थापना', shortEn: 'Germination' },
  vegetative: { en: 'Vegetative', hi: 'वानस्पतिक वृद्धि', shortEn: 'Vegetative' },
  flowering: { en: 'Flowering', hi: 'फूल अवस्था', shortEn: 'Flowering' },
  development: { en: 'Fruit / Grain Development', hi: 'फल / दाना विकास', shortEn: 'Development' },
  maturity: { en: 'Maturity', hi: 'पकाई अवस्था', shortEn: 'Maturity' },
};

export const stageOrderList = stageOrder;

interface KcRow {
  crop: string;
  en: string;
  hi: string;
  seasonDays: number;
  baselineFrequency: number;
  kc: [number, number, number, number, number];
  mad: [number, number, number, number, number];
  rootDepth: [number, number, number, number, number];
  stress: [number, number, number, number, number];
  days: [number, number, number, number, number];
}

/**
 * Kc / MAD / root-depth values follow the FAO-56 structure (crop coefficient by
 * growth stage, management allowed depletion and rooting depth). Values are
 * consolidated regional approximations for prototype use, not site-calibrated
 * measurements.
 */
const rows: KcRow[] = [
  {
    crop: 'tomato',
    en: 'Tomato',
    hi: 'टमाटर',
    seasonDays: 120,
    baselineFrequency: 4,
    kc: [0.6, 0.7, 1.05, 1.15, 0.8],
    mad: [0.35, 0.4, 0.4, 0.4, 0.6],
    rootDepth: [0.25, 0.5, 0.7, 0.8, 0.8],
    stress: [0.5, 0.6, 1.0, 0.9, 0.4],
    days: [15, 30, 30, 30, 15],
  },
  {
    crop: 'wheat',
    en: 'Wheat',
    hi: 'गेहूं',
    seasonDays: 130,
    baselineFrequency: 6,
    kc: [0.4, 0.7, 1.15, 1.1, 0.4],
    mad: [0.45, 0.5, 0.5, 0.5, 0.7],
    rootDepth: [0.3, 0.6, 0.9, 1.0, 1.0],
    stress: [0.4, 0.6, 1.0, 0.9, 0.3],
    days: [20, 35, 30, 30, 15],
  },
  {
    crop: 'rice',
    en: 'Rice (paddy)',
    hi: 'धान',
    seasonDays: 135,
    baselineFrequency: 3,
    kc: [1.05, 1.1, 1.2, 1.15, 0.9],
    mad: [0.2, 0.2, 0.2, 0.25, 0.4],
    rootDepth: [0.2, 0.35, 0.5, 0.6, 0.6],
    stress: [0.6, 0.7, 1.0, 0.9, 0.4],
    days: [20, 35, 30, 30, 20],
  },
  {
    crop: 'maize',
    en: 'Maize',
    hi: 'मक्का',
    seasonDays: 115,
    baselineFrequency: 6,
    kc: [0.4, 0.8, 1.15, 1.1, 0.6],
    mad: [0.45, 0.5, 0.5, 0.5, 0.65],
    rootDepth: [0.3, 0.6, 0.9, 1.0, 1.0],
    stress: [0.4, 0.6, 1.0, 0.9, 0.3],
    days: [15, 30, 25, 30, 15],
  },
  {
    crop: 'cotton',
    en: 'Cotton',
    hi: 'कपास',
    seasonDays: 170,
    baselineFrequency: 10,
    kc: [0.35, 0.7, 1.1, 1.15, 0.7],
    mad: [0.5, 0.55, 0.55, 0.55, 0.7],
    rootDepth: [0.3, 0.6, 0.9, 1.05, 1.05],
    stress: [0.3, 0.5, 1.0, 0.8, 0.3],
    days: [25, 45, 40, 40, 20],
  },
  {
    crop: 'sugarcane',
    en: 'Sugarcane',
    hi: 'गन्ना',
    seasonDays: 320,
    baselineFrequency: 8,
    kc: [0.4, 0.9, 1.2, 1.15, 0.8],
    mad: [0.5, 0.5, 0.5, 0.5, 0.65],
    rootDepth: [0.3, 0.7, 1.0, 1.1, 1.1],
    stress: [0.3, 0.5, 1.0, 0.9, 0.4],
    days: [40, 110, 70, 80, 20],
  },
  {
    crop: 'onion',
    en: 'Onion',
    hi: 'प्याज',
    seasonDays: 110,
    baselineFrequency: 5,
    kc: [0.5, 0.7, 1.0, 1.05, 0.75],
    mad: [0.3, 0.4, 0.45, 0.45, 0.6],
    rootDepth: [0.15, 0.3, 0.4, 0.4, 0.4],
    stress: [0.5, 0.6, 0.9, 0.9, 0.5],
    days: [15, 30, 25, 25, 15],
  },
  {
    crop: 'potato',
    en: 'Potato',
    hi: 'आलू',
    seasonDays: 100,
    baselineFrequency: 5,
    kc: [0.5, 0.75, 1.1, 1.1, 0.85],
    mad: [0.3, 0.4, 0.45, 0.45, 0.6],
    rootDepth: [0.2, 0.4, 0.5, 0.5, 0.5],
    stress: [0.5, 0.6, 1.0, 0.9, 0.4],
    days: [15, 25, 25, 25, 10],
  },
  {
    crop: 'groundnut',
    en: 'Groundnut',
    hi: 'मूंगफली',
    seasonDays: 110,
    baselineFrequency: 7,
    kc: [0.4, 0.75, 1.05, 1.0, 0.7],
    mad: [0.45, 0.5, 0.5, 0.5, 0.65],
    rootDepth: [0.25, 0.4, 0.5, 0.5, 0.5],
    stress: [0.4, 0.6, 1.0, 0.9, 0.35],
    days: [15, 30, 25, 25, 15],
  },
  {
    crop: 'bajra',
    en: 'Pearl millet (bajra)',
    hi: 'बाजरा',
    seasonDays: 90,
    baselineFrequency: 12,
    kc: [0.35, 0.7, 1.05, 1.0, 0.65],
    mad: [0.5, 0.55, 0.6, 0.6, 0.7],
    rootDepth: [0.25, 0.5, 0.7, 0.8, 0.8],
    stress: [0.3, 0.5, 0.9, 0.8, 0.3],
    days: [10, 25, 20, 20, 15],
  },
];

function build(row: KcRow): CropProfile {
  const stages = {} as CropProfile['stages'];
  stageOrder.forEach((stage, i) => {
    stages[stage] = {
      stage,
      kc: row.kc[i],
      mad: row.mad[i],
      rootDepth: row.rootDepth[i],
      days: row.days[i],
      waterStressSensitivity: row.stress[i],
    };
  });
  return {
    crop: row.crop,
    label: { en: row.en, hi: row.hi },
    seasonDays: row.seasonDays,
    irrigatedBaselineFrequencyDays: row.baselineFrequency,
    stages,
  };
}

export const CROPS: Record<string, CropProfile> = Object.fromEntries(
  rows.map((r) => [r.crop, build(r)]),
);

export const cropList = rows.map((r) => ({ id: r.crop, label: r.en }));

export function getCrop(crop: string): CropProfile {
  return CROPS[crop] ?? CROPS.tomato;
}

/** Stage that a crop would naturally be in at a given day of the season. */
export function stageForSeasonDay(crop: string, day: number): CropStageId {
  const profile = getCrop(crop);
  let acc = 0;
  for (const stage of stageOrder) {
    acc += profile.stages[stage].days;
    if (day <= acc) return stage;
  }
  return 'maturity';
}
