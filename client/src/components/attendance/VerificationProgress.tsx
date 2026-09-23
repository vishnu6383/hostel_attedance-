import React from 'react';
import { Check } from 'lucide-react';

interface VerificationProgressProps {
  currentStep: number;
}

const STEPS = [
  'Session Window',
  'Hostel Geofence',
  'Register Number',
  'Face Verification',
  'Random Gesture',
  'Attendance Result',
];

export const VerificationProgress: React.FC<VerificationProgressProps> = ({ currentStep }) => {
  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg">
      <div className="flex justify-between items-center relative">
        {/* Background track line */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-800 -z-0 rounded-full" />
        {/* Active progress line */}
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-sky-500 transition-all duration-500 rounded-full -z-0"
          style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
        />

        {STEPS.map((label, index) => {
          const stepNum = index + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;

          return (
            <div key={label} className="flex flex-col items-center z-10">
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  isCompleted
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                    : isCurrent
                    ? 'bg-sky-500 text-white ring-4 ring-sky-500/20 shadow-md shadow-sky-500/30'
                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                }`}
              >
                {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : stepNum}
              </div>
              <span
                className={`text-[10px] sm:text-xs mt-1.5 font-medium hidden xs:block text-center max-w-[65px] ${
                  isCurrent ? 'text-sky-400 font-semibold' : isCompleted ? 'text-emerald-400' : 'text-slate-500'
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
