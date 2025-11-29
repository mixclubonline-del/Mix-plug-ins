
import React, { useMemo } from 'react';
import { PluginContainer } from '../shared/PluginContainer';
import { Knob } from '../shared/Knob';
import { MixxDriveSettings, PluginComponentProps, AudioSignal, GlobalSettings } from '../../types';
import { PrimeBrainStub } from '../../lib/PrimeBrainStub';
import { mapRange } from '../../lib/utils';
import { VstBridge, VisualizerData } from '../../vst/VstBridge';
import { useVstBridge } from '../../vst/useVstBridge';

// --- VST Architecture ---

interface PlasmaCoreVisualizerData extends VisualizerData {
    finalHue: number;
    turbulence: number;
    glow: number;
    sparkCount: number;
    animationSpeedMultiplier: number;
    normalizedDrive: number;
    normalizedWarmth: number;
}

class MixxDriveVstBridge extends VstBridge<MixxDriveSettings> {
    // FIX: Convert dspProcess to an arrow function to bind 'this' context correctly.
    public dspProcess = (
        audioSignal: AudioSignal,
        width: number,
        height: number,
        globalSettings: GlobalSettings
    ): PlasmaCoreVisualizerData => {
        const { drive, warmth, color } = this.settings;

        const normalizedDrive = drive / 100;
        const normalizedWarmth = warmth / 100;
        const normalizedColor = color / 100;

        const baseHue = 300 - normalizedColor * (300 - 30);
        const finalHue = baseHue - normalizedWarmth * (baseHue - 40);

        const audioLevelFactor = audioSignal.level / 100;
        const audioPeakFactor = audioSignal.peak / 255;

        const turbulence = 1 + normalizedDrive * 5 + audioLevelFactor * 3;
        const glow = 20 + normalizedDrive * 80 + audioPeakFactor * 50;
        const sparkCount = Math.floor(normalizedDrive * (globalSettings.visualizerComplexity === 'low' ? 5 : 20) + audioPeakFactor * (globalSettings.visualizerComplexity === 'low' ? 2 : 10));

        const animationSpeedMultiplier = mapRange(globalSettings.animationIntensity, 0, 100, 1.5, 0.5);

        return {
            finalHue,
            turbulence,
            glow,
            sparkCount,
            animationSpeedMultiplier,
            normalizedDrive,
            normalizedWarmth,
        };
    }
}


// --- UI Components ---

const Sparks: React.FC<{ count: number }> = ({ count }) => {
    const sparks = useMemo(() => Array.from({ length: count }).map((_, i) => ({
        id: i,
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        duration: `${0.2 + Math.random() * 0.3}s`,
        delay: `${Math.random() * 0.5}s`,
    })), [count]);

    return (
        <div className="absolute inset-0">
            {sparks.map(s => (
                <div key={s.id} className="absolute w-1 h-1 bg-white rounded-full" style={{
                    top: s.top,
                    left: s.left,
                    animation: `sparkle-animation ${s.duration} ${s.delay} infinite`,
                }} />
            ))}
        </div>
    );
};

