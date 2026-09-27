import { getCrop, stageMeta } from '@/data/crops';
import { getSoil } from '@/data/soils';
import type { ClimateRisk, IrrigationInputs, WeatherDay } from '@/lib/types';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Climate resilience logic.
 *
 * Every risk is always reported so the page never shows an empty state; the
 * severity is what moves with conditions. Each entry follows the same
 * three-step structure the UI renders: RISK → IMPACT → RECOMMENDED ACTION.
 */
export function assessClimateRisks(input: IrrigationInputs, forecast: WeatherDay[]): ClimateRisk[] {
  const risks: ClimateRisk[] = [];
  const soil = getSoil(input.soilType);
  const crop = getCrop(input.cropType);
  const stage = crop.stages[input.cropStage];

  const availableFraction = clamp(
    (input.soilMoisture / 100 - soil.wiltingPoint) / Math.max(soil.fieldCapacity - soil.wiltingPoint, 1e-6),
    0,
    1,
  );

  const dryDays = forecast.filter((d) => d.rainProbability < 30 && d.rainfall < 1).length;
  const heatDays = forecast.filter((d) => d.temperature >= 38).length;
  const hottest = Math.max(...forecast.map((d) => d.temperature));
  const heaviest = forecast.reduce((best, d) => (d.rainfall > best.rainfall ? d : best), forecast[0]);
  const rainValues = forecast.map((d) => d.rainProbability);
  const mean = rainValues.reduce((a, b) => a + b, 0) / Math.max(rainValues.length, 1);
  const sd = Math.sqrt(
    rainValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / Math.max(rainValues.length, 1),
  );

  // --- 1. Prolonged dry spell ---
  {
    const bad = dryDays >= 3 || availableFraction < 0.45;
    const severe = dryDays >= 5 || availableFraction < 0.3;
    risks.push({
      id: 'dry_spell',
      severity: severe ? 'high' : bad ? 'moderate' : 'low',
      metric: `${dryDays} of ${forecast.length} days with <30% rain chance`,
      title: { en: 'Prolonged dry spell', hi: 'लंबा सूखा दौर' },
      impact: {
        en: `Soil moisture is at ${(availableFraction * 100).toFixed(0)}% of root-zone available water. Continued decline raises crop water stress, especially at ${stageMeta[input.cropStage].en.toLowerCase()}.`,
        hi: `मिट्टी की नमी जड़ क्षेत्र के उपलब्ध जल का ${(availableFraction * 100).toFixed(0)}% है। नमी घटने पर फसल पर जल तनाव बढ़ेगा, विशेषकर ${stageMeta[input.cropStage].hi} अवस्था में।`,
      },
      action: {
        en: 'Review the irrigation requirement and schedule the next pump window from the optimizer. Consider mulching to reduce evaporation losses.',
        hi: 'सिंचाई आवश्यकता की समीक्षा करें और ऑप्टिमाइज़र से अगला पंप समय तय करें। वाष्पीकरण घटाने के लिए मल्चिंग पर विचार करें।',
      },
    });
  }

  // --- 2. Extreme heat ---
  {
    const bad = heatDays >= 1;
    const severe = forecast.some((d) => d.temperature >= 42);
    risks.push({
      id: 'heat',
      severity: severe ? 'high' : bad ? 'moderate' : 'low',
      metric: `hottest forecast day ${Math.round(hottest)}°C · ${heatDays} day(s) ≥38°C`,
      title: { en: 'Extreme heat', hi: 'अत्यधिक गर्मी' },
      impact: {
        en: `High temperatures increase reference evapotranspiration and crop water stress. Today's crop water use is driven by ET0 and the crop coefficient at ${stageMeta[input.cropStage].en.toLowerCase()}.`,
        hi: `अधिक तापमान से वाष्पोत्सर्जन एवं फसल जल तनाव बढ़ता है। ${stageMeta[input.cropStage].hi} अवस्था में आज की जल मांग ET0 एवं फसल गुणांक से तय होती है।`,
      },
      action: {
        en: 'Increase monitoring frequency and reassess the irrigation requirement daily. Prefer early-morning or late-evening irrigation to cut evaporation losses.',
        hi: 'निगरानी बढ़ाएं और प्रतिदिन सिंचाई आवश्यकता का पुनर्मूल्यांकन करें। वाष्पीकरण घटाने के लिए सुबह या शाम की सिंचाई चुनें।',
      },
    });
  }

  // --- 3. Heavy rainfall ---
  {
    const bad = heaviest.rainProbability >= 75 || heaviest.rainfall >= 20;
    const severe = heaviest.rainfall >= 40;
    risks.push({
      id: 'heavy_rain',
      severity: severe ? 'high' : bad ? 'moderate' : 'low',
      metric: `wettest day: ~${heaviest.rainfall} mm at ${heaviest.rainProbability}% (day ${heaviest.dayOffset + 1})`,
      title: { en: 'Heavy rainfall', hi: 'भारी वर्षा' },
      impact: {
        en: `Waterlogging risk and unnecessary irrigation risk. Applied water above the root-zone capacity is lost as runoff and deep percolation.`,
        hi: `जलभराव एवं अनावश्यक सिंचाई का जोखिम। जड़ क्षेत्र की क्षमता से अधिक पानी बहाव एवं गहरे रिसाव में चला जाता है।`,
      },
      action: {
        en: 'Delay irrigation and verify field drainage. Re-run the optimizer after the rain event before the next pump cycle.',
        hi: 'सिंचाई टालें और खेत की निकासी जांचें। अगले पंप चक्र से पहले वर्षा के बाद ऑप्टिमाइज़र दोबारा चलाएं।',
      },
    });
  }

  // --- 4. Abnormal rainfall pattern ---
  {
    const bad = sd >= 22;
    const severe = sd >= 32;
    risks.push({
      id: 'abnormal_rainfall',
      severity: severe ? 'high' : bad ? 'moderate' : 'low',
      metric: `rain probability varies by ±${sd.toFixed(0)} points over the forecast (mean ${Math.round(mean)}%)`,
      title: { en: 'Abnormal rainfall pattern', hi: 'असामान्य वर्षा पैटर्न' },
      impact: {
        en: 'Highly variable rainfall makes fixed irrigation calendars unreliable — either over-irrigation or missed stress periods.',
        hi: 'अत्यधिक बदलती वर्षा के कारण निश्चित सिंचाई कार्यक्रम भरोसेमंद नहीं रहता — या तो अधिक सिंचाई या तनाव का समय छूट जाता है।',
      },
      action: {
        en: 'Rely on the dynamic recommendation instead of the calendar schedule, and re-check the 7-day plan each morning.',
        hi: 'कार्यक्रम के बजाय गतिशील सिफारिश पर भरोसा करें और प्रतिदिन सुबह 7-दिन की योजना जांचें।',
      },
    });
  }

  // --- 5. Low soil moisture ---
  {
    const bad = availableFraction < 0.4;
    const severe = availableFraction < 0.25;
    risks.push({
      id: 'low_moisture',
      severity: severe ? 'high' : bad ? 'moderate' : 'low',
      metric: `${(availableFraction * 100).toFixed(0)}% of available water remaining`,
      title: { en: 'Low soil moisture', hi: 'कम मिट्टी नमी' },
      impact: {
        en: `${crop.label.en} at ${stageMeta[input.cropStage].en.toLowerCase()} has a management-allowed-depletion threshold of ${(stage.mad * 100).toFixed(0)}%.`,
        hi: `${crop.label.hi} की ${stageMeta[input.cropStage].hi} अवस्था में अनुमेय कमी सीमा ${(stage.mad * 100).toFixed(0)}% है।`,
      },
      action: {
        en: 'Irrigate in the recommended solar window to refill the root zone with minimum grid energy.',
        hi: 'जड़ क्षेत्र भरने के लिए सुझाए गए सौर समय में सिंचाई करें ताकि ग्रिड ऊर्जा कम लगे।',
      },
    });
  }

  const order: Record<ClimateRisk['severity'], number> = { high: 0, moderate: 1, low: 2 };
  return risks.sort((a, b) => order[a.severity] - order[b.severity]);
}
