
import React from 'react';
import { PluginContainer } from '../shared/PluginContainer';
import { Knob } from '../shared/Knob';
import { MixxDitherSettings, PluginComponentProps, AudioSignal, GlobalSettings } from '../../types';
import { PrimeBrainStub } from '../../lib/PrimeBrainStub';
import { SegmentedControl } from '../shared/SegmentedControl';
import { VstBridge, VisualizerData } from '../../vst/VstBridge';
import { useVstBridge } from '../../vst/useVstBridge';


// --- VST Architecture ---

interface DitherParticle {
    id: number;
    left: string;
    animationDuration: string;
    animationDelay: string;
}
interface DitherVisualizerData extends VisualizerData {
    particles: DitherParticle[];
    color: string;
    normalizedAmount: number;
    bitDepth: 16 | 24;
}

class MixxDitherVstBridge extends VstBridge<MixxDitherSettings> {
    // FIX: Convert dspProcess to an arrow function to bind 'this' context correctly.
    public dspProcess = (audioSignal: AudioSignal, width: number, height: number, globalSettings: GlobalSettings): DitherVisualizerData => {
        const { bitDepth, noiseShaping, ditherAmount } = this.settings;
        const particleCount = 200;
        const normalizedAmount = ditherAmount / 100;
        
        let color: string;
        switch(noiseShaping) {
            case 'low': color = 'hsla(200, 80%, 70%, 0.7)'; break;
            case 'high': color = 'hsla(280, 80%, 70%, 0.7)'; break;
            case 'none':
            default: color = 'hsla(0, 0%, 100%, 0.7)';
        }

        const particles: DitherParticle[] = Array.from({ length: particleCount }).map((_, i) => ({
            id: i,
            left: `${i / (particleCount - 1) * 100}%`,
            animationDuration: `${0.1 + Math.random() * 0.2}s`,
            animationDelay: `${Math.random() * 0.3}s`,
        }));

        return { particles, color, normalizedAmount, bitDepth };
    }
}


// --- UI Components ---

const DitherVisualizer: React.FC<{ visualizerData: DitherVisualizerData | null }> = ({ visualizerData }) => {
    if (!visualizerData) return <div className="relative w-full h-full" />;

    const { particles, color, normalizedAmount, bitDepth } = visualizerData;

    return (
        <div className="relative w-full h-full flex items-center justify-center bg-black/30 border border-amber-400/20 rounded-lg overflow-hidden">
             <div className="w-full h-1/4 absolute bottom-0">
                {particles.map(p => (
                    <div
                        key={p.id}
                        className="absolute w-px bg-white bottom-0"
                        style={{
                            left: p.left,
                            height: `var(--height)`,
                            backgroundColor: color,
                            '--height': `${Math.random() * 100}%`,
                            transform: `scaleY(${normalizedAmount})`,
                            animation: `dither-flicker ${p.animationDuration} ${p.animationDelay} infinite alternate`,
                        } as React.CSSProperties}
                    />
                ))}
            </div>
             <style>{`
                @keyframes dither-flicker {
                    from { height: 0%; }
                    to { height: var(--height); }
                }
            `}</style>
            <div className="absolute font-orbitron text-amber-200/50 text-4xl font-bold select-none">{bitDepth}-bit</div>
        </div>
    );
};

export const MixxDither: React.FC<PluginComponentProps<MixxDitherSettings>> = ({ 
    isDragging, isResizing, name, description, pluginState, setPluginState, isLearning, onMidiLearn, onClose, globalSettings, audioSignal
}) => {
    const { bitDepth, noiseShaping, ditherAmount, mix, output } = pluginState;

    const { visualizerData } = useVstBridge(
        pluginState,
        audioSignal,
        globalSettings,
        (initialState) => new MixxDitherVstBridge(initialState)
    );

    const handleValueChange = (param: keyof MixxDitherSettings, value: number | string) => {
        // FIX: Use a functional update for setPluginState to ensure type correctness and prevent race conditions.
        setPluginState(prevState => ({ ...prevState, [param]: value as any }));
        PrimeBrainStub.sendEvent('parameter_change', { plugin: 'mixx-dither', parameter: param, value });
    };

    return (
        <PluginContainer title={name} subtitle={description} isDragging={isDragging} isResizing={isResizing} onClose={onClose}>
            <div className="w-full h-full flex flex-col items-center justify-between gap-6 p-4">
                <div className="w-full flex-1">
                    <DitherVisualizer visualizerData={visualizerData as DitherVisualizerData | null} />
                </div>
                <div className="flex flex-wrap justify-center items-center gap-6">
                    <SegmentedControl label="Bit Depth" options={[16, 24]} value={bitDepth} onChange={(v) => handleValueChange('bitDepth', v)} tierColor="amber" />
                    <SegmentedControl label="Noise Shaping" options={['none', 'low', 'high']} value={noiseShaping} onChange={(v) => handleValueChange('noiseShaping', v)} tierColor="amber" />
                    <Knob label="Amount" value={ditherAmount} setValue={(v) => handleValueChange('ditherAmount', v)} paramName="ditherAmount" isLearning={isLearning('ditherAmount')} onMidiLearn={onMidiLearn} />
                    <Knob label="Mix" value={mix} setValue={(v) => handleValueChange('mix', v)} paramName="mix" isLearning={isLearning('mix')} onMidiLearn={onMidiLearn} />
                    <Knob label="Output" value={output} setValue={(v) => handleValueChange('output', v)} paramName="output" isLearning={isLearning('output')} onMidiLearn={onMidiLearn} />
                </div>
            </div>
        </PluginContainer>
    );
};
