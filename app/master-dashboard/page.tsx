"use client";

import React, { useState, useRef, useEffect, useMemo, memo } from "react";
import Link from 'next/link';
import { usePathname } from "next/navigation";
import styled, { css, keyframes } from "styled-components";
import { 
  Send, Bot, Sparkles, MessageSquare, ChevronRight, BarChart3, X
} from "lucide-react";
import { 
  FaDolly, FaEye, FaCogs, FaChartLine, FaHardHat, FaTruck, FaArrowRight 
} from 'react-icons/fa';
import type { IconType } from 'react-icons';
import { AnimatePresence, motion } from "framer-motion";

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

type AgentContext = {
  role: "manager" | "specialist";
  name: string;
  description: string;
  guide: string;
  suggestions: string[];
};

const AGENT_DATA: Record<string, AgentContext> = {
  "/master-dashboard": {
    role: "manager",
    name: "GMT 공장장 AI",
    description: "전체 공장 현황 총괄 브리핑",
    guide: "반갑습니다. 현재 전체 공장 가동률은 98%입니다. 핵심 지표 리포트가 준비되었습니다.",
    suggestions: ["가동률 상세 보고", "금일 생산 목표", "에너지 효율 분석"],
  },
  "default": {
    role: "specialist",
    name: "파트장 AI",
    description: "시스템 가이드 및 지원",
    guide: "우측 패널에서 실시간으로 업무 지원을 받으실 수 있습니다.",
    suggestions: ["이 페이지 사용법", "데이터 내보내기", "오류 리포트"],
  }
};

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

type MessageRole = 'user' | 'assistant';

type Message = {
  role: MessageRole;
  content: string;
  suggestions?: string[];
};

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

const ContentOverlay = styled(motion.div)`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.2); 
  z-index: 10;
  cursor: pointer;
  backdrop-filter: blur(2px);

  @media (max-width: 768px) {
    position: fixed;
  }
`;

const SidebarWrapper = styled(motion.div)`
  height: 100%;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  z-index: 20;
  overflow: hidden; 
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: -10px 0 40px rgba(0,0,0,0.3);
  display: flex;
  flex-direction: column;
  will-change: width;

  @media (max-width: 768px) {
    position: fixed;
    inset: 0;
    width: 100vw !important;
    height: 100svh;
    border-left: 0;
    border-radius: 0;
    z-index: 1000;
  }
`;

const SidebarInner = styled.div`
  width: 450px; 
  min-width: 450px; 
  height: 100%;
  display: flex;
  flex-direction: column;

  @media (max-width: 768px) {
    width: 100vw;
    min-width: 0;
  }
`;

const FloatingButtonWrapper = styled.div`
  position: absolute;
  bottom: 30px;
  right: 30px;
  z-index: 100;

  @media (max-width: 768px) {
    position: fixed;
    right: 16px;
    bottom: calc(16px + env(safe-area-inset-bottom));
    left: 16px;
  }
`;

const NavbarTrigger = styled(motion.button)`
  display: flex; align-items: center; gap: 8px;
  padding: 12px 24px; height: 52px; border-radius: 12px;
  border: none;
  background: #ffffff; color: #374151;
  font-weight: 600; font-size: 15px; cursor: pointer;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  transition: all 0.2s cubic-bezier(0.2, 0, 0.2, 1);

  &:hover {
    background: #FFF0F3; color: #D31145; 
    box-shadow: 0 8px 25px rgba(211, 17, 69, 0.3);
    transform: translateY(-2px);
  }
  svg { color: #D31145; }

  @media (max-width: 768px) {
    width: 100%;
    height: 54px;
    justify-content: center;
    border-radius: 14px;
    box-shadow: 0 12px 30px rgba(0,0,0,0.32);
  }
`;

// ==========================================
// 3. STYLED COMPONENTS (DASHBOARD & CHAT)
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

