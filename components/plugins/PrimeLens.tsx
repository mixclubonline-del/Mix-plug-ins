
import React from 'react';
import { PluginContainer } from '../shared/PluginContainer';
import { Knob } from '../shared/Knob';
import { PrimeLensSettings, PluginComponentProps, AudioSignal, GlobalSettings } from '../../types';
import { PrimeBrainStub } from '../../lib/PrimeBrainStub';
import { SegmentedControl } from '../shared/SegmentedControl';
import { mapRange } from '../../lib/utils';
import { VstBridge, VisualizerData } from '../../vst/VstBridge';
import { useVstBridge } from '../../vst/useVstBridge';

// --- VST Architecture ---

interface BarData {
    id: number;
    height: string;
    backgroundColor: string;
    transform: string;
}

interface LensVisualizerData extends VisualizerData {
    bars: BarData[];
    animation: string;
}

class PrimeLensVstBridge extends VstBridge<PrimeLensSettings> {
    private bars: number[] = [];

    // FIX: Convert dspProcess to an arrow function to bind 'this' context correctly.
    public dspProcess = (
        audioSignal: AudioSignal,
        width: number,
        height: number,
        globalSettings: GlobalSettings
    ): LensVisualizerData => {
        const { gain, resolution, colorMode } = this.settings;

        const numBars = 8 + Math.round(resolution / 100 * (globalSettings.visualizerComplexity === 'low' ? 60 : 120));
        const decayFactor = mapRange(globalSettings.animationIntensity, 0, 100, 0.98, 0.9);
        const animationSpeedMultiplier = mapRange(globalSettings.animationIntensity, 0, 100, 1.5, 0.5);

        if (this.bars.length !== numBars) {
            this.bars = Array(numBars).fill(0);
        }

        // --- Audio-Reactive Logic ---
        const segmentSize = Math.floor(audioSignal.waveform.length / numBars);
        this.bars = this.bars.map((currentHeight, i) => {
            const segmentStart = i * segmentSize;
            const segmentEnd = segmentStart + segmentSize;
            let peak = 0;
            for (let j = segmentStart; j < segmentEnd; j++) {
                peak = Math.max(peak, Math.abs(audioSignal.waveform[j]));
            }
            
            // Apply gain and decay
            const newHeight = peak * (gain / 50);
            return Math.max(currentHeight * decayFactor, newHeight);
        });
        
        const barData: BarData[] = this.bars.map((height, i) => {
            let color;
            switch (colorMode) {
                case 'mood': color = `hsl(270, 80%, ${50 + height * 50}%)`; break;
                case 'thermal': color = `hsl(${240 - height * 240}, 90%, 60%)`; break;
                case 'spectral': default: color = `hsl(${(i / numBars) * 360}, 90%, 60%)`; break;
            }
            return {
                id: i,
                height: `${height * 50}%`,
                backgroundColor: color,
                transform: `rotate(${(i/numBars)*360}deg)`
            };
        });

        return {
            bars: barData,
            animation: `spin ${20 * animationSpeedMultiplier}s linear infinite`,
        };
    }
}


// --- UI Components ---

const LensVisualizer: React.FC<{ visualizerData: LensVisualizerData | null }> = ({ visualizerData }) => {
    if (!visualizerData) return <div className="w-full h-full" />;

    const { bars, animation } = visualizerData;

    return (
        <div className="w-full h-full flex items-center justify-center">
            <div className="w-64 h-64 relative" style={{ animation }}>
                 {bars.map((bar) => (
                     <div key={bar.id} className="absolute bottom-1/2 left-1/2 w-1 rounded-t-full origin-bottom transition-all duration-100" style={{
                        height: bar.height,
                        backgroundColor: bar.backgroundColor,
                        transform: bar.transform,
                     }} />
                 ))}
                 <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        </div>
    );
};

export const PrimeLens: React.FC<PluginComponentProps<PrimeLensSettings>> = ({ 
    isDragging, isResizing, name, description, pluginState, setPluginState, isLearning, onMidiLearn, onClose, globalSettings, audioSignal
}) => {
    const { gain, resolution, colorMode, mix, output } = pluginState;

    const { visualizerData } = useVstBridge(
        pluginState,
        audioSignal,
        globalSettings,
        (initialState) => new PrimeLensVstBridge(initialState)
    );

    const handleValueChange = (param: keyof PrimeLensSettings, value: number | string) => {
        // FIX: Use a functional update for setPluginState to ensure type correctness and prevent race conditions.
        setPluginState(prevState => ({ ...prevState, [param]: value }));
        PrimeBrainStub.sendEvent('parameter_change', { plugin: 'prime-lens', parameter: param, value });
    };

    return (
        <PluginContainer title={name} subtitle={description} isDragging={isDragging} isResizing={isResizing} onClose={onClose}>
            <div className="w-full h-full flex flex-col items-center justify-between gap-6 p-4">
                <div className="w-full flex-1 bg-black/20 border border-cyan-400/20 rounded-lg overflow-hidden">
                    <LensVisualizer visualizerData={visualizerData as LensVisualizerData | null} />
                </div>
                <div className="flex flex-wrap justify-center items-center gap-4">
                    <Knob label="Gain" value={gain} setValue={(v) => handleValueChange('gain', v)} paramName="gain" isLearning={isLearning('gain')} onMidiLearn={onMidiLearn} />
                    <Knob label="Resolution" value={resolution} setValue={(v) => handleValueChange('resolution', v)} paramName="resolution" isLearning={isLearning('resolution')} onMidiLearn={onMidiLearn} />
                    <SegmentedControl label="Color Mode" options={['spectral', 'mood', 'thermal']} value={colorMode} onChange={(v) => handleValueChange('colorMode', v)} tierColor="cyan" />
                    <Knob label="Mix" value={mix} setValue={(v) => handleValueChange('mix', v)} paramName="mix" isLearning={isLearning('mix')} onMidiLearn={onMidiLearn} />
                    <Knob label="Output" value={output} setValue={(v) => handleValueChange('output', v)} paramName="output" isLearning={isLearning('output')} onMidiLearn={onMidiLearn} />
                </div>
            </div>
        </PluginContainer>
    );
};
