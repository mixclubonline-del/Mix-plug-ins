
import React, { useState, useEffect, useMemo } from 'react';
import { PluginContainer } from '../shared/PluginContainer';
import { Knob } from '../shared/Knob';
import { Waveform } from '../shared/Waveform';
import { MixxDelaySettings, PluginComponentProps, AudioSignal, GlobalSettings } from '../../types';
import { PrimeBrainStub } from '../../lib/PrimeBrainStub';
import { mapRange, getMoodHue } from '../../lib/utils';
import { VstBridge, VisualizerData } from '../../vst/VstBridge';
import { useVstBridge } from '../../vst/useVstBridge';

// --- VST Architecture ---

interface EchoData {
    key: number;
    opacity: number;
    animationName: string;
    animationDuration: number;
    animationDelay: number;
    color: string;
}

interface DelayVisualizerData extends VisualizerData {
    isFlashing: boolean;
    echos: EchoData[];
    hue: number;
}

class MixxDelayVstBridge extends VstBridge<MixxDelaySettings> {
    private lastThrowTime: number = 0;
    private isFlashing: boolean = false;
    private flashTimeout: any = null;

    // FIX: Add explicit constructor
    constructor(initialSettings: MixxDelaySettings) {
        super(initialSettings);
    }

    // FIX: Convert dspProcess to a method
    public dspProcess(
        audioSignal: AudioSignal,
        width: number,
        height: number,
        globalSettings: GlobalSettings,
        extraData?: Record<string, any>
    ): DelayVisualizerData {
        const { time, feedback, throwIntuition, mix } = this.settings;
        const mood = extraData?.mood || 'Neutral';
        const targetHue = getMoodHue(mood as import('../../types').Mood);
        const now = Date.now();

        // Simulate "Throw" logic
        if (now - this.lastThrowTime > 2000 && Math.random() < throwIntuition / 100 * 0.1) {
            this.lastThrowTime = now;
            this.isFlashing = true;
            if (this.flashTimeout) clearTimeout(this.flashTimeout);
            this.flashTimeout = setTimeout(() => { this.isFlashing = false; }, 200);
        }
        
        const animationSpeedMultiplier = mapRange(globalSettings.animationIntensity, 0, 100, 1.5, 0.5);
        const numRepeats = globalSettings.visualizerComplexity === 'low' ? 4 : 8;

        const echos: EchoData[] = [];

        for (let i = 0; i < numRepeats; i++) {
            const index = i + 1;
            const opacity = Math.pow(feedback / 100, index) * (mix / 100);
            if (opacity < 0.01) break;

            const isThrown = this.isFlashing && i < 2; // Only make first couple of echos "throw"
            const animationName = isThrown ? 'delay-throw-burst' : 'delay-fade-in';
            const animationDuration = (isThrown ? time * 0.8 : time) * animationSpeedMultiplier;
            const color = `hsl(${targetHue}, 80%, ${80 - index * 5}%)`;
            
            echos.push({
                key: index,
                opacity,
                animationName,
                animationDuration,
                animationDelay: index * time * animationSpeedMultiplier,
                color,
            });
        }

        return {
            isFlashing: this.isFlashing,
            echos,
            hue: targetHue,
        };
    }
}


// --- UI Components ---

const Echo: React.FC<EchoData> = React.memo(({ opacity, animationName, animationDuration, animationDelay, color }) => {
    return (
        <div
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{
                animation: `${animationName} ${animationDuration}ms ${animationDelay}ms forwards`,
                '--echo-opacity': opacity,
            } as React.CSSProperties}
        >
            <Waveform
                id={`delay-echo-${animationDelay}`}
                color={color}
                path="M 0 50 C 50 10, 80 90, 150 50 S 250 80, 300 50 S 420 10, 500 50"
            />
        </div>
    );
});

