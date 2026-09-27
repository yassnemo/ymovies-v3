import React, { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import SocialLoginButtons from "@/components/SocialLoginButtons";
import AuthBackground from "@/components/AuthBackground";

const SignUp = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { signUp } = useAuth();
  const [, navigate] = useLocation();
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword || !firstName) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    
    if (!acceptTerms) {
      toast({
        title: "Error",
        description: "Please accept the terms of service",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
      try {
      // Use the signUp method from our auth hook
      const success = await signUp({
        email,
        password,
        firstName,
        lastName,
        acceptTerms
      });
      
      if (success) {
        toast({
          title: "Account created!",
          description: "Please check your email to verify your account"
        });
        // Redirect to verification pending page or signin
        navigate('/signin');
      } else {
        setIsLoading(false);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <AuthBackground>
      <div className="flex flex-col justify-center min-h-screen w-full">
        <div className="container max-w-md mx-auto px-4 py-8">
          <div className="bg-black/70 backdrop-blur-md border border-gray-800/50 rounded-xl shadow-2xl p-8 animate-in slide-in-from-bottom-8 fade-in-50">
            <div className="mb-8 text-center">
              <h1 className="text-page-title font-bold text-white mb-2">YMovies</h1>
              <p className="text-gray-300">Create your account to get started</p>
            </div>

            <form onSubmit={handleSignUp}>
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium text-gray-300">
                      First Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="bg-gray-900/70 border-gray-700 text-gray-100 placeholder:text-gray-500 focus:ring-red-600 focus:border-red-600"
                      required
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium text-gray-300">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="bg-gray-900/70 border-gray-700 text-gray-100 placeholder:text-gray-500 focus:ring-red-600 focus:border-red-600"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-300">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-gray-900/70 border-gray-700 text-gray-100 placeholder:text-gray-500 focus:ring-red-600 focus:border-red-600"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-300">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-gray-900/70 border-gray-700 text-gray-100 placeholder:text-gray-500 focus:ring-red-600 focus:border-red-600"
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">Must be at least 8 characters</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-300">
                    Confirm Password <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-gray-900/70 border-gray-700 text-gray-100 placeholder:text-gray-500 focus:ring-red-600 focus:border-red-600"
                    required
                  />
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="terms"
                    checked={acceptTerms}
                    onCheckedChange={(checked) => setAcceptTerms(checked === true)}
                    className="mt-0.5 border-gray-600 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                  />
                  <Label htmlFor="terms" className="text-xs text-gray-400 leading-relaxed">
                    I agree to the{" "}
                    <Link href="/terms" className="text-red-400 hover:text-red-300 hover:underline transition-colors">Terms of Service</Link>{" "}
                    and{" "}
                    <Link href="/privacy" className="text-red-400 hover:text-red-300 hover:underline transition-colors">Privacy Policy</Link>
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Account...
                    </div>
                  ) : (
                    <span className="flex items-center justify-center">
                      Create Account <ArrowRight className="ml-2 h-4 w-4" />
                    </span>
                  )}
                </Button>
              </div>
            </form>

            <div className="mt-8 text-center">
              <p className="text-gray-400">
                Already have an account?{" "}
                <Link
                  href="/signin"
                  className="text-red-400 hover:text-red-300 hover:underline transition-colors"
                >
                  Sign in
                </Link>
              </p>
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-700"></span>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="px-2 bg-black text-gray-400">Or continue with</span>
                  </div>
                </div>
                <p className="mt-4 text-xs text-gray-500 text-center leading-relaxed">
                  YMovies is a personal project that allows users to browse movie metadata and manage their own watchlists. We use your Google account solely for authentication and to save your preferences. See our{" "}
                  <Link href="/privacy" className="text-red-400 hover:underline">Privacy Policy</Link>.
                </p>
                <div className="mt-4">
                  <SocialLoginButtons
                    showGoogle={true}
                    showFacebook={false}
                    showGithub={false}
                    onSuccess={() => navigate("/")}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthBackground>
  );
};

export default SignUp;
