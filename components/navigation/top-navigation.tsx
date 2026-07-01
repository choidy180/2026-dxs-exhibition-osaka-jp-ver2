"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import styled from "styled-components";
import {
  Activity,
  Bell,
  BarChart3,
  Bot,
  Boxes,
  CheckCircle2,
  ChevronRight,
  CircleDotDashed,
  ClipboardCheck,
  Cog,
  Droplets,
  Factory,
  LayoutGrid,
  Layers,
  Package,
  PackageCheck,
  PanelLeftClose,
  Route,
  ScanSearch,
  Search,
  Send,
  ShieldCheck,
  Truck,
  Warehouse,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import AIAgentSystem from "../chatbot-widget";

type NavKey =
  | "dashboard"
  | "material"
  | "quality"
  | "equipment"
  | "production"
  | "work"
  | "shipping";
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
const SUB_SIDEBAR_WIDTH = 356;

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
    icon: Package,
    children: [
      { label: "입고검사", href: "/material/inbound-inspection", detail: "자재 입고 품질 확인", icon: ClipboardCheck },
      { label: "입고검사현황", href: "/material/inbound-inspection/status", detail: "일·주·월·연간 검수 현황", icon: BarChart3 },
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
    icon: Factory,
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
  return "dashboard";
};

interface TopNavigationProps {
  isLoading?: boolean;
}

export default function TopNavigation({ isLoading = false }: TopNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
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
  const unreadCount = NOTICES.filter((notice) => notice.unread).length;

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
          [group.label, group.description, child.label, child.detail, child.href]
            .join(" ")
            .toLowerCase()
            .includes(trimmedSearch),
        ),
      }))
      .filter((group) => group.children?.length);
  }, [openPanel, selectedEntry, trimmedSearch]);

  useEffect(() => {
    document.documentElement.style.setProperty("--app-sidebar-offset", isSidebarCollapsed ? "0px" : `${RAIL_WIDTH}px`);
    document.documentElement.dataset.sidebarMode = isSidebarCollapsed ? "collapsed" : openPanel ? "expanded" : "rail";

    return () => {
      document.documentElement.style.removeProperty("--app-sidebar-offset");
      delete document.documentElement.dataset.sidebarMode;
    };
  }, [isSidebarCollapsed, openPanel]);

  useEffect(() => {
    if (openPanel) window.setTimeout(() => searchInputRef.current?.focus(), 120);
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
      router.push(entry.href);
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
    router.push(child.href);
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
        <RailSection>
          <RailButton
            type="button"
            $state={activeKey === "dashboard" ? "active" : "idle"}
            onClick={() => handleEntryClick(NAV_ITEMS[0])}
            title="대시보드"
            aria-label="대시보드"
          >
            <DashboardLogoIcon aria-hidden="true" />
          </RailButton>

          <RailDivider />

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
        </RailSection>

        <RailSection>
          <RailButton
            type="button"
            $state={openPanel === "search" ? "open" : "idle"}
            onClick={handleSearchOpen}
            title="메뉴 검색"
            aria-label="메뉴 검색"
            aria-expanded={openPanel === "search"}
          >
            <Search size={21} />
            <span>검색</span>
          </RailButton>
          <RailButton
            type="button"
            $state="idle"
            onClick={collapseSidebar}
            title="사이드바 닫기"
            aria-label="사이드바 닫기"
          >
            <PanelLeftClose size={21} />
            <span>닫기</span>
          </RailButton>
        </RailSection>
      </RailShell>

      <AIAgentSystem />

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

            <ResultSummary>
              <span>{filteredGroups.reduce((total, group) => total + (group.children?.length ?? 0), 0)}개 메뉴</span>
              <em>{trimmedSearch ? "검색 결과" : "바로가기"}</em>
            </ResultSummary>

            <SubContent className="custom-scrollbar">
              {filteredGroups.length > 0 ? (
                filteredGroups.map((group) => {
                  const GroupIcon = group.icon;

                  return (
                    <ResultGroup key={group.key}>
                      <GroupTitle>
                        <GroupTitleIcon>
                          <GroupIcon size={16} />
                        </GroupTitleIcon>
                        <span>{group.label}</span>
                      </GroupTitle>

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
                              <small>{child.href}</small>
                            </ResultText>
                            <ChevronRight size={17} />
                          </ResultButton>
                        );
                      })}
                    </ResultGroup>
                  );
                })
              ) : (
                <EmptySearch>
                  <Search size={30} />
                  <strong>검색 결과가 없습니다.</strong>
                  <span>다른 메뉴명이나 업무 키워드를 입력해 주세요.</span>
                </EmptySearch>
              )}
            </SubContent>
          </>
        )}
      </SubSidebar>

      <NotificationFab
        type="button"
        $active={isNotificationOpen}
        onClick={() => {
          setIsNotificationOpen((current) => !current);
          setOpenPanel(null);
        }}
        aria-label="알림 열기"
      >
        <Bell size={21} />
        {unreadCount > 0 && <NotificationBadge>{unreadCount}</NotificationBadge>}
      </NotificationFab>

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
  z-index: 10050;
  width: 14px;
  height: 100vh;
  height: 100dvh;
  cursor: pointer;

  &::after {
    content: "";
    position: absolute;
    top: 16px;
    bottom: 16px;
    left: 0;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: rgba(211, 17, 69, 0.34);
    opacity: 0;
    transition: opacity 140ms ease;
  }

  &:hover::after {
    opacity: 1;
  }
