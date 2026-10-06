'use client';

import { useEffect, useRef, useState } from 'react';
import { TAKTTIME_PLAYBACK_RATES } from '@/constants/takttime-camera-videos';
import { TAKTTIME_TRACKING } from '@/data/takttime-tracking';
import type { TakttimeLine, VisionClock, VisionRecognition } from '@/types/takttime-vision';
import { advanceVisionClock } from '@/utils/takttime-vision';

export function useConveyorVisionPlayback(line: TakttimeLine, onRecognition: (line: TakttimeLine, event: VisionRecognition) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [playing, setPlaying] = useState(false);
  const [clock, setClock] = useState<VisionClock | null>(null);
  const [recognition, setRecognition] = useState<VisionRecognition | null>(null);
  const timeline = TAKTTIME_TRACKING[line];
  const playbackRate = TAKTTIME_PLAYBACK_RATES[line];

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let previous: VisionClock | null = null;
    let frameId = 0;
    let lastSampleAt = -Infinity;
    let active = true;
    const hasVideoFrames = typeof video.requestVideoFrameCallback === 'function';
    const sample = (mediaTime: number) => {
      // 인식은 구간 경계를 계산하므로 모든 영상 프레임마다 React를 갱신할 필요가 없다.
      const now = performance.now();
      if (now - lastSampleAt < 100 || document.hidden) return;
      lastSampleAt = now;
      // 캐시된 영상의 초기 이벤트가 hydration보다 먼저 끝나도 실제 표시 프레임으로 상태를 복원한다.
      setState('ready');
      setPlaying(!video.paused);
      if (video.seeking || previous?.mediaTime === mediaTime) return;
      const next = advanceVisionClock(previous, mediaTime, video.duration, timeline.partIntervalSeconds);
      previous = next.clock;
      setClock(next.clock);
      if (next.recognition) {
        setRecognition(next.recognition);
        onRecognition(line, next.recognition);
      }
    };
    const videoFrame: VideoFrameRequestCallback = (_, metadata) => {
      if (!active) return;
      sample(metadata.mediaTime);
      frameId = video.requestVideoFrameCallback(videoFrame);
    };
    const animationFrame = () => {
      if (!active) return;
      if (video.readyState >= 2) sample(video.currentTime);
      frameId = requestAnimationFrame(animationFrame);
    };
    const enforceRate = () => {
      video.defaultPlaybackRate = playbackRate;
      if (video.playbackRate !== playbackRate) video.playbackRate = playbackRate;
    };
    // 명시적인 탐색은 인식 이력에 넣지 않고, loop의 자동 되감기는 연속 시간으로 처리한다.
    const seeking = () => {
      if (!(previous && previous.mediaTime >= video.duration - .5 && video.currentTime < .5)) previous = null;
    };
    const ready = () => setState('ready');
    const play = () => { setState('ready'); setPlaying(true); };
    const pause = () => setPlaying(false);
    const loading = () => setState('loading');
    const error = () => { setState('error'); setPlaying(false); };
    enforceRate();
    video.addEventListener('canplay', ready);
    video.addEventListener('playing', play);
    video.addEventListener('pause', pause);
    video.addEventListener('waiting', loading);
    video.addEventListener('loadstart', loading);
    video.addEventListener('error', error);
    video.addEventListener('loadedmetadata', enforceRate);
    video.addEventListener('ratechange', enforceRate);
    video.addEventListener('seeking', seeking);
    frameId = hasVideoFrames ? video.requestVideoFrameCallback(videoFrame) : requestAnimationFrame(animationFrame);
    return () => {
      active = false;
      video.removeEventListener('canplay', ready);
      video.removeEventListener('playing', play);
      video.removeEventListener('pause', pause);
      video.removeEventListener('waiting', loading);
      video.removeEventListener('loadstart', loading);
      video.removeEventListener('error', error);
      video.removeEventListener('loadedmetadata', enforceRate);
      video.removeEventListener('ratechange', enforceRate);
      video.removeEventListener('seeking', seeking);
      if (hasVideoFrames) video.cancelVideoFrameCallback(frameId);
      else cancelAnimationFrame(frameId);
    };
  }, [attempt, line, onRecognition, playbackRate, timeline]);

  const retry = () => {
    setState('loading');
    setPlaying(false);
    setClock(null);
    setRecognition(null);
    setAttempt(value => value + 1);
  };
  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => setState('error'));
    else video.pause();
  };

  return { videoRef, attempt, state, playing, clock, recognition, timeline, retry, togglePlayback };
}
