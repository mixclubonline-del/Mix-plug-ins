

import type { 
  Plugin, PluginStates, SpecificPluginSettingsMap,
  PluginSizes, PluginPositions
} from './types'; 

// --- CORE TIER ---
import { MixxTune } from './components/plugins/MixxTune';
import { MixxVerb } from './components/plugins/MixxVerb';
import { MixxDelay } from './components/plugins/MixxDelay';
import { MixxDrive } from './components/plugins/MixxDrive';
import { MixxGlue } from './components/plugins/MixxGlue';

// --- NEURAL TIER ---
import MixxAura from './components/plugins/MixxAura';
import { PrimeEQ } from './components/plugins/PrimeEQ';
import { MixxPolish } from './components/plugins/MixxPolish';
import { MixxMorph } from './components/plugins/MixxMorph';
import { PrimeBrainStem } from './components/plugins/PrimeBrainStem';

// --- MASTER TIER ---
import { MixxLimiter } from './components/plugins/MixxLimiter';
import { MixxBalance } from './components/plugins/MixxBalance';
import { MixxCeiling } from './components/plugins/MixxCeiling';
import { PrimeMasterEQ } from './components/plugins/PrimeMasterEQ';
import { MixxDither } from './components/plugins/MixxDither';

// --- SIGNATURE / EXPERIMENTAL TIER ---
import { MixxSoul } from './components/plugins/MixxSoul';
import { MixxMotion } from './components/plugins/MixxMotion';
import { PrimeLens } from './components/plugins/PrimeLens';
import { MixxBrainwave } from './components/plugins/MixxBrainwave';
import { MixxSpirit } from './components/plugins/MixxSpirit';

// --- SYSTEM TIER ---
import { MixxAnalyzerPro } from './components/plugins/MixxAnalyzerPro';
import { PrimeRouter } from './components/plugins/PrimeRouter';
import { MixxPort } from './components/plugins/MixxPort';
import { TelemetryCollector } from './components/plugins/TelemetryCollector';
import { PrimeBotConsole } from './components/plugins/PrimeBotConsole';


