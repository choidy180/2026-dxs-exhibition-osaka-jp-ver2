# Qwen3-8B Q4_K_M 사내 공장 데이터 구축 가이드

> 기준일: 2026-08-19 (Asia/Seoul)  
> 대상 장비: AMD Ryzen 9 9950X, RAM 32 GB, NVIDIA GeForce RTX 5060 8 GB, Windows  
> 권장 시작 구성: Ollama + `qwen3:8b-q4_K_M` + 8K 컨텍스트 + non-thinking  
> 문서 성격: 단일 PC PoC부터 사내 운영 전환까지의 전문가용 실행·검수 절차

> **처음 설치하는 분은 이 문서부터 읽지 마십시오.**  
> [START-HERE.md](./START-HERE.md)의 초보자용 순서대로 먼저 구축하고,
> 운영 전환·폐쇄망·다중 사용자·MES 연동이 필요할 때 이 상세판을 참고하십시오.

이 문서는 단순히 모델을 실행하는 데서 끝나지 않고, 한국어로 공장 내부 문서와 MES/ERP 데이터를 안전하게 조회하는 데 필요한 전체 순서를 설명한다. 그대로 복사해 쓰는 명령은 예시 경로 `D:\LocalLLM`을 사용하므로 실제 회사 승인 경로에 맞게 바꿔야 한다.

## 1. 먼저 결정할 최종 형태

### 1.1 한 줄 결론

- 작업표준서·매뉴얼·장애조치서: **문서 RAG**로 검색한다.
- 생산량·불량률·알람·작업지시 상태: **조회 전용 API/보고용 DB View**로 실시간 조회한다.
- Qwen은 검색·조회 결과를 한국어로 설명하고 출처를 붙인다.
- Qwen에 DB 계정, 임의 SQL, PLC·DCS·SCADA 쓰기 권한을 주지 않는다.

### 1.2 권장 구조

```text
사용자
  │
  ▼
인증된 로컬 UI 또는 사내 업무 화면
  │
  ├─ 문서 질문 ─► 사용자 권한 확인 ─► 문서 검색(RAG) ─► 승인 문서 청크·출처
  │
  └─ 실적 질문 ─► 허용 함수·조건 검증 ─► 조회 전용 API ─► 보고용 View/MES·ERP
                      │
                      └─ 임의 SQL, DML/DDL, 설비 제어 없음
  │
  ▼
Qwen3-8B Q4_K_M: 제공된 근거를 한국어로 정리
  │
  ▼
결과 + 조회 조건 + 단위 + 문서/페이지 또는 데이터 기준시각
```

한 모델이 처음부터 모든 경로를 자동 선택하게 하지 않는다. 먼저 `공장 문서 Q&A`와 `생산 실적 조회`를 별도로 검증한 후 통합한다.

### 1.3 이번 PC에서의 시작값

| 항목 | 시작값 | 이유 |
|---|---|---|
| 생성 모델 | `qwen3:8b-q4_K_M` | 공식 Ollama 태그, 8.19B, 약 5.2 GB, Apache-2.0 |
| 컨텍스트 | 8,192 tokens | 8 GB VRAM에서 품질과 메모리의 현실적인 출발점 |
| thinking | 기본 끔 | 일반 문서·실적 조회의 지연과 불필요한 출력 감소 |
| 동시 요청 | 1 | 병렬 요청 수만큼 KV 캐시가 커지는 문제 방지 |
| 동시 적재 모델 | 1 | 생성 모델과 임베딩 모델의 VRAM 경합 방지 |
| 임베딩 | `qwen3-embedding:0.6b` | 약 639 MB, 한국어를 포함한 다국어 검색용 |
| 사용자 | 첫 PoC 1명, 검증 후 3~5명 | 이 PC는 24시간 다중 사용자 서버보다 PoC에 적합 |

`llmfit` 화면의 예상 tok/s는 설치 전 추정치다. 실제 합격 여부는 `ollama ps`, `nvidia-smi`, API 응답의 평가 시간을 이용해 다시 측정한다.

## 2. 이 자료에 포함된 파일

| 파일 | 용도 |
|---|---|
| `START-HERE.md` | 일반 사용자가 복사·붙여넣기와 화면 클릭으로 진행하는 초보자용 가이드 |
| `BEGINNER-CHECKLIST.md` | 단계별 완료 여부와 버전·해시를 적는 초보자용 한 장 체크리스트 |
| `sample-data/교육용-가상문서-절대업무사용금지.md` | 실제 사내 문서 전에 RAG 동작을 확인하는 가상 연습문서 |
| `README.md` | 전체 구축·검수·운영 절차 |
| `Modelfile` | 인터넷 연결 또는 Ollama 저장소 반입 시 사용할 8K 사내 모델 설정 |
| `Modelfile.offline.example` | 공식 GGUF 한 파일을 반입할 때의 설정 예시 |
| `system-prompt-ko.txt` | UI/RAG/업무 앱에 넣을 한국어 정책 프롬프트 |
| `deployment-bom-template.csv` | runtime·모델·UI·임베딩·OCR·API 버전/해시 자산대장 |
| `data-inventory-template.csv` | 문서·MES 데이터 승인 및 개정 관리대장 |
| `acceptance-test-template.csv` | 현업 골든셋·보안·성능 검수표 |

CSV는 UTF-8이다. 구형 Excel에서 한글이 깨지면 파일을 더블클릭하지 말고 `데이터 → 텍스트/CSV에서`로 가져오면서 파일 원본을 UTF-8로 지정한다.

## 3. 전체 구축 순서와 완료 게이트

| 단계 | 작업 | 완료 조건 |
|---|---|---|
| 0 | 범위·보안·라이선스 승인 | 허용 데이터와 금지 기능이 문서화됨 |
| 1 | PC 사전 점검 | OS·드라이버·디스크·포트 기준 통과 |
| 2 | 폴더·환경변수 설정 | 모델 저장 경로와 로컬 전용 설정 확정 |
| 3 | Ollama 고정 버전 설치 | 버전·해시 기록, API가 loopback에서만 응답 |
| 4 | Qwen 모델 반입 | 태그/파일 해시와 Q4_K_M 확인 |
| 5 | 사내 모델 생성 | 8K 설정과 시스템 정책이 적용된 고정 이름 생성 |
| 6 | GPU·한국어 기준선 검증 | 100% GPU 목표, no-thinking, 실측 성능 기록 |
| 7 | 로컬 UI 설치 | 인증·영구 볼륨·버전 고정·외부 노출 차단 |
| 8 | 문서 RAG 구축 | 최신 승인본 검색, 문서·개정·페이지 인용 |
| 9 | MES/ERP 조회 연계 | 허용 API만 사용, 수치가 공식 리포트와 100% 일치 |
| 10 | 골든셋·보안 검수 | 무권한 노출·쓰기 성공 0건 |
| 11 | 소규모 운영·전환 판단 | 백업·업데이트·장애 대응 책임자 확정 |

각 단계의 완료 조건을 통과하기 전 다음 단계로 넘어가지 않는 것이 좋다.

---

## 4. 0단계 — 범위와 승인 기준 확정

설치 전에 다음 항목을 1~2페이지로 확정한다.

### 4.1 PoC 범위

- 대상 사용자와 부서
- 대상 공장, 라인, 설비
- 허용 문서 종류와 예상 건수
- 허용 KPI: 생산량, 양품수량, 불량률, 알람 등
- 응답에 반드시 표시할 단위·시간대·출처 형식
- PoC 종료일과 결과 승인자

권장 첫 범위는 한 라인, 100~300개 승인 문서, 3~5개 KPI다. 전사 문서와 모든 MES 테이블을 한 번에 연결하지 않는다.

### 4.2 금지 범위

- 개인정보, 인사, 원가, 고객 비밀 등 승인받지 않은 데이터
- 클라우드 모델, 웹 검색, 외부 텔레메트리
- 임의 SQL 입력·실행
- MES/ERP의 INSERT·UPDATE·DELETE 및 DDL
- PLC·DCS·SCADA 제어와 파일/프로그램 실행
- 모델의 답변만으로 품질 판정이나 안전 정지를 자동 수행하는 기능

### 4.3 라이선스·소프트웨어 반입 확인

