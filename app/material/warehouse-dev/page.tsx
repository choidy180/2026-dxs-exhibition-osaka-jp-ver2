'use client';

import React, { useState, useEffect } from 'react';
import styled, { createGlobalStyle, css } from 'styled-components';
import { motion, AnimatePresence } from "framer-motion";
import Papa from 'papaparse';
import {
  ArrowRight,
  Box,
  Truck,
  MapPin,
  Hash,
  User,
  AlertCircle,
  Search,
  Package,
  Clock,
} from "lucide-react";

// ─── [CONFIG] ─────────────────────────────────────────
// 실제 CSV 링크 (없으면 내부 더미데이터 사용)
const GOOGLE_SHEET_CSV_URL = ""; 

// ─── [LOADING SCREEN] 정성들인 로딩 화면 ───────────────

const LoadingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [text, setText] = useState("SYSTEM BOOT");
  
  useEffect(() => {
    const sequence = [
      { t: "INITIALIZING CORE...", d: 800 },
      { t: "LOADING WAREHOUSE DATA...", d: 1800 },
      { t: "SYNCING ASSETS...", d: 2800 },
      { t: "READY", d: 3600 },
    ];
    
    sequence.forEach(({ t, d }) => {
      setTimeout(() => setText(t), d);
    });
    setTimeout(onComplete, 4200);
  }, [onComplete]);

  return (
    <LoaderWrapper
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
      transition={{ duration: 0.8 }}
    >
      <div className="content">
        <div className="logo-circle">
          <motion.div 
            className="ring"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
          <Package size={40} color="#3b82f6" />
        </div>
        <motion.h2
          key={text}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          {text}
        </motion.h2>
        <div className="bar-bg">
            <motion.div 
                className="bar-fill" 
                animate={{ width: "100%" }} 
                transition={{ duration: 4, ease: "easeInOut" }}
            />
        </div>
      </div>
    </LoaderWrapper>
  );
};

// ─── [MAIN APP] ───────────────────────────────────────

