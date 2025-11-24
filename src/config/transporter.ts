import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";

dotenv.config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export const sendEmail = async (to: string, otp: string) => {

  const msg = {
    to,
    from: process.env.AUTH_EMAIL!,  // MUST be verified in SendGrid
    subject: "OTP Verification for SportSphere Registration",
    html: 
    `<div style="
      font-family: 'Arial', sans-serif;
      background-color: #0d0d0d;
      color: #ffffff;
      max-width: 600px;
      margin: 0 auto;
      padding: 30px 25px;
      border-radius: 12px;
      box-shadow: 0 0 20px rgba(255, 140, 0, 0.25);
    ">
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="color: #ff8c00; margin-bottom: 10px; font-size: 28px;">SportSphere</h1>
      </div>

      <div style="
        background: linear-gradient(145deg, #1a1a1a, #111111);
        border: 1px solid #222;
        border-radius: 10px;
        padding: 25px;
      ">
        <h3 style="color: #ff8c00; text-align: center; margin-bottom: 15px;">
          Verify Your Email
        </h3>
        <p style="color: #dddddd; font-size: 15px; text-align: center; margin-bottom: 10px;">
          Welcome to <strong>SportSphere</strong>! You're just one step away from activating your account.
        </p>
        <p style="color: #cccccc; text-align: center; margin-bottom: 20px;">
          Enter this code to verify your email address:
        </p>
        
        <div style="
          background-color: #161616;
          border: 1px dashed #ff8c00;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          margin: 25px 0;
        ">
          <h3 style="
            color: #ff8c00;
            font-size: 36px;
            letter-spacing: 6px;
            margin: 0;
            font-weight: bold;
          ">${otp}</h3>
        </div>

        <p style="color: #aaaaaa; text-align: center;">
          This code will expire in <strong style="color: #ff8c00;">10 minutes</strong>.
        </p>
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <p style="color: #777777; font-size: 12px; line-height: 1.5;">
          If you didn’t request this verification, you can safely ignore this message.<br/>
          © ${new Date().getFullYear()} <strong style="color: #ff8c00;">SportSphere</strong>. All rights reserved.
        </p>
      </div>
    </div>`
  };

  try {
    await sgMail.send(msg);
    console.log("Email sent successfully");
  } catch (error: any) {
    console.error("Error sending email:", error.response?.body || error.message);
    throw new Error("Failed to send email");
  }
};
