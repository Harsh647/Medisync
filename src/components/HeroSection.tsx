"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import {
  Shield,
  Activity,
  Pill,
  FileText,
  Brain,
  Heart,
  ChevronRight,
  Menu,
  X,
  Lock,
  TrendingUp,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Digital Vault",
    description: "Securely store and manage all your medical records in one encrypted digital vault.",
    color: "from-teal-500 to-cyan-500",
    bgColor: "bg-teal-50",
    darkBgColor: "bg-teal-950",
  },
  {
    icon: Brain,
    title: "Disease Prediction",
    description: "AI-powered risk assessment for Type 2 Diabetes and other chronic conditions.",
    color: "from-cyan-500 to-blue-500",
    bgColor: "bg-cyan-50",
    darkBgColor: "bg-cyan-950",
  },
  {
    icon: Activity,
    title: "Vital Monitoring",
    description: "Track blood pressure, heart rate, glucose levels and other vital signs.",
    color: "from-blue-500 to-indigo-500",
    bgColor: "bg-blue-50",
    darkBgColor: "bg-blue-950",
  },
  {
    icon: Pill,
    title: "Medicine Tracker",
    description: "Never miss a dose with smart reminders and medication tracking.",
    color: "from-emerald-500 to-teal-500",
    bgColor: "bg-emerald-50",
    darkBgColor: "bg-emerald-950",
  },
  {
    icon: FileText,
    title: "Report Summarizer",
    description: "AI simplifies complex medical jargon into easy-to-understand summaries.",
    color: "from-cyan-400 to-blue-500",
    bgColor: "bg-cyan-50",
    darkBgColor: "bg-cyan-950",
  },
  {
    icon: Heart,
    title: "Health Insights",
    description: "Personalized health recommendations based on your data patterns.",
    color: "from-teal-400 to-cyan-500",
    bgColor: "bg-teal-50",
    darkBgColor: "bg-teal-950",
  },
];

export default function HeroSection() {
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const FeatureIcon = features[currentFeature].icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-teal-100 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Logo size={40} />
              <span className="text-xl font-bold bg-gradient-to-r from-teal-500 to-blue-500 bg-clip-text text-transparent">
                MediSync
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-4">
              <Link href="/login" className="px-5 py-2 text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 font-medium transition-colors">
                Login
              </Link>
              <Link href="/signup" className="px-6 py-2 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-full font-medium hover:shadow-lg hover:shadow-teal-500/25 transition-all duration-300 hover:scale-105">
                Register
              </Link>
            </div>

            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
            <div className="px-4 py-4 space-y-3">
              <div className="flex flex-col gap-3">
                <Link href="/login" className="block py-3 text-center text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl font-medium">
                  Login
                </Link>
                <Link href="/signup" className="block py-3 text-center bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-xl font-medium">
                  Register
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Content */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-100 dark:bg-teal-900/30 rounded-full text-teal-700 dark:text-teal-300 text-sm font-medium mb-6">
                <Zap className="w-4 h-4" />
                AI-Powered Health Management
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white leading-tight mb-6">
                Your Health,{" "}
                <span className="bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 bg-clip-text text-transparent">
                  Simplified
                </span>{" "}
                & Secured
              </h1>

              <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-xl mx-auto lg:mx-0">
                Medisync brings all your health records, vital tracking, medication management, and AI-powered disease prediction into one secure platform. Take control of your health journey today.
              </p>

              {/* Trust Badges */}
              <div className="flex items-center gap-6 justify-center lg:justify-start">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Lock className="w-4 h-4 text-teal-500" />
                  HIPAA Compliant
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Shield className="w-4 h-4 text-teal-500" />
                  End-to-End Encrypted
                </div>
              </div>
            </div>

            {/* Right Content - Feature Showcase */}
            <div className="relative">
              <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 p-8 border border-slate-200 dark:border-slate-800">
                <div key={currentFeature} className="transition-opacity duration-300">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${features[currentFeature].color} flex items-center justify-center mb-6`}>
                    <FeatureIcon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                    {features[currentFeature].title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-lg">
                    {features[currentFeature].description}
                  </p>
                </div>

                {/* Feature Indicators */}
                <div className="flex items-center gap-2 mt-8">
                  {features.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentFeature(index)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        index === currentFeature
                          ? "w-8 bg-teal-500"
                          : "w-2 bg-slate-300 dark:bg-slate-700"
                      }`}
                    />
                  ))}
                </div>

                {/* Quick Feature Grid */}
                <div className="grid grid-cols-3 gap-4 mt-8">
                  {features.slice(0, 6).map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                      <button
                        key={index}
                        onClick={() => setCurrentFeature(index)}
                        className={`p-4 rounded-xl transition-all duration-300 ${
                          index === currentFeature
                            ? `${feature.bgColor} dark:${feature.darkBgColor} scale-105`
                            : "bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700"
                        }`}
                      >
                        <Icon className={`w-6 h-6 mx-auto ${
                          index === currentFeature
                            ? "text-teal-600 dark:text-teal-400"
                            : "text-slate-500 dark:text-slate-400"
                        }`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-lg border border-slate-200 dark:border-slate-700 animate-bounce" style={{ animationDuration: "3s" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center">
                    <Activity className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">Heart Rate</p>
                    <p className="text-lg font-bold text-teal-600 dark:text-teal-400">72 bpm</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Everything You Need for{" "}
              <span className="bg-gradient-to-r from-teal-500 to-blue-500 bg-clip-text text-transparent">
                Better Health
              </span>
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              Medisync combines cutting-edge AI technology with comprehensive health management tools to give you complete control over your wellbeing.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="group relative bg-slate-50 dark:bg-slate-800 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-600 transition-all duration-300 hover:shadow-xl hover:shadow-teal-500/5"
                >
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    {feature.description}
                  </p>
                  <ChevronRight className="w-5 h-5 text-slate-400 mt-4 group-hover:translate-x-1 group-hover:text-teal-500 transition-all" />
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-100 dark:bg-slate-800">
        <div className="max-w-4xl mx-auto text-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-6">
              Ready to Take Control of Your Health?
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
              Join Medisync today and experience AI-powered health management.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-teal-500/25 transition-all duration-300 hover:scale-105">
                Login
              </Link>
              <Link href="/signup" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white dark:bg-slate-700 text-slate-700 dark:text-white rounded-xl font-semibold border border-slate-200 dark:border-slate-600 hover:border-teal-300 dark:hover:border-teal-500 transition-all duration-300">
                Register
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2">
              <Logo size={32} />
              <span className="text-lg font-bold text-white">MediSync</span>
            </Link>
            <p className="text-sm text-center">
              &copy; 2026 Medisync. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
