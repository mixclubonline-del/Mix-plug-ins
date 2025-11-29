import React from 'react';

interface ToggleButtonProps {
    label: string;
    value: boolean;
    onChange: (val: boolean) => void;
    disabled?: boolean;
    color?: 'cyan' | 'pink' | 'purple' | 'fuchsia' | 'amber' | 'blue' | 'gray'; // Add color prop for custom styling
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
    blue: {
        activeBg: 'bg-blue-600/40',
        activeText: 'text-blue-200',
        activeShadow: 'shadow-[0_0_8px_rgba(37,99,235,0.4)]',
    },
    gray: {
        activeBg: 'bg-gray-600/40',
        activeText: 'text-gray-200',
        activeShadow: 'shadow-[0_0_8px_rgba(107,114,128,0.4)]',
    }
};

export const ToggleButton: React.FC<ToggleButtonProps> = ({ label, value, onChange, disabled = false, color = 'cyan' }) => {
    const colors = colorMap[color];
    const hoverEffects = disabled ? '' : 'hover:scale-105 hover:shadow-[0_0_8px_rgba(255,255,255,0.2)]';
    const activeHoverEffects = disabled ? '' : 'group-hover:scale-105';

    return (
        <button
            onClick={() => onChange(!value)}
            disabled={disabled}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 group
                ${value ? `${colors.activeBg} ${colors.activeText} ${colors.activeShadow}` : 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white'}
                ${value ? activeHoverEffects : hoverEffects}
                ${disabled ? 'opacity-30 cursor-not-allowed' : ''}
            `}
        >
            {label}
        </button>
    );
};