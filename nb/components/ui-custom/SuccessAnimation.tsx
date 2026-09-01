"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Sparkles } from "lucide-react";

interface SuccessAnimationProps {
  show: boolean;
  message?: string;
  onComplete?: () => void;
  duration?: number;
}

export default function SuccessAnimation({ 
  show, 
  message = "Success!", 
  onComplete,
  duration = 2000 
}: SuccessAnimationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, duration);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [show, duration, onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="relative">
        {/* Background overlay */}
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-full animate-ping" />
        
        {/* Success icon with animation */}
        <div className="relative bg-white dark:bg-zinc-900 rounded-full p-6 shadow-2xl animate-scale-in">
          <div className="relative">
            <CheckCircle className="w-16 h-16 text-emerald-500 animate-checkmark" />
            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400 animate-sparkle" />
          </div>
        </div>
        
        {/* Message */}
        {message && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg shadow-lg animate-slide-up whitespace-nowrap">
            {message}
          </div>
        )}
      </div>
      
      <style jsx>{`
        @keyframes scale-in {
          0% {
            opacity: 0;
            transform: scale(0.5);
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes checkmark {
          0% {
            stroke-dashoffset: 100;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
        
        @keyframes sparkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: scale(1) rotate(180deg);
          }
        }
        
        @keyframes slide-up {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        
        .animate-scale-in {
          animation: scale-in 0.5s ease-out;
        }
        
        .animate-checkmark {
          animation: checkmark 0.6s ease-out;
        }
        
        .animate-sparkle {
          animation: sparkle 1s ease-in-out;
        }
        
        .animate-slide-up {
          animation: slide-up 0.4s ease-out 0.2s both;
        }
      `}</style>
    </div>
  );
}

