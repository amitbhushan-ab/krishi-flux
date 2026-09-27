/**
 * Pure, isomorphic pieces of the service layer — no browser or Node APIs.
 *
 * Imported by BOTH src/api/client.ts (browser) and server/index.ts (Express),
 * so the farm → engine-input mapping is defined exactly once.
 */

import type { Farm, IrrigationInputs } from '@/lib/types';

export interface FarmConditions {
  soilMoisture: number;
  temperature: number;
  humidity: number;
  rainProbability: number;
  rainfallForecast: number;
  solarAvailability: number;
}

export function inputsFromFarm(farm: Farm, cond: FarmConditions): IrrigationInputs {
  return {
    soilMoisture: cond.soilMoisture,
    temperature: cond.temperature,
    humidity: cond.humidity,
    rainProbability: cond.rainProbability,
    rainfallForecast: cond.rainfallForecast,
    cropType: farm.crop,
    cropStage: farm.cropStage,
    soilType: farm.soilType,
    areaAcres: farm.areaAcres,
    solarAvailability: cond.solarAvailability,
    pumpPowerKw: farm.pumpPowerKw,
    pumpEfficiency: farm.pumpEfficiency,
    irrigationEfficiency: farm.irrigationEfficiency,
    energyPricePerKwh: 7.5,
  };
}
