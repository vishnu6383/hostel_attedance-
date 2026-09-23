import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { api } from '../../services/api';
import { AttendanceSession } from '../../types';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface TimeCheckStepProps {
  onSuccess: (session: AttendanceSession) => void;
}

export const TimeCheckStep: React.FC<TimeCheckStepProps> = ({ onSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<AttendanceSession | null>(null);

  const checkAvailability = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/attendance/active-session');
      if (res.data.isActive && res.data.session) {
        setSession(res.data.session);
        setLoading(false);
      } else {
        setError(res.data.message || 'Attendance Closed — Today\'s attendance time is over.');
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to connect to server. Please try again.');
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAvailability();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Checking hostel attendance schedule..." />;
  }

  if (error) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-xl">
        <div className="w-16 h-16 bg-rose-500/10 rounded-2xl border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-slate-100">Attendance Closed</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">{error}</p>
        </div>
        <div className="pt-2">
          <button
            onClick={checkAvailability}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors border border-slate-700"
          >
            Re-check Schedule
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-6 shadow-xl">
      <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
        <Clock className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Attendance Window Active
        </div>
        <h3 className="text-2xl font-bold text-slate-100">{session?.sessionName || 'Evening Attendance'}</h3>
        <p className="text-sm text-slate-400">
          Active Time: <span className="font-semibold text-slate-200">{session?.startTime} - {session?.endTime}</span>
        </p>
      </div>

      <button
        onClick={() => session && onSuccess(session)}
        className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-3.5 px-6 rounded-2xl text-sm transition-all shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2"
      >
        <span>Proceed to Location Verification</span>
        <CheckCircle2 className="w-5 h-5" />
      </button>
    </div>
  );
};
