"use client";

import { useState, useEffect } from "react";
import { LinkPreview } from "@/lib/services/linkPreview";

export function useLinkPreview(url: string | null) {
    const [preview, setPreview] = useState<LinkPreview | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!url) {
            setPreview(null);
            return;
        }

        // Validate URL
        try {
            new URL(url);
        } catch {
            setPreview(null);
            return;
        }

        setLoading(true);
        setError(null);

        fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
            .then(res => {
                if (!res.ok) {
                    throw new Error("Failed to fetch preview");
                }
                return res.json();
            })
            .then(data => {
                setPreview(data);
            })
            .catch(err => {
                console.error("Error fetching link preview:", err);
                setError(err.message);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [url]);

    return { preview, loading, error };
}
