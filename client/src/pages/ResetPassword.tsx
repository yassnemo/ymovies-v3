import React, { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Mail, CheckCircle, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import AuthBackground from "@/components/AuthBackground";

const ResetPassword = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [emailError, setEmailError] = useState("");
  const { toast } = useToast();
  const { resetPassword } = useAuth();
  const [, navigate] = useLocation();

  // Email validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    
    // Clear error when user starts typing
    if (emailError) {
      setEmailError("");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    if (!email) {
      setEmailError("Please enter your email address");
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const success = await resetPassword(email);
      
      if (success) {
        setIsSubmitted(true);
        toast({
          title: "Password reset email sent",
          description: "Check your inbox for further instructions"
        });
      }
      
    } catch (error: any) {
      console.error("Password reset error:", error);
      
      let errorMessage = "There was a problem processing your request";
      
      if (error.message?.includes('not found') || error.message?.includes('User not found')) {
        errorMessage = "No account found with this email address";
      } else if (error.message?.includes('invalid') || error.message?.includes('Invalid email')) {
        errorMessage = "Please enter a valid email address";
      } else if (error.message?.includes('rate') || error.message?.includes('too many')) {
        errorMessage = "Too many attempts. Please try again later";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <AuthBackground>
      <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12">
        <div className="w-full max-w-md space-y-8 bg-black/70 backdrop-blur-md p-8 rounded-lg border border-gray-800/50 shadow-2xl">
          <div className="space-y-4 text-center">
            {/* Icon and title */}
            <div className="flex justify-center">
              {!isSubmitted ? (
                <div className="w-16 h-16 rounded-full bg-red-900/30 flex items-center justify-center">
                  <Mail className="h-8 w-8 text-red-500" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-green-900/30 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              )}
            </div>
            
            <h1 className="text-page-title font-bold tracking-tight text-white">
              {!isSubmitted ? "Reset Password" : "Check Your Email"}
            </h1>
            
            {!isSubmitted ? (
              <p className="text-gray-300">
                Enter your email address and we'll send you a link to reset your password
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-green-400">
                We've sent a password reset link to:
              </p>
              <p className="text-white font-medium">{email}</p>
              <p className="text-gray-400 text-sm">
                If you don't see it, check your spam folder or try again with a different email.
              </p>
            </div>
          )}
        </div>
        
        {!isSubmitted ? (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-200">Email address</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={handleEmailChange}
                  className={`bg-gray-900 border-gray-700 focus:ring-red-500 focus:border-red-500 text-white pl-10 ${
                    emailError ? 'border-red-500 focus:border-red-500' : ''
                  }`}
                  required
                />
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                {emailError && (
                  <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-500" />
                )}
              </div>
              {emailError && (
                <p className="text-red-500 text-sm flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {emailError}
                </p>
              )}
            </div>
            
            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white py-6 font-medium transition-all duration-200"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending Reset Link...
                </div>
              ) : (
                "Send Reset Link"
              )}
            </Button>
            
            <div className="text-center mt-4">
              <Link href="/signin" className="text-gray-400 hover:text-white flex items-center justify-center gap-2 transition-colors">
                <ArrowLeft size={16} />
                Back to Sign In
              </Link>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="text-center space-y-4">
              <Button
                onClick={() => navigate('/signin')}
                className="bg-red-600 hover:bg-red-700 text-white w-full py-6"
              >
                Return to Sign In
              </Button>
              
              <div className="text-center">
                <button
                  onClick={() => {
                    setIsSubmitted(false);
                    setEmail("");
                    setEmailError("");
                  }}
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Try a different email address
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
        <div className="mt-8 text-center text-sm text-gray-400 space-y-2">
        <p>Need help? Visit our <a href="#" className="text-red-500 hover:underline">Help Center</a></p>
        <p className="text-xs">
          Remember to check your spam folder if you don't receive the email within a few minutes.
        </p>
      </div>
    </div>
    </AuthBackground>
  );
};

export default ResetPassword;
