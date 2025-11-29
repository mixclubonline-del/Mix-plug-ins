
import React, { useEffect } from 'react';
import { MixxClubLogo, XIcon } from './Icons';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface PluginContainerProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  className?: string;
  isDragging?: boolean;
  isResizing?: boolean;
  onClose?: () => void; // Add onClose prop for dedicated close button
}

export const PluginContainer: React.FC<PluginContainerProps> = ({ children, title, subtitle, className = '', isDragging = false, isResizing = false, onClose }) => {
  // Motion values for mouse position relative to center (normalized -0.5 to 0.5)
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Smooth springs for rotation inputs
  const mouseX = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseY = useSpring(y, { stiffness: 300, damping: 30 });

  // Smooth spring for scale
  const scale = useSpring(1, { stiffness: 300, damping: 30 });

  // Calculate rotation: Move mouse Y -> Rotate X, Move mouse X -> Rotate Y
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [4, -4]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-4, 4]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging || isResizing) {
        x.set(0);
        y.set(0);
        scale.set(1);
        return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Calculate mouse position relative to element
    const mouseXPos = e.clientX - rect.left;
    const mouseYPos = e.clientY - rect.top;
    
    // Calculate normalized position (-0.5 to 0.5)
    const xPct = (mouseXPos / width) - 0.5;
    const yPct = (mouseYPos / height) - 0.5;
    
    x.set(xPct);
    y.set(yPct);
    scale.set(1.01); // Subtle scale up
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    scale.set(1);
  };

  // Reset transforms when interaction props change to ensure clean state during drag
  useEffect(() => {
      if(isDragging || isResizing) {
          x.set(0);
          y.set(0);
          scale.set(1);
      }
  }, [isDragging, isResizing, x, y, scale]);

  return (
    <motion.div 
        className={`
            bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-2xl
            border border-white/20 rounded-2xl
            w-full h-full
            flex flex-col
            relative overflow-hidden
            group
            transition-shadow duration-200 ease-out
            ${isDragging ? 'cursor-grabbing' : 'cursor-default'}
            ${isResizing ? 'cursor-nwse-resize' : ''}
            ${className}
        `}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.15), inset 0 -2px 3px rgba(0,0,0,0.3)',
          transformPerspective: 1000,
          rotateX: isDragging || isResizing ? 0 : rotateX,
          rotateY: isDragging || isResizing ? 0 : rotateY,
          scale: isDragging || isResizing ? 1 : scale,
        }}
    >
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-pink-500/10 via-transparent to-cyan-500/10 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="absolute inset-0 rounded-2xl border border-transparent group-hover:border-[var(--border-highlight)] transition-all duration-300 pointer-events-none"></div>
        <div className="light-sweep-effect"></div>

        <header className="relative z-10 flex-shrink-0 p-6 md:p-8 pb-4">
            <h3 className="font-orbitron text-2xl md:text-3xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-white text-shadow-[0_0_10px_rgba(255,255,255,0.3)]">{title}</h3>
            <p className="text-sm md:text-base text-white/60">{subtitle}</p>
            {onClose && (
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 p-2 text-white/50 hover:text-pink-300 group-hover:drop-shadow-[0_0_3px_var(--glow-pink)] transition-all hover:scale-110" 
                    title="Close Plugin"
                >
                    <XIcon className="w-5 h-5" />
                </button>
            )}
        </header>

        <div 
          className="relative flex-1 flex flex-col overflow-hidden"
          // Removed maskImage styles to prevent unwanted overlay
        >
          <div 
            className="relative w-full h-full overflow-y-auto custom-scrollbar px-6 md:px-8"
            tabIndex={0}
          >
            {children}
          </div>
        </div>
        
        <footer className="relative z-10 flex-shrink-0 p-4 flex justify-center items-center gap-2 text-white/40">
            <MixxClubLogo className="h-6 w-6" />
            <span className="font-orbitron text-lg">MixxClub</span>
        </footer>
    </motion.div>
  );
};
