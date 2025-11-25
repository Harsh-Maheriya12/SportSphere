import { getCoachSlots } from "../../controllers/coachController";
import CoachSlot from "../../models/coach/CoachSlot";

describe("getCoachSlots - controller unit tests", () => {

  const makeReq = (id: string) => ({ params: { id } }) as any;

  const makeRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  }) as any;

  afterEach(() => jest.restoreAllMocks());

  test("returns available, unbooked slots for the given coach ID", async () => {
    const mockSlots = [
      {
        coachId: "123",
        date: new Date(),
        startTime: "10:00",
        endTime: "11:00",
        isBooked: false,
      },
    ];

    jest.spyOn(CoachSlot, "find").mockReturnValue({
      sort: jest.fn().mockResolvedValue(mockSlots),
    } as any);

    const response = makeRes();
    await getCoachSlots(makeReq("123"), response);

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
    await getCoachSlots(makeReq("123"), response);

    expect(response.json).toHaveBeenCalledWith({
      success: true,
      slots: [],
    });
  });

  test("propagates database errors from CoachSlot lookup", async () => {
    jest.spyOn(CoachSlot, "find").mockImplementation(() => {
      throw new Error("DB error");
    });

    const response = makeRes();

    await expect(getCoachSlots(makeReq("123"), response)).rejects.toThrow(
      "DB error"
    );
  });

});
