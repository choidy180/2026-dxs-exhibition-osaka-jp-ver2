'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, ZoomIn } from 'lucide-react';
import type { ApiData } from '@/types/gasketCheck';
import { getInspectionTone } from '@/utils/gasketCheck';
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

const DEFAULT_DX_IMAGE_BASE_URL = 'https://gapi.dxsplatform.com';

const DX_IMAGE_HOSTS = new Set([
    '192.168.2.147:24828',
    '1.254.24.170:24828',
    'gapi.dxsplatform.com',
]);

const getDxsImageBaseUrl = () => {
    return (
        process.env.NEXT_PUBLIC_DX_IMAGE_BASE_URL ||
        DEFAULT_DX_IMAGE_BASE_URL
    ).replace(/\/$/, '');
};

const isDxsImagePath = (pathname: string) => {
    return pathname.startsWith('/images/');
};

/**
 * DX 이미지 URL을 화면 표시용 URL로 정규화한다.
 *
 * 중요:
 * - 이 화면에서는 `_dxv`, `_retry` 같은 cache-busting query를 절대 붙이지 않는다.
 * - 이미 `_dxv`가 붙어 들어온 URL도 pathname만 사용해서 query 전체를 제거한다.
 * - 내부망 이미지 host는 항상 NEXT_PUBLIC_DX_IMAGE_BASE_URL 기준 host로 치환한다.
 */
const normalizeDxsImageUrl = (url?: string | null) => {
    const rawUrl = (url || '').trim();

    if (!rawUrl) return '';

    if (rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) {
        return rawUrl;
    }

    try {
        const imageBaseUrl = getDxsImageBaseUrl();
        const parsedUrl = new URL(rawUrl, imageBaseUrl);

        const shouldUseDxsBaseUrl =
            DX_IMAGE_HOSTS.has(parsedUrl.host) || isDxsImagePath(parsedUrl.pathname);

        if (shouldUseDxsBaseUrl) {
            // query/hash를 의도적으로 모두 버린다.
            // 결과 예: https://gapi.dxsplatform.com/images/DX_API000102/Image_...jpg
            return `${imageBaseUrl}${parsedUrl.pathname}`;
        }

        // 외부 URL은 원칙적으로 유지하되, 이전 잘못된 cache-busting 값만 제거한다.
        parsedUrl.searchParams.delete('_dxv');
        parsedUrl.searchParams.delete('_retry');
        parsedUrl.hash = '';

        return parsedUrl.href;
    } catch {
        // URL 파싱 실패 시에도 최소한 _dxv/_retry 뒤는 잘라낸다.
        return rawUrl
            .replace(/[?&](_dxv|_retry)=[^#&]*/g, '')
            .replace(/[?&]$/, '');
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
        <ImagePanel $tone={tone}>
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