- Qwen3-8B와 공식 GGUF의 Apache-2.0 고지·라이선스 사본을 BOM에 보관한다.
- Ollama, Open WebUI, OCR/문서 추출기, Vector DB와 컨테이너 이미지의 버전·라이선스·출처를 함께 검토한다.
- Open WebUI v0.6.6 이후 코드는 별도 Open WebUI License가 적용된다. 사내에서 원래 브랜딩을 그대로 유지하는 표준 사용과, 로고 제거·화이트라벨·브랜딩 변경의 조건이 다르므로 후자는 법무 검토와 필요한 라이선스를 먼저 받는다.
- Docker Desktop은 조직 규모와 사용 목적에 따라 유료 구독이 필요할 수 있다. 이미 설치되어 있어도 회사의 Docker Subscription 적용 여부를 구매·법무 부서가 확인한다.
- 소프트웨어 반입 승인에는 SBOM 또는 최소한 패키지 목록, SHA-256, 취약점 점검 결과, 롤백 버전을 첨부한다.

### 4.4 책임자

| 영역 | 책임 |
|---|---|
| IT/보안 | 패키지 반입, 방화벽, 계정, 로그·백업 정책 |
| 생산기술/품질 | 정답, 문서 최신본, 단위·업무 정의 검증 |
| MES/DB 담당 | 보고용 View, 조회 계정, 공식 집계식 검증 |
| AI 운영 담당 | 모델·프롬프트·색인 버전, 골든셋, 장애 기록 |

### 4.5 이 단계의 산출물

`data-inventory-template.csv`를 복사한 후 다음을 채운다.

- 데이터 소유 부서와 보안 등급
- 사용 승인 여부
- 문서 개정번호·시행일·현재본 여부
- 원본 경로와 SHA-256
- 접근 가능 그룹
- 색인 또는 API 연결 상태

### 4.6 OT 네트워크 배치 게이트

프롬프트의 “PLC 쓰기 금지”는 네트워크 분리를 대신하지 못한다. 업무용 PC나 Docker 호스트가 침해되어도 제어망으로 우회할 수 없도록 다음을 네트워크 수준에서 강제한다.

- AI PC/UI/Vector DB는 기업 IT 또는 공장 정보계(Level 3 상당)에 둔다.
- MES 데이터는 IDMZ 또는 승인된 보고 복제본/View를 통해서만 받는다.
- AI PC에서 Level 0~2의 PLC·DCS·SCADA·안전계장으로 가는 route가 없어야 한다.
- IT망과 제어망 NIC를 동시에 꽂는 dual-homing을 금지한다.
- 방화벽은 출발지·목적지·포트 allowlist 방식으로 필요한 조회 API만 허용한다.
- 네트워크팀이 경로 추적과 방화벽 로그로 제어망 도달 불가를 시험하고 증적을 남긴다.

**완료 게이트:** 데이터 소유자와 IT 보안이 범위·금지 기능·반입 경로를 승인하고, 네트워크팀이 제어망 도달 불가를 확인해야 한다.

---

## 5. 1단계 — PC 사전 점검

PowerShell에서 다음을 실행해 결과를 구축 기록에 저장한다.

```powershell
Get-CimInstance Win32_OperatingSystem |
  Select-Object Caption, Version, BuildNumber

Get-CimInstance Win32_ComputerSystem |
  Select-Object Manufacturer, Model,
    @{Name='RAM_GB'; Expression={[math]::Round($_.TotalPhysicalMemory / 1GB, 1)}}

nvidia-smi

Get-PSDrive -PSProvider FileSystem |
  Select-Object Name,
    @{Name='Free_GB'; Expression={[math]::Round($_.Free / 1GB, 1)}}

Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -in 11434, 3000, 8080 } |
  Select-Object LocalAddress, LocalPort, OwningProcess
```

### 5.1 합격 기준

- Windows 10 22H2 이상
- RTX 5060을 명시 지원하는 회사 승인 NVIDIA WHQL 드라이버. 단순 버전 숫자만 보지 않고 `nvidia-smi`, Ollama CUDA 로그, 실제 GPU 적재 성공으로 판정
- `nvidia-smi`에 RTX 5060과 8 GB VRAM 표시
- 승인된 로컬 드라이브에 최소 25 GB 여유 공간
- RAM 32 GB이며 실행 전 여유 메모리를 가능한 16 GB 이상 확보
- 11434, 3000, 8080 포트를 다른 프로그램이 점유하지 않음

Ollama Windows 문서의 공통 최소 드라이버 숫자가 실제 RTX 5060 지원을 보장하는 것은 아니다. Ollama 공식 지원표에는 RTX 5060이 Compute Capability 12.0으로 명시되어 있으므로, 회사 승인 최신 WHQL 드라이버가 카드를 인식하고 실제 CUDA 적재까지 되는지 확인한다. 화면에서 가용 RAM이 약 14.9 GB였으므로 브라우저, IDE, 그래픽 도구 등 큰 프로그램을 닫고 기준선을 측정한다.

**완료 게이트:** 위 결과와 드라이버 버전을 캡처 또는 텍스트로 변경관리 기록에 남긴다.

---

## 6. 2단계 — 설치 경로와 로컬 전용 환경 설정

### 6.1 폴더 생성

`D:`가 없으면 회사가 승인한 암호화 드라이브로 바꾼다.

```powershell
$LocalLlmRoot = 'D:\LocalLLM'

New-Item -ItemType Directory -Force -Path @(
  $LocalLlmRoot,
  "$LocalLlmRoot\runtime",
  "$LocalLlmRoot\models",
  "$LocalLlmRoot\packages",
  "$LocalLlmRoot\config",
  "$LocalLlmRoot\rag-data",
  "$LocalLlmRoot\backup",
  "$LocalLlmRoot\logs"
) | Out-Null
```

NTFS 권한은 AI 운영 담당자와 서비스 계정만 쓰기 가능하도록 IT가 설정한다. 일반 사용자는 UI를 통해서만 접근하고 모델·설정·원본 폴더의 수정 권한을 갖지 않는다.

### 6.2 사용자 환경변수 설정

단일 사용자 PoC의 시작값이다. 전용 서비스 계정으로 운영하면 같은 값을 해당 계정 또는 사내 서비스 관리 방식으로 설정한다.

```powershell
$Settings = @{
  OLLAMA_MODELS            = 'D:\LocalLLM\models'
  OLLAMA_HOST              = '127.0.0.1:11434'
  OLLAMA_NO_CLOUD          = '1'
  OLLAMA_CONTEXT_LENGTH    = '8192'
  OLLAMA_NUM_PARALLEL      = '1'
  OLLAMA_MAX_LOADED_MODELS = '1'
  OLLAMA_FLASH_ATTENTION   = '1'
  OLLAMA_KV_CACHE_TYPE     = 'q8_0'
}

foreach ($Item in $Settings.GetEnumerator()) {
  [Environment]::SetEnvironmentVariable(
    $Item.Key,
    [string]$Item.Value,
    'User'
  )
  Set-Item -Path "Env:$($Item.Key)" -Value ([string]$Item.Value)
}
```

설정 의미:

- `OLLAMA_HOST=127.0.0.1:11434`: 인증이 없는 Ollama API를 PC 외부에 직접 노출하지 않는다.
- `OLLAMA_NO_CLOUD=1`: Ollama cloud 모델과 web search를 비활성화한다.
- `OLLAMA_NUM_PARALLEL=1`: 병렬 요청으로 컨텍스트 메모리가 배증되지 않게 한다.
- `OLLAMA_MAX_LOADED_MODELS=1`: 8 GB VRAM에 여러 모델이 동시에 올라가지 않게 한다.
- `OLLAMA_FLASH_ATTENTION=1`: 지원 환경에서 컨텍스트 메모리 사용량을 줄인다.
- `OLLAMA_KV_CACHE_TYPE=q8_0`: 기본 f16 KV 캐시의 약 절반 메모리를 사용한다. 실제 공장 골든셋으로 품질을 확인한다.

Windows tray 앱을 쓸 경우 환경변수 설정 후 Ollama를 완전히 종료하고 시작 메뉴에서 다시 실행해야 한다. standalone은 같은 PowerShell에서 `ollama serve`를 새로 실행한다.

`OLLAMA_NO_CLOUD`는 망분리를 대신하지 않는다. 운영 단계에서는 방화벽/VLAN/프록시 정책으로 PC의 불필요한 외부 통신도 차단한다.

---

## 7. 3단계 — Ollama 설치

### 7.1 권장: 버전 고정 standalone

회사 운영은 공식 `ollama-windows-amd64.zip`을 버전별 폴더에 두는 방식을 권장한다. Windows GUI 설치판은 공식 문서상 업데이트를 자동 다운로드하므로 변경통제와 롤백에는 standalone이 더 단순하다.

2026-08-19에 확인한 기준선:

| 항목 | 값 |
|---|---|
| Ollama | `0.32.14` |
| standalone ZIP SHA-256 | `5ae5bca5f0d297f5e35665e01db399a69a8eac3f8fad89cd9d2531fd495c9457` |
| 공식 릴리스 | `https://github.com/ollama/ollama/releases/tag/v0.32.14` |

