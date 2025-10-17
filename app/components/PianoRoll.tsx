'use client';

import { useEffect, useRef, useState } from 'react';

interface PitchData {
  time: number;
  frequency: number;
  note: string;
  midi: number;
}

interface PianoRollProps {
  pitchData: PitchData[];
}

export default function PianoRoll({ pitchData }: PianoRollProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    note: string;
    frequency: number;
    time: number;
    visible: boolean;
  }>({
    x: 0,
    y: 0,
    note: '',
    frequency: 0,
    time: 0,
    visible: false
  });

  // Zoom state
  const [zoomRange, setZoomRange] = useState<{
    minMidi: number | null;
    maxMidi: number | null;
  }>({
    minMidi: null,
    maxMidi: null
  });

  // Drag selection state
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!pitchData.length) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    const width = rect.width;
    const height = rect.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Calculate ranges
    const maxTime = Math.max(...pitchData.map(d => d.time));
    const dataMinMidi = Math.min(...pitchData.map(d => d.midi));
    const dataMaxMidi = Math.max(...pitchData.map(d => d.midi));
    
    // Use zoom range if set, otherwise use data range
    const minMidi = zoomRange.minMidi ?? dataMinMidi;
    const maxMidi = zoomRange.maxMidi ?? dataMaxMidi;
    const midiRange = Math.max(maxMidi - minMidi, 24); // At least 2 octaves
    
    // Piano keys setup
    const keyHeight = height / midiRange;
    const timeScale = width / maxTime;
    
    // Draw piano keys background
    for (let i = 0; i < midiRange; i++) {
      const midi = maxMidi - i;
      const y = i * keyHeight;
      const isBlackKey = [1, 3, 6, 8, 10].includes(midi % 12);
      
      ctx.fillStyle = isBlackKey ? '#f0f0f0' : '#ffffff';
      ctx.fillRect(0, y, width, keyHeight);
      
      // Draw key separator
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Draw pitch data points
    pitchData.forEach((data, index) => {
      const x = data.time * timeScale;
      const y = (maxMidi - data.midi) * keyHeight + keyHeight / 2;
      
      // Color based on frequency intensity
      const hue = (data.frequency - 100) / 800 * 240; // Blue to red spectrum
      ctx.fillStyle = `hsl(${Math.max(0, Math.min(240, hue))}, 70%, 50%)`;
      
      // Draw point
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
      
      // Connect to next point if close in time
      if (index < pitchData.length - 1) {
        const nextData = pitchData[index + 1];
        if (nextData.time - data.time < 0.2) { // Connect if less than 200ms apart
          const nextX = nextData.time * timeScale;
          const nextY = (maxMidi - nextData.midi) * keyHeight + keyHeight / 2;
          
          ctx.strokeStyle = ctx.fillStyle;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(nextX, nextY);
          ctx.stroke();
        }
      }
    });
    
    // Draw time grid
    ctx.strokeStyle = '#d0d0d0';
    ctx.lineWidth = 1;
    for (let t = 0; t <= maxTime; t += 5) {
      const x = t * timeScale;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      
      // Time labels
      ctx.fillStyle = '#666';
      ctx.font = '12px sans-serif';
      ctx.fillText(`${t}s`, x + 2, height - 5);
    }
    
    // Draw note labels
    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    for (let i = 0; i < midiRange; i += 12) {
      const midi = maxMidi - i;
      const y = i * keyHeight + keyHeight / 2;
      const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const octave = Math.floor(midi / 12) - 1;
      const noteName = noteNames[midi % 12] + octave;
      ctx.fillText(noteName, 5, y + 3);
    }

    // Draw drag selection rectangle
    if (isDragging && dragStart && dragCurrent) {
      const startX = Math.min(dragStart.x, dragCurrent.x);
      const startY = Math.min(dragStart.y, dragCurrent.y);
      const selWidth = Math.abs(dragCurrent.x - dragStart.x);
      const selHeight = Math.abs(dragCurrent.y - dragStart.y);
      
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(startX, startY, selWidth, selHeight);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fillRect(startX, startY, selWidth, selHeight);
      ctx.setLineDash([]);
    }
    
  }, [pitchData, zoomRange, isDragging, dragStart, dragCurrent]);

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !pitchData.length) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Find nearest pitch data point
    const maxTime = Math.max(...pitchData.map(d => d.time));
    const minMidi = Math.min(...pitchData.map(d => d.midi));
    const maxMidi = Math.max(...pitchData.map(d => d.midi));
    const midiRange = Math.max(maxMidi - minMidi, 24);
    
    const timeScale = rect.width / maxTime;
    const keyHeight = rect.height / midiRange;
    
    let nearestData: PitchData | null = null;
    let minDistance = Infinity;
    
    pitchData.forEach(data => {
      const dataX = data.time * timeScale;
      const dataY = (maxMidi - data.midi) * keyHeight + keyHeight / 2;
      const distance = Math.sqrt((x - dataX) ** 2 + (y - dataY) ** 2);
      
      if (distance < minDistance && distance < 20) { // Within 20px
        minDistance = distance;
        nearestData = data;
      }
    });
    
    if (nearestData) {
      // Calculate tooltip position with bounds checking
      const tooltipWidth = 120; // Approximate tooltip width
      const tooltipHeight = 60; // Approximate tooltip height
      const containerRect = canvas.getBoundingClientRect();
      
      let tooltipX = x + 10;
      let tooltipY = y - 40;
      
      // Ensure tooltip doesn't go outside container bounds
      if (tooltipX + tooltipWidth > containerRect.width) {
        tooltipX = x - tooltipWidth - 10; // Position to the left of cursor
      }
      if (tooltipY < 0) {
        tooltipY = y + 10; // Position below cursor
      }
      if (tooltipY + tooltipHeight > containerRect.height) {
        tooltipY = y - tooltipHeight - 10; // Position above cursor
      }
      
      setTooltip({
        x: tooltipX,
        y: tooltipY,
        note: (nearestData as PitchData).note,
        frequency: (nearestData as PitchData).frequency,
        time: (nearestData as PitchData).time,
        visible: true
      });
    } else {
      setTooltip(prev => ({ ...prev, visible: false }));
    }
  };

  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !pitchData.length) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    setDragStart({ x, y });
    setDragCurrent({ x, y });
    setIsDragging(true);
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  const handleMouseMoveWhileDragging = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStart) {
      handleMouseMove(event);
      return;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    setDragCurrent({ x, y });
  };

  const handleMouseUp = () => {
    if (!isDragging || !dragStart || !dragCurrent || !pitchData.length) {
      setIsDragging(false);
      setDragStart(null);
      setDragCurrent(null);
      return;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    
    // Calculate selected area
    const minX = Math.min(dragStart.x, dragCurrent.x);
    const maxX = Math.max(dragStart.x, dragCurrent.x);
    const minY = Math.min(dragStart.y, dragCurrent.y);
    const maxY = Math.max(dragStart.y, dragCurrent.y);
    
    // Minimum selection size (avoid accidental clicks)
    if (Math.abs(maxX - minX) < 20 || Math.abs(maxY - minY) < 20) {
      setIsDragging(false);
      setDragStart(null);
      setDragCurrent(null);
      return;
    }
    
    // Calculate MIDI range from selection
    const dataMinMidi = Math.min(...pitchData.map(d => d.midi));
    const dataMaxMidi = Math.max(...pitchData.map(d => d.midi));
    const currentMinMidi = zoomRange.minMidi ?? dataMinMidi;
    const currentMaxMidi = zoomRange.maxMidi ?? dataMaxMidi;
    const currentMidiRange = Math.max(currentMaxMidi - currentMinMidi, 24);
    
    const keyHeight = rect.height / currentMidiRange;
    
    // Convert Y coordinates to MIDI values (inverted because Y increases downward)
    const selectedMaxMidi = Math.round(currentMaxMidi - minY / keyHeight);
    const selectedMinMidi = Math.round(currentMaxMidi - maxY / keyHeight);
    
    // Ensure valid range
    if (selectedMinMidi < selectedMaxMidi) {
      setZoomRange({
        minMidi: Math.max(selectedMinMidi, dataMinMidi),
        maxMidi: Math.min(selectedMaxMidi, dataMaxMidi)
      });
    }
    
    setIsDragging(false);
    setDragStart(null);
    setDragCurrent(null);
  };

  const resetZoom = () => {
    setZoomRange({ minMidi: null, maxMidi: null });
  };

  if (!pitchData.length) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        音階データがありません
      </div>
    );
  }

  const isZoomed = zoomRange.minMidi !== null || zoomRange.maxMidi !== null;

  return (
    <div className="relative">
      <div className="mb-2 flex justify-between items-center">
        <div className="text-sm text-gray-600 dark:text-gray-300">
          {isZoomed ? '🔍 拡大表示中' : ''}
        </div>
        {isZoomed && (
          <button
            onClick={resetZoom}
            className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded transition-colors"
          >
            🔄 ズームリセット
          </button>
        )}
      </div>
      
      <canvas
        ref={canvasRef}
        className="w-full h-64 border border-gray-300 dark:border-gray-600 rounded-lg cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMoveWhileDragging}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
      
      {tooltip.visible && !isDragging && (
        <div
          className="absolute z-10 bg-black text-white p-2 rounded text-sm pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y
          }}
        >
          <div className="font-semibold">{tooltip.note}</div>
          <div>{tooltip.frequency.toFixed(1)} Hz</div>
          <div>{tooltip.time.toFixed(2)}s</div>
        </div>
      )}
      
      <div className="mt-4 text-sm text-gray-600 dark:text-gray-300 space-y-1">
        <p>💡 ポイントにカーソルを合わせると詳細情報が表示されます</p>
        <p>• 横軸: 時間、縦軸: 音階（ピアノロール表示）</p>
        <p>• 色: 周波数の高低を表現</p>
        <p>• ドラッグして特定の範囲を拡大表示できます</p>
      </div>
    </div>
  );
}