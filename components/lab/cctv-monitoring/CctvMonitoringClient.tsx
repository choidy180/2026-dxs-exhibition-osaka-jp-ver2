'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Building2,
  Camera,
  CameraOff,
  ChevronDown,
  ChevronRight,
  Cctv,
  Expand,
  Info,
  LayoutGrid,
  List,
  Loader2,
  RefreshCw,
  Search,
  SearchX,
  Wifi,
  X,
} from 'lucide-react';
import {
  CCTV_STATUS_LABEL,
  THUMBNAIL_REFRESH_MS,
  USE_MOCK_DATA,
  formatRefreshInterval,
  formatRemainingTime,
} from '@/constants/cctv-monitoring';
import { useCctvMonitoring } from '@/hooks/use-cctv-monitoring';
import { getCctvCameraGroup, groupCctvCameras } from '@/utils/cctv-monitoring';
import type {
  CctvCamera,
  CctvCameraGroup,
  CctvCameraStatus,
} from '@/types/cctv-monitoring';
import type { ToneName } from '@/styles/design-tokens';
import CctvLivePlayer from './CctvLivePlayer';
import CctvThumbnail from './CctvThumbnail';
import {
  BuildingBlock,
  BuildingCardSection,
  BuildingCounts,
  BuildingHeader,
  BuildingIdentity,
  BuildingScroller,
  CameraCardBody,
  CameraCardButton,
  CameraCardGrid,
  CameraCode,
  CameraListPanel,
  CameraRowButton,
  CameraRowList,
  CameraRowText,
  CardCode,
  CardScroller,
  CardSectionHeader,
  CardThumbnail,
  CardViewPanel,
  ClearSearchButton,
  CloseButton,
  CountBadge,
  Header,
  HeaderActions,
  ListLayout,
  MetaItem,
  ModalBackdrop,
  ModalDialog,
  ModalFooter,
  ModalHeader,
  ModalStage,
  ModalTitle,
  NoticeBar,
  PageFontScope,
  PanelHeader,
  RefreshStatus,
  SearchField,
  Shell,
  SoftButton,
  StageHint,
  StageLabel,
  StageTime,
  StateActions,
  StateBox,
  StatusBadge,
  SummaryChip,
  TitleGroup,
  TitleIcon,
  Toolbar,
  ToolbarLeft,
  ToolbarRight,
  ViewModeButton,
  ViewModeControl,
  ViewerActions,
  ViewerFooter,
  ViewerHeader,
  ViewerPanel,
  ViewerStage,
  ViewerTitle,
  Workspace,
} from './styles';

type ViewMode = 'list' | 'card';

interface CameraGroup extends CctvCameraGroup {
  cameras: CctvCamera[];
  onlineCount: number;
}

const STATUS_TONE: Record<CctvCameraStatus, ToneName> = {
  online: 'success',
  offline: 'danger',
  maintenance: 'warning',
};

const normalizeSearch = (value: string) => value.trim().toLocaleLowerCase('ko-KR');

const formatTime = (value: string | null): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

const formatDateTime = (value: string | null): string => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  const datePart = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
  return `${datePart} ${formatTime(value)}`;
};

function CameraStatusBadge({ status }: { status: CctvCameraStatus }) {
  return (
    <StatusBadge $tone={STATUS_TONE[status]}>
      <span className="dot" aria-hidden="true" />
      {CCTV_STATUS_LABEL[status]}
    </StatusBadge>
  );
}

interface GroupToggleProps {
  group: CameraGroup;
  collapsed: boolean;
  onToggle: (groupId: string) => void;
  card?: boolean;
}

