export interface VehicleSlotDetail {
  slot_id: number;
  PLATE: string | null;
  FILENAME: string | null;
  FILEPATH: string;
  entry_time: string | null;
  exit_time: string | null;
}

export interface VehicleApiResponse {
  [key: string]: {
    total: number;
    slots_detail: VehicleSlotDetail[];
  };
}

export interface VehicleEntryExitItem {
  INOUTCARID: string;
  CARNO: string;
  INDT: string;
  CUSTNM: string | null;
  STAYTIME: string;
}

export interface MaterialListItem {
  PrjGubun: string;
  PrjCode: string;
  PrjName: string;
  NmCustm: string;
  InvoiceNo: string;
  NmGItem: string;
  InspConf: string;
  NmInspGB: string;
  PurInDate: string;
  CdGItem?: string;
  InQty?: number | string;
  TInQty?: number | string;
  QmConf?: string;
  LogSeq?: string;
  [key: string]: unknown;
}

export interface MaterialStats {
  total: number;
  done: number;
  percent: number;
}
