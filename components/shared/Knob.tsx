

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface KnobProps {
  size?: number;
  min?: number;
  max?: number;
  defaultValue?: number;
  value: number;
  setValue: (value: number) => void;
  label: string;
  step?: number;
  paramName: string;
  isLearning: boolean;
  onMidiLearn: (paramName: string, min: number, max: number) => void;
}

const MIN_ANGLE = -135;
const MAX_ANGLE = 135;
const ACTIVATION_THRESHOLD = 3; // pixels

const PIXELS_PER_UNIT_NORMAL = 2; // 2 pixels of mouse movement for a 1-unit change without modifier keys.
const FINE_TUNE_MULTIPLIER = 5;    // 5x finer with Shift
const SUPER_FINE_TUNE_MULTIPLIER = 20; // 20x finer with Ctrl/Cmd

export const Knob: React.FC<KnobProps> = ({
  size = 80,
  min = 0,
  max = 100,
  defaultValue,
  value,
  setValue,
  label,
  step,
  paramName,
  isLearning,
  onMidiLearn,
}) => {
  const knobRef = useRef<SVGSVGElement>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isFineTuning, setIsFineTuning] = useState(false);
  const [isSuperFineTuning, setIsSuperFineTuning] = useState(false); // New state for super fine tuning
  const [isThresholdMet, setIsThresholdMet] = useState(false);
  const dragStartInfo = useRef({ y: 0, value: 0 });
  const [isAnimatingReset, setIsAnimatingReset] = useState(false);
  const animationTimeoutRef = useRef<number | null>(null);

  const [valueChangeFlash, setValueChangeFlash] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (value !== prevValueRef.current && !isDragging) {
      setValueChangeFlash(true);
      const timer = setTimeout(() => setValueChangeFlash(false), 300);
      prevValueRef.current = value;
      return () => clearTimeout(timer);
    }
    prevValueRef.current = value;
  }, [value, isDragging]);

  const valueToAngle = (val: number) => {
    const percentage = (val - min) / (max - min);
    return MIN_ANGLE + percentage * (MAX_ANGLE - MIN_ANGLE);
  };
  
  const angle = valueToAngle(value);

  const applyStepAndPrecision = useCallback((val: number) => {
    let finalValue = val;
    if (step !== undefined && step > 0) {
        finalValue = Math.round(val / step) * step;
    }
    const decimalPlaces = step ? Math.max(0, -Math.floor(Math.log10(step))) : 0;
    return parseFloat(finalValue.toFixed(decimalPlaces));
  }, [step]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const currentIsSuperFineTuning = e.metaKey || e.ctrlKey;
    const currentIsFineTuning = e.shiftKey && !currentIsSuperFineTuning; // Fine tuning only if NOT super fine tuning
    setIsFineTuning(currentIsFineTuning);
    setIsSuperFineTuning(currentIsSuperFineTuning);

    let currentMultiplier = 1;
    if (currentIsFineTuning) currentMultiplier = FINE_TUNE_MULTIPLIER;
    if (currentIsSuperFineTuning) currentMultiplier = SUPER_FINE_TUNE_MULTIPLIER;

    const startInfo = dragStartInfo.current;
    const deltaY = startInfo.y - e.clientY;

    if (!isThresholdMet) {
      if (Math.abs(deltaY) > ACTIVATION_THRESHOLD) {
        setIsThresholdMet(true);
      } else {
        return;
      }
    }
    
    // Calculate value change based on pixels moved
    const sensitivityDivisor = PIXELS_PER_UNIT_NORMAL * currentMultiplier;
    let newValue = startInfo.value + (deltaY / sensitivityDivisor);
    
    newValue = Math.max(min, Math.min(max, newValue));
    newValue = applyStepAndPrecision(newValue);

    if (newValue !== value) {
      setValue(newValue);
    }
  }, [isDragging, isThresholdMet, min, max, value, setValue, applyStepAndPrecision]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsFineTuning(false); // Reset fine-tuning visual on mouse up
    setIsSuperFineTuning(false); // Reset super fine-tuning visual on mouse up
    document.body.style.cursor = 'default';
  }, []);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!controlRef.current || document.activeElement !== controlRef.current) return;

    const currentIsSuperFineTuning = e.metaKey || e.ctrlKey;
    const currentIsFineTuning = e.shiftKey && !currentIsSuperFineTuning;
    setIsFineTuning(currentIsFineTuning);
    setIsSuperFineTuning(currentIsSuperFineTuning);

    let currentMultiplier = 1;
    if (currentIsFineTuning) currentMultiplier = FINE_TUNE_MULTIPLIER;
    if (currentIsSuperFineTuning) currentMultiplier = SUPER_FINE_TUNE_MULTIPLIER;

    let newValue = value;
    const adjustAmount = (step || (max - min) / 100) / currentMultiplier; // Adjust amount based on multiplier

    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      newValue = Math.min(max, value + adjustAmount);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      newValue = Math.max(min, value - adjustAmount);
    } else {
      return;
    }

    e.preventDefault();
    newValue = applyStepAndPrecision(newValue);
    if (newValue !== value) {
      setValue(newValue);
    }
  }, [value, min, max, step, setValue, applyStepAndPrecision]);

  const handleKeyUp = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    // Reset states when modifier keys are released
    if (!e.shiftKey) {
      setIsFineTuning(false);
    }
    if (!e.metaKey && !e.ctrlKey) {
      setIsSuperFineTuning(false);
    }
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!controlRef.current || document.activeElement !== controlRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();

    const currentIsSuperFineTuning = e.metaKey || e.ctrlKey;
    const currentIsFineTuning = e.shiftKey && !currentIsSuperFineTuning;
    setIsFineTuning(currentIsFineTuning);
    setIsSuperFineTuning(currentIsSuperFineTuning);

    let currentMultiplier = 1;
    if (currentIsFineTuning) currentMultiplier = FINE_TUNE_MULTIPLIER;
    if (currentIsSuperFineTuning) currentMultiplier = SUPER_FINE_TUNE_MULTIPLIER;

    let newValue = value;
    const adjustAmount = (step || (max - min) / 100) / currentMultiplier; // Adjust amount based on multiplier

    if (e.deltaY < 0) { // Scroll up
      newValue = Math.min(max, value + adjustAmount);
    } else { // Scroll down
      newValue = Math.max(min, value - adjustAmount);
    }
    
    newValue = applyStepAndPrecision(newValue);
    if (newValue !== value) {
      setValue(newValue);
    }
  }, [value, min, max, step, setValue, applyStepAndPrecision]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
       setIsThresholdMet(false); // Reset threshold when not dragging
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);
  
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    e.preventDefault();
    e.stopPropagation();
    controlRef.current?.focus();
    setIsDragging(true);
    // Set initial fine-tuning states based on current modifier keys
    const currentIsSuperFineTuning = e.metaKey || e.ctrlKey;
    const currentIsFineTuning = e.shiftKey && !currentIsSuperFineTuning;
    setIsFineTuning(currentIsFineTuning);
    setIsSuperFineTuning(currentIsSuperFineTuning);

    dragStartInfo.current = { y: e.clientY, value: value };
    document.body.style.cursor = 'ns-resize';
  };
  
  const handleDoubleClick = () => {
      const resetValue = defaultValue !== undefined ? defaultValue : min + (max - min) / 2;
      const finalResetValue = applyStepAndPrecision(resetValue);
      setValue(finalResetValue);

      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      setIsAnimatingReset(true);
      animationTimeoutRef.current = window.setTimeout(() => {
        setIsAnimatingReset(false);
      }, 300);
  }

  const radius = size / 2;
  const trackRadius = radius * 0.8;
  const trackWidth = radius * 0.15;
  
  const valuePercentage = (value - min) / (max - min);
  const circumference = 2 * Math.PI * trackRadius;
  const strokeDashoffset = circumference * (1 - valuePercentage * (270/360));

  return (
    <div 
        ref={controlRef}
        className="flex flex-col items-center justify-center gap-1 w-28 text-center knob-control focus:outline-none focus:ring-2 focus:ring-cyan-500 rounded-lg" 
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
    >
      <svg
        ref={knobRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        onMouseDown={handleMouseDown}
        className="cursor-ns-resize group"
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
      >
        <defs>
          <radialGradient id="knobChrome" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#889" />
            <stop offset="50%" stopColor="#556" />
            <stop offset="100%" stopColor="#223" />
          </radialGradient>
           <linearGradient id="knobSheen" x1="0%" y1="0%" x2="0%" y2="100%">
             <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
             <stop offset="50%" stopColor="rgba(255,255,255,0.0)" />
             <stop offset="100%" stopColor="rgba(0,0,0,0.2)" />
           </linearGradient>
          <filter id="glow-indicator">
             <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
             <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
             </feMerge>
          </filter>
          <linearGradient id="valueGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isSuperFineTuning ? "#a78bfa" : (isFineTuning ? "#fda4af" : "#f472b6")} />
            <stop offset="100%" stopColor={isSuperFineTuning ? "#7c3aed" : (isFineTuning ? "#67e8f9" : "#22d3ee")} />
          </linearGradient>
        </defs>

        <circle cx={radius} cy={radius} r={trackRadius} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth={trackWidth} />
        <circle cx={radius} cy={radius} r={trackRadius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={trackWidth} style={{strokeDasharray: '2 4'}}/>

        <circle
          cx={radius}
          cy={radius}
          r={trackRadius}
          fill="none"
          stroke="url(#valueGradient)"
          strokeWidth={trackWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(135 ${radius} ${radius})`}
          className={`${!isDragging ? 'transition-all duration-150' : ''} ${isAnimatingReset || valueChangeFlash ? 'knob-value-changed' : ''}`}
          style={{filter: "drop-shadow(0 0 3px var(--glow-cyan))"}}
        />

        <g className={`${isAnimatingReset || valueChangeFlash ? 'knob-value-changed' : ''}`}>
          <circle cx={radius} cy={radius} r={radius * 0.7} fill="url(#knobChrome)" stroke="rgba(0,0,0,0.5)" strokeWidth="1" />
          <circle cx={radius} cy={radius} r={radius * 0.7} fill="url(#knobSheen)" />
          <circle cx={radius} cy={radius} r={radius * 0.65} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth="0.5" />
        </g>
        
        <g 
          transform={`rotate(${angle} ${radius} ${radius})`}
          className={`${!isDragging ? 'transition-transform duration-150' : ''}`}
        >
            <rect
              x={radius - 1.5}
              y={radius * 0.25}
              width="3"
              height={radius * 0.45}
              fill="#22d3ee"
              rx="1.5"
              className={`${isAnimatingReset || valueChangeFlash ? 'knob-value-changed' : ''}`}
              style={{filter: "url(#glow-indicator) drop-shadow(0 0 5px var(--glow-cyan))"}}
            />
        </g>
      </svg>
      <div className="flex items-center justify-center gap-2 h-5">
        <span className="text-xs font-bold tracking-wider uppercase text-white/60">{label}</span>
        <button 
          onClick={() => onMidiLearn(paramName, min, max)}
          className={`w-3 h-3 rounded-full transition-all border border-white/20 ${isLearning ? 'midi-learn-active' : 'bg-white/10 hover:bg-white/30'}`}
          title={`MIDI Learn: ${label}`}
          aria-label={`MIDI Learn for ${label}`}
        />
      </div>
    </div>
  );
};