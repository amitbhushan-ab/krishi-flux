import { useRef, useState, type ChangeEvent } from 'react';
import { AlertTriangle, ImageIcon, Loader2, Upload } from 'lucide-react';
import { useApp } from '@/state/AppContext';
import { postCropHealth } from '@/api/client';
import { CROP_HEALTH_DISCLAIMER } from '@/engine/cropHealth';
import { pick } from '@/i18n';
import { Callout, Card, ProgressBar, SectionHeading, StatCard } from '@/components/ui';
import type { CropHealthResult } from '@/lib/types';

export default function CropHealth() {
  const { inputs, language, conditions, farm } = useApp();
  const hi = language === 'hi';
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<CropHealthResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setError(null);
    setResult(null);
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setError(hi ? 'कृपया एक छवि फ़ाइल चुनें (JPG/PNG/WEBP)।' : 'Please choose an image file (JPG/PNG/WEBP).');
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      setError(hi ? 'फ़ाइल 8 MB से बड़ी है।' : 'The file is larger than 8 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.onerror = () => setError(hi ? 'छवि पढ़ी नहीं जा सकी।' : 'Could not read the image file.');
    reader.readAsDataURL(f);
    setFile(f);
  }

  async function analyse() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const res = await postCropHealth(file.name, inputs);
      setResult(res);
    } catch {
      setError(hi ? 'विश्लेषण विफल रहा। पुनः प्रयास करें।' : 'Analysis failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <SectionHeading
        eyebrow={hi ? 'फसल स्वास्थ्य' : 'Crop health'}
        title={hi ? 'फसल स्वास्थ्य AI' : 'Crop Health AI'}
        description={
          hi
            ? 'स्पष्ट रूप से अलग किया गया सिमुलेटेड इनफ़रेंस परत — निदान नहीं, संभावित संकेत।'
            : 'A clearly separated simulated inference layer — a possible indication, never a diagnosis.'
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-5">
          <Card title={hi ? 'पत्ती की छवि अपलोड करें' : 'Upload a leaf image'}>
            <div
              className="grid min-h-56 place-items-center rounded-xl border-2 border-dashed border-soil-300 bg-soil-50 p-4 text-center"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) {
                  const dt = new DataTransfer();
                  dt.items.add(f);
                  if (inputRef.current) {
                    inputRef.current.files = dt.files;
                    onFile({ target: inputRef.current } as ChangeEvent<HTMLInputElement>);
                  }
                }
              }}
            >
              {preview ? (
                <img src={preview} alt="Uploaded leaf" className="max-h-64 rounded-lg object-contain" />
              ) : (
                <div>
                  <ImageIcon className="mx-auto text-soil-400" size={28} />
                  <p className="mt-2 text-sm text-soil-600">
                    {hi ? 'छवि यहाँ खींचें या चुनें' : 'Drag an image here, or choose a file'}
                  </p>
                </div>
              )}
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFile}
              aria-label="Choose leaf image"
            />

            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className="kf-btn-secondary" onClick={() => inputRef.current?.click()}>
                <Upload size={15} /> {hi ? 'छवि चुनें' : 'Choose image'}
              </button>
              <button type="button" className="kf-btn-primary" onClick={analyse} disabled={!file || busy}>
                {busy ? <Loader2 size={15} className="animate-spin" /> : null}
                {busy ? (hi ? 'विश्लेषण हो रहा है…' : 'Analysing…') : hi ? 'विश्लेषण करें' : 'Run analysis'}
              </button>
            </div>

            {file && (
              <p className="mt-3 break-all text-xs text-soil-500">
                {hi ? 'फ़ाइल' : 'File'}: {file.name} · {(file.size / 1024).toFixed(0)} KB
              </p>
            )}
            {error && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}
          </Card>

          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard label={hi ? 'मिट्टी नमी' : 'Soil moisture'} value={`${conditions.soilMoisture}%`} tone="sky" />
            <StatCard label={hi ? 'तापमान' : 'Temperature'} value={`${conditions.temperature}°C`} tone="solar" />
            <StatCard label={hi ? 'आर्द्रता' : 'Humidity'} value={`${conditions.humidity}%`} tone="sky" />
            <StatCard label={hi ? 'फसल अवस्था' : 'Crop stage'} value={farm.cropStage} tone="soil" />
          </div>
        </div>

        <div className="space-y-5">
          {result ? (
            <Card
              title={hi ? 'संभावित परिणाम' : 'Possible findings'}
              action={
                <span className="inline-flex items-center gap-1.5 rounded-full bg-solar-400/20 px-2.5 py-1 text-xs font-semibold text-solar-600">
                  <AlertTriangle size={13} /> {hi ? 'सिमुलेटेड इनफ़रेंस' : 'Simulated inference'}
                </span>
              }
            >
              <ul className="space-y-4">
                {result.findings.map((f) => (
                  <li key={f.id}>
                    <ProgressBar
                      label={pick(f.label, language)}
                      value={f.confidence * 100}
                      tone={f.id === 'no_stress' ? 'leaf' : 'solar'}
                      sublabel={pick(f.note, language)}
                    />
                  </li>
                ))}
              </ul>

              <div className="mt-5 space-y-3 rounded-xl border border-soil-200 bg-soil-50 p-4">
                <p className="text-sm font-semibold text-soil-800">
                  {hi ? 'महत्वपूर्ण' : 'Important'}
                </p>
                <p className="text-sm text-soil-600">{pick(result.disclaimer, language)}</p>
              </div>

              <div className="mt-4">
                <Callout tone="sky" title={hi ? 'यह कैसे काम करता है' : 'How this works'}>
                  {hi
                    ? 'इस प्रोटोटाइप में कोई प्रशिक्षित विज़न मॉडल नहीं है। यह परत खेत के जल-संतुलन और फ़ाइल नाम के निर्धारित हैश से संकेत बनाती है, इसलिए एक ही छवि हमेशा एक ही परिणाम देती है।'
                    : 'There is no trained vision model in this prototype. This layer derives its signal from the farm’s modelled water balance plus a deterministic hash of the file name, so the same image always yields the same demo result. To integrate a real model, swap `analyseImage` for a call to POST /api/crop-health — the return shape is already the contract.'}
                </Callout>
              </div>

              <p className="mt-3 text-xs text-soil-500">{pick(CROP_HEALTH_DISCLAIMER, language)}</p>
            </Card>
          ) : (
            <Card title={hi ? 'परिणाम यहाँ दिखेगा' : 'Results will appear here'}>
              <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-soil-200 p-6 text-center">
                <div>
                  <ImageIcon className="mx-auto text-soil-300" size={30} />
                  <p className="mt-3 text-sm text-soil-600">
                    {hi
                      ? 'कोई छवि अपलोड करें और "विश्लेषण करें" दबाएं।'
                      : 'Upload a leaf image and press “Run analysis”.'}
                  </p>
                  <p className="mt-1 text-xs text-soil-500">
                    {hi
                      ? 'संभावित जल तनाव · संभावित पोषक तनाव · संभावित पत्ती तनाव · कोई स्पष्ट तनाव नहीं'
                      : 'Possible water stress · possible nutrient stress · possible leaf stress · no obvious stress detected'}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
