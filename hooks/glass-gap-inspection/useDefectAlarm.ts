'use client';

import { useEffect, useRef, useState } from 'react';

type BrowserAudioContext = typeof AudioContext;

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: BrowserAudioContext;
}

const getAudioContextConstructor = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.AudioContext || (window as WindowWithWebkitAudio).webkitAudioContext || null;
};

export const useDefectAlarm = (isDefectMode: boolean) => {
  const [audioAllowed, setAudioAllowed] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const stopAlarm = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    if (!isDefectMode || !audioAllowed) {
      stopAlarm();
      return stopAlarm;
    }

    const AudioContextConstructor = getAudioContextConstructor();

    if (!AudioContextConstructor) {
      return stopAlarm;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextConstructor();
    }

    const playBeep = () => {
      const context = audioContextRef.current;

      if (!context) {
        return;
      }

      if (context.state === 'suspended') {
        context.resume();
      }

      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(880, context.currentTime);
      gain.gain.setValueAtTime(0.1, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, context.currentTime + 0.15);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.15);
    };

    playBeep();
    intervalRef.current = setInterval(playBeep, 500);

    return stopAlarm;
  }, [audioAllowed, isDefectMode]);

  const confirmPermission = () => {
    setAudioAllowed(true);
    setShowPermissionModal(false);
  };

  const toggleAudio = () => {
    setAudioAllowed((previous) => !previous);
    setShowPermissionModal(false);
  };

  return {
    audioAllowed,
    confirmPermission,
    showPermissionModal,
    toggleAudio,
  };
};
