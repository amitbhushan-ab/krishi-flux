import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from '@/components/Layout';

const Landing = lazy(() => import('@/pages/Landing'));
const Login = lazy(() => import('@/pages/Login'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Simulator = lazy(() => import('@/pages/Simulator'));
const Optimizer = lazy(() => import('@/pages/Optimizer'));
const Weather = lazy(() => import('@/pages/Weather'));
const Solar = lazy(() => import('@/pages/Solar'));
const CropHealth = lazy(() => import('@/pages/CropHealth'));
const ClimateRisk = lazy(() => import('@/pages/ClimateRisk'));
const Saarthi = lazy(() => import('@/pages/Saarthi'));
const Impact = lazy(() => import('@/pages/Impact'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const Fpo = lazy(() => import('@/pages/Fpo'));
const Settings = lazy(() => import('@/pages/Settings'));
const NotFound = lazy(() => import('@/pages/NotFound'));

function RouteFallback() {
  return (
    <div className="grid min-h-[50vh] place-items-center">
      <div className="flex flex-col items-center gap-3">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-soil-200 border-t-leaf-600" />
        <p className="text-sm text-soil-500">Loading…</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/simulator" element={<Simulator />} />
          <Route path="/optimizer" element={<Optimizer />} />
          <Route path="/weather" element={<Weather />} />
          <Route path="/solar" element={<Solar />} />
          <Route path="/crop-health" element={<CropHealth />} />
          <Route path="/climate-risk" element={<ClimateRisk />} />
          <Route path="/saarthi" element={<Saarthi />} />
          <Route path="/impact" element={<Impact />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/fpo" element={<Fpo />} />
          <Route path="/settings" element={<Settings />} />
          {/* legacy aliases so no link 404s */}
          <Route path="/recommendation" element={<Navigate to="/dashboard" replace />} />
          <Route path="/farms" element={<Navigate to="/fpo" replace />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
