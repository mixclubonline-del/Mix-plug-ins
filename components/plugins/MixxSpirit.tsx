

import React from 'react';
import { PluginContainer } from '../shared/PluginContainer';
import { Knob } from '../shared/Knob';
import { MixxSpiritSettings, PluginComponentProps, AudioSignal, GlobalSettings } from '../../types';
import { PrimeBrainStub } from '../../lib/PrimeBrainStub';
import { mapRange } from '../../lib/utils';
import { VstBridge, VisualizerData } from '../../vst/VstBridge';
import { useVstBridge } from '../../vst/useVstBridge';

// --- VST Architecture ---

interface SpiritParticle {
    id: number;
    left: string;
    top: string;
    background: string;
    transform: string;
    opacity: number;
    transition: string;
}

interface SpiritVisualizerData extends VisualizerData {
    strobeOpacity: number;
    particles: SpiritParticle[];
    energyLevel: number;
    thresholdLevel: number;
    animationSpeedMultiplier: number;
}

class MixxSpiritVstBridge extends VstBridge<MixxSpiritSettings> {
    private energy: number = 0;
    private particleIdCounter: number = 0;
    private currentParticles: SpiritParticle[] = [];

    // FIX: Convert dspProcess to an arrow function to bind 'this' context correctly.
    public dspProcess = (
        audioSignal: AudioSignal,
        width: number,
        height: number,
        globalSettings: GlobalSettings
    ): SpiritVisualizerData => {
        const { sensitivity, energyLink, threshold } = this.settings;
        
        // Simulate energy surges (based on audio level and energyLink)
        const audioInfluence = audioSignal.level / 100 * (energyLink / 100);
        const randomSurge = Math.pow(Math.random(), 4) * (energyLink / 100 * 50);
        this.energy = Math.min(100, this.energy * 0.95 + audioInfluence * 10 + randomSurge); // Decay and surge
        
        const isAboveThreshold = this.energy > threshold;
        const strobeOpacity = isAboveThreshold ? 0.05 + (sensitivity / 100) * 0.2 * (this.energy / 100) : 0;
        const numParticles = globalSettings.visualizerComplexity === 'low' ? 25 : 50;
        const animationSpeedMultiplier = mapRange(globalSettings.animationIntensity, 0, 100, 1.5, 0.5);

        // Particle generation and lifecycle
        // Generate new particles if energy is high or randomly
        if (this.energy > 30 && Math.random() < 0.1 * animationSpeedMultiplier) {
            this.particleIdCounter++;
            this.currentParticles.push({
                id: this.particleIdCounter,
                left: `${Math.random() * 100}%`,
                top: `${50 + Math.random() * 50}%`, // Start in lower half
                background: `hsl(${180 + Math.random() * 180}, 90%, 70%)`,
                transform: `scale(0)`, // Initial scale
                opacity: 0,
                transition: `all ${0.2 * animationSpeedMultiplier}s ease-out`
            });
        }

        // Update existing particles and remove old ones
        this.currentParticles = this.currentParticles.map(p => {
            const newOpacity = mapRange(this.energy, 0, 100, 0.1, 0.7);
            const newTransform = `scale(${mapRange(this.energy, 0, 100, 0.5, 3) * animationSpeedMultiplier})`;
            return {
                ...p,
                opacity: newOpacity,
                transform: newTransform,
                transition: `all ${0.2 * animationSpeedMultiplier}s ease-out`
            };
        }).filter(p => p.opacity > 0.01); // Simple fade out

        // Keep a reasonable number of particles
        if (this.currentParticles.length > numParticles * 2) {
            this.currentParticles.splice(0, this.currentParticles.length - numParticles);
        }
        
        return {
            strobeOpacity,
            particles: [...this.currentParticles], // Return a copy
            energyLevel: this.energy,
            thresholdLevel: threshold,
            animationSpeedMultiplier,
        };
    }
}


// --- UI Components ---

const SpiritVisualizer: React.FC<{ visualizerData: SpiritVisualizerData | null }> = 
({ visualizerData }) => {
    if (!visualizerData) return <div className="relative w-full h-full" />;

    const { strobeOpacity, particles, energyLevel, thresholdLevel, animationSpeedMultiplier } = visualizerData;
    
    return (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            <div 
                className="absolute inset-0 bg-white transition-opacity duration-100 pointer-events-none"
                style={{ opacity: strobeOpacity }}
            />
            {particles.map((p) => (
                <div key={p.id} className="absolute w-1 h-1 rounded-full" style={{
                    left: p.left,
                    top: p.top, // Use dynamic top
                    background: p.background,
                    transform: p.transform, // Use transform from DSP data
                    opacity: p.opacity, // Use opacity from DSP data
                    transition: p.transition,
                }}/>
            ))}
            <div className="absolute bottom-4 w-3/4 h-4 bg-black/30 rounded-full border border-white/10">
                <div className="h-full bg-gradient-to-r from-cyan-400 to-pink-500 rounded-full" style={{ width: `${energyLevel}%` }} />
                <div className="absolute top-0 h-full w-px bg-white" style={{ left: `${thresholdLevel}%` }} />
            </div>
        </div>
    );
};

export const MixxSpirit: React.FC<PluginComponentProps<MixxSpiritSettings>> = ({ 
    isDragging, isResizing, name, description, pluginState, setPluginState, isLearning, onMidiLearn, onClose, globalSettings, audioSignal
}) => {
    const { sensitivity, energyLink, threshold, mix, output } = pluginState;

    // Use the generic VST bridge hook
    const { visualizerData } = useVstBridge(
        pluginState,
        audioSignal,
        globalSettings,
        (initialState) => new MixxSpiritVstBridge(initialState)
    );

    const handleValueChange = (param: keyof MixxSpiritSettings, value: number) => {
        // FIX: Use a functional update for setPluginState to ensure type correctness and prevent race conditions.
        setPluginState(prevState => ({ ...prevState, [param]: value }));
        PrimeBrainStub.sendEvent('parameter_change', { plugin: 'mixx-spirit', parameter: param, value });
    };

    return (
        <PluginContainer title={name} subtitle={description} isDragging={isDragging} isResizing={isResizing} onClose={onClose}>
            <div className="w-full h-full flex flex-col items-center justify-between gap-6 p-4">
                <div className="w-full flex-1 rounded-lg border border-white/10 bg-black/20">
                    <SpiritVisualizer visualizerData={visualizerData as SpiritVisualizerData | null} />
                </div>
                <div className="flex flex-wrap justify-center gap-4">
                    <Knob label="Sensitivity" value={sensitivity} setValue={(v) => handleValueChange('sensitivity', v)} paramName="sensitivity" isLearning={isLearning('sensitivity')} onMidiLearn={onMidiLearn} />
                    <Knob label="Energy Link" value={energyLink} setValue={(v) => handleValueChange('energyLink', v)} paramName="energyLink" isLearning={isLearning('energyLink')} onMidiLearn={onMidiLearn} />
                    <Knob label="Threshold" value={threshold} setValue={(v) => handleValueChange('threshold', v)} paramName="threshold" isLearning={isLearning('threshold')} onMidiLearn={onMidiLearn} />
                    <Knob label="Mix" value={mix} setValue={(v) => handleValueChange('mix', v)} paramName="mix" isLearning={isLearning('mix')} onMidiLearn={onMidiLearn} />
                    <Knob label="Output" value={output} setValue={(v) => handleValueChange('output', v)} paramName="output" isLearning={isLearning('output')} onMidiLearn={onMidiLearn} />
                </div>
            </div>
        </PluginContainer>
    );
};
