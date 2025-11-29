
import React, { useEffect, useRef, useMemo } from 'react';
import { PluginContainer } from '../shared/PluginContainer';
import { Knob } from '../shared/Knob';
import { MixxAuraSettings, PluginComponentProps, AudioSignal, GlobalSettings, SessionContext } from '../../types';
import { PrimeBrainStub } from '../../lib/PrimeBrainStub';
import { ToggleButton } from '../shared/ToggleButton';
import { mapRange } from '../../lib/utils';
import { VstBridge, VisualizerData } from '../../vst/VstBridge';
import { useVstBridge } from '../../vst/useVstBridge';

// --- VST Architecture ---

interface Star {
    id: number;
    left: string;
    top: string;
    opacity: number;
    animation: string;
    animationDelay: string;
}

interface AuraVisualizerData extends VisualizerData {
    scale: number;
    opacity: number;
    animationDuration1: number;
    animationDuration2: number;
    hue1: number;
    hue2: number;
    stars: Star[];
    nebulaOpacity: number;
}

class MixxAuraVstBridge extends VstBridge<MixxAuraSettings> {
    private shimmerDecay: number = 0;

    // FIX: Convert dspProcess to an arrow function to bind 'this' context correctly.
    public dspProcess = (
        audioSignal: AudioSignal,
        width: number,
        height: number,
        globalSettings: GlobalSettings,
        extraData?: Record<string, any>
    ): AuraVisualizerData => {
        const { tone, width: widthParam, shine, moodLock, mix } = this.settings;
        const mood = extraData?.mood || 'Neutral';

        // Shimmer effect on transients
        if (audioSignal.transients) {
            this.shimmerDecay = 1.0;
        } else {
            this.shimmerDecay = Math.max(0, this.shimmerDecay * 0.9);
        }

        const normalizedTone = tone / 100;
        const normalizedWidth = widthParam / 100;
        const normalizedShine = shine / 100;
        const normalizedMix = mix / 100;

        const animationSpeedMultiplier = mapRange(globalSettings.animationIntensity, 0, 100, 1.5, 0.5);
        const starCountMultiplier = globalSettings.visualizerComplexity === 'low' ? 0.5 : 1;

        const scale = 1 + normalizedWidth * 0.5 * normalizedMix;
        const opacity = normalizedMix;

        const baseHue = moodLock ? 330 : {
            'Neutral': 240, 'Warm': 30, 'Bright': 180, 'Dark': 270, 'Energetic': 330
        }[mood as string] || 240;

        const hue1 = baseHue + (normalizedTone - 0.5) * 60;
        const hue2 = hue1 + 60 + normalizedWidth * 30;

        // Boost star count and nebula brightness on shimmer
        const shimmerBoost = this.shimmerDecay * 2;
        const starCount = Math.round((5 + normalizedShine * 50 * normalizedMix) * starCountMultiplier * (1 + shimmerBoost));
        const nebulaOpacity = Math.min(1, 0.5 + shimmerBoost * 0.5);
        
        const stars: Star[] = Array.from({ length: starCount }).map((_, i) => ({
            id: i,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            opacity: normalizedShine * (0.5 + Math.random() * 0.5) * normalizedMix * (1 + shimmerBoost),
            animation: `sparkle-animation ${2 + Math.random() * 3}s infinite ease-in-out`,
            animationDelay: `${Math.random() * 5}s`,
        }));

        const animationDuration1 = (25 - normalizedWidth * 15) * animationSpeedMultiplier;
        const animationDuration2 = (30 - normalizedWidth * 15) * animationSpeedMultiplier;

        return {
            scale,
            opacity,
            animationDuration1,
            animationDuration2,
            hue1,
            hue2,
            stars,
            nebulaOpacity,
        };
    }
}


// --- UI Components ---

