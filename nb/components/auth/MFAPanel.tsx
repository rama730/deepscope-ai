"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface MFAPanelProps {
    onVerify: (code: string) => Promise<void>;
    onCancel: () => void;
    loading?: boolean;
}

export function MFAPanel({ onVerify, onCancel, loading }: MFAPanelProps) {
    const [code, setCode] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (code.length === 6) {
            onVerify(code);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Two-Factor Authentication</h2>
                <p className="text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="mfa-code">Verification Code</Label>
                    <Input
                        id="mfa-code"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        placeholder="000000"
                        className="text-center text-2xl tracking-[1em] font-mono h-14"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                        autoFocus
                        required
                        disabled={loading}
                    />
                </div>

                <div className="grid gap-2">
                    <Button type="submit" className="w-full h-11" disabled={loading || code.length !== 6}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Verify & Continue"}
                    </Button>
                    <Button type="button" variant="ghost" className="w-full" onClick={onCancel} disabled={loading}>
                        Back to login
                    </Button>
                </div>
            </form>
        </div>
    );
}
