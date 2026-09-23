import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, ShieldCheck, XCircle, Home, RotateCcw } from 'lucide-react';
import { api } from '../../services/api';
import { AttendanceRecord, Student } from '../../types';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface AttendanceResultStepProps {
  sessionId: string;
  student: Student;
  registerNumber: string;
  location: { lat: number; lon: number; accuracy: number };
  liveImageBase64?: string;
  faceLandmarks?: number[];
  liveness: { challengeId: string; completedAction: string; confidence: number; timedOut?: boolean };
  onReset: () => void;
}

export const AttendanceResultStep: React.FC<AttendanceResultStepProps> = ({
  sessionId,
  student,
  registerNumber,
  location,
  liveImageBase64,
  faceLandmarks,
  liveness,
  onReset,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<AttendanceRecord | null>(null);

  const submitAttendance = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/attendance/complete', {
        sessionId,
        registerNumber,
        location,
        liveImageBase64,
        faceLandmarks,
        liveness,
      });

      if (res.data.success && res.data.status === 'PRESENT') {
        setRecord(res.data.attendance);
        setLoading(false);

        // Fire celebratory confetti!
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#38bdf8', '#6366f1'],
        });
      } else {
        setError(res.data.message || 'Attendance verification failed.');
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit attendance verification to server.');
      setLoading(false);
    }
  };

  useEffect(() => {
    submitAttendance();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Submitting biometric & geolocation verification to server..." />;
  }

  if (error) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-5 shadow-xl">
        <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto text-rose-400">
          <XCircle className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-slate-100">Verification Rejected</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">{error}</p>
        </div>
        <button
          onClick={onReset}
          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 px-6 rounded-2xl text-sm transition-colors border border-slate-700 flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Start Verification Over</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl text-center">
      <div className="w-20 h-20 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-500/20">
        <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
      </div>

      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-bold uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          Status: PRESENT
        </div>
        <h2 className="text-2xl font-extrabold text-white mt-2">Attendance Marked!</h2>
        <p className="text-xs text-slate-400">Your presence has been securely verified and logged.</p>
      </div>

      {/* Verified Details Card */}
      <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-left space-y-2.5 text-xs text-slate-300">
        <div className="flex justify-between border-b border-slate-800/80 pb-2">
          <span className="text-slate-500">Student Name:</span>
          <span className="font-semibold text-white">{student.name}</span>
        </div>
        <div className="flex justify-between border-b border-slate-800/80 pb-2">
          <span className="text-slate-500">Register Number:</span>
          <span className="font-semibold text-sky-400">{registerNumber}</span>
        </div>
        <div className="flex justify-between border-b border-slate-800/80 pb-2">
          <span className="text-slate-500">Hostel Block & Room:</span>
          <span className="font-semibold text-white">{student.hostelBlock} - Room {student.roomNumber}</span>
        </div>
        <div className="flex justify-between border-b border-slate-800/80 pb-2">
          <span className="text-slate-500">Geofence Status:</span>
          <span className="font-semibold text-emerald-400">WITHIN GEOFENCE ✓</span>
        </div>
        <div className="flex justify-between border-b border-slate-800/80 pb-2">
          <span className="text-slate-500">Face Verification:</span>
          <span className="font-semibold text-emerald-400">VERIFIED ✓</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Timestamp:</span>
          <span className="font-semibold text-slate-300">
            {record?.timestamp ? new Date(record.timestamp).toLocaleTimeString('en-IN') : 'Just now'}
          </span>
        </div>
      </div>

      <button
        onClick={onReset}
        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3.5 px-6 rounded-2xl text-sm transition-colors border border-slate-700 flex items-center justify-center gap-2"
      >
        <Home className="w-4 h-4" />
        <span>Return to Home</span>
      </button>
    </div>
  );
};
