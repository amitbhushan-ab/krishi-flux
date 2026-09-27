/**
 * KrishiFlux domain model.
 *
 * These types mirror the documented data model (User, Farm, Sensor, Weather,
 * CropProfile, IrrigationRecommendation, EnergyRecord, Savings) and the REST
 * contract exposed by the service layer in `src/api`.
 */

export type Language = 'en' | 'hi';

export type Role = 'farmer' | 'fpo' | 'admin';

export type SoilTypeId =
  | 'sandy'
  | 'loamy'
  | 'clay'
  | 'black'
  | 'red'
  | 'silt';

export type CropStageId =
  | 'germination'
  | 'vegetative'
  | 'flowering'
  | 'development'
  | 'maturity';

export type PumpTypeId = 'solar_submersible' | 'grid_submersible' | 'diesel';

export type ConnectivityState = 'online' | 'offline' | 'syncing';

export type SensorMode = 'normal' | 'dry' | 'wet' | 'offline';

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: Role;
  language: Language;
  createdAt: string;
}

export interface SensorReading {
  id: string;
  farmId: string;
  type: 'soil_moisture' | 'temperature' | 'humidity' | 'water_level' | 'pump_status';
  value: number;
  unit: string;
  status: 'ok' | 'offline';
  lastUpdated: string;
}

export interface WeatherRecord {
  id: string;
  farmId: string;
  timestamp: string;
  temperature: number;
  humidity: number;
  rainProbability: number;
  rainfall: number;
}

/** A single day of the forecast / synthetic weather series. */
export interface WeatherDay {
  date: string;
  dayOffset: number;
  temperature: number;
  tempMin: number;
  tempMax: number;
  humidity: number;
  rainProbability: number;
  /** Expected rainfall for the day, mm. */
  rainfall: number;
  /** Daily clear-sky solar fraction 0..1 (source of the solar model). */
  solarAvailability: number;
  isHeatwave: boolean;
}

export interface CropStageProfile {
  stage: CropStageId;
  /** FAO-style crop coefficient Kc for this stage. */
  kc: number;
  /** Management Allowed Depletion — fraction of available water that may be used. */
  mad: number;
  /** Root depth in metres at this stage. */
  rootDepth: number;
  /** Typical duration of the stage in days (used by the season simulator). */
  days: number;
  /** Relative sensitivity to water stress at this stage, 0..1. */
  waterStressSensitivity: number;
}

export interface CropProfile {
  crop: string;
  label: { en: string; hi: string };
  /** Total season length in days (sum of stage durations). */
  seasonDays: number;
  irrigatedBaselineFrequencyDays: number;
  stages: Record<CropStageId, CropStageProfile>;
}

export interface SoilProfile {
  id: SoilTypeId;
  label: { en: string; hi: string };
  /** Volumetric water content at field capacity (m3/m3). */
  fieldCapacity: number;
  /** Volumetric water content at permanent wilting point (m3/m3). */
  wiltingPoint: number;
  /** Infiltration / retention quality note used in explanations. */
  note: { en: string; hi: string };
}

export interface Farm {
  id: string;
  ownerId: string;
  name: string;
  village: string;
  district: string;
  state: string;
  /** Farm area in acres. */
  areaAcres: number;
  soilType: SoilTypeId;
  crop: string;
  cropStage: CropStageId;
  pumpType: PumpTypeId;
  /** Rated pump power in kW. */
  pumpPowerKw: number;
  /** Pump energy efficiency 0..1. */
  pumpEfficiency: number;
  /** Application efficiency of the irrigation system 0..1. */
  irrigationEfficiency: number;
  /** Farmer contact for the FPO dashboard. */
  farmerName: string;
  phone: string;
  /** Approximate coordinates for the live weather provider (optional). */
  latitude?: number;
  longitude?: number;
}

export interface IrrigationInputs {
  soilMoisture: number;
  temperature: number;
  humidity: number;
  rainProbability: number;
  /** Expected rainfall over the decision horizon, mm. */
  rainfallForecast: number;
  cropType: string;
  cropStage: CropStageId;
  soilType: SoilTypeId;
  areaAcres: number;
  /** Daily clear-sky-adjusted solar fraction 0..1. */
  solarAvailability: number;
  pumpPowerKw: number;
  pumpEfficiency: number;
  irrigationEfficiency: number;
  /** Energy tariff in INR per kWh. */
  energyPricePerKwh: number;
}

export type IrrigationStatus =
  | 'irrigate'
  | 'delay'
  | 'skip'
  | 'monitor';

export type SolarSuitability = 'excellent' | 'good' | 'moderate' | 'poor';

export interface WaterModelResult {
  /** Reference evapotranspiration, mm/day. */
  et0: number;
  /** Crop coefficient applied. */
  kc: number;
  /** Crop evapotranspiration, mm/day. */
  etc: number;
  /** Effective rainfall over the horizon, mm. */
  effectiveRainfall: number;
  /** Root-zone depletion below field capacity, mm. */
  deficitMm: number;
  /** Plant-available water capacity of the root zone, mm. */
  rootZoneCapacityMm: number;
  /** Fraction of available water currently present, 0..1. */
  availableFraction: number;
  /** Net irrigation depth required, mm. */
  netDepthMm: number;
  /** Gross irrigation depth after irrigation efficiency losses, mm. */
  grossDepthMm: number;
  /** Gross volume in litres. */
  volumeLitres: number;
  /** Gross volume in cubic metres. */
  volumeCubicMetres: number;
  assumptions: { label: string; value: string }[];
}

