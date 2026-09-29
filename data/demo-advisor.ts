import type { AdvisorChatResponse, AdvisorMetadata } from '@/types/ai-advisor';
import { getLocale } from '@/lib/i18n/translate';

export function createDemoAdvisorMetadata(): AdvisorMetadata {
  const today = new Date().toLocaleDateString('sv-SE');
  const end = new Date();
  end.setDate(end.getDate() + 30);
  return { as_of_date: today, snapshot_date: today, forecast_end_date: end.toLocaleDateString('sv-SE') };
}

/** 전시회 상담은 외부 모델 없이 시나리오별 데이터와 설명을 제공한다. */
export function createDemoAdvisorReply(query: string): AdvisorChatResponse {
  const inventory = /재고|자재|부족|소요|inventory|stock|material|requirement|在庫|資材|不足|所要|必要/i.test(query);
  const quality = /품질|불량|검사|quality|defect|inspection|品質|不良|検査/i.test(query);
  const transport = /출하|운송|배송|shipment|transport|delivery|出荷|輸送|配送/i.test(query);
  const rows = inventory
    ? [['FRAME-A', '2,450', '1,800', '650'], ['GASKET-B', '3,120', '2,400', '720'], ['GLASS-C', '1,680', '1,250', '430']]
    : quality ? [['GLASS', '480', '477', '99.4%'], ['GASKET', '520', '517', '99.4%'], ['FILM', '460', '459', '99.8%']]
    : transport ? [['GMT-101', '부산 → 창원', '운행중', '12분'], ['GMT-102', '창원 → 부산', '운행중', '24분'], ['GMT-103', '부산', '출하완료', '-']]
    : [['A', '750', '684', '91.2%'], ['B', '680', '632', '92.9%'], ['C', '720', '658', '91.4%']];
  const columns = inventory ? ['품목', '현재고', '예정 소요량', '가용 재고']
    : quality ? ['검사', '검사수', '양품수', '합격률']
    : transport ? ['차량', '경로', '상태', '도착예정'] : ['라인', '목표', '생산수량', '달성률'];
  const koreanAnswer = inventory
    ? '전시회 데모 데이터 기준, 주요 자재의 가용 재고는 충분합니다. GASKET-B의 다음 입고 일정을 확인하면 안정적인 생산을 유지할 수 있습니다.'
    : quality ? '전시회 데모 데이터 기준, 검사 합격률은 99% 이상입니다. 유리 틈새와 가스켓 검사 이력을 확인하고 불량 제품을 재검사하는 것을 권장합니다.'
    : transport ? '전시회 데모 데이터 기준, 차량 2대가 운행 중이며 1대가 출하를 완료했습니다. 운송관리 화면에서 위치와 도착 예정 시간을 확인할 수 있습니다.'
    : '전시회 데모 데이터 기준, 전체 생산 달성률은 91.8%입니다. A라인의 작업시간과 자재 공급을 확인하면 계획 달성에 도움이 됩니다.';
  const locale = getLocale();
  const answer = locale === 'ko' ? koreanAnswer : locale === 'ja'
    ? inventory ? '展示会デモのデータでは、主要資材の在庫は十分です。GASKET-Bの次回入荷予定を確認すると、安定した生産を維持できます。'
      : quality ? '展示会デモの検査合格率は99%以上です。ガラス隙間とガスケットの検査履歴を確認し、不良品の再検査をお勧めします。'
      : transport ? '展示会デモでは、車両2台が運行中で、1台が出荷済みです。輸送管理画面で位置と到着予定時刻を確認できます。'
      : '展示会デモの全体生産達成率は91.8%です。Aラインの作業時間と資材供給を確認すると、計画達成に役立ちます。'
    : inventory ? 'In this exhibition demo, key materials have sufficient available stock. Check the next GASKET-B delivery to maintain stable production.'
      : quality ? 'The exhibition demo shows an inspection pass rate above 99%. Review glass-gap and gasket inspection history and reinspect rejected products.'
      : transport ? 'In this exhibition demo, two vehicles are in transit and one shipment is complete. The transport screen shows vehicle positions and estimated arrivals.'
      : 'The exhibition demo shows overall production attainment of 91.8%. Review line A cycle times and material supply to support the production target.';
  return { answer, session_id: null, status: 'success', table: { columns, rows, truncated: false, summary: {} } };
}
