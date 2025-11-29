
import React, { useState } from 'react';
import { PluginContainer } from '../shared/PluginContainer';
import { Knob } from '../shared/Knob';
import { MixxMorphSettings, PluginComponentProps, AudioSignal, GlobalSettings } from '../../types';
import { PrimeBrainStub } from '../../lib/PrimeBrainStub';
import { SegmentedControl } from '../shared/SegmentedControl';
import { VstBridge, VisualizerData } from '../../vst/VstBridge';
import { useVstBridge } from '../../vst/useVstBridge';

// --- VST Architecture ---

interface MorphVisualizerData extends VisualizerData {
    maskImage: string;
}

class MixxMorphVstBridge extends VstBridge<MixxMorphSettings> {
    // FIX: Convert dspProcess to an arrow function to bind 'this' context correctly.
    public dspProcess = (
        audioSignal: AudioSignal, 
        width: number, 
        height: number, 
        globalSettings: GlobalSettings, 
        extraData?: Record<string, any>
    ): MorphVisualizerData => {
        const { morphDepth } = this.settings;
        const morphProgress = extraData?.morphProgress ?? 0;
        
        const featherWidth = Math.max(1, (morphDepth / 100) * 50); // % of width
        const wipePosition = morphProgress * (100 + featherWidth * 2) - featherWidth;

        const maskImage = `linear-gradient(to right, black ${wipePosition - featherWidth}%, transparent ${wipePosition + featherWidth}%)`;
        
        return { maskImage };
    }
}


// --- UI Components ---

const SceneA: React.FC = () => (
    <div className="w-full h-full bg-blue-900/50">
        {Array.from({length: 30}).map((_, i) => (
            <div key={i} className="absolute w-1 h-1 bg-cyan-300 rounded-full" style={{
                left: `${Math.random()*100}%`, top: `${Math.random()*100}%`,
                animation: `sparkle-animation ${2+Math.random()*3}s infinite`,
                animationDelay: `${Math.random()*5}s`,
            }}/>
        ))}
    </div>
);
const SceneB: React.FC = () => (
    <div className="w-full h-full bg-red-900/50">
        <div className="absolute inset-0 bg-gradient-radial from-rose-500/50 to-transparent animate-pulse"/>
    </div>
);

const MorphVisualizer: React.FC<{ visualizerData: MorphVisualizerData | null }> = ({ visualizerData }) => {
    const maskImage = visualizerData?.maskImage ?? 'linear-gradient(to right, black -50%, transparent -50%)';
    return (
        <>
            <div className="absolute inset-0"><SceneA /></div>
            <div className="absolute inset-0" style={{ maskImage, WebkitMaskImage: maskImage }}>
                <SceneB />
            </div>
        </>
    );
};


export const MixxMorph: React.FC<PluginComponentProps<MixxMorphSettings>> = ({ 
    isDragging, isResizing, name, description, pluginState, setPluginState, isLearning, onMidiLearn, onClose, audioSignal, globalSettings
}) => {
    const { transitionTime, morphDepth, syncMode, mix, output } = pluginState;
    const [morphProgress, setMorphProgress] = useState(0); // 0 to 1
    const [isMorphing, setIsMorphing] = useState(false);

    const { visualizerData } = useVstBridge(
        pluginState,
        audioSignal,
        globalSettings,
        (initialState) => new MixxMorphVstBridge(initialState),
        { morphProgress }
    );

    const handleValueChange = (param: keyof MixxMorphSettings, value: number | 'bpm' | 'free') => {
        // FIX: Use a functional update for setPluginState to ensure type correctness and prevent race conditions.
        setPluginState(prevState => ({ ...prevState, [param]: value }));
        PrimeBrainStub.sendEvent('parameter_change', { plugin: 'mixx-morph', parameter: param, value });
    };

    const triggerMorph = () => {
        if(isMorphing) return;
        setIsMorphing(true);
        let start: number | null = null;
        const duration = syncMode === 'bpm' ? 2000 : transitionTime;
        const targetProgress = morphProgress > 0.5 ? 0 : 1;
        const startProgress = morphProgress;

        const step = (timestamp: number) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            const easedProgress = 0.5 - 0.5 * Math.cos(progress * Math.PI); // Ease in/out
            setMorphProgress(startProgress + (targetProgress - startProgress) * easedProgress);

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                setIsMorphing(false);
            }
        };
        requestAnimationFrame(step);
    };

    return (
        <PluginContainer title={name} subtitle={description} isDragging={isDragging} isResizing={isResizing} onClose={onClose}>
            <div className="w-full h-full flex flex-col items-center justify-between gap-6 p-4">
                <div className="relative w-full flex-1 rounded-lg overflow-hidden border border-white/10">
                    <MorphVisualizer visualizerData={visualizerData as MorphVisualizerData | null} />
                     <button 
                        onClick={triggerMorph} 
                        disabled={isMorphing}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-8 py-4 bg-black/50 rounded-lg text-white font-bold text-lg transition-all disabled:opacity-50 group
                                   hover:bg-black/70 group-hover:scale-105 group-hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                    >
                        {isMorphing ? `MORPHING...` : (morphProgress > 0.5 ? 'MORPH TO A' : 'MORPH TO B')}
                    </button>
                </div>
                <div className="flex flex-wrap justify-center items-center gap-4">
                    <Knob label="Time" value={transitionTime} setValue={(v) => handleValueChange('transitionTime', v)} min={100} max={5000} step={100} paramName="transitionTime" isLearning={isLearning('transitionTime')} onMidiLearn={onMidiLearn} />
                    <Knob label="Depth" value={morphDepth} setValue={(v) => handleValueChange('morphDepth', v)} paramName="morphDepth" isLearning={isLearning('morphDepth')} onMidiLearn={onMidiLearn} />
                    <SegmentedControl label="Sync Mode" options={['bpm', 'free']} value={syncMode} onChange={(v) => handleValueChange('syncMode', v as 'bpm' | 'free')} tierColor="purple" />
                    <Knob label="Mix" value={mix} setValue={(v) => handleValueChange('mix', v)} paramName="mix" isLearning={isLearning('mix')} onMidiLearn={onMidiLearn} />
                    <Knob label="Output" value={output} setValue={(v) => handleValueChange('output', v)} paramName="output" isLearning={isLearning('output')} onMidiLearn={onMidiLearn} />
                </div>
            </div>
        </PluginContainer>
    );
};
