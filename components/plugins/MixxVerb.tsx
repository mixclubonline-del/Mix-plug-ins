
import React, { useMemo } from 'react';
import { PluginContainer } from '../shared/PluginContainer';
import { Knob } from '../shared/Knob';
import { MixxVerbSettings, PluginComponentProps, AudioSignal, GlobalSettings } from '../../types';
import { PrimeBrainStub } from '../../lib/PrimeBrainStub';
import { mapRange } from '../../lib/utils';
import { VstBridge, VisualizerData } from '../../vst/VstBridge';
import { useVstBridge } from '../../vst/useVstBridge';

// --- VST Architecture ---

interface Particle {
    id: number;
    angle: number;
    distance: number;
    size: number;
    opacity: number;
    duration: number;
    delay: number;
    color: string;
    spawnTime: number;
}

interface VerbVisualizerData extends VisualizerData {
    particles: Particle[];
    isPulsing: boolean;
}

class MixxVerbVstBridge extends VstBridge<MixxVerbSettings> {
    private particles: Particle[] = [];
    private particleIdCounter: number = 0;
    private lastBurstTime: number = 0;
    private isPulsing: boolean = false;
    private pulseTimeout: any = null;

    // FIX: Convert dspProcess to an arrow function to bind 'this' context correctly.
    public dspProcess = (
        audioSignal: AudioSignal,
        width: number,
        height: number,
        globalSettings: GlobalSettings
    ): VerbVisualizerData => {
        const { size, predelay, mix } = this.settings;
        const now = audioSignal.time;

        // Simulate interval for bursts
        if (now - this.lastBurstTime > 2) {
            this.lastBurstTime = now;
            
            const baseParticleCount = (globalSettings.visualizerComplexity === 'low' ? 5 : 10);
            const particleDensityMultiplier = (globalSettings.visualizerComplexity === 'low' ? 20 : 40);
            const normalizedMix = mix / 100;

            if (normalizedMix > 0.01) {
                this.isPulsing = true;
                if (this.pulseTimeout) clearTimeout(this.pulseTimeout);
                this.pulseTimeout = setTimeout(() => { this.isPulsing = false; }, predelay + 500);

                const particleCount = baseParticleCount + Math.round(size / 100 * particleDensityMultiplier);
                const newParticles: Particle[] = Array.from({ length: particleCount }).map(() => {
                    const lifetime = 2 + (size / 100) * 8;
                    const perspective = Math.random();
                    this.particleIdCounter++;
                    
                    return {
                        id: this.particleIdCounter,
                        angle: Math.random() * 360,
                        distance: 10 + Math.random() * 40 * perspective * (1 + size / 100),
                        size: (1 + perspective * 3) * (5 + Math.random() * 5),
                        opacity: (0.1 + perspective * 0.4) * normalizedMix,
                        duration: lifetime * (0.8 + Math.random() * 0.4),
                        delay: predelay / 1000,
                        color: `hsl(${180 + perspective * 90}, 80%, 70%)`,
                        spawnTime: now,
                    };
                });
                this.particles.push(...newParticles);
                if(this.particles.length > 200) this.particles.splice(0, this.particles.length - 200);
            }
        }
        
        // Particle lifetime management
        this.particles = this.particles.filter(p => now < p.spawnTime + p.delay + p.duration);
        
        return {
            particles: [...this.particles],
            isPulsing: this.isPulsing,
        };
    }
}

// --- UI Components ---

