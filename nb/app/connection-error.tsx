"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Wifi, WifiOff, RefreshCw, Home } from "lucide-react";

export default function ConnectionError() {
    return (
        <section className="bg-white dark:bg-zinc-950 min-h-screen flex items-center justify-center font-serif">
            <div className="container mx-auto px-4 text-center">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.5 }}
                    className="relative h-[400px] w-full bg-center bg-no-repeat flex items-center justify-center mb-12 bg-zinc-100 dark:bg-zinc-900 rounded-2xl"
                >
                    {/* Animated Connection Icon */}
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                        className="relative"
                    >
                        <motion.div
                            animate={{ 
                                scale: [1, 1.1, 1],
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
                            <WifiOff className="w-32 h-32 text-blue-500 dark:text-blue-400" strokeWidth={1.5} />
                        </motion.div>
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

                    {/* Animated Error Text */}
                    <motion.h1
                        animate={{ y: [0, -15, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="text-9xl font-bold text-center absolute -top-16 text-zinc-900 dark:text-zinc-100"
                    >
                        🔌
                    </motion.h1>
                </motion.div>

                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 1 }}
                    className="relative -mt-20 z-10"
                >
                    <h3 className="text-4xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">
                        Can't Connect to the Server
                    </h3>
                    <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-8 max-w-2xl mx-auto">
                        We're having trouble reaching our servers. Please check your internet connection and try again.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => window.location.reload()}
                            className="inline-flex items-center gap-2 px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all shadow-xl font-sans font-medium"
                        >
                            <RefreshCw className="w-5 h-5" />
                            Retry Connection
                        </motion.button>
                        
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 px-8 py-3 bg-[#39ac31] hover:bg-[#2d8a26] text-white rounded-lg transition-all hover:scale-105 shadow-xl font-sans font-medium"
                        >
                            <Home className="w-5 h-5" />
                            Go to Home
                        </Link>
                    </div>

                    {/* Connection Status Indicator */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1, duration: 1 }}
                        className="mt-8 flex items-center justify-center gap-2 text-sm text-zinc-500 dark:text-zinc-400"
                    >
                        <motion.div
                            animate={{ opacity: [1, 0.5, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        >
                            <Wifi className="w-4 h-4" />
                        </motion.div>
                        <span>Checking connection...</span>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}