export default function AppSheetStyleDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // 데이터 파싱 및 초기화
  useEffect(() => {
    const dummyCSV = `입고ID,일자,입출고구분,창고코드,창고위치코드,대차번호,포장번호,등록자,사용유무,입고시간,품목코드,장입수량
7b2583bb,2025-12-14,입고,GA,GA06,CNZKR03910800011,PKYMC100251211008,gomotec@gomotec.com,True,22:02:53,ADC30009359,18
ed3937b9,2025-12-14,입고,GB,GB04,CNZKR03910800531,PKYMC100251211036,gomotec@gomotec.com,True,23:09:25,ADC30009358,18
a2d8316b,2025-12-14,입고,GE,GE04,CNZKR03910800521,PKYMC100251211038,gomotec@gomotec.com,True,23:18:57,ADC30009358,24
1ec3c1e3,2025-12-15,출고,GA,-,CNZKR03910800011,PKYMC100251211008,gomotec@gomotec.com,True,08:17:23,ADC30009359,18
307f2581,2025-12-15,입고,GC,GC12,CNZKR03910800100,PKYMC100251211000,gomotec@gomotec.com,True,09:30:11,ADC30014326,12
ecd0134f,2025-12-15,출고,GB,-,CNZKR03910800531,PKYMC100251211036,gomotec@gomotec.com,True,10:15:44,ADC30009358,18`;

    Papa.parse(dummyCSV, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // 데이터 양을 좀 늘려서 리스트 느낌 나게
        const processed = [...results.data, ...results.data, ...results.data].map((row: any, idx) => ({
            ...row,
            uid: idx, // 고유 키
            status: row['입출고구분'] === '입고' ? 'IN' : 'OUT'
        }));
        setData(processed);
        setSelectedItem(processed[0]);
      }
    });
  }, []);

  const filteredData = data.filter(item => 
    item['대차번호']?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item['품목코드']?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <GlobalStyle />
      <AnimatePresence>
        {loading && <LoadingScreen onComplete={() => setLoading(false)} />}
      </AnimatePresence>

      {!loading && (
        <MainContainer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
            {/* 1. Header Area (AppSheet 상단 바와 유사하지만 스타일리쉬하게) */}
            <Header>
                <div className="brand">
                    <div className="icon"><Box color="white" size={20}/></div>
                    <h1>HA 대차관리시스템</h1>
                </div>
                <div className="search-wrapper">
                    <Search size={18} color="#94a3b8" />
                    <input 
                        placeholder="대차번호 또는 품목코드 검색..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </Header>

            {/* 2. Content Area (Split View 구조 유지) */}
            <ContentBody>
                
                {/* [Left] List View (목록) */}
                <ListPanel>
                    <div className="panel-title">
                        입출고 이력 <span className="count">{filteredData.length}</span>
                    </div>
                    <div className="scroll-area">
                        {filteredData.map((item) => (
                            <ListItem 
                                key={item.uid}
                                $active={selectedItem?.uid === item.uid}
                                onClick={() => setSelectedItem(item)}
                                layoutId={`card-${item.uid}`}
                            >
                                <div className="row-top">
                                    <span className="date">{item['일자']}</span>
                                    <StatusBadge $type={item.status}>{item['입출고구분']}</StatusBadge>
                                </div>
                                <div className="row-mid">
                                    <div className="cart-no">{item['대차번호']}</div>
                                </div>
                                <div className="row-btm">
                                    <span>{item['창고코드']}</span>
                                    <ArrowRight size={12} color="#cbd5e1"/>
                                    <span>{item['품목코드']}</span>
                                </div>
                            </ListItem>
                        ))}
                    </div>
                </ListPanel>

                {/* [Right] Detail View (상세) */}
                <DetailPanel>
                    <AnimatePresence mode="wait">
                        {selectedItem && (
                            <DetailCard
                                key={selectedItem.uid}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                {/* 상세 헤더 */}
                                <div className="detail-header">
                                    <div className="type-icon">
                                        {selectedItem.status === 'IN' ? <Box size={32} color="#3b82f6"/> : <Truck size={32} color="#f59e0b"/>}
                                    </div>
                                    <div className="title-group">
                                        <h2>{selectedItem['대차번호']}</h2>
                                        <span className="sub-id">ID: {selectedItem['입고ID']}</span>
                                    </div>
                                    <div className="big-status">
                                        <StatusBadge $type={selectedItem.status} $large>
                                            {selectedItem['입출고구분']} 완료
                                        </StatusBadge>
                                    </div>
                                </div>

                                <Divider />

                                {/* 그리드 정보 표시 */}
                                <InfoGrid>
                                    <InfoBox>
                                        <div className="label"><Clock size={14}/> 처리시간</div>
                                        <div className="val">{selectedItem['일자']} <span className="time">{selectedItem['입고시간'] || '00:00:00'}</span></div>
                                    </InfoBox>
                                    <InfoBox>
                                        <div className="label"><MapPin size={14}/> 창고위치</div>
                                        <div className="val highlight">
                                            {selectedItem['창고코드']} 
                                            <span className="arrow">→</span> 
                                            {selectedItem['창고위치코드'] || <span className="none">위치없음</span>}
                                        </div>
                                    </InfoBox>
                                    <InfoBox>
                                        <div className="label"><Hash size={14}/> 품목코드</div>
                                        <div className="val">{selectedItem['품목코드']}</div>
                                    </InfoBox>
                                    <InfoBox>
                                        <div className="label"><Package size={14}/> 장입수량</div>
                                        <div className="val qty">{selectedItem['장입수량']} <small>EA</small></div>
                                    </InfoBox>
                                    <InfoBox $full>
                                        <div className="label"><User size={14}/> 담당자 (등록자)</div>
                                        <div className="val email">{selectedItem['등록자']}</div>
                                    </InfoBox>
                                    <InfoBox $full>
                                        <div className="label"><AlertCircle size={14}/> 포장번호</div>
                                        <div className="val mono">{selectedItem['포장번호']}</div>
                                    </InfoBox>
                                </InfoGrid>

                                {/* 하단 액션 버튼 예시 (구조 유지) */}
                                <ActionFooter>
                                    <button className="btn secondary">이력 조회</button>
                                    <button className="btn primary">상태 변경</button>
                                </ActionFooter>

                            </DetailCard>
                        )}
                    </AnimatePresence>
                </DetailPanel>

            </ContentBody>
        </MainContainer>
      )}
    </>
  );
}

// ─── [STYLES] ─────────────────────────────────────────

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0; padding: 0;
    background-color: #f1f5f9; /* 배경은 아주 연한 회색 */
    font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    color: #1e293b;
    overflow: hidden;
  }
  * { box-sizing: border-box; }