const ParticleField: React.FC<{ visualizerData: VerbVisualizerData | null, globalSettings: GlobalSettings }> = 
({ visualizerData, globalSettings }) => {
    
    const animationSpeedMultiplier = mapRange(globalSettings.animationIntensity, 0, 100, 1.5, 0.5);

    const particles = visualizerData?.particles ?? [];
    const isPulsing = visualizerData?.isPulsing ?? false;
    const predelay = visualizerData ? (visualizerData.particles[0]?.delay ?? 0) * 1000 : 0;

    return (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden [perspective:800px]">
            {isPulsing && (
                <div 
                    className="absolute w-4 h-4 rounded-full bg-cyan-400"
                    style={{
                        animation: `reverb-core-pulse ${predelay + 500}ms ease-out`,
                        opacity: 0,
                    }}
                />
            )}

            {particles.map((p: Particle) => (
                <div
                    key={p.id}
                    className="absolute rounded-full"
                    style={{
                        width: p.size,
                        height: p.size,
                        top: '50%',
                        left: '50%',
                        backgroundColor: p.color,
                        opacity: 0,
                        animation: `reverb-particle ${p.duration * animationSpeedMultiplier}s ${p.delay}s forwards ease-out`,
                        '--angle': `${p.angle}deg`,
                        '--distance': `${p.distance}%`,
                        '--opacity': p.opacity
                    } as React.CSSProperties}
                />
            ))}
             <style>{`
                @keyframes reverb-particle {
                    0% { transform: translate(-50%, -50%) rotate(var(--angle)) translateY(0) scale(0); opacity: var(--opacity); }
                    70% { opacity: calc(var(--opacity) * 0.3); }
                    100% { transform: translate(-50%, -50%) rotate(var(--angle)) translateY(var(--distance)) scale(1.5); opacity: 0; }
                }
                @keyframes reverb-core-pulse {
                    0% { transform: scale(0); opacity: 0.8; }
                    100% { transform: scale(2); opacity: 0; }
                }
            `}</style>
        </div>
    );
};


export const MixxVerb: React.FC<PluginComponentProps<MixxVerbSettings>> = ({ 
  isDragging, isResizing, name, description, pluginState, setPluginState, isLearning, onMidiLearn, onClose, globalSettings, audioSignal
}) => {
    const { size, predelay, mix, output } = pluginState; 

    const { visualizerData } = useVstBridge(
        pluginState,
        audioSignal,
        globalSettings,
        (initialState) => new MixxVerbVstBridge(initialState)
    );

    const handleValueChange = (param: keyof MixxVerbSettings, value: number) => {
        // FIX: Use a functional update for setPluginState to ensure type correctness and prevent race conditions.
        setPluginState(prevState => ({ ...prevState, [param]: value }));
        PrimeBrainStub.sendEvent('parameter_change', { plugin: 'mixx-verb', parameter: param, value });
    };

    return (
        <PluginContainer title={name} subtitle={description} isDragging={isDragging} isResizing={isResizing} onClose={onClose}>
            <div className="w-full h-full flex flex-col items-center justify-between gap-6 p-4">
                <div className="relative flex-1 w-full flex items-center justify-center bg-black/20 rounded-lg border border-cyan-400/20">
                    <ParticleField visualizerData={visualizerData as VerbVisualizerData | null} globalSettings={globalSettings} />
                     <div className="absolute font-orbitron text-cyan-200/50 text-4xl font-bold select-none">{size.toFixed(0)}m</div>
                </div>

                <div className="flex flex-wrap justify-center gap-4">
                    <Knob label="Size" value={size} setValue={(v) => handleValueChange('size', v)} paramName="size" isLearning={isLearning('size')} onMidiLearn={onMidiLearn} />
                    <Knob label="Pre-Delay" value={predelay} setValue={(v) => handleValueChange('predelay', v)} min={0} max={150} step={1} paramName="predelay" isLearning={isLearning('predelay')} onMidiLearn={onMidiLearn} />
                    <Knob label="Mix" value={mix} setValue={(v) => handleValueChange('mix', v)} paramName="mix" isLearning={isLearning('mix')} onMidiLearn={onMidiLearn} />
                    <Knob label="Output" value={output} setValue={(v) => handleValueChange('output', v)} paramName="output" isLearning={isLearning('output')} onMidiLearn={onMidiLearn} />
                </div>
            </div>
        </PluginContainer>
    );
};
