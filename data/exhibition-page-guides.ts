export type PageGuide = {
  id: string;
  title: string;
  steps: readonly string[];
};

type GuideLocale = 'ko' | 'en' | 'ja';
type LocalizedGuide = Record<GuideLocale, Omit<PageGuide, 'id'>>;

// Copy describes the local exhibition behavior, including intentionally simulated data.
const pageGuides: Record<string, LocalizedGuide> = {
  "/": {
    "ko": {
      "title": "전시회에 오신 걸 환영해요",
      "steps": [
        "인터넷 없이 둘러볼 수 있는 DXS 전시회 데모예요.",
        "곧 열리는 관제센터에서 관심 있는 분야를 골라보세요."
      ]
    },
    "en": {
      "title": "Welcome to the exhibition",
      "steps": [
        "Welcome to the DXS exhibition demo, which runs locally.",
        "Choose an area of interest when the control center opens."
      ]
    },
    "ja": {
      "title": "展示会へようこそ",
      "steps": [
        "DXSの展示会デモへようこそ、インターネットなしでご覧いただけます。",
        "まもなく開く監視センターで、気になる分野を選んでみてください。"
      ]
    }
  },
  "/master-dashboard": {
    "ko": {
      "title": "공장 전체를 둘러볼까요",
      "steps": [
        "자재부터 생산·출하까지 공장 운영을 전시용 지표로 한눈에 보여드려요.",
        "관심 있는 업무 카드를 누르면 해당 화면으로 이동해요."
      ]
    },
    "en": {
      "title": "Explore the whole factory",
      "steps": [
        "See materials, production and shipping together through exhibition sample metrics.",
        "Select a work area card to explore its screen."
      ]
    },
    "ja": {
      "title": "工場全体を見てみましょう",
      "steps": [
        "資材から生産・出荷まで、工場の運営を展示用の指標でご紹介します。",
        "気になる業務カードを押すと、その画面へ移動できます。"
      ]
    }
  },
  "/achievements": {
    "ko": {
      "title": "성과 예시를 살펴봐요",
      "steps": [
        "공정 효율과 비용 변화를 가상의 성과 사례로 보여드리는 화면이에요.",
        "차트 위에 마우스를 올려 기간별 예시 수치를 비교해 보세요."
      ]
    },
    "en": {
      "title": "Explore sample outcomes",
      "steps": [
        "This screen illustrates process efficiency and cost changes with a fictional case study.",
        "Hover over the charts to compare sample values across periods."
      ]
    },
    "ja": {
      "title": "成果の例を見てみましょう",
      "steps": [
        "工程効率やコストの変化を、架空の成果事例でご紹介する画面です。",
        "グラフにマウスを重ねて、期間ごとのサンプル値を比べてみてください。"
      ]
    }
  },
  "/dev": {
    "ko": {
      "title": "스마트 순회 점검을 체험해요",
      "steps": [
        "현장 점검과 이상 대응 흐름을 가상의 생산 라인으로 체험하는 화면이에요.",
        "자동 점검이나 데모 이상을 눌러 상태와 이력이 바뀌는 모습을 살펴보세요."
      ]
    },
    "en": {
      "title": "Try a smart inspection patrol",
      "steps": [
        "Explore inspection and incident handling on simulated production lines.",
        "Try automatic inspection or a demo incident and watch the status and history change."
      ]
    },
    "ja": {
      "title": "スマート巡回点検を体験しましょう",
      "steps": [
        "仮想の生産ラインで、現場点検と異常対応の流れを体験できます。",
        "自動点検やデモ異常を押して、状態と履歴の変化を見てみてください。"
      ]
    }
  },
  "/glb-viewer": {
    "ko": {
      "title": "공장을 입체로 살펴봐요",
      "steps": [
        "로컬에 준비된 공장 3D 모델과 검사 통계 예시를 함께 보여드려요.",
        "마우스로 모델을 돌리거나 휠로 확대하고, 차트의 수치도 확인해 보세요."
      ]
    },
    "en": {
      "title": "Explore the factory in 3D",
      "steps": [
        "View a locally stored factory model alongside sample inspection statistics.",
        "Drag to rotate, use the wheel to zoom, and hover over the charts for details."
      ]
    },
    "ja": {
      "title": "工場を立体で見てみましょう",
      "steps": [
        "ローカルの工場3Dモデルと、検査統計のサンプルを一緒に表示しています。",
        "ドラッグで回転、ホイールで拡大し、グラフの数値も確認してみてください。"
      ]
    }
  },
  "/material/inbound-inspection": {
    "ko": {
      "title": "자재 입고 현장을 둘러봐요",
      "steps": [
        "입고 차량과 검수 대기 자재, 현장 영상을 로컬 데모로 보여드려요.",
        "카메라를 크게 열거나 대기 목록의 전체보기를 눌러 자세히 살펴보세요."
      ]
    },
    "en": {
      "title": "Explore material receiving",
      "steps": [
        "See arriving vehicles, pending inspections and site videos in this local demo.",
        "Expand a camera or open the full waiting list for a closer look."
      ]
    },
    "ja": {
      "title": "資材の入庫現場を見てみましょう",
      "steps": [
        "入庫車両や検収待ち資材、現場映像をローカルデモで表示しています。",
        "カメラを拡大したり、待機一覧の全件表示を押したりしてみてください。"
      ]
    }
  },
  "/material/inbound-inspection/status": {
    "ko": {
      "title": "입고 검수 현황을 비교해요",
      "steps": [
        "전시용 입고 기록을 기간별 지표와 자재 목록으로 확인하는 화면이에요.",
        "일·주·월·연간과 날짜를 바꿔보고, 검색으로 필요한 자재를 찾아보세요."
      ]
    },
    "en": {
      "title": "Compare inbound inspection status",
      "steps": [
        "Review exhibition receiving records as period summaries and material lists.",
        "Switch the period and date, then search for the materials you want to inspect."
      ]
    },
    "ja": {
      "title": "入庫検収の状況を比べましょう",
      "steps": [
        "展示用の入庫記録を、期間別の指標と資材一覧で確認できます。",
        "日・週・月・年や日付を切り替え、検索で気になる資材を探してみてください。"
      ]
    }
  },
  "/material/inbound-inspection/material-check": {
    "ko": {
      "title": "모바일 카메라를 준비해요",
      "steps": [
        "이 화면은 모바일 카메라 미리보기이며, QR 자동 인식은 아직 제공하지 않아요.",
        "휴대폰에서는 카메라 권한을 허용하고, PC에서는 입고검사 화면으로 돌아가 주세요."
      ]
    },
    "en": {
      "title": "Prepare the mobile camera",
      "steps": [
        "This mobile camera preview does not yet recognize QR codes automatically.",
        "Allow camera access on a phone, or return to inbound inspection on a PC."
      ]
    },
    "ja": {
      "title": "モバイルカメラを準備しましょう",
      "steps": [
        "この画面はモバイルカメラのプレビューで、QRの自動認識にはまだ対応していません。",
        "スマートフォンではカメラを許可し、PCでは入庫検査画面へ戻ってください。"
      ]
    }
  },
  "/material/warehouse": {
    "ko": {
      "title": "자재 보관 위치를 살펴봐요",
      "steps": [
        "전시용 자재 재고와 구역별 사용 공간을 배치도로 보여드려요.",
        "제품명을 검색한 뒤 목록의 위치와 D101~D105 구역을 비교해 보세요."
      ]
    },
    "en": {
      "title": "Explore material storage",
      "steps": [
        "View sample material inventory and space usage on the warehouse layout.",
        "Search a product name and compare its listed location with areas D101–D105."
      ]
    },
    "ja": {
      "title": "資材の保管場所を見てみましょう",
      "steps": [
        "展示用の資材在庫と、エリアごとの使用状況を配置図で表示しています。",
        "製品名を検索して、一覧の保管場所とD101〜D105のエリアを照らし合わせてみてください。"
      ]
    }
  },
  "/production/smart-factory-dashboard": {
    "ko": {
      "title": "공정 앞 재고를 살펴봐요",
      "steps": [
        "생산 투입과 대차 적재 현황을 예시 데이터와 로컬 영상으로 보여드려요.",
        "대차 슬롯 전체보기를 열어 어떤 자재가 준비되어 있는지 확인해 보세요."
      ]
    },
    "en": {
      "title": "Explore production-side inventory",
      "steps": [
        "View sample production inputs and cart loading status with local video.",
        "Open the full cart-slot list to see which materials are ready."
      ]
    },
    "ja": {
      "title": "工程前の在庫を見てみましょう",
      "steps": [
        "生産投入と台車の積載状況を、サンプルデータとローカル映像で表示しています。",
        "台車スロットの全件表示を開き、準備されている資材を確認してみてください。"
      ]
    }
  },
  "/production/glass-gap-check": {
    "ko": {
      "title": "유리 간격 검사를 살펴봐요",
      "steps": [
        "유리 간격의 정상·불량 판정을 전시용 이미지와 기록으로 보여드려요.",
        "검사 이력을 고르고 확대 영역을 열어 어느 위치를 확인하는지 살펴보세요."
      ]
    },
    "en": {
      "title": "Explore glass gap inspection",
      "steps": [
        "View sample pass/fail results using exhibition images and inspection records.",
        "Select a record and open a zoomed area to see where the inspection focuses."
      ]
    },
    "ja": {
      "title": "ガラス隙間検査を見てみましょう",
      "steps": [
        "ガラス隙間の正常・不良判定を、展示用画像と記録でご紹介します。",
        "検査履歴を選び、拡大領域を開いて確認する場所を見てみてください。"
      ]
    }
  },
  "/production/leak-detection": {
    "ko": {
      "title": "발포 누수 검사 지점을 살펴봐요",
      "steps": [
        "여섯 검사 지점의 판정과 불량 사례를 전시용 데이터로 보여드려요.",
        "이력을 선택하고 A1~A6 확대 영역을 비교해 검사 위치를 확인해 보세요."
      ]
    },
    "en": {
      "title": "Explore foaming leak inspection",
      "steps": [
        "See sample results and defect cases across six inspection points.",
        "Select a record and compare the A1–A6 zoom areas to explore each location."
      ]
    },
    "ja": {
      "title": "発泡漏れの検査箇所を見てみましょう",
      "steps": [
        "6つの検査箇所の判定と不良例を、展示用データで表示しています。",
        "履歴を選び、A1〜A6の拡大領域を比べて検査箇所を確認してみてください。"
      ]
    }
  },
  "/production/gasket-check": {
    "ko": {
      "title": "가스켓 검사 흐름을 살펴봐요",
      "steps": [
        "가스켓 상태를 확인하는 과정을 로컬 영상과 예시 판정 이력으로 보여드려요.",
        "검수 이력을 선택해 제품별 결과를 비교하고 영상을 크게 열어보세요."
      ]
    },
    "en": {
      "title": "Explore gasket inspection",
      "steps": [
        "Follow gasket checks through local video and sample inspection results.",
        "Choose an inspection record to compare products and expand the video for a closer look."
      ]
    },
    "ja": {
      "title": "ガスケット検査の流れを見てみましょう",
      "steps": [
        "ガスケットの確認工程を、ローカル映像と判定履歴のサンプルでご紹介します。",
        "検収履歴を選んで製品ごとの結果を比べ、映像も拡大してみてください。"
      ]
    }
  },
  "/production/film-attachment": {
    "ko": {
      "title": "필름 부착 상태를 살펴봐요",
      "steps": [
        "필름 부착 검사를 로컬 영상과 정상·불량 기록 예시로 보여드리는 화면이에요.",
        "검수 이력을 선택해 결과를 비교하고, 화면 보기 방식을 바꿔보세요."
      ]
    },
    "en": {
      "title": "Explore film attachment checks",
      "steps": [
        "This screen demonstrates film inspection with local video and sample pass/fail records.",
        "Select inspection records to compare results and try the different viewing modes."
      ]
    },
    "ja": {
      "title": "フィルムの貼付状態を見てみましょう",
      "steps": [
        "フィルム貼付検査を、ローカル映像と正常・不良記録のサンプルで表示しています。",
        "検収履歴を選んで結果を比べ、画面の表示方法も切り替えてみてください。"
      ]
    }
  },
  "/production/line-monitoring": {
    "ko": {
      "title": "발포 라인을 입체로 둘러봐요",
      "steps": [
        "움직이는 3D 설비와 변하는 센서 수치로 발포 라인 관제를 시뮬레이션해요.",
        "화면 보기 방식을 바꾸고 설비에 마우스를 올려 상태를 자세히 확인해 보세요."
      ]
    },
    "en": {
      "title": "Explore the foaming line in 3D",
      "steps": [
        "Moving 3D equipment and changing sample sensor values simulate line monitoring.",
        "Switch the viewing layout and hover over equipment to inspect its status."
      ]
    },
    "ja": {
      "title": "発泡ラインを立体で見てみましょう",
      "steps": [
        "動く3D設備と変化するサンプル値で、発泡ライン監視をシミュレーションしています。",
        "表示レイアウトを切り替え、設備にマウスを重ねて状態を確認してみてください。"
      ]
    }
  },
  "/production/foaming-inspection": {
    "ko": {
      "title": "설비 상태를 비교해요",
      "steps": [
        "발포 설비의 온도·압력과 이상 징후를 전시용 데이터로 보여드려요.",
        "표시된 측정값과 정상 범위를 비교하며 주의가 필요한 항목을 찾아보세요."
      ]
    },
    "en": {
      "title": "Compare equipment conditions",
      "steps": [
        "Explore sample temperatures, pressures and warning signs from foaming equipment.",
        "Compare the displayed measurements with their normal ranges to spot items needing attention."
      ]
    },
    "ja": {
      "title": "設備の状態を比べましょう",
      "steps": [
        "発泡設備の温度・圧力や異常の兆候を、展示用データで表示しています。",
        "表示された測定値と正常範囲を比べ、注意が必要な項目を探してみてください。"
      ]
    }
  },
  "/production/foaming-cart-position": {
    "ko": {
      "title": "발포 대차를 골라보세요",
      "steps": [
        "대차별 이미지와 정상·이상 판정을 전시용 사례로 확인하는 화면이에요.",
        "왼쪽 대차 번호를 고른 뒤 정밀 보기를 눌러 표시된 검사 영역을 확대해 보세요."
      ]
    },
    "en": {
      "title": "Choose a foaming cart",
      "steps": [
        "Review sample cart images and normal or abnormal results.",
        "Select a cart number on the left, then open the detailed view to inspect the marked area."
      ]
    },
    "ja": {
      "title": "発泡台車を選んでみましょう",
      "steps": [
        "台車ごとの画像と正常・異常判定を、展示用の事例で確認できます。",
        "左の台車番号を選び、詳細表示を押して検査領域を拡大してみてください。"
      ]
    }
  },
  "/production/takttime-dashboard": {
    "ko": {
      "title": "생산 속도를 비교해요",
      "steps": [
        "라인별 작업시간과 생산량을 변하는 데모 수치로 살펴보는 화면이에요.",
        "라인 보기 방식을 바꾸고 목표 시간과 실제 표시값의 차이를 비교해 보세요."
      ]
    },
    "en": {
      "title": "Compare production pace",
      "steps": [
        "Explore changing demo values for line cycle times and production quantities.",
        "Switch the line view and compare the displayed cycle times with their targets."
      ]
    },
    "ja": {
      "title": "生産のペースを比べましょう",
      "steps": [
        "ライン別の作業時間と生産量を、変化するデモ数値で確認できます。",
        "ラインの表示方法を切り替えて、表示された作業時間と目標時間を比べてみてください。"
      ]
    }
  },
  "/production/pysical-ai": {
    "ko": {
      "title": "운반 작업의 안전을 살펴봐요",
      "steps": [
        "로컬 작업 영상과 예시 로그로 자재 운반 안전 관제를 소개해 드려요.",
        "영상을 보면서 오른쪽 로그의 탐지 항목과 정상·주의·위험 상태를 함께 확인해 보세요."
      ]
    },
    "en": {
      "title": "Explore transport safety",
      "steps": [
        "Local work footage and sample logs demonstrate material-handling safety monitoring.",
        "Watch the video and compare detected items with normal, caution and danger statuses in the log."
      ]
    },
    "ja": {
      "title": "運搬作業の安全を見てみましょう",
      "steps": [
        "ローカルの作業映像とサンプルログで、資材運搬の安全監視をご紹介します。",
        "映像を見ながら、右のログの検知項目と正常・注意・危険の状態を確認してみてください。"
      ]
    }
  },
  "/transport/realtime-status": {
    "ko": {
      "title": "차량 운행을 따라가 볼까요",
      "steps": [
        "예시 차량의 운행 상태와 이동 위치를 로컬 지도에서 보여드려요.",
        "차량을 선택해 경로와 도착 예정 시간을 확인하고 지도도 확대해 보세요."
      ]
    },
    "en": {
      "title": "Follow a vehicle trip",
      "steps": [
        "See sample vehicle trips and moving positions on the local map.",
        "Select a vehicle to inspect its route and estimated arrival, then zoom in on the map."
      ]
    },
    "ja": {
      "title": "車両の運行を追ってみましょう",
      "steps": [
        "サンプル車両の運行状態と移動位置を、ローカル地図で表示しています。",
        "車両を選んで経路と到着予定を確認し、地図も拡大してみてください。"
      ]
    }
  },
  "/transport/warehouse-management": {
    "ko": {
      "title": "완제품 보관 현황을 살펴봐요",
      "steps": [
        "제품창고의 구역별 적재 상태와 재고를 전시용 데이터로 보여드려요.",
        "품목을 검색하거나 보관 슬롯을 선택해 제품 정보와 위치를 확인해 보세요."
      ]
    },
    "en": {
      "title": "Explore finished-goods storage",
      "steps": [
        "View sample stock and loading status across product warehouse zones.",
        "Search an item or select a storage slot to check its product details and location."
      ]
    },
    "ja": {
      "title": "完成品の保管状況を見てみましょう",
      "steps": [
        "製品倉庫のエリア別積載状況と在庫を、展示用データで表示しています。",
        "品目を検索したり保管スロットを選んだりして、製品情報と位置を確認してみてください。"
      ]
    }
  },
  "/transport/shipment": {
    "ko": {
      "title": "출하 흐름을 비교해요",
      "steps": [
        "출하량과 예상 수량의 흐름을 고정된 전시용 사례로 보여드리는 화면이에요.",
        "일별 보기와 주간 보기를 바꾸고 막대 위에 마우스를 올려 수치를 확인해 보세요."
      ]
    },
    "en": {
      "title": "Compare shipment trends",
      "steps": [
        "This screen illustrates shipments and projected quantities with a fixed exhibition dataset.",
        "Switch between daily and weekly views, then hover over bars to inspect their values."
      ]
    },
    "ja": {
      "title": "出荷の流れを比べましょう",
      "steps": [
        "出荷量と予測数量の推移を、固定の展示用データでご紹介します。",
        "日別・週別表示を切り替え、棒グラフにマウスを重ねて数値を確認してみてください。"
      ]
    }
  },
  "/lab/production-plan": {
    "ko": {
      "title": "생산계획을 직접 다뤄봐요",
      "steps": [
        "전시용 생산계획을 비교하고 업로드·확정하는 과정을 체험할 수 있어요.",
        "리비전을 고르거나 Excel 파일을 올린 뒤, 로컬 저장으로 이 브라우저에 보관해 보세요."
      ]
    },
    "en": {
      "title": "Try managing a production plan",
      "steps": [
        "Explore comparing, uploading and confirming exhibition production plans.",
        "Choose a revision or upload an Excel file, then save the plan locally in this browser."
      ]
    },
    "ja": {
      "title": "生産計画を操作してみましょう",
      "steps": [
        "展示用の生産計画を比較し、アップロードや確定の流れを体験できます。",
        "リビジョンを選ぶかExcelをアップロードし、ローカル保存でこのブラウザに保管してみてください。"
      ]
    }
  },
  "/lab/mes-bom-list": {
    "ko": {
      "title": "제품의 구성 자재를 펼쳐봐요",
      "steps": [
        "제품에서 하위 자재로 이어지는 BOM 구조를 로컬 예시 데이터로 보여드려요.",
        "PJT코드와 제품번호로 조회한 뒤 현재 결과나 전체 목록을 Excel로 내려받아 보세요."
      ]
    },
    "en": {
      "title": "Explore a product breakdown",
      "steps": [
        "See how products break down into components using local sample BOM data.",
        "Search by project code and product number, then export the current results or full list to Excel."
      ]
    },
    "ja": {
      "title": "製品の構成資材を見てみましょう",
      "steps": [
        "製品から下位資材へつながるBOM構造を、ローカルのサンプルで表示しています。",
        "PJTコードや製品番号で検索し、現在の結果や全件一覧をExcelで保存してみてください。"
      ]
    }
  },
  "/lab/order-plan": {
    "ko": {
      "title": "발주할 자재를 살펴봐요",
      "steps": [
        "선택한 계획과 날짜에 맞춘 자재 소요량을 전시용 계산으로 보여드려요.",
        "재계산과 발주 전송 체험을 눌러보면 외부 전송 없이 목록 상태가 바뀌어요."
      ]
    },
    "en": {
      "title": "Explore material ordering",
      "steps": [
        "Sample calculations show material needs for the selected plan and date.",
        "Try recalculation and simulated submission to update the list without sending an external order."
      ]
    },
    "ja": {
      "title": "発注する資材を見てみましょう",
      "steps": [
        "選択した計画と日付に合わせた資材所要量を、展示用の計算で表示しています。",
        "再計算や発注送信の体験を押すと、外部へ送信せずに一覧の状態が変わります。"
      ]
    }
  },
  "/lab/cctv-monitoring": {
    "ko": {
      "title": "공장 카메라를 둘러봐요",
      "steps": [
        "동별 카메라 현황을 로컬 영상과 예시 썸네일로 보여드리는 화면이에요.",
        "동이나 카메라를 선택하고 상세 영상을 열어 모니터링 화면을 체험해 보세요."
      ]
    },
    "en": {
      "title": "Explore factory cameras",
      "steps": [
        "Browse building cameras through local videos and sample thumbnails.",
        "Choose a building or camera and open its video to try the monitoring view."
      ]
    },
    "ja": {
      "title": "工場のカメラを見てみましょう",
      "steps": [
        "棟別のカメラ状況を、ローカル映像とサンプル画像で表示しています。",
        "棟やカメラを選んで詳細映像を開き、監視画面を体験してみてください。"
      ]
    }
  },
  "/lab/push": {
    "ko": {
      "title": "알림 흐름을 체험해요",
      "steps": [
        "이 화면 안에서 CCTV 알림이 도착하는 흐름을 시뮬레이션해요.",
        "알림을 켜서 예시 메시지를 확인하고, 끄면 반복 알림이 멈춰요."
      ]
    },
    "en": {
      "title": "Try the notification flow",
      "steps": [
        "This screen simulates incoming CCTV notifications within the demo.",
        "Turn notifications on to see sample messages, and turn them off to stop the cycle."
      ]
    },
    "ja": {
      "title": "通知の流れを体験しましょう",
      "steps": [
        "この画面内で、CCTV通知が届く流れをシミュレーションしています。",
        "通知をオンにしてサンプルを確認し、オフにすると繰り返し通知が止まります。"
      ]
    }
  }
};

