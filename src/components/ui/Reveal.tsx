"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import useReducedMotionPreference from "./useReducedMotionPreference";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
};

export default function Reveal({
  children,
  className = "",
  delay = 0,
  y = 24,
}: RevealProps) {
  const reduceMotion = useReducedMotionPreference();

  return (
    <motion.div
      initial={
        reduceMotion
          ? { opacity: 1 }
          : {
              opacity: 0,
              y,
            }
      }
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
        amount: 0.2,
      }}
      transition={{
        duration: reduceMotion ? 0 : 0.7,
        delay,
        ease: [0.2, 0, 0, 1],
      }}
      className={`motion-reveal ${className}`}
    >
      {children}
    </motion.div>
  );
}
