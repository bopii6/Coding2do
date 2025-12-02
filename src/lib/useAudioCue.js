import { useCallback, useRef } from 'react';

const SOUND_PRESETS = {
  add: {
    gain: 0.05,
    steps: [
      { freq: 540, duration: 0.12, type: 'triangle' },
      { freq: 780, duration: 0.12, delay: 0.06, type: 'triangle' },
    ],
  },
  complete: {
    gain: 0.07,
    steps: [
      { freq: 820, duration: 0.15, type: 'sine' },
      { freq: 540, duration: 0.18, delay: 0.08, type: 'sine' },
    ],
  },
  delete: {
    gain: 0.05,
    steps: [
      { freq: 280, duration: 0.18, type: 'sawtooth' },
      { freq: 180, duration: 0.12, delay: 0.05, type: 'sawtooth' },
    ],
  },
  restore: {
    gain: 0.05,
    steps: [
      { freq: 420, duration: 0.12, type: 'triangle' },
      { freq: 640, duration: 0.14, delay: 0.05, type: 'triangle' },
    ],
  },
  copy: {
    gain: 0.035,
    steps: [
      { freq: 900, duration: 0.05, type: 'square' },
      { freq: 1200, duration: 0.06, delay: 0.03, type: 'square' },
    ],
  },
};

const MIN_GAIN = 0.0001;

export default function useAudioCue(enabled = true) {
  const contextRef = useRef(null);

  const getContext = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!contextRef.current) {
      contextRef.current = new AudioCtx();
    }
    return contextRef.current;
  }, [enabled]);

  const playCue = useCallback(
    (name) => {
      if (!enabled) return;
      const preset = SOUND_PRESETS[name];
      if (!preset) return;

      const ctx = getContext();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const startTime = ctx.currentTime + 0.01;
      preset.steps.forEach((step) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = step.type || 'sine';
        oscillator.frequency.setValueAtTime(step.freq, startTime + (step.delay || 0));

        const volume = Math.max((preset.gain ?? 0.05) * (step.volume ?? 1), MIN_GAIN);
        gainNode.gain.setValueAtTime(volume, startTime + (step.delay || 0));
        gainNode.gain.exponentialRampToValueAtTime(
          MIN_GAIN,
          startTime + (step.delay || 0) + (step.duration || 0.1)
        );

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(startTime + (step.delay || 0));
        oscillator.stop(startTime + (step.delay || 0) + (step.duration || 0.1));
      });
    },
    [enabled, getContext]
  );

  return playCue;
}
