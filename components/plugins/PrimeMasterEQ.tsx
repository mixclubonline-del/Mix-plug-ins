
import React from 'react';
import { PluginContainer } from '../shared/PluginContainer';
import { Knob } from '../shared/Knob';
import { PrimeMasterEQSettings, PluginComponentProps, AudioSignal, GlobalSettings } from '../../types';
import { PrimeBrainStub } from '../../lib/PrimeBrainStub';
import { ToggleButton } from '../shared/ToggleButton';
import { mapRange } from '../../lib/utils';
import { VstBridge, VisualizerData } from '../../vst/VstBridge';
import { useVstBridge } from '../../vst/useVstBridge';

// --- VST Architecture ---

interface MasterEQVisualizerData extends VisualizerData {
    gridPoints: { key: number; delay: string }[];
    gridCols: number;
    gridRows: number;
    animationDuration: string;
    midCurvePathData: string;
    sideCurvePathData: string | null;
}

class PrimeMasterEQVstBridge extends VstBridge<PrimeMasterEQSettings> {
    private readonly width = 800;
    private readonly height = 200;
    private readonly logMinFreq = Math.log10(20);
    private readonly logMaxFreq = Math.log10(20000);

    private freqToX = (freq: number) => {
        const logFreq = Math.log10(freq);
        return ((logFreq - this.logMinFreq) / (this.logMaxFreq - this.logMinFreq)) * this.width;
    };

    private calculateCurve = (gainSettings: { lowShelfGain: number; highShelfGain: number; }): string => {
        const { lowShelfFreq, highShelfFreq } = this.settings;
        const { lowShelfGain, highShelfGain } = gainSettings;

        return Array.from({ length: 200 }).map((_, i) => {
            const x = (i / 199) * this.width;
            const linearPos = x / this.width;
            const freq = Math.pow(10, this.logMinFreq + linearPos * (this.logMaxFreq - this.logMinFreq));

            let gain = 0;
            if (freq < lowShelfFreq) gain += lowShelfGain;
            else {
                 const x_ls = 1 + (Math.log2(freq) - Math.log2(lowShelfFreq)) * 2;
                 gain += lowShelfGain / (1 + x_ls*x_ls);
            }

            if (freq > highShelfFreq) gain += highShelfGain;
            else {
                const x_hs = 1 + (Math.log2(highShelfFreq) - Math.log2(freq)) * 2;
                gain += highShelfGain / (1 + x_hs*x_hs);
            }

            const y = this.height / 2 - (gain / 24) * (this.height / 2);
            return `${x.toFixed(2)},${y.toFixed(2)}`;
        }).join(' L ');
    }

    // FIX: Convert dspProcess to an arrow function to bind 'this' context correctly.
    public dspProcess = (
        audioSignal: AudioSignal,
        width: number,
        height: number,
        globalSettings: GlobalSettings
    ): MasterEQVisualizerData => {
        const { lowShelfGain, highShelfGain, midSideMode } = this.settings;

        const gridCols = globalSettings.visualizerComplexity === 'low' ? 10 : 20;
        const gridRows = globalSettings.visualizerComplexity === 'low' ? 5 : 10;
        const animationSpeedMultiplier = mapRange(globalSettings.animationIntensity, 0, 100, 1.5, 0.5);

        const gridPoints = Array.from({ length: gridCols * gridRows }).map((_, i) => ({
            key: i,
            delay: `${(i % gridCols) * 0.1 + Math.floor(i / gridCols) * 0.15}s`,
        }));

        const midCurvePathData = this.calculateCurve({ lowShelfGain, highShelfGain });
        let sideCurvePathData: string | null = null;
        if (midSideMode) {
            // Simulate a different EQ for the side channel (e.g., less intense)
            sideCurvePathData = this.calculateCurve({ lowShelfGain: lowShelfGain * 0.5, highShelfGain: highShelfGain * 0.5 });
        }

        return {
            gridPoints,
            gridCols,
            gridRows,
            animationDuration: `${4 * animationSpeedMultiplier}s`,
            midCurvePathData,
            sideCurvePathData
        };
    }
}


// --- UI Components ---

