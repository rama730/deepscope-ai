"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function NotFound() {
    return (
        <section
            className="page_404 bg-white dark:bg-zinc-950 min-h-screen flex items-center justify-center py-10 px-4"
            style={{ fontFamily: 'ui-serif, Georgia, Cambria, \"Times New Roman\", Times, serif' }}
        >
            <div className="container mx-auto max-w-6xl">
                <div className="w-full">
                    <div className="w-full max-w-5xl mx-auto text-center">
                        
                        {/* Animated Background with 404 Text */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.5 }}
                            className="four_zero_four_bg relative h-[400px] bg-center bg-no-repeat flex items-start justify-center pt-0"
                    style={{
                                backgroundImage: "url('https://cdn.dribbble.com/users/285475/screenshots/2083086/dribbble_1.gif')",
                    }}
                >
                    <motion.h1
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.3, duration: 0.8, type: "spring" }}
                                className="text-center text-8xl md:text-9xl font-bold text-zinc-900 dark:text-zinc-100 -mt-4"
                                style={{ marginTop: '-1rem' }}
                    >
                        404
                    </motion.h1>
                </motion.div>

                        {/* Content Box */}
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 1 }}
                            className="contant_box_404 -mt-12 relative z-10"
                >
                            <h3 className="text-3xl md:text-4xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">
                                Look like you're lost
                            </h3>
                            <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 mb-8">
                                the page you are looking for not avaible!
                            </p>
                    <Link
                        href="/"
                                className="link_404 inline-block text-white px-5 py-2.5 bg-[#39ac31] hover:bg-[#2e8b27] my-5 rounded transition-colors no-underline"
                    >
                        Go to Home
                    </Link>
                </motion.div>

                    </div>
                </div>
            </div>

            <style jsx>{`
                .page_404 {
                    font-family: 'Arvo', serif;
                }

                .four_zero_four_bg {
                    background-position: center;
                    background-repeat: no-repeat;
                    background-size: contain;
                }

                .four_zero_four_bg h1 {
                    font-size: 80px;
                }

                .link_404 {
                    color: #fff !important;
                    padding: 10px 20px;
                    background: #39ac31;
                    margin: 20px 0;
                    display: inline-block;
                    text-decoration: none;
                    border-radius: 2px;
                }
                
                .link_404:hover {
                    text-decoration: none;
                    background: #2e8b27;
                }

                .contant_box_404 {
                    margin-top: -50px;
                }

                @media (max-width: 768px) {
                    .four_zero_four_bg {
                        height: 300px;
                    }
                    
                    .four_zero_four_bg h1 {
                        font-size: 60px;
                    }
                }
            `}</style>
        </section>
    );
}
