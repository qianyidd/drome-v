/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

// Virtual Stick Component that writes directly to ref for smooth analog control
const VirtualStick: React.FC<{
  side: 'left' | 'right';
  analogRef: React.MutableRefObject<{ left: { x: number, y: number }, right: { x: number, y: number } }>;
  label: string;
}> = ({ side, analogRef, label }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [stickPosition, setStickPosition] = useState({ x: 0, y: 0 });
    const [active, setActive] = useState(false);

    // Update the shared ref directly
    const updateAnalog = (x: number, y: number) => {
        if (side === 'left') {
            analogRef.current.left = { x, y: -y }; // Invert Y for standard math vs screen coords
        } else {
            analogRef.current.right = { x, y: -y };
        }
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        e.preventDefault();
        (e.target as Element).setPointerCapture(e.pointerId);
        setActive(true);
        handleMove(e);
    };

    const handleMove = (e: React.PointerEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const maxDist = rect.width / 2;
        
        let dx = e.clientX - centerX;
        let dy = e.clientY - centerY;
        
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        // Clamp to circle
        if (dist > maxDist) {
            dx = (dx / dist) * maxDist;
            dy = (dy / dist) * maxDist;
        }

        setStickPosition({ x: dx, y: dy });
        // Normalize to -1...1
        updateAnalog(dx / maxDist, dy / maxDist);
    };

    const handleEnd = (e: React.PointerEvent) => {
        setActive(false);
        setStickPosition({ x: 0, y: 0 });
        updateAnalog(0, 0);
    };

    return (
        <div 
            ref={containerRef}
            className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm relative touch-none pointer-events-auto cursor-crosshair"
            onPointerDown={handlePointerDown}
            onPointerMove={(e) => active && handleMove(e)}
            onPointerUp={handleEnd}
            onPointerCancel={handleEnd}
        >
            {/* Center Indicator */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white/30 rounded-full" />
            
            {/* The Stick Thumb */}
            <div 
                className={`absolute w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.5)] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 ease-out flex items-center justify-center pointer-events-none ${active ? 'bg-white/90 scale-110' : 'bg-white/60'}`}
                style={{ transform: `translate(calc(-50% + ${stickPosition.x}px), calc(-50% + ${stickPosition.y}px))` }}
            >
                {/* Grip texture */}
                <div className="w-6 h-6 rounded-full border border-gray-400/50" />
            </div>
            
            {/* Label */}
            <div className="absolute -top-6 left-0 right-0 text-center text-[10px] text-white/40 font-mono uppercase tracking-widest pointer-events-none">
                {label}
            </div>
        </div>
    );
};


export const DpadControls: React.FC = () => {
  const { cameraControlsEnabled, analogInputRef } = useAppContext();

  if (!cameraControlsEnabled) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-0 right-0 px-8 pb-4 flex justify-between items-end pointer-events-none z-30 select-none">
      {/* Left Stick (Mode 2: Throttle/Yaw) */}
      <div className="pointer-events-auto">
         <VirtualStick 
            side="left"
            analogRef={analogInputRef}
            label="H • Yaw"
         />
      </div>
      
      {/* Right Stick (Mode 2: Pitch/Roll) */}
      <div className="pointer-events-auto">
        <VirtualStick 
            side="right"
            analogRef={analogInputRef}
            label="Pitch • Roll"
         />
      </div>
    </div>
  );
};