import "@/app/globals.css";
import "@/lib/suppress-console-errors"; // Suppress expected console errors
import "@/lib/suppress-network-errors"; // Suppress expected network errors
import { Toaster } from "@/components/ui/sonner";
import CookieConsent from "@/components/CookieConsent";
import NotificationProvider from "@/components/notifications/NotificationProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import QueryProvider from "@/components/providers/QueryProvider";
import { ConnectionStatus } from "@/components/ui-custom/ConnectionStatus"; // Added import
import { PresenceProvider } from "@/components/messaging/PresenceProvider";
import { MessageContextProvider } from "@/contexts/MessageContext";
import { PerformanceMonitor } from "@/components/PerformanceMonitor";
import { UploadProvider } from "@/context/UserUploadContext";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { CookieProvider } from "@/components/providers/CookieProvider";
import { OnboardingGuard } from "@/components/auth/OnboardingGuard";

import { Metadata } from 'next';

export const metadata: Metadata = {
    title: {
        default: 'Network for Builders',
        template: '%s | Network for Builders',
    },
    description: 'The premier network for builders, makers, and creators to showcase projects and collaborate.',
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://nb.app'),
    openGraph: {
        title: 'Network for Builders',
        description: 'The premier network for builders, makers, and creators to showcase projects and collaborate.',
        siteName: 'Network for Builders',
        locale: 'en_US',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Network for Builders',
        description: 'The premier network for builders, makers, and creators to showcase projects and collaborate.',
        creator: '@nb_app',
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
};

import { Inter } from "next/font/google";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-geist-sans",
    display: "swap",
    // Helps keep the dev console clean: prevents "preloaded but not used" warnings for font assets.
    // (We still get the font via next/font, just without a preload link.)
    preload: true,

});

// ... existing imports

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning className={inter.variable}>
            <head>
                <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} crossOrigin="anonymous" />
                <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
                <link rel="preconnect" href="https://lh3.googleusercontent.com" crossOrigin="anonymous" />
                <link rel="dns-prefetch" href="https://lh3.googleusercontent.com" />
                {/* Optimizes connection to key 3rd party domains */}
            </head>
            <body className="bg-white dark:bg-zinc-950">
                <ThemeProvider attribute="class" defaultTheme="system" storageKey="nb-theme" enableSystem>
                    <QueryProvider>
                        <AuthProvider>
                            <CookieProvider>
                                <OnboardingGuard>
                                    <MessageContextProvider>
                                        <NotificationProvider>
                                            <PresenceProvider>
                                                <PerformanceMonitor />
                                                <UploadProvider>
                                                    {children}
                                                    <ServiceWorkerRegister />
                                                </UploadProvider>
                                                <ConnectionStatus />
                                                <CookieConsent />
                                                <Toaster
                                                    position="top-right"
                                                    offset={80}
                                                    richColors
                                                    closeButton
                                                />
                                            </PresenceProvider>
                                        </NotificationProvider>
                                    </MessageContextProvider>
                                </OnboardingGuard>
                            </CookieProvider>
                        </AuthProvider>
                    </QueryProvider>
                </ThemeProvider>
            </body>
        </html>
    )
}

