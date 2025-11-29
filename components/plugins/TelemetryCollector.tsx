import React, { useState, useEffect, useRef } from 'react';
import { PluginContainer } from '../shared/PluginContainer';
import { TelemetryCollectorSettings, PluginComponentProps } from '../../types';
import { motion, AnimatePresence } from 'framer-motion';
import { PrimeBrainStub } from '../../lib/PrimeBrainStub';
import { mapRange } from '../../lib/utils';

const Heartbeat: React.FC<{ isSpiking: boolean, globalSettings: PluginComponentProps['globalSettings'] }> = ({ isSpiking, globalSettings }) => {
    const animationSpeedMultiplier = mapRange(globalSettings.animationIntensity, 0, 100, 1.5, 0.5);

    return (
    <div className="relative w-full h-full flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden">
            {Array.from({length: 20}).map((_, i) => (
                <div key={i} className="absolute w-px h-2 bg-white/50 rounded-full" style={{
                    left: `${Math.random() * 100}%`,
                    animation: `data-stream ${2 + Math.random() * 3}s linear infinite`,
                    animationDelay: `${Math.random() * 5}s`,
                }}/>
            ))}
        </div>

        <svg viewBox="0 0 100 100" className="w-1/2 h-1/2 overflow-visible relative">
            <motion.path 
                d="M 10 50 L 30 50 L 35 40 L 45 60 L 55 30 L 65 50 L 90 50"
                stroke="rgba(255,255,255,0.8)"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="animate-[energy-pulse]"
                style={{
                    animationDuration: `${1.5 * animationSpeedMultiplier}s`,
                    animationTimingFunction: 'ease-in-out',
                    animationIterationCount: 'infinite',
                    strokeDasharray: 1000,
                    strokeDashoffset: 1000,
                    filter: 'drop-shadow(0 0 5px white)'
                }}
                animate={{ scale: isSpiking ? 1.2 : 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 10 }}
            />
        </svg>
    </div>
    )
};

export const TelemetryCollector: React.FC<PluginComponentProps<TelemetryCollectorSettings>> = ({ 
    isDragging, isResizing, name, description, onClose, globalSettings
}) => {
    const [events, setEvents] = useState<{ id: number; text: string; }[]>([]);
    const [isSpiking, setIsSpiking] = useState(false);
    const spikeTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        const handleEvent = (payload: any) => {
            if (!payload.plugin || !payload.parameter) return;
            const text = `[PARAM] ${payload.plugin}.${payload.parameter} -> ${typeof payload.value === 'number' ? payload.value.toFixed(2) : payload.value}`;
            setEvents(prev => [{id: Date.now() + Math.random(), text }, ...prev].slice(0, 50));

            setIsSpiking(true);
            if (spikeTimeoutRef.current) clearTimeout(spikeTimeoutRef.current);
            spikeTimeoutRef.current = window.setTimeout(() => setIsSpiking(false), 200);
        };
        
        const unsubscribe = PrimeBrainStub.subscribe('parameter_change', handleEvent);
        
        return () => {
            unsubscribe();
            if (spikeTimeoutRef.current) clearTimeout(spikeTimeoutRef.current);
        };
    }, []);

    return (
        <PluginContainer title={name} subtitle={description} isDragging={isDragging} isResizing={isResizing} onClose={onClose}>
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                <div className="w-full h-32">
                    <Heartbeat isSpiking={isSpiking} globalSettings={globalSettings} />
                </div>
                <div className="w-full flex-1 mt-4 bg-black/30 border border-white/10 rounded-lg p-2 font-mono text-xs text-left text-green-400 overflow-hidden">
                    <div className="h-full overflow-y-auto custom-scrollbar">
                        <ul>
                        <AnimatePresence initial={false}>
                            {events.map((event) => (
                                <motion.li
                                    key={event.id}
                                    layout
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 0.7, y: 0 }}
                                    exit={{ opacity: 0 }}
                                >
                                    {event.text}
                                </motion.li>
                            ))}
                        </AnimatePresence>
                        </ul>
                    </div>
                </div>
            </div>
        </PluginContainer>
    );
};