const Nebula: React.FC<{ visualizerData: AuraVisualizerData | null }> = ({ visualizerData }) => {
    const stars = useMemo(() => visualizerData?.stars || [], [visualizerData]);
    
    if (!visualizerData) {
        return <div className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden [perspective:1000px]" />;
    }
    
    const { scale, opacity, animationDuration1, animationDuration2, hue1, hue2, nebulaOpacity } = visualizerData;

    return (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden [perspective:1000px]">
            {/* Nebula Layers */}
            <div className="absolute w-full h-full transition-all duration-500" style={{transform: `scale(${scale})`, opacity: opacity}}>
                <div className="absolute w-[150%] h-[150%] top-[-25%] left-[-25%] rounded-full" style={{
                    background: `radial-gradient(circle, hsla(${hue1}, 90%, 60%, ${nebulaOpacity}) 0%, transparent 70%)`,
                    animation: `nebula-rotate ${animationDuration1}s linear infinite`,
                    transition: 'background 0.2s ease-out'
                }} />
                <div className="absolute w-[150%] h-[150%] top-[-25%] left-[-25%] rounded-full" style={{
                    background: `radial-gradient(circle, hsla(${hue2}, 90%, 60%, ${nebulaOpacity}) 0%, transparent 70%)`,
                    animation: `nebula-rotate ${animationDuration2}s linear infinite reverse`,
                    transition: 'background 0.2s ease-out'
                }} />
            </div>

            {/* Stars */}
            <div className="absolute w-full h-full">
                {stars.map((star) => (
                    <div key={star.id} className="absolute w-1 h-1 bg-white rounded-full" style={{
                        left: star.left,
                        top: star.top,
                        opacity: star.opacity,
                        animation: star.animation,
                        animationDelay: star.animationDelay,
                    }} />
                ))}
            </div>

             <style>{`
                @keyframes nebula-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
             `}</style>
        </div>
    );
};


export const MixxAura: React.FC<PluginComponentProps<MixxAuraSettings>> = ({ 
    isDragging, isResizing, name, description, sessionContext, setSessionContext, pluginState, setPluginState, isLearning, onMidiLearn, onClose, globalSettings, audioSignal
}) => {
    const { 
        tone, width, shine, moodLock, mix, output
    } = pluginState;
    const visualizerContainerRef = useRef<HTMLDivElement>(null);
    
    const { visualizerData, setCanvasSize } = useVstBridge(
        pluginState,
        audioSignal,
        globalSettings,
        (initialState) => new MixxAuraVstBridge(initialState),
        { mood: sessionContext.mood } // Pass extra data to the bridge
    );

    useEffect(() => {
        const container = visualizerContainerRef.current;
        if (container) {
            setCanvasSize(container.offsetWidth, container.offsetHeight);
        }
    }, [setCanvasSize]);
    
    const handleValueChange = (param: keyof MixxAuraSettings, value: number | boolean) => {
        // FIX: Use a functional update for setPluginState to ensure type correctness and prevent race conditions.
        setPluginState(prevState => ({ ...prevState, [param]: value }));
        PrimeBrainStub.sendEvent('parameter_change', { plugin: 'mixx-aura', parameter: param, value });
    };

    return (
        <PluginContainer title={name} subtitle={description} isDragging={isDragging} isResizing={isResizing} onClose={onClose}>
            <div className="w-full h-full flex flex-col items-center justify-between gap-6 p-4">
                <div ref={visualizerContainerRef} className="relative w-full h-48 border-2 border-pink-400/30 rounded-lg shadow-[0_0_20px_rgba(236,72,153,0.2)] bg-black/20 overflow-hidden">
                    <Nebula visualizerData={visualizerData as AuraVisualizerData | null} />
                </div>

                <div className="flex flex-wrap justify-center gap-4">
                    <Knob label="Tone" value={tone} setValue={(val) => handleValueChange('tone', val)} paramName="tone" min={0} max={100} step={1} isLearning={isLearning('tone')} onMidiLearn={onMidiLearn} />
                    <Knob label="Width" value={width} setValue={(val) => handleValueChange('width', val)} paramName="width" min={0} max={100} step={1} isLearning={isLearning('width')} onMidiLearn={onMidiLearn} />
                    <Knob label="Shine" value={shine} setValue={(val) => handleValueChange('shine', val)} paramName="shine" min={0} max={100} step={1} isLearning={isLearning('shine')} onMidiLearn={onMidiLearn} />
                    <Knob label="Mix" value={mix} setValue={(val) => handleValueChange('mix', val)} paramName="mix" isLearning={isLearning('mix')} onMidiLearn={onMidiLearn} />
                    {/* FIX: Changed parameter name from 'v' to 'val' for consistency and to fix potential scope/linting errors. */}
                    <Knob label="Output" value={output} setValue={(val) => handleValueChange('output', val)} paramName="output" isLearning={isLearning('output')} onMidiLearn={onMidiLearn} />
                </div>
                
                <div className="flex justify-center">
                    <ToggleButton label="Mood Lock" value={moodLock} onChange={(val) => handleValueChange('moodLock', val)} color="pink" />
                    <button 
                        onClick={() => setSessionContext({mood: 'Energetic'})} 
                        className="px-4 py-2 ml-2 rounded-lg text-sm font-bold bg-purple-600/40 text-purple-200 hover:bg-purple-600/60 transition-colors"
                    >
                        Set Energetic Mood
                    </button>
                </div>
            </div>
        </PluginContainer>
    );
};
export default MixxAura;
