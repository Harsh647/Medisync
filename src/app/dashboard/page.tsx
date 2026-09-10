"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/firebase-config";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import ChatBot from "@/components/ChatBot";
import {
  Heart,
  Clock,
  ChevronRight,
  Check,
  TrendingUp,
  TrendingDown,
  Minus,
  Calculator,
} from "lucide-react";

const dosageLabels: Record<string, string> = {
  one: "Once daily",
  two: "Twice daily",
  three: "Three times",
  night: "At night",
  empty: "Empty stomach",
};

const mealLabels: Record<string, string> = {
  none: "",
  before: "Before meal",
  after: "After meal",
  empty: "Empty stomach",
};

interface UserProfile {
  name: string;
  dob: string;
  gender: string;
  bloodGroup: string;
}

interface Medicine {
  id: string;
  name: string;
  dosage: string;
  meal: string;
  times: string[];
  quantity: number;
  threshold: number;
  taken: boolean[];
  takenDate?: string;
}

interface VitalEntry {
  date: string;
  heartRate?: number;
  systolic?: number;
  diastolic?: number;
  glucose?: number;
  oxygen?: number;
  temperature?: number;
}

function MiniChart({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 160;
  const height = 50;
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon fill={`url(#grad-${color.replace("#", "")})`} points={`0,${height} ${points} ${width},${height}`} />
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  );
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [recentVitals, setRecentVitals] = useState<VitalEntry[]>([]);
  const [vitalFilter, setVitalFilter] = useState<"day" | "week">("week");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [bmi, setBmi] = useState<number | null>(null);
  const [bmiCategory, setBmiCategory] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserProfile(docSnap.data() as UserProfile);
        }
      } catch {
        const saved = localStorage.getItem("medisync_profile");
        if (saved) setUserProfile(JSON.parse(saved));
      }
    };
    loadProfile();

    const fetchMedicines = async () => {
      try {
        const res = await fetch(`/api/medicines?userId=${user.uid}`);
        if (res.ok) {
          const data = await res.json();
          const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          const resetData = data.map((med: Medicine) => {
            if (med.takenDate && med.takenDate !== today) {
              return { ...med, taken: med.taken.map(() => false), takenDate: today };
            }
            return med;
          });
          setMedicines(resetData);
        }
      } catch (error) {
        console.error("Failed to fetch medicines:", error);
      }
    };

    const fetchVitals = async () => {
      try {
        const res = await fetch(`/api/vitals?userId=${user.uid}`);
        if (res.ok) {
          const data = await res.json();
          setRecentVitals(data.slice(-7).reverse());
        }
      } catch (error) {
        console.error("Failed to fetch vitals:", error);
      }
    };

    fetchMedicines();
    fetchVitals();
  }, [user]);

  const markMedicineTaken = async (medIndex: number, timeIndex: number) => {
    const med = medicines[medIndex];
    if (!med) return;

    const wasTaken = med.taken[timeIndex];
    const newTaken = [...med.taken];
    newTaken[timeIndex] = !wasTaken;
    const anyTaken = newTaken.some((t) => t);
    const newQuantity = !wasTaken ? Math.max(0, med.quantity - 1) : med.quantity;
    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    try {
      const res = await fetch("/api/medicines", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: med.id, taken: newTaken, quantity: newQuantity, takenDate: anyTaken ? today : null }),
      });
      if (res.ok) {
        const updated = await res.json();
        setMedicines(medicines.map((m, i) => i === medIndex ? updated : m));
      }
    } catch (error) {
      console.error("Failed to update medicine:", error);
    }
  };

  const calculateBMI = () => {
    const h = parseFloat(height) / 100;
    const w = parseFloat(weight);
    if (h > 0 && w > 0) {
      const result = w / (h * h);
      setBmi(Math.round(result * 10) / 10);
      if (result < 18.5) setBmiCategory("Underweight");
      else if (result < 25) setBmiCategory("Normal");
      else if (result < 30) setBmiCategory("Overweight");
      else setBmiCategory("Obese");
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const getAge = () => {
    if (!userProfile?.dob) return null;
    const dob = new Date(userProfile.dob + "T00:00:00");
    return Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome Card */}
        <div className="bg-gradient-to-r from-teal-500/10 to-blue-500/10 rounded-2xl border border-teal-500/20 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{getGreeting()}, {userProfile?.name || user.displayName || user.email?.split("@")[0]}</h1>
              <p className="text-slate-400 text-sm mt-1">Here&apos;s your health overview</p>
              {userProfile && (
                <div className="flex items-center gap-4 mt-3">
                  {userProfile.bloodGroup && <span className="text-xs text-slate-400">Blood: <span className="text-white font-medium">{userProfile.bloodGroup}</span></span>}
                  {getAge() && <span className="text-xs text-slate-400">Age: <span className="text-white font-medium">{getAge()} yrs</span></span>}
                  {userProfile.gender && <span className="text-xs text-slate-400">Gender: <span className="text-white font-medium capitalize">{userProfile.gender}</span></span>}
                </div>
              )}
            </div>
            <div className="hidden md:flex w-16 h-16 bg-teal-500/20 rounded-2xl items-center justify-center">
              <Heart className="w-8 h-8 text-teal-400" />
            </div>
          </div>
        </div>

        {/* Medicine + Chatbot */}
        <div className="grid lg:grid-cols-2 gap-6 items-stretch">
          {/* Medicine Reminders */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Medicine Reminders</h2>
              <Link href="/dashboard/medicines" className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1">
                View All <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-3 flex-1 max-h-[400px] overflow-y-auto pr-1 scrollbar-hide">
              {medicines.map((med, i) => {
                const allTaken = med.taken.every((t) => t);
                const low = med.quantity > 0 && med.quantity <= med.threshold;
                const percentage = Math.min((med.quantity / Math.max(med.threshold * 3, 30)) * 100, 100);
                const fmt = (t: string) => {
                  const [h, m] = t.split(":");
                  const hr = parseInt(h);
                  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
                };
                return (
                  <div key={i} className={`bg-slate-800/50 rounded-xl p-4 border transition-colors ${allTaken ? "border-emerald-500/30 bg-emerald-500/5" : "border-slate-700/50"}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{med.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{dosageLabels[med.dosage] || med.dosage}{med.meal !== "none" ? ` · ${mealLabels[med.meal] || med.meal}` : ""}</p>
                      </div>
                    </div>
                    <div className="space-y-1.5 mb-2">
                      {med.times.map((time, ti) => (
                        <div key={ti} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 text-slate-600" />
                            <span className="text-xs text-slate-500">{fmt(time)}</span>
                          </div>
                          <button onClick={() => markMedicineTaken(i, ti)} className={`w-6 h-6 rounded flex items-center justify-center transition-all ${med.taken[ti] ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-500 hover:bg-slate-600"}`}>
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] text-slate-600">{med.quantity} pills</span>
                        {low && <span className="text-[10px] text-amber-400">Low</span>}
                      </div>
                      <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${low ? "bg-amber-400" : "bg-teal-400"}`} style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chatbot */}
          <ChatBot />
        </div>

        {/* Vitals Trend */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Vitals Trend</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setVitalFilter("day")} className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${vitalFilter === "day" ? "bg-teal-500/20 text-teal-400" : "text-slate-500 hover:text-white"}`}>Day</button>
              <button onClick={() => setVitalFilter("week")} className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${vitalFilter === "week" ? "bg-teal-500/20 text-teal-400" : "text-slate-500 hover:text-white"}`}>Week</button>
              <Link href="/dashboard/vitals" className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 ml-2">
                Details <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { label: "Heart Rate", unit: "bpm", key: "heartRate" as const, color: "#ef4444" },
              { label: "Blood Pressure", unit: "mmHg", key: "systolic" as const, color: "#22c55e" },
              { label: "Glucose", unit: "mg/dL", key: "glucose" as const, color: "#3b82f6" },
              { label: "SpO2", unit: "%", key: "oxygen" as const, color: "#a855f7" },
              { label: "Temperature", unit: "°F", key: "temperature" as const, color: "#f97316" },
            ].map((vital) => {
              const filteredVitals = vitalFilter === "day" ? recentVitals.slice(0, 1) : recentVitals;
              const data = filteredVitals.map((v) => v[vital.key] as number).filter((v) => v !== undefined);
              const latest = data.length > 0 ? data[data.length - 1] : null;
              const prev = data.length > 1 ? data[data.length - 2] : null;
              const trend = latest && prev ? (latest > prev ? "up" : latest < prev ? "down" : "stable") : "stable";

              return (
                <div key={vital.key} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-slate-500">{vital.label}</p>
                    {trend === "up" && <TrendingUp className="w-3.5 h-3.5 text-red-400" />}
                    {trend === "down" && <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />}
                    {trend === "stable" && <Minus className="w-3.5 h-3.5 text-slate-500" />}
                  </div>
                  <p className="text-xl font-bold text-white mb-2">
                    {latest !== null ? latest : "—"}
                    <span className="text-xs font-normal text-slate-500 ml-1">{vital.unit}</span>
                  </p>
                  {data.length > 1 && <MiniChart data={data} color={vital.color} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* BMI Calculator */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">BMI Calculator</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Height (cm)</label>
                <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="170" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-teal-500" />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Weight (kg)</label>
                <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="70" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 outline-none focus:border-teal-500" />
              </div>
              <button onClick={calculateBMI} disabled={!height || !weight} className="w-full bg-teal-500 hover:bg-teal-400 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Calculate</button>
            </div>
            <div className="flex flex-col items-center justify-center">
              {bmi ? (
                <>
                  <div className="text-5xl font-bold text-white mb-1">{bmi}</div>
                  <div className={`text-sm font-medium ${bmiCategory === "Normal" ? "text-emerald-400" : bmiCategory === "Underweight" ? "text-blue-400" : "text-amber-400"}`}>{bmiCategory}</div>
                </>
              ) : (
                <div className="text-center">
                  <div className="text-4xl font-bold text-slate-700 mb-1">--</div>
                  <div className="text-sm text-slate-600">Enter height & weight</div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs text-slate-500 mb-2">BMI Categories</p>
              {[
                { label: "Underweight", range: "< 18.5", color: "bg-blue-400" },
                { label: "Normal", range: "18.5 - 24.9", color: "bg-emerald-400" },
                { label: "Overweight", range: "25 - 29.9", color: "bg-amber-400" },
                { label: "Obese", range: ">= 30", color: "bg-red-400" },
              ].map((cat) => (
                <div key={cat.label} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${cat.color}`} />
                  <span className="text-xs text-slate-400">{cat.label}</span>
                  <span className="text-xs text-slate-600 ml-auto">{cat.range}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
