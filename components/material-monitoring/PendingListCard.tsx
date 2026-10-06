import React from 'react';
import { motion } from 'framer-motion';
import { FileWarning, Loader2 } from 'lucide-react';
import styled from 'styled-components';
import { color, controlHeight, focusRing, font, fontSize, motionDuration, radius, scrollbar, shadow, space, tone } from '@/styles/design-tokens';
import type { MaterialListItem, MaterialStats } from '@/types/material-monitoring';
import { compactText } from '@/utils/material-monitoring';
import { ViewAllButton } from './styles';

type Props = {
  pendingList: MaterialListItem[];
  stats: MaterialStats;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onOpenList: () => void;
};

const PendingItem = React.memo(({ item }: { item: MaterialListItem }) => (
  <Item>
    <div className="left-grp">
      <strong title={item.NmCustm}>{compactText(item.NmCustm, '업체 미지정', 12)}</strong>
      <code title={item.InvoiceNo}>{item.InvoiceNo || '-'}</code>
    </div>
    <Badge>{item.NmInspGB || '대기'}</Badge>
  </Item>
));
PendingItem.displayName = 'PendingItem';

export default function PendingListCard({ pendingList, stats, isLoading, error, onRetry, onOpenList }: Props) {
  return (
    <Card data-demo="inbound-pending">
      <Header>
        <Title>입고 대기 리스트</Title>
        <Count><span>총</span><strong>{pendingList.length.toLocaleString('ko-KR')}</strong><span>건</span></Count>
        <ViewAllButton onClick={onOpenList}>전체보기 &gt;</ViewAllButton>
      </Header>
      <ProgressCard>
        <div className="progress-heading">
          <span>금일 입고 진행률</span>
          <strong>{stats.percent}% <small>({stats.done}/{stats.total})</small></strong>
        </div>
        <ProgressTrack>
          <ProgressFill initial={{ width: 0 }} animate={{ width: `${stats.percent}%` }} transition={{ duration: motionDuration.enter }} />
        </ProgressTrack>
      </ProgressCard>
      <List>
        {isLoading ? (
          <State>
            <motion.span animate={{ rotate: 360 }} transition={{ duration: motionDuration.spin, repeat: Infinity, ease: 'linear' }}><Loader2 size={28} /></motion.span>
            <span>데이터 조회 중...</span>
          </State>
        ) : error ? (
          <State role="alert"><FileWarning size={28} /><span>{error}</span><Retry onClick={onRetry}>재시도</Retry></State>
        ) : pendingList.length ? (
          pendingList.map((item, index) => <PendingItem key={`${item.InvoiceNo || 'unknown'}-${index}`} item={item} />)
        ) : <State>항목이 없습니다.</State>}
      </List>
    </Card>
  );
}

const Card = styled.section`
  flex: 1; display: flex; flex-direction: column; min-height: 0; min-width: 0; overflow: hidden;
  padding: ${space.xxl}px; border: 1px solid ${color.borderSoft}; border-radius: ${radius.card}px;
  background: ${color.surface}; box-shadow: ${shadow.card};
`;
const Header = styled.div`
  display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: ${space.md}px;
  flex-shrink: 0;
  h2 { grid-column: 1 / -1; }
  > button { justify-self: end; }
`;
const Title = styled.h2`
  margin: 0; padding: 0; min-width: 0; color: ${color.ink};
  font-size: ${fontSize.cardTitle}; font-weight: 600; line-height: 1.3; overflow-wrap: anywhere;
`;
const Count = styled.span`
  display: inline-flex; align-items: center; justify-self: start; gap: ${space.xs}px; white-space: nowrap;
  padding: ${space.xs}px ${space.md}px; border: 1px solid ${color.brandBorder};
  border-radius: ${radius.control}px; color: ${color.brand}; background: ${color.brandSoft};
  font-size: ${fontSize.meta}; font-weight: 600;
  strong { font-weight: 600; }
`;
const ProgressCard = styled.div`
  flex-shrink: 0; margin-top: ${space.xxl}px; padding: ${space.xl}px;
  border: 1px solid ${color.border}; border-radius: ${radius.card}px;
  .progress-heading {
    display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between;
    gap: ${space.sm}px; margin-bottom: ${space.md}px; color: ${color.ink};
    font-size: ${fontSize.bodySm}; font-weight: 600;
  }
  strong { color: ${color.brand}; font-size: ${fontSize.cardTitle}; font-weight: 600; white-space: nowrap; }
  small { color: ${color.ink2}; font-size: ${fontSize.bodySm}; }
`;
const ProgressTrack = styled.div`
  height: ${space.md}px; overflow: hidden; border-radius: ${radius.bar}px; background: ${color.fill};
`;
const ProgressFill = styled(motion.div)`height: 100%; border-radius: inherit; background: ${color.brand};`;
const List = styled.div`
  flex: 1; min-height: 0; min-width: 0; overflow: auto; margin-top: ${space.lg}px; padding: ${space.md}px;
  border: 1px solid ${color.border}; border-radius: ${radius.card}px; background: ${color.surfaceSubtle};
  display: flex; flex-direction: column; gap: ${space.sm}px; ${scrollbar}
`;
const Item = styled.div`
  flex-shrink: 0; display: flex; align-items: center; flex-wrap: wrap; gap: ${space.sm}px;
  padding: ${space.lg}px; border: 1px solid ${color.borderSoft}; border-radius: ${radius.control}px; background: ${color.surface};
  .left-grp { flex: 1 1 120px; display: flex; flex-direction: column; gap: ${space.xs}px; min-width: 0; }
  strong, code { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: ${color.ink2}; font-size: ${fontSize.bodySm}; font-weight: 600; }
  code { font-family: ${font.mono}; font-size: ${fontSize.meta}; }
`;
const Badge = styled.span`
  flex-shrink: 0; max-width: 100%; padding: ${space.xs}px ${space.sm}px; border: 1px solid ${tone.neutral.border};
  border-radius: ${radius.control}px; background: ${tone.neutral.bg}; color: ${tone.neutral.fg};
  font-size: ${fontSize.caption}; font-weight: 600; overflow-wrap: anywhere;
`;
const State = styled.div`
  flex: 1; min-height: 160px; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: ${space.lg}px; text-align: center; color: ${color.ink3}; font-size: ${fontSize.bodySm};
`;
const Retry = styled.button`
  min-height: ${controlHeight.sm}px; padding: 0 ${space.xl}px; border: 1px solid ${color.brandBorder};
  border-radius: ${radius.control}px; background: ${color.brandSoft}; color: ${color.brand}; cursor: pointer;
  &:focus-visible { outline: ${focusRing}; outline-offset: 3px; }
`;
