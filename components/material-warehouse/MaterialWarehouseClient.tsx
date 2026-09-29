'use client';

import React, { useState, useMemo } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid,
  X,
  Search,
  Box,
  MapPin,
  User,
  LogOut,
  Settings,
  ChevronRight,
  History,
} from "lucide-react";

// ─── [1. INTERFACES & DATA] ────────────────────────

interface SlotData {
  no: number;
  active: boolean;
}

interface ZoneData {
  id: string;
  total: number;
  used: number;
  free: number;
  status: string;
  slots: SlotData[];
}

interface InventoryItem {
  code: string;
  qty: number;
  loc: string;
}

// ─── [2. SUB-COMPONENTS] ──────────────────────────

// 2-1. Inventory Item
const MemoizedInventoryItem = React.memo(({ item }: { item: InventoryItem }) => (
  <InvItem>
    <div className="info">
      <div className="code">{item.code}</div>
      <div className="loc"><MapPin size={12} /> {item.loc}</div>
    </div>
    <div className="qty">{item.qty}</div>
  </InvItem>
));
MemoizedInventoryItem.displayName = 'MemoizedInventoryItem';

// 2-2. Slot Component
const MemoizedSlot = React.memo(({ s }: { s: SlotData }) => (
  <Slot $active={s.active}>
    <span className="no">{s.no}</span>
    {s.active && (
      <div className="icon-box">
        <Box size={17} fill="#C40037" color="#FDEDF1" />
      </div>
    )}
  </Slot>
));
MemoizedSlot.displayName = 'MemoizedSlot';

// 2-3. Zone Column Component
const ZoneColumn = React.memo(({ zone, index }: { zone: ZoneData, index: number }) => (
  <ZoneColumnWrapper
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
  >
    <div className="z-head">
      <div className="top">
        <span className="id">{zone.id}</span>
        <span className={`st ${zone.status === '만차' ? 'r' : zone.status === '혼잡' ? 'o' : 'g'}`}>{zone.status}</span>
      </div>
      <div className="usage-text">
        <span>점유율</span>
        <b>{Math.round((zone.used / zone.total) * 100)}%</b>
      </div>
      <div className="bar">
        <div className="fill" style={{ width: `${(zone.used / zone.total) * 100}%` }} />
      </div>
    </div>
    <div className="slot-grid-container">
      <div className="slot-grid">
        {zone.slots.map((s) => (
          <MemoizedSlot key={s.no} s={s} />
        ))}
      </div>
    </div>
  </ZoneColumnWrapper>
));
ZoneColumn.displayName = 'ZoneColumn';

// ─── [3. MAIN DASHBOARD] ─────────────────────────────

