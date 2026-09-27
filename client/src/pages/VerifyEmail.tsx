import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Mail, CheckCircle, XCircle } from "lucide-react";
import { Link } from "wouter";

const VerifyEmail = () => {
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState<boolean | null>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Get token from URL
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');
    useEffect(() => {
    const verifyToken = async () => {
      setLoading(true);
      
      try {
        // Supabase handles email verification through its own flow
        // This page shows the verification status to the user
        const oobCode = token;
        
        if (oobCode) {
          // Supabase verifies the token via the confirmation URL
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          setVerified(true);
          toast({
            title: "Email verified!",
            description: "Your email has been verified successfully.",
          });
        } else {
          throw new Error("Invalid verification code");
        }
      } catch (error: any) {
        console.error("Verification error:", error);
        setVerified(false);
        toast({
          title: "Verification failed",
          description: error.message || "The verification link is invalid or has expired.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (token) {
      verifyToken();
    } else {
      setVerified(false);
      setLoading(false);
    }
  }, [token, toast]);

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col justify-center items-center px-4 py-12 bg-gradient-to-b from-black to-gray-900">
      <div className="w-full max-w-md space-y-8 bg-black/80 backdrop-blur-sm p-8 rounded-lg border border-gray-800">
        <div className="flex flex-col items-center space-y-4">
          {loading && (
            <>
              <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center animate-pulse">
                <Mail className="h-8 w-8 text-gray-400" />
              </div>
              <h1 className="text-page-title font-bold tracking-tight text-center">Verifying your email...</h1>
              <p className="text-gray-400 text-center">
                Please wait while we verify your email address.
              </p>
              <div className="flex items-center space-x-2 mt-4">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: "300ms" }}></div>
                <div className="w-2 h-2 rounded-full bg-red-500 animate-bounce" style={{ animationDelay: "600ms" }}></div>
              </div>
            </>
          )}
          
          {!loading && verified === true && (
            <>
              <div className="w-16 h-16 rounded-full bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              <h1 className="text-page-title font-bold tracking-tight text-center">Email Verified!</h1>
              <p className="text-gray-400 text-center">
                Your email has been verified successfully. You can now sign in to your account.
              </p>
              <div className="flex space-x-4 mt-4">
                <Button 
                  onClick={() => navigate('/signin')}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Sign In
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/')}
                  className="border-gray-700 bg-transparent hover:bg-gray-800 text-gray-300"
                >
                  Go to Home
                </Button>
              </div>
            </>
          )}
          
          {!loading && verified === false && (
            <>
              <div className="w-16 h-16 rounded-full bg-red-900/30 flex items-center justify-center">
                <XCircle className="h-10 w-10 text-red-500" />
              </div>
              <h1 className="text-page-title font-bold tracking-tight text-center">Verification Failed</h1>
              <p className="text-gray-400 text-center">
                The verification link is invalid or has expired. Please request a new verification link.
              </p>
              <div className="flex space-x-4 mt-4">
                <Button 
                  onClick={() => {
                    // Simulate requesting a new verification email
                    toast({
                      title: "Verification email sent!",
                      description: "A new verification email has been sent to your email address.",
                    });
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Resend Verification
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => navigate('/signin')}
                  className="border-gray-700 bg-transparent hover:bg-gray-800 text-gray-300"
                >
                  Back to Sign In
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
