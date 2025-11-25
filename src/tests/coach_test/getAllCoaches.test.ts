import { getAllCoaches } from "../../controllers/coachController";
import User from "../../models/User";
import CoachDetail from "../../models/coach/CoachDetail";

describe("getAllCoaches - controller unit tests", () => {

  const res = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  }) as any;

  afterEach(() => jest.restoreAllMocks());

  test("returns list of coaches with merged basic and detail information", async () => {
    // Mock User.find
    jest.spyOn(User, "find").mockReturnValue({
      select: jest.fn().mockResolvedValue([
        {
          _id: "101",
          username: "coach1",
          email: "c1@mail.com",
          profilePhoto: "p1.jpg",
          age: 30,
          gender: "male",
        },
      ]),
    } as any);

    // Mock CoachDetail.findOne
    jest.spyOn(CoachDetail, "findOne").mockResolvedValue({
      coachId: "101",
      sports: ["Football"],
      pricing: 500,
      experience: 3,
      location: { city: "A", state: "B", country: "C", address: "XYZ" },
    } as any);

    const response = res();
    await getAllCoaches({} as any, response);

    expect(response.json).toHaveBeenCalledWith({
      success: true,
      coaches: [
        expect.objectContaining({
          id: "101",
          username: "coach1",
          sports: ["Football"],
          pricing: 500,
          experience: 3,
        }),
      ],
    });
  });

  test("returns empty array when no coaches are found", async () => {
    jest.spyOn(User, "find").mockReturnValue({
      select: jest.fn().mockResolvedValue([]),
    } as any);

    const response = res();
    await getAllCoaches({} as any, response);

    expect(response.json).toHaveBeenCalledWith({
      success: true,
      coaches: [],
    });
  });

  test("propagates errors when the user lookup fails", async () => {
    jest.spyOn(User, "find").mockReturnValue({
      select: jest.fn().mockRejectedValue(new Error("DB error")),
    } as any);

    const response = res();

    await expect(getAllCoaches({} as any, response)).rejects.toThrow("DB error");
  });

});
