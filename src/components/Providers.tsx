"use client";

import { AuthProvider } from "@/lib/firebase-config";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import ErrorBoundary from "@/components/ErrorBoundary";

function ScrollReset() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);

    const handler = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (
        reason?.name === "AbortError" ||
        reason?.message?.includes("aborted") ||
        reason?.message?.includes("signal is aborted")
      ) {
        event.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);

  return (
    <ErrorBoundary>
      <AuthProvider>
        <ScrollReset />
        {children}
      </AuthProvider>
    </ErrorBoundary>
  );
}
