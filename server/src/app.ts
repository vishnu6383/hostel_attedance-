import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ENV } from './config/env';
import { errorHandler } from './middleware/errorMiddleware';

import authRoutes from './routes/authRoutes';
import sessionRoutes from './routes/sessionRoutes';
import studentRoutes from './routes/studentRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import reportRoutes from './routes/reportRoutes';
import { AttendanceController } from './controllers/attendanceController';

const app: Application = express();

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP in dev to allow camera streams & media
}));

app.use(cors({
  origin: [ENV.CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' },
});
app.use('/api', limiter);

// Health Check API
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'UP',
    system: 'Smart Hostel Attendance Management System API',
    timezone: ENV.TIMEZONE,
    timestamp: new Date().toISOString(),
    geofence: {
      latitude: ENV.HOSTEL_LATITUDE,
      longitude: ENV.HOSTEL_LONGITUDE,
      radiusMeters: ENV.HOSTEL_GEOFENCE_RADIUS_METERS,
    },
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin/sessions', sessionRoutes);
app.use('/api/admin/students', studentRoutes);
app.use('/api/admin/reports', reportRoutes);
app.use('/api/attendance', attendanceRoutes);
app.post('/api/test-face', AttendanceController.testFace);

// 404 Route Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global Error Handler
app.use(errorHandler);

export default app;
