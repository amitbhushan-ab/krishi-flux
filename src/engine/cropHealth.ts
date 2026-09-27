import { hashString } from '@/data/weather';
import type { CropHealthResult, IrrigationInputs } from '@/lib/types';

/**
 * SIMULATED INFERENCE LAYER.
 *
 * There is no trained vision model in this prototype. This module is
 * deliberately isolated from the decision engine and always sets
 * `simulated: true`. It produces a *possible* stress indication derived from the
 * farm's modelled water balance plus a deterministic hash of the file name, so
 * the same image always yields the same result during a live demo.
 *
 * To integrate a real model: replace `analyseImage` with a call to the
 * `/api/crop-health` endpoint (see README) and keep the same return shape.
 */
export const CROP_HEALTH_DISCLAIMER = {
  en: 'Simulated inference for prototype demonstration only. This is not a diagnosis and must not be used as the sole basis for a crop-protection decision. Confirm with a local extension officer.',
  hi: 'यह केवल प्रोटोटाइप प्रदर्शन हेतु सिमुलेटेड अनुमान है। यह निदान नहीं है और फसल-सुरक्षा निर्णय का एकमात्र आधार नहीं होना चाहिए। स्थानीय कृषि अधिकारी से पुष्टि करें।',
};

export function analyseImage(fileName: string, input: IrrigationInputs): CropHealthResult {
  const h = hashString(fileName || 'leaf');
  const soil = input.soilMoisture;
  const heatLoad = Math.max(0, input.temperature - 33) / 10;

  // Water stress likelihood rises when soil moisture is low / heat is high.
  const waterStressSignal = clamp01((0.26 - soil) / 0.14) * 0.7 + clamp01(heatLoad) * 0.3;
  const nutrientSignal = clamp01(((h % 100) / 100 - 0.55) / 0.45) * 0.65;
  const leafSignal = clamp01((((h >> 8) % 100) / 100 - 0.6) / 0.4) * 0.6;

  const candidates = [
    {
      id: 'water_stress',
      label: { en: 'Possible water stress', hi: 'संभावित जल तनाव' },
      confidence: waterStressSignal,
      note: {
        en: `Soil moisture ${input.soilMoisture.toFixed(1)}% with ${input.temperature.toFixed(0)}°C and ${input.humidity.toFixed(0)}% humidity is consistent with the water-stress pattern being modelled.`,
        hi: `मिट्टी नमी ${input.soilMoisture.toFixed(1)}%, तापमान ${input.temperature.toFixed(0)}°C एवं आर्द्रता ${input.humidity.toFixed(0)}% जल तनाव के पैटर्न से मेल खाते हैं।`,
      },
    },
    {
      id: 'nutrient_stress',
      label: { en: 'Possible nutrient stress', hi: 'संभावित पोषक तत्व तनाव' },
      confidence: nutrientSignal,
      note: {
        en: 'Colour-uniformity pattern in the simulated feature map resembles a nutrient-deficiency signature. Soil test recommended.',
        hi: 'सिमुलेटेड फीचर मैप में रंग-एकरूपता पोषक तत्व की कमी जैसी दिखती है। मिट्टी परीक्षण की सलाह है।',
      },
    },
    {
      id: 'leaf_stress',
      label: { en: 'Possible leaf stress', hi: 'संभावित पत्ती तनाव' },
      confidence: leafSignal,
      note: {
        en: 'Spotting / necrosis pattern in the simulated feature map. Inspect the underside of leaves for pests.',
        hi: 'सिमुलेटेड फीचर मैप में धब्बे / ऊतक क्षय जैसा पैटर्न। कीटों के लिए पत्तियों के नीचे जांचें।',
      },
    },
  ];

  const findings = candidates
    .filter((c) => c.confidence >= 0.3)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 2)
    .map((c) => ({
      id: c.id,
      label: c.label,
      confidence: +clamp01(c.confidence).toFixed(2),
      note: c.note,
    }));

  if (findings.length === 0) {
    findings.push({
      id: 'no_stress',
      label: { en: 'No obvious stress detected', hi: 'कोई स्पष्ट तनाव नहीं मिला' },
      confidence: 0.72,
      note: {
        en: 'Modelled conditions are within normal ranges for this crop stage. Continue routine monitoring.',
        hi: 'इस फसल अवस्था के लिए स्थितियां सामान्य हैं। नियमित निगरानी जारी रखें।',
      },
    });
  }

  return {
    id: `ch-${h.toString(16)}`,
    timestamp: new Date().toISOString(),
    imageName: fileName,
    simulated: true,
    findings,
    disclaimer: CROP_HEALTH_DISCLAIMER,
  };
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
