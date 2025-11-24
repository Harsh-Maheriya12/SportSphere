import { Response } from 'express';
import { getMyVenueBookings } from '../../controllers/Booking/getMyVenueBooking';
import { IUserRequest } from '../../middleware/authMiddleware';
import Booking from '../../models/Booking';

// Mock dependencies
jest.mock('../../models/Booking');

describe('getMyVenueBookings Controller', () => {
    let req: Partial<IUserRequest>;
    let res: Partial<Response>;

    beforeEach(() => {
        req = {
            user: { _id: 'user123' }
        } as Partial<IUserRequest>;

        res = {
            json: jest.fn()
        } as Partial<Response>;

        jest.clearAllMocks();

        // Suppress console.log in tests
        jest.spyOn(console, 'log').mockImplementation(() => { });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should return transformed bookings for the user', async () => {
        const mockBookings = [
            {
                _id: 'booking1',
                user: 'user123',
                venueId: {
                    _id: 'venue1',
                    name: 'Test Venue',
                    address: '123 Test St',
                    city: 'Test City',
                    images: ['image1.jpg']
                },
                subVenueId: {
                    _id: 'subVenue1',
                    name: 'Court 1'
                },
                sport: 'Cricket',
                startTime: new Date('2024-01-15T10:00:00Z'),
                endTime: new Date('2024-01-15T11:00:00Z'),
                amount: 100000, // 1000 rupees in paise
                status: 'Paid',
                createdAt: new Date('2024-01-14T12:00:00Z')
            },
            {
                _id: 'booking2',
                user: 'user123',
                venueId: {
                    _id: 'venue2',
                    name: 'Another Venue',
                    address: '456 Another St',
                    city: 'Another City',
                    images: ['image2.jpg']
                },
                subVenueId: {
                    _id: 'subVenue2',
                    name: 'Field 2'
                },
                sport: 'Football',
                startTime: new Date('2024-01-16T14:00:00Z'),
                endTime: new Date('2024-01-16T15:00:00Z'),
                amount: 150000, // 1500 rupees in paise
                status: 'Pending',
                createdAt: new Date('2024-01-15T12:00:00Z')
            }
        ];

        const mockQuery = {
            populate: jest.fn().mockReturnThis(),
            sort: jest.fn().mockResolvedValue(mockBookings)
        };

        (Booking.find as jest.Mock).mockReturnValue(mockQuery);

        await getMyVenueBookings(req as IUserRequest, res as Response);

        expect(Booking.find).toHaveBeenCalledWith({ user: 'user123' });
        expect(mockQuery.populate).toHaveBeenCalledTimes(2);
        expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });

        expect(res.json).toHaveBeenCalledWith({
            success: true,
            bookings: [
                {
                    _id: 'booking1',
                    venue: {
                        _id: 'venue1',
                        name: 'Test Venue',
                        address: '123 Test St',
                        city: 'Test City',
                        images: ['image1.jpg']
                    },
                    subVenue: {
                        _id: 'subVenue1',
                        name: 'Court 1'
                    },
                    sport: 'Cricket',
                    date: new Date('2024-01-15T10:00:00Z'),
                    startTime: new Date('2024-01-15T10:00:00Z'),
                    endTime: new Date('2024-01-15T11:00:00Z'),
                    price: 1000,
                    status: 'confirmed',
                    createdAt: new Date('2024-01-14T12:00:00Z')
                },
                {
                    _id: 'booking2',
                    venue: {
                        _id: 'venue2',
                        name: 'Another Venue',
                        address: '456 Another St',
                        city: 'Another City',
                        images: ['image2.jpg']
                    },
                    subVenue: {
                        _id: 'subVenue2',
                        name: 'Field 2'
                    },
                    sport: 'Football',
                    date: new Date('2024-01-16T14:00:00Z'),
                    startTime: new Date('2024-01-16T14:00:00Z'),
                    endTime: new Date('2024-01-16T15:00:00Z'),
                    price: 1500,
                    status: 'pending',
                    createdAt: new Date('2024-01-15T12:00:00Z')
                }
            ]
        });
    });

    it('should handle bookings with missing venue data', async () => {
        const mockBookings = [
            {
                _id: 'booking1',
                user: 'user123',
                venueId: null, // Missing venue
                subVenueId: null, // Missing subVenue
                sport: 'Cricket',
                startTime: new Date('2024-01-15T10:00:00Z'),
                endTime: new Date('2024-01-15T11:00:00Z'),
                amount: 100000,
                status: 'Failed',
                createdAt: new Date('2024-01-14T12:00:00Z')
            }
        ];

        const mockQuery = {
            populate: jest.fn().mockReturnThis(),
            sort: jest.fn().mockResolvedValue(mockBookings)
        };

        (Booking.find as jest.Mock).mockReturnValue(mockQuery);

        await getMyVenueBookings(req as IUserRequest, res as Response);

        expect(res.json).toHaveBeenCalledWith({
            success: true,
            bookings: [
                {
                    _id: 'booking1',
                    venue: {
                        _id: undefined,
                        name: 'Unknown Venue',
                        address: '',
                        city: '',
                        images: []
                    },
                    subVenue: {
                        _id: 'N/A',
                        name: 'Direct Booking'
                    },
                    sport: 'Cricket',
                    date: new Date('2024-01-15T10:00:00Z'),
                    startTime: new Date('2024-01-15T10:00:00Z'),
                    endTime: new Date('2024-01-15T11:00:00Z'),
                    price: 1000,
                    status: 'failed',
                    createdAt: new Date('2024-01-14T12:00:00Z')
                }
            ]
        });
    });

    it('should return empty array when user has no bookings', async () => {
        const mockQuery = {
            populate: jest.fn().mockReturnThis(),
            sort: jest.fn().mockResolvedValue([])
        };

        (Booking.find as jest.Mock).mockReturnValue(mockQuery);

        await getMyVenueBookings(req as IUserRequest, res as Response);

        expect(res.json).toHaveBeenCalledWith({
            success: true,
            bookings: []
        });
    });

    it('should handle bookings with missing sport field', async () => {
        const mockBookings = [
            {
                _id: 'booking1',
                user: 'user123',
                venueId: {
                    _id: 'venue1',
                    name: 'Test Venue',
                    address: '123 Test St',
                    city: 'Test City',
                    images: []
                },
                subVenueId: {
                    _id: 'subVenue1',
                    name: 'Court 1'
                },
                sport: null, // Missing sport
                startTime: new Date('2024-01-15T10:00:00Z'),
                endTime: new Date('2024-01-15T11:00:00Z'),
                amount: 100000,
                status: 'Paid',
                createdAt: new Date('2024-01-14T12:00:00Z')
            }
        ];

        const mockQuery = {
            populate: jest.fn().mockReturnThis(),
            sort: jest.fn().mockResolvedValue(mockBookings)
        };

        (Booking.find as jest.Mock).mockReturnValue(mockQuery);

        await getMyVenueBookings(req as IUserRequest, res as Response);

        const response = (res.json as jest.Mock).mock.calls[0][0];
        expect(response.bookings[0].sport).toBe('N/A');
    });
});
