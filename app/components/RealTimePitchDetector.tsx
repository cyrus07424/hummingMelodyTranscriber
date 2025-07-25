'use client';

import { useState, useEffect, useRef } from 'react';
import { setupAudioContext, getPitchFromBuffer, frequencyToNote } from '../utils/pitchDetection';

export default function RealTimePitchDetector() {
  const [isListening, setIsListening] = useState(false);
  const [currentNote, setCurrentNote] = useState<string>('');
  const [currentFrequency, setCurrentFrequency] = useState<number>(0);
  const [error, setError] = useState<string>('');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Float32Array | null>(null);
  const animationRef = useRef<number | null>(null);

  const startListening = async () => {
    try {
      setError('');
      const { audioContext, mediaStream, analyser, dataArray } = await setupAudioContext();
      
      audioContextRef.current = audioContext;
      mediaStreamRef.current = mediaStream;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;
      
      setIsListening(true);
      
      // Start pitch detection loop
      const detectPitchLoop = () => {
        if (!analyserRef.current || !dataArrayRef.current) return;
        
        analyserRef.current.getFloatTimeDomainData(dataArrayRef.current);
        const frequency = getPitchFromBuffer(dataArrayRef.current);
        
        if (frequency && frequency > 80 && frequency < 2000) {
          setCurrentFrequency(frequency);
          setCurrentNote(frequencyToNote(frequency));
        } else {
          setCurrentFrequency(0);
          setCurrentNote('');
        }
        
        animationRef.current = requestAnimationFrame(detectPitchLoop);
      };
      
      detectPitchLoop();
    } catch (err) {
      setError('マイクへのアクセスに失敗しました。ブラウザでマイクの許可を確認してください。');
      console.error('Error accessing microphone:', err);
    }
  };

  const stopListening = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    dataArrayRef.current = null;
    setIsListening(false);
    setCurrentNote('');
    setCurrentFrequency(0);
  };

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  return (
    <div className="text-center">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">
        リアルタイム音階判定
      </h2>
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      
      <div className="mb-8">
        <button
          onClick={isListening ? stopListening : startListening}
          className={`px-8 py-4 rounded-lg font-medium text-lg transition-all ${
            isListening
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {isListening ? '🛑 停止' : '🎤 開始'}
        </button>
      </div>
      
      {isListening && (
        <div className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-8">
            <div className="mb-4">
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">検出された音階</div>
              <div className={`text-6xl font-bold transition-all duration-200 ${
                currentNote ? 'text-blue-600 dark:text-blue-400' : 'text-gray-300 dark:text-gray-600'
              }`}>
                {currentNote || '---'}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">周波数</div>
              <div className={`text-2xl font-medium transition-all duration-200 ${
                currentFrequency ? 'text-gray-800 dark:text-gray-200' : 'text-gray-300 dark:text-gray-600'
              }`}>
                {currentFrequency ? `${currentFrequency.toFixed(1)} Hz` : '---'}
              </div>
            </div>
          </div>
          
          <div className="text-sm text-gray-500 dark:text-gray-400">
            💡 楽器を演奏するか、声で音を出してください
          </div>
        </div>
      )}
      
      {!isListening && !error && (
        <div className="text-gray-500 dark:text-gray-400">
          <p className="mb-4">マイクボタンを押して音階判定を開始してください</p>
          <div className="text-sm space-y-1">
            <p>• リアルタイムで音階を判定します</p>
            <p>• 楽器の演奏や歌声に対応</p>
            <p>• 周波数も同時に表示</p>
          </div>
        </div>
      )}
    </div>
  );
}