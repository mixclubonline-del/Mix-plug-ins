import React from 'react';

interface NeuralGridBackgroundProps {
  glowColor: string;
  glowOpacity: number;
}

export const NeuralGridBackground: React.FC<NeuralGridBackgroundProps> = ({ glowColor, glowOpacity }) => {
  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none z-0">
      {/* Base Grid */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(128, 128, 128, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(128, 128, 128, 0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* Radial Glow */}
      <div 
        className="absolute inset-0 transition-all duration-1000"
        style={{
          background: `radial-gradient(ellipse at center, ${glowColor} 0%, transparent 70%)`,
          opacity: glowOpacity,
          mixBlendMode: 'screen',
        }}
      />
    </div>
  );
};
