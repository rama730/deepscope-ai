"use client";

import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface ErrorMessageProps {
    title?: string;
    message: string;
    className?: string;
    variant?: "destructive" | "default";
}

export function ErrorMessage({
    title = "Error",
    message,
    className,
    variant = "destructive"
}: ErrorMessageProps) {
    if (!message) return null;

    return (
        <Alert variant={variant} className={cn("my-4", className)}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
        </Alert>
    );
}
