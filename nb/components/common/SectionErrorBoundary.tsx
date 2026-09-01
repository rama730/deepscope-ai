"use client";

import React from "react";

export function SectionErrorFallback({
  title,
  error,
  onRetry,
}: {
  title: string;
  error: unknown;
  onRetry?: () => void;
}) {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Something went wrong.";

  return (
    <div className="p-6">
      <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 p-4">
        <div className="text-sm font-semibold text-red-900 dark:text-red-200">{title} failed to load</div>
        <div className="mt-1 text-xs text-red-800 dark:text-red-300 break-words">{message}</div>
        <div className="mt-3 flex gap-2">
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

type Props = {
  title: string;
  onRetry?: () => void;
  children: React.ReactNode;
};

type State = { hasError: boolean; error: unknown };

export class SectionErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown) {
    // Keep noisy logs scoped and actionable.
    // eslint-disable-next-line no-console
    console.error(`[SectionErrorBoundary] ${this.props.title}`, error);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <SectionErrorFallback title={this.props.title} error={this.state.error} onRetry={this.props.onRetry ? this.handleRetry : undefined} />
      );
    }
    return this.props.children;
  }
}