export default function WarehouseDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const initialMapData: ZoneData[] = [
    { id: 'D101', total: 10, used: 2, free: 8, status: '여유', slots: Array.from({ length: 10 }, (_, i) => ({ no: i + 1, active: i < 2 })) },
    { id: 'D102', total: 19, used: 15, free: 4, status: '혼잡', slots: Array.from({ length: 19 }, (_, i) => ({ no: i + 1, active: i < 15 })) },
    { id: 'D103', total: 20, used: 20, free: 0, status: '만차', slots: Array.from({ length: 20 }, (_, i) => ({ no: i + 1, active: true })) },
    { id: 'D104', total: 20, used: 8, free: 12, status: '보통', slots: Array.from({ length: 20 }, (_, i) => ({ no: i + 1, active: i < 8 })) },
    { id: 'D105', total: 19, used: 0, free: 19, status: '비어있음', slots: Array.from({ length: 19 }, (_, i) => ({ no: i + 1, active: false })) },
  ];

  const [mapData] = useState<ZoneData[]>(initialMapData);

  const inventoryData: InventoryItem[] = useMemo(() => [
    { code: 'ADC30009358', qty: 708, loc: 'D101' }, { code: 'ADC30014326', qty: 294, loc: 'D102' },
    { code: 'ADC30003801', qty: 204, loc: 'D101' }, { code: 'AGF04075606', qty: 182, loc: 'D103' },
    { code: 'ADC30009358', qty: 708, loc: 'D101' }, { code: 'ADC30009358', qty: 708, loc: 'D101' },
    { code: 'ADC30009358', qty: 708, loc: 'D101' }, { code: 'AGM76970203', qty: 50, loc: 'D101' },
    { code: 'AGM76970204', qty: 30, loc: 'D102' }, { code: 'AGM76970205', qty: 10, loc: 'D103' },
  ], []);

  const filteredInventory = useMemo(() =>
    inventoryData.filter(item =>
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.loc.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [inventoryData, searchTerm]);

  // 동적 데이터 연산 (종합 적재 현황용)
  const totalSpace = mapData.reduce((acc, zone) => acc + zone.total, 0);
  const usedSpace = mapData.reduce((acc, zone) => acc + zone.used, 0);
  const freeSpace = totalSpace - usedSpace;
  const occupancyRate = totalSpace === 0 ? 0 : (usedSpace / totalSpace) * 100;
  
  // SVG 반원 게이지 계산 (Radius: 80)
  const radius = 80;
  const circumference = Math.PI * radius; // 반원 둘레: ~251.3
  const dashOffset = circumference - (circumference * (occupancyRate / 100));

  return (
    <>
      <GlobalStyle />
      <Container initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <Body>
          {/* Left Sidebar */}
          <Sidebar>
            <SummaryCard>
              <h3>종합 적재 현황</h3>
              
              <div className="gauge-container">
                <svg viewBox="0 0 200 110">
                  {/* 배경 회색 반원 */}
                  <path 
                    d="M 20 100 A 80 80 0 0 1 180 100" 
                    fill="none" 
                    stroke="#F3F4F6" 
                    strokeWidth="16" 
                    strokeLinecap="round" 
                  />
                  {/* 채워지는 빨간색 반원 */}
                  <path 
                    d="M 20 100 A 80 80 0 0 1 180 100" 
                    fill="none" 
                    stroke="#C10B2E" 
                    strokeWidth="16" 
                    strokeLinecap="round"
                    strokeDasharray={circumference} 
                    strokeDashoffset={dashOffset} 
                    style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                  />
                </svg>
                <div className="gauge-text">
                  <span className="value">
                    {occupancyRate.toFixed(1).replace('.0', '')}
                    <span className="percent">%</span>
                  </span>
                  <span className="label">총 점유율</span>
                </div>
              </div>

              <div className="stats-list">
                <div className="stat-row">
                  <div className="stat-label">
                    <span className="dot red" />사용 중
                  </div>
                  <div className="stat-value red">{usedSpace}</div>
                </div>
                <div className="stat-row">
                  <div className="stat-label">
                    <span className="dot gray" />여유 공간
                  </div>
                  <div className="stat-value">{freeSpace}</div>
                </div>
                <div className="stat-row">
                  <div className="stat-label">
                    <span className="dot gray" />전체 공간
                  </div>
                  <div className="stat-value">{totalSpace}</div>
                </div>
              </div>
            </SummaryCard>

            <InventorySection>
              <div className="sec-head">
                <h3>검수 리스트</h3>
                <div className="search-box">
                  <Search size={14} color="#9CA3AF" />
                  <input
                    placeholder="제품명 검색"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="inv-list-scroll">
                {filteredInventory.length > 0 ? (
                  filteredInventory.map((item, i) => (
                    <MemoizedInventoryItem key={i} item={item} />
                  ))
                ) : (
                  <EmptyState>검색 결과가 없습니다.</EmptyState>
                )}
              </div>
            </InventorySection>
          </Sidebar>

          {/* Main Map Area */}
          <MapArea>
            <MapHeader>
              <div className="title">구역별 상세 배치도 (D101 ~ D105)</div>
              <div className="legend-bar">
                <span className="badge empty">
                  <div className="dot" style={{ background: '#cbd5e1' }} /> 여유
                </span>
                <span className="badge active">
                  <div className="dot" style={{ background: '#C10B2E' }} /> 사용
                </span>
                <span className="badge full">
                  <div className="dot" style={{ background: '#ffffff' }} /> 만차
                </span>
              </div>
            </MapHeader>

            <ZoneWrapper>
              {mapData.map((zone, idx) => (
                <ZoneColumn key={zone.id} zone={zone} index={idx} />
              ))}
            </ZoneWrapper>
          </MapArea>
        </Body>

        {/* Side Drawer Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <>
              <Overlay
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMenuOpen(false)}
              />
              <SideDrawer
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <div className="drawer-header">
                  <h2>시스템 메뉴</h2>
                  <IconBtn onClick={() => setIsMenuOpen(false)}>
                    <X size={20} />
                  </IconBtn>
                </div>

                <div className="profile-card">
                  <div className="avatar">
                    <User size={24} />
                  </div>
                  <div className="info">
                    <span className="name">관리자 (Admin)</span>
                    <span className="role">admin@gomotec.com</span>
                  </div>
                </div>

                <div className="menu-list">
                  <div className="menu-label">창고 이동</div>
                  <MenuItem $active>
                    <LayoutGrid size={18} /> D동 배치도 (현재)
                    <ChevronRight size={16} className="arrow" />
                  </MenuItem>
                  <MenuItem>
                    <LayoutGrid size={18} /> G동 배치도
                    <ChevronRight size={16} className="arrow" />
                  </MenuItem>
                  <div className="menu-label">관리</div>
                  <MenuItem>
                    <History size={18} /> 부품 입출고 이력 조회
                  </MenuItem>
                  <MenuItem>
                    <Settings size={18} /> 시스템 환경설정
                  </MenuItem>
                </div>

                <div className="drawer-footer">
                  <button className="logout-btn">
                    <LogOut size={16} /> 로그아웃
                  </button>
                  <div className="ver">Ver 2.5.1</div>
                </div>
              </SideDrawer>
            </>
          )}
        </AnimatePresence>
      </Container>
    </>
  );
}

// ─── [STYLES] ─────────────────────────────────────────

const GlobalStyle = createGlobalStyle`
  body {
    margin: 0;
    padding: 0;
    background: #F3F4F6;
    font-family: 'Pretendard', sans-serif;
    overflow: hidden;
    color: #111;
  }
  
  * {
    box-sizing: border-box;
  }
`;

const Container = styled(motion.div)`
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #F3F4F6;
  overflow: hidden;
`;

const IconBtn = styled.button<{ $active?: boolean }>`
  background: ${props => (props.$active ? '#fef2f2' : '#fff')};
  border: 1px solid ${props => (props.$active ? '#C10B2E' : '#e2e8f0')};
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => (props.$active ? '#C10B2E' : '#64748b')};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${props => (props.$active ? '#fee2e2' : '#f8fafc')};
    color: ${props => (props.$active ? '#C10B2E' : '#111')};
  }
`;

const Body = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;
  padding: 24px;
  gap: 24px;
  height: 100%;
`;

const Sidebar = styled.aside`
  width: 340px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  height: 100%;
`;

const CardBase = styled.div`
  background: #fff;
  border-radius: 12px;
  border: 1px solid #E5E7EB;
  box-shadow: 0 4px 16px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
`;

const SummaryCard = styled(CardBase)`
  padding: 30px 24px;
  flex-shrink: 0;

  h3 {
    margin: 0 0 24px 0;
    font-size: 24px;
    font-weight: 700;
    color: #111;
    letter-spacing: -1px;
  }

  .gauge-container {
    position: relative;
    width: 100%;
    max-width: 240px;
    margin: 0 auto 30px auto;

    svg {
      width: 100%;
      height: auto;
      overflow: visible;
    }

    .gauge-text {
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;

      .value {
        font-size: 40px;
        font-weight: 800;
        color: #111;
        line-height: 1;

        .percent {
          font-size: 22px;
          margin-left: 2px;
        }
      }

      .label {
        font-size: 16px;
        color: #334155;
        margin-top: 4px;
        font-weight: 600;
      }
    }
  }

  .stats-list {
    display: flex;
    flex-direction: column;
    
    .stat-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #F3F4F6;
      font-size: 15px;
      height: 36px;

      &:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }

      .stat-label {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #334155;
        font-weight: 600;

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          
          &.red {
            background: #C10B2E;
          }
          
          &.gray {
            background: #9CA3AF;
          }
        }
      }

      .stat-value {
        font-weight: 700;
        color: #111;
        font-size: 18px;

        &.red {
          color: #C10B2E;
        }
      }
    }
  }
`;

const InventorySection = styled(CardBase)`
  flex: 1;
  min-height: 0;
  padding: 24px; /* 💡 padding-bottom: 0; 을 제거하여 하단 여백 정상화 */

  .sec-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    h3 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      color: #111;
      letter-spacing: -1px;
    }
    
    .search-box {
      display: flex;
      align-items: center;
      background: #F1F5F9;
      padding: 8px 12px;
      border-radius: 6px;
      gap: 8px;
      width: 140px;

      input {
        border: none;
        background: transparent;
        width: 100%;
        outline: none;
        font-size: 0.8rem;
        color: #1f2937;
        font-weight: 500;

        &::placeholder {
          color: #6B7280;
        }
      }
    }
  }
  
  .inv-list-scroll {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-right: 8px; /* 스크롤바와 아이템 사이 여백 확보 */
    padding-bottom: 4px; /* 💡 부모 여백이 생겼으므로 내부 패딩은 최소화 */

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
      border-radius: 10px;
    }

    &::-webkit-scrollbar-thumb {
      background: #E5E7EB;
      border-radius: 10px;
    }

    &::-webkit-scrollbar-thumb:hover {
      background: #D1D5DB;
    }
  }
