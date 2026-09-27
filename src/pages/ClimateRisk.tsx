import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertOctagon, ArrowRight, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useApp } from '@/state/AppContext';
import { assessClimateRisks } from '@/engine/risk';
import { pick } from '@/i18n';
import { Badge, Callout, Card, SectionHeading, StatCard } from '@/components/ui';

const SEVERITY_TONE = {
  high: 'danger',
  moderate: 'solar',
  low: 'leaf',
} as const;

export default function ClimateRisk() {
  const { inputs, forecast, language, recommendation } = useApp();
  const hi = language === 'hi';
  const [resilience, setResilience] = useState(true);

  const risks = useMemo(() => assessClimateRisks(inputs, forecast), [inputs, forecast]);
  const high = risks.filter((r) => r.severity === 'high').length;
  const moderate = risks.filter((r) => r.severity === 'moderate').length;
  const elevated = high + moderate;

  return (
    <div>
      <SectionHeading
        eyebrow={hi ? 'जलवायु लचीलापन' : 'Climate resilience'}
        title={hi ? 'जोखिम' : 'Climate Risk'}
        description={
          hi
            ? 'हर जोखिम तीन चरणों में दिखता है: जोखिम → प्रभाव → अनुशंसित कार्य।'
            : 'Every risk follows the same three-step structure: RISK → IMPACT → RECOMMENDED ACTION.'
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={hi ? 'कुल जोखिम' : 'Risks monitored'} value={risks.length} tone="soil" icon={<ShieldAlert size={15} />} />
        <StatCard label={hi ? 'सक्रिय (उच्च/मध्यम)' : 'Elevated'} value={elevated} hint={elevated === 0 ? (hi ? 'स्थिति सामान्य' : 'conditions normal') : (hi ? 'समीक्षा आवश्यक' : 'review advised')} tone={elevated > 3 ? 'danger' : elevated > 0 ? 'solar' : 'leaf'} icon={<ShieldAlert size={15} />} />
        <StatCard label={hi ? 'उच्च' : 'High severity'} value={high} tone="danger" icon={<AlertOctagon size={15} />} />
        <StatCard
          label={hi ? 'मध्यम' : 'Moderate'}
          value={moderate}
          hint={recommendation?.required ? `${hi ? 'विंडो' : 'window'} ${recommendation.recommendedTime}` : (hi ? 'कोई सिंचाई नहीं' : 'no irrigation')}
          tone="solar"
          icon={<ShieldCheck size={15} />}
        />
      </div>

      {/* Resilience mode */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-leaf-200 bg-leaf-50 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-leaf-800">
            {hi ? 'जलवायु लचीलापन मोड' : 'Climate resilience mode'}
          </p>
          <p className="text-sm text-soil-600">
            {hi
              ? 'चालू रहने पर सिफारिशें जोखिम को देखते हुए अधिक सतर्क रुख अपनाती हैं (सूखा दौर में अधिक निगरानी, भारी वर्षा में सिंचाई टालना)।'
              : 'When on, recommendations adopt a more cautious stance — more monitoring during dry spells, delayed irrigation ahead of heavy rain.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setResilience((v) => !v)}
          className={`kf-btn ${resilience ? 'bg-leaf-600 text-white hover:bg-leaf-700' : 'bg-white text-soil-700 border border-soil-200'}`}
          aria-pressed={resilience}
        >
          {resilience ? (hi ? 'चालू' : 'On') : hi ? 'बंद' : 'Off'}
        </button>
      </div>

      <div className="space-y-4">
        {risks.length === 0 && (
          <Card title={hi ? 'कोई सक्रिय जोखिम नहीं' : 'No active risks'}>
            <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-leaf-300 bg-leaf-50 p-6 text-center">
              <div>
                <ShieldCheck className="mx-auto text-leaf-600" size={28} />
                <p className="mt-3 text-sm text-soil-700">
                  {hi
                    ? 'इस अगले हफ्ते में कोई महत्वपूर्ण जोखिम का संकेत नहीं है। सामान्य निगरानी जारी रखें।'
                    : 'Nothing material is flagged for the coming week. Continue routine monitoring.'}
                </p>
              </div>
            </div>
          </Card>
        )}

        {risks.map((risk) => (
          <Card
            key={risk.id}
            title={
              <span className="flex items-center gap-2">
                <Badge tone={SEVERITY_TONE[risk.severity]}>{risk.severity}</Badge>
                {pick(risk.title, language)}
              </span>
            }
            subtitle={risk.metric}
          >
            <div className="grid gap-4 lg:grid-cols-[auto_1fr_auto_1fr_auto_1fr] lg:items-stretch">
              <Step label={hi ? 'जोखिम' : 'RISK'} body={pick(risk.title, language)} muted />
              <Arrow className="hidden lg:flex" />
              <Step label={hi ? 'प्रभाव' : 'IMPACT'} body={pick(risk.impact, language)} />
              <Arrow className="hidden lg:flex" />
              <Step label={hi ? 'अनुशंसित कार्य' : 'RECOMMENDED ACTION'} body={pick(risk.action, language)} action />
            </div>

            {resilience && risk.severity === 'high' && (
              <div className="mt-4 rounded-xl border border-leaf-200 bg-leaf-50 p-4 text-sm text-soil-700">
                <span className="font-semibold text-leaf-800">{hi ? 'लचीलापन टिप' : 'Resilience note'}: </span>
                {recommendation?.required
                  ? hi
                    ? `अगला पंप विंडो ${recommendation.recommendedTime} पर है — मौसम बदलने पर दोबारा जांचें।`
                    : `The next pump window is ${recommendation.recommendedTime} — re-check if conditions change.`
                  : hi
                    ? 'पंप न चलाएं और अगले मौसम अपडेट की प्रतीक्षा करें।'
                    : 'Do not run the pump; wait for the next forecast update.'}
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Callout tone="sky" title={hi ? 'जोखिम कैसे आकलित होता है' : 'How risk is assessed'}>
          <ul className="mt-1 list-inside list-disc space-y-1 text-sm">
            <li>{hi ? 'सूखा दौर: लगातार कम बारिश संभावना वाले दिन' : 'Dry spell: consecutive days with low rain probability'}</li>
            <li>{hi ? 'गर्मी: 38°C या अधिक वाले दिन' : 'Heat: days at or above 38°C'}</li>
            <li>{hi ? 'भारी वर्षा: ≥20 मिमी या ≥75% संभावना' : 'Heavy rain: ≥20 mm or ≥75% probability'}</li>
            <li>{hi ? 'असामान्य वर्षा: पूर्वानुमान में उच्च मानक विचलन' : 'Abnormal rainfall: high standard deviation across the forecast'}</li>
            <li>{hi ? 'कम नमी: 40% से नीचे उपलब्ध जल' : 'Low moisture: available water below 40%'}</li>
          </ul>
        </Callout>
        <Callout tone="solar" title="Prototype simulation — field validation required.">
          {hi
            ? 'ये संकेत सिमुलेटेड पूर्वानुमान से निकाले गए हैं, प्रामाणिक मौसम सेवा से नहीं।'
            : 'These signals are derived from the simulated forecast, not an authoritative weather service.'}
        </Callout>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link to="/optimizer" className="kf-btn-primary">
          {hi ? 'ऑप्टिमाइज़र से जोखिम कम करें' : 'Reduce risk in the optimizer'}
        </Link>
        <Link to="/weather" className="kf-btn-secondary">
          {hi ? 'मौसम देखें' : 'Open weather intelligence'}
        </Link>
      </div>
    </div>
  );
}

function Step({ label, body, muted, action }: { label: string; body: string; muted?: boolean; action?: boolean }) {
  return (
    <div className={`rounded-xl p-4 ${muted ? 'bg-soil-100/70' : action ? 'bg-leaf-50 ring-1 ring-leaf-200' : 'bg-white ring-1 ring-soil-200'}`}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-soil-500">{label}</p>
      <p className="mt-1.5 text-sm text-soil-700">{body}</p>
    </div>
  );
}

function Arrow({ className = '' }: { className?: string }) {
  return (
    <span className={`items-center justify-center ${className}`}>
      <ArrowRight size={16} className="text-soil-300" />
    </span>
  );
}
