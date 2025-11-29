
import React from 'react';
import { PluginContainer } from '../shared/PluginContainer';
import { Knob } from '../shared/Knob';
import { MixxCeilingSettings, PluginComponentProps, AudioSignal, GlobalSettings } from '../../types';
import { PrimeBrainStub } from '../../lib/PrimeBrainStub';
import { mapRange } from '../../lib/utils';
import { VstBridge, VisualizerData } from '../../vst/VstBridge';
import { useVstBridge } from '../../vst/useVstBridge';

// --- VST Architecture ---

interface CeilingVisualizerData extends VisualizerData {
    pathData: string;
    ceilingPos: number;
    isClipping: boolean;
    color: string;
    softClip: number;
    animationSpeedMultiplier: number;
}

class MixxCeilingVstBridge extends VstBridge<MixxCeilingSettings> {
    private peak: number = 0;

    // FIX: Convert dspProcess to an arrow function to bind 'this' context correctly.
    public dspProcess = (audioSignal: AudioSignal, width: number, height: number, globalSettings: GlobalSettings): CeilingVisualizerData => {
        const { level, softClip, tone } = this.settings;

        const currentPeak = Math.max(...audioSignal.waveform.map(v => Math.abs(v))) * 100;
        this.peak = Math.max(currentPeak, this.peak * 0.95);

        const ceilingPos = 1 - (level / 100);
        const kneeWidth = (softClip / 100) * 0.1;

        const numPoints = globalSettings.visualizerComplexity === 'low' ? 128 : audioSignal.waveform.length;
        const step = audioSignal.waveform.length / numPoints;

        const pathData = Array.from({ length: numPoints }).map((_, i) => {
            const index = Math.floor(i * step);
            const v = audioSignal.waveform[index];
            const x = (i / (numPoints - 1)) * 100;
            let y = (1 - ((v + 1) / 2)) * 100;

            const ceilingY = ceilingPos * 100;
            if (y < ceilingY + kneeWidth) {
                const dy = (ceilingY + kneeWidth - y) / (2 * kneeWidth);
                y = ceilingY + kneeWidth - Math.tanh(dy) * kneeWidth;
            }

            return `${x},${y}`;
        }).join(' L ');

        const hue = tone;
        const saturation = 100 - Math.abs(tone - 50);
        const lightness = 50 + tone * 0.2;
        const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        const isClipping = this.peak > level;
        const animationSpeedMultiplier = mapRange(globalSettings.animationIntensity, 0, 100, 1.5, 0.5);

        return { pathData, ceilingPos, isClipping, color, softClip, animationSpeedMultiplier };
    }
}

// --- UI Components ---

const CeilingVisualizer: React.FC<{ visualizerData: CeilingVisualizerData | null, audioSignal: AudioSignal }> = ({ visualizerData, audioSignal }) => {
    if (!visualizerData) return <div className="relative w-full h-full" />;

    const { pathData, ceilingPos, isClipping, color, softClip, animationSpeedMultiplier } = visualizerData;

    return (
        <div className="relative w-full h-full">
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d={`M 0,${(1 - ((audioSignal.waveform[0] + 1) / 2)) * 100} L ${pathData}`} stroke={color} strokeWidth="1.5" fill="none" style={{ filter: `drop-shadow(0 0 5px ${color})` }} />

                <line x1="0" y1={`${ceilingPos * 100}%`} x2="100%" y2={`${ceilingPos * 100}%`} stroke={color} strokeWidth="1" strokeDasharray="2 4" strokeOpacity="0.5" />

                {isClipping && (
                    <line
                        x1="0" y1={`${ceilingPos * 100}%`} x2="100%" y2={`${ceilingPos * 100}%`}
                        stroke={color}
                        strokeWidth={2 + (1 - softClip / 100) * 4}
                        strokeOpacity="1"
                        style={{
                            filter: `blur(${(softClip / 100) * 3}px) drop-shadow(0 0 10px ${color})`,
                            animation: `knob-value-flash ${0.1 * animationSpeedMultiplier}s ease-out`,
                        }}
                    />
                )}
            </svg>
        </div>
    );
};

export const MixxCeiling: React.FC<PluginComponentProps<MixxCeilingSettings>> = ({
    isDragging, isResizing, name, description, pluginState, setPluginState, isLearning, onMidiLearn, audioSignal, onClose, globalSettings
}) => {
    const { level, softClip, tone, mix, output } = pluginState;

    const { visualizerData } = useVstBridge(
        pluginState,
        audioSignal,
        globalSettings,
        (initialState) => new MixxCeilingVstBridge(initialState)
    );

    const handleValueChange = (param: keyof MixxCeilingSettings, value: number) => {
        // FIX: Use a functional update for setPluginState to ensure type correctness and prevent race conditions.
        setPluginState(prevState => ({ ...prevState, [param]: value }));
        PrimeBrainStub.sendEvent('parameter_change', { plugin: 'mixx-ceiling', parameter: param, value });
    };

    return (
        <PluginContainer title={name} subtitle={description} isDragging={isDragging} isResizing={isResizing} onClose={onClose}>
            <div className="w-full h-full flex flex-col items-center justify-between gap-6 p-4">
                <div className="w-full flex-1 border border-amber-300/20 rounded-lg bg-black/20">
                    <CeilingVisualizer visualizerData={visualizerData as CeilingVisualizerData | null} audioSignal={audioSignal} />
                </div>
                <div className="flex flex-wrap justify-center gap-4">
                    <Knob label="Level" value={level} setValue={(v) => handleValueChange('level', v)} paramName="level" isLearning={isLearning('level')} onMidiLearn={onMidiLearn} />
                    <Knob label="Soft Clip" value={softClip} setValue={(v) => handleValueChange('softClip', v)} paramName="softClip" isLearning={isLearning('softClip')} onMidiLearn={onMidiLearn} />
                    <Knob label="Tone" value={tone} setValue={(v) => handleValueChange('tone', v)} paramName="tone" isLearning={isLearning('tone')} onMidiLearn={onMidiLearn} />
                    <Knob label="Mix" value={mix} setValue={(v) => handleValueChange('mix', v)} paramName="mix" isLearning={isLearning('mix')} onMidiLearn={onMidiLearn} />
                    <Knob label="Output" value={output} setValue={(v) => handleValueChange('output', v)} paramName="output" isLearning={isLearning('output')} onMidiLearn={onMidiLearn} />
                </div>
            </div>
        </PluginContainer>
    );
};
