
import React from 'react';
import { PluginContainer } from '../shared/PluginContainer';
import { Knob } from '../shared/Knob';
import { MixxLimiterSettings, PluginComponentProps, AudioSignal, GlobalSettings } from '../../types';
import { PrimeBrainStub } from '../../lib/PrimeBrainStub';
import { ToggleButton } from '../shared/ToggleButton';
import { mapRange } from '../../lib/utils';
import { VstBridge, VisualizerData } from '../../vst/VstBridge';
import { useVstBridge } from '../../vst/useVstBridge';

// --- VST Architecture ---

interface LimiterVisualizerData extends VisualizerData {
    levelPercent: number;
    ceilingPercent: number;
    peakHoldPercent: number;
    grPercent: number;
    gainReductionDb: number;
    isClipping: boolean;
    animationStyle: React.CSSProperties;
    shadowStyle: React.CSSProperties;
    mainColor: string;
    bgColor: string;
    meterFrom: string;
    meterTo: string;
    clipFrom: string;
    clipTo: string;
}

class MixxLimiterVstBridge extends VstBridge<MixxLimiterSettings> {
    private gainReduction: number = 0;
    private peakHoldLevel: number = -24;
    private isClipping: boolean = false;
    private clipTimeout: any = null;
    private peakHoldTimeout: any = null;

    // FIX: Convert dspProcess to an arrow function to bind 'this' context correctly.
    public dspProcess = (
        audioSignal: AudioSignal,
        width: number,
        height: number,
        globalSettings: GlobalSettings
    ): LimiterVisualizerData => {
        const { ceiling, drive, clubCheck, lookahead } = this.settings;

        const animationSpeedMultiplier = mapRange(globalSettings.animationIntensity, 0, 100, 0.5, 1.5);
        const peakDecayFactor = mapRange(globalSettings.animationIntensity, 0, 100, 0.99, 0.95);
        const grDecayFactor = mapRange(globalSettings.animationIntensity, 0, 100, 0.9, 0.7);

        let inputDb = (audioSignal.level / 100) * 30 - 24;
        inputDb += drive;

        if (clubCheck) {
            inputDb += (Math.sin(audioSignal.time * 2) * 0.5 + 0.5) * 5;
        }

        let currentLevel = inputDb;
        let currentGR = 0;
        if (inputDb > ceiling) {
            currentGR = inputDb - ceiling;
            currentLevel = ceiling;
        }

        if (currentLevel > this.peakHoldLevel) {
            this.peakHoldLevel = currentLevel;
            if (this.peakHoldTimeout) clearTimeout(this.peakHoldTimeout);
            this.peakHoldTimeout = setTimeout(() => this.peakHoldLevel *= peakDecayFactor, 1000);
        } else {
            this.peakHoldLevel *= peakDecayFactor;
        }

        if (inputDb > ceiling) {
            this.isClipping = true;
            if (this.clipTimeout) clearTimeout(this.clipTimeout);
            this.clipTimeout = setTimeout(() => { this.isClipping = false; }, (clubCheck ? 150 : 50) / animationSpeedMultiplier);
        }

        this.gainReduction = currentGR > this.gainReduction ? currentGR : this.gainReduction * grDecayFactor;

        const bgColor = clubCheck ? 'bg-black/50' : 'bg-black/30';
        const meterFrom = clubCheck ? 'from-orange-500' : 'from-yellow-500';
        const meterTo = clubCheck ? 'to-red-400' : 'to-amber-300';
        const clipFrom = clubCheck ? 'from-purple-600' : 'from-red-600';
        const clipTo = clubCheck ? 'to-pink-400' : 'to-orange-400';
        const mainColor = clubCheck ? 'text-orange-300' : 'text-yellow-300';
        const clippingGlow = globalSettings.visualizerComplexity === 'low' ? 20 : 40;

        return {
            levelPercent: Math.max(0, (audioSignal.level / 100) * 100),
            ceilingPercent: Math.max(0, (ceiling + 24) / 30 * 100),
            peakHoldPercent: Math.max(0, (this.peakHoldLevel + 24) / 30 * 100),
            grPercent: Math.min(this.gainReduction / 12, 1) * 100,
            gainReductionDb: this.gainReduction,
            isClipping: this.isClipping,
            animationStyle: { animation: clubCheck && this.isClipping ? `club-thump ${0.1 * animationSpeedMultiplier}s ease-out` : 'none' },
            shadowStyle: { boxShadow: `0 0 ${this.isClipping ? clippingGlow : 0}px ${mainColor} inset` },
            mainColor, bgColor, meterFrom, meterTo, clipFrom, clipTo,
        };
    }
}

// --- UI Components ---

