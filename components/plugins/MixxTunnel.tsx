
import React, { useMemo } from 'react';
import { PluginContainer } from '../shared/PluginContainer';
import { Knob } from '../shared/Knob';
import { MixxTunnelSettings, PluginComponentProps, AudioSignal, GlobalSettings } from '../../types';
import { PrimeBrainStub } from '../../lib/PrimeBrainStub';
import { VstBridge, VisualizerData } from '../../vst/VstBridge';
import { useVstBridge } from '../../vst/useVstBridge';
import { mapRange } from '../../lib/utils';

interface TunnelRing {
    id: number;
    z: number; // Depth position: 0 (near/face) to 1 (far/horizon)
    rotation: number;
    segments: number;
    speedOffset: number;
}

interface TunnelVisualizerData extends VisualizerData {
    rings: TunnelRing[];
    horizonRadiusPercent: number;
    coreColor: string;
    gridColor: string;
    audioImpact: number;
}

class MixxTunnelVstBridge extends VstBridge<MixxTunnelSettings> {
    private rings: TunnelRing[] = [];
    private ringIdCounter = 0;

    constructor(initialSettings: MixxTunnelSettings) {
        super(initialSettings);
        // Initialize pool with some pre-existing rings for immediate visuals
        for(let i=0; i<20; i++) {
            this.spawnRing(Math.random());
        }
        this.rings.sort((a, b) => b.z - a.z);
    }

    private spawnRing(startZ: number = 0) {
        this.rings.push({
            id: this.ringIdCounter++,
            z: startZ,
            rotation: Math.random() * 360,
            segments: Math.floor(Math.random() * 3) + 3, // 3 to 5 segments
            speedOffset: 0.8 + Math.random() * 0.4
        });
    }

    public dspProcess = (
        audioSignal: AudioSignal,
        width: number,
        height: number,
        globalSettings: GlobalSettings
    ): TunnelVisualizerData => {
        const { length, gravity, horizon, mix } = this.settings;
        
        const animationSpeedMultiplier = mapRange(globalSettings.animationIntensity, 0, 100, 0.5, 2.0);
        const baseSpeed = (0.02 - (length / 100) * 0.018) * animationSpeedMultiplier;
        const gravityFactor = 1 + (gravity / 100) * 3; 
        const horizonRadiusPercent = 5 + (horizon / 100) * 20;
        const audioImpact = (audioSignal.level / 100) * (mix / 100);
        const rotationSpeed = 0.5 + audioImpact * 5;

        const activeRings: TunnelRing[] = [];
        
        this.rings.forEach(ring => {
            const currentSpeed = baseSpeed * Math.pow(1 + ring.z, gravityFactor - 1);
            ring.z += currentSpeed * ring.speedOffset;
            ring.rotation += rotationSpeed;

            if (ring.z < 1) {
                activeRings.push(ring);
            }
        });

        this.rings = activeRings;

        const gapThreshold = baseSpeed * 10; 
        this.rings.sort((a, b) => b.z - a.z);

        const nearestRing = this.rings[this.rings.length - 1];
        if (!nearestRing || nearestRing.z > gapThreshold) {
             this.spawnRing(0);
        }

        const hue = 260; // Deep Indigo/Purple
        const coreColor = `hsl(${hue}, 80%, ${5 + audioImpact * 40}%)`;
        const gridColor = `hsl(${hue - 40}, 90%, ${60 + audioImpact * 20}%)`;

        return {
            rings: this.rings,
            horizonRadiusPercent,
            coreColor,
            gridColor,
            audioImpact
        };
    }
}

