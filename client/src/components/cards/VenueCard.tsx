import React from "react";
import { Link } from "react-router-dom";
import { MapPin, Star } from "lucide-react";
import  {Button}  from "../ui/button";

interface Venue {
  id: string;
  name: string;
  location: string;
  rating: number;
  reviews: number;
  sports: string;
  image?: string;
}

function VenueCard({
  id,
  name,
  location,
  rating,
  reviews,
  sports,
  image,
}: Venue) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-primary/20 hover:border-primary/60 transition-all">
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary/20 to-background">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
        />
      </div>

      {/* Content */}
      <div className="p-6 bg-card/80 backdrop-blur">
        <h3 className="text-xl font-bold mb-2">{name}</h3>

        {/* Location */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
          <MapPin className="w-4 h-4 text-primary" />
          <span>{location}</span>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-3">
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < Math.floor(rating)
                    ? "fill-orange-500 text-orange-500"
                    : "text-gray-600"
                }`}
              />
            ))}
          </div>
          <span className="text-sm text-muted-foreground">
            {rating} ({reviews})
          </span>
        </div>

        {/* Sports */}
        <p className="text-sm text-muted-foreground mb-4">{sports}</p>

        {/* Price Have to be added */}

        {/* This link should have to be updated*/}
        <Link to="/venues">
          <Button className="button-style1">
            Book Now
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default VenueCard;
