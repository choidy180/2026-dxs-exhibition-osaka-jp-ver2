"use client";

import React, { useState, memo } from "react";
import Link from 'next/link';
import styled, { keyframes } from "styled-components";
import { X } from "lucide-react";
import { 
  FaDolly, FaEye, FaCogs, FaChartLine, FaHardHat, FaTruck, FaArrowRight 
} from 'react-icons/fa';
import type { IconType } from 'react-icons';
import { AnimatePresence, motion } from "framer-motion";
import AiAdvisorClient from "@/components/ai-advisor/AiAdvisorClient";

// ==========================================
// 0. ANIMATION CONFIG
// ==========================================
const SMOOTH_TRANSITION = {
  type: "spring" as const, 
  stiffness: 260,
  damping: 30,   
  mass: 1        
};

// ==========================================
// 1. DATA & CONFIG & TYPES
// ==========================================

type CardData = {
  id: string; title: string; desc: string; icon: IconType; color: string; href: string;
};

const DASHBOARD_ITEMS: CardData[] = [
  { id: "01", title: "자재관리", desc: "입고 및 적재 효율화", icon: FaDolly, color: "#00E676", href: "/material/inbound-inspection" },
  { id: "02", title: "공정품질", desc: "AI 비전 기반 품질 판정", icon: FaEye, color: "#FF3D00", href: "/production/glass-gap-check" },
  { id: "03", title: "공정설비", desc: "설비 이상 징후 탐지", icon: FaCogs, color: "#2962FF", href: "/production/line-monitoring" },
  { id: "04", title: "생산관리", desc: "공정 시간 및 병목 분석", icon: FaChartLine, color: "#00C853", href: "/production/takttime-dashboard" },
  { id: "05", title: "작업관리", desc: "Physical AI 환경 최적화", icon: FaHardHat, color: "#FFAB00", href: "/production/pysical-ai" },
  { id: "06", title: "출하관리", desc: "실시간 물류 및 배송 추적", icon: FaTruck, color: "#6200EA", href: "/transport/warehouse-management" },
];

// ==========================================
// 2. STYLED COMPONENTS (LAYOUT)
// ==========================================

const PageContainer = styled.div`
  width: 100%;
  height: 100vh;
  display: flex;
  overflow: hidden;
  background-color: #000;
  position: relative;

  &::before {
    content: '';
    position: absolute; inset: 0;
    background: 
      linear-gradient(to right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 100%),
      url('/images/gmt_back.png') no-repeat center center / cover;
    z-index: 0;
    pointer-events: none;
  }

  @media (max-width: 768px) {
    height: auto;
    min-height: 100svh;
    overflow-x: hidden;
    overflow-y: auto;

    &::before {
      background:
        linear-gradient(to bottom, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.58) 48%, rgba(0,0,0,0.76) 100%),
        url('/images/gmt_back.png') no-repeat center center / cover;
    }
  }
`;

const MainContent = styled(motion.div)`
  flex: 1; 
  height: 100%;
  padding: 40px;
  overflow-y: auto;
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  will-change: width; 

  @media (max-width: 768px) {
    height: auto;
    min-height: 100svh;
    padding: 18px 16px 96px;
    align-items: stretch;
    justify-content: flex-start;
    overflow: visible;
  }
`;

// ==========================================
// 3. STYLED COMPONENTS (DASHBOARD)
// ==========================================

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const GridWrapper = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  transition: all 0.5s ease;

  @media (max-width: 1600px) { grid-template-columns: repeat(3, 1fr); }
  @media (max-width: 1200px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 800px) { grid-template-columns: 1fr; }

  @media (max-width: 768px) {
    gap: 12px;
    max-width: 520px;
  }
`;

const CardLink = styled(Link)` text-decoration: none; color: inherit; display: block; height: 100%; `;

const Card = styled.div<{ $color: string; $index: number }>`
  position: relative; height: 240px;
  display: flex; flex-direction: column; justify-content: space-between;
  padding: 28px; border-radius: 24px;
  background: rgba(20, 20, 20, 0.45); 
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
  
  animation: ${fadeInUp} 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  animation-delay: ${props => props.$index * 0.05}s;
  opacity: 0; 

  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), background 0.3s, box-shadow 0.3s;

  &:hover {
    transform: translateY(-8px);
    background: rgba(30, 30, 30, 0.85);
    border-color: ${props => props.$color}80; 
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
  }

  @media (max-width: 768px) {
    min-height: 116px;
    height: auto;
    padding: 16px;
    border-radius: 16px;
    background: rgba(17, 24, 39, 0.68);
    border-color: rgba(255, 255, 255, 0.14);
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);

    &:hover {
      transform: none;
    }
  }
