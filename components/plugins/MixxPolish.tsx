
import React, { useMemo } from 'react';
import { PluginContainer } from '../shared/PluginContainer';
import { Knob } from '../shared/Knob';
import { MixxPolishSettings, PluginComponentProps, AudioSignal, GlobalSettings } from '../../types';
import { PrimeBrainStub } from '../../lib/PrimeBrainStub';
import { mapRange } from '../../lib/utils';
import { VstBridge, VisualizerData } from '../../vst/VstBridge';
import { useVstBridge } from '../../vst/useVstBridge';

// --- VST Architecture ---

interface PolishVisualizerData extends VisualizerData {
    crystalBlur: number;
    auraSpread: number;
    animationSpeedMultiplier: number;
    numFacets: number;
    sparkleCount: number;
    facetClipPath: string;
    crystalTransform: string;
    auraBackground: string;
}

class MixxPolishVstBridge extends VstBridge<MixxPolishSettings> {
    // FIX: Convert dspProcess to an arrow function to bind 'this' context correctly.
    public dspProcess = (
        audioSignal: AudioSignal,
        width: number,
        height: number,
        globalSettings: GlobalSettings
    ): PolishVisualizerData => {
        const { clarity, air, balance, mix } = this.settings;

        const normalizedClarity = clarity / 100;
        const normalizedAir = air / 100;
        const normalizedBalance = (balance - 50) / 50;
        const normalizedMix = mix / 100;

        const crystalBlur = 5 - normalizedClarity * 5;
        const auraOpacity = normalizedAir * 0.5 * normalizedMix;
        const auraSpread = 20 + normalizedAir * 60;
        
        const animationSpeedMultiplier = mapRange(globalSettings.animationIntensity, 0, 100, 1.5, 0.5);
        const numFacets = globalSettings.visualizerComplexity === 'low' ? 4 : 6;
        const sparkleCount = Math.round(normalizedAir * (globalSettings.visualizerComplexity === 'low' ? 15 : 30) * normalizedMix);
        const facetClipPath = `polygon(50% 0%, ${100 - normalizedClarity*10}% 25%, 100% 75%, 50% 100%, ${normalizedClarity*10}% 75%, 0% 25%)`;
        const crystalTransform = `rotateY(30deg) rotateX(10deg) rotateZ(${normalizedBalance * -5}deg)`;
        const auraBackground = `radial-gradient(circle at ${50 + normalizedBalance * 20}% 50%, hsla(50, 100%, 85%, ${auraOpacity}) 0%, transparent 60%)`;

        return {
            crystalBlur,
            auraSpread,
            animationSpeedMultiplier,
            numFacets,
            sparkleCount,
            facetClipPath,
            crystalTransform,
            auraBackground
        };
    }
}


// --- UI Components ---

const CrystalVisualizer: React.FC<{ visualizerData: PolishVisualizerData | null }> = ({ visualizerData }) => {
    if (!visualizerData) return <div className="relative w-full h-full" />;

    const {
        crystalBlur,
        auraSpread,
        animationSpeedMultiplier,
        numFacets,
        sparkleCount,
        facetClipPath,
        crystalTransform,
        auraBackground
    } = visualizerData;

    const sparkles = useMemo(() => Array.from({length: sparkleCount}).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animation: `sparkle-animation ${1 + Math.random() * 2}s infinite ease-in-out`,
        animationDelay: `${Math.random() * 3}s`,
    })), [sparkleCount]);

    return (
        <div className="relative w-full h-full flex items-center justify-center [perspective:600px]">
            <div className="w-24 h-40 transition-transform duration-300" style={{
                transform: crystalTransform, 
                animation: `crystal-rotate ${20 * animationSpeedMultiplier}s linear infinite`, 
                transformStyle: 'preserve-3d'
            }}>
                {Array.from({length: numFacets}).map((_, i) => (
                     <div key={i} className="absolute w-24 h-40 border-2 border-yellow-200/50 bg-yellow-300/10 transition-all" style={{
                         transform: `rotateY(${i * (360/numFacets)}deg) translateZ(20px)`,
                         filter: `blur(${crystalBlur}px)`,
                         clipPath: facetClipPath,
                         WebkitClipPath: facetClipPath,
                     }}/>
                ))}
            </div>
            
            <div className="absolute w-full h-full" style={{
                background: auraBackground,
                filter: `blur(${auraSpread}px)`,
                transition: 'all 0.3s ease-out'
            }} />

            {sparkles.map(sparkle => (
                <div key={sparkle.id} className="absolute w-1 h-1 bg-white rounded-full" style={{
                    left: sparkle.left,
                    top: sparkle.top,
                    animation: sparkle.animation,
                    animationDelay: sparkle.animationDelay,
                }} />
            ))}

            <style>{`
                @keyframes crystal-rotate {
                    from { transform: rotateY(0deg); }
                    to { transform: rotateY(360deg); }
                }
            `}</style>
        </div>
    );
};

export const MixxPolish: React.FC<PluginComponentProps<MixxPolishSettings>> = ({
  isDragging, isResizing, name, description, pluginState, setPluginState, isLearning, onMidiLearn, onClose, globalSettings, audioSignal
}) => {
  const { clarity, air, balance, mix, output } = pluginState;

  const { visualizerData } = useVstBridge(
    pluginState,
    audioSignal,
    globalSettings,
    (initialState) => new MixxPolishVstBridge(initialState)
  );

    const handleValueChange = (param: keyof MixxPolishSettings, value: number) => {
        // FIX: Use a functional update for setPluginState to ensure type correctness and prevent race conditions.
        setPluginState(prevState => ({ ...prevState, [param]: value }));
        PrimeBrainStub.sendEvent('parameter_change', { plugin: 'mixx-polish', parameter: param, value });
    };

  return (
    <PluginContainer title={name} subtitle={description} isDragging={isDragging} isResizing={isResizing} onClose={onClose}>
      <div className="w-full h-full flex flex-col items-center justify-between gap-4 p-4">
        <div className="relative w-full h-32 flex items-center justify-center overflow-hidden flex-shrink-0">
          <CrystalVisualizer visualizerData={visualizerData as PolishVisualizerData | null} />
        </div>

        <div className="flex flex-wrap justify-center gap-4 flex-shrink-0">
          <Knob label="Clarity" value={clarity} setValue={(v) => handleValueChange('clarity', v)} paramName="clarity" isLearning={isLearning('clarity')} onMidiLearn={onMidiLearn} />
          <Knob label="Air" value={air} setValue={(v) => handleValueChange('air', v)} paramName="air" isLearning={isLearning('air')} onMidiLearn={onMidiLearn} />
          <Knob label="Balance" value={balance} setValue={(v) => handleValueChange('balance', v)} paramName="balance" isLearning={isLearning('balance')} onMidiLearn={onMidiLearn} />
          <Knob label="Mix" value={mix} setValue={(v) => handleValueChange('mix', v)} paramName="mix" isLearning={isLearning('mix')} onMidiLearn={onMidiLearn} />
          <Knob label="Output" value={output} setValue={(v) => handleValueChange('output', v)} paramName="output" isLearning={isLearning('output')} onMidiLearn={onMidiLearn} />
        </div>
      </div>
    </PluginContainer>
  );
};