`;

const RailShell = styled.nav<{ $disabled: boolean; $collapsed: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 10020;
  width: ${RAIL_WIDTH}px;
  height: 100vh;
  height: 100dvh;
  padding: 16px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  background: #ffffff;
  border-right: 1px solid #eceff3;
  box-shadow: 8px 0 24px rgba(15, 23, 42, 0.06);
  opacity: ${({ $disabled, $collapsed }) => ($collapsed ? 0 : $disabled ? 0.55 : 1)};
  pointer-events: ${({ $disabled, $collapsed }) => ($disabled || $collapsed ? "none" : "auto")};
  transform: translateX(${({ $collapsed }) => ($collapsed ? "-100%" : "0")});
  transition:
    transform 220ms ease,
    opacity 180ms ease;
`;

const RailSection = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`;

const RailDivider = styled.div`
  width: 100%;
  height: 1px;
  margin: 4px 0;
  background: #eef0f4;
`;

const DashboardLogoIcon = styled.span`
  width: 42px;
  height: 24px;
  flex: 0 0 auto;
  display: block;
  background: url("/icons/GMT.png") no-repeat center / contain;
  transform: scale(1.25);
`;

const RailButton = styled.button<{ $state: "idle" | "active" | "open" }>`
  position: relative;
  width: 100%;
  height: 58px;
  flex: 0 0 58px;
  border-radius: 12px;
  border: 1px solid
    ${({ $state }) =>
      $state === "open"
        ? "rgba(211, 17, 69, 0.56)"
        : $state === "active"
          ? "rgba(211, 17, 69, 0.20)"
          : "transparent"};
  background: ${({ $state }) =>
    $state === "active" ? "#fff1f5" : $state === "open" ? "#ffffff" : "#ffffff"};
  color: ${({ $state }) =>
    $state === "active" || $state === "open" ? "#d31145" : "#4b5563"};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  box-shadow: ${({ $state }) =>
    $state === "active"
      ? "0 10px 20px rgba(211, 17, 69, 0.10)"
      : $state === "open"
        ? "inset 0 0 0 2px rgba(211, 17, 69, 0.08)"
        : "none"};
  transition:
    transform 160ms ease,
    background 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;

  span {
    max-width: 100%;
    overflow: hidden;
    color: inherit;
    font-size: 11px;
    font-weight: 800;
    line-height: 1.1;
    text-overflow: ellipsis;
    white-space: nowrap;
    letter-spacing: 0;
  }

  svg {
    flex: 0 0 auto;
    color: inherit;
  }

  &:hover {
    transform: translateY(-1px);
    background: #fff7f9;
    border-color: rgba(211, 17, 69, 0.22);
    color: #d31145;
    box-shadow: 0 10px 20px rgba(15, 23, 42, 0.06);
  }
