
import React, { useState, useRef, useLayoutEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { PLUGIN_TIERS, TierName, PluginKey, findPlugin } from '../constants';
import { SidechainLink } from '../types';
import { XIcon } from './shared/Icons';

interface PortPosition {
  pluginKey: PluginKey;
  type: 'in' | 'out';
  x: number;
  y: number;
}

interface RoutingViewProps {
  sidechainLinks: SidechainLink[];
  onAddLink: (link: SidechainLink) => void;
  onRemoveLink: (link: SidechainLink) => void;
  onClose: () => void;
}

const tierColorMap: Record<TierName, string> = {
  'Core Tier': 'border-cyan-400',
  'Neural Tier': 'border-pink-400',
  'Master Tier': 'border-amber-400',
  'Signature / Experimental Tier': 'border-rose-400',
  'System Tier': 'border-violet-400',
};

const portColorMap: Record<TierName, string> = {
    'Core Tier': 'var(--glow-cyan)',
    'Neural Tier': 'var(--glow-pink)',
    'Master Tier': '#f59e0b',
    'Signature / Experimental Tier': '#f43f5e',
    'System Tier': '#8b5cf6',
};

export const RoutingView: React.FC<RoutingViewProps> = ({ sidechainLinks, onAddLink, onRemoveLink, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [portPositions, setPortPositions] = useState<PortPosition[]>([]);
  const [draggingFrom, setDraggingFrom] = useState<PluginKey | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useLayoutEffect(() => {
    const calculatePositions = () => {
      if (!containerRef.current) return;
      const positions: PortPosition[] = [];
      const portElements = containerRef.current.querySelectorAll('[data-port-plugin-key]');
      portElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const containerRect = containerRef.current!.getBoundingClientRect();
        positions.push({
          pluginKey: el.getAttribute('data-port-plugin-key') as PluginKey,
          type: el.getAttribute('data-port-type') as 'in' | 'out',
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top + rect.height / 2,
        });
      });
      setPortPositions(positions);
    };
    calculatePositions();
    window.addEventListener('resize', calculatePositions);
    return () => window.removeEventListener('resize', calculatePositions);
  }, [sidechainLinks]); // Recalculate if links change to ensure all ports are correctly positioned

  const getPortPos = (pluginKey: PluginKey, type: 'in' | 'out') => {
    return portPositions.find(p => p.pluginKey === pluginKey && p.type === type);
  };
  
  const handleMouseDown = (e: React.MouseEvent, pluginKey: PluginKey) => {
    e.stopPropagation();
    setDraggingFrom(pluginKey);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingFrom || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  
  const handleMouseUp = (e: React.MouseEvent, pluginKey: PluginKey) => {
    e.stopPropagation();
    if (draggingFrom && draggingFrom !== pluginKey) {
        const pluginDef = findPlugin(pluginKey);
        if(pluginDef.canBeSidechainTarget) {
            onAddLink({ from: draggingFrom, to: pluginKey });
        }
    }
    setDraggingFrom(null);
  };

  const startPortPos = draggingFrom ? getPortPos(draggingFrom, 'out') : null;

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-black/80 backdrop-blur-md relative overflow-auto custom-scrollbar"
      onMouseMove={handleMouseMove}
      onMouseUp={() => setDraggingFrom(null)}
    >
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 text-white/50 hover:text-pink-300 z-20 hover:scale-110 transition-all group group-hover:drop-shadow-[0_0_3px_var(--glow-pink)]"
            title="Close Routing View"
        >
            <XIcon className="w-6 h-6" />
        </button>
        <h2 className="font-orbitron text-3xl text-center p-8 text-cyan-300">Signal Matrix</h2>
      <div className="flex justify-center gap-8 px-16 py-8 min-w-max">
        {Object.entries(PLUGIN_TIERS).map(([tierName, plugins]) => (
          <div key={tierName} className="flex flex-col items-center gap-4">
            <h3 className={`font-orbitron tracking-wider ${tierColorMap[tierName as TierName].replace('border-', 'text-')}`}>{tierName}</h3>
            {Object.keys(plugins).map(pluginKey => {
              const plugin = plugins[pluginKey as PluginKey];
              const tier = plugin.tier as TierName;
              const portGlowColor = portColorMap[tier];
              
              return (
                <div key={pluginKey} className={`relative bg-black/50 border ${tierColorMap[tierName as TierName]} rounded-lg w-48 p-4 text-center group
                                                hover:scale-105 hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all duration-200`}>
                  <span className="text-white/80 font-bold">{plugin.name}</span>
                  {/* Output Port */}
                  <div 
                    className="absolute top-1/2 -right-2 w-4 h-4 rounded-full bg-cyan-400 cursor-pointer transition-all duration-200 hover:scale-125" 
                    data-port-plugin-key={pluginKey}
                    data-port-type="out"
                    onMouseDown={(e) => handleMouseDown(e, pluginKey as PluginKey)}
                    style={{
                        '--port-glow-color': portGlowColor,
                        animation: `port-glow-pulse 2s infinite ease-in-out`,
                    } as React.CSSProperties}
                  />
                  {/* Input Port (if sidechain target) */}
                  {plugin.canBeSidechainTarget && (
                    <div 
                      className="absolute top-1/2 -left-2 w-4 h-4 rounded-full bg-pink-400 cursor-pointer transition-all duration-200 hover:scale-125"
                      data-port-plugin-key={pluginKey}
                      data-port-type="in"
                      onMouseUp={(e) => handleMouseUp(e, pluginKey as PluginKey)}
                      style={{
                        '--port-glow-color': portColorMap['Neural Tier'], // Use pink for sidechain targets
                        animation: `port-glow-pulse 2s infinite ease-in-out`,
                      } as React.CSSProperties}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
          <defs>
              <linearGradient id="cable-grad-cyan">
                  <stop offset="0%" stopColor="var(--glow-cyan)" />
                  <stop offset="100%" stopColor="var(--glow-pink)" />
              </linearGradient>
          </defs>
          {/* Existing links */}
          {sidechainLinks.map(link => {
              const start = getPortPos(link.from, 'out');
              const end = getPortPos(link.to, 'in');
              if(!start || !end) return null;
              
              const path = `M ${start.x} ${start.y} C ${start.x + 100} ${start.y}, ${end.x - 100} ${end.y}, ${end.x} ${end.y}`;
              
              const t = 0.5;
              const midX = Math.pow(1 - t, 3) * start.x + 3 * Math.pow(1 - t, 2) * t * (start.x + 100) + 3 * (1 - t) * t * t * (end.x - 100) + t * t * t * end.x;
              const midY = Math.pow(1 - t, 3) * start.y + 3 * Math.pow(1 - t, 2) * t * start.y + 3 * (1 - t) * t * t * end.y + t * t * t * end.y;

              return (
                  <g
                      key={`${link.from}-${link.to}`}
                      className="group cursor-pointer pointer-events-all"
                      onClick={() => onRemoveLink(link)}
                  >
                      <path d={path} stroke="transparent" strokeWidth="20" fill="none" />
                      <path
                          d={path}
                          stroke="var(--glow-cyan)"
                          strokeWidth="2"
                          fill="none"
                          className="routing-cable group-hover:stroke-pink-400 group-hover:stroke-[4px] transition-stroke transition-all duration-100"
                          style={{ filter: `drop-shadow(0 0 5px var(--glow-cyan))` }}
                      />
                       <text
                          x={midX}
                          y={midY}
                          dy="0.35em"
                          textAnchor="middle"
                          fill="var(--glow-pink)"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-2xl font-bold pointer-events-none"
                          style={{ filter: `drop-shadow(0 0 5px var(--glow-pink))` }}
                      >
                          &times;
                      </text>
                  </g>
              );
          })}
          {/* Temporary dragging link */}
          {draggingFrom && startPortPos && 
            <path 
                d={`M ${startPortPos.x} ${startPortPos.y} C ${startPortPos.x + 100} ${startPortPos.y}, ${mousePos.x - 100} ${mousePos.y}, ${mousePos.x} ${mousePos.y}`}
                stroke={'var(--glow-pink)'}
                strokeWidth="4"
                fill="none"
                style={{ filter: `drop-shadow(0 0 8px var(--glow-pink))` }}
            />
          }
      </svg>
    </div>
  );
};
