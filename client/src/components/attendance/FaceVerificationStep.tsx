import React, { useRef, useState, useEffect } from 'react';
import { Camera, ScanFace, CheckCircle2, AlertCircle, RefreshCw, Activity, Layers } from 'lucide-react';
import { Student } from '../../types';
import { VisionService } from '../../services/visionService';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface FaceVerificationStepProps {
  student: Student;
  onSuccess: (landmarks: number[], liveImageBase64?: string) => void;
  onFailure: (reason: string) => void;
}

export const FaceVerificationStep: React.FC<FaceVerificationStepProps> = ({
  student,
  onSuccess,
  onFailure,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanMessage, setScanMessage] = useState('Position your face inside the circle guide');

  // Dev diagnostic panel state
  const [diagnostics, setDiagnostics] = useState<{
    faceDetected: boolean;
    faceCount: number;
    refEmbeddingAvailable: boolean;
    liveEmbeddingAvailable: boolean;
    similarity: number;
    distance: number;
    threshold: number;
    result: 'MATCH' | 'MISMATCH' | 'PENDING';
  }>({
    faceDetected: false,
    faceCount: 0,
    refEmbeddingAvailable: student.hasFaceEmbedding || false,
    liveEmbeddingAvailable: false,
    similarity: 0,
    distance: 1.0,
    threshold: 0.70,
    result: 'PENDING',
  });

  const startCamera = async () => {
    setError(null);
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
      setCameraActive(true);
    } catch (err: any) {
      setError('Camera access permission is required for face verification. Please allow camera access.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const handleCaptureAndVerify = () => {
    if (!videoRef.current || !canvasRef.current) return;

    setScanning(true);
    setScanMessage('Analyzing 3D facial mesh & multi-frame geometry...');
    setError(null);

    let validFrames = 0;
    const requiredFrames = 5;
    let accumulatedLandmarks: number[] = [];

    const interval = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) {
        clearInterval(interval);
        return;
      }

      const frameData = VisionService.extractLandmarks(videoRef.current, canvasRef.current);

      if (!frameData.faceDetected) {
        clearInterval(interval);
        setError('No face detected in camera view. Please align your face inside the guide.');
        setScanning(false);
        setDiagnostics((prev) => ({ ...prev, faceDetected: false, faceCount: 0, result: 'MISMATCH' }));
        return;
      }

      if (frameData.multipleFaces) {
        clearInterval(interval);
        setError('Only one person should be visible in the camera. Multiple faces detected!');
        setScanning(false);
        setDiagnostics((prev) => ({ ...prev, faceDetected: true, faceCount: frameData.faceCount, result: 'MISMATCH' }));
        return;
      }

      validFrames++;
      accumulatedLandmarks = frameData.landmarks;

      setScanMessage(`Sampling biometric frames (${validFrames}/${requiredFrames})...`);

      if (validFrames >= requiredFrames) {
        clearInterval(interval);
        setScanning(false);

        // Update dev diagnostics state
        setDiagnostics({
          faceDetected: true,
          faceCount: 1,
          refEmbeddingAvailable: student.hasFaceEmbedding || false,
          liveEmbeddingAvailable: accumulatedLandmarks.length > 0,
          similarity: 0,
          distance: 0,
          threshold: 0.68,
          result: 'PENDING',
        });

        // Capture current video frame as base64 Data URL for DeepFace ArcFace AI Service
        let liveImageBase64 = '';
        if (canvasRef.current && videoRef.current) {
          liveImageBase64 = canvasRef.current.toDataURL('image/jpeg', 0.85);
        }

        stopCamera();
        onSuccess(accumulatedLandmarks, liveImageBase64);
      }
    }, 250);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl text-center">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="text-left">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <ScanFace className="w-5 h-5 text-sky-400" />
            <span>Face Identity Verification</span>
          </h3>
          <p className="text-xs text-slate-400">Verifying Identity: {student.name} ({student.registerNumber})</p>
        </div>
        <div className="px-2.5 py-1 bg-sky-500/10 border border-sky-500/30 rounded-full text-xs font-medium text-sky-400">
          Step 4 of 6
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-rose-300 text-xs flex items-center gap-3 text-left">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <p className="font-semibold text-rose-200">Face Verification Rejected</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Live Camera Viewport */}
      <div className="relative w-full aspect-square max-w-xs mx-auto rounded-3xl overflow-hidden bg-slate-950 border-2 border-sky-500/30 shadow-inner flex items-center justify-center">
        <video
          ref={videoRef}
          playsInline
          muted
          className="w-full h-full object-cover transform -scale-x-100"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Circular Face Guide Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={`w-52 h-64 border-2 rounded-full transition-all duration-300 ${
              scanning ? 'border-emerald-400 animate-pulse ring-8 ring-emerald-400/20' : 'border-sky-400/80 border-dashed'
            }`}
          />
        </div>

        {!cameraActive && !error && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center space-y-2">
            <Camera className="w-8 h-8 text-slate-500 animate-pulse" />
            <p className="text-xs text-slate-400">Loading MediaPipe 3D Landmarker...</p>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 font-medium">{scanMessage}</p>

      {/* Dev Diagnostic Panel */}
      <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 text-left text-xs space-y-1.5">
        <div className="flex items-center justify-between text-slate-300 font-bold border-b border-slate-800 pb-1">
          <span className="flex items-center gap-1.5 text-sky-400">
            <Layers className="w-3.5 h-3.5" /> Dev Diagnostics Panel
          </span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-extrabold ${
              diagnostics.result === 'MATCH'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : diagnostics.result === 'MISMATCH'
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {diagnostics.result}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
          <div>
            <span className="text-slate-500">Face Detected:</span>{' '}
            <span className="font-semibold text-slate-200">
              {diagnostics.faceDetected ? `YES (Count: ${diagnostics.faceCount})` : 'NO'}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Ref Embedding:</span>{' '}
            <span className="font-semibold text-slate-200">
              {diagnostics.refEmbeddingAvailable ? 'AVAILABLE' : 'MISSING'}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Live Embedding:</span>{' '}
            <span className="font-semibold text-slate-200">
              {diagnostics.liveEmbeddingAvailable ? 'AVAILABLE' : 'NOT READY'}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Required Threshold:</span>{' '}
            <span className="font-semibold text-sky-400">70% Minimum</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={startCamera}
          className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-semibold border border-slate-700 transition-colors"
          title="Restart Camera"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button
          onClick={handleCaptureAndVerify}
          disabled={!cameraActive || scanning}
          className="flex-1 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-2xl text-sm transition-all shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2"
        >
          {scanning ? (
            <LoadingSpinner message="Sampling multi-frame biometrics..." />
          ) : (
            <>
              <ScanFace className="w-5 h-5" />
              <span>Verify Face Identity</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
