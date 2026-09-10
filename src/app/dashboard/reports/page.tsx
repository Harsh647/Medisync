"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/firebase-config";
import Toast from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import {
  Activity,
  FileText,
  Upload,
  X,
  Sparkles,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface Report {
  id: string;
  name: string;
  date: string;
  type: string;
  status: "analyzing" | "analyzed" | "error";
  summary?: string;
  keyFindings?: string[];
  recommendations?: string[];
  error?: string;
}

const getStorageKey = () => "medisync_reports";

const loadReports = (): Report[] => {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(getStorageKey());
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveReports = (reports: Report[]) => {
  localStorage.setItem(getStorageKey(), JSON.stringify(reports));
};

const extractTextFromPDF = async (file: File): Promise<string> => {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item: any) => item.str).join(" ") + "\n";
  }

  return text;
};

const analyzeWithGemini = async (fileName: string, file: File): Promise<{ summary: string; keyFindings: string[]; recommendations: string[] }> => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return {
      summary: "Gemini API key not configured. Please add NEXT_PUBLIC_GEMINI_API_KEY to your .env.local file.",
      keyFindings: [],
      recommendations: [],
    };
  }

  let reportContent = "";

  if (file.type === "application/pdf") {
    reportContent = await extractTextFromPDF(file);
  } else if (file.type.startsWith("image/")) {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );
    reportContent = `[Image uploaded: ${file.name}. Please analyze this medical report image and extract all visible text and values.]`;

    try {
      const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: `You are a medical report analyzer. This is an image of a medical lab report. Extract all visible text, numbers, test names, and values from this image. Then provide a simple summary explaining what each result means in plain language for a common person.

Please provide:
1. A simple summary of all findings
2. Key findings (list each test result with what it means)
3. Recommendations (if any concerns are found)

Keep language simple - avoid medical jargon or explain it when used. Format as JSON with fields: summary, keyFindings (array), recommendations (array).` },
                { inlineData: { mimeType: file.type, data: base64 } },
              ],
            }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
          }),
        }
      );

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            summary: parsed.summary || "Analysis complete.",
            keyFindings: parsed.keyFindings || [],
            recommendations: parsed.recommendations || [],
          };
        } catch {
          const summaryMatch = cleaned.match(/"summary"\s*:\s*"([^"]+)"/);
          const findingsMatch = cleaned.match(/"keyFindings"\s*:\s*\[([\s\S]*?)\]/);
          const recsMatch = cleaned.match(/"recommendations"\s*:\s*\[([\s\S]*?)\]/);
          return {
            summary: summaryMatch?.[1] || cleaned.slice(0, 1000),
            keyFindings: findingsMatch ? findingsMatch[1].split(",").map((s: string) => s.replace(/"/g, "").trim()).filter(Boolean) : [],
            recommendations: recsMatch ? recsMatch[1].split(",").map((s: string) => s.replace(/"/g, "").trim()).filter(Boolean) : [],
          };
        }
      }
      return { summary: cleaned || "Analysis complete.", keyFindings: [], recommendations: [] };
    } catch {
      return { summary: "Unable to analyze the image. Please try again.", keyFindings: [], recommendations: [] };
    }
  }

  if (!reportContent.trim()) {
    return { summary: "Could not extract text from the file. Please try a clearer file.", keyFindings: [], recommendations: [] };
  }

  const prompt = `You are a medical report analyzer. Here is the content of an uploaded document:

---
${reportContent}
---

First, determine if this is a medical/lab report. If it is NOT a medical report, respond with:
{"isMedicalReport": false, "message": "This does not appear to be a medical report. Please upload a valid lab report or medical document."}

If it IS a medical report, analyze it and provide a simple, easy-to-understand summary for a common person.

Please provide:
1. A simple summary explaining what this report is about and what the results mean in plain language
2. Key findings (list each important result with what it means)
3. Recommendations (if any, based on the findings)

Keep the language simple - avoid medical jargon or explain it when used. Format your response as JSON with fields: isMedicalReport (true), summary, keyFindings (array), recommendations (array).`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
        }),
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.isMedicalReport === false) {
          return {
            summary: parsed.message || "This does not appear to be a medical report.",
            keyFindings: [],
            recommendations: [],
          };
        }
        return {
          summary: parsed.summary || "Analysis complete.",
          keyFindings: parsed.keyFindings || [],
          recommendations: parsed.recommendations || [],
        };
      } catch {
        const summaryMatch = cleaned.match(/"summary"\s*:\s*"([^"]+)"/);
        const findingsMatch = cleaned.match(/"keyFindings"\s*:\s*\[([\s\S]*?)\]/);
        const recsMatch = cleaned.match(/"recommendations"\s*:\s*\[([\s\S]*?)\]/);
        return {
          summary: summaryMatch?.[1] || cleaned.slice(0, 1000),
          keyFindings: findingsMatch ? findingsMatch[1].split(",").map((s: string) => s.replace(/"/g, "").trim()).filter(Boolean) : [],
          recommendations: recsMatch ? recsMatch[1].split(",").map((s: string) => s.replace(/"/g, "").trim()).filter(Boolean) : [],
        };
      }
    }

    return {
      summary: cleaned || "Analysis complete. Please review the findings below.",
      keyFindings: [],
      recommendations: [],
    };
  } catch (error: any) {
    if (error?.name === "AbortError") {
      return { summary: "", keyFindings: [], recommendations: [] };
    }
    return {
      summary: "Unable to analyze the report at this time. Please try again later.",
      keyFindings: [],
      recommendations: [],
    };
  }
};

