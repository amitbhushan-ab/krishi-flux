import { useEffect, useRef, useState } from 'react';
import { Bot, Send, Sparkles, User } from 'lucide-react';
import { useApp } from '@/state/AppContext';
import { pick } from '@/i18n';
import { formatDuration } from '@/engine/energy';
import { Badge, Callout, SectionHeading } from '@/components/ui';
import type { Language, Recommendation } from '@/lib/types';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  text: string;
}

type Intent = 'greeting' | 'irrigate' | 'howMuch' | 'when' | 'why' | 'solar' | 'weather' | 'saving' | 'energy' | 'unknown';

/**
 * Saarthi answers ONLY from the live recommendation object. There is no free
 * text generation, so it can never invent a number the engine did not produce.
 * The intent matcher is keyword-based and bilingual by design: adding a
 * language means adding its keyword list here plus a language in the i18n dict.
 */
const KEYWORDS: Record<Language, { intent: Intent; words: string[] }[]> = {
  // Order matters: more specific intents are listed first so that
  // "Kitna paani dena hai?" reads as a quantity question, not an irrigation one.
  hi: [
    { intent: 'greeting', words: ['नमस्ते', 'हैलो', 'हाय', 'नमस्कार'] },
    { intent: 'howMuch', words: ['कितना पानी', 'कितने लीटर', 'कितना पानी देना', 'kitna paani', 'kitne litre', 'quantity'] },
    { intent: 'when', words: ['कब चलाना', 'कब सिंचाई', 'समय क्या', 'कब चलाएं', 'किस समय', 'kab chalana', 'kab chalaye', 'pump kab', 'kis samay'] },
    { intent: 'solar', words: ['सौर', 'सोलर', 'धूप', 'solar', 'dhoop', 'dhup'] },
    { intent: 'weather', words: ['मौसम', 'बारिश', 'बरसात', 'mausam', 'baarish', 'barish'] },
    { intent: 'saving', words: ['बचत', 'कितना बच', 'लागत', 'bachat', 'kitna bach', 'kitni bachat'] },
    { intent: 'energy', words: ['बिजली', 'कितनी ऊर्जा', 'यूनिट', 'किलोवाट', 'bijli', 'kitni bijli', 'unit'] },
    { intent: 'why', words: ['क्यों', 'वजह', 'कारण', 'kyun', 'kyu', 'kya wajah'] },
    { intent: 'irrigate', words: ['पानी देना', 'सिंचाई', 'सींचना', 'पानी डाल', 'पानी चाहिए', 'paani dena', 'pani dena', 'paani de', 'sinc kare', 'paani chahiye'] },
  ],
  en: [
    { intent: 'greeting', words: ['hello', 'hey ', 'namaste'] },
    { intent: 'howMuch', words: ['how much water', 'how much litres', 'how much do i need', 'quantity'] },
    { intent: 'when', words: ['when should i', 'pump timing', 'what time', 'when to run'] },
    { intent: 'solar', words: ['solar', 'sunlight', 'sunny'] },
    { intent: 'weather', words: ['weather', 'rain', 'forecast', 'temperature'] },
    { intent: 'saving', words: ['saving', 'save cost', 'cost saving', 'how much money', 'save'] },
    { intent: 'energy', words: ['energy', 'kwh', 'electricity', 'units', 'power'] },
    { intent: 'why', words: ['why', 'reason', 'explain'] },
    { intent: 'irrigate', words: ['irrigate', 'water today', 'water the field', 'should i water', 'watering'] },
  ],
};

function matchIntent(text: string): Intent {
  const lower = ` ${text.toLowerCase()} `;
  for (const list of [KEYWORDS.hi, KEYWORDS.en]) {
    for (const entry of list) {
      if (entry.words.some((w) => lower.includes(w.toLowerCase()))) return entry.intent;
    }
  }
  return 'unknown';
}

