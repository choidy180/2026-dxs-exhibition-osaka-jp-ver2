'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'framer-motion';
import { AlertCircle, Cctv, Check, ChevronRight, Loader2, RefreshCw, Search, SearchX, X } from 'lucide-react';
import { USE_MOCK_DATA } from '@/constants/cctv-monitoring';
import { useCctvMonitoring } from '@/hooks/use-cctv-monitoring';
import { motionDuration } from '@/styles/design-tokens';
import type { ToneName } from '@/styles/design-tokens';
import type { CctvCamera, CctvCameraStatus, UseCctvMonitoringResult } from '@/types/cctv-monitoring';
import { getCctvCameraGroup } from '@/utils/cctv-monitoring';
import {
  CameraAvatar, CameraDialog, CameraFilter, CameraFilters, CameraIconButton,
  CameraIdentity, CameraRowButton, CameraRows, CameraSection, CameraState,
  CameraStatus, CameraTextButton, RefreshNotice, SearchBox, SectionHeader,
  UpdateTime, ViewerBackdrop, ViewerBody, ViewerHeader,
} from './mobile-camera.styles';

const LivePlayer = dynamic(() => import('@/components/lab/cctv-monitoring/CctvLivePlayer'), {
  ssr: false,
  loading: () => <CameraState role="status"><Loader2 size={24} aria-hidden="true" />영상 준비 중...</CameraState>,
});

const STATUS: Record<CctvCameraStatus, { label: string; tone: ToneName }> = {
  online: { label: '연결됨', tone: 'success' },
  offline: { label: '확인 필요', tone: 'warning' },
  maintenance: { label: '점검 중', tone: 'neutral' },
};

function LoadingIcon() {
  const reducedMotion = useReducedMotion();
  return <motion.span aria-hidden="true" animate={{ rotate: reducedMotion ? 0 : 360 }} transition={{ duration: motionDuration.spin, repeat: Infinity, ease: 'linear' }}><Loader2 size={24} /></motion.span>;
}

function cameraLocation(camera: CctvCamera) {
  return camera.location && camera.location !== '-' ? camera.location : getCctvCameraGroup(camera).label;
}

const CameraRow = memo(function CameraRow({ camera, selected, onOpen }: {
  camera: CctvCamera;
  selected: boolean;
  onOpen: (camera: CctvCamera) => void;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const source = camera.thumbnailUrl
    ? `${camera.thumbnailUrl}${camera.thumbnailUrl.includes('?') ? '&' : '?'}v=${camera.thumbnailVersion ?? 0}`
    : null;
  const state = STATUS[camera.status];

  return (
    <li>
      <CameraRowButton type="button" onClick={() => onOpen(camera)} aria-haspopup="dialog" aria-expanded={selected} aria-label={`${camera.name || '-'}, ${camera.code || '-'}, ${state.label}, 실시간 영상 열기`}>
        <CameraIdentity>
          <span className="name">{camera.name || '-'}</span>
          <span className="meta"><span className="code">{camera.code || '-'}</span> · {cameraLocation(camera)}</span>
          <CameraStatus $tone={state.tone}>
            {camera.status === 'online' ? <Check size={12} aria-hidden="true" /> : <AlertCircle size={12} aria-hidden="true" />}
            {state.label}
          </CameraStatus>
        </CameraIdentity>
        <CameraAvatar aria-hidden="true">
          {source && source !== failedSource
            ? <Image src={source} alt="" fill sizes="60px" unoptimized loading="lazy" onError={() => setFailedSource(source)} />
            : <Cctv size={24} />}
        </CameraAvatar>
        <ChevronRight size={16} aria-hidden="true" />
      </CameraRowButton>
    </li>
  );
});

function CameraViewer({ camera, onClose }: { camera: CctvCamera; onClose: () => void }) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const isPresent = useIsPresent();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const siblings = Array.from(document.body.children)
      .filter((element): element is HTMLElement => element instanceof HTMLElement && element !== backdropRef.current)
      .map(element => ({ element, inert: element.inert }));
    siblings.forEach(({ element }) => { element.inert = true; });
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const focusableElements = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? []).filter(element => element.getClientRects().length > 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = focusableElements();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first || !last) {
        event.preventDefault();
        dialogRef.current?.focus();
      } else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const onFocusIn = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialogRef.current?.contains(event.target)) closeRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('focusin', onFocusIn);
      siblings.forEach(({ element, inert }) => { element.inert = inert; });
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [onClose]);

  return createPortal(
    <ViewerBackdrop ref={backdropRef} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : motionDuration.fast }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      <CameraDialog ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} tabIndex={-1}>
        <ViewerHeader>
          <div className="identity"><h2 id={titleId}>{camera.name || '-'}</h2><p>{camera.code || '-'} · {cameraLocation(camera)}</p></div>
          <CameraIconButton ref={closeRef} type="button" aria-label="실시간 영상 닫기" onClick={onClose}><X size={20} /></CameraIconButton>
        </ViewerHeader>
        <ViewerBody>
          <div className="player-stage">{isPresent && <LivePlayer camera={camera} />}</div>
          <p id={descriptionId} className="viewer-note">선택한 CCTV의 실시간 영상입니다. 창을 닫으면 영상 연결이 종료됩니다.</p>
        </ViewerBody>
      </CameraDialog>
    </ViewerBackdrop>,
    document.body,
  );
}

type ListViewProps = Pick<UseCctvMonitoringResult, 'cameras' | 'isLoading' | 'error' | 'refresh' | 'isRefreshing' | 'refreshError' | 'lastUpdatedAt'>;

