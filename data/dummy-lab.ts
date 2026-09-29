/**
 * 실험실 화면 목업 데이터
 *
 * 값은 고정 시드로 생성해 서버·클라이언트 렌더 결과가 항상 같도록 보장한다.
 * 발주대상 목록은 BOM 품목 풀에서 파생시켜 두 화면의 품번이 서로 맞도록 했다.
 */

import { BOM_BASE_DATE, DEFAULT_ORDER_PLAN_DATE, ORDER_SCHEDULE_DAY_COUNT } from '@/constants/lab';
import { buildDayRange } from '@/utils/date';
import type {
  BomDataset,
  BomRow,
  OrderNeed,
  OrderPlanDataset,
  OrderTargetRow,
  PlanRevisionOption,
} from '@/types/lab';

/** 고정 시드 선형 합동 생성기 */
const createSeededRandom = (seed: number) => {
  let state = seed % 2_147_483_647;
  if (state <= 0) state += 2_147_483_646;

  return () => {
    state = (state * 16_807) % 2_147_483_647;
    return (state - 1) / 2_147_483_646;
  };
};

/** BOM 전개 목표 건수 — 화면 지표(총 BOM 건수)와 일치한다 */
const TARGET_BOM_ROWS = 766;

const PJT_CODE = 'ET-09057';

const VENDORS = [
  '대성정밀', '한성산업', '동우정밀', '세광테크', '서진정공',
  '대명소재', '화이튼전자', '유진케미컬', '삼우폴리머', '금호레진',
  '태영몰드', '신영금속', '우성테크', '광명플라스틱', '한일화학',
  '경일산업', '동방정밀', '미래소재', '남양테크', '정우산업',
  '두성케미컬', '대한몰드', '성진정밀', '한도테크', '영진소재',
  '창원정공', '보성산업', '진영테크', '신흥화학', '동성정밀',
];

const BUYERS = ['담당자 A', '담당자 B', '담당자 C', '담당자 D', '담당자 E'];
const MATERIAL_MANAGERS = ['자재담당 A', '자재담당 B', '자재담당 C', '자재담당 D'];
const PROCESS_GBS = ['조립', '사출', '발포', '진공성형', '외주'];
const ORDER_GBS = ['발주', '미발주'];

/** BOM 템플릿 노드 */
type TemplateNode = {
  code: string;
  name: string;
  spec: string;
  material: string;
  unit: string;
  /** true 면 제품별로 다른 품번을 쓴다 (제품 전용 부품) */
  perProduct?: boolean;
  children?: TemplateNode[];
};

/**
 * 정전개 템플릿 — 실제 냉장고 도어 BOM 구조를 따른다.
 * 깊이 최대 6단계이며 전개 순서(DFS)가 화면 표시 순서와 같다.
 */
