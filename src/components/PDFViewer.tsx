"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PDFViewerProps {
  fileUrl: string;
  zoom: number;
}

export default function PDFViewer({ fileUrl, zoom }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pdfRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: { promise: Promise<any>; destroy: () => Promise<void> } | null = null;
    const loadPDF = async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const data = atob(fileUrl.split(",")[1]);
        const uint8Array = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
          uint8Array[i] = data.charCodeAt(i);
        }
        loadingTask = pdfjsLib.getDocument({ data: uint8Array });
        const pdfDoc = await loadingTask.promise;
        if (!cancelled) {
          pdfRef.current = pdfDoc;
          setTotalPages(pdfDoc.numPages);
          setCurrentPage(1);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled && (err as { name?: string })?.name !== "AbortError") {
          setError("Failed to load PDF");
          setLoading(false);
        }
      }
    };
    loadPDF();
    return () => {
      cancelled = true;
      void loadingTask?.destroy().catch(() => undefined);
      pdfRef.current = null;
    };
  }, [fileUrl]);

  useEffect(() => {
    if (!pdfRef.current || !canvasRef.current) return;
    const renderPage = async () => {
      const page = await pdfRef.current.getPage(currentPage);
      const scale = (zoom / 100) * 1.2;
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: context, viewport }).promise;
    };
    renderPage();
  }, [currentPage, zoom, loading]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-white rounded-lg">
        <div className="text-center">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-white rounded-lg">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading PDF...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200 shrink-0">
        <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1} className="p-1 hover:bg-slate-200 rounded disabled:opacity-30">
          <ChevronLeft className="w-4 h-4 text-slate-600" />
        </button>
        <span className="text-xs text-slate-600">Page {currentPage} of {totalPages}</span>
        <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages} className="p-1 hover:bg-slate-200 rounded disabled:opacity-30">
          <ChevronRight className="w-4 h-4 text-slate-600" />
        </button>
      </div>
      <div className="flex-1 overflow-auto flex items-start justify-center p-4 bg-slate-200">
        <canvas ref={canvasRef} className="shadow-lg" />
      </div>
    </div>
  );
}
