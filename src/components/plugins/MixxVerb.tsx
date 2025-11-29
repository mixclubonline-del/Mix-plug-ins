
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
    x: number; // -1 to 1
    y: number; // -1 to 1
    z: number; // 0 to 1 (depth)
    opacity: number;
    size: number;
    spawnTime: number;
    life: number;
    color: string;
}

interface VerbVisualizerData extends VisualizerData {
    particles: Particle[];
    isPulsing: boolean;
}

class MixxVerbVstBridge extends VstBridge<MixxVerbSettings> {
    private particles: Particle[] = [];
    private particleIdCounter: number = 0;
    private isPulsing: boolean = false;
    private pulseTimeout: any = null;
    private lastTransientTime: number = 0;

    constructor(initialSettings: MixxVerbSettings) {
        super(initialSettings);
    }

    public dspProcess(
        audioSignal: AudioSignal,
        width: number,
        height: number,
        globalSettings: GlobalSettings,
        extraData?: Record<string, any>
    ): VerbVisualizerData {
        const { size, predelay, mix } = this.settings;
        const now = audioSignal.time;
        const mood = extraData?.mood || 'Neutral';

        const animationSpeedMultiplier = mapRange(globalSettings.animationIntensity, 0, 100, 1, 0.25);
        const depthSpeed = 0.005 * animationSpeedMultiplier;

        // Dynamic Hue based on Mood
        const moodHueMap: Record<string, number> = {
            'Warm': 40, 'Bright': 190, 'Dark': 270, 'Energetic': 320, 'Neutral': 195 
        };
        const baseHue = moodHueMap[mood as string] || 195;

        // Spawn new particles on transients
        if (audioSignal.transients && (now > this.lastTransientTime + 0.1)) {
            this.lastTransientTime = now;
            
            const normalizedMix = mix / 100;
            if (normalizedMix > 0.01) {
                this.isPulsing = true;
                if (this.pulseTimeout) clearTimeout(this.pulseTimeout);
                this.pulseTimeout = setTimeout(() => { this.isPulsing = false; }, 100);

                setTimeout(() => {
                    const particleCount = (globalSettings.visualizerComplexity === 'low' ? 10 : 20) + Math.round(normalizedMix * (globalSettings.visualizerComplexity === 'low' ? 30 : 60));
                    const newParticles: Particle[] = Array.from({ length: particleCount }).map(() => {
                        this.particleIdCounter++;
                        const variation = Math.random() * 60 - 30;
                        return {
                            id: this.particleIdCounter,
                            x: (Math.random() - 0.5) * 0.1, // Start near center
                            y: (Math.random() - 0.5) * 0.1,
                            z: 0,
                            opacity: 0.5 + Math.random() * 0.5,
                            size: 1 + Math.random() * 3,
                            spawnTime: now,
                            life: 0.5 + (size / 100) * 1.5, // Lifetime based on size
                            color: `hsla(${baseHue + variation}, 100%, 60%, 1)`
                        };
                    });
                    this.particles.push(...newParticles);
                    // Cap particles to prevent performance issues
                    if(this.particles.length > 300) this.particles.splice(0, this.particles.length - 300);
                }, predelay);
            }
        }
        
        // Update and filter particles
        this.particles = this.particles.map(p => {
            const newZ = p.z + depthSpeed;
            const lifeLeft = 1 - (newZ / p.life);
            return {
                ...p,
                z: newZ,
                x: p.x + (Math.random() - 0.5) * 0.01, // slow drift
                y: p.y + (Math.random() - 0.5) * 0.01,
                opacity: (0.5 + Math.random() * 0.5) * lifeLeft, // fade out
            };
        }).filter(p => p.z < p.life && p.opacity > 0.01);
        
        return {
            particles: [...this.particles],
            isPulsing: this.isPulsing,
        };
    }
}

// --- UI Components ---

const ReverbSpaceVisualizer: React.FC<{ visualizerData: VerbVisualizerData | null, globalSettings: GlobalSettings }> = 
({ visualizerData, globalSettings }) => {
    
    const particles = visualizerData?.particles ?? [];
    const isPulsing = visualizerData?.isPulsing ?? false;

    const perspective = 500;

    return (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden" style={{ perspective: `${perspective}px` }}>
            {/* Background Grid */}
            <div className="absolute w-[300%] h-[300%] bg-transparent" style={{
                backgroundImage: 'linear-gradient(rgba(0,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: '50px 50px',
                transform: `translateZ(-${perspective * 0.8}px) rotateX(75deg)`,
            }} />

            {isPulsing && (
                <div 
                    className="absolute w-2 h-2 rounded-full bg-cyan-200"
                    style={{
                        animation: `reverb-core-pulse 0.2s ease-out`,
                        boxShadow: '0 0 20px 10px rgba(0, 255, 255, 0.5)',
                        opacity: 0,
                    }}
                />
            )}
            
            <div className="absolute w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
                {particles.map((p: Particle) => {
                    const zPos = p.z * (perspective * 0.7);
                    const scale = 1 / (1 + zPos / perspective);

                    return (
                        <div
                            key={p.id}
                            className="absolute rounded-full"
                            style={{
                                width: p.size * scale,
                                height: p.size * scale,
                                top: '50%',
                                left: '50%',
                                backgroundColor: p.color,
                                opacity: p.opacity,
                                transform: `translateX(-50%) translateY(-50%) translateX(${p.x * perspective}px) translateY(${p.y * perspective}px) translateZ(-${zPos}px)`,
                                transition: 'opacity 0.1s linear'
                            }}
                        />
                    );
                })}
            </div>

             <style>{`
                @keyframes reverb-core-pulse {
                    0% { transform: scale(0); opacity: 1; }
                    100% { transform: scale(5); opacity: 0; }
                }
            `}</style>
        </div>
    );
};


export const MixxVerb: React.FC<PluginComponentProps<MixxVerbSettings>> = ({ 
  isDragging, isResizing, name, description, pluginState, setPluginState, isLearning, onMidiLearn, onClose, globalSettings, audioSignal, sessionContext
}) => {
    const { size, predelay, mix, output } = pluginState; 

    const { visualizerData } = useVstBridge(
        pluginState,
        audioSignal,
        globalSettings,
        (initialState) => new MixxVerbVstBridge(initialState),
        { mood: sessionContext.mood }
    );

    const handleValueChange = (param: keyof MixxVerbSettings, value: number) => {
        setPluginState(prevState => ({ ...prevState, [param]: value }));
        PrimeBrainStub.sendEvent('parameter_change', { plugin: 'mixx-verb', parameter: param, value });
    };

    return (
        <PluginContainer title={name} subtitle={description} isDragging={isDragging} isResizing={isResizing} onClose={onClose}>
            <div className="w-full h-full flex flex-col items-center justify-between gap-6 p-4">
                <div className="relative flex-1 w-full flex items-center justify-center bg-black/20 rounded-lg border border-cyan-400/20 overflow-hidden">
                    <ReverbSpaceVisualizer visualizerData={visualizerData as VerbVisualizerData | null} globalSettings={globalSettings} />
                     <div className="absolute font-orbitron text-cyan-200/50 text-4xl font-bold select-none pointer-events-none">{size.toFixed(0)}m</div>
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
