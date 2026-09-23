import mongoose, { Document, Schema } from 'mongoose';

export interface IVerificationAttempt extends Document {
  sessionId?: mongoose.Types.ObjectId;
  studentId?: mongoose.Types.ObjectId;
  registerNumber?: string;
  step: 'TIME_CHECK' | 'LOCATION_CHECK' | 'REGISTER_NUMBER' | 'FACE_VERIFICATION' | 'LIVENESS_CHALLENGE';
  status: 'PASSED' | 'FAILED';
  reason?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  timestamp: Date;
}

const verificationAttemptSchema = new Schema<IVerificationAttempt>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'AttendanceSession' },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student' },
    registerNumber: { type: String, uppercase: true, trim: true },
    step: {
      type: String,
      enum: ['TIME_CHECK', 'LOCATION_CHECK', 'REGISTER_NUMBER', 'FACE_VERIFICATION', 'LIVENESS_CHALLENGE'],
      required: true,
    },
    status: { type: String, enum: ['PASSED', 'FAILED'], required: true },
    reason: { type: String, default: '' },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

verificationAttemptSchema.index({ timestamp: -1 });
verificationAttemptSchema.index({ registerNumber: 1 });

export const VerificationAttempt = mongoose.model<IVerificationAttempt>('VerificationAttempt', verificationAttemptSchema);
