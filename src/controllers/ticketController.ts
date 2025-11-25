import { Request, Response } from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import Ticket from '../models/Ticket';
import { uploadToCloudinary } from '../utils/cloudinaryUploader';

// Allow user-aware operations: if a request is authenticated, `req.user` will be populated

export const createTicket = async (req: Request, res: Response) => {
  // Basic request validation
  const errors: Record<string, string> = {};
  const { subject, category, description, userName, userEmail } = req.body;
  if (!subject || typeof subject !== 'string' || !subject.trim()) errors.subject = 'Subject is required';
  if (!category || typeof category !== 'string' || !category.trim()) errors.category = 'Category is required';
  if (!description || typeof description !== 'string' || !description.trim()) errors.description = 'Description is required';

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  try {
    // Handle multiple files from multer (using .any() which supports multiple files)
    // Files are stored in req.files by multer, not in req.body
    const uploadedFiles = (req as any).files || [];
    const filesArr: any[] = [];
    
    // Upload files to Cloudinary and get URLs
    const fileUploadPromises = uploadedFiles.map(async (f: any) => {
      const tempFilePath = path.join('tmp/uploads/sportsphere', f.filename);
      const fileType = f.mimetype.startsWith('image/') ? 'image' : f.mimetype === 'application/pdf' ? 'pdf' : 'doc';
      
      try {
        // Upload to Cloudinary (this also deletes the temp file)
        const cloudinaryUrl = await uploadToCloudinary(tempFilePath, 'tickets');
        return {
          name: f.originalname,
          type: fileType,
          preview: cloudinaryUrl, // Store Cloudinary URL instead of local path
        };
      } catch (uploadErr) {
        console.error(`Failed to upload file ${f.originalname} to Cloudinary:`, uploadErr);
        // If Cloudinary upload fails, try to clean up temp file
        try {
          await fs.promises.unlink(tempFilePath);
        } catch (unlinkErr) {
          if ((unlinkErr as any).code !== 'ENOENT') {
            console.error(`Failed to delete temp file ${tempFilePath}:`, unlinkErr);
          }
        }
        throw new Error(`Failed to upload file ${f.originalname}`);
      }
    });

    // Wait for all files to be uploaded to Cloudinary
    const uploadedFileData = await Promise.all(fileUploadPromises);
    filesArr.push(...uploadedFileData);

    // For backward compatibility, set attachment to first file if exists
    const attachmentPath = filesArr.length > 0 ? filesArr[0].preview : null;

    const createPayload: any = { subject, category, description, userName, userEmail, files: filesArr };
    if (attachmentPath) createPayload.attachment = attachmentPath;

    // If the request was made by an authenticated user, attach their id and default name/email
    const reqUser = (req as any).user;
    if (reqUser) {
      createPayload.user = reqUser._id;
      if (!createPayload.userName) createPayload.userName = reqUser.username || '';
      if (!createPayload.userEmail) createPayload.userEmail = reqUser.email || '';
    }

    const ticket = await Ticket.create(createPayload);
    
    // Files are saved and referenced in the database
    // They remain in uploads/temp for serving via static middleware
    // No cleanup needed here as files are actively used by the ticket
    
    return res.status(201).json({ message: 'Ticket submitted successfully', ticket });
  } catch (err: any) {
    console.error('createTicket error', err);
    
    // Clean up any remaining temp files if ticket creation failed
    const uploadedFiles = (req as any).files || [];
    for (const f of uploadedFiles) {
      const filePath = path.join('tmp/uploads/sportsphere', f.filename);
      try {
        await fs.promises.access(filePath);
        await fs.promises.unlink(filePath);
      } catch (unlinkErr: any) {
        if (unlinkErr.code !== 'ENOENT') {
          console.error(`Failed to delete temp file ${filePath} after error:`, unlinkErr);
        }
      }
    }
    
    if (err.name === 'ValidationError') {
      const vErrors: Record<string, string> = {};
      for (const key in err.errors) {
        vErrors[key] = err.errors[key].message;
      }
      return res.status(400).json({ message: 'Validation failed', errors: vErrors });
    }
    return res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const getMyTickets = async (req: Request, res: Response) => {
  try {
    const reqUser = (req as any).user;
    if (!reqUser) return res.status(401).json({ message: 'Not authenticated' });

    // Return tickets that either belong to the user by reference
    // or match the user's email (covers tickets created without authentication)
    const query: any = { $or: [{ user: reqUser._id }] };
    if (reqUser.email && typeof reqUser.email === 'string') {
      // Case-insensitive exact match for email. Escape user input for safe regex.
      const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const emailRegex = new RegExp(`^${escapeRegExp(reqUser.email)}$`, 'i');
      query.$or.push({ userEmail: emailRegex });
    }

    const tickets = await Ticket.find(query).sort({ createdAt: -1 });
    return res.json({ tickets });
  } catch (err) {
    console.error('getMyTickets error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getTicketById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid ticket id' });
  try {
    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const reqUser = (req as any).user;
    if (!reqUser) return res.status(401).json({ message: 'Not authenticated' });

    // Allow access if the ticket belongs to the user (by user reference) or matches the user's email
    const isOwner = ticket.user ? ticket.user.toString() === reqUser._id.toString() : false;
    const emailMatches = ticket.userEmail && reqUser.email && ticket.userEmail.toLowerCase() === reqUser.email.toLowerCase();
    if (!isOwner && !emailMatches) {
      return res.status(403).json({ message: 'You do not have permission to view this ticket' });
    }

    return res.json({ ticket });
  } catch (err) {
    console.error('getTicketById error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getAllTickets = async (req: Request, res: Response) => {
  try {
    const tickets = await Ticket.find().sort({ createdAt: -1 });
    return res.json({ tickets });
  } catch (err) {
    console.error('getAllTickets error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const replyToTicket = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { message } = req.body as { message: string };
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ message: 'Validation failed', errors: { message: 'Reply message is required' } });
  }
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid ticket id' });
  try {
    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    const author = (req as any).user?.username || 'admin';
    ticket.replies.push({ message, date: new Date(), author });
    ticket.status = 'Replied';
    await ticket.save();
    return res.json({ message: 'Reply added', ticket });
  } catch (err) {
    console.error('replyToTicket error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const closeTicket = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid ticket id' });
  try {
    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    ticket.status = 'Closed';
    await ticket.save();
    return res.json({ message: 'Ticket closed', ticket });
  } catch (err) {
    console.error('closeTicket error', err);
    return res.status(500).json({ message: 'Server error' });
  }
};