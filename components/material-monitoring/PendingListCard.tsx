import React from 'react';
import { motion } from 'framer-motion';
import { FileWarning, Loader2 } from 'lucide-react';
import {
  CardTitle,
  FullHeightCard,
  HistoryItem as BaseHistoryItem,
  HistoryListContainer,
  PinkButton
} from '@/styles/styles';
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
  <BaseHistoryItem style={{ padding: '10px 12px', borderRadius: 10, marginBottom: 6 }}>
    <div className="left-grp">
      <span className="comp" title={item.NmCustm} style={{ fontWeight: 600 }}>{compactText(item.NmCustm, '업체 미지정', 12)}</span>
      <span style={{ marginTop: 3, color: '#475569', fontSize: '.84rem', fontWeight: 600, fontFamily: 'monospace' }}>
        {item.InvoiceNo || '-'}
      </span>
    </div>
    <div className="info">
      <span className="status bad" style={{ padding: '4px 10px', borderRadius: 10, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', fontWeight: 600 }}>
        {item.NmInspGB || '대기'}
      </span>
    </div>
  </BaseHistoryItem>
));
PendingItem.displayName = 'PendingItem';

export default function PendingListCard({ pendingList, stats, isLoading, error, onRetry, onOpenList }: Props) {
  return (
    <FullHeightCard style={{ minHeight: 0, padding: 14, marginBottom: 0, borderRadius: 12, boxShadow: '0 4px 6px -1px rgba(0,0,0,.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <CardTitle style={{ margin: 0, padding: 0, fontSize: '1.05rem', fontWeight: 600 }}>입고 대기 리스트</CardTitle>
          <span style={{ padding: '3px 9px', borderRadius: 10, color: '#D31145', background: '#FFF0F3', fontSize: '.78rem', fontWeight: 600 }}>
            총 {pendingList.length}건
          </span>
        </div>
        <ViewAllButton onClick={onOpenList}>전체보기 &gt;</ViewAllButton>
      </div>

      <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: '#fff', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <span style={{ color: '#0f172a', fontSize: '.95rem', fontWeight: 600 }}>금일 입고 진행률</span>
          <span style={{ color: '#D31145', fontSize: '1.1rem', fontWeight: 600 }}>
            {stats.percent}%
            <span style={{ marginLeft: 6, color: '#475569', fontSize: '.85rem', fontWeight: 600 }}>({stats.done}/{stats.total})</span>
          </span>
        </div>
        <div style={{ width: '100%', height: 8, overflow: 'hidden', borderRadius: 6, background: '#f1f5f9' }}>
          <motion.div initial={{ width: 0 }} animate={{ width: `${stats.percent}%` }} transition={{ duration: 1 }} style={{ height: '100%', borderRadius: 6, background: '#D31145' }} />
        </div>
      </div>

      <HistoryListContainer style={{ padding: '10px 0 0', borderTop: 0 }}>
        <div className="h-scroll-area" style={{ borderRadius: 12, padding: 8 }}>
          {isLoading ? (
            <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#64748b' }}><Loader2 size={30} /></div>
          ) : error ? (
            <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#ef4444', gap: 10 }}>
              <FileWarning size={30} />
              <PinkButton onClick={onRetry} style={{ height: 30, fontSize: '.8rem', padding: '0 12px', borderRadius: 10, fontWeight: 600 }}>재시도</PinkButton>
            </div>
          ) : pendingList.length ? (
            pendingList.map((item, index) => <PendingItem key={`${item.InvoiceNo || 'unknown'}-${index}`} item={item} />)
          ) : (
            <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#94a3b8', fontSize: '.88rem' }}>항목이 없습니다.</div>
          )}
        </div>
      </HistoryListContainer>
    </FullHeightCard>
  );
}
