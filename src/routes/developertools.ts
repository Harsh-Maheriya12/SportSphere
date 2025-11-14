import express from "express";
import {
  listUsers,
  getUserById,
  deleteUserById,
  updateUserById,
  getUserByEmail,
  deleteUserByEmail,
  updateUserByEmail,
} from "../controllers/devController";

const router = express.Router();

router.get("/users", listUsers);
router.get("/users/:id", getUserById);
router.delete("/users/:id", deleteUserById);
router.put("/users/:id", updateUserById);

router.get("/users/email/:email", getUserByEmail);
router.delete("/users/email/:email", deleteUserByEmail);
router.put("/users/email/:email", updateUserByEmail);

export default router;