`;

const IconBox = styled.div<{ $color: string }>`
  width: 52px; height: 52px; border-radius: 14px;
  background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex; align-items: center; justify-content: center;
  font-size: 24px; color: ${props => props.$color}; transition: all 0.3s ease;
  ${Card}:hover & { background: ${props => props.$color}15; border-color: ${props => props.$color}40; transform: scale(1.05); }

  @media (max-width: 768px) {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    font-size: 21px;
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 18px;

  @media (max-width: 768px) {
    align-items: center;
    gap: 13px;
  }
`;
const TextContent = styled.div` display: flex; flex-direction: column; gap: 0px; padding-top: 2px; `;
const Title = styled.h2`
  font-size: 28px;
  font-weight: 700;
  color: #ffffff;
  margin: 0;

  @media (max-width: 768px) {
    font-size: 21px;
    line-height: 1.18;
  }
`;
const Description = styled.p` 
  font-size: 20px; color: rgba(255, 255, 255, 0.6); margin: 0; word-break: keep-all; transition: color 0.3s;
  ${Card}:hover & { color: rgba(255, 255, 255, 0.85); }

  @media (max-width: 768px) {
    margin-top: 4px;
    font-size: 13px;
    line-height: 1.35;
    color: rgba(255, 255, 255, 0.72);
  }
`;
const CardFooter = styled.div`
  display: flex;
  justify-content: flex-end;

  @media (max-width: 768px) {
    margin-top: 14px;
  }
`;
const ActionButton = styled.div<{ $color: string }>`
  display: flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: 20px;
  font-size: 14px; font-weight: 600; background: rgba(255, 255, 255, 0.05); color: rgba(255, 255, 255, 0.7);
  transition: all 0.3s ease; .arrow-icon { font-size: 10px; transition: transform 0.3s ease; }
  ${Card}:hover & { background: ${props => props.$color}; color: #fff; box-shadow: 0 4px 12px ${props => props.$color}40; }
  ${Card}:hover & .arrow-icon { transform: translateX(4px); }

  @media (max-width: 768px) {
    min-width: 72px;
    justify-content: center;
    padding: 8px 12px;
    border-radius: 10px;
    background: ${props => props.$color};
    color: #fff;
    font-size: 12px;
    box-shadow: 0 6px 14px ${props => props.$color}30;
  }
`;

const MobileIntro = styled.section`
  display: none;

  @media (max-width: 768px) {
    display: block;
    width: 100%;
    max-width: 520px;
    margin: 8px auto 18px;
    color: #ffffff;

    p {
      margin: 0 0 7px;
      color: #ffb3c4;
      font-size: 12px;
      font-weight: 800;
      line-height: 1.1;
      text-transform: uppercase;
    }

    h1 {
      margin: 0;
      color: #ffffff;
      font-size: 30px;
      font-weight: 700;
      line-height: 1.15;
      letter-spacing: 0;
      word-break: keep-all;
      text-shadow: 0 3px 14px rgba(0, 0, 0, 0.72);
    }
  }
`;

const MobileStatusRow = styled.div`
  display: none;

  @media (max-width: 768px) {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin-top: 16px;

    span,
    button {
      min-width: 0;
      min-height: 54px;
      padding: 10px 8px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.13);
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.72);
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 3px;
      font-size: 11px;
      font-weight: 700;
      line-height: 1.1;
      text-align: left;
    }

    button {
      cursor: pointer;
      transition: border-color 150ms ease, background 150ms ease, transform 150ms ease;
    }

    button:active {
      transform: scale(0.98);
    }

    button:hover {
      border-color: rgba(255, 179, 196, 0.5);
      background: rgba(211, 17, 69, 0.18);
    }

    strong {
      color: #ffffff;
      font-size: 16px;
      font-weight: 800;
      line-height: 1;
    }
  }
`;

const MobileModalBackdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 1200;
  padding: 18px;
  background: rgba(0, 0, 0, 0.62);
  display: none;
  align-items: flex-end;
  justify-content: center;
  backdrop-filter: blur(4px);

  @media (max-width: 768px) {
    display: flex;
  }
`;