function answer(intent: Intent, rec: Recommendation | null, language: Language): string {
  const hi = language === 'hi';
  if (!rec) {
    return hi ? 'इंजन अभी गणना कर रहा है। एक क्षण रुकें।' : 'The engine is still computing. One moment.';
  }

  switch (intent) {
    case 'greeting':
      return hi
        ? 'नमस्ते! मैं कृषिफ्लक्स सारथी हूँ। आज की सिंचाई के बारे में पूछिए।'
        : 'Namaste! I am KrishiFlux Saarthi. Ask me anything about today’s irrigation.';
    case 'irrigate':
      if (rec.status === 'irrigate')
        return hi
          ? `हाँ। मिट्टी की नमी फसल की आवश्यकता से नीचे है और बारिश की संभावना कम है। ${Math.round(rec.waterLitres).toLocaleString('en-IN')} लीटर पानी देने की सलाह है।`
          : `Yes. Soil moisture is below the crop requirement and rain is unlikely — ${Math.round(rec.waterLitres).toLocaleString('en-IN')} litres are advised.`;
      if (rec.status === 'delay')
        return hi
          ? 'अभी नहीं। बारिश की संभावना है, इसलिए सिंचाई टालना बेहतर है। बारिश के बाद दोबारा जांचें।'
          : 'Not yet. Rain is likely, so irrigation should be delayed. Re-check after the rain.';
      return hi
        ? 'नहीं। मिट्टी में पर्याप्त नमी है और बारिश भी संभावित है। पंप चलाने की ज़रूरत नहीं।'
        : 'No. There is adequate moisture and rain is also expected. The pump is not needed.';
    case 'howMuch':
      return rec.required
        ? hi
          ? `लगभग ${Math.round(rec.waterLitres).toLocaleString('en-IN')} लीटर पानी देने की सलाह है (${rec.depthMm} मिमी गहराई)।`
          : `Approximately ${Math.round(rec.waterLitres).toLocaleString('en-IN')} litres are recommended (${rec.depthMm} mm depth).`
        : hi
          ? 'अभी कोई पानी आवश्यक नहीं है।'
          : 'No water is required right now.';
    case 'when':
      return rec.required
        ? hi
          ? `सौर उपलब्धता के हिसाब से ${rec.recommendedTime} का विंडो उपयुक्त है। पंप लगभग ${formatDuration(rec.durationMinutes)} चलाएं।`
          : `Solar availability makes ${rec.recommendedTime} the suitable window. Run the pump for about ${formatDuration(rec.durationMinutes)}.`
        : hi ? 'आज पंप चलाने की आवश्यकता नहीं है।' : 'The pump does not need to run today.';
    case 'solar': {
      const todayPct = Math.round(rec.solar.todayWindow.avgSolarFraction * 100);
      const pct = Math.round(rec.solar.recommendedWindow.avgSolarFraction * 100);
      return hi
        ? `आज सौर उपलब्धता ${todayPct}% रहने का अनुमान है; पंप विंडो में ${pct}% मिलेगा। अनुशंसित समय ${rec.recommendedTime} है।`
        : `Solar availability is projected at ${todayPct}% today, giving ${pct}% inside the pump window. The recommended time is ${rec.recommendedTime}.`;
    }
    case 'weather': {
      const f = rec;
      return hi
        ? `आज का पानी ${f.water.et0} मिमी/दिन वाष्पोत्सर्जन, ${f.water.effectiveRainfall} मिमी प्रभावी वर्षा पर आधारित है। मौसम पृष्ठ पर पूरा 7-दिन पूर्वानुमान है।`
        : `Today’s plan is based on ${f.water.et0} mm/day evapotranspiration and ${f.water.effectiveRainfall} mm of effective rain. The Weather page has the full 7-day forecast.`;
    }
    case 'saving':
      return hi
        ? `इस घटना में ${rec.estimatedWaterSavingLitres.toLocaleString('en-IN')} लीटर पानी, ${rec.estimatedEnergySavingKwh} kWh ऊर्जा और लगभग ₹${rec.estimatedCostSavingInr} की बचत का अनुमान है।`
        : `This event is modelled to save ${rec.estimatedWaterSavingLitres.toLocaleString('en-IN')} litres, ${rec.estimatedEnergySavingKwh} kWh and about ₹${rec.estimatedCostSavingInr}.`;
    case 'energy':
      return hi
        ? `पंप ऊर्जा ${rec.energyRequirementKwh} kWh है — विंडो में ${rec.solarEnergyKwh} kWh सौर से और ${rec.gridEnergyKwh} kWh ग्रिड से।`
        : `Pump energy is ${rec.energyRequirementKwh} kWh — ${rec.solarEnergyKwh} kWh solar and ${rec.gridEnergyKwh} kWh from the grid.`;
    case 'why':
      return pick(rec.reason, language);
    case 'unknown':
    default:
      return hi
        ? 'मैं सिंचाई, पानी की मात्रा, पंप समय, सौर, मौसम या बचत के बारे में पूछे गए सवालों का जवाब दे सकता हूँ। कृपया एक स्पष्ट प्रश्न पूछें।'
        : 'I can answer about irrigation, water quantity, pump timing, solar, weather or savings. Please ask a clear question.';
  }
}