const TunnelVisualizer: React.FC<{ data: TunnelVisualizerData | null }> = ({ data }) => {
    if (!data) return <div className="w-full h-full bg-black/20" />;
    const { rings, horizonRadiusPercent, coreColor, gridColor } = data;

    return (
        <div className="relative w-full h-full flex items-center justify-center bg-black/40 rounded-lg overflow-hidden border border-indigo-500/20 shadow-[inset_0_0_50px_rgba(0,0,0,0.8)]">
            <div className="absolute rounded-full blur-2xl" 
                style={{
                    width: `${horizonRadiusPercent * 2.5}%`,
                    height: `${horizonRadiusPercent * 2.5}%`,
                    background: coreColor,
                    opacity: 0.8
                }} 
            />
            <div className="absolute rounded-full bg-black z-10"
                 style={{
                    width: `${horizonRadiusPercent}%`,
                    height: `${horizonRadiusPercent}%`,
                    boxShadow: `0 0 20px ${coreColor}`
                 }}
            />
            <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full z-0 pointer-events-none">
                <defs>
                    <filter id="tunnel-glow">
                        <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
                {rings.map(ring => {
                    const maxRadius = 140; 
                    const minRadius = horizonRadiusPercent; 
                    const currentRadius = maxRadius - (maxRadius - minRadius) * ring.z;
                    let opacity = 0;
                    if (ring.z < 0.2) opacity = ring.z * 5;
                    else opacity = 1 - Math.pow(ring.z, 4) * 0.5; 

                    const strokeWidth = 0.5 + (1 - ring.z) * 1.5;
                    const circumference = 2 * Math.PI * currentRadius;
                    const segmentLength = circumference / (ring.segments * 2);

                    return (
                        <g key={ring.id} transform={`rotate(${ring.rotation} 100 100)`}>
                            <circle 
                                cx="100" cy="100" r={Math.max(0, currentRadius)}
                                fill="none"
                                stroke={gridColor}
                                strokeWidth={strokeWidth}
                                strokeOpacity={opacity}
                                strokeDasharray={`${segmentLength} ${segmentLength}`}
                                style={{ filter: 'url(#tunnel-glow)' }}
                            />
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

export const MixxTunnel: React.FC<PluginComponentProps<MixxTunnelSettings>> = ({ 
    isDragging, isResizing, name, description, pluginState, setPluginState, isLearning, onMidiLearn, onClose, globalSettings, audioSignal
}) => {
    const { length, gravity, horizon, mix, output } = pluginState;

    const { visualizerData } = useVstBridge(
        pluginState,
        audioSignal,
        globalSettings,
        (initialState) => new MixxTunnelVstBridge(initialState)
    );

    const handleValueChange = (param: keyof MixxTunnelSettings, value: number) => {
        setPluginState(prevState => ({ ...prevState, [param]: value }));
        PrimeBrainStub.sendEvent('parameter_change', { plugin: 'mixx-tunnel', parameter: param, value });
    };

    return (
        <PluginContainer title={name} subtitle={description} isDragging={isDragging} isResizing={isResizing} onClose={onClose}>
            <div className="w-full h-full flex flex-col items-center justify-between gap-6 p-4">
                <div className="w-full flex-1">
                    <TunnelVisualizer data={visualizerData as TunnelVisualizerData | null} />
                </div>
                <div className="flex flex-wrap justify-center gap-4">
                    <Knob label="Length" value={length} setValue={(v) => handleValueChange('length', v)} paramName="length" isLearning={isLearning('length')} onMidiLearn={onMidiLearn} />
                    <Knob label="Gravity" value={gravity} setValue={(v) => handleValueChange('gravity', v)} paramName="gravity" isLearning={isLearning('gravity')} onMidiLearn={onMidiLearn} />
                    <Knob label="Horizon" value={horizon} setValue={(v) => handleValueChange('horizon', v)} paramName="horizon" isLearning={isLearning('horizon')} onMidiLearn={onMidiLearn} />
                    <Knob label="Mix" value={mix} setValue={(v) => handleValueChange('mix', v)} paramName="mix" isLearning={isLearning('mix')} onMidiLearn={onMidiLearn} />
                    <Knob label="Output" value={output} setValue={(v) => handleValueChange('output', v)} paramName="output" isLearning={isLearning('output')} onMidiLearn={onMidiLearn} />
                </div>
            </div>
        </PluginContainer>
    );
};
