

import React, { useEffect } from 'react';
import { PluginContainer } from '../shared/PluginContainer';
import { Knob } from '../shared/Knob';
import { PrimeEQSettings, PluginComponentProps, AudioSignal, GlobalSettings } from '../../types';
import { PrimeBrainStub } from '../../lib/PrimeBrainStub';
import { mapRange } from '../../lib/utils';
import { VstBridge, VisualizerData } from '../../vst/VstBridge';
import { useVstBridge } from '../../vst/useVstBridge';

// --- VST Architecture ---

interface EQVisualizerData extends VisualizerData {
    spectrum: number[];
    pathData: string;
    focusX: number;
    focusY: number;
}

class PrimeEQVstBridge extends VstBridge<PrimeEQSettings> {
    private spectrum: number[] = [];

    // FIX: Convert dspProcess to an arrow function to bind 'this' context correctly.
    public dspProcess = (
        audioSignal: AudioSignal,
        width: number,
        height: number,
        globalSettings: GlobalSettings
    ): EQVisualizerData => {
        const { lowGain, midGain, highGain, smartFocus } = this.settings;
        const numBars = globalSettings.visualizerComplexity === 'low' ? 32 : 64;
        
        if (this.spectrum.length !== numBars) {
            this.spectrum = Array(numBars).fill(0);
        }

        const decayFactor = mapRange(globalSettings.animationIntensity, 0, 100, 0.9, 0.6);

        // Simulate spectrum based on audio signal and apply decay
        this.spectrum = this.spectrum.map((v, i) => {
             const audioInfluence = audioSignal.waveform[i * Math.floor(audioSignal.waveform.length / numBars)] * 50 + 20;
             return Math.max(0, v * decayFactor, audioInfluence * (audioSignal.level / 100));
        });

        // Add visual boost for Smart Focus
        if (smartFocus > 0) {
            const focusIndex = Math.round((smartFocus / 100) * (numBars - 1));
            const focusWidth = Math.max(1, (1 - smartFocus / 150) * 5);
            for(let i = 0; i < numBars; i++) {
                const distance = Math.abs(i - focusIndex);
                if (distance < focusWidth) {
                    const boost = (1 - (distance / focusWidth)) * 20; // Add up to 20% height
                    this.spectrum[i] = Math.min(100, this.spectrum[i] + boost);
                }
            }
        }
        
        // Calculate EQ curve
        const eqCurve = (pos: number) => {
            const lowInf = Math.pow(1 - pos, 2);
            const midInf = Math.max(0, 1 - Math.abs(pos - 0.5) * 3);
            const highInf = Math.pow(pos, 2);
            return height / 2 - (lowGain * lowInf + midGain * midInf + highGain * highInf) * 3;
        };

        const pathData = Array.from({ length: 100 }).map((_, i) => {
            const x = (i / 99) * width;
            const y = eqCurve(i / 99);
            return `${x},${y}`;
        }).join(' L ');
        
        return {
            spectrum: [...this.spectrum],
            pathData: `M 0,${eqCurve(0)} L ${pathData}`,
            focusX: (smartFocus / 100) * width,
            focusY: eqCurve(smartFocus / 100),
        };
    }
}


// --- UI Components ---

