import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { AttendanceSession } from '../models/AttendanceSession';
import { AttendanceService } from '../services/attendanceService';
import { broadcastDashboardUpdate } from '../services/socketService';
import { normalizeTimeStr, timeToMinutes, computeSessionStatus } from '../utils/timeUtils';

export class SessionController {
  /**
   * Create an attendance session with normalized time comparison and status evaluation
   */
  public static async createSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { date, startTime, endTime, sessionName } = req.body;

      const normStart = normalizeTimeStr(startTime);
      const normEnd = normalizeTimeStr(endTime);

      const startMins = timeToMinutes(normStart);
      const endMins = timeToMinutes(normEnd);

      // Validate time sequence using numeric minutes
      if (startMins >= endMins) {
        res.status(400).json({
          success: false,
          message: `Start time (${normStart}) must be earlier than End time (${normEnd}).`,
        });
        return;
      }

      // Check current India date and time to compute status
      const { dateStr, timeStr } = AttendanceService.getCurrentIndiaDateTime();
      const status = computeSessionStatus(date, normStart, normEnd, dateStr, timeStr);

      const session = await AttendanceSession.create({
        date,
        startTime: normStart,
        endTime: normEnd,
        sessionName: sessionName || 'Hostel Attendance Session',
        status,
        createdBy: req.user?.id,
      });

      // Broadcast Socket.IO update
      broadcastDashboardUpdate();

      res.status(201).json({
        success: true,
        message: `Attendance session scheduled successfully (${status}).`,
        session,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Failed to create session', error: err.message });
    }
  }

  /**
   * Get all attendance sessions and dynamically update real-time statuses
   */
  public static async getSessions(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { date } = req.query;
      const query: any = {};
      if (date) query.date = date;

      const { dateStr, timeStr } = AttendanceService.getCurrentIndiaDateTime();
      const dbSessions = await AttendanceSession.find(query).sort({ date: -1, startTime: -1 });

      // Synchronize session statuses dynamically in database
      const updatedSessions = await Promise.all(
        dbSessions.map(async (s) => {
          const currentStatus = computeSessionStatus(s.date, s.startTime, s.endTime, dateStr, timeStr);
          if (s.status !== currentStatus) {
            s.status = currentStatus;
            await s.save();
          }
          return s;
        })
      );

      res.status(200).json({ success: true, count: updatedSessions.length, sessions: updatedSessions });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get session details by ID with synced status
   */
  public static async getSessionById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const session = await AttendanceSession.findById(req.params.id);
      if (!session) {
        res.status(404).json({ success: false, message: 'Session not found' });
        return;
      }
      const { dateStr, timeStr } = AttendanceService.getCurrentIndiaDateTime();
      const currentStatus = computeSessionStatus(session.date, session.startTime, session.endTime, dateStr, timeStr);
      if (session.status !== currentStatus) {
        session.status = currentStatus;
        await session.save();
      }
      res.status(200).json({ success: true, session });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Delete attendance session
   */
  public static async deleteSession(req: AuthRequest, res: Response): Promise<void> {
    try {
      const session = await AttendanceSession.findByIdAndDelete(req.params.id);
      if (!session) {
        res.status(404).json({ success: false, message: 'Session not found' });
        return;
      }
      broadcastDashboardUpdate();
      res.status(200).json({ success: true, message: 'Session deleted successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
