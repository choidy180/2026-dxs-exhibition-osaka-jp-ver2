'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { ref, onValue, query, limitToLast } from "firebase/database";
import { db } from '@/lib/firebase';
import styled from 'styled-components';
import {
  DashboardContainer,
  Column,
  TopCard,
  CardTitle,
  VehicleImagePlaceholder,
  InfoRow,
  MiniEmptyState,
  FullHeightCard,
  HistoryListContainer,
  HistoryItem as BaseHistoryItem,
  VideoCard,
  PinkButton,
} from '@/styles/styles';
import { WearableApiEntry } from '@/types/types';
import AIDashboardModal from '@/components/ai-dashboard-modal';
import WarehouseBoard from '@/components/wearable-warehouse-board';
import {
  Loader2,
  Search,
  ListChecks,
  FileWarning,
  Maximize2,
  Minimize2,
  X,
  Video,
} from "lucide-react";

// --- Constants ---
const PORT = 8080;
const DEV_API_BASE_URL = "https://gapi.dxsplatform.com/api";
const INTERNAL_API_BASE_URL = "http://192.168.2.147:24828/api";

const API_ENDPOINTS = {
  VEHICLE: "/DX_API000020",
  INVOICE: "/V_PurchaseIn",
  MATERIAL_LIST: "/DX_API000034",
} as const;

const isDevFrontUrl = () => {
  if (typeof window === "undefined") {
    return true;
  }

  const { hostname, pathname } = window.location;

  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    pathname.includes("inbound-inspection-dev")
  );
};

const getApiBaseUrl = () => {
  return isDevFrontUrl() ? DEV_API_BASE_URL : INTERNAL_API_BASE_URL;
};

