
import React, { useState, useEffect } from 'react';
import { PluginContainer } from '../shared/PluginContainer';
import { Knob } from '../shared/Knob';
import { MixxPortSettings, PluginComponentProps } from '../../types';
import { PrimeBrainStub } from '../../lib/PrimeBrainStub';
import { SegmentedControl } from '../shared/SegmentedControl'; // Import shared SegmentedControl


const RenderVisualizer: React.FC<{ progress: number, isRendering: boolean, isComplete: boolean }> = ({ progress, isRendering, isComplete }) => {
    const size = 150;
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative flex flex-col items-center justify-center h-48">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={`transition-transform duration-300 ${isComplete ? 'animate-[render-complete-flash_0.5s]' : ''}`}>
                 {/* Background track */}
                <circle
                    stroke="rgba(167, 139, 250, 0.1)"
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    r={radius}
                    cx={size/2}
                    cy={size/2}
                />
                 {/* Progress ring */}
                <circle
                    stroke="url(#render-gradient)"
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    r={radius}
                    cx={size/2}
                    cy={size/2}
                    transform={`rotate(-90 ${size/2} ${size/2})`}
                    style={{
                        transition: 'stroke-dashoffset 0.1s linear',
                        filter: 'drop-shadow(0 0 10px rgba(167, 139, 250, 0.7))'
                    }}
                />
                 <defs>
                    <linearGradient id="render-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#a78bfa" />
                        <stop offset="100%" stopColor="#7c3aed" />
                    </linearGradient>
                </defs>
            </svg>
            {isRendering && Array.from({length: 20}).map((_, i) => (
                <div key={i} className="absolute w-1 h-1 bg-white rounded-full" style={{
                    animation: `data-particle ${1 + Math.random()}s infinite linear`,
                    animationDelay: `${Math.random()}s`,
                    '--angle': `${Math.random() * 360}deg`,
                } as React.CSSProperties} />
            ))}
            <style>{`
                @keyframes data-particle {
                    0% { transform: rotate(var(--angle)) translateY(0) scale(0); opacity: 1; }
                    100% { transform: rotate(var(--angle)) translateY(${radius}px) scale(1); opacity: 0; }
                }
            `}</style>
             <div className="absolute font-orbitron text-2xl text-violet-200">{Math.round(progress)}%</div>
        </div>
    );
}

export const MixxPort: React.FC<PluginComponentProps<MixxPortSettings>> = ({ 
    isDragging, isResizing, name, description, pluginState, setPluginState, isLearning, onMidiLearn, onClose
}) => {
    const { format, quality, mix, output } = pluginState; // Destructure mix

    const [isRendering, setIsRendering] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleValueChange = (param: keyof MixxPortSettings, value: number | string) => {
        // FIX: Use a functional update for setPluginState to ensure type correctness and prevent race conditions.
        setPluginState(prevState => ({ ...prevState, [param]: value }));
        PrimeBrainStub.sendEvent('parameter_change', { plugin: 'mixx-port', parameter: param, value });
    };

    const startRender = () => {
        if (isRendering) return;
        setIsRendering(true);
        setProgress(0);
        PrimeBrainStub.sendEvent('export_started', { format, quality });

        const interval = setInterval(() => {
            setProgress(prev => {
                const next = prev + Math.random() * 5;
                if (next >= 100) {
                    clearInterval(interval);
                    setIsRendering(false);
                    PrimeBrainStub.sendEvent('export_finished', { format, quality });
                    return 100;
                }
                return next;
            });
        }, 100);
    };

    const isComplete = progress === 100;

    return (
        <PluginContainer title={name} subtitle={description} isDragging={isDragging} isResizing={isResizing} onClose={onClose}>
            <div className="w-full h-full flex flex-col items-center justify-center gap-8 p-4">
                <RenderVisualizer progress={progress} isRendering={isRendering} isComplete={isComplete} />

                <div className="flex flex-wrap justify-center items-center gap-4">
                    <SegmentedControl label="Format" options={['wav', 'mp3', 'mixx']} value={format} onChange={(v) => handleValueChange('format', v)} tierColor="violet" />
                    <Knob label="Quality" value={quality} setValue={(v) => handleValueChange('quality', v)} paramName="quality" isLearning={isLearning('quality')} onMidiLearn={onMidiLearn} />
                    <Knob label="Mix" value={mix} setValue={(v) => handleValueChange('mix', v)} paramName="mix" isLearning={isLearning('mix')} onMidiLearn={onMidiLearn} /> {/* Add Mix knob */}
                    <Knob label="Output" value={output} setValue={(v) => handleValueChange('output', v)} paramName="output" isLearning={isLearning('output')} onMidiLearn={onMidiLearn} />
                </div>
                
                <button 
                    onClick={startRender} 
                    disabled={isRendering}
                    className={`px-8 py-4 w-48 rounded-lg text-white font-bold text-lg transition-all disabled:opacity-50 group
                                ${isComplete ? 'bg-green-600/50' : 'bg-violet-600/50 hover:bg-violet-600/70'}
                                ${isRendering ? '' : 'group-hover:scale-105 group-hover:shadow-[0_0_15px_rgba(139,92,246,0.5)]'}
                                `}
                >
                    {isRendering ? `RENDERING` : (isComplete ? 'EXPORTED' : 'EXPORT')}
                </button>
            </div>
        </PluginContainer>
    );
};
