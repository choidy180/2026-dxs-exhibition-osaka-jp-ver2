/**
 * 생산계획 목업 데이터
 *
 * API 연결 전 화면 동작을 검증하기 위한 데이터다.
 * 수량은 고정 시드 난수로 생성해 서버·클라이언트 렌더 결과가 항상 같도록 보장한다.
 * (`Math.random()` 을 쓰면 하이드레이션 불일치가 발생한다.)
 */

import { buildWorkingDays, getRowCount } from '@/utils/production-plan';
import type { PlanDataset, PlanRevision, PlanRow } from '@/types/production-plan';

/** 품목 마스터 — 실제 API 연결 시 이 목록은 사용하지 않는다 */
const PART_MASTER: Array<Pick<PlanRow, 'line' | 'pjt' | 'partNo' | 'partNm'>> = [
  { line: '소형냉장고', pjt: '소형', partNo: 'B65251RT9E', partNm: '소형냉장고-107L' },
  { line: '소형냉장고', pjt: '소형', partNo: 'B65252RT5E', partNm: '소형냉장고-46L' },
  { line: '얼음정수기', pjt: '얼정', partNo: 'W8225GS453', partNm: '얼음정수기-스탠드' },
  { line: '얼음정수기', pjt: '얼정', partNo: 'W8225GS460', partNm: '얼음정수기-빌트인' },
  { line: '제빙DOOR', pjt: 'E3&M2', partNo: 'ADC72987139', partNm: 'DOOR ASSY(R)-제빙' },
  { line: '제빙DOOR', pjt: 'E3&M2', partNo: 'ADC72987140', partNm: 'DOOR ASSY(L)-제빙' },
  { line: '제빙DOOR', pjt: 'VF X', partNo: 'ADC72987150', partNm: 'DOOR ASSY-FRZ VFX' },
  { line: 'BUCKET', pjt: 'VA FU', partNo: 'MJS65374301', partNm: 'BUCKET ASSY-FRZ' },
  { line: 'BUCKET', pjt: 'VA FU', partNo: 'MJS65374302', partNm: 'BUCKET ASSY-REF' },
  { line: 'HINGE', pjt: 'M-Next3 L', partNo: '4774JQ0200', partNm: 'HINGE ASSY-UP(L)' },
  { line: 'HINGE', pjt: 'M-Next3 R', partNo: '4774JQ0100', partNm: 'HINGE ASSY-UP(R)' },
  { line: 'HINGE', pjt: 'VF X', partNo: '4774JQ0300', partNm: 'HINGE ASSY-DN(R)' },
  { line: 'PILLAR', pjt: 'M-Next3', partNo: 'MCK69894901', partNm: 'PILLAR-ASSY FRZ' },
  { line: 'PILLAR', pjt: 'VA2', partNo: 'MCK69894930', partNm: 'PILLAR-ASSY VA2' },
  { line: 'PILLAR', pjt: 'VF X', partNo: 'MCK69894920', partNm: 'PILLAR-ASSY REF' },
];

/** 고정 시드 선형 합동 생성기 — 같은 시드는 항상 같은 수열을 만든다 */
const createSeededRandom = (seed: number) => {
  let state = seed % 2_147_483_647;
  if (state <= 0) state += 2_147_483_646;

  return () => {
    state = (state * 16_807) % 2_147_483_647;
    return (state - 1) / 2_147_483_646;
  };
};

type RevisionSeed = {
  id: string;
  uploadDate: string;
  revision: number;
  uploadedAt: string;
  status: PlanRevision['status'];
  fileName: string;
  /** 계획 기간 (주말 제외) */
  planFrom: string;
  planTo: string;
  itemCount: number;
  seed: number;
};

/**
 * 업로드 히스토리 시드.
 * 08-14 건은 6월~7월에 걸쳐 있어 월 그룹 헤더가 두 개로 나뉘는 경우를 확인할 수 있다.
 */