const BOM_TEMPLATE: TemplateNode = {
  code: 'ADC7298714',
  name: 'DOOR ASSEMBLY, FREEZE ROOM',
  spec: 'P-NEXT3 DISPENCER_ENG_NON DISP',
  material: 'ASSEMBLY',
  unit: 'EA',
  perProduct: true,
  children: [
    {
      code: 'ADD7291591',
      name: 'DOOR FOAM ASSEMBLY',
      spec: 'Maverick Gen2 (Brand)_NEW LOGO',
      material: 'ASSEMBLY',
      unit: 'EA',
      perProduct: true,
      children: [
        {
          code: 'MCW6346560',
          name: 'DOOR LINER, FREEZER',
          spec: 'MOLD ABS RS-670 SUPER WHITE',
          material: 'ASSEMBLY',
          unit: 'EA',
          perProduct: true,
          children: [
            {
              code: 'MHK50289719',
              name: 'SHEET, PLASTIC',
              spec: 'RS670_04197 RS-670 04197 SHEET',
              material: 'SLS',
              unit: 'KG',
              children: [
                {
                  code: 'SCRE000RS670',
                  name: 'SHEET, PLASTIC(SCRAP)',
                  spec: 'MOLD ABS RS-670 SUPER WHITE',
                  material: 'ABS',
                  unit: 'KG',
                },
                {
                  code: 'RAA33102101',
                  name: 'RESIN,ABS',
                  spec: 'ABS(PCR) GC0620T-W98315B',
                  material: 'ABS',
                  unit: 'KG',
                  children: [
                    {
                      code: 'RAB33516501',
                      name: 'Master Batch',
                      spec: 'Super White 08675 CM-2600D',
                      material: 'MB',
                      unit: 'KG',
                      children: [
                        {
                          code: 'RAB33516777',
                          name: 'Pigment, White',
                          spec: 'TiO2 R-902 DuPont',
                          material: 'PIGMENT',
                          unit: 'KG',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          code: 'MCV6197400',
          name: 'DOOR, FREEZE ROOM(G)',
          spec: 'PCR ABS Door,Freeze Room+PRINT',
          material: 'PCR ABS',
          unit: 'EA',
          perProduct: true,
          children: [
            {
              code: 'MP09EP391101',
              name: 'DOOR,FREEZE ROOM SEMI',
              spec: 'MOLD ABS GC0620T-W98315B',
              material: 'VINYL',
              unit: 'EA',
              children: [
                {
                  code: 'MCV61873703',
                  name: 'DOOR,FREEZE ROOM',
                  spec: 'ABS(PCR) GC0620T-W98315B',
                  material: 'PC',
                  unit: 'EA',
                  children: [
                    {
                      code: 'RAA36518706',
                      name: 'Resin,ABS',
                      spec: 'MOLD ABS RS-670 SUPER WHITE',
                      material: 'ABS',
                      unit: 'KG',
                    },
                  ],
                },
                {
                  code: '4620JA3033A',
                  name: 'STOPPER, DOOR',
                  spec: 'MOLD POM NATURAL T2.5 BRACKET',
                  material: 'POM',
                  unit: 'EA',
                  children: [
                    {
                      code: 'RAA32943803',
                      name: 'RESIN, POM',
                      spec: 'N2320 Natural CIE Lab BASF',
                      material: 'POM',
                      unit: 'KG',
                    },
                  ],
                },
                {
                  code: '1TRL0302618',
                  name: 'SCREW, TAPPING',
                  spec: 'RH + 2 3MM 10MM MSWR3 FZ-CR3',
                  material: 'MSWR3',
                  unit: 'EA',
                },
              ],
            },
          ],
        },
        {
          code: 'RAC30444442',
          name: 'Polyurethane Assembly',
          spec: 'Door BK014 CYCLOPENTANE 12.5%',
          material: '발포액',
          unit: 'KG',
          children: [
            {
              code: 'RAC30444443',
              name: 'Polypropylene Glycol',
              spec: 'RAC30444443 - - KP015 POLYOL',
              material: '발포액',
              unit: 'KG',
            },
            {
              code: '59339039',
              name: 'Diphenyl Methane',
              spec: 'DOW: PaPi-135k / Kumho: M-200',
              material: '발포액 P액(MDI)',
              unit: 'KG',
            },
          ],
        },
      ],
    },
    {
      code: 'MEB61894003',
      name: 'HANDLE,HOME BAR',
      spec: 'MOLD POM LIGHT GRAY T2.5 HANDLE',
      material: 'POM',
      unit: 'EA',
      children: [
        {
          code: 'RAA32276401',
          name: 'RESIN, POM',
          spec: 'GB 704 GB704 LM-W9802 White',
          material: 'POM',
          unit: 'KG',
        },
      ],
    },
    {
      code: '4580JT3001B',
      name: 'Roller',
      spec: 'MOLD PP PP NATURAL MAJESTY',
      material: 'PP',
      unit: 'EA',
      children: [
        {
          code: '80PP5230000',
          name: 'RESIN, PP',
          spec: '80PP5230000 M540 0000 NATURAL',
          material: 'PP',
          unit: 'KG',
        },
      ],
    },
    {
      code: 'MCK6373490',
      name: 'Cover,Lever(G)',
      spec: 'PRINTING ABS HG-173 SUPER WHITE',
      material: 'ABS',
      unit: 'EA',
      perProduct: true,
      children: [
        {
          code: 'MCK62986801',
          name: 'COVER, LEVER',
          spec: 'MOLD ABS HG-173 SUPER WHITE',
          material: 'ABS',
          unit: 'EA',
          children: [
            {
              code: 'RAA36185119',
              name: 'Resin,ASA',
              spec: 'Super White 08675 CM-2600D',
              material: 'ASA',
              unit: 'KG',
            },
          ],
        },
      ],
    },
    {
      code: 'MEZ42383818',
      name: 'LABEL, CAUTION(FRONT)',
      spec: 'PRINTING 14" Signature, Ice&Water',
      material: '아트지',
      unit: 'EA',
    },
    {
      code: 'MDS62111103',
      name: 'GASKET,DOOR',
      spec: 'MOLD SILICON RUBBER SILICONE',
      material: 'FOAM PE',
      unit: 'EA',
    },
    {
      code: 'SCFFH10408CR',
      name: 'SCREW, CUSTOMIZED',
      spec: 'FFH + 4MM 8MM SWRCH18A-CR3',
      material: 'SWRCH18A',
      unit: 'EA',
    },
    {
      code: 'TRPVTR500840',
      name: 'PROTECTIVE VINYL',
      spec: 'T0.04xW500xL840M_LDPE 엠보',
      material: 'VINYL',
      unit: 'RL',
    },
    {
      code: 'RAB36916002',
      name: 'Tape,PETP',
      spec: 'GRAY T0.06 X W50 X L100M',
      material: 'PETP',
      unit: 'RL',
    },
  ],
};

/** 제품 목록 — 템플릿을 제품 수만큼 반복해 전개한다 */
const PRODUCT_NAMES = [
  'DOOR ASSEMBLY, FREEZE ROOM',
  'DOOR ASSEMBLY, REF ROOM',
  'DOOR ASSEMBLY, HOME BAR',
];

/** 문자열을 안정적인 정수로 바꾼다 (같은 문자열은 항상 같은 값) */
const hashString = (key: string) => {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) % 1_000_003;
  }
  return hash;
};

const pickBy = <T>(list: readonly T[], key: string) => list[hashString(key) % list.length];

/** 제품 순번을 붙여 제품 전용 품번을 만든다 */
const withProductSuffix = (code: string, productIndex: number) =>
  `${code}${String(productIndex % 10)}${productIndex >= 10 ? String(Math.floor(productIndex / 10)) : ''}`;

const buildBomRows = (): BomRow[] => {
  const rows: BomRow[] = [];
  let productIndex = 0;

  // 같은 품번은 항상 같은 거래처를 갖고, 거래처 목록은 앞에서부터 골고루 쓰인다
  const vendorByItem = new Map<string, string>();
  const resolveVendor = (itemNo: string) => {
    const cached = vendorByItem.get(itemNo);
    if (cached) return cached;
    const vendor = VENDORS[vendorByItem.size % VENDORS.length];
    vendorByItem.set(itemNo, vendor);
    return vendor;
  };

  while (rows.length < TARGET_BOM_ROWS) {
    const currentProduct = productIndex;
    const productCode = withProductSuffix(BOM_TEMPLATE.code, currentProduct);
    const productNm = PRODUCT_NAMES[currentProduct % PRODUCT_NAMES.length];

    const resolveCode = (node: TemplateNode) =>
      node.perProduct ? withProductSuffix(node.code, currentProduct) : node.code;

    // DFS 전개 — 화면 표시 순서와 같다
    const walk = (node: TemplateNode, level: number, parent: TemplateNode | null) => {
      if (rows.length >= TARGET_BOM_ROWS) return;

      const itemNo = resolveCode(node);
      const parentItemNo = parent ? resolveCode(parent) : 'ET-09057';
      const parentItemNm = parent ? parent.name : '제빙도어';

      rows.push({
        id: `bom-${currentProduct}-${rows.length}`,
        level,
        itemNo,
        itemNm: node.name,
        // 설계/구매 BOM 번호는 품번 기준으로 안정적인 값을 만든다
        designBomNo: 100_000 + ((currentProduct * 977 + level * 131 + node.code.length * 17) % 600_000),
        purchaseBomNo: 1 + ((currentProduct + level + node.code.length) % 8),
        pjtCode: PJT_CODE,
        productNo: productCode,
        productNm,
        parentItemNo,
        parentItemNm,
        spec: node.spec,
        material: node.material,
        unit: node.unit,
        processGb: pickBy(PROCESS_GBS, node.code),
        orderGb: pickBy(ORDER_GBS, node.code + node.name),
        vendor: resolveVendor(itemNo),
        buyer: pickBy(BUYERS, node.code + 'b'),
        materialManager: pickBy(MATERIAL_MANAGERS, node.code + 'm'),
      });

      node.children?.forEach(child => walk(child, level + 1, node));
    };

    walk(BOM_TEMPLATE, 0, null);
    productIndex += 1;
  }

  return rows.slice(0, TARGET_BOM_ROWS);
};

export const DUMMY_BOM_DATASET: BomDataset = {
  baseDate: BOM_BASE_DATE,
  rows: buildBomRows(),
};

/** BOM 필터 셀렉트에 쓰는 제품번호 목록 */
export const DUMMY_PRODUCT_OPTIONS = Array.from(
  new Set(DUMMY_BOM_DATASET.rows.filter(row => row.level === 0).map(row => row.productNo)),
);

/* ───────────────────────── 발주대상리스트 ───────────────────────── */

/** 적용 생산계획 선택 옵션 (생산계획 화면의 리비전과 같은 성격) */
export const DUMMY_PLAN_REVISION_OPTIONS: PlanRevisionOption[] = [
  { id: 'plan-rev-03', label: 'Rev.03 (2026.08.14 적용)' },
  { id: 'plan-rev-02', label: 'Rev.02 (2026.08.12 적용)' },
  { id: 'plan-rev-01', label: 'Rev.01 (2026.08.05 적용)' },
];

/** 발주대상 목표 품목수 */
const TARGET_ORDER_ITEMS = 145;

/**
 * BOM 품목 풀에서 발주대상 목록을 만든다.
 * 실제로는 생산계획 소요량 × BOM 전개 결과에서 산출되지만,
 * 목업에서는 품번별로 안정적인 수치를 생성한다.
 */
export const buildOrderPlanDataset = (revisionId: string, planDate: string): OrderPlanDataset => {
  // 리비전 id 는 길이가 같은 경우가 많으므로 문자열 내용을 해시해 시드를 만든다
  const random = createSeededRandom(
    9_001 + hashString(revisionId) * 31 + (Number(planDate.replace(/-/g, '')) % 100_003),
  );

  const days = buildDayRange(planDate, ORDER_SCHEDULE_DAY_COUNT);

  // 품번 오름차순으로 고유 품목을 모은다 (화면 정렬과 동일)
  const uniqueItems = [...new Map(DUMMY_BOM_DATASET.rows.map(row => [row.itemNo, row])).values()]
    .sort((a, b) => a.itemNo.localeCompare(b.itemNo))
    .slice(0, TARGET_ORDER_ITEMS);

  const rows: OrderTargetRow[] = uniqueItems.map((item, index) => {
    const roll = random();
    // 대부분 발주 대상이고 일부는 해당 없음
    const orderNeed: OrderNeed = roll < 0.34 ? 'urgent' : roll < 0.985 ? 'required' : 'none';

    // 총소요량·안전재고는 일부 품목에서 미집계 상태(null)로 둔다
    const hasRequired = random() > 0.12;
    const hasSafety = random() > 0.1;
    const totalRequired = hasRequired ? 2 + Math.floor(random() * 1_700) : null;
    const safetyStock = hasSafety ? 1 + Math.floor(random() * 190) : null;

    const schedule: Record<string, number> = {};
    if (orderNeed !== 'none' && totalRequired) {
      // 발주예정 수량은 1~2개 일자에만 배정한다
      const slots = random() > 0.55 ? 2 : 1;
      for (let slot = 0; slot < slots; slot += 1) {
        const day = days[Math.floor(random() * days.length)];
        if (!day || day.isWeekend) continue;
        schedule[day.date] = 40 + Math.floor(random() * 120);
      }
    }

    return {
      id: `order-${item.itemNo}-${index}`,
      vendorCode: `V${String(1000 + (index % VENDORS.length) * 7).slice(0, 4)}`,
      vendorNm: pickBy(VENDORS, item.itemNo),
      pjtCode: PJT_CODE,
      itemNo: item.itemNo,
      itemNm: item.itemNm,
      unit: item.unit,
      totalRequired,
      leadTimeDays: 7 + Math.floor(random() * 38),
      safetyStock,
      orderNeed,
      note: '',
      schedule,
    };
  });

  return { revisionId, planDate, days, rows };
};

export const DUMMY_ORDER_PLAN_DATASET = buildOrderPlanDataset(
  DUMMY_PLAN_REVISION_OPTIONS[0].id,
  DEFAULT_ORDER_PLAN_DATE,
);
