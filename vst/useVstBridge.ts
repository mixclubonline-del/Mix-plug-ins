
import { useState, useEffect, useRef, useCallback } from 'react';
import { VstBridge, VisualizerData } from './VstBridge';
import { BasePluginSettings, AudioSignal, GlobalSettings } from '../types';

/**
 * A generic React hook that simulates the communication bridge between the UI and the DSP.
 * It manages the DSP instance, sends parameter updates, and runs the render loop to get visualization data.
 * @template T - The specific settings interface for the plugin.
 * @template D - The specific VstBridge class for the plugin.
 * @param pluginState - The current state of the plugin from React's state management.
 * @param audioSignal - The global simulated audio signal.
 * @param globalSettings - The application's global settings.
 * @param dspFactory - A function that creates an instance of the specific VstBridge.
 * @param extraData - Optional object for additional contextual data passed to the DSP.
 * @returns An object containing the visualizerData and a function to set the canvas size.
 */
export const useVstBridge = <
    T extends BasePluginSettings,
    D extends VstBridge<T>
>(
    pluginState: T,
    audioSignal: AudioSignal,
    globalSettings: GlobalSettings,
    dspFactory: (initialState: T) => D,
    extraData?: Record<string, any>
) => {
    const dspRef = useRef<D | null>(null);
    const canvasSizeRef = useRef({ width: 400, height: 200 }); // Default size

    // Initialize the DSP engine once using the provided factory.
    if (!dspRef.current) {
        dspRef.current = dspFactory(pluginState);
    }

    const [visualizerData, setVisualizerData] = useState<VisualizerData | null>(null);

    // The "render loop" that constantly asks the DSP for new data for the UI.
    useEffect(() => {
        let animationFrameId: number;
        const dsp = dspRef.current!;

        const loop = () => {
            const { width, height } = canvasSizeRef.current;
            const data = dsp.dspProcess(audioSignal, width, height, globalSettings, extraData);
            setVisualizerData(data);
            animationFrameId = requestAnimationFrame(loop);
        };

        animationFrameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationFrameId);
    }, [audioSignal, globalSettings, extraData]); // Re-run if dependencies change

    // Update DSP parameters whenever the React pluginState changes.
    useEffect(() => {
        dspRef.current?.setParameters(pluginState);
    }, [pluginState]);

    // Expose a function for the UI to inform the DSP of the canvas size.
    const setCanvasSize = useCallback((width: number, height: number) => {
        canvasSizeRef.current = { width, height };
    }, []);

    return { visualizerData, setCanvasSize };
};