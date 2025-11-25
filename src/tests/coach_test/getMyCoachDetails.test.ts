import { getMyCoachDetails } from "../../controllers/coachController";
import CoachDetail from "../../models/coach/CoachDetail";

describe("getMyCoachDetails", () => {
  const makeReq = (user: any) => ({ user } as any);

  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() } as any);

  afterEach(() => jest.restoreAllMocks());

  test("returns error when called by non-coach", async () => {
    const res = makeRes();

    await getMyCoachDetails(makeReq({ role: "player", _id: "P1" }), res);

    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Only coaches can access this" });
  });

  test("returns null and a helpful message when no details exist", async () => {
    jest.spyOn(CoachDetail, "findOne").mockResolvedValue(null as any);

    const res = makeRes();

    await getMyCoachDetails(makeReq({ role: "coach", _id: "C1" }), res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      coachDetail: null,
      message: "No coach details found. Please create your profile.",
    });
  });

  test("returns existing coach details", async () => {
    const mockDetail = { coachId: "C1", sports: ["Tennis"], description: "Pro coach" };

    jest.spyOn(CoachDetail, "findOne").mockResolvedValue(mockDetail as any);

    const res = makeRes();

    await getMyCoachDetails(makeReq({ role: "coach", _id: "C1" }), res);

    expect(res.json).toHaveBeenCalledWith({ success: true, coachDetail: mockDetail });
  });

  test("propagates database errors", async () => {
    jest.spyOn(CoachDetail, "findOne").mockRejectedValue(new Error("DB error"));

    const res = makeRes();

    await expect(getMyCoachDetails(makeReq({ role: "coach", _id: "C1" }), res)).rejects.toThrow("DB error");
  });
});
