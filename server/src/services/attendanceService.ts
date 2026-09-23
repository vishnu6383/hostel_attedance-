import { AttendanceSession, IAttendanceSession } from '../models/AttendanceSession';
import { Student, IStudent } from '../models/Student';
import { Attendance, IAttendance } from '../models/Attendance';
import { VerificationAttempt } from '../models/VerificationAttempt';
import { VerificationSession } from '../models/VerificationSession';
import { GeofenceService, GeofenceResult } from './geofenceService';
import { FaceVerificationService, FaceVerificationResult } from './faceVerificationService';
import { LivenessService, LivenessVerificationResult } from './livenessService';
import { broadcastStudentProgress } from './socketService';
import { timeToMinutes } from '../utils/timeUtils';

export interface ActiveSessionResult {
  isActive: boolean;
  session: IAttendanceSession | null;
  message: string;
}

export class AttendanceService {
  /**
   * Helper to format current date and time in Asia/Kolkata timezone
   */
  public static getCurrentIndiaDateTime(): { dateStr: string; timeStr: string } {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    const parts = new Intl.DateTimeFormat('en-IN', options).formatToParts(now);
    const map: Record<string, string> = {};
    parts.forEach((p) => (map[p.type] = p.value));

    const dateStr = `${map.year}-${map.month}-${map.day}`;
    const timeStr = `${map.hour}:${map.minute}`;

    return { dateStr, timeStr };
  }

  /**
   * Checks if an attendance session is currently active for the current date and time.
   */
  public static async getActiveSession(): Promise<ActiveSessionResult> {
    const { dateStr, timeStr } = this.getCurrentIndiaDateTime();
    const currentMins = timeToMinutes(timeStr);

    const sessions = await AttendanceSession.find({
      $or: [{ date: dateStr }, { status: 'ACTIVE' }],
    });

    if (!sessions || sessions.length === 0) {
      return {
        isActive: false,
        session: null,
        message: 'Attendance Closed — No session scheduled for today.',
      };
    }

    for (const session of sessions) {
      const startMins = timeToMinutes(session.startTime);
      const endMins = timeToMinutes(session.endTime);

      const isToday = session.date === dateStr;
      if (isToday) {
        if (currentMins < startMins) {
          if (session.status !== 'SCHEDULED') {
            session.status = 'SCHEDULED';
            await session.save();
          }
          return {
            isActive: false,
            session,
            message: `Attendance has not started yet. Session begins at ${session.startTime}.`,
          };
        }
        if (currentMins > endMins) {
          if (session.status !== 'CLOSED') {
            session.status = 'CLOSED';
            await session.save();
          }
          continue;
        }
        if (session.status !== 'ACTIVE') {
          session.status = 'ACTIVE';
          await session.save();
        }
        return {
          isActive: true,
          session,
          message: 'Attendance session is active.',
        };
      }
    }

    return {
      isActive: false,
      session: null,
      message: "Attendance Closed — Today's attendance time is over.",
    };
  }

  /**
   * Location Verification Step
   */
  public static async verifyLocationStep(
    sessionId: string,
    lat: number,
    lon: number,
    accuracy: number = 0,
    registerNumber?: string,
    testMode: boolean = false
  ): Promise<GeofenceResult> {
    const geofenceResult = GeofenceService.verifyLocation(lat, lon, accuracy, testMode);

    await VerificationAttempt.create({
      sessionId,
      registerNumber: registerNumber || 'UNKNOWN',
      step: 'LOCATION_CHECK',
      status: geofenceResult.isWithin ? 'PASSED' : 'FAILED',
      reason: geofenceResult.message,
      metadata: { distanceMeters: geofenceResult.distanceMeters, accuracy, lat, lon },
    });

    if (registerNumber) {
      broadcastStudentProgress({
        registerNumber,
        locationStatus: geofenceResult.status,
        faceVerificationStatus: 'PENDING',
        livenessStatus: 'LIVENESS_PENDING',
        finalStatus: geofenceResult.isWithin ? 'WITHIN_GEOFENCE' : geofenceResult.status,
        timestamp: new Date().toISOString(),
      });
    }

    return geofenceResult;
  }

