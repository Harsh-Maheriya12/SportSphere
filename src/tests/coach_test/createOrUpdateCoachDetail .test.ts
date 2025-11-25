import { createOrUpdateCoachDetail } from "../../controllers/coachController";
import CoachDetail from "../../models/coach/CoachDetail";
import * as cloudinary from "../../utils/cloudinaryUploader";
import * as fileHelper from "../../utils/FileHelper";

describe("createOrUpdateCoachDetail", () => {
  const makeFile = (name = "f.jpg") => ({ path: `/tmp/${name}`, originalname: name } as Express.Multer.File);

  const makeReq = (user: any, body: any = {}, files?: Express.Multer.File[]) => ({ user, body, files } as any);

  const makeRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() } as any);

  beforeEach(() => {
    jest.spyOn(cloudinary, "uploadToCloudinary").mockResolvedValue("uploaded-url");
    jest.spyOn(fileHelper, "deleteUploadedFiles").mockImplementation(() => undefined as any);
  });

  afterEach(() => jest.restoreAllMocks());

  test("returns error when non-coach attempts update", async () => {
    const res = makeRes();

    await createOrUpdateCoachDetail(makeReq({ role: "player", _id: "P1" }, { description: "x" }), res);

    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Only coaches can update coach details" });
  });

  test("rejects when more than 10 photos provided", async () => {
    const files = Array.from({ length: 11 }, (_, i) => makeFile(`f${i}.jpg`));
    const res = makeRes();

    await createOrUpdateCoachDetail(makeReq({ role: "coach", _id: "C1" }, {}, files), res);

    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Maximum 10 photos allowed" });
  });

  test("updates existing detail and appends photos (capped at 10)", async () => {
    const existing = {
      coachId: "C1",
      sports: ["Football"],
      description: "old",
      experience: 2,
      pricing: 100,
      location: { city: "A", state: "B", country: "C", address: "addr" },
      photoGallery: ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"],
      save: jest.fn().mockResolvedValue(true),
    } as any;

    jest.spyOn(CoachDetail, "findOne").mockResolvedValue(existing);
    (cloudinary.uploadToCloudinary as jest.Mock).mockImplementation((p: string) => Promise.resolve(`url-for-${p}`));

    const files = [makeFile("a.jpg"), makeFile("b.jpg")];
    const body = { description: "new-desc", sports: JSON.stringify(["Tennis"]) };
    const res = makeRes();

    await createOrUpdateCoachDetail(makeReq({ role: "coach", _id: "C1" }, body, files), res);

    expect(CoachDetail.findOne).toHaveBeenCalledWith({ coachId: "C1" });
    expect(existing.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: "Coach details updated successfully", coachDetail: existing }));
    expect(existing.sports).toEqual(["Tennis"]);
    expect(existing.description).toBe("new-desc");
    expect(existing.photoGallery.length).toBeLessThanOrEqual(10);
  });

  test("updates numeric and location fields on existing detail", async () => {
    const existing = {
      coachId: "C5",
      sports: ["Football"],
      description: "old",
      experience: 2,
      pricing: 100,
      location: { city: "OldCity", state: "OldState", country: "OldCountry", address: "OldAddr" },
      photoGallery: [],
      save: jest.fn().mockResolvedValue(true),
    } as any;

    jest.spyOn(CoachDetail, "findOne").mockResolvedValue(existing);
    (cloudinary.uploadToCloudinary as jest.Mock).mockImplementation((p: string) => Promise.resolve(`url-for-${p}`));

    const body = {
      experience: "5",
      pricing: "250.25",
      city: "NewCity",
      state: "NewState",
      country: "NewCountry",
      address: "New Address 123",
    };

    const res = makeRes();

    await createOrUpdateCoachDetail(makeReq({ role: "coach", _id: "C5" }, body), res);

    expect(CoachDetail.findOne).toHaveBeenCalledWith({ coachId: "C5" });
    expect(existing.save).toHaveBeenCalled();
    expect(existing.experience).toBe(5);
    expect(existing.pricing).toBeCloseTo(250.25);
    expect(existing.location).toMatchObject({ city: "NewCity", state: "NewState", country: "NewCountry", address: "New Address 123" });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: "Coach details updated successfully", coachDetail: existing }));
  });

  test("creates new coach detail and parses numeric fields", async () => {
    jest.spyOn(CoachDetail, "findOne").mockResolvedValue(null);
    const saveMock = jest.fn().mockResolvedValue(true);
    jest.spyOn(CoachDetail.prototype as any, "save").mockImplementation(saveMock);
    (cloudinary.uploadToCloudinary as jest.Mock).mockResolvedValue("uploaded-url-1");

    const body = {
      sports: JSON.stringify(["Cricket", "Badminton"]),
      description: "I coach",
      experience: "4",
      pricing: "150.5",
      city: "CityX",
      state: "StateY",
      country: "CountryZ",
      address: "Some address",
    };

    const files = [makeFile("one.jpg")];
    const res = makeRes();

    await createOrUpdateCoachDetail(makeReq({ role: "coach", _id: "C2" }, body, files), res);

    expect(CoachDetail.findOne).toHaveBeenCalledWith({ coachId: "C2" });
    expect(saveMock).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: "Coach details created successfully", coachDetail: expect.any(Object) }));
  });

  test("accepts sports passed as an array", async () => {
    jest.spyOn(CoachDetail, "findOne").mockResolvedValue(null);
    const saveMock = jest.fn().mockResolvedValue(true);
    jest.spyOn(CoachDetail.prototype as any, "save").mockImplementation(saveMock);

    const body = { sports: ["Gymnastics", "Swimming"], description: "desc" };
    const res = makeRes();

    await createOrUpdateCoachDetail(makeReq({ role: "coach", _id: "C3" }, body), res);

    expect(saveMock).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, message: "Coach details created successfully" }));
  });

  test("cleans up uploads on error and rethrows", async () => {
    jest.spyOn(CoachDetail, "findOne").mockResolvedValue(null);

    (cloudinary.uploadToCloudinary as jest.Mock).mockResolvedValue("uploaded-url");

    jest.spyOn(CoachDetail.prototype as any, "save").mockRejectedValue(new Error("save failed"));

    const files = [makeFile("one.jpg")];
    const res = makeRes();

    await expect(
        createOrUpdateCoachDetail(
        makeReq({ role: "coach", _id: "C9" }, { description: "x" }, files),
        res
        )
    ).rejects.toThrow("save failed");

    expect(fileHelper.deleteUploadedFiles).toHaveBeenCalledWith(files);
    })

});
