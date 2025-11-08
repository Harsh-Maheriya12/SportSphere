import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configure the email transporter using nodemailer
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_EMAIL_PASSWORD,
  },
});

export default transporter;
