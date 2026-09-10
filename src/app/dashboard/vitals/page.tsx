"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/firebase-config";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Activity,
  Heart,
  Droplets,
  Thermometer,
  TrendingUp,
  Plus,
  X,
  Wind,
  Clock,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import jsPDF from "jspdf";

interface VitalEntry {
  id?: string;
  date: string;
  time?: string;
  heartRate?: number;
  systolic?: number;
  diastolic?: number;
  glucose?: number;
  oxygen?: number;
  temperature?: number;
}

interface LogForm {
  heartRate: string;
  systolic: string;
  diastolic: string;
  glucose: string;
  oxygen: string;
  temperature: string;
}

const emptyLog: LogForm = { heartRate: "", systolic: "", diastolic: "", glucose: "", oxygen: "", temperature: "" };

const vitalsConfig = [
  { key: "heartRate", label: "Heart Rate", unit: "bpm", color: "#ef4444", icon: Heart, gradient: ["#ef4444", "#f87171"] },
  { key: "systolic", label: "Systolic BP", unit: "mmHg", color: "#22c55e", icon: Activity, gradient: ["#22c55e", "#4ade80"] },
  { key: "diastolic", label: "Diastolic BP", unit: "mmHg", color: "#86efac", icon: Activity, gradient: ["#86efac", "#bbf7d0"] },
  { key: "glucose", label: "Blood Glucose", unit: "mg/dL", color: "#3b82f6", icon: Droplets, gradient: ["#3b82f6", "#60a5fa"] },
  { key: "oxygen", label: "Oxygen SpO2", unit: "%", color: "#a855f7", icon: Wind, gradient: ["#a855f7", "#c084fc"] },
  { key: "temperature", label: "Temperature", unit: "°F", color: "#f97316", icon: Thermometer, gradient: ["#f97316", "#fb923c"] },
];

interface UserProfile {
  name: string;
  dob: string;
  gender: string;
}

