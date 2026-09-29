'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import InspectionDataState from '@/components/common/inspection-data-state/InspectionDataState';
import { DashboardHeader } from '@/components/gasket-check/DashboardHeader';
import { EmptyStateModal } from '@/components/gasket-check/EmptyStateModal';
import { FullLogModal } from '@/components/gasket-check/FullLogModal';
import { ImageModal } from '@/components/gasket-check/ImageModal';
import { MainInspectionView } from '@/components/gasket-check/MainInspectionView';
import { ProductionLogPanel } from '@/components/gasket-check/ProductionLogPanel';
import { LAYOUT_CONFIGS } from '@/constants/gasketCheck';
import { useDefectAlarm } from '@/hooks/gasket-check/useDefectAlarm';
import { useInspectionPolling } from '@/hooks/gasket-check/useInspectionPolling';
import { useProductionLogs } from '@/hooks/gasket-check/useProductionLogs';
import { useScreenMode } from '@/hooks/gasket-check/useScreenMode';
import { GlobalFilmAttachmentStyles, ContentGrid, PageFrame } from '@/styles/gasketCheck.styles';
import type { ImageModalState } from '@/types/gasketCheck';

export default function FilmAttachmentCheckClient() {
    const router = useRouter();
    const screenMode = useScreenMode();
    const layout = useMemo(() => LAYOUT_CONFIGS[screenMode], [screenMode]);
    const logs = useProductionLogs();
    const { apiData, totalStats, isDefectMode, isLoading, error, retry } = useInspectionPolling();

    const [imageModal, setImageModal] = useState<ImageModalState | null>(null);
    const [isFullLogOpen, setIsFullLogOpen] = useState(false);
    const [isEmptyStateClosed, setIsEmptyStateClosed] = useState(false);
    const [audioAllowed, setAudioAllowed] = useState(false);

    useDefectAlarm(isDefectMode, audioAllowed);

    const handleImageOpen = (title: string, imgUrl: string) => {
        if (!imgUrl) {
            return;
        }

        setImageModal({
            title,
            imgUrl,
        });
    };

    if (isLoading || error) return <PageFrame $padding={layout.padding} $gap={layout.gap}><InspectionDataState isLoading={isLoading} error={error} onRetry={retry} /></PageFrame>;

    return (
        <PageFrame $padding={layout.padding} $gap={layout.gap}>
            <GlobalFilmAttachmentStyles />

            <DashboardHeader
                height={layout.headerHeight}
                gap={layout.gap}
                data={apiData}
                totalStats={totalStats}
                isSoundOn={audioAllowed}
                onToggleSound={() => setAudioAllowed((prev) => !prev)}
            />

            <ContentGrid
                $gap={layout.gap}
                $imageColumn={layout.imageColumn}
                $logColumn={layout.logColumn}
            >
                <MainInspectionView
                    data={apiData}
                    onImageOpen={handleImageOpen}
                />

                <ProductionLogPanel
                    logs={logs}
                    onOpenAllLogs={() => setIsFullLogOpen(true)}
                />
            </ContentGrid>

            {totalStats?.total_count === 0 && !isEmptyStateClosed && (
                <EmptyStateModal
                    onClose={() => setIsEmptyStateClosed(true)}
                    onNavigateHome={() => router.push('/')}
                />
            )}

            <FullLogModal
                isOpen={isFullLogOpen}
                logs={logs}
                onClose={() => setIsFullLogOpen(false)}
            />

            <ImageModal
                image={imageModal}
                onClose={() => setImageModal(null)}
            />
        </PageFrame>
    );
}