실제 반입 시점에는 IT가 선택한 승인 버전의 공식 `sha256sum.txt`와 다시 비교한다. 위 값을 다른 버전에 재사용하면 안 된다.

승인된 인터넷 구간 PC에서 ZIP과 체크섬을 내려받고, 공장 데이터는 그 PC로 가져가지 않는다. 공장 PC로 반입한 후:

```powershell
$Package = 'E:\AI-Transfer\ollama-windows-amd64.zip'
$ExpectedHash = '5ae5bca5f0d297f5e35665e01db399a69a8eac3f8fad89cd9d2531fd495c9457'
$ActualHash = (Get-FileHash -LiteralPath $Package -Algorithm SHA256).Hash.ToLowerInvariant()

if ($ActualHash -ne $ExpectedHash) {
  throw "Ollama 패키지 SHA-256 불일치: $ActualHash"
}

$RuntimeDir = 'D:\LocalLLM\runtime\0.32.14'
New-Item -ItemType Directory -Force -Path $RuntimeDir | Out-Null
Expand-Archive -LiteralPath $Package -DestinationPath $RuntimeDir -Force

& "$RuntimeDir\ollama.exe" --version
```

서버는 검증 기간에는 보이는 PowerShell 창에서 수동 실행한다.

```powershell
& 'D:\LocalLLM\runtime\0.32.14\ollama.exe' serve
```

standalone은 기본 PATH에 등록되지 않는다. `serve`가 실행 중인 첫 창은 그대로 두고, 이후 명령을 실행할 두 번째 PowerShell을 연다. 새 PowerShell을 열 때마다 다음 변수와 세션 alias를 먼저 만든다. 또는 IT가 승인한 방식으로 runtime 폴더를 PATH에 등록한다. 이후 이 문서의 짧은 `ollama ...` 예시는 이 alias가 설정되었다고 가정한다.

```powershell
$Ollama = 'D:\LocalLLM\runtime\0.32.14\ollama.exe'
Set-Alias -Name ollama -Value $Ollama

& $Ollama --version
```

로그인 자동 실행 또는 Windows 서비스 등록은 모델 검증 후 IT의 작업 스케줄러/서비스 표준으로 처리한다.

### 7.2 빠른 PoC 대안: Windows 설치판

- 공식 Windows 다운로드에서 `OllamaSetup.exe`를 받는다.
- `Get-AuthenticodeSignature`로 `Valid`와 Ollama Inc. 서명을 확인한다.
- 설치 후 `ollama --version`을 기록한다.
- tray 앱을 완전히 종료한 뒤 6.2의 환경변수를 적용하고 다시 실행한다.
- 운영 전에는 자동 업데이트가 변경통제 정책에 맞는지 반드시 결정한다.

### 7.3 서버 확인

```powershell
Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:11434/api/version'

Get-NetTCPConnection -State Listen -LocalPort 11434 |
  Select-Object LocalAddress, LocalPort, OwningProcess
```

리스닝 주소는 `127.0.0.1`이어야 한다. `0.0.0.0` 또는 공장 PC의 LAN IP가 나오면 다음 단계로 넘어가지 않는다.

**완료 게이트:** 버전, 런타임 해시, 실행 경로, 11434의 리스닝 주소를 기록한다.

---

## 8. 4단계 — Qwen3-8B Q4_K_M 반입

두 방식 중 하나만 표준으로 정한다.

### 8.1 인터넷 연결이 승인된 PoC PC

```powershell
ollama pull qwen3:8b-q4_K_M
ollama show qwen3:8b-q4_K_M
ollama list
```

2026-08-19 공식 Ollama 기준:

| 항목 | 기대값 |
|---|---|
| 모델 | `qwen3:8b-q4_K_M` |
| 파라미터 | 8.19B |
| 양자화 | `Q4_K_M` |
| 크기 | 약 5.2 GB |
| manifest digest | `500a1f067a9f782620b40bee6f7b0c89e17ae61f686b92c24933e4ca4b2b8b41` |
| 라이선스 | Apache-2.0 |

API로 정확히 확인한다.

```powershell
$ExpectedDigest = '500a1f067a9f782620b40bee6f7b0c89e17ae61f686b92c24933e4ca4b2b8b41'
$Tags = Invoke-RestMethod -Method Get -Uri 'http://127.0.0.1:11434/api/tags'
$BaseModel = $Tags.models | Where-Object { $_.model -eq 'qwen3:8b-q4_K_M' }

if (-not $BaseModel) { throw '요청한 Qwen 모델이 없습니다.' }
if ($BaseModel.digest -ne $ExpectedDigest) {
  throw "모델 digest 불일치: $($BaseModel.digest)"
}
if ($BaseModel.details.quantization_level -ne 'Q4_K_M') {
  throw "양자화 불일치: $($BaseModel.details.quantization_level)"
}

$BaseModel | Select-Object model, digest, size,
  @{Name='parameters'; Expression={$_.details.parameter_size}},
  @{Name='quantization'; Expression={$_.details.quantization_level}} |
  Format-List
```

모델이 공식 저장소에서 갱신되었다면 무조건 실패로 단정하지 말고, 변경관리 절차에서 새 digest와 릴리스 내용을 승인한 뒤 기준값을 갱신한다.

### 8.2 완전 오프라인: 공식 GGUF 한 파일 반입

승인된 인터넷 구간 PC에서 Qwen 공식 저장소의 다음 파일만 확보한다.

- 저장소: `Qwen/Qwen3-8B-GGUF`
- 파일: `Qwen3-8B-Q4_K_M.gguf`
- 2026-08-19 확인 SHA-256: `d98cdcbd03e17ce47681435b5150e34c1417f50b5c0019dd560e4882c5745785`
- 크기: 약 5.03 GB

5 GB 파일은 FAT32에 담을 수 없다. 회사가 승인한 NTFS 또는 exFAT 매체를 사용하고, 반입 전후 SHA-256을 비교한다.

```powershell
$Gguf = 'D:\LocalLLM\packages\Qwen3-8B-Q4_K_M.gguf'
$ExpectedHash = 'd98cdcbd03e17ce47681435b5150e34c1417f50b5c0019dd560e4882c5745785'
$ActualHash = (Get-FileHash -LiteralPath $Gguf -Algorithm SHA256).Hash.ToLowerInvariant()

if ($ActualHash -ne $ExpectedHash) {
  throw "Qwen GGUF SHA-256 불일치: $ActualHash"
}
```

`Modelfile.offline.example`의 `FROM` 경로를 실제 위치로 바꾼 뒤 생성한다.

```powershell
$OfflineModelfile = (Resolve-Path .\Modelfile.offline.example).Path
ollama create factory-qwen3-8b -f $OfflineModelfile
```

### 8.3 완전 오프라인 권장: Ollama 모델 저장소 패키지

엄격한 망분리에서는 생성 모델과 임베딩 모델을 한 번에 준비한다. 승인된 staging PC에서 공장 데이터 없이, 고정 Ollama runtime과 빈 모델 폴더를 사용한다.

먼저 7.1에서 검증한 runtime을 `$PackageRoot\runtime\0.32.14`에 그대로 복사한다.

첫 번째 PowerShell:

```powershell
$PackageRoot = 'D:\AI-Transfer\ollama-models-20260819'
$Ollama = "$PackageRoot\runtime\0.32.14\ollama.exe"
$env:OLLAMA_MODELS = "$PackageRoot\models"
$env:OLLAMA_HOST = '127.0.0.1:11435'

New-Item -ItemType Directory -Force -Path $env:OLLAMA_MODELS | Out-Null
& $Ollama serve
```

서버 창을 유지하고 두 번째 PowerShell에서 같은 변수를 다시 선언한 뒤 실행한다.

```powershell
$PackageRoot = 'D:\AI-Transfer\ollama-models-20260819'
$Ollama = "$PackageRoot\runtime\0.32.14\ollama.exe"
$env:OLLAMA_MODELS = "$PackageRoot\models"
$env:OLLAMA_HOST = '127.0.0.1:11435'

& $Ollama pull qwen3:8b-q4_K_M
& $Ollama pull qwen3-embedding:0.6b

$Tags = Invoke-RestMethod 'http://127.0.0.1:11435/api/tags'
$Tags.models | Select-Object model, digest, size,
  @{Name='quantization'; Expression={$_.details.quantization_level}} |
  Format-Table -AutoSize
```

결과에 생성 모델 `Q4_K_M`과 임베딩 모델 `qwen3-embedding:0.6b`가 모두 있어야 한다. 출력 digest를 BOM에 기록한다. 첫 번째 창을 `Ctrl+C`로 종료한 뒤 `models\blobs`와 `models\manifests`를 포함한 전체 패키지의 SHA-256 목록을 만든다.

