

import React, { useState, useEffect, useRef } from 'react';
import { SessionContext } from '../../types';
import { PrimeBrainStub } from '../../lib/PrimeBrainStub';

const PrimeBotAvatar: React.FC<{hue: number}> = ({ hue }) => (
    <div className="relative w-8 h-8">
        <div className="absolute inset-0 rounded-full" style={{
            backgroundColor: `hsl(${hue}, 80%, 30%)`,
            boxShadow: `0 0 10px hsl(${hue}, 80%, 50%)`,
            animation: 'pulse-meter 4s infinite ease-in-out',
        }}/>
        <div className="absolute inset-2 rounded-full bg-black/50"/>
    </div>
);

interface PrimeBotConsoleViewProps {
  sessionContext: SessionContext;
}

const PrimeBotConsole: React.FC<PrimeBotConsoleViewProps> = ({ sessionContext }) => {
    const [messages, setMessages] = useState<string[]>(["[PrimeBot 4.0] Console Initialized. Monitoring session."]);
    const consoleEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEvent = (eventName: string) => (payload: any) => {
            let newMessage = '';
            switch (eventName) {
                case 'plugin_activated':
                    newMessage = `[INFO] ${payload.name} engaged. Monitoring parameters.`;
                    break;
                case 'preset_saved':
                    newMessage = `[SAVE] Preset '${payload.name}' saved to memory.`;
                    break;
                case 'preset_loaded':
                    newMessage = `[LOAD] All plugin states restored from preset '${payload.name}'.`;
                    break;
                case 'midi_learn_started':
                    newMessage = `[MIDI] Listening for CC input for ${payload.pluginKey} -> ${payload.paramName}...`;
                    break;
                case 'midi_mapped':
                    newMessage = `[MIDI] Mapped CC ${payload.cc} to ${payload.pluginKey}.${payload.paramName}.`;
                    break;
                case 'session_reset':
                    newMessage = `[WARN] Full session reset initiated. Restoring factory defaults.`;
                    break;
                default:
                    return;
            }
            setMessages(prev => [...prev.slice(-20), newMessage]);
        };

        const eventNames = ['plugin_activated', 'preset_saved', 'preset_loaded', 'midi_learn_started', 'midi_mapped', 'session_reset'];
        const unsubscribers = eventNames.map(eventName => PrimeBrainStub.subscribe(eventName, handleEvent(eventName)));

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, []);

    useEffect(() => {
        consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    
    const hueMap: Record<string, number> = {
        Neutral: 220, Warm: 40, Bright: 190, Dark: 260, Energetic: 330
    };
    const hue = hueMap[sessionContext.mood] || 220;

    return (
        <div className="w-full h-full flex flex-col p-4 font-mono text-sm">
             <div className="flex-shrink-0 flex items-center gap-2 mb-2">
                <PrimeBotAvatar hue={hue} />
                <h4 className="font-bold tracking-wider" style={{color: `hsl(${hue}, 80%, 75%)`}}>PRIMEBOT CONSOLE</h4>
             </div>
            <div className="relative flex-1 overflow-y-auto custom-scrollbar pr-2 bg-black/20 rounded-lg p-2 scanline-bg">
                {messages.map((msg, i) => (
                    <p key={i} className="mb-1" style={{ 
                        color: `hsl(${hue}, 80%, 75%)`, 
                        textShadow: `0 0 5px hsl(${hue}, 80%, 50%), 0 0 1px hsl(${hue}, 80%, 75%)`
                    }}>
                        <span className="text-white/50 mr-2">{'>'}</span>{msg}
                    </p>
                ))}
                <div ref={consoleEndRef} />
            </div>
        </div>
    );
};

export { PrimeBotConsole };