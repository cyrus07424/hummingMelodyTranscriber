'use client';

import { useState, useEffect, useRef } from 'react';
import { setupAudioContext, getPitchFromBuffer, frequencyToNote, frequencyToMidi } from '../utils/pitchDetection';
import PianoRoll from './PianoRoll';
import WaveSurferComponent from './WaveSurfer';

interface PitchData {
  time: number;
  frequency: number;
  note: string;
  midi: number;
}

export default function RecordingMode() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [pitchData, setPitchData] = useState<PitchData[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Float32Array | null>(null);
  const startTimeRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      setError('');
      setPitchData([]);
      setAudioBlob(null);
      setUploadedFile(null);
      
      const { audioContext, mediaStream, analyser, dataArray } = await setupAudioContext();
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;
      
      // Setup MediaRecorder for audio recording
      const mediaRecorder = new MediaRecorder(mediaStream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setAudioBlob(blob);
        mediaStream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      startTimeRef.current = Date.now();
      
      // Start pitch detection and timer
      const collectPitchData = () => {
        if (!analyserRef.current || !dataArrayRef.current) return;
        
        analyserRef.current.getFloatTimeDomainData(dataArrayRef.current);
        const frequency = getPitchFromBuffer(dataArrayRef.current);
        
        if (frequency && frequency > 80 && frequency < 2000) {
          const currentTime = (Date.now() - startTimeRef.current) / 1000;
          const note = frequencyToNote(frequency);
          const midi = frequencyToMidi(frequency);
          
          setPitchData(prev => [...prev, {
            time: currentTime,
            frequency,
            note,
            midi
          }]);
        }
        
        // Continue collecting data while recording OR briefly after stopping to capture final notes
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          animationRef.current = requestAnimationFrame(collectPitchData);
        }
      };
      
      collectPitchData();
      
      // Timer for recording duration
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setRecordingTime(elapsed);
        
        // Auto stop at 60 seconds
        if (elapsed >= 60) {
          stopRecording();
        }
      }, 100);
      
    } catch (err) {
      setError('録音の開始に失敗しました。マイクの許可を確認してください。');
      console.error('Error starting recording:', err);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    // Stop pitch collection after a brief delay to capture final notes
    setTimeout(() => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      // For microphone recording, we don't need to simulate analysis since
      // pitch data was collected in real-time. Just show results immediately.
      setIsAnalyzing(false);
    }, 500); // Small delay to capture any final audio data
  };

  const downloadAudio = () => {
    if (!audioBlob) return;
    
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `humming_${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      setError('');
      setIsAnalyzing(true);
      setPitchData([]);
      setAudioBlob(null);
      setUploadedFile(file);
      
      // Create audio context for file analysis
      const audioContext = new AudioContext();
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Analyze audio in chunks
      const sampleRate = audioBuffer.sampleRate;
      const channelData = audioBuffer.getChannelData(0);
      const chunkSize = 4096;
      const hopSize = 1024;
      const newPitchData: PitchData[] = [];
      
      for (let i = 0; i < channelData.length - chunkSize; i += hopSize) {
        const chunk = channelData.slice(i, i + chunkSize);
        const frequency = getPitchFromBuffer(chunk);
        
        if (frequency && frequency > 80 && frequency < 2000) {
          const time = i / sampleRate;
          const note = frequencyToNote(frequency);
          const midi = frequencyToMidi(frequency);
          
          newPitchData.push({
            time,
            frequency,
            note,
            midi
          });
        }
      }
      
      setPitchData(newPitchData);
      audioContext.close();
      setIsAnalyzing(false);
    } catch (err) {
      setError('ファイルの解析に失敗しました。');
      console.error('Error analyzing file:', err);
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white">
        録音・音階分析
      </h2>
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      
      <div className="space-y-6">
        {/* Recording Controls */}
        <div className="text-center space-y-4">
          <div className="space-x-4">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isAnalyzing}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-400'
              }`}
            >
              {isRecording ? '🛑 停止' : '🎤 録音開始'}
            </button>
            
            {audioBlob && (
              <button
                onClick={downloadAudio}
                className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-all"
              >
                📥 ダウンロード
              </button>
            )}
          </div>
          
          {isRecording && (
            <div className="text-lg font-medium">
              <span className="text-red-500">●</span> {recordingTime.toFixed(1)}s / 60s
            </div>
          )}
        </div>
        
        {/* File Upload */}
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="hidden"
            id="audio-upload"
            disabled={isRecording || isAnalyzing}
          />
          <label 
            htmlFor="audio-upload" 
            className={`cursor-pointer text-blue-500 hover:text-blue-600 font-medium ${
              isRecording || isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            📁 音声ファイルをアップロード
          </label>
          <p className="text-sm text-gray-500 mt-2">
            対応形式: WAV, MP3, M4A, OGG
          </p>
        </div>
        
        {/* Analysis Results */}
        {isAnalyzing && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">音階を解析中...</p>
          </div>
        )}
        
        {pitchData.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
              解析結果（{pitchData.length}個の音階データ）
            </h3>
            
            {/* Audio Waveform and Playback */}
            {(audioBlob || uploadedFile) && (
              <WaveSurferComponent 
                audioBlob={audioBlob} 
                audioUrl={uploadedFile ? URL.createObjectURL(uploadedFile) : undefined}
              />
            )}
            
            {/* Piano Roll Visualization */}
            <PianoRoll pitchData={pitchData} />
          </div>
        )}
        
        {!isRecording && !isAnalyzing && pitchData.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <p className="mb-4">録音ボタンを押すか、音声ファイルをアップロードしてください</p>
            <div className="text-sm space-y-1">
              <p>• 最大60秒まで録音可能</p>
              <p>• 録音データは譜面として表示</p>
              <p>• 録音ファイルをダウンロード可能</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}