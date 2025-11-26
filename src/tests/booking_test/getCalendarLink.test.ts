import { Request, Response, NextFunction } from "express";
import { getCalendarLink } from "../../controllers/Booking/getCalendarLink";
import Booking from "../../models/Booking";
import AppError from "../../utils/AppError";
import { IUserRequest } from "src/middleware/authMiddleware";

// Mock the Booking model
jest.mock("../../models/Booking");

describe("getCalendarLink Controller", () => {
  let mockRequest: Partial<IUserRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();

    mockResponse = {
      json: jsonMock,
      status: jest.fn(function (this: any) {
        return this;
      }),
    };

    mockRequest = {
      params: {},
      user: { _id: 'user123' } as any,
    };

    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  // Test successful retrieval of calendar link
  it("should return calendar link if user owns the booking", async () => {
    const mockBooking = {
      _id: "b1",
      user: { toString: () => "user123" },
      calendarLink: "https://cal.com/test123",
    };

    (Booking.findById as jest.Mock).mockResolvedValue(mockBooking);

    mockRequest.params = { bookingId: "b1" };

    await getCalendarLink(
      mockRequest as IUserRequest,
      mockResponse as Response,
      mockNext
    );

    expect(Booking.findById).toHaveBeenCalledWith("b1");

    expect(jsonMock).toHaveBeenCalledWith({
      success: true,
      calendarLink: "https://cal.com/test123",
    });
  });

  // Test booking not found
  it("should throw 404 error when booking is not found", async () => {
    (Booking.findById as jest.Mock).mockResolvedValue(null);

    mockRequest.params = { bookingId: "xyz" };

    await getCalendarLink(
      mockRequest as IUserRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalled();
    const err = (mockNext as jest.Mock).mock.calls[0][0];

    expect(err).toBeInstanceOf(AppError);
    expect(err.message).toBe("Booking not found");
    expect(err.statusCode).toBe(404);
  });

  // Test unauthorized access
  it("should throw 403 error when user does not own the booking", async () => {
    const mockBooking = {
      _id: "b2",
      user: { toString: () => "owner999" }, // different from requester
      calendarLink: "https://cal.com/test123",
    };

    (Booking.findById as jest.Mock).mockResolvedValue(mockBooking);

    mockRequest.params = { bookingId: "b2" };

    await getCalendarLink(
      mockRequest as IUserRequest,
      mockResponse as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalled();
    const err = (mockNext as jest.Mock).mock.calls[0][0];

    expect(err).toBeInstanceOf(AppError);
    expect(err.message).toBe("Not authorized to view this calendar link");
    expect(err.statusCode).toBe(403);
  });
});
