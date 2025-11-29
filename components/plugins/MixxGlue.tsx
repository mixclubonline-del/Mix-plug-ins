
import React from 'react';
import { PluginContainer } from '../shared/PluginContainer';
import { Knob } from '../shared/Knob';
import { MixxGlueSettings, PluginComponentProps, AudioSignal, GlobalSettings } from '../../types';
import { PrimeBrainStub } from '../../lib/PrimeBrainStub';
import { ToggleButton } from '../shared/ToggleButton';
import { mapRange } from '../../lib/utils';
import { VstBridge, VisualizerData } from '../../vst/VstBridge';
import { useVstBridge } from '../../vst/useVstBridge';

// --- VST Architecture ---

interface GlueVisualizerData extends VisualizerData {
    gainReductionDb: number;
    inputPosition: number;
    thresholdPosition: number;
    coreTransform: string;
    grFillOpacity: number;
    coreBoxShadow: string;
    wobbleAnimation: string;
}

class MixxGlueVstBridge extends VstBridge<MixxGlueSettings> {
    private gainReduction: number = 0;

    // FIX: Convert dspProcess to an arrow function to bind 'this' context correctly.
    public dspProcess = (
        audioSignal: AudioSignal,
        width: number, // width/height not used but part of signature
        height: number,
        globalSettings: GlobalSettings
    ): GlueVisualizerData => {
        const { threshold, ratio, release, mix, sidechainActive } = this.settings;
        
        const meterHeight = 160; // Based on original component styling
        const animationSpeedMultiplier = mapRange(globalSettings.animationIntensity, 0, 100, 0.5, 1.5);

        const level = audioSignal.level * 0.6;
        let currentGR = 0;
        const thresholdLevel = (60 + threshold);

        if (level > thresholdLevel) {
            currentGR = (level - thresholdLevel) * (1 - 1 / ratio);
        }
        
        const decayRate = 1 - Math.exp(-1000 / (release * 20)); 
        this.gainReduction = Math.max(0, currentGR > this.gainReduction ? currentGR : this.gainReduction - decayRate * 0.5 * animationSpeedMultiplier);

        const thresholdPosition = (60 + threshold) / 60 * meterHeight;
        const inputPosition = audioSignal.level / 100 * meterHeight;
        const grAmount = Math.min(this.gainReduction, 30) / 30;

        const coreSquashX = 1 + grAmount * 0.3;
        const coreSquashY = 1 - grAmount * 0.5;
        const coreTransform = `scale(${coreSquashX}, ${coreSquashY})`;
        const coreColor = sidechainActive ? 'hsla(180, 90%, 60%,' : 'hsla(270, 90%, 60%,';
        const grFillOpacity = grAmount * (mix / 100);
        
        const coreGlowIntensity = globalSettings.visualizerComplexity === 'low' ? 20 : 40;
        const coreBoxShadow = `0 0 ${grAmount * coreGlowIntensity}px ${coreColor} ${grFillOpacity * 2})`;
        const wobbleAnimation = grAmount > 0 ? 'none' : `glue-wobble ${4 * animationSpeedMultiplier}s infinite ease-in-out`;


        return {
            gainReductionDb: this.gainReduction,
            inputPosition,
            thresholdPosition,
            coreTransform,
            grFillOpacity,
            coreBoxShadow,
            wobbleAnimation,
        };
    }
}


// --- UI Components ---