const REVISION_SEEDS: RevisionSeed[] = [
  {
    id: 'rev-20260819-1',
    uploadDate: '2026-08-19',
    revision: 1,
    uploadedAt: '2026-08-19 14:20',
    status: 'draft',
    fileName: '생산계획_2026년06월_수정.xlsx',
    planFrom: '2026-06-01',
    planTo: '2026-06-30',
    itemCount: 15,
    seed: 20_260_819,
  },
  {
    id: 'rev-20260819-0',
    uploadDate: '2026-08-19',
    revision: 0,
    uploadedAt: '2026-08-19 09:05',
    status: 'confirmed',
    fileName: '생산계획_2026년06월.xlsx',
    planFrom: '2026-06-01',
    planTo: '2026-06-30',
    itemCount: 15,
    seed: 7_010_411,
  },
  {
    id: 'rev-20260814-0',
    uploadDate: '2026-08-14',
    revision: 0,
    uploadedAt: '2026-08-14 15:30',
    status: 'reconfirmed',
    fileName: '생산계획_6월말_7월초.xlsx',
    planFrom: '2026-06-22',
    planTo: '2026-07-17',
    itemCount: 13,
    seed: 3_140_927,
  },
  {
    id: 'rev-20260813-0',
    uploadDate: '2026-08-13',
    revision: 0,
    uploadedAt: '2026-08-13 09:15',
    status: 'confirmed',
    fileName: '생산계획_2026년05월.xlsx',
    planFrom: '2026-05-01',
    planTo: '2026-05-29',
    itemCount: 15,
    seed: 1_618_033,
  },
  {
    id: 'rev-20260812-1',
    uploadDate: '2026-08-12',
    revision: 1,
    uploadedAt: '2026-08-12 16:40',
    status: 'confirmed',
    fileName: '생산계획_2026년05월_수정.xlsx',
    planFrom: '2026-05-01',
    planTo: '2026-05-29',
    itemCount: 14,
    seed: 2_718_281,
  },
  {
    id: 'rev-20260812-0',
    uploadDate: '2026-08-12',
    revision: 0,
    uploadedAt: '2026-08-12 10:05',
    status: 'draft',
    fileName: '생산계획_2026년05월_초안.xlsx',
    planFrom: '2026-05-01',
    planTo: '2026-05-29',
    itemCount: 12,
    seed: 1_414_213,
  },
];

/** 품목 × 근무일 계획수량 생성 — 약 60% 의 날에만 계획이 있는 현장 패턴을 모사한다 */
const buildDataset = (seedInfo: RevisionSeed): PlanDataset => {
  const random = createSeededRandom(seedInfo.seed);
  const days = buildWorkingDays(seedInfo.planFrom, seedInfo.planTo);

  const rows: PlanRow[] = PART_MASTER.slice(0, seedInfo.itemCount).map((part, index) => {
    const quantities: Record<string, number> = {};

    days.forEach(day => {
      if (random() > 0.62) return;
      // 80 ~ 560, 10 단위
      quantities[day.date] = 80 + Math.floor(random() * 49) * 10;
    });

    // 계획이 하나도 없는 품목이 생기지 않도록 첫 근무일에 최소 수량을 보정한다
    if (!Object.keys(quantities).length && days.length) {
      quantities[days[0].date] = 120;
    }

    return {
      id: `${seedInfo.id}-${part.partNo}-${index}`,
      ...part,
      quantities,
    };
  });

  return { revisionId: seedInfo.id, days, rows };
};

/** 리비전별 미리보기 데이터 */
export const DUMMY_PLAN_DATASETS: Record<string, PlanDataset> = REVISION_SEEDS.reduce(
  (datasets, seedInfo) => {
    datasets[seedInfo.id] = buildDataset(seedInfo);
    return datasets;
  },
  {} as Record<string, PlanDataset>,
);

/** 업로드 히스토리 */
export const DUMMY_PLAN_REVISIONS: PlanRevision[] = REVISION_SEEDS.map(seedInfo => {
  const dataset = DUMMY_PLAN_DATASETS[seedInfo.id];

  return {
    id: seedInfo.id,
    uploadDate: seedInfo.uploadDate,
    revision: seedInfo.revision,
    rowCount: getRowCount(dataset.rows, dataset.days),
    uploadedAt: seedInfo.uploadedAt,
    status: seedInfo.status,
    fileName: seedInfo.fileName,
  };
});

/** 최초 선택 리비전 = 가장 최근 업로드 */
export const DEFAULT_REVISION_ID = REVISION_SEEDS[0].id;
