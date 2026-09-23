import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  role: 'ADMIN' | 'STUDENT';
  name: string;
  registerNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['ADMIN', 'STUDENT'], default: 'STUDENT' },
    name: { type: String, required: true },
    registerNumber: { type: String, sparse: true, uppercase: true, trim: true },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', userSchema);
