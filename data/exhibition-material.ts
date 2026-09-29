import type { MaterialListItem, VehicleEntryExitItem, VehicleSlotDetail } from '@/types/material-monitoring';
import type { WearableApiEntry } from '@/types/types';
import { addDays, toDateKey } from '@/utils/date';

const VENDORS = ['데모정밀', '데모산업', '데모테크', '데모정공', '데모소재', '데모케미컬'];
const PARTS = [
  ['ADC72987140', 'DOOR ASSY-FREEZER', '제빙도어'],
  ['MDS62111103', 'GASKET, DOOR', '제빙도어'],
  ['MCK69894901', 'PILLAR ASSY', 'PILLAR'],
  ['4774JQ0200', 'HINGE ASSY-UP', 'HINGE'],
  ['MJS65374301', 'BUCKET ASSY', 'BUCKET'],
  ['MCW63465601', 'DOOR LINER', '소형냉장고'],
] as const;

/** 날짜를 오늘 기준으로 생성해 전시 기간에도 일/주/월 필터가 계속 동작한다. */
export function createExhibitionMaterials(dayCount = 1): MaterialListItem[] {
  const today = new Date();
  return Array.from({ length: dayCount * 18 }, (_, index) => {
    const day = Math.floor(index / 18);
    const slot = index % 18;
    const date = toDateKey(addDays(today, -day));
    const [code, name, project] = PARTS[slot % PARTS.length];
    const done = slot % 5 < 3;
    return {
      PrjGubun: '양산', PrjCode: `ET-0905${7 + slot % 3}`, PrjName: project,
      NmCustm: VENDORS[slot % VENDORS.length],
      InvoiceNo: `INV-${date.replaceAll('-', '')}-${String(slot + 1).padStart(3, '0')}`,
      CdGItem: code, NmGItem: name,
      InspConf: done ? 'Y' : 'N', QmConf: done ? 'Y' : 'N',
      NmInspGB: slot % 3 === 0 ? '정밀검사' : '수입검사',
      PurInDate: `${date} ${String(8 + Math.floor(slot / 3)).padStart(2, '0')}:${String((slot * 7) % 60).padStart(2, '0')}:00`,
      InQty: 120 + slot * 30, TInQty: 120 + slot * 30,
      LogSeq: `${date}-${slot}`, TabletConf: !done && slot % 2 === 0 ? 'Y' : 'N',
    };
  });
}

const enteredAt = new Date(Date.now() - 27 * 60_000).toISOString();
export function createExhibitionVehicle(): VehicleSlotDetail {
  return {
    slot_id: 1, PLATE: 'DEMO 2026', FILENAME: 'truck-image.png', FILEPATH: '/truck-image.png',
    entry_time: enteredAt, exit_time: null,
  };
}
export function createExhibitionVehicleEntries(): VehicleEntryExitItem[] {
  return VENDORS.slice(0, 5).map((vendor, index) => {
    const minutes = 12 + index * 14;
    const entered = new Date(Date.now() - minutes * 60_000);
    return {
      INOUTCARID: `EXHIBITION-CAR-${index + 1}`, CARNO: `DEMO ${2026 + index}`,
      INDT: `${toDateKey(entered)} ${entered.toTimeString().slice(0, 8)}`,
      CUSTNM: vendor, STAYTIME: `${Math.floor(minutes / 60)}시간 ${minutes % 60}분`,
    };
  });
}
export function createExhibitionInvoice(): WearableApiEntry[] {
  return createExhibitionMaterials().slice(0, 4).map(item => ({
    ...item, CdGItem: item.CdGItem!, InQty: Number(item.InQty), TInQty: Number(item.TInQty),
    QmConf: item.QmConf!, DtPurIn: item.PurInDate,
  }));
}
