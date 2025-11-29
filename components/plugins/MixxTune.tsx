
import React, { useRef, useCallback, useEffect } from 'react';
import { PluginContainer } from '../shared/PluginContainer';
import { Knob } from '../shared/Knob';
import { MixxTuneSettings, PluginComponentProps, AudioSignal, GlobalSettings } from '../../types';
import { PrimeBrainStub } from '../../lib/PrimeBrainStub';
import { ToggleButton } from '../shared/ToggleButton';
import { mapRange } from '../../lib/utils';
import { VstBridge, VisualizerData as GenericVisualizerData } from '../../vst/VstBridge';
import { useVstBridge } from '../../vst/useVstBridge';

// --- VST Architecture Implementation ---

// 1. Specific DSP Implementation for MixxTune
// This extends the generic VstBridge and contains the actual audio logic for this plugin.
class MixxTuneVstBridge extends VstBridge<MixxTuneSettings> {
    private correctionParticles: any[] = []; // Using 'any' for simplicity in this stub
    private humanizeParticles: any[] = [];

    // FIX: Convert dspProcess to an arrow function to bind 'this' context correctly.
    public dspProcess = (
        audioSignal: AudioSignal,
        width: number,
        height: number,
        globalSettings: GlobalSettings
    ): GenericVisualizerData => {
        const { retuneSpeed, formant, humanize, mix, emotiveLock } = this.settings;

        const animationSpeedMultiplier = mapRange(globalSettings.animationIntensity, 0, 100, 1.5, 0.5);

        const targetNoteY = height / 2;
        const noteRange = height / 2.5;
        
        const normalizedRetune = retuneSpeed / 100;
        // In emotiveLock, humanize effect is drastically reduced
        const normalizedHumanize = (humanize / 100) * (emotiveLock ? 0.1 : 1);
        const normalizedMix = mix / 100;
        const audioLevel = audioSignal.level / 100;

        // --- Waveform Calculation ---
        const inputWavePoints: {x: number, y: number}[] = [];
        const correctedWavePoints: {x: number, y: number}[] = [];

        const inputWaveFunc = (x: number) => {
            const index = Math.floor((x / width) * audioSignal.waveform.length);
            const formantShift = (formant - 50) / 100 * noteRange * 0.2;
            
            // Add a subtle, slow-moving wave to the input signal to make it feel more alive
            const baseWave = audioSignal.waveform[index] * 2 - 1;
            const timeWave = Math.sin(x / (50 + normalizedHumanize * 50) + audioSignal.time * 3) * 0.1 * (1 - normalizedMix);

            return targetNoteY + formantShift + (baseWave + timeWave) * noteRange * 0.8;
        };

        const fullyCorrectedFunc = (x: number) => {
            const humanizedDeviation = (Math.sin(audioSignal.time * 7 + x / 50) * Math.cos(audioSignal.time * 2) * 15) * normalizedHumanize;
            // Add a subtle energy wave to the corrected line so it's not static.
            const energyWave = Math.sin(audioSignal.time * 6 + x / 80) * audioLevel * 3;
            return targetNoteY + humanizedDeviation + energyWave;
        };
        
        let totalCorrectionAmount = 0;

        for (let x = 0; x < width; x++) {
            const inputY = inputWaveFunc(x);
            const correctedY = fullyCorrectedFunc(x);
            
            // Interpolate based on retune speed and mix
            const error = inputY - correctedY;
            const correctionFactor = normalizedRetune * normalizedMix;
            const finalY = inputY - error * correctionFactor;
            
            totalCorrectionAmount += Math.abs(error * correctionFactor);

            inputWavePoints.push({ x, y: inputY });
            correctedWavePoints.push({ x, y: finalY });
        }
        
        // --- Correction Particle Simulation ---
        const particleEmissionChance = globalSettings.visualizerComplexity === 'low' ? 0.9 : 0.6;
        const correctionThreshold = width * 0.5; // Arbitrary threshold
        const particleLifeMultiplier = emotiveLock ? 0.5 : 1; // Faster decay in emotive lock

        if (totalCorrectionAmount > correctionThreshold && Math.random() > particleEmissionChance) {
             const lastCorrectedY = correctedWavePoints[correctedWavePoints.length - 1]?.y || height / 2;
             this.correctionParticles.push({ x: width, y: lastCorrectedY, life: 1, vx: -2, vy: (Math.random() - 0.5) * 0.5 });
        }
        
        this.correctionParticles.forEach((p, index) => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= (0.02 * animationSpeedMultiplier * particleLifeMultiplier);
            if (p.life <= 0) {
                this.correctionParticles.splice(index, 1);
            }
        });

