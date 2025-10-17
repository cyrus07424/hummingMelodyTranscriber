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

  // Time range state for zoom (in seconds)
  const [timeRange, setTimeRange] = useState<{
    start: number;
    end: number;
  }>({ start: 0, end: 0 });

  // Initialize time range when pitchData changes
  useEffect(() => {
    if (pitchData.length > 0) {
      const maxTime = Math.max(...pitchData.map(d => d.time));
      setTimeRange({ start: 0, end: maxTime });
    }
  }, [pitchData]);

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
    
    // Filter pitch data by time range
    const filteredData = pitchData.filter(d => d.time >= timeRange.start && d.time <= timeRange.end);
    
    if (filteredData.length === 0) {
      // Draw empty state
      ctx.fillStyle = '#666';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('選択範囲にデータがありません', width / 2, height / 2);
      return;
    }
    
    // Calculate ranges - vertical (MIDI) auto-adjusts to data in the visible time range
    const dataMinMidi = Math.min(...filteredData.map(d => d.midi));
    const dataMaxMidi = Math.max(...filteredData.map(d => d.midi));
    const midiRange = Math.max(dataMaxMidi - dataMinMidi, 12); // At least 1 octave
    
    // Piano keys setup
    const keyHeight = height / midiRange;
    const timeScale = width / (timeRange.end - timeRange.start);
    
    // Draw piano keys background
    for (let i = 0; i < midiRange; i++) {
      const midi = dataMaxMidi - i;
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
    
    // Draw pitch data points (only filtered data)
    filteredData.forEach((data, index) => {
      const x = (data.time - timeRange.start) * timeScale;
      const y = (dataMaxMidi - data.midi) * keyHeight + keyHeight / 2;
      
      // Color based on frequency intensity
      const hue = (data.frequency - 100) / 800 * 240; // Blue to red spectrum
      ctx.fillStyle = `hsl(${Math.max(0, Math.min(240, hue))}, 70%, 50%)`;
      
      // Draw point
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
      
      // Connect to next point if close in time
      if (index < filteredData.length - 1) {
        const nextData = filteredData[index + 1];
        if (nextData.time - data.time < 0.2) { // Connect if less than 200ms apart
          const nextX = (nextData.time - timeRange.start) * timeScale;
          const nextY = (dataMaxMidi - nextData.midi) * keyHeight + keyHeight / 2;
          
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
    const timeSpan = timeRange.end - timeRange.start;
    const gridInterval = timeSpan > 30 ? 10 : timeSpan > 10 ? 5 : 1; // Adaptive grid
    
    for (let t = Math.ceil(timeRange.start / gridInterval) * gridInterval; t <= timeRange.end; t += gridInterval) {
      const x = (t - timeRange.start) * timeScale;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      
      // Time labels
      ctx.fillStyle = '#666';
      ctx.font = '12px sans-serif';
      ctx.fillText(`${t.toFixed(1)}s`, x + 2, height - 5);
    }
    
    // Draw note labels
    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    for (let i = 0; i < midiRange; i += 12) {
      const midi = dataMaxMidi - i;
      const y = i * keyHeight + keyHeight / 2;
      const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const octave = Math.floor(midi / 12) - 1;
      const noteName = noteNames[midi % 12] + octave;
      ctx.fillText(noteName, 5, y + 3);
    }
    
  }, [pitchData, timeRange]);

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !pitchData.length) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Filter pitch data by time range
    const filteredData = pitchData.filter(d => d.time >= timeRange.start && d.time <= timeRange.end);
    if (filteredData.length === 0) return;
    
    // Find nearest pitch data point
    const dataMinMidi = Math.min(...filteredData.map(d => d.midi));
    const dataMaxMidi = Math.max(...filteredData.map(d => d.midi));
    const midiRange = Math.max(dataMaxMidi - dataMinMidi, 12);
    
    const timeScale = rect.width / (timeRange.end - timeRange.start);
    const keyHeight = rect.height / midiRange;
    
    let nearestData: PitchData | null = null;
    let minDistance = Infinity;
    
    filteredData.forEach(data => {
      const dataX = (data.time - timeRange.start) * timeScale;
      const dataY = (dataMaxMidi - data.midi) * keyHeight + keyHeight / 2;
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

  const resetZoom = () => {
    if (pitchData.length > 0) {
      const maxTime = Math.max(...pitchData.map(d => d.time));
      setTimeRange({ start: 0, end: maxTime });
    }
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = parseFloat(e.target.value);
    setTimeRange(prev => ({
      start: Math.min(newStart, prev.end - 0.1), // Ensure at least 0.1s range
      end: prev.end
    }));
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = parseFloat(e.target.value);
    setTimeRange(prev => ({
      start: prev.start,
      end: Math.max(newEnd, prev.start + 0.1) // Ensure at least 0.1s range
    }));
  };

  if (!pitchData.length) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        音階データがありません
      </div>
    );
  }

  const maxTime = Math.max(...pitchData.map(d => d.time));
  const isZoomed = timeRange.start > 0 || timeRange.end < maxTime;

  return (
    <div className="relative">
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {isZoomed ? '🔍 時間範囲: ' + timeRange.start.toFixed(2) + 's - ' + timeRange.end.toFixed(2) + 's' : '📊 全体表示'}
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
        
        {/* Time range sliders */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 dark:text-gray-300 w-16">開始:</label>
            <input
              type="range"
              min="0"
              max={maxTime}
              step="0.01"
              value={timeRange.start}
              onChange={handleStartTimeChange}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <span className="text-sm text-gray-600 dark:text-gray-300 w-16 text-right">
              {timeRange.start.toFixed(2)}s
            </span>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 dark:text-gray-300 w-16">終了:</label>
            <input
              type="range"
              min="0"
              max={maxTime}
              step="0.01"
              value={timeRange.end}
              onChange={handleEndTimeChange}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <span className="text-sm text-gray-600 dark:text-gray-300 w-16 text-right">
              {timeRange.end.toFixed(2)}s
            </span>
          </div>
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        className="w-full h-64 border border-gray-300 dark:border-gray-600 rounded-lg"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      
      {tooltip.visible && (
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
        <p>• スライダーで時間範囲を拡大表示できます</p>
        <p>• 縦方向は録音に含まれる音階範囲に自動調整されます</p>
      </div>
    </div>
  );
}