const ChatHeader = styled.div`
  padding: 24px; background: transparent; border-bottom: 1px solid #f3f4f6;
  display: flex; justify-content: space-between; align-items: flex-start;
  .header-content {
    display: flex; gap: 14px; align-items: center;
    .avatar-box {
      width: 48px; height: 48px; border-radius: 14px; background: #FFF0F3; color: #D31145;
      display: flex; align-items: center; justify-content: center; font-size: 24px;
    }
    .text-box {
      h2 { margin: 0; font-size: 17px; font-weight: 700; color: #111; display: flex; align-items: center; gap: 6px; }
      p { margin: 4px 0 0; font-size: 13px; color: #6b7280; }
    }
  }
  .close-btn {
    width: 36px; height: 36px; border-radius: 50%;
    background: #f3f4f6; border: none; color: #9ca3af; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s;
    &:hover { background: #e5e7eb; color: #374151; transform: scale(1.1); }
  }

  @media (max-width: 768px) {
    padding: calc(16px + env(safe-area-inset-top)) 16px 16px;
    align-items: center;

    .header-content {
      min-width: 0;
      gap: 12px;

      .avatar-box {
        width: 42px;
        height: 42px;
        border-radius: 12px;
      }

      .text-box {
        min-width: 0;

        h2 {
          font-size: 16px;
        }

        p {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 220px;
        }
      }
    }

    .close-btn {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      flex: 0 0 auto;
    }
  }
`;

const MessageList = styled.div`
  flex: 1; padding: 24px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; background: transparent;
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 3px; }

  @media (max-width: 768px) {
    padding: 16px;
    gap: 14px;
  }
`;

const Bubble = styled(motion.div)<{ $isUser: boolean }>`
  max-width: 88%; padding: 12px 16px; font-size: 14px; line-height: 1.5; border-radius: 18px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  white-space: pre-wrap;
  word-break: break-word;
  ${props => props.$isUser ? css`
    align-self: flex-end; background: #D31145; color: white; border-bottom-right-radius: 4px;
  ` : css`
    align-self: flex-start; background: #ffffff; color: #1f2937; border-top-left-radius: 4px; border: 1px solid #f3f4f6;
  `}

  @media (max-width: 768px) {
    max-width: 92%;
    padding: 11px 14px;
    font-size: 14px;
    border-radius: 16px;
  }
`;

const SuggestionArea = styled.div` display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; `;
const Chip = styled.button`
  background: #fff; border: 1px solid #e5e7eb; padding: 6px 12px; border-radius: 16px;
  font-size: 12px; color: #4b5563; cursor: pointer; display: flex; align-items: center; gap: 4px;
  transition: all 0.2s;
  &:hover { border-color: #D31145; color: #D31145; background: #FFF0F3; transform: translateY(-1px); }

  @media (max-width: 768px) {
    min-height: 34px;
    border-radius: 10px;
  }
`;

const InputArea = styled.form`
  padding: 20px 24px; background: transparent; border-top: 1px solid #f3f4f6; display: flex; gap: 10px; align-items: center;
  input {
    flex: 1; padding: 14px 18px; border-radius: 24px; border: 1px solid #e5e7eb; background: #ffffff; outline: none;
    font-size: 14px; transition: all 0.2s;
    &:focus { border-color: #D31145; box-shadow: 0 0 0 3px rgba(211, 17, 69, 0.1); }
    &:disabled { background: #f3f4f6; cursor: not-allowed; }
  }
  button {
    width: 48px; height: 48px; border-radius: 50%; background: #111; color: white; border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center; transition: all 0.2s;
    &:hover:not(:disabled) { background: #D31145; transform: scale(1.1); }
    &:disabled { background: #9ca3af; cursor: not-allowed; }
  }

  @media (max-width: 768px) {
    padding: 14px 16px calc(14px + env(safe-area-inset-bottom));
    gap: 8px;

    input {
      min-width: 0;
      height: 46px;
      padding: 0 15px;
      border-radius: 14px;
      font-size: 14px;
    }

    button {
      width: 46px;
      height: 46px;
      border-radius: 14px;
      flex: 0 0 auto;
    }
  }
`;

// ==========================================
// 4. OPTIMIZED COMPONENTS
// ==========================================

