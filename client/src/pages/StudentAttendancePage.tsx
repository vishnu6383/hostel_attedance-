import React, { useState } from 'react';
import { VerificationProgress } from '../components/attendance/VerificationProgress';
import { TimeCheckStep } from '../components/attendance/TimeCheckStep';
import { LocationStep } from '../components/attendance/LocationStep';
import { RegisterNumberStep } from '../components/attendance/RegisterNumberStep';
import { FaceVerificationStep } from '../components/attendance/FaceVerificationStep';
import { LivenessStep } from '../components/attendance/LivenessStep';
import { AttendanceResultStep } from '../components/attendance/AttendanceResultStep';
import { AttendanceSession, Student } from '../types';
import { Shield, Sparkles } from 'lucide-react';

export const StudentAttendancePage: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number; accuracy: number } | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [registerNumber, setRegisterNumber] = useState<string>('');
  const [faceLandmarks, setFaceLandmarks] = useState<number[] | undefined>(undefined);
  const [liveImageBase64, setLiveImageBase64] = useState<string | undefined>(undefined);
  const [liveness, setLiveness] = useState<{
    challengeId: string;
    completedAction: string;
    confidence: number;
    timedOut?: boolean;
  } | null>(null);

  const handleReset = () => {
    setStep(1);
    setSession(null);
    setLocation(null);
    setStudent(null);
    setRegisterNumber('');
    setFaceLandmarks(undefined);
    setLiveImageBase64(undefined);
    setLiveness(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between py-6 px-4">
      <div className="max-w-md mx-auto w-full space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-500/10 border border-sky-500/30 rounded-full text-xs font-semibold text-sky-400">
            <Shield className="w-3.5 h-3.5" />
            Smart Hostel Attendance System
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Biometric Verification</h1>
          <p className="text-xs text-slate-400">Hostel Geofence & Anti-Proxy Liveness System</p>
        </div>

        {/* Dynamic Guided Step Progress Bar */}
        <VerificationProgress currentStep={step} />

        {/* Step Views */}
        {step === 1 && (
          <TimeCheckStep
            onSuccess={(s) => {
              setSession(s);
              setStep(2);
            }}
          />
        )}

        {step === 2 && session && (
          <LocationStep
            sessionId={session._id}
            onSuccess={(loc) => {
              setLocation(loc);
              setStep(3);
            }}
          />
        )}

        {step === 3 && session && (
          <RegisterNumberStep
            sessionId={session._id}
            onSuccess={(stu, regNum) => {
              setStudent(stu);
              setRegisterNumber(regNum);
              setStep(4);
            }}
          />
        )}

        {step === 4 && student && (
          <FaceVerificationStep
            student={student}
            onSuccess={(landmarks, base64Frame) => {
              setFaceLandmarks(landmarks);
              setLiveImageBase64(base64Frame);
              setStep(5);
            }}
            onFailure={(reason) => {
              // Stay on current step or handle rejection
            }}
          />
        )}

        {step === 5 && session && (
          <LivenessStep
            sessionId={session._id}
            registerNumber={registerNumber}
            onSuccess={(livenessResult) => {
              setLiveness(livenessResult);
              setStep(6);
            }}
            onFailure={(reason) => {
              // Liveness failure stay or reset
            }}
          />
        )}

        {step === 6 && session && student && location && liveness && (
          <AttendanceResultStep
            sessionId={session._id}
            student={student}
            registerNumber={registerNumber}
            location={location}
            liveImageBase64={liveImageBase64}
            faceLandmarks={faceLandmarks}
            liveness={liveness}
            onReset={handleReset}
          />
        )}
      </div>

      <footer className="text-center text-[11px] text-slate-600 mt-8">
        &copy; {new Date().getFullYear()} College Hostel Management. All biometric data encrypted & secure.
      </footer>
    </div>
  );
};
