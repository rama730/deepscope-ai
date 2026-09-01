"use client";

import * as React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AvatarWithFallbackProps {
    src?: string | null;
    alt?: string;
    fallback?: string;
    name?: string; // For backward compatibility
    size?: "xs" | "sm" | "md" | "lg" | "xl";
    className?: string;
}

const AvatarWithFallback = React.forwardRef<HTMLDivElement, AvatarWithFallbackProps>(
    ({ src, alt, fallback, name, size = "md", className }, ref) => {
        const sizeClasses = {
            xs: "h-5 w-5 text-[10px]",
            sm: "h-8 w-8 text-xs",
            md: "h-10 w-10 text-sm",
            lg: "h-12 w-12 text-base",
            xl: "h-16 w-16 text-lg",
        };

        const fallbackText = (fallback || name || alt || "U").substring(0, 2).toUpperCase();
        const altText = alt || name || "User avatar";

        return (
            <Avatar ref={ref} className={cn(sizeClasses[size], className)} style={{ transform: "translateZ(0)" }}>
                {src && <AvatarImage src={src} alt={altText} referrerPolicy="no-referrer" crossOrigin="anonymous" />}
                <AvatarFallback className={size === 'xs' ? 'text-[8px]' : ''}>
                    {fallbackText}
                </AvatarFallback>
            </Avatar>
        );
    }
);

AvatarWithFallback.displayName = "AvatarWithFallback";

export default AvatarWithFallback;
