import { deleteCoachPhoto } from "../../controllers/coachController";
import CoachDetail from "../../models/coach/CoachDetail";

describe("deleteCoachPhoto - controller unit tests", () => {

  const makeReq = (user: any, body: any) => ({ user, body }) as any;

  const makeRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  }) as any;

  afterEach(() => jest.restoreAllMocks());

  test("returns failure when a non-coach attempts to delete a photo", async () => {
    const response = makeRes();

    await deleteCoachPhoto(
      makeReq({ role: "player", _id: "123" }, { photoUrl: "x.jpg" }),
      response
    );

    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: "Only coaches can delete photos",
    });
  });

  test("returns failure when photoUrl is missing from request body", async () => {
    const response = makeRes();

    await deleteCoachPhoto(
      makeReq({ role: "coach", _id: "123" }, {}),
      response
    );

    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: "Photo URL is required",
    });
  });

  test("returns failure when coach details are not found", async () => {
    jest.spyOn(CoachDetail, "findOne").mockResolvedValue(null);

    const response = makeRes();

    await deleteCoachPhoto(
      makeReq({ role: "coach", _id: "123" }, { photoUrl: "test.jpg" }),
      response
    );

    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: "Coach details not found",
    });
  });

  test("removes the photo from gallery and saves when input is valid", async () => {
    const mockSave = jest.fn().mockResolvedValue(true);

    jest.spyOn(CoachDetail, "findOne").mockResolvedValue({
      coachId: "123",
      photoGallery: ["a.jpg", "b.jpg", "c.jpg"],
      save: mockSave,
    } as any);

    const response = makeRes();

    await deleteCoachPhoto(
      makeReq({ role: "coach", _id: "123" }, { photoUrl: "b.jpg" }),
      response
    );

    expect(mockSave).toHaveBeenCalled();
    expect(response.json).toHaveBeenCalledWith({
      success: true,
      message: "Photo deleted successfully",
    });
  });

  test("propagates errors when CoachDetail lookup fails", async () => {
    jest.spyOn(CoachDetail, "findOne").mockRejectedValue(new Error("DB error"));

    const response = makeRes();

    await expect(
      deleteCoachPhoto(
        makeReq({ role: "coach", _id: "123" }, { photoUrl: "xx.jpg" }),
        response
      )
    ).rejects.toThrow("DB error");
  });

});
