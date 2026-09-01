"use client";

import { motion } from "framer-motion";
import { WifiOff, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

interface ConnectionErrorProps {
    onRetry?: () => void;
    message?: string;
    showHomeButton?: boolean;
}

export default function ConnectionError({
    onRetry,
    message = "Can't connect to the server. Please check your connection and try again.",
    showHomeButton = true,
}: ConnectionErrorProps) {
    const handleRetry = () => {
        if (onRetry) {
            onRetry();
        } else {
            window.location.reload();
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-white dark:bg-zinc-950">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 20
                }}
                className="max-w-md w-full text-center space-y-6"
            >
                {/* Animated Connection Icon */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="relative flex justify-center"
                >
                    <motion.div
                        animate={{ 
                            scale: [1, 1.2, 1],
                            opacity: [0.3, 0.6, 0.3]
                        }}
                        transition={{ 
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="absolute inset-0 rounded-full bg-blue-500/20 blur-3xl"
                    />
                    
                    <motion.div
                        animate={{ rotate: [0, 360] }}
                        transition={{ 
                            duration: 20,
                            repeat: Infinity,
                            ease: "linear"
                        }}
                        className="relative z-10"
                    >
                        <WifiOff className="w-24 h-24 text-blue-500 dark:text-blue-400 mx-auto" strokeWidth={1.5} />
                    </motion.div>

                    {/* Pulsing Connection Waves */}
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            initial={{ scale: 0.5, opacity: 0.8 }}
                            animate={{ 
                                scale: [1, 2, 2.5],
                                opacity: [0.8, 0.4, 0]
                            }}
                            transition={{ 
                                duration: 2,
                                repeat: Infinity,
                                delay: i * 0.6,
                                ease: "easeOut"
                            }}
                            className="absolute inset-0 rounded-full border-2 border-blue-500/30 dark:border-blue-400/30"
                            style={{
                                left: '50%',
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                            }}
                        />
                    ))}
                </motion.div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                    className="space-y-4"
                >
                    <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                        Connection Error
                    </h2>
                    
                    <p className="text-zinc-500 dark:text-zinc-400">
                        {message}
                    </p>
                </motion.div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.6 }}
                    className="flex flex-col sm:flex-row gap-4 justify-center"
                >
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleRetry}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all shadow-lg font-medium"
                    >
                        <RefreshCw className="w-5 h-5" />
                        Try Again
                    </motion.button>
                    
                    {showHomeButton && (
                        <Link
                            href="/"
                            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg transition-all font-medium"
                        >
                            <Home className="w-5 h-5" />
                            Go Home
                        </Link>
                    )}
                </motion.div>
            </motion.div>
        </div>
    );
}

