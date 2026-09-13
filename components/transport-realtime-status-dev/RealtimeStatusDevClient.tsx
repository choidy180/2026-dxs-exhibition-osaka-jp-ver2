'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Box, CheckCheck, Circle, Clock3, FlaskConical, Info, Loader2, Map as MapIcon, MapPin, Navigation, Radio, RefreshCw, Route, Search, Truck, Wifi, X, AlertCircle, Eye, EyeOff, LocateFixed } from 'lucide-react';
import SelectField from '@/components/common/select/SelectField';
import { useRealtimeTransportData } from '@/hooks/use-realtime-transport-data';
import type { TransportVehicle } from '@/types/realtime-transport';
import { formatDuration, formatTransportTime } from '@/utils/realtime-transport';
import type { VWorldMarker } from '@/components/vworld-map-dev';
import { motionDuration } from '@/styles/design-tokens';
import * as S from './styles';

function LoadingState({ map = false }: { map?: boolean }) {
  const reducedMotion = useReducedMotion();
  return <S.StateBox role="status">
    <motion.span animate={reducedMotion ? undefined : { rotate: 360 }} transition={{ repeat: Infinity, duration: motionDuration.spin, ease: 'linear' }}><Loader2 size={28} /></motion.span>
    <h3>{map ? '지도를 불러오는 중...' : '운행 데이터 조회 중...'}</h3>
  </S.StateBox>;
}

const TransportMap = dynamic(() => import('@/components/vworld-map-dev'), { ssr: false, loading: () => <LoadingState map /> });
const Transport3DMap = dynamic(() => import('@/components/transport-3d-map'), { ssr: false, loading: () => <LoadingState map /> });
const MAP_PADDING: [number, number, number, number] = [80, 80, 80, 80];
type StatusFilter = 'all' | 'Moving' | 'Arrived';
const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [{ value: 'all', label: '전체' }, { value: 'Moving', label: '운행 중' }, { value: 'Arrived', label: '도착' }];

function VehicleCard({ vehicle, selected, onSelect }: { vehicle: TransportVehicle; selected: boolean; onSelect: () => void }) {
  const arrived = vehicle.status === 'Arrived';
  return <S.VehicleCard type="button" $selected={selected} aria-pressed={selected} aria-label={`${vehicle.vehicleNo} 운행 상세`} onClick={onSelect}>
    <span className="card-head"><span className="vehicle-no">{vehicle.vehicleNo}</span><S.Badge $tone={arrived ? 'neutral' : 'success'}>{arrived ? '도착' : '운행 중'}</S.Badge></span>
    <span className="route"><span><Circle size={12} /><b>{vehicle.startPos.title}</b></span><span><MapPin size={12} /><b>{vehicle.destPos.title}</b></span></span>
    <S.ProgressTrack as="span" $progress={vehicle.progress} $arrived={arrived} />
    <span className="card-foot"><span>{formatTransportTime(vehicle.startTime)} 출발</span><strong>{arrived ? '운행 완료' : `${formatDuration(vehicle.remainingSeconds)} 남음`}</strong></span>
  </S.VehicleCard>;
}

function VehicleDetail({ vehicle, onClose }: { vehicle: TransportVehicle; onClose: () => void }) {
  const arrived = vehicle.status === 'Arrived';
  return <S.Detail aria-label="선택 차량 상세">
    <div className="detail-head"><div className="detail-heading"><Truck size={18} /><h3>{vehicle.vehicleNo}</h3><S.Badge $tone={arrived ? 'neutral' : 'success'}>{arrived ? '도착' : '운행 중'}</S.Badge></div><S.Button type="button" aria-label="차량 선택 해제" onClick={onClose}><X size={15} /></S.Button></div>
    <div className="journey"><div><strong>{vehicle.startPos.title}</strong><span>{formatTransportTime(vehicle.startTime)} 출발</span></div><ArrowRight size={18} /><div><strong>{vehicle.destPos.title}</strong><span>{arrived ? '운행 완료' : `${formatDuration(vehicle.remainingSeconds)} 후 도착 예상`}</span></div></div>
    <div className="detail-grid"><div><span>운전자</span><strong>{vehicle.driver || '-'}</strong></div><div><span>운행 횟수</span><strong>{vehicle.dailyTripCount.toLocaleString('ko-KR')}회</strong></div><div><span>예상 진행률</span><strong>{Math.round(vehicle.progress * 100).toLocaleString('ko-KR')}%</strong></div></div>
    <S.ProgressTrack $progress={vehicle.progress} $arrived={arrived} />
  </S.Detail>;
}

