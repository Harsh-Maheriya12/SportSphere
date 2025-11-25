import { createCoachSlot } from "../../controllers/coachController";
import CoachSlot from "../../models/coach/CoachSlot";

describe("createCoachSlot - controller unit tests", () => {

  const makeReq = (user: any, body: any) => ({ user, body } as any);

  const makeRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  }) as any;

  afterEach(() => jest.restoreAllMocks());

  test("returns failure when a non-coach attempts to create a slot", async () => {
    const response = makeRes();

    await createCoachSlot(
      makeReq({ role: "player", _id: "123" }, { date: "2025-01-01" }),
      response
    );

    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: "Only coaches can create slots",
    });
  });

  test("returns failure when required slot fields are missing", async () => {
    const response = makeRes();

    await createCoachSlot(
      makeReq({ role: "coach", _id: "123" }, { startTime: "10:00" }),
      response
    );

    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: "Date, start time, and end time are required",
    });
  });

  test("returns failure when a slot already exists for the same date and time", async () => {
    jest.spyOn(CoachSlot, "findOne").mockResolvedValue({});

    const response = makeRes();

    await createCoachSlot(
      makeReq(
        { role: "coach", _id: "123" },
        { date: "2025-01-01", startTime: "10:00", endTime: "11:00" }
      ),
      response
    );

    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: "A slot already exists for the specified date and time",
    });
  });

  test("creates and persists a new slot when input is valid", async () => {
    jest.spyOn(CoachSlot, "findOne").mockResolvedValue(null);

    const mockSave = jest.fn().mockResolvedValue(true);

    jest.spyOn(CoachSlot.prototype, "save").mockImplementation(mockSave as any);

    const response = makeRes();

    const body = {
      date: "2025-01-01",
      startTime: "10:00",
      endTime: "11:00",
    };

    await createCoachSlot(makeReq({ role: "coach", _id: "123" }, body), response);

    expect(mockSave).toHaveBeenCalled();
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Slot created successfully",
      })
    );
  });

  test("propagates errors when CoachSlot lookup fails", async () => {
    jest.spyOn(CoachSlot, "findOne").mockRejectedValue(new Error("DB error"));

    const response = makeRes();

    await expect(
      createCoachSlot(
        makeReq(
          { role: "coach", _id: "123" },
          { date: "2025-01-01", startTime: "10:00", endTime: "11:00" }
        ),
        response
      )
    ).rejects.toThrow("DB error");
  });
});