export const PLUGIN_TIERS = {
  'Core Tier': {
    'MixxTune': { id: "mixx-tune", tier: "core", parameters: ["retuneSpeed", "formant", "humanize", "mix", "emotiveLock"], lightingProfile: { hueStart: 210, hueEnd: 330, motion: "float" }, moodResponse: "Follows lyric sentiment and section changes; adjusts mood confidence.", name: 'Mixx Tune', description: 'AI vocal tuner and tone-former.', component: MixxTune, suggestedBy: 'Prime', canBeSidechainTarget: true },
    'MixxVerb': { id: "mixx-verb", tier: "core", parameters: ["size", "predelay", "mix"], lightingProfile: { hueStart: 180, hueEnd: 270, motion: "breathe" }, moodResponse: "Reacts to energy level; widens with intensity.", name: 'Mixx Verb', description: 'Adaptive reverb space engine.', component: MixxVerb },
    'MixxDelay': { id: "mixx-delay", tier: "core", parameters: ["time", "feedback", "mix", "throwIntuition"], lightingProfile: { hueStart: 300, hueEnd: 300, motion: "pulse" }, moodResponse: "Syncs to tempo; throws more during chorus.", name: 'Mixx Delay', description: 'Intelligent throw delay.', component: MixxDelay, suggestedBy: 'Prime' },
    'MixxDrive': { id: "mixx-drive", tier: "core", parameters: ["drive", "warmth", "mix", "color"], lightingProfile: { hueStart: 300, hueEnd: 30, motion: "burst" }, moodResponse: "Boosts saturation as RMS rises.", name: 'Mixx Drive', description: 'Harmonic saturator / color enhancer.', component: MixxDrive },
    'MixxGlue': { id: "mixx-glue", tier: "core", parameters: ["threshold", "ratio", "release", "mix"], lightingProfile: { hueStart: 270, hueEnd: 270, motion: "pulse" }, moodResponse: "Smooths transitions; softens build-up.", name: 'Mixx Glue', description: 'Bus compressor / cohesion.', component: MixxGlue, canBeSidechainTarget: true, suggestedBy: 'Ninner' },
  },
  'Neural Tier': {
    'MixxAura': { id: "mixx-aura", tier: "neural", parameters: ["tone", "width", "shine", "moodLock"], lightingProfile: { hueStart: 330, hueEnd: 270, motion: "float" }, moodResponse: "Mirrors overall room mood; widens with energy.", name: 'Mixx Aura', description: 'Psychoacoustic width enhancer.', component: MixxAura },
    'PrimeEQ': { id: "prime-eq", tier: "neural", parameters: ["lowGain", "midGain", "highGain", "smartFocus"], lightingProfile: { hueStart: 180, hueEnd: 270, motion: "pulse" }, moodResponse: "Balances frequency bands dynamically; smooth color drift.", name: 'Prime EQ', description: 'Adaptive AI EQ.', component: PrimeEQ, suggestedBy: 'Prime' },
    'MixxPolish': { id: "mixx-polish", tier: "neural", parameters: ["clarity", "air", "balance"], lightingProfile: { hueStart: 50, hueEnd: 50, motion: "shimmer" }, moodResponse: "Adds top-end sparkle when energy peaks.", name: 'Mixx Polish', description: 'Spectral enhancer for sheen.', component: MixxPolish },
    'MixxMorph': { id: "mixx-morph", tier: "neural", parameters: ["transitionTime", "morphDepth", "syncMode"], lightingProfile: { hueStart: 0, hueEnd: 360, motion: "sweep" }, moodResponse: "Drives cross-section fades; syncs lighting.", name: 'Mixx Morph', description: 'Transitional FX / scene bridge.', component: MixxMorph },
    'PrimeBrainStem': { id: "prime-brain-stem", tier: "neural", parameters: [], lightingProfile: { hueStart: 0, hueEnd: 0, motion: "pulse" }, moodResponse: "Collects all plugin states, emits mood packets.", name: 'Prime Brain Stem', description: 'Central neural router / conductor.', component: PrimeBrainStem },
  },
  'Master Tier': {
    'MixxLimiter': { id: "mixx-limiter", tier: "master", parameters: ["ceiling", "drive", "lookahead", "clubCheck"], lightingProfile: { hueStart: 0, hueEnd: 0, motion: "pulse" }, moodResponse: "Tightens headroom; reacts to song peaks.", name: 'Mixx Limiter', description: 'Loudness and ceiling controller.', component: MixxLimiter, canBeSidechainTarget: true, suggestedBy: 'Prime' },
    'MixxBalance': { id: "mixx-balance", tier: "master", parameters: ["width", "phase", "tilt"], lightingProfile: { hueStart: 210, hueEnd: 210, motion: "drift" }, moodResponse: "Adjusts spatial balance automatically.", name: 'Mixx Balance', description: 'Stereo / phase alignment.', component: MixxBalance },
    'MixxCeiling': { id: "mixx-ceiling", tier: "master", parameters: ["level", "softClip", "tone"], lightingProfile: { hueStart: 0, hueEnd: 0, motion: "expand" }, moodResponse: "Smooths peaks; shapes brightness.", name: 'Mixx Ceiling', description: 'Final energy regulator.', component: MixxCeiling },
    'PrimeMasterEQ': { id: "prime-master-eq", tier: "master", parameters: ["lowShelfFreq", "lowShelfGain", "highShelfFreq", "highShelfGain", "midSideMode"], lightingProfile: { hueStart: 40, hueEnd: 60, motion: "sweep" }, moodResponse: "Adds final tonal shaping; subtle spectral shift.", name: 'Prime Master EQ', description: 'High-precision mastering equalizer.', component: PrimeMasterEQ },
    'MixxDither': { id: "mixx-dither", tier: "master", parameters: ["bitDepth", "noiseShaping", "ditherAmount"], lightingProfile: { hueStart: 200, hueEnd: 220, motion: "shimmer" }, moodResponse: "Applies final bit-depth conversion.", name: 'Mixx Dither', description: 'Noise shaping and bit reduction.', component: MixxDither },
  },
  'Signature / Experimental Tier': {
    'MixxSoul': { id: "mixx-soul", tier: "signature", parameters: ["empathy", "depth", "tone", "vibe"], lightingProfile: { hueStart: 210, hueEnd: 50, motion: "shimmer" }, moodResponse: "Reacts to lyric emotion; colors midrange accordingly.", name: 'Mixx Soul', description: 'Emotion-to-harmonic mapper.', component: MixxSoul },
    'MixxMotion': { id: "mixx-motion", tier: "signature", parameters: ["rate", "depth", "sync"], lightingProfile: { hueStart: 300, hueEnd: 300, motion: "pulse" }, moodResponse: "Animates panning and motion.", name: 'Mixx Motion', description: 'Rhythmic LFO / movement engine.', component: MixxMotion },
    'PrimeLens': { id: "prime-lens", tier: "signature", parameters: ["gain", "resolution", "colorMode"], lightingProfile: { hueStart: 0, hueEnd: 360, motion: "sweep" }, moodResponse: "Feeds visuals to MAE / Spline layers.", name: 'Prime Lens', description: 'Audio→Visual translator.', component: PrimeLens },
    'MixxBrainwave': { id: "mixx-brainwave", tier: "signature", parameters: ["seed", "variation", "intensity"], lightingProfile: { hueStart: 270, hueEnd: 270, motion: "flare" }, moodResponse: "Suggests melodic ideas; generates motion patterns.", name: 'Mixx Brainwave', description: 'Generative idea composer.', component: MixxBrainwave },
    'MixxSpirit': { id: "mixx-spirit", tier: "signature", parameters: ["sensitivity", "energyLink", "threshold"], lightingProfile: { hueStart: 0, hueEnd: 360, motion: "strobe" }, moodResponse: "Adjusts brightness by fan/chat sentiment.", name: 'Mixx Spirit', description: 'Live crowd response engine.', component: MixxSpirit },
  },
  'System Tier': {
    'MixxAnalyzerPro': { id: "mixx-analyzer-pro", tier: "system", parameters: [], lightingProfile: { hueStart: 210, hueEnd: 300, motion: "bars" }, moodResponse: "Displays energy + frequency.", name: 'Mixx Analyzer Pro', description: 'Visual LUFS / spectrum monitor.', component: MixxAnalyzerPro },
    'PrimeRouter': { id: "prime-router", tier: "system", parameters: [], lightingProfile: { hueStart: 0, hueEnd: 0, motion: "glow" }, moodResponse: "Manages plugin routing and mod links.", name: 'Prime Router', description: 'Signal patch matrix.', component: PrimeRouter },
    'MixxPort': { id: "mixx-port", tier: "system", parameters: ["format", "quality", "mix"], lightingProfile: { hueStart: 270, hueEnd: 270, motion: "pulse" }, moodResponse: "Fires completion glow when render done.", name: 'Mixx Port', description: 'Export engine for Mixx file type.', component: MixxPort },
    'TelemetryCollector': { id: "telemetry-collector", tier: "system", parameters: [], lightingProfile: { hueStart: 0, hueEnd: 0, motion: "heartbeat" }, moodResponse: "Records every gesture / mood frame.", name: 'Telemetry Collector', description: 'System logger.', component: TelemetryCollector },
    'PrimeBotConsole': { id: "prime-bot-console", tier: "system", parameters: [], lightingProfile: { hueStart: 0, hueEnd: 360, motion: "mirror" }, moodResponse: "Displays PrimeBot hints and mood commentary.", name: 'PrimeBot Console', description: 'Chat + AI assistant layer.', component: PrimeBotConsole },
  }
} as const;