const CompressionVisualizer: React.FC<{ visualizerData: GlueVisualizerData | null, sidechainActive: boolean }> = ({ visualizerData, sidechainActive }) => {
    if (!visualizerData) {
        return <div className="relative w-48 h-48 flex items-center justify-center" />;
    }

    const {
        gainReductionDb,
        inputPosition,
        thresholdPosition,
        coreTransform,
        grFillOpacity,
        coreBoxShadow,
        wobbleAnimation,
    } = visualizerData;

    const coreColor = sidechainActive ? 'hsla(180, 90%, 60%,' : 'hsla(270, 90%, 60%,';

    return (
        <div className="relative w-48 h-48 flex items-center justify-center">
            <div className="absolute left-[-40px] top-1/2 -translate-y-1/2 w-4 h-48 bg-black/30 rounded-full overflow-hidden border border-white/10">
                <div className="absolute bottom-0 w-full bg-gradient-to-t from-violet-500 to-pink-500 rounded-full transition-all duration-100" style={{height: `${inputPosition}px`}}/>
                <div className="absolute left-full w-2 h-px bg-cyan-300" style={{bottom: `${thresholdPosition}px`}} />
            </div>

            <div className="absolute inset-0 rounded-full border-2 border-violet-400/30 transition-transform duration-100" style={{
                transform: coreTransform,
                animation: wobbleAnimation
            }}>
                <div className="w-full h-full rounded-full" style={{
                    background: `radial-gradient(circle, transparent 0%, ${coreColor} ${grFillOpacity}) 100%)`,
                    boxShadow: coreBoxShadow,
                }}/>
            </div>
            <span className="font-orbitron text-xl font-bold text-violet-300/80 z-10">{gainReductionDb.toFixed(1)} dB</span>
        </div>
    );
};

export const MixxGlue: React.FC<PluginComponentProps<MixxGlueSettings>> = ({ 
  isDragging, isResizing, name, description, pluginState, setPluginState, isLearning, onMidiLearn, isSidechainTarget, audioSignal, onClose, globalSettings
}) => {
    const { threshold, ratio, release, sidechainActive, mix, output } = pluginState; 

    const { visualizerData } = useVstBridge(
        pluginState,
        audioSignal,
        globalSettings,
        (initialState) => new MixxGlueVstBridge(initialState)
    );

    const handleValueChange = (param: keyof MixxGlueSettings, value: number | boolean) => {
        // FIX: Use a functional update for setPluginState to ensure type correctness and prevent race conditions.
        setPluginState(prevState => ({ ...prevState, [param]: value }));
        PrimeBrainStub.sendEvent('parameter_change', { plugin: 'mixx-glue', parameter: param, value });
    };

    return (
        <PluginContainer title={name} subtitle={description} isDragging={isDragging} isResizing={isResizing} onClose={onClose}>
            <div className="w-full h-full flex flex-wrap items-center justify-around gap-4 p-4">
                <CompressionVisualizer visualizerData={visualizerData as GlueVisualizerData | null} sidechainActive={sidechainActive} />
                <div className="flex flex-wrap justify-center gap-4">
                    <Knob label="Threshold" value={threshold} setValue={(v) => handleValueChange('threshold', v)} paramName="threshold" min={-60} max={0} isLearning={isLearning('threshold')} onMidiLearn={onMidiLearn} />
                    <Knob label="Ratio" value={ratio} setValue={(v) => handleValueChange('ratio', v)} min={1} max={20} step={0.5} paramName="ratio" isLearning={isLearning('ratio')} onMidiLearn={onMidiLearn} />
                    <Knob label="Release" value={release} setValue={(v) => handleValueChange('release', v)} min={10} max={2000} step={10} paramName="release" isLearning={isLearning('release')} onMidiLearn={onMidiLearn} />
                    <Knob label="Mix" value={mix} setValue={(v) => handleValueChange('mix', v)} paramName="mix" isLearning={isLearning('mix')} onMidiLearn={onMidiLearn} />
                    <Knob label="Output" value={output} setValue={(v) => handleValueChange('output', v)} paramName="output" isLearning={isLearning('output')} onMidiLearn={onMidiLearn} />
                    <div className="w-28 flex justify-center items-end">
                      <ToggleButton label="SIDECHAIN" value={sidechainActive} onChange={(v) => handleValueChange('sidechainActive', v)} disabled={!isSidechainTarget} color="cyan" />
                    </div>
                </div>
            </div>
        </PluginContainer>
    );
};
