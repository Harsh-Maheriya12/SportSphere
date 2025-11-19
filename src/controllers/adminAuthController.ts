import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin';

export const registerAdmin = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body as { username: string; email: string; password: string };
    const existing = await Admin.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already in use' });

    const admin = new Admin({ username, email, password });
    await admin.save();

    return res.status(201).json({
      message: 'Registration successful',
      success: true,
      user: { username: admin.username, email: admin.email }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const loginAdmin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const payload = { id: (admin._id as string).toString(), email: admin.email, username: admin.username };
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET not set');
      return res.status(500).json({ message: 'Server configuration error' });
    }
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });

    return res.json({
      message: 'Login successful',
      token,
      user: { id: (admin._id as string).toString(), username: admin.username, email: admin.email }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};