const PlasmaCore: React.FC<{ visualizerData: PlasmaCoreVisualizerData | null }> = ({ visualizerData }) => {
    if (!visualizerData) {
        return <div className="w-full h-full bg-black/20" />;
    }

    const { finalHue, turbulence, glow, sparkCount, animationSpeedMultiplier, normalizedDrive, normalizedWarmth } = visualizerData;

    return (
        <div className="relative w-full h-full flex items-center justify-center filter">
            <svg className="absolute w-full h-full overflow-visible">
                <defs>
                    <filter id="plasma_filter">
                        <feGaussianBlur in="SourceGraphic" stdDeviation={15 * (1 + normalizedDrive)} result="blur"></feGaussianBlur>
                        <feColorMatrix in="blur" mode="matrix" values={`1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${20 + normalizedWarmth * 20} -${10 + normalizedDrive * 10}`} result="contrast"></feColorMatrix>
                        <feBlend in="SourceGraphic" in2="contrast"></feBlend>
                    </filter>
                </defs>
            </svg>
            <div 
                className="w-full h-full absolute"
                style={{ filter: 'url(#plasma_filter)' }}
            >
                <div 
                    className="absolute w-[150%] h-[150%] top-[-25%] left-[-25%] bg-gradient-radial from-transparent"
                    style={{ 
                        '--tw-gradient-from': `hsl(${finalHue}, 90%, 60%)`,
                        '--tw-gradient-to': 'transparent',
                        animation: `plasma-rotate ${10 / turbulence * animationSpeedMultiplier}s linear infinite`,
                    } as React.CSSProperties}
                />
                <div 
                     className="absolute w-[150%] h-[150%] top-[-25%] left-[-25%] bg-gradient-radial from-transparent"
                     style={{ 
                        '--tw-gradient-from': `hsl(${finalHue + 40}, 90%, 60%)`,
                        '--tw-gradient-to': 'transparent',
                        animation: `plasma-rotate ${12 / turbulence * animationSpeedMultiplier}s linear infinite reverse`,
                    } as React.CSSProperties}
                />
            </div>
             <style>{`
                @keyframes plasma-rotate {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
            <div className="absolute w-full h-full rounded-full" style={{boxShadow: `inset 0 0 ${glow}px hsla(${finalHue}, 90%, 70%, 0.8)`}} />
            <Sparks count={sparkCount} />
        </div>
    );
}

export const MixxDrive: React.FC<PluginComponentProps<MixxDriveSettings>> = ({ 
  isDragging, isResizing, name, description, pluginState, setPluginState, isLearning, onMidiLearn, audioSignal, onClose, globalSettings
}) => {
    const { drive, warmth, color, mix, output } = pluginState; 

    const { visualizerData } = useVstBridge(
        pluginState,
        audioSignal,
        globalSettings,
        (initialState) => new MixxDriveVstBridge(initialState)
    );

    const handleValueChange = (param: keyof MixxDriveSettings, value: number) => {
        // FIX: Use a functional update for setPluginState to ensure type correctness and prevent race conditions.
        setPluginState(prevState => ({ ...prevState, [param]: value }));
        PrimeBrainStub.sendEvent('parameter_change', { plugin: 'mixx-drive', parameter: param, value });
    };

    return (
        <PluginContainer title={name} subtitle={description} isDragging={isDragging} isResizing={isResizing} onClose={onClose}>
            <div className="w-full h-full flex flex-col items-center justify-between gap-8 p-4">
                <div className="relative w-48 h-48 flex-shrink-0">
                    <PlasmaCore visualizerData={visualizerData as PlasmaCoreVisualizerData | null} />
                    <span className="font-orbitron text-white/80 relative z-10 text-xl font-bold flex items-center justify-center w-full h-full">{drive.toFixed(1)}%</span>
                </div>
                
                <div className="flex flex-row flex-wrap justify-center gap-4">
                    <Knob label="Drive" value={drive} setValue={(v) => handleValueChange('drive', v)} paramName="drive" isLearning={isLearning('drive')} onMidiLearn={onMidiLearn} />
                    <Knob label="Warmth" value={warmth} setValue={(v) => handleValueChange('warmth', v)} paramName="warmth" isLearning={isLearning('warmth')} onMidiLearn={onMidiLearn} />
                    <Knob label="Color" value={color} setValue={(v) => handleValueChange('color', v)} paramName="color" isLearning={isLearning('color')} onMidiLearn={onMidiLearn} />
                    <Knob label="Mix" value={mix} setValue={(v) => handleValueChange('mix', v)} paramName="mix" isLearning={isLearning('mix')} onMidiLearn={onMidiLearn} />
                    <Knob label="Output" value={output} setValue={(v) => handleValueChange('output', v)} paramName="output" isLearning={isLearning('output')} onMidiLearn={onMidiLearn} />
                </div>
            </div>
        </PluginContainer>
    );
};
