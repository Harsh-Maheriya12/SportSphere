import type React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, Plus, X, Edit2, Save, CheckCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  apiGetMyCoachDetails,
  apiCreateOrUpdateCoachDetail,
  apiDeleteCoachPhoto,
} from "../../services/api";
import CoachDashboardNav from "../../components/CoachDashboardNav";

interface CoachDetail {
  _id: string;
  coachId: string;
  sports: string[];
  description: string;
  experience: number;
  pricing: number;
  location: {
    city: string;
    state: string;
    country: string;
    address: string;
  };
  photoGallery: string[];
}

function ManageCoachProfile() {
  const { user } = useAuth();
  const [coachDetail, setCoachDetail] = useState<CoachDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [sports, setSports] = useState<string[]>([]);
  const [sportInput, setSportInput] = useState("");
  const [description, setDescription] = useState("");
  const [experience, setExperience] = useState(0);
  const [pricing, setPricing] = useState(0);
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [country, setCountry] = useState("");
  const [address, setAddress] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // Remove Error Message
  useEffect(() => {
    if (error.length > 0) {
      {
        setTimeout(() => setError(""), 3000);
      }
    }
  }, [error]);

  // Remove Success Message
  useEffect(() => {
    if (success.length > 0) {
      {
        setTimeout(() => setSuccess(""), 3000);
      }
    }
  }, [success]);

  // Featch Coach Details
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await apiGetMyCoachDetails();

        if (response.success && response.coachDetail) {
          const detail = response.coachDetail;
          setCoachDetail(detail);

          // Set form values
          setSports(detail.sports || []);
          setDescription(detail.description || "");
          setExperience(detail.experience || 0);
          setPricing(detail.pricing || 0);
          setCity(detail.location?.city || "");
          setState(detail.location?.state || "");
          setCountry(detail.location?.country || "");
          setAddress(detail.location?.address || "");
        }
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Reset form to original values
  const handleCancel = () => {
    if (!coachDetail) return;

    setIsEditing(false);
    setSports(coachDetail.sports || []);
    setSportInput("");
    setDescription(coachDetail.description || "");
    setExperience(coachDetail.experience || 0);
    setPricing(coachDetail.pricing || 0);
    setCity(coachDetail.location?.city || "");
    setState(coachDetail.location?.state || "");
    setCountry(coachDetail.location?.country);
    setAddress(coachDetail.location?.address || "");
    setSelectedPhotos([]);
    setPreviewUrls([]);
  };

  // Save changes
  const handleSave = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response = await apiCreateOrUpdateCoachDetail(
        sports,
        description,
        experience,
        pricing,
        city,
        state,
        country,
        address,
        selectedPhotos.length > 0 ? selectedPhotos : undefined
      );

      setSuccess(response.message);

      // Reload new data
      const freshData = await apiGetMyCoachDetails();
      if (freshData.success && freshData.coachDetail) {
        const detail = freshData.coachDetail;
        setCoachDetail(detail);
        setSports(detail.sports || []);
        setDescription(detail.description || "");
        setExperience(detail.experience || 0);
        setPricing(detail.pricing || 0);
        setCity(detail.location?.city || "");
        setState(detail.location?.state || "");
        setCountry(detail.location?.country || "");
        setAddress(detail.location?.address || "");
      }
      setSelectedPhotos([]);
      setPreviewUrls([]);
      setIsEditing(false);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete a photo
  const handleDeletePhoto = async (photoUrl: string) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await apiDeleteCoachPhoto(photoUrl);

      setSuccess("Photo deleted successfully!");

      // Reload data
      const response = await apiGetMyCoachDetails();
      if (response.success && response.coachDetail) {
        setCoachDetail(response.coachDetail);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Remove sport from the list
  const handleRemoveSport = (index: number) => {
    setSports(sports.filter((_, i) => i !== index));
  };

  // Add new sport
  const handleAddSport = () => {
    if (sportInput.trim() && sports.length < 10) {
      setSports([...sports, sportInput.trim()]);
      setSportInput("");
    }
  };

  // Handle photo file selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos = Array.from(files);
    setSelectedPhotos([...selectedPhotos, ...newPhotos]);

    const newPreviews = newPhotos.map((file) => URL.createObjectURL(file));
    setPreviewUrls([...previewUrls, ...newPreviews]);
  };

  // Remove newly selected photo (before saving)
  const handleRemoveSelectedPhoto = (index: number) => {
    setSelectedPhotos(selectedPhotos.filter((_, i) => i !== index));
    setPreviewUrls(previewUrls.filter((_, i) => i !== index));
  };

  const totalPhotos =
    (coachDetail?.photoGallery?.length || 0) + selectedPhotos.length;


    if(user?.role !== "coach") {
     const navigate = useNavigate();
     navigate('/');
     return null;
  }

  return (
    <div className="min-h-screen bg-white/10 p-2">
      <CoachDashboardNav />

      {/* Error Message */}
      {error && (
        <div className="bg-destructive/20 border-l-4 border-destructive text-foreground p-4 rounded-lg flex items-center space-x-2 mb-4">
          <div className="shrink-0 w-1 h-4 bg-destructive rounded-full" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-500/20 border-l-4 border-green-500 text-foreground p-4 rounded-lg flex items-center space-x-2 mb-4">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <p className="text-sm font-medium">{success}</p>
        </div>
      )}

      <div className="bg-card p-6 rounded-xl shadow-sm border relative">
        {/* Edit/Cancel/Save Buttons - Top Right */}
        <div className="absolute top-6 right-6 z-10">
          {/* Edit */}
          {!isEditing ? (
            <Button
              onClick={() => setIsEditing(true)}
              className="button-style1 border-transparent flex items-center gap-2 shadow-md hover:shadow-lg transition-shadow"
            >
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-3">
              {/* Cancel */}
              <Button
                onClick={handleCancel}
                variant="outline"
                className="flex items-center gap-2 rounded-xl"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>

              {/* Save */}
              <Button
                onClick={handleSave}
                disabled={loading}
                className="button-style1 border-transparent flex items-center gap-2 shadow-md hover:shadow-lg transition-shadow"
              >
                <Save className="w-4 h-4" />
                {loading ? "Saving..." : "Save"}
              </Button>
            </div>
          )}
        </div>

        {/* Coach Info*/}
        <div className="space-y-8 pt-12">
          <div className="bg-card rounded-xl border border-primary/15 p-6 md:p-8 shadow-sm">
            <div className="space-y-6">
              {/* Sports */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold mb-4 text-foreground">
                  <div className="w-1 h-1 rounded-full bg-primary"></div>
                  Sports ({sports.length}/10)
                </label>

                <div className="flex flex-wrap gap-2 mb-4">
                  {sports.length === 0 ? (
                    <span className="px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-full border border-primary/20">
                      No sports listed
                    </span>
                  ) : (
                    sports.map((sport, index) => (
                      <div
                        key={index}
                        className="px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-full border border-primary/20 flex items-center gap-2 hover:bg-primary/20 transition-all"
                      >
                        <span className="text-sm font-medium">{sport}</span>
                        {isEditing && (
                          <button
                            onClick={() => handleRemoveSport(index)}
                            className="text-muted-foreground hover:text-destructive transition-colors rounded-xl"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Add Sport Input */}
                {isEditing && sports.length < 10 && (
                  <div className="flex gap-2 items-center flex-wrap mb-4">
                    <input
                      type="text"
                      value={sportInput}
                      onChange={(e) => setSportInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddSport();
                        }
                      }}
                      placeholder="Add a sport (e.g., Cricket, Football)"
                      className="flex-1 px-4 py-2.5 rounded-lg border border-primary/20 bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <Button
                      onClick={handleAddSport}
                      disabled={!sportInput.trim()}
                      className="h-11 rounded-xl flex items-center justify-center border-2 border-transparent bg-primary hover:border-white transition-colors"
                    >
                      <Plus className="w-4 h-4 rounded-xl" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold mb-4 text-foreground">
                  <div className="w-1 h-1 rounded-full bg-primary"></div>
                  Location
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={!isEditing}
                    placeholder="City"
                    className="px-4 py-2.5 rounded-lg border border-primary/20 bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  />
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    disabled={!isEditing}
                    placeholder="State"
                    className="px-4 py-2.5 rounded-lg border border-primary/20 bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  />
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    disabled={!isEditing}
                    placeholder="Country"
                    className="px-4 py-2.5 rounded-lg border border-primary/20 bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  />
                </div>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Address (Street, Building, Landmark)"
                  className="w-full px-4 py-2.5 rounded-lg border border-primary/20 bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold mb-4 text-foreground">
                  <div className="w-1 h-1 rounded-full bg-primary"></div>
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!isEditing}
                  placeholder="Tell players about your coaching experience, achievements, and coaching style..."
                  rows={5}
                  maxLength={2000}
                  className="w-full px-4 py-3 rounded-lg border border-primary/20 bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all resize-none"
                />
                <p className="text-xs text-muted-foreground mt-2 flex justify-between">
                  <span>Maximum 2000 characters</span>
                  <span
                    className={
                      description.length > 1800 ? "text-destructive" : ""
                    }
                  >
                    {description.length}/2000
                  </span>
                </p>
              </div>

              {/* Experience and Pricing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold mb-4 text-foreground">
                    <div className="w-1 h-1 rounded-full bg-primary"></div>
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    value={experience === 0 ? "" : experience}
                    onChange={(e) =>
                      setExperience(
                        e.target.value === "" ? 0 : Number(e.target.value)
                      )
                    }
                    disabled={!isEditing}
                    min={0}
                    placeholder="Enter years of experience"
                    className="w-full px-4 py-2.5 rounded-lg border border-primary/20 bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold mb-4 text-foreground">
                    <div className="w-1 h-1 rounded-full bg-primary"></div>
                    Rate per Session (Rs.)
                  </label>
                  <input
                    type="number"
                    value={pricing === 0 ? "" : pricing}
                    onChange={(e) =>
                      setPricing(
                        e.target.value === "" ? 0 : Number(e.target.value)
                      )
                    }
                    disabled={!isEditing}
                    min={0}
                    placeholder="Enter rate per session"
                    className="w-full px-4 py-2.5 rounded-lg border border-primary/20 bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Photo Gallery */}
          <div className="bg-card rounded-xl border border-primary/15 p-6 md:p-8 shadow-sm">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-foreground">
                Photo Gallery
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {totalPhotos}/10 photos
              </p>
            </div>

            {totalPhotos === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-primary/20 rounded-lg bg-primary/2">
                <User className="w-12 h-12 mx-auto text-primary/30 mb-4" />
                <p className="text-muted-foreground mb-2">
                  No photos uploaded yet
                </p>
                {isEditing && (
                  <label className="cursor-pointer inline-block">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    <div className="text-center">
                      <Plus className="w-8 h-8 mx-auto text-primary/40 mb-2" />
                      <p className="text-xs text-muted-foreground">Add Photo</p>
                    </div>
                  </label>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Existing Photos */}
                {coachDetail?.photoGallery?.map((photo, index) => (
                  <div
                    key={`existing-${index}`}
                    className="relative aspect-square rounded-xl overflow-hidden border border-primary/20 shadow-sm"
                  >
                    <img
                      src={photo}
                      alt={`Gallery ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {isEditing && (
                      <button
                        onClick={() => handleDeletePhoto(photo)}
                        className="absolute top-2 right-2 bg-destructive hover:bg-destructive/90 text-white p-2 rounded-full shadow-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                {/* New Photos Preview */}
                {previewUrls.map((url, index) => (
                  <div
                    key={`preview-${index}`}
                    className="relative aspect-square rounded-lg overflow-hidden border-2 border-primary/50 shadow-sm"
                  >
                    <img
                      src={url}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-md font-medium shadow-md">
                      New
                    </div>
                    <button
                      onClick={() => handleRemoveSelectedPhoto(index)}
                      className="absolute top-2 right-2 bg-destructive hover:bg-destructive/90 text-white p-2 rounded-full shadow-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {/* Add Photo Button */}
                {isEditing && totalPhotos < 10 && (
                  <label className="cursor-pointer aspect-square rounded-lg border-2 border-dashed border-primary/20 hover:border-primary/40 bg-primary/2 hover:bg-primary/5 transition-all flex items-center justify-center">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    <div className="text-center">
                      <Plus className="w-8 h-8 mx-auto text-primary/40 mb-2" />
                      <p className="text-xs text-muted-foreground">Add Photo</p>
                    </div>
                  </label>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ManageCoachProfile;
