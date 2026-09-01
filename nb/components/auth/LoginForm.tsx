"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Button from "@/components/ui-custom/Button";
import Input from "@/components/ui-custom/Input";
import { Label } from "@/components/ui-custom/Label";
import { Checkbox } from "@/components/ui-custom/Checkbox";
import { Alert, AlertDescription } from "@/components/ui-custom/Alert";
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link"; // For Forgot Password

// We need to verify if UI components exist. Assuming they do based on SignupForm usage.
// If any import fails, I will fix it in the verification step.

const loginFormSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
    rememberMe: z.boolean().default(false),
});

type LoginFormData = z.infer<typeof loginFormSchema>;

export function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();
    const [serverError, setServerError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [justRegistered, setJustRegistered] = useState(false);

    useEffect(() => {
        if (searchParams.get("registered") === "true") {
            setJustRegistered(true);
        }
    }, [searchParams]);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(loginFormSchema),
        defaultValues: {
            rememberMe: false
        }
    });



    // ... existing imports

    const onSubmit = async (data: LoginFormData) => {
        setServerError(null);
        setJustRegistered(false);

        startTransition(async () => {
            try {
                const res = await fetch("/api/v1/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: data.email,
                        password: data.password,
                    }),
                });

                const json = await res.json();

                if (!res.ok) {
                    const message = json.message || "Invalid email or password";
                    setServerError(message);
                    toast.error(message);
                    return;
                }

                toast.success("Signed in successfully");

                // Success - Redirect
                const redirect = searchParams.get("redirect") || "/explorer";
                router.push(redirect);
                router.refresh(); // Ensure server components re-run with new auth state

            } catch (err) {
                const msg = "Something went wrong. Please try again.";
                setServerError(msg);
                toast.error(msg);
            }
        });
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {justRegistered && (
                <Alert className="bg-green-50 border-green-200 text-green-800">
                    <AlertDescription>
                        Account created! Please sign in.
                    </AlertDescription>
                </Alert>
            )}

            {serverError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{serverError}</AlertDescription>
                </Alert>
            )}

            {/* Email */}
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

            {/* Password */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link
                        href="/forgot-password"
                        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                    >
                        Forgot Password?
                    </Link>
                </div>
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
                {errors.password && (
                    <p className="text-sm text-red-500">{errors.password.message}</p>
                )}
            </div>

            {/* Remember Me */}
            <div className="flex items-center space-x-2">
                <Checkbox
                    id="rememberMe"
                    onCheckedChange={(checked) => {
                        const event = { target: { name: "rememberMe", value: checked } };
                        register("rememberMe").onChange(event);
                    }}
                    {...register("rememberMe")}
                />
                <Label htmlFor="rememberMe" className="text-sm font-normal">
                    Remember me
                </Label>
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                    </>
                ) : (
                    "Sign In"
                )}
            </Button>
        </form>
    );
}
