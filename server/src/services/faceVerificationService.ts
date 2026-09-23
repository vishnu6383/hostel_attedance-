import crypto from 'crypto';
import { IStudent } from '../models/Student';
import { AIService } from './aiService';

export interface FaceVerificationResult {
  verified: boolean;
  score: number;
  threshold: number;
  distance: number;
  antiSpoofPassed: boolean;
  message: string;
}

export class FaceVerificationService {
  // DeepFace ArcFace match threshold (Cosine distance <= 0.68)
  private static readonly MATCH_THRESHOLD = 0.68;

  /**
   * Helper to compute MD5 hash of base64 string or image buffer
   */
  private static getImageHash(base64Str: string): string {
    const cleaned = base64Str.includes(',') ? base64Str.split(',')[1] : base64Str;
    return crypto.createHash('md5').update(cleaned).digest('hex');
  }

  /**
   * Performs facial identity verification and Anti-Spoof presentation attack check.
   * Enforces authoritative Python FastAPI DeepFace ArcFace AI Service verification.
   */
  public static async verifyFaceWithAIService(
    liveImageBase64: string | undefined,
    liveLandmarks: number[] | undefined,
    student: IStudent
  ): Promise<FaceVerificationResult> {
    const registeredEmbedding = student.faceEmbedding;
    const registeredPhoto = student.registeredFaceImage;

    const hasEmbedding = registeredEmbedding && registeredEmbedding.length > 0;
    const hasPhoto = registeredPhoto && registeredPhoto.trim().length > 0;

    if (!hasEmbedding && !hasPhoto) {
      return {
        verified: false,
        score: 0,
        distance: 1.0,
        threshold: this.MATCH_THRESHOLD,
        antiSpoofPassed: false,
        message: `REFERENCE_FACE_NOT_FOUND: Student (${student.name} - ${student.registerNumber}) has no registered profile photo in database. Attendance rejected.`,
      };
    }

    if (!liveImageBase64 || liveImageBase64.trim().length === 0) {
      return {
        verified: false,
        score: 0,
        distance: 1.0,
        threshold: this.MATCH_THRESHOLD,
        antiSpoofPassed: false,
        message: 'MISSING_LIVE_IMAGE: No live camera frame received for face verification.',
      };
    }

    // Image Hash Comparison Check to detect identical image submissions
    const liveHash = this.getImageHash(liveImageBase64);
    if (hasPhoto) {
      const refHash = this.getImageHash(registeredPhoto);
      console.log(`🔍 [DIAGNOSTICS] Expected Student: ${student.registerNumber} (${student.name})`);
      console.log(`   Reference Photo MD5: ${refHash}`);
      console.log(`   Live Frame MD5:      ${liveHash}`);
      if (refHash === liveHash) {
        console.warn('⚠️ WARNING: Live camera frame is IDENTICAL to registered database photo! Ensure camera live feed is active.');
      } else {
        console.log('✓ Confirmed: Live camera frame and registered photo are physically DIFFERENT images.');
      }
    }

    // 1. Invoke Python FastAPI AI Microservice (DeepFace + ArcFace + Anti-Spoof)
    if (await AIService.isHealthy()) {
      console.log('🤖 Invoking DeepFace ArcFace AI Service for student identity & anti-spoof verification...');
      
      // Perform Anti-Spoof presentation attack check
      const antiSpoofRes = await AIService.checkAntiSpoof(liveImageBase64);
      if (antiSpoofRes && !antiSpoofRes.is_real) {
        return {
          verified: false,
          score: 0.15,
          distance: 0.85,
          threshold: this.MATCH_THRESHOLD,
          antiSpoofPassed: false,
          message: antiSpoofRes.message || 'Presentation attack detected (photo screen or printed image)!',
        };
      }

      // Perform ArcFace facial identity verification against DB embedding or DB photo
      const embeddingsList = hasEmbedding ? [registeredEmbedding] : [];
      const verifyRes = await AIService.verifyFace(liveImageBase64, embeddingsList, registeredPhoto);

      if (verifyRes) {
        // If AI Service dynamically extracted embedding from student database photo, store it back in DB for future instant match
        if (verifyRes.extracted_reference_embedding && verifyRes.extracted_reference_embedding.length > 0) {
          try {
            student.faceEmbedding = verifyRes.extracted_reference_embedding;
            await student.save();
            console.log(`✅ Dynamically generated & cached 512-D ArcFace embedding for student: ${student.name}`);
          } catch (saveErr: any) {
            console.warn('⚠️ Could not cache student face embedding:', saveErr.message);
          }
        }

        console.log(`🎯 AI Verification Result -> Verified: ${verifyRes.verified}, Distance: ${verifyRes.distance}, Threshold: ${verifyRes.threshold}`);

        return {
          verified: verifyRes.verified,
          score: verifyRes.similarity,
          distance: verifyRes.distance,
          threshold: verifyRes.threshold,
          antiSpoofPassed: true,
          message: verifyRes.message,
        };
      }
    }

    // Secondary Fallback: If AI Service is temporarily offline or timing out, check MediaPipe 3D Mesh landmarks if provided
    if (liveLandmarks && liveLandmarks.length > 0 && hasEmbedding) {
      console.warn('⚠️ Python AI Microservice offline or timing out. Utilizing 3D MediaPipe Mesh Landmark fallback verification...');
      return this.verifyFace(liveLandmarks, student);
    }

    // FAIL CLOSED: If AI Service is unavailable and no landmarks available, reject verification
    return {
      verified: false,
      score: 0,
      distance: 1.0,
      threshold: this.MATCH_THRESHOLD,
      antiSpoofPassed: false,
      message: 'FACE_VERIFICATION_ERROR: AI Face Verification Microservice is offline or returned invalid response.',
    };
  }

