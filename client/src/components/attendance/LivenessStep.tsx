import React, { useRef, useState, useEffect } from 'react';
import { Sparkles, Timer, AlertCircle, RefreshCw, CheckCircle2, Video } from 'lucide-react';
import { api } from '../../services/api';
import { VisionService } from '../../services/visionService';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface LivenessStepProps {
  sessionId: string;
  registerNumber: string;
  onSuccess: (livenessData: {
    challengeId: string;
    completedAction: string;
    confidence: number;
    challengeNonce: string;
  }) => void;
  onFailure: (reason: string) => void;
}

export const LivenessStep: React.FC<LivenessStepProps> = ({
  sessionId,
  registerNumber,
  onSuccess,
  onFailure,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateCounterRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [challenge, setChallenge] = useState<{ id: string; instruction: string; description: string } | null>(null);
  const [challengeNonce, setChallengeNonce] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('Initializing gesture detection...');
  const [status, setStatus] = useState<'INITIALIZING' | 'ACTIVE' | 'PASSED' | 'FAILED' | 'TIMEOUT'>('INITIALIZING');
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch server verification session & random challenge with nonce
  const startLivenessSession = async () => {
    setStatus('INITIALIZING');
    setError(null);
    setProgressPercent(0);
    stateCounterRef.current = 0;
    VisionService.resetFrameMemory();

    try {
      const res = await api.post('/attendance/session/start', {
        sessionId,
        registerNumber,
      });

      if (res.data.success) {
        setChallenge(res.data.challenge);
        setChallengeNonce(res.data.challengeNonce || '');
        setTimeLeft(res.data.timeoutSeconds || 30);
        setStatus('ACTIVE');
        startCamera();
      } else {
        setError(res.data.message || 'Failed to start liveness verification session.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error creating server liveness session.');
    }
  };

  const startCamera = async () => {
    try {
      await VisionService.initMediaPipe();
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }
    } catch (err: any) {
      setError('Camera permission is required for liveness challenge verification.');
    }
  };

  const stopCamera = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    startLivenessSession();
    return () => {
      stopCamera();
    };
  }, []);

  // 30s Countdown timer
  useEffect(() => {
    if (status !== 'ACTIVE') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus('TIMEOUT');
          setError('Liveness verification challenge timed out (30s limit exceeded). Please try again.');
          stopCamera();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  // Real-time animation loop for MediaPipe frame analysis
  useEffect(() => {
    if (status !== 'ACTIVE' || !challenge) return;

    const processFrame = () => {
      if (videoRef.current && canvasRef.current && videoRef.current.readyState >= 2) {
        const result = VisionService.analyzeGestureFrame(
          videoRef.current,
          canvasRef.current,
          challenge.id,
          stateCounterRef
        );

        setProgressPercent(result.progressPercent);
        setFeedback(result.message);

        if (result.multipleFaces) {
          setError('Multiple faces detected! Only one person should be visible in camera.');
        }

        if (result.confidence >= 0.9 && result.detectedGesture === challenge.id) {
          setStatus('PASSED');
          stopCamera();
          onSuccess({
            challengeId: challenge.id,
            completedAction: challenge.id,
            confidence: result.confidence,
            challengeNonce,
          });
          return;
        }
      }
      animFrameIdRef.current = requestAnimationFrame(processFrame);
    };

    animFrameIdRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [status, challenge]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl text-center">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="text-left">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>Active Liveness Gesture Verification</span>
          </h3>
          <p className="text-xs text-slate-400">Perform the randomized challenge action to prove physical presence</p>
        </div>
        <div className="flex items-center gap-1 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs font-bold text-amber-400">
          <Timer className="w-3.5 h-3.5" />
          <span>{timeLeft}s</span>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-rose-300 text-xs flex items-center gap-3 text-left">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <p className="font-semibold text-rose-200">Liveness Verification Failed</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Challenge Instruction Card */}
      {challenge && (
        <div className="bg-gradient-to-r from-sky-950 via-slate-900 to-indigo-950 p-4 rounded-2xl border border-sky-500/30 space-y-1">
          <span className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider">Required Action</span>
          <h4 className="text-xl font-extrabold text-white">{challenge.instruction}</h4>
          <p className="text-xs text-slate-300">{challenge.description}</p>
        </div>
      )}

      {/* Camera Viewport & Motion Progress */}
      <div className="relative w-full aspect-square max-w-xs mx-auto rounded-3xl overflow-hidden bg-slate-950 border-2 border-slate-800 shadow-inner">
        <video
          ref={videoRef}
          playsInline
          muted
          className="w-full h-full object-cover transform -scale-x-100"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Real-time Progress Ring */}
        <div className="absolute inset-x-0 bottom-0 bg-slate-950/80 backdrop-blur-md p-3 border-t border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
            <span>Gesture Alignment</span>
            <span className="text-sky-400">{progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-sky-500 to-emerald-400 h-2 transition-all duration-150"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-[11px] text-amber-300/90 font-medium truncate">{feedback}</p>
        </div>
      </div>

      {(status === 'FAILED' || status === 'TIMEOUT' || error) && (
        <button
          onClick={startLivenessSession}
          className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-3.5 px-6 rounded-2xl text-sm transition-all shadow-lg flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Liveness Challenge</span>
        </button>
      )}
    </div>
  );
};