function GroupToggle({ group, collapsed, onToggle, card = false }: GroupToggleProps) {
  const HeaderComponent = card ? CardSectionHeader : BuildingHeader;

  return (
    <HeaderComponent
      type="button"
      onClick={() => onToggle(group.id)}
      aria-expanded={!collapsed}
      aria-controls={`${card ? 'card' : 'list'}-group-${encodeURIComponent(group.id)}`}
    >
      <BuildingIdentity>
        {collapsed ? <ChevronRight size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
        {group.kind === 'building'
          ? <Building2 size={17} aria-hidden="true" />
          : <Cctv size={17} aria-hidden="true" />}
        <strong>{group.label}</strong>
      </BuildingIdentity>
      <BuildingCounts>
        <span className="online">연결 {group.onlineCount.toLocaleString('ko-KR')}대</span>
        <span>전체 {group.cameras.length.toLocaleString('ko-KR')}대</span>
      </BuildingCounts>
    </HeaderComponent>
  );
}

interface CameraViewerProps {
  camera: CctvCamera | null;
  revision: number;
  onExpand: (camera: CctvCamera) => void;
}

function CameraViewer({ camera, revision, onExpand }: CameraViewerProps) {
  if (!camera) {
    return (
      <ViewerPanel>
        <StateBox>
          <span className="icon-circle"><Camera size={28} aria-hidden="true" /></span>
          <strong>확인할 CCTV를 선택해주세요</strong>
          <p>왼쪽 목록에서 카메라를 선택하면 최신 썸네일과 카메라 정보를 확인할 수 있습니다.</p>
        </StateBox>
      </ViewerPanel>
    );
  }

  return (
    <ViewerPanel>
      <ViewerHeader>
        <ViewerTitle>
          <Cctv size={22} aria-hidden="true" />
          <div>
            <h2>{camera.code}</h2>
            <p>{camera.name} · {camera.ipAddress || '-'}</p>
          </div>
        </ViewerTitle>
        <ViewerActions>
          <CameraStatusBadge status={camera.status} />
          <SoftButton type="button" onClick={() => onExpand(camera)}>
            <Expand size={15} aria-hidden="true" />
            크게 보기
          </SoftButton>
        </ViewerActions>
      </ViewerHeader>

      <ViewerStage>
        <CctvThumbnail camera={camera} revision={revision} large allowRetry sizes="70vw" />
        <StageLabel><Camera size={13} aria-hidden="true" />{camera.code}</StageLabel>
        <StageTime>{formatTime(camera.thumbnailUpdatedAt)}</StageTime>
        <StageHint>
          <Wifi size={13} aria-hidden="true" />
          {formatRefreshInterval(THUMBNAIL_REFRESH_MS)} 간격 스냅샷 · 클릭하면 실시간 영상
        </StageHint>
      </ViewerStage>

      <ViewerFooter>
        <MetaItem><span>설치 위치</span><strong>{camera.code}</strong></MetaItem>
        <MetaItem><span>카메라 IP</span><strong>{camera.ipAddress || '-'}</strong></MetaItem>
        <MetaItem><span>카메라명</span><strong>{camera.name}</strong></MetaItem>
        <MetaItem><span>최근 썸네일</span><strong>{formatTime(camera.thumbnailUpdatedAt)}</strong></MetaItem>
      </ViewerFooter>
    </ViewerPanel>
  );
}

interface CameraListProps {
  groups: CameraGroup[];
  collapsedGroups: Set<string>;
  selectedCameraId: string | null;
  revision: number;
  onToggleGroup: (groupId: string) => void;
  onSelect: (camera: CctvCamera) => void;
}

function CameraList({
  groups,
  collapsedGroups,
  selectedCameraId,
  revision,
  onToggleGroup,
  onSelect,
}: CameraListProps) {
  const totalCount = groups.reduce((sum, group) => sum + group.cameras.length, 0);

  return (
    <CameraListPanel>
      <PanelHeader>
        <div className="title">
          <List size={19} aria-hidden="true" />
          <h2>동·분류별 CCTV 목록</h2>
        </div>
        <CountBadge>{totalCount.toLocaleString('ko-KR')}대</CountBadge>
      </PanelHeader>
      <BuildingScroller>
        {groups.map(group => {
          const collapsed = collapsedGroups.has(group.id);
          return (
            <BuildingBlock key={group.id}>
              <GroupToggle
                group={group}
                collapsed={collapsed}
                onToggle={onToggleGroup}
              />
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <CameraRowList
                    id={`list-group-${encodeURIComponent(group.id)}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {group.cameras.map(camera => (
                      <CameraRowButton
                        key={camera.id}
                        type="button"
                        $selected={selectedCameraId === camera.id}
                        onClick={() => onSelect(camera)}
                        aria-pressed={selectedCameraId === camera.id}
                      >
                        <CctvThumbnail camera={camera} revision={revision} sizes="82px" />
                        <CameraRowText>
                          <strong>{camera.code}</strong>
                          <small>{camera.ipAddress || '-'}</small>
                        </CameraRowText>
                        <CameraCode>{camera.name}</CameraCode>
                      </CameraRowButton>
                    ))}
                  </CameraRowList>
                )}
              </AnimatePresence>
            </BuildingBlock>
          );
        })}
      </BuildingScroller>
    </CameraListPanel>
  );
}

interface CameraCardsProps {
  groups: CameraGroup[];
  collapsedGroups: Set<string>;
  selectedCameraId: string | null;
  revision: number;
  onToggleGroup: (groupId: string) => void;
  onOpenCamera: (camera: CctvCamera) => void;
}

function CameraCards({
  groups,
  collapsedGroups,
  selectedCameraId,
  revision,
  onToggleGroup,
  onOpenCamera,
}: CameraCardsProps) {
  return (
    <CardViewPanel>
      <CardScroller>
        {groups.map(group => {
          const collapsed = collapsedGroups.has(group.id);
          return (
            <BuildingCardSection key={group.id}>
              <GroupToggle
                group={group}
                collapsed={collapsed}
                onToggle={onToggleGroup}
                card
              />
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <CameraCardGrid
                    id={`card-group-${encodeURIComponent(group.id)}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {group.cameras.map(camera => (
                      <CameraCardButton
                        key={camera.id}
                        type="button"
                        $selected={selectedCameraId === camera.id}
                        onClick={() => onOpenCamera(camera)}
                        aria-label={`${camera.code} ${camera.name} 크게 보기`}
                        aria-pressed={selectedCameraId === camera.id}
                      >
                        <CardThumbnail>
                          <CctvThumbnail camera={camera} revision={revision} large sizes="(max-width: 1200px) 40vw, 270px" />
                        </CardThumbnail>
                        <CameraCardBody>
                          <span className="copy">
                            <strong>{camera.code}</strong>
                            <small>{camera.ipAddress || '-'}</small>
                          </span>
                          <CardCode>{camera.name}</CardCode>
                        </CameraCardBody>
                      </CameraCardButton>
                    ))}
                  </CameraCardGrid>
                )}
              </AnimatePresence>
            </BuildingCardSection>
          );
        })}
      </CardScroller>
    </CardViewPanel>
  );
}

