
import React, { useMemo } from 'react';
import { PluginContainer } from '../../../components/shared/PluginContainer';
import { Knob } from '../../../components/shared/Knob';
import { MixxNebulaSettings, PluginComponentProps, AudioSignal, GlobalSettings } from '../../../types';
import { PrimeBrainStub } from '../../../lib/PrimeBrainStub';
import { VstBridge, VisualizerData } from '../../../vst/VstBridge';
import { useVstBridge } from '../../../vst/useVstBridge';

interface Cloud {
    id: number;
    left: number;
    top: number;
    width: number;
    height: number;
    opacity: number;
    duration: number;
    delay: number;
    hueOffset: number;
}

interface NebulaVisualizerData extends VisualizerData {
    clouds: Cloud[];
    baseHue: number;
}

class MixxNebulaVstBridge extends VstBridge<MixxNebulaSettings> {
    constructor(initialSettings: MixxNebulaSettings) {
        super(initialSettings);
    }

    public dspProcess(
        audioSignal: AudioSignal,
        width: number,
        height: number,
        globalSettings: GlobalSettings
    ): NebulaVisualizerData {
        const { density, drift, color, mix } = this.settings;
        
        // Map color parameter (0-100) to a hue range (e.g., 200 blue to 340 pink/red)
        const baseHue = 200 + (color / 100) * 140; 
        
        // Calculate number of visible clouds based on density
        const numClouds = 10 + Math.floor((density / 100) * 15);
        const driftFactor = Math.max(0.1, drift / 100);
        const mixFactor = mix / 100;

        // Generate cloud properties deterministically based on index so they don't jump around
        const clouds: Cloud[] = Array.from({ length: 25 }).map((_, i) => {
            const isActive = i < numClouds;
            
            // Pseudo-random numbers seeded by index
            const r1 = (Math.sin(i * 12.9898) * 43758.5453) % 1;
            const r2 = (Math.sin(i * 78.233) * 43758.5453) % 1;
            const r3 = (Math.sin(i * 123.456) * 43758.5453) % 1;

            return {
                id: i,
                left: Math.abs(r1) * 80, // Position 0-80%
                top: Math.abs(r2) * 80, // Position 0-80%
                width: 30 + Math.abs(r3) * 40, // Size 30-70%
                height: 30 + Math.abs(r1) * 40,
                // Opacity affected by density, mix, and audio level pulse
                opacity: isActive ? (0.2 + (density/100) * 0.3) * mixFactor : 0,
                // Animation speed affected by drift parameter
                duration: 10 + (1 - driftFactor) * 20 + Math.abs(r2) * 5, 
                delay: i * -2,
                hueOffset: (r3 - 0.5) * 40 // Slight color variation
            };
        });

        return { clouds, baseHue };
    }
}

const NebulaVisualizer: React.FC<{ data: NebulaVisualizerData | null }> = ({ data }) => {
    if (!data) return <div className="w-full h-full bg-black/20" />;
    const { clouds, baseHue } = data;

    return (
        <div className="relative w-full h-full rounded-lg overflow-hidden bg-black/40 border border-white/5">
            {clouds.map(cloud => (
                <div 
                    key={cloud.id}
                    className="absolute rounded-full mix-blend-screen filter blur-[30px]"
                    style={{
                        left: `${cloud.left}%`,
                        top: `${cloud.top}%`,
                        width: `${cloud.width}%`,
                        height: `${cloud.height}%`,
                        opacity: cloud.opacity,
                        backgroundColor: `hsl(${baseHue + cloud.hueOffset}, 70%, 60%)`,
                        animation: `nebula-drift ${cloud.duration}s infinite alternate ease-in-out`,
                        animationDelay: `${cloud.delay}s`
                    }}
                />
            ))}
            <style>{`
                @keyframes nebula-drift {
                    0% { transform: translate(0, 0) scale(1); }
                    100% { transform: translate(20px, -20px) scale(1.1); }
                }
            `}</style>
        </div>
    );
};

export const MixxNebula: React.FC<PluginComponentProps<MixxNebulaSettings>> = ({ 
    isDragging, isResizing, name, description, pluginState, setPluginState, isLearning, onMidiLearn, onClose, globalSettings, audioSignal
}) => {
    const { density, drift, color, mix, output } = pluginState;

    const { visualizerData } = useVstBridge(
        pluginState,
        audioSignal,
        globalSettings,
        (initialState) => new MixxNebulaVstBridge(initialState)
    );

    const handleValueChange = (param: keyof MixxNebulaSettings, value: number) => {
        setPluginState(prevState => ({ ...prevState, [param]: value }));
        PrimeBrainStub.sendEvent('parameter_change', { plugin: 'mixx-nebula', parameter: param, value });
    };

    return (
        <PluginContainer title={name} subtitle={description} isDragging={isDragging} isResizing={isResizing} onClose={onClose}>
            <div className="w-full h-full flex flex-col items-center justify-between gap-6 p-4">
                <div className="w-full flex-1">
                    <NebulaVisualizer data={visualizerData as NebulaVisualizerData | null} />
                </div>
                <div className="flex flex-wrap justify-center gap-4">
                    <Knob label="Density" value={density} setValue={(v) => handleValueChange('density', v)} paramName="density" isLearning={isLearning('density')} onMidiLearn={onMidiLearn} />
                    <Knob label="Drift" value={drift} setValue={(v) => handleValueChange('drift', v)} paramName="drift" isLearning={isLearning('drift')} onMidiLearn={onMidiLearn} />
                    <Knob label="Color" value={color} setValue={(v) => handleValueChange('color', v)} paramName="color" isLearning={isLearning('color')} onMidiLearn={onMidiLearn} />
                    <Knob label="Mix" value={mix} setValue={(v) => handleValueChange('mix', v)} paramName="mix" isLearning={isLearning('mix')} onMidiLearn={onMidiLearn} />
                    <Knob label="Output" value={output} setValue={(v) => handleValueChange('output', v)} paramName="output" isLearning={isLearning('output')} onMidiLearn={onMidiLearn} />
                </div>
            </div>
        </PluginContainer>
    );
};
