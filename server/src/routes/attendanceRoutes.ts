import { Router } from 'express';
import { AttendanceController } from '../controllers/attendanceController';

const router = Router();

// Student guided attendance verification flow endpoints
router.get('/active-session', AttendanceController.checkSessionStatus);
router.post('/location', AttendanceController.verifyLocation);
router.post('/verify-student', AttendanceController.verifyStudent);
router.post('/session/start', AttendanceController.startVerificationSession);
router.get('/liveness-challenge', AttendanceController.getRandomChallenge);
router.post('/complete', AttendanceController.completeAttendance);
router.post('/test-face', AttendanceController.testFace);

export default router;
