import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export interface MessageSuggestion {
    text: string;
    confidence: number;
}

const COMMON_PHRASES = [
    "Thanks!",
    "Got it",
    "Sounds good",
    "Will do",
    "Let me check",
    "I'll get back to you",
    "Perfect!",
    "No problem",
    "Sure thing",
    "On it",
    "Thanks for letting me know",
    "I'll take care of it",
    "Let me know if you need anything else",
    "Appreciate it",
    "Makes sense"
];

export const MessageSuggestionsService = {
    /**
     * Generate suggested replies based on context.
     * For now, uses rule-based suggestions. Can be enhanced with AI later.
     */
    async generateSuggestions(
        lastMessage: string,
        conversationContext?: string[]
    ): Promise<MessageSuggestion[]> {
        const lastMessageLower = lastMessage.toLowerCase();

        // Context-aware suggestions
        const suggestions: MessageSuggestion[] = [];

        // Question detection
        if (lastMessageLower.includes('?') || lastMessageLower.includes('how') || lastMessageLower.includes('what') || lastMessageLower.includes('when')) {
            suggestions.push(
                { text: "Let me check on that", confidence: 0.8 },
                { text: "I'll get back to you", confidence: 0.7 },
                { text: "Good question, let me look into it", confidence: 0.6 }
            );
        }

        // Request/ask detection
        if (lastMessageLower.includes('can you') || lastMessageLower.includes('could you') || lastMessageLower.includes('please')) {
            suggestions.push(
                { text: "Sure thing!", confidence: 0.9 },
                { text: "On it", confidence: 0.8 },
                { text: "I'll take care of it", confidence: 0.7 }
            );
        }

        // Thank you detection
        if (lastMessageLower.includes('thank') || lastMessageLower.includes('thanks')) {
            suggestions.push(
                { text: "You're welcome!", confidence: 0.9 },
                { text: "Happy to help!", confidence: 0.8 },
                { text: "No problem", confidence: 0.7 }
            );
        }

        // Agreement detection
        if (lastMessageLower.includes('sounds good') || lastMessageLower.includes('agreed') || lastMessageLower.includes('yes')) {
            suggestions.push(
                { text: "Great!", confidence: 0.8 },
                { text: "Perfect", confidence: 0.7 },
                { text: "Awesome", confidence: 0.6 }
            );
        }

        // Add common phrases if no context-specific suggestions
        if (suggestions.length === 0) {
            suggestions.push(
                ...COMMON_PHRASES.slice(0, 3).map(phrase => ({ text: phrase, confidence: 0.5 }))
            );
        }

        // Sort by confidence and return top 3
        return suggestions
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 3);
    },

    /**
     * Get autocomplete suggestions for common phrases.
     */
    getAutocompleteSuggestions(input: string): string[] {
        if (!input || input.length < 2) return [];

        const inputLower = input.toLowerCase();
        const matches = COMMON_PHRASES.filter(phrase =>
            phrase.toLowerCase().startsWith(inputLower) ||
            phrase.toLowerCase().includes(inputLower)
        );

        return matches.slice(0, 5);
    },

    /**
     * Learn from user's message history (future enhancement).
     */
    async learnFromHistory(userId: string, messages: string[]): Promise<void> {
        // Future: Store user's common phrases in database
        // For now, this is a placeholder
        console.log("Learning from message history:", { userId, messageCount: messages.length });
    }
};
