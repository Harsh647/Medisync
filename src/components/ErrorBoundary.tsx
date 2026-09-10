"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    if (
      error.name === "AbortError" ||
      error.message?.includes("aborted") ||
      error.message?.includes("signal is aborted")
    ) {
      return { hasError: false };
    }
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    if (
      error.name === "AbortError" ||
      error.message?.includes("aborted") ||
      error.message?.includes("signal is aborted")
    ) {
      return;
    }
    console.error("ErrorBoundary caught:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="text-center">
            <p className="text-white text-lg mb-2">Something went wrong</p>
            <button onClick={() => this.setState({ hasError: false })} className="px-4 py-2 bg-teal-500 text-white rounded-lg text-sm">
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
