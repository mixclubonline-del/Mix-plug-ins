import { BasePluginSettings, AudioSignal, GlobalSettings } from '../types';

/**
 * A generic interface for the data structure that the DSP must return
 * for the UI to render. This can be extended by specific visualizers.
 */
export interface VisualizerData {
    [key: string]: any;
}

/**
 * The abstract VstBridge class serves as the template for the "backend" of a plugin.
 * In a real VST, this would be the C++ layer communicating with the UI.
 * @template T - The specific settings interface for the plugin.
 */
export abstract class VstBridge<T extends BasePluginSettings> {
    // FIX: Changed 'protected' to 'public' to resolve type errors in subclasses where 'this.settings' was not accessible.
    public settings: T;

    constructor(initialSettings: T) {
        this.settings = initialSettings;
    }

    /**
     * Updates the internal DSP parameters. Called by the bridge hook when UI state changes.
     * @param newParams - A partial object of the new settings.
     */
    public setParameters(newParams: Partial<T>) {
        this.settings = { ...this.settings, ...newParams };
    }

    /**
     * The core processing logic. Each plugin's specific bridge must implement this method.
     * It takes in the current audio signal and canvas dimensions and returns data for the UI.
     * @param audioSignal - The global simulated audio signal.
     * @param width - The current width of the visualizer canvas.
     * @param height - The current height of the visualizer canvas.
     * @param globalSettings - The application's global settings.
     * @param extraData - Optional object for additional contextual data (e.g., session mood).
     * @returns A VisualizerData object for the UI to render.
     */
    // FIX: Changed to an abstract property with a function type to ensure 'this' context is bound correctly in subclasses.
    public abstract dspProcess: (
        audioSignal: AudioSignal,
        width: number,
        height: number,
        globalSettings: GlobalSettings,
        extraData?: Record<string, any>
    ) => VisualizerData;
}
