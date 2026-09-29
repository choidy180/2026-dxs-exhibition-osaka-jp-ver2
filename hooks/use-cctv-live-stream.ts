'use client';

import { useCallback, useState } from 'react';
import { DEMO_CAMERA_VIDEO } from '@/data/exhibition-inspection';
import type { CctvCamera, CctvLiveStatus } from '@/types/cctv-monitoring';

/** 로컬 파일의 실제 미디어 이벤트로 재생 상태를 표시한다. */
export function useCctvLiveStream(camera: CctvCamera | null) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{ key: string; status: CctvLiveStatus } | null>(null);
  const key = `${camera?.id ?? 'idle'}-${attempt}`;
  const status: CctvLiveStatus = !camera ? 'idle' : state?.key === key ? state.status : 'connecting';
  return {
    src: DEMO_CAMERA_VIDEO, key, status,
    error: status === 'error' ? '영상을 불러오지 못했습니다. 다시 시도해주세요.' : null,
    retry: useCallback(() => setAttempt(value => value + 1), []),
    onPlaying: () => setState({ key, status: 'playing' }),
    onError: () => setState({ key, status: 'error' }),
  };
}
