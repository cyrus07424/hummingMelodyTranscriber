import Pitchfinder from 'pitchfinder';

// Initialize pitch detector using YIN algorithm
const detectPitch = Pitchfinder.YIN({
  sampleRate: 44100,
  threshold: 0.1
});

// Convert frequency to note name
export function frequencyToNote(frequency: number): string {
  if (!frequency || frequency < 20) return '';
  
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const A4 = 440;
  const C0 = A4 * Math.pow(2, -4.75);
  
  if (frequency > C0) {
    const h = Math.round(12 * Math.log2(frequency / C0));
    const octave = Math.floor(h / 12);
    const n = h % 12;
    return noteNames[n] + octave;
  }
  return '';
}

// Convert frequency to MIDI note number
export function frequencyToMidi(frequency: number): number {
  if (!frequency || frequency < 20) return 0;
  return Math.round(12 * Math.log2(frequency / 440) + 69);
}

// Get pitch from audio buffer
export function getPitchFromBuffer(buffer: Float32Array): number | null {
  return detectPitch(buffer) || null;
}

// Setup audio context and microphone
export async function setupAudioContext(): Promise<{
  audioContext: AudioContext;
  mediaStream: MediaStream;
  analyser: AnalyserNode;
  dataArray: Float32Array;
}> {
  const audioContext = new AudioContext();
  const mediaStream = await navigator.mediaDevices.getUserMedia({ 
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false
    } 
  });
  
  const source = audioContext.createMediaStreamSource(mediaStream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 4096;
  analyser.smoothingTimeConstant = 0;
  
  source.connect(analyser);
  
  const dataArray = new Float32Array(analyser.fftSize);
  
  return { audioContext, mediaStream, analyser, dataArray };
}