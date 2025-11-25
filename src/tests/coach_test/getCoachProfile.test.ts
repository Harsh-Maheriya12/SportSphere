import { getCoachProfile } from "../../controllers/coachController";
import User from "../../models/User";
import CoachDetail from "../../models/coach/CoachDetail";

describe("getCoachProfile - Fixed Tests", () => {
  const req = (id: string) => ({ params: { id } } as any);

  const res = () =>
    ({
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any);

  afterEach(() => jest.restoreAllMocks());

  test("returns error when coach not found", async () => {
    jest.spyOn(User, "findById").mockImplementation(
      () =>
        ({
          select: jest.fn().mockReturnValue(Promise.resolve(null)),
        } as any)
    );

    const response = res();
    await getCoachProfile(req("123"), response);

    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: "Coach not found",
    });
  });

  test("returns error when user is not a coach", async () => {
    jest.spyOn(User, "findById").mockImplementation(
      () =>
        ({
          select: jest.fn().mockReturnValue(
            Promise.resolve({
              _id: "123",
              username: "test",
              role: "player",
            })
          ),
        } as any)
    );

    const response = res();
    await getCoachProfile(req("123"), response);

    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: "User is not a coach",
    });
  });

  test("returns coach profile when details exist", async () => {
    jest.spyOn(User, "findById").mockImplementation(
      () =>
        ({
          select: jest.fn().mockReturnValue(
            Promise.resolve({
              _id: "123",
              username: "coach01",
              email: "c@mail.com",
              profilePhoto: "p.jpg",
              age: 28,
              gender: "male",
              proof: "proof",
              role: "coach",
            })
          ),
        } as any)
    );

    jest.spyOn(CoachDetail, "findOne").mockResolvedValue({
      sports: ["Football"],
      location: { city: "X", state: "Y", country: "Z" },
      description: "Experienced coach",
      experience: 4,
      pricing: 1200,
      photoGallery: ["p1.jpg"],
    });

    const response = res();
    await getCoachProfile(req("123"), response);

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        coach: expect.objectContaining({
          id: "123",
          username: "coach01",
          sports: ["Football"],
          experience: 4,
        }),
      })
    );
  });

  test("returns coach profile with defaults when details are missing", async () => {
    jest.spyOn(User, "findById").mockImplementation(
      () =>
        ({
          select: jest.fn().mockReturnValue(
            Promise.resolve({
              _id: "123",
              username: "coach01",
              email: "c@mail.com",
              profilePhoto: "p.jpg",
              age: 28,
              gender: "male",
              proof: "proof",
              role: "coach",
            })
          ),
        } as any)
    );

    jest.spyOn(CoachDetail, "findOne").mockResolvedValue(null);

    const response = res();
    await getCoachProfile(req("123"), response);

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        coach: expect.objectContaining({
          sports: [],
          experience: 0,
        }),
      })
    );
  });

  test("throws when a database error occurs", async () => {
    jest.spyOn(User, "findById").mockImplementation(() => {
      throw new Error("DB error");
    });

    const response = res();

    await expect(getCoachProfile(req("123"), response)).rejects.toThrow(
      "DB error"
    );
  });
});