const MobileMetricModal = styled(motion.div)`
  width: min(100%, 420px);
  padding: 18px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: #ffffff;
  color: #111827;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.38);
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;

  span {
    display: block;
    color: #d31145;
    font-size: 11px;
    font-weight: 800;
    line-height: 1.1;
    text-transform: uppercase;
  }

  h2 {
    margin: 5px 0 0;
    color: #111827;
    font-size: 20px;
    font-weight: 700;
    line-height: 1.15;
  }

  button {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: #f3f4f6;
    color: #6b7280;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex: 0 0 auto;

    &:hover {
      background: #fff1f5;
      color: #d31145;
    }
  }
`;

const MetricValue = styled.strong`
  display: block;
  margin-top: 18px;
  color: #d31145;
  font-size: 46px;
  font-weight: 800;
  line-height: 1;
`;

const MetricDescription = styled.p`
  margin: 14px 0 0;
  color: #374151;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.55;
  word-break: keep-all;
`;

const MetricFormula = styled.div`
  margin-top: 14px;
  padding: 12px;
  border-radius: 12px;
  background: #f9fafb;
  color: #111827;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.35;
`;

// ==========================================
// 4. OPTIMIZED COMPONENTS
// ==========================================

const DashboardGrid = memo(() => (
  <GridWrapper>
    {DASHBOARD_ITEMS.map((item, index) => (
      <CardLink href={item.href} key={item.id} data-demo={`dashboard-${item.id}`}>
        <Card $color={item.color} $index={index}>
          <CardHeader>
            <IconBox $color={item.color}><item.icon /></IconBox>
            <TextContent>
              <Title>{item.title}</Title>
              <Description>{item.desc}</Description>
            </TextContent>
          </CardHeader>
          <CardFooter>
            <ActionButton $color={item.color}>
              <span>대시보드</span>
              <FaArrowRight className="arrow-icon" />
            </ActionButton>
          </CardFooter>
        </Card>
      </CardLink>
    ))}
  </GridWrapper>
));
DashboardGrid.displayName = "DashboardGrid";

// ==========================================
// 5. FINAL PAGE EXPORT
// ==========================================

export default function MasterDashboardClient() {
  const [isOperationModalOpen, setIsOperationModalOpen] = useState(false);

  return (
    <PageContainer>
      {/* 1. 메인 콘텐츠 */}
      <MainContent
        layout
        transition={SMOOTH_TRANSITION}
      >
        <MobileIntro>
          <p>GMT Smart Factory</p>
          <h1>통합 관제 대시보드</h1>
          <MobileStatusRow aria-label="공장 현황 요약">
            <button type="button" onClick={() => setIsOperationModalOpen(true)}>
              가동률 <strong>98%</strong>
            </button>
            <span>업무영역 <strong>6</strong></span>
            <span>AI 브리핑 <strong>ON</strong></span>
          </MobileStatusRow>
        </MobileIntro>

        <DashboardGrid />

      </MainContent>

      <AnimatePresence>
        {isOperationModalOpen && (
          <MobileModalBackdrop
            role="presentation"
            onClick={() => setIsOperationModalOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MobileMetricModal
              role="dialog"
              aria-modal="true"
              aria-labelledby="operation-rate-title"
              onClick={(event) => event.stopPropagation()}
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.18 }}
            >
              <ModalHeader>
                <div>
                  <span>Operation Rate</span>
                  <h2 id="operation-rate-title">가동률 기준</h2>
                </div>
                <button type="button" onClick={() => setIsOperationModalOpen(false)} aria-label="닫기">
                  <X size={18} />
                </button>
              </ModalHeader>
              <MetricValue>98%</MetricValue>
              <MetricDescription>
                현재 값은 실시간 설비 API가 연결되기 전, 마스터 대시보드의 임시 운영 요약값입니다.
                향후 설비별 정상 가동 시간과 계획 가동 시간을 연결해 자동 계산하도록 확장할 수 있습니다.
              </MetricDescription>
              <MetricFormula>
                가동률 = 정상 가동 시간 / 계획 가동 시간 x 100
              </MetricFormula>
            </MobileMetricModal>
          </MobileModalBackdrop>
        )}
      </AnimatePresence>

      <AiAdvisorClient launcherPlacement="corner" />
    </PageContainer>
  );
}
