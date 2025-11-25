import { getMySlots } from "../../controllers/coachController";
import CoachSlot from "../../models/coach/CoachSlot";

describe("getMySlots - controller unit tests", () => {

  const makeReq = (user: any) => ({ user } as any);

  const makeRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  }) as any;

  afterEach(() => jest.restoreAllMocks());

  test("returns failure when the requester is not a coach", async () => {
    const response = makeRes();

    await getMySlots(makeReq({ role: "player", _id: "123" }), response);

    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: "Only coaches can access this",
    });
  });

  test("returns the coach's unbooked slots ordered by date/time", async () => {
    const mockSlots = [
      {
        coachId: "123",
        date: "2025-01-01",
        startTime: "09:00",
        endTime: "10:00",
        isBooked: false,
      },
    ];

    jest.spyOn(CoachSlot, "find").mockReturnValue({
      sort: jest.fn().mockResolvedValue(mockSlots),
    } as any);

    const response = makeRes();

    await getMySlots(makeReq({ role: "coach", _id: "123" }), response);

    expect(response.json).toHaveBeenCalledWith({
      success: true,
      slots: mockSlots,
    });
  });

  test("returns an empty array when the coach has no available slots", async () => {
    jest.spyOn(CoachSlot, "find").mockReturnValue({
      sort: jest.fn().mockResolvedValue([]),
    } as any);

    const response = makeRes();

    await getMySlots(makeReq({ role: "coach", _id: "999" }), response);

    expect(response.json).toHaveBeenCalledWith({
      success: true,
      slots: [],
    });
  });

  test("propagates errors when CoachSlot lookup throws", async () => {
    jest.spyOn(CoachSlot, "find").mockImplementation(() => {
      throw new Error("DB error");
    });

    const response = makeRes();

    await expect(
      getMySlots(makeReq({ role: "coach", _id: "123" }), response)
    ).rejects.toThrow("DB error");
  });
});
