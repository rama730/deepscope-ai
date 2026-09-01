"use client";

import { useMemo } from "react";
import { LinkPreview } from "./LinkPreview";

interface MessageContentWithLinksProps {
    content: string;
}

// URL regex pattern
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export function MessageContentWithLinks({ content }: MessageContentWithLinksProps) {
    const parts = useMemo(() => {
        const urls = content.match(URL_REGEX) || [];
        if (urls.length === 0) {
            return [{ type: 'text', content }];
        }

        const parts: Array<{ type: 'text' | 'link'; content: string }> = [];
        let lastIndex = 0;

        urls.forEach((url) => {
            const index = content.indexOf(url, lastIndex);
            if (index > lastIndex) {
                parts.push({ type: 'text', content: content.substring(lastIndex, index) });
            }
            parts.push({ type: 'link', content: url });
            lastIndex = index + url.length;
        });

        if (lastIndex < content.length) {
            parts.push({ type: 'text', content: content.substring(lastIndex) });
        }

        return parts;
    }, [content]);

    return (
        <p>
            {parts.map((part, index) => {
                if (part.type === 'link') {
                    return (
                        <span key={index} className="block my-2">
                            <LinkPreview url={part.content} />
                        </span>
                    );
                }
                return <span key={index}>{part.content}</span>;
            })}
        </p>
    );
}
