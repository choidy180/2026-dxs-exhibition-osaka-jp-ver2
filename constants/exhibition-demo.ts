/** 전시 순서와 조작을 화면 문구·번역에 의존하지 않는 명시적인 대상으로 정의한다. */
export const DEMO_TIMING = {
  button: 3_000,
  focus: 5_000,
  intro: 10_000,
  readyTimeout: 15_000,
  settle: 500,
} as const;

export type DemoStep = {
  target: string;
  action: 'focus' | 'click';
  duration: number;
  /** 모달은 관람 후, 중단 또는 오류 시에도 반드시 닫는다. */
  close?: string;
  /** 클릭 후 포커스를 실제 결과 영역으로 옮긴다. */
  result?: string;
};
export type DemoPage = {
  path: string;
  steps: readonly DemoStep[];
  /** 안내를 가리는 확인 창이 있을 때만 먼저 닫는다. */
  dismissBeforeIntro?: readonly string[];
};

const focus = (target: string): DemoStep => ({ target, action: 'focus', duration: DEMO_TIMING.focus });
const click = (target: string, result?: string, close?: string): DemoStep => ({
  target, action: 'click', duration: close ? DEMO_TIMING.focus : DEMO_TIMING.button, result, close,
});
const quality = (): DemoStep[] => [
  focus('inspection-result'), click('inspection-ng'), click('inspection-ok'), click('inspection-all'),
  click('inspection-history', 'inspection-history-panel', 'inspection-history-close'),
];
const visualInspection = (): DemoStep[] => [
  focus('inspection-result'), focus('inspection-image'),
  click('inspection-logs', 'inspection-log-panel', 'inspection-log-close'),
];

/** 자동 시연 대상. CCTV·모바일 카메라 전용·백업·개발 별칭은 제외한다. */
export const EXHIBITION_DEMO_PAGES: readonly DemoPage[] = [
  { path: '/master-dashboard', steps: ['01', '02', '03', '04', '05', '06'].map(id => focus(`dashboard-${id}`)) },
  { path: '/material/inbound-inspection', steps: [focus('inbound-vehicle'), focus('inbound-pending'), focus('inbound-cameras'), click('inbound-expand', 'inbound-camera-panel', 'inbound-camera-close')] },
  { path: '/material/inbound-inspection/status', steps: [focus('inbound-metrics'), click('inbound-period-week'), click('inbound-period-month'), click('inbound-period-day'), focus('inbound-grid')] },
  { path: '/material/warehouse', steps: [focus('material-inventory'), focus('material-map')] },
  { path: '/production/smart-factory-dashboard', steps: [focus('stock-cameras'), focus('stock-production'), click('stock-expand', 'stock-panel', 'stock-close')] },
  { path: '/production/glass-gap-check', steps: quality() },
  { path: '/production/leak-detection', steps: quality() },
  { path: '/production/gasket-check', steps: visualInspection() },
  { path: '/production/film-attachment', steps: visualInspection() },
  { path: '/production/line-monitoring', dismissBeforeIntro: ['equipment-alert-confirm'], steps: [focus('equipment-viewer'), click('equipment-layout-modelOnly'), click('equipment-layout-detailRight'), click('equipment-layout-balanced'), focus('equipment-viewer')] },
  { path: '/production/foaming-inspection', steps: [focus('foaming-metrics'), click('foaming-expand', 'foaming-panel', 'foaming-close')] },
  { path: '/production/takttime-dashboard', steps: [focus('takt-dashboard'), click('takt-view-2'), click('takt-view-3'), click('takt-view-1'), click('takt-logs', 'takt-log-panel', 'takt-log-close')] },
  { path: '/production/pysical-ai', steps: [focus('safety-video'), focus('safety-logs')] },
  { path: '/transport/realtime-status', steps: [focus('transport-map'), click('transport-2d'), click('transport-3d'), focus('transport-stats')] },
  { path: '/transport/warehouse-management', steps: [focus('product-map'), click('product-zoom-in'), click('product-zoom-out'), focus('product-stats')] },
  { path: '/transport/shipment', steps: [focus('shipment-metrics'), click('shipment-daily'), click('shipment-weekly'), focus('shipment-chart')] },
  { path: '/lab/production-plan', steps: [focus('plan-metrics'), focus('plan-upload'), focus('plan-demo'), focus('plan-grid'), focus('plan-download'), focus('plan-save')] },
  { path: '/lab/mes-bom-list', steps: [click('bom-query', 'bom-grid'), focus('bom-metrics'), focus('bom-grid'), focus('bom-download')] },
  { path: '/lab/order-plan', steps: [click('order-recalculate', 'order-grid'), focus('order-metrics'), click('order-query'), focus('order-grid'), focus('order-download'), focus('order-send')] },
];

export function getNextDemoPage(index: number): number {
  return (index + 1) % EXHIBITION_DEMO_PAGES.length;
}
