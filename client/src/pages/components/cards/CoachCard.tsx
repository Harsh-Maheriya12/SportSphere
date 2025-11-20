import React from "react";
import { Button } from "../ui/button";
import { IndianRupee, MapPin, Award, Calendar1, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Coach {
  id: string;
  username: string;
  email: string;
  gender: string;
  profilePhoto: string;
  age: number;
  sports: string[];
  location: {
    city: string;
    state: string;
    country: string;
  };
  pricing: number;
  experience: number;
}

function CoachCard({ coach }: { coach: Coach }) {
  const navigate = useNavigate();
  const onclickHandler = () => {
    navigate(`/coach/${coach.id}`);
  };
  return (
    <div
      key={coach.id}
      className="group relative overflow-hidden rounded-xl border-2 border-primary/20 hover:border-primary transition-all cursor-pointer hover:shadow-lg shadow-sm bg-card/80 backdrop-blur"
      onClick={onclickHandler}
    >
      {/* Image */}
      <div className="relative h-56 overflow-hidden">
        <img
          src={coach.profilePhoto}
          alt={coach.username}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>

        {/* Name */}
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-xl font-bold text-white drop-shadow-lg">
            {coach.username}
          </h3>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Location */}
        {coach.location && (coach.location.city || coach.location.state) && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 text-primary" />
            <span>
              {coach.location.city}, {coach.location.state},
              {coach.location.country}
            </span>
          </div>
        )}

        {/* Sports */}
        <div className="flex flex-wrap gap-2">
          {coach.sports.slice(0, 3).map((sport, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full border border-primary/30 hover:bg-primary/20 transition-colors ease-in-out"
            >
              {sport}
            </span>
          ))}
          {coach.sports.length > 3 && (
            <span className="px-3 py-1 bg-muted/50 text-muted-foreground text-xs font-semibold rounded-full border border-primary/10">
              +{coach.sports.length - 3}
            </span>
          )}
        </div>

        {/* Experience*/}
        <div className="flex items-center gap-2 text-sm">
          <Award className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">
            <span className="font-semibold text-foreground">
              {coach.experience}+
            </span>{" "}
            years experience
          </span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-primary/10">
          {/* Age*/}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar1 className="w-4 h-4 text-primary" />
              <span>{coach.age} yrs</span>
            </div>
            {/* Gender */}
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              <span>
                {coach.gender.charAt(0).toUpperCase() + coach.gender.slice(1)}
              </span>
            </div>
          </div>

          {/* Pricing */}
          <div className="flex items-center gap-2 text-primary font-bold text-lg">
            <IndianRupee className="h-4 w-4" />
            <span>{coach.pricing}</span>
            <span className="text-sm text-muted-foreground font-normal">
              /session
            </span>
          </div>
        </div>

        {/* View Profile */}
        <Button
          className="button-style1 w-full shadow-sm hover:shadow-md transition-all"
          onClick={(e) => {
            e.stopPropagation();
            onclickHandler();
          }}
        >
          View Profile
        </Button>
      </div>
    </div>
  );
}

export default CoachCard;
