

import React, { useRef, useCallback, useState, useEffect } from 'react';

interface PrecisionSliderProps {
  min?: number;
  max?: number;
  defaultValue?: number;
  value: number;
  setValue: (value: number) => void;
  step?: number; // Add step prop for precision
}

const PIXELS_PER_UNIT_NORMAL_SLIDER = 1; // 1 pixel of mouse movement for a 1-unit change without modifier keys.
const FINE_TUNE_MULTIPLIER_SLIDER = 4;    // 4x finer with Shift
const SUPER_FINE_TUNE_MULTIPLIER_SLIDER = 16; // 16x finer with Ctrl/Cmd

export const PrecisionSlider: React.FC<PrecisionSliderProps> = ({
  min = 0,
  max = 100,
  defaultValue = 50,
  value,
  setValue,
  step = 1, // Default step to 1
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const dragStartInfo = useRef({ x: 0, value: 0 });
  const [isAnimatingReset, setIsAnimatingReset] = useState(false);
  const animationTimeoutRef = useRef<number | null>(null);

  // State to trigger value change flash animation
  const [valueChangeFlash, setValueChangeFlash] = useState(false);
  const prevValueRef = useRef(value);

  const [isFineTuning, setIsFineTuning] = useState(false); // New state for fine tuning
  const [isSuperFineTuning, setIsSuperFineTuning] = useState(false); // New state for super fine tuning

  // Trigger flash animation when value changes (not during drag)
  useEffect(() => {
    if (value !== prevValueRef.current) { // No need to check isDragging here, as the setter is separate
      setValueChangeFlash(true);
      const timer = setTimeout(() => setValueChangeFlash(false), 300);
      return () => clearTimeout(timer);
    }
    prevValueRef.current = value;
  }, [value]);

  const applyStepAndPrecision = useCallback((val: number) => {
    let finalValue = val;
    if (step > 0) {
        finalValue = Math.round(val / step) * step;
    }
    const decimalPlaces = step ? Math.max(0, -Math.floor(Math.log10(step))) : 0;
    return parseFloat(finalValue.toFixed(decimalPlaces));
  }, [step]);


  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!sliderRef.current) return;
    
    e.preventDefault();
    e.stopPropagation(); // Stop propagation to prevent parent ResizableContainer from dragging
    document.body.style.cursor = 'ew-resize';
    const rect = sliderRef.current.getBoundingClientRect();

    // Determine current multiplier based on modifier keys
    const currentIsSuperFineTuning = e.metaKey || e.ctrlKey;
    const currentIsFineTuning = e.shiftKey && !currentIsSuperFineTuning;
    // No need to set states here, as mousemove will handle it, but can for initial visual if desired
    // setIsFineTuning(currentIsFineTuning);
    // setIsSuperFineTuning(currentIsSuperFineTuning);

    // Handle click-to-jump first
    const clickPercentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const clickedValue = applyStepAndPrecision(min + clickPercentage * (max - min));
    setValue(clickedValue);

    // Then, prepare for a potential drag from that new position
    dragStartInfo.current = { x: e.clientX, value: clickedValue };
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
        const startInfo = dragStartInfo.current;
        const currentRect = sliderRef.current?.getBoundingClientRect();
        if (!currentRect) return;

        const deltaX = moveEvent.clientX - startInfo.x;

        // Modifier keys for sensitivity
        const currentIsSuperFineTuning = moveEvent.metaKey || moveEvent.ctrlKey;
        const currentIsFineTuning = moveEvent.shiftKey && !currentIsSuperFineTuning;
        setIsFineTuning(currentIsFineTuning); // Update state for visual feedback
        setIsSuperFineTuning(currentIsSuperFineTuning); // Update state for visual feedback

        let currentMultiplier = 1;
        if (currentIsFineTuning) currentMultiplier = FINE_TUNE_MULTIPLIER_SLIDER;
        if (currentIsSuperFineTuning) currentMultiplier = SUPER_FINE_TUNE_MULTIPLIER_SLIDER;
        
        // Calculate value change based on pixels moved
        const sensitivityDivisor = PIXELS_PER_UNIT_NORMAL_SLIDER * currentMultiplier;
        let newValue = startInfo.value + (deltaX / sensitivityDivisor);
        
        newValue = Math.max(min, Math.min(max, newValue));
        
        if (newValue !== value) {
            setValue(newValue);
        }
    };

    const handleMouseUp = () => {
        document.body.style.cursor = 'default';
        setIsFineTuning(false); // Reset visual state
        setIsSuperFineTuning(false); // Reset visual state
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

  }, [min, max, value, setValue, applyStepAndPrecision]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const handleDoubleClick = () => {
    const finalResetValue = applyStepAndPrecision(defaultValue);
    setValue(finalResetValue);
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    setIsAnimatingReset(true);
    animationTimeoutRef.current = window.setTimeout(() => {
      setIsAnimatingReset(false);
    }, 300);
  };
  
  // Mouse Wheel Scroll
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!sliderRef.current || document.activeElement !== sliderRef.current) return;
    
    e.preventDefault(); // Prevent page scrolling
    e.stopPropagation(); // Stop propagation to prevent parent scroll or drag

    const currentIsSuperFineTuning = e.metaKey || e.ctrlKey;
    const currentIsFineTuning = e.shiftKey && !currentIsSuperFineTuning;
    setIsFineTuning(currentIsFineTuning);
    setIsSuperFineTuning(currentIsSuperFineTuning);

    let currentMultiplier = 1;
    if (currentIsFineTuning) currentMultiplier = FINE_TUNE_MULTIPLIER_SLIDER;
    if (currentIsSuperFineTuning) currentMultiplier = SUPER_FINE_TUNE_MULTIPLIER_SLIDER;

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

  // Keyboard Control
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!sliderRef.current || document.activeElement !== sliderRef.current) return; 

    const currentIsSuperFineTuning = e.metaKey || e.ctrlKey;
    const currentIsFineTuning = e.shiftKey && !currentIsSuperFineTuning;
    setIsFineTuning(currentIsFineTuning);
    setIsSuperFineTuning(currentIsSuperFineTuning);

    let currentMultiplier = 1;
    if (currentIsFineTuning) currentMultiplier = FINE_TUNE_MULTIPLIER_SLIDER;
    if (currentIsSuperFineTuning) currentMultiplier = SUPER_FINE_TUNE_MULTIPLIER_SLIDER;

    let newValue = value;
    const adjustAmount = (step || (max - min) / 100) / currentMultiplier; // Adjust amount based on multiplier

    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      newValue = Math.min(max, value + adjustAmount);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      newValue = Math.max(min, value - adjustAmount);
    } else {
      return; 
    }

    newValue = applyStepAndPrecision(newValue);
    if (newValue !== value) {
      setValue(newValue);
    }
    e.preventDefault(); 
    e.stopPropagation(); // Prevent parent scroll or drag
  }, [value, min, max, step, setValue, applyStepAndPrecision]);

  const handleKeyUp = useCallback((e: React.KeyboardEvent) => {
    // Reset states when modifier keys are released
    if (!e.shiftKey) {
      setIsFineTuning(false);
    }
    if (!e.metaKey && !e.ctrlKey) {
      setIsSuperFineTuning(false);
    }
  }, []);

  const percentage = ((value - min) / (max - min)) * 100;

  const puckBaseColor = isSuperFineTuning ? 'bg-violet-400' : (isFineTuning ? 'bg-cyan-400' : 'bg-pink-400');
  const puckGlowColor = isSuperFineTuning ? '#a78bfa' : (isFineTuning ? '#67e8f9' : '#f472b6');


  return (
    <div 
      ref={sliderRef}
      className="relative w-full h-8 flex items-center cursor-pointer slider-control"
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp} // Added keyUp listener
      tabIndex={0} // Make focusable for keyboard events
      role="slider"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label="Precision Slider"
    >
      <div className="w-full h-1 bg-gradient-to-r from-cyan-500/50 to-pink-500/50 rounded-full relative shadow-[0_0_10px_rgba(244,114,182,0.5)]">
        <div 
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-400 to-pink-400 rounded-full" 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <div 
        className={`absolute top-1/2 h-5 w-5 rounded-full ${puckBaseColor} border-2 border-white shadow-lg transition-all duration-100 pointer-events-none ${isAnimatingReset || valueChangeFlash ? 'slider-value-changed' : ''}`}
        style={{ 
          left: `${percentage}%`,
          transform: `translate(-50%, -50%)`,
          boxShadow: `0 0 15px ${puckGlowColor}, 0 0 5px white`
        }}
      >
        <div className="absolute -bottom-2 w-full h-1 bg-white/50 blur-sm"></div>
      </div>
    </div>
  );
};