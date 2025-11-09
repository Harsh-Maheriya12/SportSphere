import request from 'supertest';
import mongoose from 'mongoose';
import app from '../app';
import Game from '../models/gameModels';
import User from '../models/User';
import jwt from 'jsonwebtoken';

// Shared reusable variables
let token: string;
let mockUserId: mongoose.Types.ObjectId;

// Connects to MongoDB and sets up a mock user and token.
export const setupTestEnvironment = async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/testdb');

  // Create a mock user for authentication and association with games
  const user = await User.create({
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashedpassword',
    role: 'user'
  });

  mockUserId = user._id; 
  token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET || 'secret');
};

// Drops the test DB and closes Mongo connection.
export const tearDownTestEnvironment = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
};

// Clears the Game collection between tests.
export const clearGameData = async () => {
  await Game.deleteMany({});
};

export { app, request, token, mockUserId, jwt };