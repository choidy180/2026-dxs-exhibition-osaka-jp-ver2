"use client";

import React from "react";
import styled, { keyframes } from "styled-components";
import { Box, RefreshCw } from "lucide-react"; // 아이콘 라이브러리 (없으면 제외 가능)

// --- 애니메이션 정의 ---
const rotate = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(6, 182, 212, 0.4); }
  70% { box-shadow: 0 0 0 20px rgba(6, 182, 212, 0); }
  100% { box-shadow: 0 0 0 0 rgba(6, 182, 212, 0); }
`;

const scan = keyframes`
  0% { top: 0%; opacity: 0; }
  50% { opacity: 1; }
  100% { top: 100%; opacity: 0; }
`;

// --- 스타일 컴포넌트 ---
const Container = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100vh;
  background-color: #0b0c15; /* 깊은 우주색 */
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 40px 40px; /* 그리드 패턴 */
  position: relative;
  overflow: hidden;
  color: #fff;
`;

const CircleInterface = styled.div`
  position: relative;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  border: 1px solid rgba(6, 182, 212, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 40px;
  
  &::before {
    content: '';
    position: absolute;
    top: -10px; left: -10px; right: -10px; bottom: -10px;
    border-radius: 50%;
    border: 2px dashed rgba(6, 182, 212, 0.6);
    border-top-color: transparent;
    border-bottom-color: transparent;
    animation: ${rotate} 10s linear infinite;
  }

  &::after {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    animation: ${pulse} 2s infinite;
  }
`;

const IconWrapper = styled.div`
  color: #06b6d4; /* Cyan Neon */
  filter: drop-shadow(0 0 10px rgba(6, 182, 212, 0.8));
`;

const Title = styled.h2`
  font-size: 1.8rem;
  font-weight: 700;
  letter-spacing: 2px;
  margin: 0;
  background: linear-gradient(90deg, #fff, #06b6d4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-transform: uppercase;
`;

const SubTitle = styled.p`
  font-size: 0.9rem;
  color: #94a3b8;
  margin-top: 10px;
  letter-spacing: 1px;
  
  span {
    color: #06b6d4;
    font-weight: bold;
  }
`;

const StatusBadge = styled.div`
  margin-top: 30px;
  padding: 8px 16px;
  background: rgba(6, 182, 212, 0.1);
  border: 1px solid rgba(6, 182, 212, 0.3);
  border-radius: 20px;
  font-size: 0.8rem;
  color: #06b6d4;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ScanLine = styled.div`
  position: absolute;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #06b6d4, transparent);
  animation: ${scan} 3s linear infinite;
  opacity: 0.5;
`;

const AiMaterialPlaceholder = () => {
  return (
    <Container>
      <ScanLine />
      
      <CircleInterface>
        <IconWrapper>
          {/* 자재 관리를 상징하는 Box 아이콘, 혹은 Lock 아이콘 */}
          <Box size={64} strokeWidth={1.5} />
        </IconWrapper>
      </CircleInterface>

      <Title>System Module Locked</Title>
      
      <SubTitle>
        현재 <span>시스템 준비 중</span>입니다.
      </SubTitle>
      <SubTitle style={{ fontSize: '0.8rem', opacity: 0.7 }}>
        currently building a system...
      </SubTitle>

      <StatusBadge>
        <RefreshCw size={14} className="animate-spin" /> 
        Development in Progress
      </StatusBadge>
    </Container>
  );
};

export default AiMaterialPlaceholder;
