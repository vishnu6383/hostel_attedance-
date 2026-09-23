import mongoose, { Document, Schema } from 'mongoose';

export type LocationStatusType =
  | 'LOCATION_PENDING'
  | 'WITHIN_GEOFENCE'
  | 'OUTSIDE_GEOFENCE'
  | 'LOCATION_PERMISSION_DENIED'
  | 'LOCATION_ERROR';

export type VerificationStatusType = 'VERIFIED' | 'FAILED' | 'PENDING';
export type LivenessStatusType = 'LIVENESS_PENDING' | 'LIVENESS_PASSED' | 'LIVENESS_FAILED' | 'LIVENESS_TIMEOUT';

export type FinalAttendanceStatusType =
  | 'NOT_STARTED'
  | 'PENDING'
  | 'WITHIN_GEOFENCE'
  | 'OUTSIDE_GEOFENCE'
  | 'INVALID_STUDENT'
  | 'FACE_VERIFICATION_FAILED'
  | 'LIVENESS_FAILED'
  | 'PRESENT'
  | 'ABSENT';

export interface IAttendance extends Document {
  sessionId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  registerNumber: string;
  date: string;
  timestamp: Date;
  locationLatitude?: number;
  locationLongitude?: number;
  locationAccuracy?: number;
  distanceFromHostel?: number;
  locationStatus: LocationStatusType;
  faceVerificationStatus: VerificationStatusType;
  faceMatchScore?: number;
  livenessStatus: LivenessStatusType;
  gestureChallenge?: string;
  gestureResult?: string;
  finalStatus: FinalAttendanceStatusType;
  verificationAttemptCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'AttendanceSession', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    registerNumber: { type: String, required: true, uppercase: true, trim: true },
    date: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    locationLatitude: { type: Number },
    locationLongitude: { type: Number },
    locationAccuracy: { type: Number },
    distanceFromHostel: { type: Number },
    locationStatus: {
      type: String,
      enum: ['LOCATION_PENDING', 'WITHIN_GEOFENCE', 'OUTSIDE_GEOFENCE', 'LOCATION_PERMISSION_DENIED', 'LOCATION_ERROR'],
      default: 'LOCATION_PENDING',
    },
    faceVerificationStatus: {
      type: String,
      enum: ['VERIFIED', 'FAILED', 'PENDING'],
      default: 'PENDING',
    },
    faceMatchScore: { type: Number, default: 0 },
    livenessStatus: {
      type: String,
      enum: ['LIVENESS_PENDING', 'LIVENESS_PASSED', 'LIVENESS_FAILED', 'LIVENESS_TIMEOUT'],
      default: 'LIVENESS_PENDING',
    },
    gestureChallenge: { type: String, default: '' },
    gestureResult: { type: String, default: '' },
    finalStatus: {
      type: String,
      enum: [
        'NOT_STARTED',
        'PENDING',
        'WITHIN_GEOFENCE',
        'OUTSIDE_GEOFENCE',
        'INVALID_STUDENT',
        'FACE_VERIFICATION_FAILED',
        'LIVENESS_FAILED',
        'PRESENT',
        'ABSENT',
      ],
      default: 'PENDING',
    },
    verificationAttemptCount: { type: Number, default: 1 },
  },
  { timestamps: true }
);

// Prevent duplicate attendance records for the same student in the same session
attendanceSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });
attendanceSchema.index({ date: 1, registerNumber: 1 });
attendanceSchema.index({ finalStatus: 1 });

export const Attendance = mongoose.model<IAttendance>('Attendance', attendanceSchema);
