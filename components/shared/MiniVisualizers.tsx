
import React from 'react';
import { PluginKey } from '../../constants';

// --- MINI-VISUALIZER PREVIEW COMPONENTS (REFINED) ---

// MixxTune: A wavering line being "snapped" to a straight line.
const TunePreview: React.FC = () => (
    <svg viewBox="0 0 40 24" className="w-full h-full">
        <path d="M 0 12 L 40 12" stroke="var(--glow-cyan)" strokeWidth="1.5" fill="none" />
        <path d="M 0 12 Q 10 18, 20 12 T 40 12" strokeWidth="1.5" stroke="rgba(255,255,255,0.5)" fill="none" className="animate-[mini-tune-snap-refined_1.5s_infinite_ease-in-out]" />
    </svg>
);

// MixxVerb: A graphical representation of reverb decay.
const VerbPreview: React.FC = () => (
    <div className="w-full h-full relative p-1 overflow-hidden">
        <div className="w-full h-full bg-cyan-400 animate-[mini-verb-decay_2s_infinite_ease-out]" style={{
            clipPath: 'polygon(0 0, 15% 0, 100% 100%, 0% 100%)'
        }}/>
    </div>
);


// MixxDelay: A series of discrete, decaying repeats.
const DelayPreview: React.FC = () => (
    <div className="w-full h-full relative flex items-center justify-start">
        {/* Main pulse */}
        <div className="w-1.5 h-4 bg-pink-400 rounded-sm" />
        {/* Echoes */}
        {[{x: '25%', s: '0.8'}, {x: '45%', s: '0.6'}, {x: '60%', s: '0.4'}].map((style, i) => (
             <div key={i} className="absolute w-1.5 h-4 bg-pink-400/80 rounded-sm" style={{
                 '--x-pos': style.x,
                 '--scale': style.s,
                 animation: `mini-delay-repeats-refined 2s infinite ease-out`,
                 animationDelay: `${i * 0.1}s`,
             } as React.CSSProperties} />
        ))}
    </div>
);

// MixxDrive: Stylized saturation curve.
const DrivePreview: React.FC = () => (
    <svg viewBox="0 0 40 24" className="w-full h-full">
        <path d="M 0 12 Q 10 4, 20 12 T 40 12" stroke="rgba(255,255,255,0.4)" strokeWidth="1" fill="none" strokeDasharray="2 2" />
        <path d="M 0 12 Q 10 4, 20 12 T 40 12" stroke="#f97316" strokeWidth="1.5" fill="none" className="animate-[mini-drive-saturate_1s_infinite_alternate_ease-in-out]" />
    </svg>
);

// MixxAura: A mono signal expanding to stereo.
const AuraPreview: React.FC = () => (
    <svg viewBox="0 0 40 24" className="w-full h-full">
        <path d="M 20 4 V 20" stroke="var(--glow-pink)" fill="none" className="animate-[mini-aura-widen-refined_2s_infinite_alternate_ease-in-out]" />
    </svg>
);

// MixxPolish: Mini spectral display with shimmering high-shelf.
const PolishPreview: React.FC = () => (
    <div className="w-full h-full relative flex items-end justify-center gap-px p-1">
        {[0.3, 0.4, 0.35].map((h, i) => (
             <div key={i} className="w-2 h-full rounded-t-sm bg-amber-400/50" style={{ transform: `scaleY(${h})` }} />
        ))}
        {[0.5, 0.6].map((h, i) => (
             <div key={i+3} className="w-2 h-full rounded-t-sm bg-amber-300" style={{
                transformOrigin: 'bottom',
                animation: `mini-polish-shimmer 1.5s infinite alternate ease-in-out`,
                animationDelay: `${i*0.2}s`
             }} />
        ))}
    </div>
);

