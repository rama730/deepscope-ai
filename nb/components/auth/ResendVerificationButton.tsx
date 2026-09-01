"use client";

import { useState } from "react";
import Button from "@/components/ui-custom/Button";
import { Loader2 } from "lucide-react";

export function ResendVerificationButton() {
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);

    const handleResend = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/v1/auth/resend-verification", { method: "POST" });
            const json = await res.json();

            if (json.success) {
                setSent(true);
                setTimeLeft(60);
                const timer = setInterval(() => {
                    setTimeLeft((prev) => {
                        if (prev <= 1) {
                            clearInterval(timer);
                            setSent(false);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            } else {
                alert(json.message || "Failed to resend");
            }
        } catch (e) {
            alert("Error resending verification");
        } finally {
            setLoading(false);
        }
    };

    if (sent) {
        return (
            <Button variant="outline" size="sm" disabled>
                Resend in {timeLeft}s
            </Button>
        );
    }

    return (
        <Button variant="outline" size="sm" onClick={handleResend} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Resend Verification Email"}
        </Button>
    );
}
