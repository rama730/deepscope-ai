"use client";

import { LucideIcon, PackageOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

export function EmptyState({
    icon: Icon = PackageOpen,
    title,
    description,
    actionLabel,
    onAction,
    className,
}: EmptyStateProps) {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center text-center p-8 rounded-lg border border-dashed border-muted-foreground/25 bg-muted/5",
            className
        )}>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
                <Icon className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight mb-2">
                {title}
            </h3>
            {description && (
                <p className="text-sm text-muted-foreground max-w-sm mb-6">
                    {description}
                </p>
            )}
            {actionLabel && onAction && (
                <Button onClick={onAction}>
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}