`;

const SubSidebar = styled.aside<{ $open: boolean }>`
  position: fixed;
  top: 0;
  bottom: 0;
  left: ${RAIL_WIDTH}px;
  z-index: 10010;
  width: ${SUB_SIDEBAR_WIDTH}px;
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-right: 1px solid #eceff3;
  box-shadow: 16px 0 42px rgba(15, 23, 42, 0.10);
  transform: translateX(${({ $open }) => ($open ? "0" : "-20px")});
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  pointer-events: ${({ $open }) => ($open ? "auto" : "none")};
  transition:
    transform 190ms ease,
    opacity 190ms ease;
`;

const SubHeader = styled.div`
  flex: 0 0 auto;
  padding: 22px 18px 16px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
`;

const SubTitleBlock = styled.div`
  min-width: 0;

  span {
    display: block;
    margin-bottom: 6px;
    color: #d31145;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  strong {
    display: block;
    color: #111827;
    font-size: 22px;
    font-weight: 850;
    letter-spacing: -0.05em;
  }

  p {
    margin: 6px 0 0;
    color: #667085;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.45;
    word-break: keep-all;
  }
`;

const CloseButton = styled.button`
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  border-radius: 12px;
  border: 1px solid rgba(15, 23, 42, 0.10);
  background: #ffffff;
  color: #667085;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 150ms ease, border-color 150ms ease, color 150ms ease;

  &:hover {
    background: #fff1f5;
    border-color: rgba(211, 17, 69, 0.24);
    color: #d31145;
  }
`;

const SearchBox = styled.label`
  flex: 0 0 auto;
  margin: 16px 16px 10px;
  height: 46px;
  border-radius: 12px;
  border: 1px solid rgba(15, 23, 42, 0.10);
  background: #f8fafc;
  color: #98a2b3;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;

  input {
    min-width: 0;
    flex: 1;
    border: 0;
    outline: 0;
    background: transparent;
    color: #111827;
    font-size: 13px;
    font-weight: 750;
  }

  input::placeholder {
    color: #98a2b3;
  }
`;

const ClearSearchButton = styled.button`
  width: 26px;
  height: 26px;
  border-radius: 9px;
  background: #ffffff;
  color: #98a2b3;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`;

const ResultSummary = styled.div`
  flex: 0 0 auto;
  margin: 0 18px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #667085;
  font-size: 12px;
  font-weight: 800;

  em {
    color: #98a2b3;
    font-style: normal;
  }
`;

const SubContent = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 14px 18px;
`;

const ResultGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 18px;
`;

const GroupTitle = styled.div`
  height: 30px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 4px;
  color: #344054;
  font-size: 12px;
  font-weight: 900;
`;

const GroupTitleIcon = styled.span`
  width: 28px;
  height: 28px;
  border-radius: 10px;
  background: #fff1f5;
  color: #d31145;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const ResultButton = styled.button<{ $active: boolean }>`
  width: 100%;
  min-height: 74px;
  border-radius: 12px;
  border: 1px solid ${({ $active }) => ($active ? "rgba(211, 17, 69, 0.34)" : "rgba(15, 23, 42, 0.08)")};
  background: ${({ $active }) => ($active ? "#fff1f5" : "#ffffff")};
  color: ${({ $active }) => ($active ? "#d31145" : "#344054")};
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.045);
  transition: transform 150ms ease, border-color 150ms ease, color 150ms ease, background 150ms ease;

  &:hover {
    transform: translateY(-1px);
    border-color: rgba(211, 17, 69, 0.30);
    color: #d31145;
  }

  > svg {
    flex: 0 0 auto;
    color: #98a2b3;
  }
