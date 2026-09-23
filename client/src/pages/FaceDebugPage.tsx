import React, { useState } from 'react';
import axios from 'axios';
import { ShieldCheck, ShieldAlert, Upload, Cpu, CheckCircle, XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TestFaceResult {
  verified: boolean;
  distance: number;
  threshold: number;
  similarity: number;
  model: string;
  detector: string;
  metric: string;
  reference_hash: string;
  test_hash: string;
  is_identical_image: boolean;
  face_count_ref: number;
  face_count_test: number;
  message: string;
}

export const FaceDebugPage: React.FC = () => {
  const [refImage, setRefImage] = useState<string | null>(null);
  const [testImage, setTestImage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<TestFaceResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'ref' | 'test') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      if (type === 'ref') {
        setRefImage(base64);
      } else {
        setTestImage(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const runTest = async () => {
    if (!refImage || !testImage) {
      setError('Please upload or select both Reference Image and Test Image.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post('/api/test-face', {
        referenceImageBase64: refImage,
        testImageBase64: testImage,
      });

      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to execute face test');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <Link to="/" className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 transition">
              <ArrowLeft className="w-5 h-5 text-slate-300" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Cpu className="w-6 h-6 text-indigo-400" />
                AI Face Verification Debugger
              </h1>
              <p className="text-xs text-slate-400">
                Isolated ArcFace + RetinaFace control test & MD5 hash integrity validator
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full text-xs font-mono">
            Model: ArcFace (Cosine ≤ 0.68)
          </span>
        </div>

        {/* Upload Panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Reference Image Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              1. Enrolled Reference Image (Student Photo)
            </h2>
            <div className="border-2 border-dashed border-slate-800 rounded-2xl h-64 flex flex-col items-center justify-center relative overflow-hidden bg-slate-950/50">
              {refImage ? (
                <img src={refImage} alt="Reference" className="h-full w-full object-contain p-2" />
              ) : (
                <div className="text-center p-4">
                  <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Click or drop Reference photo</p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'ref')}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Test Image Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              2. Test Frame (Live Camera Capture)
            </h2>
            <div className="border-2 border-dashed border-slate-800 rounded-2xl h-64 flex flex-col items-center justify-center relative overflow-hidden bg-slate-950/50">
              {testImage ? (
                <img src={testImage} alt="Test frame" className="h-full w-full object-contain p-2" />
              ) : (
                <div className="text-center p-4">
                  <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Click or drop Test photo</p>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'test')}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="text-center">
          <button
            onClick={runTest}
            disabled={loading || !refImage || !testImage}
            className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-2xl shadow-lg transition flex items-center gap-2 mx-auto"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Executing DeepFace AI Verification...
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                Run Isolated Face Match Test
              </>
            )}
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-rose-950/60 border border-rose-800 rounded-2xl text-rose-300 text-sm flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Results Panel */}
        {result && (
          <div className={`p-6 rounded-3xl border ${result.verified ? 'bg-emerald-950/40 border-emerald-800' : 'bg-rose-950/40 border-rose-800'} space-y-6`}>
            {/* Status Banner */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {result.verified ? (
                  <CheckCircle className="w-10 h-10 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-10 h-10 text-rose-400 shrink-0" />
                )}
                <div>
                  <h3 className={`text-xl font-bold ${result.verified ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {result.verified ? 'VERIFIED — IDENTITY MATCH CONFIRMED' : 'REJECTED — IDENTITY MISMATCH'}
                  </h3>
                  <p className="text-xs text-slate-300">{result.message}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-2xl font-mono font-bold ${result.verified ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {result.verified ? 'MATCH (PASS)' : 'IMPOSTER (FAIL)'}
                </span>
              </div>
            </div>

            {/* Diagnostic Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-800 font-mono text-xs">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <p className="text-slate-400">Cosine Distance</p>
                <p className={`text-lg font-bold ${result.distance <= result.threshold ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {result.distance}
                </p>
                <p className="text-[10px] text-slate-500">Lower = More Similar</p>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <p className="text-slate-400">Threshold</p>
                <p className="text-lg font-bold text-indigo-300">{result.threshold}</p>
                <p className="text-[10px] text-slate-500">ArcFace Standard</p>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <p className="text-slate-400">Similarity Score</p>
                <p className="text-lg font-bold text-slate-200">{(result.similarity * 100).toFixed(1)}%</p>
                <p className="text-[10px] text-slate-500">Scaled (0 to 1)</p>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <p className="text-slate-400">Image Hash Status</p>
                <p className={`text-sm font-bold ${result.is_identical_image ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {result.is_identical_image ? 'IDENTICAL FILES' : 'DIFFERENT FILES'}
                </p>
                <p className="text-[10px] text-slate-500">MD5 Hash match check</p>
              </div>
            </div>

            {/* Detailed Metadata Table */}
            <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">AI Model & Detector:</span>
                <span className="text-slate-200">{result.model} + {result.detector}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Reference Image MD5:</span>
                <span className="text-slate-300">{result.reference_hash}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Test Image MD5:</span>
                <span className="text-slate-300">{result.test_hash}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Faces Detected (Ref / Test):</span>
                <span className="text-slate-300">{result.face_count_ref} / {result.face_count_test}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FaceDebugPage;
