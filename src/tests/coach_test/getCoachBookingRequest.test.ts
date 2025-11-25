import { getCoachBookingRequests } from "../../controllers/coachController";
import CoachBooking from "../../models/coach/CoachBooking";

describe("getCoachBookingRequests - controller unit tests", () => {

  const makeReq = (user: any) => ({ user } as any);

  const makeRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  }) as any;

  afterEach(() => jest.restoreAllMocks());

  test("returns failure when requester is not a coach", async () => {
    const response = makeRes();

    await getCoachBookingRequests(makeReq({ role: "player", _id: "C1" }), response);

    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: "Only coaches can access this",
    });
  });

  test("returns populated booking requests for the coach", async () => {
    const mockBookings = [
      {
        coachId: "C1",
        playerId: {
          username: "harsh_player",
          email: "player@mail.com",
          profilePhoto: "p.jpg",
          age: 20,
          gender: "male",
        },
      },
    ];

    // Mock find + populate + sort chain
    jest.spyOn(CoachBooking, "find").mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockBookings),
      }),
    } as any);

    const response = makeRes();

    await getCoachBookingRequests(makeReq({ role: "coach", _id: "C1" }), response);

    expect(response.json).toHaveBeenCalledWith({
      success: true,
      bookings: mockBookings,
    });
  });

  test("returns an empty array when the coach has no booking requests", async () => {
    jest.spyOn(CoachBooking, "find").mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue([]),
      }),
    } as any);

    const response = makeRes();

    await getCoachBookingRequests(makeReq({ role: "coach", _id: "C1" }), response);

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

    await expect(
      getCoachBookingRequests(makeReq({ role: "coach", _id: "C1" }), response)
    ).rejects.toThrow("DB error");
  });

});