```powershell
$PackageRoot = (Resolve-Path 'D:\AI-Transfer\ollama-models-20260819').Path
$HashCsv = Join-Path $PackageRoot 'SHA256SUMS.csv'
$Prefix = $PackageRoot.TrimEnd('\') + '\'

Get-ChildItem -LiteralPath $PackageRoot -File -Recurse |
  Where-Object { $_.FullName -ne $HashCsv } |
  ForEach-Object {
    [PSCustomObject]@{
      RelativePath = $_.FullName.Substring($Prefix.Length)
      Length = $_.Length
      SHA256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash
    }
  } |
  Export-Csv -LiteralPath $HashCsv -NoTypeInformation -Encoding UTF8

Get-FileHash -LiteralPath $HashCsv -Algorithm SHA256
```

CSV 자체의 SHA-256은 별도 승인 기록에 보관한다. 공장 PC에서 파일별 해시를 다시 계산해 모두 일치한 뒤, 초기의 빈 `D:\LocalLLM\models`에 삭제 옵션 없이 복사한다.

```powershell
robocopy `
  'E:\AI-Transfer\ollama-models-20260819\models' `
  'D:\LocalLLM\models' `
  /E /COPY:DAT /DCOPY:DAT /J /R:2 /W:2

if ($LASTEXITCODE -ge 8) {
  throw "모델 저장소 복사 실패: robocopy exit code $LASTEXITCODE"
}

ollama list
```

`/MIR`는 대상 파일을 삭제할 수 있으므로 사용하지 않는다. 8.2의 단일 GGUF 방식으로 생성 모델을 반입하더라도, 임베딩은 위 절차의 깨끗한 저장소에 `qwen3-embedding:0.6b`만 받아 같은 방식으로 반입한다.

OCR을 사용할 경우 `kor`·`eng` 언어팩, OCR 엔진 또는 컨테이너 이미지, PDF parser, Python wheel/런타임, 각 라이선스·버전·SHA-256도 같은 BOM에 넣는다. 인터넷이 끊긴 뒤 추가 다운로드가 발생하지 않는지 staging에서 먼저 재현한다.

### 8.4 반입 패키지 관리

- 런타임, 모델, Modelfile, 라이선스, SHA-256 목록을 하나의 BOM으로 보관한다.
- 운영 PC에서 `latest` 태그를 사용하지 않는다.
- 모델을 갱신할 때 기존 이름을 덮어쓰지 않고 날짜 또는 승인번호가 붙은 새 이름을 만든다.
- `%USERPROFILE%\.ollama` 전체를 외부로 반출하지 않는다. 개인키, 로그, 질문 데이터가 섞일 수 있다.

**완료 게이트:** 런타임과 모델의 출처·버전·해시·라이선스가 자산대장에 기록되어야 한다.

---

## 9. 5단계 — 8K 사내 모델 생성

인터넷 연결 방식에서는 이 폴더의 `Modelfile`을 사용한다.

```powershell
Set-Location '<이 자료가 있는 폴더>'
$Modelfile = (Resolve-Path .\Modelfile).Path
ollama create factory-qwen3-8b -f $Modelfile
ollama show --modelfile factory-qwen3-8b
```

`system-prompt-ko.txt`를 canonical 정책 원본으로 사용한다. 제공된 온라인·오프라인 Modelfile의 SYSTEM 내용은 이 원본과 맞춰 두었으며, 변경 시 세 파일을 함께 갱신하고 해시를 BOM에 남긴다.

```powershell
Get-FileHash .\system-prompt-ko.txt -Algorithm SHA256
Get-FileHash .\Modelfile -Algorithm SHA256
Get-FileHash .\Modelfile.offline.example -Algorithm SHA256
```

설정값은 시작점이다.

- `num_ctx 8192`: 8K 컨텍스트
- `num_predict 1024`: 일반 답변이 지나치게 길어지는 것을 제한
- `temperature 0.3`: 사실 조회 응답의 변동을 줄이기 위한 내부 시작값
- `top_p 0.8`, `top_k 20`: 후보 토큰 범위 제한
- `SYSTEM`: 근거 부족 시 거절, 출처·단위·기준시각 표시, 쓰기 기능 금지

Qwen 공식 권장 샘플링과 다른 내부 시작값은 반드시 골든셋으로 비교한다. 반복·언어 혼합 문제가 나타나면 temperature 0.7 구성도 별도 이름으로 만들어 A/B 시험하며, temperature 0의 greedy decoding은 피한다.

중요: `think=false`는 Modelfile의 영구 파라미터가 아니다. 호출할 때 설정한다.

- API: 최상위 `"think": false`
- CLI 단발 실행: `--think=false`
- 대화형 CLI: `/set nothink`
- `--hidethinking`은 추론을 숨길 뿐 연산을 끄지 않는다.

**완료 게이트:** `ollama list`에 `factory-qwen3-8b`가 있고, `ollama show --modelfile`에 8K와 시스템 정책이 보인다.

---

## 10. 6단계 — 한국어·GPU·성능 기준선 검증

### 10.1 CLI 스모크 테스트

```powershell
ollama run factory-qwen3-8b --think=false `
  '사내 근거가 제공되지 않은 A공장 어제 생산량을 물으면 어떻게 답해야 하는지 한 문장으로 말해.'
```

기대 결과는 값을 만들어 내지 않고 확인 가능한 근거가 없다고 답하는 것이다.

### 10.2 API 테스트

```powershell
$Body = @{
  model = 'factory-qwen3-8b'
  messages = @(
    @{
      role = 'user'
      content = '근거가 없으면 추측하지 말고 한국어로 짧게 답해. A공장 L1의 어제 생산량은?'
    }
  )
  think = $false
  stream = $false
  keep_alive = '5m'
  options = @{
    num_ctx = 8192
    num_predict = 512
    temperature = 0.3
  }
} | ConvertTo-Json -Depth 10

$Response = Invoke-RestMethod `
  -Method Post `
  -Uri 'http://127.0.0.1:11434/api/chat' `
  -ContentType 'application/json; charset=utf-8' `
  -Body ([System.Text.Encoding]::UTF8.GetBytes($Body))

$Response.message.content

if ($Response.eval_duration -gt 0) {
  $TokensPerSecond = $Response.eval_count / ($Response.eval_duration / 1e9)
  '생성 속도: {0:N1} tokens/s' -f $TokensPerSecond
}
```

### 10.3 GPU와 컨텍스트 확인

API 호출 직후 실행한다.

```powershell
ollama ps

nvidia-smi `
  --query-gpu=name,driver_version,memory.total,memory.used,utilization.gpu `
  --format=csv
```

합격 기준:

- 모델 이름이 `factory-qwen3-8b`
- `CONTEXT`가 `8192`
- `PROCESSOR`가 가능하면 `100% GPU`
- 답변에 불필요한 thinking 내용이 없음
- 모델이 제공되지 않은 공장 수치를 만들어내지 않음
- 같은 질문을 5회 반복해 중단·오류가 없음

8 GB VRAM은 Windows 화면 출력에도 사용된다. CPU/GPU 혼합 또는 OOM이 발생하면 다음 순서로 조정한다.

1. 브라우저·그래픽 프로그램 종료
2. 병렬 요청과 동시 적재 모델이 1인지 확인
3. Flash Attention과 q8 KV 캐시 적용 확인
4. 답변 길이를 512로 낮춤
5. 그래도 불안정하면 컨텍스트를 4096으로 낮춰 별도 모델을 만들고 비교

속도는 단일 짧은 질문이 아니라 실제 문서 질문 20개 이상으로 p50과 p95를 기록한다.

**완료 게이트:** GPU 적재, 컨텍스트, 한국어 답변, 거절 동작, 실측 속도가 검수표에 기록된다.

---

## 11. 7단계 — 로컬 UI 설치

UI가 없어도 Ollama API 검증은 가능하다. 현업 사용과 문서 RAG에는 인증·권한·영구 저장 기능을 가진 UI가 필요하다. PoC 예시는 Open WebUI이며, 다른 사내 포털을 사용해도 보안 원칙은 같다.

### 11.1 Windows native Ollama + Docker Open WebUI

화면에는 Docker가 설치되었지만 실행 중이 아니므로 먼저 Docker Desktop 시작과 사내 사용 승인을 확인한다.

운영에서는 `:main`이나 `:latest` 대신 승인된 고정 버전 `vX.Y.Z`를 사용한다.

```powershell
$OpenWebUiVersion = 'vX.Y.Z'  # IT가 시험·승인한 실제 버전으로 교체
$ImageTag = "ghcr.io/open-webui/open-webui:${OpenWebUiVersion}"

docker pull $ImageTag
$ApprovedImageId = (docker image inspect --format '{{.Id}}' $ImageTag).Trim()
$ApprovedImageId  # BOM과 변경관리 티켓에 기록
```

