import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { AttendanceSession } from '../models/AttendanceSession';
import { Attendance } from '../models/Attendance';
import { Student } from '../models/Student';

let io: SocketIOServer | null = null;

export const initSocketIO = (httpServer: HTTPServer, clientUrl: string): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: [clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket client connected: ${socket.id}`);

    socket.on('join_admin_room', () => {
      socket.join('admin_dashboard');
      console.log(`👑 Socket ${socket.id} joined admin_dashboard room`);
      // Send initial metrics update immediately
      broadcastDashboardUpdate();
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

/**
 * Broadcast real-time metric counters and attendance updates to admin clients
 */
export const broadcastDashboardUpdate = async (): Promise<void> => {
  if (!io) return;

  try {
    const today = new Date().toISOString().split('T')[0];
    const totalStudents = await Student.countDocuments({ status: 'ACTIVE' });
    
    // Find active session for today or latest session
    const activeSession = await AttendanceSession.findOne({
      $or: [{ status: 'ACTIVE' }, { date: today }],
    }).sort({ createdAt: -1 });

    if (!activeSession) {
      io.to('admin_dashboard').emit('dashboard_metrics_update', {
        activeSession: null,
        totalStudents,
        present: 0,
        pending: totalStudents,
        absent: 0,
        outsideGeofence: 0,
        faceFailed: 0,
        livenessFailed: 0,
        attendancePercentage: 0,
      });
      return;
    }

    const records = await Attendance.find({ sessionId: activeSession._id });

    let present = 0;
    let outsideGeofence = 0;
    let faceFailed = 0;
    let livenessFailed = 0;

    records.forEach(r => {
      if (r.finalStatus === 'PRESENT') present++;
      else if (r.finalStatus === 'OUTSIDE_GEOFENCE' || r.locationStatus === 'OUTSIDE_GEOFENCE') outsideGeofence++;
      else if (r.finalStatus === 'FACE_VERIFICATION_FAILED' || r.faceVerificationStatus === 'FAILED') faceFailed++;
      else if (r.finalStatus === 'LIVENESS_FAILED' || r.livenessStatus === 'LIVENESS_FAILED') livenessFailed++;
    });

    const nonPresentCount = records.filter(r => r.finalStatus !== 'PENDING').length;
    const pending = Math.max(0, totalStudents - present);
    const absent = activeSession.status === 'CLOSED' ? Math.max(0, totalStudents - present) : 0;
    const percentage = totalStudents > 0 ? Math.round((present / totalStudents) * 1000) / 10 : 0;

    io.to('admin_dashboard').emit('dashboard_metrics_update', {
      activeSession,
      totalStudents,
      present,
      pending,
      absent,
      outsideGeofence,
      faceFailed,
      livenessFailed,
      attendancePercentage: percentage,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error broadcasting dashboard update:', err);
  }
};

/**
 * Broadcast individual student verification step progression
 */
export const broadcastStudentProgress = (progressData: {
  registerNumber: string;
  name?: string;
  hostelBlock?: string;
  roomNumber?: string;
  locationStatus: string;
  faceVerificationStatus: string;
  livenessStatus: string;
  finalStatus: string;
  timestamp: string;
}): void => {
  if (!io) return;
  io.to('admin_dashboard').emit('student_progress_update', progressData);
  broadcastDashboardUpdate();
};
