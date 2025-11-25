import { rejectBookingRequest } from "../../controllers/coachController";
import CoachBooking from "../../models/coach/CoachBooking";

describe("rejectBookingRequest - controller unit tests", () => {

  const makeReq = (user: any, params: any, body: any = {}) => ({ user, params, body } as any);

  const makeRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  }) as any;

  afterEach(() => jest.restoreAllMocks());

  test("returns failure when a non-coach attempts to reject a booking", async () => {
    const response = makeRes();

    await rejectBookingRequest(makeReq({ role: "player", _id: "C1" }, { id: "B1" }), response);

    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: "Only coaches can reject bookings",
    });
  });

  test("returns failure when the booking cannot be found", async () => {
    jest.spyOn(CoachBooking, "findById").mockResolvedValue(null);

    const response = makeRes();

    await rejectBookingRequest(makeReq({ role: "coach", _id: "C1" }, { id: "B1" }), response);

    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: "Booking not found",
    });
  });

  test("returns failure when the booking is not pending", async () => {
    jest.spyOn(CoachBooking, "findById").mockResolvedValue({ status: "accepted" });

    const response = makeRes();

    await rejectBookingRequest(makeReq({ role: "coach", _id: "C1" }, { id: "B1" }), response);

    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: "Booking is not pending",
    });
  });

  test("rejects the booking and saves a provided rejection reason", async () => {
    const mockSave = jest.fn().mockResolvedValue(true);

    const mockBooking = { status: "pending", rejectionReason: "", save: mockSave } as any;

    jest.spyOn(CoachBooking, "findById").mockResolvedValue(mockBooking);

    const response = makeRes();

    await rejectBookingRequest(makeReq({ role: "coach", _id: "C1" }, { id: "B1" }, { rejectionReason: "Not available" }), response);

    expect(mockSave).toHaveBeenCalled();
    expect(mockBooking.status).toBe("rejected");
    expect(mockBooking.rejectionReason).toBe("Not available");

    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: "Booking rejected successfully" }));
  });

  test("rejects the booking with a default reason when none is provided", async () => {
    const mockSave = jest.fn().mockResolvedValue(true);

    const mockBooking = { status: "pending", rejectionReason: "", save: mockSave } as any;

    jest.spyOn(CoachBooking, "findById").mockResolvedValue(mockBooking);

    const response = makeRes();

    await rejectBookingRequest(makeReq({ role: "coach", _id: "C1" }, { id: "B1" }), response);

    expect(mockSave).toHaveBeenCalled();
    expect(mockBooking.status).toBe("rejected");
    expect(mockBooking.rejectionReason).toBe("No reason provided");

    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: "Booking rejected successfully" }));
  });

  test("propagates database errors from CoachBooking lookup", async () => {
    jest.spyOn(CoachBooking, "findById").mockRejectedValue(new Error("DB error"));

    const response = makeRes();

    await expect(rejectBookingRequest(makeReq({ role: "coach", _id: "C1" }, { id: "B1" }), response)).rejects.toThrow("DB error");
  });

});
