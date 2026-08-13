'use client';

import React, { useMemo } from 'react';
import { Activity, Bot, ChevronRight, Cpu, Droplets, Gauge, Thermometer } from 'lucide-react';
import { AIAdvisor } from '@/components/smart-factory-viewer/AIAdvisor';
import type { ApiDataItem, UnitData, ViewerLayoutType, ViewerUiMode } from '@/types/smartFactoryViewer';
import {
  findApiItemByUnitName,
  formatUnitName,
  isDefectResult,
} from '@/utils/smartFactoryViewer';
import {
  AccentLine,
  ActionButton,
  CommandCell,
  CommandGrid,
  CommandHeader,
  CommandKpiCard,
  CommandKpiGrid,
  CommandKpiLabel,
  CommandKpiValue,
  CommandRow,
  CommandTable,
  CommandTableBody,
  CommandTableHead,
  CountBadge,
  DetailPanel,
  DetailScroll,
  EmptyState,
  InfoLabel,
  InfoRow,
  InfoValue,
  ListContainer,
  ListItem,
  ListSubText,
  ListTitle,
  MetricCard,
  MetricGrid,
  MetricLabel,
  MetricValue,
  OperatorHeroBody,
  OperatorHeroStatus,
  OperatorHeroTitle,
  OverviewAdvisorCard,
  OverviewDock,
  OverviewStatusCard,
  Panel,
  SectionEyebrow,
  SectionHeader,
  SectionTitle,
  UnitText,
} from '@/styles/smartFactoryViewer.styles';

interface InfoPanelsProps {
  activeTab: string;
  layout: ViewerLayoutType;
  mode: ViewerUiMode;
  hoveredInfo: UnitData | null;
  errorUnits: UnitData[];
  apiData: ApiDataItem[];
  injectUnit: ApiDataItem | null;
  isFallback: boolean;
}

function BalancedOverview({
  activeTab,
  mode,
  apiData,
  errorUnits,
  isFallback,
}: Pick<InfoPanelsProps, 'activeTab' | 'mode' | 'apiData' | 'errorUnits' | 'isFallback'>) {
  const warningCount = 0;
  const errorCount = errorUnits.length;
  const normalCount = Math.max(apiData.length - errorCount, 0);
  const focusUnit = errorUnits[0] ?? null;
  const tone = errorCount > 0 ? 'error' : isFallback ? 'offline' : 'normal';
  const statusTitle = tone === 'error'
    ? '주의 필요'
    : tone === 'offline'
      ? '데이터 연결 확인'
      : '정상 운전';
  const statusDetail = tone === 'offline'
    ? apiData.length > 0 ? '최근 수신 데이터 표시 중' : '데이터 수신 대기 중'
    : focusUnit
      ? `${focusUnit.name} ${focusUnit.problem ?? '이상 상태'} 감지`
      : '현재 감지된 특이사항 없음';
  const advisorTitle = tone === 'offline'
    ? '데이터 연결 대기'
    : focusUnit
      ? `${focusUnit.name} 우선 확인`
      : '라인 상태 정상';
  const advisorMessage = tone === 'offline'
    ? '통신이 복구되면 최신 상태를 자동으로 반영합니다.'
    : focusUnit
      ? `${focusUnit.problem ?? '설비 상태'} · ${focusUnit.solution ?? '현장 점검 권장'}`
      : '모든 공정이 정상 범위에서 가동 중입니다.';

  const stats = [
    { label: '전체 설비', value: apiData.length, tone: '' },
    { label: '정상', value: normalCount, tone: 'normal' },
    { label: '주의', value: warningCount, tone: warningCount > 0 ? 'warning' : '' },
    { label: '오류', value: errorCount, tone: errorCount > 0 ? 'error' : '' },
  ];

  return (
    <OverviewDock>
      <OverviewStatusCard $mode={mode} $tone={tone}>
        <div className="status-summary">
          <div className="status-indicator" aria-hidden="true" />
          <div className="status-copy">
            <div className="eyebrow">{activeTab} · 관제 요약</div>
            <div className="title">{statusTitle}</div>
            <div className="detail">{statusDetail}</div>
          </div>
        </div>
        <div className="stats">
          {stats.map((stat) => (
            <div className="stat" key={stat.label}>
              <div className="stat-label">{stat.label}</div>
              <div className={`stat-value ${stat.tone}`}>{stat.value}</div>
            </div>
          ))}
        </div>
      </OverviewStatusCard>

      <OverviewAdvisorCard $mode={mode} $tone={tone}>
        <div className="advisor-icon"><Bot size={21} /></div>
        <div className="advisor-copy">
          <div className="advisor-header">
            <span>Factory AI</span>
            <span className="live-badge">● {tone === 'offline' ? 'OFFLINE' : 'LIVE'}</span>
          </div>
          <div className="advisor-title">{advisorTitle}</div>
          <div className="advisor-message">{advisorMessage}</div>
        </div>
        <div className="signal" aria-hidden="true"><span /><span /><span /></div>
      </OverviewAdvisorCard>
    </OverviewDock>
  );
}

