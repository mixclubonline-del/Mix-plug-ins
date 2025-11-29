
import React, { useMemo } from 'react';

interface SpectralDisplayProps {
    clarity: number;
    presence: number;
    body: number;
    grit: number;
}

const NUM_BANDS = 32;

export const SpectralDisplay: React.FC<SpectralDisplayProps> = ({ clarity, presence, body, grit }) => {

    const bands = useMemo(() => {
        return Array.from({ length: NUM_BANDS }, (_, i) => {
            const position = i / (NUM_BANDS - 1); // 0 to 1

            // Influence of each knob based on frequency position
            const bodyFactor = Math.pow(1 - position, 2); // Stronger on the left
            const presenceFactor = 1 - Math.abs(position - 0.6) * 2; // Peaked around 60%
            const clarityFactor = Math.pow(position, 2); // Stronger on the right
            const gritFactor = Math.pow(position, 4) * (Math.random() > 0.5 ? 1 : 0.5); // Adds energy to high frequencies

            const bodyHeight = (body / 100) * bodyFactor * 0.8;
            const presenceHeight = (presence / 100) * presenceFactor * 0.7;
            const clarityHeight = (clarity / 100) * clarityFactor;
            const gritHeight = (grit / 100) * gritFactor;

            const baseHeight = 0.05; // Minimum height
            const totalHeight = Math.min(1, baseHeight + bodyHeight + presenceHeight + clarityHeight + gritHeight);

            // Animation properties
            const duration = 0.5 + Math.random() * 0.5;
            const delay = Math.random() * 0.5;
            const endScale = 0.1 + Math.random() * 0.4;
            
            return { 
                height: `${totalHeight * 100}%`,
                animationDuration: `${duration}s`,
                animationDelay: `${delay}s`,
                '--end-scale': endScale,
            };
        });
    }, [clarity, presence, body, grit]);

    return (
        <div className="w-full h-full flex items-end justify-center gap-[1px] bg-black/10 border border-white/10 p-2 rounded-lg">
            {bands.map((style, i) => (
                <div 
                    key={i} 
                    className="flex-1 rounded-t-sm bg-gradient-to-t from-cyan-500 to-pink-500"
                    style={{
                        ...style,
                        animationName: 'spectral-dance',
                        animationTimingFunction: 'ease-in-out',
                        animationIterationCount: 'infinite',
                        transformOrigin: 'bottom',
                        filter: 'drop-shadow(0 0 3px var(--glow-cyan))'
                    } as React.CSSProperties}
                />
            ))}
        </div>
    );
};