`;

const ResultIcon = styled.span<{ $active: boolean }>`
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  border-radius: 12px;
  background: ${({ $active }) => ($active ? "#ffffff" : "#f2f4f7")};
  color: ${({ $active }) => ($active ? "#d31145" : "#667085")};
  display: inline-flex;
  align-items: center;
  justify-content: center;
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
    font-weight: 850;
    letter-spacing: -0.04em;
  }

  span {
    color: #667085;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: -0.03em;
  }

  small {
    color: #98a2b3;
    font-size: 10px;
    font-weight: 750;
    letter-spacing: -0.02em;
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
  color: #98a2b3;

  strong {
    color: #344054;
    font-size: 15px;
    font-weight: 850;
  }

  span {
    font-size: 12px;
    font-weight: 700;
  }
`;

const NotificationFab = styled.button<{ $active: boolean }>`
  position: fixed;
  top: 18px;
  right: 20px;
  z-index: 10030;
  width: 46px;
  height: 46px;
  border-radius: 12px;
  border: 1px solid ${({ $active }) => ($active ? "rgba(211, 17, 69, 0.34)" : "rgba(15, 23, 42, 0.10)")};
  background: ${({ $active }) => ($active ? "#fff1f5" : "#ffffff")};
  color: ${({ $active }) => ($active ? "#d31145" : "#475467")};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.12);
  transition: transform 150ms ease, color 150ms ease, border-color 150ms ease, background 150ms ease;

  &:hover {
    transform: translateY(-2px);
    color: #d31145;
    border-color: rgba(211, 17, 69, 0.28);
  }
`;

const NotificationBadge = styled.span`
  position: absolute;
  top: -4px;
  right: -3px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: #ef4444;
  color: #ffffff;
  border: 2px solid #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 900;
`;

const NotificationPanel = styled.aside`
  position: fixed;
  top: 74px;
  right: 20px;
  z-index: 10030;
  width: 386px;
  max-height: min(620px, 80dvh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid rgba(15, 23, 42, 0.10);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 28px 90px rgba(15, 23, 42, 0.18);
`;

const NotificationHeader = styled.div`
  padding: 18px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);

  span {
    display: block;
    margin-bottom: 5px;
    color: #d31145;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  strong {
    color: #111827;
    font-size: 20px;
    font-weight: 850;
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

const toneColor = (tone: NoticeTone) => {
  if (tone === "danger") return "#d31145";
  if (tone === "warning") return "#f59e0b";
  if (tone === "success") return "#12b76a";
  return "#3b82f6";
};

const NoticeCard = styled.div<{ $tone: NoticeTone; $unread: boolean }>`
  position: relative;
  display: flex;
  gap: 11px;
  padding: 13px;
  border-radius: 12px;
  border: 1px solid ${({ $tone, $unread }) => ($unread ? `${toneColor($tone)}35` : "rgba(15, 23, 42, 0.08)")};
  background: ${({ $tone, $unread }) => ($unread ? `${toneColor($tone)}0F` : "#ffffff")};
`;

const NoticeDot = styled.span<{ $tone: NoticeTone }>`
  width: 9px;
  height: 9px;
  flex: 0 0 9px;
  margin-top: 7px;
  border-radius: 5px;
  background: ${({ $tone }) => toneColor($tone)};
  box-shadow: 0 0 0 5px ${({ $tone }) => `${toneColor($tone)}16`};
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
    color: #111827;
    font-size: 13px;
    font-weight: 850;
    letter-spacing: -0.04em;
  }

  span {
    flex: 0 0 auto;
    color: #98a2b3;
    font-size: 11px;
    font-weight: 750;
  }

  p {
    margin: 7px 0 9px;
    color: #667085;
    font-size: 12px;
    font-weight: 700;
    line-height: 1.45;
    word-break: keep-all;
  }

  em {
    display: inline-flex;
    height: 24px;
    align-items: center;
    padding: 0 9px;
    border-radius: 12px;
    background: #f2f4f7;
    color: #667085;
    font-size: 11px;
    font-style: normal;
    font-weight: 850;
  }
`;
