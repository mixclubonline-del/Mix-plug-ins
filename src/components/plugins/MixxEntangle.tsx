
import React, { useMemo } from 'react';
import { PluginContainer } from '../../../components/shared/PluginContainer';
import { Knob } from '../../../components/shared/Knob';
import { MixxEntangleSettings, PluginComponentProps, AudioSignal, GlobalSettings } from '../../../types';
import { PrimeBrainStub } from '../../../lib/PrimeBrainStub';
import { VstBridge, VisualizerData } from '../../../vst/VstBridge';
import { useVstBridge } from '../../../vst/useVstBridge';
import { mapRange } from '../../../lib/utils';

interface Qubit {
    id: number;
    angle: number;
    radius: number;
    speed: number;
}

interface EntangleVisualizerData extends VisualizerData {
    qubitA: Qubit[];
    qubitB: Qubit[];
    beamOpacity: number;
    jitterAmount: number;
    blurAmount: number;
    rotationA: number;
    rotationB: number;
}

class MixxEntangleVstBridge extends VstBridge<MixxEntangleSettings> {
    private rotationA = 0;
    private rotationB = 0;

    constructor(initialSettings: MixxEntangleSettings) {
        super(initialSettings);
    }

    public dspProcess = (
        audioSignal: AudioSignal,
        width: number,
        height: number,
        globalSettings: GlobalSettings
    ): EntangleVisualizerData => {
        const { linkage, uncertainty, observation, mix } = this.settings;
        
        const animationSpeedMultiplier = mapRange(globalSettings.animationIntensity, 0, 100, 0.5, 2.0);
        const baseSpeed = 0.5 * animationSpeedMultiplier;
        const audioBoost = (audioSignal.level / 100) * 2;
        
        this.rotationA += baseSpeed + audioBoost;
        const linkageFactor = linkage / 100;
        this.rotationB += (baseSpeed + audioBoost) * (0.5 + linkageFactor * 0.5) + (1 - linkageFactor) * Math.sin(Date.now() / 1000);

        const numParticles = 12;
        const qubitA = Array.from({ length: numParticles }).map((_, i) => ({
            id: i,
            angle: (i / numParticles) * 360,
            radius: 40,
            speed: 1
        }));

        const qubitB = qubitA.map(p => ({
            ...p,
            angle: p.angle + (1 - linkageFactor) * 180 
        }));

        const uncertaintyJitter = (uncertainty / 100) * 10;
        const blurAmount = (100 - observation) / 100 * 10; 

        return {
            qubitA,
            qubitB,
            beamOpacity: linkageFactor * (mix / 100),
            jitterAmount: uncertaintyJitter,
            blurAmount,
            rotationA: this.rotationA,
            rotationB: this.rotationB
        };
    }
}

const EntangleVisualizer: React.FC<{ data: EntangleVisualizerData | null }> = ({ data }) => {
    if (!data) return <div className="w-full h-full bg-black/20" />;
    const { qubitA, qubitB, beamOpacity, jitterAmount, blurAmount, rotationA, rotationB } = data;

    const renderRing = (qubits: Qubit[], rotation: number, offsetX: number, color: string) => (
        <div className="absolute top-1/2 left-1/2 w-32 h-32 -ml-16 -mt-16 transition-transform" 
             style={{ transform: `translate(${offsetX}px, -50%) rotate(${rotation}deg)` }}>
            {qubits.map(q => (
                <div key={q.id} className="absolute w-2 h-2 rounded-full"
                    style={{
                        backgroundColor: color,
                        top: '50%',
                        left: '50%',
                        transform: `
                            rotate(${q.angle}deg) 
                            translate(${q.radius}px) 
                            rotate(-${q.angle}deg)
                            translate(${Math.random() * jitterAmount}px, ${Math.random() * jitterAmount}px)
                        `,
                        filter: `blur(${blurAmount}px)`,
                        boxShadow: `0 0 ${5 + blurAmount}px ${color}`
                    }}
                />
            ))}
            <div className="absolute inset-0 rounded-full border border-white/10" />
        </div>
    );

    return (
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-black/40 rounded-lg border border-indigo-500/20">
            <div className="absolute top-1/2 left-1/2 w-[160px] h-1 -ml-[80px] -mt-0.5 bg-indigo-400 blur-md transition-opacity" 
                 style={{ opacity: beamOpacity }} />
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: beamOpacity }}>
                <line x1="calc(50% - 80px)" y1="50%" x2="calc(50% + 80px)" y2="50%" stroke="white" strokeWidth="1" strokeDasharray="4 4" className="animate-pulse" />
            </svg>
            {renderRing(qubitA, rotationA, -80, '#818cf8')}
            {renderRing(qubitB, rotationB, 80, '#c084fc')}
        </div>
    );
};

export const MixxEntangle: React.FC<PluginComponentProps<MixxEntangleSettings>> = ({ 
    isDragging, isResizing, name, description, pluginState, setPluginState, isLearning, onMidiLearn, onClose, globalSettings, audioSignal
}) => {
    const { linkage, uncertainty, observation, mix, output } = pluginState;

    const { visualizerData } = useVstBridge(
        pluginState,
        audioSignal,
        globalSettings,
        (initialState) => new MixxEntangleVstBridge(initialState)
    );

    const handleValueChange = (param: keyof MixxEntangleSettings, value: number) => {
        setPluginState(prevState => ({ ...prevState, [param]: value }));
        PrimeBrainStub.sendEvent('parameter_change', { plugin: 'mixx-entangle', parameter: param, value });
    };

    return (
        <PluginContainer title={name} subtitle={description} isDragging={isDragging} isResizing={isResizing} onClose={onClose}>
            <div className="w-full h-full flex flex-col items-center justify-between gap-6 p-4">
                <div className="w-full flex-1">
                    <EntangleVisualizer data={visualizerData as EntangleVisualizerData | null} />
                </div>
                <div className="flex flex-wrap justify-center gap-4">
                    <Knob label="Linkage" value={linkage} setValue={(v) => handleValueChange('linkage', v)} paramName="linkage" isLearning={isLearning('linkage')} onMidiLearn={onMidiLearn} />
                    <Knob label="Uncertainty" value={uncertainty} setValue={(v) => handleValueChange('uncertainty', v)} paramName="uncertainty" isLearning={isLearning('uncertainty')} onMidiLearn={onMidiLearn} />
                    <Knob label="Observation" value={observation} setValue={(v) => handleValueChange('observation', v)} paramName="observation" isLearning={isLearning('observation')} onMidiLearn={onMidiLearn} />
                    <Knob label="Mix" value={mix} setValue={(v) => handleValueChange('mix', v)} paramName="mix" isLearning={isLearning('mix')} onMidiLearn={onMidiLearn} />
                    <Knob label="Output" value={output} setValue={(v) => handleValueChange('output', v)} paramName="output" isLearning={isLearning('output')} onMidiLearn={onMidiLearn} />
                </div>
            </div>
        </PluginContainer>
    );
};
