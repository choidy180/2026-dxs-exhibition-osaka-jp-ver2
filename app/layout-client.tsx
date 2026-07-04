"use client";

import React, { useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import styled, { keyframes } from "styled-components";
import { Monitor, MousePointer2 } from "lucide-react";
import { AnimatePresence } from "framer-motion";

import TopNavigation from "@/components/navigation/top-navigation";
import { useViewContext } from "./view-context";
import StartAnime from "@/components/start/start-anime";

// --------------------------------------------------------------------------
// 1. Mobile Blocker Styles (모바일 차단 화면 스타일)
// --------------------------------------------------------------------------

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

const pulseGlow = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
  70% { box-shadow: 0 0 0 20px rgba(59, 130, 246, 0); }
  100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
`;

const MobileGuardContainer = styled.div<{ $isEnabled: boolean }>`
  display: none;
  @media (max-width: 1024px) {
    display: ${(props) => (props.$isEnabled ? "flex" : "none")};
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 100vw;
    height: 100vh;
    background: #0f172a;
    color: white;
    text-align: center;
    padding: 20px;
    position: fixed;
    top: 0; left: 0;
    z-index: 9999;
  }
`;

const IconCircle = styled.div`
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, #1e293b, #0f172a);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 30px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  animation: ${float} 3s ease-in-out infinite;
  svg {
    color: #3b82f6;
    filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.6));
  }
`;

const GuardTitle = styled.h2`
  font-size: 22px;
  font-weight: 800;
  margin-bottom: 12px;
  background: linear-gradient(90deg, #fff, #94a3b8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1.3;
`;

const GuardDesc = styled.p`
  font-size: 15px;
  color: #64748b;
  line-height: 1.6;
  max-width: 320px;
  margin: 0 auto 40px auto;
  word-break: keep-all;
  strong {
    color: #3b82f6;
    font-weight: 600;
  }
`;

const PcBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 30px;
  color: #60a5fa;
  font-size: 13px;
  font-weight: 600;
  animation: ${pulseGlow} 2s infinite;
`;

// --------------------------------------------------------------------------
// 2. Desktop Wrapper Styles (PC 화면 스타일)
// --------------------------------------------------------------------------

const DesktopOnlyWrapper = styled.div<{ $allowMobile: boolean }>`
  display: block;
  width: 100%;
  height: 100%;
  position: relative;
  
  @media (max-width: 1024px) {
    display: ${(props) => (props.$allowMobile ? "block" : "none")} !important;
  }
`;

const NavContainer = styled.div`
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 5000; 
  width: 0;
  height: 0;
`;

const MainContent = styled.main<{ $isHidden: boolean; $isFullWidth: boolean }>`
  position: relative;
  z-index: 1;
  min-height: 100vh;
  margin-left: ${(props) => (props.$isFullWidth ? "0" : "var(--app-sidebar-offset, 84px)")};
  width: ${(props) => (props.$isFullWidth ? "100%" : "calc(100% - var(--app-sidebar-offset, 84px))")};
  
  /* 로딩 중일 때 컨텐츠 투명 처리 */
  opacity: ${(props) => (props.$isHidden ? 0 : 1)};
  pointer-events: ${(props) => (props.$isHidden ? "none" : "auto")};
  transition:
    margin-left 240ms ease,
    width 240ms ease,
    opacity 0.8s ease-in-out;
`;

// --------------------------------------------------------------------------
// 3. Main Component Logic
// --------------------------------------------------------------------------

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoading, setIsLoading } = useViewContext();
  
  // 💡 첫 접속 여부를 추적하는 상태 (경로 변경과 무관하게 유지됨)
  const isFirstAccess = useRef(true);

  // 로딩 애니메이션을 건너뛸 경로인지 확인
  const isSkipLoading = pathname?.includes("master-dashboard");
  const isMasterDashboard = pathname?.includes("master-dashboard") ?? false;
  const isMaterialCheckPage = pathname?.startsWith("/material/inbound-inspection/material-check") ?? false;
  const isMobileAllowedPage = isMasterDashboard || isMaterialCheckPage;
  const isFullWidthPage = isMasterDashboard || isMaterialCheckPage;

  useLayoutEffect(() => {
    // 💡 1. 서비스에 최초로 접속했을 때만 로딩을 띄웁니다.
    if (isFirstAccess.current) {
      isFirstAccess.current = false; // 첫 접속 플래그 해제
      
      if (!isSkipLoading) {
        setIsLoading(true); // 첫 화면이고 예외 경로가 아니면 로딩 시작
      } else {
        setIsLoading(false);
      }
    } else {
      // 💡 2. 이후 페이지를 이동할 때는 로딩을 무시합니다. (setIsLoading(true) 호출 안 함)
      // 단, 예외 경로(master-dashboard)로 이동했을 땐 숨김 처리를 확실히 하기 위해 false 고정
      if (isSkipLoading) {
        setIsLoading(false);
      }
    }
  }, [pathname, setIsLoading, isSkipLoading]);

  return (
    <>
      {/* 1. 모바일 접속 시 차단 화면 */}
      <MobileGuardContainer $isEnabled={!isMobileAllowedPage}>
        <IconCircle>
          <Monitor size={48} strokeWidth={1.5} />
        </IconCircle>
        <GuardTitle>
          PC 환경에 최적화된<br />
          서비스입니다
        </GuardTitle>
        <GuardDesc>
          복잡한 공정 데이터와 실시간 관제 시스템은<br />
          <strong>넓은 PC 화면</strong>에서 가장 완벽하게 경험하실 수 있습니다.
        </GuardDesc>
        <PcBadge>
          <MousePointer2 size={14} />
          Desktop Only Experience
        </PcBadge>
      </MobileGuardContainer>

      {/* 2. PC 접속 시 메인 화면 */}
      <DesktopOnlyWrapper $allowMobile={isMobileAllowedPage}>
        
        {/* ✅ 시네마틱 로딩 스크린 오버레이 */}
        <AnimatePresence mode="wait">
          {isLoading && !isSkipLoading && (
            <StartAnime key="start-anime" onComplete={() => setIsLoading(false)} />
          )}
        </AnimatePresence>

        {!isFullWidthPage && (
          <NavContainer>
            <TopNavigation isLoading={isLoading && !isSkipLoading} />
          </NavContainer>
        )}
        
        {/* 로딩 중일 때 내용 숨김 ($isHidden) */}
        <MainContent $isHidden={isLoading && !isSkipLoading} $isFullWidth={isFullWidthPage}>
            {children}
        </MainContent>
        
      </DesktopOnlyWrapper>
    </>
  );
}