완전 오프라인이면 staging PC와 공장 PC 각각에서 변수를 새로 선언한다. staging에서 저장한 tar의 SHA-256과 image ID를 모두 승인 기록에 남긴다.

```powershell
# staging PC
$OpenWebUiVersion = 'vX.Y.Z'
$ImageTag = "ghcr.io/open-webui/open-webui:${OpenWebUiVersion}"
docker pull $ImageTag
$ApprovedImageId = (docker image inspect --format '{{.Id}}' $ImageTag).Trim()
docker save --output open-webui-approved.tar $ImageTag
Get-FileHash .\open-webui-approved.tar -Algorithm SHA256
$ApprovedImageId
```

공장 PC에서는 아래 두 placeholder를 승인 기록의 실제 값으로 교체한다.

```powershell
# 공장 PC
$OpenWebUiVersion = 'vX.Y.Z'
$ImageTag = "ghcr.io/open-webui/open-webui:${OpenWebUiVersion}"
$ApprovedImageId = 'sha256:<승인된-image-id>'
$ExpectedTarHash = '<승인된-tar-sha256>'
$TarPath = 'E:\AI-Transfer\open-webui-approved.tar'

$ActualTarHash = (Get-FileHash $TarPath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($ActualTarHash -ne $ExpectedTarHash.ToLowerInvariant()) {
  throw "Open WebUI tar SHA-256 불일치: $ActualTarHash"
}

docker load --input $TarPath
$LoadedImageId = (docker image inspect --format '{{.Id}}' $ImageTag).Trim()
if ($LoadedImageId -ne $ApprovedImageId) {
  throw "Open WebUI image ID 불일치: $LoadedImageId"
}
```

연결 또는 오프라인 준비가 끝나 `$ApprovedImageId`가 검증된 같은 PowerShell에서 실행한다. `OFFLINE_MODE`는 필요한 모델·임베딩·OCR 자산을 staging에서 준비한 엄격한 망분리 환경만 `true`로 둔다.

```powershell
$OfflineMode = 'true'  # 인터넷 허용 검증 단계는 'false'

docker run -d `
  --name open-webui `
  --restart unless-stopped `
  -p 127.0.0.1:3000:8080 `
  --add-host=host.docker.internal:host-gateway `
  -e OLLAMA_BASE_URL=http://host.docker.internal:11434 `
  -e OFFLINE_MODE=$OfflineMode `
  -e DEFAULT_USER_ROLE=pending `
  -e ENABLE_PASSWORD_VALIDATION=true `
  -e ENABLE_COMMUNITY_SHARING=false `
  -e ENABLE_ADMIN_EXPORT=false `
  -e ENABLE_ADMIN_CHAT_ACCESS=false `
  -e ENABLE_DIRECT_CONNECTIONS=false `
  -e ENABLE_OPENAI_API_PASSTHROUGH=false `
  -e BYPASS_MODEL_ACCESS_CONTROL=false `
  -e USER_PERMISSIONS_WORKSPACE_MODELS_ACCESS=false `
  -e USER_PERMISSIONS_WORKSPACE_KNOWLEDGE_ACCESS=false `
  -e USER_PERMISSIONS_WORKSPACE_TOOLS_ACCESS=false `
  -e USER_PERMISSIONS_WORKSPACE_PROMPTS_ACCESS=false `
  -e ENABLE_CODE_EXECUTION=false `
  -e ENABLE_CODE_INTERPRETER=false `
  -e ENABLE_PIP_INSTALL_FRONTMATTER_REQUIREMENTS=false `
  -e ENABLE_RAG_LOCAL_WEB_FETCH=false `
  -e AUDIT_LOG_LEVEL=METADATA `
  -e ENABLE_AUDIT_LOGS_FILE=true `
  -e AUDIT_LOGS_FILE_PATH=/app/backend/data/audit.log `
  -v open-webui:/app/backend/data `
  $ApprovedImageId
```

브라우저에서 `http://127.0.0.1:3000`을 연다.

필수 조치:

- 첫 계정을 로컬 관리자로 생성한 후 신규 가입을 비활성화한다.
- `Workspace → Models → factory-qwen3-8b → Advanced Parameters`에서 Ollama `think`를 **Off**로 고정한다. 이 항목이 없는 구버전은 업무용으로 쓰지 말고, 호출 미들웨어가 최상위 `think:false`를 넣는지 패킷/로그로 검증한다.
- 같은 화면의 `num_ctx`는 비워 서버·Modelfile의 8192를 따르게 하거나 명시적으로 8192로 둔다. 토글 시 자동 입력될 수 있는 2048을 그대로 사용하지 않는다.
- 일반 사용자의 Models, Knowledge, Tools 편집 권한을 제거한다.
- Web Search, 외부 API, Community Sharing, Direct Connections를 비활성화한다.
- 사용자 Memory와 불필요한 Builtin Tools를 비활성화해 승인되지 않은 대화 내용이나 도구가 문맥에 섞이지 않게 한다.
- 단일 인스턴스의 `WEBUI_SECRET_KEY`는 영구 데이터 볼륨에 자동 생성·보존된다. 볼륨을 백업한다. 다중 인스턴스는 secret manager에서 동일 키를 주입하고 명령행·문서에 평문을 남기지 않는다.
- 외부망 차단 전에 이미지, 모델, 임베딩, OCR 자산을 모두 확보한다.
- 오프라인 모드는 필요한 자산을 미리 내려받은 다음 켠다. 그렇지 않으면 RAG 초기화가 실패할 수 있다.
- Open WebUI 브랜딩을 제거·축소·교체하지 않는다. 회사 UI로 화이트라벨링하려면 적용 버전의 LICENSE를 법무가 검토하고 필요한 권한을 먼저 확보한다.

Docker에서 호스트 Ollama 연결이 실패해도 `OLLAMA_HOST=0.0.0.0`으로 바꾸어 11434를 LAN에 노출하지 않는다. 먼저 호스트에서 API 응답과 Docker Desktop의 `host.docker.internal` 연결을 확인하고, 해결되지 않으면 IT가 승인한 로컬 reverse proxy 또는 같은 호스트의 다른 배치 방식을 사용한다.

### 11.2 UI 기능·보안 검증

컨테이너에서 호스트 Ollama에 실제로 연결되는지 확인한다.

```powershell
docker exec open-webui python -c `
  "import urllib.request; print(urllib.request.urlopen('http://host.docker.internal:11434/api/version').read().decode())"

docker inspect --format '{{.Image}}' open-webui
docker logs --tail 100 open-webui
```

다음 검증은 화면과 운영 로그를 함께 확인한다.

1. UI에서 `factory-qwen3-8b`를 선택해 한국어 질문이 성공한다.
2. 모델 Advanced Parameters의 `think=Off`, `num_ctx=8192`를 캡처한다.
3. UI 질문 직후 `ollama ps`에서 CONTEXT 8192와 GPU 적재를 확인한다.
4. UI에 외부 모델·Web Search·Direct Connections가 보이지 않거나 실행되지 않는다.
5. 네트워크팀이 컨테이너/호스트의 비승인 외부 egress 실패를 방화벽 로그로 확인한다.
6. `docker restart open-webui` 후 같은 계정·모델 설정·Knowledge가 남고 실제 질의가 다시 성공한다.
7. 다른 PC에서 11434 직접 연결은 실패한다.

이미지 ID, 설정 화면, 재시작 후 질의 결과, 외부 통신 차단 증적을 구축 기록에 붙인다.

### 11.3 LAN 다중 사용자에게 열 때

위 명령은 UI도 loopback에만 열기 때문에 다른 PC에서는 접근할 수 없다. LAN 공개는 별도 운영 설계다.

- Open WebUI만 HTTPS reverse proxy 뒤에 둔다.
- AD/SSO 또는 사내 계정 연동, 그룹 권한, 세션 정책을 적용한다.
- 방화벽에서 승인 사용자 망만 허용한다.
- Ollama 11434는 계속 직접 공개하지 않는다.
- 회사 PC가 아니라 전용 내부 서버로 옮길지 먼저 검토한다.

**완료 게이트:** 승인 image ID로 실행되고, 컨테이너→Ollama 실제 질의, 8K/no-thinking, 비승인 egress 차단, 재시작 후 복구가 모두 통과하며 외부 PC에서 11434 직접 접속이 실패해야 한다.

---

## 12. 8단계 — 문서 RAG 구축

### 12.1 임베딩 모델 설치

```powershell
ollama pull qwen3-embedding:0.6b
```

이 명령은 인터넷 연결이 승인된 PC에서만 사용한다. 완전 오프라인 PC는 8.3에서 반입한 manifest/blob을 사용하며 운영 PC에서 `pull`하지 않는다.

간단한 API 확인:

```powershell
$EmbedBody = @{
  model = 'qwen3-embedding:0.6b'
  input = 'L1 라인 설비 E-101의 알람 코드 A017 조치 방법'
} | ConvertTo-Json