  /**
   * Synchronous face verification fallback wrapper
   */
  public static verifyFace(
    liveLandmarks: number[] | undefined,
    student: IStudent
  ): FaceVerificationResult {
    const registeredEmbedding = student.faceEmbedding;

    if (!registeredEmbedding || registeredEmbedding.length === 0) {
      return {
        verified: false,
        score: 0,
        distance: 1.0,
        threshold: this.MATCH_THRESHOLD,
        antiSpoofPassed: false,
        message: `Student (${student.name} - ${student.registerNumber}) has no registered face profile photo in database.`,
      };
    }

    if (!liveLandmarks || liveLandmarks.length === 0) {
      return {
        verified: false,
        score: 0,
        distance: 1.0,
        threshold: this.MATCH_THRESHOLD,
        antiSpoofPassed: true,
        message: 'No live face biometric data received from camera.',
      };
    }

    const { similarity, distance, isLegacyFallback } = this.computeBiometricSimilarity(
      liveLandmarks,
      registeredEmbedding || []
    );

    const effectiveThreshold = isLegacyFallback ? 0.40 : 0.60;
    const score = Math.round(similarity * 100) / 100;
    const verified = score >= effectiveThreshold;

    return {
      verified,
      score,
      distance: Math.round(distance * 100) / 100,
      threshold: effectiveThreshold,
      antiSpoofPassed: true,
      message: verified
        ? `Face matched successfully with registered profile of ${student.name} (${Math.round(score * 100)}% similarity).`
        : `Face verification failed. The detected face does not match the registered student ${student.name} (${Math.round(score * 100)}% match, required: ${Math.round(effectiveThreshold * 100)}%).`,
    };
  }

  /**
   * Computes Z-Score Normalized Biometric Cosine Similarity & Euclidean Distance.
   */
  private static computeBiometricSimilarity(
    vecA: number[],
    vecB: number[]
  ): { similarity: number; distance: number; isLegacyFallback: boolean } {
    const len = Math.min(vecA.length, vecB.length);
    if (len === 0) return { similarity: 0, distance: 1.0, isLegacyFallback: false };

    let sumA = 0, sumB = 0;
    for (let i = 0; i < len; i++) {
      sumA += vecA[i];
      sumB += vecB[i];
    }
    const meanA = sumA / len;
    const meanB = sumB / len;

    const isLegacyFallback = meanA > 5 || meanB > 5;

    let varA = 0, varB = 0;
    for (let i = 0; i < len; i++) {
      varA += Math.pow(vecA[i] - meanA, 2);
      varB += Math.pow(vecB[i] - meanB, 2);
    }
    const stdA = Math.sqrt(varA / len) || 1e-6;
    const stdB = Math.sqrt(varB / len) || 1e-6;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    let squareDiffSum = 0;

    for (let i = 0; i < len; i++) {
      const zA = (vecA[i] - meanA) / stdA;
      const zB = (vecB[i] - meanB) / stdB;

      dotProduct += zA * zB;
      normA += zA * zA;
      normB += zB * zB;
      squareDiffSum += Math.pow(zA - zB, 2);
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    const rawCosine = denom > 0 ? dotProduct / denom : 0;

    let similarity = Math.max(0, Math.min(1.0, (rawCosine + 1.0) / 2.0));
    if (isLegacyFallback && rawCosine > 0.1) {
      similarity = Math.min(1.0, similarity + 0.15);
    }

    const distance = Math.sqrt(squareDiffSum / len);

    return { similarity, distance, isLegacyFallback };
  }
}
