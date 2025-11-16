import React, { useState } from "react";
import { useParams } from "react-router-dom";

export default function TimeSlotBooking() {
  const { id } = useParams();

  // ------------------ HARDCODED SPORT LIST ------------------
  const sportsList = ["Football", "Cricket", "Badminton", "Tennis", "Basketball"];

  // ------------------ HARDCODED GROUNDS PER SPORT ------------------
  const groundData = {
    Football: ["Turf A", "Turf B"],
    Cricket: ["Pitch 1", "Pitch 2"],
    Badminton: ["Court 1", "Court 2", "Court 3"],
    Tennis: ["Tennis Court 1"],
    Basketball: ["Indoor Court"],
  };

  // ------------------ HARDCODED TIME SLOTS PER GROUND ------------------
  const slotData = {
    "Turf A": ["06:00 AM - 07:00 AM", "07:00 AM - 08:00 AM"],
    "Turf B": ["06:00 PM - 07:00 PM", "07:00 PM - 08:00 PM"],

    "Pitch 1": ["04:00 PM - 05:00 PM", "05:00 PM - 06:00 PM"],
    "Pitch 2": ["06:00 PM - 07:00 PM", "07:00 PM - 08:00 PM"],

    "Court 1": ["06:00 AM - 07:00 AM", "07:00 AM - 08:00 AM"],
    "Court 2": ["05:00 PM - 06:00 PM", "06:00 PM - 07:00 PM"],
    "Court 3": ["07:00 PM - 08:00 PM"],

    "Tennis Court 1": ["08:00 AM - 09:00 AM", "09:00 AM - 10:00 AM"],

    "Indoor Court": ["06:00 PM - 07:00 PM", "07:00 PM - 08:00 PM"],
  };

  // ------------------ STATE ------------------
  const [selectedSport, setSelectedSport] = useState(null);
  const [selectedGround, setSelectedGround] = useState(null);

  // ------------------ HANDLE BOOKING ------------------
  const handleBooking = (slot) => {
    alert(
      `Booking Confirmed!\nSport: ${selectedSport}\nGround: ${selectedGround}\nTime: ${slot}`
    );
  };

  return (
    <div className="min-h-screen p-8 bg-white/10 text-white">

      {/* Title */}
      <h1 className="text-4xl font-bold mb-4">Book Your Slot</h1>



      {/* ------------------ STEP 1: SELECT SPORT ------------------ */}
      <h2 className="text-2xl mb-3">Select Sport</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
        {sportsList.map((sport) => (
          <button
            key={sport}
            onClick={() => {
              setSelectedSport(sport);
              setSelectedGround(null); // reset ground
            }}
            className={`p-4 rounded-xl transition shadow bg-white/20 
              ${selectedSport === sport ? "bg-green-600" : "hover:bg-white/30"}`}
          >
            {sport}
          </button>
        ))}
      </div>



      {/* ------------------ STEP 2: SELECT GROUND ------------------ */}
      {selectedSport && (
        <>
          <h2 className="text-2xl mb-3">Select Ground for {selectedSport}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {groundData[selectedSport].map((ground) => (
              <button
                key={ground}
                onClick={() => setSelectedGround(ground)}
                className={`p-4 rounded-xl transition shadow bg-white/20 
                ${
                  selectedGround === ground ? "bg-blue-600" : "hover:bg-white/30"
                }`}
              >
                {ground}
              </button>
            ))}
          </div>
        </>
      )}



      {/* ------------------ STEP 3: SELECT TIME SLOT ------------------ */}
      {selectedGround && (
        <>
          <h2 className="text-2xl mb-3">
            Select Time Slot for {selectedGround}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {slotData[selectedGround].map((slot) => (
              <button
                key={slot}
                onClick={() => handleBooking(slot)}
                className="p-4 rounded-xl bg-white/20 hover:bg-white/30 shadow transition"
              >
                {slot}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
