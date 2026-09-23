import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { Student } from '../models/Student';
import { User } from '../models/User';
import { AIService } from '../services/aiService';
import bcrypt from 'bcrypt';

export class StudentController {
  /**
   * Add a new student record with optional face image & embedding
   */
  public static async createStudent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        studentId,
        registerNumber,
        name,
        email,
        phone,
        department,
        year,
        sem,
        hostelBlock,
        roomNumber,
        registeredFaceImage,
        faceEmbedding,
      } = req.body;

      const formattedReg = registerNumber.trim().toUpperCase();

      const existingReg = await Student.findOne({ registerNumber: formattedReg });
      if (existingReg) {
        res.status(400).json({ success: false, message: 'Register Number already exists.' });
        return;
      }

      const existingEmail = await Student.findOne({ email: email.toLowerCase().trim() });
      if (existingEmail) {
        res.status(400).json({ success: false, message: 'Email address already exists.' });
        return;
      }

      let extractedEmbedding: number[] = faceEmbedding || [];
      if ((!extractedEmbedding || extractedEmbedding.length === 0) && registeredFaceImage) {
        const aiRes = await AIService.extractEmbedding(registeredFaceImage);
        if (aiRes && aiRes.success && aiRes.embedding) {
          extractedEmbedding = aiRes.embedding;
        }
      }

      const student = await Student.create({
        studentId: studentId || `STU-${Date.now().toString().slice(-6)}`,
        registerNumber: formattedReg,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone ? phone.trim() : '',
        department,
        year,
        sem: sem || 'Sem 1',
        hostelBlock: hostelBlock || 'Block A',
        roomNumber,
        registeredFaceImage: registeredFaceImage || '',
        faceEmbedding: extractedEmbedding,
        status: 'ACTIVE',
      });

      // Create associated Student Auth Account if missing
      const hashedPassword = await bcrypt.hash('student123', 10);
      await User.create({
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        name: name.trim(),
        role: 'STUDENT',
        registerNumber: formattedReg,
      }).catch(() => {}); // Ignore duplicate user creation if exists

      res.status(201).json({
        success: true,
        message: 'Student registered successfully.',
        student,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Failed to create student', error: err.message });
    }
  }

  /**
   * Get list of students with search & filter
   */
  public static async getStudents(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { search, block, room, department } = req.query;
      const query: any = { status: 'ACTIVE' };

      if (search) {
        query.$or = [
          { registerNumber: new RegExp(String(search), 'i') },
          { name: new RegExp(String(search), 'i') },
          { email: new RegExp(String(search), 'i') },
          { phone: new RegExp(String(search), 'i') },
        ];
      }

      if (block) query.hostelBlock = String(block);
      if (room) query.roomNumber = String(room);
      if (department) query.department = String(department);

      const dbStudents = await Student.find(query).sort({ registerNumber: 1 });
      const students = dbStudents.map((s) => ({
        ...s.toObject(),
        hasFaceEmbedding: Boolean(s.registeredFaceImage || (s.faceEmbedding && s.faceEmbedding.length > 0)),
      }));

      res.status(200).json({ success: true, count: students.length, students });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Get student details by ID
   */
  public static async getStudentById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const student = await Student.findById(req.params.id);
      if (!student) {
        res.status(404).json({ success: false, message: 'Student not found' });
        return;
      }
      res.status(200).json({ success: true, student });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Update student details
   */
  public static async updateStudent(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.body.registeredFaceImage && (!req.body.faceEmbedding || req.body.faceEmbedding.length === 0)) {
        const aiRes = await AIService.extractEmbedding(req.body.registeredFaceImage);
        if (aiRes && aiRes.success && aiRes.embedding) {
          req.body.faceEmbedding = aiRes.embedding;
        }
      }
      const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!student) {
        res.status(404).json({ success: false, message: 'Student not found' });
        return;
      }
      res.status(200).json({ success: true, message: 'Student updated successfully', student });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }

  /**
   * Soft-delete student
   */
  public static async deleteStudent(req: AuthRequest, res: Response): Promise<void> {
    try {
      const student = await Student.findByIdAndUpdate(req.params.id, { status: 'INACTIVE' });
      if (!student) {
        res.status(404).json({ success: false, message: 'Student not found' });
        return;
      }
      res.status(200).json({ success: true, message: 'Student deactivated successfully' });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
