/** 전시용 로컬 시나리오를 바로 체험하는 시작 질문. */
export const ADVISOR_EXAMPLES = [
  {
    label: '자재 재고 현황',
    query: '주요 자재의 현재 재고와 예정 소요량, 가용 재고를 알려주세요.',
  },
  {
    label: '검사 품질 요약',
    query: '검사 수량과 합격률을 비교하고 품질 관리 시 확인할 내용을 알려주세요.',
  },
  {
    label: '출하 및 운송 현황',
    query: '현재 출하 차량의 운송 상태와 도착 예정 시간을 알려주세요.',
  },
] as const;

export const ADVISOR_FOLLOWUP = '현재 생산 목표와 달성률을 요약해 주세요.';
