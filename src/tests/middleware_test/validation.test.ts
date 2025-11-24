import { Request, Response, NextFunction } from "express";
import { validateRegister } from "../../middleware/validation";
import User, { IUser } from "../../models/User";
import { expectNextSuccess } from "../utils/expectHelpers";

jest.mock('../../models/User');

const mockedUser = User as jest.Mocked<typeof User>;

describe('validation middleware (validateRegister)', () => {

    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: jest.MockedFunction<NextFunction>;

    beforeEach(() => {
        mockRequest = {};
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        } as Partial<Response>;
        nextFunction = jest.fn() as jest.MockedFunction<NextFunction>;
        jest.clearAllMocks();
    });

    const runMiddleware = async (middleware: any) => {
        if (Array.isArray(middleware)) {
            for (const fn of middleware) {
                await fn(mockRequest as Request, mockResponse as Response, nextFunction);

                // Stop if response was sent (validation failed)
                if ((mockResponse.status as jest.Mock).mock.calls.length > 0) {
                    break;
                }

                // Stop if next() was called with error
                const errorArg = (nextFunction as jest.Mock).mock.calls.find(
                    (call) =>
                        call[0] instanceof Error ||
                        (call[0] && typeof call[0] === "object" && "statusCode" in call[0])
                )?.[0];

                if (errorArg) break;
            }
        } else {
            await middleware(mockRequest as Request, mockResponse as Response, nextFunction);
        }
    };

    // ===== SUCCESS CASES =====

    it('should call next() if all fields are valid', async () => {
        mockRequest.body = {
            username: 'testuser123',
            email: 'test@user.com',
            password: 'password123',
            role: 'player',
            age: 25,
            gender: 'male'
        };
        mockedUser.findOne.mockResolvedValue(null);

        await runMiddleware(validateRegister);

        expectNextSuccess(nextFunction);
    });

    // ===== VALIDATION ERROR CASES =====

    it('should return 400 if username is missing', async () => {
        mockRequest.body = {
            email: 'test@user.com',
            password: 'password123',
            role: 'player',
            age: 25,
            gender: 'male'
        };
        mockedUser.findOne.mockResolvedValue(null);

        await runMiddleware(validateRegister);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: 'Validation failed',
                errors: expect.any(Array)
            })
        );
    });

    it('should return 400 if email is invalid', async () => {
        mockRequest.body = {
            username: 'testuser',
            email: 'not-an-email',
            password: 'password123',
            role: 'player',
            age: 25,
            gender: 'male'
        };
        mockedUser.findOne.mockResolvedValue(null);

        await runMiddleware(validateRegister);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: 'Validation failed',
                errors: expect.any(Array)
            })
        );
    });

    it('should return 400 if password is too short', async () => {
        mockRequest.body = {
            username: 'testuser',
            email: 'test@user.com',
            password: '123',
            role: 'player',
            age: 25,
            gender: 'male'
        };
        mockedUser.findOne.mockResolvedValue(null);

        await runMiddleware(validateRegister);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: 'Validation failed',
                errors: expect.any(Array)
            })
        );
    });

    it('should return 400 if email already exists', async () => {
        mockRequest.body = {
            username: 'testuser',
            email: 'taken@example.com',
            password: 'password123',
            role: 'player',
            age: 25,
            gender: 'male'
        };
        mockedUser.findOne.mockResolvedValue({
            _id: 'existing-user-id',
            email: 'taken@example.com',
        } as unknown as IUser);

        await runMiddleware(validateRegister);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: 'Validation failed',
                errors: expect.any(Array)
            })
        );
    });

    it('should return 400 with multiple validation errors', async () => {
        mockRequest.body = {
            username: '',
            email: 'not-an-email',
            password: '123',
            role: 'invalid-role',
            age: 10,
            gender: 'invalid'
        };

        await runMiddleware(validateRegister);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: 'Validation failed',
                errors: expect.any(Array)
            })
        );
    });

    // ===== ROLE VALIDATION =====

    it('should return 400 if role is missing', async () => {
        mockRequest.body = {
            username: 'testuser',
            email: 'test@user.com',
            password: 'password123',
            age: 25,
            gender: 'male'
        };
        mockedUser.findOne.mockResolvedValue(null);

        await runMiddleware(validateRegister);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: 'Validation failed',
                errors: expect.arrayContaining([
                    expect.objectContaining({
                        msg: expect.stringContaining('Role')
                    })
                ])
            })
        );
    });

    it('should return 400 if role is invalid', async () => {
        mockRequest.body = {
            username: 'testuser',
            email: 'test@user.com',
            password: 'password123',
            role: 'invalid-role',
            age: 25,
            gender: 'male'
        };
        mockedUser.findOne.mockResolvedValue(null);

        await runMiddleware(validateRegister);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: 'Validation failed'
            })
        );
    });

    // ===== AGE VALIDATION =====

    it('should return 400 if age is missing', async () => {
        mockRequest.body = {
            username: 'testuser',
            email: 'test@user.com',
            password: 'password123',
            role: 'player',
            gender: 'male'
        };
        mockedUser.findOne.mockResolvedValue(null);

        await runMiddleware(validateRegister);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: 'Validation failed'
            })
        );
    });

    it('should return 400 if age is less than 13', async () => {
        mockRequest.body = {
            username: 'testuser',
            email: 'test@user.com',
            password: 'password123',
            role: 'player',
            age: 10,
            gender: 'male'
        };
        mockedUser.findOne.mockResolvedValue(null);

        await runMiddleware(validateRegister);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: 'Validation failed'
            })
        );
    });

    it('should return 400 if age is greater than 120', async () => {
        mockRequest.body = {
            username: 'testuser',
            email: 'test@user.com',
            password: 'password123',
            role: 'player',
            age: 150,
            gender: 'male'
        };
        mockedUser.findOne.mockResolvedValue(null);

        await runMiddleware(validateRegister);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: 'Validation failed'
            })
        );
    });

    // ===== GENDER VALIDATION =====

    it('should return 400 if gender is missing', async () => {
        mockRequest.body = {
            username: 'testuser',
            email: 'test@user.com',
            password: 'password123',
            role: 'player',
            age: 25
        };
        mockedUser.findOne.mockResolvedValue(null);

        await runMiddleware(validateRegister);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: 'Validation failed'
            })
        );
    });

    it('should return 400 if gender is invalid', async () => {
        mockRequest.body = {
            username: 'testuser',
            email: 'test@user.com',
            password: 'password123',
            role: 'player',
            age: 25,
            gender: 'invalid-gender'
        };
        mockedUser.findOne.mockResolvedValue(null);

        await runMiddleware(validateRegister);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                message: 'Validation failed'
            })
        );
    });

    // ===== SANITIZATION TESTS =====

    it('should sanitize username by trimming and escaping', async () => {
        mockRequest.body = {
            username: '  <script>test</script>  ',
            email: 'test@example.com',
            password: 'password123',
            role: 'player',
            age: 25,
            gender: 'male'
        };
        mockedUser.findOne.mockResolvedValue(null);

        await runMiddleware(validateRegister);

        expectNextSuccess(nextFunction);
        expect(mockRequest.body.username).toBe('&lt;script&gt;test&lt;&#x2F;script&gt;');
    });

    it('should normalize email to lowercase', async () => {
        mockRequest.body = {
            username: 'testuser',
            email: '  TEST.USER@EXAMPLE.COM  ',
            password: 'password123',
            role: 'player',
            age: 25,
            gender: 'male'
        };
        mockedUser.findOne.mockResolvedValue(null);

        await runMiddleware(validateRegister);

        expectNextSuccess(nextFunction);
        // normalizeEmail() lowercases but doesn't trim whitespace
        expect(mockRequest.body.email).toBe('  test.user@example.com  ');
    });

    // ===== GOOGLE OAUTH EDGE CASE =====

    it('should allow Google OAuth users without password', async () => {
        mockRequest.body = {
            username: 'googleuser',
            email: 'google@example.com',
            authProvider: 'google',
            role: 'player',
            age: 25,
            gender: 'male'
        };
        mockedUser.findOne.mockResolvedValue(null);

        await runMiddleware(validateRegister);

        expectNextSuccess(nextFunction);
    });
});