"use client";

import { useState } from "react";
import Image from "next/image";
import Button from "@/components/ui-custom/Button";
import Input from "@/components/ui-custom/Input";
import { Label } from "@/components/ui-custom/Label";
import { Alert, AlertDescription } from "@/components/ui-custom/Alert";
import { Loader2, QrCode } from "lucide-react";
import QRCode from "qrcode";
import type { MFAFactor } from "@/lib/types/settingsTypes";

interface MfaSetupProps {
    initialFactors?: MFAFactor[];
}

export function MfaSetup({ initialFactors }: MfaSetupProps) {
    // Determine initial step based on existing factors
    const hasVerifiedFactor = initialFactors?.some(f => f.status === "verified");
    const [step, setStep] = useState<'initial' | 'enrolling' | 'verified'>(
        hasVerifiedFactor ? 'verified' : 'initial'
    );
    const [factorData, setFactorData] = useState<any>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string>("");
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const startEnrollment = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch('/api/v1/auth/mfa/enroll', { method: 'POST' });
            const json = await res.json();

            if (json.success) {
                setFactorData(json.data);
                // Generate QR Code
                const url = await QRCode.toDataURL(json.data.totp.uri);
                setQrDataUrl(url);
                setStep('enrolling');
            } else {
                setError(json.message);
            }
        } catch (e) {
            setError("Failed to start enrollment");
        } finally {
            setLoading(false);
        }
    };

    const verifyEnrollment = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch('/api/v1/auth/mfa/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    factorId: factorData.id,
                    code
                })
            });
            const json = await res.json();

            if (json.success) {
                setStep('verified');
            } else {
                setError(json.message);
            }
        } catch (e) {
            setError("Failed to verify code");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {step === 'initial' && (
                <div className="flex items-center justify-between">
                    <div>
                        <h4 className="font-medium">Two-Factor Authentication</h4>
                        <p className="text-sm text-muted-foreground">Add an extra layer of security to your account.</p>
                    </div>
                    <Button onClick={startEnrollment} disabled={loading}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enable 2FA"}
                    </Button>
                </div>
            )}

            {step === 'enrolling' && (
                <div className="space-y-4 border p-4 rounded-md">
                    <h4 className="font-medium">Scan QR Code</h4>
                    <p className="text-sm text-muted-foreground">
                        Use your authenticator app (e.g. Google Authenticator) to scan this code.
                    </p>

                    <div className="flex justify-center my-4 bg-white dark:bg-zinc-900 p-2 rounded w-fit mx-auto">
                        <Image src={qrDataUrl} alt="2FA QR Code" width={200} height={200} unoptimized />
                    </div>

                    <div className="space-y-2">
                        <Label>Enter 6-digit Code</Label>
                        <div className="flex gap-2">
                            <Input
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="000000"
                                maxLength={6}
                            />
                            <Button onClick={verifyEnrollment} disabled={loading || code.length !== 6}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {step === 'verified' && (
                <div className="flex items-center gap-2 text-green-600">
                    <QrCode className="h-5 w-5" />
                    <span>Two-factor authentication is enabled.</span>
                </div>
            )}
        </div>
    );
}