        // --- Humanize Particle Simulation ---
        const humanizeParticleEmissionChance = globalSettings.visualizerComplexity === 'low' ? 0.8 : 0.5;
        if (normalizedHumanize > 0.01 && Math.random() > humanizeParticleEmissionChance) {
            const numToSpawn = Math.ceil(normalizedHumanize * (globalSettings.visualizerComplexity === 'low' ? 1 : 3));
            for (let i = 0; i < numToSpawn; i++) {
                this.humanizeParticles.push({
                    x: Math.random() * width,
                    y: targetNoteY + (Math.random() - 0.5) * 30 * normalizedHumanize, // spawn near center line
                    life: 1,
                    vx: (Math.random() - 0.5) * 0.2, // slow drift
                    vy: (Math.random() - 0.5) * 0.2,
                    size: 1 + Math.random() * 1.5,
                });
            }
        }

        this.humanizeParticles.forEach((p, index) => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.01 * animationSpeedMultiplier; // slower decay
            if (p.life <= 0 || p.x < 0 || p.x > width) { // remove if offscreen too
                this.humanizeParticles.splice(index, 1);
            }
        });
        
        // --- Color Pulsing for Emotive Lock ---
        const pulse = 0.5 + Math.sin(audioSignal.time * 8) * 0.5; // a value between 0 and 1
        const emotiveLockLightness = 75 + pulse * 10; // oscillates between 75% and 85%
        const emotiveLockParticleLightness = 85 + pulse * 10; // oscillates between 85% and 95%
        const emotiveLockGlowOpacity = 0.15 + pulse * 0.1; // oscillates between 0.15 and 0.25

        // The DSP returns a simple data structure for the UI to render.
        return {
            inputWavePoints,
            correctedWavePoints,
            correctionParticles: [...this.correctionParticles], // Return a copy
            humanizeParticles: [...this.humanizeParticles],
            numNoteLanes: globalSettings.visualizerComplexity === 'low' ? 3 : 5,
            noteRange,
            targetNoteY,
            currentAudioLevel: audioLevel,
            retuneDisplay: `Retune: ${retuneSpeed.toFixed(0)}`,
            formantDisplay: `Formant: ${formant.toFixed(0)}`,
            humanizeDisplay: `Humanize: ${humanize.toFixed(0)}`,
            mixDisplay: `Mix: ${mix.toFixed(0)}%`,
            emotiveLockDisplay: emotiveLock ? 'EMOTIVE LOCK ON' : '',
            correctedColor: emotiveLock ? `hsla(315, 90%, ${emotiveLockLightness}%, ${0.5 + 0.5 * normalizedMix})` : `hsla(180, 90%, 65%, ${0.5 + 0.5 * normalizedMix})`,
            particleColor: emotiveLock ? `hsla(315, 90%, ${emotiveLockParticleLightness}%, ${normalizedMix})` : `hsla(180, 90%, 75%, ${normalizedMix})`,
            backgroundGlow: emotiveLock ? `radial-gradient(ellipse at center, rgba(244, 114, 182, ${emotiveLockGlowOpacity}) 0%, transparent 70%)` : 'radial-gradient(ellipse at center, rgba(0, 255, 255, 0.08) 0%, transparent 70%)',
        };
    }
}


// --- UI Components ---

