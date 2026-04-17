
import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { PluginContainer } from '../shared/PluginContainer';
import { Knob } from '../shared/Knob';
import { MixxVerbSettings, PluginComponentProps, AudioSignal, GlobalSettings } from '../../types';
import { PrimeBrainStub } from '../../lib/PrimeBrainStub';
import { mapRange, getMoodHue } from '../../lib/utils';
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
    decayCurve: string;
    hue: number;
}

class MixxVerbVstBridge extends VstBridge<MixxVerbSettings> {
    private particles: Particle[] = [];
    private particleIdCounter: number = 0;
    private lastBurstTime: number = 0;
    private isPulsing: boolean = false;
    private pulseTimeout: any = null;

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
        const targetHue = getMoodHue(mood as import('../../types').Mood);

        // Audio-reactive trigger logic
        // Trigger on transients, or occasionally during loud segments, or fallback timer
        const isTransient = audioSignal.transients;
        const isLoud = audioSignal.level > 20;
        const timeSinceLast = now - this.lastBurstTime;
        
        const shouldTrigger = (isTransient && timeSinceLast > 0.15) || 
                              (isLoud && Math.random() > 0.92 && timeSinceLast > 0.3) ||
                              (timeSinceLast > 3); // Keep alive pulse

        if (shouldTrigger) {
            this.lastBurstTime = now;
            
            const baseParticleCount = (globalSettings.visualizerComplexity === 'low' ? 3 : 8);
            const particleDensityMultiplier = (globalSettings.visualizerComplexity === 'low' ? 10 : 25);
            const normalizedMix = mix / 100;

            if (normalizedMix > 0.01) {
                this.isPulsing = true;
                if (this.pulseTimeout) clearTimeout(this.pulseTimeout);
                this.pulseTimeout = setTimeout(() => { this.isPulsing = false; }, predelay + 300);

                // Scale particle count by audio level for more dynamic feel
                const levelScale = Math.max(0.5, audioSignal.level / 80);
                const particleCount = Math.round((baseParticleCount + (size / 100 * particleDensityMultiplier)) * levelScale);
                
                const newParticles: Particle[] = Array.from({ length: particleCount }).map(() => {
                    const lifetime = 1.5 + (size / 100) * 4; // Longer tails for larger size
                    const perspective = Math.random();
                    this.particleIdCounter++;
                    
                    // Color shifts based on size (Blue/Cyan for small, Pink/Purple for large/long)
                    const hue = (targetHue + Math.random() * 60 - 30) % 360;
                    
                    return {
                        id: this.particleIdCounter,
                        angle: Math.random() * 360,
                        distance: 20 + Math.random() * 50 * perspective * (1 + size / 100),
                        size: (1 + perspective * 3) * (2 + Math.random() * 4),
                        opacity: (0.3 + perspective * 0.7) * normalizedMix * (audioSignal.level/100),
                        duration: lifetime * (0.8 + Math.random() * 0.4),
                        delay: predelay / 1000, // ms to s
                        color: `hsla(${hue}, 80%, 70%, 0.8)`,
                        spawnTime: now,
                    };
                });
                this.particles.push(...newParticles);
                if(this.particles.length > 200) this.particles.splice(0, this.particles.length - 200);
            }
        }
        
        // Particle lifetime management
        this.particles = this.particles.filter(p => now < p.spawnTime + p.delay + p.duration);

        // Generate decay curve path for background visualizer
        const decayPoints = [];
        const steps = 40;
        // Simple exponential decay model simulation
        // Size 0 -> Fast decay (low tau), Size 100 -> Slow decay (high tau)
        const tau = 0.5 + (size / 100) * 2.0; 
        
        for(let i=0; i<=steps; i++) {
            const t = i/steps; // 0 to 1
            const amp = Math.exp(-t * 5 / tau); 
            const x = t * 100;
            const y = (1 - amp) * 100; // 0 is top (max amp), 100 is bottom (0 amp)
            decayPoints.push(`${x.toFixed(1)},${y.toFixed(1)}`);
        }
        const decayCurve = `M 0,100 L 0,0 L ${decayPoints.join(' L ')} L 100,100 Z`;
        
        return {
            particles: [...this.particles],
            isPulsing: this.isPulsing,
            decayCurve,
            hue: targetHue,
        };
    }
}

// --- UI Components ---

const ReverbSpaceVisualizer: React.FC<{ visualizerData: VerbVisualizerData | null, globalSettings: GlobalSettings }> = 
({ visualizerData, globalSettings }) => {
    
    const animationSpeedMultiplier = mapRange(globalSettings.animationIntensity, 0, 100, 1.5, 0.5);

    const particles = visualizerData?.particles ?? [];
    const isPulsing = visualizerData?.isPulsing ?? false;
    const predelay = visualizerData && visualizerData.particles.length > 0 ? (visualizerData.particles[visualizerData.particles.length-1]?.delay ?? 0) * 1000 : 0;
    const decayCurve = visualizerData?.decayCurve;

    return (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden [perspective:800px]">
            {/* Background Decay Curve */}
            {decayCurve && (
                <motion.svg 
                    animate={{ scaleY: [1, 0.5, 0], opacity: [0.3, 0.1, 0] }}
                    transition={{ duration: 1.5, ease: "linear", repeat: Infinity }}
                    className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" 
                    preserveAspectRatio="none" 
                    viewBox="0 0 100 100"
                >
                    <defs>
                        <linearGradient id="verb-decay-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={`hsl(${visualizerData?.hue || 200}, 80%, 50%)`} stopOpacity="0.3" />
                            <stop offset="100%" stopColor={`hsl(${visualizerData?.hue || 200}, 80%, 50%)`} stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <path d={decayCurve} fill="url(#verb-decay-grad)" stroke={`hsl(${visualizerData?.hue || 200}, 80%, 50%)`} strokeWidth="0.5" />
                </motion.svg>
            )}

            {isPulsing && (
                <div 
                    className="absolute w-8 h-8 rounded-full"
                    style={{
                        backgroundColor: `hsl(${visualizerData?.hue || 200}, 80%, 50%)`,
                        animation: `reverb-core-pulse ${300}ms ease-out`,
                        opacity: 0,
                        filter: 'blur(4px)'
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
                        boxShadow: `0 0 ${p.size}px ${p.color}`,
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
                    10% { opacity: var(--opacity); }
                    100% { transform: translate(-50%, -50%) rotate(var(--angle)) translateY(var(--distance)) scale(0); opacity: 0; }
                }
                @keyframes reverb-core-pulse {
                    0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.8; }
                    100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
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
        // FIX: Use a functional update for setPluginState to ensure type correctness and prevent race conditions.
        setPluginState(prevState => ({ ...prevState, [param]: value }));
        PrimeBrainStub.sendEvent('parameter_change', { plugin: 'mixx-verb', parameter: param, value });
    };

    return (
        <PluginContainer title={name} subtitle={description} isDragging={isDragging} isResizing={isResizing} onClose={onClose}>
            <div className="w-full h-full flex flex-col items-center justify-between gap-6 p-4">
                <div className="relative flex-1 w-full flex items-center justify-center bg-black/40 rounded-lg border border-cyan-400/20 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                    <ReverbSpaceVisualizer visualizerData={visualizerData as VerbVisualizerData | null} globalSettings={globalSettings} />
                     <div className="absolute font-orbitron text-cyan-200/20 text-5xl font-bold select-none pointer-events-none mix-blend-overlay">{size.toFixed(0)}m</div>
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
