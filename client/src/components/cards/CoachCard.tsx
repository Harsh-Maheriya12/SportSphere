import React from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { Button } from "../ui/button";

interface Coach {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  reviews: number;
  price: string;
  image?: string;
}

function CoachCard({
  id,
  name,
  specialty,
  rating,
  reviews,
  price,
  image,
}: Coach) {
  return (
    <div
      key={id}
      className="group relative overflow-hidden rounded-xl border border-primary/20 hover:border-primary/60 transition-all"
    >
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

        {/* Name */}
        <h3 className="text-xl font-bold mb-2">{name}</h3>

        {/* Specialty */}
        <p className="text-sm text-primary font-semibold mb-3">{specialty}</p>

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

        {/* This have to be updated */}
        <Link to="/coaches">
          <p className="text-lg font-bold text-primary mb-4">{price}</p>
          <Button className="button-style1">
            Book Coach
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default CoachCard;
