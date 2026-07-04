"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import { AlertCircle, Camera, ChevronLeft, QrCode, RefreshCw, Smartphone, X } from "lucide-react";

type CameraState = "idle" | "loading" | "ready" | "error";

const DESKTOP_QUERY = "(min-width: 769px)";

export default function MaterialCheckPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(DESKTOP_QUERY).matches,
  );
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [cameraMessage, setCameraMessage] = useState("카메라 연결 대기 중");

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    if (isDesktop) return;

    stopCamera();
    setCameraState("loading");
    setCameraMessage("카메라 권한을 확인하고 있습니다.");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("현재 브라우저에서 카메라를 지원하지 않습니다.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraState("ready");
      setCameraMessage("카메라 연결 완료");
    } catch (error) {
      const message = error instanceof Error ? error.message : "카메라를 연결하지 못했습니다.";
      setCameraState("error");
      setCameraMessage(message);
    }
  }, [isDesktop, stopCamera]);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_QUERY);
    const syncViewport = () => setIsDesktop(media.matches);

    syncViewport();
    media.addEventListener("change", syncViewport);
    return () => media.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    if (isDesktop) {
      stopCamera();
      return;
    }

    startCamera();
    return stopCamera;
  }, [isDesktop, startCamera, stopCamera]);

  return (
    <PageShell>
      <MobileHeader>
        <BackButton type="button" onClick={() => router.push("/material/inbound-inspection")}>
          <ChevronLeft size={20} />
        </BackButton>
        <HeaderText>
          <span>Material QR Check</span>
          <h1>자재검수</h1>
        </HeaderText>
      </MobileHeader>

      <CameraPanel>
        <video ref={videoRef} muted playsInline autoPlay aria-label="자재 QR 검수 카메라 화면" />
        <ScanOverlay aria-hidden="true">
          <ScanFrame>
            <QrCode size={34} />
          </ScanFrame>
        </ScanOverlay>
        <StatusBadge $state={cameraState}>
          {cameraState === "error" ? <AlertCircle size={15} /> : <Camera size={15} />}
          {cameraMessage}
        </StatusBadge>
      </CameraPanel>

      <ActionBar>
        <SecondaryButton type="button" onClick={() => router.push("/material/inbound-inspection")}>
          입고검사로 이동
        </SecondaryButton>
        <PrimaryButton type="button" onClick={startCamera} disabled={cameraState === "loading" || isDesktop}>
          <RefreshCw size={17} />
          다시 연결
        </PrimaryButton>
      </ActionBar>

      <HintPanel>
        <strong>QR 스캔 준비 화면</strong>
        <span>현재는 QR 인식 기능 없이 카메라 프리뷰만 표시합니다.</span>
      </HintPanel>

      {isDesktop && (
        <DesktopBlocker role="dialog" aria-modal="true" aria-labelledby="desktop-block-title">
          <BlockerCard>
            <CloseButton type="button" onClick={() => router.push("/material/inbound-inspection")} aria-label="닫기">
              <X size={18} />
            </CloseButton>
            <IconBadge>
              <Smartphone size={30} />
            </IconBadge>
            <h2 id="desktop-block-title">모바일 전용 자재검수</h2>
            <p>
              자재검수는 현장에서 모바일 카메라로 QR을 확인하는 화면입니다.
              PC에서는 카메라 검수 화면에 접근할 수 없습니다.
            </p>
            <PrimaryButton type="button" onClick={() => router.push("/material/inbound-inspection")}>
              자재관리로 이동
            </PrimaryButton>
          </BlockerCard>
        </DesktopBlocker>
      )}
    </PageShell>
  );
}

const PageShell = styled.main`
  min-height: 100vh;
  min-height: 100svh;
  padding: calc(14px + env(safe-area-inset-top)) 14px calc(18px + env(safe-area-inset-bottom));
  background: #f6f7f9;
  color: #111827;
  display: flex;
  flex-direction: column;
  gap: 14px;
  font-family:
    "Pretendard Variable",
    "Pretendard",
    "Apple SD Gothic Neo",
    "Noto Sans KR",
    system-ui,
    -apple-system,
    sans-serif;
`;