const EQVisualizer: React.FC<{ visualizerData: EQVisualizerData | null, focus: number, width: number, height: number }> = 
({ visualizerData, focus, width, height }) => {
    if (!visualizerData) {
        return <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" />;
    }

    const { spectrum, pathData, focusX, focusY } = visualizerData;
    const numBars = spectrum.length;

    return (
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
            <defs>
                <linearGradient id="prime-eq-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00ffff" />
                    <stop offset="100%" stopColor="#A57CFF" />
                </linearGradient>
                <linearGradient id="prime-eq-fill" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#00ffff" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#A57CFF" stopOpacity="0" />
                </linearGradient>
                <filter id="prime-eq-glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            
            <g>
                {spectrum.map((val, i) => {
                    const opacity = 0.1;
                    return (
                        <rect 
                            key={i}
                            x={(i / numBars) * width}
                            y={height - (val / 100 * height)}
                            width={(width / numBars) + 1}
                            height={val / 100 * height}
                            fill={`rgba(0, 255, 255, ${opacity})`}
                            className="transition-colors duration-300"
                        />
                    )
                })}
            </g>

            <path d={`${pathData} L ${width},${height} L 0,${height} Z`} fill="url(#prime-eq-fill)" />

            <path d={pathData} fill="none" stroke="url(#prime-eq-grad)" strokeWidth="2.5" filter="url(#prime-eq-glow)" />

            <g transform={`translate(${focusX}, ${focusY})`} className="transition-transform duration-300" style={{opacity: focus > 0 ? 1 : 0}}>
                <circle cx="0" cy="0" r="10" fill="none" stroke="#f472b6" strokeWidth="2" strokeDasharray="3 3" />
                <path d="M 0 -15 V 15 M -15 0 H 15" stroke="#f472b6" strokeWidth="1" />
            </g>
        </svg>
    );
};

export const PrimeEQ: React.FC<PluginComponentProps<PrimeEQSettings>> = ({ 
    isDragging, isResizing, name, description, pluginState, setPluginState, isLearning, onMidiLearn, onClose, globalSettings, audioSignal
}) => {
    const { lowGain, midGain, highGain, smartFocus, mix, output } = pluginState;
    
    const { visualizerData, setCanvasSize } = useVstBridge(
        pluginState,
        audioSignal,
        globalSettings,
        (initialState) => new PrimeEQVstBridge(initialState)
    );

    // This is a bit of a workaround for now, since the visualizer size is fixed.
    // In a real scenario, we'd use a ResizeObserver on the container.
    useEffect(() => {
        setCanvasSize(800, 200);
    }, [setCanvasSize]);

    const handleValueChange = (param: keyof PrimeEQSettings, value: number) => {
        // FIX: Use a functional update for setPluginState to ensure type correctness and prevent race conditions.
        setPluginState(prevState => ({ ...prevState, [param]: value }));
        PrimeBrainStub.sendEvent('parameter_change', { plugin: 'prime-eq', parameter: param, value });
    };

    return (
        <PluginContainer title={name} subtitle={description} isDragging={isDragging} isResizing={isResizing} onClose={onClose}>
            <div className="w-full h-full flex flex-col items-center justify-between gap-6 p-4">
                <div className="w-full h-40 border-y-2 border-cyan-400/20 py-4">
                    <EQVisualizer 
                        visualizerData={visualizerData as EQVisualizerData | null} 
                        focus={smartFocus}
                        width={800}
                        height={200}
                    />
                </div>
                <div className="flex flex-wrap justify-center gap-4">
                    <Knob label="Low Gain" value={lowGain} setValue={(v) => handleValueChange('lowGain', v)} min={-12} max={12} step={0.1} paramName="lowGain" isLearning={isLearning('lowGain')} onMidiLearn={onMidiLearn} />
                    <Knob label="Mid Gain" value={midGain} setValue={(v) => handleValueChange('midGain', v)} min={-12} max={12} step={0.1} paramName="midGain" isLearning={isLearning('midGain')} onMidiLearn={onMidiLearn} />
                    <Knob label="High Gain" value={highGain} setValue={(v) => handleValueChange('highGain', v)} min={-12} max={12} step={0.1} paramName="highGain" isLearning={isLearning('highGain')} onMidiLearn={onMidiLearn} />
                    <Knob label="Smart Focus" value={smartFocus} setValue={(v) => handleValueChange('smartFocus', v)} paramName="smartFocus" isLearning={isLearning('smartFocus')} onMidiLearn={onMidiLearn} />
                    <Knob label="Mix" value={mix} setValue={(v) => handleValueChange('mix', v)} paramName="mix" isLearning={isLearning('mix')} onMidiLearn={onMidiLearn} />
                    <Knob label="Output" value={output} setValue={(v) => handleValueChange('output', v)} paramName="output" isLearning={isLearning('output')} onMidiLearn={onMidiLearn} />
                </div>
            </div>
        </PluginContainer>
    );
};