const ChatInterface = memo(({ onClose }: { onClose: () => void }) => {
  const pathname = usePathname();
  const currentPath = pathname || "";
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ctx = useMemo(() => {
    if (currentPath.includes("/master-dashboard")) return AGENT_DATA["/master-dashboard"];
    return AGENT_DATA["default"];
  }, [currentPath]);

  // 전송 가능 여부 체크
  const canSend = useMemo(() => {
    return input.trim().length > 0 && !loading;
  }, [input, loading]);

  useEffect(() => {
    setMessages([{ 
      role: 'assistant', 
      content: ctx.guide, 
      suggestions: ctx.suggestions 
    }]);
  }, [ctx.guide, ctx.suggestions]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]); // 로딩 상태 변경 시에도 스크롤 내림

  const handleSend = async (textToUse: string) => {
    const text = textToUse.trim();
    if (!text || loading) return;

    const userMessage: Message = { role: 'user', content: text };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: typeof data?.error === 'string' ? `오류: ${data.error}` : '오류가 발생했습니다.',
        }]);
        return;
      }

      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: typeof data?.answer === 'string' && data.answer.trim() ? data.answer : '응답이 비어 있습니다.',
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: '네트워크 오류가 발생했습니다.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidebarInner>
      <ChatHeader>
        <div className="header-content">
          <div className="avatar-box">
            {ctx.role === 'manager' ? <BarChart3 size={24}/> : <Bot size={24}/>}
          </div>
          <div className="text-box">
            <h2>{ctx.name} <Sparkles size={14} fill="#FFD700" color="#FFD700"/></h2>
            <p>{ctx.description}</p>
          </div>
        </div>
        <button className="close-btn" onClick={onClose}><X size={20}/></button>
      </ChatHeader>

      <MessageList>
        {messages.map((m, i) => {
          const isUser = m.role === 'user';
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
              <Bubble 
                $isUser={isUser}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                {m.content}
              </Bubble>
              {!isUser && m.suggestions && (
                <SuggestionArea>
                  {m.suggestions.map((sug: string) => (
                    <Chip key={sug} onClick={() => handleSend(sug)} disabled={loading}>
                      <MessageSquare size={12} /> {sug} <ChevronRight size={12} style={{opacity: 0.5}}/>
                    </Chip>
                  ))}
                </SuggestionArea>
              )}
            </div>
          );
        })}

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <Bubble 
              $isUser={false}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              응답 생성 중...
            </Bubble>
          </div>
        )}
        <div ref={scrollRef}/>
      </MessageList>

      <InputArea onSubmit={(e) => { e.preventDefault(); handleSend(input); }}>
        <input 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          placeholder="AI에게 업무 지시..." 
          disabled={loading}
        />
        <button type="submit" disabled={!canSend}>
          <Send size={18}/>
        </button>
      </InputArea>
    </SidebarInner>
  );
});
ChatInterface.displayName = "ChatInterface";

const DashboardGrid = memo(() => (
  <GridWrapper>
    {DASHBOARD_ITEMS.map((item, index) => (
      <CardLink href={item.href} key={item.id}>
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

export default function IntegratedDashboard() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isOperationModalOpen, setIsOperationModalOpen] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const syncMobile = () => setIsMobile(media.matches);

    syncMobile();
    media.addEventListener("change", syncMobile);
    return () => media.removeEventListener("change", syncMobile);
  }, []);

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

        {/* 바깥 영역 클릭시 닫히는 오버레이 (조건부 렌더링) */}
        <AnimatePresence>
          {isChatOpen && (
            <ContentOverlay 
              onClick={() => setIsChatOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}
        </AnimatePresence>
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

      {/* 2. 사이드바 (Push Effect) */}
      <AnimatePresence mode="wait">
        {isChatOpen && (
          <SidebarWrapper
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: isMobile ? "100%" : 450, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={SMOOTH_TRANSITION}
          >
            <ChatInterface onClose={() => setIsChatOpen(false)} />
          </SidebarWrapper>
        )}
      </AnimatePresence>
      
      {/* 3. 플로팅 트리거 버튼 */}
      <AnimatePresence>
        {!isChatOpen && (
          <FloatingButtonWrapper>
            <NavbarTrigger 
              onClick={() => setIsChatOpen(true)}
              initial={{ scale: 0, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0, opacity: 0, y: 20 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <Bot size={20} />
              <span>AI Advisor</span>
            </NavbarTrigger>
          </FloatingButtonWrapper>
        )}
      </AnimatePresence>

    </PageContainer>
  );
}
