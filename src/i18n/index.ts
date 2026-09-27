import type { Language } from '@/lib/types';

/**
 * Language system. Every entry is a `{ en, hi }` pair, so adding a third Indian
 * language is a matter of adding one more field per key and extending the
 * `Language` union — no component changes. Technical values (ETc, mm/day, kWh)
 * stay numeric; the *decision* is delivered as a spoken instruction in the
 * farmer's language, not a translated label dump.
 */
type Entry = { en: string; hi: string };

export const dict = {
  // ---- brand / nav ----
  appName: { en: 'KrishiFlux', hi: 'कृषिफ्लक्स' },
  tagline: { en: 'Optimizing Every Drop. Every Watt. Every Crop.', hi: 'हर बूंद. हर वाट. हर फसल का अनुकूलन।' },
  navDashboard: { en: 'Dashboard', hi: 'डैशबोर्ड' },
  navSimulator: { en: 'Farm Simulator', hi: 'फार्म सिम्युलेटर' },
  navOptimizer: { en: 'Water–Energy Optimizer', hi: 'जल–ऊर्जा ऑप्टिमाइज़र' },
  navWeather: { en: 'Weather', hi: 'मौसम' },
  navSolar: { en: 'Solar', hi: 'सौर' },
  navCropHealth: { en: 'Crop Health', hi: 'फसल स्वास्थ्य' },
  navClimateRisk: { en: 'Climate Risk', hi: 'जलवायु जोखिम' },
  navSaarthi: { en: 'Saarthi', hi: 'सारथी' },
  navImpact: { en: 'Impact', hi: 'प्रभाव' },
  navAnalytics: { en: 'Analytics', hi: 'विश्लेषण' },
  navFpo: { en: 'FPO', hi: 'एफपीओ' },
  navSettings: { en: 'Settings', hi: 'सेटिंग्स' },

  // ---- common ----
  today: { en: 'Today', hi: 'आज' },
  water: { en: 'Water', hi: 'पानी' },
  energy: { en: 'Energy', hi: 'ऊर्जा' },
  cost: { en: 'Cost', hi: 'लागत' },
  solar: { en: 'Solar', hi: 'सौर' },
  duration: { en: 'Pump duration', hi: 'पंप अवधि' },
  window: { en: 'Recommended window', hi: 'सुझाया गया समय' },
  suitability: { en: 'Solar suitability', hi: 'सौर उपयुक्तता' },
  confidence: { en: 'Confidence', hi: 'विश्वास' },
  why: { en: 'Why?', hi: 'क्यों?' },
  required: { en: 'Required', hi: 'आवश्यक' },
  notRequired: { en: 'Not required', hi: 'आवश्यक नहीं' },
  litres: { en: 'litres', hi: 'लीटर' },
  baseline: { en: 'Baseline', hi: 'आधार रेखा' },
  optimized: { en: 'KrishiFlux', hi: 'कृषिफ्लक्स' },
  saved: { en: 'Saved', hi: 'बचत' },
  saving: { en: 'Saving', hi: 'बचत' },
  assumptions: { en: 'Assumptions', hi: 'मान्यताएं' },
  howCalculated: { en: 'How is this calculated?', hi: 'यह कैसे गणना किया गया?' },
  prototypeNote: {
    en: 'Prototype simulation — field validation required.',
    hi: 'प्रोटोटाइप सिमुलेशन — क्षेत्र सत्यापन आवश्यक।',
  },
  simulatedData: { en: 'Simulated data', hi: 'सिमुलेटेड डेटा' },
  recalculated: { en: 'Recalculating…', hi: 'पुनर्गणना…' },
  reset: { en: 'Reset', hi: 'रीसेट' },
  apply: { en: 'Apply', hi: 'लागू करें' },
  loading: { en: 'Loading…', hi: 'लोड हो रहा है…' },
  error: { en: 'Something went wrong', hi: 'कुछ गलत हुआ' },
  retry: { en: 'Retry', hi: 'पुनः प्रयास' },

  // ---- statuses ----
  statusIrrigate: { en: 'Irrigation recommended', hi: 'सिंचाई की सलाह है' },
  statusDelay: { en: 'Delay irrigation', hi: 'सिंचाई टालें' },
  statusSkip: { en: 'No irrigation needed', hi: 'सिंचाई की आवश्यकता नहीं' },
  statusMonitor: { en: 'Monitor', hi: 'निगरानी रखें' },

  // ---- dashboard ----
  todaysAction: { en: "Today's Farm Action", hi: 'आज का कृषि कार्य' },
  farmConditions: { en: 'Live farm conditions', hi: 'खेत की वर्तमान स्थिति' },
  soilMoisture: { en: 'Soil moisture', hi: 'मिट्टी की नमी' },
  temperature: { en: 'Temperature', hi: 'तापमान' },
  humidity: { en: 'Humidity', hi: 'आर्द्रता' },
  rainProbability: { en: 'Rain probability', hi: 'बारिश की संभावना' },
  solarAvailability: { en: 'Solar availability', hi: 'सौर उपलब्धता' },
  pumpStatus: { en: 'Pump status', hi: 'पंप स्थिति' },
  waterRequired: { en: 'Water required', hi: 'आवश्यक पानी' },
  viewWhy: { en: 'View why', hi: 'कारण देखें' },
  openOptimizer: { en: 'Open optimizer', hi: 'ऑप्टिमाइज़र खोलें' },
  simulateChange: { en: 'Simulate change', hi: 'बदलाव सिम्युलेट करें' },
  contributingFactors: { en: 'Contributing factors', hi: 'योगदान देने वाले कारक' },
  what: { en: 'What?', hi: 'क्या?' },
  howMuch: { en: 'How much?', hi: 'कितना?' },
  when: { en: 'When?', hi: 'कब?' },
  resourceScore: { en: 'Resource Efficiency Score', hi: 'संसाधन दक्षता स्कोर' },
  cropStage: { en: 'Crop stage', hi: 'फसल अवस्था' },
  soilType: { en: 'Soil type', hi: 'मिट्टी का प्रकार' },
  area: { en: 'Area', hi: 'क्षेत्रफल' },
  crop: { en: 'Crop', hi: 'फसल' },
  location: { en: 'Location', hi: 'स्थान' },
  connectivity: { en: 'Connectivity', hi: 'कनेक्टिविटी' },
} satisfies Record<string, Entry>;

export type TranslationKey = keyof typeof dict;

export function translate(key: TranslationKey, lang: Language): string {
  const entry = dict[key];
  if (!entry) return key;
  return entry[lang] ?? entry.en;
}

export function pick(entry: Entry, lang: Language): string {
  return entry[lang] ?? entry.en;
}
