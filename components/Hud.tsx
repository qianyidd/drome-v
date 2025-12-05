/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useRef, useLayoutEffect, useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { BatteryIcon, GpsIcon, SignalIcon, ReturnToHomeIcon, TakeoffIcon, CameraVideoIcon, CameraPhotoIcon, GearIcon, AdjustmentsIcon, LandIcon } from './Icons';
import { FlightMode } from '../types';

export const Hud: React.FC = () => {
    const { 
        cameraRef, 
        cameraVelocityRef, 
        isHudEnabled, 
        collisionState,
        setIsControlsOpen,
        isFpsEnabled,
        flightMode,
        setFlightMode
    } = useAppContext();

    // DOM Refs for high-performance updates
    const heightRef = useRef<HTMLSpanElement>(null);
    const distRef = useRef<HTMLSpanElement>(null);
    const hSpeedRef = useRef<HTMLSpanElement>(null);
    const vSpeedRef = useRef<HTMLSpanElement>(null);
    const satRef = useRef<HTMLSpanElement>(null);
    const batteryRef = useRef<HTMLSpanElement>(null);
    const voltageRef = useRef<HTMLSpanElement>(null);
    
    // Attitude Indicator Refs
    const attitudeHorizonRef = useRef<HTMLDivElement>(null);
    const attitudeRollRef = useRef<HTMLDivElement>(null);

    // UI State
    const [isRecording, setIsRecording] = useState(false);
    const [cameraMode, setCameraMode] = useState<'video'|'photo'>('video');

    useLayoutEffect(() => {
        let animationFrameId: number;
        
        const updateTelemetry = () => {
            if (!isHudEnabled) return;

            // 1. Get raw values
            const pos = cameraRef.current.position;
            const rot = cameraRef.current.rotation;
            const roll = cameraRef.current.roll;
            const vel = cameraVelocityRef.current;
            
            // 2. Calculations
            // Altitude (y) - offset by ground level approx
            const alt = Math.max(0, pos[1] + 1.49);
            
            // Distance (xz magnitude)
            const dist = Math.sqrt(pos[0]*pos[0] + pos[2]*pos[2]);
            
            // Vertical Speed (y velocity)
            const vs = vel[1];
            
            // Horizontal Speed (xz velocity)
            const hs = Math.sqrt(vel[0]*vel[0] + vel[2]*vel[2]);

            // 3. DOM Updates - Text
            if (heightRef.current) heightRef.current.textContent = `${alt.toFixed(1)} m`;
            if (distRef.current) distRef.current.textContent = `${dist.toFixed(1)} m`;
            if (hSpeedRef.current) hSpeedRef.current.textContent = `${(hs * 10).toFixed(1)} m/s`; // Scale for effect
            if (vSpeedRef.current) vSpeedRef.current.textContent = `${(vs * 10).toFixed(1)} m/s`;
            
            // Simulate changing satellite/battery count slightly
            if (Math.random() > 0.99 && satRef.current) {
                satRef.current.textContent = Math.floor(12 + Math.random() * 4).toString();
            }
            if (Math.random() > 0.999 && batteryRef.current) {
                 // Slowly drain battery
                 const current = parseInt(batteryRef.current.textContent || "84");
                 if (current > 10) batteryRef.current.textContent = `${current - 1}%`;
            }
            // Simulate Voltage fluctuation (15.2V +/- 0.1V)
            if (Math.random() > 0.9 && voltageRef.current) {
                 const baseVoltage = 15.2;
                 const fluctuation = (Math.random() - 0.5) * 0.1;
                 voltageRef.current.textContent = `${(baseVoltage + fluctuation).toFixed(1)} V`;
            }

            // 4. DOM Updates - Attitude Indicator
            if (attitudeHorizonRef.current) {
                // Pitch: rotation[0]. Positive is Down (in this engine's camera), Negative is Up.
                // We typically want the horizon to move DOWN when we pitch UP (so we see more sky).
                // Pitch range approx -1.57 to 1.57.
                // Translate pixels approx 40px per radian?
                const pitch = -rot[0]; // Invert to match standard AH logic (looking up = positive pitch = horizon drops)
                const pitchPx = pitch * 40; // Sensitivity factor
                
                // Roll: cameraRef.roll. 
                // Rotate the horizon opposite to the drone to keep it "level" with world.
                const rollRad = roll; 
                
                // We apply transform to the inner horizon container
                // Rotate first, then translate? Or container for roll, inner for pitch.
                // Let's stick to: Rotate the whole horizon disc by -roll. Translate the texture inside by pitch.
                // Actually simpler: Just transform the horizon line div.
                // Rotate needs to be around center. 
                attitudeHorizonRef.current.style.transform = `rotate(${-rollRad}rad) translateY(${pitchPx}px)`;
            }

            animationFrameId = requestAnimationFrame(updateTelemetry);
        };

        updateTelemetry();

        return () => cancelAnimationFrame(animationFrameId);
    }, [isHudEnabled, cameraRef, cameraVelocityRef]);

    if (!isHudEnabled) return null;

    const topBarStyle = "bg-black/40 backdrop-blur-sm text-white px-3 py-1 flex items-center gap-4 text-xs font-semibold rounded-br-lg pointer-events-none";
    const telemetryLabelStyle = "text-[10px] text-gray-400 uppercase tracking-wider font-bold";
    const telemetryValueStyle = "text-sm sm:text-lg font-mono font-medium text-white drop-shadow-md";

    const getModeLabel = (mode: FlightMode) => {
        switch(mode) {
            case 'C': return 'TRIPOD';
            case 'N': return 'P-GPS';
            case 'S': return 'SPORT';
            default: return 'P-GPS';
        }
    };

    const getModeColor = (mode: FlightMode) => {
        switch(mode) {
            case 'C': return 'bg-blue-600/90';
            case 'N': return 'bg-green-600/90';
            case 'S': return 'bg-red-600/90';
            default: return 'bg-green-600/90';
        }
    }

    return (
        <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-safe">
            
            {/* TOP STATUS BAR */}
            <div className="flex justify-between items-start pt-2 px-2">
                <div className={`flex items-center gap-0 rounded-md overflow-hidden shadow-lg border border-white/10 ${collisionState === 'colliding' ? 'bg-red-600/80' : 'bg-black/60'}`}>
                    
                    {/* Status / Mode Indicator */}
                    <div className={`px-3 py-2 flex items-center gap-2 ${collisionState === 'colliding' ? 'bg-red-600' : getModeColor(flightMode)}`}>
                        <span className="font-bold text-xs uppercase tracking-wide text-white">
                            {collisionState === 'colliding' ? 'COLLISION' : getModeLabel(flightMode)}
                        </span>
                    </div>

                    {/* Telemetry Bar */}
                    <div className="flex items-center gap-4 px-3 py-1 text-white/90 backdrop-blur-md">
                        {/* Mode Switcher */}
                        <div className="flex items-center gap-1 bg-black/40 rounded-full p-0.5 border border-white/10 mr-2 pointer-events-auto">
                            {(['C', 'N', 'S'] as FlightMode[]).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setFlightMode(mode)}
                                    className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center transition-all ${
                                        flightMode === mode 
                                            ? 'bg-white text-black shadow-sm' 
                                            : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-1">
                            <GpsIcon className="w-4 h-4 text-white" />
                            <span ref={satRef} className="text-xs font-mono">14</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <SignalIcon className="w-4 h-4 text-white" />
                            <span className="text-xs font-mono">HD</span>
                        </div>
                        <div className="flex items-center gap-2 pl-2 border-l border-white/20">
                            <span ref={voltageRef} className="text-xs font-mono text-gray-300">15.2 V</span>
                            <div className="flex items-center gap-1">
                                <span ref={batteryRef} className="text-xs font-mono font-bold text-green-400">84%</span>
                                <BatteryIcon className="w-4 h-4 text-green-400" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Right: Settings shortcut */}
                <button 
                    onClick={() => setIsControlsOpen(true)}
                    className="pointer-events-auto p-2 bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-colors border border-white/10"
                >
                    <AdjustmentsIcon className="w-5 h-5" />
                </button>
            </div>

            {/* MIDDLE SECTION (Left/Right Controls) */}
            <div className="flex-grow flex justify-between items-center px-2 sm:px-4 pointer-events-none">
                
                {/* Left: Flight Automation */}
                <div className="flex flex-col gap-3 pointer-events-auto">
                    <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white transition-all active:scale-95 shadow-lg">
                        <TakeoffIcon className="w-5 h-5" />
                    </button>
                    <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white transition-all active:scale-95 shadow-lg">
                        <ReturnToHomeIcon className="w-5 h-5" />
                    </button>
                    <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white transition-all active:scale-95 shadow-lg">
                        <LandIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Right: Camera Controls */}
                <div className="flex flex-col items-center gap-4 pointer-events-auto bg-black/20 p-2 rounded-l-2xl border-l border-white/10 backdrop-blur-sm">
                    {/* Mode Toggle */}
                    <div className="flex flex-col gap-2 bg-black/40 p-1 rounded-full">
                        <button 
                            onClick={() => setCameraMode('video')}
                            className={`p-2 rounded-full transition-all ${cameraMode === 'video' ? 'bg-white text-black shadow-md' : 'text-gray-400 hover:text-white'}`}
                        >
                            <CameraVideoIcon className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setCameraMode('photo')}
                            className={`p-2 rounded-full transition-all ${cameraMode === 'photo' ? 'bg-white text-black shadow-md' : 'text-gray-400 hover:text-white'}`}
                        >
                            <CameraPhotoIcon className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Shutter Button */}
                    <button 
                        onClick={() => cameraMode === 'video' && setIsRecording(!isRecording)}
                        className={`w-14 h-14 rounded-full border-2 flex items-center justify-center transition-transform active:scale-95 shadow-xl ${
                            isRecording 
                                ? 'border-red-500 bg-white/10' 
                                : 'border-white bg-white/10'
                        }`}
                    >
                        <div className={`rounded-full transition-all duration-300 ${
                            cameraMode === 'video' 
                                ? (isRecording ? 'w-6 h-6 rounded-sm bg-red-500' : 'w-10 h-10 bg-red-500')
                                : 'w-10 h-10 bg-white'
                        }`} />
                    </button>
                    
                    {/* Camera Settings */}
                    <button className="p-2 text-white/80 hover:text-white transition-colors">
                        <GearIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* BOTTOM BAR: Telemetry + Attitude Indicator */}
            <div className="relative pt-10 pb-4 px-4 sm:px-10">
                
                {/* ATTITUDE INDICATOR (Bottom Left) */}
                <div className="absolute bottom-4 left-4 sm:left-10 w-24 h-24 rounded-full border-2 border-white/30 bg-black/50 overflow-hidden shadow-xl backdrop-blur-sm">
                    {/* Inner Horizon Container - Rotates & Translates */}
                    <div 
                        ref={attitudeHorizonRef}
                        className="absolute top-1/2 left-1/2 w-48 h-48 -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 ease-linear will-change-transform"
                    >
                        {/* Sky */}
                        <div className="w-full h-1/2 bg-sky-500/80 border-b border-white/50"></div>
                        {/* Ground */}
                        <div className="w-full h-1/2 bg-amber-700/80"></div>
                        {/* Horizon Lines */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-px bg-white/50"></div>
                    </div>
                    
                    {/* Fixed Aircraft Marker (Yellow/Green) */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full flex items-center justify-center pointer-events-none">
                         {/* Simple Crosshair / Drone Shape */}
                         <div className="relative w-12 h-1">
                            <div className="absolute top-0 left-0 w-4 h-0.5 bg-yellow-400 shadow-sm"></div>
                            <div className="absolute top-0 right-0 w-4 h-0.5 bg-yellow-400 shadow-sm"></div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-yellow-400 rounded-full"></div>
                         </div>
                    </div>

                    {/* Glass Glare Overlay */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none"></div>
                </div>


                {/* TELEMETRY DATA (Centered / Right) */}
                <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end justify-center gap-8 sm:gap-16 text-shadow-sm pb-2 pl-32 sm:pl-0">
                    {/* Distance Group */}
                    <div className="flex gap-4 sm:gap-8">
                        <div className="flex flex-col items-start">
                            <span className={telemetryLabelStyle}>D</span>
                            <span ref={distRef} className={telemetryValueStyle}>0.0 m</span>
                        </div>
                        <div className="flex flex-col items-start">
                            <span className={telemetryLabelStyle}>H</span>
                            <span ref={heightRef} className={telemetryValueStyle}>1.5 m</span>
                        </div>
                    </div>
                    
                    {/* Speed Group */}
                    <div className="flex gap-4 sm:gap-8">
                         <div className="flex flex-col items-start">
                            <span className={telemetryLabelStyle}>H.S</span>
                            <span ref={hSpeedRef} className={telemetryValueStyle}>0.0 m/s</span>
                        </div>
                        <div className="flex flex-col items-start">
                            <span className={telemetryLabelStyle}>V.S</span>
                            <span ref={vSpeedRef} className={telemetryValueStyle}>0.0 m/s</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* FPS Counter */}
            {/* Handled in ShaderCanvas */}
        </div>
    );
};