"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/firebase-config";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Toast from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import {
  User,
  Mail,
  Calendar,
  Heart,
  Droplets,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

interface UserProfile {
  id: string;
  email: string;
  name: string;
  dob: string;
  gender: string;
  bloodGroup: string;
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    dob: "",
    gender: "",
    bloodGroup: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const { toast, showToast, dismissToast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        try {
          const res = await fetch(`/api/user?id=${user.uid}`);
          if (res.ok) {
            const data = await res.json();
            if (data) {
              setProfile(data);
              setFormData({
                name: data.name || "",
                dob: data.dob || "",
                gender: data.gender || "",
                bloodGroup: data.bloodGroup || "",
              });
            }
          }
        } catch {
          showToast("Failed to load profile", "error");
        } finally {
          setProfileLoaded(true);
        }
      }
    };
    fetchProfile();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.uid,
          email: user.email,
          ...formData,
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Profile updated successfully!" });
        localStorage.setItem("medisync_profile", JSON.stringify(formData));
      } else {
        setMessage({ type: "error", text: "Failed to update profile" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to update profile" });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profileLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Profile Settings</h1>
          <p className="text-slate-400 text-sm mt-1">Manage your personal information</p>
        </div>

        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="flex items-center gap-2 text-sm text-slate-400 mb-2">
              <User className="w-4 h-4" />
              Full Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter your name"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Date of Birth */}
          <div>
            <label className="flex items-center gap-2 text-sm text-slate-400 mb-2">
              <Calendar className="w-4 h-4" />
              Date of Birth
            </label>
            <input
              type="date"
              name="dob"
              value={formData.dob}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Gender */}
          <div>
            <label className="flex items-center gap-2 text-sm text-slate-400 mb-2">
              <User className="w-4 h-4" />
              Gender
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Blood Group */}
          <div>
            <label className="flex items-center gap-2 text-sm text-slate-400 mb-2">
              <Droplets className="w-4 h-4" />
              Blood Group
            </label>
            <select
              name="bloodGroup"
              value={formData.bloodGroup}
              onChange={handleChange}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Select blood group</option>
              {bloodGroups.map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>

          {/* Message */}
          {message && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${message.type === "success" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
              {message.type === "success" ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span className="text-sm">{message.text}</span>
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-lg font-medium text-sm hover:shadow-lg hover:shadow-teal-500/25 transition-all disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={dismissToast} />}
    </div>
  );
}