export const MixxDelay: React.FC<PluginComponentProps<MixxDelaySettings>> = ({
  isDragging, isResizing, name, description, pluginState, setPluginState, isLearning, onMidiLearn, onClose, globalSettings, audioSignal, sessionContext
}) => {
    const { time, feedback, throwIntuition, mix, output } = pluginState;

    const { visualizerData } = useVstBridge(
        pluginState,
        audioSignal,
        globalSettings,
        (initialState) => new MixxDelayVstBridge(initialState),
        { mood: sessionContext.mood }
    );
    
    const memoizedEchos = useMemo(() => {
        return (visualizerData as DelayVisualizerData | null)?.echos.map(echoData => <Echo key={echoData.key} {...echoData} />);
    }, [visualizerData]);


    const handleValueChange = (param: keyof MixxDelaySettings, value: number) => {
        // FIX: Use a functional update for setPluginState to ensure type correctness and prevent race conditions.
        setPluginState(prevState => ({ ...prevState, [param]: value }));
        PrimeBrainStub.sendEvent('parameter_change', { plugin: 'mixx-delay', parameter: param, value });
    };
    
    const isFlashing = (visualizerData as DelayVisualizerData | null)?.isFlashing ?? false;

    // Calculate pulse duration based on time: 2s (at 1ms) down to 0.2s (at 2000ms)
    // Formula: 2 - (time / 2000) * 1.8
    const pulseDuration = Math.max(0.2, 2 - (time / 2000) * 1.8);

    return (
        <PluginContainer title={name} subtitle={description} isDragging={isDragging} isResizing={isResizing} onClose={onClose}>
            <style>{`
                @keyframes delay-fade-in {
                    from { opacity: 0; transform: scale(0.8); }
                    to { opacity: var(--echo-opacity); transform: scale(1); }
                }
                @keyframes delay-throw-burst {
                    0% { opacity: 0; transform: scale(0.5); filter: brightness(1) blur(5px); }
                    30% { opacity: var(--echo-opacity); transform: scale(1.2); filter: brightness(2) blur(0); }
                    100% { opacity: 0; transform: scale(1); filter: brightness(1) blur(2px); }
                }
                @keyframes knob-pulse-time {
                    0%, 100% { transform: scale(1); filter: brightness(1); }
                    50% { transform: scale(1.05); filter: brightness(1.3) drop-shadow(0 0 8px var(--glow-cyan)); }
                }
            `}</style>
            <div className="w-full h-full flex flex-col items-center justify-between gap-8 p-4">
                <div className="w-full h-32 relative flex items-center justify-center overflow-hidden">
                    <div className={`absolute inset-0 w-full h-full transition-all duration-100 ${isFlashing ? 'animate-[knob-value-flash_0.2s_ease-out]' : ''}`} style={{ opacity: mix / 100 }}>
                        <Waveform animated id="delay-main" color={`hsl(${ (visualizerData as DelayVisualizerData | null)?.hue || 200 }, 80%, 60%)`} path="M 0 50 C 50 10, 80 90, 150 50 S 250 80, 300 50 S 420 10, 500 50" />
                    </div>
                    {memoizedEchos}
                </div>

                <div className="flex w-full justify-around items-center">
                    <div style={{ animation: `knob-pulse-time ${pulseDuration}s infinite ease-in-out` }}>
                        <Knob label="Time" value={time} setValue={(v) => handleValueChange('time', v)} min={1} max={2000} step={1} paramName="time" isLearning={isLearning('time')} onMidiLearn={onMidiLearn} />
                    </div>
                    <Knob label="Feedback" value={feedback} setValue={(v) => handleValueChange('feedback', v)} paramName="feedback" isLearning={isLearning('feedback')} onMidiLearn={onMidiLearn} />
                    <Knob label="Throw" value={throwIntuition} setValue={(v) => handleValueChange('throwIntuition', v)} paramName="throwIntuition" isLearning={isLearning('throwIntuition')} onMidiLearn={onMidiLearn} />
                    <Knob label="Mix" value={mix} setValue={(v) => handleValueChange('mix', v)} paramName="mix" isLearning={isLearning('mix')} onMidiLearn={onMidiLearn} />
                    <Knob label="Output" value={output} setValue={(v) => handleValueChange('output', v)} paramName="output" isLearning={isLearning('output')} onMidiLearn={onMidiLearn} />
                </div>
            </div>
        </PluginContainer>
    );
};