interface CameraModalProps {
  camera: CctvCamera | null;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

function CameraModal({ camera, closeButtonRef, onClose }: CameraModalProps) {
  return (
    <AnimatePresence>
      {camera && (
        <>
          <ModalBackdrop
            key="cctv-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <ModalDialog
            key="cctv-modal-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cctv-modal-title"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.18 }}
          >
            <ModalHeader>
              <ModalTitle>
                <span className="eyebrow">CCTV LIVE · WHEP</span>
                <h2 id="cctv-modal-title">{camera.code} · {camera.ipAddress || '-'}</h2>
              </ModalTitle>
              <ViewerActions>
                <CameraStatusBadge status={camera.status} />
                <CloseButton ref={closeButtonRef} type="button" onClick={onClose} aria-label="CCTV 확대 화면 닫기">
                  <X size={18} aria-hidden="true" />
                </CloseButton>
              </ViewerActions>
            </ModalHeader>
            <ModalStage>
              <CctvLivePlayer camera={camera} />
              <StageLabel><Camera size={13} aria-hidden="true" />{camera.code}</StageLabel>
              <StageHint>
                <Wifi size={13} aria-hidden="true" />
                실시간 영상 · WebSocket JPEG 수신
              </StageHint>
            </ModalStage>
            <ModalFooter>
              <span className="meta">{getCctvCameraGroup(camera).label} · {camera.code}</span>
              <span>최근 갱신 {formatDateTime(camera.thumbnailUpdatedAt)}</span>
            </ModalFooter>
          </ModalDialog>
        </>
      )}
    </AnimatePresence>
  );
}

