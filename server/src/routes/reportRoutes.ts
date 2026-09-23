import { Router } from 'express';
import { ReportController } from '../controllers/reportController';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

router.get('/dashboard', authenticateToken, requireAdmin, ReportController.getDashboardStats);
router.get('/logs', authenticateToken, requireAdmin, ReportController.getAttendanceLogs);
router.get('/export-csv', authenticateToken, requireAdmin, ReportController.exportAttendanceCSV);

export default router;
