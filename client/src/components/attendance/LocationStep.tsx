import React, { useState } from 'react';
import { MapPin, Navigation, AlertTriangle, CheckCircle2, ShieldCheck, Activity } from 'lucide-react';
import { api } from '../../services/api';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface LocationStepProps {
  sessionId: string;
  onSuccess: (locationData: { lat: number; lon: number; accuracy: number }) => void;
}

export const LocationStep: React.FC<LocationStepProps> = ({ sessionId, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [diagnostics, setDiagnostics] = useState<{
    studentLat?: number;
    studentLon?: number;
    hostelLat?: number;
    hostelLon?: number;
    accuracy?: number;
    distanceMeters?: number;
    allowedRadius?: number;
    status?: string;
  } | null>(null);

  const verifyLocation = () => {
    setLoading(true);
    setError(null);
    setDiagnostics(null);

    if (!navigator.geolocation) {
      setError('Geolocation API is not supported by your browser.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        try {
          const res = await api.post('/attendance/location', {
            sessionId,
            latitude,
            longitude,
            accuracy,
            testMode,
          });

          const data = res.data;
          setDiagnostics({
            studentLat: data.studentLat || latitude,
            studentLon: data.studentLon || longitude,
            hostelLat: data.hostelLat,
            hostelLon: data.hostelLon,
            accuracy: data.accuracy || accuracy,
            distanceMeters: data.distanceMeters,
            allowedRadius: data.allowedRadius,
            status: data.status,
          });

          if (data.isWithin) {
            setLoading(false);
            onSuccess({ lat: latitude, lon: longitude, accuracy });
          } else {
            let errMsg = data.message || 'Location verification failed.';
            if (data.status === 'LOW_GPS_ACCURACY') {
              errMsg = 'GPS accuracy is too low. Please enable precise location and try again.';
            }
            setError(errMsg);
            setLoading(false);
          }
        } catch (err: any) {
          setError(err.response?.data?.message || 'Location verification failed. Please try again.');
          setLoading(false);
        }
      },
      (geoErr) => {
        let msg = 'Location permission is required to mark attendance.';
        if (geoErr.code === geoErr.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow GPS location access in your browser settings.';
        } else if (geoErr.code === geoErr.POSITION_UNAVAILABLE) {
          msg = 'Location information is unavailable. Please turn on your device GPS.';
        } else if (geoErr.code === geoErr.TIMEOUT) {
          msg = 'Location request timed out. Please try again.';
        }
        setError(msg);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl text-center">
      <div className="relative w-20 h-20 mx-auto">
        <div className="absolute inset-0 bg-sky-500/20 rounded-full radar-pulse" />
        <div className="w-20 h-20 bg-sky-500/10 border border-sky-500/30 rounded-full flex items-center justify-center text-sky-400 relative z-10 mx-auto">
          <MapPin className="w-9 h-9" />
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="text-2xl font-bold text-slate-100">Hostel Geofence Check</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Verifying your physical GPS position against the fixed hostel boundary.
        </p>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-rose-300 space-y-1.5 text-left">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-rose-200">Location Check Failed</p>
              <p className="text-xs text-rose-300/90 mt-0.5 leading-relaxed">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Geolocation Diagnostic Information Panel */}
      {diagnostics && (
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left space-y-2 text-xs text-slate-300">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-sky-400 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5" /> GPS Diagnostics
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                diagnostics.status === 'WITHIN_GEOFENCE'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}
            >
              {diagnostics.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-500">Student Lat/Lon:</span>
              <p className="font-mono text-slate-300 font-medium">
                {diagnostics.studentLat?.toFixed(6)}, {diagnostics.studentLon?.toFixed(6)}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Hostel Lat/Lon:</span>
              <p className="font-mono text-slate-300 font-medium">
                {diagnostics.hostelLat?.toFixed(6)}, {diagnostics.hostelLon?.toFixed(6)}
              </p>
            </div>
            <div>
              <span className="text-slate-500">GPS Accuracy:</span>
              <p className="font-semibold text-amber-400">±{Math.round(diagnostics.accuracy || 0)} meters</p>
            </div>
            <div>
              <span className="text-slate-500">Distance / Allowed:</span>
              <p className="font-semibold text-sky-400">
                {diagnostics.distanceMeters}m / {diagnostics.allowedRadius}m max
              </p>
            </div>
          </div>
        </div>
      )}

      {!diagnostics && (
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-slate-400 space-y-1 text-left">
          <div className="flex items-center justify-between text-slate-300 font-semibold">
            <span>Fixed Hostel Location:</span>
            <span className="text-sky-400">Backend Server Enforced</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Coordinates and distance calculation run strictly on the backend using Haversine algorithm.
          </p>
        </div>
      )}

      {/* Dev mode simulation toggle */}
      <div className="flex items-center justify-center gap-2 pt-1 text-xs text-slate-500">
        <input
          type="checkbox"
          id="testModeCheck"
          checked={testMode}
          onChange={(e) => setTestMode(e.target.checked)}
          className="rounded border-slate-700 text-sky-500 focus:ring-sky-500 bg-slate-950"
        />
        <label htmlFor="testModeCheck" className="cursor-pointer hover:text-slate-400">
          Dev Mode: Allow test location simulation
        </label>
      </div>

      <button
        onClick={verifyLocation}
        disabled={loading}
        className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-2xl text-sm transition-all shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2"
      >
        {loading ? (
          <LoadingSpinner message="Querying GPS high-accuracy coordinates..." />
        ) : (
          <>
            <Navigation className="w-5 h-5" />
            <span>Verify Location</span>
          </>
        )}
      </button>
    </div>
  );
};
