"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
    className?: string;
    size?: number;
    text?: string;
}

export function LoadingSpinner({ className, size = 24, text }: LoadingSpinnerProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-2 p-4">
            <Loader2
                className={cn("animate-spin text-primary", className)}
                size={size}
            />
            {text && <p className="text-sm text-muted-foreground animate-pulse">{text}</p>}
        </div>
    );
}
