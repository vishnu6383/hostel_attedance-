import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { Student } from '../models/Student';
import { ENV } from '../config/env';

export class AuthController {
  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, registerNumber } = req.body;

      let user = null;
      if (email) {
        user = await User.findOne({ email: email.toLowerCase().trim() });
      } else if (registerNumber) {
        user = await User.findOne({ registerNumber: registerNumber.toUpperCase().trim() });
      }

      if (!user) {
        res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        res.status(401).json({ success: false, message: 'Invalid password.' });
        return;
      }

      // Generate JWT Token
      const token = jwt.sign(
        {
          id: user._id,
          email: user.email,
          role: user.role,
          name: user.name,
          registerNumber: user.registerNumber,
        },
        ENV.JWT_SECRET,
        { expiresIn: '12h' }
      );

      // If student role, fetch student details
      let studentDetails = null;
      if (user.role === 'STUDENT' && user.registerNumber) {
        studentDetails = await Student.findOne({ registerNumber: user.registerNumber });
      }

      res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          registerNumber: user.registerNumber,
          studentProfile: studentDetails,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: 'Login failed', error: err.message });
    }
  }

  public static async getProfile(req: any, res: Response): Promise<void> {
    try {
      const user = await User.findById(req.user.id).select('-password');
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }
      res.status(200).json({ success: true, user });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
}
