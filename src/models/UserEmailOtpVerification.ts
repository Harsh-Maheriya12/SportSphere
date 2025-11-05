import mongoose, { Document, Schema } from 'mongoose';

// Define the schema for User Email OTP Verification
export interface IUserEmailOtpVerification extends Document {
    email: string;
    otp: string;
    createdAt: Date;
    expiresAt: Date;
}

const UserEmailOtpVerificationSchema: Schema = new Schema({
    email: {
        type: String,   
        required: true,
        lowercase: true,
        trim: true,
    },
    otp: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date, 
        required: true
    },
    expiresAt: {
        type: Date, 
        required: true
    },
});

const UserEmailOtpVerification = mongoose.model<IUserEmailOtpVerification>(
    'UserEmailOtpVerification',
    UserEmailOtpVerificationSchema
);

export default UserEmailOtpVerification;
