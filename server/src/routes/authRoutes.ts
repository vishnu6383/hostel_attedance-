import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken } from '../middleware/authMiddleware';
import { z } from 'zod';
import { validateRequest } from '../middleware/validateMiddleware';

const router = Router();

const loginSchema = z.object({
  body: z.object({
    email: z.string().optional(),
    registerNumber: z.string().optional(),
    password: z.string().min(1, 'Password is required'),
  }),
});

router.post('/login', validateRequest(loginSchema), AuthController.login);
router.get('/profile', authenticateToken, AuthController.getProfile);

export default router;
