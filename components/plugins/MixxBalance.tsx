
import React from 'react';
import { PluginContainer } from '../shared/PluginContainer';
import { Knob } from '../shared/Knob';
import { MixxBalanceSettings, PluginComponentProps, AudioSignal, GlobalSettings } from '../../types';
import { PrimeBrainStub } from '../../lib/PrimeBrainStub';
import { mapRange } from '../../lib/utils';
import { VstBridge, VisualizerData } from '../../vst/VstBridge';
import { useVstBridge } from '../../vst/useVstBridge';

// --- VST Architecture ---

interface BalanceVisualizerData extends VisualizerData {
    tiltColorStop1: string;
    tiltColorStop2: string;
    correlationArcLength: number;
    correlationDashoffset: number;
    lissajousPath: string;
    animationDuration: string;
    showDetailedGrid: boolean;
}

class MixxBalanceVstBridge extends VstBridge<MixxBalanceSettings> {
    // FIX: Convert dspProcess to an arrow function to bind 'this' context correctly.
    public dspProcess = (
        audioSignal: AudioSignal,
        width: number,
        height: number,
        globalSettings: GlobalSettings
    ): BalanceVisualizerData => {
        const { width: widthParam, phase, tilt } = this.settings;
        
        const correlation = Math.cos((phase / 100) * Math.PI);
        const normalizedWidth = widthParam / 100;
        const normalizedPhase = phase / 100;
        const normalizedTilt = (tilt - 50) / 50;
    
        const tiltColorStop1 = `hsl(210, 90%, ${75 + normalizedTilt * 10}%)`;
        const tiltColorStop2 = `hsl(40, 90%, ${70 - normalizedTilt * 10}%)`;
    
        const correlationAngle = (1 - correlation) * 90; 
        const correlationCircumference = Math.PI * 180;
        const correlationArcLength = correlationCircumference / 2;
        const correlationDashoffset = (correlationAngle / 180) * correlationArcLength;
    
        const animationSpeedMultiplier = mapRange(globalSettings.animationIntensity, 0, 100, 1.5, 0.5);

        // --- Lissajous Figure Calculation ---
        const points = [];
        const scale = 80 * (1 + normalizedWidth * 0.5);
        for (let i = 0; i < audioSignal.waveform.length; i += 4) {
            // Simulate L/R channels from mono waveform for visualization
            const left = audioSignal.waveform[i];
            const right = audioSignal.waveform[i + Math.floor(normalizedPhase * 10)]; // Phase shift
            
            const x = (left + right) / 2 * scale;
            const y = (left - right) / 2 * scale;
            points.push(`${(x).toFixed(2)},${(y).toFixed(2)}`);
        }
        const lissajousPath = "M " + points.join(" L ");

        return {
            tiltColorStop1,
            tiltColorStop2,
            correlationArcLength,
            correlationDashoffset,
            lissajousPath,
            animationDuration: `${8 * animationSpeedMultiplier}s`,
            showDetailedGrid: globalSettings.visualizerComplexity === 'high',
        };
    }
}


// --- UI Components ---