export default function RealtimeStatusDevClient() {
  const { vehicles, markers, isLoading, error, lastUpdated, isSampleMode, setIsSampleMode, refreshData } = useRealtimeTransportData();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [destination, setDestination] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<'2d' | '3d'>('3d');
  const [showLabels, setShowLabels] = useState(false);
  const [mapRevision, setMapRevision] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const counts = useMemo(() => ({ all: vehicles.length, Moving: vehicles.filter(vehicle => vehicle.status === 'Moving').length, Arrived: vehicles.filter(vehicle => vehicle.status === 'Arrived').length }), [vehicles]);
  const destinations = useMemo(() => [{ value: 'all', label: '모든 도착지' }, ...Array.from(new Set(vehicles.map(vehicle => vehicle.destPos.title))).sort().map(title => ({ value: title, label: title }))], [vehicles]);
  const activeDestination = destinations.some(option => option.value === destination) ? destination : 'all';
  const filteredVehicles = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('ko-KR');
    return vehicles.filter(vehicle => (statusFilter === 'all' || vehicle.status === statusFilter)
      && (activeDestination === 'all' || vehicle.destPos.title === activeDestination)
      && (!keyword || [vehicle.vehicleNo, vehicle.driver, vehicle.startPos.title, vehicle.destPos.title].some(value => value.toLocaleLowerCase('ko-KR').includes(keyword))));
  }, [vehicles, query, statusFilter, activeDestination]);
  const selectedVehicle = filteredVehicles.find(vehicle => vehicle.id === selectedId) ?? null;
  const visibleMarkers = useMemo(() => {
    const visibleIds = new Set(filteredVehicles.map(vehicle => vehicle.id));
    return markers.filter(marker => marker.isFacility || visibleIds.has(String(marker.id)));
  }, [filteredVehicles, markers]);
  const selectedMarkerIds = useMemo(() => selectedVehicle ? [selectedVehicle.id] : [], [selectedVehicle]);
  const visibleMovingCount = filteredVehicles.filter(vehicle => vehicle.status === 'Moving').length;

  const clearSelection = useCallback(() => setSelectedId(null), []);
  const selectMarker = useCallback((marker: VWorldMarker) => {
    if (marker.isFacility) return;
    setSelectedId(String(marker.id));
    // 지도에서 고른 차량이 목록 스크롤 아래에 있으면 해당 카드를 함께 보여준다.
    const cards = listRef.current?.querySelectorAll<HTMLButtonElement>('button[aria-label]');
    cards?.forEach(card => {
      if (card.getAttribute('aria-label') === `${marker.vehicleNo} 운행 상세`) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }, []);
  const resetFilters = () => { setQuery(''); setStatusFilter('all'); setDestination('all'); setSelectedId(null); };
  const toggleSample = () => { resetFilters(); setIsSampleMode(!isSampleMode); };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target as HTMLElement;
      if (event.key === 'Escape') clearSelection();
      if (target.closest('input, button, a, [role="listbox"]')) return;
      if (event.key === 'Enter') void refreshData();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [clearSelection, refreshData]);

  const metricValue = (value: number) => isLoading || error ? '-' : value.toLocaleString('ko-KR');
  const mapProps = { markers: error || isLoading ? markers.filter(marker => marker.isFacility) : visibleMarkers, focusedTitle: selectedVehicle?.id ?? null, selectedMarkerIds, markerInfoMode: showLabels ? 'all' as const : 'hidden' as const, onMarkerClick: selectMarker, onMapBlankClick: clearSelection };

  return <S.Shell>
    <S.Topbar>
      <div className="identity"><Route size={24} /><div><div className="eyebrow">TRANSPORT CONTROL</div><h1>실시간 운행 현황</h1></div><S.Badge $tone="info"><FlaskConical size={12} />개발 버전</S.Badge>{isSampleMode && <S.Badge $tone="warning">샘플 데이터</S.Badge>}</div>
      <div className="actions"><S.OriginalLink href="/transport/realtime-status">기존 화면 보기<ArrowUpRight size={14} /></S.OriginalLink></div>
    </S.Topbar>
    <S.Workspace>
      <S.InformationPanel aria-label="운행 정보">
        <S.PanelIntro>
          <div className="heading"><h2>오늘의 운행</h2><S.Button type="button" onClick={() => void refreshData()} disabled={isLoading}><RefreshCw size={14} />새로고침</S.Button></div>
          <p className="caption">차량을 선택하면 운행 정보와 지도 위치를 함께 확인할 수 있습니다.</p>
          <S.Metrics className="summary" aria-label="운행 요약" aria-busy={isLoading}>
            <div><span className="label"><Truck size={14} />전체 운행</span><div><strong>{metricValue(counts.all)}</strong><small>건</small></div></div>
            <div><span className="label"><Navigation size={14} />운행 중</span><div><strong>{metricValue(counts.Moving)}</strong><small>건</small></div></div>
            <div><span className="label"><CheckCheck size={14} />도착</span><div><strong>{metricValue(counts.Arrived)}</strong><small>건</small></div></div>
          </S.Metrics>
        </S.PanelIntro>
        <S.FilterArea>
          <div className="search-row"><S.SearchBox><Search size={16} /><input aria-label="차량 검색" placeholder="차량번호, 운전자, 운행 구간 검색" value={query} onChange={event => { setQuery(event.target.value); setSelectedId(null); }} /></S.SearchBox><SelectField placeholder="도착지" value={activeDestination} options={destinations} onChange={value => { setDestination(value); setSelectedId(null); }} width={148} /></div>
          <div className="filters">{STATUS_FILTERS.map(filter => <S.Button key={filter.value} type="button" $active={statusFilter === filter.value} aria-pressed={statusFilter === filter.value} onClick={() => { setStatusFilter(filter.value); setSelectedId(null); }}>{filter.label} {metricValue(counts[filter.value])}</S.Button>)}<span>최근 출발순</span></div>
        </S.FilterArea>
        <S.VehicleList ref={listRef} aria-label="차량 목록" aria-busy={isLoading}>
          {isLoading ? <LoadingState /> : error ? <S.StateBox $error role="alert"><AlertCircle size={28} /><h3>운행 정보를 불러오지 못했습니다</h3><p>{error}</p><S.Button type="button" onClick={() => void refreshData()}>다시 불러오기</S.Button></S.StateBox>
            : !filteredVehicles.length ? <S.StateBox role="status"><span className="state-icon">{vehicles.length ? <Search size={26} /> : <Truck size={26} />}</span><h3>{vehicles.length ? '검색 조건에 맞는 운행이 없습니다' : '현재 운행 중인 차량이 없습니다'}</h3><p>{vehicles.length ? '검색어나 도착지, 운행 상태를 변경해 보세요.' : '새로운 배차 정보가 수신되면 자동으로 갱신됩니다.'}</p><S.Button type="button" onClick={vehicles.length ? resetFilters : () => setIsSampleMode(true)}>{vehicles.length ? '필터 초기화' : '샘플 운행 보기'}<ArrowRight size={14} /></S.Button></S.StateBox>
              : <div className="cards">{filteredVehicles.map(vehicle => <VehicleCard key={vehicle.id} vehicle={vehicle} selected={vehicle.id === selectedVehicle?.id} onSelect={() => setSelectedId(vehicle.id === selectedId ? null : vehicle.id)} />)}</div>}
        </S.VehicleList>
        {!isLoading && !error && selectedVehicle && <VehicleDetail vehicle={selectedVehicle} onClose={clearSelection} />}
        <S.PanelFooter><span className="connection">{error ? <AlertCircle size={13} /> : <Wifi size={13} />}{isSampleMode ? '샘플 데이터' : error ? '연결 확인 필요' : '30초마다 자동 갱신'} · {lastUpdated ? lastUpdated.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '-'}</span><S.Button type="button" onClick={toggleSample} $active={isSampleMode}><FlaskConical size={13} />{isSampleMode ? '실제 운행 보기' : '샘플 보기'}</S.Button></S.PanelFooter>
      </S.InformationPanel>
      <S.MapPanel aria-label="운행 지도">
        <S.MapToolbar><h2><MapPin size={17} />운행 지도<S.Badge>{isLoading || error ? '-' : visibleMovingCount.toLocaleString('ko-KR')}건 운행 중</S.Badge></h2><div className="map-actions"><S.Button type="button" aria-label={showLabels ? '지도 차량 정보 숨기기' : '지도 차량 정보 표시'} aria-pressed={showLabels} onClick={() => setShowLabels(!showLabels)}>{showLabels ? <Eye size={15} /> : <EyeOff size={15} />}</S.Button><S.Button type="button" aria-label="지도 전체 경로 보기" onClick={() => { clearSelection(); setMapRevision(value => value + 1); }}><LocateFixed size={15} /></S.Button><div className="view-modes" role="group" aria-label="지도 보기 방식"><S.Button type="button" $active={mapMode === '2d'} aria-pressed={mapMode === '2d'} onClick={() => setMapMode('2d')}><MapIcon size={14} />2D 지도</S.Button><S.Button type="button" $active={mapMode === '3d'} aria-pressed={mapMode === '3d'} onClick={() => setMapMode('3d')}><Box size={14} />3D 지도</S.Button></div></div></S.MapToolbar>
        <S.MapStage>
          <S.MapCanvas>{mapMode === '2d' ? <TransportMap key={`2d-${mapRevision}`} {...mapProps} viewPadding={MAP_PADDING} focusOnSelection /> : <Transport3DMap key={`3d-${mapRevision}`} {...mapProps} />}</S.MapCanvas>
          {(isSampleMode || isLoading || error || !visibleMovingCount || selectedVehicle) && <S.MapNotice role="status">{isSampleMode ? <FlaskConical size={15} /> : <Radio size={15} />}{isLoading ? '운행 정보를 확인하고 있습니다' : error ? '운행 데이터 연결을 확인해 주세요' : selectedVehicle ? `${selectedVehicle.vehicleNo} · ${selectedVehicle.status === 'Arrived' ? '운행 완료' : '선택한 차량의 경로를 확인하세요'}` : !visibleMovingCount ? '운행 중인 차량이 없습니다 · 거점 위치를 표시합니다' : '샘플 운행 미리보기'}</S.MapNotice>}
        </S.MapStage>
        <S.MapFooter><span><Info size={13} />위치와 진행률은 출발 시각을 기준으로 추정합니다.</span><span><Clock3 size={13} />부산 · 창원 운송 구간</span></S.MapFooter>
      </S.MapPanel>
    </S.Workspace>
  </S.Shell>;
}
