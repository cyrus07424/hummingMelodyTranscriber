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
    const minMidi = Math.min(...pitchData.map(d => d.midi));
    const maxMidi = Math.max(...pitchData.map(d => d.midi));
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
    
  }, [pitchData]);

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
      setTooltip({
        x: event.clientX,
        y: event.clientY,
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

  if (!pitchData.length) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        音階データがありません
      </div>
    );
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        className="w-full h-64 border border-gray-300 dark:border-gray-600 rounded-lg cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      />
      
      {tooltip.visible && (
        <div
          className="absolute z-10 bg-black text-white p-2 rounded text-sm pointer-events-none"
          style={{
            left: tooltip.x - 60,
            top: tooltip.y - 80
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
      </div>
    </div>
  );
}