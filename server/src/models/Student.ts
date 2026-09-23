import mongoose, { Document, Schema } from 'mongoose';

export interface IStudent extends Document {
  studentId: string;
  registerNumber: string;
  name: string;
  email: string;
  phone?: string;
  department: string;
  year: string;
  sem?: string;
  hostelBlock: string;
  roomNumber: string;
  registeredFaceImage?: string; // Base64 profile photo image stored in db
  faceEmbedding?: number[];    // Feature descriptor array for comparison
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const studentSchema = new Schema<IStudent>(
  {
    studentId: { type: String, required: true, unique: true },
    registerNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: '' },
    department: { type: String, required: true },
    year: { type: String, required: true },
    sem: { type: String, default: 'Sem 1' },
    hostelBlock: { type: String, default: 'Block A' },
    roomNumber: { type: String, required: true },
    registeredFaceImage: { type: String, default: '' },
    faceEmbedding: { type: [Number], default: [] },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

studentSchema.index({ hostelBlock: 1 });

export const Student = mongoose.model<IStudent>('Student', studentSchema);
