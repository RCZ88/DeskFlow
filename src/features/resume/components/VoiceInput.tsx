import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface VoiceInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  lang?: string;
}

export function VoiceInput({ value, onChange, disabled, lang = 'en-US' }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [interimText, setInterimText] = useState('');
  const [volume, setVolume] = useState(0);
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  const finalTranscriptRef = useRef('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
    return () => {
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    };
  }, []);

  const startVisualization = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setVolume(avg / 255);
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();
    } catch (err) {
      console.error('[VoiceInput] Microphone access denied:', err);
    }
  };

  const stopVisualization = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setVolume(0);
  };

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    setIsRecording(false);
    setInterimText('');
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    stopVisualization();
  }, [stopVisualization]);

  const startRecording = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition || disabled) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    finalTranscriptRef.current = value || '';
    isRecordingRef.current = true;

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += (finalTranscriptRef.current ? ' ' : '') + transcript;
          onChange(finalTranscriptRef.current);
          setInterimText('');
        } else {
          interim += transcript;
        }
      }
      if (interim) setInterimText(interim);
    };

    recognition.onerror = (event: any) => {
      console.error('[VoiceInput] Error:', event.error);
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      if (event.error !== 'no-speech') {
        stopRecording();
      }
    };

    recognition.onend = () => {
      if (isRecordingRef.current) {
        restartTimeoutRef.current = setTimeout(() => {
          if (isRecordingRef.current) {
            try {
              recognition.start();
            } catch (e) {
              stopRecording();
            }
          }
        }, 100);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.error('[VoiceInput] Failed to start:', e);
      return;
    }
    setIsRecording(true);
    startVisualization();
  }, [value, onChange, disabled, lang, startVisualization, stopRecording]);

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  if (!isSupported) {
    return (
      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-600" title="Voice input not supported in this environment">
        <Mic className="w-3.5 h-3.5 opacity-30" />
      </div>
    );
  }

  return (
    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
      {isRecording && (
        <div className="flex items-center gap-[2px] h-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-[3px] rounded-full bg-red-400 transition-all duration-75"
              style={{
                height: `${Math.max(4, volume * 16 * (1 + Math.sin(Date.now() / 200 + i) * 0.3))}px`,
                opacity: 0.5 + volume * 0.5,
              }}
            />
          ))}
        </div>
      )}

      {isRecording && interimText && (
        <div className="absolute right-10 top-1/2 -translate-y-1/2 max-w-[200px] truncate text-[10px] text-red-400/80 italic">
          {interimText}
        </div>
      )}

      <button
        type="button"
        onClick={toggleRecording}
        disabled={disabled}
        className={`relative p-1.5 rounded-full transition-all duration-150 ${
          isRecording
            ? 'text-red-400 bg-red-500/15 ring-1 ring-red-500/30'
            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
        } disabled:opacity-40 disabled:cursor-not-allowed`}
        title={isRecording ? 'Stop recording' : 'Start voice input'}
      >
        {isRecording && (
          <span className="absolute inset-0 rounded-full bg-red-400/20 animate-ping" />
        )}
        {isRecording ? (
          <MicOff className="w-4 h-4 relative z-10" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
