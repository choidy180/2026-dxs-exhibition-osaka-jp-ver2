"use client";

import React from "react";
import styled, { createGlobalStyle } from "styled-components";
import { motion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  Cpu,
  TrendingUp,
  Activity,
  ArrowUpRight,
  Database,
  Layers,
  Download,
} from "lucide-react";
import FloatingLines from "@/components/floating-lines";

// --- Global & Layout Styles ---
const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    padding: 0;
    background-color: #050505;
    color: #fff;
    font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    overflow: hidden; /* 스크롤 방지 */
  }
`;

const PageWrapper = styled.div`
  width: 100vw;
  height: 100vh;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #000;
  padding: 24px;
  box-sizing: border-box;
`;

const BackgroundLayer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none; /* 배경 클릭 방지 */
`;

// 그리드 레이아웃 수정: minmax(0, ...)을 추가하여 내용이 넘칠 때 강제로 늘어나는 것 방지
const GridContainer = styled(motion.div)`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  grid-template-rows: minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, 1fr); 
  gap: 20px;
  width: 100%;
  max-width: 1800px;
  height: 100%;
  z-index: 10;
`;

const Card = styled(motion.div)<{ $col?: number; $row?: number; $bg?: string }>`
  grid-column: span ${(props) => props.$col || 1};
  grid-row: span ${(props) => props.$row || 1};
  background: ${(props) => props.$bg || "rgba(22, 22, 24, 0.7)"};
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 32px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  min-height: 0; /* Flex item overflow fix */
  min-width: 0;  /* Grid item overflow fix */

  &:hover {
    border-color: rgba(255, 255, 255, 0.2);
  }
`;

// --- Typography & Elements ---
const CardTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #8a8a8e;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex-shrink: 0; /* 제목이 찌그러지지 않도록 고정 */
`;

const BigNumber = styled.div`
  font-size: clamp(20px, 3vw, 50px); /* 화면 크기에 따라 폰트 조절 */
  font-weight: 700;
  color: #f5f5f7;
  letter-spacing: -1px;
  margin-bottom: 8px;
`;

const TrendBadge = styled.div<{ $color?: string }>`
  color: ${(props) => props.$color || "#30D158"};
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const MainTitle = styled.h1`
  font-size: clamp(32px, 3vw, 20px);
  font-weight: 800;
  margin: 0 0 10px 0;
  background: linear-gradient(90deg, #fff, #a1a1aa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const Description = styled.p`
  font-size: 15px;
  color: #a1a1aa;
  line-height: 1.3;
  margin: 0;
  max-width: 90%;
`;

const TagContainer = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 24px;
`;

const Tag = styled.span`
  background: rgba(255, 255, 255, 0.1);
  color: #e5e5ea;
  padding: 8px 16px;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

// [수정됨] last 속성 에러 해결을 위해 :last-child 사용
const TimelineItem = styled.li<{ $active?: boolean }>`
  display: flex;
  gap: 16px;
  align-items: flex-start;
  position: relative;
  padding-bottom: 20px;
  opacity: ${(props) => (props.$active ? 1 : 0.4)};

  &:last-child {
    padding-bottom: 0;
  }
  
  /* 점과 점 사이를 잇는 선 */
  &::before {
    content: '';
    position: absolute;
    left: 6px;
    top: 20px;
    bottom: 0;
    width: 2px;
    background: #333;
    display: block;
  }

  /* 마지막 아이템은 선을 숨김 (테마 속성 대신 CSS 선택자 사용) */
  &:last-child::before {
    display: none;
  }
`;

const Dot = styled.div<{ $active?: boolean }>`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: ${(props) => (props.$active ? "#30D158" : "#333")};
  box-shadow: ${(props) => (props.$active ? "0 0 10px #30D158" : "none")};
  flex-shrink: 0;
  margin-top: 4px;
  z-index: 1;
`;

const Button = styled.button`
  background: #fff;
  color: #000;
  border: none;
  padding: 8px 24px;
  border-radius: 100px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  width: fit-content;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.05);
  }
`;

// 차트를 감싸는 컨테이너 (flex-grow를 사용하여 남은 공간을 꽉 채움)
const ChartWrapper = styled.div`
  flex: 1;
  width: 100%;
  min-height: 0; /* 중요: 부모 높이를 넘지 않도록 함 */
  position: relative;