export default function CctvMonitoringClient({ testPanel }: { testPanel?: ReactNode } = {}) {
  const {
    cameras,
    isLoading,
    error,
    retry,
    refresh,
    lastUpdatedAt,
    nextRefreshSeconds,
    isRefreshing,
    refreshError,
    revision,
  } = useCctvMonitoring();

  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [modalCameraId, setModalCameraId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const normalizedQuery = normalizeSearch(searchQuery);
  const filteredCameras = useMemo(() => {
    if (!normalizedQuery) return cameras;

    return cameras.filter(camera =>
      [
        camera.code,
        camera.name,
        camera.ipAddress,
        getCctvCameraGroup(camera).label,
        camera.stream.path,
        CCTV_STATUS_LABEL[camera.status],
      ]
        .join(' ')
        .toLocaleLowerCase('ko-KR')
        .includes(normalizedQuery),
    );
  }, [cameras, normalizedQuery]);

  const groups = useMemo<CameraGroup[]>(
    () => groupCctvCameras(filteredCameras).map(group => ({
      ...group,
      onlineCount: group.cameras.filter(camera => camera.status === 'online').length,
    })),
    [filteredCameras],
  );

  const selectedCamera = useMemo(() => {
    const selectableCameras = groups.flatMap(group => group.cameras);
    return selectableCameras.find(camera => camera.id === selectedCameraId)
      ?? selectableCameras.find(camera => camera.status === 'online')
      ?? selectableCameras[0]
      ?? null;
  }, [groups, selectedCameraId]);
  const effectiveSelectedCameraId = selectedCamera?.id ?? null;
  const modalCamera = useMemo(
    () => cameras.find(camera => camera.id === modalCameraId) ?? null,
    [cameras, modalCameraId],
  );

  const onlineCount = cameras.filter(camera => camera.status === 'online').length;
  const attentionCount = cameras.length - onlineCount;

  useEffect(() => {
    if (!modalCameraId) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setModalCameraId(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [modalCameraId]);

  const toggleGroup = useCallback((groupId: string) => {
    setCollapsedGroups(current => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  const selectCamera = useCallback((camera: CctvCamera) => {
    setSelectedCameraId(camera.id);
  }, []);

  const openCamera = useCallback((camera: CctvCamera) => {
    setSelectedCameraId(camera.id);
    setModalCameraId(camera.id);
  }, []);

  const clearSearch = useCallback(() => setSearchQuery(''), []);

  const hasSearchResult = filteredCameras.length > 0;
  const refreshLabel = isRefreshing
    ? '썸네일 갱신 중'
    : nextRefreshSeconds === 0
      ? '탭 활성화 시 갱신'
      : `${formatRemainingTime(nextRefreshSeconds)} 후 갱신`;

  return (
    <PageFontScope>
      <Shell $hasTestPanel={!!testPanel}>
        {testPanel}
        <Header>
          <TitleGroup>
            <TitleIcon><Cctv size={24} aria-hidden="true" /></TitleIcon>
            <div>
              <span className="eyebrow">LAB · CCTV MONITORING{USE_MOCK_DATA ? ' · MOCK DATA' : ''}</span>
              <h1>상황 모니터링</h1>
              <p>카메라 번호별 최신 현장 스냅샷과 연결 상태를 한 화면에서 확인합니다.</p>
            </div>
          </TitleGroup>
          <HeaderActions>
            <SummaryChip $tone="neutral">전체 {cameras.length.toLocaleString('ko-KR')}대</SummaryChip>
            <SummaryChip $tone="success">연결됨 {onlineCount.toLocaleString('ko-KR')}대</SummaryChip>
            <SummaryChip $tone={attentionCount > 0 ? 'warning' : 'neutral'}>
              확인 필요 {attentionCount.toLocaleString('ko-KR')}대
            </SummaryChip>
            <ViewModeControl role="group" aria-label="CCTV 보기 방식">
              <ViewModeButton
                type="button"
                $active={viewMode === 'list'}
                onClick={() => setViewMode('list')}
                aria-pressed={viewMode === 'list'}
              >
                <List size={15} aria-hidden="true" />
                목록
              </ViewModeButton>
              <ViewModeButton
                type="button"
                $active={viewMode === 'card'}
                onClick={() => setViewMode('card')}
                aria-pressed={viewMode === 'card'}
              >
                <LayoutGrid size={15} aria-hidden="true" />
                카드
              </ViewModeButton>
            </ViewModeControl>
          </HeaderActions>
        </Header>

        <NoticeBar initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
          <Info size={17} aria-hidden="true" />
          <p>
            {USE_MOCK_DATA
              ? '개발 확인용 목업 데이터입니다. 실제 카메라 API는 연결되지 않습니다.'
              : `사내 카메라 목록 API를 연결했습니다. 썸네일은 ${formatRefreshInterval(THUMBNAIL_REFRESH_MS)}마다 갱신하며, 응답하지 않는 카메라는 연결 안 됨으로 표시합니다.`}
          </p>
        </NoticeBar>

        <Workspace>
          <Toolbar>
            <ToolbarLeft>
              <SearchField>
                <Search size={17} aria-hidden="true" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={event => {
                    setSearchQuery(event.target.value);
                    if (event.target.value) setCollapsedGroups(new Set());
                  }}
                  placeholder="설치 위치, IP, 카메라명, 동·분류 검색"
                  aria-label="CCTV 검색"
                />
                {searchQuery && (
                  <ClearSearchButton type="button" onClick={clearSearch} aria-label="CCTV 검색어 지우기">
                    <X size={14} aria-hidden="true" />
                  </ClearSearchButton>
                )}
              </SearchField>
            </ToolbarLeft>
            <ToolbarRight>
              <RefreshStatus $delayed={!!refreshError} aria-live="polite">
                <span className="live-dot" aria-hidden="true" />
                {refreshError ? '업데이트 지연' : refreshLabel}
                <span>· 최근 {formatTime(lastUpdatedAt)}</span>
              </RefreshStatus>
              <SoftButton type="button" onClick={refresh} disabled={isLoading || isRefreshing}>
                <RefreshCw className={isLoading || isRefreshing ? 'spin' : undefined} size={15} aria-hidden="true" />
                새로고침
              </SoftButton>
            </ToolbarRight>
          </Toolbar>

          {isLoading ? (
            <StateBox role="status">
              <span className="icon-circle"><Loader2 className="spin" size={28} aria-hidden="true" /></span>
              <strong>CCTV 목록을 불러오는 중...</strong>
              <p>동·분류별 카메라와 최신 썸네일 정보를 준비하고 있습니다.</p>
            </StateBox>
          ) : error ? (
            <StateBox $tone="danger" role="alert">
              <span className="icon-circle"><AlertCircle size={28} aria-hidden="true" /></span>
              <strong>CCTV 목록을 불러오지 못했습니다</strong>
              <p>네트워크 상태를 확인한 뒤 다시 시도해주세요.</p>
              <StateActions>
                <SoftButton type="button" onClick={retry}>
                  <RefreshCw size={15} aria-hidden="true" />
                  다시 시도
                </SoftButton>
              </StateActions>
            </StateBox>
          ) : cameras.length === 0 ? (
            <StateBox>
              <span className="icon-circle"><CameraOff size={28} aria-hidden="true" /></span>
              <strong>등록된 CCTV가 없습니다</strong>
              <p>API에 카메라가 등록되면 동·분류별 목록과 카드가 이 영역에 표시됩니다.</p>
              <StateActions>
                <SoftButton type="button" onClick={retry}>
                  <RefreshCw size={15} aria-hidden="true" />
                  다시 조회
                </SoftButton>
              </StateActions>
            </StateBox>
          ) : !hasSearchResult ? (
            <StateBox>
              <span className="icon-circle"><SearchX size={28} aria-hidden="true" /></span>
              <strong>검색 조건에 맞는 CCTV가 없습니다</strong>
              <p>카메라 번호나 스트림 경로를 다르게 입력해보세요.</p>
              <StateActions>
                <SoftButton type="button" onClick={clearSearch}>검색 초기화</SoftButton>
              </StateActions>
            </StateBox>
          ) : viewMode === 'list' ? (
            <ListLayout>
              <CameraList
                groups={groups}
                collapsedGroups={collapsedGroups}
                selectedCameraId={effectiveSelectedCameraId}
                revision={revision}
                onToggleGroup={toggleGroup}
                onSelect={selectCamera}
              />
              <CameraViewer camera={selectedCamera} revision={revision} onExpand={openCamera} />
            </ListLayout>
          ) : (
            <CameraCards
              groups={groups}
              collapsedGroups={collapsedGroups}
              selectedCameraId={effectiveSelectedCameraId}
              revision={revision}
              onToggleGroup={toggleGroup}
              onOpenCamera={openCamera}
            />
          )}
        </Workspace>

        <CameraModal
          camera={modalCamera}
          closeButtonRef={closeButtonRef}
          onClose={() => setModalCameraId(null)}
        />
      </Shell>
    </PageFontScope>
  );
}