export type TierName = keyof typeof PLUGIN_TIERS;
// FIX: Correctly generate a union of all plugin keys. The previous method incorrectly
// created an intersection of keys from different tiers, which resolved to `never`.
export type PluginKey = { [T in TierName]: keyof typeof PLUGIN_TIERS[T] }[TierName];

const allPlugins = Object.values(PLUGIN_TIERS).reduce(
  (acc, tier) => ({ ...acc, ...tier }),
  {}
) as { [K in PluginKey]: Plugin<SpecificPluginSettingsMap[K]> };

export const findPlugin = <K extends PluginKey>(pluginKey: K): Plugin<SpecificPluginSettingsMap[K]> => {
    return allPlugins[pluginKey];
};

// Re-mapping plugins to Halo Schematic rings based on new tiers
export const HALO_SCHEMATIC_RINGS = [
  { name: 'Core Layer', radiusPercentage: 22, animationDuration: '120s', plugins: Object.keys(PLUGIN_TIERS['Core Tier']) as PluginKey[] },
  { name: 'Neural Layer', radiusPercentage: 38, animationDuration: '90s', plugins: Object.keys(PLUGIN_TIERS['Neural Tier']) as PluginKey[] },
  { name: 'Mastering Layer', radiusPercentage: 54, animationDuration: '180s', plugins: Object.keys(PLUGIN_TIERS['Master Tier']) as PluginKey[] },
  { name: 'System Layer', radiusPercentage: 70, animationDuration: '240s', plugins: Object.keys(PLUGIN_TIERS['System Tier']) as PluginKey[] },
  { name: 'Signature Halo', radiusPercentage: 86, animationDuration: '300s', plugins: Object.keys(PLUGIN_TIERS['Signature / Experimental Tier']) as PluginKey[] },
];

