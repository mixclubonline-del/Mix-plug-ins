
import React from 'react';
import { HALO_SCHEMATIC_RINGS, findPlugin, PluginKey, PLUGIN_TIERS } from '../constants'; 
import { SessionContext, PluginStates, SpecificPluginSettingsMap } from '../types';
import { motion } from 'framer-motion';

interface HaloSchematicProps {
  setActivePlugin: (plugin: PluginKey) => void;
  sessionContext: SessionContext;
  pluginStates: PluginStates;
}

const colorMap: { [key: string]: string } = {
  // A simplified mapping for node colors in the schematic
  'core': 'hsl(210, 80%, 75%)', // Pale silver-blue
  'neural': 'hsl(300, 100%, 60%)', // Magenta
  'master': 'hsl(50, 100%, 85%)', // White-gold
  'signature': 'hsl(310, 100%, 55%)', // Hot magenta
  'system': 'hsl(170, 95%, 50%)', // Electric teal
};

export const HaloSchematic: React.FC<HaloSchematicProps> = ({ setActivePlugin, sessionContext, pluginStates }) => {
  const containerSize = Math.min(window.innerWidth, window.innerHeight) * 0.9;
  const coreSize = containerSize * 0.1;

  const nodePositions = React.useMemo(() => {
    const positions: { [key: string]: { x: number, y: number } } = {};
    HALO_SCHEMATIC_RINGS.forEach(ring => {
      const radius = (containerSize / 2) * (ring.radiusPercentage / 100);
      const pluginCount = ring.plugins.length;
      ring.plugins.forEach((pluginKey, pluginIndex) => {
        const angle = (pluginIndex / pluginCount) * 2 * Math.PI - Math.PI / 2;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        positions[pluginKey] = { x, y };
      });
    });
    return positions;
  }, [containerSize]);
  
  const auraPos = nodePositions['MixxAura'];
  const tunePos = nodePositions['MixxTune'];

  return (
    <div className="w-full h-full flex items-center justify-center relative">
      <div 
        className="relative rounded-full"
        style={{ width: containerSize, height: containerSize }}
      >
        {/* Prime Core */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center"
          style={{ 
            width: coreSize, 
            height: coreSize,
            background: 'radial-gradient(circle, hsl(250, 90%, 70%) 0%, hsl(220, 90%, 50%) 70%, transparent 100%)', // Violet to Blue
            boxShadow: `0 0 ${coreSize * 0.5}px ${coreSize * 0.1}px hsl(250, 90%, 70%), inset 0 0 ${coreSize * 0.25}px ${coreSize * 0.05}px hsl(220, 100%, 80%)`, // Main glow violet, inner highlight blue
            animation: 'pulse-node-dynamic 3s infinite ease-in-out'
          }}
        >
          <span className="font-orbitron text-xs font-bold text-white/80">PRIME</span>
        </div>

        {/* Dynamic Contextual Connection: Tune <-> Aura */}
        {sessionContext.mood !== 'Neutral' && auraPos && tunePos && (
          <svg className="absolute top-1/2 left-1/2 overflow-visible" style={{transform: 'translate(-50%, -50%)', width: containerSize, height: containerSize}}>
            <defs>
                <linearGradient id="neural-thread-gradient">
                    <stop offset="0%" stopColor="#f472b6" />
                    <stop offset="100%" stopColor="#00ffff" />
                </linearGradient>
            </defs>
            <path
              d={`M ${auraPos.x + containerSize / 2} ${auraPos.y + containerSize / 2} 
                  Q ${containerSize / 2} ${containerSize / 2}, 
                  ${tunePos.x + containerSize / 2} ${tunePos.y + containerSize / 2}`}
              stroke="url(#neural-thread-gradient)"
              strokeWidth="2"
              fill="none"
              strokeDasharray="5 10"
              style={{
                filter: 'drop-shadow(0 0 5px #f472b6)',
                animation: 'dash 1s linear infinite'
              }}
            />
          </svg>
        )}
        
        {/* Rings and Nodes */}
        {HALO_SCHEMATIC_RINGS.map((ring, ringIndex) => {
          const radius = (containerSize / 2) * (ring.radiusPercentage / 100);
          
          return (
            <div
              key={ring.name}
              className="absolute top-1/2 left-1/2"
              style={{
                width: radius * 2,
                height: radius * 2,
                transform: `translate(-50%, -50%) rotate(${ringIndex * 10}deg)`,
                animation: `spin ${ring.animationDuration} linear infinite`
              }}
            >
              <style>{`@keyframes spin { from { transform: translate(-50%, -50%) rotate(${ringIndex * 10}deg); } to { transform: translate(-50%, -50%) rotate(${360 + ringIndex * 10}deg); } }`}</style>
              {ring.plugins.map((pluginKey, pluginIndex) => {
                const plugin = findPlugin(pluginKey);
                if (!plugin) return null;

                const pos = nodePositions[pluginKey];
                if (!pos) return null;

                const color = colorMap[plugin.tier] || 'hsl(0, 0%, 50%)';
                
                let dynamicScale = 1;
                let animationDuration = '2s';
                let dynamicBrightness = 1;

                const currentPluginState = pluginStates[pluginKey];
                if(currentPluginState && 'mix' in currentPluginState && typeof currentPluginState.mix === 'number') {
                    const mix = currentPluginState.mix / 100;
                    dynamicScale = 1 + mix * 0.2;
                    dynamicBrightness = 1 + mix * 0.5;
                    animationDuration = `${3 - mix * 2}s`;
                }

                const nodeSize = Math.max(8, containerSize * 0.025);
                const scaledNodeSize = nodeSize * dynamicScale;
                
                return (
                  <motion.div key={pluginKey} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 group" 
                    style={{ 
                        transform: `translate(${pos.x}px, ${pos.y}px) rotate(-${ringIndex * 10}deg)`,
                    }}
                    whileHover={{ scale: 1.25 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    <div
                      className="w-full h-full rounded-full cursor-pointer relative transition-all duration-300 ease-out hover:shadow-cyan-400/50"
                      style={{ 
                          width: scaledNodeSize,
                          height: scaledNodeSize,
                          backgroundColor: color,
                          boxShadow: `0 0 ${scaledNodeSize * 0.75}px ${scaledNodeSize * 0.25}px ${color}`,
                          animation: `pulse-node-dynamic ${animationDuration} infinite ease-in-out`,
                          animationDelay: `${(pluginIndex / ring.plugins.length) * 0.5}s`,
                          '--node-scale': 1,
                          '--node-opacity': 0.8,
                          '--node-brightness': dynamicBrightness,
                          filter: `brightness(${dynamicBrightness})`
                      } as React.CSSProperties}
                      onClick={() => setActivePlugin(pluginKey)}
                    ></div>
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max max-w-xs p-2 bg-black/80 backdrop-blur-sm border border-white/10 rounded-md text-xs text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        <span className="font-bold block font-orbitron tracking-wider text-cyan-300">{plugin.name}</span>
                        <span className="text-white/80">{plugin.description}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
