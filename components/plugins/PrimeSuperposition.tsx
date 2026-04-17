
import React from 'react';
import { PluginContainer } from '../shared/PluginContainer';
import { Knob } from '../shared/Knob';
import { PrimeSuperpositionSettings, PluginComponentProps, AudioSignal, GlobalSettings } from '../../types';
import { PrimeBrainStub } from '../../lib/PrimeBrainStub';
import { VstBridge, VisualizerData } from '../../vst/VstBridge';
import { useVstBridge } from '../../vst/useVstBridge';

interface SuperpositionVisualizerData extends VisualizerData {
    paths: { d: string; opacity: number; color: string }[];
}

class PrimeSuperpositionVstBridge extends VstBridge<PrimeSuperpositionSettings> {
    constructor(initialSettings: PrimeSuperpositionSettings) {
        super(initialSettings);
    }

    public dspProcess = (
        audioSignal: AudioSignal,
        width: number,
        height: number,
        globalSettings: GlobalSettings
    ): SuperpositionVisualizerData => {
        const { states, collapse, probability } = this.settings;
        
        const numStates = 1 + Math.floor((states / 100) * 5); 
        const collapseFactor = collapse / 100;
        const probabilityFactor = probability / 100;

        const paths = [];
        const points = audioSignal.waveform;
        
        for (let s = 0; s < numStates; s++) {
            const isMain = s === 0;
            const deviation = isMain ? 0 : (1 - collapseFactor) * (s * 20) * (1 + probabilityFactor);
            const phaseShift = isMain ? 0 : (1 - collapseFactor) * s * 0.5;
            
            let pathD = `M 0 ${height / 2}`;
            
            for (let i = 0; i < width; i += 5) {
                const index = Math.floor(i * (points.length / width));
                const shiftedIndex = (index + Math.floor(phaseShift * 10)) % points.length;
                const val = points[shiftedIndex];
                
                const noise = isMain ? 0 : (Math.random() - 0.5) * deviation;
                const y = (height / 2) + (val * height * 0.4) + noise;
                
                pathD += ` L ${i} ${y}`;
            }

            paths.push({
                d: pathD,
                opacity: isMain ? 1 : 0.5 * (1 - collapseFactor), 
                color: isMain ? '#ffffff' : `hsla(${180 + s * 40}, 80%, 70%, 0.8)`
            });
        }

        return { paths };
    }
}

const SuperpositionVisualizer: React.FC<{ data: SuperpositionVisualizerData | null }> = ({ data }) => {
    if (!data) return <div className="w-full h-full bg-black/20" />;
    
    return (
        <div className="relative w-full h-full bg-black/40 rounded-lg border border-teal-500/20 overflow-hidden">
            <svg className="w-full h-full">
                {data.paths.map((p, i) => (
                    <path key={i} d={p.d} stroke={p.color} strokeWidth={i === 0 ? 2 : 1} fill="none" style={{ opacity: p.opacity }} />
                ))}
            </svg>
        </div>
    );
};

export const PrimeSuperposition: React.FC<PluginComponentProps<PrimeSuperpositionSettings>> = ({ 
    isDragging, isResizing, name, description, pluginState, setPluginState, isLearning, onMidiLearn, onClose, globalSettings, audioSignal
}) => {
    const { states, collapse, probability, mix, output } = pluginState;

    const { visualizerData } = useVstBridge(
        pluginState,
        audioSignal,
        globalSettings,
        (initialState) => new PrimeSuperpositionVstBridge(initialState)
    );

    const handleValueChange = (param: keyof PrimeSuperpositionSettings, value: number) => {
        setPluginState(prevState => ({ ...prevState, [param]: value }));
        PrimeBrainStub.sendEvent('parameter_change', { plugin: 'prime-superposition', parameter: param, value });
    };

    return (
        <PluginContainer title={name} subtitle={description} isDragging={isDragging} isResizing={isResizing} onClose={onClose}>
            <div className="w-full h-full flex flex-col items-center justify-between gap-6 p-4">
                <div className="w-full flex-1">
                    <SuperpositionVisualizer data={visualizerData as SuperpositionVisualizerData | null} />
                </div>
                <div className="flex flex-wrap justify-center gap-4">
                    <Knob label="States" value={states} setValue={(v) => handleValueChange('states', v)} paramName="states" isLearning={isLearning('states')} onMidiLearn={onMidiLearn} />
                    <Knob label="Collapse" value={collapse} setValue={(v) => handleValueChange('collapse', v)} paramName="collapse" isLearning={isLearning('collapse')} onMidiLearn={onMidiLearn} />
                    <Knob label="Probability" value={probability} setValue={(v) => handleValueChange('probability', v)} paramName="probability" isLearning={isLearning('probability')} onMidiLearn={onMidiLearn} />
                    <Knob label="Mix" value={mix} setValue={(v) => handleValueChange('mix', v)} paramName="mix" isLearning={isLearning('mix')} onMidiLearn={onMidiLearn} />
                    <Knob label="Output" value={output} setValue={(v) => handleValueChange('output', v)} paramName="output" isLearning={isLearning('output')} onMidiLearn={onMidiLearn} />
                </div>
            </div>
        </PluginContainer>
    );
};
