import { useEffect, useState } from 'react';
import { CloudSun, Database, Globe, RefreshCw, Server, ShieldAlert, Wifi, WifiOff } from 'lucide-react';
import { clearCache, readCache } from '@/api/client';
import { useApp } from '@/state/AppContext';
import { Callout, Card, KeyValue, SectionHeading, StatCard, Toggle } from '@/components/ui';
import type { Language } from '@/lib/types';

interface CacheRow {
  farmId: string;
  savedAt: string;
}

export default function Settings() {
  const {
    language,
    setLanguage,
    connectivity,
    setConnectivity,
    faultInjection,
    setFaultInjection,
    dataMode,
    setDataMode,
    liveStatus,
    remoteMode,
    setRemoteMode,
    cacheSize,
    resetDemo,
    farm,
    t,
  } = useApp();
  const hi = language === 'hi';
  const [rows, setRows] = useState<CacheRow[]>([]);

  const refreshCache = () => {
    try {
      setRows(readCache().map((c) => ({ farmId: c.farmId, savedAt: c.savedAt })));
    } catch {
      setRows([]);
    }
  };
  useEffect(refreshCache, []);

  return (
    <div>
      <SectionHeading
        eyebrow={hi ? 'कॉन्फ़िगरेशन' : 'Configuration'}
        title={t('navSettings')}
        description={
          hi
            ? 'भाषा, कनेक्टिविटी, डेमो सेटिंग्स और प्रोटोटाइप की सीमाएं।'
            : 'Language, connectivity, demo controls and the prototype’s documented limits.'
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ---------- Language ---------- */}
        <Card title={hi ? 'भाषा' : 'Language'} subtitle={hi ? 'अनुशंसाएं और UI दोनों बदलते हैं' : 'Both the recommendation and the UI switch'}>
          <div className="flex gap-3">
            {(['en', 'hi'] as Language[]).map((lng) => (
              <button
                key={lng}
                type="button"
                onClick={() => setLanguage(lng)}
                className={language === lng ? 'kf-btn-primary' : 'kf-btn-secondary'}
                aria-pressed={language === lng}
              >
                <Globe size={15} /> {lng === 'en' ? 'English' : 'हिंदी'}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-2 rounded-xl border border-soil-200 bg-soil-50 p-4 text-sm text-soil-700">
            <p className="font-semibold text-soil-900">{hi ? 'उदाहरण आउटपुट' : 'Sample output'}</p>
            <p>
              {hi
                ? 'हाँ। मिट्टी की नमी फसल की आवश्यकता से नीचे है और बारिश की संभावना कम है।'
                : 'Yes. Soil moisture is below the crop requirement and rain is unlikely.'}
            </p>
            <p className="text-xs text-soil-500">
              {hi
                ? 'नई भाषा जोड़ने के लिए src/i18n में प्रत्येक कुंजी में एक फ़ील्ड जोड़ें और Language यूनियन बढ़ाएं।'
                : 'To add a language, add one field per key in src/i18n and extend the Language union.'}
            </p>
          </div>
        </Card>

        {/* ---------- Connectivity ---------- */}
        <Card
          title={hi ? 'कनेक्टिविटी सिमुलेशन' : 'Connectivity simulation'}
          subtitle={hi ? 'Proof G: ऑफ़लाइन मोड में अंतिम सिफारिश उपलब्ध रहती है' : 'Proof G: the last recommendation stays available offline'}
          action={
            <span className="flex items-center gap-2 text-xs text-soil-500">
              {connectivity === 'offline' ? <WifiOff size={14} /> : <Wifi size={14} />}
              {connectivity}
            </span>
          }
        >
          <div className="grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setConnectivity('online')}
              className={connectivity === 'online' ? 'kf-btn-primary' : 'kf-btn-secondary'}
            >
              🟢 {hi ? 'सिंक' : 'Synced'}
            </button>
            <button
              type="button"
              onClick={() => setConnectivity('offline')}
              className={connectivity === 'offline' ? 'kf-btn-primary' : 'kf-btn-secondary'}
            >
              🟡 {hi ? 'ऑफ़लाइन' : 'Offline'}
            </button>
            <button
              type="button"
              onClick={() => setConnectivity('syncing')}
              className={connectivity === 'syncing' ? 'kf-btn-primary' : 'kf-btn-secondary'}
            >
              🔄 {hi ? 'सिंक बाकी' : 'Sync pending'}
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-soil-200 bg-soil-50 p-4">
            <p className="text-sm font-semibold text-soil-900">
              {hi ? 'कैश प्रवाह' : 'Cache flow'}
            </p>
            <p className="mt-1 font-mono text-xs text-soil-600">
              Cloud → Local Cache → Last Recommendation → Connectivity Restored → Sync
            </p>
            <p className="mt-2 text-xs text-soil-500">
              {hi
                ? 'हम पूर्ण ऑफ़लाइन संचालन का दावा नहीं करते — केवल अंतिम सिफारिश स्थानीय रूप से सुरक्षित रहती है।'
                : 'We do not claim full offline operation — only that the last recommendation is stored locally.'}
            </p>
          </div>
        </Card>

        {/* ---------- Fault injection ---------- */}
        <Card
          title={hi ? 'त्रुटि प्रबंधन' : 'Error handling'}
          subtitle="POST /api/* failure simulation"
          action={<ShieldAlert size={16} className="text-solar-600" />}
        >
          <Toggle
            checked={faultInjection}
            onChange={setFaultInjection}
            label={hi ? 'अपस्ट्रीम विफलता सिमुलेट करें' : 'Simulate an upstream failure'}
            hint={
              hi
                ? 'चालू करने पर API विफल होगी; ऐप त्रुटि दिखाएगा और पिछली सिफारिश बनाए रखेगा। कोई स्टैक ट्रेस नहीं।'
                : 'With this on the API fails; the app shows an error and keeps the last recommendation. No stack traces are exposed.'
            }
          />
          <div className="mt-3 space-y-2 text-sm text-soil-600">
            <p>· {hi ? 'आउटपुट मान्यता (400)' : 'Input validation (400)'}</p>
            <p>· {hi ? 'रिसोर्स नहीं मिला (404)' : 'Resource not found (404)'}</p>
            <p>· {hi ? 'सेवा अनुपलब्ध (503)' : 'Service unavailable (503)'}</p>
            <p>· {hi ? 'स्टैक ट्रेस कभी उपयोगकर्ता को नहीं दिखता' : 'Stack traces are never shown to the user'}</p>
          </div>
        </Card>

        {/* ---------- Data source ---------- */}
        <Card
          title={hi ? 'डेटा स्रोत' : 'Data source'}
          subtitle={hi ? 'लाइव Open-Meteo या निर्धारित सिमुलेशन' : 'Live Open-Meteo or deterministic simulation'}
          action={<CloudSun size={16} className="text-sky-500" />}
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setDataMode('simulated')}
              className={dataMode === 'simulated' ? 'kf-btn-primary' : 'kf-btn-secondary'}
              aria-pressed={dataMode === 'simulated'}
            >
              🌗 {hi ? 'सिमुलेटेड' : 'Simulated'}
            </button>
            <button
              type="button"
              onClick={() => setDataMode('live')}
              className={dataMode === 'live' ? 'kf-btn-primary' : 'kf-btn-secondary'}
              aria-pressed={dataMode === 'live'}
            >
              🛰️ {hi ? 'लाइव (Open-Meteo)' : 'Live (Open-Meteo)'}
            </button>
          </div>
          <p className="mt-3 text-sm text-soil-600">
            {hi
              ? 'लाइव मोड फार्म के निर्देशांक से मुफ्त Open-Meteo API (कोई कुंजी नहीं) लाता है; नेटवर्क विफल होने पर ऐप चुपचाप सिमुलेशन पर लौटता है।'
              : 'Live mode fetches the free Open-Meteo API (no key) for the farm coordinates; on any network failure the app silently falls back to the simulation.'}
          </p>
          <div className="mt-3 rounded-xl border border-soil-200 bg-soil-50 p-3 text-xs text-soil-600">
            {dataMode === 'live' && liveStatus ? (
              liveStatus.degradedToSimulated ? (
                <p>🟡 {hi ? 'लाइव अनुरोध विफल — सिमुलेशन सक्रिय' : 'Live fetch failed — simulation active'}</p>
              ) : (
                <>
                  <p className="font-semibold text-soil-800">🟢 Open-Meteo · {liveStatus.condition}</p>
                  <p className="mt-1">
                    {liveStatus.resolvedLocation} · {new Date(liveStatus.fetchedAt).toLocaleTimeString()}
                  </p>
                </>
              )
            ) : (
              <p>
                {dataMode === 'live'
                  ? hi ? 'प्रतीक्षा…' : 'Fetching…'
                  : hi
                    ? 'सिमुलेशन निर्धारित रूप से उत्पन्न (src/data/weather.ts)'
                    : 'Deterministic simulation (src/data/weather.ts)'}
              </p>
            )}
          </div>
        </Card>

        {/* ---------- Backend mode ---------- */}
        <Card
          title={hi ? 'बैकएंड मोड' : 'Backend mode'}
          subtitle={hi ? 'इन-प्रोसेस इंजन या Express सर्वर' : 'In-process engine or the Express server'}
          action={<Server size={16} className="text-leaf-600" />}
        >
          <Toggle
            checked={remoteMode}
            onChange={setRemoteMode}
            label={hi ? 'रिमोट API का उपयोग करें (/api → :8787)' : 'Use the remote API (/api → :8787)'}
            hint={
              hi
                ? 'सर्वर चल नहीं रहा हो तो ऐप चुपचाप इन-प्रोसेस इंजन पर लौटता है — डेमो कभी नहीं टूटता। npm run api से सर्वर शुरू करें।'
                : 'If the server is not running, the app silently falls back to the in-process engine — the demo never breaks. Start it with npm run api.'
            }
          />
          <div className="mt-3 space-y-1.5 text-sm text-soil-600">
            <p>· POST /api/recommendation · /api/optimize · /api/simulate</p>
            <p>· GET /api/weather · /api/solar · /api/farms · /api/impact · /api/analytics</p>
            <p>· {hi ? 'समान इंजन, समान सत्यापन, समान त्रुटि मैपिंग (test:api द्वारा सिद्ध)' : 'Same engine, same validation, same error mapping (proven by test:api)'}</p>
          </div>
        </Card>

        {/* ---------- Cache ---------- */}
        <Card
          title={hi ? 'स्थानीय कैश' : 'Local cache'}
          subtitle="localStorage · krishiflux.cache.v1"
          action={
            <button
              type="button"
              className="kf-btn-ghost"
              onClick={() => {
                clearCache();
                refreshCache();
              }}
            >
              <RefreshCw size={14} /> {t('reset')}
            </button>
          }
        >
          <div className="mb-3 grid grid-cols-2 gap-3">
            <StatCard label={hi ? 'संग्रहीत सिफारिशें' : 'Stored recommendations'} value={cacheSize} tone="leaf" />
            <StatCard label={hi ? 'सीमा' : 'Limit'} value={12} tone="soil" />
          </div>
          {rows.length === 0 ? (
            <p className="text-sm text-soil-500">
              {hi ? 'अभी कुछ संग्रहीत नहीं — कोई सिफारिश बनाने पर कैश भर जाएगा।' : 'Nothing stored yet — run a recommendation to populate the cache.'}
            </p>
          ) : (
            <ul className="divide-y divide-soil-100 text-sm">
              {rows.map((r) => (
                <li key={r.farmId + r.savedAt} className="flex items-center justify-between py-2">
                  <span className="font-medium text-soil-800">{r.farmId}</span>
                  <span className="tabular-nums text-slate-500 text-soil-500">
                    {new Date(r.savedAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* ---------- Demo controls ---------- */}
        <Card title={hi ? 'डेमो नियंत्रण' : 'Demo controls'}>
          <div className="space-y-3">
            <button type="button" className="kf-btn-primary w-full" onClick={resetDemo}>
              {hi ? 'डेमो स्थिति रीसेट करें' : 'Reset demo state'}
            </button>
            <p className="text-xs text-soil-500">
              {hi
                ? 'ग्रीन वैली फार्म · 2 एकड़ · टमाटर · फूल अवस्था · 24% नमी · 18% बारिश · 82% सौर'
                : 'Green Valley Farm · 2 acres · Tomato · Flowering · 24% moisture · 18% rain · 82% solar'}
            </p>
          </div>
          <div className="mt-4">
            <KeyValue
              items={[
                { label: 'farm.name', value: farm.name },
                { label: 'farm.areaAcres', value: farm.areaAcres },
                { label: 'farm.crop', value: farm.crop },
                { label: 'farm.cropStage', value: farm.cropStage },
                { label: 'farm.soilType', value: farm.soilType },
                { label: 'farm.pumpPowerKw', value: farm.pumpPowerKw },
                { label: 'farm.ownerId', value: farm.ownerId },
                { label: 'farm.id', value: farm.id },
              ]}
            />
          </div>
        </Card>

        {/* ---------- Data model ---------- */}
        <Card
          title={hi ? 'डेटा मॉडल' : 'Data model'}
          subtitle="src/lib/types.ts"
          action={<Database size={16} className="text-soil-400" />}
        >
          <div className="space-y-3 text-sm">
            <ModelGroup
              name="User"
              fields="id · name · phone · email · role · language · createdAt"
            />
            <ModelGroup name="Farm" fields="id · ownerId · name · location · area · soilType · crop · cropStage · pumpType · pumpPower" />
            <ModelGroup name="Sensor" fields="id · farmId · type · value · unit · status · lastUpdated" />
            <ModelGroup name="Weather" fields="id · farmId · timestamp · temperature · humidity · rainProbability · rainfall" />
            <ModelGroup name="CropProfile" fields="crop · stage · waterParameters · thresholds · coefficients (Kc, MAD, root depth)" />
            <ModelGroup name="IrrigationRecommendation" fields="farmId · timestamp · required · water · duration · recommendedTime · reason · confidence" />
            <ModelGroup name="EnergyRecord" fields="farmId · timestamp · solarGeneration · pumpConsumption" />
            <ModelGroup name="Savings" fields="farmId · baselineWater · optimizedWater · baselineEnergy · optimizedEnergy · baselineCost · optimizedCost · savedMetrics" />
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Callout tone="sky" title={hi ? 'सुरक्षा' : 'Security'}>
          <ul className="mt-1 list-inside list-disc space-y-1 text-sm">
            <li>{hi ? 'कोई गोपनीय कुंजी स्रोत में नहीं — कोई नकली API कुंजी नहीं' : 'No secrets in source — no fake API keys anywhere in the bundle'}</li>
            <li>{hi ? 'सभी इनपुट इंजन से पहले मान्य होते हैं' : 'All inputs are validated before the engine runs'}</li>
            <li>{hi ? 'त्रुटियों को साफ़ संदेशों में बदला जाता है, स्टैक ट्रेस नहीं' : 'Errors are mapped to plain messages, never stack traces'}</li>
            <li>{hi ? 'सत्र स्थानीय रूप से संग्रहीत है (प्रोटोटाइप)' : 'Session is stored locally (prototype only)'}</li>
          </ul>
        </Callout>

        <Callout tone="solar" title={hi ? 'सीमाएं' : 'Limitations'}>
          <ul className="mt-1 list-inside list-disc space-y-1 text-sm">
            <li>{hi ? 'मौसम, सौर और सेंसर डेटा सिमुलेटेड हैं' : 'Weather, solar and sensor data are simulated'}</li>
            <li>{hi ? 'पूर्ण ऑफ़लाइन संचालन का दावा नहीं — केवल अंतिम सिफारिश कैश' : 'No claim of full offline operation — only cached last advice'}</li>
            <li>{hi ? 'कोई उपज या आय वृद्धि का दावा नहीं' : 'No yield or income increase claimed'}</li>
            <li>{hi ? 'कृषि स्वास्थ्य विश्लेषण सिमुलेटेड है, निदान नहीं' : 'Crop health analysis is simulated, not a diagnosis'}</li>
            <li>{hi ? 'क्षेत्र सत्यापन आवश्यक' : 'Field validation required'}</li>
          </ul>
        </Callout>
      </div>
    </div>
  );
}

function ModelGroup({ name, fields }: { name: string; fields: string }) {
  return (
    <div className="rounded-xl border border-soil-200 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-leaf-700">{name}</p>
      <p className="mt-1 font-mono text-xs leading-relaxed text-soil-600">{fields}</p>
    </div>
  );
}
