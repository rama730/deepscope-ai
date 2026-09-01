"use client";

import { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle } from "lucide-react";

interface Props {
    children: ReactNode;
    fallbackLabel?: string;
}

interface State {
    hasError: boolean;
}

export class RailErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
    };

    public static getDerivedStateFromError(_: Error): State {
        return { hasError: true };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Rail component error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-center">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2 text-zinc-400" />
                    <p className="text-sm text-zinc-500">
                        {this.props.fallbackLabel || "Component unavailable"}
                    </p>
                </div>
            );
        }

        return this.props.children;
    }
}
