import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioSignal } from '../types';

// Audio decoding functions from the Gemini API guide
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


export const useSimulatedAudio = () => {
  const [audioSignal, setAudioSignal] = useState<AudioSignal>({
    level: 0,
    peak: 0,
    transients: false,
    waveform: new Float32Array(512).fill(0),
    time: 0,
  });
  const [isPlaying, setIsPlaying] = useState(false);

  const animationFrameId = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<AudioNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioTimeRef = useRef(0);
  const currentBufferRef = useRef<AudioBuffer | null>(null);

  // Initialize Audio Context and Analyser
  const initAudioContext = useCallback(() => {
    if (audioContextRef.current) return;
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = context;
      analyserRef.current = context.createAnalyser();
      analyserRef.current.fftSize = 1024;
      gainNodeRef.current = context.createGain();
      gainNodeRef.current.gain.setValueAtTime(1.0, context.currentTime);
      gainNodeRef.current.connect(analyserRef.current);
      analyserRef.current.connect(context.destination);
    } catch (e) {
      console.error("Web Audio API not supported", e);
    }
  }, []);

  const stop = useCallback(() => {
    if (sourceNodeRef.current) {
      if (sourceNodeRef.current instanceof AudioBufferSourceNode || sourceNodeRef.current instanceof OscillatorNode) {
        (sourceNodeRef.current as any).stop();
      }
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const playDefaultTone = useCallback(() => {
    if (!audioContextRef.current || !gainNodeRef.current) return;
    stop();

    const oscillator = audioContextRef.current.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(150, audioContextRef.current.currentTime);
    oscillator.connect(gainNodeRef.current);
    oscillator.start();
    sourceNodeRef.current = oscillator;
    setIsPlaying(true);
  }, [stop]);

  // Main analysis loop
  useEffect(() => {
    initAudioContext();
    playDefaultTone();

    const analyser = analyserRef.current;
    if (!analyser) return () => {};

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const waveformArray = new Float32Array(analyser.fftSize);

    const animate = () => {
      audioTimeRef.current = audioContextRef.current?.currentTime ?? audioTimeRef.current;
      analyser.getByteFrequencyData(dataArray);
      analyser.getFloatTimeDomainData(waveformArray);

      const maxLevel = Math.max(...dataArray);
      const currentLevel = (maxLevel / 255) * 100;
      const currentPeak = maxLevel;
      const currentTransients = (Math.random() > 0.95 && currentLevel > 50);

      setAudioSignal({
        level: currentLevel,
        peak: currentPeak,
        transients: currentTransients,
        waveform: waveformArray,
        time: audioTimeRef.current,
      });

      animationFrameId.current = requestAnimationFrame(animate);
    };

    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      stop();
      audioContextRef.current?.close().catch(e => console.error("Error closing audio context", e));
    };
  }, [initAudioContext, playDefaultTone, stop]);
  
  const loadAudio = useCallback(async (base64: string) => {
    if (!audioContextRef.current) return null;
    stop();
    try {
      const decodedBytes = decode(base64);
      const audioBuffer = await decodeAudioData(decodedBytes, audioContextRef.current, 24000, 1);
      currentBufferRef.current = audioBuffer;
      return audioBuffer;
    } catch (e) {
      console.error("Failed to decode audio data", e);
      return null;
    }
  }, [stop]);
  
  const play = useCallback(() => {
    if (!audioContextRef.current || !gainNodeRef.current || !currentBufferRef.current) return;
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
      setIsPlaying(true);
      return;
    }
    stop();

    const bufferSource = audioContextRef.current.createBufferSource();
    bufferSource.buffer = currentBufferRef.current;
    bufferSource.connect(gainNodeRef.current);
    bufferSource.onended = () => {
        setIsPlaying(false);
        // Revert to default tone after playback finishes
        playDefaultTone(); 
    };
    bufferSource.start(0);
    sourceNodeRef.current = bufferSource;
    setIsPlaying(true);
  }, [stop, playDefaultTone]);

  const pause = useCallback(() => {
    if (!audioContextRef.current) return;
    if (audioContextRef.current.state === 'running') {
      audioContextRef.current.suspend();
      setIsPlaying(false);
    }
  }, []);

  return { audioSignal, isPlaying, loadAudio, play, pause, stopAndPlayDefault: playDefaultTone };
};