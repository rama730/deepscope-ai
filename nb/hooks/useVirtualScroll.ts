"use client";

import { useRef, useCallback } from "react";
import { VirtuosoHandle } from "react-virtuoso";

export function useVirtualScroll() {
    const virtuosoRef = useRef<VirtuosoHandle>(null);

    const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
        if (virtuosoRef.current) {
            virtuosoRef.current.scrollToIndex({
                index: "LAST",
                behavior,
                align: "end"
            });
        }
    }, []);

    const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
        if (virtuosoRef.current) {
            virtuosoRef.current.scrollToIndex({
                index,
                behavior,
                align: "center"
            });
        }
    }, []);

    return {
        virtuosoRef,
        scrollToBottom,
        scrollToIndex
    };
}
