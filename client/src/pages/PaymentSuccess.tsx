import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      setVerifying(false);
      setSuccess(false);
      setMessage("No payment session found");
      return;
    }

    // Verify payment with backend
    const verifyPayment = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `http://localhost:8000/api/bookings/verify-payment?sessionId=${sessionId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await response.json();

        if (data.success) {
          setSuccess(true);
          setMessage("Payment successful! Your booking is confirmed.");
        } else {
          setSuccess(false);
          setMessage(data.message || "Payment verification failed");
        }
      } catch (error) {
        console.error("Payment verification error:", error);
        setSuccess(false);
        setMessage("Failed to verify payment. Please contact support.");
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [searchParams]);

  useEffect(() => {
    if (!verifying && success) {
      // Redirect to bookings after 3 seconds
      const timer = setTimeout(() => {
        navigate("/my-bookings");
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [verifying, success, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-card/80 backdrop-blur-xl rounded-2xl border border-primary/20 p-8 shadow-2xl">
        {verifying ? (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Verifying Payment...
            </h2>
            <p className="text-muted-foreground">
              Please wait while we confirm your payment.
            </p>
          </div>
        ) : success ? (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Payment Successful!
            </h2>
            <p className="text-muted-foreground mb-6">{message}</p>
            <p className="text-sm text-muted-foreground">
              Redirecting to your bookings in 3 seconds...
            </p>
            <button
              onClick={() => navigate("/my-bookings")}
              className="mt-4 w-full px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition"
            >
              View My Bookings
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Payment Failed
            </h2>
            <p className="text-muted-foreground mb-6">{message}</p>
            <button
              onClick={() => navigate("/venues")}
              className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition"
            >
              Back to Venues
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;
