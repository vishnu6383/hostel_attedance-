import { Router } from 'express';
import { StudentController } from '../controllers/studentController';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validateMiddleware';
import { z } from 'zod';

const router = Router();

const createStudentSchema = z.object({
  body: z.object({
    registerNumber: z.string().min(3, 'Register number is required'),
    name: z.string().min(2, 'Name is required'),
    email: z.string().email('Valid email required'),
    phone: z.string().optional(),
    department: z.string().min(1, 'Department is required'),
    year: z.string().min(1, 'Year is required'),
    sem: z.string().optional(),
    hostelBlock: z.string().optional(),
    roomNumber: z.string().min(1, 'Room number is required'),
    registeredFaceImage: z.string().optional(),
    faceEmbedding: z.array(z.number()).optional(),
  }),
});

router.post('/', authenticateToken, requireAdmin, validateRequest(createStudentSchema), StudentController.createStudent);
router.get('/', authenticateToken, requireAdmin, StudentController.getStudents);
router.get('/:id', authenticateToken, requireAdmin, StudentController.getStudentById);
router.put('/:id', authenticateToken, requireAdmin, StudentController.updateStudent);
router.delete('/:id', authenticateToken, requireAdmin, StudentController.deleteStudent);

export default router;
