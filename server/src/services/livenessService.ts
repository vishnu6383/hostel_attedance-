import crypto from 'crypto';
import { VerificationSession } from '../models/VerificationSession';

export interface ChallengeOption {
  id: string;
  instruction: string;
  description: string;
  type: 'FACE_HEAD' | 'FACE_EXPRESSION' | 'HAND_GESTURE';
}

export const CHALLENGES: ChallengeOption[] = [
  { id: 'TURN_LEFT', instruction: 'Turn your head LEFT', description: 'Rotate head to your left', type: 'FACE_HEAD' },
  { id: 'TURN_RIGHT', instruction: 'Turn your head RIGHT', description: 'Rotate head to your right', type: 'FACE_HEAD' },
  { id: 'NOD', instruction: 'NOD your head', description: 'Move head down and up', type: 'FACE_HEAD' },
  { id: 'BLINK_TWICE', instruction: 'Blink your eyes TWICE', description: 'Close and open eyes twice', type: 'FACE_EXPRESSION' },
  { id: 'OPEN_MOUTH', instruction: 'OPEN your mouth', description: 'Open your mouth clearly', type: 'FACE_EXPRESSION' },
  { id: 'SMILE', instruction: 'SMILE at the camera', description: 'Show a clear smile', type: 'FACE_EXPRESSION' },
  { id: 'SHOW_ONE_FINGER', instruction: 'Show ONE finger ☝️', description: 'Hold up 1 index finger to camera', type: 'HAND_GESTURE' },
  { id: 'SHOW_TWO_FINGERS', instruction: 'Show TWO fingers ✌️', description: 'Hold up 2 fingers (peace sign) to camera', type: 'HAND_GESTURE' },
];

export interface LivenessVerificationResult {
  passed: boolean;
  status: 'LIVENESS_PASSED' | 'LIVENESS_FAILED' | 'LIVENESS_TIMEOUT';
  challenge: string;
  detectedAction: string;
  message: string;
}

export class LivenessService {
  /**
   * Selects a random challenge for the student
   */
  public static getRandomChallenge(): ChallengeOption {
    const randomIndex = Math.floor(Math.random() * CHALLENGES.length);
    return CHALLENGES[randomIndex];
  }

  /**
   * Creates a new server-side VerificationSession with challenge nonce
   */
  public static async createSession(sessionId: string, registerNumber?: string): Promise<{
    sessionNonce: string;
    challengeNonce: string;
    challenge: ChallengeOption;
    expiresAt: Date;
  }> {
    const challenge = this.getRandomChallenge();
    const sessionNonce = crypto.randomBytes(16).toString('hex');
    const challengeNonce = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 1000); // 30s expiry

    await VerificationSession.create({
      sessionId,
      registerNumber: registerNumber ? registerNumber.toUpperCase() : undefined,
      sessionNonce,
      challengeType: challenge.id,
      challengeNonce,
      expiresAt,
      status: 'ACTIVE',
    });

    return {
      sessionNonce,
      challengeNonce,
      challenge,
      expiresAt,
    };
  }

  /**
   * Validates client gesture verification payload against server-side VerificationSession
   */
  public static async verifyLiveness(
    challengeId: string,
    completedAction: string,
    confidence: number = 0,
    timedOut: boolean = false,
    challengeNonce?: string
  ): Promise<LivenessVerificationResult> {
    if (timedOut) {
      return {
        passed: false,
        status: 'LIVENESS_TIMEOUT',
        challenge: challengeId,
        detectedAction: completedAction || 'NONE',
        message: 'Liveness verification timed out (30s limit exceeded). Please try again.',
      };
    }

    const challengeObj = CHALLENGES.find((c) => c.id === challengeId);
    if (!challengeObj) {
      return {
        passed: false,
        status: 'LIVENESS_FAILED',
        challenge: challengeId,
        detectedAction: completedAction,
        message: 'Invalid challenge identifier.',
      };
    }

    // If challengeNonce provided, check DB session
    if (challengeNonce) {
      const dbSession = await VerificationSession.findOne({ challengeNonce });
      if (!dbSession) {
        return {
          passed: false,
          status: 'LIVENESS_FAILED',
          challenge: challengeId,
          detectedAction: completedAction,
          message: 'Invalid or expired verification session challenge nonce.',
        };
      }

      if (dbSession.expiresAt < new Date()) {
        dbSession.status = 'EXPIRED';
        await dbSession.save();
        return {
          passed: false,
          status: 'LIVENESS_TIMEOUT',
          challenge: challengeId,
          detectedAction: completedAction,
          message: 'Verification challenge session expired (30s exceeded).',
        };
      }

      if (dbSession.challengeType !== challengeId) {
        return {
          passed: false,
          status: 'LIVENESS_FAILED',
          challenge: challengeId,
          detectedAction: completedAction,
          message: 'Liveness challenge mismatch with assigned server nonce.',
        };
      }
    }

    const passed = challengeId === completedAction && confidence >= 0.7;

    return {
      passed,
      status: passed ? 'LIVENESS_PASSED' : 'LIVENESS_FAILED',
      challenge: challengeId,
      detectedAction: completedAction,
      message: passed
        ? 'Random liveness gesture verified successfully.'
        : `Liveness verification failed. Expected action: ${challengeObj.instruction}, Detected: ${completedAction}`,
    };
  }
}