`;

const InvItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-radius: 12px;
  background: #F8FAFC;
  border: 1px solid #DFE2ED;
  flex-shrink: 0;
  transition: all 0.2s;
  
  &:hover {
    border-color: #D1D5DB;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  }
  
  .info {
    display: flex;
    flex-direction: column;
    
    .code {
      font-size: 16px;
      font-weight: 700;
      color: #111;
    }
    
    .loc {
      font-size: 14px;
      color: #475569;
      display: flex;
      align-items: center;
      gap: 4px;
      font-weight: 600;
    }
  }

  .qty {
    font-size: 16px;
    font-weight: 800;
    color: #C10B2E;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  color: #64748b;
  font-size: 0.85rem;
  font-weight: 500;
  margin-top: 30px;
`;

const MapArea = styled(CardBase)`
  flex: 1;
  min-height: 0;
  overflow: hidden;
`;

const MapHeader = styled.div`
  height: 54px;
  padding: 0 24px;
  border-bottom: 1px solid #F3F4F6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;

  .title {
    font-weight: 700;
    font-size: 22px;
    color: #111;
    letter-spacing: -1px;
  }
  
  .legend-bar {
    display: flex;
    gap: 10px;

    .badge {
      font-size: 0.8rem;
      padding: 6px 12px;
      border-radius: 6px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .empty {
      background: #f1f5f9;
      color: #64748b;
      border: 1px solid #e2e8f0;
      
      .dot {
        background: #cbd5e1;
      }
    }

    .active {
      background: #FDEDF1;
      color: #C40037;
      border: 1px solid #ECA5B9;
      
      .dot {
        background: #C10B2E;
      }
    }

    .full {
      background: #C10B2E;
      color: #ffffff;
      border: 1px solid #C10B2E;
      
      .dot {
        background: #ffffff;
      }
    }

    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
  }
`;

