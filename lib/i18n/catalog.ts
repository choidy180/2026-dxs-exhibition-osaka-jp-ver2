import { coreCatalog } from './catalog-core';
import { inspectionCatalog } from './catalog-inspection';
import { extraCatalog } from './catalog-extra';

type Translation = { ja: string; en: string };
const entries = (source: string): Record<string, Translation> => Object.fromEntries(
  source.trim().split('\n').map(line => {
    const [ko, ja, en] = line.split('|');
    return [ko, { ja, en }];
  }),
);

/** Exact, locally authored UI phrases. Korean remains the canonical source language. */
const sourceCatalog = { ...entries(`
고모텍 AI 관제센터|GOMOTEC AI 管制センター|GOMOTEC AI Control Center
언어 선택|言語を選択|Choose language
표시 언어|表示言語|Display language
관제센터|管制センター|Control center
전체 운영 현황|運用状況の概要|Operations overview
자재관리|資材管理|Materials
입고, 창고, 공정 재고|入荷・倉庫・工程在庫|Receiving, warehouse and work in progress
입고검사|受入検査|Receiving inspection
입고검사현황|受入検査状況|Inspection status
자재검수|資材検収|Material verification
자재창고|資材倉庫|Material warehouse
공정재고|工程在庫|Process inventory
공정품질|工程品質|Quality
비전 검사와 품질 판정|画像検査と品質判定|Vision inspection and quality assessment
유리간격검사|ガラス隙間検査|Glass gap inspection
발포누수검사|発泡漏れ検査|Foam leak inspection
가스켓 이상 감지|ガスケット異常検知|Gasket inspection
필름부착확인|フィルム貼付確認|Film attachment
공정설비|工程設備|Equipment
설비 상태와 예지보전|設備状態と予知保全|Equipment health and predictive maintenance
발포 설비 예측|発泡設備予測|Foaming prediction
발포설비 예지보전|発泡設備予知保全|Predictive maintenance
생산관리|生産管理|Production
생산 시간과 목표 관리|生産時間と目標の管理|Production time and targets
작업시간관리|作業時間管理|Cycle time
작업관리|作業管理|Work
작업자 보조와 자동화|作業支援と自動化|Operator support and automation
출하관리|出荷管理|Shipping
운송, 제품창고, 출하 처리|輸送・製品倉庫・出荷処理|Transport, finished goods and dispatch
운송관리|輸送管理|Transport
제품창고|製品倉庫|Product warehouse
출하처리|出荷処理|Dispatch
실험실|ラボ|Lab
개발 진행 중 화면 UI 확인|展示デモ画面を確認|Explore demonstration screens
생산계획|生産計画|Production plan
발주대상리스트|発注対象リスト|Order requirements
상황 모니터링|状況モニタリング|CCTV monitoring
자재 입고 품질 확인|入荷資材の品質確認|Verify incoming material quality
일·주·월·연간 검수 현황|日・週・月・年別の検収状況|Daily, weekly, monthly and annual inspections
모바일 QR 카메라 검수|モバイルQRカメラ検収|Mobile QR camera verification
창고 재고와 위치 관리|倉庫在庫とロケーション管理|Warehouse stock and location management
라인 투입 전 재고 현황|ライン投入前の在庫状況|Inventory before line input
Glass gap 실시간 검사|ガラス隙間のリアルタイム検査|Real-time glass gap inspection
누수 및 기포 이상 감지|漏れ・気泡の異常検知|Detect leakage and bubble defects
가스켓 결함 모니터링|ガスケット不良モニタリング|Monitor gasket defects
필름 부착 상태 판정|フィルム貼付状態の判定|Assess film attachment
라인 가동 상태 모니터링|ライン稼働状況モニタリング|Monitor line operation
설비 이상 징후 추적|設備異常の兆候を追跡|Track signs of equipment failure
택타임과 생산 흐름 분석|タクトタイムと生産フロー分析|Analyze takt time and production flow
현장 작업 AI 지원|現場作業のAI支援|AI support for operators
차량 및 이동 현황|車両と移動の状況|Vehicle and transit status
완제품 재고 관리|完成品在庫管理|Finished goods inventory
출하 지시와 처리 현황|出荷指示と処理状況|Shipping instructions and progress
개발 중 · 생산계획 업로드와 리비전 관리|生産計画の取込とリビジョン管理|Production plan import and revision management
개발 중 · BOM 정전개 전체 리스트|BOM正展開の全リスト|Full exploded bill of materials
개발 중 · 발주 소요량 산출|発注所要量の算出|Calculate purchasing requirements
개발 중 · 동별 CCTV 현황 확인|建物別CCTV状況の確認|CCTV overview by building
유리간격검사 NG 발생|ガラス隙間検査でNG発生|Glass gap inspection NG
A2 우측 상단 카메라에서 기준값 초과 항목이 감지되었습니다.|A2右上カメラで基準値を超える項目を検知しました。|The A2 upper-right camera detected an out-of-tolerance measurement.
입고검사 데이터 동기화|受入検査データ同期|Receiving data synchronized
금일 입고검사 18건이 ERP 데이터와 정상 동기화되었습니다.|本日の受入検査18件を展示データに反映しました。|Today's 18 receiving inspections were reflected in the demo data.
발포 설비 점검 권장|発泡設備の点検を推奨|Foaming equipment check advised
온도 편차가 3회 연속 발생했습니다. 예방 점검을 권장합니다.|温度偏差が3回連続で発生しました。予防点検を推奨します。|Temperature deviation occurred three times in a row. A preventive check is recommended.
출하 차량 도착 예정|出荷車両が到着予定|Shipping vehicle due to arrive
GMT-02 차량이 14:30 도크에 도착 예정입니다.|GMT-02は14:30にドックへ到着予定です。|GMT-02 is due at the dock at 14:30.
메인 네비게이션|メインナビゲーション|Main navigation
대시보드|ダッシュボード|Dashboard
메뉴 검색|メニュー検索|Search menu
알림 열기|通知を開く|Open notifications
사이드바 닫기|サイドバーを閉じる|Close sidebar
원하는 화면을 빠르게 찾아 이동합니다.|画面を検索して移動します。|Find and open a screen.
하위 메뉴 닫기|サブメニューを閉じる|Close submenu
메뉴명, 업무명, 경로 검색|メニュー名・業務名・パスを検索|Search menu, task or path
사이드바 메뉴 검색|サイドバーメニューを検索|Search sidebar menu
검색어 지우기|検索語をクリア|Clear search
검색 결과가 없습니다.|検索結果がありません。|No results found.
다른 메뉴명이나 업무 키워드를 입력해 주세요.|別のメニュー名やキーワードを入力してください。|Try another menu name or keyword.
알림 닫기|通知を閉じる|Close notifications
데이터 조회 중...|データを読み込み中...|Loading data...
데이터를 불러오지 못했습니다.|データを読み込めませんでした。|Unable to load data.
항목이 없습니다.|項目がありません。|No items available.
선택할 항목이 없습니다.|選択できる項目がありません。|No options available.
날짜를 선택하세요|日付を選択してください|Select a date
날짜 선택|日付を選択|Select date
다음 달|翌月|Next month
이전 달|前月|Previous month
현재 이미지를 불러올 수 없습니다.|現在、画像を表示できません。|The image is currently unavailable.
이미지 데이터가 아직 준비되지 않았습니다.|画像データを準備しています。|Image data is not ready yet.
이미지를 클릭하면 크게 볼 수 있습니다.|画像をクリックすると拡大表示します。|Click the image to enlarge it.
이미지 닫기|画像を閉じる|Close image
이미지 대기|画像待機中|Waiting for image
검사 로그를 선택해주세요|検査ログを選択してください|Select an inspection log
이전 검사기록 조회|過去の検査記録を表示|View inspection history
이전 검사기록 닫기|検査履歴を閉じる|Close inspection history
해당 날짜의 기록이 없습니다.|この日付の記録がありません。|No records for this date.
금일 검사 데이터가 없습니다|本日の検査データがありません|No inspection data today
생산 라인이 가동 중인지 확인하거나,|生産ラインの稼働状況をご確認ください。|Check whether the production line is running,
잠시 후 다시 시도해 주세요.|しばらくしてから再試行してください。|Please try again shortly.
잠시 후 다시 시도해주세요.|しばらくしてから再試行してください。|Please try again shortly.
검사 화면 TYPE 선택|検査画面タイプを選択|Select inspection layout
TYPE 선택 닫기|タイプ選択を閉じる|Close layout selection
선택한 타입에 맞춰 메인 검사 화면의 배치가 바로 변경됩니다.|選択したタイプに合わせて検査画面が切り替わります。|The inspection layout changes immediately to the selected type.
좌측 목록에서 기록을 선택하면 판정 정보와 모서리별 검사 이미지를 확인할 수 있습니다.|左の一覧から記録を選ぶと、判定と各コーナーの検査画像を確認できます。|Select a record on the left to view its result and corner inspection images.
경고음을 켜시겠습니까?|警告音を有効にしますか？|Enable warning sounds?
불량 알림 권한 요청|不良通知の許可|Defect notification permission
네, 경고음 켜기|はい、警告音を有効にする|Yes, enable warning sounds
불량 경고음 토글|不良警告音を切り替える|Toggle defect warning sounds
전 항목 정상 판정 완료.|全項目が正常と判定されました。|All checks passed.
전 항목 정상 판정 완료. 특이사항 없음.|全項目が正常です。特記事項はありません。|All checks passed. No issues found.
좌측 상단(A1) 모서리 들뜸 현상 감지됨. 재검사 요망.|左上（A1）コーナーの浮きを検知しました。再検査してください。|Lifting detected at the upper-left corner (A1). Reinspection required.
우측 하단(A4) 틈새 불량 (오차 범위 초과).|右下（A4）の隙間異常（許容範囲外）。|Gap defect at the lower-right corner (A4), outside tolerance.
부착 불량이 감지되었습니다.|貼付不良を検知しました。|An attachment defect was detected.
유격 불량이 감지|隙間異常を検知|Gap defect detected
관리 범위 내 안정적으로 운영중|管理範囲内で安定稼働中|Operating steadily within limits
관리 범위 이탈 발생|管理範囲からの逸脱が発生|Operating limit exceeded
새로운 배차 정보가 수신되면 자동으로 갱신됩니다.|新しい配車情報で自動更新します。|Updates automatically when dispatch information changes.
안녕하세요. 무엇을 도와드릴까요?|こんにちは。どのようなご用件でしょうか？|Hello. How can I help you?
메인 화면으로 이동|メイン画面へ移動|Go to main screen
상단 우측 모서리 확대|右上コーナーを拡大|Enlarge upper-right corner
상단 좌측 모서리 확대|左上コーナーを拡大|Enlarge upper-left corner
하단 우측 모서리 확대|右下コーナーを拡大|Enlarge lower-right corner
하단 좌측 모서리 확대|左下コーナーを拡大|Enlarge lower-left corner
실시간 생산 및 적재 데이터|生産・積載データ|Live production and loading data
종합 적재 현황|積載状況の概要|Loading overview
불량 (NG)|不良（NG）|Defect (NG)
정상 (OK)|正常（OK）|Pass (OK)
오류 (Error)|エラー|Error
운행 중 (정상)|運行中（正常）|In transit (normal)
1건 이상|1件以上|At least 1
PC 환경에 최적화된|PC画面に最適化された|Optimized for desktop
서비스입니다|サービスです|experience
복잡한 공정 데이터와 실시간 관제 시스템은|工程データとリアルタイム監視は|Process data and real-time monitoring
넓은 PC 화면|大きなPC画面|a large desktop screen
에서 가장 완벽하게 경험하실 수 있습니다.|で快適にご利用いただけます。|provide the best experience.
고모텍 CCTV|GOMOTEC CCTV|GOMOTEC CCTV
스마트 팩토리 고도화|スマートファクトリーの高度化|Smart factory transformation
고모텍 본사|GOMOTEC本社|GOMOTEC HQ
고모텍 부산공장|GOMOTEC釜山工場|GOMOTEC Busan plant
고모텍 부산|GOMOTEC釜山|GOMOTEC Busan
GMT_부산|GMT_釜山|GMT_Busan
LG1_선진화|LG1_先進化|LG1_Advanced
신창원 물류센터|新昌原物流センター|Sinchangwon logistics center
신창원물류|新昌原物流|Sinchangwon Logistics
신창원|新昌原|Sinchangwon
성철사|ソンチョル社|Seongcheol
대일화학|デイル化学|Daeil Chemical
김철수|作業者A|Operator A
박민수|作業者B|Operator B
이영희|作業者C|Operator C
거래처 미등록|取引先未登録|Supplier not registered
업체 미지정|会社未指定|Company unspecified
가조립온도(℃)|仮組立温度（℃）|Pre-assembly temperature (℃)
가조립무게(g)|仮組立重量（g）|Pre-assembly weight (g)
온조#1 공급수압력|温調#1 給水圧力|Temperature unit #1 water pressure
온조#1 리턴온도|温調#1 戻り温度|Temperature unit #1 return temperature
온조#2 공급수압력|温調#2 給水圧力|Temperature unit #2 water pressure
온조#2 리턴온도|温調#2 戻り温度|Temperature unit #2 return temperature
온조#1공급수압력(kg/㎥)|温調#1 給水圧力（kg/㎥）|Unit #1 water pressure (kg/㎥)
온조#2공급수압력(kg/㎥)|温調#2 給水圧力（kg/㎥）|Unit #2 water pressure (kg/㎥)
온조#1리턴온도(℃)|温調#1 戻り温度（℃）|Unit #1 return temperature (℃)
온조#2리턴온도(℃)|温調#2 戻り温度（℃）|Unit #2 return temperature (℃)
유량 비율(P/R)|流量比率（P/R）|Flow ratio (P/R)
모델명 / 작업지시번호|モデル名／作業指示番号|Model / Work order
모델명 / WO|モデル名／WO|Model / WO
입고 검수 현황 대시보드|受入検収状況ダッシュボード|Receiving inspection dashboard
입고 검사 현황 대시보드|受入検査状況ダッシュボード|Receiving inspection dashboard
전시 모드|展示モード|Exhibition mode
로컬 전시 모드|ローカル展示モード|Local exhibition mode
데모 데이터|デモデータ|Demo data
전시용 샘플 데이터|展示用サンプルデータ|Exhibition sample data
로컬 데모|ローカルデモ|Local demo
선택된 데이터가 없습니다.|データが選択されていません。|No data selected.
데이터가 없습니다.|データがありません。|No data available.
조회 결과가 없습니다.|検索結果がありません。|No results found.
검색 결과가 없습니다|検索結果がありません|No results found
불러오는 중...|読み込み中...|Loading...
로딩 중...|読み込み中...|Loading...
연결 중...|接続中...|Connecting...
처리 중...|処理中...|Processing...
저장 중...|保存中...|Saving...
조회 중...|検索中...|Loading...
등록된 데이터가 없습니다.|登録されたデータがありません。|No data has been registered.
이미지를 불러오는 중...|画像を読み込み中...|Loading image...
선택한 기간의 데이터가 없습니다.|選択した期間のデータがありません。|No data for the selected period.
데이터를 불러오는 중입니다.|データを読み込んでいます。|Loading data.
전체보기 >|すべて表示 >|View all >
전체 보기 >|すべて表示 >|View all >
초기화|リセット|Reset
필터 초기화|フィルターをリセット|Reset filters
조회 조건 초기화|検索条件をリセット|Reset search
API 연결 후 사용할 수 있습니다|展示デモでご利用いただけます|Available in the exhibition demo
저장되었습니다.|保存しました。|Saved.
삭제되었습니다.|削除しました。|Deleted.
등록되었습니다.|登録しました。|Registered.
수정되었습니다.|更新しました。|Updated.
처리되었습니다.|処理しました。|Processed.
다운로드가 완료되었습니다.|ダウンロードが完了しました。|Download complete.
전체 화면|全画面表示|Full screen
전체화면|全画面表示|Full screen
전체화면 닫기|全画面表示を閉じる|Close full screen
전체 화면 닫기|全画面表示を閉じる|Close full screen
전체 로그 보기|全ログを表示|View all logs
전체 보기|すべて表示|View all
전체보기|すべて表示|View all
다시 연결|再接続|Reconnect
다시 조회|再読み込み|Reload
자세히 보기|詳細を表示|View details
상세 보기|詳細を表示|View details
상세 내용|詳細|Details
확인 필요|確認が必要|Needs review
연결 안 됨|未接続|Disconnected
검수완료|検収完了|Verified
검수대기|検収待ち|Awaiting verification
선별리퍼|選別・修理|Sort / rework
미검수|未検収|Not inspected
해당없음|該当なし|Not applicable
해당 없음|該当なし|Not applicable
검사완료|検査完了|Inspection complete
점검 완료|点検完了|Check complete
도착완료|到着済み|Arrived
도착 임박|まもなく到着|Arriving soon
운행 완료|運行完了|Trip complete
운행 중|運行中|In transit
이동 중|移動中|Moving
대기 중|待機中|Waiting
발주필요|発注が必要|Order required
미발주|未発注|Not ordered
미지정|未指定|Unspecified
미등록|未登録|Unregistered
비어있음|空き|Empty
연결됨|接続済み|Connected
방금 전|たった今|Just now
8분 전|8分前|8 minutes ago
22분 전|22分前|22 minutes ago
43분 전|43分前|43 minutes ago
검색...|検索...|Search...
사용:|使用：|Used:
여유:|空き：|Available:
입고수량|入荷数量|Received quantity
입고일시|入荷日時|Received at
입출고구분|入出庫区分|Movement type
송장번호|伝票番号|Invoice number
품목번호|品目番号|Item number
품목코드|品目コード|Item code
품목명|品目名|Item name
거래처명|取引先名|Supplier
대차번호|台車番号|Trolley number
작업지시서|作業指示書|Work order
지그번호|治具番号|Jig number
검사 수량|検査数量|Inspected quantity
검사 시간|検査時刻|Inspection time
검사 이미지|検査画像|Inspection image
메인 검사 이미지|メイン検査画像|Main inspection image
발생 건수|発生件数|Incident count
점유율|占有率|Occupancy
설비 상태|設備状態|Equipment status
우측 상단|右上|Upper right
우측 하단|右下|Lower right
좌측 상단|左上|Upper left
좌측 하단|左下|Lower left
전자부품|電子部品|Electronic parts
금속부품|金属部品|Metal parts
CKD납품|CKD納品|CKD delivery
총조립2라인|総組立2ライン|Final assembly line 2
발포라인|発泡ライン|Foaming line
라인B|ラインB|Line B
라인D|ラインD|Line D
고모텍|GOMOTEC|GOMOTEC
LG전자|LG電子|LG Electronics
부산|釜山|Busan
P액 압력|P液圧力|P-liquid pressure
R액 압력|R液圧力|R-liquid pressure
P액 탱크온도|P液タンク温度|P-liquid tank temperature
R액 탱크온도|R液タンク温度|R-liquid tank temperature
P액 헤드온도|P液ヘッド温度|P-liquid head temperature
R액 헤드온도|R液ヘッド温度|R-liquid head temperature
검사|検査|Inspection
정상|正常|Normal
불량|不良|Defect
대기|待機|Waiting
상온|常温|Ambient
재시도|再試行|Retry
전체|すべて|All
만차|満車|Full
주의|注意|Caution
상태|状態|Status
여유|空き|Available
혼잡|混雑|Busy
도착|到着|Arrived
수입검사|受入検査|Incoming inspection
양호|良好|Good
조립|組立|Assembly
맑음|晴れ|Clear
새로고침|更新|Refresh
위험|危険|Danger
확인|確認|Confirm
단위|単位|Unit
닫기|閉じる|Close
보통|普通|Normal
사용|使用|Used
삽입|挿入|Insertion
세척|洗浄|Cleaning
완료|完了|Complete
원료|原料|Raw material
포장|包装|Packing
합계|合計|Total
긴급|緊急|Urgent
모터|モーター|Motor
발주|発注|Purchase order
부품|部品|Parts
비고|備考|Notes
비밀번호|パスワード|Password
심각한|重大|Critical
알림|通知|Notifications
없음|なし|None
완제품|完成品|Finished goods
외주|外注|Outsourced
일자|日付|Date
품질|品質|Quality
자재|資材|Material
설비|設備|Equipment
출하|出荷|Shipping
선택|選択|Select
목록|一覧|List
일|日|Sun
월|月|Mon
화|火|Tue
수|水|Wed
목|木|Thu
금|金|Fri
토|土|Sat
년|年|Year
건|件|items
개|個|units
대|台|units
총|合計|Total
0분|0分|0 min
`), ...coreCatalog, ...inspectionCatalog, ...extraCatalog };

