"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Boxes, ScanSearch, Cpu, ClipboardList, Bot, Truck } from 'lucide-react';

// --- 메뉴 데이터 ---
type SubItem = { label: string; href: string };
type Group = { key: string; Icon: React.ComponentType<{ size?: number }>; items: SubItem[] };

const GROUPS: Group[] = [
  {
    key: '자재관리', Icon: Boxes, items: [
      { label: '입고검수', href: '/material/inbound-inspection' },
      { label: '입고검사현황', href: '/material/inbound-inspection/status' },
      { label: '자재검수', href: '/material/inbound-inspection/material-check' },
      { label: '자재창고', href: '/material/warehouse' },
      { label: '공정재고', href: '/production/smart-factory-dashboard' },
    ],
  },
  {
    key: '공정품질', Icon: ScanSearch, items: [
      { label: '유리틈새검사', href: '/production/glass-gap-check' },
      { label: '발포액누설 검사', href: '/production/leak-detection' },
      { label: '가스켓 이상 탐지', href: '/production/gasket-check' },
      { label: '필름부착확인', href: '/production/film-attachment' },
    ],
  },
  {
    key: '공정설비', Icon: Cpu, items: [
      { label: '발포 품질 예측', href: '/production/line-monitoring' },
      { label: '발포설비 예지보전', href: '/production/foaming-inspection' },
    ],
  },
  {
    key: '생산관리', Icon: ClipboardList, items: [
      { label: '작업시간관리', href: '/production/takttime-dashboard' },
    ],
  },
  {
    key: '작업관리', Icon: Bot, items: [
      { label: 'Pysical AI', href: '/production/pysical-ai' },
    ],
  },
  {
    key: '출하관리', Icon: Truck, items: [
      { label: '운송관리', href: '/transport/realtime-status' },
      { label: '제품창고', href: '/transport/warehouse-management' },
      { label: '출하처리', href: '/transport/shipment' },
    ],
  },
];

// 화이트 테마 + 레드 포인트
const ACCENT = '#D31145';
const ACCENT_SOFT = '#FFF0F3';

// --- 스타일 ---
const Shell = styled.div<{ $disabled: boolean }>`
  flex-shrink: 0;
  height: 100vh;
  display: flex;
  background: #ffffff;
  font-family: var(--font-pretendard), 'Pretendard', sans-serif;
  ${({ $disabled }) => $disabled && css`pointer-events: none; opacity: 0.6;`}
`;

// 1단: 아이콘 레일
const Rail = styled.div`
  width: 84px;
  flex-shrink: 0;
  height: 100vh;
  background: #ffffff;
  border-right: 1px solid #eef2f7;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 18px 0 16px;
`;

const LogoButton = styled.button`
  width: 68px;
  height: 46px;
  margin-bottom: 8px;
  border: none;
  background: none;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
`;

const RailDivider = styled.div`
  width: 40px;
  height: 1px;
  background: #eef2f7;
  margin: 8px 0 14px;
  flex-shrink: 0;
`;

const RailIcons = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;

  &::-webkit-scrollbar { width: 0; }
`;

// 활성 메뉴로 위아래로 슬라이드하는 단일 인디케이터
const RailGlider = styled.div<{ $show: boolean }>`
  position: absolute;
  left: 2px;
  top: 0;
  width: 4px;
  border-radius: 0 3px 3px 0;
  background: ${ACCENT};
  opacity: ${({ $show }) => ($show ? 1 : 0)};
  pointer-events: none;
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), height 0.2s ease, opacity 0.2s ease;
`;

const RailButton = styled.button<{ $active: boolean }>`
  position: relative;
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border: none;
  border-radius: 14px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  background: ${({ $active }) => ($active ? ACCENT_SOFT : 'transparent')};
  color: ${({ $active }) => ($active ? ACCENT : '#94a3b8')};
  transition: background 0.16s ease, color 0.16s ease;

  &:hover { background: ${ACCENT_SOFT}; color: ${ACCENT}; }

  span {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: -0.02em;
    white-space: nowrap;
  }
`;

// 2단: 하위메뉴 패널
const Panel = styled.div`
  width: 212px;
  flex-shrink: 0;
  height: 100vh;
  background: #ffffff;
  border-right: 1px solid #eef2f7;
  display: flex;
  flex-direction: column;
  padding: 22px 14px 16px;
