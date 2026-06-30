'use client';

import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';

interface AntigravityCardProps {
  children: React.ReactNode;
  glowColor?: 'cyan' | 'green' | 'red' | 'rose' | 'emerald' | 'none';
  className?: string;
  isAnomaly?: boolean;
}

export const AntigravityCard: React.FC<AntigravityCardProps> = ({
  children,
  glowColor = 'cyan',
  className = '',
  isAnomaly = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Track relative mouse position inside the card: 0 to 1
  const x = useMotionValue(0.5); // Default to center
  const y = useMotionValue(0.5);

  // Smooth springs for 3D rotation (rotateX around Y axis, rotateY around X axis)
  // Max rotation is 12 degrees for standard modern card tilt
  const rotateX = useSpring(useTransform(y, [0, 1], [12, -12]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(x, [0, 1], [-12, 12]), { stiffness: 150, damping: 20 });

  // Spotlight position mapping from 0-1 to percentage coordinates 0%-100%
  const mousePX = useSpring(useTransform(x, [0, 1], [0, 100]), { stiffness: 200, damping: 25 });
  const mousePY = useSpring(useTransform(y, [0, 1], [0, 100]), { stiffness: 200, damping: 25 });

  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Calculate fractional mouse position from 0 to 1 relative to card dimensions
    const mouseX = (e.clientX - rect.left) / width;
    const mouseY = (e.clientY - rect.top) / height;

    x.set(mouseX);
    y.set(mouseY);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    // Reset to center
    x.set(0.5);
    y.set(0.5);
  };

  // Border and shadow glow colors based on props
  const borderColors = {
    cyan: 'border-slate-800 hover:border-cyan-500/40',
    green: 'border-slate-800 hover:border-emerald-500/40',
    red: 'border-slate-800 hover:border-rose-500/40',
    rose: 'border-slate-800 hover:border-rose-500/40',
    emerald: 'border-slate-800 hover:border-emerald-500/40',
    none: 'border-slate-800 hover:border-slate-700',
  };

  const glowShadows = {
    cyan: 'shadow-[0_0_30px_rgba(6,182,212,0.02)] hover:shadow-[0_0_40px_rgba(6,182,212,0.08)]',
    green: 'shadow-[0_0_30px_rgba(16,185,129,0.02)] hover:shadow-[0_0_40px_rgba(16,185,129,0.08)]',
    red: 'shadow-[0_0_30px_rgba(244,63,94,0.02)] hover:shadow-[0_0_40px_rgba(244,63,94,0.08)]',
    rose: 'shadow-[0_0_30px_rgba(244,63,94,0.02)] hover:shadow-[0_0_40px_rgba(244,63,94,0.08)]',
    emerald: 'shadow-[0_0_30px_rgba(16,185,129,0.02)] hover:shadow-[0_0_40px_rgba(16,185,129,0.08)]',
    none: 'shadow-2xl',
  };

  // We build a spotlight gradient background matching the mouse coordinates
  const spotlightBg = useTransform(
    [mousePX, mousePY],
    ([px, py]) => `radial-gradient(350px circle at ${px}% ${py}%, rgba(255, 255, 255, 0.05), transparent 85%)`
  );

  return (
    // Outer ambient float wrapper
    <motion.div
      animate={
        isHovered
          ? { y: 0, transition: { duration: 0.4 } } // Settle float on hover for precise cursor interaction
          : {
              y: [0, -6, 0],
              transition: {
                duration: 6,
                repeat: Infinity,
                ease: 'easeInOut',
              },
            }
      }
      className="perspective-1000 w-full h-full flex flex-col"
      style={{
        transformStyle: 'preserve-3d',
      }}
    >
      {/* 3D Tilting Card */}
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX: rotateX,
          rotateY: rotateY,
          transformStyle: 'preserve-3d',
        }}
        className={`relative overflow-hidden w-full h-full rounded-xl border p-6 transition-all duration-300 ease-out will-change-transform bg-[#111827] backdrop-blur-xl ${
          borderColors[glowColor]
        } ${glowShadows[glowColor]} ${
          isAnomaly ? 'animate-pulse border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.25)]' : ''
        } ${className}`}
      >
        {/* Dynamic Spotlight Layer */}
        <motion.div
          className="absolute inset-0 pointer-events-none mix-blend-overlay z-0"
          style={{ background: spotlightBg }}
        />

        {/* Card Content - elevated on z-axis for 3D parallax, preserving layout */}
        <div 
          style={{ transform: 'translateZ(25px)', transformStyle: 'preserve-3d' }} 
          className="relative z-10 w-full h-full flex flex-col justify-between"
        >
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AntigravityCard;
