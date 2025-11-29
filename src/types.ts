

import React from 'react';
import { PluginKey } from './constants'; 

export type Mood = 'Neutral' | 'Warm' | 'Bright' | 'Dark' | 'Energetic';

export interface SessionContext {
  mood: Mood;
}

// Base settings for all plugins (mix, output)
export interface BasePluginSettings {
  mix: number;
  output: number;
}

// PluginState is now BasePluginSettings plus other arbitrary properties
export type PluginState = BasePluginSettings & { [key: string]: any };

// Make Plugin interface generic to carry its specific settings type
export interface Plugin<T extends PluginState = PluginState> {
  name: string;
  description: string;
  component: React.ComponentType<any>; // Use ComponentType for more flexibility
  id: string;
  tier: string;
  parameters: string[];
  lightingProfile: { hueStart: number; hueEnd: number; motion: string };
  moodResponse: string;
  canBeSidechainTarget?: boolean;
  suggestedBy?: 'Prime' | 'Ninner'; // New property for AI recommendations
}

export interface PluginDomain {
  [key: string]: Plugin<any>; 
}

export interface PluginStructure {
  [key:string]: PluginDomain;
}

// --- CORE TIER ---
export interface MixxTuneSettings extends BasePluginSettings {
  retuneSpeed: number;
  formant: number;
  humanize: number;
  emotiveLock: boolean;
  sidechainActive: boolean;
}
export interface MixxVerbSettings extends BasePluginSettings {
  size: number;
  predelay: number;
}
export interface MixxDelaySettings extends BasePluginSettings {
  time: number;
  feedback: number;
  throwIntuition: number;
}
export interface MixxDriveSettings extends BasePluginSettings {
  drive: number;
  warmth: number;
  color: number;
}
export interface MixxGlueSettings extends BasePluginSettings {
  threshold: number;
  ratio: number;
  release: number;
  sidechainActive: boolean;
}

// --- NEURAL TIER ---
export interface MixxAuraSettings extends BasePluginSettings {
  tone: number;
  width: number;
  shine: number;
  moodLock: boolean;
}
export interface PrimeEQSettings extends BasePluginSettings {
  lowGain: number;
  midGain: number;
  highGain: number;
  smartFocus: number;
}
export interface MixxPolishSettings extends BasePluginSettings {
  clarity: number;
  air: number;
  balance: number;
}
export interface MixxMorphSettings extends BasePluginSettings {
  transitionTime: number;
  morphDepth: number;
  syncMode: 'bpm' | 'free';
}
export interface PrimeBrainStemSettings extends BasePluginSettings {}

// --- MASTER TIER ---
export interface MixxLimiterSettings extends BasePluginSettings {
  ceiling: number;
  drive: number;
  lookahead: number;
  clubCheck: boolean;
  sidechainActive: boolean;
}
export interface MixxBalanceSettings extends BasePluginSettings {
  width: number;
  phase: number;
  tilt: number;
}
export interface MixxCeilingSettings extends BasePluginSettings {
  level: number;
  softClip: number;
  tone: number;
}
export interface PrimeMasterEQSettings extends BasePluginSettings {
    lowShelfFreq: number;
    lowShelfGain: number;
    highShelfFreq: number;
    highShelfGain: number;
    midSideMode: boolean;
}
export interface MixxDitherSettings extends BasePluginSettings {
    bitDepth: 16 | 24;
    noiseShaping: 'none' | 'low' | 'high';
    ditherAmount: number;
}


// --- SIGNATURE / EXPERIMENTAL TIER ---
export interface MixxSoulSettings extends BasePluginSettings {
  empathy: number;
  depth: number;
  tone: number;
  vibe: number;
}
export interface MixxMotionSettings extends BasePluginSettings {
  rate: number;
  depth: number;
  sync: boolean;
}
export interface PrimeLensSettings extends BasePluginSettings {
  gain: number;
  resolution: number;
  colorMode: 'spectral' | 'mood' | 'thermal';
}
export interface MixxBrainwaveSettings extends BasePluginSettings {
  seed: number;
  variation: number;
  intensity: number;
}
export interface MixxSpiritSettings extends BasePluginSettings {
  sensitivity: number;
  energyLink: number;
  threshold: number;
}

// --- SYSTEM TIER ---
export interface MixxAnalyzerProSettings extends BasePluginSettings {}
export interface PrimeRouterSettings extends BasePluginSettings {}
export interface MixxPortSettings extends BasePluginSettings {
  format: 'wav' | 'mp3' | 'mixx';
  quality: number;
}
export interface TelemetryCollectorSettings extends BasePluginSettings {}
export interface PrimeBotConsoleSettings extends BasePluginSettings {}

