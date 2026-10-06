'use client';

import { RefreshCw, ZoomIn } from 'lucide-react';
import type { ApiData } from '@/types/gasketCheck';
import { getInspectionTone } from '@/utils/gasketCheck';
import { resolveDxResourceUrl } from '@/utils/dx-api';
import {
    FileBadge,
    ImageContent,
    ImagePanel,
    ImageViewport,
    LiveBadge,
    LiveDot,
    PanelEyebrow,
    PanelHeader,
    PanelTitle,
    PanelTitleText,
    RoiBox,
    RoiLabel,
    ViewImageButton,
    WaitingBox,
} from '@/styles/filmAttachmentCheck.styles';

interface MainInspectionViewProps {
    data: ApiData | null;
    onImageOpen: (title: string, url: string) => void;
}

export function MainInspectionView({
    data,
    onImageOpen,
}: MainInspectionViewProps) {
    const tone = getInspectionTone(data?.RESULT);
    const imageUrl = resolveDxResourceUrl(data?.FILEPATH1);

    return (
        <ImagePanel data-demo="inspection-image" $tone={tone}>
            <PanelHeader>
                <PanelTitle>
                    <PanelEyebrow>Live Inspection Image</PanelEyebrow>
                    <PanelTitleText>필름 부착 검사 이미지</PanelTitleText>
                </PanelTitle>

                <LiveBadge>
                    <LiveDot />
                    LIVE
                </LiveBadge>
            </PanelHeader>

            <ImageViewport>
                {imageUrl ? (
                    <>
                        <ImageContent src={imageUrl} alt="Film Attachment Inspection" />
                        <RoiBox>
                            <RoiLabel>ROI</RoiLabel>
                        </RoiBox>

                        {data?.FILENAME1 && (
                            <FileBadge>{data.FILENAME1}</FileBadge>
                        )}

                        <ViewImageButton
                            type="button"
                            onClick={() => onImageOpen('필름 부착 검사 이미지', imageUrl)}
                        >
                            <ZoomIn size={16} />
                            이미지 보기
                        </ViewImageButton>
                    </>
                ) : (
                    <WaitingBox>
                        <RefreshCw className="film-spin" size={30} />
                        이미지 수신 대기 중
                    </WaitingBox>
                )}
            </ImageViewport>
        </ImagePanel>
    );
}
