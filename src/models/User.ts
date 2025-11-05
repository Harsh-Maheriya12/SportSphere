import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

// The TypeScript interface defines the "shape" of a User document for use in the application code.
// It provides type safety and autocompletion. It extends `mongoose.Document` to include
// standard Mongoose properties like `_id` and instance methods.
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId; // Explicitly types the MongoDB ObjectId.
  username: string;
  email: string;
  password?: string; // The password is optional as it won't exist for OAuth users.
  role: 'user' | 'coach' | 'venue' | 'admin';
  authProvider: 'local' | 'google';
  providerId?: string; // The unique ID from an OAuth provider like Google.
  verified: boolean;
  comparePassword(candidatePassword: string): Promise<boolean>; // Defines the signature for our custom instance method.
}

// The Mongoose Schema defines the data structure, validation, and behavior at the database level.
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
      unique: true,      // Database-level index to ensure no duplicate emails.
      lowercase: true,   // Sanitizer: converts email to lowercase before saving.
      trim: true,
    },
    password: {
      type: String,
      // The password field is only required if the user is signing up locally.
      required: function (this: IUser) {
        return this.authProvider === 'local';
      },
      // A critical security feature: this field will be excluded from all query results by default.
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'coach', 'venue', 'admin'], // Validator: Restricts the value to this list.
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
    verified: {
      type: Boolean,
      default: false,
    },
  },
  // This option automatically adds `createdAt` and `updatedAt` timestamp fields.
  { timestamps: true }
);

// Mongoose "pre-save" hook: a middleware that runs before a document is saved.
UserSchema.pre<IUser>('save', async function (next) {
  // The logic inside this hook will only run if it's a 'local' user
  // and the password field has been newly set or modified. This prevents
  // re-hashing an already hashed password on a profile update.
  if (this.authProvider !== 'local' || !this.isModified('password') || !this.password) {
    return next();
  }

  try {
    // Generate a salt and hash the plain-text password.
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    // If hashing fails, pass the error to the Mongoose error handler.
    next(error);
  }
});

// Defines a custom instance method named 'comparePassword' on the User model.
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  // This `if` block is a temporary workaround. In a fully optimized model, this redundant
  // database call would be removed, and the password would be assumed to be present.
  const UserModel = this.constructor as Model<IUser>;
  const user = await UserModel.findById(this._id).select('+password').exec();
  if (!user || !user.password) return false;

  // Use bcrypt's secure compare function to check the candidate password against the stored hash.
  // This function is designed to be slow to mitigate timing attacks.
  return bcrypt.compare(candidatePassword, user.password);
};

// Compile the schema into a model and export it.
export default mongoose.model<IUser>('User', UserSchema);