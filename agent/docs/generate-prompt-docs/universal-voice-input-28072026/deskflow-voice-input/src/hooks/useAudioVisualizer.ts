/**
 * useAudioVisualizer — Web Audio API frequency analysis
 * Creates AudioContext + AnalyserNode from getUserMedia stream.
 * Returns smoothed frequency data and volume level.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { lerpArray, clamp } from '../lib/voice-utils';

const FFT_SIZE = 256;           // Frequency bin count = 128
const SMOOTHING = 0.85;         // AnalyserNode time smoothing
const LERP_FACTOR = 0.3;        // Frame-to-frame interpolation
const BAR_COUNT = 24;           // Number of visual bars to render

export interface AudioVisualizerData {
  /** Raw frequency data (0-255) — length = FFT_SIZE/2 */
  frequencyData: Uint8Array;
  /** Smoothed bar heights for rendering (0-1 normalized) */
  bars: number[];
  /** Average volume level (0-1) */
  volume: number;
  /** Whether audio stream is active */
  active: boolean;
  /** Error message if stream failed */
  error?: string;
  /** Start the audio stream */
  start: () => Promise<void>;
  /** Stop and cleanup the audio stream */
  stop: () => void;
}

export function useAudioVisualizer(): AudioVisualizerData {
  const [frequencyData, setFrequencyData] = useState<Uint8Array>(new Uint8Array(FFT_SIZE / 2));
  const [bars, setBars] = useState<number[]>(new Array(BAR_COUNT).fill(0));
  const [volume, setVolume] = useState(0);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const prevBarsRef = useRef<Uint8Array | null>(null);
  const runningRef = useRef(false);

  const stop = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch { /* ignore */ }
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      try { audioCtxRef.current.close(); } catch { /* ignore */ }
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    prevBarsRef.current = null;
    setActive(false);
    setVolume(0);
    setBars(new Array(BAR_COUNT).fill(0));
    setFrequencyData(new Uint8Array(FFT_SIZE / 2));
  }, []);

  const start = useCallback(async () => {
    if (runningRef.current) return;

    stop(); // ensure clean slate
    setError(undefined);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = FFT_SIZE;
      analyser.smoothingTimeConstant = SMOOTHING;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      runningRef.current = true;
      setActive(true);

      const tick = () => {
        if (!runningRef.current) return;

        analyser.getByteFrequencyData(dataArray);
        setFrequencyData(new Uint8Array(dataArray));

        // Compute volume (average of all bins)
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length / 255;
        setVolume(clamp(avg, 0, 1));

        // Downsample to BAR_COUNT bars with logarithmic spacing
        const newBars = new Array(BAR_COUNT).fill(0);
        for (let i = 0; i < BAR_COUNT; i++) {
          const startBin = Math.floor(Math.pow(i / BAR_COUNT, 1.5) * dataArray.length);
          const endBin = Math.floor(Math.pow((i + 1) / BAR_COUNT, 1.5) * dataArray.length);
          let binSum = 0;
          let count = 0;
          for (let j = startBin; j < endBin && j < dataArray.length; j++) {
            binSum += dataArray[j];
            count++;
          }
          newBars[i] = count > 0 ? (binSum / count) / 255 : 0;
        }

        // Smooth with previous frame
        if (prevBarsRef.current) {
          const smoothed = lerpArray(
            prevBarsRef.current,
            new Uint8Array(newBars.map(v => Math.round(v * 255))),
            LERP_FACTOR
          );
          setBars(Array.from(smoothed).map(v => v / 255));
          prevBarsRef.current = smoothed;
        } else {
          setBars(newBars);
          prevBarsRef.current = new Uint8Array(newBars.map(v => Math.round(v * 255)));
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Microphone access denied');
      setActive(false);
    }
  }, [stop]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return {
    frequencyData,
    bars,
    volume,
    active,
    error,
    start,
    stop,
  };
}