// MixxLimiter: Shows input hitting a ceiling and gain reduction.
const LimiterPreview: React.FC = () => (
    <div className="w-full h-full relative flex items-end justify-center p-1 gap-0.5">
        <div className="w-2 h-[80%] bg-amber-400/50 rounded-t-sm" />
        {/* GR flash */}
        <div className="absolute top-1 w-2 h-[30%] bg-red-500 rounded-t-sm animate-[mini-limiter-gr-flash_1s_infinite]" />
        {/* Ceiling Line */}
        <div className="absolute w-full h-px bg-amber-300 top-1" />
    </div>
);

// MixxMotion: A classic LFO sine wave animation.
const MotionPreview: React.FC = () => (
    <div className="w-full h-full relative overflow-hidden">
        <svg viewBox="0 0 20 10" className="absolute w-[200%] h-full animate-[mini-motion-wave-pan_2s_linear_infinite]">
            <path d="M 0 5 Q 5 0, 10 5 T 20 5" stroke="rgba(217, 70, 239, 1)" strokeWidth="1" fill="none" />
        </svg>
    </div>
);

// MixxSoul: Flowing, organic particles representing "vibe".
const SoulPreview: React.FC = () => (
    <div className="w-full h-full relative">
        {Array.from({length: 3}).map((_, i) => (
            <div key={i} className="absolute w-2 h-2 rounded-full bg-rose-400" style={{
                '--x1': `${20 + i*30}%`, '--y1': `${80}%`,
                '--x2': `${40 - i*10}%`, '--y2': `${10}%`,
                animation: `mini-soul-flow ${3 + i}s infinite alternate`,
            } as React.CSSProperties}/>
        ))}
    </div>
);

// MixxGlue: Graphic representation of compression.
const GluePreview: React.FC = () => (
    <svg viewBox="0 0 40 24" className="w-full h-full">
        <path d="M 0 18 Q 10 2, 20 10 T 40 18" stroke="rgba(255,255,255,0.4)" strokeWidth="1" fill="none" />
        <path d="M 0 18 Q 10 2, 20 10 T 40 18" stroke="var(--glow-pink)" strokeWidth="1.5" fill="none" className="animate-[mini-glue-compress-refined_1.5s_infinite_alternate_ease-in-out]" />
    </svg>
);


// PrimeEQ: A classic parametric EQ curve.
const EQPreview: React.FC = () => (
     <svg viewBox="0 0 40 24" className="w-full h-full">
        <path d="M 0 12 L 40 12" stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none" strokeDasharray="2 2"/>
        <path d="M 0 12 Q 10 12, 20 12 T 40 12" stroke="var(--glow-cyan)" strokeWidth="1.5" fill="none" className="animate-[mini-eq-boost-refined_2s_infinite_alternate_ease-in-out]" />
    </svg>
);

// MixxBalance: Lissajous-style stereo field.
const BalancePreview: React.FC = () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
        <ellipse cx="12" cy="12" rx="6" ry="3"
            stroke="var(--glow-cyan)"
            strokeWidth="1.5"
            fill="none"
            className="animate-[mini-balance-vectorscope_4s_infinite_ease-in-out]"
            style={{ transformOrigin: 'center' }}
        />
    </svg>
);

// MixxMorph: A shape being wiped over by another color.
const MorphPreview: React.FC = () => (
    <svg viewBox="0 0 40 24" className="w-full h-full">
        <path d="M 0 18 Q 10 6, 20 12 T 40 6" stroke="var(--glow-cyan)" strokeWidth="1.5" fill="none" />
        <path d="M 0 6 Q 10 18, 20 12 T 40 18" stroke="var(--glow-pink)" strokeWidth="1.5" fill="none" className="animate-[mini-morph-crossfade_2s_infinite_alternate_ease-in-out]" />
    </svg>
);

// MixxCeiling: Waveform getting clipped.
const CeilingPreview: React.FC = () => (
    <svg viewBox="0 0 40 24" className="w-full h-full">
        <path d="M 0 14 Q 10 2, 20 10 T 40 14" stroke="hsl(50, 100%, 85%)" strokeWidth="1.5" fill="none" />
        <line x1="0" y1="6" x2="40" y2="6" stroke="hsl(50, 100%, 85%)" strokeWidth="1" />
        <rect x="15" y="5" width="10" height="2" fill="hsl(50, 100%, 85%)" className="animate-[mini-ceiling-spark_1s_infinite]" style={{ transformOrigin: 'center' }}/>
    </svg>
);

