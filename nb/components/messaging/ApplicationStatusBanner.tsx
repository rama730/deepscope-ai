"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCSRF } from "@/hooks/useCSRF";
import { Check, X, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { useMessageStore } from "@/stores/useMessageStore";

interface ApplicationStatusBannerProps {
    conversationId: string;
    variant?: 'default' | 'compact';
}


export function ApplicationStatusBanner({ conversationId, variant = 'default' }: ApplicationStatusBannerProps) {
    const { user } = useAuth();
    const { token: csrfToken } = useCSRF();
    const { applicationCache, fetchApplication, updateApplicationInCache } = useMessageStore();
    const application = applicationCache[conversationId] || null;
    const [processing, setProcessing] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        if (conversationId && user) {
            fetchApplication(conversationId);
        }
    }, [conversationId, user, fetchApplication]);

    async function handleAction(action: 'accept' | 'reject') {
        if (!application || !user || !csrfToken) {
            if (!csrfToken) {
                toast.error("Security token missing. Please refresh the page.");
            }
            return;
        }

        // Confirmation dialog
        // Confirmation dialog
        const confirmMessage = action === 'accept'
            ? `Are you sure you want to accept this application for "${application.role_applied_for}"?`
            : `Are you sure you want to reject this application for "${application.role_applied_for}"?`;

        if (!confirm(confirmMessage)) {
            return;
        }

        const previousStatus = application.status;
        const newStatus = action === 'accept' ? 'accepted' : 'rejected';

        // Optimistic Update
        updateApplicationInCache(conversationId, { status: newStatus });
        setProcessing(true);

        try {
            const response = await fetch(`/api/applications/${application.id}/handle`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-csrf-token": csrfToken,
                },
                body: JSON.stringify({ action }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData?.error || "Failed to update application");
            }

            await response.json(); // Consume body
            toast.success(`Application ${action}ed successfully`);

            // Hide banner immediately after successful action
            setIsDismissed(true);
        } catch (error) {
            console.error("Error handling application:", error);
            // Rollback on failure
            updateApplicationInCache(conversationId, { status: previousStatus });
            const errorMessage = error instanceof Error ? error.message : "Failed to process request";
            toast.error(errorMessage);
        } finally {
            setProcessing(false);
        }
    }

    if (!application) return null;

    // Only show for the project creator
    if (user?.id !== application.project?.creator_id) {
        return null;
    }

    // Hide banner if dismissed
    if (isDismissed) {
        return null;
    }

    // Hide banner if status is not pending (already processed)
    // Only show banner for pending applications
    if (application.status !== 'pending') {
        return null;
    }

    const isPending = true;
    const isAccepted = false;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={`border-b border-l-4 shadow-sm ${isPending ? "bg-indigo-50/50 border-l-indigo-500 border-b-indigo-100 dark:bg-indigo-950/20 dark:border-b-indigo-900" :
                    isAccepted ? "bg-emerald-50/50 border-l-emerald-500 border-b-emerald-100 dark:bg-emerald-950/20 dark:border-b-emerald-900" :
                        "bg-slate-50 border-l-slate-400 border-b-slate-200 dark:bg-zinc-900"
                    } ${variant === 'compact' ? 'px-3 py-2' : 'px-4 py-3'}`}
            >
                <div className={`flex ${variant === 'compact' ? 'flex-col gap-2' : 'items-start justify-between gap-4'}`}>
                    <div className="flex-1">
                        <div className={`flex items-center gap-2 font-medium text-slate-900 dark:text-zinc-100 ${variant === 'compact' ? 'text-xs' : 'text-sm'}`}>
                            <Briefcase className={`${variant === 'compact' ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-indigo-500 shrink-0`} />
                            <div className="flex flex-wrap gap-1 items-center">
                                <span>Applying for <span className="text-indigo-600 dark:text-indigo-400">{application.role_applied_for}</span></span>
                                {variant !== 'compact' && <span className="text-slate-400">•</span>}
                                <span className="text-slate-600 dark:text-zinc-400">{application.project?.title}</span>
                            </div>
                        </div>

                        {/* Details */}
                        <div className={`mt-1 text-slate-500 dark:text-zinc-400 flex flex-wrap gap-x-4 gap-y-1 ${variant === 'compact' ? 'text-[10px]' : 'text-xs'}`}>
                            {application.work_timings && <span>🕒 {application.work_timings}</span>}
                            {application.portfolio_link && (
                                <a href={application.portfolio_link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                                    🔗 Portfolio
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className={`flex items-center gap-2 shrink-0 ${variant === 'compact' ? 'justify-end w-full' : ''}`}>
                        {isPending ? (
                            <>
                                <button
                                    onClick={() => handleAction('reject')}
                                    disabled={processing}
                                    className={`rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors ${variant === 'compact' ? 'p-1.5' : 'p-2'}`}
                                    title="Reject"
                                >
                                    <X className={`${variant === 'compact' ? 'w-4 h-4' : 'w-5 h-5'}`} />
                                </button>
                                <button
                                    onClick={() => handleAction('accept')}
                                    disabled={processing}
                                    className={`flex items-center gap-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium shadow-sm transition-all ${variant === 'compact' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'}`}
                                >
                                    {processing ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className={`${variant === 'compact' ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />}
                                    Accept
                                </button>
                            </>
                        ) : (
                            <div className={`rounded font-semibold uppercase tracking-wide border ${isAccepted ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800" :
                                "bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800 dark:text-zinc-400"
                                } ${variant === 'compact' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'}`}>
                                {application.status}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
