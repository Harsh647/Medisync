"use client";

import { useState, useEffect } from "react";
import { createUserWithEmailAndPassword, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { Mail, Lock, User, Eye, EyeOff, Loader2, Check, ChevronLeft, ChevronRight } from "lucide-react";

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    dob: "",
    gender: "",
    bloodGroup: "",
    disease: "",
    height: "",
    weight: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const googleProvider = new GoogleAuthProvider();

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          await saveUserData(result.user.uid);
          localStorage.setItem("medisync_profile", JSON.stringify({
            name: result.user.displayName || "",
            dob: "",
            gender: "",
            bloodGroup: "",
          }));
          router.push("/dashboard");
        }
      } catch (err: any) {
        setError(err.message || "Failed to sign up with Google");
      }
    };
    handleRedirect();
  }, []);

  const passwordRequirements = [
    { label: "At least 8 characters", met: formData.password.length >= 8 },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(formData.password) },
    { label: "Contains lowercase letter", met: /[a-z]/.test(formData.password) },
    { label: "Contains number", met: /[0-9]/.test(formData.password) },
  ];

  const isStep1Valid = formData.name && formData.email && formData.password && passwordRequirements.every(r => r.met);
  const isStep2Valid = formData.dob && formData.gender && formData.bloodGroup && formData.height && formData.weight;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const saveUserData = async (userId: string) => {
    await setDoc(doc(db, "users", userId), {
      name: formData.name,
      email: formData.email,
      dob: formData.dob,
      gender: formData.gender,
      bloodGroup: formData.bloodGroup,
      disease: formData.disease || "None",
      height: formData.height,
      weight: formData.weight,
      createdAt: new Date().toISOString(),
    });

    await fetch("/api/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: userId,
        email: formData.email,
        name: formData.name,
        dob: formData.dob,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
      }),
    });
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }
    setLoading(true);
    setError("");

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      await saveUserData(userCredential.user.uid);
      localStorage.setItem("medisync_profile", JSON.stringify({
        name: formData.name,
        dob: formData.dob,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
      }));
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError("");

    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        const result = await signInWithPopup(auth, googleProvider);
        await saveUserData(result.user.uid);
        localStorage.setItem("medisync_profile", JSON.stringify({
          name: result.user.displayName || formData.name,
          dob: formData.dob,
          gender: formData.gender,
          bloodGroup: formData.bloodGroup,
        }));
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign up with Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-teal-100 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Logo size={48} />
            <span className="text-2xl font-bold bg-gradient-to-r from-teal-500 to-blue-500 bg-clip-text text-transparent">
              MediSync
            </span>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === 1 ? "bg-teal-500 text-white" : "bg-teal-100 dark:bg-teal-900/30 text-teal-600"}`}>
              1
            </div>
            <div className={`w-12 h-1 rounded ${step === 2 ? "bg-teal-500" : "bg-slate-200 dark:bg-slate-700"}`} />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === 2 ? "bg-teal-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-500"}`}>
              2
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-2">
            {step === 1 ? "Create Account" : "Health Profile"}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-center mb-6">
            {step === 1 ? "Start managing your health records" : "Tell us about yourself"}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {step === 1 && (
            <>
              <button
                onClick={handleGoogleSignup}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                <span className="text-sm text-slate-500 dark:text-slate-400">or</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              </div>
            </>
          )}

          <form onSubmit={handleEmailSignup} className="space-y-4">
            {step === 1 ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600 text-slate-900 dark:text-white placeholder-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600 text-slate-900 dark:text-white placeholder-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      required
                      className="w-full pl-10 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600 text-slate-900 dark:text-white placeholder-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {formData.password && (
                    <div className="mt-3 space-y-2">
                      {passwordRequirements.map((req, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center ${req.met ? "bg-teal-500" : "bg-slate-300 dark:bg-slate-600"}`}>
                            {req.met && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className={req.met ? "text-teal-600 dark:text-teal-400" : "text-slate-500 dark:text-slate-400"}>
                            {req.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600 text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Gender
                    </label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600 text-slate-900 dark:text-white"
                    >
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Blood Group
                    </label>
                    <select
                      name="bloodGroup"
                      value={formData.bloodGroup}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600 text-slate-900 dark:text-white"
                    >
                      <option value="">Select</option>
                      {bloodGroups.map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Disease (if any)
                  </label>
                  <input
                    type="text"
                    name="disease"
                    value={formData.disease}
                    onChange={handleChange}
                    placeholder="e.g., Diabetes, Hypertension (leave blank if none)"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600 text-slate-900 dark:text-white placeholder-slate-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Height (cm)
                    </label>
                    <input
                      type="number"
                      name="height"
                      value={formData.height}
                      onChange={handleChange}
                      placeholder="170"
                      required
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600 text-slate-900 dark:text-white placeholder-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      name="weight"
                      value={formData.weight}
                      onChange={handleChange}
                      placeholder="70"
                      required
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 dark:focus:ring-teal-600 text-slate-900 dark:text-white placeholder-slate-400"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-2">
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-300 flex items-center gap-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={loading || (step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid)}
                className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-teal-500/25 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating account...
                  </>
                ) : step === 1 ? (
                  <>
                    Next
                    <ChevronRight className="w-5 h-5" />
                  </>
                ) : (
                  "Create Account"
                )}
              </button>
            </div>
          </form>

          <p className="text-center text-slate-600 dark:text-slate-400 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-teal-600 dark:text-teal-400 font-medium hover:underline">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
