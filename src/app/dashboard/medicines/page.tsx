"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/firebase-config";
import Toast from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import {
  Pill,
  Plus,
  Clock,
  Check,
  AlertCircle,
  Trash2,
  X,
  Pencil,
  RefreshCw,
  Calendar,
} from "lucide-react";

const dosageOptions = [
  { value: "one", label: "Once daily", slots: 1, dailyPills: 1 },
  { value: "two", label: "Twice daily", slots: 2, dailyPills: 2 },
  { value: "three", label: "Three times", slots: 3, dailyPills: 3 },
  { value: "night", label: "At night", slots: 1, dailyPills: 1 },
  { value: "empty", label: "Empty stomach", slots: 1, dailyPills: 1 },
];

const mealOptions = [
  { value: "none", label: "No preference" },
  { value: "before", label: "Before meal" },
  { value: "after", label: "After meal" },
  { value: "empty", label: "Empty stomach" },
];

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

const emptyForm = { name: "", dosage: "one", meal: "none", times: ["09:00"], quantity: 0, threshold: 0 };

function getDaysLeft(quantity: number, dosage: string): number {
  const daily = dosageOptions.find((o) => o.value === dosage)?.dailyPills || 1;
  if (daily === 0 || quantity === 0) return 0;
  return Math.floor(quantity / daily);
}