export interface EnergyModelResult {
  /** Litres per hour the pump can deliver at rated power. */
  dischargeLitresPerHour: number;
  /** Pump run time in hours. */
  durationHours: number;
  /** Hours/minutes for display. */
  durationMinutes: number;
  /** Total energy required by the pump, kWh. */
  energyRequiredKwh: number;
  /** Share of energy covered by solar in the chosen window, 0..1. */
  solarFraction: number;
  solarEnergyKwh: number;
  gridEnergyKwh: number;
  /** Effective energy drawing on the pump efficiency. */
  effectiveLoadKw: number;
}

export interface HourlySolar {
  hour: number;
  label: string;
  /** Solar fraction available at this hour, 0..1. */
  solarFraction: number;
  /** Modelled PV generation if a 1 kW array were installed, kWh. */
  generationKwh: number;
  /** Pump demand if the pump ran this hour, kWh. */
  pumpDemandKwh: number;
}

export interface PumpWindow {
  startHour: number;
  endHour: number;
  /** Human label, e.g. "12:30 PM - 1:18 PM". */
  label: string;
  dayOffset: number;
  reasonKey: SolarSchedulingReason;
  /** Weighted average solar fraction across the window, 0..1. */
  avgSolarFraction: number;
}

export type SolarSchedulingReason =
  | 'peak_solar'
  | 'cloud_shifted_morning'
  | 'partial_grid_support'
  | 'deferred_next_day'
  | 'daytime_insufficient';

export interface SolarPlan {
  /** Best window found for today. */
  todayWindow: PumpWindow;
  /** Best window for tomorrow (used when deferral is recommended). */
  tomorrowWindow: PumpWindow;
  /** The window the engine actually recommends. */
  recommendedWindow: PumpWindow;
  suitability: SolarSuitability;
  curve: HourlySolar[];
  /** True when pumping should be moved to the next day. */
  deferToNextDay: boolean;
  reason: SolarSchedulingReason;
  gridShareOfEnergy: number;
}

export interface RecommendationFactor {
  key: string;
  label: { en: string; hi: string };
  /** 0..100 for the bar visualisation. */
  value: number;
  direction: 'up' | 'down' | 'neutral';
  detail: { en: string; hi: string };
}

export interface Recommendation {
  farmId: string;
  timestamp: string;
  required: boolean;
  status: IrrigationStatus;
  /** Water required in litres (0 when no irrigation). */
  waterLitres: number;
  /** Water depth in mm, for agronomic transparency. */
  depthMm: number;
  durationMinutes: number;
  recommendedTime: string;
  solarSuitability: SolarSuitability;
  energyRequirementKwh: number;
  solarEnergyKwh: number;
  gridEnergyKwh: number;
  confidence: number;
  estimatedCostInr: number;
  estimatedWaterSavingLitres: number;
  estimatedEnergySavingKwh: number;
  estimatedCostSavingInr: number;
  reason: { en: string; hi: string };
  factors: RecommendationFactor[];
  water: WaterModelResult;
  energy: EnergyModelResult;
  solar: SolarPlan;
  modelNotes: { en: string; hi: string }[];
}

export interface ImpactResult {
  horizonDays: number;
  baseline: {
    waterLitres: number;
    energyKwh: number;
    costInr: number;
    irrigationEvents: number;
  };
  optimized: {
    waterLitres: number;
    energyKwh: number;
    costInr: number;
    irrigationEvents: number;
    solarEnergyKwh: number;
    gridEnergyKwh: number;
  };
  saved: {
    waterLitres: number;
    waterPercent: number;
    energyKwh: number;
    energyPercent: number;
    costInr: number;
    costPercent: number;
    irrigationEventsAvoided: number;
  };
  daily: {
    dayOffset: number;
    baselineWater: number;
    optimizedWater: number;
    baselineEnergy: number;
    optimizedEnergy: number;
  }[];
}

export interface ResourceScoreComponent {
  key: string;
  label: { en: string; hi: string };
  value: number;
  weight: number;
  explanation: { en: string; hi: string };
}

export interface ResourceScore {
  total: number;
  components: ResourceScoreComponent[];
  method: { en: string; hi: string };
}

export interface ClimateRisk {
  id: string;
  severity: 'low' | 'moderate' | 'high';
  title: { en: string; hi: string };
  impact: { en: string; hi: string };
  action: { en: string; hi: string };
  metric: string;
}

export interface CropHealthResult {
  id: string;
  timestamp: string;
  imageName: string;
  simulated: true;
  findings: {
    id: string;
    label: { en: string; hi: string };
    confidence: number;
    note: { en: string; hi: string };
  }[];
  disclaimer: { en: string; hi: string };
}
