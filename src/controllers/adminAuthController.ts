import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export const loginAdmin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    // Validate environment variables are set
    if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
      console.error('ADMIN_EMAIL or ADMIN_PASSWORD not configured');
      return res.status(500).json({ message: 'Server configuration error: Admin credentials not configured' });
    }

    // Verify credentials against environment variables
    if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Create JWT payload for env-based admin
        const payload = {
          id: 'admin-env',
          email: process.env.ADMIN_EMAIL,
          username: process.env.ADMIN_USERNAME || 'Admin'
        };

        const secret = process.env.JWT_SECRET;
        if (!secret) {
          console.error('JWT_SECRET not set');
          return res.status(500).json({ message: 'Server configuration error' });
        }

    // Token expires in 7 days (session persists until browser closes or admin logs out)
    const token = jwt.sign(payload, secret, { expiresIn: '7d' });

    return res.json({
      message: 'Login successful',
      token,
      user: { 
        id: 'admin-env', 
        username: process.env.ADMIN_USERNAME || 'Admin', 
        email: process.env.ADMIN_EMAIL 
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};