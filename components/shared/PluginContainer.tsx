
import React from 'react';
import { MixxClubLogo, XIcon } from './Icons';

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
  return (
    <div 
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
        style={{
          boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.15), inset 0 -2px 3px rgba(0,0,0,0.3)'
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
    </div>
  );
};
