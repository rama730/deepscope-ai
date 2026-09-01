"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Dynamically import the heavy GlobalChatWidget with no SSR
const GlobalChatWidget = dynamic(
    () => import("@/components/messaging/GlobalChatWidget").then((mod) => mod.GlobalChatWidget),
    { ssr: false }
);

export function LazyGlobalChatWidget() {
    const [shouldLoad, setShouldLoad] = useState(false);

    useEffect(() => {
        // Use requestIdleCallback if available, fallback to setTimeout
        if ("requestIdleCallback" in window) {
            const handle = (window as any).requestIdleCallback(() => {
                setShouldLoad(true);
            });
            return () => (window as any).cancelIdleCallback(handle);
        } else {
            const timer = setTimeout(() => {
                setShouldLoad(true);
            }, 3000); // Wait 3 seconds for main thread to settle
            return () => clearTimeout(timer);
        }
    }, []);

    if (!shouldLoad) return null;

    return <GlobalChatWidget />;
}
