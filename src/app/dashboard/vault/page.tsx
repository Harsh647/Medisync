"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/firebase-config";
import Toast from "@/components/Toast";
import { useToast } from "@/hooks/useToast";
import {
  Upload,
  FileText,
  Image,
  Search,
  Trash2,
  X,
  Download,
  Eye,
  Share2,
  FolderOpen,
  Calendar,
  Copy,
  Check,
  Mail,
  MessageCircle,
  Link as LinkIcon,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import PDFViewer from "@/components/PDFViewer";

const categoryFilters = [
  { id: "all", label: "All" },
  { id: "prescriptions", label: "Prescriptions" },
  { id: "lab-reports", label: "Lab Reports" },
  { id: "insurance", label: "Insurance" },
  { id: "id-cards", label: "ID Cards" },
  { id: "images", label: "Images" },
];

interface Document {
  id: string;
  name: string;
  category: string;
  type: string;
  size: string;
  date: string;
  preview: string;
  fileUrl?: string;
  content?: string;
}

export default function VaultPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [newDocName, setNewDocName] = useState("");
  const [newDocCategory, setNewDocCategory] = useState("prescriptions");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showPreview, setShowPreview] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [previewZoom, setPreviewZoom] = useState(100);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareDoc, setShareDoc] = useState<Document | null>(null);
  const [copied, setCopied] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const { toast, showToast, dismissToast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchDocuments = async () => {
      if (user) {
        try {
          const res = await fetch(`/api/documents?userId=${user.uid}`);
          if (res.ok) {
            const data = await res.json();
            setDocuments(data);
          }
        } catch {
          showToast("Failed to load documents", "error");
        }
      }
    };
    fetchDocuments();
  }, [user]);

  const filtered = documents.filter((doc) => {
    const matchCategory = activeCategory === "all" || doc.category === activeCategory;
    const matchSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const openPreview = (doc: Document) => {
    setPreviewDoc(doc);
    setShowPreview(true);
    setPreviewZoom(100);
  };

  const handleDownload = (doc: Document) => {
    if (doc.fileUrl) {
      const a = window.document.createElement("a");
      a.href = doc.fileUrl;
      a.download = doc.name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
    } else {
      const content = doc.content || doc.preview;
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `${doc.name}.txt`;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const openShare = (doc: Document) => {
    setShareDoc(doc);
    setShowShareModal(true);
    setCopied(false);
  };

  const copyToClipboard = () => {
    if (shareDoc) {
      navigator.clipboard.writeText(`https://medisync.app/vault/${shareDoc.id}`);
      setCopied(true);
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 2000);
    }
  };

  const shareViaEmail = () => {
    if (shareDoc) {
      const subject = encodeURIComponent(`Shared Document: ${shareDoc.name}`);
      const body = encodeURIComponent(`Here is the document: ${shareDoc.name}\n\nView at: https://medisync.app/vault/${shareDoc.id}`);
      window.open(`mailto:?subject=${subject}&body=${body}`);
    }
  };

  const shareViaWhatsApp = () => {
    if (shareDoc) {
      const text = encodeURIComponent(`Check this document: ${shareDoc.name}\n\nhttps://medisync.app/vault/${shareDoc.id}`);
      window.open(`https://wa.me/?text=${text}`);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!newDocName) {
        setNewDocName(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!newDocName) {
        setNewDocName(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const getFileType = (fileName: string): string => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "PDF";
    if (ext === "jpg" || ext === "jpeg") return "JPG";
    if (ext === "png") return "PNG";
    if (ext === "dcm" || ext === "dicom") return "DICOM";
    return "FILE";
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  const handleUpload = async () => {
    if (!newDocName || !selectedFile) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const fileUrl = e.target?.result as string;

      try {
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user?.uid,
            name: newDocName,
            category: newDocCategory,
            type: getFileType(selectedFile.name),
            size: formatSize(selectedFile.size),
            date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
            preview: `Uploaded ${getFileType(selectedFile.name)} document.`,
            fileUrl,
          }),
        });

        if (res.ok) {
          const newDoc = await res.json();
          setDocuments([newDoc, ...documents]);
          showToast("Document uploaded", "success");
        } else {
          showToast("Failed to upload document", "error");
        }
      } catch {
        showToast("Failed to upload document", "error");
      }

      setShowUpload(false);
      setNewDocName("");
      setNewDocCategory("prescriptions");
      setSelectedFile(null);
    };
    reader.readAsDataURL(selectedFile);
  };

  const deleteDoc = async (id: string) => {
    try {
      const res = await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setDocuments(documents.filter((d) => d.id !== id));
        setSelectedDoc(null);
        setShowPreview(false);
        showToast("Document deleted", "success");
      } else {
        showToast("Failed to delete document", "error");
      }
    } catch {
      showToast("Failed to delete document", "error");
    }
  };

  const getFileIcon = (type: string, size?: string) => {
    const iconSize = size === "lg" ? "w-8 h-8" : "w-5 h-5";
    if (type === "JPG" || type === "PNG") return <Image className={`${iconSize} text-blue-400`} />;
    if (type === "DICOM") return <Image className={`${iconSize} text-purple-400`} />;
    return <FileText className={`${iconSize} text-teal-400`} />;
  };

  const renderPreview = (doc: Document) => {
    if (doc.fileUrl) {
      if (doc.type === "JPG" || doc.type === "PNG") {
        return (
          <div className="flex items-center justify-center h-full bg-slate-900 rounded-lg overflow-hidden">
            <img src={doc.fileUrl} alt={doc.name} className="max-w-full max-h-full object-contain" style={{ transform: `scale(${previewZoom / 100})`, transformOrigin: "center" }} />
          </div>
        );
      }
      if (doc.type === "PDF") {
        return <PDFViewer fileUrl={doc.fileUrl} zoom={previewZoom} />;
      }
    }
    if (doc.content) {
      return (
        <div className="h-full overflow-auto bg-white rounded-lg">
          <div className="p-10 font-serif text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
            <div className="max-w-2xl mx-auto" style={{ transform: `scale(${previewZoom / 100})`, transformOrigin: "top left" }}>
              {doc.content.split("\n").map((line, i) => (
                <p key={i} className={line === "" ? "h-4" : ""}>
                  {line}
                </p>
              ))}
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-800 rounded-lg">
        {getFileIcon(doc.type, "lg")}
        <p className="text-slate-400 mt-4">{doc.name}</p>
        <p className="text-xs text-slate-500 mt-1">{doc.type} · {doc.size}</p>
        <p className="text-xs text-slate-500 mt-4">Preview not available for this file type</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Digital Vault</h1>
            <p className="text-slate-400 text-sm mt-1">Securely store and manage your medical documents</p>
          </div>
          <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-teal-500/25 transition-all">
            <Upload className="w-4 h-4" />
            Upload Document
          </button>
        </div>

        {/* Search & Filters */}
        <div className="space-y-4 mb-6">
          <div className="relative">
            <Search className="w-5 h-5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categoryFilters.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeCategory === cat.id ? "bg-teal-500/10 text-teal-400 border border-teal-500/30" : "bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700"}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Documents Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500">No documents found</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((doc) => (
              <div key={doc.id} className="bg-slate-900 rounded-xl border border-slate-800 p-4 hover:border-slate-700 transition-colors group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
                    {getFileIcon(doc.type)}
                  </div>
                  <span className="text-xs text-slate-600 px-2 py-0.5 bg-slate-800 rounded">{doc.type}</span>
                </div>
                <h3 className="text-sm font-medium text-white mb-1 line-clamp-2">{doc.name}</h3>
                <p className="text-xs text-slate-500 mb-3 line-clamp-2">{doc.preview}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <Calendar className="w-3.5 h-3.5" />
                    {doc.date}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openPreview(doc)} className="p-1.5 text-slate-500 hover:text-teal-400 hover:bg-teal-500/10 rounded-lg transition-colors" title="Preview">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDownload(doc)} className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors" title="Download">
                      <Download className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteDoc(doc.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => { setShowUpload(false); setSelectedFile(null); }}>
          <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">Upload Document</h2>
              <button onClick={() => { setShowUpload(false); setSelectedFile(null); }} className="p-1 hover:bg-slate-800 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Document Name</label>
                <input type="text" value={newDocName} onChange={(e) => setNewDocName(e.target.value)} placeholder="e.g., Blood Test Report" className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Category</label>
                <select value={newDocCategory} onChange={(e) => setNewDocCategory(e.target.value)} className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="prescriptions">Prescriptions</option>
                  <option value="lab-reports">Lab Reports</option>
                  <option value="insurance">Insurance</option>
                  <option value="id-cards">ID Cards</option>
                  <option value="images">Medical Images</option>
                </select>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept=".pdf,.jpg,.jpeg,.png,.dcm,.dicom"
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragging ? "border-teal-500 bg-teal-500/5" : selectedFile ? "border-teal-500/30 bg-teal-500/5" : "border-slate-700 hover:border-teal-500/50"}`}
                >
                  {selectedFile ? (
                    <>
                      <FileText className="w-8 h-8 text-teal-400 mx-auto mb-2" />
                      <p className="text-sm text-white font-medium">{selectedFile.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{formatSize(selectedFile.size)}</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">Click to browse or drag & drop</p>
                      <p className="text-xs text-slate-600 mt-1">PDF, JPG, PNG, DICOM up to 20MB</p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-800">
              <button onClick={() => { setShowUpload(false); setSelectedFile(null); }} className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-lg font-medium hover:bg-slate-700 text-sm">Cancel</button>
              <button onClick={handleUpload} disabled={!newDocName || !selectedFile} className="flex-1 py-2.5 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-lg font-medium disabled:opacity-50 text-sm">Upload</button>
            </div>
          </div>
        </div>
      )}

      {/* View/Details Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedDoc(null)}>
          <div className="bg-slate-900 rounded-2xl w-full max-w-lg border border-slate-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">{selectedDoc.name}</h2>
              <button onClick={() => setSelectedDoc(null)} className="p-1 hover:bg-slate-800 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-5">
              <div className="bg-slate-800 rounded-xl p-6 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  {getFileIcon(selectedDoc.type, "lg")}
                  <div>
                    <p className="text-sm font-medium text-white">{selectedDoc.name}</p>
                    <p className="text-xs text-slate-500">{selectedDoc.type} · {selectedDoc.size} · {selectedDoc.date}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-400">{selectedDoc.preview}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setSelectedDoc(null); openPreview(selectedDoc); }} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-teal-500/10 text-teal-400 rounded-lg font-medium hover:bg-teal-500/20 text-sm">
                  <Eye className="w-4 h-4" /> Preview
                </button>
                <button onClick={() => handleDownload(selectedDoc)} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-800 text-slate-300 rounded-lg font-medium hover:bg-slate-700 text-sm">
                  <Download className="w-4 h-4" /> Download
                </button>
                <button onClick={() => { setSelectedDoc(null); openShare(selectedDoc); }} className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-800 text-slate-300 rounded-lg font-medium hover:bg-slate-700 text-sm">
                  <Share2 className="w-4 h-4" /> Share
                </button>
              </div>
              <button onClick={() => deleteDoc(selectedDoc.id)} className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 bg-red-500/10 text-red-400 rounded-lg font-medium hover:bg-red-500/20 text-sm">
                <Trash2 className="w-4 h-4" /> Delete Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {showPreview && previewDoc && (
        <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col">
          <div className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
                {getFileIcon(previewDoc.type)}
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">{previewDoc.name}</h3>
                <p className="text-xs text-slate-500">{previewDoc.type} · {previewDoc.size}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setPreviewZoom(Math.max(50, previewZoom - 25))} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Zoom Out">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-400 w-10 text-center">{previewZoom}%</span>
              <button onClick={() => setPreviewZoom(Math.min(200, previewZoom + 25))} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Zoom In">
                <ZoomIn className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-slate-700 mx-2" />
              <button onClick={() => handleDownload(previewDoc)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Download">
                <Download className="w-4 h-4" />
              </button>
              <button onClick={() => { setShowPreview(false); openShare(previewDoc); }} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Share">
                <Share2 className="w-4 h-4" />
              </button>
              <button onClick={() => deleteDoc(previewDoc.id)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="w-px h-6 bg-slate-700 mx-2" />
              <button onClick={() => setShowPreview(false)} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-6 bg-slate-950">
            <div className="max-w-5xl mx-auto h-full">
              {renderPreview(previewDoc)}
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && shareDoc && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowShareModal(false)}>
          <div className="bg-slate-900 rounded-2xl w-full max-w-sm border border-slate-800 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">Share Document</h2>
              <button onClick={() => setShowShareModal(false)} className="p-1 hover:bg-slate-800 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-400 mb-4">Share <span className="text-white font-medium">{shareDoc.name}</span></p>

              {/* Copy Link */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 px-3 py-2 bg-slate-800 rounded-lg text-xs text-slate-400 truncate">
                  https://medisync.app/vault/{shareDoc.id}
                </div>
                <button onClick={copyToClipboard} className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${copied ? "bg-teal-500 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Share Options */}
              <div className="grid grid-cols-3 gap-3">
                <button onClick={shareViaEmail} className="flex flex-col items-center gap-2 p-4 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors">
                  <Mail className="w-6 h-6 text-blue-400" />
                  <span className="text-xs text-slate-300">Email</span>
                </button>
                <button onClick={shareViaWhatsApp} className="flex flex-col items-center gap-2 p-4 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors">
                  <MessageCircle className="w-6 h-6 text-green-400" />
                  <span className="text-xs text-slate-300">WhatsApp</span>
                </button>
                <button onClick={copyToClipboard} className="flex flex-col items-center gap-2 p-4 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors">
                  <LinkIcon className="w-6 h-6 text-teal-400" />
                  <span className="text-xs text-slate-300">Copy Link</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Copied Toast */}
      {showCopiedToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium shadow-lg z-50">
          Link copied to clipboard!
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={dismissToast} />}
    </div>
  );
}