// MixxBrainwave: Neural generative lines.
const BrainwavePreview: React.FC = () => (
    <svg viewBox="0 0 40 24" className="w-full h-full">
        {/* Nodes */}
        <circle cx="6" cy="12" r="2" fill="rgba(192, 132, 252, 0.7)" />
        <circle cx="20" cy="6" r="2" fill="rgba(192, 132, 252, 0.7)" />
        <circle cx="20" cy="18" r="2" fill="rgba(192, 132, 252, 0.7)" />
        <circle cx="34" cy="12" r="2" fill="rgba(192, 132, 252, 0.7)" />
        {/* Connections */}
        <path d="M 6 12 H 20 M 20 6 V 18" stroke="rgba(192, 132, 252, 0.3)" strokeWidth="1" fill="none" />
        <path d="M 20 6 L 34 12 L 20 18" stroke="rgba(192, 132, 252, 0.8)" strokeWidth="1.5" fill="none"
            strokeDasharray="25"
            className="animate-[mini-brainwave-think_2s_infinite_ease-in-out]" />
    </svg>
);

// MixxSpirit: Crowd energy rising.
const SpiritPreview: React.FC = () => (
    <div className="w-full h-full relative">
        {Array.from({length: 5}).map((_, i) => (
            <div key={i} className="absolute w-1 h-1 rounded-full bg-rose-300" style={{
                left: `${15 + i*15 + Math.random()*10}%`,
                bottom: '0%',
                animation: `mini-spirit-rise ${1.5 + Math.random()}s infinite alternate`,
                animationDelay: `${Math.random()}s`,
            }} />
        ))}
    </div>
);

// PrimeLens: Audio to visual translation.
const LensPreview: React.FC = () => (
    <svg viewBox="0 0 40 24" className="w-full h-full">
        <path d="M 2 12 Q 6 4, 10 12 T 18 12" stroke="var(--glow-cyan)" strokeWidth="1" fill="none"/>
        <circle cx="28" cy="12" r="6" stroke="var(--glow-pink)" strokeWidth="1" fill="none" strokeDasharray="2 4" className="animate-[mini-lens-radiate_2s_infinite_linear]" />
    </svg>
);

// PrimeBrainStem: Central core.
const BrainStemPreview: React.FC = () => (
    <svg viewBox="0 0 40 24" className="w-full h-full overflow-visible">
        <circle cx="20" cy="12" r="4" fill="rgba(255,255,255,0.8)" className="animate-[mini-brainstem-pulse_2s_infinite]" />
        {Array.from({ length: 6 }).map((_, i) => (
            <circle key={i} cx="20" cy="12" r="4" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1"
                className="animate-[mini-brainstem-radiate_2s_infinite]" style={{ animationDelay: `${i * 0.33}s` }} />
        ))}
    </svg>
);

// MixxAnalyzerPro: Spectrum bars.
const AnalyzerProPreview: React.FC = () => (
    <div className="w-full h-full relative flex items-end justify-center gap-px p-1">
        {[0.8, 0.5, 0.9, 0.4, 0.7].map((h, i) => (
             <div key={i} className="w-1.5 h-full rounded-t-sm bg-violet-400" style={{
                '--end-scale': h,
                animation: `mini-eq-dance ${1 + i*0.2}s infinite alternate ease-in-out`,
                animationDelay: `${i*0.1}s`
             } as React.CSSProperties} />
        ))}
    </div>
);

