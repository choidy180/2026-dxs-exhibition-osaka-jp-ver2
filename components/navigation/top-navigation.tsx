"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSmoothNavigation } from '@/components/exhibition-demo/PageTransition';
import styled from "styled-components";
import {
  Activity,
  Bell,
  BarChart3,
  Bot,
  Box,
  Boxes,
  CalendarRange,
  CheckCircle2,
  ChartNoAxesColumnIncreasing,
  CircleDotDashed,
  ClipboardCheck,
  Cog,
  Cctv,
  Droplets,
  FlaskConical,
  LayoutGrid,
  Layers,
  PackageCheck,
  PackageSearch,
  PanelLeftClose,
  QrCode,
  Route,
  ScanSearch,
  Search,
  Send,
  ShieldCheck,
  Truck,
  Warehouse,
  Wrench,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import AIAgentSystem from "../chatbot-widget";
import ExhibitionSettings from './ExhibitionSettings';
import { useLocale } from '@/components/i18n/LocaleProvider';
import { color, controlHeight, focusRing, radius, shadow, space, tone, zIndex } from '@/styles/design-tokens';

type NavKey =
  | "dashboard"
  | "material"
  | "quality"
  | "equipment"
  | "production"
  | "work"
  | "shipping"
  | "lab";
type PanelKey = Exclude<NavKey, "dashboard"> | "search";
type NoticeTone = "danger" | "warning" | "success" | "info";

type NavChild = {
  label: string;
  href: string;
  detail: string;
  icon: LucideIcon;
};

type NavEntry = {
  key: NavKey;
  label: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  children?: NavChild[];
};

type NoticeItem = {
  id: number;
  title: string;
  message: string;
  time: string;
  category: string;
  tone: NoticeTone;
  unread?: boolean;
};

const RAIL_WIDTH = 84;
const SUB_SIDEBAR_WIDTH = 312;

const NAV_ITEMS: NavEntry[] = [
  {
    key: "dashboard",
    label: "관제센터",
    description: "전체 운영 현황",
    icon: LayoutGrid,
    href: "/master-dashboard",
  },
  {
    key: "material",
    label: "자재관리",
    description: "입고, 창고, 공정 재고",
    icon: Box,
    children: [
      { label: "입고검사", href: "/material/inbound-inspection", detail: "자재 입고 품질 확인", icon: ClipboardCheck },
      { label: "입고검사현황", href: "/material/inbound-inspection/status", detail: "일·주·월·연간 검수 현황", icon: BarChart3 },
      { label: "자재검수", href: "/material/inbound-inspection/material-check", detail: "모바일 QR 카메라 검수", icon: QrCode },
      { label: "자재창고", href: "/material/warehouse", detail: "창고 재고와 위치 관리", icon: Warehouse },
      { label: "공정재고", href: "/production/smart-factory-dashboard", detail: "라인 투입 전 재고 현황", icon: Boxes },
    ],
  },
  {
    key: "quality",
    label: "공정품질",
    description: "비전 검사와 품질 판정",
    icon: ShieldCheck,
    children: [
      { label: "유리간격검사", href: "/production/glass-gap-check", detail: "Glass gap 실시간 검사", icon: ScanSearch },
      { label: "발포누수검사", href: "/production/leak-detection", detail: "누수 및 기포 이상 감지", icon: Droplets },
      { label: "가스켓 이상 감지", href: "/production/gasket-check", detail: "가스켓 결함 모니터링", icon: CircleDotDashed },
      { label: "필름부착확인", href: "/production/film-attachment", detail: "필름 부착 상태 판정", icon: Layers },
    ],
  },
  {
    key: "equipment",
    label: "공정설비",
    description: "설비 상태와 예지보전",
    icon: Cog,
    children: [
      { label: "발포 설비 예측", href: "/production/line-monitoring", detail: "라인 가동 상태 모니터링", icon: Activity },
      { label: "발포설비 예지보전", href: "/production/foaming-inspection", detail: "설비 이상 징후 추적", icon: Cog },
    ],
  },
  {
    key: "production",
    label: "생산관리",
    description: "생산 시간과 목표 관리",
    icon: ChartNoAxesColumnIncreasing,
    children: [
      { label: "작업시간관리", href: "/production/takttime-dashboard", detail: "택타임과 생산 흐름 분석", icon: CheckCircle2 },
    ],
  },
  {
    key: "work",
    label: "작업관리",
    description: "작업자 보조와 자동화",
    icon: ClipboardCheck,
    children: [
      { label: "Physical AI", href: "/production/pysical-ai", detail: "현장 작업 AI 지원", icon: Bot },
    ],
  },
  {
    key: "shipping",
    label: "출하관리",
    description: "운송, 제품창고, 출하 처리",
    icon: Truck,
    children: [
      { label: "운송관리", href: "/transport/realtime-status", detail: "차량 및 이동 현황", icon: Route },
      { label: "제품창고", href: "/transport/warehouse-management", detail: "완제품 재고 관리", icon: PackageCheck },
      { label: "출하처리", href: "/transport/shipment", detail: "출하 지시와 처리 현황", icon: Send },
    ],
  },
  {
    // 개발 진행 중 화면의 UI 만 확인하는 공간 — 실제 데이터는 연결되지 않는다
    key: "lab",
    label: "실험실",
    description: "개발 진행 중 화면 UI 확인",
    icon: FlaskConical,
    children: [
      { label: "생산계획", href: "/lab/production-plan", detail: "개발 중 · 생산계획 업로드와 리비전 관리", icon: CalendarRange },
      { label: "MES BOM LIST", href: "/lab/mes-bom-list", detail: "개발 중 · BOM 정전개 전체 리스트", icon: Wrench },
      { label: "발주대상리스트", href: "/lab/order-plan", detail: "개발 중 · 발주 소요량 산출", icon: PackageSearch },
      { label: "상황 모니터링", href: "/lab/cctv-monitoring", detail: "개발 중 · 동별 CCTV 현황 확인", icon: Cctv },
    ],
  },
];

const NOTICES: NoticeItem[] = [
  {
    id: 1,
    title: "유리간격검사 NG 발생",
    message: "A2 우측 상단 카메라에서 기준값 초과 항목이 감지되었습니다.",
    time: "방금 전",
    category: "품질",
    tone: "danger",
    unread: true,
  },
  {
    id: 2,
    title: "입고검사 데이터 동기화",
    message: "금일 입고검사 18건이 ERP 데이터와 정상 동기화되었습니다.",
    time: "8분 전",
    category: "자재",
    tone: "success",
    unread: true,
  },
  {
    id: 3,
    title: "발포 설비 점검 권장",
    message: "온도 편차가 3회 연속 발생했습니다. 예방 점검을 권장합니다.",
    time: "22분 전",
    category: "설비",
    tone: "warning",
  },
  {
    id: 4,
    title: "출하 차량 도착 예정",
    message: "GMT-02 차량이 14:30 도크에 도착 예정입니다.",
    time: "43분 전",
    category: "출하",
    tone: "info",
  },
];

const isActivePath = (pathname: string | null, href: string) => {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
};

const isActiveNavChild = (pathname: string | null, child: NavChild, siblings: NavChild[]) => {
  if (!isActivePath(pathname, child.href)) return false;

  return !siblings.some(
    (sibling) =>
      sibling.href !== child.href &&
      sibling.href.length > child.href.length &&
      isActivePath(pathname, sibling.href),
  );
};

const getActiveKey = (pathname: string | null): NavKey => {
  const exact = NAV_ITEMS.find((item) => item.href && isActivePath(pathname, item.href));
  if (exact) return exact.key;

  const parent = NAV_ITEMS.find((item) => item.children?.some((child) => isActivePath(pathname, child.href)));
  if (parent) return parent.key;

  if (pathname?.includes("/material")) return "material";
  if (pathname?.includes("/transport")) return "shipping";
  if (pathname?.includes("/production")) return "quality";
  if (pathname?.includes("/lab")) return "lab";
  return "dashboard";
};

interface TopNavigationProps {
  isLoading?: boolean;
}

export default function TopNavigation({ isLoading = false }: TopNavigationProps) {
  const { t } = useLocale();
  const pathname = usePathname();
  const navigate = useSmoothNavigation();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const activeKey = useMemo(() => getActiveKey(pathname), [pathname]);
  const [openPanel, setOpenPanel] = useState<PanelKey | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const selectedEntry = useMemo(
    () => NAV_ITEMS.find((item) => item.key === openPanel && item.children),
    [openPanel],
  );
  const trimmedSearch = searchValue.trim().toLowerCase();
  const filteredGroups = useMemo(() => {
    const groups = NAV_ITEMS.filter((item) => item.children?.length);

    if (!trimmedSearch) {
      if (openPanel === "search") return groups;
      return selectedEntry ? [selectedEntry] : [];
    }

    return groups
      .map((group) => ({
        ...group,
        children: group.children?.filter((child) =>
          [group.label, group.description, child.label, child.detail, child.href, t(group.label), t(child.label), t(child.detail)]
            .join(" ")
            .toLowerCase()
            .includes(trimmedSearch),
        ),
      }))
      .filter((group) => group.children?.length);
  }, [openPanel, selectedEntry, trimmedSearch, t]);

  useEffect(() => {
    document.documentElement.style.setProperty("--app-sidebar-offset", isSidebarCollapsed ? "0px" : `${RAIL_WIDTH}px`);
    document.documentElement.style.setProperty("--app-guide-offset", isSidebarCollapsed ? "0px" : `${openPanel ? RAIL_WIDTH + SUB_SIDEBAR_WIDTH : RAIL_WIDTH}px`);
    document.documentElement.dataset.sidebarMode = isSidebarCollapsed ? "collapsed" : openPanel ? "expanded" : "rail";

    return () => {
      document.documentElement.style.removeProperty("--app-sidebar-offset");
      document.documentElement.style.removeProperty("--app-guide-offset");
      delete document.documentElement.dataset.sidebarMode;
    };
  }, [isSidebarCollapsed, openPanel]);

  useEffect(() => {
    if (!openPanel) return;
    const timer = window.setTimeout(() => searchInputRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [openPanel]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenPanel(null);
      setIsNotificationOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleEntryClick = (entry: NavEntry) => {
    if (isLoading) return;

    setIsSidebarCollapsed(false);
    setIsNotificationOpen(false);

    if (entry.href) {
      void navigate(entry.href).catch(() => {});
      setOpenPanel(null);
      return;
    }

    setSearchValue("");
    setOpenPanel((current) => (current === entry.key ? null : (entry.key as PanelKey)));
  };

  const handleSearchOpen = () => {
    if (isLoading) return;
    setIsSidebarCollapsed(false);
    setSearchValue("");
    setOpenPanel("search");
    setIsNotificationOpen(false);
  };

  const handleChildClick = (child: NavChild) => {
    if (isLoading) return;
    void navigate(child.href).catch(() => {});
    setOpenPanel(null);
    setSearchValue("");
  };

  const closePanel = () => {
    setOpenPanel(null);
    setSearchValue("");
  };

  const collapseSidebar = () => {
    setOpenPanel(null);
    setSearchValue("");
    setIsNotificationOpen(false);
    setIsSidebarCollapsed(true);
  };

  const expandSidebar = () => {
    if (isLoading) return;
    setIsSidebarCollapsed(false);
  };

  return (
    <>
      {isSidebarCollapsed && <SidebarHoverZone onMouseEnter={expandSidebar} aria-hidden="true" />}

      <RailShell $disabled={isLoading} $collapsed={isSidebarCollapsed} aria-label="메인 네비게이션">
        <RailMain>
          <DashboardButton
            type="button"
            onClick={() => handleEntryClick(NAV_ITEMS[0])}
            title="대시보드"
            aria-label="대시보드"
          >
            <DashboardLogoIcon aria-hidden="true" />
          </DashboardButton>

          <RailMenu>
            {NAV_ITEMS.slice(1).map((entry) => {
              const Icon = entry.icon;
              const state = openPanel === entry.key ? "open" : activeKey === entry.key ? "active" : "idle";

              return (
                <RailButton
                  key={entry.key}
                  type="button"
                  $state={state}
                  onClick={() => handleEntryClick(entry)}
                  title={entry.label}
                  aria-label={entry.label}
                  aria-expanded={openPanel === entry.key}
                >
                  <Icon size={21} />
                  <span>{entry.label}</span>
                </RailButton>
              );
            })}
          </RailMenu>
        </RailMain>

        <RailTools>
          <UtilityButton
            type="button"
            $state={openPanel === "search" ? "open" : "idle"}
            onClick={handleSearchOpen}
            title="메뉴 검색"
            aria-label="메뉴 검색"
            aria-expanded={openPanel === "search"}
          >
            <Search size={20} />
          </UtilityButton>
          <UtilityButton
            type="button"
            $state={isNotificationOpen ? "open" : "idle"}
            onClick={() => {
              setIsNotificationOpen((current) => !current);
              setOpenPanel(null);
            }}
            title="알림"
            aria-label="알림 열기"
            aria-expanded={isNotificationOpen}
          >
            <Bell size={20} />
          </UtilityButton>
          <UtilityButton
            type="button"
            $state="idle"
            onClick={collapseSidebar}
            title="사이드바 닫기"
            aria-label="사이드바 닫기"
          >
            <PanelLeftClose size={20} />
          </UtilityButton>
        </RailTools>
      </RailShell>

      <AIAgentSystem />

      {openPanel && !isSidebarCollapsed && <SubSidebarScrim onClick={closePanel} aria-hidden="true" />}

      <SubSidebar $open={!!openPanel && !isSidebarCollapsed} aria-hidden={!openPanel || isSidebarCollapsed}>
        {openPanel && (
          <>
            <SubHeader>
              <SubTitleBlock>
                <span>{openPanel === "search" ? "Search" : "Menu"}</span>
                <strong>{openPanel === "search" ? "메뉴 검색" : selectedEntry?.label}</strong>
                <p>{openPanel === "search" ? "원하는 화면을 빠르게 찾아 이동합니다." : selectedEntry?.description}</p>
              </SubTitleBlock>
              <CloseButton type="button" onClick={closePanel} aria-label="하위 메뉴 닫기">
                <X size={18} />
              </CloseButton>
            </SubHeader>

            <SearchBox>
              <Search size={18} />
              <input
                ref={searchInputRef}
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="메뉴명, 업무명, 경로 검색"
                aria-label="사이드바 메뉴 검색"
              />
              {searchValue && (
                <ClearSearchButton type="button" onClick={() => setSearchValue("")} aria-label="검색어 지우기">
                  <X size={15} />
                </ClearSearchButton>
              )}
            </SearchBox>

            <SubContent className="custom-scrollbar">
              {filteredGroups.length > 0 ? (
                filteredGroups.map((group) => (
                  <ResultGroup key={group.key}>
                    {group.children?.map((child) => {
                      const ChildIcon = child.icon;
                      const active = isActiveNavChild(pathname, child, group.children ?? []);

                      return (
                        <ResultButton
                          key={child.href}
                          type="button"
                          $active={active}
                          onClick={() => handleChildClick(child)}
                          aria-current={active ? "page" : undefined}
                        >
                          <ResultIcon $active={active}>
                            <ChildIcon size={18} />
                          </ResultIcon>
                          <ResultText>
                            <strong>{child.label}</strong>
                            <span>{child.detail}</span>
                          </ResultText>
                        </ResultButton>
                      );
                    })}
                  </ResultGroup>
                ))
              ) : (
                <EmptySearch>
                  <Search size={30} />
                  <strong>검색 결과가 없습니다.</strong>
                  <span>다른 메뉴명이나 업무 키워드를 입력해 주세요.</span>
                </EmptySearch>
              )}
              {openPanel === 'lab' && <ExhibitionSettings />}
            </SubContent>
          </>
        )}
      </SubSidebar>

      {isNotificationOpen && (
        <NotificationPanel role="dialog" aria-label="알림">
          <NotificationHeader>
            <div>
              <span>Notifications</span>
              <strong>알림</strong>
            </div>
            <CloseButton type="button" onClick={() => setIsNotificationOpen(false)} aria-label="알림 닫기">
              <X size={18} />
            </CloseButton>
          </NotificationHeader>

          <NotificationList>
            {NOTICES.map((notice) => (
              <NoticeCard key={notice.id} $tone={notice.tone} $unread={!!notice.unread}>
                <NoticeDot $tone={notice.tone} />
                <NoticeBody>
                  <div>
                    <strong>{notice.title}</strong>
                    <span>{notice.time}</span>
                  </div>
                  <p>{notice.message}</p>
                  <em>{notice.category}</em>
                </NoticeBody>
              </NoticeCard>
            ))}
          </NotificationList>
        </NotificationPanel>
      )}
    </>
  );
}

const SidebarHoverZone = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: ${zIndex.navHover};
  width: 14px;
  height: 100vh;
  height: 100dvh;
  cursor: pointer;

  border: 1px solid transparent;
  border-radius: ${radius.row}px;
  &:hover { background: ${color.brandSoft}; border-color: ${color.brand}; }
`;

const RailShell = styled.nav<{ $disabled: boolean; $collapsed: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: ${zIndex.navRail};
  width: ${RAIL_WIDTH}px;
  height: 100vh;
  height: 100dvh;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: ${color.surface};
  border-top: 1px solid ${color.border};
  border-right: 1px solid ${color.border};
  opacity: ${({ $disabled, $collapsed }) => ($collapsed ? 0 : $disabled ? 0.55 : 1)};
  pointer-events: ${({ $disabled, $collapsed }) => ($disabled || $collapsed ? "none" : "auto")};
  transform: translateX(${({ $collapsed }) => ($collapsed ? "-100%" : "0")});
  transition:
    transform 220ms ease,
    opacity 180ms ease;
`;

const RailMain = styled.div`
  width: 100%;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: none;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const DashboardButton = styled.button`
  width: 100%;
  height: 83px;
  flex: 0 0 83px;
  border: 0;
  background: ${color.surface};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  @media (max-height: 920px) {
    height: ${controlHeight.lg + space.huge}px;
    flex-basis: ${controlHeight.lg + space.huge}px;
  }
`;

const DashboardLogoIcon = styled.span`
  width: ${controlHeight.lg}px;
  height: ${controlHeight.lg + space.sm}px;
  flex: 0 0 auto;
  display: block;
  /* 기존 브랜드 이미지의 왼쪽 나무 심볼만 원래 비율로 표시한다. */
  background: url("/logo/dxsolutions.png") no-repeat left center / auto 100%;
`;

const RailMenu = styled.div`
  width: 100%;
  padding-top: 5px;
  display: flex;
  flex-direction: column;
  align-items: center;

  @media (max-height: 920px) {
    padding-top: 2px;
  }
`;

const RailButton = styled.button<{ $state: "idle" | "active" | "open" }>`
  position: relative;
  width: 100%;
  height: ${controlHeight.lg + space.huge + space.xxxl}px;
  flex: 0 0 ${controlHeight.lg + space.huge + space.xxxl}px;
  border: 0;
  background: ${color.surface};
  color: ${({ $state }) =>
    $state === "active" || $state === "open" ? color.brand : color.ink2};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  transition:
    color 160ms ease;

  span {
    max-width: 100%;
    overflow: hidden;
    color: inherit;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
    letter-spacing: -0.04em;
  }

  svg {
    flex: 0 0 auto;
    color: inherit;
    width: 22px;
    height: 22px;
    box-sizing: content-box;
    padding: 14px;
    border-radius: ${radius.control}px;
    border: 1px solid ${({ $state }) => $state === "active" || $state === "open" ? color.brand : color.border};
    background: ${({ $state }) =>
      $state === "active" || $state === "open" ? color.brandSoft : color.surfaceSubtle};
    stroke-width: 1.65;
    transition: background 160ms ease, color 160ms ease;
  }

  &:hover {
    color: ${color.brand};

    svg {
      background: ${color.brandSoft};
    }
  }

  @media (max-height: 920px) {
    height: ${controlHeight.lg + space.huge}px;
    flex-basis: ${controlHeight.lg + space.huge}px;
    gap: 4px;

    svg {
      width: 20px;
      height: 20px;
      padding: ${space.md}px;
    }

    span {
      font-size: 11px;
    }
  }
`;

const RailTools = styled.div`
  flex: 0 0 auto;
  width: 100%;
  padding: ${space.xl}px 0 ${controlHeight.lg + space.huge * 2}px;
  border-top: 1px solid ${color.border};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${space.lg}px;

  @media (max-height: 920px) {
    padding-top: ${space.md}px;
    gap: ${space.md}px;
  }
`;

const UtilityButton = styled.button<{ $state: "idle" | "open" }>`
  width: 32px;
  height: 31px;
  flex: 0 0 31px;
  padding: 0;
  border: 0;
  background: transparent;
  color: ${({ $state }) => ($state === "open" ? color.brand : color.ink2)};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color 150ms ease;

  svg {
    stroke-width: 1.7;
  }

  &:hover {
    color: ${color.brand};
  }
`;

const SubSidebar = styled.aside<{ $open: boolean }>`
  position: fixed;
  top: 0;
  bottom: 0;
  left: ${RAIL_WIDTH}px;
  z-index: ${zIndex.navPanel};
  width: ${SUB_SIDEBAR_WIDTH}px;
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: ${color.surface};
  border-right: 1px solid ${color.border};
  box-shadow: ${shadow.panel};
  transform: translateX(${({ $open }) => ($open ? "0" : "-12px")});
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  pointer-events: ${({ $open }) => ($open ? "auto" : "none")};
  transition:
    transform 190ms ease,
    opacity 190ms ease;
`;

const SubSidebarScrim = styled.button`
  position: fixed;
  inset: 0;
  z-index: ${zIndex.navScrim};
  border: 0;
  background: transparent;
  cursor: default;
`;

const SubHeader = styled.div`
  flex: 0 0 auto;
  min-height: 100px;
  padding: 22px 18px 17px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid ${color.border};
`;

const SubTitleBlock = styled.div`
  min-width: 0;

  span {
    display: block;
    margin-bottom: 5px;
    color: ${color.brand};
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  strong {
    display: block;
    color: ${color.ink};
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.05em;
  }

  p {
    margin: 5px 0 0;
    color: ${color.ink3};
    font-size: 12px;
    font-weight: 500;
    line-height: 1.45;
    word-break: keep-all;
  }
`;

const CloseButton = styled.button`
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  border-radius: ${radius.control}px;
  border: 0;
  background: ${color.surfaceSubtle};
  color: ${color.ink2};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease;

  &:hover {
    background: ${color.brandSoft};
    color: ${color.brand};
  }
`;

const SearchBox = styled.label`
  flex: 0 0 auto;
  margin: 15px 16px 10px;
  height: 44px;
  border-radius: ${radius.control}px;
  border: 1px solid transparent;
  background: ${color.surfaceSubtle};
  color: ${color.ink4};
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  transition: background 150ms ease, border-color 150ms ease, box-shadow 150ms ease;

  &:focus-within {
    border-color: ${color.brand};
    background: ${color.surface};
    outline: ${focusRing};
  }

  input {
    min-width: 0;
    flex: 1;
    border: 0;
    outline: 0;
    background: transparent;
    color: ${color.ink};
    font-size: 13px;
    font-weight: 500;
  }

  input::placeholder {
    color: ${color.ink4};
  }
`;

const ClearSearchButton = styled.button`
  width: 26px;
  height: 26px;
  border-radius: ${radius.control}px;
  border: 0;
  background: ${color.surface};
  color: ${color.ink4};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`;

const SubContent = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 2px 12px 18px;
`;

const ResultGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
`;

const ResultButton = styled.button<{ $active: boolean }>`
  width: 100%;
  min-height: 64px;
  border-radius: ${radius.card}px;
  border: 1px solid ${({ $active }) => ($active ? color.brand : color.border)};
  background: ${({ $active }) => ($active ? color.brandSoft : color.surface)};
  color: ${({ $active }) => ($active ? color.brand : color.ink2)};
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 8px 9px;
  text-align: left;
  cursor: pointer;
  box-shadow: ${shadow.card};
  transition: color 150ms ease, background 150ms ease, border-color 150ms ease, box-shadow 150ms ease;

  &:hover {
    border-color: ${color.brand};
    background: ${color.brandSoft};
    color: ${color.brand};
    box-shadow: ${shadow.card};
  }

  &:hover > span:first-of-type {
    background: ${color.brandSoft};
    color: ${color.brand};
  }

  > svg {
    flex: 0 0 auto;
    color: ${color.ink4};
  }
`;

const ResultIcon = styled.span<{ $active: boolean }>`
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  border-radius: ${radius.control}px;
  background: ${({ $active }) => ($active ? color.brandSoft : color.surfaceSubtle)};
  color: ${({ $active }) => ($active ? color.brand : color.ink2)};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 150ms ease, color 150ms ease;
`;

const ResultText = styled.span`
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;

  strong {
    color: inherit;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: -0.02em;
  }

  span {
    color: ${color.ink3};
    font-size: 12px;
    font-weight: 500;
    line-height: 1.35;
    letter-spacing: -0.01em;
    word-break: keep-all;
  }
`;

const EmptySearch = styled.div`
  height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 9px;
  text-align: center;
  color: ${color.ink4};

  strong {
    color: ${color.ink2};
    font-size: 15px;
    font-weight: 600;
  }

  span {
    font-size: 12px;
    font-weight: 500;
  }
`;

const NotificationPanel = styled.aside`
  position: fixed;
  top: 74px;
  right: 20px;
  z-index: ${zIndex.advisorLauncher};
  width: 386px;
  max-height: min(620px, 80dvh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: ${radius.card}px;
  border: 1px solid ${color.border};
  background: ${color.surface};
  box-shadow: ${shadow.popover};
`;

const NotificationHeader = styled.div`
  padding: 18px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid ${color.border};

  span {
    display: block;
    margin-bottom: 5px;
    color: ${color.brand};
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  strong {
    color: ${color.ink};
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.05em;
  }
`;

const NotificationList = styled.div`
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const toneColor = (name: NoticeTone) => tone[name].fg;

const NoticeCard = styled.div<{ $tone: NoticeTone; $unread: boolean }>`
  position: relative;
  display: flex;
  gap: 11px;
  padding: 13px;
  border-radius: ${radius.card}px;
  border: 1px solid ${({ $tone, $unread }) => ($unread ? tone[$tone].border : color.border)};
  background: ${({ $tone, $unread }) => ($unread ? tone[$tone].bg : color.surface)};
`;

const NoticeDot = styled.span<{ $tone: NoticeTone }>`
  width: 9px;
  height: 9px;
  flex: 0 0 9px;
  margin-top: 7px;
  border-radius: ${radius.bar}px;
  background: ${({ $tone }) => toneColor($tone)};
  border: 1px solid ${({ $tone }) => tone[$tone].border};
`;

const NoticeBody = styled.div`
  min-width: 0;
  flex: 1;

  div {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }

  strong {
    color: ${color.ink};
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.04em;
  }

  span {
    flex: 0 0 auto;
    color: ${color.ink4};
    font-size: 11px;
    font-weight: 600;
  }

  p {
    margin: 7px 0 9px;
    color: ${color.ink3};
    font-size: 12px;
    font-weight: 600;
    line-height: 1.45;
    word-break: keep-all;
  }

  em {
    display: inline-flex;
    height: 24px;
    align-items: center;
    padding: 0 9px;
    border-radius: ${radius.card}px;
    background: ${color.fill};
    color: ${color.ink3};
    font-size: 11px;
    font-style: normal;
    font-weight: 600;
  }
`;
