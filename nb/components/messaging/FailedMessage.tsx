"use client";

import { AlertCircle, X, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface FailedMessageProps {
    content: string;
    onRetry: () => void;
    onDismiss: () => void;
}

export function FailedMessage({ content, onRetry, onDismiss }: FailedMessageProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-lg"
        >
            <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            <p className="flex-1 text-sm text-destructive truncate">{content || "Failed to send message"}</p>
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRetry}
                    className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/20"
                >
                    <RotateCw className="h-3.5 w-3.5 mr-1" />
                    Retry
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDismiss}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                >
                    <X className="h-3.5 w-3.5" />
                </Button>
            </div>
        </motion.div>
    );
}
