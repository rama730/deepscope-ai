"use client";

import { useEffect, useRef, memo } from "react";
import { motion, useInView, useSpring, useTransform } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  formatValue?: (value: number) => string;
  className?: string;
  prefix?: string;
  suffix?: string;
}

function AnimatedCounter({
  value,
  duration = 1.5,
  formatValue,
  className = "",
  prefix = "",
  suffix = "",
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  
  // Use duration as a high-level knob to tune the spring feel.
  // Shorter duration => stiffer/faster spring; longer duration => softer/slower spring.
  const speedFactor = 1.5 / Math.max(0.1, duration);

  const spring = useSpring(0, {
    stiffness: 50 * speedFactor,
    damping: 30 * speedFactor,
  });
  
  const display = useTransform(spring, (current) => {
    if (formatValue) {
      return formatValue(Math.round(current));
    }
    return Math.round(current).toLocaleString();
  });

  useEffect(() => {
    if (isInView) {
      spring.set(value);
    }
  }, [isInView, value, spring]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {prefix}
      <motion.span>{display}</motion.span>
      {suffix}
    </span>
  );
}

export default memo(AnimatedCounter);

