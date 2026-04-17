
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
  const [sourceType, setSourceType] = useState<'simulated' | 'file' | 'mic'>('simulated');
  const [isMicActive, setIsMicActive] = useState(false);

  const animationFrameId = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<AudioNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
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
      analyserRef.current.smoothingTimeConstant = 0.8;
      
      gainNodeRef.current = context.createGain();
      gainNodeRef.current.gain.setValueAtTime(1.0, context.currentTime);
      gainNodeRef.current.connect(analyserRef.current);
      
      // Default: Connect analyser to destination (speakers)
      // For mic, we will disconnect this to prevent feedback
      analyserRef.current.connect(context.destination);
    } catch (e) {
      console.error("Web Audio API not supported", e);
    }
  }, []);

  const stop = useCallback(() => {
    if (sourceNodeRef.current) {
      if (sourceNodeRef.current instanceof AudioBufferSourceNode || sourceNodeRef.current instanceof OscillatorNode) {
        try {
            (sourceNodeRef.current as any).stop();
        } catch(e) {
            // ignore if already stopped
        }
      }
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }
    
    // Stop Mic Stream if active but switching modes
    if (sourceType !== 'mic' && micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
        setIsMicActive(false);
    }

    setIsPlaying(false);
  }, [sourceType]);

  const playDefaultTone = useCallback(() => {
    if (!audioContextRef.current || !gainNodeRef.current || !analyserRef.current) return;
    stop();
    setSourceType('simulated');

    // Ensure output is connected for oscillator
    try { analyserRef.current.connect(audioContextRef.current.destination); } catch(e) {}

    const oscillator = audioContextRef.current.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(150, audioContextRef.current.currentTime);
    oscillator.connect(gainNodeRef.current);
    oscillator.start();
    sourceNodeRef.current = oscillator;
    setIsPlaying(true);
  }, [stop]);

  const handleFileDrop = useCallback(async (file: File) => {
      if (!audioContextRef.current) initAudioContext();
      if (!audioContextRef.current) return;

      try {
          const arrayBuffer = await file.arrayBuffer();
          const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
          currentBufferRef.current = audioBuffer;
          setSourceType('file');
          
          // Trigger playback
          play();
      } catch (err) {
          console.error("Error decoding audio file:", err);
      }
  }, [initAudioContext]); // play is defined below, so we can't depend on it easily without hoist or ref. We'll use a useEffect or direct call if we rearrange.
  // Actually, 'play' depends on 'stop', and 'stop' depends on 'sourceType'. Circular dependency hell.
  // Let's implement play buffer logic inside handleFileDrop for simplicity or ensure play is stable.

  // Main playback control
  const play = useCallback(() => {
    if (!audioContextRef.current || !gainNodeRef.current || !analyserRef.current) return;
    
    // Resume context if suspended
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    if (sourceType === 'file' && currentBufferRef.current) {
        stop();
        // Ensure output connected
        try { analyserRef.current.connect(audioContextRef.current.destination); } catch(e) {}

        const bufferSource = audioContextRef.current.createBufferSource();
        bufferSource.buffer = currentBufferRef.current;
        bufferSource.connect(gainNodeRef.current);
        bufferSource.onended = () => {
            setIsPlaying(false);
            // Optional: Loop or return to default
        };
        bufferSource.start(0);
        sourceNodeRef.current = bufferSource;
        setIsPlaying(true);
    } else if (sourceType === 'simulated') {
        playDefaultTone();
    } else if (sourceType === 'mic') {
        // Mic is already running if active
        setIsPlaying(true);
    }
  }, [stop, playDefaultTone, sourceType]);

  // We need to re-bind handleFileDrop to call the updated 'play'
  const handleFileDropWithPlay = useCallback(async (file: File) => {
      await handleFileDrop(file); // loads buffer and sets type
      // We need to wait for state update or force it.
      // simpler: just call play logic directly here for the buffer
      if (audioContextRef.current && currentBufferRef.current) {
           // We manually trigger the 'file' play logic here to avoid state race conditions
           if (sourceNodeRef.current) {
                try { (sourceNodeRef.current as any).stop(); } catch(e) {}
                sourceNodeRef.current.disconnect();
           }
           // Connect output
           try { analyserRef.current?.connect(audioContextRef.current.destination); } catch(e) {}
           
           const bufferSource = audioContextRef.current.createBufferSource();
           bufferSource.buffer = currentBufferRef.current;
           bufferSource.connect(gainNodeRef.current!);
           bufferSource.start(0);
           sourceNodeRef.current = bufferSource;
           setIsPlaying(true);
      }
  }, [handleFileDrop]);


  const toggleMic = useCallback(async () => {
      if (!audioContextRef.current) initAudioContext();
      const ctx = audioContextRef.current!;

      if (isMicActive) {
          // Stop Mic
          if (micStreamRef.current) {
              micStreamRef.current.getTracks().forEach(track => track.stop());
              micStreamRef.current = null;
          }
          setIsMicActive(false);
          setSourceType('simulated');
          playDefaultTone();
      } else {
          // Start Mic
          try {
              stop(); // Stop other sources
              
              // Disconnect output to prevent feedback loop!
              try { analyserRef.current?.disconnect(ctx.destination); } catch(e) {}

              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              micStreamRef.current = stream;
              
              const source = ctx.createMediaStreamSource(stream);
              source.connect(analyserRef.current!);
              
              sourceNodeRef.current = source;
              setIsMicActive(true);
              setSourceType('mic');
              setIsPlaying(true);
          } catch (err) {
              console.error("Microphone access denied or error:", err);
              alert("Could not access microphone. Please check permissions.");
          }
      }
  }, [isMicActive, initAudioContext, stop, playDefaultTone]);


  // Analysis Loop
  useEffect(() => {
    initAudioContext();
    if (sourceType === 'simulated' && !isPlaying) {
        playDefaultTone();
    }

    const analyser = analyserRef.current;
    if (!analyser) return () => {};

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const waveformArray = new Float32Array(analyser.fftSize);

    const animate = () => {
      audioTimeRef.current = audioContextRef.current?.currentTime ?? audioTimeRef.current;
      analyser.getByteFrequencyData(dataArray);
      analyser.getFloatTimeDomainData(waveformArray);

      // Calculate levels
      let sum = 0;
      let peak = 0;
      for (let i = 0; i < dataArray.length; i++) {
          const val = dataArray[i];
          sum += val;
          if (val > peak) peak = val;
      }
      const avg = sum / dataArray.length;
      const currentLevel = (avg / 255) * 100 * 1.5; // Boost slightly
      
      // Basic transient detection
      const currentTransients = (Math.random() > 0.95 && currentLevel > 40) || (peak > 240 && Math.random() > 0.8);

      setAudioSignal({
        level: Math.min(100, currentLevel),
        peak: peak,
        transients: currentTransients,
        waveform: waveformArray,
        time: audioTimeRef.current,
      });

      animationFrameId.current = requestAnimationFrame(animate);
    };

    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      // Don't close context here, just stop loop
    };
  }, [initAudioContext, playDefaultTone]); // Intentionally minimal deps for loop
  
  // Load AI Audio Helper
  const loadAudio = useCallback(async (base64: string) => {
    if (!audioContextRef.current) return null;
    stop();
    try {
      const decodedBytes = decode(base64);
      const audioBuffer = await decodeAudioData(decodedBytes, audioContextRef.current, 24000, 1);
      currentBufferRef.current = audioBuffer;
      setSourceType('file'); // Treat TTS as file
      return audioBuffer;
    } catch (e) {
      console.error("Failed to decode audio data", e);
      return null;
    }
  }, [stop]);
  
  const pause = useCallback(() => {
    if (!audioContextRef.current) return;
    if (audioContextRef.current.state === 'running') {
      audioContextRef.current.suspend();
      setIsPlaying(false);
    }
  }, []);

  return { 
      audioSignal, 
      isPlaying, 
      loadAudio, 
      play, 
      pause, 
      stopAndPlayDefault: playDefaultTone,
      handleFileDrop: handleFileDropWithPlay,
      toggleMic,
      isMicActive,
      sourceType
  };
};
