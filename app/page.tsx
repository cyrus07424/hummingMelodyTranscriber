'use client';

import { useState } from 'react';
import RealTimePitchDetector from './components/RealTimePitchDetector';
import RecordingMode from './components/RecordingMode';

type Mode = 'realtime' | 'recording';

export default function Home() {
  const [mode, setMode] = useState<Mode>('realtime');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
            🎵 音階判定ツール
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            リアルタイム音階判定・鼻歌録音分析ツール
          </p>
        </header>

        <div className="max-w-4xl mx-auto">
          {/* Mode Selector */}
          <div className="flex justify-center mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-1 shadow-md">
              <button
                onClick={() => setMode('realtime')}
                className={`px-6 py-3 rounded-md font-medium transition-all ${
                  mode === 'realtime'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                リアルタイム判定
              </button>
              <button
                onClick={() => setMode('recording')}
                className={`px-6 py-3 rounded-md font-medium transition-all ${
                  mode === 'recording'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                録音・分析
              </button>
            </div>
          </div>

          {/* Mode Content */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            {mode === 'realtime' ? (
              <RealTimePitchDetector />
            ) : (
              <RecordingMode />
            )}
          </div>
        </div>
      </div>
      <footer className="text-center text-gray-400 mt-8">
        &copy; 2025 <a href="https://github.com/cyrus07424" target="_blank">cyrus</a>
      </footer>
    </div>
  );
}
