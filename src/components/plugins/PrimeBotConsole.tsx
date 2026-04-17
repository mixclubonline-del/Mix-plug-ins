
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { SessionContext } from '../../types';
import { PrimeBrainStub } from '../../lib/PrimeBrainStub';
import { PLUGIN_TIERS, PluginKey } from '../../constants';

const PrimeBotAvatar: React.FC<{hue: number, isThinking?: boolean}> = ({ hue, isThinking }) => (
    <div className="relative w-8 h-8 flex-shrink-0">
        <div className={`absolute inset-0 rounded-full transition-all duration-300 ${isThinking ? 'animate-spin' : ''}`} style={{
            backgroundColor: `hsl(${hue}, 80%, 30%)`,
            boxShadow: `0 0 10px hsl(${hue}, 80%, 50%)`,
            animation: isThinking ? 'spin 1s linear infinite' : 'pulse-meter 4s infinite ease-in-out',
            borderTop: isThinking ? '2px solid white' : 'none'
        }}/>
        <div className="absolute inset-2 rounded-full bg-black/50"/>
    </div>
);

interface PrimeBotConsoleViewProps {
  sessionContext: SessionContext;
}

// Helper to get all available plugins and params for context
const getSystemContext = () => {
    const plugins = [];
    for (const tier of Object.values(PLUGIN_TIERS)) {
        for (const [key, p] of Object.entries(tier)) {
            plugins.push(`${p.name} (ID: ${key}): [${p.parameters.join(', ')}] - ${p.description}`);
        }
    }
    return `You are PrimeBot 4.0, an AI audio engineer. You control a suite of plugins. 
Available Plugins:
${plugins.join('\n')}

When asked to change sound, use the 'adjust_plugin_parameter' tool. 
When asked to create a preset for a specific vibe or sonic description, use the 'generate_ai_preset' tool to output a dictionary of plugin parameters that achieve that sound.
Be concise and futuristic in your responses.`;
};

// Define the Tools
const adjustPluginTool: FunctionDeclaration = {
    name: 'adjust_plugin_parameter',
    description: 'Adjusts a specific parameter of a plugin.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            pluginId: { type: Type.STRING, description: 'The exact ID of the plugin (e.g., "mixx-verb", "mixx-tune").' },
            parameter: { type: Type.STRING, description: 'The parameter name (e.g., "size", "mix", "drive").' },
            value: { type: Type.NUMBER, description: 'The new value for the parameter (usually 0-100).' },
            activate: { type: Type.BOOLEAN, description: 'Whether to switch the view to this plugin (default true).' }
        },
        required: ['pluginId', 'parameter', 'value']
    }
};

const aiPresetTool: FunctionDeclaration = {
    name: 'generate_ai_preset',
    description: 'Generates a new preset configuration based on a natural language description.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            description: { type: Type.STRING, description: 'Natural language description of the desired preset.' },
            presetName: { type: Type.STRING, description: 'A suggested name for the generated preset.' },
            parameterChanges: {
                type: Type.OBJECT,
                description: 'A map where keys are plugin IDs and values are objects of parameter changes (e.g., {"mixx-verb": {"size": 80, "mix": 50}}).',
                properties: {} // Dynamic properties
            }
        },
        required: ['description', 'presetName', 'parameterChanges']
    }
};

