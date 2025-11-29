
import React, { useEffect, useRef } from 'react';
import { PluginContainer } from '../shared/PluginContainer';
import { MixxAnalyzerProSettings, PluginComponentProps, AudioSignal, GlobalSettings } from '../../types';
import { mapRange } from '../../lib/utils';
import { VstBridge, VisualizerData } from '../../vst/VstBridge';
import { useVstBridge } from '../../vst/useVstBridge';

// --- VST Architecture ---

interface AnalyzerVisualizerData extends VisualizerData {
    lufs: { i: number; s: number; m: number };
    truePeak: number;
    correlation: number;
    imageData: ImageData | null;
    peakLevels: number[];
}

class MixxAnalyzerProVstBridge extends VstBridge<MixxAnalyzerProSettings> {
    private peakLevels: number[] = [];
    private lufs = { i: -23, s: -18, m: -16 };
    private truePeak = -1.1;
    private correlation = 0.8;
    private lastLufsUpdateTime = 0;
    
    // Store canvas context data within the bridge
    private lastImageData: ImageData | null = null;

    // FIX: Convert dspProcess to an arrow function to bind 'this' context correctly.
    public dspProcess = (
        audioSignal: AudioSignal,
        width: number,
        height: number,
        globalSettings: GlobalSettings
    ): AnalyzerVisualizerData => {
        const bars = globalSettings.visualizerComplexity === 'low' ? 64 : 128;
        if (this.peakLevels.length !== bars) {
            this.peakLevels = Array(bars).fill(0);
        }

        const waterfallFade = mapRange(globalSettings.animationIntensity, 0, 100, 0.99, 0.9);
        const peakDecay = mapRange(globalSettings.animationIntensity, 0, 100, 0.998, 0.99);

        // --- Waterfall Image Data Calculation ---
        let newImageData: ImageData | null = null;
        if (width > 0 && height > 0) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = width;
            tempCanvas.height = height;
            const ctx = tempCanvas.getContext('2d');

            if (ctx) {
                // Apply fade effect
                ctx.globalAlpha = waterfallFade;
                if (this.lastImageData) {
                    ctx.putImageData(this.lastImageData, 0, 1);
                }
                ctx.globalAlpha = 1.0;

                // Draw new top line
                const barWidth = width / bars;
                for (let i = 0; i < bars; i++) {
                    const power = Math.pow(audioSignal.waveform[i * Math.floor(audioSignal.waveform.length / bars)] * 0.5 + 0.5, 2);
                    const hue = 210 + (i / bars) * 90;
                    ctx.fillStyle = `hsla(${hue}, 90%, ${65 * power}%, 1)`;
                    ctx.fillRect(i * barWidth, 0, barWidth, 1);
                }
                newImageData = ctx.getImageData(0, 0, width, height);
                this.lastImageData = newImageData;
            }
        }

        // --- Peak Level Calculation ---
        this.peakLevels = this.peakLevels.map((p, i) => {
            const power = Math.pow(audioSignal.waveform[i * Math.floor(audioSignal.waveform.length / bars)] * 0.5 + 0.5, 2);
            return Math.max(power, p * peakDecay);
        });

        // --- LUFS & Meter Simulation ---
        if (audioSignal.time > this.lastLufsUpdateTime + 0.5) {
            this.lastLufsUpdateTime = audioSignal.time;
            const levelFactor = audioSignal.level / 50; // Use overall level for dynamics
            this.lufs = {
                i: -23 + (Math.random() - 0.5) * 5 * levelFactor,
                s: -12 + (Math.random() - 0.5) * 10 * levelFactor,
                m: -10 + (Math.random() - 0.5) * 8 * levelFactor,
            };
            this.truePeak = -2 + Math.random() * levelFactor;
            this.correlation = (Math.sin(audioSignal.time * 2) * 0.5 + Math.sin(audioSignal.time * 5)) * 0.5 * 0.8;
        }