// JSX decodes entities before rendering; keep the same lookup for extracted source literals.
export const catalog: Record<string, Translation> = Object.fromEntries(
  Object.entries(sourceCatalog).flatMap(([key, value]) => [
    [key, value],
    [key.replace(/&(amp|gt|lt|quot|apos|nbsp);/g, (_, entity: string) => ({ amp: '&', gt: '>', lt: '<', quot: '"', apos: "'", nbsp: '\u00a0' })[entity] ?? entity), value],
  ]),
);

/** Longest-first domain fragments cover measured values and generated local demonstration records. */
export const glossary = { ...catalog, ...entries(`
가조립|仮組立|Pre-assembly
총조립|総組立|Final assembly
헤드온도|ヘッド温度|head temperature
탱크온도|タンク温度|tank temperature
공급수압력|給水圧力|water supply pressure
리턴온도|戻り温度|return temperature
삽입주변온도|挿入周辺温度|insertion ambient temperature
취출주변온도|取出周辺温度|ejection ambient temperature
취출경화시간|取出硬化時間|ejection curing time
지그상판온도|治具上板温度|upper jig temperature
지그하판온도|治具下板温度|lower jig temperature
발포시간|発泡時間|foaming time
취출무게|取出重量|ejection weight
온조|温調|Temperature unit
P액|P液|P-liquid
R액|R液|R-liquid
유량|流量|Flow rate
압력|圧力|Pressure
온도|温度|Temperature
무게|重量|Weight
리턴|戻り|Return
공급|供給|Supply
실시간|リアルタイム|Live
생산계획|生産計画|Production plan
작업지시|作業指示|Work order
차량번호|車両番号|Vehicle number
거래처|取引先|Supplier
협력사|協力会社|Partner
업체명|会社名|Company
담당자|担当者|Contact
작업자|作業者|Operator
등록일|登録日|Registered date
수정일|更新日|Updated date
입고일|入荷日|Receiving date
입고량|入荷数|Received quantity
출고량|出庫数|Released quantity
재고량|在庫数|Stock quantity
입고|入荷|Receiving
출고|出庫|Release
납품|納品|Delivery
창고|倉庫|Warehouse
재고|在庫|Inventory
현황|状況|Status
현장|現場|Site
품목|品目|Item
모델명|モデル名|Model name
모델|モデル|Model
검사기록|検査記録|Inspection history
검사 기록|検査記録|Inspection history
검사결과|検査結果|Inspection result
검사 결과|検査結果|Inspection result
검사일시|検査日時|Inspected at
검사일자|検査日|Inspection date
검사량|検査数|Inspection count
검사율|検査率|Inspection rate
검사중|検査中|Inspecting
검사 중|検査中|Inspecting
검수|検収|Verification
불량률|不良率|Defect rate
정상률|正常率|Pass rate
가동률|稼働率|Utilization
달성률|達成率|Achievement
진행률|進捗率|Progress
진척률|進捗率|Progress
처리율|処理率|Processing rate
적재율|積載率|Load rate
충족률|充足率|Fulfillment
불량품|不良品|Defective item
정상품|良品|Good item
재검사|再検査|Reinspection
이상징후|異常兆候|Anomaly signs
이상 징후|異常兆候|Anomaly signs
이상 감지|異常検知|Anomaly detection
이상|異常|Anomaly
감지|検知|Detected
경고|警告|Warning
경보|警報|Alarm
안전|安全|Safety
위치|位置|Location
구역|エリア|Zone
공정|工程|Process
생산|生産|Production
발포|発泡|Foaming
가스켓|ガスケット|Gasket
필름|フィルム|Film
유리|ガラス|Glass
간격|隙間|Gap
누수|漏れ|Leakage
기포|気泡|Bubble
부착|貼付|Attachment
모서리|コーナー|Corner
상단|上部|Upper
하단|下部|Lower
좌측|左側|Left
우측|右側|Right
중앙|中央|Center
전면|前面|Front
후면|背面|Rear
상부|上部|Upper
하부|下部|Lower
전방|前方|Front
후방|後方|Rear
확대|拡大|Enlarge
축소|縮小|Reduce
열기|開く|Open
재생|再生|Play
정지|停止|Stop
일시정지|一時停止|Pause
일시 정지|一時停止|Pause
영상|映像|Video
카메라|カメラ|Camera
화면|画面|Screen
이미지|画像|Image
사진|写真|Photo
다시|再度|Again
오늘|本日|Today
금일|本日|Today
어제|昨日|Yesterday
전일|前日|Previous day
내일|明日|Tomorrow
당일|当日|Same day
이번 주|今週|This week
이번 달|今月|This month
이번 년도|今年|This year
전주|前週|Previous week
전월|前月|Previous month
일간|日別|Daily
주간|週別|Weekly
월간|月別|Monthly
연간|年別|Yearly
연도|年|Year
년도|年|Year
요일|曜日|Weekday
날짜|日付|Date
기간|期間|Period
시작일|開始日|Start date
종료일|終了日|End date
시작|開始|Start
종료|終了|End
일시|日時|Date and time
시간|時間|Time
초과|超過|Exceeded
미만|未満|Below
이하|以下|At most
이내|以内|Within
이후|以降|After
이전|以前|Previous
최근|最近|Recent
최신|最新|Latest
과거|過去|Historical
평균|平均|Average
최대|最大|Maximum
최소|最小|Minimum
최고|最高|Highest
최저|最低|Lowest
누적|累積|Cumulative
예상|予想|Expected
예측|予測|Prediction
실측|実測|Measured
기준값|基準値|Reference value
기준|基準|Standard
측정값|測定値|Measurement
측정|測定|Measurement
목표|目標|Target
실적|実績|Actual
계획|計画|Plan
대비|比較|Compared with
차이|差|Difference
편차|偏差|Deviation
오차|誤差|Error
범위|範囲|Range
한계|限界|Limit
허용|許容|Allowed
권장|推奨|Recommended
관리|管理|Management
모니터링|モニタリング|Monitoring
분석|分析|Analysis
추이|推移|Trend
추세|傾向|Trend
분포|分布|Distribution
비율|比率|Ratio
수량|数量|Quantity
갯수|個数|Count
개수|個数|Count
건수|件数|Count
건씩|件ずつ|items each
단가|単価|Unit price
금액|金額|Amount
비용|費用|Cost
용량|容量|Capacity
사용량|使用量|Usage
중량|重量|Weight
길이|長さ|Length
높이|高さ|Height
너비|幅|Width
크기|サイズ|Size
두께|厚さ|Thickness
속도|速度|Speed
유형|種別|Type
종류|種類|Type
구분|区分|Category
분류|分類|Category
사유|理由|Reason
원인|原因|Cause
내용|内容|Details
상세|詳細|Details
정보|情報|Information
번호|番号|Number
코드|コード|Code
이름|名前|Name
명칭|名称|Name
연락처|連絡先|Contact
주소|住所|Address
기사|ドライバー|Driver
차량|車両|Vehicle
배차|配車|Dispatch
배송|配送|Delivery
운송|輸送|Transport
운행|運行|Trip
출발|出発|Departure
상차|積込|Loading
하차|荷卸|Unloading
적재|積載|Loading
대차|台車|Trolley
운반|搬送|Transport
이동|移動|Movement
경로|経路|Route
거리|距離|Distance
소요|所要|Required
잔여|残り|Remaining
대상|対象|Target
처리|処理|Processing
예약|予約|Reservation
지시|指示|Instruction
요청|要求|Request
접수|受付|Received
확정|確定|Confirm
취소|キャンセル|Cancel
수정|編集|Edit
삭제|削除|Delete
추가|追加|Add
등록|登録|Register
저장|保存|Save
적용|適用|Apply
복사|コピー|Copy
붙여넣기|貼り付け|Paste
복원|復元|Restore
되돌리기|元に戻す|Undo
다운로드|ダウンロード|Download
업로드|アップロード|Upload
내보내기|エクスポート|Export
가져오기|インポート|Import
인쇄|印刷|Print
열람|閲覧|View
조회|照会|Search
검색|検索|Search
필터|フィルター|Filter
정렬|並べ替え|Sort
선택됨|選択済み|Selected
선택된|選択した|Selected
선택한|選択した|Selected
미선택|未選択|Not selected
전체선택|すべて選択|Select all
전체 선택|すべて選択|Select all
선택해제|選択解除|Deselect
선택 해제|選択解除|Deselect
다음|次へ|Next
마지막|最後|Last
처음|最初|First
더보기|もっと見る|Show more
더 보기|もっと見る|Show more
보기|表示|View
숨기기|非表示|Hide
펼치기|展開|Expand
접기|折りたたむ|Collapse
리스트|リスト|List
리비전|リビジョン|Revision
버전|バージョン|Version
비교|比較|Compare
검증|検証|Validation
반영|反映|Apply
결과|結果|Result
요약|概要|Summary
보고서|レポート|Report
차트|チャート|Chart
그래프|グラフ|Graph
데이터|データ|Data
항목|項目|Item
목록|一覧|List
행|行|Row
열|列|Column
합산|合算|Combined
총합|総計|Grand total
소계|小計|Subtotal
합계|合計|Total
중복|重複|Duplicate
누락|欠落|Missing
부족|不足|Shortage
충분|十分|Sufficient
초기|初期|Initial
연결|接続|Connection
통신|通信|Communication
서버|サーバー|Server
시스템|システム|System
동기화|同期|Synchronization
갱신|更新|Update
재연결|再接続|Reconnect
오프라인|オフライン|Offline
온라인|オンライン|Online
로컬|ローカル|Local
네트워크|ネットワーク|Network
오류|エラー|Error
에러|エラー|Error
실패|失敗|Failed
성공|成功|Success
로딩|読み込み|Loading
불러오기|読み込み|Load
불러오는 중|読み込み中|Loading
전송|送信|Send
수신|受信|Receive
응답|応答|Response
메시지|メッセージ|Message
알림|通知|Notification
권한|権限|Permission
허용|許可|Allow
거부|拒否|Deny
활성화|有効化|Enable
비활성화|無効化|Disable
활성|有効|Enabled
비활성|無効|Disabled
자동|自動|Automatic
수동|手動|Manual
설정|設定|Settings
환경|環境|Environment
장치|デバイス|Device
센서|センサー|Sensor
알람|アラーム|Alarm
소리|音|Sound
경고음|警告音|Warning sound
스피커|スピーカー|Speaker
음성|音声|Voice
음량|音量|Volume
테스트|テスト|Test
샘플|サンプル|Sample
데모|デモ|Demo
전시회|展示会|Exhibition
전시용|展示用|Exhibition
전시|展示|Exhibition
오사카|大阪|Osaka
일본어|日本語|Japanese
영어|英語|English
한국어|한국어|한국어
안내|案内|Guide
도움말|ヘルプ|Help
문의|問い合わせ|Inquiry
대화|会話|Chat
질문|質問|Question
답변|回答|Answer
추천|推奨|Recommendation
제안|提案|Suggestion
예시|例|Example
입력|入力|Input
메뉴|メニュー|Menu
메인|メイン|Main
서비스|サービス|Service
스마트|スマート|Smart
팩토리|ファクトリー|Factory
공장|工場|Factory
본사|本社|Headquarters
센터|センター|Center
물류|物流|Logistics
제품|製品|Product
대형|大型|Large
소형|小型|Small
냉장고|冷蔵庫|Refrigerator
냉동고|冷凍庫|Freezer
냉동|冷凍|Frozen
냉장|冷蔵|Refrigerated
도어|ドア|Door
패널|パネル|Panel
프레임|フレーム|Frame
프레스|プレス|Press
성형|成形|Molding
용접|溶接|Welding
절단|切断|Cutting
도장|塗装|Painting
배선|配線|Wiring
전장|電装|Electrical
기계|機械|Machine
가공|加工|Processing
라인|ライン|Line
공급처|仕入先|Supplier
납품처|納品先|Delivery destination
납기|納期|Due date
출하처|出荷先|Shipping destination
고객사|顧客|Customer
수주|受注|Sales order
발주량|発注量|Order quantity
수요량|需要量|Demand
소요량|所要量|Requirements
안전재고|安全在庫|Safety stock
가용재고|利用可能在庫|Available stock
발주서|発注書|Purchase order
견적|見積|Quote
원자재|原材料|Raw material
반제품|半製品|Semi-finished goods
반입|搬入|Incoming
반출|搬出|Outgoing
폐기|廃棄|Scrap
반품|返品|Return
수리|修理|Repair
보수|補修|Repair
점검|点検|Inspection
예지보전|予知保全|Predictive maintenance
예방정비|予防整備|Preventive maintenance
보전|保全|Maintenance
정비|整備|Maintenance
가동|稼働|Running
중지|停止|Stopped
중단|中断|Interrupted
휴지|休止|Idle
고장|故障|Fault
장애|障害|Failure
정상 운영|正常稼働|Normal operation
운영|運用|Operation
진행 중|進行中|In progress
진행중|進行中|In progress
진행|進行|Progress
예정|予定|Scheduled
도착지|到着地|Destination
출발지|出発地|Origin
배송지|配送先|Delivery address
목적지|目的地|Destination
출고지|出庫元|Shipping origin
작업|作業|Work
근무|勤務|Shift
교대|交代|Shift
주야|昼夜|Day / night
야간|夜間|Night shift
주간|昼間|Day shift
오전|午前|AM
오후|午後|PM
기타|その他|Other
기본|基本|Default
비상|非常|Emergency
중요|重要|Important
우선|優先|Priority
필수|必須|Required
선행|先行|Preceding
후행|後続|Following
미완료|未完了|Incomplete
대기중|待機中|Waiting
예외|例外|Exception
보류|保留|On hold
보관|保管|Stored
내역|履歴|History
기록|記録|Record
이력|履歴|History
로그|ログ|Log
현시점|現時点|Current
현재|現在|Current
누계|累計|Cumulative
동일|同一|Same
반복|繰り返し|Repeat
간편|簡単|Quick
빠른|クイック|Quick
직접|直接|Direct
일괄|一括|Bulk
일부|一部|Partial
전체|全体|All
모든|すべての|All
나머지|残り|Remaining
사용자|ユーザー|User
관리자|管理者|Administrator
계정|アカウント|Account
로그인|ログイン|Sign in
로그아웃|ログアウト|Sign out
비밀번호|パスワード|Password
이메일|メール|Email
전화|電話|Phone
휴대폰|携帯電話|Mobile
브라우저|ブラウザー|Browser
모바일|モバイル|Mobile
클릭|クリック|Click
버튼|ボタン|Button
링크|リンク|Link
파일|ファイル|File
시트|シート|Sheet
엑셀|Excel|Excel
양식|書式|Template
형식|形式|Format
규격|規格|Specification
버퍼|バッファ|Buffer
대시보드|ダッシュボード|Dashboard
리포트|レポート|Report
클라이언트|クライアント|Client
분석 중|分析中|Analyzing
준비 중|準備中|Preparing
준비중|準備中|Preparing
수집|収集|Collection
집계|集計|Aggregation
비율|割合|Ratio
결함|欠陥|Defect
판정|判定|Result
결측|欠測|Missing measurement
이탈|逸脱|Deviation
임계값|しきい値|Threshold
임계|しきい|Threshold
정확도|精度|Accuracy
신뢰도|信頼度|Confidence
가능|可能|Available
불가|不可|Unavailable
필요|必要|Required
감소|減少|Decrease
증가|増加|Increase
상승|上昇|Rise
하락|下降|Fall
유지|維持|Maintain
안정|安定|Stable
비정상|異常|Abnormal
나쁨|不良|Poor
좋음|良好|Good
낮음|低い|Low
높음|高い|High
매우|非常に|Very
점수|スコア|Score
등급|等級|Grade
수준|水準|Level
결정|決定|Decision
정책|ポリシー|Policy
규칙|ルール|Rule
순서|順序|Order
우선순위|優先順位|Priority
시간당|時間当たり|Hourly
일별|日別|Daily
주별|週別|Weekly
월별|月別|Monthly
연도별|年別|Yearly
날짜별|日付別|By date
업체별|会社別|By company
품목별|品目別|By item
모델별|モデル別|By model
공정별|工程別|By process
라인별|ライン別|By line
구역별|エリア別|By zone
종류별|種類別|By type
상태별|状態別|By status
작업자별|作業者別|By operator
시간별|時間別|Hourly
기준일|基準日|Reference date
영업일|営業日|Business day
근무일|稼働日|Working day
휴일|休日|Holiday
주말|週末|Weekend
공휴일|祝日|Public holiday
연휴|連休|Holiday period
상세정보|詳細情報|Details
상세 정보|詳細情報|Details
요구사항|要件|Requirements
운전자|運転者|Driver
생산성|生産性|Productivity
택타임|タクトタイム|Takt time
사이클|サイクル|Cycle
사이클타임|サイクルタイム|Cycle time
공수|工数|Labor hours
직무|職務|Job
보조|補助|Assistance
일정|日程|Schedule
변경|変更|Change
수동입력|手動入力|Manual input
미연결|未接続|Disconnected
미수신|未受信|Not received
미확인|未確認|Unconfirmed
확인됨|確認済み|Confirmed
수신됨|受信済み|Received
완료됨|完了|Complete
사용중|使用中|In use
사용 중|使用中|In use
준비|準備|Ready
즐겨찾기|お気に入り|Favorites
목업|モック|Mock
개발 중|デモ|Demo
개발 진행 중|展示デモ|Exhibition demo
`), };
