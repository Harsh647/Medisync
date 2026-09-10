"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/firebase-config";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import {
  Activity,
  Pill,
  FileText,
  Brain,
  Shield,
  LogOut,
  Menu,
  X,
  User,
} from "lucide-react";

const navItems = [
  { icon: Activity, label: "Dashboard", href: "/dashboard" },
  { icon: Shield, label: "Digital Vault", href: "/dashboard/vault" },
  { icon: Brain, label: "Disease Prediction", href: "/dashboard/prediction" },
  { icon: Activity, label: "Vital Monitoring", href: "/dashboard/vitals" },
  { icon: Pill, label: "Medicine Tracker", href: "/dashboard/medicines" },
  { icon: FileText, label: "Report Summarizer", href: "/dashboard/reports" },
];

export default function Navbar() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    router.push("/");
    await signOut(auth);
  };

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 shrink-0">
            <Logo size={32} />
            <span className="text-lg font-bold bg-gradient-to-r from-teal-400 to-blue-400 bg-clip-text text-transparent">MediSync</span>
          </Link>
          <div className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                    ? "bg-teal-500/10 text-teal-400"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/profile"
              className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === "/dashboard/profile"
                  ? "bg-teal-500/10 text-teal-400"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <User className="w-4 h-4" />
              Profile
            </Link>
            <button onClick={handleSignOut} className="hidden sm:flex p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
              <LogOut className="w-4 h-4" />
            </button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-900 px-4 py-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
                pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
                  ? "bg-teal-500/10 text-teal-400"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
          <Link
            href="/dashboard/profile"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium ${
              pathname === "/dashboard/profile"
                ? "bg-teal-500/10 text-teal-400"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <User className="w-5 h-5" />
            Profile
          </Link>
          <button onClick={handleSignOut} className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 w-full">
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      )}
    </nav>
  );
}
