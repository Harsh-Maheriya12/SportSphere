import { getMyCoachBookings } from "../../controllers/coachController";
import CoachBooking from "../../models/coach/CoachBooking";

describe("getMyCoachBookings - controller unit tests", () => {

  const makeReq = (user: any) => ({ user } as any);

  const makeRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  }) as any;

  afterEach(() => jest.restoreAllMocks());

  test("returns failure when the requester is not a player", async () => {
    const response = makeRes();

    await getMyCoachBookings(makeReq({ role: "coach", _id: "P1" }), response);

    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: "Only players can access this",
    });
  });

  test("returns populated bookings for the player", async () => {
    const mockBookings = [
      {
        coachId: {
          username: "coach01",
          email: "c1@mail.com",
          profilePhoto: "c1.jpg",
        },
        status: "pending",
      },
    ];

    jest.spyOn(CoachBooking, "find").mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockBookings),
      }),
    } as any);

    const response = makeRes();

    await getMyCoachBookings(makeReq({ role: "player", _id: "P1" }), response);

    expect(response.json).toHaveBeenCalledWith({
      success: true,
      bookings: mockBookings,
    });
  });

  test("returns an empty array when no bookings are found", async () => {
    jest.spyOn(CoachBooking, "find").mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([]),
      }),
    } as any);

    const response = makeRes();

    await getMyCoachBookings(makeReq({ role: "player", _id: "P1" }), response);

    expect(response.json).toHaveBeenCalledWith({
      success: true,
      bookings: [],
    });
  });

  test("propagates errors when CoachBooking lookup throws", async () => {
    jest.spyOn(CoachBooking, "find").mockImplementation(() => {
      throw new Error("DB error");
    });

    const response = makeRes();

    await expect(getMyCoachBookings(makeReq({ role: "player", _id: "P1" }), response)).rejects.toThrow("DB error");
  });

});
