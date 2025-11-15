import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGetAllCoaches } from "../services/api";
import CoachCard from "../components/cards/CoachCard";

interface Coach {
  id: string;
  username: string;
  email: string;
  profilePhoto: string;
  age: number;
  gender: string;
  sports: string[];
  location: {
    city: string;
    state: string;
    country: string;
  };
  pricing: number;
  experience: number;
}

function Coaches() {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Featch Coaches
  useEffect(() => {
    const loadCoaches = async () => {
      try {
        setLoading(true);
        const response = await apiGetAllCoaches();
        setCoaches(response.coaches);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadCoaches();
  }, []);

  // Redirect to coach details
  const handleCoachClick = (coachId: string) => {
    navigate(`/coach/${coachId}`);
  };

  return (
    <div className="min-h-screen bg-white/10 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <h1 className="text-4xl font-bold text-white mb-10 justify-center flex">
          Find&nbsp;Your&nbsp;<span className="text-primary">Coach</span>
        </h1>

        {/* Loading*/}
        {loading && (
          <div className="flex flex-col items-center justify-center py-28 space-y-4">
            <div className="h-14 w-14 animate-spin rounded-full border-4 border-primary/20 border-t-primary"></div>
            <p className="text-muted-foreground">Loading amazing coaches...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="text-center py-20">
            <p className="text-red-500 text-lg font-medium">{error}</p>
            <p className="text-muted-foreground text-sm">
              Please try again later.
            </p>
          </div>
        )}

        {/* No Coaches */}
        {!loading && !error && coaches.length === 0 && (
          <div className="flex flex-col items-center py-24 space-y-4 bg-card/40 backdrop-blur border border-primary/20 rounded-xl">
            <svg
              className="h-14 w-14 text-primary/60"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 10h16M4 14h10M4 18h6"
              />
            </svg>
            <p className="text-lg text-white font-semibold">No coaches found</p>
          </div>
        )}

        {/* Coaches Grid */}
        {!loading && !error && coaches.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {coaches.map((coach) => (
              <div
                key={coach.id}
                className="transition-all duration-300 group hover:scale-[1.02] hover:-translate-y-1"
                onClick={() => handleCoachClick(coach.id)}
              >
                <CoachCard coach={coach} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Coaches;