const buildApiUrl = (
  endpoint: string,
  params?: Record<string, string | number | boolean | null | undefined>
) => {
  const url = new URL(`${getApiBaseUrl()}${endpoint}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  console.log("[API URL]", {
    page: typeof window !== "undefined" ? window.location.href : "server",
    apiUrl: url.toString(),
  });

  return url.toString();
};

// --- Types ---
interface VehicleSlotDetail {
  slot_id: number;
  PLATE: string | null;
  FILENAME: string | null;
  FILEPATH: string;
  entry_time: string | null;
  exit_time: string | null;
}

interface VehicleApiResponse {
  [key: string]: {
    total: number;
    slots_detail: VehicleSlotDetail[];
  };
}

interface MaterialListItem {
  PrjGubun: string;
  PrjCode: string;
  PrjName: string;
  NmCustm: string;        
  InvoiceNo: string;      
  NmGItem: string;        
  InspConf: string;       
  NmInspGB: string;       
  PurInDate: string;      
  [key: string]: any;
}

// --- Styled Components (한 줄씩 줄바꿈 적용) ---

const VideoHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #ffffff;
  border-radius: 16px 16px 0 0;

  h3 {
    font-size: 22px;
    font-weight: 600;
    color: #0f172a;
    margin: 0;
    letter-spacing: -1px;
  }
`;

const VideoGrid = styled(motion.div)<{ $isMaximized: boolean }>`
  display: grid;
  grid-template-columns: ${props => props.$isMaximized ? '1fr' : 'repeat(2, 1fr)'};
  grid-template-rows: ${props => props.$isMaximized ? '1fr' : 'repeat(2, 1fr)'};
  gap: 16px;
  flex: 1;
  padding: 0 24px 24px 24px;
  background: #ffffff;
  border-radius: 0 0 16px 16px;
`;

const CamBox = styled(motion.div)`
  background: #1a2235; 
  border-radius: 12px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  iframe {
    width: 100%;
    height: 100%;
    border: none;
    object-fit: cover;
  }

  .cam-title {
    position: absolute;
    top: 16px;
    left: 20px;
    color: #ffffff;
    font-size: 0.95rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 10;

    &::before {
      content: '';
      display: block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #ef4444; 
    }
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    color: #334155; 
    
    svg {
      margin-bottom: 12px;
      stroke-width: 1.5;
    }
  }

  .fullscreen-btn {
    position: absolute;
    bottom: 16px;
    right: 16px;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    color: white;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.2s;
    z-index: 10;

    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  }
`;

const ModalBackdrop = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 2000;
`;

const ModalContainer = styled(motion.div)`
  position: fixed;
  top: calc(50% + 32px);
  left: 50%;
  transform: translate(-50%, -50%);
  width: 95%;
  max-width: 1400px;
  height: 80vh;
  background: #ffffff;
  color: #334155;
  border-radius: 20px;
  z-index: 2001;
  padding: 32px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  border: 1px solid #f1f5f9;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;

  h2 {
    color: #0f172a;
    font-size: 1.5rem;
    font-weight: 800;
    display: flex;
    align-items: center;
    gap: 12px;
    white-space: nowrap;
  }
`;

const ControlBar = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  align-items: center;
`;

const SearchInput = styled.div`
  flex: 1;
  position: relative;

  input {
    width: 100%;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 12px 12px 12px 44px;
    border-radius: 12px;
    color: #334155;
    font-size: 0.95rem;
    transition: all 0.2s;

    &:focus {
      outline: none;
      background: #ffffff;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
  }

  svg {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #64748b;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 12px;
  gap: 4px;
`;

const FilterButton = styled.button<{ $active: boolean }>`
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${props => props.$active ? '#ffffff' : 'transparent'};
  color: ${props => props.$active ? '#2563eb' : '#64748b'};
  box-shadow: ${props => props.$active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'};

  &:hover {
    color: ${props => props.$active ? '#2563eb' : '#334155'};
  }
`;

const TableWrapper = styled.div`
  flex: 1;
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;

  &::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f5f9;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }
`;

const StyledTable = styled.table`
  width: 100%;
  min-width: 1000px;
  border-collapse: collapse;
  table-layout: auto;

  thead {
    position: sticky;
    top: 0;
    z-index: 10;
    background: #f1f5f9;
  }

  th {
    color: #475569;
    font-weight: 700;
    text-align: left;
    padding: 16px 20px;
    font-size: 0.9rem;
    border-bottom: 1px solid #e2e8f0;
    white-space: nowrap;
  }

  td {
    padding: 16px 20px;
    border-bottom: 1px solid #f1f5f9;
    color: #334155;
    font-size: 0.95rem;
    vertical-align: middle;
    white-space: nowrap;
  }

  tr:last-child td {
    border-bottom: none;
  }

  tr:hover td {
    background: #f8fafc;
  }
`;

const StatusBadge = styled.span<{ $status: string }>`
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;
  min-width: 80px;
  
  background: ${props => props.$status === 'Y' ? '#dcfce7' : '#fee2e2'};
  color: ${props => props.$status === 'Y' ? '#15803d' : '#b91c1c'};
  border: 1px solid ${props => props.$status === 'Y' ? '#bbf7d0' : '#fecaca'};
`;

const CloseButton = styled.button`
  background: #f1f5f9;
  border: none;
  color: #64748b;
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: #e2e8f0;
    color: #0f172a;
    transform: rotate(90deg);
  }
`;

const ViewAllButton = styled.button`
  background: transparent;
  color: #94a3b8;
  border: none;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: color 0.2s;

  &:hover {
    color: #64748b;
  }
`;

// --- Sub Components ---

const MemoizedHistoryItem = React.memo(({ item }: { item: MaterialListItem }) => {
  const truncatedName = item.NmCustm.length > 12 ? item.NmCustm.slice(0, 12) + "..." : item.NmCustm;
  return (
    <BaseHistoryItem>
        <div className="left-grp">
            <span className="comp" title={item.NmCustm}>{truncatedName}</span>
            <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500, marginTop: '4px', fontFamily: 'monospace' }}>
                {item.InvoiceNo || "-"}
            </span>
        </div>
        <div className="info">
            <span className="status bad" style={{ background:'#f1f5f9', color:'#475569', border:'1px solid #e2e8f0', borderRadius: '12px', padding: '4px 10px' }}>
                {item.NmInspGB || "대기"}
            </span>
        </div>
    </BaseHistoryItem>
  );
});
MemoizedHistoryItem.displayName = "MemoizedHistoryItem";

