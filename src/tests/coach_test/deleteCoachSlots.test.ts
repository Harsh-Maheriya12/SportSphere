import { deleteCoachSlot } from "../../controllers/coachController";
import CoachSlot from "../../models/coach/CoachSlot";

describe("deleteCoachSlot - controller unit tests", () => {

  const makeReq = (user: any, params: any) => ({ user, params } as any);

  const makeRes = () => ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  }) as any;

  afterEach(() => jest.restoreAllMocks());

  test("returns failure when a non-coach attempts to delete a slot", async () => {
    const response = makeRes();

    await deleteCoachSlot(
      makeReq({ role: "player", _id: "123" }, { id: "SLOT1" }),
      response
    );

    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: "Only coaches can delete slots",
    });
  });

  test("returns failure when the slot does not exist", async () => {
    jest.spyOn(CoachSlot, "findById").mockResolvedValue(null);

    const response = makeRes();

    await deleteCoachSlot(
      makeReq({ role: "coach", _id: "123" }, { id: "SLOT_X" }),
      response
    );

    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: "This slot does not exist",
    });
  });

  test("returns failure when attempting to delete another coach's slot", async () => {
    jest.spyOn(CoachSlot, "findById").mockResolvedValue({
      coachId: "999",
      isBooked: false,
    });

    const response = makeRes();

    await deleteCoachSlot(
      makeReq({ role: "coach", _id: "123" }, { id: "SLOT1" }),
      response
    );

    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: "You can only delete your own slots",
    });
  });

  test("returns failure when attempting to delete a booked slot", async () => {
    jest.spyOn(CoachSlot, "findById").mockResolvedValue({
      coachId: "123",
      isBooked: true,
    });

    const response = makeRes();

    await deleteCoachSlot(
      makeReq({ role: "coach", _id: "123" }, { id: "SLOT1" }),
      response
    );

    expect(response.json).toHaveBeenCalledWith({
      success: false,
      message: "Cannot delete a booked slot",
    });
  });

  test("deletes an unbooked slot when the coach owns it", async () => {
    jest.spyOn(CoachSlot, "findById").mockResolvedValue({
      coachId: "123",
      isBooked: false,
    });

    const mockDelete = jest
      .spyOn(CoachSlot, "findByIdAndDelete")
      .mockResolvedValue(true as any);

    const response = makeRes();

    await deleteCoachSlot(
      makeReq({ role: "coach", _id: "123" }, { id: "SLOT1" }),
      response
    );

    expect(mockDelete).toHaveBeenCalled();
    expect(response.json).toHaveBeenCalledWith({
      success: true,
      message: "Slot deleted successfully",
    });
  });

  test("propagates database errors from CoachSlot lookup", async () => {
    jest.spyOn(CoachSlot, "findById").mockRejectedValue(new Error("DB error"));

    const response = makeRes();

    await expect(
      deleteCoachSlot(
        makeReq({ role: "coach", _id: "123" }, { id: "SLOT1" }),
        response
      )
    ).rejects.toThrow("DB error");
  });

});