const ListView = memo(function ListView({ cameras, isLoading, error, refresh, isRefreshing, refreshError, lastUpdatedAt }: ListViewProps) {
  const [query, setQuery] = useState('');
  const [needsAttention, setNeedsAttention] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<CctvCamera | null>(null);
  const headingId = useId();
  const normalizedQuery = query.trim().toLocaleLowerCase('ko-KR');
  const attentionCount = useMemo(() => cameras.filter(camera => camera.status !== 'online').length, [cameras]);
  const visibleCameras = useMemo(() => cameras.filter(camera => (
    (!needsAttention || camera.status !== 'online')
    && (!normalizedQuery || `${camera.name} ${camera.code} ${cameraLocation(camera)}`.toLocaleLowerCase('ko-KR').includes(normalizedQuery))
  )), [cameras, needsAttention, normalizedQuery]);
  const openCamera = useCallback((camera: CctvCamera) => setSelectedCamera(camera), []);
  const closeCamera = useCallback(() => setSelectedCamera(null), []);
  const clearFilters = () => { setQuery(''); setNeedsAttention(false); };
  const updateTime = lastUpdatedAt && !Number.isNaN(Date.parse(lastUpdatedAt))
    ? new Date(lastUpdatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-';

  return (
    <CameraSection aria-labelledby={headingId}>
      <SectionHeader>
        <div className="heading"><h2 id={headingId}>CCTV 목록</h2><span className="count">{isLoading || error ? '-' : cameras.length.toLocaleString('ko-KR')}대</span></div>
        <CameraIconButton type="button" aria-label="CCTV 목록 새로고침" disabled={isLoading || isRefreshing} onClick={refresh}><RefreshCw size={18} aria-hidden="true" /></CameraIconButton>
      </SectionHeader>
      {USE_MOCK_DATA && <RefreshNotice role="status">화면 확인용 예시 데이터입니다. 실제 CCTV 상태가 아닙니다.</RefreshNotice>}
      <SearchBox>
        <Search size={18} aria-hidden="true" />
        <input type="search" value={query} aria-label="CCTV 이름, 번호, 위치 검색" placeholder="CCTV 이름, 번호, 위치 검색" onChange={event => setQuery(event.target.value)} />
      </SearchBox>
      <CameraFilters role="group" aria-label="CCTV 상태 필터">
        <CameraFilter type="button" $active={!needsAttention} aria-pressed={!needsAttention} onClick={() => setNeedsAttention(false)}>전체</CameraFilter>
        <CameraFilter type="button" $active={needsAttention} aria-pressed={needsAttention} onClick={() => setNeedsAttention(true)}>확인 필요 {isLoading || error ? '-' : attentionCount.toLocaleString('ko-KR')}</CameraFilter>
      </CameraFilters>
      {refreshError && <RefreshNotice role="status"><span>목록을 갱신하지 못해 이전 조회 결과를 표시합니다.</span><CameraTextButton type="button" onClick={refresh} disabled={isRefreshing}>재시도</CameraTextButton></RefreshNotice>}
      {isLoading ? <CameraState role="status"><LoadingIcon /><strong>CCTV 목록을 불러오는 중입니다.</strong></CameraState>
        : error ? <CameraState $error role="alert"><AlertCircle size={28} aria-hidden="true" /><strong>CCTV 목록을 불러오지 못했습니다.</strong><p>서버 연결을 확인하고 다시 시도해주세요.</p><CameraTextButton type="button" onClick={refresh}><RefreshCw size={16} aria-hidden="true" />재시도</CameraTextButton></CameraState>
          : !cameras.length ? <CameraState><Cctv size={28} aria-hidden="true" /><strong>등록된 CCTV가 없습니다.</strong><p>카메라를 연결하면 이곳에 표시됩니다.</p><CameraTextButton type="button" onClick={refresh}>새로고침</CameraTextButton></CameraState>
            : !visibleCameras.length ? <CameraState role="status"><SearchX size={28} aria-hidden="true" /><strong>{normalizedQuery ? '검색 결과가 없습니다.' : '확인이 필요한 CCTV가 없습니다.'}</strong><p>{normalizedQuery ? '다른 이름이나 번호로 검색해주세요.' : '전체 목록에서 카메라를 확인할 수 있습니다.'}</p><CameraTextButton type="button" onClick={clearFilters}>전체 목록 보기</CameraTextButton></CameraState>
              : <CameraRows aria-busy={isRefreshing}>{visibleCameras.map(camera => <CameraRow key={camera.id} camera={camera} selected={selectedCamera?.id === camera.id} onOpen={openCamera} />)}</CameraRows>}
      {!isLoading && !error && <UpdateTime>{isRefreshing ? '목록을 새로 불러오는 중...' : `최근 조회 ${updateTime}`}</UpdateTime>}
      <AnimatePresence>{selectedCamera && <CameraViewer key={selectedCamera.id} camera={selectedCamera} onClose={closeCamera} />}</AnimatePresence>
    </CameraSection>
  );
});

/** 훅의 초 단위 카운트다운이 카메라 목록 전체를 다시 그리지 않도록 분리한다. */
export default function MobileCctvList() {
  const { cameras, isLoading, error, refresh, isRefreshing, refreshError, lastUpdatedAt } = useCctvMonitoring();
  return <ListView cameras={cameras} isLoading={isLoading} error={error} refresh={refresh} isRefreshing={isRefreshing} refreshError={refreshError} lastUpdatedAt={lastUpdatedAt} />;
}
