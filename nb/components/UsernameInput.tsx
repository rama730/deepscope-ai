"use client";

import { useMemo, useEffect } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useUsernameAvailabilityQuery } from "@/hooks/useAuthQueries";

interface UsernameInputProps {
    value: string;
    onChange: (value: string) => void;
    onValidation: (isValid: boolean) => void;
    excludeUserId?: string;
    disabled?: boolean;
}

export default function UsernameInput({
    value,
    onChange,
    onValidation,
    excludeUserId,
    disabled
}: UsernameInputProps) {
    const { data: availability, isLoading } = useUsernameAvailabilityQuery(value, excludeUserId);

    const isValidFormat = useMemo(() => {
        return value.length >= 3 && /^[a-z0-9_]+$/.test(value);
    }, [value]);

    // Effect to notify parent of validation status
    // Fixed: Changed useMemo to useEffect to avoid rendering side-effects
    useEffect(() => {
        if (!value) {
            onValidation(false);
            return;
        }

        if (!isValidFormat) {
            onValidation(false);
            return;
        }

        if (availability?.data?.isAvailable === true) {
            onValidation(true);
        } else {
            // If explicit false (taken) or loading/undefined (not yet known), treat as invalid for safety
            // Or if loading, maybe don't toggle yet? But safer to say false until confirmed.
            // keeping logic similar to before:
            onValidation(false);
        }
    }, [value, isValidFormat, availability, onValidation]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
        onChange(newValue);
    };

    const error = useMemo(() => {
        if (!value) return null;
        if (value.length < 3) return "Username must be at least 3 characters";
        if (!/^[a-z0-9_]+$/.test(value)) return "Only letters, numbers, and underscores allowed";
        if (availability?.data?.isAvailable === false) return "Username is already taken";
        return null;
    }, [value, availability]);

    const isAvailable = availability?.data?.isAvailable === true && !error;

    return (
        <div className="relative w-full">
            <input
                type="text"
                value={value}
                onChange={handleChange}
                placeholder="username"
                disabled={disabled}
                className={`w-full h-12 px-4 border rounded-xl outline-none transition-all dark:bg-zinc-800/50 ${error
                    ? "border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900/30"
                    : isAvailable
                        ? "border-emerald-500 focus:ring-2 focus:ring-emerald-200 dark:focus:ring-emerald-900/30"
                        : "border-zinc-200 focus:ring-2 focus:ring-primary/20 dark:border-zinc-700 dark:focus:ring-primary/30"
                    }`}
            />

            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                ) : isAvailable ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : error ? (
                    <XCircle className="w-4 h-4 text-red-500" />
                ) : null}
            </div>

            {error && (
                <p className="mt-1.5 text-xs text-red-500 animate-in fade-in slide-in-from-top-1">
                    {error}
                </p>
            )}
        </div>
    );
}