const SUGGESTIONS: Record<Language, string[]> = {
  hi: ['Aaj paani dena hai?', 'Kitna paani dena hai?', 'Pump kab chalana hai?', 'Solar kaisa hai?', 'Mausam kaisa rahega?', 'Kitni bachat hogi?'],
  en: ['Should I irrigate today?', 'How much water?', 'When should I run the pump?', 'How is the solar?', 'What is the weather?', 'How much will I save?'],
};

export default function Saarthi() {
  const { recommendation, language, setLanguage, t } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);

  // Seed the conversation whenever the language or the underlying farm changes.
  useEffect(() => {
    const welcome: Message = {
      id: ++idRef.current,
      role: 'assistant',
      text: answer('greeting', recommendation, language),
    };
    setMessages([welcome]);
  }, [language, recommendation?.farmId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, pending]);

  function ask(text: string) {
    if (!text.trim()) return;
    const intent = matchIntent(text);
    setMessages((m) => [...m, { id: ++idRef.current, role: 'user', text }]);
    setDraft('');
    setPending(true);
    // Small delay to feel conversational while the engine is re-read.
    window.setTimeout(() => {
      setMessages((m) => [...m, { id: ++idRef.current, role: 'assistant', text: answer(intent, recommendation, language) }]);
      setPending(false);
    }, 320);
  }

  return (
    <div>
      <SectionHeading
        eyebrow={language === 'hi' ? 'सहायक' : 'Assistant'}
        title="KrishiFlux Saarthi"
        description={
          language === 'hi'
            ? 'एक ही सिफारिश इंजन से जवाब। कोई अनुमानित जवाब नहीं — सारथी केवल वही बोलता है जो इंजन ने गणना की है।'
            : 'Answers from the same recommendation engine. No invented content — Saarthi only repeats what the engine computed.'
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="kf-card flex min-h-[520px] flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-soil-200/70 bg-white px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-leaf-600 text-white">
                <Bot size={16} />
              </span>
              <div>
                <p className="text-sm font-semibold text-soil-900">Saarthi</p>
                <p className="text-[11px] text-soil-500">
                  {language === 'hi' ? 'कृषिफ्लक्स इंजन से जुड़ा' : 'Connected to the KrishiFlux engine'}
                </p>
              </div>
            </div>
            <div className="inline-flex rounded-xl border border-soil-200 p-0.5">
              {(['en', 'hi'] as Language[]).map((lng) => (
                <button key={lng} type="button" onClick={() => setLanguage(lng)} className={language === lng ? 'kf-tab-active' : 'kf-tab'}>
                  {lng === 'en' ? 'EN' : 'हिं'}
                </button>
              ))}
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-soil-50 px-4 py-5 sm:px-5">
            {messages.map((m) => (
              <div key={m.id} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
                {m.role === 'assistant' && (
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-leaf-600 text-white">
                    <Bot size={15} />
                  </span>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-leaf-600 text-white'
                      : 'border border-soil-200 bg-white text-soil-700'
                  }`}
                >
                  {m.text}
                </div>
                {m.role === 'user' && (
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-soil-300 text-white">
                    <User size={15} />
                  </span>
                )}
              </div>
            ))}
            {pending && (
              <div className="flex gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-leaf-600 text-white">
                  <Bot size={15} />
                </span>
                <div className="rounded-2xl border border-soil-200 bg-white px-4 py-3 text-sm text-soil-500">…</div>
              </div>
            )}
          </div>

          <div className="border-t border-soil-200/70 bg-white p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {SUGGESTIONS[language].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => ask(q)}
                  className="rounded-full border border-soil-200 bg-soil-50 px-3 py-1.5 text-xs text-soil-700 hover:border-leaf-400 hover:text-leaf-700"
                >
                  {q}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(draft);
              }}
              className="flex gap-2"
            >
              <input
                className="kf-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={language === 'hi' ? 'अपना सवाल लिखें…' : 'Type your question…'}
                aria-label="Message Saarthi"
              />
              <button type="submit" className="kf-btn-primary px-3" disabled={!draft.trim()}>
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-5">
          <div className="kf-card p-5">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-solar-500" />
              <span className="text-sm font-semibold text-soil-900">
                {language === 'hi' ? 'इंजन की वर्तमान स्थिति' : 'Current engine state'}
              </span>
            </div>
            {recommendation ? (
              <ul className="mt-3 space-y-2 text-sm text-soil-700">
                <li>
                  <span className="font-medium text-soil-900">{language === 'hi' ? 'सिंचाई' : 'Irrigation'}:</span>{' '}
                  {recommendation.required ? (language === 'hi' ? 'आवश्यक' : 'required') : (language === 'hi' ? 'आवश्यक नहीं' : 'not required')}
                </li>
                <li>
                  <span className="font-medium text-soil-900">{language === 'hi' ? 'पानी' : 'Water'}:</span>{' '}
                  {Math.round(recommendation.waterLitres).toLocaleString('en-IN')} L
                </li>
                <li>
                  <span className="font-medium text-soil-900">{language === 'hi' ? 'अवधि' : 'Duration'}:</span>{' '}
                  {formatDuration(recommendation.durationMinutes)}
                </li>
                <li>
                  <span className="font-medium text-soil-900">{language === 'hi' ? 'विंडो' : 'Window'}:</span>{' '}
                  {recommendation.recommendedTime}
                </li>
                <li>
                  <span className="font-medium text-soil-900">{language === 'hi' ? 'ऊर्जा' : 'Energy'}:</span>{' '}
                  {recommendation.energyRequirementKwh} kWh
                </li>
                <li>
                  <span className="font-medium text-soil-900">{language === 'hi' ? 'विश्वास' : 'Confidence'}:</span>{' '}
                  {Math.round(recommendation.confidence * 100)}%
                </li>
              </ul>
            ) : (
              <p className="mt-3 text-sm text-soil-500">{language === 'hi' ? 'गणना जारी है…' : 'Computing…'}</p>
            )}
          </div>

          <Callout tone="leaf" title={language === 'hi' ? 'भाषा प्रणाली' : 'Language system'}>
            {language === 'hi'
              ? 'हर जवाब { en, hi } जोड़े से आता है, इसलिए नई भाषा जोड़ना डिक्शनरी में एक फ़ील्ड जोड़ना है — कोई कॉम्पोनेंट बदलने की ज़रूरत नहीं।'
              : 'Every answer comes from an { en, hi } pair, so adding a new Indian language means adding one field in the dictionary — no component changes.'}
          </Callout>

          <Callout tone="sky" title={language === 'hi' ? 'संवर्धित प्रसव' : 'Vernacular decision delivery'}>
            {language === 'hi'
              ? 'सारथी तकनीकी लेबल अनुवाद नहीं करता — वह मिट्टी नमी, वर्षा और सौर के आंकड़ों को सीधे कार्य में बदल देता है: "Aaj paani dena zaroori hai."'
              : 'Saarthi does not translate technical labels — it converts soil, rainfall and solar values straight into an instruction: “Aaj paani dena zaroori hai.”'}
          </Callout>

          <div className="rounded-2xl border border-soil-200 bg-white p-4 text-xs text-soil-500">
            {t('prototypeNote')}
          </div>
        </div>
      </div>
    </div>
  );
}