// PrimeRouter: Node matrix.
const RouterPreview: React.FC = () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
        {/* Nodes */}
        {[6, 12, 18].map(y => [6, 12, 18].map(x => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" fill="rgba(255,255,255,0.4)" />))}
        {/* Connection */}
        <path d="M 6 12 H 18" stroke="var(--glow-cyan)" strokeWidth="1" strokeDasharray="3" className="animate-[mini-router-flow_1s_infinite_linear]" />
    </svg>
);

// MixxPort: Export progress.
const PortPreview: React.FC = () => (
    <svg viewBox="0 0 24 24" className="w-full h-full">
        <circle cx="12" cy="12" r="8" stroke="rgba(167, 139, 250, 0.3)" strokeWidth="2" fill="none" />
        <circle cx="12" cy="12" r="8" stroke="rgba(167, 139, 250, 1)" strokeWidth="2" fill="none"
            strokeDasharray="32"
            transform="rotate(-90 12 12)"
            className="animate-[mini-port-progress_2s_infinite_linear]" />
    </svg>
);

// TelemetryCollector: Heartbeat line.
const TelemetryPreview: React.FC = () => (
    <svg viewBox="0 0 40 24" className="w-full h-full">
        <path d="M 0 12 L 10 12 L 15 16 L 25 8 L 30 12 L 40 12"
            stroke="rgba(255,255,255,0.6)"
            strokeWidth="1.5"
            fill="none"
            strokeDasharray="40"
            strokeDashoffset="40"
            className="animate-[mini-telemetry-draw_1.5s_infinite_linear]"
        />
    </svg>
);

// PrimeBotConsole: Blinking cursor.
const BotConsolePreview: React.FC = () => (
    <div className="w-full h-full relative flex items-center font-mono text-xs p-1">
        <span className="text-white/80">&gt;</span>
        <div className="w-1.5 h-3 bg-white/80 animate-[mini-bot-blink_1.2s_infinite_step-end]" />
    </div>
);

// PrimeMasterEQ: A mastering-style shelf EQ curve.
const MasterEQPreview: React.FC = () => (
    <svg viewBox="0 0 40 24" className="w-full h-full">
        <path d="M 0 12 L 40 12" stroke="hsl(50, 100%, 85%)" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.5"/>
        <path d="M 0 16 C 10 16, 12 6, 20 6 S 30 18, 40 18"
            stroke="hsl(50, 100%, 85%)"
            strokeWidth="1.5"
            fill="none"
            className="animate-[mini-master-eq-shelf_3s_infinite_alternate_ease-in-out]"
        />
    </svg>
);

// MixxDither: Shimmering noise floor.
const DitherPreview: React.FC = () => (
    <div className="w-full h-full relative overflow-hidden">
        {Array.from({length: 10}).map((_, i) => (
             <div key={i} className="absolute bottom-1 w-0.5 h-1 bg-white/80" style={{
                left: `${10 + i * 8}%`,
                animation: `mini-polish-shimmer ${1 + Math.random()}s infinite`,
                animationDelay: `${Math.random()}s`,
             }} />
        ))}
    </div>
);

// --- PLUGIN PREVIEW MAPPING ---
export const pluginPreviews: Partial<Record<PluginKey, React.FC>> = {
    'MixxTune': TunePreview,
    'MixxVerb': VerbPreview,
    'MixxDelay': DelayPreview,
    'MixxDrive': DrivePreview,
    'MixxGlue': GluePreview,
    'MixxAura': AuraPreview,
    'PrimeEQ': EQPreview,
    'MixxPolish': PolishPreview,
    'MixxLimiter': LimiterPreview,
    'MixxBalance': BalancePreview,
    'MixxMotion': MotionPreview,
    'MixxSoul': SoulPreview,
    'MixxMorph': MorphPreview,
    'MixxCeiling': CeilingPreview,
    'MixxBrainwave': BrainwavePreview,
    'MixxSpirit': SpiritPreview,
    'PrimeLens': LensPreview,
    'PrimeBrainStem': BrainStemPreview,
    'MixxAnalyzerPro': AnalyzerProPreview,
    'PrimeRouter': RouterPreview,
    'MixxPort': PortPreview,
    'TelemetryCollector': TelemetryPreview,
    'PrimeBotConsole': BotConsolePreview,
    'PrimeMasterEQ': MasterEQPreview,
    'MixxDither': DitherPreview,
};
