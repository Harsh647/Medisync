"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/firebase-config";
import Toast from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import {
  Brain,
  AlertTriangle,
  TrendingUp,
  Clock,
  Trash2,
} from "lucide-react";

interface FormData {
  age: string;
  bmi: string;
  glucose: string;
  hba1c: string;
  bloodPressure: string;
  familyHistory: string;
}

interface RiskFactor {
  name: string;
  value: string;
  status: "normal" | "warning" | "danger";
  points: number;
  icon: any;
}

interface PredictionHistory {
  id: string;
  date: string;
  formData?: { age: string; bmi: string; glucose: string; hba1c: string; bloodPressure: string; familyHistory: string };
  age?: string;
  bmi?: string;
  glucose?: string;
  hba1c?: string;
  bloodPressure?: string;
  familyHistory?: string;
  riskScore: number;
  riskLevel: string;
  riskFactors: { name: string; value: string; status: string; points: number }[];
}

const initialForm: FormData = {
  age: "",
  bmi: "",
  glucose: "",
  hba1c: "",
  bloodPressure: "",
  familyHistory: "no",
};

export default function PredictionPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>(initialForm);
  const [showResult, setShowResult] = useState(false);
  const [riskScore, setRiskScore] = useState(0);
  const [riskFactors, setRiskFactors] = useState<RiskFactor[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [history, setHistory] = useState<PredictionHistory[]>([]);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const { toast, showToast, dismissToast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchPredictions = async () => {
      if (user) {
        try {
          const res = await fetch(`/api/predictions?userId=${user.uid}`);
          if (res.ok) {
            const data = await res.json();
            setHistory(data);
          }
        } catch {
          showToast("Failed to load predictions", "error");
        }
      }
    };
    fetchPredictions();
  }, [user]);

  const calculateRisk = async () => {
    if (!formData.age || !formData.bmi || !formData.glucose || !formData.bloodPressure) {
      setPredictionError("Please fill in Age, BMI, Glucose, and Blood Pressure.");
      setShowResult(true);
      return;
    }

    try {
      const res = await fetch("http://localhost:8000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: parseFloat(formData.age),
          bmi: parseFloat(formData.bmi),
          glucose: parseFloat(formData.glucose),
          hba1c: formData.hba1c ? parseFloat(formData.hba1c) : 5.5,
          blood_pressure: parseFloat(formData.bloodPressure),
          family_history: formData.familyHistory,
        }),
      });

      if (!res.ok) throw new Error("Backend not responding");

      const result = await res.json();
      setRiskScore(result.riskScore);
      setRiskFactors(result.riskFactors);
      setPredictionError(null);
      setShowResult(true);

      // Save to database
      try {
        await fetch("/api/predictions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user?.uid,
            date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            riskScore: result.riskScore,
            riskLevel: result.riskLevel,
            age: formData.age,
            bmi: formData.bmi,
            glucose: formData.glucose,
            hba1c: formData.hba1c,
            bloodPressure: formData.bloodPressure,
            familyHistory: formData.familyHistory,
            riskFactors: result.riskFactors,
          }),
        });
      } catch {}

    } catch {
      setPredictionError("Cannot connect to ML backend. Make sure the FastAPI server is running on port 8000.");
      setShowResult(true);
    }
  };

  const getRiskLevel = () => {
    if (riskScore < 30) return { label: "Low Risk", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", ring: "#10b981" };
    if (riskScore < 60) return { label: "Moderate Risk", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", ring: "#f59e0b" };
    return { label: "High Risk", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", ring: "#ef4444" };
  };

  const riskLevel = getRiskLevel();
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (riskScore / 100) * circumference;

  const deleteHistory = async (id: string) => {
    try {
      const res = await fetch(`/api/predictions?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setHistory(history.filter((h) => h.id !== id));
        showToast("Prediction deleted", "success");
      } else {
        showToast("Failed to delete prediction", "error");
      }
    } catch {
      showToast("Failed to delete prediction", "error");
    }
  };

  const getRiskColor = (level: string) => {
    if (level === "Low Risk") return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    if (level === "Moderate Risk") return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    return "text-red-400 bg-red-500/10 border-red-500/30";
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Disease Prediction</h1>
          <p className="text-slate-400 text-sm mt-1">AI-powered risk assessment for Type 2 Diabetes</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 items-start">
          {/* Input Form */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Brain className="w-5 h-5 text-teal-400" />
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Health Parameters</h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Age (years)</label>
                  <input type="number" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} placeholder="e.g., 35" className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">BMI (kg/m²)</label>
                  <input type="number" step="0.1" value={formData.bmi} onChange={(e) => setFormData({ ...formData, bmi: e.target.value })} placeholder="e.g., 25.5" className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Fasting Glucose (mg/dL)</label>
                  <input type="number" value={formData.glucose} onChange={(e) => setFormData({ ...formData, glucose: e.target.value })} placeholder="e.g., 100" className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">HbA1c (%) <span className="text-slate-600">(optional)</span></label>
                  <input type="number" step="0.1" value={formData.hba1c} onChange={(e) => setFormData({ ...formData, hba1c: e.target.value })} placeholder="e.g., 5.7" className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Blood Pressure (mmHg)</label>
                  <input type="number" value={formData.bloodPressure} onChange={(e) => setFormData({ ...formData, bloodPressure: e.target.value })} placeholder="e.g., 120" className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Family History of Diabetes</label>
                  <select value={formData.familyHistory} onChange={(e) => setFormData({ ...formData, familyHistory: e.target.value })} className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    <option value="no">No</option>
                    <option value="yes">Yes</option>
                  </select>
                </div>
              </div>

              <button onClick={calculateRisk} className="w-full py-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-teal-500/25 transition-all mt-2">
                Run Risk Assessment
              </button>
            </div>
          </div>

          {/* Results Section */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-teal-400" />
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Risk Assessment</h2>
            </div>

            {!showResult ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <Brain className="w-10 h-10 text-slate-600" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No Assessment Yet</h3>
                <p className="text-slate-500 text-sm text-center max-w-xs">
                  Enter your health data and run the assessment to see your Type 2 Diabetes risk prediction.
                </p>
              </div>
            ) : predictionError ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Model Not Connected</h3>
                <p className="text-slate-500 text-sm text-center max-w-sm mb-6">{predictionError}</p>
                <button onClick={() => { setPredictionError(null); setShowResult(false); }} className="px-6 py-2.5 bg-slate-800 text-slate-300 rounded-lg font-medium hover:bg-slate-700 text-sm transition-colors border border-slate-700">
                  Try Again
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Risk Score Circle */}
                <div className="flex flex-col items-center py-4">
                  <div className="relative w-40 h-40">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="54" stroke="#1e293b" strokeWidth="10" fill="none" />
                      <circle cx="60" cy="60" r="54" stroke={riskLevel.ring} strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-1000 ease-out" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold text-white">{riskScore}%</span>
                      <span className="text-xs text-slate-500 mt-1">Risk Score</span>
                    </div>
                  </div>
                  <div className={`mt-5 px-5 py-2.5 rounded-full ${riskLevel.bg} border ${riskLevel.border}`}>
                    <span className={`text-sm font-semibold ${riskLevel.color}`}>{riskLevel.label}</span>
                  </div>
                </div>

                {/* Quick Summary */}
                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="w-5 h-5 text-teal-400" />
                    <h3 className="text-sm font-semibold text-white">Summary</h3>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {riskScore < 30
                      ? "Your health parameters indicate a low risk for Type 2 Diabetes. Keep maintaining your healthy lifestyle!"
                      : riskScore < 60
                      ? "Your risk is moderate. Some factors need attention. Consider lifestyle changes and regular monitoring."
                      : "Your risk is high. Immediate consultation with a doctor is recommended. Several factors require urgent attention."}
                  </p>
                </div>

                {/* Input Values */}
                <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                  <h3 className="text-sm font-semibold text-white mb-3">Your Values</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex justify-between items-center p-2 bg-slate-800/50 rounded-lg">
                      <span className="text-xs text-slate-400">Age</span>
                      <span className="text-sm font-medium text-white">{formData.age || "—"} yrs</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-slate-800/50 rounded-lg">
                      <span className="text-xs text-slate-400">BMI</span>
                      <span className="text-sm font-medium text-white">{formData.bmi || "—"}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-slate-800/50 rounded-lg">
                      <span className="text-xs text-slate-400">Glucose</span>
                      <span className="text-sm font-medium text-white">{formData.glucose || "—"} mg/dL</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-slate-800/50 rounded-lg">
                      <span className="text-xs text-slate-400">HbA1c</span>
                      <span className="text-sm font-medium text-white">{formData.hba1c || "—"}%</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-slate-800/50 rounded-lg">
                      <span className="text-xs text-slate-400">BP</span>
                      <span className="text-sm font-medium text-white">{formData.bloodPressure || "—"} mmHg</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-slate-800/50 rounded-lg">
                      <span className="text-xs text-slate-400">Family History</span>
                      <span className="text-sm font-medium text-white">{formData.familyHistory === "yes" ? "Yes" : "No"}</span>
                    </div>
                  </div>
                </div>

                <button onClick={() => setShowResult(false)} className="w-full py-3 bg-slate-800 text-slate-300 rounded-lg font-medium hover:bg-slate-700 text-sm transition-colors border border-slate-700">
                  Reset Assessment
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Prediction History */}
        <div className="mt-8 bg-slate-900 rounded-xl border border-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-400" />
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Prediction History</h2>
            </div>
            <span className="text-xs text-slate-500">{history.length} assessment(s)</span>
          </div>

          {history.length === 0 ? (
            <div className="py-8 text-center">
              <Clock className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No predictions yet</p>
              <p className="text-xs text-slate-600 mt-1">Your risk assessments will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="pb-3 text-xs font-medium text-slate-500 uppercase">Date</th>
                    <th className="pb-3 text-xs font-medium text-slate-500 uppercase">Age</th>
                    <th className="pb-3 text-xs font-medium text-slate-500 uppercase">BMI</th>
                    <th className="pb-3 text-xs font-medium text-slate-500 uppercase">Glucose</th>
                    <th className="pb-3 text-xs font-medium text-slate-500 uppercase">HbA1c</th>
                    <th className="pb-3 text-xs font-medium text-slate-500 uppercase">BP</th>
                    <th className="pb-3 text-xs font-medium text-slate-500 uppercase">Score</th>
                    <th className="pb-3 text-xs font-medium text-slate-500 uppercase">Risk</th>
                    <th className="pb-3 text-xs font-medium text-slate-500 uppercase"></th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry) => {
                    const age = entry.formData?.age || entry.age || "—";
                    const bmi = entry.formData?.bmi || entry.bmi || "—";
                    const glucose = entry.formData?.glucose || entry.glucose || "—";
                    const hba1c = entry.formData?.hba1c || entry.hba1c || "—";
                    const bp = entry.formData?.bloodPressure || entry.bloodPressure || "—";
                    return (
                    <tr key={entry.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 text-sm text-white">{entry.date}</td>
                      <td className="py-3 text-sm text-slate-400">{age} yrs</td>
                      <td className="py-3 text-sm text-slate-400">{bmi}</td>
                      <td className="py-3 text-sm text-slate-400">{glucose} mg/dL</td>
                      <td className="py-3 text-sm text-slate-400">{hba1c}%</td>
                      <td className="py-3 text-sm text-slate-400">{bp} mmHg</td>
                      <td className="py-3 text-sm font-medium text-white">{entry.riskScore}%</td>
                      <td className="py-3">
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getRiskColor(entry.riskLevel)}`}>
                          {entry.riskLevel}
                        </span>
                      </td>
                      <td className="py-3">
                        <button onClick={() => deleteHistory(entry.id)} className="p-1 hover:bg-slate-800 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4 text-slate-500 hover:text-red-400" />
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={dismissToast} />}
    </div>
  );
}
