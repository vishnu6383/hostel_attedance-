import { Router } from 'express';
import { SessionController } from '../controllers/sessionController';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validateMiddleware';
import { z } from 'zod';

const router = Router();

const createSessionSchema = z.object({
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Start time must be HH:mm'),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'End time must be HH:mm'),
    sessionName: z.string().optional(),
  }),
});

router.post('/', authenticateToken, requireAdmin, validateRequest(createSessionSchema), SessionController.createSession);
router.get('/', SessionController.getSessions);
router.get('/:id', SessionController.getSessionById);
router.delete('/:id', authenticateToken, requireAdmin, SessionController.deleteSession);

export default router;
