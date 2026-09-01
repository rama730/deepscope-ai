"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Shield, Smartphone, Loader2, CheckCircle2, AlertCircle, Trash2, Plus, X } from "lucide-react";
import Image from "next/image";

type MFAFactor = {
    id: string;
    factor_type: 'totp';
    created_at: string;
    updated_at: string;
    status: 'verified' | 'unverified';
};

export default function MFASettings() {
    const [factors, setFactors] = useState<MFAFactor[]>([]);
    const [loading, setLoading] = useState(true);
    const [enrolling, setEnrolling] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [secret, setSecret] = useState<string | null>(null);
    const [factorId, setFactorId] = useState<string | null>(null);
    const [verifyCode, setVerifyCode] = useState("");
    const [verifying, setVerifying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const supabase = createSupabaseBrowserClient();

    useEffect(() => {
        fetchFactors();
    }, []);

    const fetchFactors = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase.auth.mfa.listFactors();
            if (error) throw error;
            setFactors(data.totp as MFAFactor[] || []);
        } catch (err) {
            console.error("Error fetching factors:", err);
        } finally {
            setLoading(false);
        }
    };

    const startEnrollment = async () => {
        try {
            setEnrolling(true);
            setError(null);
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
            });

            if (error) throw error;

            setFactorId(data.id);
            setQrCode(data.totp.qr_code);
            setSecret(data.totp.secret);
        } catch (err: any) {
            setError(err.message);
            setEnrolling(false);
        }
    };

    const verifyEnrollment = async () => {
        if (!factorId || !verifyCode) return;

        try {
            setVerifying(true);
            setError(null);

            const { data, error } = await supabase.auth.mfa.challengeAndVerify({
                factorId,
                code: verifyCode,
            });

            if (error) throw error;

            // Create a new session with AAL2 immediately? No, usually next login.
            // But we can upgrade current session?
            // For now, just show success.
            setEnrolling(false);
            resetEnrollmentState();
            fetchFactors();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setVerifying(false);
        }
    };

    const cancelEnrollment = async () => {
        if (factorId) {
            await supabase.auth.mfa.unenroll({ factorId });
        }
        resetEnrollmentState();
        setEnrolling(false);
    };

    const resetEnrollmentState = () => {
        setQrCode(null);
        setSecret(null);
        setFactorId(null);
        setVerifyCode("");
        setError(null);
    };

    const handleUnenroll = async (id: string) => {
        if (!confirm("Are you sure you want to disable this authentication method?")) return;

        try {
            setLoading(true);
            const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
            if (error) throw error;
            fetchFactors();
        } catch (err: any) {
            alert("Failed to disable MFA: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const enrollmentActive = enrolling && qrCode;

    if (loading && !enrollmentActive) { // Wait, logic check
        // ...
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-indigo-500" />
                <h3 className="text-lg font-medium text-foreground">Two-Factor Authentication</h3>
            </div>

            {loading && !factors.length ? (
                <div className="p-8 text-center text-zinc-500 animate-pulse">
                    <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin opacity-50" />
                    <p>Loading security settings...</p>
                </div>
            ) : (
                <>
                    {factors.length === 0 && !enrolling && (
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-900/30 rounded-xl flex gap-3">
                            <Smartphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h4 className="text-sm font-medium text-indigo-900 dark:text-indigo-100 mb-1">Protect your account</h4>
                                <p className="text-sm text-indigo-700 dark:text-indigo-300">
                                    Add an extra layer of security by requiring a code from your authenticator app when logging in.
                                </p>
                                <button
                                    onClick={startEnrollment}
                                    className="mt-3 text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    Enable 2FA
                                </button>
                            </div>
                        </div>
                    )}

                    {factors.length > 0 && (
                        <div className="space-y-3">
                            {factors.map(factor => (
                                <div key={factor.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-sm">Authenticator App</h4>
                                            <p className="text-xs text-muted-foreground">Verified • {new Date(factor.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleUnenroll(factor.id)}
                                        className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="Remove this method"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {!enrolling && (
                                <button
                                    onClick={startEnrollment}
                                    className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline px-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add another method
                                </button>
                            )}
                        </div>
                    )}

                    {enrolling && qrCode && (
                        <div className="border border-border rounded-xl p-6 bg-card space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="flex items-center justify-between">
                                <h4 className="font-medium text-lg">Set up Authenticator App</h4>
                                <button onClick={cancelEnrollment} className="text-zinc-400 hover:text-foreground">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <p className="text-sm text-muted-foreground">
                                        1. Install an authenticator app like Google Authenticator or Authy.
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        2. Scan this QR code with the app.
                                    </p>
                                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg w-fit border border-zinc-200 dark:border-zinc-700">
                                        <Image
                                            src={qrCode}
                                            alt="QR Code"
                                            width={160}
                                            height={160}
                                            unoptimized
                                            className="w-[160px] h-[160px]"
                                        />
                                    </div>
                                    <div className="text-xs text-zinc-500">
                                        Can't scan? Use code: <code className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono select-all">{secret}</code>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-sm text-muted-foreground">
                                        3. Enter the 6-digit code from the app below.
                                    </p>
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            value={verifyCode}
                                            onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            placeholder="000000"
                                            className="w-full text-center text-2xl tracking-[0.5em] font-mono p-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            maxLength={6}
                                        />
                                        {error && (
                                            <p className="text-sm text-red-500 flex items-center gap-1">
                                                <AlertCircle className="w-4 h-4" />
                                                {error}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={verifyEnrollment}
                                        disabled={verifyCode.length !== 6 || verifying}
                                        className="w-full py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                                    >
                                        {verifying && <Loader2 className="w-4 h-4 animate-spin" />}
                                        Verify & Enable
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
