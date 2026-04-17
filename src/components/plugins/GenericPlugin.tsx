
import React from 'react';
import { PluginContainer } from '../../../components/shared/PluginContainer';
import { Knob } from '../../../components/shared/Knob';
import { PluginComponentProps } from '../../../types';
import { PrimeBrainStub } from '../../../lib/PrimeBrainStub';

export const GenericPlugin: React.FC<PluginComponentProps<any>> = ({ 
    isDragging, isResizing, name, description, pluginState, setPluginState, isLearning, onMidiLearn, onClose, globalSettings
}) => {
    
    // Generate a simple visualizer based on the first 3 parameters
    const params = Object.keys(pluginState).filter(k => k !== 'mix' && k !== 'output');
    const p1 = params[0] ? pluginState[params[0]] / 100 : 0.5;
    const p2 = params[1] ? pluginState[params[1]] / 100 : 0.5;
    const p3 = params[2] ? pluginState[params[2]] / 100 : 0.5;

    const renderKnobs = () => {
        return params.map(key => {
            const value = pluginState[key];
            if (typeof value === 'number') {
                return (
                    <Knob 
                        key={key}
                        label={key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')} 
                        value={value} 
                        setValue={(v) => {
                            setPluginState((prev: any) => ({ ...prev, [key]: v }));
                            PrimeBrainStub.sendEvent('parameter_change', { plugin: name, parameter: key, value: v });
                        }} 
                        paramName={key}
                        isLearning={isLearning(key)} 
                        onMidiLearn={onMidiLearn} 
                    />
                );
            }
            return null;
        });
    };

    return (
        <PluginContainer title={name} subtitle={description} isDragging={isDragging} isResizing={isResizing} onClose={onClose}>
            <div className="w-full h-full flex flex-col items-center justify-between gap-6 p-4">
                {/* Generic Generative Visualizer */}
                <div className="w-full flex-1 flex items-center justify-center bg-black/20 rounded-lg border border-white/10 overflow-hidden relative">
                    <div className="absolute inset-0 flex items-center justify-center opacity-30">
                        {Array.from({length: 5}).map((_, i) => (
                            <div key={i} 
                                className="absolute rounded-full border border-white/50"
                                style={{
                                    width: `${(i + 1) * 20 * p1}%`,
                                    height: `${(i + 1) * 20 * p1}%`,
                                    transform: `rotate(${i * 45 + (Date.now() / 1000) * 20}deg) scale(${1 + Math.sin(Date.now()/1000 * p2) * 0.2})`,
                                    borderColor: `hsla(${p3 * 360}, 70%, 70%, 0.5)`
                                }}
                            />
                        ))}
                    </div>
                    <div className="text-white/30 font-orbitron text-xl z-10 tracking-[0.5em]">{name.toUpperCase()}</div>
                </div>

                <div className="flex flex-wrap justify-center gap-4">
                    {renderKnobs()}
                    <Knob label="Mix" value={pluginState.mix || 0} setValue={(v) => setPluginState((prev: any) => ({...prev, mix: v}))} paramName="mix" isLearning={isLearning('mix')} onMidiLearn={onMidiLearn} />
                    <Knob label="Output" value={pluginState.output || 0} setValue={(v) => setPluginState((prev: any) => ({...prev, output: v}))} paramName="output" isLearning={isLearning('output')} onMidiLearn={onMidiLearn} />
                </div>
            </div>
        </PluginContainer>
    );
};
