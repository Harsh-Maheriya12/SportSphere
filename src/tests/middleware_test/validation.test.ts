import { Request, Response, NextFunction } from "express";
import { validateRegister } from "../../middleware/validation";
import User, { IUser } from "../../models/User";
import AppError from "../../utils/AppError";

jest.mock('../../models/User');

const mockedUser = User as jest.Mocked<typeof User>;

describe('validation middleware (validateRegistration)', () => {

    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction;

    beforeEach(() => {
        mockRequest = {};
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        } as Partial<Response>;
        nextFunction = jest.fn() as unknown as NextFunction;
        jest.clearAllMocks();
    });

    const runMiddleware = async (middleware: any) => {
        if (Array.isArray(middleware)) {
            for (const fn of middleware) {
                await fn(mockRequest as Request, mockResponse as Response, nextFunction);

                // Look for an AppError or Error passed to next()
                const errorArg = (nextFunction as jest.Mock).mock.calls.find(
                    (call) => call[0] instanceof Error
                )?.[0];

                if (errorArg) break; // Stop only if an error was passed
            }
        } else {
            await middleware(mockRequest as Request, mockResponse as Response, nextFunction);
        }
    };

    it('should call next() if all fields are valid', async () => {
        mockRequest.body = { username: 'testuser123', email: 'test@user.com', password: 'password123' };
        mockedUser.findOne.mockResolvedValue(null);

        await runMiddleware(validateRegister);

        expect(nextFunction).toHaveBeenCalledWith(); // No error passed
    });

    it('should call next(AppError) if username is missing', async () => {
        mockRequest.body = { 
            email: 'test@user.com', 
            password: 'password123' 
        };
        mockedUser.findOne.mockResolvedValue(null);

        await runMiddleware(validateRegister);

        const calls = (nextFunction as jest.Mock).mock.calls;
        const errorArg = calls[calls.length - 1]?.[0];
        expect(errorArg).toBeInstanceOf(AppError);
        expect(errorArg.message).toBe('Validation failed');
        expect(errorArg.statusCode).toBe(400);
    });

    it('should call next(AppError) if email is invalid', async () => {
        mockRequest.body = { 
            username: 'testuser', 
            email: 'not-an-email', 
            password: 'password123' 
        };
        mockedUser.findOne.mockResolvedValue(null);

        await runMiddleware(validateRegister);

        const calls = (nextFunction as jest.Mock).mock.calls;
        const errorArg = calls[calls.length - 1]?.[0];
        expect(errorArg).toBeInstanceOf(AppError);
        expect(errorArg.message).toBe('Validation failed');
        expect(errorArg.statusCode).toBe(400);
    });

    it('should call next(AppError) if password is too short', async () => {
        mockRequest.body = { 
            username: 'testuser', 
            email: 'test@user.com', 
            password: '123' 
        };
        mockedUser.findOne.mockResolvedValue(null);

        await runMiddleware(validateRegister);

        const calls = (nextFunction as jest.Mock).mock.calls;
        const errorArg = calls[calls.length - 1]?.[0];
        expect(errorArg).toBeInstanceOf(AppError);
        expect(errorArg.message).toBe('Validation failed');
        expect(errorArg.statusCode).toBe(400);
    });

    it('should call next(AppError) if email already exists', async () => {
        mockRequest.body = { 
            username: 'testuser', 
            email: 'taken@example.com', 
            password: 'password123' 
        };
        mockedUser.findOne.mockResolvedValue({
            _id: 'existing-user-id',
            email: 'taken@example.com',
        } as unknown as IUser);

        await runMiddleware(validateRegister);

        const calls = (nextFunction as jest.Mock).mock.calls;
        const errorArg = calls[calls.length - 1]?.[0];
        expect(errorArg).toBeInstanceOf(AppError);
        expect(errorArg.details?.[0]?.msg).toBe('User already exists');
        expect(errorArg.statusCode).toBe(400);
    });

    it('should call next(AppError) with multiple validation errors', async () => {
        mockRequest.body = { 
            username: '', 
            email: 'not-an-email', 
            password: '123' 
        };

        await runMiddleware(validateRegister);

        const calls = (nextFunction as jest.Mock).mock.calls;
        const errorArg = calls[calls.length - 1]?.[0];
        expect(errorArg).toBeInstanceOf(AppError);
        expect(errorArg.message).toBe('Validation failed');
        expect(errorArg.statusCode).toBe(400);
    });

    it('should sanitize username by trimming and escaping', async () => {
        mockRequest.body = { 
            username: '  <script>test</script>  ', 
            email: 'test@example.com', 
            password: 'password123' 
        };
        mockedUser.findOne.mockResolvedValue(null);

        await runMiddleware(validateRegister);

        expect(nextFunction).toHaveBeenCalledWith();
        expect(mockRequest.body.username).toBe('&lt;script&gt;test&lt;&#x2F;script&gt;');
    });

    it('should normalize email to lowercase and trimmed', async () => {
        mockRequest.body = { 
            username: 'testuser', 
            email: '  TEST.USER@EXAMPLE.COM  ', 
            password: 'password123' 
        };
        mockedUser.findOne.mockResolvedValue(null);

        await runMiddleware(validateRegister);

        expect(nextFunction).toHaveBeenCalledWith();
        expect(mockRequest.body.email).toBe('  test.user@example.com  ');
    });
});