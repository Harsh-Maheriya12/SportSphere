import { requestCoachBooking } from "../../controllers/coachController";
import CoachSlot from "../../models/coach/CoachSlot";
import CoachBooking from "../../models/coach/CoachBooking";

describe("requestCoachBooking - controller unit tests", () => {

  const makeReq = (user: any, body: any) => ({ user, body } as any);

  const makeRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  }) as any;

  afterEach(() => jest.restoreAllMocks());

  test("returns failure when a non-player attempts to request a booking", async () => {
    const response = makeRes();

    await requestCoachBooking(
      makeReq({ role: "coach", _id: "P1" }, { slotId: "S1" }),
      response
    );

    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: "Only players can request bookings",
    });
  });

  test("returns failure when slotId is not provided", async () => {
    const response = makeRes();

    await requestCoachBooking(makeReq({ role: "player", _id: "P1" }, {}), response);

    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: "Slot ID is required",
    });
  });

  test("returns failure when the specified slot does not exist", async () => {
    jest.spyOn(CoachSlot, "findById").mockResolvedValue(null);

    const response = makeRes();

    await requestCoachBooking(
      makeReq({ role: "player", _id: "P1" }, { slotId: "S1" }),
      response
    );

    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: "This slot is not available",
    });
  });

  test("returns failure when the slot is already booked", async () => {
    jest.spyOn(CoachSlot, "findById").mockResolvedValue({ isBooked: true });

    const response = makeRes();

    await requestCoachBooking(
      makeReq({ role: "player", _id: "P1" }, { slotId: "S1" }),
      response
    );

    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: "This slot is already booked",
    });
  });

  test("returns failure when the player already has a pending or accepted booking for the slot", async () => {
    jest.spyOn(CoachSlot, "findById").mockResolvedValue({
      coachId: "C1",
      date: "2025-01-01",
      startTime: "10:00",
      endTime: "11:00",
      isBooked: false,
    });

    jest.spyOn(CoachBooking, "findOne").mockResolvedValue({ status: "pending" });

    const response = makeRes();

    await requestCoachBooking(
      makeReq({ role: "player", _id: "P1" }, { slotId: "S1" }),
      response
    );

    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: "You already have a booking request for this slot",
    });
  });

  test("creates and persists a booking request when input is valid", async () => {
    jest.spyOn(CoachSlot, "findById").mockResolvedValue({
      coachId: "C1",
      date: "2025-01-01",
      startTime: "10:00",
      endTime: "11:00",
      isBooked: false,
    });

    jest.spyOn(CoachBooking, "findOne").mockResolvedValue(null);

    const mockSave = jest.fn().mockResolvedValue(true);

    jest.spyOn(CoachBooking.prototype, "save").mockImplementation(mockSave as any);

    const response = makeRes();

    await requestCoachBooking(makeReq({ role: "player", _id: "P1" }, { slotId: "S1" }), response);

    expect(mockSave).toHaveBeenCalled();
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Booking request sent successfully",
      })
    );
  });

  test("propagates database errors from CoachSlot lookup", async () => {
    jest.spyOn(CoachSlot, "findById").mockRejectedValue(new Error("DB error"));

    const response = makeRes();

    await expect(
      requestCoachBooking(makeReq({ role: "player", _id: "P1" }, { slotId: "S1" }), response)
    ).rejects.toThrow("DB error");
  });
});