export default function VitalsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [dayData, setDayData] = useState<VitalEntry[]>([]);
  const [timeFilter, setTimeFilter] = useState<"day" | "week" | "month">("day");
  const [vitalFilter, setVitalFilter] = useState<string>("all");
  const [showLogModal, setShowLogModal] = useState(false);
  const [showAllEntries, setShowAllEntries] = useState(false);
  const [logForm, setLogForm] = useState<LogForm>(emptyLog);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchVitals = async () => {
      if (user) {
        try {
          const res = await fetch(`/api/vitals?userId=${user.uid}`);
          if (res.ok) {
            const data = await res.json();
            setDayData(data.reverse());
          }
        } catch {
          showToast("Failed to load vitals", "error");
        }
      }
    };
    fetchVitals();
  }, [user]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            const profile = {
              name: data.name || user.displayName || "User",
              dob: data.dob || "",
              gender: data.gender || "",
            };
            setUserProfile(profile);
            localStorage.setItem("medisync_profile", JSON.stringify(profile));
          } else {
            const saved = localStorage.getItem("medisync_profile");
            if (saved) {
              setUserProfile(JSON.parse(saved));
            } else {
              setUserProfile({
                name: user.displayName || "User",
                dob: "",
                gender: "",
              });
            }
          }
        } catch {
          const saved = localStorage.getItem("medisync_profile");
          if (saved) {
            setUserProfile(JSON.parse(saved));
          } else {
            setUserProfile({
              name: user.displayName || "User",
              dob: "",
              gender: "",
            });
          }
        }

        try {
          const res = await fetch(`/api/user?id=${user.uid}`);
          if (res.ok) {
            const data = await res.json();
            if (data) {
              setUserProfile((prev) => ({
                name: data.name || prev?.name || "User",
                dob: data.dob || prev?.dob || "",
                gender: data.gender || prev?.gender || "",
              }));
            }
          }
        } catch {}
      }
    };
    fetchUserProfile();
  }, [user]);

  const getDataForFilter = () => {
    let result: VitalEntry[];
    switch (timeFilter) {
      case "day": result = dayData; break;
      case "week": result = aggregateWeek(dayData); break;
      case "month": result = aggregateMonth(dayData); break;
      default: result = dayData;
    }
    return result.map((entry, i) => {
      const parts = entry.date.split(", ");
      const shortDate = timeFilter === "day"
        ? parts[parts.length - 1] || entry.date
        : entry.date;
      return { ...entry, shortDate, idx: i };
    });
  };

  const aggregateWeek = (entries: VitalEntry[]): VitalEntry[] => {
    const weekMap = new Map<string, VitalEntry[]>();
    entries.forEach((entry) => {
      const d = new Date(entry.date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      const key = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (!weekMap.has(key)) weekMap.set(key, []);
      weekMap.get(key)!.push(entry);
    });
    return Array.from(weekMap.entries()).map(([key, items]) => aggregateEntries(key, items));
  };

  const aggregateMonth = (entries: VitalEntry[]): VitalEntry[] => {
    const monthMap = new Map<string, VitalEntry[]>();
    entries.forEach((entry) => {
      const d = new Date(entry.date);
      const key = d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      if (!monthMap.has(key)) monthMap.set(key, []);
      monthMap.get(key)!.push(entry);
    });
    return Array.from(monthMap.entries()).map(([key, items]) => aggregateEntries(key, items));
  };

  const aggregateYear = (entries: VitalEntry[]): VitalEntry[] => {
    const yearMap = new Map<string, VitalEntry[]>();
    entries.forEach((entry) => {
      const d = new Date(entry.date);
      const key = d.toLocaleDateString("en-US", { year: "numeric" });
      if (!yearMap.has(key)) yearMap.set(key, []);
      yearMap.get(key)!.push(entry);
    });
    return Array.from(yearMap.entries()).map(([key, items]) => aggregateEntries(key, items));
  };

  const aggregateEntries = (label: string, items: VitalEntry[]): VitalEntry => {
    const avg = (field: keyof VitalEntry) => {
      const vals = items.map((e) => e[field] as number).filter((v) => v !== undefined && !isNaN(v));
      return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : undefined;
    };
    return {
      date: label,
      heartRate: avg("heartRate"),
      systolic: avg("systolic"),
      diastolic: avg("diastolic"),
      glucose: avg("glucose"),
      oxygen: avg("oxygen"),
      temperature: avg("temperature"),
    };
  };

  const data = getDataForFilter();
  const latest = data[data.length - 1];

  const handleLogVitals = async () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

    const hr = logForm.heartRate ? parseFloat(logForm.heartRate) : undefined;
    const sys = logForm.systolic ? parseFloat(logForm.systolic) : undefined;
    const dia = logForm.diastolic ? parseFloat(logForm.diastolic) : undefined;
    const glu = logForm.glucose ? parseFloat(logForm.glucose) : undefined;
    const oxy = logForm.oxygen ? parseFloat(logForm.oxygen) : undefined;
    const temp = logForm.temperature ? parseFloat(logForm.temperature) : undefined;

    try {
      const res = await fetch("/api/vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.uid,
          date: `${dateStr}, ${timeStr}`,
          heartRate: hr,
          systolic: sys,
          diastolic: dia,
          glucose: glu,
          oxygen: oxy,
          temperature: temp,
        }),
      });

      if (res.ok) {
        const newVital = await res.json();
        setDayData([...dayData, newVital]);
        showToast("Vitals saved successfully", "success");
      } else {
        showToast("Failed to save vitals", "error");
      }
    } catch {
      showToast("Failed to save vitals", "error");
    }

    setShowLogModal(false);
    setLogForm(emptyLog);
  };

  const handleDeleteVital = async (id: string) => {
    try {
      const res = await fetch(`/api/vitals?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setDayData(dayData.filter((v) => v.id !== id));
        showToast("Vital deleted", "success");
      } else {
        showToast("Failed to delete vital", "error");
      }
    } catch {
      showToast("Failed to delete vital", "error");
    }
  };

  const activeConfig = vitalsConfig.find((v) => v.key === vitalFilter) || vitalsConfig[0];
  const showAll = vitalFilter === "all";

  const getTrend = () => {
    if (data.length < 2) return { direction: "stable", value: 0, color: "text-slate-400" };
    const current = latest?.[vitalFilter as keyof VitalEntry] as number;
    const previous = data[data.length - 2][vitalFilter as keyof VitalEntry] as number;
    if (current === undefined || previous === undefined) return { direction: "stable", value: 0, color: "text-slate-400" };
    const diff = current - previous;
    if (diff > 0) return { direction: "up", value: Math.abs(diff), color: "text-red-400" };
    if (diff < 0) return { direction: "down", value: Math.abs(diff), color: "text-emerald-400" };
    return { direction: "stable", value: 0, color: "text-slate-400" };
  };

  const trend = getTrend();

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(20);
    doc.setTextColor(20, 184, 166);
    doc.text("MediSync - Vitals Report", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`, pageWidth / 2, 28, { align: "center" });

    doc.setDrawColor(20, 184, 166);
    doc.line(20, 35, pageWidth - 20, 35);

    let y = 45;

    if (userProfile) {
      doc.setFontSize(11);
      doc.setTextColor(0);
      doc.text("Patient Information", 20, y);
      y += 8;

      doc.setFontSize(9);
      doc.setTextColor(80);
      doc.text(`Name: ${userProfile.name}`, 20, y);
      y += 6;

      if (userProfile.dob) {
        const dob = new Date(userProfile.dob + "T00:00:00");
        const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        const formattedDob = dob.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
        doc.text(`Date of Birth: ${formattedDob} (Age: ${age} years)`, 20, y);
        y += 6;
      }

      if (userProfile.gender) {
        doc.text(`Gender: ${userProfile.gender.charAt(0).toUpperCase() + userProfile.gender.slice(1)}`, 20, y);
        y += 6;
      }

      y += 4;
      doc.setDrawColor(200);
      doc.line(20, y, pageWidth - 20, y);
      y += 10;
    }

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Vital Entries", 20, y);
    y += 10;

    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text("Date & Time", 20, y);
    doc.text("HR", 70, y);
    doc.text("BP", 95, y);
    doc.text("Glucose", 125, y);
    doc.text("SpO2", 155, y);
    doc.text("Temp", 178, y);
    y += 6;

    doc.setDrawColor(200);
    doc.line(20, y, pageWidth - 20, y);
    y += 6;

    doc.setTextColor(0);
    data.forEach((entry) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(entry.date.substring(0, 25), 20, y);
      doc.text(entry.heartRate !== undefined ? `${entry.heartRate}` : "—", 70, y);
      doc.text(entry.systolic !== undefined ? `${entry.systolic}/${entry.diastolic}` : "—", 95, y);
      doc.text(entry.glucose !== undefined ? `${entry.glucose}` : "—", 125, y);
      doc.text(entry.oxygen !== undefined ? `${entry.oxygen}%` : "—", 155, y);
      doc.text(entry.temperature !== undefined ? `${entry.temperature}°F` : "—", 178, y);
      y += 7;
    });

    doc.save("medisync-vitals-report.pdf");
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Vital Monitoring</h1>
            <p className="text-slate-400 text-sm mt-1">Track and monitor your vital signs</p>
          </div>
          <div className="flex items-center gap-3">
            {data.length > 0 && (
              <button onClick={exportToPDF} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors">
                <Download className="w-4 h-4" />
                Export PDF
              </button>
            )}
            <button onClick={() => setShowLogModal(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-teal-500/25 transition-all">
              <Plus className="w-4 h-4" />
              Log Vitals
            </button>
          </div>
        </div>

        {/* Main Chart */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-400" />
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Vitals Trend</h2>
            </div>
            <div className="flex gap-1 p-1 bg-slate-800 rounded-lg">
              {(["day", "week", "month"] as const).map((t) => (
                <button key={t} onClick={() => setTimeFilter(t)} className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${timeFilter === t ? "bg-teal-500 text-white shadow-lg shadow-teal-500/25" : "text-slate-400 hover:text-white"}`}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Vital Selector */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
            <button onClick={() => setVitalFilter("all")} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${vitalFilter === "all" ? "shadow-lg bg-gradient-to-r from-teal-500 to-blue-500 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
              All Vitals
            </button>
            {vitalsConfig.map((v) => (
              <button key={v.key} onClick={() => setVitalFilter(v.key)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${vitalFilter === v.key ? "shadow-lg" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`} style={vitalFilter === v.key ? { background: `linear-gradient(135deg, ${v.gradient[0]}, ${v.gradient[1]})`, color: "white", boxShadow: `0 4px 14px ${v.color}40` } : {}}>
                <v.icon className="w-4 h-4" />
                {v.label}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="h-80">
            {data.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <Activity className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">No data yet</p>
                <p className="text-xs mt-1">Click "Log Vitals" to add your first reading</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                  <defs>
                    {vitalsConfig.map((v) => (
                      <linearGradient key={v.key} id={`gradient-${v.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={v.color} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={v.color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="shortDate"
                    stroke="#475569"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#334155" }}
                    dy={8}
                  />
                  <YAxis
                    stroke="#475569"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: "12px",
                      boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                      padding: "12px 16px",
                    }}
                    labelStyle={{ color: "#94a3b8", fontSize: "12px", marginBottom: "6px" }}
                    itemStyle={{ color: "#e2e8f0", fontSize: "13px", padding: "2px 0" }}
                    labelFormatter={(label, payload) => {
                      if (payload && payload.length > 0) {
                        const item = payload[0].payload as VitalEntry & { date: string };
                        return item.date || label;
                      }
                      return label;
                    }}
                    formatter={(value, name) => {
                      const config = vitalsConfig.find((v) => v.key === name);
                      return [`${value} ${config?.unit || ""}`, config?.label || name];
                    }}
                  />
                  {showAll ? (
                    vitalsConfig.map((v) => (
                      <Area
                        key={v.key}
                        type="monotone"
                        dataKey={v.key}
                        name={v.label}
                        stroke={v.color}
                        strokeWidth={2}
                        fill={`url(#gradient-${v.key})`}
                        dot={{ r: 3, fill: v.color, strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: v.color, strokeWidth: 2, stroke: "#0f172a" }}
                      />
                    ))
                  ) : (
                    <Area
                      type="monotone"
                      dataKey={vitalFilter}
                      stroke={activeConfig.color}
                      strokeWidth={2.5}
                      fill={`url(#gradient-${vitalFilter})`}
                      dot={{ r: 4, fill: activeConfig.color, strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: activeConfig.color, strokeWidth: 2, stroke: "#0f172a" }}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Legend */}
          {!showAll && data.length > 0 && (
            <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-slate-800">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeConfig.color }} />
              <span className="text-sm text-slate-400">{activeConfig.label}</span>
              <span className="text-xs text-slate-500">({activeConfig.unit})</span>
            </div>
          )}
        </div>

        {/* Recent Enteries */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Recent Enteries</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5" />
                {timeFilter === "day" ? "Today's readings" : `Last ${timeFilter}`}
              </div>
              {data.length > 10 && (
                <button onClick={() => setShowAllEntries(true)} className="text-xs text-teal-400 hover:text-teal-300 font-medium">View All</button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            {data.length === 0 ? (
              <div className="py-8 text-center text-slate-500">
                <p className="text-sm">No entries yet</p>
                <p className="text-xs mt-1">Your logged vitals will appear here</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="pb-3 text-xs font-medium text-slate-500 uppercase">Date & Time</th>
                    <th className="pb-3 text-xs font-medium text-slate-500 uppercase">HR</th>
                    <th className="pb-3 text-xs font-medium text-slate-500 uppercase">BP</th>
                    <th className="pb-3 text-xs font-medium text-slate-500 uppercase">Glucose</th>
                    <th className="pb-3 text-xs font-medium text-slate-500 uppercase">SpO2</th>
                    <th className="pb-3 text-xs font-medium text-slate-500 uppercase">Temp</th>
                    <th className="pb-3 text-xs font-medium text-slate-500 uppercase"></th>
                  </tr>
                </thead>
                <tbody>
                  {[...data].reverse().slice(0, 10).map((entry, i) => (
                    <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 text-sm text-white">{entry.date}</td>
                      <td className="py-3 text-sm">{entry.heartRate !== undefined ? <span className="text-white">{entry.heartRate} bpm</span> : <span className="text-slate-600">—</span>}</td>
                      <td className="py-3 text-sm">{entry.systolic !== undefined ? <span className="text-white">{entry.systolic}/{entry.diastolic}</span> : <span className="text-slate-600">—</span>}</td>
                      <td className="py-3 text-sm">{entry.glucose !== undefined ? <span className="text-white">{entry.glucose} mg/dL</span> : <span className="text-slate-600">—</span>}</td>
                      <td className="py-3 text-sm">{entry.oxygen !== undefined ? <span className="text-white">{entry.oxygen}%</span> : <span className="text-slate-600">—</span>}</td>
                      <td className="py-3 text-sm">{entry.temperature !== undefined ? <span className="text-white">{entry.temperature}°F</span> : <span className="text-slate-600">—</span>}</td>
                      <td className="py-3 text-sm text-right">
                        {entry.id && (
                          <button onClick={() => handleDeleteVital(entry.id!)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Log Vitals Modal */}
      {showLogModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowLogModal(false)}>
          <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-white">Log Vitals</h2>
                <p className="text-xs text-slate-500 mt-0.5">Record your current vital signs</p>
              </div>
              <button onClick={() => setShowLogModal(false)} className="p-1 hover:bg-slate-800 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              {vitalsConfig.map((v) => (
                <div key={v.key}>
                  <label className="flex items-center gap-2 text-sm text-slate-400 mb-1.5">
                    <v.icon className="w-4 h-4" style={{ color: v.color }} />
                    {v.label} ({v.unit})
                  </label>
                  <input type="number" step={v.key === "temperature" ? "0.1" : "1"} value={(logForm as any)[v.key]} onChange={(e) => setLogForm({ ...logForm, [v.key]: e.target.value })} placeholder={`Enter ${v.label.toLowerCase()}`} className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-800">
              <button onClick={() => setShowLogModal(false)} className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-lg font-medium hover:bg-slate-700 text-sm">Cancel</button>
              <button onClick={handleLogVitals} className="flex-1 py-2.5 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-lg font-medium text-sm hover:shadow-lg hover:shadow-teal-500/25 transition-all">Save Vitals</button>
            </div>
          </div>
        </div>
      )}

      {/* View All Entries Modal */}
      {showAllEntries && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowAllEntries(false)}>
          <div className="bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[80vh] border border-slate-800 shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-white">All Vital Entries</h2>
                <p className="text-xs text-slate-500 mt-0.5">{data.length} total readings</p>
              </div>
              <button onClick={() => setShowAllEntries(false)} className="p-1 hover:bg-slate-800 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="flex-1 overflow-auto p-5">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-slate-900">
                  <tr className="border-b border-slate-800">
                    <th className="pb-3 text-xs font-medium text-slate-500 uppercase">#</th>
                    <th className="pb-3 text-xs font-medium text-slate-500 uppercase">Date & Time</th>
                    <th className="pb-3 text-xs font-medium text-slate-500 uppercase">HR</th>
                    <th className="pb-3 text-xs font-medium text-slate-500 uppercase">BP</th>
                    <th className="pb-3 text-xs font-medium text-slate-500 uppercase">Glucose</th>
                    <th className="pb-3 text-xs font-medium text-slate-500 uppercase">SpO2</th>
                    <th className="pb-3 text-xs font-medium text-slate-500 uppercase">Temp</th>
                    <th className="pb-3 text-xs font-medium text-slate-500 uppercase"></th>
                  </tr>
                </thead>
                <tbody>
                  {[...data].reverse().map((entry, i) => (
                    <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 text-sm text-slate-500">{i + 1}</td>
                      <td className="py-3 text-sm text-white">{entry.date}</td>
                      <td className="py-3 text-sm">{entry.heartRate !== undefined ? <span className="text-white">{entry.heartRate} bpm</span> : <span className="text-slate-600">—</span>}</td>
                      <td className="py-3 text-sm">{entry.systolic !== undefined ? <span className="text-white">{entry.systolic}/{entry.diastolic}</span> : <span className="text-slate-600">—</span>}</td>
                      <td className="py-3 text-sm">{entry.glucose !== undefined ? <span className="text-white">{entry.glucose} mg/dL</span> : <span className="text-slate-600">—</span>}</td>
                      <td className="py-3 text-sm">{entry.oxygen !== undefined ? <span className="text-white">{entry.oxygen}%</span> : <span className="text-slate-600">—</span>}</td>
                      <td className="py-3 text-sm">{entry.temperature !== undefined ? <span className="text-white">{entry.temperature}°F</span> : <span className="text-slate-600">—</span>}</td>
                      <td className="py-3 text-sm text-right">
                        {entry.id && (
                          <button onClick={() => handleDeleteVital(entry.id!)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-5 border-t border-slate-800">
              <button onClick={() => setShowAllEntries(false)} className="w-full py-2.5 bg-slate-800 text-slate-300 rounded-lg font-medium hover:bg-slate-700 text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl border transition-all ${
          toast.type === "success"
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            : "bg-red-500/10 border-red-500/30 text-red-400"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
