import { Request, Response } from 'express';
import { AttendanceService } from '../services/attendanceService';
import { LivenessService } from '../services/livenessService';
import { AIService } from '../services/aiService';

export class AttendanceController {
  /**
   * Step 1: Check active session availability
   */
  public static async checkSessionStatus(req: Request, res: Response): Promise<void> {
    try {
      const activeResult = await AttendanceService.getActiveSession();
      res.status(200).json({
        success: true,
        isActive: activeResult.isActive,
        message: activeResult.message,
        session: activeResult.session,
        geofenceConfigured: true,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Step 2: Location Verification
   */
  public static async verifyLocation(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId, latitude, longitude, accuracy, registerNumber, testMode } = req.body;

      if (latitude === undefined || longitude === undefined) {
        res.status(400).json({
          success: false,
          message: 'Location latitude and longitude are required.',
          status: 'LOCATION_ERROR',
        });
        return;
      }

      const isTestMode = testMode === true;
      const result = await AttendanceService.verifyLocationStep(
        sessionId,
        parseFloat(latitude),
        parseFloat(longitude),
        accuracy ? parseFloat(accuracy) : 0,
        registerNumber,
        isTestMode
      );

      res.status(200).json({
        success: true,
        isWithin: result.isWithin,
        distanceMeters: result.distanceMeters,
        allowedRadius: result.allowedRadius,
        hostelLat: result.hostelLat,
        hostelLon: result.hostelLon,
        studentLat: result.studentLat,
        studentLon: result.studentLon,
        accuracy: result.accuracy,
        status: result.status,
        message: result.message,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Step 3: Register Number Check & Fetch profile info for verification
   */
  public static async verifyStudent(req: Request, res: Response): Promise<void> {
    try {
      const { registerNumber, sessionId } = req.body;

      if (!registerNumber) {
        res.status(400).json({ success: false, message: 'Register number is required.' });
        return;
      }

      const student = await AttendanceService.verifyRegisterNumber(registerNumber, sessionId);

      if (!student) {
        res.status(404).json({
          success: false,
          message: 'Invalid Register Number. Student not found in hostel records.',
          status: 'INVALID_STUDENT',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Register number verified.',
        student: {
          registerNumber: student.registerNumber,
          name: student.name,
          hostelBlock: student.hostelBlock,
          roomNumber: student.roomNumber,
          department: student.department,
          registeredFaceImage: student.registeredFaceImage ? true : false,
          hasFaceEmbedding: student.faceEmbedding && student.faceEmbedding.length > 0,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Step 5: Start Server-Side Verification Session & Nonce Challenge
   */
  public static async startVerificationSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId, registerNumber } = req.body;
      const sessionData = await LivenessService.createSession(sessionId, registerNumber);
      res.status(200).json({
        success: true,
        sessionNonce: sessionData.sessionNonce,
        challengeNonce: sessionData.challengeNonce,
        challenge: sessionData.challenge,
        timeoutSeconds: 30,
        expiresAt: sessionData.expiresAt,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get Randomized Liveness Challenge
   */
  public static getRandomChallenge(req: Request, res: Response): void {
    try {
      const challenge = LivenessService.getRandomChallenge();
      res.status(200).json({
        success: true,
        challenge,
        timeoutSeconds: 30,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Step 6: Complete Final Verification Chain
   */
  public static async completeAttendance(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId, registerNumber, location, liveImageBase64, faceLandmarks, liveness, testMode } = req.body;

      if (!sessionId || !registerNumber || !location || !liveness) {
        res.status(400).json({
          success: false,
          message: 'Missing required attendance verification parameters.',
        });
        return;
      }

      const result = await AttendanceService.completeAttendance({
        sessionId,
        registerNumber,
        location,
        liveImageBase64,
        faceLandmarks,
        liveness,
        testMode: testMode === true,
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          message: result.message,
          status: result.status,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: result.message,
        status: result.status,
        attendance: result.attendance,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Standalone test face verification controller endpoint
   */
  public static async testFace(req: Request, res: Response): Promise<void> {
    try {
      const { referenceImageBase64, testImageBase64 } = req.body;
      if (!referenceImageBase64 || !testImageBase64) {
        res.status(400).json({
          success: false,
          message: 'Both referenceImageBase64 and testImageBase64 are required.',
        });
        return;
      }
      const result = await AIService.testFace(referenceImageBase64, testImageBase64);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

