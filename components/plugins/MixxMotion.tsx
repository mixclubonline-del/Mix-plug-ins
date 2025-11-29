
import React, { useMemo } from 'react';
import { PluginContainer } from '../shared/PluginContainer';
import { Knob } from '../shared/Knob';
import { MixxMotionSettings, PluginComponentProps, AudioSignal, GlobalSettings } from '../../types';
import { PrimeBrainStub } from '../../lib/PrimeBrainStub';
import { ToggleButton } from '../shared/ToggleButton';
import { mapRange } from '../../lib/utils';
import { VstBridge, VisualizerData } from '../../vst/VstBridge';
import { useVstBridge } from '../../vst/useVstBridge';

// --- VST Architecture ---

interface DotData {
    key: number;
    x: string;
    y: string;
    delay: string;
    wobbleDepth: string;
}

interface MotionVisualizerData extends VisualizerData {
    dots: DotData[];
    animationDuration: string;
    animationTimingFunction: string;
    pulseScale: number;
    pulseOpacity: number;
}

class MixxMotionVstBridge extends VstBridge<MixxMotionSettings> {
    private pulseDecay: number = 0;

    // FIX: Convert dspProcess to an arrow function to bind 'this' context correctly.
    public dspProcess = (
        audioSignal: AudioSignal,
        width: number,
        height: number,
        globalSettings: GlobalSettings
    ): MotionVisualizerData => {
        const { rate, depth, sync } = this.settings;
        
        this.pulseDecay = Math.max(0, this.pulseDecay * 0.9);
        if (audioSignal.transients) {
            this.pulseDecay = 1.0;
        }

        const gridSize = globalSettings.visualizerComplexity === 'low' ? 12 : 20;
        const animationSpeedMultiplier = mapRange(globalSettings.animationIntensity, 0, 100, 1.5, 0.5);
        
        const animationDuration = sync ? '1s' : `${Math.max(0.2, 3 - (rate / 100) * 2.8) * animationSpeedMultiplier}s`;
        const animationTimingFunction = sync ? 'cubic-bezier(0.65, 0, 0.35, 1)' : 'ease-in-out';
        
        const dots: DotData[] = Array.from({length: gridSize * gridSize}).map((_, i) => ({
            key: i,
            x: `${(i % gridSize) / (gridSize - 1) * 100}%`,
            y: `${Math.floor(i / gridSize) / (gridSize - 1) * 100}%`,
            delay: `${(i % gridSize) * 0.05}s`,
            wobbleDepth: `${(depth / 100) * 50}%`,
        }));

        return {
            dots,
            animationDuration,
            animationTimingFunction,
            pulseScale: 1 + this.pulseDecay * 0.05,
            pulseOpacity: this.pulseDecay,
        };
    }
}


// --- UI Components ---

const MotionGrid: React.FC<{ visualizerData: MotionVisualizerData | null }> = ({ visualizerData }) => {
    if (!visualizerData) return <div className="relative w-full h-full" />;

    const { dots, animationDuration, animationTimingFunction, pulseScale, pulseOpacity } = visualizerData;

    return (
        <div className="relative w-full h-full flex items-center justify-center [perspective:500px]">
            <div className="w-[80%] h-[80%] relative transition-transform duration-100" style={{
                transform: `rotateX(60deg) scale(${pulseScale})`,
                opacity: 0.8 + pulseOpacity * 0.2
            }}>
                {dots.map(dot => (
                    <div key={dot.key} className="absolute w-1.5 h-1.5 rounded-full bg-fuchsia-400" style={{
                        left: dot.x,
                        top: dot.y,
                        '--depth': dot.wobbleDepth,
                        animation: `wave ${animationDuration} infinite alternate ${animationTimingFunction}`,
                        animationDelay: dot.delay,
                    } as React.CSSProperties} />
                ))}
            </div>
            <style>{`
                @keyframes wave {
                    from { transform: translateY(var(--depth)); }
                    to { transform: translateY(calc(var(--depth) * -1)); }
                }
            `}</style>
        </div>
    );
};

export const MixxMotion: React.FC<PluginComponentProps<MixxMotionSettings>> = ({ 
    isDragging, isResizing, name, description, pluginState, setPluginState, isLearning, onMidiLearn, onClose, globalSettings, audioSignal
}) => {
    const { rate, depth, sync, mix, output } = pluginState;

    // Use the generic VST bridge hook
    const { visualizerData } = useVstBridge(
        pluginState,
        audioSignal,
        globalSettings,
        (initialState) => new MixxMotionVstBridge(initialState)
    );

    const handleValueChange = (param: keyof MixxMotionSettings, value: number | boolean) => {
        // FIX: Use a functional update for setPluginState to ensure type correctness and prevent race conditions.
        setPluginState(prevState => ({ ...prevState, [param]: value }));
        PrimeBrainStub.sendEvent('parameter_change', { plugin: 'mixx-motion', parameter: param, value });
    };

    return (
        <PluginContainer title={name} subtitle={description} isDragging={isDragging} isResizing={isResizing} onClose={onClose}>
            <div className="w-full h-full flex flex-col items-center justify-between gap-6 p-4">
                <div className="w-full flex-1 overflow-hidden bg-black/20 border border-fuchsia-500/20 rounded-lg">
                    <MotionGrid visualizerData={visualizerData as MotionVisualizerData | null} />
                </div>
                <div className="flex flex-wrap justify-center items-center gap-4">
                    <Knob label="Rate" value={rate} setValue={(v) => handleValueChange('rate', v)} paramName="rate" isLearning={isLearning('rate')} onMidiLearn={onMidiLearn} />
                    <Knob label="Depth" value={depth} setValue={(v) => handleValueChange('depth', v)} paramName="depth" isLearning={isLearning('depth')} onMidiLearn={onMidiLearn} />
                    <ToggleButton label="Sync" value={sync} onChange={(v) => handleValueChange('sync', v)} color="fuchsia" />
                    <Knob label="Mix" value={mix} setValue={(v) => handleValueChange('mix', v)} paramName="mix" isLearning={isLearning('mix')} onMidiLearn={onMidiLearn} />
                    <Knob label="Output" value={output} setValue={(v) => handleValueChange('output', v)} paramName="output" isLearning={isLearning('output')} onMidiLearn={onMidiLearn} />
                </div>
            </div>
        </PluginContainer>
    );
};
