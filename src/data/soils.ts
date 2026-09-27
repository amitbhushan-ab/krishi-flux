import type { SoilProfile, SoilTypeId } from '@/lib/types';

/**
 * Field capacity and wilting point are standard volumetric water contents
 * (m3/m3) for each soil texture class. Used to convert a soil-moisture reading
 * into a root-zone deficit and a plant-available-water fraction.
 */
export const SOILS: Record<SoilTypeId, SoilProfile> = {
  sandy: {
    id: 'sandy',
    label: { en: 'Sandy', hi: 'बलुई' },
    fieldCapacity: 0.2,
    wiltingPoint: 0.07,
    note: {
      en: 'Fast draining — water and nutrients leach quickly, shorter irrigation cycles.',
      hi: 'तेज़ जल निकासी — पानी जल्दी रिसता है, सिंचाई का चक्र छोटा रखें।',
    },
  },
  loamy: {
    id: 'loamy',
    label: { en: 'Loamy', hi: 'दोमट' },
    fieldCapacity: 0.32,
    wiltingPoint: 0.13,
    note: {
      en: 'Balanced texture — good water holding with adequate drainage.',
      hi: 'संतुलित मिट्टी — पानी रोकने की अच्छी क्षमता और उचित निकासी।',
    },
  },
  clay: {
    id: 'clay',
    label: { en: 'Clay', hi: 'चिकनी' },
    fieldCapacity: 0.4,
    wiltingPoint: 0.24,
    note: {
      en: 'High water holding — longer cycles but slower infiltration.',
      hi: 'अधिक जल धारण — लंबा चक्र परंतु धीमी रिसाई।',
    },
  },
  black: {
    id: 'black',
    label: { en: 'Black cotton (Vertisol)', hi: 'काली (वर्टिसोल)' },
    fieldCapacity: 0.42,
    wiltingPoint: 0.22,
    note: {
      en: 'Deep moisture storage, cracks when dry, sticky when wet.',
      hi: 'गहरी नमी भंडारण, सूखने पर दरार, गीली होने पर चिपचिपी।',
    },
  },
  red: {
    id: 'red',
    label: { en: 'Red', hi: 'लाल' },
    fieldCapacity: 0.26,
    wiltingPoint: 0.12,
    note: {
      en: 'Moderate holding, often low organic matter.',
      hi: 'मध्यम जल धारण, कार्बनिक पदार्थ कम।',
    },
  },
  silt: {
    id: 'silt',
    label: { en: 'Silt', hi: 'गाद' },
    fieldCapacity: 0.33,
    wiltingPoint: 0.15,
    note: {
      en: 'Good holding but prone to surface crusting.',
      hi: 'अच्छा जल धारण परंतु सतह पर परत बनने की प्रवृत्ति।',
    },
  },
};

export const soilList = Object.values(SOILS).map((s) => ({
  id: s.id,
  label: s.label.en,
}));

export function getSoil(id: SoilTypeId): SoilProfile {
  return SOILS[id] ?? SOILS.loamy;
}

/** Plant-available water capacity of a soil over a given root depth, in mm. */
export function rootZoneCapacityMm(soil: SoilProfile, rootDepthM: number): number {
  const awc = Math.max(0, soil.fieldCapacity - soil.wiltingPoint);
  return awc * rootDepthM * 1000;
}
