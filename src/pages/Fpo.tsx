import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Droplets, Factory, Zap } from 'lucide-react';
import { getAnalytics, forecastFor, ApiError, type FleetRow } from '@/api/client';
import { useApp } from '@/state/AppContext';
import { stageMeta } from '@/data/crops';
import { assessClimateRisks } from '@/engine/risk';
import { pick } from '@/i18n';
import { SavingsChart } from '@/components/charts';
import { Badge, Callout, Card, ErrorState, KeyValue, SectionHeading, Skeleton, StatCard } from '@/components/ui';

const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');

export default function Fpo() {
  const { language, setFarm, patchConditions } = useApp();
  const hi = language === 'hi';
  const navigate = useNavigate();
  const [rows, setRows] = useState<FleetRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<FleetRow | null>(null);

  const load = async () => {
    setError(null);
    setRows(null);
    try {
      const data = await getAnalytics();
      setRows(data);
      setSelected((s) => s ?? data[0] ?? null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the FPO fleet.');
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totals = useMemo(() => {
    if (!rows) return null;
    return {
      farms: rows.length,
      needingIrrigation: rows.filter((r) => r.recommendation.status === 'irrigate').length,
      waterSaved: rows.reduce((s, r) => s + r.impact.saved.waterLitres, 0),
      energySaved: rows.reduce((s, r) => s + r.impact.saved.energyKwh, 0),
      costSaved: rows.reduce((s, r) => s + r.impact.saved.costInr, 0),
      avgScore: Math.round(rows.reduce((s, r) => s + r.score.total, 0) / Math.max(rows.length, 1)),
      alerts: rows.reduce((s, r) => s + assessClimateRisks(r.inputs, forecastFor(r.inputs, r.farm.id, 7)).length, 0),
    };
  }, [rows]);

  const selectedRisks = useMemo(
    () => (selected ? assessClimateRisks(selected.inputs, forecastFor(selected.inputs, selected.farm.id, 7)) : []),
    [selected],
  );

  return (
    <div>
      <SectionHeading
        eyebrow={hi ? 'सहकारी दृश्य' : 'Cooperative view'}
        title={hi ? 'एफपीओ डैशबोर्ड' : 'FPO Dashboard'}
        description={
          hi
            ? 'खेत-स्तर तक ड्रिल-डाउन के साथ जल, ऊर्जा और लागत बचत।'
            : 'Fleet-level water, energy and cost savings with per-farm drill-down.'
        }
      />

      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {!rows && !error && (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      )}

      {rows && totals && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard label={hi ? 'कुल खेत' : 'Farms'} value={totals.farms} tone="soil" icon={<Factory size={15} />} />
            <StatCard
              label={hi ? 'सिंचाई चाहिए' : 'Needing irrigation'}
              value={totals.needingIrrigation}
              hint={hi ? 'आज की सिफारिश' : "today's recommendation"}
              tone="leaf"
              icon={<Droplets size={15} />}
            />
            <StatCard label={hi ? 'पानी बचा' : 'Water saved'} value={`${fmt(totals.waterSaved)} L`} tone="sky" icon={<Droplets size={15} />} />
            <StatCard label={hi ? 'ऊर्जा बची' : 'Energy saved'} value={`${totals.energySaved} kWh`} tone="solar" icon={<Zap size={15} />} />
            <StatCard label={hi ? 'लागत बची' : 'Cost saved'} value={`₹${fmt(totals.costSaved)}`} tone="leaf" />
            <StatCard
              label={hi ? 'जलवायु अलर्ट' : 'Climate alerts'}
              value={totals.alerts}
              hint={`${hi ? 'औसत स्कोर' : 'avg score'} ${totals.avgScore}%`}
              tone={totals.alerts > 4 ? 'danger' : 'soil'}
              icon={<AlertTriangle size={15} />}
            />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <Card title={hi ? 'खेत सूची' : 'Farm list'} subtitle={hi ? 'किसी भी पंक्ति पर क्लिक करके ड्रिल-डाउन करें' : 'Click any row to drill down'} className="min-w-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-soil-500">
                      <th className="py-2">{hi ? 'खेत' : 'Farm'}</th>
                      <th className="py-2">{hi ? 'किसान' : 'Farmer'}</th>
                      <th className="py-2">{hi ? 'फसल' : 'Crop'}</th>
                      <th className="py-2">{hi ? 'अवस्था' : 'Stage'}</th>
                      <th className="py-2">{hi ? 'नमी' : 'Moisture'}</th>
                      <th className="py-2">{hi ? 'निर्णय' : 'Decision'}</th>
                      <th className="py-2">{hi ? 'स्कोर' : 'Score'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-soil-100">
                    {rows.map((r) => (
                      <tr
                        key={r.farm.id}
                        onClick={() => setSelected(r)}
                        className={`cursor-pointer transition ${
                          selected?.farm.id === r.farm.id ? 'bg-leaf-50' : 'hover:bg-soil-50'
                        }`}
                      >
                        <td className="py-2.5 font-medium text-soil-900">{r.farm.name}</td>
                        <td className="py-2.5 text-soil-600">{r.farm.farmerName}</td>
                        <td className="py-2.5 text-soil-600">{r.farm.crop}</td>
                        <td className="py-2.5 text-soil-600">{stageMeta[r.farm.cropStage][language]}</td>
                        <td className="py-2.5 tabular-nums text-soil-600">{r.inputs.soilMoisture}%</td>
                        <td className="py-2.5">
                          <Badge tone={r.recommendation.status === 'irrigate' ? 'leaf' : r.recommendation.status === 'delay' ? 'solar' : 'sky'}>
                            {r.recommendation.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 tabular-nums text-soil-700">{r.score.total}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="min-w-0 space-y-5">
              {selected && (
                <Card
                  title={selected.farm.name}
                  subtitle={`${selected.farm.areaAcres} ac · ${selected.farm.village}, ${selected.farm.district} · ${selected.farm.farmerName}`}
                  action={
                    <button
                      type="button"
                      className="kf-btn-ghost"
                      onClick={() => {
                        setFarm(selected.farm);
                        patchConditions(selected.inputs);
                        navigate('/dashboard');
                      }}
                    >
                      Open <ArrowRight size={14} />
                    </button>
                  }
                >
                  <div className="mb-4 flex flex-wrap gap-2">
                    <Badge tone="leaf">{selected.recommendation.status}</Badge>
                    <Badge tone="sky">{selected.recommendation.solarSuitability}</Badge>
                    <Badge tone="solar">{pick({ en: 'weather risk', hi: 'मौसम जोखिम' }, language)}: {selectedRisks.length}</Badge>
                  </div>

                  <KeyValue
                    items={[
                      { label: hi ? 'पानी आवश्यक' : 'Water required', value: selected.recommendation.required ? `${fmt(selected.recommendation.waterLitres)} L` : '—' },
                      { label: hi ? 'पंप अवधि' : 'Pump duration', value: `${selected.recommendation.durationMinutes} min` },
                      { label: hi ? 'विंडो' : 'Window', value: selected.recommendation.recommendedTime },
                      { label: hi ? 'ऊर्जा' : 'Energy', value: `${selected.recommendation.energyRequirementKwh} kWh` },
                      { label: hi ? 'बचा पानी' : 'Water saved', value: `${fmt(selected.impact.saved.waterLitres)} L` },
                      { label: hi ? 'बची ऊर्जा' : 'Energy saved', value: `${selected.impact.saved.energyKwh} kWh` },
                      { label: hi ? 'बची लागत' : 'Cost saved', value: `₹${fmt(selected.impact.saved.costInr)}` },
                      { label: hi ? 'दक्षता स्कोर' : 'Efficiency score', value: `${selected.score.total}%` },
                    ]}
                  />

                  {selectedRisks.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {selectedRisks.slice(0, 2).map((r) => (
                        <div key={r.id} className="rounded-lg bg-solar-400/10 p-3 text-sm text-soil-700">
                          <span className="font-semibold text-soil-900">{pick(r.title, language)}</span> — {pick(r.action, language)}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              <Card title={hi ? 'बेड़े की तुलना' : 'Fleet comparison'} subtitle={hi ? '60 दिन · आधार बनाम कृषिफ्लक्स' : '60 days · baseline vs KrishiFlux'}>
                {selected ? <SavingsChart impact={selected.impact} /> : null}
              </Card>
            </div>
          </div>

          <div className="mt-5">
            <Callout tone="solar" title="Prototype simulation — field validation required.">
              {hi
                ? 'सभी खेत डेटा सिमुलेटेड हैं; जल, ऊर्जा और लागत मॉडल से निकले हैं। FPO के लिए सदस्यता डैशबोर्ड का मसौदा मॉडल दर्शाता है।'
                : 'All farm data is simulated; water, energy and cost come from the model. This screens the subscription-dashboard tier of the business model.'}
            </Callout>
          </div>
        </>
      )}
    </div>
  );
}