const ZoneWrapper = styled.div`
  flex: 1;
  padding: 24px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 16px;
  overflow: hidden;
  min-height: 0;
  overflow: hidden;
`;

const ZoneColumnWrapper = styled(motion.div)`
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
  
  .z-head {
    background: #fff;
    padding: 14px;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    flex-shrink: 0;
    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    
    .top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .id {
      font-weight: 700;
      font-size: 20px;
      color: #111;
    }

    .st {
      font-size: 14px;
      font-weight: 700;
      padding: 2px 12px;
      border-radius: 5px;
    }

    .g {
      background: #EFF1F3;
      color: #878C94;
    }

    .o {
      background: #F9F0CA;
      color: #D97908;
    }

    .r {
      background: #FDEDF1;
      color: #D23B65;
    }

    .usage-text {
      font-size: 16px;
      color: #334155;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      font-weight: 600;

      b {
        color: #C10B2E;
      }
    }

    .bar {
      height: 8px;
      background: #f1f5f9;
      border-radius: 4px;
      overflow: hidden;
    }

    .fill {
      height: 100%;
      background: #C10B2E;
      border-radius: 4px;
      transition: width 0.5s ease-out;
    }
  }

  .slot-grid-container {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: #f8fafc;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    padding: 10px;
    overflow-y: auto;
    
    &::-webkit-scrollbar {
      width: 4px;
    }
    
    &::-webkit-scrollbar-thumb {
      background: #e2e8f0;
      border-radius: 4px;
    }
  }
  
  .slot-grid {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: repeat(10, 1fr);
    gap: 6px;
  }
`;

