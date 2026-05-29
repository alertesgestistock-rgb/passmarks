import React, { useRef } from 'react';
import { motion, useMotionValue, useMotionTemplate } from 'framer-motion';

/**
 * CardSpotlight — Premium interactive card container.
 * Features spotlight border/radial glow that tracks the cursor (zero-render overhead via useMotionValue)
 * and an organic spring-physics elevation lift on hover.
 */
export default function CardSpotlight({ 
  children, 
  className = "", 
  spotlightColor = "rgba(34,197,94,0.15)",
  hoverLift = true,
  onClick
}) {
  const cardRef = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Dynamic CSS radial gradient that updates without triggering a React re-render
  const spotlightBackground = useMotionTemplate`
    radial-gradient(220px circle at ${mouseX}px ${mouseY}px, ${spotlightColor}, transparent 80%)
  `;

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const hoverAnimation = hoverLift ? { y: -6, scale: 1.015 } : {};

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      whileHover={hoverAnimation}
      whileTap={{ scale: onClick ? 0.985 : 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      onClick={onClick}
      className={`
        relative rounded-2xl border border-white/5 bg-[#1E293B]/45
        backdrop-blur-md overflow-hidden
        ${onClick ? 'cursor-pointer select-none' : ''}
        ${className}
      `}
    >
      {/* Dynamic Cursor Light Overlay */}
      <motion.div
        className="absolute inset-0 pointer-events-none z-0"
        style={{ background: spotlightBackground }}
      />
      {/* Light border glow */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none z-0 opacity-60"
        style={{
          background: spotlightBackground,
        }}
      />
      {/* Main card content */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </motion.div>
  );
}
