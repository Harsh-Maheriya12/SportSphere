// src/routes/venueRoutes.ts
import express, { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { createVenue, getAllVenues, deleteVenue,getSuggestions } from "../controllers/venueController";
import { protect } from "../middleware/authMiddleware";


const router = express.Router();

//  Validation middleware — ensures all required fields exist
const validateVenue = [
  body("name")
    .isLength({ min: 2 })
    .withMessage("Venue name must be at least 2 characters long"),
  
  body("address")
    .notEmpty()
    .withMessage("Address is required"),
  
  body("city")
    .notEmpty()
    .withMessage("City is required"),
  
  body("pricePerHour")
    .isNumeric()
    .withMessage("Price per hour must be a number"),
  
  body("latitude")
  .optional({ nullable: true })
  .isFloat({ min: -90, max: 90 })
  .withMessage("Latitude must be between -90 and 90"),
  
  body("longitude")
  .optional({ nullable: true })
  .isFloat({ min: -180, max: 180 })
  .withMessage("Longitude must be between -180 and 180"),
  
  (req: Request, res: Response, next: NextFunction): void => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    next();
  },
];

//  Routes
router.post("/", protect, validateVenue, createVenue); // Create a venue
router.get("/", getAllVenues);    
router.get("/suggestions", getSuggestions);            // auto-complete search
router.delete("/:id", protect, deleteVenue);           // Delete venue

export default router;