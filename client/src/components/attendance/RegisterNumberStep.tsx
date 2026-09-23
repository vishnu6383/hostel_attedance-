import React, { useState } from 'react';
import { UserCheck, ArrowRight, AlertCircle, Building2, User } from 'lucide-react';
import { api } from '../../services/api';
import { Student } from '../../types';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface RegisterNumberStepProps {
  sessionId: string;
  onSuccess: (studentData: Student, registerNumber: string) => void;
}

export const RegisterNumberStep: React.FC<RegisterNumberStepProps> = ({ sessionId, onSuccess }) => {
  const [registerNumber, setRegisterNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerNumber.trim()) {
      setError('Please enter your Register Number.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/attendance/verify-student', {
        registerNumber: registerNumber.trim(),
        sessionId,
      });

      if (res.data.success && res.data.student) {
        setLoading(false);
        onSuccess(res.data.student, registerNumber.trim().toUpperCase());
      } else {
        setError(res.data.message || 'Invalid Register Number.');
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid Register Number. Student record not found.');
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl text-center">
      <div className="w-16 h-16 bg-sky-500/10 border border-sky-500/30 rounded-2xl flex items-center justify-center mx-auto text-sky-400">
        <UserCheck className="w-8 h-8" />
      </div>

      <div className="space-y-1">
        <h3 className="text-2xl font-bold text-slate-100">Enter Register Number</h3>
        <p className="text-sm text-slate-400">
          Provide your official college register number (e.g. 23ADS001)
        </p>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-rose-300 text-xs flex items-center gap-3 text-left">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <p className="font-semibold text-rose-200">Validation Error</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
            <User className="w-5 h-5" />
          </div>
          <input
            type="text"
            value={registerNumber}
            onChange={(e) => {
              setRegisterNumber(e.target.value.toUpperCase());
              setError(null);
            }}
            placeholder="e.g. 23ADS001"
            className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-2xl py-3.5 pl-11 pr-4 text-white text-base uppercase tracking-wider font-semibold placeholder:text-slate-600 outline-none transition-all"
            autoFocus
          />
        </div>

        <button
          type="submit"
          disabled={loading || !registerNumber.trim()}
          className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-2xl text-sm transition-all shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2"
        >
          {loading ? (
            <LoadingSpinner message="Verifying Student Record..." />
          ) : (
            <>
              <span>Verify Register Number</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
