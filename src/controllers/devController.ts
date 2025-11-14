import User from "../models/User";
import { Request, Response } from "express";

// List all users
export const listUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find({});
    return res.json({ status: "success", users });
  } catch (err) {
    return res.status(500).json({ status: "error", message: "Failed to fetch users", error: String(err) });
  }
};

// Get user by ID
export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ status: "error", message: "User not found" });
    return res.json({ status: "success", user });
  } catch (err) {
    return res.status(500).json({ status: "error", message: "Failed to fetch user", error: String(err) });
  }
};

// Delete user by ID
export const deleteUserById = async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ status: "error", message: "User not found" });
    return res.json({ status: "success", message: "User deleted", user });
  } catch (err) {
    return res.status(500).json({ status: "error", message: "Failed to delete user", error: String(err) });
  }
};

// Update user by ID
export const updateUserById = async (req: Request, res: Response) => {
  try {
    const { email, username, role } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      { email, username, role },
      { new: true }
    );
    if (!updated) return res.status(404).json({ status: "error", message: "User not found" });
    return res.json({ status: "success", updated });
  } catch (err) {
    return res.status(500).json({ status: "error", message: "Failed to update user", error: String(err) });
  }
};

// Get user by email
export const getUserByEmail = async (req: Request, res: Response) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) return res.status(404).json({ status: "error", message: "User not found" });
    return res.json({ status: "success", user });
  } catch (err) {
    return res.status(500).json({ status: "error", message: "Failed to fetch user by email", error: String(err) });
  }
};

// Delete user by email
export const deleteUserByEmail = async (req: Request, res: Response) => {
  try {
    const user = await User.findOneAndDelete({ email: req.params.email });
    if (!user) return res.status(404).json({ status: "error", message: "User not found" });
    return res.json({ status: "success", message: "User deleted", user });
  } catch (err) {
    return res.status(500).json({ status: "error", message: "Failed to delete user by email", error: String(err) });
  }
};

// Update user by email
export const updateUserByEmail = async (req: Request, res: Response) => {
  try {
    const { email, username, role } = req.body;
    const updated = await User.findOneAndUpdate(
      { email: req.params.email },
      { email, username, role },
      { new: true }
    );
    if (!updated) return res.status(404).json({ status: "error", message: "User not found" });
    return res.json({ status: "success", updated });
  } catch (err) {
    return res.status(500).json({ status: "error", message: "Failed to update user by email", error: String(err) });
  }
};