// Keep development, legacy and redirected routes on the matching guide identity.
// The misspelled cart development route renders the foaming inspection screen.
const pageAliases: Record<string, string> = {
  "/transport/realtime-status-backup": "/transport/realtime-status",
  "/transport/realtime-status/dev": "/transport/realtime-status",
  "/transport/warehouse-management-dev": "/transport/warehouse-management",
  "/material/warehouse-dev": "/material/warehouse",
  "/material/inbound-inspection-backup": "/material/inbound-inspection",
  "/production/film-attachment-backup": "/production/film-attachment",
  "/production/film-attachment-dev": "/production/film-attachment",
  "/production/gasket-check-backup": "/production/gasket-check",
  "/production/gasket-check-dev": "/production/gasket-check",
  "/production/glass-gap-check-backup": "/production/glass-gap-check",
  "/production/glass-gap-check-dev": "/production/glass-gap-check",
  "/production/leak-detection-dev": "/production/leak-detection",
  "/production/line-monitoring-backup": "/production/line-monitoring",
  "/production/foaming-inspection-dev": "/production/foaming-inspection",
  "/production/foaming-cart-potisiton-dev": "/production/foaming-inspection",
  "/production/production-plan": "/lab/production-plan"
};

const fallbackGuide: LocalizedGuide = {
  "ko": {
    "title": "함께 둘러볼까요?",
    "steps": [
      "DXS 전시회 데모를 로컬에서 둘러보고 있어요.",
      "왼쪽 메뉴에서 관심 있는 화면을 골라보세요."
    ]
  },
  "en": {
    "title": "Let's take a look",
    "steps": [
      "You're exploring the local DXS exhibition demo.",
      "Choose a screen that interests you from the sidebar."
    ]
  },
  "ja": {
    "title": "一緒に見てみましょう",
    "steps": [
      "ローカルで動くDXSの展示会デモをご覧いただいています。",
      "左のメニューから、気になる画面を選んでみてください。"
    ]
  }
};

export function getPageGuide(pathname: string, locale: GuideLocale): PageGuide {
  const normalizedPath = pathname.split(/[?#]/, 1)[0].replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/';
  const canonicalPath = pageAliases[normalizedPath] ?? normalizedPath;
  const localizedGuide = pageGuides[canonicalPath];
  const guide = (localizedGuide ?? fallbackGuide)[locale];
  return {
    id: localizedGuide ? canonicalPath : 'fallback',
    title: guide.title,
    steps: [...guide.steps],
  };
}
