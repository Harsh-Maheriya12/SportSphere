import { acceptBookingRequest } from "../../controllers/coachController";
import CoachBooking from "../../models/coach/CoachBooking";
import CoachSlot from "../../models/coach/CoachSlot";

describe("acceptBookingRequest - controller unit tests", () => {

  const makeReq = (user: any, params: any) => ({ user, params } as any);

  const makeRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  }) as any;

  afterEach(() => jest.restoreAllMocks());

  test("returns failure when a non-coach attempts to accept a booking", async () => {
    const response = makeRes();

    await acceptBookingRequest(
      makeReq({ role: "player", _id: "C1" }, { id: "B1" }),
      response
    );

    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: "Only coaches can accept bookings",
    });
  });

  test("returns failure when the booking cannot be found", async () => {
    jest.spyOn(CoachBooking, "findById").mockResolvedValue(null);

    const response = makeRes();

    await acceptBookingRequest(makeReq({ role: "coach", _id: "C1" }, { id: "B1" }), response);

    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: "Booking not found",
    });
  });

  test("returns failure when the booking is not in pending state", async () => {
    jest.spyOn(CoachBooking, "findById").mockResolvedValue({ status: "accepted" });

    const response = makeRes();

    await acceptBookingRequest(makeReq({ role: "coach", _id: "C1" }, { id: "B1" }), response);

    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: "Booking is not pending",
    });
  });

  test("returns failure when the referenced slot is missing", async () => {
    jest.spyOn(CoachBooking, "findById").mockResolvedValue({ status: "pending", slotId: "S1" });

    jest.spyOn(CoachSlot, "findById").mockResolvedValue(null);

    const response = makeRes();

    await acceptBookingRequest(makeReq({ role: "coach", _id: "C1" }, { id: "B1" }), response);

    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: "This slot is not available",
    });
  });

  test("returns failure when the slot is already booked", async () => {
    jest.spyOn(CoachBooking, "findById").mockResolvedValue({ status: "pending", slotId: "S1" });

    jest.spyOn(CoachSlot, "findById").mockResolvedValue({ isBooked: true });

    const response = makeRes();

    await acceptBookingRequest(makeReq({ role: "coach", _id: "C1" }, { id: "B1" }), response);

    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: "This slot is no longer available",
    });
  });

  test("accepts booking and marks slot as booked when all validations pass", async () => {
    const mockBooking = { status: "pending", slotId: "S1", playerId: "P1", save: jest.fn().mockResolvedValue(true) };
    const mockSlot = { isBooked: false, save: jest.fn().mockResolvedValue(true) };

    jest.spyOn(CoachBooking, "findById").mockResolvedValue(mockBooking as any);
    jest.spyOn(CoachSlot, "findById").mockResolvedValue(mockSlot as any);

    const response = makeRes();

    await acceptBookingRequest(makeReq({ role: "coach", _id: "C1" }, { id: "B1" }), response);

    expect(mockBooking.save).toHaveBeenCalled();
    expect(mockSlot.save).toHaveBeenCalled();

    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: "Booking accepted successfully" }));
  });

  test("propagates database errors from CoachBooking lookup", async () => {
    jest.spyOn(CoachBooking, "findById").mockRejectedValue(new Error("DB error"));

    const response = makeRes();

    await expect(acceptBookingRequest(makeReq({ role: "coach", _id: "C1" }, { id: "B1" }), response)).rejects.toThrow("DB error");
  });

});
