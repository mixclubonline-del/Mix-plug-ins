
import React, { useState, useMemo } from 'react';
import { PluginContainer } from '../shared/PluginContainer';
import { PrimeRouterSettings, PluginComponentProps } from '../../types';

const RouterGrid: React.FC = () => {
    const gridSize = 8;
    const nodes = useMemo(() => Array.from({ length: gridSize * gridSize }).map((_, i) => ({
        id: i,
        x: (i % gridSize) / (gridSize - 1),
        y: Math.floor(i / gridSize) / (gridSize - 1),
    })), []);

    const [connections, setConnections] = useState([{start: 5, end: 18}, {start: 22, end: 45}]);
    const [tempConnection, setTempConnection] = useState<{start: number, end: {x:number, y:number}} | null>(null);

    const handleNodeMouseDown = (e: React.MouseEvent, nodeId: number) => {
        const gridEl = e.currentTarget.closest('.router-grid-container');
        if (!gridEl) return;
        
        const rect = gridEl.getBoundingClientRect();

        const handleMouseMove = (moveEvent: MouseEvent) => {
            setTempConnection({
                start: nodeId,
                end: { 
                    x: (moveEvent.clientX - rect.left) / rect.width * 100, 
                    y: (moveEvent.clientY - rect.top) / rect.height * 100 
                }
            });
        };

        const handleMouseUp = (upEvent: MouseEvent) => {
            const endNode = document.elementFromPoint(upEvent.clientX, upEvent.clientY)?.closest('[data-node-id]');
            if (endNode) {
                const endNodeId = parseInt(endNode.getAttribute('data-node-id') || '-1');
                if(endNodeId !== -1 && endNodeId !== nodeId) {
                    setConnections(c => [...c, {start: nodeId, end: endNodeId}]);
                }
            }
            setTempConnection(null);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
        
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    return (
        <div 
            className="router-grid-container w-full h-full relative p-4 bg-black/20 border border-white/10 rounded-lg"
            style={{
                backgroundImage: 'linear-gradient(rgba(0,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.05) 1px, transparent 1px)',
                backgroundSize: 'calc(100% / 7) calc(100% / 7)',
            }}
        >
            <svg className="w-full h-full absolute top-0 left-0 overflow-visible pointer-events-none z-0">
                {connections.map((c, i) => {
                    const startNode = nodes[c.start];
                    const endNode = nodes[c.end];
                    return (
                        <path key={i} d={`M ${startNode.x * 100}% ${startNode.y * 100}% C ${startNode.x * 100}% ${endNode.y * 100}%, ${endNode.x * 100}% ${startNode.y * 100}%, ${endNode.x * 100}% ${endNode.y * 100}%`}
                              stroke="var(--glow-cyan)" strokeWidth="2" fill="none"
                              className="routing-cable"
                              style={{filter: `drop-shadow(0 0 5px var(--glow-cyan))`}}
                        />
                    );
                })}
                 {tempConnection && (
                    <path d={`M ${nodes[tempConnection.start].x * 100}% ${nodes[tempConnection.start].y * 100}% C ${nodes[tempConnection.start].x * 100}% ${tempConnection.end.y}%, ${tempConnection.end.x}% ${nodes[tempConnection.start].y * 100}%, ${tempConnection.end.x}% ${tempConnection.end.y}%`}
                          stroke="var(--glow-pink)" strokeWidth="2" fill="none"
                          style={{filter: `drop-shadow(0 0 5px var(--glow-pink))`}}
                    />
                 )}
            </svg>
            {nodes.map(node => (
                <div 
                    key={node.id}
                    data-node-id={node.id}
                    className="absolute w-4 h-4 -m-2 rounded-full cursor-pointer bg-white/20 hover:bg-white/80 hover:shadow-[0_0_10px_white] transition-all"
                    style={{
                        left: `${node.x * 100}%`, top: `${node.y * 100}%`,
                    }}
                    onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                />
            ))}
        </div>
    );
};

export const PrimeRouter: React.FC<PluginComponentProps<PrimeRouterSettings>> = ({ 
    isDragging, isResizing, name, description, onClose
}) => {
    return (
        <PluginContainer title={name} subtitle={description} isDragging={isDragging} isResizing={isResizing} onClose={onClose}>
            <div className="w-full h-full flex flex-col items-center justify-center p-4">
                <div className="w-full aspect-square max-w-sm">
                    <RouterGrid />
                </div>
                <p className="mt-4 text-white/50 text-sm">Click and drag between nodes to create connections.</p>
            </div>
        </PluginContainer>
    );
};
