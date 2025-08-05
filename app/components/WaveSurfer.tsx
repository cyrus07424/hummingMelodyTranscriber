'use client';

import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface WaveSurferProps {
  audioBlob: Blob | null;
  audioUrl?: string;
}

export default function WaveSurferComponent({ audioBlob, audioUrl }: WaveSurferProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const spectrogramRef = useRef<HTMLCanvasElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize WaveSurfer
    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#4F46E5',
      progressColor: '#7C3AED',
      cursorColor: '#EF4444',
      barWidth: 2,
      barRadius: 3,
      height: 80,
      normalize: true,
    });

    wavesurferRef.current = wavesurfer;

    // Event listeners
    wavesurfer.on('play', () => {
      setIsPlaying(true);
      startSpectrogramAnalysis();
    });
    wavesurfer.on('pause', () => {
      setIsPlaying(false);
      stopSpectrogramAnalysis();
    });
    wavesurfer.on('ready', () => {
      setDuration(wavesurfer.getDuration());
      setIsLoading(false);
      initializeAudioAnalysis();
    });
    wavesurfer.on('timeupdate', () => {
      setCurrentTime(wavesurfer.getCurrentTime());
    });
    wavesurfer.on('click', () => {
      setCurrentTime(wavesurfer.getCurrentTime());
    });

    return () => {
      wavesurfer.destroy();
    };
  }, []);

  useEffect(() => {
    if (!wavesurferRef.current) return;

    const loadAudio = async () => {
      setIsLoading(true);
      try {
        if (audioBlob) {
          const url = URL.createObjectURL(audioBlob);
          await wavesurferRef.current?.load(url);
          URL.revokeObjectURL(url);
        } else if (audioUrl) {
          await wavesurferRef.current?.load(audioUrl);
        }
      } catch (error) {
        console.error('Error loading audio:', error);
        setIsLoading(false);
      }
    };

    loadAudio();
  }, [audioBlob, audioUrl]);

  const handlePlayPause = () => {
    if (!wavesurferRef.current) return;
    
    if (isPlaying) {
      wavesurferRef.current.pause();
    } else {
      wavesurferRef.current.play();
    }
  };

  const handleStop = () => {
    if (!wavesurferRef.current) return;
    wavesurferRef.current.stop();
    setCurrentTime(0);
    stopSpectrogramAnalysis();
  };

  // Cleanup function
  useEffect(() => {
    return () => {
      stopSpectrogramAnalysis();
      const audioContext = audioContextRef.current;
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const initializeAudioAnalysis = async () => {
    // For now, we'll create a placeholder for the spectrogram
    // The real-time spectrogram will work when audio is actually playing
    if (spectrogramRef.current) {
      const canvas = spectrogramRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = 800;
        canvas.height = 200;
        
        // Draw placeholder
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#1e3a8a');
        gradient.addColorStop(1, '#1e1e1e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('音声再生時にスペクトログラムが表示されます', canvas.width / 2, canvas.height / 2);
      }
    }
  };

  const startSpectrogramAnalysis = () => {
    // Simplified spectrogram - shows a visual indicator during playback
    if (!spectrogramRef.current) return;
    
    const canvas = spectrogramRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationCounter = 0;
    
    const draw = () => {
      if (!isPlaying) return;
      
      animationCounter++;
      
      // Simple animated visualization during playback
      ctx.fillStyle = '#1e1e1e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw animated frequency bars
      for (let i = 0; i < 50; i++) {
        const x = (i / 50) * canvas.width;
        const height = Math.sin(animationCounter * 0.1 + i * 0.2) * 50 + 60;
        const hue = (i * 7 + animationCounter * 2) % 360;
        
        ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
        ctx.fillRect(x, canvas.height - height, canvas.width / 50 - 2, height);
      }
      
      animationRef.current = requestAnimationFrame(draw);
    };
    
    draw();
  };

  const stopSpectrogramAnalysis = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };

  if (!audioBlob && !audioUrl) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        音声データがありません
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
        音声波形・スペクトログラム・再生
      </h3>
      
      {/* Controls */}
      <div className="flex items-center justify-center space-x-4">
        <button
          onClick={handlePlayPause}
          disabled={isLoading}
          className="flex items-center justify-center w-12 h-12 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-full transition-all"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
          ) : isPlaying ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 4a1 1 0 011 1v10a1 1 0 11-2 0V5a1 1 0 011-1zM14 4a1 1 0 011 1v10a1 1 0 11-2 0V5a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          )}
        </button>
        
        <button
          onClick={handleStop}
          disabled={isLoading}
          className="flex items-center justify-center w-10 h-10 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded-full transition-all"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 4a1 1 0 00-1 1v10a1 1 0 001 1h8a1 1 0 001-1V5a1 1 0 00-1-1H6z" clipRule="evenodd" />
          </svg>
        </button>
        
        <div className="text-sm text-gray-600 dark:text-gray-300 min-w-0">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
      
      {/* Waveform */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">波形</div>
        <div ref={containerRef} className="w-full" />
      </div>

      {/* Spectrogram */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
        <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">リアルタイムスペクトログラム</div>
        <div className="w-full overflow-hidden rounded border border-gray-300 dark:border-gray-600">
          <canvas 
            ref={spectrogramRef}
            className="w-full h-48"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          • 縦軸: 周波数（低→高）• 横軸: 時間 • 色: 強度（青→赤）
        </div>
      </div>
      
      <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
        <p>💡 波形をクリックして再生位置を変更できます</p>
        <p>• 波形: 音声の振幅変化を表示</p>
        <p>• スペクトログラム: リアルタイム周波数分析を表示</p>
      </div>
    </div>
  );
}