function getRefillDate(quantity: number, dosage: string): string {
  const days = getDaysLeft(quantity, dosage);
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function MedicinesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [medicines, setMedicines] = useState<Medicine[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [refillMedId, setRefillMedId] = useState<string | null>(null);
  const [refillAmount, setRefillAmount] = useState("");
  const { toast, showToast, dismissToast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchMedicines = async () => {
      if (user) {
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
        } catch {
          showToast("Failed to load medicines", "error");
        }
      }
    };
    fetchMedicines();
  }, [user]);

  const openAdd = () => { setEditId(null); setForm({ ...emptyForm, times: ["09:00"] }); setShowForm(true); };
  const openEdit = (med: Medicine) => { setEditId(med.id); setForm({ name: med.name, dosage: med.dosage, meal: med.meal, times: [...med.times], quantity: med.quantity, threshold: med.threshold }); setShowForm(true); };

  const updateDosage = (val: string) => {
    const slots = dosageOptions.find((o) => o.value === val)?.slots || 1;
    const times = Array(slots).fill("").map((_, i) => form.times[i] || "09:00");
    setForm({ ...form, dosage: val, times });
  };

  const updateTime = (i: number, val: string) => {
    const times = [...form.times];
    times[i] = val;
    setForm({ ...form, times });
  };

  const saveMedicine = async () => {
    if (!form.name) return;

    try {
      if (editId) {
        const res = await fetch("/api/medicines", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editId, ...form }),
        });
        if (res.ok) {
          const updated = await res.json();
          setMedicines(medicines.map((m) => m.id === editId ? updated : m));
          showToast("Medicine updated", "success");
        } else {
          showToast("Failed to update medicine", "error");
        }
      } else {
        const res = await fetch("/api/medicines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user?.uid, ...form, taken: form.times.map(() => false) }),
        });
        if (res.ok) {
          const newMed = await res.json();
          setMedicines([...medicines, newMed]);
          showToast("Medicine added", "success");
        } else {
          showToast("Failed to add medicine", "error");
        }
      }
    } catch {
      showToast("Failed to save medicine", "error");
    }

    setShowForm(false);
    setForm(emptyForm);
  };

  const toggle = async (id: string, i: number) => {
    const med = medicines.find((m) => m.id === id);
    if (!med) return;

    const wasTaken = med.taken[i];
    const newTaken = [...med.taken];
    newTaken[i] = !wasTaken;
    const newQuantity = !wasTaken ? Math.max(0, med.quantity - 1) : med.quantity;
    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const anyTaken = newTaken.some((t) => t);

    try {
      const res = await fetch("/api/medicines", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          taken: newTaken,
          quantity: newQuantity,
          takenDate: anyTaken ? today : null,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setMedicines(medicines.map((m) => m.id === id ? { ...m, taken: updated.taken, quantity: updated.quantity, takenDate: updated.takenDate } : m));
      }
    } catch {
      showToast("Failed to update medicine", "error");
    }
  };

  const remove = async (id: string) => {
    try {
      const res = await fetch(`/api/medicines?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setMedicines(medicines.filter((m) => m.id !== id));
        showToast("Medicine deleted", "success");
      } else {
        showToast("Failed to delete medicine", "error");
      }
    } catch {
      showToast("Failed to delete medicine", "error");
    }
  };

  const handleRefill = async () => {
    if (!refillMedId || !refillAmount) return;
    const amount = parseInt(refillAmount);
    if (isNaN(amount) || amount <= 0) return;

    const med = medicines.find((m) => m.id === refillMedId);
    if (!med) return;

    try {
      const res = await fetch("/api/medicines", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: refillMedId, quantity: med.quantity + amount }),
      });
      if (res.ok) {
        setMedicines(medicines.map((m) => m.id === refillMedId ? { ...m, quantity: m.quantity + amount } : m));
        showToast("Medicine refilled", "success");
      } else {
        showToast("Failed to refill medicine", "error");
      }
    } catch {
      showToast("Failed to refill medicine", "error");
    }

    setRefillMedId(null);
    setRefillAmount("");
  };

  const fmt = (t: string) => {
    const [h, m] = t.split(":");
    const hr = parseInt(h);
    return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
  };

  const getLabel = (v: string, list: { value: string; label: string }[]) => list.find((o) => o.value === v)?.label || v;

  const isOverdue = (time: string, taken: boolean): boolean => {
    if (taken) return false;
    const now = new Date();
    const [h, m] = time.split(":").map(Number);
    const scheduled = new Date();
    scheduled.setHours(h, m, 0, 0);
    return now > scheduled;
  };

  const hasOverdue = (med: Medicine): boolean => {
    return med.times.some((time, i) => isOverdue(time, med.taken[i]));
  };

  const lowStockMeds = medicines.filter((m) => m.quantity > 0 && m.quantity <= m.threshold);
  const outOfStockMeds = medicines.filter((m) => m.quantity === 0);

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Medicine Tracker</h1>
            <p className="text-slate-400 text-sm mt-1">Manage your medications and stay on schedule</p>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-teal-500/25 transition-all">
            <Plus className="w-4 h-4" />
            Add Medicine
          </button>
        </div>

        {/* Out of Stock Warning */}
        {outOfStockMeds.length > 0 && (
          <div className="bg-red-500/10 rounded-xl border border-red-500/30 p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider">Out of Stock — Buy Now</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {outOfStockMeds.map((med) => (
                <div key={med.id} className="flex items-center justify-between p-3 bg-red-500/5 rounded-lg border border-red-500/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                      <Pill className="w-5 h-5 text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{med.name}</p>
                      <p className="text-xs text-red-400">No pills left — refill now</p>
                    </div>
                  </div>
                  <button onClick={() => { setRefillMedId(med.id); setRefillAmount(""); }} className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/30 transition-colors">
                    Refill
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Refill Reminders */}
        {lowStockMeds.length > 0 && (
          <div className="bg-slate-900 rounded-xl border border-amber-500/20 p-5">
            <div className="flex items-center gap-2 mb-4">
              <RefreshCw className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">Refill Reminders</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStockMeds.map((med) => {
                const daysLeft = getDaysLeft(med.quantity, med.dosage);
                const refillDate = getRefillDate(med.quantity, med.dosage);
                return (
                  <div key={med.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-amber-500/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                        <Pill className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{med.name}</p>
                        <p className="text-xs text-amber-400">{med.quantity} pills left · {daysLeft} days</p>
                      </div>
                    </div>
                    <button onClick={() => { setRefillMedId(med.id); setRefillAmount(""); }} className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-medium hover:bg-amber-500/30 transition-colors">
                      Refill
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Medicine Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {medicines.map((med) => {
            const low = med.quantity > 0 && med.quantity <= med.threshold;
            const allDone = med.taken.every((t) => t);
            const daysLeft = getDaysLeft(med.quantity, med.dosage);
            const refillDate = getRefillDate(med.quantity, med.dosage);
            return (
              <div key={med.id} className={`bg-slate-900 rounded-xl border p-5 ${hasOverdue(med) ? "border-red-500/30" : low ? "border-amber-500/30" : "border-slate-800"}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${allDone ? "bg-teal-500/20" : "bg-slate-800"}`}>
                      <Pill className={`w-5 h-5 ${allDone ? "text-teal-400" : "text-slate-400"}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{med.name}</h3>
                      <p className="text-xs text-slate-500">{getLabel(med.dosage, dosageOptions)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(med)} className="p-1.5 text-slate-600 hover:text-teal-400 hover:bg-teal-500/10 rounded-lg transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => remove(med.id)} className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {med.meal !== "none" && <span className="px-2.5 py-1 bg-slate-800 text-slate-400 rounded-md text-xs">{getLabel(med.meal, mealOptions)}</span>}
                  {low && <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 rounded-md text-xs">Low stock</span>}
                </div>

                <div className="space-y-2 mb-4">
                  {med.times.map((time, i) => {
                    const overdue = isOverdue(time, med.taken[i]);
                    return (
                      <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${overdue ? "bg-red-500/10 border border-red-500/30" : "bg-slate-800/50"}`}>
                        <div className="flex items-center gap-2">
                          <Clock className={`w-4 h-4 ${overdue ? "text-red-400" : "text-slate-500"}`} />
                          <span className={`text-sm ${overdue ? "text-red-400 font-medium" : "text-slate-300"}`}>{fmt(time)}</span>
                          {overdue && <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">Overdue</span>}
                        </div>
                        <button onClick={() => toggle(med.id, i)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${med.taken[i] ? "bg-teal-500 text-white" : overdue ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-slate-700 text-slate-400 hover:bg-teal-500/20 hover:text-teal-400"}`}>
                          {med.taken[i] ? <><Check className="w-3.5 h-3.5" /> Taken</> : overdue ? "Take Now" : "Mark taken"}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Stock & Refill Info */}
                {med.quantity > 0 && (
                  <div className="p-3 bg-slate-800/30 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-slate-500">Pills remaining</span>
                      <span className={`text-xs font-medium ${low ? "text-amber-400" : "text-slate-300"}`}>{med.quantity} pills</span>
                    </div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mb-2">
                      <div className={`h-full rounded-full ${low ? "bg-amber-400" : "bg-teal-400"}`} style={{ width: `${Math.min((med.quantity / Math.max(med.threshold * 3, 30)) * 100, 100)}%` }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs text-slate-500">Refill by <span className="text-slate-300">{refillDate}</span></span>
                      </div>
                      <span className="text-xs text-slate-500">{daysLeft} days left</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">{editId ? "Edit Medicine" : "Add Medicine"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-800 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Medicine Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., Paracetamol" className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Frequency</label>
                  <select value={form.dosage} onChange={(e) => updateDosage(e.target.value)} className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    {dosageOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Meal Timing</label>
                  <select value={form.meal} onChange={(e) => setForm({ ...form, meal: e.target.value })} className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    {mealOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Reminder Times</label>
                <div className="grid grid-cols-3 gap-2">
                  {form.times.map((t, i) => (
                    <input key={i} type="time" value={t} onChange={(e) => updateTime(i, e.target.value)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Quantity (pills)</label>
                  <input type="number" value={form.quantity || ""} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} min="0" placeholder="e.g., 30" className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Low Stock Alert</label>
                  <input type="number" value={form.threshold || ""} onChange={(e) => setForm({ ...form, threshold: parseInt(e.target.value) || 0 })} min="0" placeholder="e.g., 10" className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-800">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-lg font-medium hover:bg-slate-700 text-sm">Cancel</button>
              <button onClick={saveMedicine} disabled={!form.name} className="flex-1 py-2.5 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-lg font-medium disabled:opacity-50 text-sm">{editId ? "Save Changes" : "Add Medicine"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Refill Modal */}
      {refillMedId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setRefillMedId(null)}>
          <div className="bg-slate-900 rounded-2xl w-full max-w-sm border border-slate-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">Refill Medicine</h2>
              <button onClick={() => setRefillMedId(null)} className="p-1 hover:bg-slate-800 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-400 mb-4">How many pills are you adding?</p>
              <input type="number" value={refillAmount} onChange={(e) => setRefillAmount(e.target.value)} min="1" placeholder="e.g., 30" className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-800">
              <button onClick={() => setRefillMedId(null)} className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-lg font-medium hover:bg-slate-700 text-sm">Cancel</button>
              <button onClick={handleRefill} disabled={!refillAmount || parseInt(refillAmount) <= 0} className="flex-1 py-2.5 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-lg font-medium disabled:opacity-50 text-sm">Add Pills</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={dismissToast} />}
    </div>
  );
}
