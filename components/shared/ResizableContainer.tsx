
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { PluginPosition, PluginSize, GlobalSettings } from '../../types';
import { motion } from 'framer-motion';
import { mapRange } from '../../lib/utils'; // Import mapRange

interface ResizableContainerProps {
  initialSize: PluginSize;
  onResizeStop: (size: PluginSize) => void;
  initialPosition: PluginPosition;
  onDragStop: (position: PluginPosition) => void;
  children: React.ReactNode;
  minWidth?: number;
  minHeight?: number;
  onInteractionStart?: () => void;
  onInteractionStop?: () => void;
  zIndex?: number;
  layoutId?: string; // Add layoutId prop for Framer Motion
  onAnimationComplete?: () => void;
  globalSettings: GlobalSettings; // Pass global settings
}

export const ResizableContainer: React.FC<ResizableContainerProps> = ({
  initialSize,
  onResizeStop,
  initialPosition,
  onDragStop,
  children,
  minWidth = 400,
  minHeight = 225,
  onInteractionStart,
  onInteractionStop,
  zIndex = 10,
  layoutId,
  onAnimationComplete,
  globalSettings, // Destructure globalSettings
}) => {
  const [size, setSize] = useState<PluginSize>(initialSize);
  const [position, setPosition] = useState<PluginPosition>(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  // Ref to store the initial state of interaction (mouse position, current size/pos)
  const interactionStartInfo = useRef({ 
    clientX: 0, clientY: 0,
    width: 0, height: 0,
    posX: 0, posY: 0
  }); 

  // Sync internal state with props
  useEffect(() => {
    setSize(initialSize);
    setPosition(initialPosition);
  }, [initialSize, initialPosition]);

  // Global mouse move handler for resizing and dragging
  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    e.preventDefault(); // Prevent text selection etc.
    const { clientX: startClientX, clientY: startClientY, width: startWidth, height: startHeight, posX: startPosX, posY: startPosY } = interactionStartInfo.current;

    if (isResizing) {
      const newWidth = Math.max(minWidth, startWidth + (e.clientX - startClientX));
      const newHeight = Math.max(minHeight, startHeight + (e.clientY - startClientY));
      setSize({ width: newWidth, height: newHeight });
    } else if (isDragging) {
      const newX = startPosX + (e.clientX - startClientX);
      const newY = startPosY + (e.clientY - startClientY);
      setPosition({ x: newX, y: newY });
    }
  }, [isResizing, isDragging, minWidth, minHeight]); // Dependencies for useCallback

  // Global mouse up handler to end interaction
  const handleGlobalMouseUp = useCallback(() => {
    if (isResizing) {
      // Use a functional update to get the latest size state before calling onResizeStop
      setSize(currentSize => {
        onResizeStop(currentSize);
        return currentSize;
      });
    } else if (isDragging) {
      // Use a functional update to get the latest position state before calling onDragStop
      setPosition(currentPosition => {
        onDragStop(currentPosition);
        return currentPosition;
      });
    }
    
    // Reset states
    setIsDragging(false);
    setIsResizing(false);
    onInteractionStop?.(); // Notify parent interaction has stopped
    
    // Reset cursor and remove global listeners
    document.body.style.cursor = 'default';
    window.removeEventListener('mousemove', handleGlobalMouseMove);
    window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isResizing, isDragging, handleGlobalMouseMove, onResizeStop, onDragStop, onInteractionStop]); // Dependencies for useCallback


  // Effect to add/remove global event listeners
  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      onInteractionStart?.(); // Notify parent interaction has started
    } 
    return () => { // Cleanup function
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, isResizing, handleGlobalMouseMove, handleGlobalMouseUp, onInteractionStart]); // Dependencies for useEffect


  // Mouse down on resize handle
  const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent drag from starting on parent
    setIsResizing(true);
    document.body.style.cursor = 'nwse-resize';
    
    // Store initial interaction info
    interactionStartInfo.current = {
      clientX: e.clientX, clientY: e.clientY,
      width: containerRef.current?.offsetWidth || size.width, // Get actual current width
      height: containerRef.current?.offsetHeight || size.height, // Get actual current height
      posX: position.x, posY: position.y // Store current position
    };
  };

  // Mouse down on container (for dragging)
  const handleDragMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Crucial: check if the event target is the resize handle or any interactive knob/slider control
    const target = e.target as HTMLElement;
    if (target.closest('.resize-handle') || target.closest('.knob-control') || target.closest('.slider-control')) {
      return; 
    }
    
    e.preventDefault(); // Prevent text selection etc.
    setIsDragging(true);
    document.body.style.cursor = 'grabbing';

    // Store initial interaction info
    interactionStartInfo.current = {
      clientX: e.clientX, clientY: e.clientY,
      width: size.width, height: size.height, // Store current size (unchanged during drag)
      posX: position.x, posY: position.y, // Get actual current position
    };
  };
  
  // Clone children to inject props like isDragging, isResizing
  const childWithProps = React.cloneElement(children as React.ReactElement<any>, { 
    isDragging: isDragging, 
    isResizing: isResizing,
  });

  // Dynamic z-index to bring active plugin to front
  const currentZIndex = (isDragging || isResizing) ? zIndex + 10 : zIndex;

  // Calculate dynamic Framer Motion transition properties
  const dynamicStiffness = mapRange(globalSettings.animationIntensity, 0, 100, 200, 500);
  const dynamicDamping = mapRange(globalSettings.animationIntensity, 0, 100, 40, 20);

  return (
    <motion.div
      ref={containerRef}
      className={`
        absolute rounded-2xl border-2
        ${isDragging ? 'border-cyan-500 shadow-lg shadow-cyan-500/50' : 'border-transparent'} 
        ${isResizing ? '!border-pink-500 shadow-lg shadow-pink-500/50' : ''}
      `}
      style={{ zIndex: currentZIndex }}
      layoutId={layoutId}
      initial={{ x: initialPosition.x, y: initialPosition.y, width: initialSize.width, height: initialSize.height }}
      animate={{ x: position.x, y: position.y, width: size.width, height: size.height }}
      transition={{ type: 'spring', stiffness: dynamicStiffness, damping: dynamicDamping }}
      onMouseDown={handleDragMouseDown} // Attach drag handler to the container itself
      onAnimationComplete={onAnimationComplete}
    >
      {childWithProps}
      <div
        className="resize-handle absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize bg-cyan-600/70 hover:bg-cyan-400 transition-colors duration-200 rounded-br-xl flex items-center justify-center text-white/80 z-20"
        onMouseDown={handleResizeMouseDown}
        title="Resize"
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM6 9a1 1 0 000 2h8a1 1 0 100-2H6z"/></svg>
      </div>
    </motion.div>
  );
};