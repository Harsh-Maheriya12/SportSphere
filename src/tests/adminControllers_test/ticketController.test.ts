import { Request, Response } from 'express';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import Ticket from '../../models/Ticket';
import {
  createTicket,
  getMyTickets,
  getTicketById,
  getAllTickets,
  replyToTicket,
  closeTicket,
} from '../../controllers/ticketController';
import { uploadToCloudinary } from '../../utils/cloudinaryUploader';

jest.mock('../../models/Ticket');
jest.mock('../../utils/cloudinaryUploader');
jest.mock('fs', () => ({
  promises: {
    unlink: jest.fn(),
    access: jest.fn(),
  },
}));

describe('Ticket Controllers - ticketController.ts', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  const makeRes = () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { status, json } as unknown as Response;
  };

  beforeEach(() => {
    jest.resetAllMocks();
    req = {} as Partial<Request>;
    res = makeRes();
  });

  // ---------------- HAPPY PATHS - CREATE TICKET ----------------
  describe('Happy Paths - createTicket', () => {
    it('should create a ticket with uploaded files and return 201', async () => {
      const mockUrl = 'https://cloudinary/test.jpg';
      (uploadToCloudinary as jest.Mock).mockResolvedValue(mockUrl);

      const fakeTicket = { _id: 't1', subject: 'S' };
      (Ticket as any).create = jest.fn().mockResolvedValue(fakeTicket);

      req.body = {
        subject: 'Subject',
        category: 'Category',
        description: 'Description',
        userName: 'User',
        userEmail: 'user@test.com',
      } as any;
      (req as any).files = [
        {
          filename: 'file1.jpg',
          originalname: 'file1.jpg',
          mimetype: 'image/jpeg',
        },
      ];
      (req as any).user = {
        _id: 'user123',
        username: 'User123',
        email: 'user123@test.com',
      };

      await createTicket(req as Request, res as Response);

      const expectedPath = path.join('tmp', 'uploads', 'sportsphere', 'file1.jpg');

      expect(uploadToCloudinary).toHaveBeenCalledWith(
        expectedPath,
        'tickets'
      );
      expect(Ticket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Subject',
          category: 'Category',
          description: 'Description',
          files: expect.arrayContaining([
            expect.objectContaining({
              name: 'file1.jpg',
              type: 'image',
              preview: mockUrl,
            }),
          ]),
          user: 'user123',
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Ticket submitted successfully',
        ticket: fakeTicket,
      });
    });

    it('should attach userName and userEmail from req.user if not provided', async () => {
      const mockUrl = 'https://cloudinary/test.jpg';
      (uploadToCloudinary as jest.Mock).mockResolvedValue(mockUrl);

      const fakeTicket = { _id: 't2', subject: 'S2' };
      (Ticket as any).create = jest.fn().mockResolvedValue(fakeTicket);

      req.body = {
        subject: 'Subject 2',
        category: 'Category 2',
        description: 'Description 2',
      } as any;
      (req as any).files = [];
      (req as any).user = {
        _id: 'userABC',
        username: 'NameFromUser',
        email: 'fromuser@test.com',
      };

      await createTicket(req as Request, res as Response);

      expect(Ticket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: 'userABC',
          userName: 'NameFromUser',
          userEmail: 'fromuser@test.com',
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  // ------------- EDGE CASES & ERROR HANDLING - CREATE -------------
  describe('Edge Cases & Error Handling - createTicket', () => {
    it('should return 400 when required fields are missing', async () => {
      req.body = {
        subject: '',
        category: '',
        description: '',
      } as any;
      (req as any).files = [];

      await createTicket(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Validation failed',
          errors: expect.any(Object),
        })
      );
    });

    it('should cleanup temp files and return 500 when Cloudinary upload fails', async () => {
      (uploadToCloudinary as jest.Mock).mockRejectedValue(
        new Error('Cloudinary error')
      );

      (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

      req.body = {
        subject: 'Subject',
        category: 'Category',
        description: 'Description',
      } as any;
      (req as any).files = [
        {
          filename: 'file1.jpg',
          originalname: 'file1.jpg',
          mimetype: 'image/jpeg',
        },
      ];

      await createTicket(req as Request, res as Response);

      const expectedPath = path.join('tmp', 'uploads', 'sportsphere', 'file1.jpg');

      expect(fs.promises.unlink).toHaveBeenCalledWith(
        expectedPath
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Failed to upload file'),
        })
      );
    });

    it('should handle mongoose ValidationError from Ticket.create with 400', async () => {
      (uploadToCloudinary as jest.Mock).mockResolvedValue(
        'https://cloudinary/test.jpg'
      );

      const validationError: any = {
        name: 'ValidationError',
        errors: {
          subject: { message: 'Subject is required' },
        },
      };
      (Ticket as any).create = jest.fn().mockRejectedValue(validationError);

      req.body = {
        subject: 'S',
        category: 'C',
        description: 'D',
      } as any;
      (req as any).files = [];

      await createTicket(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Validation failed',
        errors: { subject: 'Subject is required' },
      });
    });

    it('should return 500 on generic error from Ticket.create and cleanup temp files', async () => {
      (uploadToCloudinary as jest.Mock).mockResolvedValue(
        'https://cloudinary/test.jpg'
      );
      (Ticket as any).create = jest
        .fn()
        .mockRejectedValue(new Error('DB down'));

      (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
      (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

      req.body = {
        subject: 'S',
        category: 'C',
        description: 'D',
      } as any;
      (req as any).files = [
        {
          filename: 'file1.jpg',
          originalname: 'file1.jpg',
          mimetype: 'image/jpeg',
        },
      ];

      await createTicket(req as Request, res as Response);

      const expectedPath = path.join('tmp', 'uploads', 'sportsphere', 'file1.jpg');

      expect(fs.promises.access).toHaveBeenCalledWith(
        expectedPath
      );
      expect(fs.promises.unlink).toHaveBeenCalledWith(
        expectedPath
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: 'DB down',
      });
    });
  });

  // ---------------- HAPPY PATHS - getMyTickets ----------------
  describe('Happy Paths - getMyTickets', () => {
    it('should return tickets for authenticated user', async () => {
      const userId = new mongoose.Types.ObjectId();
      (req as any).user = { _id: userId, email: 'user@test.com' };

      const fakeTickets = [{ _id: 't1' }, { _id: 't2' }];
      (Ticket as any).find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(fakeTickets),
      });

      await getMyTickets(req as Request, res as Response);

      expect(Ticket.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.any(Array),
        })
      );
      expect(res.json).toHaveBeenCalledWith({ tickets: fakeTickets });
    });
  });

  // -------- EDGE CASES & ERROR HANDLING - getMyTickets --------
  describe('Edge Cases & Error Handling - getMyTickets', () => {
    it('should return 401 when user is not authenticated', async () => {
      (req as any).user = undefined;

      await getMyTickets(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated' });
    });

    it('should return 500 on unexpected error', async () => {
      const userId = new mongoose.Types.ObjectId();
      (req as any).user = { _id: userId, email: 'user@test.com' };

      (Ticket as any).find = jest.fn().mockImplementation(() => {
        throw new Error('DB error');
      });

      await getMyTickets(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });

  // ----------------- HAPPY PATHS - getTicketById ---------------
  describe('Happy Paths - getTicketById', () => {
    it('should return ticket when user owns it', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      const userId = new mongoose.Types.ObjectId();

      const ticket: any = {
        _id: id,
        user: userId,
        userEmail: 'owner@test.com',
      };

      (Ticket as any).findById = jest.fn().mockResolvedValue(ticket);

      (req as any).params = { id };
      (req as any).user = { _id: userId, email: 'owner@test.com' };

      await getTicketById(req as Request, res as Response);

      expect(Ticket.findById).toHaveBeenCalledWith(id);
      expect(res.json).toHaveBeenCalledWith({ ticket });
    });

    it('should return ticket when email matches userEmail', async () => {
      const id = new mongoose.Types.ObjectId().toString();

      const ticket: any = {
        _id: id,
        user: null,
        userEmail: 'owner@test.com',
      };

      (Ticket as any).findById = jest.fn().mockResolvedValue(ticket);

      (req as any).params = { id };
      (req as any).user = { _id: new mongoose.Types.ObjectId(), email: 'OWNER@test.com' };

      await getTicketById(req as Request, res as Response);

      expect(res.json).toHaveBeenCalledWith({ ticket });
    });
  });

  // ------ EDGE CASES & ERROR HANDLING - getTicketById ------
  describe('Edge Cases & Error Handling - getTicketById', () => {
    it('should return 400 for invalid ObjectId', async () => {
      (req as any).params = { id: 'notvalid' };

      await getTicketById(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid ticket id' });
    });

    it('should return 404 when ticket not found', async () => {
      const id = new mongoose.Types.ObjectId().toString();

      (Ticket as any).findById = jest.fn().mockResolvedValue(null);
      (req as any).params = { id };
      (req as any).user = { _id: new mongoose.Types.ObjectId(), email: 'a@b.com' };

      await getTicketById(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Ticket not found' });
    });

    it('should return 401 when no user on request', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      const ticket: any = { _id: id, user: null, userEmail: 'owner@test.com' };

      (Ticket as any).findById = jest.fn().mockResolvedValue(ticket);
      (req as any).params = { id };
      (req as any).user = undefined;

      await getTicketById(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated' });
    });

    it('should return 403 when user is not owner and email does not match', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      const ticket: any = {
        _id: id,
        user: new mongoose.Types.ObjectId(),
        userEmail: 'someone@test.com',
      };

      (Ticket as any).findById = jest.fn().mockResolvedValue(ticket);

      (req as any).params = { id };
      (req as any).user = {
        _id: new mongoose.Types.ObjectId(),
        email: 'different@test.com',
      };

      await getTicketById(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'You do not have permission to view this ticket',
      });
    });

    it('should return 500 on unexpected error', async () => {
      const id = new mongoose.Types.ObjectId().toString();

      (Ticket as any).findById = jest.fn().mockRejectedValue(new Error('DB error'));

      (req as any).params = { id };
      (req as any).user = {
        _id: new mongoose.Types.ObjectId(),
        email: 'user@test.com',
      };

      await getTicketById(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });

  // ---------------- HAPPY PATHS - getAllTickets ---------------
  describe('Happy Paths - getAllTickets', () => {
    it('should return all tickets', async () => {
      const fakeTickets = [{ _id: 't1' }, { _id: 't2' }];

      (Ticket as any).find = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(fakeTickets),
      });

      await getAllTickets(req as Request, res as Response);

      expect(Ticket.find).toHaveBeenCalledWith();
      expect(res.json).toHaveBeenCalledWith({ tickets: fakeTickets });
    });
  });

  // ------ EDGE CASES & ERROR HANDLING - getAllTickets ------
  describe('Edge Cases & Error Handling - getAllTickets', () => {
    it('should return 500 on error', async () => {
      (Ticket as any).find = jest.fn().mockImplementation(() => {
        throw new Error('DB error');
      });

      await getAllTickets(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });

  // ---------------- HAPPY PATHS - replyToTicket ---------------
  describe('Happy Paths - replyToTicket', () => {
    it('should add reply and set status to Replied', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      const ticket: any = {
        _id: id,
        replies: [],
        status: 'Open',
        save: jest.fn().mockResolvedValue(true),
      };

      (Ticket as any).findById = jest.fn().mockResolvedValue(ticket);

      (req as any).params = { id };
      req.body = { message: 'Hello' } as any;
      (req as any).user = { username: 'AdminUser' };

      await replyToTicket(req as Request, res as Response);

      expect(ticket.replies.length).toBe(1);
      expect(ticket.replies[0].message).toBe('Hello');
      expect(ticket.replies[0].author).toBe('AdminUser');
      expect(ticket.status).toBe('Replied');
      expect(ticket.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: 'Reply added',
        ticket,
      });
    });
  });

  // ------ EDGE CASES & ERROR HANDLING - replyToTicket ------
  describe('Edge Cases & Error Handling - replyToTicket', () => {
    it('should return 400 when message is missing or empty', async () => {
      (req as any).params = { id: new mongoose.Types.ObjectId().toString() };
      req.body = { message: '   ' } as any;

      await replyToTicket(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Validation failed',
        errors: { message: 'Reply message is required' },
      });
    });

    it('should return 400 for invalid ticket id', async () => {
      (req as any).params = { id: 'invalid-id' };
      req.body = { message: 'Hi' } as any;

      await replyToTicket(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid ticket id',
      });
    });

    it('should return 404 when ticket not found', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      (Ticket as any).findById = jest.fn().mockResolvedValue(null);

      (req as any).params = { id };
      req.body = { message: 'Hi' } as any;

      await replyToTicket(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Ticket not found',
      });
    });

    it('should return 500 on unexpected error', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      (Ticket as any).findById = jest
        .fn()
        .mockRejectedValue(new Error('DB error'));

      (req as any).params = { id };
      req.body = { message: 'Hi' } as any;

      await replyToTicket(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });

  // ---------------- HAPPY PATHS - closeTicket ---------------
  describe('Happy Paths - closeTicket', () => {
    it('should close ticket successfully', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      const ticket: any = {
        _id: id,
        status: 'Open',
        save: jest.fn().mockResolvedValue(true),
      };

      (Ticket as any).findById = jest.fn().mockResolvedValue(ticket);

      (req as any).params = { id };

      await closeTicket(req as Request, res as Response);

      expect(ticket.status).toBe('Closed');
      expect(ticket.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: 'Ticket closed',
        ticket,
      });
    });
  });

  // ------ EDGE CASES & ERROR HANDLING - closeTicket ------
  describe('Edge Cases & Error Handling - closeTicket', () => {
    it('should return 400 for invalid ticket id', async () => {
      (req as any).params = { id: 'invalid-id' };

      await closeTicket(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Invalid ticket id',
      });
    });

    it('should return 404 when ticket not found', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      (Ticket as any).findById = jest.fn().mockResolvedValue(null);

      (req as any).params = { id };

      await closeTicket(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Ticket not found',
      });
    });

    it('should return 500 on unexpected error', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      (Ticket as any).findById = jest
        .fn()
        .mockRejectedValue(new Error('DB error'));

      (req as any).params = { id };

      await closeTicket(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Server error' });
    });
  });
});

  //Mutation Fixes
  // The following tests target specific logic branches and edge cases
  // to kill surviving mutants and increase coverage.

  describe('Mutation Fixes - Deep Logic Coverage', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;

    // Helper to create a chainable mock for Mongoose queries (find().sort())
    const mockMongooseChain = (data: any) => {
        return {
            sort: jest.fn().mockResolvedValue(data)
        };
    };

    const makeRes = () => {
        const json = jest.fn();
        const status = jest.fn().mockReturnValue({ json });
        return { status, json } as unknown as Response;
    };

    beforeEach(() => {
        // 1. Reset everything to clean slate
        jest.resetAllMocks();
        
        // 2. Re-initialize Request/Response
        req = {
            body: {},
            params: {},
            // Default to empty files to prevent path.join crashes
            files: [] 
        } as any;
        res = makeRes();
        
        // 3. Setup Robust Mocks to prevent DB/Type Errors
        // Fixes "Cannot read property 'sort' of undefined"
        (Ticket as any).find = jest.fn().mockReturnValue(mockMongooseChain([]));
        // Fixes "Ticket.findById is not a function" or undefined
        (Ticket as any).findById = jest.fn().mockResolvedValue(null);
        // Fixes "Ticket.create" errors
        (Ticket as any).create = jest.fn().mockResolvedValue({ _id: 'mock_ticket' });
        // Fixes Cloudinary errors
        (uploadToCloudinary as jest.Mock).mockResolvedValue('http://mock-url.com');
        // Fixes FS errors
        (fs.promises.unlink as jest.Mock).mockResolvedValue(undefined);
        (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
    });

    // --- TESTS ---

    // Fixes: Mutants removing individual field checks
    it('should fail specifically if ONLY subject is missing', async () => {
      req.body = {
        category: 'C',
        description: 'D',
        // subject is missing
      } as any;
      
      await createTicket(req as Request, res as Response);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: expect.objectContaining({ subject: 'Subject is required' }),
        })
      );
      // Ensure category error is NOT present
      expect(res.json).not.toHaveBeenCalledWith(
        expect.objectContaining({
            errors: expect.objectContaining({ category: 'Category is required' })
        })
      );
    });

    it('should fail specifically if ONLY category is missing', async () => {
        req.body = { subject: 'S', description: 'D' } as any;
        await createTicket(req as Request, res as Response);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
          expect.objectContaining({ errors: expect.objectContaining({ category: 'Category is required' }) })
        );
    });

    // Fixes: Mutants changing condition "startWith('image/')" or the 'pdf' check
    it('should correctly identify PDF and DOC file types', async () => {
        req.body = { subject: 'S', category: 'C', description: 'D' } as any;
        (req as any).user = { _id: 'u1' };
        
        // IMPORTANT: 'filename' MUST be present to prevent path.join error
        (req as any).files = [
            { filename: 'a.pdf', originalname: 'a.pdf', mimetype: 'application/pdf' },
            { filename: 'b.doc', originalname: 'b.doc', mimetype: 'application/msword' }
        ];

        await createTicket(req as Request, res as Response);

        expect(Ticket.create).toHaveBeenCalledWith(expect.objectContaining({
            files: expect.arrayContaining([
                expect.objectContaining({ type: 'pdf' }),  // Kills mutant changing 'pdf' logic
                expect.objectContaining({ type: 'doc' })   // Kills mutant changing default 'doc'
            ])
        }));
    });

    // Fixes: "No Coverage" in the catch block where unlink fails
    it('should log error but continue if temp file cleanup fails during error handling', async () => {
        // Force main logic to fail
        (Ticket as any).create = jest.fn().mockRejectedValue(new Error('Main Error'));
        
        // Mock file existence to enter the cleanup loop
        (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
        
        // Force unlink to fail with a non-ENOENT error (triggering the console.error)
        const unlinkError: any = new Error('Permission Denied');
        unlinkError.code = 'EACCES'; 
        (fs.promises.unlink as jest.Mock).mockRejectedValue(unlinkError);

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        req.body = { subject: 'S', category: 'C', description: 'D' } as any;
        // Provide filename to prevent path.join error earlier in the process
        (req as any).files = [{ filename: 'f.jpg', originalname: 'f.jpg', mimetype: 'image/jpeg' }];

        await createTicket(req as Request, res as Response);

        // Verify we hit the deep catch block
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('Failed to delete temp file'), 
            expect.any(Error)
        );
        expect(res.status).toHaveBeenCalledWith(500);
        
        consoleSpy.mockRestore();
    });

    // Fixes: Mutants removing the 'i' flag or changing regex construction
    it('should match userEmail case-insensitively in getMyTickets', async () => {
        const userId = new mongoose.Types.ObjectId();
        (req as any).user = { _id: userId, email: 'USER@TEST.COM' };

        // Ensure .find returns the chainable object we defined in beforeEach
        (Ticket as any).find = jest.fn().mockReturnValue(mockMongooseChain([]));

        await getMyTickets(req as Request, res as Response);

        expect(res.json).toHaveBeenCalled();

        // Inspect the arguments passed to find()
        const calls = (Ticket as any).find.mock.calls;
        const query = calls[0][0];
        
        // Extract the regex used for userEmail
        const emailQuery = query.$or.find((q: any) => q.userEmail);
        const emailRegex = emailQuery ? emailQuery.userEmail : null;
        
        // Assert the regex actually works case-insensitively
        expect(emailRegex).toBeDefined();
        expect(emailRegex.test('user@test.com')).toBe(true); 
        expect(emailRegex.test('USER@test.com')).toBe(true);
    });

    // Fixes: Mutants forcing "isOwner" true/false or removing null checks
    it('should correctly handle tickets created by deleted users (ticket.user is null)', async () => {
        const id = new mongoose.Types.ObjectId().toString();
        // Ticket has no user reference (null)
        const ticket: any = { _id: id, user: null, userEmail: 'other@test.com' };
        
        (Ticket as any).findById = jest.fn().mockResolvedValue(ticket);
        (req as any).params = { id };
        (req as any).user = { _id: new mongoose.Types.ObjectId(), email: 'me@test.com' };

        await getTicketById(req as Request, res as Response);

        // Should be 403 because user is null (so not owner) and email doesn't match
        expect(res.status).toHaveBeenCalledWith(403);
    });

    // Fixes: Mutants removing the "|| 'admin'" fallback
    it('should default author to "admin" if req.user is missing during reply', async () => {
        const id = new mongoose.Types.ObjectId().toString();
        const ticket: any = { 
            _id: id, 
            replies: [], 
            status: 'Open', 
            save: jest.fn() 
        };
        
        (Ticket as any).findById = jest.fn().mockResolvedValue(ticket);
        (req as any).params = { id };
        req.body = { message: 'Admin reply' };
        // Simulate no user in request
        (req as any).user = undefined; 

        await replyToTicket(req as Request, res as Response);

        expect(ticket.replies[0].author).toBe('admin');
    });
  });
