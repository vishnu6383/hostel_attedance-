import { FilesetResolver, FaceLandmarker, HandLandmarker } from '@mediapipe/tasks-vision';

export interface AnalysisFrameResult {
  faceDetected: boolean;
  multipleFaces: boolean;
  faceCount: number;
  motionDetected: boolean;
  progressPercent: number;
  landmarks?: number[];
  detectedGesture?: string;
  confidence: number;
  message: string;
}

export class VisionService {
  private static faceLandmarker: FaceLandmarker | null = null;
  private static handLandmarker: HandLandmarker | null = null;
  private static isInitializing = false;
  private static initPromise: Promise<boolean> | null = null;

  // Strict monotonically increasing timestamps for MediaPipe Tasks Vision
  private static lastFaceTimestamp = 0;
  private static lastHandTimestamp = 0;

  // Liveness state trackers
  private static blinkState: 'OPEN' | 'CLOSED_1' | 'OPEN_1' | 'CLOSED_2' | 'COMPLETED' = 'OPEN';
  private static turnBaselineCaptured = false;
  private static turnBaselineYaw = 0.5;
  private static nodBaselinePitch = 0.45;
  private static mouthBaselineMAR = 0.15;
  private static smileBaselineRatio = 0.40;

  /**
   * Initializes MediaPipe Tasks Vision (FaceLandmarker & HandLandmarker)
   */
  public static async initMediaPipe(): Promise<boolean> {
    if (this.faceLandmarker && this.handLandmarker) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        this.isInitializing = true;
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numFaces: 2,
        });

        this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
        });

        console.log('✅ MediaPipe Face & Hand Landmarker initialized successfully.');
        this.isInitializing = false;
        return true;
      } catch (err) {
        console.warn('⚠️ MediaPipe CDN initialization fallback active:', err);
        this.isInitializing = false;
        return false;
      }
    })();

    return this.initPromise;
  }

  /**
   * Extract 3D facial geometric landmark descriptor vector from video element
   */
  public static extractLandmarks(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement
  ): {
    faceDetected: boolean;
    multipleFaces: boolean;
    faceCount: number;
    landmarks: number[];
    score: number;
    centroidX: number;
    centroidY: number;
    extendedFingers: number;
    ear: number;
    mar: number;
    mouthWidthRatio: number;
    yaw: number;
    pitch: number;
    rawLandmarks: any[];
  } {
    const ctx = canvas.getContext('2d');
    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
      return {
        faceDetected: false,
        multipleFaces: false,
        faceCount: 0,
        landmarks: [],
        score: 0,
        centroidX: 0.5,
        centroidY: 0.5,
        extendedFingers: 0,
        ear: 0.28,
        mar: 0.1,
        mouthWidthRatio: 0.4,
        yaw: 0.5,
        pitch: 0.5,
        rawLandmarks: [],
      };
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    let rawLandmarks: any[] = [];
    let faceCount = 0;

    // Try MediaPipe detection first with monotonic timestamp guarantee
    if (this.faceLandmarker) {
      try {
        let timestamp = performance.now();
        if (timestamp <= this.lastFaceTimestamp) {
          timestamp = this.lastFaceTimestamp + 1;
        }
        this.lastFaceTimestamp = timestamp;

        const results = this.faceLandmarker.detectForVideo(video, timestamp);
        if (results && results.faceLandmarks) {
          faceCount = results.faceLandmarks.length;
          if (faceCount > 0) {
            rawLandmarks = results.faceLandmarks[0];
          }
        }
      } catch (e) {
        // Fallback below if error
      }
    }

    // MediaPipe Hand Detection with monotonic timestamp guarantee
    let extendedFingers = 0;
    if (this.handLandmarker) {
      try {
        let timestamp = performance.now();
        if (timestamp <= this.lastHandTimestamp) {
          timestamp = this.lastHandTimestamp + 1;
        }
        this.lastHandTimestamp = timestamp;

        const handResults = this.handLandmarker.detectForVideo(video, timestamp);
        if (handResults && handResults.landmarks && handResults.landmarks.length > 0) {
          const hand = handResults.landmarks[0];
          // Check extended fingers (Index=8, Middle=12, Ring=16, Pinky=20)
          if (hand[8].y < hand[6].y) extendedFingers++;
          if (hand[12].y < hand[10].y) extendedFingers++;
          if (hand[16].y < hand[14].y) extendedFingers++;
          if (hand[20].y < hand[18].y) extendedFingers++;
        }
      } catch (e) {}
    }

    // Fallback skin pixel localization if MediaPipe not yet returned landmarks
    if (rawLandmarks.length === 0) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const w = canvas.width;
      const h = canvas.height;

      let facePixels = 0, weightedX = 0, weightedY = 0;
      for (let y = 0; y < h; y += 4) {
        for (let x = 0; x < w; x += 4) {
          const idx = (y * w + x) * 4;
          const r = data[idx], g = data[idx + 1], b = data[idx + 2];
          if (r > 60 && g > 40 && b > 20 && r - g > 15 && r > b) {
            facePixels++;
            weightedX += x;
            weightedY += y;
          }
        }
      }

      const faceDetected = facePixels > 250;
      const centroidX = facePixels > 0 ? weightedX / (facePixels * w) : 0.5;
      const centroidY = facePixels > 0 ? weightedY / (facePixels * h) : 0.5;

      // Generate normalized 64-D grid landmark vector
      const fallbackVector = this.generateFallbackGridVector(data, w, h);

      return {
        faceDetected,
        multipleFaces: false,
        faceCount: faceDetected ? 1 : 0,
        landmarks: fallbackVector,
        score: faceDetected ? 0.90 : 0.2,
        centroidX,
        centroidY,
        extendedFingers,
        ear: 0.28,
        mar: 0.12,
        mouthWidthRatio: 0.40,
        yaw: centroidX,
        pitch: centroidY,
        rawLandmarks: [],
      };
    }

    // MediaPipe Landmarks processing
    const multipleFaces = faceCount > 1;

    // Calculate Eye Aspect Ratio (EAR)
    // Left eye: 33 (outer), 133 (inner), 160 (top1), 144 (bottom1), 158 (top2), 153 (bottom2)
    // Right eye: 362 (inner), 263 (outer), 385 (top1), 380 (bottom1), 387 (top2), 373 (bottom2)
    const earLeft = (this.dist(rawLandmarks[160], rawLandmarks[144]) + this.dist(rawLandmarks[158], rawLandmarks[153])) /
      (2 * this.dist(rawLandmarks[33], rawLandmarks[133]) || 1e-6);
    const earRight = (this.dist(rawLandmarks[385], rawLandmarks[380]) + this.dist(rawLandmarks[387], rawLandmarks[373])) /
      (2 * this.dist(rawLandmarks[362], rawLandmarks[263]) || 1e-6);
    const ear = (earLeft + earRight) / 2;

    // Calculate Mouth Aspect Ratio (MAR)
    // Upper lip: 13, Lower lip: 14, Left corner: 61, Right corner: 291
    const mar = this.dist(rawLandmarks[13], rawLandmarks[14]) / (this.dist(rawLandmarks[61], rawLandmarks[291]) || 1e-6);

    // Calculate Mouth Width Ratio relative to cheek distance (for smile detection)
    const mouthWidthRatio = this.dist(rawLandmarks[61], rawLandmarks[291]) / (this.dist(rawLandmarks[234], rawLandmarks[454]) || 1e-6);

    // Calculate Yaw (Head Rotation Left/Right)
    // Nose tip: 4, Anatomical Right cheek: 234, Anatomical Left cheek: 454
    const rightCheekX = rawLandmarks[234].x;
    const leftCheekX = rawLandmarks[454].x;
    const noseX = rawLandmarks[4].x;
    const yaw = (noseX - rightCheekX) / (leftCheekX - rightCheekX || 1e-6);

    // Calculate Pitch (Head Rotation Up/Down)
    // Eye midpoint: between 133 & 362, Nose: 4, Chin: 152
    const eyeMidY = (rawLandmarks[133].y + rawLandmarks[362].y) / 2;
    const chinY = rawLandmarks[152].y;
    const noseY = rawLandmarks[4].y;
    const pitch = (noseY - eyeMidY) / (chinY - eyeMidY || 1e-6);

    const centroidX = rawLandmarks[4].x;
    const centroidY = rawLandmarks[4].y;

    // Build 64D normalized 3D landmark geometric embedding vector
    const landmarks = this.buildGeometricEmbedding(rawLandmarks);

    return {
      faceDetected: faceCount > 0,
      multipleFaces,
      faceCount,
      landmarks,
      score: 0.98,
      centroidX,
      centroidY,
      extendedFingers,
      ear,
      mar,
      mouthWidthRatio,
      yaw,
      pitch,
      rawLandmarks,
    };
  }

  /**
   * Extract facial landmark embedding vector from uploaded image (base64)
   */
  public static async extractLandmarksFromImage(
    dataUrl: string
  ): Promise<{ faceDetected: boolean; landmarks: number[]; score: number }> {
    await this.initMediaPipe();
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width || 400;
        canvas.height = img.height || 400;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ faceDetected: false, landmarks: [], score: 0 });
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        let rawLandmarks: any[] = [];
        if (this.faceLandmarker) {
          try {
            let timestamp = performance.now();
            if (timestamp <= this.lastFaceTimestamp) {
              timestamp = this.lastFaceTimestamp + 1;
            }
            this.lastFaceTimestamp = timestamp;

            const results = this.faceLandmarker.detectForVideo(canvas, timestamp);
            if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
              rawLandmarks = results.faceLandmarks[0];
            }
          } catch (e) {
            console.warn('⚠️ MediaPipe static image detection fallback:', e);
          }
        }

        if (rawLandmarks.length > 0) {
          const landmarks = this.buildGeometricEmbedding(rawLandmarks);
          resolve({ faceDetected: true, landmarks, score: 0.98 });
          return;
        }

        // Fallback image landmark extraction
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const fallbackVector = this.generateFallbackGridVector(imageData.data, canvas.width, canvas.height);
        resolve({ faceDetected: true, landmarks: fallbackVector, score: 0.85 });
      };
      img.onerror = () => {
        resolve({ faceDetected: false, landmarks: [], score: 0 });
      };
      img.src = dataUrl;
    });
  }

  /**
   * Reset frame memory & baseline state
   */
  public static resetFrameMemory() {
    this.blinkState = 'OPEN';
    this.turnBaselineCaptured = false;
    this.turnBaselineYaw = 0.5;
    this.nodBaselinePitch = 0.45;
    this.mouthBaselineMAR = 0.15;
    this.smileBaselineRatio = 0.40;
  }

  /**
   * Evaluates live gesture challenge against continuous video stream.
   */
  public static analyzeGestureFrame(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    challengeId: string,
    stateCounter: { current: number }
  ): AnalysisFrameResult {
    const data = this.extractLandmarks(video, canvas);

    if (!data.faceDetected) {
      return {
        faceDetected: false,
        multipleFaces: false,
        faceCount: 0,
        motionDetected: false,
        progressPercent: 0,
        confidence: 0,
        message: 'No face detected in frame. Position your face inside the camera guide.',
      };
    }

    if (data.multipleFaces) {
      return {
        faceDetected: true,
        multipleFaces: true,
        faceCount: data.faceCount,
        motionDetected: false,
        progressPercent: 0,
        confidence: 0,
        message: 'Multiple faces detected! Only one person should be visible in the camera.',
      };
    }

    // Capture initial baseline ONLY when rawLandmarks are valid
    if (!this.turnBaselineCaptured && data.rawLandmarks.length > 0) {
      this.turnBaselineYaw = data.yaw;
      this.nodBaselinePitch = data.pitch;
      this.mouthBaselineMAR = data.mar;
      this.smileBaselineRatio = data.mouthWidthRatio;
      this.turnBaselineCaptured = true;
    }

    let isCorrectGesture = false;
    let gestureFeedback = '';

    switch (challengeId) {
      case 'BLINK_TWICE':
        // State machine: OPEN -> CLOSED_1 -> OPEN_1 -> CLOSED_2 -> COMPLETED
        if (data.ear < 0.20) {
          if (this.blinkState === 'OPEN') this.blinkState = 'CLOSED_1';
          else if (this.blinkState === 'OPEN_1') this.blinkState = 'CLOSED_2';
        } else if (data.ear > 0.23) {
          if (this.blinkState === 'CLOSED_1') this.blinkState = 'OPEN_1';
          else if (this.blinkState === 'CLOSED_2') this.blinkState = 'COMPLETED';
        }

        isCorrectGesture = this.blinkState === 'COMPLETED' || this.blinkState === 'CLOSED_2' || this.blinkState === 'OPEN_1';
        if (this.blinkState === 'COMPLETED') {
          gestureFeedback = 'Blink Twice Verified!';
        } else if (this.blinkState === 'OPEN_1' || this.blinkState === 'CLOSED_2') {
          gestureFeedback = 'First blink detected! Blink once more.';
        } else {
          gestureFeedback = 'Blink your eyes twice clearly.';
        }
        break;

      case 'TURN_LEFT':
        // Turning to user's LEFT causes yaw (nose towards left shoulder / image right) to INCREASE
        const yawShiftLeft = data.yaw - this.turnBaselineYaw;
        isCorrectGesture = yawShiftLeft > 0.08 || data.yaw > 0.58;
        gestureFeedback = isCorrectGesture ? 'Turn Left Detected!' : 'Rotate head to your LEFT.';
        break;

      case 'TURN_RIGHT':
        // Turning to user's RIGHT causes yaw (nose towards right shoulder / image left) to DECREASE
        const yawShiftRight = this.turnBaselineYaw - data.yaw;
        isCorrectGesture = yawShiftRight > 0.08 || data.yaw < 0.42;
        gestureFeedback = isCorrectGesture ? 'Turn Right Detected!' : 'Rotate head to your RIGHT.';
        break;

      case 'NOD':
        // Nodding changes head pitch relative to baseline
        const pitchShift = Math.abs(data.pitch - this.nodBaselinePitch);
        isCorrectGesture = pitchShift > 0.06 || data.pitch > 0.54 || data.pitch < 0.38;
        gestureFeedback = isCorrectGesture ? 'Head Nod Detected!' : 'Nod your head up and down.';
        break;

      case 'OPEN_MOUTH':
        const mouthOpenDelta = data.mar - this.mouthBaselineMAR;
        isCorrectGesture = data.mar > 0.25 || mouthOpenDelta > 0.12;
        gestureFeedback = isCorrectGesture ? 'Mouth Open Detected!' : 'Open your mouth clearly.';
        break;

      case 'SMILE':
        // Smile widens mouth corners and expands MAR
        const smileDelta = data.mar - this.mouthBaselineMAR;
        const smileWidthDelta = data.mouthWidthRatio - this.smileBaselineRatio;
        isCorrectGesture = data.mar > 0.20 || smileDelta > 0.08 || smileWidthDelta > 0.06 || data.mouthWidthRatio > 0.46;
        gestureFeedback = isCorrectGesture ? 'Smile Detected!' : 'Smile broadly at the camera.';
        break;

      case 'SHOW_ONE_FINGER':
        isCorrectGesture = data.extendedFingers === 1;
        gestureFeedback = isCorrectGesture ? '1 Finger Detected!' : `Show 1 index finger up (Detected: ${data.extendedFingers}).`;
        break;

      case 'SHOW_TWO_FINGERS':
        isCorrectGesture = data.extendedFingers === 2;
        gestureFeedback = isCorrectGesture ? '2 Fingers (Peace Sign) Detected!' : `Show 2 fingers ✌️ (Detected: ${data.extendedFingers}).`;
        break;

      default:
        isCorrectGesture = true;
        gestureFeedback = 'Performing requested gesture...';
        break;
    }

    const REQUIRED_FRAMES = challengeId === 'BLINK_TWICE' ? 15 : 25;

    if (this.blinkState === 'COMPLETED') {
      stateCounter.current = REQUIRED_FRAMES;
    } else if (isCorrectGesture) {
      stateCounter.current += 1;
    } else {
      stateCounter.current = Math.max(0, stateCounter.current - 1);
    }

    const progressPercent = Math.min(100, Math.round((stateCounter.current / REQUIRED_FRAMES) * 100));

    let detectedGesture = 'IN_PROGRESS';
    let confidence = 0.5;

    if (stateCounter.current >= REQUIRED_FRAMES || this.blinkState === 'COMPLETED') {
      detectedGesture = challengeId;
      confidence = 0.95;
    } else if (!isCorrectGesture) {
      detectedGesture = 'WRONG_GESTURE';
      confidence = 0.2;
    }

    return {
      faceDetected: true,
      multipleFaces: false,
      faceCount: 1,
      motionDetected: isCorrectGesture,
      progressPercent,
      landmarks: data.landmarks,
      detectedGesture,
      confidence,
      message: `${gestureFeedback} (${progressPercent}%)`,
    };
  }

  /**
   * Distance between two 2D/3D landmark points
   */
  private static dist(p1: any, p2: any): number {
    if (!p1 || !p2) return 0;
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = (p1.z || 0) - (p2.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Builds normalized 64-dimensional geometric landmark descriptor
   */
  private static buildGeometricEmbedding(landmarks: any[]): number[] {
    // Key landmark indices:
    // Nose tip: 4, Chin: 152, Forehead: 10
    // Left eye center: 468/33, Right eye center: 473/263
    // Left cheek: 234, Right cheek: 454
    // Mouth corners: 61, 291
    const refPt = landmarks[4];
    const interOcular = this.dist(landmarks[33], landmarks[263]) || 1.0;

    const indices = [
      4, 152, 10, 33, 133, 263, 362, 61, 291, 13, 14, 234, 454, 160, 144, 385, 380,
      1, 2, 5, 6, 19, 94, 168, 197, 68, 298
    ];

    const vec: number[] = [];
    for (const idx of indices) {
      const pt = landmarks[idx] || refPt;
      const dx = (pt.x - refPt.x) / interOcular;
      const dy = (pt.y - refPt.y) / interOcular;
      vec.push(Math.round(dx * 1000) / 1000);
      vec.push(Math.round(dy * 1000) / 1000);
    }

    // Add inter-feature distance ratios
    vec.push(Math.round((this.dist(landmarks[4], landmarks[152]) / interOcular) * 1000) / 1000);
    vec.push(Math.round((this.dist(landmarks[61], landmarks[291]) / interOcular) * 1000) / 1000);

    // Pad to exactly 64 elements
    while (vec.length < 64) {
      vec.push(0);
    }

    return vec.slice(0, 64);
  }

  /**
   * Fallback grid landmark extraction
   */
  private static generateFallbackGridVector(data: Uint8ClampedArray, w: number, h: number): number[] {
    const gridCols = 8;
    const gridRows = 8;
    const cellW = Math.max(1, Math.floor(w / gridCols));
    const cellH = Math.max(1, Math.floor(h / gridRows));

    const landmarks: number[] = [];
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        let cellSum = 0, count = 0;
        for (let y = r * cellH; y < (r + 1) * cellH; y += 4) {
          for (let x = c * cellW; x < (c + 1) * cellW; x += 4) {
            if (x >= w || y >= h) continue;
            const idx = (y * w + x) * 4;
            const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            cellSum += lum;
            count++;
          }
        }
        const avg = count > 0 ? cellSum / count : 0;
        landmarks.push(Math.round(avg * 100) / 100);
      }
    }
    return landmarks;
  }
}