const MobileHeader = styled.header`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const BackButton = styled.button`
  width: 42px;
  height: 42px;
  border-radius: 10px;
  border: 1px solid #e2e6ee;
  background: #ffffff;
  color: #374151;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const HeaderText = styled.div`
  min-width: 0;

  span {
    display: block;
    color: #d31145;
    font-size: 11px;
    font-weight: 800;
    line-height: 1.1;
    text-transform: uppercase;
  }

  h1 {
    margin: 4px 0 0;
    color: #111827;
    font-size: 25px;
    font-weight: 750;
    line-height: 1.15;
    letter-spacing: 0;
  }
`;

const CameraPanel = styled.section`
  position: relative;
  overflow: hidden;
  flex: 1;
  min-height: 420px;
  border-radius: 12px;
  border: 1px solid #d8dde6;
  background: #020617;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.10);

  video {
    width: 100%;
    height: 100%;
    min-height: inherit;
    object-fit: cover;
    background: #020617;
  }
`;

const ScanOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    rgba(2, 6, 23, 0.10),
    rgba(2, 6, 23, 0.02) 42%,
    rgba(2, 6, 23, 0.16)
  );
`;

const ScanFrame = styled.div`
  width: min(68vw, 280px);
  aspect-ratio: 1;
  border: 2px solid rgba(211, 17, 69, 0.9);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.84);
  display: grid;
  place-items: center;
  box-shadow: 0 0 0 999px rgba(2, 6, 23, 0.26);
`;

const StatusBadge = styled.div<{ $state: CameraState }>`
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  min-height: 42px;
  padding: 10px 12px;
  border-radius: 10px;
  background: ${({ $state }) => ($state === "error" ? "rgba(185, 28, 28, 0.92)" : "rgba(255, 255, 255, 0.92)")};
  border: 1px solid ${({ $state }) => ($state === "error" ? "rgba(254, 202, 202, 0.55)" : "rgba(216, 221, 230, 0.95)")};
  color: ${({ $state }) => ($state === "error" ? "#ffffff" : "#111827")};
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 750;
  line-height: 1.35;
  backdrop-filter: blur(10px);
`;

const ActionBar = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
`;

const PrimaryButton = styled.button`
  min-height: 48px;
  padding: 0 15px;
  border-radius: 10px;
  background: #d31145;
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 800;

  &:disabled {
    opacity: 0.6;
    cursor: wait;
  }
`;

const SecondaryButton = styled.button`
  min-height: 48px;
  padding: 0 15px;
  border-radius: 10px;
  border: 1px solid #d8dde6;
  background: #ffffff;
  color: #374151;
  font-size: 14px;
  font-weight: 800;
`;

const HintPanel = styled.section`
  padding: 13px 14px;
  border-radius: 12px;
  border: 1px solid #d8dde6;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  gap: 5px;

  strong {
    color: #111827;
    font-size: 14px;
    font-weight: 800;
  }

  span {
    color: #6b7280;
    font-size: 12px;
    font-weight: 650;
    line-height: 1.4;
  }
`;

const DesktopBlocker = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2000;
  padding: 24px;
  background: rgba(15, 23, 42, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(6px);
`;

const BlockerCard = styled.div`
  position: relative;
  width: min(100%, 430px);
  padding: 28px;
  border-radius: 12px;
  background: #ffffff;
  color: #111827;
  text-align: center;
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.28);

  h2 {
    margin: 18px 0 10px;
    color: #111827;
    font-size: 23px;
    font-weight: 800;
    line-height: 1.2;
  }

  p {
    margin: 0 0 20px;
    color: #475467;
    font-size: 14px;
    font-weight: 650;
    line-height: 1.55;
    word-break: keep-all;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 14px;
  right: 14px;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: #f3f4f6;
  color: #667085;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const IconBadge = styled.div`
  width: 66px;
  height: 66px;
  margin: 0 auto;
  border-radius: 12px;
  background: #fff1f5;
  color: #d31145;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;