const MaterialListModal = ({ isOpen, onClose, data }: { isOpen: boolean; onClose: () => void; data: MaterialListItem[];}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL"); 

  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (filterType === 'Y') { if (item.InspConf !== 'Y') return false; }
      if (filterType === 'N') { if (item.InspConf === 'Y') return false; }
      if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        return (
          (item.NmCustm && item.NmCustm.toLowerCase().includes(lowerTerm)) ||
          (item.NmGItem && item.NmGItem.toLowerCase().includes(lowerTerm)) ||
          (item.InvoiceNo && item.InvoiceNo.toLowerCase().includes(lowerTerm))
        );
      }
      return true;
    });
  }, [data, searchTerm, filterType]);

  if (!isOpen) return null;

  return (
    <>
      <ModalBackdrop initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <ModalContainer initial={{ scale: 0.95, opacity: 0, y: "-50%", x: "-50%" }} animate={{ scale: 1, opacity: 1, y: "-50%", x: "-50%" }} exit={{ scale: 0.95, opacity: 0, y: "-50%", x: "-50%" }}>
        <ModalHeader>
          <h2>
            <div style={{background: '#eff6ff', padding: 10, borderRadius: 12}}>
              <ListChecks size={24} color="#3b82f6"/>
            </div>
            자재 입고 현황 전체보기
          </h2>
          <CloseButton onClick={onClose}>
            <X size={20} />
          </CloseButton>
        </ModalHeader>
        <ControlBar>
          <SearchInput>
            <Search size={18} />
            <input placeholder="업체명, 자재명, 송장번호로 검색하세요" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </SearchInput>
          <FilterGroup>
            <FilterButton $active={filterType === 'ALL'} onClick={() => setFilterType('ALL')}>전체보기</FilterButton>
            <FilterButton $active={filterType === 'N'} onClick={() => setFilterType('N')}>대기중</FilterButton>
            <FilterButton $active={filterType === 'Y'} onClick={() => setFilterType('Y')}>완료됨</FilterButton>
          </FilterGroup>
        </ControlBar>
        <TableWrapper>
          <StyledTable>
            <colgroup><col style={{width:'120px'}}/><col style={{width:'200px'}}/><col style={{width:'250px'}}/><col style={{width:'auto'}}/><col style={{width:'180px'}}/></colgroup>
            <thead><tr><th>상태</th><th>송장번호</th><th>업체명</th><th>자재명</th><th>입고일시</th></tr></thead>
            <tbody>
              {filteredData.length > 0 ? (
                filteredData.map((item, idx) => (
                  <tr key={`${item.InvoiceNo || 'unknown'}-${idx}`}>
                    <td>
                      <StatusBadge $status={item.InspConf === 'Y' ? 'Y' : 'N'}>
                        {item.InspConf === 'Y' ? <><span>●</span>완료</> : <><span>●</span>{item.NmInspGB || "대기"}</>}
                      </StatusBadge>
                    </td>
                    <td style={{fontFamily: 'monospace', fontWeight: 600, fontSize: '1rem'}}>{item.InvoiceNo}</td>
                    <td style={{fontWeight: 600}}>{item.NmCustm}</td>
                    <td>{item.NmGItem}</td>
                    <td style={{color: '#64748b'}}>{item.PurInDate || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{textAlign: 'center', padding: '60px', color: '#94a3b8'}}>
                    <Search size={48} style={{opacity: 0.2, marginBottom: 16}} /><br/>검색 결과가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </StyledTable>
        </TableWrapper>
      </ModalContainer>
    </>
  );
};

// --- Main Page ---

export default function DashboardPage() {
  const [streamHostsInput, setStreamHostsInput] = useState("10.172.167.185, 192.168.0.122");
  
  const [connectedIp, setConnectedIp] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState("");

  const [showDashboard, setShowDashboard] = useState(false);
  const [showMapBoard, setShowMapBoard] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showListModal, setShowListModal] = useState(false); 
  
  const [maximizedCam, setMaximizedCam] = useState<number | null>(null);
  
  const [now, setNow] = useState<Date | null>(null);
  const [vehicleInfo, setVehicleInfo] = useState<VehicleSlotDetail | null>(null);
  const [isVehicleLoading, setIsVehicleLoading] = useState(false);
  const [isVehicleDataLoaded, setIsVehicleDataLoaded] = useState(false);
  const [dwellString, setDwellString] = useState("-");
  const [isLongDwell, setIsLongDwell] = useState(false);

  const [materialList, setMaterialList] = useState<MaterialListItem[]>([]); 
  const [pendingList, setPendingList] = useState<MaterialListItem[]>([]);   
  const [materialStats, setMaterialStats] = useState({ total: 0, done: 0, percent: 0 });
  const [isMaterialLoading, setIsMaterialLoading] = useState(false);
  const [materialError, setMaterialError] = useState<string | null>(null);

  const [scannedInvoiceData, setScannedInvoiceData] = useState<WearableApiEntry[]>([]);
  const lastProcessedKeyRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef<boolean>(true);

  const scanAndLockIp = useCallback(async () => {
    if (connectedIp) return;

    const candidateIps = streamHostsInput.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0);
    if (candidateIps.length === 0) {
      setScanMessage("IP를 입력해주세요.");
      return;
    }

    setIsScanning(true);
    setScanMessage("카메라 신호를 찾는 중...");

    let found = false;

    for (const ip of candidateIps) {
      if (found) break;
      
      const url = `http://${ip}:${PORT}/`;
      setScanMessage(`${ip} 연결 시도 중...`);
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); 
        
        await fetch(url, { 
            method: 'HEAD', 
            mode: 'no-cors', 
            signal: controller.signal 
        });
        
        clearTimeout(timeoutId);
        setConnectedIp(ip);
        found = true;
      } catch (e) {
        console.log(`Failed to connect to ${ip}`, e);
      }
    }

    setIsScanning(false);
    if (!found) {
        setScanMessage("연결 가능한 카메라가 없습니다.");
    }
  }, [connectedIp, streamHostsInput]);

  useEffect(() => {
    if (!connectedIp) {
      scanAndLockIp();
    }
  }, [scanAndLockIp, connectedIp]);

  const handleRetryScan = () => {
      setConnectedIp(null); 
      setTimeout(() => scanAndLockIp(), 100); 
  };

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => { setNow(new Date()); }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchVehicleData = useCallback(async () => {
    try {
      setIsVehicleLoading(true);
      const res = await fetch(buildApiUrl(API_ENDPOINTS.VEHICLE));
      if (!res.ok) throw new Error("Vehicle API Error");
      const data: VehicleApiResponse = await res.json();
      const allSlots = Object.values(data).flatMap(area => area.slots_detail);
      const validSlots = allSlots.filter(slot => 
        slot.FILEPATH && slot.FILENAME && (slot.FILENAME.toLowerCase().endsWith('.jpg') || slot.FILENAME.toLowerCase().endsWith('.png'))
      );
      validSlots.sort((a, b) => {
        if (!a.entry_time) return 1;
        if (!b.entry_time) return -1;
        return new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime();
      });
      if (validSlots.length > 0) {
        setVehicleInfo(validSlots[0]); 
        setIsVehicleDataLoaded(true);
      } else {
        setIsVehicleDataLoaded(true); 
      }
    } catch (err) { console.error(err); } finally { setIsVehicleLoading(false); }
  }, []);

  const fetchMaterialData = useCallback(async () => {
    setMaterialError(null);
    setIsMaterialLoading(true);
    try {
      const res = await fetch(buildApiUrl(API_ENDPOINTS.MATERIAL_LIST));
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      const json = await res.json();
      
      // ✨ 수정: API 결과 중 '대일화학' 이름이 포함된 항목을 필터링하여 제외
      let data: MaterialListItem[] = Array.isArray(json) ? json : [];
      data = data.filter(item => !(item.NmCustm && item.NmCustm.includes('대일화학')));

      setMaterialList(data);
      const total = data.length;
      const done = data.filter(item => item.InspConf === 'Y').length;
      setMaterialStats({ total, done, percent: total > 0 ? Math.round((done / total) * 100) : 0 });
      setPendingList(data.filter(item => item.InspConf !== 'Y'));
    } catch (err: any) {
      setMaterialError(err.message || "데이터 로드 실패");
      setMaterialList([]);
      setPendingList([]);
      setMaterialStats({ total: 0, done: 0, percent: 0 });
    } finally { setIsMaterialLoading(false); }
  }, []);

  useEffect(() => {
    if (!now || !vehicleInfo || !vehicleInfo.entry_time) {
      setDwellString("-");
      setIsLongDwell(false);
      return;
    }
    const entryTime = new Date(vehicleInfo.entry_time);
    const diffMs = now.getTime() - entryTime.getTime();
    if (diffMs < 0) { setDwellString("0분"); setIsLongDwell(false); }
    else {
      const diffMins = Math.floor(diffMs / 60000);
      const hours = Math.floor(diffMins / 60);
      const minutes = diffMins % 60;
      setIsLongDwell(diffMins >= 30);
      setDwellString(hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`);
    }
  }, [now, vehicleInfo]);

  const manualTrigger = useCallback(() => { 
    fetchVehicleData(); 
    fetchMaterialData();
    setShowDashboard(true); 
  }, [fetchVehicleData, fetchMaterialData]);

  // ✨ 수정: 컴포넌트 마운트(화면 진입) 시 바로 manualTrigger() 실행
  useEffect(() => {
    // manualTrigger();
  }, [manualTrigger]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            if (showListModal) setShowListModal(false);
            else if (showMapBoard) setShowMapBoard(false);
            else if (showDashboard) setShowDashboard(false);
            else if (isFullScreen) setIsFullScreen(false);
            else if (maximizedCam !== null) setMaximizedCam(null);
        }
        if (e.key === 'Enter') {
            manualTrigger();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen, showDashboard, showMapBoard, showListModal, maximizedCam, manualTrigger]);

  const lastProcessedContentRef = useRef<string | null>(null);

  useEffect(() => {
    if (!db) return;

    const logsRef = ref(db, 'vuzix_log');
    const q = query(logsRef, limitToLast(1));

    const unsubscribe = onValue(q, async (snapshot) => {
      const dataWrapper = snapshot.val();

      if (!dataWrapper) {
        isInitialLoadRef.current = false;
        return;
      }

      const key = Object.keys(dataWrapper)[0];
      const data = dataWrapper[key];
      const currentContent = JSON.stringify(data);

      if (isInitialLoadRef.current) {
        lastProcessedKeyRef.current = key;
        lastProcessedContentRef.current = currentContent;
        isInitialLoadRef.current = false; 
        return;
      }

      const isKeyChanged = lastProcessedKeyRef.current !== key;
      const isContentChanged = lastProcessedContentRef.current !== currentContent;

      if (!isKeyChanged && !isContentChanged) return;

      lastProcessedKeyRef.current = key;
      lastProcessedContentRef.current = currentContent;

      fetchVehicleData();
      fetchMaterialData();

      const barcode = data.barcode || data.Barcode;
      if (barcode) {
        try {
          const apiUrl = buildApiUrl(API_ENDPOINTS.INVOICE, { InvoiceNo: barcode });
          const res = await fetch(apiUrl);
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json)) {
                setScannedInvoiceData(json);
            }
          }
        } catch (err) {
          console.error("Invoice Fetch Error:", err);
        }
      }

      setShowDashboard(true); 
    });

    return () => unsubscribe();
  }, [fetchVehicleData, fetchMaterialData]);

  const toggleMapBoard = useCallback(() => setShowMapBoard(true), []);
  const closeDashboard = useCallback(() => setShowDashboard(false), []);
  const closeMapBoard = useCallback(() => setShowMapBoard(false), []);
  const toggleFullScreen = useCallback(() => setIsFullScreen(prev => !prev), []);
  const toggleListModal = useCallback(() => setShowListModal(true), []);
  const closeListModal = useCallback(() => setShowListModal(false), []);

  return (
    <LayoutGroup>      
      <DashboardContainer $show={true} style={{ padding: '24px', background: '#f8fafc', gap: '24px' }}>
            <Column style={{ flex: '0 0 380px' }}>
                <TopCard style={{ borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <CardTitle style={{ fontSize: '1.2rem' }}>입고 차량 정보</CardTitle>
                    {isVehicleDataLoaded && vehicleInfo ? (
                      <div style={{ padding: '0 20px 20px 20px' }}>
                        <VehicleImagePlaceholder style={{ borderRadius: '12px', height: '180px', marginBottom: '20px', overflow: 'hidden' }}>
                          <img 
                            src={vehicleInfo.FILEPATH} 
                            alt="Vehicle" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                          />
                        </VehicleImagePlaceholder>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <InfoRow style={{ padding: '0', border: 'none' }}>
                                <span className="label" style={{ color: '#64748b', fontWeight: 500 }}>차량번호</span>
                                <span className="value" style={{ fontWeight: 800, fontSize: '1.1rem' }}>{vehicleInfo.PLATE || "번호미상"}</span>
                            </InfoRow>
                            <InfoRow style={{ padding: '0', border: 'none' }}>
                                <span className="label" style={{ color: '#64748b', fontWeight: 500 }}>도착시간</span>
                                <span className="value" style={{ fontWeight: 700 }}>{vehicleInfo.entry_time ? vehicleInfo.entry_time.split(' ')[1] : "-"}</span>
                            </InfoRow>
                            <InfoRow style={{ padding: '0', border: 'none' }}>
                                <span className="label" style={{ color: '#64748b', fontWeight: 500 }}>체류시간</span>
                                <span className="value" style={{ fontWeight: 700 }}>{dwellString}</span>
                            </InfoRow>
                            <InfoRow style={{ padding: '0', border: 'none' }}>
                                <span className="label" style={{ color: '#64748b', fontWeight: 500 }}>상태</span>
                                <span className="value" style={{ background: '#f1f5f9', padding: '4px 12px', borderRadius: '16px', fontSize: '0.85rem', color: '#475569' }}>입고대기</span>
                            </InfoRow>
                        </div>
                      </div>
                    ) : (
                      <MiniEmptyState>
                        <div className="icon-circle">{isVehicleLoading ? <Loader2 className="spin" size={28}/> : <Search size={28} />}</div>
                        <h3>{isVehicleLoading ? "데이터 조회 중..." : "차량 데이터 대기"}</h3>
                        <p>{isVehicleLoading ? "잠시만 기다려주세요." : "바코드를 스캔하면 차량정보가 표시됩니다."}</p>
                      </MiniEmptyState>
                    )}
                </TopCard>

                <FullHeightCard style={{ borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <CardTitle style={{ margin: 0, padding: 0, fontSize: '1.2rem' }}>입고 대기 리스트</CardTitle>
                            <span style={{ color: '#D31145', background: '#FFF0F3', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 }}>총 {pendingList.length}건</span>
                        </div>
                        <ViewAllButton onClick={toggleListModal}>전체보기 &gt;</ViewAllButton>
                    </div>
                    
                    <div style={{borderBottom: '1px solid #e2e8f0', marginTop: '30px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '1rem', fontWeight: 700, color: '#D31145' }}>
                            <span>금일 입고 진행률</span>
                            <span>{materialStats.percent}% ({materialStats.done}/{materialStats.total})</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                            <motion.div initial={{ width: 0 }} animate={{ width: `${materialStats.percent}%` }} transition={{ duration: 1, ease: "easeOut" }} style={{ height: '100%', background: '#D31145', borderRadius: '3px' }} />
                        </div>
                    </div>

                    <HistoryListContainer style={{ padding: '10px 0px' }}>
                        <div className="h-scroll-area">
                            {isMaterialLoading ? (
                                <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', color:'#64748b', gap:'12px'}}>
                                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Loader2 size={32} color="#D31145"/></motion.div>
                                    <span style={{fontSize:'0.9rem', fontWeight:500}}>데이터를 불러오는 중입니다...</span>
                                </div>
                            ) : materialError ? (
                                <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', color:'#ef4444', gap:'10px'}}>
                                    <FileWarning size={32} />
                                    <span style={{fontSize:'0.9rem', textAlign:'center'}}>로드 실패<br/><span style={{fontSize:'0.8rem', color:'#94a3b8'}}>{materialError}</span></span>
                                    <PinkButton onClick={fetchMaterialData} style={{height:30, fontSize:'0.8rem', padding:'0 12px'}}>재시도</PinkButton>
                                </div>
                            ) : pendingList.length > 0 ? (
                                pendingList.map((item, idx) => (
                                  <MemoizedHistoryItem 
                                    key={`${item.InvoiceNo || 'unknown'}-${idx}`} 
                                    item={item} 
                                  />
                                ))
                            ) : (
                                <div style={{display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', color:'#94a3b8', fontSize:'0.9rem'}}>항목이 없습니다.</div>
                            )}
                        </div>
                    </HistoryListContainer>
                </FullHeightCard>
            </Column>

            <Column style={{ flex: 1 }}>
                <VideoCard $isFullScreen={isFullScreen} layout transition={{ layout: { duration: 0.6, type: "spring", stiffness: 80, damping: 20 } }} style={{ background: 'transparent', boxShadow: 'none' }}>
                    
                    <VideoHeader>
                        <h3>자재 검수 실시간 모니터링</h3>
                        <PinkButton onClick={toggleMapBoard} style={{ background: '#D31145', borderRadius: '20px', padding: '8px 20px' }}>D동 현황 &gt;</PinkButton>
                    </VideoHeader>

                    <VideoGrid layout $isMaximized={maximizedCam !== null}>
                        {[1, 2, 3, 4].map((num) => {
                          if (maximizedCam !== null && maximizedCam !== num) return null;

                          return (
                            <CamBox layout key={num}>
                              <div className="cam-title">자재검수 모니터링 - 0{num}</div>
                              
                              {connectedIp && !isScanning && num === 1 ? (
                                <iframe 
                                  src={`http://${connectedIp}:${PORT}/`} 
                                  title={`Stream ${num}`} 
                                  allow="fullscreen"
                                />
                              ) : (
                                <div className="empty-state">
                                  <Video size={48} opacity={0.2} />
                                  <span style={{ fontSize: '0.9rem' }}>카메라 연결 대기중</span>
                                </div>
                              )}
                              
                              <button 
                                className="fullscreen-btn"
                                onClick={() => setMaximizedCam(maximizedCam === num ? null : num)}
                                title={maximizedCam === num ? "축소" : "확대"}
                              >
                                {maximizedCam === num ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                              </button>
                            </CamBox>
                          );
                        })}
                    </VideoGrid>

                    <AnimatePresence>
                        {showDashboard && (
                          <AIDashboardModal 
                              onClose={closeDashboard} 
                              streamUrl={connectedIp ? `http://${connectedIp}:${PORT}/` : ""} 
                              streamStatus={connectedIp ? "ok" : "error"} 
                              externalData={scannedInvoiceData} 
                          />
                        )}
                    </AnimatePresence>
                </VideoCard>
            </Column>
      </DashboardContainer>

      <AnimatePresence>
        {showListModal && <MaterialListModal isOpen={showListModal} onClose={closeListModal} data={materialList} />}
        
        {/* ✨ WarehouseBoard 자체가 Modal을 포함하고 있으므로 이중으로 감싸지 않고 바로 렌더링합니다. */}
        {showMapBoard && (
            <WarehouseBoard onClose={closeMapBoard} />
        )}
      </AnimatePresence>
    </LayoutGroup>
  );
}