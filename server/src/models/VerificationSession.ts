import mongoose, { Document, Schema } from 'mongoose';

export type VerificationSessionStatus = 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'FAILED';

export interface IVerificationSession extends Document {
  sessionId: mongoose.Types.ObjectId;
  studentId?: mongoose.Types.ObjectId;
  registerNumber?: string;
  sessionNonce: string;
  challengeType: string;
  challengeNonce: string;
  locationStatus: string;
  faceStatus: string;
  antiSpoofStatus: string;
  livenessStatus: string;
  status: VerificationSessionStatus;
  createdAt: Date;
  expiresAt: Date;
}

const verificationSessionSchema = new Schema<IVerificationSession>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'AttendanceSession', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student' },
    registerNumber: { type: String, uppercase: true, trim: true },
    sessionNonce: { type: String, required: true, unique: true },
    challengeType: { type: String, required: true },
    challengeNonce: { type: String, required: true },
    locationStatus: { type: String, default: 'LOCATION_PENDING' },
    faceStatus: { type: String, default: 'FACE_PENDING' },
    antiSpoofStatus: { type: String, default: 'ANTI_SPOOF_PENDING' },
    livenessStatus: { type: String, default: 'LIVENESS_PENDING' },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'EXPIRED', 'FAILED'],
      default: 'ACTIVE',
    },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

verificationSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const VerificationSession = mongoose.model<IVerificationSession>(
  'VerificationSession',
  verificationSessionSchema
);