const PrimeBotConsole: React.FC<PrimeBotConsoleViewProps> = ({ sessionContext }) => {
    const [messages, setMessages] = useState<{sender: 'bot'|'user', text: string}[]>([
        {sender: 'bot', text: "[PrimeBot 4.0] Neural Link Active. Awaiting command."}
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const consoleEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll
    useEffect(() => {
        consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Handle incoming system events
    useEffect(() => {
        const handleEvent = (eventName: string) => (payload: any) => {
            let newMessage = '';
            switch (eventName) {
                case 'plugin_activated':
                    newMessage = `[INFO] ${payload.name} engaged.`;
                    break;
                case 'preset_loaded':
                    newMessage = `[LOAD] Preset '${payload.name}' restored.`;
                    break;
                case 'session_reset':
                    newMessage = `[WARN] Session reset.`;
                    break;
                default:
                    return;
            }
            setMessages(prev => [...prev.slice(-40), {sender: 'bot', text: newMessage}]);
        };

        const eventNames = ['plugin_activated', 'preset_loaded', 'session_reset'];
        const unsubscribers = eventNames.map(eventName => PrimeBrainStub.subscribe(eventName, handleEvent(eventName)));

        return () => unsubscribers.forEach(unsub => unsub());
    }, []);

    const handleSend = async () => {
        if (!input.trim() || isThinking) return;
        
        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, {sender: 'user', text: userMsg}]);
        setIsThinking(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-preview-09-2025',
                contents: [
                    { role: 'user', parts: [{ text: getSystemContext() + `\n\nUser Command: ${userMsg}` }] }
                ],
                config: {
                    tools: [{ functionDeclarations: [adjustPluginTool, aiPresetTool] }],
                }
            });

            // Handle Tool Calls
            const functionCalls = response.candidates?.[0]?.content?.parts?.[0]?.functionCall 
                ? [response.candidates[0].content.parts[0].functionCall] 
                : (response.functionCalls || []);

            if (functionCalls.length > 0) {
                const fc = functionCalls[0];
                if (fc.name === 'adjust_plugin_parameter') {
                    const { pluginId, parameter, value, activate } = fc.args as any;
                    
                    PrimeBrainStub.sendEvent('update_plugin_state', {
                        pluginId, 
                        changes: { [parameter]: value },
                        activate: activate !== false 
                    });

                    setMessages(prev => [...prev, {sender: 'bot', text: `[EXEC] Adjusting ${pluginId}.${parameter} to ${value}.`}]);
                } else if (fc.name === 'generate_ai_preset') {
                    const { presetName, parameterChanges } = fc.args as any;
                    PrimeBrainStub.sendEvent('create_preset', { name: presetName, state: parameterChanges });
                    setMessages(prev => [...prev, {sender: 'bot', text: `[EXEC] AI Preset '${presetName}' generated and applied.`}]);
                }
            } else {
                // If no tool call, just show text response
                const text = response.text || "[ERR] Could not parse command.";
                setMessages(prev => [...prev, {sender: 'bot', text: text}]);
            }

        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, {sender: 'bot', text: `[ERR] Neural Link Failure: ${e instanceof Error ? e.message : 'Unknown error'}`}]);
        } finally {
            setIsThinking(false);
            // Re-focus input
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSend();
    };
    
    const hueMap: Record<string, number> = {
        Neutral: 220, Warm: 40, Bright: 190, Dark: 260, Energetic: 330
    };
    const hue = hueMap[sessionContext.mood] || 220;
    const accentColor = `hsl(${hue}, 80%, 75%)`;

    return (
        <div className="w-full h-full flex flex-col p-4 font-mono text-sm">
             <div className="flex-shrink-0 flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                <PrimeBotAvatar hue={hue} isThinking={isThinking} />
                <h4 className="font-bold tracking-wider" style={{color: accentColor}}>PRIMEBOT CONSOLE</h4>
             </div>
             
            <div className="relative flex-1 overflow-y-auto custom-scrollbar pr-2 mb-2 bg-black/20 rounded-lg p-2 scanline-bg flex flex-col gap-1">
                {messages.map((msg, i) => (
                    <div key={i} className={`break-words ${msg.sender === 'user' ? 'text-right opacity-70 italic' : ''}`}>
                        <span style={{ 
                            color: msg.sender === 'bot' ? accentColor : 'white', 
                            textShadow: msg.sender === 'bot' ? `0 0 5px hsl(${hue}, 80%, 50%)` : 'none'
                        }}>
                            {msg.sender === 'bot' && <span className="mr-2 opacity-50">{'>'}</span>}
                            {msg.text}
                        </span>
                    </div>
                ))}
                {isThinking && <div className="text-xs animate-pulse opacity-50" style={{color: accentColor}}>PROCESSING...</div>}
                <div ref={consoleEndRef} />
            </div>

            <div className="flex-shrink-0 flex items-center gap-2 bg-black/40 border border-white/20 rounded px-2 py-1 focus-within:border-cyan-400 focus-within:shadow-[0_0_10px_rgba(34,211,238,0.2)] transition-all">
                <span className="text-cyan-500 font-bold">{'>'}</span>
                <input 
                    ref={inputRef}
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/20"
                    placeholder="Enter command..."
                    disabled={isThinking}
                />
            </div>
        </div>
    );
};

export { PrimeBotConsole };
