"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Button from "@/components/ui-custom/Button";
import Input from "@/components/ui-custom/Input";
import { Label } from "@/components/ui-custom/Label";
import { Checkbox } from "@/components/ui-custom/Checkbox";
import { Alert, AlertDescription } from "@/components/ui-custom/Alert";
import { Loader2, Check, Eye, EyeOff } from "lucide-react";

// Types

// Ideally password-validation is isomorphic. Assuming it is.
// If not, we'll rewrite simple check here. 
// Actually `lib/auth/password-validation.ts` has `export` and doesn't use Node internals, so it is Client Safe.

// Schema
const signupFormSchema = z.object({
    fullName: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
    terms: z.boolean().refine((val) => val === true, "You must accept the terms"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupFormSchema>;

export function SignupForm() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [serverError, setServerError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);



    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<SignupFormData>({
        resolver: zodResolver(signupFormSchema),
        mode: "onChange",
    });

    const password = watch("password");

    // Check Email Availability (Debounced ideally, but simpler for this demo)
    // implementing basic unique check on submit or blur is better to avoid thrashing.

    // Real-time strength check
    // We can use a useEffect or derived state
    // const strength = validatePasswordComplexity(password || ""); 
    // Let's implement simple visual logic here if import fails, or assume import works.

    const onSubmit = async (data: SignupFormData) => {
        setServerError(null);
        startTransition(async () => {
            try {
                // 1. Check Email Availability
                const checkRes = await fetch("/api/v1/auth/check-email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: data.email }),
                });
                const checkJson = await checkRes.json();
                if (!checkJson.success || !checkJson.data?.isAvailable) {
                    setServerError("Email is already taken");
                    return;
                }

                // 2. Register
                const res = await fetch("/api/v1/auth/signup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: data.email,
                        password: data.password,
                        fullName: data.fullName,
                    }),
                });

                const json = await res.json();

                if (!res.ok) {
                    // Handle validation errors array
                    if (json.error?.details && Array.isArray(json.error.details)) {
                        setServerError(json.error.details.join(", "));
                    } else {
                        setServerError(json.message || "Registration failed");
                    }
                    return;
                }

                setSuccess(true);
                setTimeout(() => {
                    router.push("/login?registered=true");
                }, 2000);

            } catch (err) {
                setServerError("Something went wrong. Please try again.");
            }
        });
    };

    if (success) {
        return (
            <Alert className="bg-green-50 border-green-200 text-green-800">
                <Check className="h-4 w-4" />
                <AlertDescription>
                    Registration successful! Redirecting to login...
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

            {/* Full Name */}
            <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                    id="fullName"
                    placeholder="John Doe"
                    {...register("fullName")}
                    disabled={isPending}
                />
                {errors.fullName && (
                    <p className="text-sm text-red-500">{errors.fullName.message}</p>
                )}
            </div>

            {/* Email */}
            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    placeholder="john@example.com"
                    {...register("email")}
                    disabled={isPending}
                />
                {errors.email && (
                    <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
            </div>

            {/* Password */}
            <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
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

            {/* Terms */}
            <div className="flex items-center space-x-2">
                <Checkbox
                    id="terms"
                    onCheckedChange={(checked) => {
                        // Hook form integration for Checkbox
                        const event = { target: { name: "terms", value: checked } };
                        register("terms").onChange(event);
                    }}
                    {...register("terms")}
                />
                <Label htmlFor="terms" className="text-sm font-normal text-muted-foreground">
                    I agree to the <a href="#" className="underline hover:text-primary">Terms & Conditions</a>
                </Label>
            </div>
            {errors.terms && (
                <p className="text-sm text-red-500">{errors.terms.message}</p>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                    </>
                ) : (
                    "Sign Up"
                )}
            </Button>
        </form>
    );
}