const LimiterVisualizer: React.FC<{ visualizerData: LimiterVisualizerData | null }> = ({ visualizerData }) => {
    if (!visualizerData) return <div className="w-full h-full" />;

    const {
        levelPercent, ceilingPercent, peakHoldPercent, grPercent, gainReductionDb, isClipping,
        animationStyle, shadowStyle, mainColor, bgColor, meterFrom, meterTo, clipFrom, clipTo
    } = visualizerData;

    return (
        <div className="w-full h-full flex items-center justify-center gap-8 relative overflow-hidden rounded-2xl transition-all duration-300" style={{ ...animationStyle, ...shadowStyle }}>
            <div className={`w-16 h-64 ${bgColor} rounded-lg border border-white/10 relative overflow-hidden`}>
                <div className={`absolute bottom-0 w-full ${meterFrom} ${meterTo} rounded-lg transition-all duration-75`} style={{ height: `${Math.min(levelPercent, ceilingPercent)}%` }} />
                <div className={`absolute bottom-0 w-full ${clipFrom} ${clipTo} rounded-lg transition-all duration-75`} style={{ height: `${levelPercent}%`, clipPath: `inset(${100 - ceilingPercent}% 0 0 0)` }} />
                <div className="absolute w-full h-0.5 bg-white" style={{ bottom: `${ceilingPercent}%` }} />
                <div className="absolute w-full h-0.5 bg-yellow-200" style={{ bottom: `${peakHoldPercent}%`, transition: 'bottom 0.05s linear' }} />
                {isClipping && <div className="absolute top-0 w-full h-2 bg-red-400 shadow-[0_0_10px_red]" />}
            </div>
            <div className={`w-16 h-64 ${bgColor} rounded-lg border border-white/10 relative`}>
                 <div className={`absolute top-0 w-full ${clipFrom} ${clipTo} rounded-lg transition-all duration-100`} style={{ height: `${grPercent}%` }} />
                 <span className={`absolute top-[-20px] left-1/2 -translate-x-1/2 text-white/80 font-mono ${mainColor}`}>{gainReductionDb.toFixed(1)}dB</span>
                 <span className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 text-white/50 font-bold text-sm">GR</span>
            </div>
            <style>{`
                @keyframes club-thump {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.01); opacity: 0.8; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export const MixxLimiter: React.FC<PluginComponentProps<MixxLimiterSettings>> = ({
  isDragging, isResizing, name, description, pluginState, setPluginState, isLearning, onMidiLearn, isSidechainTarget, audioSignal, onClose, globalSettings
}) => {
  const { ceiling, drive, lookahead, clubCheck, sidechainActive, mix, output } = pluginState;

  const { visualizerData } = useVstBridge(
    pluginState,
    audioSignal,
    globalSettings,
    (initialState) => new MixxLimiterVstBridge(initialState)
  );

  const handleValueChange = (param: keyof MixxLimiterSettings, value: number | boolean) => {
    // FIX: Use a functional update for setPluginState to ensure type correctness and prevent race conditions.
    setPluginState(prevState => ({ ...prevState, [param]: value }));
    PrimeBrainStub.sendEvent('parameter_change', { plugin: 'mixx-limiter', parameter: param, value });
  };

  return (
    <PluginContainer title={name} subtitle={description} isDragging={isDragging} isResizing={isResizing} onClose={onClose}>
      <div className="w-full h-full flex items-center justify-around gap-6 p-4">
        <LimiterVisualizer visualizerData={visualizerData as LimiterVisualizerData | null} />
        <div className="flex flex-col flex-wrap justify-center gap-4">
          <Knob label="Ceiling" value={ceiling} setValue={(v) => handleValueChange('ceiling', v)} min={-2} max={0} step={0.1} paramName="ceiling" isLearning={isLearning('ceiling')} onMidiLearn={onMidiLearn} />
          <Knob label="Drive" value={drive} setValue={(v) => handleValueChange('drive', v)} min={0} max={24} step={0.1} paramName="drive" isLearning={isLearning('drive')} onMidiLearn={onMidiLearn} />
          <Knob label="Lookahead" value={lookahead} setValue={(v) => handleValueChange('lookahead', v)} min={0} max={10} step={0.1} paramName="lookahead" isLearning={isLearning('lookahead')} onMidiLearn={onMidiLearn} />
          <Knob label="Mix" value={mix} setValue={(v) => handleValueChange('mix', v)} paramName="mix" isLearning={isLearning('mix')} onMidiLearn={onMidiLearn} />
          <Knob label="Output" value={output} setValue={(v) => handleValueChange('output', v)} paramName="output" isLearning={isLearning('output')} onMidiLearn={onMidiLearn} />
          <div className="flex flex-col items-center justify-center gap-2 mt-4">
            <ToggleButton label="Club Check" value={clubCheck} onChange={(v) => handleValueChange('clubCheck', v)} color="amber" />
            <ToggleButton 
                label="SIDECHAIN" 
                value={sidechainActive} 
                onChange={(v) => handleValueChange('sidechainActive', v)}
                disabled={!isSidechainTarget}
                color="cyan"
             />
          </div>
        </div>
      </div>
    </PluginContainer>
  );
};
