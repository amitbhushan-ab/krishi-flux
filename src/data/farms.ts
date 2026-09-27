import type { Farm, User } from '@/lib/types';

export const DEMO_USER: User = {
  id: 'u-001',
  name: 'Ramesh Patil',
  phone: '+91 98220 00000',
  email: 'ramesh@krishiflux.demo',
  role: 'farmer',
  language: 'en',
  createdAt: '2026-01-12T08:00:00.000Z',
};

/**
 * Deterministic demo farm — the exact scenario documented for judging so every
 * run reproduces the same starting state.
 *
 *   Green Valley Farm · 2 acres · Tomato · Flowering · Loamy
 *   Soil moisture 24% · Rain probability 18% · Solar availability 82%
 *
 * Coordinates are approximate farm locations; they are used only when the live
 * weather provider is enabled (Settings → Data source).
 */
export const GREEN_VALLEY: Farm = {
  id: 'farm-green-valley',
  ownerId: 'u-001',
  name: 'Green Valley Farm',
  village: 'Shirur',
  district: 'Pune',
  state: 'Maharashtra',
  areaAcres: 2,
  soilType: 'loamy',
  crop: 'tomato',
  cropStage: 'flowering',
  pumpType: 'solar_submersible',
  pumpPowerKw: 5,
  pumpEfficiency: 0.62,
  irrigationEfficiency: 0.82,
  farmerName: 'Ramesh Patil',
  phone: '+91 98220 00000',
  latitude: 18.83,
  longitude: 74.38,
};

/** Conventional demo conditions carried on the farm for the initial reading. */
export const GREEN_VALLEY_CONDITIONS = {
  soilMoisture: 24,
  temperature: 31,
  humidity: 62,
  rainProbability: 18,
  rainfallForecast: 6,
  solarAvailability: 0.82,
};

/** FPO fleet for the cooperative dashboard. */
export const FPO_FARMS: Farm[] = [
  GREEN_VALLEY,
  {
    id: 'farm-002',
    ownerId: 'u-002',
    name: 'Krishna Agro Plot',
    village: 'Baramati',
    district: 'Pune',
    state: 'Maharashtra',
    areaAcres: 3.5,
    soilType: 'black',
    crop: 'cotton',
    cropStage: 'vegetative',
    pumpType: 'solar_submersible',
    pumpPowerKw: 7.5,
    pumpEfficiency: 0.6,
    irrigationEfficiency: 0.75,
    farmerName: 'Sunita Deshmukh',
    phone: '+91 98220 11111',
    latitude: 18.15,
    longitude: 74.58,
  },
  {
    id: 'farm-003',
    ownerId: 'u-003',
    name: 'Sai Wheat Fields',
    village: 'Indapur',
    district: 'Pune',
    state: 'Maharashtra',
    areaAcres: 1.5,
    soilType: 'silt',
    crop: 'wheat',
    cropStage: 'development',
    pumpType: 'grid_submersible',
    pumpPowerKw: 3,
    pumpEfficiency: 0.58,
    irrigationEfficiency: 0.7,
    farmerName: 'Vijay Shinde',
    phone: '+91 98220 22222',
    latitude: 18.11,
    longitude: 75.03,
  },
  {
    id: 'farm-004',
    ownerId: 'u-004',
    name: 'Godavari Paddy Block',
    village: 'Shrirampur',
    district: 'Ahilyanagar',
    state: 'Maharashtra',
    areaAcres: 5,
    soilType: 'clay',
    crop: 'rice',
    cropStage: 'development',
    pumpType: 'diesel',
    pumpPowerKw: 5.5,
    pumpEfficiency: 0.5,
    irrigationEfficiency: 0.65,
    farmerName: 'Anil Jadhav',
    phone: '+91 98220 33333',
    latitude: 19.62,
    longitude: 74.66,
  },
  {
    id: 'farm-005',
    ownerId: 'u-005',
    name: 'Sahyadri Sugarcane',
    village: 'Koregaon',
    district: 'Satara',
    state: 'Maharashtra',
    areaAcres: 4,
    soilType: 'black',
    crop: 'sugarcane',
    cropStage: 'flowering',
    pumpType: 'solar_submersible',
    pumpPowerKw: 7.5,
    pumpEfficiency: 0.62,
    irrigationEfficiency: 0.78,
    farmerName: 'Meena Kulkarni',
    phone: '+91 98220 44444',
    latitude: 17.56,
    longitude: 74.03,
  },
  {
    id: 'farm-006',
    ownerId: 'u-006',
    name: 'Marathwada Onion Plot',
    village: 'Gangapur',
    district: 'Chhatrapati Sambhajinagar',
    state: 'Maharashtra',
    areaAcres: 2.5,
    soilType: 'red',
    crop: 'onion',
    cropStage: 'vegetative',
    pumpType: 'grid_submersible',
    pumpPowerKw: 4,
    pumpEfficiency: 0.57,
    irrigationEfficiency: 0.72,
    farmerName: 'Ganesh Pawar',
    phone: '+91 98220 55555',
    latitude: 19.7,
    longitude: 75.02,
  },
];

/**
 * Per-farm synthetic sensor snapshot. Deterministic offsets keep the FPO table
 * stable across reloads while still showing variety.
 */
export const FPO_CONDITIONS: Record<
  string,
  { soilMoisture: number; temperature: number; humidity: number; rainProbability: number; rainfallForecast: number; solarAvailability: number }
> = {
  'farm-green-valley': GREEN_VALLEY_CONDITIONS,
  'farm-002': { soilMoisture: 21, temperature: 34, humidity: 48, rainProbability: 12, rainfallForecast: 4, solarAvailability: 0.88 },
  'farm-003': { soilMoisture: 19, temperature: 29, humidity: 55, rainProbability: 30, rainfallForecast: 8, solarAvailability: 0.71 },
  'farm-004': { soilMoisture: 31, temperature: 32, humidity: 74, rainProbability: 68, rainfallForecast: 22, solarAvailability: 0.44 },
  'farm-005': { soilMoisture: 23, temperature: 36, humidity: 45, rainProbability: 8, rainfallForecast: 2, solarAvailability: 0.9 },
  'farm-006': { soilMoisture: 14, temperature: 38, humidity: 32, rainProbability: 5, rainfallForecast: 1, solarAvailability: 0.92 },
};
