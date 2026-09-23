import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { connectDB } from '../config/db';
import { User } from '../models/User';
import { Student } from '../models/Student';
import { AttendanceSession } from '../models/AttendanceSession';
import { Attendance } from '../models/Attendance';
import { VerificationAttempt } from '../models/VerificationAttempt';
import { AttendanceService } from '../services/attendanceService';

export const seedDatabase = async () => {
  try {
    await connectDB();

    console.log('🧹 Clearing previous seed data & sample students...');
    await User.deleteMany({});
    await Student.deleteMany({});
    await AttendanceSession.deleteMany({});
    await Attendance.deleteMany({});
    await VerificationAttempt.deleteMany({});

    console.log('👤 Creating Admin user...');
    const hashedAdminPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await User.create({
      name: 'System Hostel Warden',
      email: 'admin@hostel.com',
      password: hashedAdminPassword,
      role: 'ADMIN',
    });

    console.log('📅 Creating active attendance session...');
    const { dateStr } = AttendanceService.getCurrentIndiaDateTime();

    const activeSession = await AttendanceSession.create({
      date: dateStr,
      startTime: '00:00',
      endTime: '23:59',
      sessionName: 'Evening Hostel Attendance',
      status: 'ACTIVE',
      createdBy: adminUser._id,
    });

    console.log('=======================================================');
    console.log('✅ DATABASE RESET COMPLETED! SAMPLE STUDENTS REMOVED.');
    console.log(`👑 Admin Credentials: admin@hostel.com / admin123`);
    console.log(`📅 Active Session ID: ${activeSession._id}`);
    console.log('=======================================================');

    process.exit(0);
  } catch (err) {
    console.error('❌ Reset failed:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  seedDatabase();
}