const Vectorscope: React.FC<{ visualizerData: BalanceVisualizerData | null }> = ({ visualizerData }) => {
    if (!visualizerData) {
        return <div className="w-full h-full" />;
    }
    const { 
        tiltColorStop1, tiltColorStop2, correlationArcLength, correlationDashoffset, 
        lissajousPath, animationDuration, showDetailedGrid
    } = visualizerData;

    return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <svg viewBox="0 0 200 200" className="w-full h-full">
                <defs>
                    <linearGradient id="balance-tilt-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={tiltColorStop1} />
                        <stop offset="100%" stopColor={tiltColorStop2} />
                    </linearGradient>
                    <filter id="balance-glow">
                        <feGaussianBlur stdDeviation="3.5" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>

                <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(0, 255, 255, 0.1)" strokeWidth="1" />
                <path d="M 10 100 H 190 M 100 10 V 190" stroke="rgba(0, 255, 255, 0.1)" strokeWidth="1" />
                {showDetailedGrid && (
                    <>
                        <circle cx="100" cy="100" r="60" fill="none" stroke="rgba(0, 255, 255, 0.05)" strokeWidth="1" />
                        <circle cx="100" cy="100" r="30" fill="none" stroke="rgba(0, 255, 255, 0.05)" strokeWidth="1" />
                        <path d="M 29.3 29.3 L 170.7 170.7 M 29.3 170.7 L 170.7 29.3" stroke="rgba(0, 255, 255, 0.1)" strokeWidth="1" />
                    </>
                )}

                <path
                    d="M 10,100 a 90,90 0 1,1 180,0"
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="4"
                    strokeDasharray="4 8"
                />
                 <path
                    d="M 10,100 a 90,90 0 1,1 180,0"
                    fill="none"
                    stroke="url(#balance-tilt-grad)"
                    strokeWidth="4"
                    strokeDasharray={`${correlationArcLength}`}
                    strokeDashoffset={correlationDashoffset}
                    className="transition-all duration-300"
                    style={{ strokeLinecap: 'round', filter: 'url(#balance-glow)' }}
                />

                 <g transform="translate(100 100)">
                     <path 
                        d={lissajousPath}
                        fill="none"
                        stroke="url(#balance-tilt-grad)"
                        strokeWidth="1.5"
                        filter="url(#balance-glow)"
                        className="animate-[balance-lissajous-breathe]"
                        style={{ animationDuration }}
                    />
                </g>
            </svg>
             <div className="w-3/4 text-center font-mono text-sm flex justify-between text-cyan-200/50 -mt-4">
                <span>-1</span>
                <span>MONO</span>
                <span>+1</span>
            </div>
        </div>
    );
};


export const MixxBalance: React.FC<PluginComponentProps<MixxBalanceSettings>> = ({
  isDragging, isResizing, name, description, pluginState, setPluginState, isLearning, onMidiLearn, audioSignal, onClose, globalSettings
}) => {
  const { width, phase, tilt, mix, output } = pluginState;
  
  const { visualizerData } = useVstBridge(
    pluginState,
    audioSignal,
    globalSettings,
    (initialState) => new MixxBalanceVstBridge(initialState)
  );

  const handleValueChange = (param: keyof MixxBalanceSettings, value: number) => {
    // FIX: Use a functional update for setPluginState to ensure type correctness and prevent race conditions.
    setPluginState(prevState => ({ ...prevState, [param]: value }));
    PrimeBrainStub.sendEvent('parameter_change', { plugin: 'mixx-balance', parameter: param, value });
  };

  return (
    <PluginContainer title={name} subtitle={description} isDragging={isDragging} isResizing={isResizing} onClose={onClose}>
      <div className="w-full h-full flex items-center justify-around gap-6 p-4">
        <div className="w-64 h-64 bg-black/20 rounded-full border border-cyan-400/20">
          <Vectorscope visualizerData={visualizerData as BalanceVisualizerData | null} />
        </div>
        <div className="flex flex-col gap-4">
            <Knob label="Width" value={width} setValue={(v) => handleValueChange('width', v)} paramName="width" isLearning={isLearning('width')} onMidiLearn={onMidiLearn} />
            <Knob label="Phase" value={phase} setValue={(v) => handleValueChange('phase', v)} paramName="phase" isLearning={isLearning('phase')} onMidiLearn={onMidiLearn} />
            <Knob label="Tilt" value={tilt} setValue={(v) => handleValueChange('tilt', v)} paramName="tilt" isLearning={isLearning('tilt')} onMidiLearn={onMidiLearn} />
            <Knob label="Mix" value={mix} setValue={(v) => handleValueChange('mix', v)} paramName="mix" isLearning={isLearning('mix')} onMidiLearn={onMidiLearn} />
            <Knob label="Output" value={output} setValue={(v) => handleValueChange('output', v)} paramName="output" isLearning={isLearning('output')} onMidiLearn={onMidiLearn} />
        </div>
      </div>
    </PluginContainer>
  );
};
