import React from 'react';

interface SegmentedControlProps {
    label: string;
    options: (string | number)[];
    value: string | number;
    onChange: (val: any) => void; // 'any' because options can be string or number
    tierColor?: 'cyan' | 'pink' | 'purple' | 'fuchsia' | 'amber' | 'violet'; // Define specific tier colors
}

const colorMap = {
    cyan: {
        activeBg: 'bg-cyan-600/40',
        activeText: 'text-cyan-200',
        activeShadow: 'shadow-[0_0_8px_rgba(56,189,248,0.4)]',
    },
    pink: {
        activeBg: 'bg-pink-600/40',
        activeText: 'text-pink-200',
        activeShadow: 'shadow-[0_0_8px_rgba(236,72,153,0.4)]',
    },
    purple: {
        activeBg: 'bg-purple-600/40',
        activeText: 'text-purple-200',
        activeShadow: 'shadow-[0_0_8px_rgba(168,85,247,0.4)]',
    },
    fuchsia: {
        activeBg: 'bg-fuchsia-600/40',
        activeText: 'text-fuchsia-200',
        activeShadow: 'shadow-[0_0_8px_rgba(217,70,239,0.4)]',
    },
    amber: {
        activeBg: 'bg-amber-400/40',
        activeText: 'text-amber-200',
        activeShadow: 'shadow-[0_0_8px_rgba(251,191,36,0.4)]',
    },
    violet: { // For MixxPort system tier
        activeBg: 'bg-violet-600/40',
        activeText: 'text-violet-200',
        activeShadow: 'shadow-[0_0_8px_rgba(139,92,246,0.4)]',
    }
};

export const SegmentedControl: React.FC<SegmentedControlProps> = ({ label, options, value, onChange, tierColor = 'cyan' }) => {
    const colors = colorMap[tierColor];

    return (
        <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold tracking-wider uppercase text-white/60">{label}</span>
            <div className="flex bg-white/10 rounded-lg p-1">
                {options.map(option => (
                    <button
                        key={String(option)}
                        onClick={() => onChange(option)}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all duration-200 group
                            ${value === option ? `${colors.activeBg} ${colors.activeText} ${colors.activeShadow}` : 'text-white/50 hover:bg-white/20 hover:text-white'}
                            ${!value || value !== option ? 'hover:scale-105 hover:shadow-[0_0_8px_rgba(255,255,255,0.2)]' : 'group-hover:scale-105'}
                        `}
                    >
                        {String(option).toUpperCase()}
                    </button>
                ))}
            </div>
        </div>
    );
};