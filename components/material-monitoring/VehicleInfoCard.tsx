import { useState } from 'react';
import { AlertCircle, Loader2, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import { color, controlHeight, focusRing, fontSize, motionDuration, radius, shadow, space, tone } from '@/styles/design-tokens';
import type { VehicleSlotDetail } from '@/types/material-monitoring';
import { useVehicleImageUrl } from '@/hooks/useVehicleImageUrl';

type Props = {
  vehicleInfo: VehicleSlotDetail | null;
  isLoaded: boolean;
  isLoading: boolean;
  dwellString: string;
  error: string | null;
  onRetry: () => void;
};

export default function VehicleInfoCard({ vehicleInfo, isLoaded, isLoading, dwellString, error, onRetry }: Props) {
  const imageUrl = useVehicleImageUrl(vehicleInfo?.FILEPATH);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const retry = () => { setFailedImage(null); onRetry(); };
  return (
    <Card>
      <Title>입고 차량 정보</Title>
      {error ? (
        <State role="alert"><AlertCircle size={28} /><strong>{error}</strong><Retry onClick={retry}>재시도</Retry></State>
      ) : isLoading ? (
        <State>
          <motion.span animate={{ rotate: 360 }} transition={{ duration: motionDuration.spin, repeat: Infinity, ease: 'linear' }}>
            <Loader2 size={28} />
          </motion.span>
          <strong>데이터 조회 중...</strong><span>잠시만 기다려주세요.</span>
        </State>
      ) : isLoaded && vehicleInfo ? (
        <>
          <ImageFrame>
            {failedImage === imageUrl ? (
              <State><AlertCircle size={24} /><span>이미지를 불러오지 못했습니다.</span><Retry onClick={retry}>재시도</Retry></State>
            ) : <VehicleImage src={imageUrl} alt="입고 차량" onError={() => setFailedImage(imageUrl)} />}
          </ImageFrame>
          <Rows>
            <Row><span>차량번호</span><strong>{vehicleInfo.PLATE || '-'}</strong></Row>
            <Row><span>도착시간</span><strong>{vehicleInfo.entry_time
              ? new Date(vehicleInfo.entry_time).toLocaleTimeString('ko-KR', { hour12: false }) : '-'}</strong></Row>
            <Row><span>체류시간</span><strong>{dwellString}</strong></Row>
            <Row><span>상태</span><Badge>입고대기</Badge></Row>
          </Rows>
        </>
      ) : <State><Search size={28} /><strong>차량 데이터 대기</strong><span>차량정보가 없습니다.</span><Retry onClick={onRetry}>새로고침</Retry></State>}
    </Card>
  );
}

const Card = styled.section`
  padding: ${space.xxl}px; border: 1px solid ${color.borderSoft}; border-radius: ${radius.card}px;
  background: ${color.surface}; box-shadow: ${shadow.card}; min-height: 0;
`;
const Title = styled.h2`
  margin: 0 0 ${space.xl}px; font-size: ${fontSize.cardTitle}; font-weight: 600; color: ${color.ink};
`;
const ImageFrame = styled.div`
  height: 148px; margin-bottom: ${space.xxl}px; overflow: hidden; border-radius: ${radius.card}px;
  background: ${color.surfaceSubtle};
`;
const VehicleImage = styled.img`width: 100%; height: 100%; object-fit: cover;`;
const Rows = styled.div`display: flex; flex-direction: column; gap: ${space.md}px;`;
const Row = styled.div`
  display: flex; justify-content: space-between; align-items: center; gap: ${space.md}px; font-size: ${fontSize.bodySm};
  > span:first-child { color: ${color.ink3}; font-weight: 500; }
  strong { color: ${color.ink}; font-weight: 600; }
`;
const Badge = styled.span`
  padding: ${space.xs}px ${space.xl}px; border: 1px solid ${tone.warning.border};
  border-radius: ${radius.control}px; background: ${tone.warning.bg}; color: ${tone.warning.fg}; font-weight: 600;
`;
const State = styled.div`
  min-height: 148px; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: ${space.md}px; color: ${color.ink3}; font-size: ${fontSize.bodySm}; text-align: center;
  strong { font-weight: 600; }
`;
const Retry = styled.button`
  min-height: ${controlHeight.sm}px; padding: 0 ${space.xl}px; border-radius: ${radius.control}px;
  border: 1px solid ${color.border}; background: ${color.surface}; color: ${color.ink2}; cursor: pointer;
  &:focus-visible { outline: ${focusRing}; outline-offset: 3px; }
`;
