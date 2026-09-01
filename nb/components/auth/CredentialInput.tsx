"use client";

import { useState } from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

interface CredentialInputProps {
    id: string;
    label: string;
    type: "email" | "password" | "text";
    placeholder?: string;
    autoComplete?: string;
    required?: boolean;
    disabled?: boolean;
    value?: string;
    defaultValue?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onFocus?: () => void;
    onBlur?: () => void;
    error?: string;
}

export function CredentialInput({
    id,
    label,
    type,
    placeholder,
    autoComplete,
    required,
    disabled,
    value,
    defaultValue,
    onChange,
    onFocus,
    onBlur,
    error,
}: CredentialInputProps) {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label htmlFor={id} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {label}
                </label>
                {error && (
                    <span className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle size={12} />
                        {error}
                    </span>
                )}
            </div>
            <div className="relative group">
                <input
                    id={id}
                    name={id}
                    type={inputType}
                    placeholder={placeholder}
                    autoComplete={autoComplete}
                    required={required}
                    disabled={disabled}
                    value={value}
                    defaultValue={defaultValue}
                    onChange={onChange}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    className={`w-full h-12 px-4 rounded-xl border bg-white dark:bg-zinc-800/50 outline-none transition-all ${error
                        ? "border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-900/30"
                        : "border-zinc-200 group-hover:border-zinc-300 dark:border-zinc-700 dark:group-hover:border-zinc-600 focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/30"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                        tabIndex={-1}
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                )}
            </div>
        </div>
    );
}
