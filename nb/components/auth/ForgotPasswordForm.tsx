"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Button from "@/components/ui-custom/Button";
import Input from "@/components/ui-custom/Input";
import { Label } from "@/components/ui-custom/Label";
import { Alert, AlertDescription } from "@/components/ui-custom/Alert";
import { Loader2 } from "lucide-react";
import Link from "next/link";

const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email address"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
    const [isPending, startTransition] = useTransition();
    const [serverError, setServerError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
    });

    const onSubmit = async (data: ForgotPasswordFormData) => {
        setServerError(null);
        startTransition(async () => {
            try {
                const res = await fetch("/api/v1/auth/forgot-password", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                });

                const json = await res.json();

                if (!res.ok) {
                    setServerError(json.message || "Request failed");
                    return;
                }

                setSuccess(true);
            } catch (err) {
                setServerError("Something went wrong. Please try again.");
            }
        });
    };

    if (success) {
        return (
            <div className="space-y-4">
                <Alert className="bg-green-50 border-green-200 text-green-800">
                    <AlertDescription>
                        Check your email for a link to reset your password.
                    </AlertDescription>
                </Alert>
                <Button variant="outline" fullWidth onClick={() => setSuccess(false)}>
                    Send another email
                </Button>
                <div className="text-center text-sm">
                    <Link href="/login" className="hover:text-brand underline underline-offset-4">
                        Back to Sign In
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {serverError && (
                <Alert variant="destructive">
                    <AlertDescription>{serverError}</AlertDescription>
                </Alert>
            )}

            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    {...register("email")}
                    disabled={isPending}
                />
                {errors.email && (
                    <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
            </div>

            <Button type="submit" fullWidth disabled={isPending}>
                {isPending ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                    </>
                ) : (
                    "Send Reset Link"
                )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
                <Link href="/login" className="hover:text-brand underline underline-offset-4">
                    Back to Sign In
                </Link>
            </div>
        </form>
    );
}
