import React from 'react';
import { motion } from 'framer-motion';

/**
 * GlowBackground — High-performance radial backdrop glow optimized for GPU.
 * Bypasses layout thrashing and limits animation to GPU-friendly opacity/transform.
 */
export default function GlowBackground({ 
  color = "#22c55e", 
  size = 500, 
  intensity = 0.1, 
  className = "" 
}) {
  return (
    <motion.div
      className={`absolute rounded-full pointer-events-none -z-10 ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        filter: "blur(60px)",
        willChange: "transform, opacity",
      }}
      animate={{
        scale: [1, 1.1, 1],
        opacity: [intensity, intensity * 2, intensity],
      }}
      transition={{
        duration: 5,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}
