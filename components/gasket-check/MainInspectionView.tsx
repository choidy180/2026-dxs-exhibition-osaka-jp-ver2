'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, ZoomIn } from 'lucide-react';
import type { ApiData } from '@/types/gasketCheck';
import { getInspectionTone } from '@/utils/gasketCheck';
import { getDxApiBaseUrl, resolveDxResourceUrl } from '@/utils/dx-api';
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
} from '@/styles/gasketCheck.styles';

interface MainInspectionViewProps {
    data: ApiData | null;
    onImageOpen: (title: string, url: string) => void;
}

const normalizeDxsImageUrl = (url?: string | null) => {
    const normalizedUrl = resolveDxResourceUrl(url);
    if (!normalizedUrl || !/^https?:/i.test(normalizedUrl)) return normalizedUrl;
    try {
        const parsedUrl = new URL(normalizedUrl);
        if (parsedUrl.origin === getDxApiBaseUrl()) {
            // 이 검사 화면의 캐시 정책을 유지하기 위해 DX 이미지의 query/hash를 제거한다.
            parsedUrl.search = '';
            parsedUrl.hash = '';
            return parsedUrl.href;
        }
        return normalizedUrl;
    } catch {
        return normalizedUrl;
    }
};

export function MainInspectionView({
    data,
    onImageOpen,
}: MainInspectionViewProps) {
    const tone = getInspectionTone(data?.RESULT);

    const imageUrl = useMemo(() => {
        return normalizeDxsImageUrl(data?.FILEPATH1);
    }, [data?.FILEPATH1]);

    const [displayImageUrl, setDisplayImageUrl] = useState('');
    const [failedImageUrl, setFailedImageUrl] = useState('');

    // Fast Refresh/HMR로 이전 state가 살아있어도 _dxv가 남지 않게 한 번 더 정리한다.
    const cleanDisplayImageUrl = useMemo(() => {
        return normalizeDxsImageUrl(displayImageUrl);
    }, [displayImageUrl]);

    const visibleImageUrl = imageUrl ? cleanDisplayImageUrl : '';
    const hasFailedCurrentImage = !!imageUrl && failedImageUrl === imageUrl;

    useEffect(() => {
        if (!imageUrl) {
            return;
        }

        let cancelled = false;
        const preloadImage = new Image();

        preloadImage.onload = () => {
            if (cancelled) return;

            setDisplayImageUrl(imageUrl);
            setFailedImageUrl('');
        };

        preloadImage.onerror = () => {
            if (cancelled) return;

            console.error('Gasket inspection image load failed:', imageUrl);
            setFailedImageUrl(imageUrl);

            /**
             * displayImageUrl은 바로 비우지 않는다.
             * polling 중 새 이미지가 아직 생성 중이거나 일시 실패해도
             * 직전에 정상 로드된 이미지를 유지한다.
             */
        };

        preloadImage.src = imageUrl;

        return () => {
            cancelled = true;
        };
    }, [imageUrl]);

    const hasDisplayImage = !!visibleImageUrl;

    return (
        <ImagePanel data-demo="inspection-image" $tone={tone}>
            <PanelHeader>
                <PanelTitle>
                    <PanelEyebrow>Live Inspection Image</PanelEyebrow>
                    <PanelTitleText>가스켓 이상 탐지 이미지</PanelTitleText>
                </PanelTitle>

                <LiveBadge>
                    <LiveDot />
                    LIVE
                </LiveBadge>
            </PanelHeader>

            <ImageViewport>
                {hasDisplayImage ? (
                    <>
                        <ImageContent
                            key={visibleImageUrl}
                            src={visibleImageUrl}
                            alt="Film Attachment Inspection"
                            draggable={false}
                            onError={() => {
                                console.error(
                                    'Gasket inspection display image failed:',
                                    visibleImageUrl,
                                );

                                setFailedImageUrl(visibleImageUrl);
                                setDisplayImageUrl('');
                            }}
                        />

                        <RoiBox>
                            <RoiLabel>ROI</RoiLabel>
                        </RoiBox>

                        {data?.FILENAME1 && (
                            <FileBadge>{data.FILENAME1}</FileBadge>
                        )}

                        <ViewImageButton
                            type="button"
                            onClick={() =>
                                onImageOpen(
                                    '가스켓 이상 탐지 이미지',
                                    visibleImageUrl,
                                )
                            }
                        >
                            <ZoomIn size={16} />
                            이미지 보기
                        </ViewImageButton>
                    </>
                ) : (
                    <WaitingBox>
                        <RefreshCw className="film-spin" size={30} />
                        {hasFailedCurrentImage
                            ? '이미지 재수신 대기 중'
                            : '이미지 수신 대기 중'}
                    </WaitingBox>
                )}
            </ImageViewport>
        </ImagePanel>
    );
}
