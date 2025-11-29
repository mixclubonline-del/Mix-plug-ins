
import React from 'react';

interface WaveformProps {
    id: string;
    color: string;
    path: string;
    animated?: boolean;
    animationDuration?: string;
    animateStroke?: boolean; // New prop for MixxVerb particle trails
}

export const Waveform: React.FC<WaveformProps> = ({ id, color, path, animated = false, animationDuration = '1.5s', animateStroke = false }) => (
    <svg width="100%" height="100%" viewBox="0 0 500 100" preserveAspectRatio="none" className={`absolute inset-0 overflow-visible ${animated ? 'waveform-animated' : ''}`}>
        <defs>
            <linearGradient id={`${id}-gradient`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={color} stopOpacity="0" />
                <stop offset="20%" stopColor={color} stopOpacity="1" />
                <stop offset="80%" stopColor={color} stopOpacity="1" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
            <filter id={`${id}-glow`}>
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
        {/* Glow path */}
         <path 
            d={path} 
            fill="none" 
            stroke={color}
            strokeWidth="5"
            strokeOpacity="0.3"
            filter={`url(#${id}-glow)`}
            style={animated ? { animationDuration } : {}}
        />
        {/* Core path */}
        <path 
            d={path} 
            fill="none" 
            stroke={`url(#${id}-gradient)`} 
            strokeWidth="1.5"
            style={animated ? { animationDuration } : {}}
            className={animateStroke ? 'animate-[dash_1s_linear_infinite]' : ''}
        />
    </svg>
);