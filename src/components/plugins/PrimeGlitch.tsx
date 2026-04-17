import React from 'react';
import { PluginContainer } from '../../../components/shared/PluginContainer';
import { Knob } from '../../../components/shared/Knob';
import { PrimeGlitchSettings, PluginComponentProps, AudioSignal, GlobalSettings } from '../../../types';
import { PrimeBrainStub } from '../../../lib/PrimeBrainStub';
import { VstBridge, VisualizerData } from '../../../vst/VstBridge';
import { useVstBridge } from '../../../vst/useVstBridge';

interface GlitchVisualizerData extends VisualizerData {
    fragmentRects: { x: number; y: number; width: number; height: number; opacity: number }[];
}

class PrimeGlitchVstBridge extends VstBridge<PrimeGlitchSettings> {
    constructor(initialSettings: PrimeGlitchSettings) {
        super(initialSettings);
    }

    public dspProcess(
        audioSignal: AudioSignal,
        width: number,
        height: number,
        globalSettings: GlobalSettings
    ): GlitchVisualizerData {
        const { fragment, jitter, rate } = this.settings;
        
        // Generate pseudo-random glitch rects
        const numRects = Math.floor((fragment / 100) * 20);
        const fragmentRects = Array.from({ length: numRects }).map((_, i) => ({
            x: Math.random() * 100,
            y: Math.random() * 100,
            width: (jitter / 100) * 30 + Math.random() * 20,
            height: (jitter / 100) * 30 + Math.random() * 20,
            opacity: 0.3 + (audioSignal.level / 100) * 0.7
        }));

        return { fragmentRects };
    }
}

const GlitchVisualizer: React.FC<{ data: GlitchVisualizerData | null }> = ({ data }) => {
    if (!data) return <div className="w-full h-full bg-black/20" />;
    
    return (
        <div className="relative w-full h-full bg-black/60 overflow-hidden border border-rose-500/30 rounded-lg">
            {data.fragmentRects.map((rect, i) => (
                <div 
                    key={i}
                    className="absolute bg-rose-500/80 mix-blend-screen"
                    style={{
                        left: `${rect.x}%`,
                        top: `${rect.y}%`,
                        width: `${rect.width}%`,
                        height: `${rect.height}%`,
                        opacity: rect.opacity,
                    }}
                />
            ))}
        </div>
    );
};

export const PrimeGlitch: React.FC<PluginComponentProps<PrimeGlitchSettings>> = ({ 
    isDragging, isResizing, name, description, pluginState, setPluginState, isLearning, onMidiLearn, onClose, globalSettings, audioSignal
}) => {
    const { fragment, jitter, rate, mix, output } = pluginState;

    const { visualizerData } = useVstBridge(
        pluginState,
        audioSignal,
        globalSettings,
        (initialState) => new PrimeGlitchVstBridge(initialState)
    );

    const handleValueChange = (param: keyof PrimeGlitchSettings, value: number) => {
        setPluginState(prevState => ({ ...prevState, [param]: value }));
        PrimeBrainStub.sendEvent('parameter_change', { plugin: 'prime-glitch', parameter: param, value });
    };

    return (
        <PluginContainer title={name} subtitle={description} isDragging={isDragging} isResizing={isResizing} onClose={onClose}>
            <div className="w-full h-full flex flex-col items-center justify-between gap-6 p-4">
                <div className="w-full flex-1">
                    <GlitchVisualizer data={visualizerData as GlitchVisualizerData | null} />
                </div>
                <div className="flex flex-wrap justify-center gap-4">
                    <Knob label="Fragment" value={fragment} setValue={(v) => handleValueChange('fragment', v)} paramName="fragment" isLearning={isLearning('fragment')} onMidiLearn={onMidiLearn} />
                    <Knob label="Jitter" value={jitter} setValue={(v) => handleValueChange('jitter', v)} paramName="jitter" isLearning={isLearning('jitter')} onMidiLearn={onMidiLearn} />
                    <Knob label="Rate" value={rate} setValue={(v) => handleValueChange('rate', v)} paramName="rate" isLearning={isLearning('rate')} onMidiLearn={onMidiLearn} />
                    <Knob label="Mix" value={mix} setValue={(v) => handleValueChange('mix', v)} paramName="mix" isLearning={isLearning('mix')} onMidiLearn={onMidiLearn} />
                    <Knob label="Output" value={output} setValue={(v) => handleValueChange('output', v)} paramName="output" isLearning={isLearning('output')} onMidiLearn={onMidiLearn} />
                </div>
            </div>
        </PluginContainer>
    );
};
