import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

// The TypeScript interface defines the shape of our User document
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId; //  Explicitly typed ObjectId
  username: string;
  email: string;
  password?: string;
  role: 'user' | 'coach' | 'venue' | 'admin';
  authProvider: 'local' | 'google';
  providerId?: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function (this: IUser) { //this for better safety
        return this.authProvider === 'local';//Password is only required for local users. By default, excluded from queries for security
      },
      select: false, // Hides the password from queries by default
    },
    role: {
      type: String,
      enum: ['user', 'coach', 'venue', 'admin'],
      default: 'user',
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      required: true,
      default: 'local',
    },
    providerId: {
      type: String,
    },
  },
  { timestamps: true }
);

// Hash password before saving (if using local auth)
UserSchema.pre<IUser>('save', async function (next) {
  if (this.authProvider !== 'local' || !this.isModified('password') || !this.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare candidate password with stored hash
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  const UserModel = this.constructor as Model<IUser>;
  const user = await UserModel.findById(this._id).select('+password').exec();
  if (!user || !user.password) return false;

  return bcrypt.compare(candidatePassword, user.password);
};

export default mongoose.model<IUser>('User', UserSchema);
