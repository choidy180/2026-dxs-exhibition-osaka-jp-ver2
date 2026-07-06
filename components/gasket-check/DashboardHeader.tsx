'use client';

import { CheckCircle2, Clock, Info, Volume2, VolumeX, XCircle } from 'lucide-react';
import type { ApiData, TotalData } from '@/types/gasketCheck';
import { filmTheme } from '@/styles/gasketCheck.theme';
import { formatCount, getInspectionTone, getResultLabel } from '@/utils/gasketCheck';
import {
    HeaderGrid,
    InfoBody,
    InfoCard,
    InfoCell,
    InfoHeader,
    InfoHeaderText,
    InfoSubValue,
    InfoValue,
    ModelInfoDivider,
    ModelInfoLine,
    ResultCard,
    ResultIconBox,
    ResultLabel,
    ResultTextStack,
    ResultValue,
    SoundButton,
} from '@/styles/gasketCheck.styles';

interface DashboardHeaderProps {
    height: string;
    gap: string;
    data: ApiData | null;
    totalStats: TotalData | null;
    isSoundOn: boolean;
    onToggleSound: () => void;
}

export function DashboardHeader({
    height,
    gap,
    data,
    totalStats,
    isSoundOn,
    onToggleSound,
}: DashboardHeaderProps) {
    const tone = getInspectionTone(data?.RESULT);
    const resultLabel = getResultLabel(data?.RESULT);
    const ResultIcon = tone === 'ok' ? CheckCircle2 : tone === 'ng' ? XCircle : Clock;

    return (
        <HeaderGrid $height={height} $gap={gap}>
            <ResultCard $tone={tone}>
                <SoundButton type="button" onClick={onToggleSound} aria-label="경고음 토글">
                    {isSoundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </SoundButton>

                <ResultIconBox $tone={tone}>
                    <ResultIcon size={34} strokeWidth={2.4} />
                </ResultIconBox>

                <ResultTextStack>
                    <ResultLabel>
                        <Info size={14} />
                        전체 판정 결과
                    </ResultLabel>
                    <ResultValue $tone={tone}>{resultLabel}</ResultValue>
                </ResultTextStack>
            </ResultCard>

            <InfoCard>
                <InfoHeader>
                    <InfoCell>
                        <InfoHeaderText>검사 시간</InfoHeaderText>
                    </InfoCell>
                    <InfoCell>
                        <InfoHeaderText>검사 수량</InfoHeaderText>
                    </InfoCell>
                    <InfoCell>
                        <InfoHeaderText>모델명 / 작업지시번호</InfoHeaderText>
                    </InfoCell>
                    <InfoCell $last>
                        <InfoHeaderText>현재 상태</InfoHeaderText>
                    </InfoCell>
                </InfoHeader>

                <InfoBody>
                    <InfoCell>
                        <InfoValue>{data?.TIMEVALUE || '00:00:00'}</InfoValue>
                    </InfoCell>
                    <InfoCell>
                        <InfoValue>{formatCount(totalStats?.normal_count, totalStats?.total_count)}</InfoValue>
                    </InfoCell>
                    <InfoCell>
                        <ModelInfoLine>
                            <InfoValue>{data?.CDGITEM || '-'}</InfoValue>
                            <ModelInfoDivider>/</ModelInfoDivider>
                            <InfoSubValue>{data?.STATUS002 || '-'}</InfoSubValue>
                        </ModelInfoLine>
                    </InfoCell>
                    <InfoCell $last>
                        <InfoValue $color={filmTheme.textPrimary}>RUNNING</InfoValue>
                    </InfoCell>
                </InfoBody>
            </InfoCard>
        </HeaderGrid>
    );
}
