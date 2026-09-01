"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import { User } from "@supabase/supabase-js"

// Safety check for NextThemesProvider
if (!NextThemesProvider) {
    throw new Error('next-themes ThemeProvider is not available. Please ensure next-themes is properly installed.')
}

// Define types for our appearance settings
type AccentColor = 'indigo' | 'purple' | 'green' | 'orange' | 'pink' | 'teal';
type Density = 'default' | 'compact' | 'comfortable';

interface AppearanceContextType {
    accentColor: AccentColor;
    setAccentColor: (color: AccentColor) => void;
    density: Density;
    setDensity: (density: Density) => void;
    reduceMotion: boolean;
    setReduceMotion: (reduce: boolean) => void;
}

const AppearanceContext = React.createContext<AppearanceContextType | undefined>(undefined);

export function ThemeProvider({
    children,
    ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
    // Lazy initialize Supabase client to avoid module loading issues
    const [supabase] = React.useState(() => {
        try {
            return createSupabaseBrowserClient();
        } catch (error) {
            console.error('Failed to create Supabase client:', error);
            return null;
        }
    });
    const [user, setUser] = React.useState<User | null>(null);

    const [accentColor, setAccentColorState] = React.useState<AccentColor>('indigo');
    const [density, setDensityState] = React.useState<Density>('default');
    const [reduceMotion, setReduceMotionState] = React.useState<boolean>(false);
    const [mounted, setMounted] = React.useState(false);

    // Initial load from localStorage and Auth
    React.useEffect(() => {
        setMounted(true);

        const init = async () => {
            // 1. Load from localStorage first (fastest)
            const savedAccent = localStorage.getItem('appearance-accent-color') as AccentColor;
            const savedDensity = localStorage.getItem('appearance-density') as Density;
            const savedMotion = localStorage.getItem('appearance-reduce-motion');

            if (savedAccent) setAccentColorState(savedAccent);
            if (savedDensity) setDensityState(savedDensity);
            if (savedMotion) setReduceMotionState(savedMotion === 'true');

            // 2. Load User and their Cloud Preferences
            if (!supabase) return;
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (user) {
                // Only select columns that exist in the user_preferences table
                // The table schema has: user_id, hub_view_mode, hub_sort_by, hub_filters, updated_at
                // Appearance preferences (accent_color, density, reduce_motion, theme_mode) are stored in localStorage only
                try {
                    const { data: prefs } = await supabase
                        .from('user_preferences')
                        .select('hub_view_mode, hub_sort_by, hub_filters')
                        .eq('user_id', user.id)
                        .maybeSingle();

                    // Silently handle errors (404, 403, 406 are expected if preferences don't exist or RLS blocks)
                    if (prefs) {
                        // Hub preferences can be loaded here if needed in the future
                    }
                } catch (err) {
                    // Silently handle errors - preferences may not exist or may be blocked by RLS
                }
            }
        };

        if (supabase) {
            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                setUser(session?.user ?? null);
            });

            init();

            return () => subscription.unsubscribe();
        } else {
            init();
        }
        return undefined;
    }, [supabase]);

    // Persist and Apply changes
    // Helper to update classList
    const updateHtmlClass = React.useCallback((
        type: 'accent' | 'density' | 'motion',
        newValue: string | boolean,
        oldValue?: string | boolean
    ) => {
        const root = document.documentElement;

        if (type === 'accent') {
            if (oldValue && oldValue !== 'indigo') root.classList.remove(`accent-${oldValue}`);
            if (newValue && newValue !== 'indigo') root.classList.add(`accent-${newValue}`);
        }

        if (type === 'density') {
            if (oldValue && oldValue !== 'default') root.classList.remove(`density-${oldValue}`);
            if (newValue && newValue !== 'default') root.classList.add(`density-${newValue}`);
        }

        if (type === 'motion') {
            if (newValue) root.classList.add('reduce-motion');
            else root.classList.remove('reduce-motion');
        }

    }, []);

    // Helper to sync to DB
    const syncToDb = React.useCallback(async (updates: any) => {
        if (!user || !supabase) return;

        try {
            // If syncing failed once (common when migrations/RLS aren't applied), don't spam retries.
            if ((syncToDb as any).__disabled) return;

            const { error } = await supabase.from('user_preferences').upsert({
                user_id: user.id,
                ...updates,
                updated_at: new Date().toISOString()
            });
            if (error) {
                // Avoid noisy console errors in the browser; this is non-critical since we also store locally.
                // Disable further DB sync attempts for this session.
                (syncToDb as any).__disabled = true;
                if (process.env.NODE_ENV === 'development') {
                    const msg = (error as any)?.message || (error as any)?.details || String(error);
                    console.debug("[Preferences] Cloud sync disabled:", msg);
                }
            }
        } catch (err) {
            // Same rationale: don't spam console for non-critical preference sync failures.
            (syncToDb as any).__disabled = true;
            if (process.env.NODE_ENV === 'development') {
                console.debug("[Preferences] Cloud sync error; disabled.");
            }
        }
    }, [user, supabase]);

    // Setters that update state, localStorage, and DB

    const setAccentColor = (color: AccentColor) => {
        updateHtmlClass('accent', color, accentColor);
        setAccentColorState(color);
        localStorage.setItem('appearance-accent-color', color);
        syncToDb({ accent_color: color });
    };

    const setDensity = (val: Density) => {
        updateHtmlClass('density', val, density);
        setDensityState(val);
        localStorage.setItem('appearance-density', val);
        syncToDb({ density: val });
    };

    const setReduceMotion = (val: boolean) => {
        updateHtmlClass('motion', val);
        setReduceMotionState(val);
        localStorage.setItem('appearance-reduce-motion', String(val));
        syncToDb({ reduce_motion: val });
    };

    // Apply classes whenever theme settings change
    // (We also do this in individual setters, but this ensures sync on mount and state changes)
    React.useEffect(() => {
        if (!mounted) return;
        const root = document.documentElement;

        // Clean up old classes
        ['purple', 'green', 'orange', 'pink', 'teal'].forEach(c => root.classList.remove(`accent-${c}`));
        ['compact', 'comfortable'].forEach(d => root.classList.remove(`density-${d}`));
        root.classList.remove('reduce-motion');

        // Apply new classes
        if (accentColor !== 'indigo') root.classList.add(`accent-${accentColor}`);
        if (density !== 'default') root.classList.add(`density-${density}`);
        if (reduceMotion) root.classList.add('reduce-motion');

    }, [mounted, accentColor, density, reduceMotion]);

    // NEW: Sync 'theme' (light/dark/system) to DB whenever it changes.
    // next-themes handles the state and localStorage optimistically.
    const { theme } = useTheme();
    React.useEffect(() => {
        if (!mounted || !user) return;
        // debounce slightly or just sync. Since theme changes are rare manual actions, direct sync is fine.
        syncToDb({ theme_mode: theme });
    }, [theme, user, syncToDb, mounted]);

    const value = {
        accentColor,
        setAccentColor,
        density,
        setDensity,
        reduceMotion,
        setReduceMotion,
    };

    // Safety check - if NextThemesProvider failed to load, render without it
    if (typeof NextThemesProvider === 'undefined' || !NextThemesProvider) {
        console.warn('NextThemesProvider is not available, rendering without theme support');
        return (
            <AppearanceContext.Provider value={value}>
                {children}
            </AppearanceContext.Provider>
        );
    }

    return (
        <AppearanceContext.Provider value={value}>
            <NextThemesProvider {...props}>
                {children}
            </NextThemesProvider>
        </AppearanceContext.Provider>
    );
}

export const useAppearance = () => {
    const context = React.useContext(AppearanceContext);
    if (context === undefined) {
        throw new Error('useAppearance must be used within a ThemeProvider (AppearanceProvider)');
    }
    return context;
};

export { useTheme }