const MasterEQVisualizer: React.FC<{ visualizerData: MasterEQVisualizerData | null, audioLevel: number }> = ({ visualizerData, audioLevel }) => {
    const width = 800, height = 200;
    const logMinFreq = Math.log10(20);
    const logMaxFreq = Math.log10(20000);

    const freqToX = (freq: number) => {
        const logFreq = Math.log10(freq);
        return ((logFreq - logMinFreq) / (logMaxFreq - logMinFreq)) * width;
    };
    
    if (!visualizerData) {
        return <div className="w-full h-full relative" />;
    }

    const { gridPoints, gridCols, gridRows, animationDuration, midCurvePathData, sideCurvePathData } = visualizerData;

    const midColor = "hsl(50, 100%, 85%)";
    const sideColor = "hsl(300, 80%, 70%)";
    const midGlow = `drop-shadow(0 0 8px ${midColor})`;
    const sideGlow = `drop-shadow(0 0 8px ${sideColor})`;

    return (
        <div className="w-full h-full relative">
            <div className={`absolute inset-0 grid grid-cols-${gridCols} grid-rows-${gridRows}`}>
                {gridPoints.map(point => (
                    <div key={point.key} className="relative flex items-center justify-center">
                        <div 
                            className="w-px h-px bg-amber-200 rounded-full"
                            style={{
                                animation: `master-eq-grid-pulse ${animationDuration} infinite ease-in-out`,
                                animationDelay: point.delay,
                                opacity: 0.1 + audioLevel / 200,
                            }}
                        />
                    </div>
                ))}
            </div>

            <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" className="absolute inset-0">
                <g opacity="0.2">
                    <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="white" strokeWidth="0.5" />
                    {[30, 100, 300, 1000, 3000, 10000].map(f => (
                        <g key={f}>
                            <line x1={freqToX(f)} y1="0" x2={freqToX(f)} y2={height} stroke="white" strokeWidth="0.5" />
                            <text x={freqToX(f) + 4} y={height - 10} fill="white" fontSize="10" fontFamily="Roboto">{f < 1000 ? f : `${f / 1000}k`}</text>
                        </g>
                    ))}
                    {[-12, -6, 6, 12].map(g => (
                        <g key={g}>
                           <line x1="0" y1={height/2 - g/12 * (height/2)} x2={width} y2={height/2 - g/12 * (height/2)} stroke="white" strokeWidth="0.5" strokeDasharray="2 4" />
                           <text x={10} y={height/2 - g/12 * (height/2) - 4} fill="white" fontSize="10" fontFamily="Roboto">{g > 0 ? '+':''}{g}</text>
                        </g>
                    ))}
                </g>

                {sideCurvePathData && (
                    <path d={`M 0,${height/2} L ${sideCurvePathData}`} fill="none" stroke={sideColor} strokeWidth="2"
                        strokeDasharray="4 4"
                        style={{ filter: sideGlow }}
                    />
                )}

                <path d={`M 0,${height/2} L ${midCurvePathData}`} fill="none" stroke={midColor} strokeWidth="3"
                    style={{ filter: midGlow }}
                />
            </svg>
        </div>
    );
};

export const PrimeMasterEQ: React.FC<PluginComponentProps<PrimeMasterEQSettings>> = ({ 
    isDragging, isResizing, name, description, pluginState, setPluginState, isLearning, onMidiLearn, audioSignal, onClose, globalSettings
}) => {
    const { lowShelfFreq, lowShelfGain, highShelfFreq, highShelfGain, midSideMode, mix, output } = pluginState;

    const { visualizerData } = useVstBridge(
        pluginState,
        audioSignal,
        globalSettings,
        (initialState) => new PrimeMasterEQVstBridge(initialState)
    );

    const handleValueChange = (param: keyof PrimeMasterEQSettings, value: number | boolean) => {
        // FIX: Use a functional update for setPluginState to ensure type correctness and prevent race conditions.
        setPluginState(prevState => ({ ...prevState, [param]: value }));
        PrimeBrainStub.sendEvent('parameter_change', { plugin: 'prime-master-eq', parameter: param, value });
    };

    return (
        <PluginContainer title={name} subtitle={description} isDragging={isDragging} isResizing={isResizing} onClose={onClose}>
            <div className="w-full h-full flex flex-col items-center justify-between gap-6 p-4">
                <div className="w-full h-48 border-y-2 border-amber-300/20 py-4">
                    <MasterEQVisualizer 
                        visualizerData={visualizerData as MasterEQVisualizerData | null}
                        audioLevel={audioSignal.level}
                    />
                </div>
                <div className="flex flex-wrap justify-center items-center gap-4">
                    <Knob label="LS Freq" value={lowShelfFreq} setValue={(v) => handleValueChange('lowShelfFreq', v)} min={20} max={800} step={1} paramName="lowShelfFreq" isLearning={isLearning('lowShelfFreq')} onMidiLearn={onMidiLearn} />
                    <Knob label="LS Gain" value={lowShelfGain} setValue={(v) => handleValueChange('lowShelfGain', v)} min={-12} max={12} step={0.1} paramName="lowShelfGain" isLearning={isLearning('lowShelfGain')} onMidiLearn={onMidiLearn} />
                    <Knob label="HS Freq" value={highShelfFreq} setValue={(v) => handleValueChange('highShelfFreq', v)} min={1000} max={20000} step={100} paramName="highShelfFreq" isLearning={isLearning('highShelfFreq')} onMidiLearn={onMidiLearn} />
                    <Knob label="HS Gain" value={highShelfGain} setValue={(v) => handleValueChange('highShelfGain', v)} min={-12} max={12} step={0.1} paramName="highShelfGain" isLearning={isLearning('highShelfGain')} onMidiLearn={onMidiLearn} />
                    <Knob label="Mix" value={mix} setValue={(v) => handleValueChange('mix', v)} paramName="mix" isLearning={isLearning('mix')} onMidiLearn={onMidiLearn} />
                    <Knob label="Output" value={output} setValue={(v) => handleValueChange('output', v)} paramName="output" isLearning={isLearning('output')} onMidiLearn={onMidiLearn} />
                    <div className="w-28 flex justify-center items-end">
                      <ToggleButton label="M/S Mode" value={midSideMode} onChange={(v) => handleValueChange('midSideMode', v)} color="amber" />
                    </div>
                </div>
            </div>
        </PluginContainer>
    );
};
