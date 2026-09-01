"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Button from "@/components/ui-custom/Button";
import Input from "@/components/ui-custom/Input";
import { Label } from "@/components/ui-custom/Label";
import { Alert, AlertDescription } from "@/components/ui-custom/Alert";
import { Loader2, Eye, EyeOff } from "lucide-react";

// Password strength logic could be shared
const resetPasswordSchema = z.object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [isPending, startTransition] = useTransition();
    const [serverError, setServerError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordSchema),
    });

    const password = watch("password");

    const onSubmit = async (data: ResetPasswordFormData) => {
        if (!token) {
            setServerError("Invalid or missing token.");
            return;
        }
        setServerError(null);
        startTransition(async () => {
            try {
                const res = await fetch("/api/v1/auth/reset-password", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        token,
                        password: data.password,
                    }),
                });

                const json = await res.json();

                if (!res.ok) {
                    setServerError(json.message || "Reset failed");
                    return;
                }

                setSuccess(true);
                setTimeout(() => {
                    router.push("/login");
                }, 3000);

            } catch (err) {
                setServerError("Something went wrong. Please try again.");
            }
        });
    };

    if (!token) {
        return (
            <Alert variant="destructive">
                <AlertDescription>Invalid link. Please check your email and try again.</AlertDescription>
            </Alert>
        );
    }

    if (success) {
        return (
            <Alert className="bg-green-50 border-green-200 text-green-800">
                <AlertDescription>
                    Password reset successfully! Redirecting to login...
                </AlertDescription>
            </Alert>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {serverError && (
                <Alert variant="destructive">
                    <AlertDescription>{serverError}</AlertDescription>
                </Alert>
            )}

            {/* Password */}
            <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                    <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        {...register("password")}
                        disabled={isPending}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600 dark:text-zinc-400"
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
                {/* Simple Strength Meter */}
                {password && (
                    <div className="flex gap-1 mt-1 h-1">
                        <div className={`flex-1 rounded-full ${password.length >= 8 ? 'bg-red-400' : 'bg-gray-200'}`} />
                        <div className={`flex-1 rounded-full ${/[A-Z]/.test(password) ? 'bg-orange-400' : 'bg-gray-200'}`} />
                        <div className={`flex-1 rounded-full ${/[0-9]/.test(password) ? 'bg-yellow-400' : 'bg-gray-200'}`} />
                        <div className={`flex-1 rounded-full ${/[^A-Za-z0-9]/.test(password) ? 'bg-green-400' : 'bg-gray-200'}`} />
                    </div>
                )}
                {errors.password && (
                    <p className="text-sm text-red-500">{errors.password.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                    Must be 8+ chars, incl. uppercase, number, & special.
                </p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                    id="confirmPassword"
                    type="password"
                    {...register("confirmPassword")}
                    disabled={isPending}
                />
                {errors.confirmPassword && (
                    <p className="text-sm text-red-500">{errors.confirmPassword.message}</p>
                )}
            </div>

            <Button type="submit" fullWidth disabled={isPending}>
                {isPending ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Resetting...
                    </>
                ) : (
                    "Reset Password"
                )}
            </Button>
        </form>
    );
}