$Embed = Invoke-RestMethod `
  -Method Post `
  -Uri 'http://127.0.0.1:11434/api/embed' `
  -ContentType 'application/json; charset=utf-8' `
  -Body ([System.Text.Encoding]::UTF8.GetBytes($EmbedBody))

$Embed.embeddings.Count
```

생성 모델과 임베딩 모델이 동시에 올라가 OOM이 발생하면 색인 시간을 사용자 질의 시간과 분리한다.

### 12.2 문서 정리

문서마다 최소한 다음 필드를 관리한다.

```text
doc_id / 문서명 / 문서종류 / 공장 / 라인 / 설비
담당부서 / 보안등급 / 접근그룹
개정번호 / 시행일 / 현재본 여부
원본경로 / SHA-256 / 색인일시
```

규칙:

- 승인된 최신본만 운영 Knowledge에 넣는다.
- 폐기본과 개정 전 문서는 Archive로 분리하거나 제외한다.
- 같은 문서의 PDF와 DOCX를 중복 색인하지 않는다.
- 매크로·실행 파일·암호화 파일은 제외한다.
- MES 엑셀 덤프처럼 계속 바뀌는 수치는 RAG에 넣지 않는다.
- KPI 정의서, 코드표, 데이터 사전은 RAG에 넣을 수 있다.
- 파일명은 `공장_라인_설비_문서번호_Rev_시행일`처럼 표준화한다.

### 12.3 메타데이터 전처리와 인용 보존

`data-inventory-template.csv`를 작성하는 것만으로 그 값이 Open WebUI 청크에 자동 연결되지는 않는다. 색인 전에 전처리기가 각 페이지 또는 청크에 아래 필드를 넣어야 한다.

```text
doc_id: SOP-A-L1-001
title: L1 프레스 작업표준서
revision: Rev.4
effective_date: 2026-07-01
page: 12
source_uri: https://internal-dms/.../SOP-A-L1-001
permission_group: A공장-생산기술
current_version: true
---
해당 페이지의 승인된 추출 텍스트
```

구현 규칙:

1. 원본 DMS/문서대장과 inventory의 `doc_id`를 일대일로 맞춘다.
2. PDF 페이지 경계를 유지한 텍스트 또는 페이지별 Markdown을 만든다.
3. 청크를 나눌 때 위 메타데이터를 각 청크에 복제한다.
4. 검색 결과가 모델에 전달될 때 `title/revision/effective_date/page/source_uri`를 함께 전달한다.
5. `permission_group`은 표시용 문자가 아니라 검색 전에 서버가 강제하는 ACL 필터로 사용한다.
6. 문서 개정 시 이전 청크를 삭제·격리하고 새 SHA-256으로 전체 재색인한다.
7. 답변 인용을 눌러 실제 승인 원본의 동일 페이지가 열리는지 표본 검증한다.

사용 중인 Open WebUI 고정 버전이 페이지·개정·ACL을 검색 결과까지 보존하지 못하면 stock 업로드만으로 운영하지 않는다. 권한 필터와 메타데이터를 강제하는 외부 retrieval API/Vector DB로 전환한 뒤 Open WebUI에는 승인된 검색 결과만 돌려준다.

### 12.4 PDF·OCR 품질

Qwen3-8B는 텍스트 모델이므로 도면과 스캔 이미지를 그대로 이해하지 못한다.

1. 먼저 일반 텍스트 추출을 시도한다.
2. 추출 문자열이 거의 없는 페이지만 한국어+영어 OCR을 적용한다.
3. 페이지 경계를 텍스트에 유지한다.
4. 품번, 소수점, `O/0`, `I/1`, `mm`, `℃`, `%`를 집중 검수한다.
5. 샘플 20페이지 이상을 원본과 사람이 대조한다.
6. 안전·품질 핵심 표는 Markdown 또는 CSV로 별도 정규화한다.
7. 오류가 큰 문서는 자동 답변 대상에서 격리한다.

### 12.5 Knowledge 분리와 권한

한 개의 거대한 Knowledge를 만들지 않는다.

```text
KB-공통-안전규정
KB-A공장-생산
KB-A공장-보전
KB-A공장-품질
KB-설비-E101-정비
```

- 권한 경계가 다르면 Knowledge 자체를 분리한다.
- 일반 사용자는 Read만 갖는다.
- 문서 소유 부서만 Write를 갖는다.
- 청크 단위 권한이 필요하면 외부 검색 API가 사용자 ACL을 먼저 적용한 뒤 검색한다.
- 메타데이터 필터만을 보안 경계로 신뢰하지 않는다.

### 12.6 RAG 시작값

Open WebUI의 Documents/Knowledge 설정 명칭은 버전에 따라 조금 다를 수 있다.

| 항목 | PoC 시작값 |
|---|---|
| Embedding Engine | Ollama |
| Embedding Model | `qwen3-embedding:0.6b` |
| Splitter | Token |
| Markdown Header Splitting | On |
| Chunk Size | 1,000 tokens |
| Chunk Overlap | 100 tokens |
| Top K | 3 |
| Hybrid Search | On |
| Full Context | Off |
| Reranker | 처음에는 Off |
| Agentic Knowledge Tool | 처음에는 Off |

8K 컨텍스트에서 1,000 tokens × Top 3이면 검색 문맥이 약 3K라 시스템 프롬프트·질문·답변 공간이 남는다. 설비코드·품번·알람코드는 의미 검색만으로 놓칠 수 있으므로 BM25 키워드와 벡터 검색을 함께 쓰는 Hybrid Search를 권장한다.

임베딩 모델, 차원, 청킹 설정을 바꾸면 기존 Knowledge 전체를 재색인한다. 서로 다른 임베딩 모델의 벡터를 섞지 않는다.

### 12.7 문서 답변 합격 예

```text
결과:
A017은 안전문을 닫고 인터록 센서 상태를 확인한 뒤 지정된 복구 절차를 수행합니다.

근거:
- E-101 설비 장애조치서, Rev.4, 2026-07-01, 12쪽

확인 필요 사항:
센서 교체가 필요하면 보전 담당 승인 절차를 따르십시오.
```

출처 문서·개정·페이지가 없으면 내부 사실 답변을 완료한 것으로 보지 않는다.

**완료 게이트:** 최신본, 정확 문자열, 표 수치, 자료 없음, 충돌 문서, 권한 질문을 포함한 문서 골든셋을 통과해야 한다.

---

## 13. 9단계 — MES/ERP 실시간 수치 연계

### 13.1 원칙

LLM이나 Open WebUI를 MES 운영 테이블에 직접 연결하지 않는다. DB 담당자가 별도 복제 DB 또는 보고용 View를 만들고, 작은 조회 API가 고정 함수만 제공한다.

```text
질문
  ▼
허용된 함수 선택
  ▼
라인·기간·교대·지표 allowlist 검증
  ▼
파라미터 바인딩된 고정 SQL/저장 프로시저
  ▼
조회 전용 보고 View
  ▼
구조화 JSON + 기준시각 + 단위
  ▼