export default function ReportsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<FileList | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedReports, setSelectedReports] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast, showToast, dismissToast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchReports = async () => {
      if (user) {
        try {
          const res = await fetch(`/api/reports?userId=${user.uid}`);
          if (res.ok) {
            const data = await res.json();
            setReports(data);
          }
        } catch {
          showToast("Failed to load reports", "error");
        }
      }
    };
    fetchReports();
  }, [user]);

  const filteredReports = reports.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setUploading(true);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reportType = file.type.includes("pdf") ? "PDF" : "Image";

        const newReportData = {
          userId: user?.uid,
          name: file.name.replace(/\.[^/.]+$/, ""),
          date: new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          type: reportType,
          status: "analyzing",
        };

        let newReport: Report;
        try {
          const res = await fetch("/api/reports", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newReportData),
          });
          if (res.ok) {
            newReport = await res.json();
            setReports((prev) => [newReport!, ...prev]);
          } else {
            showToast("Failed to create report", "error");
            continue;
          }
        } catch {
          showToast("Failed to create report", "error");
          continue;
        }

        const result = await analyzeWithGemini(newReport.name, file);

        try {
          const res = await fetch("/api/reports", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: newReport.id,
              status: "analyzed",
              summary: result.summary,
              keyFindings: result.keyFindings,
              recommendations: result.recommendations,
            }),
          });
          if (res.ok) {
            const updated = await res.json();
            setReports((prev) =>
              prev.map((r) => (r.id === newReport.id ? updated : r))
            );
            showToast("Report analyzed", "success");
          }
        } catch {
          showToast("Failed to update report", "error");
        }
      }

      setUploading(false);
      setShowUploadModal(false);
    },
    [user]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setPendingFiles(e.dataTransfer.files);
  };

  const handleSubmit = () => {
    if (pendingFiles) {
      handleUpload(pendingFiles);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/reports?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setReports(reports.filter((r) => r.id !== id));
        showToast("Report deleted", "success");
      } else {
        showToast("Failed to delete report", "error");
      }
    } catch {
      showToast("Failed to delete report", "error");
    }
  };

  const toggleCompareMode = () => {
    setCompareMode(!compareMode);
    setSelectedReports([]);
  };

  const toggleSelectReport = (id: string) => {
    setSelectedReports((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const getSelectedReports = () => {
    return reports.filter((r) => selectedReports.includes(r.id));
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Report Summarizer</h1>
            <p className="text-slate-400 text-sm mt-1">AI simplifies complex medical jargon</p>
          </div>
          <div className="flex items-center gap-3">
            {reports.length >= 2 && (
              <button onClick={toggleCompareMode} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${compareMode ? "bg-teal-500/10 text-teal-400 border border-teal-500/30" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
                <Activity className="w-4 h-4" />
                {compareMode ? "Cancel Compare" : "Compare Reports"}
              </button>
            )}
            <button onClick={() => { setPendingFiles(null); setShowUploadModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-teal-500/25 transition-all">
              <Upload className="w-4 h-4" />
              Upload Report
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search your reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
          />
        </div>

        {reports.length === 0 ? (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-12 text-center">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No reports yet</h3>
            <p className="text-slate-500 text-sm mb-6">Upload your first lab report to get an AI-powered summary</p>
            <button onClick={() => setShowUploadModal(true)} className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-teal-500/25 transition-all">
              <Upload className="w-5 h-5" />
              Upload Report
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <div key={report.id} className={`bg-slate-900 rounded-2xl border overflow-hidden transition-colors ${compareMode && selectedReports.includes(report.id) ? "border-teal-500/50" : "border-slate-800"}`}>
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {compareMode ? (
                        <button onClick={() => toggleSelectReport(report.id)} className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 mt-1 transition-colors ${selectedReports.includes(report.id) ? "bg-teal-500 border-teal-500" : "border-slate-600 hover:border-slate-500"}`}>
                          {selectedReports.includes(report.id) && <CheckCircle2 className="w-4 h-4 text-white" />}
                        </button>
                      ) : null}
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: report.type === "PDF" ? "rgba(239, 68, 68, 0.1)" : "rgba(59, 130, 246, 0.1)" }}>
                        <FileText className="w-6 h-6" style={{ color: report.type === "PDF" ? "#ef4444" : "#3b82f6" }} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-white">{report.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500">{report.date}</span>
                          <span className="text-xs text-slate-600">•</span>
                          <span className="text-xs text-slate-500">{report.type}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {report.status === "analyzing" ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 rounded-lg">
                          <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                          <span className="text-xs text-yellow-400 font-medium">Analyzing</span>
                        </div>
                      ) : report.status === "analyzed" ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 rounded-lg">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs text-emerald-400 font-medium">Analyzed</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 rounded-lg">
                          <AlertCircle className="w-4 h-4 text-red-400" />
                          <span className="text-xs text-red-400 font-medium">Error</span>
                        </div>
                      )}
                      <button onClick={() => handleDelete(report.id)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4 text-slate-500 hover:text-red-400" />
                      </button>
                    </div>
                  </div>

                  {report.status === "analyzed" && (
                    <div className="mt-4">
                      <button onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)} className="flex items-center gap-2 text-sm text-teal-400 hover:text-teal-300 font-medium">
                        <Sparkles className="w-4 h-4" />
                        {report.summary ? "View AI Summary" : "No Analysis Available"}
                        {expandedReport === report.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      {expandedReport === report.id && (
                        <div className="mt-4 space-y-4">
                          {report.summary ? (
                            <div className="bg-slate-800/50 rounded-xl p-4">
                              <h4 className="text-sm font-medium text-slate-400 mb-2">Summary</h4>
                              <p className="text-sm text-white leading-relaxed">{report.summary}</p>
                            </div>
                          ) : (
                            <div className="bg-slate-800/50 rounded-xl p-4">
                              <p className="text-sm text-slate-400">No analysis summary available. The Gemini API key may not be configured.</p>
                            </div>
                          )}

                          {report.keyFindings && report.keyFindings.length > 0 && (
                            <div className="bg-slate-800/50 rounded-xl p-4">
                              <h4 className="text-sm font-medium text-slate-400 mb-2">Key Findings</h4>
                              <ul className="space-y-2">
                                {report.keyFindings.map((finding, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-white">
                                    <span className="text-teal-400 mt-0.5">•</span>
                                    {finding}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {report.recommendations && report.recommendations.length > 0 && (
                            <div className="bg-slate-800/50 rounded-xl p-4">
                              <h4 className="text-sm font-medium text-slate-400 mb-2">Recommendations</h4>
                              <ul className="space-y-2">
                                {report.recommendations.map((rec, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-white">
                                    <span className="text-blue-400 mt-0.5">→</span>
                                    {rec}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {report.status === "analyzing" && (
                    <div className="mt-4 flex items-center gap-3 p-4 bg-slate-800/50 rounded-xl">
                      <Loader2 className="w-5 h-5 text-teal-400 animate-spin" />
                      <div>
                        <p className="text-sm text-white font-medium">AI is analyzing your report...</p>
                        <p className="text-xs text-slate-500">This may take a moment</p>
                      </div>
                    </div>
                  )}

                  {report.status === "error" && (
                    <div className="mt-4 p-4 bg-red-500/10 rounded-xl">
                      <p className="text-sm text-red-400">{report.error || "Failed to analyze report"}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Compare Section */}
        {compareMode && selectedReports.length >= 2 && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="w-5 h-5 text-teal-400" />
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Report Comparison</h2>
              <span className="text-xs text-slate-500">({selectedReports.length} selected)</span>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {getSelectedReports().map((report, i) => (
                <div key={report.id} className="bg-slate-800/50 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: i === 0 ? "rgba(20, 184, 166, 0.2)" : "rgba(59, 130, 246, 0.2)" }}>
                      <span className="text-sm font-bold" style={{ color: i === 0 ? "#14b8a6" : "#3b82f6" }}>{i + 1}</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-white">{report.name}</h3>
                      <p className="text-xs text-slate-500">{report.date}</p>
                    </div>
                  </div>

                  {report.summary && (
                    <div className="mb-4">
                      <h4 className="text-xs font-medium text-slate-400 mb-2">Summary</h4>
                      <p className="text-sm text-slate-300 leading-relaxed">{report.summary}</p>
                    </div>
                  )}

                  {report.keyFindings && report.keyFindings.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-medium text-slate-400 mb-2">Key Findings</h4>
                      <ul className="space-y-1.5">
                        {report.keyFindings.slice(0, 3).map((finding, j) => (
                          <li key={j} className="text-xs text-slate-300 flex items-start gap-2">
                            <span className="text-teal-400 mt-0.5">•</span>
                            {finding}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {report.recommendations && report.recommendations.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-slate-400 mb-2">Recommendations</h4>
                      <ul className="space-y-1.5">
                        {report.recommendations.slice(0, 3).map((rec, j) => (
                          <li key={j} className="text-xs text-slate-300 flex items-start gap-2">
                            <span className="text-blue-400 mt-0.5">→</span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {compareMode && selectedReports.length < 2 && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 text-center">
            <Activity className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Select at least 2 reports to compare</p>
            <p className="text-xs text-slate-600 mt-1">{selectedReports.length} of 2 minimum selected</p>
          </div>
        )}
      </main>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowUploadModal(false)}>
          <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-semibold text-white">Upload Report</h2>
                <p className="text-xs text-slate-500 mt-0.5">PDF or Image files supported</p>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="p-1 hover:bg-slate-800 rounded-lg">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-5">
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragOver ? "border-teal-500 bg-teal-500/10" : "border-slate-700 hover:border-slate-600 hover:bg-slate-800/50"}`}
              >
                {pendingFiles && pendingFiles.length > 0 ? (
                  <>
                    <CheckCircle2 className="w-10 h-10 text-teal-400 mx-auto mb-3" />
                    <p className="text-sm text-white font-medium mb-1">{pendingFiles.length} file(s) selected</p>
                    <p className="text-xs text-slate-500">Click to change selection</p>
                  </>
                ) : (
                  <>
                    <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragOver ? "text-teal-400" : "text-slate-600"}`} />
                    <p className="text-sm text-white font-medium mb-1">
                      {isDragOver ? "Drop your files here" : "Click to upload or drag and drop"}
                    </p>
                    <p className="text-xs text-slate-500">PDF, PNG, JPG up to 10MB</p>
                  </>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                multiple
                onChange={(e) => setPendingFiles(e.target.files)}
                className="hidden"
              />

              {uploading && (
                <div className="mt-4 flex items-center gap-3 p-3 bg-slate-800 rounded-lg">
                  <Loader2 className="w-4 h-4 text-teal-400 animate-spin" />
                  <span className="text-sm text-slate-400">Uploading and analyzing...</span>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-800">
              {pendingFiles && pendingFiles.length > 0 ? (
                <div className="flex gap-3">
                  <button onClick={() => { setPendingFiles(null); }} className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-lg font-medium hover:bg-slate-700 text-sm transition-colors">
                    Clear
                  </button>
                  <button onClick={handleSubmit} disabled={uploading} className="flex-1 py-2.5 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-lg font-medium text-sm hover:shadow-lg hover:shadow-teal-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {uploading ? "Analyzing..." : `Submit ${pendingFiles.length} file(s)`}
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowUploadModal(false)} className="w-full py-2.5 bg-slate-800 text-slate-300 rounded-lg font-medium hover:bg-slate-700 text-sm transition-colors">
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={dismissToast} />}
    </div>
  );
}
