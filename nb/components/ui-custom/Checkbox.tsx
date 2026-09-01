"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Simplified Checkbox without Radix for now to avoid dependency issues if not installed
const Checkbox = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement> & { checked?: boolean; onCheckedChange?: (checked: boolean) => void }
>(({ className, checked, onCheckedChange, ...props }, ref) => {
    // If checked is provided, it's controlled. Otherwise use internal state.
    const [internalChecked, setInternalChecked] = React.useState(false);
    const isChecked = checked !== undefined ? checked : internalChecked;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        const newChecked = !isChecked;
        if (checked === undefined) {
            setInternalChecked(newChecked);
        }
        if (onCheckedChange) {
            onCheckedChange(newChecked);
        }
        if (props.onClick) {
            props.onClick(e);
        }
    };

    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={isChecked}
            ref={ref}
            onClick={handleClick}
            className={cn(
                "peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",
                isChecked ? "bg-primary text-primary-foreground" : "border-slate-400",
                className
            )}
            {...props}
        >
            {isChecked && <Check className="h-3 w-3 text-white" />}
        </button>
    );
});
Checkbox.displayName = "Checkbox";

export { Checkbox };
