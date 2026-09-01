"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui-custom/Alert";
import { AlertTriangle } from "lucide-react";
import { ResendVerificationButton } from "./ResendVerificationButton";
import { useEffect, useState } from "react";

export function VerificationBanner() {
    const [isVerified, setIsVerified] = useState<boolean | null>(null);

    // Initial check (could be passed as prop from Server Component if preferred)
    useEffect(() => {
        fetch('/api/v1/users/me')
            .then(res => res.json())
            .then(json => {
                if (json.success && json.data) {
                    setIsVerified(!!json.data.email_verified);
                }
            })
            .catch(() => { });
    }, []);

    if (isVerified === null || isVerified === true) {
        return null;
    }

    return (
        <Alert variant="warning" className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
                <AlertTriangle className="h-4 w-4 mt-1" />
                <div>
                    <AlertTitle>Verify your email</AlertTitle>
                    <AlertDescription>
                        Your account is not fully active. Please check your email to verify your address.
                    </AlertDescription>
                </div>
            </div>
            <div className="flex-shrink-0">
                <ResendVerificationButton />
            </div>
        </Alert>
    );
}
