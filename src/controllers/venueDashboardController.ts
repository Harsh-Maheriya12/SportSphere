// src/controllers/venueDashboardController.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import Booking from "../models/Booking";
import Venue from "../models/Venue";
import Game from "../models/gameModels";

import Groq from "groq-sdk";

// Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Types 


interface RevenueByMonth {
  year: number;
  month: number;
  totalRevenue: number;
  bookings: number;
}

interface BookingsByDow {
  dayOfWeek: number;
  bookings: number;
}

interface SportsBreakdown {
  sport: string;
  bookings: number;
  revenue: number;
}

interface DashboardKpis {
  totalBookings: number;
  totalRevenue: number;
  avgTicketSize: number;
  avgRating: number;
  totalRatings: number;
  uniqueCustomers: number;
  repeatCustomers: number;
  repeatCustomerRate: number;
  gamesHosted: number;
}

// Extract JSON even if LLM adds text
function extractJSON(text: string) {
  const s = text.indexOf("{");
  const e = text.lastIndexOf("}");
  if (s === -1 || e === -1) return null;
  try {
    return JSON.parse(text.substring(s, e + 1));
  } catch {
    return null;
  }
}

// Groq LLM Call
async function callGroqInsights(payload: any) {
  const systemPrompt = `
You are an expert business analyst for sports venues.
Given raw JSON metrics, generate insights ONLY in STRICT JSON format:

{
  "insights": [
    { "title": "...", "detail": "...", "priority": "high|medium|low" }
  ],
  "summary": "...",
  "confidence": 0.0
}

NO extra text. NO explanation. Only JSON.
`;

  const userMessage = `
Here is the venue analytics data:

${JSON.stringify(payload, null, 2)}

Screenshot path: "${payload.screenshotPath}"

Generate 3–6 highly actionable insights.
`;

  const response = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",       // BEST Groq model (free & fast)
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    temperature: 0.2,
    max_tokens: 700,
  });

  const text = response.choices[0].message?.content || "";
  const json = extractJSON(text);

  return { raw: text, json };
}

// Main Dashboard Controller
export const getVenueOwnerDashboard = async (
  req: Request,
  res: Response
) => {
  try {
    const { venueId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(venueId)) {
      return res.status(400).json({ message: "Invalid venue ID" });
    }
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const venue = await Venue.findById(venueId).lean();
    if (!venue) return res.status(404).json({ message: "Venue not found" });

    // Authorization
    if (
      venue.owner.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Time ranges
    const range = parseInt((req.query.rangeDays as string) || "90");
    const now = new Date();
    const start = new Date();
    start.setDate(now.getDate() - (range - 1));

    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - (range - 1) * 86400000);

    // Base match
    const baseMatch = {
      venueId: new mongoose.Types.ObjectId(venueId),
      status: "Paid",
      createdAt: { $gte: start, $lte: now },
    };

    // Parallel aggregations
    const [
      bookings,
      revenueByMonth,
      bookingsByDow,
      sportsBreakdown,
      repeatCustomersAgg,
      prevRevenueAgg,
      gamesHosted,
    ] = await Promise.all([
      Booking.find(baseMatch).lean(),

      Booking.aggregate<RevenueByMonth>([
        { $match: baseMatch },
        {
          $group: {
            _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
            totalRevenue: { $sum: "$amount" },
            bookings: { $sum: 1 },
          },
        },
      ]),

      Booking.aggregate<BookingsByDow>([
        { $match: baseMatch },
        { $group: { _id: { $dayOfWeek: "$startTime" }, bookings: { $sum: 1 } } },
      ]),

      Booking.aggregate<SportsBreakdown>([
        { $match: baseMatch },
        {
          $group: {
            _id: "$sport",
            bookings: { $sum: 1 },
            revenue: { $sum: "$amount" },
          },
        },
      ]),

      Booking.aggregate<{ _id: string; bookings: number }>([
        { $match: baseMatch },
        {
          $group: {
            _id: "$user",
            bookings: { $sum: 1 },
          },
        },
      ]),

      Booking.aggregate<{ totalRevenue: number }>([
        {
          $match: {
            venueId: new mongoose.Types.ObjectId(venueId),
            status: "Paid",
            createdAt: { $gte: prevStart, $lte: prevEnd },
          },
        },
        { $group: { _id: null, totalRevenue: { $sum: "$amount" } } },
      ]),

      Game.countDocuments({
        "venue.venueId": new mongoose.Types.ObjectId(venueId),
        createdAt: { $gte: start, $lte: now },
      }),
    ]);

    // KPIs      (KPI = Kwe Performancde Indicators)
    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((a, b) => a + b.amount, 0);

    const uniqueCustomers = repeatCustomersAgg.length;
    const repeatCustomers = repeatCustomersAgg.filter((u) => u.bookings > 1).length;

    const prevRevenue = prevRevenueAgg[0]?.totalRevenue || 0;
    const revenueChangePercent =
      prevRevenue > 0
        ? ((totalRevenue - prevRevenue) / prevRevenue) * 100
        : 0;

    const kpis: DashboardKpis = {
      totalBookings,
      totalRevenue,
      avgTicketSize: totalBookings ? totalRevenue / totalBookings : 0,
      avgRating: venue.averageRating || 0,
      totalRatings: venue.totalRatings || 0,
      uniqueCustomers,
      repeatCustomers,
      repeatCustomerRate: uniqueCustomers ? repeatCustomers / uniqueCustomers : 0,
      gamesHosted,
    };

    // LLM Payload
    const llmPayload = {
      venue: {
        id: venue._id.toString(),
        name: venue.name,
        city: venue.city,
        sports: venue.sports || [],
      },
      kpis,
      revenueByMonth,
      bookingsByDow,
      sportsBreakdown,
      revenueChangePercent,
      screenshotPath: "/mnt/data/94a1cd87-f5ad-4a4d-a25e-0193a7281062.png",
    };

    // Call Groq
    const { json, raw } = await callGroqInsights(llmPayload);

    if (!json) {
      return res.status(500).json({
        message: "LLM failed to produce valid JSON",
        debug: raw,
      });
    }

    return res.status(200).json({
      venue: llmPayload.venue,
      period: { from: start, to: now, previousFrom: prevStart, previousTo: prevEnd },
      kpis,
      revenueByMonth,
      bookingsByDow,
      sportsBreakdown,
      revenueChangePercent,
      aiInsights: json.insights,
      summary: json.summary,
      confidence: json.confidence,
      rawLLM: raw,
    });
  } catch (err: any) {
    console.error("Dashboard LLM Error:", err);
    return res.status(500).json({ error: err.message });
  }
};