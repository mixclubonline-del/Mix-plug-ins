
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PluginContainer } from '../shared/PluginContainer';
import { Knob } from '../shared/Knob';
import { MixxBrainwaveSettings, PluginComponentProps, AudioSignal, GlobalSettings } from '../../types';
import { PrimeBrainStub } from '../../lib/PrimeBrainStub';
import { mapRange } from '../../lib/utils';
import { VstBridge, VisualizerData } from '../../vst/VstBridge';
import { useVstBridge } from '../../vst/useVstBridge';

// --- VST Architecture ---

interface Line {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

interface BrainwaveVisualizerData extends VisualizerData {
    lines: Line[];
    strokeStyle: string;
    lineWidth: number;
}

class MixxBrainwaveVstBridge extends VstBridge<MixxBrainwaveSettings> {
    private lastDrawTime: number = 0;
    private lines: Line[] = [];

    // FIX: Convert dspProcess to an arrow function to bind 'this' context correctly.
    public dspProcess = (
        audioSignal: AudioSignal,
        width: number,
        height: number,
        globalSettings: GlobalSettings
    ): BrainwaveVisualizerData => {
        const { seed, variation, intensity } = this.settings;
        
        const redrawInterval = mapRange(globalSettings.animationIntensity, 0, 100, 200, 50);

        // Redraw lines on interval
        if (audioSignal.time * 1000 > this.lastDrawTime + redrawInterval) {
            this.lastDrawTime = audioSignal.time * 1000;
            
            const numLines = (globalSettings.visualizerComplexity === 'low' ? 5 : 10) + Math.floor((intensity / 100) * (globalSettings.visualizerComplexity === 'low' ? 20 : 40));
            const rand = (s: number) => () => (s = Math.sin(s) * 10000, s - Math.floor(s));
            const seededRand = rand(seed + this.lastDrawTime * 0.001);

            const normalizedVariation = variation / 100;

            this.lines = Array.from({ length: numLines }).map(() => {
                const x1 = seededRand() * width;
                const y1 = seededRand() * height;
                const angle = seededRand() * Math.PI * 2;
                const length = (seededRand() * 0.5 + 0.5) * (width * 0.1) * (1 + normalizedVariation * 2);

                const x2 = x1 + Math.cos(angle) * length;
                const y2 = y1 + Math.sin(angle) * length;
                
                return { x1, y1, x2, y2 };
            });
        }

        const lineOpacity = 0.5 + (intensity / 100) * 0.5;

        return {
            lines: [...this.lines],
            strokeStyle: `hsla(250, 80%, 70%, ${lineOpacity})`,
            lineWidth: 1 + (variation / 100) * 2,
        };
    }
}


// --- UI Components ---

const BrainwaveVisualizer: React.FC<{ visualizerData: BrainwaveVisualizerData | null, setCanvasSize: (w: number, h: number) => void }> = 
({ visualizerData, setCanvasSize }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.scale(dpr, dpr);
            setCanvasSize(rect.width, rect.height);
        }
    }, [setCanvasSize]);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width, height } = canvas;
        ctx.clearRect(0, 0, width, height);
        
        if (!visualizerData) return;
        const { lines, strokeStyle, lineWidth } = visualizerData;

        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;

        for (const line of lines) {
            ctx.beginPath();
            ctx.moveTo(line.x1, line.y1);
            ctx.lineTo(line.x2, line.y2);
            ctx.stroke();
        }

    }, [visualizerData]);

    return <canvas ref={canvasRef} className="w-full h-full" />;
};

export const MixxBrainwave: React.FC<PluginComponentProps<MixxBrainwaveSettings>> = ({ 
    isDragging, isResizing, name, description, pluginState, setPluginState, isLearning, onMidiLearn, onClose, globalSettings, audioSignal
}) => {
    const { seed, variation, intensity, mix, output } = pluginState;
    const [isThinking, setIsThinking] = useState(false);
    
    // The bridge hook manages the DSP and provides data for the visualizer.
    // We pass `isThinking` as extra data to control when the DSP is active.
    const { visualizerData, setCanvasSize } = useVstBridge(
        pluginState,
        audioSignal,
        globalSettings,
        (initialState) => new MixxBrainwaveVstBridge(initialState),
        { isThinking }
    );

    const handleValueChange = (param: keyof MixxBrainwaveSettings, value: number) => {
        // FIX: Use a functional update for setPluginState to ensure type correctness and prevent race conditions.
        setPluginState(prevState => ({ ...prevState, [param]: value }));
        PrimeBrainStub.sendEvent('parameter_change', { plugin: 'mixx-brainwave', parameter: param, value });
    };

    const generateIdea = () => {
        setIsThinking(true);
        setTimeout(() => setIsThinking(false), 1500);
    };
    
    // Only pass data to the visualizer when thinking, otherwise it clears.
    const activeVisualizerData = isThinking ? (visualizerData as BrainwaveVisualizerData) : null;

    return (
        <PluginContainer title={name} subtitle={description} isDragging={isDragging} isResizing={isResizing} onClose={onClose}>
            <div className="w-full h-full flex flex-col items-center justify-between gap-6 p-4">
                <div className="w-full flex-1 bg-black/20 border border-purple-400/20 rounded-lg">
                    <BrainwaveVisualizer visualizerData={activeVisualizerData} setCanvasSize={setCanvasSize} />
                </div>
                <div className="flex flex-wrap justify-center items-center gap-4">
                    <Knob label="Seed" value={seed} setValue={(v) => handleValueChange('seed', v)} paramName="seed" isLearning={isLearning('seed')} onMidiLearn={onMidiLearn} />
                    <Knob label="Variation" value={variation} setValue={(v) => handleValueChange('variation', v)} paramName="variation" isLearning={isLearning('variation')} onMidiLearn={onMidiLearn} />
                    <Knob label="Intensity" value={intensity} setValue={(v) => handleValueChange('intensity', v)} paramName="intensity" isLearning={isLearning('intensity')} onMidiLearn={onMidiLearn} />
                    <Knob label="Mix" value={mix} setValue={(v) => handleValueChange('mix', v)} paramName="mix" isLearning={isLearning('mix')} onMidiLearn={onMidiLearn} />
                    <Knob label="Output" value={output} setValue={(v) => handleValueChange('output', v)} paramName="output" isLearning={isLearning('output')} onMidiLearn={onMidiLearn} />
                </div>
                 <button 
                    onClick={generateIdea} 
                    disabled={isThinking}
                    className="px-8 py-4 bg-purple-600/50 rounded-lg text-white font-bold text-lg transition-all disabled:opacity-50 group
                               hover:bg-purple-600/70 group-hover:scale-105 group-hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                >
                    {isThinking ? `GENERATING...` : 'GENERATE IDEA'}
                </button>
            </div>
        </PluginContainer>
    );
};
