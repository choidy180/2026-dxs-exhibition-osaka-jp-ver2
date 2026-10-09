import type { Locale } from '@/lib/i18n/translate';
import { ADVISOR_SCENARIOS } from '@/data/advisor-knowledge';
import { getAdvisorSuggestion } from '@/data/demo-advisor';

export function getAdvisorExamples(locale: Locale) {
  const featured = ['delivery-destination', 'material-shortage', 'planned-duration', 'purchase-supplier'];
  return featured.map(id => getAdvisorSuggestion(ADVISOR_SCENARIOS.find(scenario => scenario.id === id)!, locale));
}

export const ADVISOR_COPY = {
  ko: {
    open: 'AI Advisor 열기', close: 'AI Advisor 닫기', title: 'AI Advisor', subtitle: '제조 업무를 함께 살펴보는 AI Advisor',
    launcher: '제조 업무에 질문하기', newChat: '새 대화', catalog: '질문 목록', history: '이번 대화', noHistory: '질문을 보내면 이곳에서 다시 찾아볼 수 있습니다.',
    scopeTitle: '어떤 업무가 궁금하세요?', scope: '주제를 고르거나 “납품처”, “재고”처럼 짧게 물어보세요. 질문 목록에서 선택하고 필요한 조건은 대화로 이어갈 수 있습니다.',
    storageTitle: '대화 보관', storage: '이 화면에서 대화가 유지됩니다. 새 대화, 새로고침 또는 언어 변경 시 초기화됩니다.',
    checking: '대화를 준비하고 있어요…', sourceDate: '예시 기준일', sourceNote: '제조 업무 데모', retryDate: '기준일 재시도',
    welcome: '어떤 제조 업무가 궁금하신가요?', welcomeText: '“납품처”처럼 주제만 입력해도 좋아요. 관련 질문을 고르거나 자유롭게 질문해 보세요. 필요한 조건은 제가 차례로 여쭤볼게요.',
    guide: '전체 제조 업무 질문 둘러보기', guideHint: '질문을 고르면 바로 조회하거나 필요한 조건을 차례로 확인합니다. 코드·수량·인원을 나누어 입력해도 됩니다.',
    context: '현재 대화 조건', changeTopic: '주제 바꾸기', menuQuery: '질문 목록', quantityLabel: '수량', workersLabel: '인원',
    selectionHint: '버튼·번호로 선택하거나 직접 질문해도 됩니다.', demoResult: '데모 데이터', calculated: '시뮬레이션',
    productHint: '제품 코드만 입력해도 됩니다. 예: ADC30068403', materialHint: '자재 코드·자재명 또는 목록 번호를 입력해 주세요.', quantityHint: '수량을 입력해 주세요. 예: 300개 또는 300', workersHint: '작업 인원을 입력해 주세요. 예: 8명 또는 8', dateHint: '예: 8월 27일 또는 2026-08-27',
    complete: '바로 확인', partial: '핵심 요약', unavailable: '관련 안내',
    suggested: '이어서 질문해 보세요', latest: '최신 답변', you: '나',
    question: 'AI Advisor 질문', placeholder: '납품처, 재고, 생산 시간… 편하게 물어보세요.', send: '전송', retry: '다시 시도',
    keyboard: 'Enter 전송 · Shift+Enter 줄바꿈', tooLong: '질문은 2,000자 이내로 입력해 주세요.', empty: '관련된 다른 항목도 함께 살펴볼까요? 아래 질문을 선택해 주세요.',
    waiting: '답변을 정리하고 있어요…', cancel: '요청 취소', cancelled: '응답 대기를 취소했습니다. 다시 시도할 수 있습니다.', failure: '답변을 불러오지 못했습니다. 다시 시도해 주세요.',
  },
  ja: {
    open: 'AI Advisorを開く', close: 'AI Advisorを閉じる', title: 'AI Advisor', subtitle: '製造業務を一緒に確認するAI Advisor',
    launcher: '製造業務について質問', newChat: '新しい会話', catalog: '質問一覧', history: '今回の会話', noHistory: '送信した質問をここから確認できます。',
    scopeTitle: 'どの業務が気になりますか', scope: 'テーマを選ぶか、「納品先」「在庫」と短く質問してください。質問一覧から選び、必要な条件を会話で確認できます。',
    storageTitle: '会話の保存', storage: 'この画面では会話を保持します。新しい会話、再読み込み、言語変更でリセットします。',
    checking: '会話の準備をしています…', sourceDate: 'デモ例の基準日', sourceNote: '製造業務デモ', retryDate: '基準日を再確認',
    welcome: '製造業務について質問してみましょう', welcomeText: '「納品先」とテーマだけ入力しても大丈夫です。関連する質問を選ぶか、自由に質問してください。必要な条件は順番にお聞きします。',
    guide: '製造業務のすべての質問を見る', guideHint: '質問を選ぶと、すぐに確認するか、必要な条件を順番にお聞きします。コード・数量・人数は分けて入力できます。',
    context: '現在の会話の条件', changeTopic: 'テーマを変更', menuQuery: '質問一覧', quantityLabel: '数量', workersLabel: '人数',
    selectionHint: 'ボタン・番号で選ぶか、直接質問できます。', demoResult: 'デモデータ', calculated: 'シミュレーション',
    productHint: '製品コードだけでも入力できます。例：ADC30068403', materialHint: '資材コード・資材名、または一覧の番号を入力してください。', quantityHint: '数量を入力してください。例：300個 または 300', workersHint: '作業人数を入力してください。例：8人 または 8', dateHint: '例：8月27日 または 2026-08-27',
    complete: 'すぐに確認', partial: 'ポイント', unavailable: '関連のご案内',
    suggested: '続けて質問してみましょう', latest: '最新の回答', you: '自分',
    question: 'AI Advisorへの質問', placeholder: '納品先、在庫、生産時間…気軽に質問してください。', send: '送信', retry: '再試行',
    keyboard: 'Enterで送信・Shift+Enterで改行', tooLong: '質問は2,000文字以内で入力してください。', empty: '関連する別の項目も見てみませんか。下の質問をお選びください。',
    waiting: '回答をまとめています…', cancel: 'リクエストをキャンセル', cancelled: '回答待ちをキャンセルしました。再試行できます。', failure: '回答を読み込めませんでした。再試行してください。',
  },
  en: {
    open: 'Open AI Advisor', close: 'Close AI Advisor', title: 'AI Advisor', subtitle: 'Explore manufacturing operations with AI Advisor',
    launcher: 'Ask about manufacturing', newChat: 'New conversation', catalog: 'Questions', history: 'This conversation', noHistory: 'Your questions will appear here.',
    scopeTitle: 'Which topic interests you?', scope: 'Choose a topic or type a short question such as “delivery” or “inventory”. Select a question and provide the conditions as we go.',
    storageTitle: 'Conversation storage', storage: 'This screen keeps the conversation until you start a new one, reload, or change language.',
    checking: 'Getting the conversation ready…', sourceDate: 'Example reference date', sourceNote: 'Manufacturing demo', retryDate: 'Retry reference date',
    welcome: 'Ask about manufacturing operations', welcomeText: 'Start with a short topic such as “delivery”. Choose a related question or ask directly. I will ask for the conditions one at a time.',
    guide: 'Explore all manufacturing questions', guideHint: 'Choose a question to see an answer or provide the conditions step by step. Codes, quantities and worker counts can be entered separately.',
    context: 'Current conversation conditions', changeTopic: 'Change topic', menuQuery: 'menu', quantityLabel: 'Quantity', workersLabel: 'Workers',
    selectionHint: 'Select a button, enter its number, or ask directly.', demoResult: 'Demo data', calculated: 'Simulation',
    productHint: 'Enter a product code, e.g. ADC30068403', materialHint: 'Enter a material code, name or option number.', quantityHint: 'Enter a quantity, e.g. 300 units or 300', workersHint: 'Enter a worker count, e.g. 8 workers or 8', dateHint: 'Example: 2026-08-27',
    complete: 'Quick answer', partial: 'Key figures', unavailable: 'Related guidance',
    suggested: 'Try another question', latest: 'Latest answer', you: 'You',
    question: 'Question for AI Advisor', placeholder: 'Delivery, inventory, production time… ask a question.', send: 'Send', retry: 'Retry',
    keyboard: 'Enter to send · Shift+Enter for a new line', tooLong: 'Keep your question within 2,000 characters.', empty: 'Shall we explore a related topic? Select a question below.',
    waiting: 'Putting your answer together…', cancel: 'Cancel request', cancelled: 'Waiting cancelled. You can retry.', failure: 'Could not load the answer. Please retry.',
  },
} satisfies Record<Locale, Record<string, string>>;
