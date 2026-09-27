/**
 * Shared input validation for the KrishiFlux decision engine.
 *
 * One canonical validator used by BOTH the browser service layer
 * (src/api/client.ts) and the Express backend (server/index.ts), so the
 * browser and server always reject exactly the same malformed inputs with the
 * same 400 messages.
 */

import type { IrrigationInputs } from '@/lib/types';

export function validateInputs(input: IrrigationInputs): void {
  const problems: string[] = [];
  if (!(input.soilMoisture >= 0 && input.soilMoisture <= 60)) problems.push('soil moisture must be 0–60%');
  if (!(input.temperature >= -5 && input.temperature <= 55)) problems.push('temperature must be −5–55°C');
  if (!(input.humidity >= 0 && input.humidity <= 100)) problems.push('humidity must be 0–100%');
  if (!(input.rainProbability >= 0 && input.rainProbability <= 100)) problems.push('rain probability must be 0–100%');
  if (!(input.rainfallForecast >= 0 && input.rainfallForecast <= 400)) problems.push('rainfall forecast must be 0–400 mm');
  if (!(input.areaAcres > 0 && input.areaAcres <= 100)) problems.push('area must be 0–100 acres');
  if (!(input.pumpPowerKw > 0 && input.pumpPowerKw <= 100)) problems.push('pump power must be 0–100 kW');
  if (!(input.irrigationEfficiency >= 0.3 && input.irrigationEfficiency <= 1)) problems.push('irrigation efficiency must be 30–100%');
  if (!(input.pumpEfficiency >= 0.2 && input.pumpEfficiency <= 1)) problems.push('pump efficiency must be 20–100%');
  if (!(input.solarAvailability >= 0 && input.solarAvailability <= 1)) problems.push('solar availability must be 0–1');
  if (!(input.energyPricePerKwh >= 0 && input.energyPricePerKwh <= 50)) problems.push('energy tariff must be 0–50 INR/kWh');

  if (problems.length) {
    throw Object.assign(new Error(`Invalid farm values: ${problems.join(', ')}.`), { statusCode: 400 });
  }
}
