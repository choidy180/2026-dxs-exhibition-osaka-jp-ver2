"use client";

import React from 'react';
import styled, { keyframes } from 'styled-components';
import Link from 'next/link';
import { 
  FaDolly, 
  FaEye, 
  FaCogs, 
  FaChartLine, 
  FaHardHat, 
  FaTruck,
  FaArrowRight 
} from 'react-icons/fa';

// --- Types & Data ---
type CardData = {
  id: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ size?: number | string; color?: string }>;
  color: string;
  href: string;
};

// [수정] 제공해주신 subMenuData의 첫 번째 메뉴 경로로 href 업데이트 완료
const DASHBOARD_ITEMS: CardData[] = [
  { 
    id: "01", 
    title: "자재관리", 
    desc: "입고 및 적재 효율화", 
    icon: FaDolly, 
    color: "#00A651", 
    href: "/material/inbound-inspection" // 입고검수
  },
  { 
    id: "02", 
    title: "공정품질", 
    desc: "AI 비전 기반 품질 판정", 
    icon: FaEye, 
    color: "#E11D48", 
    href: "/production/glass-gap-check" // 유리틈새검사
  },
  { 
    id: "03", 
    title: "공정설비", 
    desc: "설비 이상 징후 사전 탐지", 
    icon: FaCogs, 
    color: "#2563EB", 
    href: "/production/line-monitoring" // 발포 품질 예측
  },
  { 
    id: "04", 
    title: "생산관리", 
    desc: "공정 시간 및 병목 분석", 
    icon: FaChartLine, 
    color: "#00A651", 
    href: "/production/takttime-dashboard" // 작업시간관리
  },
  { 
    id: "05", 
    title: "작업관리", 
    desc: "Physical AI 환경 최적화", 
    icon: FaHardHat, 
    color: "#E11D48", 
    href: "/production/pysical-ai" // Pysical AI
  },
  { 
    id: "06", 
    title: "출하관리", 
    desc: "실시간 물류 및 배송 추적", 
    icon: FaTruck, 
    color: "#2563EB", 
    href: "/transport/warehouse-management" // 제품창고
  },
];

// --- Animations ---

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// --- Styled Components ---

const Container = styled.div`
  width: 100%;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 60px 40px;
  font-family: var(--font-pretendard), 'Pretendard', sans-serif;
  position: relative;
  overflow: hidden;

  /* 배경 이미지 + 어두운 오버레이 */
  &::before {
    content: '';
    position: absolute;
    top: -20px; left: -20px; right: -20px; bottom: -20px;
    background: linear-gradient(135deg, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.5)), url('/images/gmt_back.png') no-repeat center center / cover;
    z-index: 0;
  }
`;

const GridWrapper = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
  width: 100%;
  max-width: 1400px;
  position: relative;
  z-index: 1;
  
  @media (max-width: 1200px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`;

const CardLink = styled(Link)`
  text-decoration: none;
  color: inherit;
  display: block;
`;

const Card = styled.div<{ $color: string; $index: number }>`
  /* Glassmorphism 효과 */
  background: rgba(255, 255, 255, 0.85); 
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  
  border-radius: 20px;
  padding: 36px 32px;
  
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 270px;

  /* 등장 애니메이션 */
  opacity: 0;
  animation: ${fadeInUp} 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  animation-delay: ${props => props.$index * 0.1}s;

  transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), 
              box-shadow 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94),
              background 0.3s ease;

  /* 호버 인터랙션 */
  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
    background: rgba(255, 255, 255, 0.95);
    border-color: rgba(255, 255, 255, 0.9);
  }

  &:hover .icon-box {
    background: ${props => props.$color}20;
    transform: scale(1.05);
    color: ${props => props.$color};
  }

  &:hover .view-link {
    color: ${props => props.$color};
  }
  
  &:hover .arrow-icon {
    transform: translateX(6px);
    opacity: 1;
  }
`;

const CardHeader = styled.div`
  /* Layout Wrapper */
`;

const FlexRow = styled.div`
  display: flex;
  align-items: center;
  gap: 28px;
  height: 100%;
`;

const IconBox = styled.div<{ $color: string }>`
  width: 84px;
  height: 84px;
  border-radius: 20px;
  background: ${props => props.$color}10;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.$color}; 
  font-size: 38px;
  flex-shrink: 0;
  
  transition: all 0.3s ease;
  
  &.icon-box {}
`;

const TextContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
`;

const Title = styled.h2`
  font-size: 26px;
  font-weight: 800;
  color: #1a1a1a;
  margin: 0;
  letter-spacing: -0.02em;
  line-height: 1.2;
`;

const Description = styled.p`
  font-size: 17px;
  color: #666;
  font-weight: 500;
  margin: 0;
  line-height: 1.5;
  word-break: keep-all;
`;

const CardFooter = styled.div`
  margin-top: auto;
  padding-top: 24px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
`;

const ViewLink = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  font-size: 15px;
  font-weight: 700;
  color: #888;
  transition: color 0.3s ease;
  cursor: pointer;
  
  &.view-link {}

  .arrow-icon {
    transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
`;

// --- Component ---
export default function DashboardGrid() {
  return (
    <Container>
      <GridWrapper>
        {DASHBOARD_ITEMS.map((item, index) => (
          <CardLink href={item.href} key={item.id}>
            <Card $color={item.color} $index={index}>
              <CardHeader>
                <FlexRow>
                  <IconBox $color={item.color} className="icon-box">
                    <item.icon />
                  </IconBox>
                  
                  <TextContent>
                    <Title>{item.title}</Title>
                    <Description>{item.desc}</Description>
                  </TextContent>
                </FlexRow>
              </CardHeader>
              
              <CardFooter>
                <ViewLink className="view-link">
                  <span>View Dashboard</span>
                  <FaArrowRight size={14} className="arrow-icon" />
                </ViewLink>
              </CardFooter>
            </Card>
          </CardLink>
        ))}
      </GridWrapper>
    </Container>
  );
}