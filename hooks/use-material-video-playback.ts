'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

type PlaybackStatus = 'loading' | 'playing' | 'buffering' | 'paused' | 'error';

export function useMaterialVideoPlayback(videoRef: RefObject<HTMLVideoElement | null>) {
  const [status, setStatus] = useState<PlaybackStatus>('loading');
  const hasPlayed = useRef(false);

  const resume = useCallback((video = videoRef.current) => {
    if (!video || video.ended || document.hidden) return;
    // 자동 재생이 차단되면 사용자가 직접 재생할 수 있게 한다.
    void video.play().catch((error: unknown) => {
      if (videoRef.current !== video) return;
      const name = error instanceof DOMException ? error.name : '';
      if (name === 'AbortError') return;
      setStatus(name === 'NotAllowedError' ? 'paused' : 'error');
    });
  }, [videoRef]);

  useEffect(() => {
    const restorePlayback = () => {
      if (!document.hidden && videoRef.current?.paused) resume();
    };
    document.addEventListener('visibilitychange', restorePlayback);
    return () => document.removeEventListener('visibilitychange', restorePlayback);
  }, [resume, videoRef]);

  const onPlaying = () => { hasPlayed.current = true; setStatus('playing'); };
  const onWaiting = () => setStatus(previous => previous === 'error' || previous === 'paused'
    ? previous : hasPlayed.current ? 'buffering' : 'loading');
  const onStalled = () => {
    // 다운로드가 멈췄더라도 이미 버퍼가 충분하면 재생 상태를 유지한다.
    if (videoRef.current && videoRef.current.readyState < 3) onWaiting();
  };
  const onPause = () => {
    const video = videoRef.current;
    if (video && !video.ended && !video.error) setStatus('paused');
  };

  return { status, resume, onPlaying, onWaiting, onStalled, onPause, onError: () => setStatus('error') };
}