`;

// Loader
const LoaderWrapper = styled(motion.div)`
  position: fixed; inset: 0; background: #fff; z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  .content { display: flex; flex-direction: column; align-items: center; gap: 20px; }
  .logo-circle {
    width: 80px; height: 80px; position: relative;
    display: flex; align-items: center; justify-content: center;
    .ring { position: absolute; inset: 0; border: 3px solid #eff6ff; border-top-color: #3b82f6; border-radius: 50%; }
  }
  h2 { font-size: 1rem; font-weight: 600; color: #64748b; letter-spacing: 2px; }
  .bar-bg { width: 200px; height: 4px; background: #f1f5f9; border-radius: 2px; overflow: hidden; }
  .bar-fill { height: 100%; background: #3b82f6; }
`;

// Layout
const MainContainer = styled(motion.div)`
  width: 100vw; height: 100vh;
  display: flex; flex-direction: column;
`;

const Header = styled.header`
  height: 64px; background: #fff; border-bottom: 1px solid #e2e8f0;
  display: flex; justify-content: space-between; align-items: center;
  padding: 0 24px; flex-shrink: 0; z-index: 10;
  
  .brand {
    display: flex; align-items: center; gap: 12px;
    .icon { width: 32px; height: 32px; background: #3b82f6; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
    h1 { font-size: 1.1rem; font-weight: 700; color: #0f172a; margin: 0; }
  }

  .search-wrapper {
    position: relative; display: flex; align-items: center;
    background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
    padding: 8px 12px; width: 320px; transition: all 0.2s;
    &:focus-within { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
    input { border: none; background: transparent; margin-left: 8px; outline: none; width: 100%; font-size: 0.9rem; }
  }
`;

const ContentBody = styled.div`
  flex: 1; display: flex; overflow: hidden;
`;

// Left Panel (List)
const ListPanel = styled.div`
  width: 380px; background: #fff; border-right: 1px solid #e2e8f0;
  display: flex; flex-direction: column;
  
  .panel-title {
    padding: 20px 24px; font-weight: 700; font-size: 0.95rem; color: #64748b;
    border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between;
    .count { background: #eff6ff; color: #3b82f6; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; }
  }

  .scroll-area {
    flex: 1; overflow-y: auto; padding: 12px;
    &::-webkit-scrollbar { width: 6px; }
    &::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 3px; }
  }
`;

const ListItem = styled(motion.div)<{ $active: boolean }>`
  padding: 16px; border-radius: 12px; cursor: pointer;
  margin-bottom: 8px; border: 1px solid transparent;
  background: ${props => props.$active ? '#eff6ff' : '#fff'};
  border-color: ${props => props.$active ? '#bfdbfe' : 'transparent'};
  transition: all 0.2s;
  
  &:hover { background: ${props => props.$active ? '#eff6ff' : '#f8fafc'}; }

  .row-top { display: flex; justify-content: space-between; margin-bottom: 6px; }
  .date { font-size: 0.75rem; color: #94a3b8; }
  
  .row-mid { margin-bottom: 8px; }
  .cart-no { font-weight: 700; font-size: 1rem; color: #1e293b; }

  .row-btm {
    display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: #64748b; font-family: 'JetBrains Mono', monospace;
  }
`;

// Right Panel (Detail)
const DetailPanel = styled.div`
  flex: 1; background: #f8fafc; padding: 32px;
  overflow-y: auto; display: flex; justify-content: center; align-items: flex-start;
`;

const DetailCard = styled(motion.div)`
  background: #fff; width: 100%; max-width: 800px;
  border-radius: 24px; box-shadow: 0 20px 40px -4px rgba(0,0,0,0.05);
  border: 1px solid #f1f5f9; padding: 40px;
  
  .detail-header {
    display: flex; align-items: center; gap: 20px; margin-bottom: 30px;
    .type-icon { 
      width: 64px; height: 64px; background: #f8fafc; border-radius: 20px; 
      display: flex; align-items: center; justify-content: center;
    }
    .title-group {
      flex: 1;
      h2 { margin: 0 0 4px 0; font-size: 1.8rem; font-weight: 800; color: #0f172a; }
      .sub-id { color: #94a3b8; font-size: 0.9rem; font-family: monospace; }
    }
  }
`;

const Divider = styled.div` height: 1px; background: #f1f5f9; margin: 24px 0; `;

const InfoGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 40px;
`;

const InfoBox = styled.div<{ $full?: boolean }>`
  grid-column: ${props => props.$full ? 'span 2' : 'span 1'};
  background: #fff;
  
  .label { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; font-weight: 600; color: #94a3b8; margin-bottom: 8px; }
  .val { 
    font-size: 1.1rem; color: #334155; font-weight: 500;
    &.highlight { font-size: 1.25rem; font-weight: 700; color: #0f172a; }
    &.qty { font-size: 1.4rem; font-weight: 800; color: #3b82f6; }
    &.mono { font-family: monospace; background: #f1f5f9; padding: 8px 12px; border-radius: 8px; display: inline-block; font-size: 0.95rem;}
    &.email { color: #64748b; }
    
    .time { font-size: 0.9rem; color: #94a3b8; margin-left: 8px; }
    .arrow { color: #cbd5e1; margin: 0 8px; }
    .none { color: #cbd5e1; font-style: italic; }
    small { font-size: 0.9rem; color: #94a3b8; font-weight: 500; margin-left: 4px; }
  }
`;

const ActionFooter = styled.div`
  display: flex; justify-content: flex-end; gap: 12px;
  .btn {
    padding: 12px 24px; border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: none; font-size: 0.95rem;
    &.secondary { background: #f1f5f9; color: #64748b; &:hover { background: #e2e8f0; } }
    &.primary { background: #3b82f6; color: white; &:hover { background: #2563eb; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(59,130,246,0.3); } }
  }
`;

const StatusBadge = styled.span<{ $type: string, $large?: boolean }>`
  display: inline-flex; align-items: center; justify-content: center;
  padding: ${props => props.$large ? '8px 16px' : '4px 10px'};
  border-radius: 99px;
  font-weight: 700;
  font-size: ${props => props.$large ? '1rem' : '0.75rem'};
  
  ${props => props.$type === 'IN' 
    ? css`background: #ecfdf5; color: #059669; border: 1px solid #d1fae5;`
    : css`background: #fff7ed; color: #d97706; border: 1px solid #ffedd5;`
  }
`;