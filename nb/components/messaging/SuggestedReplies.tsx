"use client";

import { useEffect, useState } from "react";
import { MessageSuggestionsService, MessageSuggestion } from "@/lib/services/messageSuggestions";
import { Button } from "@/components/ui/button";
import { Message } from "@/lib/services/messaging/index";
import { cn } from "@/lib/utils";

interface SuggestedRepliesProps {
    lastMessage: Message | null;
    onSelect: (suggestion: string) => void;
    className?: string;
}

export function SuggestedReplies({ lastMessage, onSelect, className }: SuggestedRepliesProps) {
    const [suggestions, setSuggestions] = useState<MessageSuggestion[]>([]);
    useEffect(() => {
        if (lastMessage && lastMessage.sender_id) {
            loadSuggestions();
        } else {
            setSuggestions([]);
        }
    }, [lastMessage?.id]);

    const loadSuggestions = async () => {
        if (!lastMessage) return;

        try {
            const suggestions = await MessageSuggestionsService.generateSuggestions(
                lastMessage.content || ""
            );
            setSuggestions(suggestions);
        } catch (error) {
            console.error("Error loading suggestions:", error);
            setSuggestions([]);
        }
    };

    if (suggestions.length === 0 || !lastMessage) {
        return null;
    }

    return (
        <div className={cn("flex gap-2 p-2 overflow-x-auto", className)}>
            {suggestions.map((suggestion, index) => (
                <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => onSelect(suggestion.text)}
                    className="text-xs whitespace-nowrap flex-shrink-0"
                >
                    {suggestion.text}
                </Button>
            ))}
        </div>
    );
}
