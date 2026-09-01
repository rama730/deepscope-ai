"use client";

import { QueryClient, QueryClientProvider, MutationCache, QueryCache } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils/api-error';
import { STALE_TIMES } from "@/lib/config/query-config";
import { restoreCache, saveCache } from "@/lib/utils/query-persistence";
import { useEffect } from 'react';

export default function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        queryCache: new QueryCache({
            onError: (error, query) => {
                // Keep this lightweight: the query functions should throw real Errors with messages/stacks.
                // This handler is a last-resort catch-all.
                const message = getErrorMessage(error);
                // Some thrown values (esp. Supabase/PostgREST) can appear as `{}` in console due to non-enumerable props.
                // Log key/hash/message as separate args so we always see them.
                let extracted: Record<string, unknown> | undefined = undefined;
                try {
                    if (error && typeof error === "object") {
                        extracted = {};
                        for (const k of Object.getOwnPropertyNames(error)) {
                            try {
                                (extracted as any)[k] = (error as any)[k];
                            } catch {
                                (extracted as any)[k] = "[unreadable]";
                            }
                        }
                    }
                } catch {
                    // ignore
                }

                console.error(
                    "Global Query Error:",
                    message,
                    "queryHash:",
                    query?.queryHash,
                    "queryKey:",
                    query?.queryKey
                );
                if (extracted && Object.keys(extracted).length > 0) {
                    console.error("Global Query Error (extracted):", extracted);
                }
                if (error instanceof Error && error.stack) {
                    console.error("Global Query Error (stack):", error.stack);
                } else {
                    console.error("Global Query Error (raw):", error);
                }
            }
        }),
        mutationCache: new MutationCache({
            onError: (error: Error, _variables: unknown, _context: unknown, _mutation: unknown) => {
                // If the mutation has its own onError handler, we might still want to show a global toast 
                // UNLESS `meta.suppressError` is set.
                // (requires typing mutation meta if we want to be fancy, but let's stick to simple first)

                // Allow suppressing global error toast via mutation options meta
                // const { suppressError } = mutation.meta || {};
                // if (suppressError) return;

                const message = getErrorMessage(error);
                toast.error(message);
            }
        }),
        defaultOptions: {
            queries: {
                // Extended stale time for better performance (5 minutes)
                staleTime: STALE_TIMES.STANDARD,
                // Cache garbage collection time (15 minutes)
                gcTime: 15 * 60 * 1000,
                // Prevent aggressive refetching
                refetchOnWindowFocus: false,
                refetchOnReconnect: true,
                retry: 1,
                networkMode: 'always',
            },
            mutations: {
                networkMode: 'always',
            },
        },
    }));

    // Persistence logic
    useEffect(() => {
        let isMounted = true;

        const initPersistence = async () => {
            await restoreCache(queryClient);

            if (!isMounted) return;

            // Subscribe to cache changes to save updates
            // Debounce saving to avoid excessive writes
            let timeout: NodeJS.Timeout;
            const unsubscribe = queryClient.getQueryCache().subscribe(() => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    saveCache(queryClient);
                }, 1000); // Save at most once per second
            });

            return () => {
                clearTimeout(timeout);
                unsubscribe();
            };
        };

        initPersistence();

        return () => {
            isMounted = false;
        };
    }, [queryClient]);

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