const getActiveUnit = (hoveredInfo: UnitData | null, errorUnits: UnitData[]): UnitData => {
  return hoveredInfo ?? errorUnits[0] ?? {
    name: 'OP1',
    status: 'normal',
    temp: 0,
    load: 0,
  };
};

const getNormalCount = (apiData: ApiDataItem[], errorUnits: UnitData[]) => {
  return Math.max(apiData.length - errorUnits.length, 0);
};

const getYieldRate = (apiData: ApiDataItem[], errorUnits: UnitData[]) => {
  if (apiData.length === 0) return '0.0';
  return ((getNormalCount(apiData, errorUnits) / apiData.length) * 100).toFixed(1);
};

const getTimeLabel = (value: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

function OperatorStatusPanel({
  mode,
  apiData,
  errorUnits,
  isFallback,
}: Pick<InfoPanelsProps, 'mode' | 'apiData' | 'errorUnits' | 'isFallback'>) {
  const normalCount = getNormalCount(apiData, errorUnits);
  const hasError = errorUnits.length > 0;

  return (
    <Panel $mode={mode} $uiMode={mode}>
      <SectionHeader>
        <div>
          <SectionEyebrow $mode={mode}>OPERATOR OVERVIEW</SectionEyebrow>
          <SectionTitle $mode={mode}>작업자 운영 화면</SectionTitle>
        </div>
        <CountBadge $mode={mode} $tone={hasError ? 'error' : 'normal'}>
          {hasError ? '확인 필요' : '정상 운전'}
        </CountBadge>
      </SectionHeader>
      <OperatorHeroBody $mode={mode} $tone={hasError ? 'error' : 'normal'}>
        <OperatorHeroStatus $mode={mode} $tone={hasError ? 'error' : 'normal'}>
          {hasError ? `${errorUnits.length}건 이상 감지` : '라인 안정'}
        </OperatorHeroStatus>
        <OperatorHeroTitle $mode={mode}>
          {hasError ? `${errorUnits[0]?.name ?? '유닛'} 우선 점검` : '현재 공정 특이사항 없음'}
        </OperatorHeroTitle>
      </OperatorHeroBody>
      <MetricGrid>
        <MetricCard $mode={mode}>
          <MetricLabel $mode={mode}>총 대차</MetricLabel>
          <MetricValue $mode={mode}>{apiData.length}</MetricValue>
        </MetricCard>
        <MetricCard $mode={mode}>
          <MetricLabel $mode={mode}>정상</MetricLabel>
          <MetricValue $mode={mode} $tone="normal">{normalCount}</MetricValue>
        </MetricCard>
        <MetricCard $mode={mode}>
          <MetricLabel $mode={mode}>불량</MetricLabel>
          <MetricValue $mode={mode} $tone={hasError ? 'error' : 'normal'}>{errorUnits.length}</MetricValue>
        </MetricCard>
        <MetricCard $mode={mode}>
          <MetricLabel $mode={mode}>데이터</MetricLabel>
          <MetricValue $mode={mode}>{isFallback ? 'OFFLINE' : 'LIVE'}</MetricValue>
        </MetricCard>
      </MetricGrid>
    </Panel>
  );
}

function ActiveUnitPanel({
  mode,
  hoveredInfo,
  errorUnits,
  apiData,
}: Pick<InfoPanelsProps, 'mode' | 'hoveredInfo' | 'errorUnits' | 'apiData'>) {
  const activeUnit = getActiveUnit(hoveredInfo, errorUnits);
  const matchedData = findApiItemByUnitName(apiData, activeUnit.name);
  const isError = activeUnit.status === 'error';

  return (
    <Panel $mode={mode} $uiMode={mode}>
      <SectionHeader>
        <div>
          <SectionEyebrow $mode={mode}>ACTIVE UNIT</SectionEyebrow>
          <SectionTitle $mode={mode}>
            <Cpu size={19} />
            {activeUnit.name}
          </SectionTitle>
        </div>
        <CountBadge $mode={mode} $tone={isError ? 'error' : 'normal'}>
          {isError ? 'CHECK' : 'NORMAL'}
        </CountBadge>
      </SectionHeader>
      <AccentLine $mode={mode} $tone={isError ? 'error' : 'normal'} />
      <InfoRow $mode={mode} $uiMode={mode}>
        <InfoLabel $mode={mode}>
          <Activity size={15} />
          작동 상태
        </InfoLabel>
        <InfoValue $mode={mode} $tone={isError ? 'error' : 'normal'}>
          {isError ? '점검 필요' : '정상'}
        </InfoValue>
      </InfoRow>
      <InfoRow $mode={mode} $uiMode={mode}>
        <InfoLabel $mode={mode}>
          <Droplets size={15} />
          R액 압력
        </InfoLabel>
        <InfoValue $mode={mode}>
          {matchedData?.['R액 압력(kg/㎥)'] ?? '-'}
          <UnitText $mode={mode}>bar</UnitText>
        </InfoValue>
      </InfoRow>
      <InfoRow $mode={mode} $uiMode={mode}>
        <InfoLabel $mode={mode}>
          <Gauge size={15} />
          P액 압력
        </InfoLabel>
        <InfoValue $mode={mode}>
          {matchedData?.['P액 압력(kg/㎥)'] ?? '-'}
          <UnitText $mode={mode}>bar</UnitText>
        </InfoValue>
      </InfoRow>
      <InfoRow $mode={mode} $uiMode={mode}>
        <InfoLabel $mode={mode}>
          <Thermometer size={15} />
          가조립 온도
        </InfoLabel>
        <InfoValue $mode={mode} $tone={isError ? 'error' : undefined}>
          {matchedData?.['가조립온도(℃)'] ?? '-'}
          <UnitText $mode={mode}>°C</UnitText>
        </InfoValue>
      </InfoRow>
    </Panel>
  );
}

function DefectPanel({ mode, errorUnits }: Pick<InfoPanelsProps, 'mode' | 'errorUnits'>) {
  return (
    <Panel $mode={mode} $uiMode={mode}>
      <SectionHeader>
        <div>
          <SectionEyebrow $mode={mode}>DEFECT QUEUE</SectionEyebrow>
          <SectionTitle $mode={mode}>이상 오브젝트</SectionTitle>
        </div>
        <CountBadge $mode={mode} $tone={errorUnits.length > 0 ? 'error' : 'normal'}>
          {errorUnits.length}건
        </CountBadge>
      </SectionHeader>
      <AccentLine $mode={mode} $tone={errorUnits.length > 0 ? 'error' : 'normal'} />
      <ListContainer
        $mode={mode}
        $uiMode={mode}
        $tone={errorUnits.length > 0 ? 'error' : 'normal'}
      >
        {errorUnits.length > 0 ? (
          errorUnits.map((unit) => (
            <ListItem key={unit.name} $mode={mode} $uiMode={mode}>
              <div>
                <ListTitle $mode={mode}>{unit.name}</ListTitle>
                <ListSubText $mode={mode}>{unit.problem} / {unit.temp}°C</ListSubText>
              </div>
              <ActionButton type="button" $mode={mode}>
                확인
              </ActionButton>
            </ListItem>
          ))
        ) : (
          <EmptyState $mode={mode}>현재 감지된 이상 없음</EmptyState>
        )}
      </ListContainer>
    </Panel>
  );
}

function InjectionPanel({ mode, injectUnit }: Pick<InfoPanelsProps, 'mode' | 'injectUnit'>) {
  return (
    <Panel $mode={mode} $uiMode={mode}>
      <SectionHeader>
        <div>
          <SectionEyebrow $mode={mode}>INJECTION MONITOR</SectionEyebrow>
          <SectionTitle $mode={mode}>주입 공정</SectionTitle>
        </div>
        <ActionButton type="button" $mode={mode}>
          전체보기 <ChevronRight size={13} />
        </ActionButton>
      </SectionHeader>
      <AccentLine $mode={mode} $tone="normal" />
      {injectUnit ? (
        <>
          <InfoRow $mode={mode} $uiMode={mode}>
            <InfoLabel $mode={mode}>현재 활성 유닛</InfoLabel>
            <InfoValue $mode={mode}>{formatUnitName(injectUnit.대차번호)}</InfoValue>
          </InfoRow>
          <InfoRow $mode={mode} $uiMode={mode}>
            <InfoLabel $mode={mode}>P액 유량</InfoLabel>
            <InfoValue $mode={mode}>{injectUnit['P액 유량(g)']}<UnitText $mode={mode}>g</UnitText></InfoValue>
          </InfoRow>
          <InfoRow $mode={mode} $uiMode={mode}>
            <InfoLabel $mode={mode}>R액 유량</InfoLabel>
            <InfoValue $mode={mode}>{injectUnit['R액 유량(g)']}<UnitText $mode={mode}>g</UnitText></InfoValue>
          </InfoRow>
          <InfoRow $mode={mode} $uiMode={mode}>
            <InfoLabel $mode={mode}>헤드 온도(P)</InfoLabel>
            <InfoValue $mode={mode}>{injectUnit['P액 헤드온도(℃)']}<UnitText $mode={mode}>°C</UnitText></InfoValue>
          </InfoRow>
          <InfoRow $mode={mode} $uiMode={mode}>
            <InfoLabel $mode={mode}>헤드 온도(R)</InfoLabel>
            <InfoValue $mode={mode}>{injectUnit['R액 헤드온도(℃)']}<UnitText $mode={mode}>°C</UnitText></InfoValue>
          </InfoRow>
        </>
      ) : (
        <EmptyState $mode={mode}>데이터 수신 대기 중...</EmptyState>
      )}
    </Panel>
  );
}

function CommandKpiPanel({
  mode,
  apiData,
  errorUnits,
  isFallback,
}: Pick<InfoPanelsProps, 'mode' | 'apiData' | 'errorUnits' | 'isFallback'>) {
  const normalCount = getNormalCount(apiData, errorUnits);
  const yieldRate = getYieldRate(apiData, errorUnits);

  return (
    <Panel $mode={mode} $uiMode={mode}>
      <CommandHeader $mode={mode}>
        <span>LINE TELEMETRY</span>
        <strong>{isFallback ? 'OFFLINE' : 'LIVE STREAM'}</strong>
      </CommandHeader>
      <CommandKpiGrid>
        <CommandKpiCard $mode={mode}>
          <CommandKpiLabel $mode={mode}>TOTAL</CommandKpiLabel>
          <CommandKpiValue $mode={mode}>{apiData.length}</CommandKpiValue>
        </CommandKpiCard>
        <CommandKpiCard $mode={mode}>
          <CommandKpiLabel $mode={mode}>NORMAL</CommandKpiLabel>
          <CommandKpiValue $mode={mode} $tone="normal">{normalCount}</CommandKpiValue>
        </CommandKpiCard>
        <CommandKpiCard $mode={mode}>
          <CommandKpiLabel $mode={mode}>DEFECT</CommandKpiLabel>
          <CommandKpiValue $mode={mode} $tone={errorUnits.length > 0 ? 'error' : 'normal'}>{errorUnits.length}</CommandKpiValue>
        </CommandKpiCard>
        <CommandKpiCard $mode={mode}>
          <CommandKpiLabel $mode={mode}>YIELD</CommandKpiLabel>
          <CommandKpiValue $mode={mode}>{yieldRate}%</CommandKpiValue>
        </CommandKpiCard>
      </CommandKpiGrid>
    </Panel>
  );
}

function CommandTelemetryPanel({ mode, apiData }: Pick<InfoPanelsProps, 'mode' | 'apiData'>) {
  const rows = useMemo(() => apiData.slice(0, 8), [apiData]);

  return (
    <Panel $mode={mode} $uiMode={mode}>
      <CommandHeader $mode={mode}>
        <span>PROCESS MATRIX</span>
        <strong>{rows.length} ROWS</strong>
      </CommandHeader>
      <CommandTable $mode={mode}>
        <CommandTableHead $mode={mode}>
          <CommandCell>UNIT</CommandCell>
          <CommandCell>RESULT</CommandCell>
          <CommandCell>R-PRESS</CommandCell>
          <CommandCell>P-PRESS</CommandCell>
          <CommandCell>TEMP</CommandCell>
        </CommandTableHead>
        <CommandTableBody>
          {rows.map((item) => {
            const isError = isDefectResult(item.RESULT002);

            return (
              <CommandRow key={`${item.대차번호}-${item.TIMEVALUE}`} $mode={mode} $tone={isError ? 'error' : 'normal'}>
                <CommandCell>{formatUnitName(item.대차번호)}</CommandCell>
                <CommandCell>{item.RESULT002}</CommandCell>
                <CommandCell>{item['R액 압력(kg/㎥)']}</CommandCell>
                <CommandCell>{item['P액 압력(kg/㎥)']}</CommandCell>
                <CommandCell>{item['가조립온도(℃)']}</CommandCell>
              </CommandRow>
            );
          })}
        </CommandTableBody>
      </CommandTable>
    </Panel>
  );
}

function CommandDefectPanel({ mode, apiData }: Pick<InfoPanelsProps, 'mode' | 'apiData'>) {
  const rows = apiData.filter((item) => isDefectResult(item.RESULT002)).slice(0, 7);

  return (
    <Panel $mode={mode} $uiMode={mode}>
      <CommandHeader $mode={mode}>
        <span>ANOMALY QUEUE</span>
        <strong>{rows.length} ACTIVE</strong>
      </CommandHeader>
      {rows.length > 0 ? (
        <CommandGrid>
          {rows.map((item) => (
            <CommandRow key={`defect-${item.대차번호}-${item.TIMEVALUE}`} $mode={mode} $tone="error">
              <CommandCell>{formatUnitName(item.대차번호)}</CommandCell>
              <CommandCell>{item.RESULT002}</CommandCell>
              <CommandCell>{getTimeLabel(item.AI_TIME_STR || item.TIMEVALUE)}</CommandCell>
            </CommandRow>
          ))}
        </CommandGrid>
      ) : (
        <EmptyState $mode={mode}>ANOMALY QUEUE CLEAR</EmptyState>
      )}
    </Panel>
  );
}

function CommandInjectionPanel({ mode, injectUnit }: Pick<InfoPanelsProps, 'mode' | 'injectUnit'>) {
  return (
    <Panel $mode={mode} $uiMode={mode}>
      <CommandHeader $mode={mode}>
        <span>INJECTION SENSOR</span>
        <strong>{injectUnit ? formatUnitName(injectUnit.대차번호) : 'WAIT'}</strong>
      </CommandHeader>
      {injectUnit ? (
        <CommandKpiGrid>
          <CommandKpiCard $mode={mode}>
            <CommandKpiLabel $mode={mode}>P FLOW</CommandKpiLabel>
            <CommandKpiValue $mode={mode}>{injectUnit['P액 유량(g)']}</CommandKpiValue>
          </CommandKpiCard>
          <CommandKpiCard $mode={mode}>
            <CommandKpiLabel $mode={mode}>R FLOW</CommandKpiLabel>
            <CommandKpiValue $mode={mode}>{injectUnit['R액 유량(g)']}</CommandKpiValue>
          </CommandKpiCard>
          <CommandKpiCard $mode={mode}>
            <CommandKpiLabel $mode={mode}>P HEAD</CommandKpiLabel>
            <CommandKpiValue $mode={mode}>{injectUnit['P액 헤드온도(℃)']}°</CommandKpiValue>
          </CommandKpiCard>
          <CommandKpiCard $mode={mode}>
            <CommandKpiLabel $mode={mode}>R HEAD</CommandKpiLabel>
            <CommandKpiValue $mode={mode}>{injectUnit['R액 헤드온도(℃)']}°</CommandKpiValue>
          </CommandKpiCard>
        </CommandKpiGrid>
      ) : (
        <EmptyState $mode={mode}>SENSOR STREAM WAITING</EmptyState>
      )}
    </Panel>
  );
}

export const InfoPanels = React.memo((props: InfoPanelsProps) => {
  const { activeTab, layout, mode, hoveredInfo, errorUnits, apiData, injectUnit, isFallback } = props;

  if (layout === 'modelOnly') return null;

  if (layout === 'detailRight') {
    return (
      <DetailPanel $mode={mode} $uiMode={mode}>
        <DetailScroll $uiMode={mode}>
          {mode === 'operator' ? (
            <>
              <OperatorStatusPanel mode={mode} apiData={apiData} errorUnits={errorUnits} isFallback={isFallback} />
              <AIAdvisor mode={mode} errors={errorUnits} compact />
              <ActiveUnitPanel mode={mode} hoveredInfo={hoveredInfo} errorUnits={errorUnits} apiData={apiData} />
              <InjectionPanel mode={mode} injectUnit={injectUnit} />
              <DefectPanel mode={mode} errorUnits={errorUnits} />
            </>
          ) : (
            <>
              <CommandKpiPanel mode={mode} apiData={apiData} errorUnits={errorUnits} isFallback={isFallback} />
              <CommandTelemetryPanel mode={mode} apiData={apiData} />
              <CommandInjectionPanel mode={mode} injectUnit={injectUnit} />
              <CommandDefectPanel mode={mode} apiData={apiData} />
              <AIAdvisor mode={mode} errors={errorUnits} compact />
            </>
          )}
        </DetailScroll>
      </DetailPanel>
    );
  }

  return (
    <BalancedOverview
      activeTab={activeTab}
      mode={mode}
      apiData={apiData}
      errorUnits={errorUnits}
      isFallback={isFallback}
    />
  );
});

InfoPanels.displayName = 'InfoPanels';
