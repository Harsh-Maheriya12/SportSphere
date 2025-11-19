import React from "react";
import {
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Clock as PendingIcon,
} from "lucide-react";

interface Booking {
  _id: string;
  coachId?: {
    _id: string;
    username: string;
    email: string;
    profilePhoto: string;
  };
  playerId?: {
    _id: string;
    username: string;
    email: string;
    profilePhoto: string;
  };
  date: string;
  startTime: string;
  endTime: string;
  status: "pending" | "accepted" | "rejected";
  rejectionReason?: string;
  createdAt: string;
}

interface BookingCardProps {
  booking: Booking;
  userRole: string;
}

function BookingCard({ booking, userRole }: BookingCardProps) {

  // Other User
  const otherUser = userRole === "player" ? booking.coachId : booking.playerId;

  // Format date
  const formatDate = (dateString: string) => {
    const bookingDate = new Date(dateString);
    return bookingDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="bg-card/80 backdrop-blur rounded-xl border border-primary/20 p-6 hover:shadow-lg transition-all group relative ">
      {/* Status - Top Right */}
      <div className="absolute top-4 right-4">
        {/* Accepted */}
        {booking.status === "accepted" && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border 
                    bg-green-500/20 text-green-400 border-green-500/40"
          >
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-xs font-semibold uppercase">Accepted</span>
          </div>
        )}

        {/* Rejected */}
        {booking.status === "rejected" && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border 
                    bg-red-500/20 text-red-400 border-red-500/40"
          >
            <XCircle className="w-5 h-5 text-red-500" />
            <span className="text-xs font-semibold uppercase">Rejected</span>
          </div>
        )}

        {/* Pending */}
        {booking.status === "pending" && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border 
                    bg-yellow-500/20 text-yellow-400 border-yellow-500/40"
          >
            <PendingIcon className="w-5 h-5 text-yellow-500" />
            <span className="text-xs font-semibold uppercase">Pending</span>
          </div>
        )}
      </div>

      {/* Booking information */}
      <div className="flex items-start gap-4 pr-28">
        {/* Photo */}
        <img
          src={otherUser?.profilePhoto}
          alt={otherUser?.username}
          className="w-16 h-16 rounded-full object-cover border-2 border-primary/30 shadow-md group-hover:scale-105 transition-transform flex-shrink-0"
        />

        {/* Name, Date & Time */}
        <div className="flex-grow min-w-0">
          {/* Name */}
          <h3 className="text-lg font-bold text-foreground truncate mb-2">
            {otherUser?.username}
          </h3>

         
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {/* Date */}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
              <span className="font-medium">{formatDate(booking.date)}</span>
            </div>

            {/* Time */}
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary flex-shrink-0" />
              <span>
                {booking.startTime} - {booking.endTime}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Rejected*/}
      {booking.status === "rejected" && booking.rejectionReason && (
        <div className="mt-4 pt-4 border-t border-primary/20">
          <div className="p-4 bg-red-500/10 border-l-2 border-red-500 rounded-lg">
            <p className="text-sm text-red-400 font-semibold mb-1">
              Reason for Rejection:
            </p>
            <p className="text-sm text-red-300 break-words">{booking.rejectionReason}</p>
          </div>
        </div>
      )}

      {/* Accepted */}
      {booking.status === "accepted" && (
        <div className="mt-4 pt-4 border-t border-primary/20">
          <div className="p-4 bg-green-500/10 border-l-2 border-green-500 rounded-lg">
            <p className="text-sm text-green-400 font-semibold mb-1">
              Booking Confirmed!
            </p>
            <p className="text-sm text-green-300 break-words">
              Your booking is confirmed. Don't forget to attend on time!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookingCard;