const Slot = styled.div<{ $active: boolean }>`
  background: ${props => (props.$active ? '#fef2f2' : '#fff')};
  border: 1px solid ${props => (props.$active ? '#fecaca' : '#e2e8f0')};
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  font-size: 15px;
  font-weight: 700;
  color: ${props => (props.$active ? '#C10B2E' : '#64748b')};
  transition: all 0.3s;
  box-shadow: ${props => (props.$active ? '0 2px 4px rgba(193, 11, 46, 0.08)' : '0 1px 2px rgba(0,0,0,0.03)')};
  
  .icon-box {
    margin-bottom: 2px;
  }
`;

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.3);
  z-index: 100;
  backdrop-filter: blur(2px);
`;

const SideDrawer = styled(motion.div)`
  position: fixed;
  top: 0;
  right: 0;
  width: 320px;
  height: 100%;
  background: #fff;
  z-index: 101;
  box-shadow: -10px 0 30px rgba(0,0,0,0.1);
  display: flex;
  flex-direction: column;
  
  .drawer-header {
    padding: 20px;
    border-bottom: 1px solid #f1f5f9;
    display: flex;
    justify-content: space-between;
    align-items: center;

    h2 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
      color: #334155;
    }
  }
  
  .profile-card {
    padding: 24px;
    background: #f8fafc;
    border-bottom: 1px solid #f1f5f9;
    display: flex;
    align-items: center;
    gap: 16px;

    .avatar {
      width: 48px;
      height: 48px;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748b;
    }

    .info {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .name {
        font-weight: 700;
        color: #0f172a;
      }

      .role {
        font-size: 0.8rem;
        color: #64748b;
      }
    }
  }

  .menu-list {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .menu-label {
    font-size: 0.9rem;
    font-weight: 700;
    color: #94a3b8;
    margin: 12px 0 8px 12px;
  }
  
  .drawer-footer {
    padding: 20px;
    border-top: 1px solid #f1f5f9;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .logout-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #ef4444;
      background: none;
      border: none;
      font-weight: 600;
      cursor: pointer;

      &:hover {
        opacity: 0.8;
      }
    }

    .ver {
      font-size: 1rem;
      color: #cbd5e1;
    }
  }
`;

const MenuItem = styled.div<{ $active?: boolean }>`
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.95rem;
  font-weight: 500;
  color: ${props => (props.$active ? '#C10B2E' : '#334155')};
  background: ${props => (props.$active ? '#fef2f2' : 'transparent')};
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: ${props => (props.$active ? '#fef2f2' : '#f8fafc')};
  }

  .arrow {
    margin-left: auto;
    color: #cbd5e1;
  }
`;