`;

// --- Data ---
const performanceData = [
  { name: "1주", value: 45 }, { name: "2주", value: 46 }, { name: "3주", value: 45 },
  { name: "4주", value: 47 }, { name: "5주", value: 46 }, { name: "6주", value: 55 }, 
  { name: "7주", value: 72 }, { name: "8주", value: 81 }, { name: "9주", value: 86 },
  { name: "10주", value: 89 }, { name: "11주", value: 92 }, { name: "12주", value: 94 },
];

const costData = [
  { name: "Jan", value: 50 }, { name: "Feb", value: 48 }, { name: "Mar", value: 47 },
  { name: "Apr", value: 30 }, { name: "May", value: 25 }, { name: "Jun", value: 22 },
];

export default function DashboardPage() {
  return (
    <>
      <GlobalStyle />
      <PageWrapper>
        {/* 1. 배경 (FloatingLines) */}
        <BackgroundLayer>
          <FloatingLines
            enabledWaves={["top", "middle", "bottom"]}
            lineCount={[3, 5, 4]}
            lineDistance={6}
            animationSpeed={0.4}
            bendStrength={0.5}
            linesGradient={["#0A84FF", "#5E5CE6", "#BF5AF2"]}
            interactive={true}
          />
        </BackgroundLayer>

        {/* 2. 메인 컨텐츠 그리드 */}
        <GridContainer
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
        >
          {/* Row 1, Col 1: Title Card */}
          <Card $col={1} style={{ justifyContent: "center" }}>
            <Tag style={{ width: "fit-content", marginBottom: "12px", background: "rgba(10, 132, 255, 0.2)", color: "#5ac8fa", borderColor: "transparent" }}>
              AI Smart Factory v2.0
            </Tag>
            <MainTitle>공정 지능화 성과 보고</MainTitle>
            <Description>
              딥러닝 기반 이상 탐지 모델(Anomaly Detection) 도입으로
              <br />
              생산 병목 현상을 해결하고 비용 구조를 혁신했습니다.
            </Description>
            <TagContainer>
              <Tag>Next.js</Tag>
              <Tag>TensorFlow</Tag>
              <Tag>Edge Computing</Tag>
              <Tag>Real-time</Tag>
            </TagContainer>
            <Cpu size={120} style={{ position: "absolute", right: -20, top: -20, opacity: 0.1, color: "#0A84FF" }} />
          </Card>

          {/* Row 1, Col 2: Efficiency Metric */}
          <Card $col={1}>
            <CardTitle><Activity size={18} /> 공정 효율성 (OEE)</CardTitle>
            <div style={{ marginTop: "auto" }}>
              <BigNumber>89%</BigNumber>
              <TrendBadge><ArrowUpRight size={20} /> 기존 대비 +42% 상승</TrendBadge>
            </div>
          </Card>

          {/* Row 1, Col 3: Cost Metric */}
          <Card $col={1}>
            <CardTitle><Database size={18} /> 월간 비용 절감</CardTitle>
            <div style={{ marginTop: "auto" }}>
              <BigNumber>₩1.2억</BigNumber>
              <TrendBadge><ArrowUpRight size={20} /> 불량률 0.04% 달성</TrendBadge>
            </div>
          </Card>

          {/* Row 2, Col 1 (Span 2): Main Chart */}
          <Card $col={2}>
            <CardTitle><TrendingUp size={18} /> AI 도입 전/후 성과 추이 및 예측</CardTitle>
            <ChartWrapper>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performanceData}>
                  <defs>
                    <linearGradient id="colorPerf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0A84FF" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#0A84FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#666", fontSize: 12 }} />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1c1c1e", border: "none", borderRadius: "8px", color: "#fff" }}
                    itemStyle={{ color: "#0A84FF" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#0A84FF"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorPerf)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartWrapper>
          </Card>

          {/* Row 2, Col 3: Timeline Steps */}
          <Card $col={1}>
            <CardTitle><Layers size={18} /> 적용 기술 단계</CardTitle>
            <ul style={{ listStyle: "none", padding: 0, marginTop: "20px" }}>
              <TimelineItem $active>
                <Dot $active />
                <div>
                  <div style={{ fontWeight: "700", fontSize: "16px" }}>데이터 수집</div>
                  <div style={{ fontSize: "13px", color: "#888" }}>IoT 센서 연동</div>
                </div>
              </TimelineItem>
              <TimelineItem $active>
                <Dot $active />
                <div>
                  <div style={{ fontWeight: "700", fontSize: "16px" }}>AI 모델 학습</div>
                  <div style={{ fontSize: "13px", color: "#888" }}>패턴 인식 완료</div>
                </div>
              </TimelineItem>
              <TimelineItem $active>
                <Dot $active />
                <div>
                  <div style={{ fontWeight: "700", fontSize: "16px" }}>자동 제어</div>
                  <div style={{ fontSize: "13px", color: "#888" }}>실시간 피드백</div>
                </div>
              </TimelineItem>
            </ul>
          </Card>

          {/* Row 3, Col 1 (Span 2): Cost Bar Chart */}
          <Card $col={2}>
            <CardTitle><TrendingUp size={18} /> 운영 비용 최적화 (단위: 만원)</CardTitle>
            <ChartWrapper>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={costData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#666" }} />
                  <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} contentStyle={{ backgroundColor: "#1c1c1e", border: "none", borderRadius: "8px" }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {costData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index >= 3 ? "#30D158" : "#3a3a3c"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartWrapper>
          </Card>

          {/* Row 3, Col 3: Green Info Card */}
          <Card $col={1} $bg="linear-gradient(145deg, rgba(20, 50, 25, 0.8), rgba(0, 20, 5, 0.9))" style={{ borderColor: "rgba(48, 209, 88, 0.2)" }}>
            <CardTitle style={{ color: "#30D158" }}>FUTURE ROADMAP</CardTitle>
            <h2 style={{ fontSize: "22px", margin: "0 0 12px 0", color: "#fff" }}>완전 자동화 달성 예측</h2>
            <Description style={{ fontSize: "14px", color: "#ccc" }}>
              현재 추세대로라면 <b>3분기 내 무인 공정률 95%</b> 달성이 예상됩니다. 
              추가적으로 에너지 관리 시스템(EMS) 연동 시 연간 <b>3.5억 원</b>의 추가 절감이 가능합니다.
            </Description>
            <Button>
              상세 리포트 다운로드
              <Download size={16} />
            </Button>
          </Card>

        </GridContainer>
      </PageWrapper>
    </>
  );
}