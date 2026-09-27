import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="max-w-md text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-leaf-600 text-white">
          <Compass size={22} />
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-soil-900">This page does not exist</h1>
        <p className="mt-2 text-sm text-soil-600">
          The route you requested is not part of KrishiFlux. Use one of the links below to get back to a working screen.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/dashboard" className="kf-btn-primary">
            Farm dashboard
          </Link>
          <Link to="/simulator" className="kf-btn-secondary">
            Farm simulator
          </Link>
          <Link to="/" className="kf-btn-ghost">
            Landing page
          </Link>
        </div>
      </div>
    </div>
  );
}
