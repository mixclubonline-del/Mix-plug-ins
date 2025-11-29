
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { MusicIcon, PlayIcon, PauseIcon, LoaderIcon } from './shared/Icons';

interface AIAudioPlayerProps {
  isPlaying: boolean;
  onAudioReady: (base64Audio: string) => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
}

export const AIAudioPlayer: React.FC<AIAudioPlayerProps> = ({ isPlaying, onAudioReady, onPlay, onPause, onStop }) => {
  const [prompt, setPrompt] = useState('System online. Ready for input.');
  const [isLoading, setIsLoading] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showInput && inputRef.current) {
        inputRef.current.focus();
    }
  }, [showInput]);

  const handleGenerate = async () => {
    if (!prompt.trim() || isLoading) return;
    setIsLoading(true);
    onStop(); // Stop current playback

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
            },
        }
      });
      
      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
          onAudioReady(base64Audio);
          setShowInput(false);
      }
    } catch (e) {
      console.error("TTS generation failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          handleGenerate();
      } else if (e.key === 'Escape') {
          setShowInput(false);
      }
  };

  return (
    <div className="flex items-center gap-2">
        {showInput ? (
            <div className="flex items-center bg-black/40 rounded-full border border-cyan-500/50 px-2 py-1 transition-all">
                <input 
                    ref={inputRef}
                    type="text" 
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    className="bg-transparent border-none outline-none text-xs text-white w-48 placeholder-white/30"
                    placeholder="Type to speak..."
                />
                <button 
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="ml-2 text-cyan-400 hover:text-white"
                >
                    {isLoading ? <LoaderIcon className="w-3 h-3 animate-spin" /> : <span className="text-xs font-bold">GO</span>}
                </button>
            </div>
        ) : (
            <button 
                onClick={() => setShowInput(true)} 
                className="p-1.5 rounded-full text-cyan-400 hover:bg-cyan-400/20 hover:text-white transition-all group"
                title="AI Text-to-Speech"
            >
                <MusicIcon className="w-4 h-4 transition-transform group-hover:scale-110" />
            </button>
        )}

        <div className="w-px h-4 bg-white/10 mx-1" />

        <button 
            onClick={isPlaying ? onPause : onPlay}
            className="p-1.5 rounded-full text-white/80 hover:bg-white/10 hover:text-white transition-all"
            title={isPlaying ? "Pause" : "Play"}
        >
            {isPlaying ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
        </button>
    </div>
  );
};
