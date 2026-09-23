import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { AttendanceSession } from '../models/AttendanceSession';
import { Attendance } from '../models/Attendance';
import { Student } from '../models/Student';

export class ReportController {
  /**
   * Get overall metrics for dashboard
   */
  public static async getDashboardStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const totalStudents = await Student.countDocuments({ status: 'ACTIVE' });

      // Get current or latest session
      let session = await AttendanceSession.findOne({ status: 'ACTIVE' });
      if (!session) {
        session = await AttendanceSession.findOne({ date: today }).sort({ createdAt: -1 });
      }

      if (!session) {
        res.status(200).json({
          success: true,
          stats: {
            activeSession: null,
            totalStudents,
            present: 0,
            pending: totalStudents,
            absent: 0,
            outsideGeofence: 0,
            faceFailed: 0,
            livenessFailed: 0,
            attendancePercentage: 0,
          },
        });
        return;
      }

      const records = await Attendance.find({ sessionId: session._id });

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

      const pending = Math.max(0, totalStudents - present);
      const absent = session.status === 'CLOSED' ? Math.max(0, totalStudents - present) : 0;
      const percentage = totalStudents > 0 ? Math.round((present / totalStudents) * 1000) / 10 : 0;

      res.status(200).json({
        success: true,
        stats: {
          activeSession: session,
          totalStudents,
          present,
          pending,
          absent,
          outsideGeofence,
          faceFailed,
          livenessFailed,
          attendancePercentage: percentage,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get attendance log table with search and filters
   */
  public static async getAttendanceLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { sessionId, date, status, search, block } = req.query;

      const query: any = {};
      if (sessionId) query.sessionId = sessionId;
      if (date) query.date = date;
      if (status && status !== 'ALL') {
        if (status === 'PRESENT') query.finalStatus = 'PRESENT';
        else if (status === 'OUTSIDE_GEOFENCE') query.finalStatus = 'OUTSIDE_GEOFENCE';
        else if (status === 'FACE_FAILED') query.finalStatus = 'FACE_VERIFICATION_FAILED';
        else if (status === 'LIVENESS_FAILED') query.finalStatus = 'LIVENESS_FAILED';
        else if (status === 'PENDING') query.finalStatus = 'PENDING';
      }

      let logs = await Attendance.find(query)
        .populate('studentId', 'name hostelBlock roomNumber department year email')
        .populate('sessionId', 'sessionName date startTime endTime')
        .sort({ timestamp: -1 });

      if (search) {
        const searchRegex = new RegExp(String(search), 'i');
        logs = logs.filter((log: any) => {
          return (
            searchRegex.test(log.registerNumber) ||
            (log.studentId && searchRegex.test(log.studentId.name))
          );
        });
      }

      if (block) {
        logs = logs.filter((log: any) => log.studentId && log.studentId.hostelBlock === block);
      }

      res.status(200).json({ success: true, count: logs.length, logs });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Export attendance logs to CSV
   */
  public static async exportAttendanceCSV(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { sessionId, date } = req.query;
      const query: any = {};
      if (sessionId) query.sessionId = sessionId;
      if (date) query.date = date;

      const logs = await Attendance.find(query)
        .populate('studentId', 'name hostelBlock roomNumber department year')
        .populate('sessionId', 'sessionName date startTime endTime')
        .sort({ registerNumber: 1 });

      let csv = 'Register Number,Student Name,Hostel Block,Room,Department,Session,Date,Location Status,Face Status,Liveness Status,Final Attendance,Timestamp\n';

      logs.forEach((log: any) => {
        const studentName = log.studentId?.name || 'N/A';
        const block = log.studentId?.hostelBlock || 'N/A';
        const room = log.studentId?.roomNumber || 'N/A';
        const dept = log.studentId?.department || 'N/A';
        const sessionName = log.sessionId?.sessionName || 'N/A';
        const formattedTime = new Date(log.timestamp).toLocaleTimeString('en-IN');

        csv += `"${log.registerNumber}","${studentName}","${block}","${room}","${dept}","${sessionName}","${log.date}","${log.locationStatus}","${log.faceVerificationStatus}","${log.livenessStatus}","${log.finalStatus}","${formattedTime}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=hostel_attendance_${date || 'report'}.csv`);
      res.status(200).send(csv);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