// Specific data structure for this visualizer
interface PitchVisualizerData extends GenericVisualizerData {
    inputWavePoints: {x:number, y:number}[];
    correctedWavePoints: {x:number, y:number}[];
    correctionParticles: any[];
    humanizeParticles: any[];
    backgroundGlow: string;
    numNoteLanes: number;
    noteRange: number;
    targetNoteY: number;
    currentAudioLevel: number;
    retuneDisplay: string;
    formantDisplay: string;
    humanizeDisplay: string;
    mixDisplay: string;
    emotiveLockDisplay: string;
    correctedColor: string;
    particleColor: string;
}

// The PitchVisualizer (Now a "dumb" rendering component)
const PitchVisualizer: React.FC<{ 
    visualizerData: PitchVisualizerData | null;
    mix: number;
    setCanvasSize: (width: number, height: number) => void;
    globalSettings: GlobalSettings;
}> = ({ visualizerData, mix, setCanvasSize, globalSettings }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            const ctx = canvas.getContext('2d');
            ctx?.scale(dpr, dpr);
            // Inform the bridge/DSP of the canvas size
            setCanvasSize(rect.width, rect.height);
        }
    }, [setCanvasSize]);

    useEffect(() => {
        if (!visualizerData || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const { width, height } = canvas;
        ctx.clearRect(0, 0, width, height);

        const { inputWavePoints, correctedWavePoints, correctionParticles, humanizeParticles, numNoteLanes, noteRange, targetNoteY, currentAudioLevel, retuneDisplay, formantDisplay, humanizeDisplay, mixDisplay, emotiveLockDisplay, correctedColor, particleColor } = visualizerData;
        const normalizedMix = mix / 100;

        // Draw enhanced notelane grid
        for(let i = 0; i < numNoteLanes; i++) {
            const y = targetNoteY - noteRange + (i * noteRange / (numNoteLanes - 1) * 2);
            const proximity = Math.max(0, 1 - Math.abs(y - targetNoteY) / noteRange);
            ctx.strokeStyle = `rgba(0, 255, 255, ${0.05 + proximity * 0.1 * currentAudioLevel})`;
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 10]);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        ctx.setLineDash([]);
        
        const drawPath = (points: {x:number, y:number}[], color: string, lineWidth: number, shadowBlur: number = 0, shadowColor: string = 'transparent') => {
            if (points.length < 2) return;
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.shadowBlur = shadowBlur;
            ctx.shadowColor = shadowColor;
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.stroke();
        };

        // Draw humanize particles
        ctx.fillStyle = `rgba(255, 255, 255, 0.5)`;
        humanizeParticles.forEach(p => {
            ctx.globalAlpha = p.life * 0.5; // subtle
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // Draw correction particles
        ctx.fillStyle = particleColor;
        correctionParticles.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.life * (globalSettings.visualizerComplexity === 'low' ? 0.75 : 1.5), 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.globalAlpha = 1.0;

        // Draw waveforms
        drawPath(inputWavePoints, `rgba(255, 255, 255, ${0.4 * normalizedMix})`, 1.5);
        drawPath(correctedWavePoints, correctedColor, 2.5, 10, correctedColor);
        ctx.shadowBlur = 0;

        // Draw parameter text
        ctx.font = '10px "Orbitron", monospace';
        ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
        ctx.textAlign = 'left';
        ctx.fillText(retuneDisplay, 10, 20);
        ctx.textAlign = 'right';
        ctx.fillText(formantDisplay, width - 10, 20);

        ctx.textAlign = 'left';
        ctx.fillText(humanizeDisplay, 10, height - 10);
        
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
        ctx.fillText(mixDisplay, width - 10, height - 10);
        ctx.fillStyle = 'rgba(244, 114, 182, 0.8)';
        const mixTextWidth = ctx.measureText(mixDisplay).width;
        ctx.fillText(emotiveLockDisplay, width - 10 - mixTextWidth - 8, height - 10);

    }, [visualizerData, mix, globalSettings]);

    return (
      <div className="relative w-full h-full">
          {visualizerData?.backgroundGlow && (
              <div 
                  className="absolute inset-0 transition-all duration-500" 
                  style={{ background: visualizerData.backgroundGlow }} 
              />
          )}
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      </div>
    );
};

// The Main Plugin Component
export const MixxTune: React.FC<PluginComponentProps<MixxTuneSettings>> = ({ 
    isDragging, isResizing, name, description, pluginState, setPluginState, isLearning, onMidiLearn, audioSignal, onClose, globalSettings
}) => {
    const { 
        retuneSpeed, formant, humanize, emotiveLock, mix, output
    } = pluginState;
    
    // The UI now communicates with the DSP via the generic VST bridge hook.
    const { visualizerData, setCanvasSize } = useVstBridge(
        pluginState,
        audioSignal,
        globalSettings,
        (initialState) => new MixxTuneVstBridge(initialState)
    );
    
    // This existing validation logic is good and should stay.
    useEffect(() => {
        const needsUpdate =
          pluginState.retuneSpeed < 0 || pluginState.retuneSpeed > 100 || !Number.isInteger(pluginState.retuneSpeed) ||
          pluginState.formant < 0 || pluginState.formant > 100 || !Number.isInteger(pluginState.formant) ||
          pluginState.humanize < 0 || pluginState.humanize > 100 || !Number.isInteger(pluginState.humanize);
    
        if (needsUpdate) {
          setPluginState(prevState => {
            const validatedState: Partial<MixxTuneSettings> = {};
            const validate = (param: 'retuneSpeed' | 'formant' | 'humanize') => {
                const value = prevState[param];
                const clamped = Math.max(0, Math.min(100, value));
                const rounded = Math.round(clamped);
                if(rounded !== value) {
                    validatedState[param] = rounded;
                }
            }
            validate('retuneSpeed');
            validate('formant');
            validate('humanize');
            return Object.keys(validatedState).length > 0 ? validatedState : {};
          });
        }
      }, [pluginState.retuneSpeed, pluginState.formant, pluginState.humanize, setPluginState]);

    const handleValueChange = (param: keyof MixxTuneSettings, value: number | boolean) => {
        // FIX: Use a functional update for setPluginState to ensure type correctness and prevent race conditions.
        setPluginState(prevState => ({ ...prevState, [param]: value }));
        PrimeBrainStub.sendEvent('parameter_change', { plugin: 'mixx-tune', parameter: param, value });
    };

    return (
        <PluginContainer title={name} subtitle={description} isDragging={isDragging} isResizing={isResizing} onClose={onClose}>
            <div className="w-full h-full flex flex-col items-center justify-between gap-6 p-4">
                <div className="relative w-full h-48 border-2 border-cyan-400/30 rounded-lg shadow-[0_0_20px_rgba(56,189,248,0.2)] bg-black/20 overflow-hidden">
                    <PitchVisualizer 
                        visualizerData={visualizerData as PitchVisualizerData | null}
                        mix={mix} 
                        setCanvasSize={setCanvasSize}
                        globalSettings={globalSettings}
                    />
                </div>

                <div className="flex flex-wrap justify-center gap-4">
                    <Knob label="Retune Speed" value={retuneSpeed} setValue={(val) => handleValueChange('retuneSpeed', val)} paramName="retuneSpeed" min={0} max={100} step={1} isLearning={isLearning('retuneSpeed')} onMidiLearn={onMidiLearn} />
                    <Knob label="Formant" value={formant} setValue={(val) => handleValueChange('formant', val)} paramName="formant" min={0} max={100} step={1} isLearning={isLearning('formant')} onMidiLearn={onMidiLearn} />
                    <Knob label="Humanize" value={humanize} setValue={(val) => handleValueChange('humanize', val)} paramName="humanize" min={0} max={100} step={1} isLearning={isLearning('humanize')} onMidiLearn={onMidiLearn} />
                    <Knob label="Mix" value={mix} setValue={(val) => handleValueChange('mix', val)} paramName="mix" isLearning={isLearning('mix')} onMidiLearn={onMidiLearn} />
                    <Knob label="Output" value={output} setValue={(val) => handleValueChange('output', val)} paramName="output" isLearning={isLearning('output')} onMidiLearn={onMidiLearn} />
                </div>
                
                <div className="flex justify-center">
                    <ToggleButton label="Emotive Lock" value={emotiveLock} onChange={(val) => handleValueChange('emotiveLock', val)} />
                </div>
            </div>
        </PluginContainer>
    );
};