        return {
            lufs: { ...this.lufs },
            truePeak: this.truePeak,
            correlation: this.correlation,
            imageData: newImageData,
            peakLevels: [...this.peakLevels],
        };
    }
}


// --- UI Components ---

const Analyzer: React.FC<{ visualizerData: AnalyzerVisualizerData | null, setCanvasSize: (w: number, h: number) => void }> = 
({ visualizerData, setCanvasSize }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const rect = canvas.getBoundingClientRect();
            setCanvasSize(rect.width, rect.height);
        }
    }, [setCanvasSize]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !visualizerData) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { width, height } = canvas;
        const { imageData, peakLevels } = visualizerData;

        ctx.clearRect(0, 0, width, height);

        if (imageData) {
            ctx.putImageData(imageData, 0, 0);
        }
        
        // Draw peak levels
        const bars = peakLevels.length;
        const barWidth = width / bars;
        for (let i = 0; i < bars; i++) {
             const peakY = (1 - peakLevels[i]) * height;
             if (peakY < height - 1) {
                 const hue = 210 + (i / bars) * 90;
                 ctx.fillStyle = `hsla(${hue}, 90%, 85%, 0.8)`;
                 ctx.fillRect(i * barWidth, peakY, barWidth, 1);
             }
        }
    }, [visualizerData]);

    const { lufs, truePeak, correlation } = visualizerData || { lufs: {i:0,s:0,m:0}, truePeak: 0, correlation: 0 };

    return (
        <div className="w-full h-full flex gap-4">
            <div className="flex-1 flex flex-col gap-4">
                <div className="flex-1 bg-black/30 border border-white/10 rounded-lg [perspective:1000px] overflow-hidden">
                    <canvas ref={canvasRef} className="w-full h-full rounded-lg" style={{transform: 'rotateX(30deg) scale(1.2)'}}/>
                </div>
                <div className="h-6 bg-black/30 rounded-full border border-white/10 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-y-1/2 h-full w-px bg-white/30" />
                    <div className="absolute top-1/2 -translate-y-1/2 h-4 w-1 rounded-sm transition-all duration-100" style={{
                        left: `${(correlation + 1) / 2 * 100}%`,
                        transform: `translateX(-50%) translateY(-50%)`,
                        background: `hsl(${correlation * 60 + 60}, 100%, 60%)`,
                    }}/>
                </div>
            </div>
            <div className="w-48 flex flex-col justify-around text-right font-mono">
                <div>
                    <span className="text-white/50 block">Integrated</span>
                    <span className="text-2xl text-cyan-300">{lufs.i.toFixed(1)} LUFS</span>
                </div>
                 <div>
                    <span className="text-white/50 block">Short Term</span>
                    <span className="text-2xl text-cyan-300">{lufs.s.toFixed(1)} LUFS</span>
                </div>
                 <div>
                    <span className="text-white/50 block">Momentary</span>
                    <span className="text-2xl text-cyan-300">{lufs.m.toFixed(1)} LUFS</span>
                </div>
                 <div>
                    <span className="text-white/50 block">True Peak</span>
                    <span className="text-2xl text-cyan-300">{truePeak.toFixed(1)} dBTP</span>
                </div>
            </div>
        </div>
    );
}

export const MixxAnalyzerPro: React.FC<PluginComponentProps<MixxAnalyzerProSettings>> = ({ 
    isDragging, isResizing, name, description, onClose, globalSettings, audioSignal, pluginState
}) => {
    const { visualizerData, setCanvasSize } = useVstBridge(
        pluginState,
        audioSignal,
        globalSettings,
        (initialState) => new MixxAnalyzerProVstBridge(initialState)
    );

    return (
        <PluginContainer title={name} subtitle={description} isDragging={isDragging} isResizing={isResizing} onClose={onClose}>
            <div className="w-full h-full p-4">
                <Analyzer visualizerData={visualizerData as AnalyzerVisualizerData | null} setCanvasSize={setCanvasSize} />
            </div>
        </PluginContainer>
    );
};