export const INITIAL_PLUGIN_SIZES: PluginSizes = Object.keys(allPlugins).reduce((acc, key) => {
    let defaultWidth = 700;
    if (key === 'PrimeEQ' || key === 'MixxAnalyzerPro' || key === 'PrimeMasterEQ') {
      defaultWidth = 900;
    } else if (key === 'MixxTune' || key === 'MixxVerb' || key === 'MixxPolish' || key === 'MixxLimiter' || key === 'MixxBalance') {
      defaultWidth = 600;
    }
    (acc as any)[key as PluginKey] = { width: defaultWidth, height: Math.round(defaultWidth * (9 / 16)) }; 
    return acc;
}, {} as PluginSizes);


export const INITIAL_PLUGIN_POSITIONS: PluginPositions = Object.keys(allPlugins).reduce((acc, key) => {
  (acc as any)[key as PluginKey] = { 
    x: window.innerWidth / 2 - (INITIAL_PLUGIN_SIZES[key as PluginKey].width / 2), 
    y: window.innerHeight / 2 - (INITIAL_PLUGIN_SIZES[key as PluginKey].height / 2) 
  };
  return acc;
}, {} as PluginPositions);

// Define default settings for all plugins
const baseDefaults = { mix: 100, output: 50 };

export const INITIAL_PLUGIN_STATES: PluginStates = {
  // Core Tier
  MixxTune: { ...baseDefaults, retuneSpeed: 50, formant: 50, humanize: 50, emotiveLock: false, sidechainActive: false },
  MixxVerb: { ...baseDefaults, size: 50, predelay: 20 },
  MixxDelay: { ...baseDefaults, time: 250, feedback: 45, throwIntuition: 50 },
  MixxDrive: { ...baseDefaults, drive: 30, warmth: 50, color: 50 },
  MixxGlue: { ...baseDefaults, threshold: -20, ratio: 4, release: 100, sidechainActive: false },
  // Neural Tier
  MixxAura: { ...baseDefaults, tone: 50, width: 50, shine: 50, moodLock: false },
  PrimeEQ: { ...baseDefaults, lowGain: 0, midGain: 0, highGain: 0, smartFocus: 50 },
  MixxPolish: { ...baseDefaults, clarity: 50, air: 50, balance: 50 },
  MixxMorph: { ...baseDefaults, transitionTime: 1000, morphDepth: 50, syncMode: 'bpm' },
  PrimeBrainStem: { ...baseDefaults },
  // Master Tier
  MixxLimiter: { ...baseDefaults, ceiling: -0.1, drive: 0, lookahead: 2, clubCheck: false, sidechainActive: false },
  MixxBalance: { ...baseDefaults, width: 50, phase: 50, tilt: 50 },
  MixxCeiling: { ...baseDefaults, level: 0, softClip: 50, tone: 50 },
  PrimeMasterEQ: { ...baseDefaults, mix: 100, lowShelfFreq: 120, lowShelfGain: 0, highShelfFreq: 8000, highShelfGain: 0, midSideMode: false },
  MixxDither: { ...baseDefaults, mix: 100, bitDepth: 16, noiseShaping: 'low', ditherAmount: 100 },
  // Signature Tier
  MixxSoul: { ...baseDefaults, empathy: 50, depth: 50, tone: 50, vibe: 50 },
  MixxMotion: { ...baseDefaults, rate: 50, depth: 50, sync: true },
  PrimeLens: { ...baseDefaults, gain: 50, resolution: 50, colorMode: 'spectral' },
  MixxBrainwave: { ...baseDefaults, seed: 50, variation: 50, intensity: 50 },
  MixxSpirit: { ...baseDefaults, sensitivity: 50, energyLink: 50, threshold: 80 },
  // System Tier
  MixxAnalyzerPro: { ...baseDefaults },
  PrimeRouter: { ...baseDefaults },
  MixxPort: { ...baseDefaults, mix: 100, format: 'mixx', quality: 90 },
  TelemetryCollector: { ...baseDefaults },
  PrimeBotConsole: { ...baseDefaults },
};