"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="error-500-container">
            <div className="container">
                
                {/* Animated Scene */}
                <div className="scene">
                    {/* Rotating Gears */}
                    <svg className="gear" viewBox="0 0 24 24">
                        <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.35 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.35 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.04 4.95,18.95L7.44,17.95C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.95L19.05,18.95C19.27,19.04 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" />
                    </svg>
                    <svg className="gear-small" viewBox="0 0 24 24">
                        <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.35 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.35 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.04 4.95,18.95L7.44,17.95C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.95L19.05,18.95C19.27,19.04 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" />
                    </svg>
                    
                    {/* The Server Rack */}
                    <div className="server-rack">
                        <div className="warning-sign">
                            <span className="warning-icon">!</span>
                        </div>
                        
                        {/* Unit 1 */}
                        <div className="server-unit u1">
                            <div className="light"></div>
                            <div className="light"></div>
                            <div className="light"></div>
                        </div>
                        {/* Unit 2 (The Problem Unit) */}
                        <div className="server-unit u2">
                            <div className="light red"></div>
                            <div className="light red"></div>
                            <div className="light red"></div>
                        </div>
                        {/* Unit 3 */}
                        <div className="server-unit u3">
                            <div className="light"></div>
                            <div className="light"></div>
                        </div>
                        {/* Unit 4 */}
                        <div className="server-unit u1">
                            <div className="light"></div>
                            <div className="light"></div>
                            <div className="light"></div>
                        </div>
                        {/* Unit 5 */}
                        <div className="server-unit u1">
                            <div className="light"></div>
                            <div className="light"></div>
                            <div className="light"></div>
                        </div>
                    </div>

                    {/* Wire connecting to outside */}
                    <svg className="cable-svg">
                        <path className="cable-path" d="M150,200 C150,100 280,150 280,50" />
                    </svg>
                </div>

                <h1>500</h1>
                <h2>Internal Server Error</h2>
                <p>
                    Our team of digital mechanics is already working on the server rack.<br />
                    Please try refreshing the page in a moment.
                </p>
                
                <button onClick={() => window.location.reload()} className="btn">
                    Refresh Page
                </button>
                <button onClick={() => reset()} className="btn" style={{ marginLeft: '10px' }}>
                    Try Again
                </button>
                <br /><br />
                <Link href="/" className="home-link">
                    Back to Homepage
                </Link>

                {process.env.NODE_ENV === "development" && error && (
                    <div className="error-details">
                        <p className="error-message">{error.message}</p>
                        {error.digest && (
                            <p className="error-digest">Digest: {error.digest}</p>
                        )}
                    </div>
                )}
            </div>

            <style jsx>{`
                :root {
                    --primary-bg: #f3f4f6;
                    --text-color: #1f2937;
                    --accent-purple: #6c63ff;
                    --accent-orange: #ff6584;
                    --server-dark: #2d3748;
                    --server-light: #4a5568;
                }

                .error-500-container {
                    margin: 0;
                    padding: 0;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background-color: var(--primary-bg);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    overflow: hidden;
                }

                .container {
                    text-align: center;
                    position: relative;
                    z-index: 10;
                    max-width: 600px;
                    padding: 20px;
                }

                /* Typography */
                h1 {
                    font-size: 8rem;
                    margin: 0;
                    color: var(--server-dark);
                    line-height: 1;
                    position: relative;
                    display: inline-block;
                }
                
                h1::after {
                    content: '500';
                    position: absolute;
                    left: 2px;
                    text-shadow: -1px 0 var(--accent-orange);
                    top: 0;
                    color: var(--server-dark);
                    background: var(--primary-bg);
                    overflow: hidden;
                    clip: rect(0, 900px, 0, 0); 
                    animation: glitch 2s infinite linear alternate-reverse;
                }

                h2 {
                    font-size: 2rem;
                    color: var(--server-dark);
                    margin-bottom: 10px;
                }

                p {
                    color: #666;
                    font-size: 1.1rem;
                    margin-bottom: 30px;
                }

                /* Buttons */
                .btn {
                    padding: 12px 30px;
                    background-color: var(--accent-purple);
                    color: white;
                    border: none;
                    border-radius: 50px;
                    font-size: 1rem;
                    cursor: pointer;
                    transition: transform 0.2s, box-shadow 0.2s;
                    text-decoration: none;
                    display: inline-block;
                    font-weight: 600;
                }

                .btn:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 10px 20px rgba(108, 99, 255, 0.3);
                    background-color: #5a52d5;
                }

                .home-link {
                    color: #6c63ff;
                    text-decoration: none;
                    font-size: 0.9rem;
                }

                .home-link:hover {
                    text-decoration: underline;
                }

                /* The Server Illustration */
                .scene {
                    position: relative;
                    height: 300px;
                    width: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: flex-end;
                    margin-bottom: 20px;
                }

                .server-rack {
                    width: 140px;
                    height: 220px;
                    background: var(--server-dark);
                    border-radius: 10px;
                    position: relative;
                    padding: 10px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.2);
                    z-index: 2;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                /* Server Units */
                .server-unit {
                    height: 30px;
                    background: var(--server-light);
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    padding: 0 8px;
                    gap: 5px;
                    position: relative;
                }

                /* Blinking Lights */
                .light {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background-color: #4ade80;
                }

                .light.red { background-color: #ef4444; }
                .light.orange { background-color: #f59e0b; }

                /* Animations for lights */
                .u1 .light:nth-child(1) { animation: blink 1s infinite; }
                .u1 .light:nth-child(2) { animation: blink 1.5s infinite; }
                .u2 .light { animation: blink-fast 0.5s infinite; background-color: var(--accent-orange); }
                .u3 .light { animation: blink 2s infinite; }

                /* The "Technician" Elements */
                .gear {
                    position: absolute;
                    right: -40px;
                    top: 60px;
                    width: 60px;
                    height: 60px;
                    fill: var(--accent-orange);
                    animation: spin 4s linear infinite;
                    opacity: 0.8;
                    z-index: 1;
                }

                .gear-small {
                    position: absolute;
                    left: -20px;
                    bottom: 40px;
                    width: 40px;
                    height: 40px;
                    fill: var(--accent-purple);
                    animation: spin-reverse 5s linear infinite;
                    opacity: 0.8;
                    z-index: 1;
                }

                /* Connecting Cable */
                .cable-svg {
                    position: absolute;
                    top: 50px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 300px;
                    height: 250px;
                    pointer-events: none;
                    z-index: 3;
                }
                
                .cable-path {
                    fill: none;
                    stroke: var(--accent-purple);
                    stroke-width: 4;
                    stroke-linecap: round;
                    stroke-dasharray: 20;
                    animation: flow 1s linear infinite;
                }

                /* Warning Sign */
                .warning-sign {
                    position: absolute;
                    top: -30px;
                    right: -10px;
                    background: #fff;
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                    animation: float 3s ease-in-out infinite;
                    z-index: 5;
                }
                .warning-icon {
                    font-size: 24px;
                    color: var(--accent-orange);
                    font-weight: bold;
                }

                /* Error Details for Development */
                .error-details {
                    margin-top: 30px;
                    padding: 20px;
                    background: #fee2e2;
                    border: 1px solid #fca5a5;
                    border-radius: 8px;
                    text-align: left;
                }

                .error-message {
                    font-family: monospace;
                    font-size: 0.875rem;
                    color: #991b1b;
                    margin: 0;
                    white-space: pre-wrap;
                }

                .error-digest {
                    font-family: monospace;
                    font-size: 0.75rem;
                    color: #666;
                    margin: 10px 0 0 0;
                }

                /* Keyframes */
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }

                @keyframes blink-fast {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }

                @keyframes spin { 
                    100% { transform: rotate(360deg); } 
                }

                @keyframes spin-reverse { 
                    100% { transform: rotate(-360deg); } 
                }

                @keyframes float {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }

                @keyframes flow {
                    to { stroke-dashoffset: -40; }
                }

                @keyframes glitch {
                    0% { clip: rect(44px, 9999px, 56px, 0); }
                    5% { clip: rect(30px, 9999px, 86px, 0); }
                    10% { clip: rect(12px, 9999px, 34px, 0); }
                    15% { clip: rect(67px, 9999px, 2px, 0); }
                    20% { clip: rect(0, 0, 0, 0); }
                    100% { clip: rect(0, 0, 0, 0); }
                }

                /* Mobile Adjustments */
                @media (max-width: 600px) {
                    h1 { font-size: 5rem; }
                    .scene { height: 250px; }
                }

                /* Dark mode support */
                @media (prefers-color-scheme: dark) {
                    .error-500-container {
                        background-color: #1f2937;
                    }
                    h1, h2 {
                        color: #f3f4f6;
                    }
                    p {
                        color: #9ca3af;
                    }
                    h1::after {
                        background: #1f2937;
                    }
                }
            `}</style>
        </div>
    );
}
