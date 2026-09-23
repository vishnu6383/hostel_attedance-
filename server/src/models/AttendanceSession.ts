import mongoose, { Document, Schema } from 'mongoose';

export interface IAttendanceSession extends Document {
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:mm (24-hour format e.g. "20:00")
  endTime: string;    // HH:mm (24-hour format e.g. "20:30")
  sessionName: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'CLOSED';
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceSessionSchema = new Schema<IAttendanceSession>(
  {
    date: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    sessionName: { type: String, default: 'Evening Attendance' },
    status: { type: String, enum: ['SCHEDULED', 'ACTIVE', 'CLOSED'], default: 'SCHEDULED' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

attendanceSessionSchema.index({ date: 1 });
attendanceSessionSchema.index({ date: 1, startTime: 1, endTime: 1 });

export const AttendanceSession = mongoose.model<IAttendanceSession>('AttendanceSession', attendanceSessionSchema);
