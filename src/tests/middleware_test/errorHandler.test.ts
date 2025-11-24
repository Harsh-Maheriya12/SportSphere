import { Request, Response, NextFunction } from 'express';
import errorHandler from '../../middleware/errorHandler';
import AppError from '../../utils/AppError';

// Mock logger
jest.mock('../../config/logger', () => ({
    __esModule: true,
    default: {
        error: jest.fn(),
    }
}));

describe('errorHandler Middleware', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    beforeEach(() => {
        req = {
            originalUrl: '/api/test',
            method: 'GET',
            ip: '127.0.0.1'
        } as Partial<Request>;

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            statusCode: 200
        } as Partial<Response>;

        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('AppError handling', () => {
        it('should handle operational AppError with status code', () => {
            const error = new AppError('Resource not found', 404);

            errorHandler(error, req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Resource not found'
            });
        });

        it('should handle operational AppError with details', () => {
            const error = new AppError('Validation failed', 400, { field: 'email', issue: 'invalid format' });

            errorHandler(error, req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Validation failed',
                details: { field: 'email', issue: 'invalid format' }
            });
        });

        it('should handle AppError with 500 status code', () => {
            const error = new AppError('Something went wrong', 500);

            errorHandler(error, req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Something went wrong'
            });
        });
    });

    describe('Unexpected error handling', () => {
        it('should handle unexpected errors with generic message in production', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';

            const error = new Error('Database connection failed');

            errorHandler(error, req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Something went wrong on the server.',
                stack: undefined
            });

            process.env.NODE_ENV = originalEnv;
        });

        it('should include stack trace in development', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            const error = new Error('Database connection failed');
            error.stack = 'Error stack trace here';

            errorHandler(error, req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                status: 'error',
                message: 'Something went wrong on the server.',
                stack: 'Error stack trace here'
            });

            process.env.NODE_ENV = originalEnv;
        });

        it('should handle errors with custom status code', () => {
            const error: any = new Error('Unauthorized');
            error.statusCode = 401;

            errorHandler(error, req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('should use response status code if error has no status code', () => {
            res.statusCode = 403;
            const error = new Error('Forbidden');

            errorHandler(error, req as Request, res as Response, next);

            // Unexpected errors always return 500
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('Status code handling', () => {
        it('should set status code if response status is 200', () => {
            res.statusCode = 200;
            const error = new AppError('Bad Request', 400);

            errorHandler(error, req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should not override non-200 response status', () => {
            res.statusCode = 404;
            const error = new Error('Not found');

            errorHandler(error, req as Request, res as Response, next);

            // Unexpected errors always return 500, not the response status
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