`;

const PanelTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 8px 14px;
  margin-bottom: 6px;
  border-bottom: 1px solid #f1f5f9;
  color: #0f172a;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.4px;

  &::before {
    content: '';
    width: 4px;
    height: 18px;
    border-radius: 3px;
    background: ${ACCENT};
  }
`;

const ItemList = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 8px;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 3px; }
`;

const ItemLink = styled.button<{ $active: boolean }>`
  position: relative;
  width: 100%;
  height: 44px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 9px;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  background: ${({ $active }) => ($active ? ACCENT_SOFT : 'transparent')};
  color: ${({ $active }) => ($active ? ACCENT : '#475569')};
  font-size: 14px;
  font-weight: ${({ $active }) => ($active ? 800 : 600)};
  letter-spacing: -0.3px;
  text-align: left;
  transition: background 0.16s ease, color 0.16s ease;

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
    background: ${({ $active }) => ($active ? ACCENT : '#cbd5e1')};
  }

  &:hover { background: #f8fafc; color: ${ACCENT}; }
`;

// --- 컴포넌트 ---
interface SideNavigationProps {
  isLoading?: boolean;
}

export default function SideNavigation({ isLoading = false }: SideNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const railRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [glider, setGlider] = useState({ y: 0, h: 0, show: false });

  const activeGroupKey = useMemo(() => {
    if (!pathname) return null;
    const matched = GROUPS.find(g => g.items.some(item => pathname === item.href || pathname.startsWith(item.href)));
    if (matched) return matched.key;
    if (pathname.includes('/material')) return '자재관리';
    if (pathname.includes('/transport')) return '출하관리';
    if (pathname.includes('/production')) return '공정품질';
    return GROUPS[0].key;
  }, [pathname]);

  // 패널에 표시할 그룹: 호버 중이면 그 그룹, 아니면 현재 활성 그룹
  const displayedGroup = useMemo(() => {
    const key = hoveredKey ?? activeGroupKey;
    return GROUPS.find(g => g.key === key) ?? GROUPS[0];
  }, [hoveredKey, activeGroupKey]);

  // 활성 메뉴 위치로 인디케이터(글라이더) 이동
  useEffect(() => {
    const measure = () => {
      const el = activeGroupKey ? railRefs.current[activeGroupKey] : null;
      if (el) setGlider({ y: el.offsetTop, h: el.offsetHeight, show: true });
      else setGlider(prev => ({ ...prev, show: false }));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [activeGroupKey]);

  // master-dashboard 에서는 사이드바 숨김
  if (pathname && pathname.startsWith('/master-dashboard')) return null;

  const go = (href: string) => {
    if (isLoading) return;
    router.push(href);
  };

  return (
    <Shell $disabled={isLoading} onMouseLeave={() => setHoveredKey(null)}>
      <Rail>
        <LogoButton onClick={() => go('/master-dashboard')} aria-label="메인 대시보드">
          <Image src="/logo/dxsolutions.png" alt="DXSolutions 나무 로고" fill style={{ objectFit: 'contain' }} priority />
        </LogoButton>
        <RailDivider />

        <RailIcons>
          <RailGlider
            $show={glider.show}
            style={{ transform: `translateY(${glider.y}px)`, height: `${glider.h}px` }}
          />
          {GROUPS.map(group => {
            const isActive = activeGroupKey === group.key;
            const GroupIcon = group.Icon;
            return (
              <RailButton
                key={group.key}
                type="button"
                ref={(node) => { railRefs.current[group.key] = node; }}
                $active={isActive}
                title={group.key}
                onMouseEnter={() => setHoveredKey(group.key)}
                onClick={() => go(group.items[0].href)}
              >
                <GroupIcon size={22} />
                <span>{group.key}</span>
              </RailButton>
            );
          })}
        </RailIcons>
      </Rail>

      <Panel>
        <PanelTitle>{displayedGroup.key}</PanelTitle>
        <ItemList>
          {displayedGroup.items.map(item => (
            <ItemLink
              key={item.href}
              type="button"
              $active={pathname ? pathname === item.href || pathname.startsWith(item.href) : false}
              onClick={() => go(item.href)}
            >
              {item.label}
            </ItemLink>
          ))}
        </ItemList>
      </Panel>
    </Shell>
  );
}