Qwen이 한국어로 설명
```

### 13.2 사용자 인증과 데이터 권한

UI 로그인만으로 MES 권한이 자동 전달된다고 가정하면 안 된다. Open WebUI가 하나의 공용 API 키로 도구를 호출하면 모든 UI 사용자가 같은 조회 범위를 가질 수 있다.

- 조회 API 또는 앞단 gateway가 SSO/OIDC access token의 서명·issuer·audience·만료를 검증하거나 승인된 mTLS 주체를 검증한다.
- API는 검증된 주체를 사내 그룹·공장·라인·KPI allowlist에 서버 측에서 매핑한다.
- 모델이 인수로 보낸 `user_id`, 부서, 권한 그룹은 인증 근거로 신뢰하지 않는다.
- 브라우저나 모델 문맥에 DB 비밀번호·공용 관리자 토큰을 넣지 않는다.
- 단일 사용자 PoC에서 주체 전달이 아직 없으면 별도 API credential 자체를 한 사용자·한 라인·몇 개 KPI에 고정하고 다중 사용자를 받지 않는다.
- 다중 사용자 전환 시 per-user delegated token 또는 서버가 검증한 그룹별 credential을 사용한다. 하나의 광범위한 service token 공유를 금지한다.
- API ACL을 통과한 뒤에도 DB 계정은 보고용 View SELECT만 가져 이중 방어한다.
- 감사로그의 사용자 ID는 검증된 토큰/인증서에서 얻고, 모델이 생성한 문자열을 기록 주체로 사용하지 않는다.

권한 검수에는 정상 사용자, 사용자 ID 위조, 타 공장·타 라인, 권한 없는 KPI, 만료 토큰, 공용 키 재사용을 포함한다.

### 13.3 보고용 View 예

```text
llm_ro.v_production_hourly
llm_ro.v_defect_summary
llm_ro.v_equipment_alarm
llm_ro.v_work_order_status
```

View 설계 기준:

- 개인정보·원가·고객정보 열 제거
- 공식 리포트와 동일한 계산식 사용
- 원본 이벤트보다 시간·교대 단위 집계를 우선
- `Asia/Seoul` 시간대 명시
- 데이터 갱신시각 포함
- 조회 기간과 반환 행 수 제한

DB 계정에는 필요한 View의 `SELECT`만 준다. `db_owner`, 광범위한 `db_datareader`, DML/DDL, `WITH GRANT OPTION`을 주지 않는다. 다른 역할과 `PUBLIC`을 통해 추가 권한이 생기지 않았는지도 점검한다.

### 13.4 금지 도구와 허용 도구

금지:

```text
run_sql(sql_text)
execute_query(user_question)
```

허용:

```text
get_production_summary(line_id, start_at, end_at, shift)
get_defect_rate(line_id, product_code, start_at, end_at)
get_equipment_alarm(equipment_id, start_at, end_at, severity)
get_work_order_status(work_order_no)
```

조회 API는 다음을 강제한다.

- 라인, 설비, 교대, 지표 allowlist
- 시작·종료 순서와 최대 기간 검증: 예시 31일
- 최대 행 수: 예시 500행
- DB timeout: 예시 5~10초
- 작은 연결 풀: 예시 2~5개
- 모든 값의 파라미터 바인딩
- API와 DB 계정 모두 읽기 전용
- 요청자, 함수 ID, 정규화한 필터, 행 수, 지연, 성공 여부 기록
- 연결 문자열, 비밀번호, 민감 원문은 로그에서 제외

세미콜론이나 SQL 키워드 차단은 보안 대책이 아니다. 사용자가 SQL 문자열 자체를 전달할 수 없는 계약으로 만든다.

### 13.5 API 응답 계약 예

```json
{
  "report_id": "production_summary_v1",
  "as_of": "2026-08-19T14:05:00+09:00",
  "timezone": "Asia/Seoul",
  "filters": {
    "plant_id": "A",
    "line_id": "L2",
    "start_at": "2026-08-19T08:00:00+09:00",
    "end_at": "2026-08-19T14:00:00+09:00",
    "shift": "DAY"
  },
  "unit": "EA",
  "rows": [
    {
      "planned_qty": 1000,
      "good_qty": 942,
      "defect_qty": 18
    }
  ],
  "source": "MES reporting view"
}
```

비율과 집계는 가능한 한 DB/API에서 결정론적으로 계산한다. LLM이 원시 행을 보고 공식 KPI를 임의 계산하게 하지 않는다.

### 13.6 통합 순서

1. 공식 리포트와 View 결과를 SQL 수준에서 비교한다.
2. 조회 API 단위 테스트에서 허용·거절 조건을 검증한다.
3. Qwen 없이 API JSON과 공식 리포트를 비교한다.
4. UI에 OpenAPI 조회 도구를 연결한다.
5. Qwen이 필요한 조건이 빠졌을 때 먼저 확인 질문을 하는지 본다.
6. Qwen의 최종 답변에 기간·라인·교대·단위·기준시각이 표시되는지 본다.
7. 수정·삭제·과도한 기간·무권한 라인 요청이 모두 차단되는지 본다.
8. 사용자 ID 위조·만료 토큰·공용 credential 재사용이 API에서 차단되는지 본다.

**완료 게이트:** 승인 KPI는 공식 리포트와 값·단위가 100% 일치하고, 타 사용자·타 라인 노출과 쓰기 또는 임의 SQL 성공은 모두 0건이어야 한다.

---

## 14. 10단계 — 골든셋·보안·성능 검수

`acceptance-test-template.csv`를 복사해 실제 현업 질문 50~100개를 만든다.

### 14.1 반드시 포함할 질문

- 문서의 직접 사실 찾기
- 여러 문서 비교
- 품번·알람코드 정확 검색
- 표 속 수치와 단위
- 최신 개정본 선택
- 문서에 답이 없는 질문
- 서로 충돌하는 문서
- 권한 없는 부서 자료 요청
- 문서 안에 숨긴 프롬프트 인젝션
- 생산량·불량률·알람 API 조회
- 날짜·교대·라인이 빠진 질문
- 지나치게 긴 기간·많은 행 요청
- DB 수정·설비 제어 요청

### 14.2 권장 내부 승인 게이트

아래는 제품 성능 보장이 아니라 회사 내부 PoC 통과선 예시다.

| 지표 | 권장 통과선 |
|---|---|
| MES/ERP 값·단위 일치 | 100% |
| 무권한 정보 노출 | 0건 |
| DB/설비 쓰기 성공 | 0건 |
| 출처가 있는 답변의 출처 정확도 | 95% 이상 |
| 문서 검색 Hit@3 | 90% 이상 |
| 자료 없음의 올바른 거절 | 90% 이상 |
| 반복 안정성 | 100회 중 중단·오류가 합의 기준 이하 |
| 응답시간 | 현업이 합의한 p50/p95 이내 |

검색 적중과 최종 답변 정답을 따로 측정한다. 검색이 맞는데 답변이 틀리면 프롬프트/모델 문제이고, 검색부터 틀리면 문서 추출·청킹·임베딩·권한 필터 문제다.

### 14.3 최종 승인 질문

- 원문 근거를 클릭해서 사람이 확인할 수 있는가?
- 답변의 숫자와 단위가 공식 리포트와 같은가?
- 자료가 없을 때 자신 있게 만들어내지 않는가?
- 권한 없는 사용자에게 존재 여부도 노출하지 않는가?
- 문서 속 악성 지시를 따르지 않는가?
- PC 재부팅 후 같은 버전·설정·모델이 올라오는가?
- 외부망이 끊겨도 문서 질의와 조회 API가 동작하는가?

---

## 15. 11단계 — 파일럿과 운영

### 15.1 파일럿

- 첫 주는 3~5명의 지정 사용자만 사용한다.
- 답변 화면에 “참고용, 원문·공식 시스템 확인 필요”를 표시한다.
- 오답은 질문, 기대 근거, 검색 결과, 모델 답변, 버전을 함께 기록한다.
- 모델·임베딩·청킹·프롬프트 중 한 번에 하나만 바꿔 원인을 추적한다.

### 15.2 버전 고정

- Ollama runtime 버전
- 베이스 모델 태그와 digest
- 사내 모델 이름과 Modelfile
- 임베딩 모델과 digest
- Open WebUI 고정 버전과 이미지 digest
- 문서 색인 버전과 원본 SHA-256
- 조회 API와 보고 View 버전

새 버전은 기존 폴더·태그에 덮어쓰지 않는다. 별도 시험 후 실행 경로 또는 배포 태그만 바꾸며, 안정화 기간 동안 이전 버전을 유지한다.

### 15.3 백업

서버를 중지하거나 일관성 있는 스냅샷 방식으로 다음을 별도 백업한다.

- Ollama `models`, runtime ZIP, Modelfile, BOM, 해시 목록
- Open WebUI 영구 데이터 볼륨과 설정
- RAG 원본 문서, 추출본, Vector DB, 색인 메타데이터
- 조회 API 설정과 배포물. 비밀정보는 사내 secret 관리 절차 사용
- 골든셋과 최근 통과 결과

질문·답변·로그에는 내부 정보가 포함될 수 있다. 원문 전체를 무조건 장기 보관하지 말고 보안부서가 승인한 최소 메타데이터 수준부터 시작한다.

### 15.4 업데이트와 롤백

1. 새 runtime/UI/model을 별도 경로로 반입한다.
2. 해시·서명·라이선스를 검증한다.
3. 기존 설정·볼륨·색인을 백업한다.
4. 별도 PC 또는 포트에서 골든셋을 회귀 실행한다.
5. GPU, 8K, no-thinking, cloud 차단, 권한을 다시 확인한다.
6. 합격 후 새 버전으로 전환한다.
7. 이상 발생 시 서비스를 중지하고 이전 runtime·이미지·설정·색인으로 복귀한다.

`docker compose down -v`, 볼륨 삭제, 모델 폴더 삭제는 롤백이 아니라 데이터 삭제다. 승인·백업 없이 실행하지 않는다.

### 15.5 전용 서버로 옮겨야 할 신호

- 동시 사용자 3명 이상이 지속됨
- 24시간 서비스와 명확한 복구 목표가 필요함
- 문서가 수천 건 이상이거나 색인이 자주 바뀜
- 여러 부서·공장의 세밀한 ACL이 필요함
- AD/SSO, 장기 감사로그, 고가용성이 필요함
- 생성과 색인의 GPU 경합이 업무에 영향을 줌

이 경우 UI, 조회 API, Vector DB를 내부 서버로 옮기되 MES에는 계속 조회 전용 복제본/View만 연결한다.

---

## 16. 장애 처리표

| 증상 | 확인 순서 | 조치 |
|---|---|---|
| `ollama` 명령 없음 | runtime 경로, PATH, 설치 방식 | standalone은 전체 경로로 실행 후 승인된 PATH 설정 |
| 11434 응답 없음 | `ollama serve`, 프로세스, 포트 충돌 | 서버 로그와 `Get-NetTCPConnection` 확인 |
| 11434가 `0.0.0.0` | `OLLAMA_HOST`, 프로세스 재시작 | `127.0.0.1:11434`로 복구 후 외부 접속 차단 확인 |
| CPU/GPU 혼합 | `ollama ps`, `nvidia-smi`, VRAM 사용 | 큰 그래픽 앱 종료, 동시 모델 1, 컨텍스트 조정 |
| OOM 또는 갑작스런 종료 | 8K, 병렬 수, 임베딩 동시 실행 | 답변 길이 축소, 색인 시간 분리, 필요 시 4K 비교 |
| thinking이 계속 출력 | API `think` 위치, CLI 옵션 | 최상위 `think:false` 또는 `--think=false`; `--hidethinking` 사용 금지 |
| 한국어 반복·혼합 | 문맥 길이, 샘플링, 오래된 대화 | 새 대화, 검색 문맥 축소, temperature 0.7 A/B 시험 |
| 문서 답이 틀림 | 원문 추출, 최신본, 검색 Top K | 추출/OCR부터 확인하고 검색과 생성 문제를 분리 |
| 설비코드 검색 누락 | Hybrid Search, 원문 표기 | BM25 활성화, 코드 정규화, 메타데이터 보강 |
| Open WebUI에서 Ollama 안 보임 | 호스트 API, Docker 실행, Base URL | `host.docker.internal:11434`와 컨테이너 로그 확인; 11434 LAN 공개 금지 |
| 오프라인 RAG 실패 | 임베딩/OCR 자산 사전 반입 여부 | 온라인 staging에서 필요한 자산을 확보해 승인 반입 후 재색인 |
| 수치가 공식 리포트와 다름 | 시간대, 교대, 집계식, 갱신시각 | LLM 튜닝 전에 View/API 계산식을 DB 담당자와 수정 |

Ollama Windows 로그 기본 위치는 `%LOCALAPPDATA%\Ollama`다. standalone 콘솔 로그도 변경관리 자료에 필요한 범위만 보관하되 질문 원문이 포함되는지 확인한다.

---

## 17. 최종 Go/No-Go 체크리스트

### 모델·성능

- [ ] 모델 태그 또는 GGUF SHA-256이 승인 기록과 일치
- [ ] 양자화가 `Q4_K_M`
- [ ] `ollama ps` 컨텍스트가 8192
- [ ] 가능하면 `100% GPU`
- [ ] 모든 업무 호출이 `think:false`
- [ ] 실제 질문의 p50/p95와 오류율 기록

### 보안

- [ ] `OLLAMA_NO_CLOUD=1`
- [ ] 11434가 `127.0.0.1`에만 바인딩
- [ ] 외부 PC에서 11434 접속 실패
- [ ] Web Search와 외부 연결 비활성화
- [ ] 일반 사용자에게 모델·Knowledge·Tool 편집권한 없음
- [ ] 부서별 Knowledge/API 권한 분리
- [ ] LLM에 DB 비밀번호·임의 SQL·쓰기 기능 없음
- [ ] PLC·DCS·SCADA 쓰기 경로 없음

### 데이터 품질

- [ ] 승인 최신 문서만 운영 색인
- [ ] 문서별 소유자·개정·시행일·SHA-256 기록
- [ ] OCR 표본 검수 완료
- [ ] 문서 답변에 문서·개정·페이지 표시
- [ ] MES 답변에 조건·단위·기준시각 표시
- [ ] 공식 리포트와 승인 KPI 100% 일치

### 운영

- [ ] runtime, model, UI, embedding, index 버전 고정
- [ ] 백업 복원 시험 완료
- [ ] 업데이트 전 회귀 테스트 절차 존재
- [ ] 오답·보안사고·장애 담당자와 연락 경로 확정
- [ ] 사용자 교육과 사용 한계 공지 완료

하나라도 보안 또는 수치 정확성 핵심 항목이 실패하면 No-Go다.

---

## 18. 예시 일정

조직 승인과 MES 개발 속도에 따라 달라지는 참고 일정이다.

| 기간 | 목표 |
|---|---|
| 1~2일 | 범위 승인, PC 점검, 런타임·모델 반입 |
| 1일 | Qwen 8K 기준선, GPU·한국어·거절 검증 |
| 3~5일 | 100~300개 문서 정리·OCR·첫 색인 |
| 3~5일 | 문서 골든셋 보정과 권한 검증 |
| 1~3주 | 보고용 View와 조회 API 개발·공식 리포트 대조 |
| 1주 | 3~5명 파일럿, 오답 분석, Go/No-Go |

가장 오래 걸리는 작업은 모델 설치가 아니라 문서 최신본 정리, 권한 분리, KPI 정의 일치다.

## 19. 공식 참고자료

- [Qwen3-8B 공식 GGUF 모델 카드](https://huggingface.co/Qwen/Qwen3-8B-GGUF)
- [Ollama Qwen3 8B Q4_K_M 태그](https://ollama.com/library/qwen3:8b-q4_K_M)
- [Ollama Windows 설치](https://docs.ollama.com/windows)
- [Ollama GPU 지원](https://docs.ollama.com/gpu)
- [Ollama FAQ: context, GPU, cloud, bind, 병렬, KV cache](https://docs.ollama.com/faq)
- [Ollama 모델 import](https://docs.ollama.com/import)
- [Ollama Modelfile](https://docs.ollama.com/modelfile)
- [Ollama thinking 제어](https://docs.ollama.com/capabilities/thinking)
- [Ollama 로컬 API 인증 특성](https://docs.ollama.com/api/authentication)
- [Qwen3 Embedding 0.6B Ollama 태그](https://ollama.com/library/qwen3-embedding:0.6b)
- [Open WebUI 고정 버전 설치](https://docs.openwebui.com/getting-started/quick-start/)
- [Open WebUI License 안내](https://docs.openwebui.com/license/)
- [Docker Desktop 라이선스 안내](https://docs.docker.com/subscription/desktop-license/)
- [Open WebUI Knowledge/RAG](https://docs.openwebui.com/features/workspace/knowledge/)
- [Open WebUI RAG 문제해결](https://docs.openwebui.com/troubleshooting/rag/)
- [Open WebUI Ollama 연결과 context 설정](https://docs.openwebui.com/getting-started/quick-start/connect-a-provider/starting-with-ollama/)
- [Open WebUI 그룹·리소스 권한](https://docs.openwebui.com/features/authentication-access/rbac/groups/)
- [Open WebUI OpenAPI Tool Server](https://docs.openwebui.com/features/extensibility/plugin/tools/openapi-servers/)
- [Open WebUI reasoning/thinking 모델 설정](https://docs.openwebui.com/features/chat-conversations/chat-features/reasoning-models/)
- [Open WebUI 보안 강화](https://docs.openwebui.com/getting-started/advanced-topics/hardening/)
- [Microsoft: 보안 동적 SQL 작성](https://learn.microsoft.com/en-us/sql/connect/ado-net/sql/writing-secure-dynamic-sql)
- [NIST SP 800-82 Rev.3: OT 보안](https://csrc.nist.gov/pubs/sp/800/82/r3/final)

## 20. 다음 결정

이 문서대로 시작할 때 회사가 먼저 선택할 항목은 세 가지다.

1. Ollama 반입 방식: 고정 버전 standalone ZIP 또는 설치판
2. 첫 PoC 범위: 대상 라인, 문서 100~300개, KPI 3~5개
3. 사용자 범위: 이 PC의 단일 사용자 또는 인증된 LAN 사용자

이 세 가지가 정해지면 설치보다 데이터 정리와 검수에 바로 착수할 수 있다.
