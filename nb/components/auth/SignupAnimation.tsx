"use client";

import { useEffect, useState } from "react";

interface SignupAnimationProps {
  isBlurred?: boolean;
}

export default function SignupAnimation({ isBlurred = false }: SignupAnimationProps) {
  const [activeCard, setActiveCard] = useState(0);
  const totalCards = 5;

  useEffect(() => {
    const displayTime = 3500;
    const interval = setInterval(() => {
      setActiveCard((prev) => (prev + 1) % totalCards);
    }, displayTime);
    return () => clearInterval(interval);
  }, [totalCards]);

  return (
    <div className={`workflow-animation-panel relative w-full h-full bg-gradient-to-br from-zinc-900 to-zinc-950 flex items-center justify-center overflow-hidden transition-all duration-300 ${isBlurred ? 'blur-md opacity-40' : ''}`}>
      <div className="card-stage relative w-[320px] h-[220px] perspective-1000">
        {/* CARD 1: CREATE PROFILE */}
        <div className={`card absolute inset-0 bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-2xl border-l-4 border-primary flex flex-col transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) ${activeCard === 0 ? "opacity-100 translate-y-0 scale-100 z-10 visible" : "opacity-0 -translate-y-8 scale-95 z-0 invisible"}`}>
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Step 01 · Profile</div>
          <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_0_2px_rgba(var(--primary-rgb),0.2)]" />
            Introduce yourself
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-xl">👤</div>
            <div className="flex-1 space-y-2">
              <div className={`h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full transition-all duration-500 delay-300 ${activeCard === 0 ? 'w-4/5' : 'w-0'}`} />
              <div className={`h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full transition-all duration-500 delay-500 ${activeCard === 0 ? 'w-3/5' : 'w-0'}`} />
            </div>
          </div>
          <div className={`mt-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-medium self-start transition-all duration-300 delay-700 ${activeCard === 0 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            @you • visible to your workspace
          </div>
        </div>

        {/* CARD 2: CLAIM USERNAME */}
        <div className={`card absolute inset-0 bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-2xl border-l-4 border-purple-500 flex flex-col transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) ${activeCard === 1 ? "opacity-100 translate-y-0 scale-100 z-10 visible" : "opacity-0 translate-y-8 scale-95 z-0 invisible"}`}>
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Step 02 · Handle</div>
          <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full shadow-[0_0_0_2px_rgba(168,85,247,0.2)]" />
            Claim your username
          </div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className={`text-4xl font-bold text-purple-500 transition-all duration-500 delay-300 ${activeCard === 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>@</div>
            <div className="flex-1 h-8 rounded-lg bg-purple-500/10 flex items-center px-3">
              <div className={`h-2 bg-purple-500 rounded-full transition-all duration-700 delay-500 ${activeCard === 1 ? 'w-4/5' : 'w-0'}`} />
            </div>
            <div className={`text-[10px] font-bold text-emerald-500 transition-all duration-300 delay-1000 ${activeCard === 1 ? 'opacity-100' : 'opacity-0'}`}>✓ Available</div>
          </div>
          <div className={`text-[10px] text-zinc-500 transition-all duration-300 delay-1100 ${activeCard === 1 ? 'opacity-100' : 'opacity-0'}`}>Used across Hub, Projects and Explorer.</div>
        </div>

        {/* CARD 3: SECURE PASSWORD */}
        <div className={`card absolute inset-0 bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-2xl border-l-4 border-amber-500 flex flex-col transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) ${activeCard === 2 ? "opacity-100 translate-y-0 scale-100 z-10 visible" : "opacity-0 translate-y-8 scale-95 z-0 invisible"}`}>
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Step 03 · Security</div>
          <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full shadow-[0_0_0_2px_rgba(245,158,11,0.2)]" />
            Set a strong password
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className={`text-5xl transition-all duration-500 delay-300 ${activeCard === 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>🔐</div>
            <div className="w-full space-y-2">
              {[0.8, 1.0, 1.2].map((delay, i) => (
                <div key={i} className={`flex items-center gap-2 transition-all duration-300 ${activeCard === 2 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`} style={{ transitionDelay: `${delay}s` }}>
                  <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[8px]">✓</div>
                  <div className="flex-1 h-1.5 bg-amber-500/20 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CARD 4: VERIFY EMAIL */}
        <div className={`card absolute inset-0 bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-2xl border-l-4 border-emerald-500 flex flex-col transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) ${activeCard === 3 ? "opacity-100 translate-y-0 scale-100 z-10 visible" : "opacity-0 translate-y-8 scale-95 z-0 invisible"}`}>
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Step 04 · Verify</div>
          <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_0_2px_rgba(16,185,129,0.2)]" />
            Confirm your email
          </div>
          <div className="flex items-center justify-center gap-4 my-2">
            <div className={`w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-3xl transition-all duration-500 delay-300 ${activeCard === 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>✉️</div>
            <div className={`text-emerald-500 text-xl transition-all duration-300 delay-700 ${activeCard === 3 ? 'opacity-100' : 'opacity-0'}`}>→</div>
            <div className={`w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center text-white text-3xl transition-all duration-500 delay-1000 ${activeCard === 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}>✓</div>
          </div>
          <div className={`text-[10px] text-zinc-500 text-center mt-2 transition-all duration-300 delay-1300 ${activeCard === 3 ? 'opacity-100' : 'opacity-0'}`}>Click the link to activate your account.</div>
        </div>

        {/* CARD 5: LAND IN WORKSPACE */}
        <div className={`card absolute inset-0 bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-2xl border-l-4 border-green-500 flex flex-col transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) ${activeCard === 4 ? "opacity-100 translate-y-0 scale-100 z-10 visible" : "opacity-0 translate-y-8 scale-95 z-0 invisible"}`}>
          <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Step 05 · Workspace</div>
          <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_0_2px_rgba(34,197,94,0.2)]" />
            Start in your hub
          </div>
          <div className="flex gap-4 items-center">
            <div className="flex flex-col gap-1.5 shrink-0">
              {['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-pink-500'].map((color, i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${color} transition-all duration-300`} style={{ transitionDelay: `${0.3 + i * 0.1}s`, opacity: activeCard === 4 ? 1 : 0.3 }} />
              ))}
            </div>
            <div className="flex-1 space-y-2">
              {[0.9, 0.7, 0.5].map((width, i) => (
                <div key={i} className={`h-2 bg-green-500/10 rounded-full transition-all duration-500`} style={{ width: activeCard === 4 ? `${width * 100}%` : '0%', transitionDelay: `${0.35 + i * 0.15}s` }} />
              ))}
            </div>
            <div className={`w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-xl shadow-lg shadow-green-500/30 transition-all duration-500 delay-800 ${activeCard === 4 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-75'}`}>🎉</div>
          </div>
        </div>
      </div>
    </div>
  );
}