  /**
   * Register Number Check Step
   */
  public static async verifyRegisterNumber(registerNumber: string, sessionId: string): Promise<IStudent | null> {
    const formattedReg = registerNumber.trim().toUpperCase();
    const student = await Student.findOne({ registerNumber: formattedReg, status: 'ACTIVE' });

    await VerificationAttempt.create({
      sessionId,
      registerNumber: formattedReg,
      step: 'REGISTER_NUMBER',
      status: student ? 'PASSED' : 'FAILED',
      reason: student ? 'Student register number verified' : 'Invalid Register Number',
    });

    return student;
  }

  /**
   * Final atomic attendance completion verification chain
   */
  public static async completeAttendance(payload: {
    sessionId: string;
    registerNumber: string;
    location: { lat: number; lon: number; accuracy: number };
    liveImageBase64?: string;
    faceLandmarks?: number[];
    liveness: { challengeId: string; completedAction: string; confidence: number; timedOut?: boolean; challengeNonce?: string };
    testMode?: boolean;
  }): Promise<{ success: boolean; message: string; attendance?: IAttendance; status: string }> {
    const { sessionId, registerNumber, location, liveImageBase64, faceLandmarks, liveness, testMode } = payload;
    const regNumUpper = registerNumber.trim().toUpperCase();

    // 1. Session check
    const session = await AttendanceSession.findById(sessionId);
    if (!session || session.status === 'CLOSED') {
      return { success: false, message: "Attendance Closed — Today's session is not active.", status: 'ABSENT' };
    }

    // 2. Student Check
    const student = await Student.findOne({ registerNumber: regNumUpper, status: 'ACTIVE' });
    if (!student) {
      return { success: false, message: 'Invalid Register Number. Student not found in hostel records.', status: 'INVALID_STUDENT' };
    }

    // Check duplicate attendance BEFORE processing
    const existingAttendance = await Attendance.findOne({
      sessionId: session._id,
      studentId: student._id,
    });

    if (existingAttendance && existingAttendance.finalStatus === 'PRESENT') {
      return {
        success: false,
        message: 'Attendance has already been recorded for this session.',
        attendance: existingAttendance,
        status: 'PRESENT',
      };
    }

    // 3. Geofence Check
    const geoResult = GeofenceService.verifyLocation(location.lat, location.lon, location.accuracy, testMode);
    if (!geoResult.isWithin) {
      await Attendance.findOneAndUpdate(
        { sessionId: session._id, studentId: student._id },
        {
          sessionId: session._id,
          studentId: student._id,
          registerNumber: regNumUpper,
          date: session.date,
          locationLatitude: location.lat,
          locationLongitude: location.lon,
          locationAccuracy: location.accuracy,
          distanceFromHostel: geoResult.distanceMeters,
          locationStatus: geoResult.status,
          finalStatus: geoResult.status === 'LOW_GPS_ACCURACY' ? 'PENDING' : 'OUTSIDE_GEOFENCE',
        },
        { upsert: true, new: true }
      );

      broadcastStudentProgress({
        registerNumber: regNumUpper,
        name: student.name,
        hostelBlock: student.hostelBlock,
        roomNumber: student.roomNumber,
        locationStatus: geoResult.status,
        faceVerificationStatus: 'PENDING',
        livenessStatus: 'LIVENESS_PENDING',
        finalStatus: geoResult.status,
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        message: geoResult.message,
        status: geoResult.status,
      };
    }

    // 4. Face Verification Check (DeepFace ArcFace AI Service + Anti-Spoof)
    const faceResult: FaceVerificationResult = await FaceVerificationService.verifyFaceWithAIService(
      liveImageBase64,
      faceLandmarks,
      student
    );
    if (!faceResult.verified) {
      await Attendance.findOneAndUpdate(
        { sessionId: session._id, studentId: student._id },
        {
          sessionId: session._id,
          studentId: student._id,
          registerNumber: regNumUpper,
          date: session.date,
          locationLatitude: location.lat,
          locationLongitude: location.lon,
          locationAccuracy: location.accuracy,
          distanceFromHostel: geoResult.distanceMeters,
          locationStatus: 'WITHIN_GEOFENCE',
          faceVerificationStatus: 'FAILED',
          faceMatchScore: faceResult.score,
          finalStatus: 'FACE_VERIFICATION_FAILED',
        },
        { upsert: true, new: true }
      );

      broadcastStudentProgress({
        registerNumber: regNumUpper,
        name: student.name,
        hostelBlock: student.hostelBlock,
        roomNumber: student.roomNumber,
        locationStatus: 'WITHIN_GEOFENCE',
        faceVerificationStatus: 'FAILED',
        livenessStatus: 'LIVENESS_PENDING',
        finalStatus: 'FACE_VERIFICATION_FAILED',
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        message: faceResult.message,
        status: 'FACE_VERIFICATION_FAILED',
      };
    }

    // 5. Liveness / Gesture Verification Check
    const livenessResult: LivenessVerificationResult = await LivenessService.verifyLiveness(
      liveness.challengeId,
      liveness.completedAction,
      liveness.confidence,
      liveness.timedOut,
      liveness.challengeNonce
    );

    if (!livenessResult.passed) {
      await Attendance.findOneAndUpdate(
        { sessionId: session._id, studentId: student._id },
        {
          sessionId: session._id,
          studentId: student._id,
          registerNumber: regNumUpper,
          date: session.date,
          locationLatitude: location.lat,
          locationLongitude: location.lon,
          locationAccuracy: location.accuracy,
          distanceFromHostel: geoResult.distanceMeters,
          locationStatus: 'WITHIN_GEOFENCE',
          faceVerificationStatus: 'VERIFIED',
          faceMatchScore: faceResult.score,
          livenessStatus: livenessResult.status,
          gestureChallenge: liveness.challengeId,
          gestureResult: liveness.completedAction,
          finalStatus: 'LIVENESS_FAILED',
        },
        { upsert: true, new: true }
      );

      broadcastStudentProgress({
        registerNumber: regNumUpper,
        name: student.name,
        hostelBlock: student.hostelBlock,
        roomNumber: student.roomNumber,
        locationStatus: 'WITHIN_GEOFENCE',
        faceVerificationStatus: 'VERIFIED',
        livenessStatus: livenessResult.status,
        finalStatus: 'LIVENESS_FAILED',
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        message: livenessResult.message,
        status: 'LIVENESS_FAILED',
      };
    }

    // 6. ALL CHECKS PASSED -> MARK PRESENT!
    const attendanceRecord = await Attendance.findOneAndUpdate(
      { sessionId: session._id, studentId: student._id },
      {
        sessionId: session._id,
        studentId: student._id,
        registerNumber: regNumUpper,
        date: session.date,
        timestamp: new Date(),
        locationLatitude: location.lat,
        locationLongitude: location.lon,
        locationAccuracy: location.accuracy,
        distanceFromHostel: geoResult.distanceMeters,
        locationStatus: 'WITHIN_GEOFENCE',
        faceVerificationStatus: 'VERIFIED',
        faceMatchScore: faceResult.score,
        livenessStatus: 'LIVENESS_PASSED',
        gestureChallenge: liveness.challengeId,
        gestureResult: liveness.completedAction,
        finalStatus: 'PRESENT',
      },
      { upsert: true, new: true }
    );

    broadcastStudentProgress({
      registerNumber: regNumUpper,
      name: student.name,
      hostelBlock: student.hostelBlock,
      roomNumber: student.roomNumber,
      locationStatus: 'WITHIN_GEOFENCE',
      faceVerificationStatus: 'VERIFIED',
      livenessStatus: 'LIVENESS_PASSED',
      finalStatus: 'PRESENT',
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      message: 'Attendance successfully marked as PRESENT.',
      attendance: attendanceRecord,
      status: 'PRESENT',
    };
  }
}
