"use client";

import { createContext, useContext, ReactNode } from "react";
import { useTheme } from "next-themes";

interface MessageThemeContextValue {
    isDark: boolean;
    theme: string | undefined;
}

const MessageThemeContext = createContext<MessageThemeContextValue | undefined>(undefined);

interface MessageThemeProviderProps {
    children: ReactNode;
}

export function MessageThemeProvider({ children }: MessageThemeProviderProps) {
    const { theme, resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark' || theme === 'dark';

    return (
        <MessageThemeContext.Provider value={{ isDark, theme }}>
            {children}
        </MessageThemeContext.Provider>
    );
}

export function useMessageTheme() {
    const context = useContext(MessageThemeContext);
    if (context === undefined) {
        throw new Error('useMessageTheme must be used within a MessageThemeProvider');
    }
    return context;
}
