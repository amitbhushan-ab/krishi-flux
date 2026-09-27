import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Beaker, RotateCcw, Sun } from 'lucide-react';
import { useApp } from '@/state/AppContext';
import { cropList, stageMeta, stageOrderList } from '@/data/crops';
import { soilList } from '@/data/soils';
import { bestWindow } from '@/engine/solar';
import { formatDuration } from '@/engine/energy';
import { SCENARIOS } from '@/state/scenarios';
import { pick } from '@/i18n';
import { ExplainablePanel, StatusBanner } from '@/components/rec';
import { Card, Callout, SectionHeading, Select, Slider } from '@/components/ui';
import type { CropStageId, SoilTypeId } from '@/lib/types';

export default function Simulator() {
  const { farm, patchFarm, conditions, patchConditions, recommendation, language, applyScenario, resetDemo, loading, t, forecast } =
    useApp();
  const [activeScenario, setActiveScenario] = useState<string>('reset');
  const [solarHigh, setSolarHigh] = useState(0.85);

  // The engine schedules from forecast day 0, so the sensitivity table must use
  // the same humidity / rain probability or it would show different windows.
  const observed = forecast[0];

  // Include the farm's actual solar value so the highlighted "current" row
  // always matches the recommendation shown above.
  const solarSteps = useMemo(() => {
    const set = new Set([0.9, 0.75, 0.5, 0.35, 0.25, +conditions.solarAvailability.toFixed(2)]);
    return [...set].sort((a, b) => b - a);
  }, [conditions.solarAvailability]);
  const currentStep = +conditions.solarAvailability.toFixed(2);

  // Compare today's window against what the SAME run time would give under
  // different solar availability. Water stays constant; only the window moves.
  const sensitivity = useMemo(() => {
    const duration = recommendation ? recommendation.energy.durationHours || 0.5 : 0.5;
    return solarSteps.map((s) => {
      const win = bestWindow(duration, s, observed.humidity, observed.rainProbability, 0);
      return { solar: s, label: win.label, fit: Math.round(win.avgSolarFraction * 100) };
    });
  }, [recommendation, observed, solarSteps]);

  const highSolarWindow = useMemo(() => {
    const duration = recommendation ? recommendation.energy.durationHours || 0.5 : 0.5;
    return bestWindow(duration, solarHigh, observed.humidity, observed.rainProbability, 0);
  }, [recommendation, solarHigh, observed]);

  const currentWindow = recommendation?.solar.recommendedWindow;

  function runScenario(id: string) {
    setActiveScenario(id);
    applyScenario(id);
  }

  return (
    <div>
      <SectionHeading
        eyebrow={language === 'hi' ? 'फार्म डिजिटल ट्विन' : 'Farm digital twin'}
        title={language === 'hi' ? 'फार्म सिम्युलेटर' : 'Farm Simulator'}
        description={
          language === 'hi'
            ? 'किसी भी स्लाइडर को बदलें — निर्णय इंजन तुरंत दोबारा चलता है। पेज रीलोड की आवश्यकता नहीं।'
            : 'Move any slider — the decision engine re-runs immediately and the recommendation updates live. No page reload.'
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => runScenario(s.id)}
            className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
              activeScenario === s.id
                ? 'border-leaf-500 bg-leaf-50 text-leaf-800'
                : 'border-soil-200 bg-white text-soil-700 hover:border-leaf-300'
            }`}
            title={pick(s.expected, language)}
          >
            <span className="block font-semibold">{pick(s.title, language)}</span>
            <span className="mt-0.5 block text-[11px] opacity-80">{pick(s.expected, language)}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            resetDemo();
            setActiveScenario('reset');
          }}
          className="kf-btn-secondary ml-auto self-stretch"
        >
          <RotateCcw size={14} /> {t('reset')}
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* ------------------------------- INPUTS ------------------------------- */}
        <div className="space-y-5">
          <Card title={language === 'hi' ? 'स्थिति इनपुट' : 'Condition inputs'} subtitle={language === 'hi' ? 'मिट्टी और मौसम' : 'Soil and weather'}>
            <div className="space-y-5">
              <Slider
                label={language === 'hi' ? 'मिट्टी की नमी' : 'Soil moisture'}
                value={conditions.soilMoisture}
                min={2}
                max={55}
                step={1}
                unit="%"
                tone="sky"
                onChange={(v) => patchConditions({ soilMoisture: v })}
                hint={language === 'hi' ? 'जड़ क्षेत्र में मात्रात्मक जल' : 'Volumetric water in the root zone'}
              />
              <Select
                label={t('soilType')}
                value={farm.soilType}
                options={soilList}
                onChange={(v) => patchFarm({ soilType: v as SoilTypeId })}
              />
              <Slider
                label={language === 'hi' ? 'तापमान' : 'Temperature'}
                value={conditions.temperature}
                min={10}
                max={48}
                unit="°C"
                tone="solar"
                onChange={(v) => patchConditions({ temperature: v })}
              />
              <Slider
                label={language === 'hi' ? 'आर्द्रता' : 'Humidity'}
                value={conditions.humidity}
                min={15}
                max={100}
                unit="%"
                tone="sky"
                onChange={(v) => patchConditions({ humidity: v })}
              />
              <Slider
                label={language === 'hi' ? 'बारिश की संभावना' : 'Rain probability'}
                value={conditions.rainProbability}
                min={0}
                max={100}
                unit="%"
                tone="sky"
                onChange={(v) => patchConditions({ rainProbability: v })}
              />
              <Slider
                label={language === 'hi' ? 'बारिश पूर्वानुमान' : 'Rainfall forecast'}
                value={conditions.rainfallForecast}
                min={0}
                max={60}
                unit=" mm"
                tone="sky"
                onChange={(v) => patchConditions({ rainfallForecast: v })}
              />
            </div>
          </Card>

          <Card title={language === 'hi' ? 'फसल और खेत' : 'Crop and farm'}>
            <div className="space-y-5">
              <Select
                label={language === 'hi' ? 'फसल' : 'Crop'}
                value={farm.crop}
                options={cropList}
                onChange={(v) => patchFarm({ crop: v })}
              />
              <Select
                label={language === 'hi' ? 'फसल अवस्था' : 'Crop stage'}
                value={farm.cropStage}
                options={stageOrderList.map((s) => ({ id: s, label: stageMeta[s][language] }))}
                onChange={(v) => patchFarm({ cropStage: v as CropStageId })}
                hint={language === 'hi' ? 'अवस्था फसल गुणांक (Kc) और सहनशीलता बदलती है' : 'The stage changes Kc, root depth and stress tolerance'}
              />
              <Slider
                label={language === 'hi' ? 'खेत का क्षेत्रफल' : 'Farm area'}
                value={farm.areaAcres}
                min={0.25}
                max={25}
                step={0.25}
                unit=" ac"
                onChange={(v) => patchFarm({ areaAcres: v })}
              />
            </div>
          </Card>

          <Card title={language === 'hi' ? 'ऊर्जा और पंप' : 'Energy and pump'} subtitle={language === 'hi' ? 'सौर-सचेत समय को प्रभावित करता है' : 'Drives solar-aware scheduling'}>
            <div className="space-y-5">
              <Slider
                label={language === 'hi' ? 'सौर उपलब्धता' : 'Solar availability'}
                value={Math.round(conditions.solarAvailability * 100)}
                min={5}
                max={98}
                unit="%"
                tone="solar"
                onChange={(v) => patchConditions({ solarAvailability: v / 100 })}
                hint={language === 'hi' ? 'कम सौर → पंप समय बदलता है, पानी नहीं' : 'Low solar → the pump window moves; water stays the same'}
              />
              <Slider
                label={language === 'hi' ? 'पंप शक्ति' : 'Pump power'}
                value={farm.pumpPowerKw}
                min={0.5}
                max={15}
                step={0.5}
                unit=" kW"
                onChange={(v) => patchFarm({ pumpPowerKw: v })}
              />
              <Slider
                label={language === 'hi' ? 'पंप दक्षता' : 'Pump efficiency'}
                value={Math.round(farm.pumpEfficiency * 100)}
                min={30}
                max={90}
                unit="%"
                tone="sky"
                onChange={(v) => patchFarm({ pumpEfficiency: v / 100 })}
              />
              <Slider
                label={language === 'hi' ? 'सिंचाई दक्षता' : 'Irrigation efficiency'}
                value={Math.round(farm.irrigationEfficiency * 100)}
                min={35}
                max={95}
                unit="%"
                tone="sky"
                onChange={(v) => patchFarm({ irrigationEfficiency: v / 100 })}
                hint={language === 'hi' ? 'पानी खेत तक कितना प्रभावी पहुँचता है' : 'How much applied water actually reaches the root zone'}
              />
            </div>
          </Card>
        </div>

        {/* ------------------------------- OUTPUT ------------------------------ */}
        <div className="space-y-5">
          <div className="kf-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Beaker size={16} className="text-leaf-600" />
              <span className="text-sm font-semibold text-soil-900">
                {language === 'hi' ? 'लाइव परिणाम' : 'Live result'}
              </span>
              {loading && (
                <span className="animate-pulse text-xs text-leaf-600">
                  {language === 'hi' ? 'रीकैलकुलेट…' : 'Recalculating…'}
                </span>
              )}
            </div>
            {recommendation ? (
              <StatusBanner rec={recommendation} language={language} compact />
            ) : (
              <div className="grid h-40 place-items-center rounded-xl border border-dashed border-soil-200 text-sm text-soil-500">
                {language === 'hi' ? 'इंजन गणना कर रहा है…' : 'Engine is computing…'}
              </div>
            )}
          </div>

          {/* -------- SOLAR PROOF: same water, different window -------- */}
          <Card
            title={language === 'hi' ? 'सौर संवेदनशीलता' : 'Solar sensitivity — Proof C'}
            subtitle={
              language === 'hi'
                ? 'वही पानी, वही पंप अवधि — केवल सौर बदलता है, विंडो बदलती है।'
                : 'Identical water requirement and run time — only solar availability changes, and the window moves.'
            }
            action={
              <span className="flex items-center gap-2 text-xs text-soil-500">
                <Sun size={14} className="text-solar-500" />
                {language === 'hi' ? 'पंप अवधि' : 'Run time'}:{' '}
                {recommendation ? formatDuration(recommendation.durationMinutes) : '—'}
              </span>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[440px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-soil-500">
                    <th className="py-2">{language === 'hi' ? 'सौर उपलब्धता' : 'Solar availability'}</th>
                    <th className="py-2">{language === 'hi' ? 'पंप विंडो' : 'Pump window'}</th>
                    <th className="py-2">{language === 'hi' ? 'खिड़की में फिट' : 'Fit in window'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-soil-100">
                  {sensitivity.map((row) => {
                    const isCurrent = row.solar === currentStep;
                    return (
                      <tr key={row.solar} className={isCurrent ? 'bg-leaf-50' : ''}>
                        <td className="py-2.5 font-medium text-soil-900">
                          {Math.round(row.solar * 100)}%
                          {isCurrent && (
                            <span className="ml-2 rounded bg-leaf-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                              {language === 'hi' ? 'वर्तमान' : 'current'}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 tabular-nums text-soil-700">{row.label}</td>
                        <td className="py-2.5 tabular-nums text-soil-700">{row.fit}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 space-y-3 rounded-xl border border-solar-400/40 bg-solar-400/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium text-soil-700">
                  {language === 'hi' ? 'सौर उपलब्धता आज़माएं' : 'Try a solar availability value'}
                </label>
                <span className="rounded-md bg-white px-2 py-1 text-sm font-semibold text-solar-600">
                  {Math.round(solarHigh * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={98}
                value={Math.round(solarHigh * 100)}
                onChange={(e) => setSolarHigh(Number(e.target.value) / 100)}
                aria-label="Test solar availability"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-white p-3">
                  <p className="text-xs text-soil-500">
                    {Math.round(solarHigh * 100)}% {language === 'hi' ? 'सौर में' : 'solar'} →{' '}
                    {language === 'hi' ? 'विंडो' : 'window'}
                  </p>
                  <p className="text-sm font-semibold text-soil-900">{highSolarWindow.label}</p>
                </div>
                <div className="rounded-lg bg-white p-3">
                  <p className="text-xs text-soil-500">
                    {language === 'hi' ? 'वर्तमान स्थिति' : 'Current conditions'} ({Math.round(conditions.solarAvailability * 100)}%) →{' '}
                    {language === 'hi' ? 'विंडो' : 'window'}
                  </p>
                  <p className="text-sm font-semibold text-soil-900">
                    {currentWindow ? currentWindow.label : '—'}
                  </p>
                </div>
              </div>
              <p className="text-xs text-soil-600">
                {language === 'hi'
                  ? 'गुलाबी पंक्ति में वॉटर आवश्यकता अपरिवर्तित रहती है — केवल पंप चलाने का समय बदलता है।'
                  : 'The water requirement stays put across this table — only when the pump runs changes.'}
              </p>
            </div>
          </Card>

          {recommendation && (
            <Card title={language === 'hi' ? 'निर्णय की व्याख्या' : 'Decision explanation'}>
              <ExplainablePanel rec={recommendation} language={language} />
            </Card>
          )}

          <Callout tone="solar" title="Prototype simulation — field validation required.">
            {language === 'hi'
              ? 'ये मान किसान-प्रोफ़ाइल से आते हैं और पूरी तरह बदले जा सकते हैं। मानक वैज्ञानिक संबंध पारदर्शी रूप से लागू हैं।'
              : 'Every value here is user-editable. The standard scientific relationships behind them are applied transparently and documented in the assumptions panel.'}
          </Callout>
        </div>
      </div>

      <div className="mt-6">
        <Link to="/optimizer" className="kf-btn-primary">
          {language === 'hi' ? 'ऑप्टिमाइज़र में खोलें' : 'Open in Water–Energy Optimizer'}
        </Link>
      </div>
    </div>
  );
}