// Map of PluginKey to its specific settings interface
export interface SpecificPluginSettingsMap {
  'MixxTune': MixxTuneSettings;
  'MixxVerb': MixxVerbSettings;
  'MixxDelay': MixxDelaySettings;
  'MixxDrive': MixxDriveSettings;
  'MixxGlue': MixxGlueSettings;
  'MixxAura': MixxAuraSettings;
  'PrimeEQ': PrimeEQSettings;
  'MixxPolish': MixxPolishSettings;
  'MixxMorph': MixxMorphSettings;
  'PrimeBrainStem': PrimeBrainStemSettings;
  'MixxLimiter': MixxLimiterSettings;
  'MixxBalance': MixxBalanceSettings;
  'MixxCeiling': MixxCeilingSettings;
  'PrimeMasterEQ': PrimeMasterEQSettings;
  'MixxDither': MixxDitherSettings;
  'MixxSoul': MixxSoulSettings;
  'MixxMotion': MixxMotionSettings;
  'PrimeLens': PrimeLensSettings;
  'MixxBrainwave': MixxBrainwaveSettings;
  'MixxSpirit': MixxSpiritSettings;
  'MixxAnalyzerPro': MixxAnalyzerProSettings;
  'PrimeRouter': PrimeRouterSettings;
  'MixxPort': MixxPortSettings;
  'TelemetryCollector': TelemetryCollectorSettings;
  'PrimeBotConsole': PrimeBotConsoleSettings;
}

// PluginStates is a mapped type of SpecificPluginSettingsMap
export type PluginStates = SpecificPluginSettingsMap;

export interface PluginSize {
  width: number;
  height: number;
}

export interface PluginSizes {
  [key: string]: PluginSize; // Changed index signature to string
}

export interface PluginPosition {
  x: number;
  y: number;
}

export interface PluginPositions {
  [key: string]: PluginPosition; // Changed index signature to string
}

export interface AudioSignal {
  level: number;
  peak: number;
  transients: boolean;
  waveform: Float32Array;
  time: number;
}

// Global Application Settings
export interface GlobalSettings {
    uiTheme: 'dark' | 'light' | 'dynamic';
    animationIntensity: number; // 0-100
    visualizerComplexity: 'high' | 'low';
}

// Common props interface for all plugin components, now generic and allows functional updates for setPluginState
export interface PluginComponentProps<T extends PluginState = PluginState> {
  isDragging?: boolean;
  isResizing?: boolean;
  name: string;
  description: string;
  sessionContext: SessionContext;
  setSessionContext: (newContext: SessionContext) => void;
  pluginState: T; // Generic for specific plugin state
  setPluginState: (newState: Partial<T> | ((prevState: T) => Partial<T>)) => void; // Generic for specific plugin state setter
  // MIDI Learn props
  isLearning: (paramName: string) => boolean;
  onMidiLearn: (paramName: string, min: number, max: number) => void;
  // Sidechain props
  isSidechainTarget?: boolean;
  // Global Audio Signal for visualizers
  audioSignal: AudioSignal;
  onClose?: () => void; // Add onClose prop for dedicated close button
  globalSettings: GlobalSettings; // Pass global settings
}

// --- MIDI TYPES ---
export interface MidiMapping {
  pluginKey: string; // Using string to avoid circular dependency with constants.ts
  paramName: string;
  min: number;
  max: number;
}

export type MidiMappingMap = {
  [key: string]: MidiMapping; // Key format: `deviceId-ccNumber`
};

// --- PRESET TYPES ---
export interface Preset {
  name: string;
  states: PluginStates;
}

// --- PANEL/BROWSER TYPES ---
export type PanelType = 'midi' | 'presets' | 'routing' | 'settings' | 'console' | null; // Add 'settings' and 'console'

export interface SidePanelProps {
  activePanel: PanelType;
  setActivePanel: (panel: PanelType) => void;
  midiInputs: { id: string, name?: string }[];
  selectedMidiInput: string | null;
  onMidiInputChange: (id: string) => void;
  presets: Preset[];
  onSavePreset: () => void;
  onLoadPreset: (name: string) => void;
  onDeletePreset: (name: string) => void;
  globalSettings: GlobalSettings; // Pass global settings
  sessionContext: SessionContext; // Add sessionContext for console
}

export interface SettingsPanelProps {
    isActive: boolean;
    onClose: () => void;
    globalSettings: GlobalSettings;
    setGlobalSettings: (newSettings: Partial<GlobalSettings>) => void;
}

export interface PluginBrowserProps {
  onSelectPlugin: (pluginKey: PluginKey) => void;
  activePlugin: PluginKey | null;
  isTransitioning: boolean;
  globalSettings: GlobalSettings; // Pass global settings
}


// --- ROUTING TYPES ---
export interface SidechainLink {
  from: PluginKey;
  to: PluginKey;
}