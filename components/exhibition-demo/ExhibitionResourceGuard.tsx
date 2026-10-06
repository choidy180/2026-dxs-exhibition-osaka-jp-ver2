'use client';

import { useEffect } from 'react';

/** 화면 이동 시 이전 디코더를 해제하고, 숨긴 탭의 영상은 재생하던 것만 복원한다. */
export default function ExhibitionResourceGuard() {
  useEffect(() => {
    const suspended = new Set<HTMLMediaElement>();
    const pause = (media: HTMLMediaElement) => {
      if (!media.paused) { suspended.add(media); media.pause(); }
    };
    const visibility = () => {
      if (document.hidden) document.querySelectorAll<HTMLMediaElement>('video, audio').forEach(pause);
      else {
        suspended.forEach(media => { if (media.isConnected && !media.ended) void media.play().catch(() => {}); });
        suspended.clear();
      }
    };
    const hiddenPlay = (event: Event) => {
      if (document.hidden && event.target instanceof HTMLMediaElement) pause(event.target);
    };
    const observer = new MutationObserver(records => {
      records.forEach(record => record.removedNodes.forEach(node => {
        if (!(node instanceof Element) || node.isConnected) return;
        const media = node instanceof HTMLMediaElement ? [node] : node.querySelectorAll<HTMLMediaElement>('video, audio');
        media.forEach(item => {
          suspended.delete(item);
          item.pause();
          item.removeAttribute('src');
          item.querySelectorAll('source').forEach(source => source.removeAttribute('src'));
          item.load();
        });
      }));
    });
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('play', hiddenPlay, true);
    visibility();
    return () => {
      observer.disconnect(); suspended.clear();
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('play', hiddenPlay, true);
    };
  }, []);
  return null;
}
