# 처음부터 따라 하는 Qwen3-8B 공장 문서 질문 시스템

> 기준일: 2026-08-19  
> 대상: 프로그램을 설치해 본 경험이 많지 않은 일반 사용자  
> 대상 PC: Ryzen 9 9950X, RAM 32 GB, RTX 5060 8 GB, Windows  
> 이 가이드의 기본 방식: **Open WebUI와 Ollama가 함께 들어 있는 Docker 컨테이너 1개**

## 30초 요약

이 가이드를 끝내면 이 PC의 브라우저에서 다음을 할 수 있다.

1. `http://127.0.0.1:3000`에 접속한다.
2. `factory-qwen3-8b` 모델을 선택한다.
3. 한국어로 질문하고 답을 받는다.
4. 승인받은 PDF·DOCX·TXT 문서를 올린 뒤 문서 내용을 질문한다.

이 가이드만으로 **MES의 오늘 생산량이나 불량률이 자동 연결되지는 않는다.**
실시간 MES/ERP 수치는 조회 전용 API를 별도로 만들어야 하며, 이는 MES·DB·보안 담당자 작업이다.

### 바로 이동

처음에는 아래 다섯 곳만 순서대로 이동하면 된다.

1. [시작 조건 확인](#3-시작하기-전에-선택할-것)
2. [PC와 Docker 점검](#6-pc와-docker-점검)
3. [올인원 컨테이너 실행](#7-open-webui--ollama-올인원-실행)
4. [Qwen 모델 설치와 시험](#8-qwen-모델과-문서-검색-모델-받기)
5. [브라우저와 교육용 문서 시험](#10-마일스톤-b--브라우저-채팅)

> **절대 연결하지 말 것**
>
> - PLC·DCS·SCADA·안전계장 제어
> - 운영 DB의 수정 권한
> - 자연어를 임의 SQL로 바꾸어 실행하는 기능
> - 코드 실행, 외부 웹 검색, 개인 클라우드
>
> 프롬프트와 “오프라인 모드”는 보안 장치가 아니다. 네트워크 분리와 서버 측 권한 통제가 확인되지 않으면 실제 공장 데이터로 운영하지 않는다.

---

## 1. 이 초보자판의 범위

### 직접 따라 할 수 있는 범위

- 이 PC 한 대에서만 사용하는 로컬 한국어 채팅
- 교육용 가상 문서를 이용한 문서 검색 연습
- 마일스톤 A~C까지의 교육용 단일 사용자 PoC

이 초보자용 올인원 구성은 UI와 모델이 한 컨테이너의 영향 범위에 있고,
첫 계정이 관리자이므로 **저위험 교육용 PoC 전용**이다.
실제 승인 문서 단계는 일반 사용자 계정·외부망 차단·Docker 저장 위치·백업을 IT가 확인한 뒤에만 진행한다.

### IT 담당자가 해야 하는 범위

- NVIDIA 드라이버와 Docker Desktop 설치·회사 라이선스 확인
- 폐쇄망 패키지 반입, 해시·취약점·라이선스 검토
- 방화벽, 백업, 계정, 자동 시작, 업데이트와 롤백
- 여러 사용자가 접속하는 사내 서버 구성
- 권한이 다른 부서 문서를 사용자별로 분리하는 구성

### MES·DB 담당자가 해야 하는 범위

- 보고용 DB View와 조회 전용 API
- 사용자 인증과 라인·공장별 접근권한
- 공식 리포트와 수치·단위·집계 기준 대조

초보자판에서 “IT 담당자에게 요청”이라고 표시되면 임의로 우회하지 말고 그 단계에서 멈춘다.

---

## 2. 완성까지의 다섯 마일스톤

| 마일스톤 | 완료 모습 | 예상 시간 |
|---|---|---:|
| A | Docker에서 Qwen 모델이 한국어로 답함 | 다운로드 제외 20분 |
| B | 브라우저에서 Qwen과 대화함 | 10분 |
| C | 교육용 가상 문서의 고유 값을 출처와 함께 답함 | 20분 |
| D | 승인된 실제 문서 3~10개로 시험함 | 1~2시간 |
| E | MES/ERP 조회 전용 API를 전문가가 연결함 | 별도 프로젝트 |

각 마일스톤을 통과하기 전 다음으로 넘어가지 않는다.

---

## 3. 시작하기 전에 선택할 것

아래 질문에 모두 답한다.

| 질문 | 예 | 아니요 |
|---|---|---|
| 회사가 이 PC에서 로컬 LLM 시험을 승인했는가? | 계속 | 중지하고 승인 요청 |
| Docker Desktop의 회사 사용 조건을 구매·법무가 확인했는가? | 계속 | 중지하고 확인 요청 |
| Docker Desktop이 이미 설치되어 있는가? | 계속 | IT 설치 요청 |
| 이 PC에서 한 번의 인터넷 다운로드가 승인되었는가? | 4단계부터 진행 | 폐쇄망 절차로 이동 |
| `D:` 드라이브를 AI 자료 경로로 써도 되는가? | 계속 | IT에 승인 경로 요청 |
| 첫 시험은 이 PC의 한 사용자만 하는가? | 계속 | 다중 사용자 전문 설계 필요 |
| 첫 자료는 비민감 교육용 또는 승인 문서인가? | 계속 | 데이터 소유자 승인 요청 |

### 인터넷이 전혀 안 되는 PC라면

여기서 **START-HERE 실행을 종료한다.**
이 초보자판은 인터넷 연결이 승인된 교육용 PoC 경로이며, 중간 단계로 다시 합류할 수 있는 폐쇄망 절차가 아니다.
IT 담당자에게 아래 전문가용 상세판을 전달하고, 그 절차를 처음부터 끝까지 사용한다.

- [상세판 8.3 — 완전 오프라인 모델 저장소 패키지](./README.md#83-완전-오프라인-권장-ollama-모델-저장소-패키지)
- [상세판 11.1 — Open WebUI 이미지 반입](./README.md#111-windows-native-ollama--docker-open-webui)

IT가 별도의 올인원 폐쇄망 인수 절차와 완료 증적을 제공하지 않는 한 이 문서의 9단계부터 임의로 재개하지 않는다.
폐쇄망 PC에서 개인 USB나 임시 인터넷 연결로 직접 받지 않는다.

---

## 4. PowerShell을 처음 쓰는 사람을 위한 규칙

1. Windows 시작 버튼을 누른다.
2. `PowerShell`을 검색한다.
3. **Windows PowerShell을 일반 실행**한다.
4. 이 문서의 코드 상자 안쪽만 처음부터 끝까지 복사한다.
5. PowerShell 창 안에서 마우스 오른쪽 버튼 또는 `Ctrl+V`로 붙여넣고 `Enter`를 누른다.

다음 규칙을 지킨다.

- 화면의 `PS C:\...>` 글자는 복사하지 않는다.
- 코드 상자의 언어 표시와 마지막 세 개의 백틱 표시는 복사하지 않는다.
- 빨간 글씨 오류가 나오면 다음 단계로 넘어가지 않는다.
- `>>`만 계속 보이면 `Ctrl+C`를 누르고 코드 상자 전체를 다시 복사한다.
- 회사 프록시·백신이 막으면 끄거나 우회하지 말고 오류 화면을 IT에 보낸다.
- 관리자 권한은 드라이버·Docker 설치처럼 IT가 요청한 작업에만 쓴다.
- 같은 구성에서 Ollama와 모델 명령을 서로 다른 Windows 계정으로 실행하지 않는다.

---

## 5. 준비물 배치

**작업 위치:** 공장 PC  
**권한:** 일반 사용자  
**예상 시간:** 5분

### 5.1 폴더 만들기

PowerShell에 아래 블록 전체를 붙여넣는다.

```powershell
$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath 'D:\')) {
  throw 'D: 드라이브가 없습니다. 여기서 중지하고 IT 담당자에게 승인 경로를 요청하세요.'
}

New-Item -ItemType Directory -Force -Path @(
  'D:\LocalLLM',
  'D:\LocalLLM\guide',
  'D:\LocalLLM\backup',
  'D:\LocalLLM\logs'
) | Out-Null

Get-Item -LiteralPath 'D:\LocalLLM' |
  Select-Object FullName, CreationTime
```

**성공하면:** 마지막에 `D:\LocalLLM`이 표시되고 빨간 오류가 없다.

### 5.2 이 자료 복사하기

파일 탐색기에서 현재 보고 있는 `local-llm-qwen3-8b` 폴더의 **내용 전체**를
`D:\LocalLLM\guide`에 복사한다.

복사가 끝나면 아래 블록으로 확인한다.

```powershell
$ErrorActionPreference = 'Stop'
$GuideFolder = 'D:\LocalLLM\guide'

$RequiredFiles = @(
  "$GuideFolder\START-HERE.md",
  "$GuideFolder\Modelfile",
  "$GuideFolder\system-prompt-ko.txt",
  "$GuideFolder\sample-data\교육용-가상문서-절대업무사용금지.md"
)

$Missing = @($RequiredFiles | Where-Object {
  -not (Test-Path -LiteralPath $_)
})

if ($Missing.Count -gt 0) {
  $Missing | ForEach-Object { Write-Host "없음: $_" -ForegroundColor Red }
  throw '가이드 파일 복사가 완료되지 않았습니다.'
}

$RequiredFiles | ForEach-Object {
  Get-Item -LiteralPath $_ | Select-Object FullName, Length
}

Write-Host '준비물 확인 완료' -ForegroundColor Green
```

**성공하면:** 마지막 줄에 초록색 `준비물 확인 완료`가 표시된다.

---

## 6. PC와 Docker 점검

**작업 위치:** 공장 PC  
**권한:** 일반 사용자, 설치 문제는 IT  
**예상 시간:** 10분

### 6.1 불필요한 프로그램 닫기

브라우저 탭, 게임, 영상 편집기, 3D 도구처럼 GPU와 메모리를 많이 쓰는 프로그램을 닫는다.
이 PC는 화면 출력에도 GPU 메모리를 쓰므로 모델 시험 중에는 여유를 확보한다.

### 6.2 Docker Desktop 시작

1. Windows 시작 메뉴에서 `Docker Desktop`을 연다.
2. 엔진이 시작될 때까지 기다린다.
3. Docker 화면에 오류가 없고 실행 중 상태가 되면 다음 명령을 실행한다.

```powershell
$ErrorActionPreference = 'Stop'

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'docker 명령이 없습니다. Docker Desktop 설치를 IT 담당자에게 요청하세요.'
}

$ServerVersion = docker version --format '{{.Server.Version}}' 2>$null
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($ServerVersion)) {
  throw 'Docker Engine이 실행되지 않았거나 현재 계정에 권한이 없습니다.'
}

$DockerOs = docker info --format '{{.OSType}}'
$DockerArchitecture = docker info --format '{{.Architecture}}'
$DockerRoot = docker info --format '{{.DockerRootDir}}'
if ($LASTEXITCODE -ne 0) {
  throw 'Docker 정보를 확인할 수 없습니다.'
}

if ($DockerOs -ne 'linux') {
  throw "Linux 컨테이너 모드가 아닙니다: $DockerOs"
}

if ($DockerArchitecture -notin @('x86_64', 'amd64')) {
  throw "AMD64 Docker 환경이 아닙니다: $DockerArchitecture"
}

"Docker Server: $ServerVersion"
"Docker Platform: $DockerOs / $DockerArchitecture"
"Docker Root: $DockerRoot"
```

**성공하면:** Docker Server 버전과 `linux / x86_64` 또는 이에 해당하는 Linux AMD64 플랫폼이 표시된다.

오류가 나면 Docker Desktop에서 WSL2·가상화·현재 사용자 권한을 IT가 확인해야 한다.

### 6.3 GPU·RAM·디스크·포트 확인

중요: 아래에서 만드는 Docker image와 named volume은 `D:\LocalLLM`이 아니라
**Docker Desktop의 Linux 가상 디스크**에 저장된다.

IT 담당자가 Docker Desktop의 **Settings → Resources → Advanced → Disk image location**에서 다음을 확인한다.

- 회사가 승인한 암호화 드라이브에 저장됨
- 해당 드라이브의 실제 여유 공간과 Docker storage limit이 각각 35 GB 이상
- BitLocker와 Docker/WSL 관리자 접근 범위가 회사 기준에 맞음
- `factory-ollama`, `factory-open-webui` 볼륨의 백업·복원·보존·폐기 위치가 정해짐

`D:\LocalLLM`에는 이 가이드와 구축 기록만 저장된다. 위 저장 위치 확인 없이 모델을 받지 않는다.

```powershell
$ErrorActionPreference = 'Stop'

if (-not (Get-Command nvidia-smi -ErrorAction SilentlyContinue)) {
  throw 'nvidia-smi가 없습니다. RTX 5060 지원 드라이버를 IT 담당자에게 요청하세요.'
}

$Computer = Get-CimInstance Win32_ComputerSystem
$RamGb = [math]::Round($Computer.TotalPhysicalMemory / 1GB, 1)
$SystemDrive = Get-PSDrive -Name C
$GuideDrive = Get-PSDrive -Name D
$SystemFreeGb = [math]::Round($SystemDrive.Free / 1GB, 1)
$GuideFreeGb = [math]::Round($GuideDrive.Free / 1GB, 1)

"RAM: $RamGb GB"
"C 드라이브 여유 공간: $SystemFreeGb GB"
"D 드라이브 여유 공간: $GuideFreeGb GB"

nvidia-smi `
  --query-gpu=name,driver_version,memory.total `
  --format=csv

docker system df

if ($RamGb -lt 30) {
  throw "RAM이 예상보다 적습니다: $RamGb GB"
}

if ($GuideFreeGb -lt 1) {
  throw "가이드용 D 드라이브 여유 공간이 1 GB 미만입니다: $GuideFreeGb GB"
}

$Listeners = @(
  Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalPort -in 3000, 11434 }
)

if ($Listeners.Count -gt 0) {
  $Listeners |
    Select-Object LocalAddress, LocalPort, OwningProcess |
    Format-Table -AutoSize
  throw '3000 또는 11434 포트를 이미 사용 중입니다. 프로그램을 강제 종료하지 말고 IT 담당자에게 확인하세요.'
}

Write-Host 'PC 점검 통과' -ForegroundColor Green
```

**성공 기준**

- `NVIDIA GeForce RTX 5060`과 약 8 GB VRAM이 표시된다.
- RAM은 약 32 GB다.
- IT가 확인한 Docker 가상 디스크 위치와 storage limit에 각각 35 GB 이상 여유가 있다.
- D 드라이브에는 가이드 기록용 1 GB 이상 여유가 있다.
- 마지막 줄에 초록색 `PC 점검 통과`가 표시된다.

---

## 7. Open WebUI + Ollama 올인원 실행

**작업 위치:** 인터넷 다운로드가 승인된 공장 PC  
**권한:** 일반 사용자  
**예상 시간:** 이미지 다운로드 5~30분, 실행 5분

이 초보자판은 공식 Open WebUI의 `ollama` 이미지 변형을 사용한다.
Ollama와 UI가 같은 컨테이너 안에 있으므로 Docker와 Windows 사이의 11434 연결 문제를 피할 수 있다.
호스트에는 UI 포트 `127.0.0.1:3000`만 열고 Ollama 포트는 열지 않는다.

2026-08-19 확인 기준:

| 항목 | 고정값 |
|---|---|
| Open WebUI 릴리스 | `v0.11.0` |
| 이미지 | `ghcr.io/open-webui/open-webui:v0.11.0-ollama` |
| 다중 플랫폼 manifest digest | `sha256:d8a4a89f198cce7fb8eef122f07d2f77c3bc22b923f2f2d479188161aa8f88f1` |
| Linux AMD64 manifest digest | `sha256:6e82f2ee8e63205e11dc605030c01bf3d218b36f04f2d9ad0f3f41f214a36dba` |
| Windows PC에서 사용하는 플랫폼 | `linux/amd64` |

이 값은 예시 최신값이 아니라 **이 가이드에서 시험 기준으로 고정한 값**이다.
회사 IT가 승인하지 않았다면 실행하지 않는다. 다른 버전에 이 digest를 재사용하지 않는다.

### 7.1 컨테이너 만들기

아래 블록 전체를 한 번만 실행한다.

```powershell
$ErrorActionPreference = 'Stop'

$ContainerName = 'factory-ai'
$ImageVersion = 'v0.11.0'
$ExpectedDigest = 'sha256:d8a4a89f198cce7fb8eef122f07d2f77c3bc22b923f2f2d479188161aa8f88f1'
$ExpectedPlatformDigest = 'sha256:6e82f2ee8e63205e11dc605030c01bf3d218b36f04f2d9ad0f3f41f214a36dba'
$ImageRef = "ghcr.io/open-webui/open-webui@$ExpectedDigest"

$Existing = docker ps -a `
  --filter "name=^/$ContainerName$" `
  --format '{{.Names}}'

if ($Existing) {
  throw 'factory-ai가 이미 있습니다. 새로 만들지 말고 14단계의 매일 시작 방법을 사용하세요.'
}

$ExistingVolumes = @(
  docker volume ls --format '{{.Name}}' |
    Where-Object {
      $_ -in @('factory-ollama', 'factory-open-webui')
    }
)

if ($LASTEXITCODE -ne 0) {
  throw 'Docker volume 목록을 확인할 수 없습니다.'
}

if ($ExistingVolumes.Count -gt 0) {
  $ExistingVolumes | ForEach-Object { "기존 volume: $_" }
  throw '이전 계정·문서·설정이 든 volume일 수 있습니다. 삭제하거나 재사용하지 말고 IT 담당자에게 확인하세요.'
}

docker pull --platform linux/amd64 $ImageRef
if ($LASTEXITCODE -ne 0) {
  throw '이미지 다운로드 실패: 회사 인터넷·프록시·GHCR 허용 여부를 IT에 확인하세요.'
}

$RepoDigests = docker image inspect `
  --format '{{json .RepoDigests}}' `
  $ImageRef

if (
  $RepoDigests -notmatch [regex]::Escape($ExpectedDigest) -and
  $RepoDigests -notmatch [regex]::Escape($ExpectedPlatformDigest)
) {
  throw "승인한 이미지 digest가 아닙니다: $RepoDigests"
}

$ImageId = (
  docker image inspect --format '{{.Id}}' $ImageRef
).Trim()
$ImageOs = (
  docker image inspect --format '{{.Os}}' $ImageRef
).Trim()
$ImageArchitecture = (
  docker image inspect --format '{{.Architecture}}' $ImageRef
).Trim()

if ([string]::IsNullOrWhiteSpace($ImageId)) {
  throw '로컬 Docker image ID를 확인할 수 없습니다.'
}

if ($ImageOs -ne 'linux' -or $ImageArchitecture -ne 'amd64') {
  throw "승인 플랫폼이 아닙니다: $ImageOs/$ImageArchitecture"
}

"Open WebUI version: $ImageVersion"
"승인 image ID: $ImageId"
"이미지 플랫폼: $ImageOs/$ImageArchitecture"

docker run -d `
  --name $ContainerName `
  --restart unless-stopped `
  --platform linux/amd64 `
  --gpus all `
  -p 127.0.0.1:3000:8080 `
  -e OLLAMA_BASE_URL=http://localhost:11434 `
  -e RAG_OLLAMA_BASE_URL=http://localhost:11434 `
  -e OLLAMA_NO_CLOUD=1 `
  -e OLLAMA_CONTEXT_LENGTH=8192 `
  -e OLLAMA_NUM_PARALLEL=1 `
  -e OLLAMA_MAX_LOADED_MODELS=1 `
  -e OLLAMA_FLASH_ATTENTION=1 `
  -e OLLAMA_KV_CACHE_TYPE=q8_0 `
  -e OFFLINE_MODE=false `
  -e WEBUI_AUTH=true `
  -e DEFAULT_LOCALE=ko-KR `
  -e DEFAULT_USER_ROLE=pending `
  -e ENABLE_PASSWORD_VALIDATION=true `
  -e ENABLE_VERSION_UPDATE_CHECK=false `
  -e ENABLE_OLLAMA_API=true `
  -e ENABLE_OPENAI_API=false `
  -e ENABLE_COMMUNITY_SHARING=false `
  -e ENABLE_ADMIN_EXPORT=false `
  -e ENABLE_ADMIN_CHAT_ACCESS=false `
  -e ENABLE_DIRECT_CONNECTIONS=false `
  -e ENABLE_OPENAI_API_PASSTHROUGH=false `
  -e ENABLE_PLUGINS=false `
  -e ENABLE_MEMORIES=false `
  -e ENABLE_MEMORY_SYSTEM_CONTEXT=false `
  -e BYPASS_MODEL_ACCESS_CONTROL=false `
  -e BYPASS_RETRIEVAL_ACCESS_CONTROL=false `
  -e ENABLE_RETRIEVAL_UNSCOPED_COLLECTIONS=false `
  -e BYPASS_ADMIN_ACCESS_CONTROL=false `
  -e USER_PERMISSIONS_WORKSPACE_MODELS_ACCESS=false `
  -e USER_PERMISSIONS_WORKSPACE_KNOWLEDGE_ACCESS=false `
  -e USER_PERMISSIONS_WORKSPACE_TOOLS_ACCESS=false `
  -e USER_PERMISSIONS_WORKSPACE_PROMPTS_ACCESS=false `
  -e ENABLE_CODE_EXECUTION=false `
  -e ENABLE_CODE_INTERPRETER=false `
  -e ENABLE_PIP_INSTALL_FRONTMATTER_REQUIREMENTS=false `
  -e ENABLE_RAG_LOCAL_WEB_FETCH=false `
  -e ENABLE_WEB_SEARCH=false `
  -e ENABLE_KB_EXEC=false `
  -e RAG_EMBEDDING_ENGINE=ollama `
  -e RAG_EMBEDDING_MODEL=qwen3-embedding:0.6b `
  -e RAG_TOP_K=3 `
  -e ENABLE_RAG_HYBRID_SEARCH=true `
  -e CHUNK_SIZE=1000 `
  -e CHUNK_OVERLAP=100 `
  -e DO_NOT_TRACK=true `
  -e ANONYMIZED_TELEMETRY=false `
  -e SCARF_NO_ANALYTICS=true `
  -e AUDIT_LOG_LEVEL=METADATA `
  -e ENABLE_AUDIT_LOGS_FILE=true `
  -e AUDIT_LOGS_FILE_PATH=/app/backend/data/audit.log `
  -v factory-ollama:/root/.ollama `
  -v factory-open-webui:/app/backend/data `
  $ImageId

if ($LASTEXITCODE -ne 0) {
  throw '컨테이너 실행 실패: GPU·Docker 설정을 IT 담당자에게 확인하세요.'
}

$Running = docker inspect --format '{{.State.Running}}' $ContainerName
if ($Running -ne 'true') {
  docker logs --tail 100 $ContainerName
  throw '컨테이너가 실행 상태를 유지하지 못했습니다. 로그를 IT 담당자에게 보내세요.'
}

docker ps `
  --filter "name=^/$ContainerName$" `
  --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}'
```

**성공하면**

- 컨테이너 이름이 `factory-ai`다.
- 상태가 `Up`이다.
- 포트는 `127.0.0.1:3000->8080/tcp`만 표시된다.
- `11434`가 Windows 포트로 표시되지 않는다.

`could not select device driver` 또는 GPU 관련 오류가 나면 `--gpus all`을 지우고 실행하지 않는다.
Docker Desktop WSL2 GPU 지원을 IT가 고쳐야 한다.

이 단계의 `OFFLINE_MODE=false`는 교육용 이미지·모델 준비를 위한 값이다.
실제 사내 문서를 올리기 전에는 12장의 IT 보안 전환 게이트를 반드시 통과해야 한다.
Open WebUI의 환경변수 중 일부는 첫 실행 뒤 DB에 저장되므로, 재시작 후 화면과 실제 동작도 다시 확인한다.

### 7.2 내부 Ollama 확인

첫 시작은 1~3분 걸릴 수 있다. 아래 블록은 Ollama API와 Open WebUI 화면이 실제로 응답할 때까지 확인한다.

```powershell
$ErrorActionPreference = 'Stop'
$ContainerName = 'factory-ai'

$OllamaReady = $false
for ($Attempt = 1; $Attempt -le 90; $Attempt++) {
  $VersionJson = docker exec $ContainerName python -c `
    "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:11434/api/version', timeout=2).read().decode())" `
    2>$null

  if ($LASTEXITCODE -eq 0 -and $VersionJson) {
    $OllamaReady = $true
    break
  }

  Start-Sleep -Seconds 2
}

if (-not $OllamaReady) {
  docker logs --tail 100 $ContainerName
  throw '3분 안에 Ollama API가 준비되지 않았습니다. 로그를 IT 담당자에게 보내세요.'
}

$WebReady = $false
for ($Attempt = 1; $Attempt -le 90; $Attempt++) {
  try {
    $WebResponse = Invoke-WebRequest `
      -UseBasicParsing `
      -TimeoutSec 2 `
      -Uri 'http://127.0.0.1:3000'

    if ($WebResponse.StatusCode -ge 200 -and $WebResponse.StatusCode -lt 500) {
      $WebReady = $true
      break
    }
  }
  catch {
    $WebResponse = $null
  }

  Start-Sleep -Seconds 2
}

if (-not $WebReady) {
  docker logs --tail 100 $ContainerName
  throw '3분 안에 Open WebUI가 응답하지 않았습니다. 로그를 IT 담당자에게 보내세요.'
}

$OllamaVersion = docker exec $ContainerName ollama --version
$VersionJson
$OllamaVersion
docker exec $ContainerName ollama list
$Ports = @(docker port $ContainerName)

if ($Ports -notmatch '8080/tcp -> 127\.0\.0\.1:3000') {
  throw "UI가 loopback 포트에만 연결되지 않았습니다: $Ports"
}

if ($Ports -match '11434') {
  throw "11434가 Windows에 공개되었습니다: $Ports"
}

$Ports
docker logs --tail 30 $ContainerName
```

**성공하면**

- Ollama API 버전 JSON과 실제 Ollama 버전이 표시된다.
- `ollama list`가 오류 없이 실행된다.
- Open WebUI가 `127.0.0.1:3000`에서 응답한다.
- 로그 끝부분에 치명적인 오류가 없다.

실제 Ollama 버전을 [BEGINNER-CHECKLIST.md](./BEGINNER-CHECKLIST.md)에 적고 IT 승인 대상에 포함한다.

---

## 8. Qwen 모델과 문서 검색 모델 받기

**작업 위치:** 인터넷 다운로드가 승인된 공장 PC  
**권한:** 일반 사용자  
**예상 시간:** 5.2 GB 모델 기준 10~60분

### 8.1 Qwen3-8B Q4_K_M 받기

```powershell
$ErrorActionPreference = 'Stop'
$ContainerName = 'factory-ai'

docker exec $ContainerName ollama pull qwen3:8b-q4_K_M
if ($LASTEXITCODE -ne 0) {
  throw 'Qwen 모델 받기 실패: 인터넷·프록시·방화벽 승인을 확인한 뒤 같은 블록을 다시 실행하세요.'
}

docker exec $ContainerName ollama show qwen3:8b-q4_K_M
docker exec $ContainerName ollama list
```

**성공하면:** `qwen3:8b-q4_K_M`, 약 5.2 GB, `Q4_K_M`이 표시된다.

### 8.2 모델 digest 자동 확인

```powershell
$ErrorActionPreference = 'Stop'
$ContainerName = 'factory-ai'
$ExpectedDigest = '500a1f067a9f782620b40bee6f7b0c89e17ae61f686b92c24933e4ca4b2b8b41'

$TagJson = docker exec $ContainerName python -c `
  "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:11434/api/tags').read().decode())"

if ($LASTEXITCODE -ne 0) {
  throw '컨테이너 내부 모델 목록 API를 확인하지 못했습니다.'
}

$Tags = $TagJson | ConvertFrom-Json
$BaseModel = $Tags.models |
  Where-Object { $_.model -eq 'qwen3:8b-q4_K_M' }

if (-not $BaseModel) {
  throw 'qwen3:8b-q4_K_M 모델이 없습니다.'
}

if ($BaseModel.digest -ne $ExpectedDigest) {
  throw "승인 모델 digest와 다릅니다: $($BaseModel.digest)"
}

if ($BaseModel.details.quantization_level -ne 'Q4_K_M') {
  throw "Q4_K_M 모델이 아닙니다: $($BaseModel.details.quantization_level)"
}

$BaseModel |
  Select-Object model, digest, size,
    @{Name='parameters'; Expression={$_.details.parameter_size}},
    @{Name='quantization'; Expression={$_.details.quantization_level}} |
  Format-List

Write-Host 'Qwen 모델 검증 통과' -ForegroundColor Green
```

**성공하면:** 마지막 줄에 초록색 `Qwen 모델 검증 통과`가 표시된다.

공식 모델이 갱신되어 digest가 달라졌다면 오류를 삭제하거나 우회하지 않는다.
IT가 새 digest와 변경 내용을 승인한 뒤 문서를 갱신해야 한다.

### 8.3 사내 정책 모델 만들기

`D:\LocalLLM\guide\Modelfile`에는 8K 컨텍스트와 “근거가 없으면 추측하지 않는다”는 정책이 들어 있다.

```powershell
$ErrorActionPreference = 'Stop'
$ContainerName = 'factory-ai'
$Modelfile = 'D:\LocalLLM\guide\Modelfile'
$PromptFile = 'D:\LocalLLM\guide\system-prompt-ko.txt'
$ExpectedModelfileHash = '88A29B4E218299802A59F61B9CD3BDA42A40CBA9ADBF5B1C40F70862F0C879AC'
$ExpectedPromptHash = 'B0F0E554838050829A04FC7910D184E8A39FE0E86F7BA025C43A7C888966444A'

if (-not (Test-Path -LiteralPath $Modelfile)) {
  throw "Modelfile이 없습니다: $Modelfile"
}

if (-not (Test-Path -LiteralPath $PromptFile)) {
  throw "시스템 프롬프트가 없습니다: $PromptFile"
}

$ActualModelfileHash = (
  Get-FileHash -LiteralPath $Modelfile -Algorithm SHA256
).Hash
$ActualPromptHash = (
  Get-FileHash -LiteralPath $PromptFile -Algorithm SHA256
).Hash

if ($ActualModelfileHash -ne $ExpectedModelfileHash) {
  throw "승인 Modelfile과 다릅니다: $ActualModelfileHash"
}

if ($ActualPromptHash -ne $ExpectedPromptHash) {
  throw "승인 시스템 프롬프트와 다릅니다: $ActualPromptHash"
}

"Modelfile SHA-256: $ActualModelfileHash"
"시스템 프롬프트 SHA-256: $ActualPromptHash"

docker cp $Modelfile "${ContainerName}:/tmp/factory-Modelfile"
if ($LASTEXITCODE -ne 0) {
  throw 'Modelfile을 컨테이너에 복사하지 못했습니다.'
}

docker exec $ContainerName ollama create `
  factory-qwen3-8b `
  -f /tmp/factory-Modelfile

if ($LASTEXITCODE -ne 0) {
  throw 'factory-qwen3-8b 생성에 실패했습니다.'
}

docker exec $ContainerName ollama list
$EffectiveModelfile = docker exec $ContainerName ollama show --modelfile factory-qwen3-8b
if ($LASTEXITCODE -ne 0) {
  throw '생성 모델의 Modelfile을 확인하지 못했습니다.'
}

if ($EffectiveModelfile -notmatch 'num_ctx\s+8192') {
  throw '생성 모델에 num_ctx 8192가 적용되지 않았습니다.'
}

if ($EffectiveModelfile -notmatch 'query_knowledge_files') {
  throw '생성 모델에 Knowledge 검색 정책이 적용되지 않았습니다.'
}

$TagJson = docker exec $ContainerName python -c `
  "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:11434/api/tags').read().decode())"

if ($LASTEXITCODE -ne 0) {
  throw '생성 모델 digest를 확인하지 못했습니다.'
}

$Tags = $TagJson | ConvertFrom-Json
$FactoryModel = $Tags.models |
  Where-Object { $_.model -eq 'factory-qwen3-8b:latest' }

if (-not $FactoryModel) {
  throw 'factory-qwen3-8b:latest 모델이 없습니다.'
}

$EffectiveModelfile
$FactoryModel |
  Select-Object model, digest, size |
  Format-List
```

**성공하면**

- `factory-qwen3-8b`가 모델 목록에 있다.
- 출력에 `num_ctx 8192`가 있다.
- 출력에 `query_knowledge_files`를 사용하는 한국어 시스템 정책이 있다.
- 생성 모델 digest와 두 정책 파일 SHA-256이 표시된다.

표시된 factory 모델 digest와 두 SHA-256을 체크리스트에 적는다.

### 8.4 문서 검색용 임베딩 모델 받기

```powershell
$ErrorActionPreference = 'Stop'
$ContainerName = 'factory-ai'
$ExpectedEmbeddingDigest = 'ac6da0dfba84a81fdbfbaf330198c33cd77c4cdfc53e8bc50eb581914a15621d'

docker exec $ContainerName ollama pull qwen3-embedding:0.6b
if ($LASTEXITCODE -ne 0) {
  throw '문서 검색용 임베딩 모델을 받지 못했습니다.'
}

$TagJson = docker exec $ContainerName python -c `
  "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:11434/api/tags').read().decode())"

if ($LASTEXITCODE -ne 0) {
  throw '임베딩 모델 digest를 확인하지 못했습니다.'
}

$Tags = $TagJson | ConvertFrom-Json
$EmbeddingModel = $Tags.models |
  Where-Object { $_.model -eq 'qwen3-embedding:0.6b' }

if (-not $EmbeddingModel) {
  throw 'qwen3-embedding:0.6b 모델이 없습니다.'
}

if ($EmbeddingModel.digest -ne $ExpectedEmbeddingDigest) {
  throw "승인 임베딩 digest와 다릅니다: $($EmbeddingModel.digest)"
}

$Tags.models |
  Where-Object {
    $_.model -in @(
      'factory-qwen3-8b:latest',
      'qwen3-embedding:0.6b'
    )
  } |
  Select-Object model, digest, size |
  Format-Table -AutoSize

Write-Host '임베딩 모델 검증 통과' -ForegroundColor Green
```

**성공하면:** 마지막 줄에 초록색 `임베딩 모델 검증 통과`가 표시된다.
표시된 임베딩 digest를 [BEGINNER-CHECKLIST.md](./BEGINNER-CHECKLIST.md)에 적는다.

---

## 9. 마일스톤 A — 한국어 답변과 GPU 확인

**작업 위치:** 공장 PC  
**권한:** 일반 사용자  
**예상 시간:** 첫 답변 1~3분, 이후 수십 초

```powershell
$ErrorActionPreference = 'Stop'
$ContainerName = 'factory-ai'

docker exec $ContainerName ollama run `
  factory-qwen3-8b `
  --think=false `
  '현재 어떤 사내 문서도 제공되지 않았습니다. A공장 어제 생산량을 숫자로 알려주세요.'

if ($LASTEXITCODE -ne 0) {
  throw '모델 실행에 실패했습니다.'
}

docker exec $ContainerName ollama ps
if ($LASTEXITCODE -ne 0) {
  throw 'ollama ps 확인에 실패했습니다.'
}

nvidia-smi `
  --query-gpu=name,memory.total,memory.used,utilization.gpu `
  --format=csv

if ($LASTEXITCODE -ne 0) {
  throw 'nvidia-smi 확인에 실패했습니다.'
}
```

**합격 기준**

- 임의 생산량 숫자를 만들어내지 않는다.
- “현재 허용된 자료에서 확인할 수 없습니다”와 비슷하게 답한다.
- `ollama ps`의 CONTEXT가 `8192`다.
- PROCESSOR가 가능하면 `100% GPU`다.
- 답변에 길게 펼쳐진 thinking 과정이 없다.

CPU/GPU 혼합 또는 메모리 부족 오류가 나면 브라우저와 그래픽 프로그램을 닫고 한 번 더 시험한다.
그래도 실패하면 임의로 모델을 바꾸지 말고 상세판의 성능 조정 절차를 IT에 전달한다.

여기까지 통과하면 체크리스트의 **마일스톤 A**에 표시한다.

---

## 10. 마일스톤 B — 브라우저 채팅

**작업 위치:** 같은 공장 PC의 브라우저  
**권한:** 첫 로컬 관리자  
**예상 시간:** 10~15분

### 10.1 첫 관리자 계정 만들기

1. Edge 또는 Chrome 주소창에 `http://127.0.0.1:3000`을 입력한다.
2. 첫 계정을 만든다. 첫 계정은 이 로컬 인스턴스의 관리자다.
3. 회사 계정 정책에 맞는 별도 비밀번호를 사용한다.
4. 비밀번호를 이 문서, 채팅, Modelfile 또는 스크린샷에 적지 않는다.
5. 화면이 열리면 아직 실제 사내 문서를 올리지 않는다.

이 관리자 계정은 마일스톤 A~C의 교육용 가상 자료 설정까지만 사용한다.
실제 승인 문서는 12장의 보안 전환 게이트에서 일반 사용자 계정과 읽기 권한을 분리한 뒤 그 일반 계정으로 질문한다.

사이트가 열리지 않으면 아래 명령을 실행한다.

```powershell
$ErrorActionPreference = 'Stop'
$ContainerName = 'factory-ai'

$Status = docker inspect `
  --format '{{.State.Status}} / health={{if .State.Health}}{{.State.Health.Status}}{{else}}not-defined{{end}}' `
  $ContainerName

$Status
docker logs --tail 100 $ContainerName

if ($Status -notmatch '^running') {
  throw 'factory-ai가 실행 중이 아닙니다. 로그를 IT 담당자에게 보내세요.'
}
```

### 10.2 필수 관리자 설정

메뉴 이름은 언어 설정에 따라 한국어와 영어가 함께 보일 수 있다.

1. **Settings → Admin → General**
   - 새 사용자 가입을 끈다.
   - 외부 공유와 불필요한 사용자 메모리 기능을 끈다.
   - Open WebUI 이름·로고·브랜딩은 법무 승인 없이 변경하지 않는다.
2. **Settings → Admin → Connections → Ollama → Manage(렌치 아이콘)**
   - URL이 `http://localhost:11434`인지 확인한다.
   - **Model IDs (Filter)**에 정확한 모델 ID `factory-qwen3-8b:latest` 하나만 넣는다.
   - 저장하고 연결 확인을 누른다.
3. **Admin Panel → Users → Groups → Default Permissions**
   - 일반 사용자의 Models, Knowledge, Tools, Prompts 편집 권한을 끈다.
   - Code Execution, Code Interpreter, Web Search를 끈다.
4. **Settings → Admin → AI → Models → factory-qwen3-8b:latest → Edit → Advanced Params**
   - Function Calling은 **Native**로 둔다.
   - `think`를 **Off**로 둔다.
   - `num_ctx`는 `8192`로 두거나 비워서 서버의 8192를 따른다.
   - 토글을 켰을 때 자동으로 들어가는 `2048`을 그대로 사용하지 않는다.
5. Tools, Functions, Pipelines, Plugins 목록에 사용자가 추가한 항목이 **0개**인지 확인한다.
6. 모델 선택 목록에 `factory-qwen3-8b:latest`만 보이는지 확인한다.
7. 컨테이너를 재시작한 뒤 가입, 외부 연결, Web Search, Tools, Code Execution이 다시 꺼져 있는지 확인한다.

Open WebUI의 일부 설정은 첫 실행 뒤 DB에 저장되어 환경변수보다 우선할 수 있다.
따라서 위 화면 검증과 재시작 후 재검증을 생략하지 않는다.

`think`, Function Calling 또는 Model IDs Filter를 찾을 수 없다면 해당 버전에서 임의 진행하지 않는다.
화면 캡처와 컨테이너 버전을 IT에 전달한다.

### 10.3 브라우저에서 시험

1. 새 채팅을 연다.
2. 모델로 `factory-qwen3-8b`를 선택한다.
3. 아래 질문을 입력한다.

```text
아직 승인 문서를 연결하지 않았습니다.
A공장 어제 불량률을 근거 없이 만들지 말고 한 문장으로 답해 주세요.
```

4. 답변 직후 PowerShell에서 확인한다.

```powershell
$ContainerName = 'factory-ai'

docker exec $ContainerName ollama ps
if ($LASTEXITCODE -ne 0) {
  throw 'ollama ps 확인에 실패했습니다.'
}

nvidia-smi `
  --query-gpu=name,memory.used,utilization.gpu `
  --format=csv

if ($LASTEXITCODE -ne 0) {
  throw 'nvidia-smi 확인에 실패했습니다.'
}
```

**합격 기준**

- 브라우저에서 한국어 답변이 나온다.
- 값을 추측하지 않는다.
- CONTEXT가 8192다.
- 브라우저 주소는 `127.0.0.1:3000`이다.
- 다른 PC에서는 이 UI와 11434에 접속되지 않는다.

여기까지 통과하면 체크리스트의 **마일스톤 B**에 표시한다.

---

## 11. 마일스톤 C — 교육용 가상 문서 검색

RAG는 모델을 다시 학습시키는 것이 아니다.
질문과 관련된 문서 일부를 먼저 찾고, 그 내용을 Qwen에게 같이 보여 주는 방식이다.

처음부터 실제 작업표준서를 올리지 말고 제공된 가상 문서로 동작을 확인한다.

### 11.1 문서 검색 설정

브라우저에서 다음을 설정한다.

1. **Settings → Admin → Tools → Documents**
2. Embedding Engine: `Ollama`
3. Ollama URL: `http://localhost:11434`
4. Embedding Model: `qwen3-embedding:0.6b`
5. Chunk Size: `1000`
6. Chunk Overlap: `100`
7. Top K: `3`
8. Hybrid Search: 켬
9. Full Context: 끔
10. 모델의 Function Calling이 **Native**인지 다시 확인한다.
11. 기본 Knowledge 도구 사용은 켜고, 실험적인 `KB Exec`은 끈다.
12. 저장한다.

v0.11.0에서 위 경로 또는 항목이 보이지 않으면 다른 메뉴를 임의로 바꾸지 말고 화면을 IT에 전달한다.
임베딩 모델을 변경하면 기존 문서를 모두 다시 색인해야 한다.

### 11.2 가상 Knowledge 만들기

1. 왼쪽 메뉴에서 **Workspace → Knowledge**를 누른다.
2. **Create**를 누른다.
3. 이름을 `KB-교육용-가상문서`로 입력한다.
4. 공개 범위는 `Private`으로 둔다.
5. 파일 추가를 누른다.
6. 다음 파일을 선택한다.

```text
D:\LocalLLM\guide\sample-data\교육용-가상문서-절대업무사용금지.md
```

7. 처리 중 표시가 끝날 때까지 기다린다.
8. 오류가 없고 파일이 Knowledge 안에 보이는지 확인한다.

### 11.3 채팅에 Knowledge 연결

1. 새 채팅을 연다.
2. `factory-qwen3-8b:latest`를 선택한다.
3. 입력창에서 `#`을 입력하고 `KB-교육용-가상문서`를 선택한다.
4. 첨부된 Knowledge 이름을 눌러 검색 방식을 **Focused Retrieval**로 둔다.
5. 아래 질문을 차례로 입력한다.

```text
먼저 query_knowledge_files 도구로 연결된 교육용 문서를 검색하세요.
TEST-PART-742의 점검 주기는 며칠인가요?
문서명과 근거도 표시해 주세요.
```

```text
먼저 query_knowledge_files 도구로 연결된 교육용 문서를 검색하세요.
TEST-PART-742의 기준 체결 토크는 얼마인가요?
숫자와 단위를 원문 그대로 답해 주세요.
```

**정답**

- 점검 주기: `17일`
- 기준 체결 토크: `23 N·m`
- 근거 파일: `교육용-가상문서-절대업무사용금지.md`

다음도 시험한다.

```text
이 문서에 없는 TEST-PART-742의 구매 가격을 알려주세요.
```

**정답 동작:** 가격을 만들지 않고 문서에서 확인할 수 없다고 답한다.

합격 기준은 숫자만 맞는 것이 아니다.

- 17일과 23 N·m를 정확히 답한다.
- 답변 과정의 도구 활동에 `query_knowledge_files` 호출이 보인다.
- 출처 파일을 표시한다.
- 없는 가격을 추측하지 않는다.
- 답변의 출처를 눌렀을 때 올린 문서가 확인된다.

Native 모드에서는 Knowledge 내용이 자동으로 들어가지 않고 모델이 검색 도구를 호출해야 한다.
도구 호출이 없으면 Full Context로 바꾸어 합격 처리하지 말고 RAG 시험 실패로 기록한다.

하나라도 실패하면 실제 사내 문서로 넘어가지 않는다.

---

## 12. 마일스톤 D — 승인된 실제 문서 3~10개

**작업 위치:** IT 보안 전환을 마친 같은 PC, 일반 사용자 계정  
**필수 승인:** 데이터 소유 부서, IT 보안, 네트워크 담당  
**예상 시간:** 문서 정리와 검수에 따라 1시간 이상

### 12.1 실제 문서 전환 중단 게이트

현재 컨테이너는 교육용 다운로드를 위해 `OFFLINE_MODE=false`로 만들어졌고 첫 계정은 관리자다.
따라서 아래 표의 **서면 증적을 IT가 모두 제공하기 전에는 실제 사내 문서를 업로드하지 않는다.**

| IT 확인 항목 | 통과 조건 |
|---|---|
| 외부 통신 | 호스트와 컨테이너의 비승인 인터넷 egress가 방화벽에서 실패하고 로그가 남음 |
| Offline Mode | 필요한 자산 반입 후 IT가 같은 승인 image ID로 `OFFLINE_MODE=true`를 적용하고 재검증 |
| OT 경로 | Level 0~2 PLC·DCS·SCADA·안전계장으로 가는 route가 없고 dual-homing이 아님 |
| MES 경로 | 필요한 경우 IDMZ 또는 승인된 보고 복제본·조회 API만 allowlist로 허용 |
| 저장 위치 | Docker disk image의 실제 위치, BitLocker, 관리자 범위와 보존 정책 승인 |
| 백업 | `factory-open-webui`, `factory-ollama` 두 볼륨의 백업과 복원 시험 성공 |
| 사용자 분리 | IT 보관 관리자와 일상 질의용 일반 User 계정을 분리 |
| 권한 | 일반 User는 모델·Knowledge 읽기만 가능하고 Tools·코드·외부 검색·편집 권한이 없음 |
| 확장 기능 | 설치된 Tools, Functions, Pipelines, Plugins가 0개 |
| 공급망 | image·내부 Ollama·모델·임베딩 버전, digest, SBOM, 취약점과 라이선스 승인 |
| 재시작 | 가입·외부 연결·Web Search·Tools·Code Execution 비활성화가 재시작 후 유지됨 |

`OFFLINE_MODE=true`만으로는 외부망이 차단되지 않는다.
방화벽·VLAN·route와 서버 측 권한 검증이 실제 보안 경계다.
컨테이너 재생성, 볼륨 연결, 방화벽과 백업 작업은 초보자가 수행하지 않고
[전문가용 README.md](./README.md)에 따라 IT가 진행한다.

일상 질문은 일반 User 계정으로만 하고, 관리자 계정은 설정 변경 때만 IT가 사용한다.
이 게이트를 통과해도 아래 범위는 저위험 단일 사용자 PoC이며 운영 승인이 아니다.

### 12.2 올려도 되는 문서

- 데이터 소유자가 AI 검색 사용을 승인한 최신본
- 개인정보·고객비밀·인사·원가가 없는 저위험 문서
- 같은 사용 권한을 가진 문서
- 텍스트 추출 상태를 사람이 확인한 문서

### 12.3 올리면 안 되는 문서

- 승인받지 않은 개인정보·인사·원가·고객 자료
- 폐기본과 개정 전 문서
- 매크로, 실행 파일, 암호화 파일
- MES에서 내려받은 계속 변하는 실적 엑셀
- 권한이 다른 부서 문서를 한 Knowledge에 섞은 자료
- 개인 USB나 개인 클라우드에서 가져온 파일

### 12.4 문서 준비

1. 문서 파일명을 `공장_라인_설비_문서번호_개정_시행일` 형식으로 맞춘다.
2. [data-inventory-template.csv](./data-inventory-template.csv)에 소유 부서, 개정번호, 시행일, 권한과 승인 여부를 적는다.
3. 스캔 PDF는 품번, 소수점, `O/0`, `I/1`, `mm`, `℃`, `%`가 맞는지 사람이 확인한다.
4. 먼저 3개 문서만 별도의 Private Knowledge에 올린다.
5. 첫 기능 점검용으로 정답을 이미 아는 질문 10개를 준비한다.
6. 문서명·개정·페이지와 답을 대조한다.

기본 Open WebUI 업로드만으로 부서별 ACL과 페이지 메타데이터가 항상 보장되는 것은 아니다.
권한이 다른 사용자가 2명 이상이거나 페이지 단위 인용이 필수라면 여기서 멈추고 외부 검색 API와 서버 측 ACL을 전문가가 구성해야 한다.

### 12.5 실제 문서 합격 기준

- 최신본에서만 답한다.
- 문서명·개정·페이지 또는 절을 표시한다.
- 품번, 알람 코드, 숫자와 단위가 원문과 같다.
- 자료가 없으면 추측하지 않는다.
- 권한 없는 문서는 내용과 존재 여부를 노출하지 않는다.

[acceptance-test-template.csv](./acceptance-test-template.csv)에 실제 질문과 결과를 기록한다.
운영 전에는 자료 없음, 충돌 문서, 폐기본, 권한 위조, 문서 내 프롬프트 인젝션,
비정상 파일, OCR 숫자·단위, 반복 질문과 재시작 후 설정을 포함한 최소 50개 골든셋을 필수 검수한다.

---

## 13. MES/ERP 실시간 수치가 필요할 때

문서를 업로드하는 것만으로 오늘 생산량, 현재 불량률, 작업지시 상태가 자동 갱신되지는 않는다.
MES·DB·보안 담당자에게 아래 요구사항을 그대로 전달한다.

| 요청 항목 | 반드시 지킬 조건 |
|---|---|
| 데이터 원본 | 운영 테이블 직접 연결 금지, 승인된 보고 View 또는 복제본 |
| 계정 | SELECT 전용, 필요한 공장·라인·KPI만 허용 |
| API | `get_production_summary`처럼 고정된 조회 함수만 제공 |
| 금지 API | `run_sql(sql_text)`, 임의 SQL, INSERT·UPDATE·DELETE·DDL |
| 사용자 | 모델이 보낸 사용자명을 믿지 않고 SSO/OIDC/mTLS 주체를 서버가 검증 |
| 제한 | 조회 기간, 반환 행 수, timeout, 허용 KPI를 서버가 강제 |
| 결과 | 공장·라인·기간·교대·단위·집계 기준·데이터 기준시각 포함 |
| 검수 | 공식 MES 리포트와 값·단위 100% 일치 |
| OT | PLC·DCS·SCADA·안전계장으로 가는 route와 쓰기 기능 없음 |

DB 비밀번호, API 토큰, 연결 문자열을 채팅이나 Modelfile에 넣지 않는다.
구체 구현은 [상세판 13장 — MES/ERP 실시간 수치 연계](./README.md#13-9단계--meserp-실시간-수치-연계)를 사용한다.

---

## 14. 매일 켜고 끄는 방법

### 14.1 켜기

1. Docker Desktop을 연다.
2. 실행 상태가 될 때까지 기다린다.
3. PowerShell에서 아래를 실행한다.

```powershell
$ErrorActionPreference = 'Stop'
$ContainerName = 'factory-ai'

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw 'docker 명령이 없습니다.'
}

$DockerServer = docker version --format '{{.Server.Version}}' 2>$null
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($DockerServer)) {
  throw 'Docker Desktop이 준비되지 않았습니다.'
}

$Existing = docker ps -a `
  --filter "name=^/$ContainerName$" `
  --format '{{.Names}}'

if (-not $Existing) {
  throw 'factory-ai 컨테이너가 없습니다. 새로 만들지 말고 구축 담당자에게 확인하세요.'
}

$State = (
  docker inspect --format '{{.State.Status}}' $ContainerName
).Trim()

if ($LASTEXITCODE -ne 0) {
  throw 'factory-ai 상태를 확인할 수 없습니다.'
}

if ($State -ne 'running') {
  docker start $ContainerName | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw 'factory-ai 시작에 실패했습니다.'
  }
}

$Ready = $false
for ($Attempt = 1; $Attempt -le 90; $Attempt++) {
  $ApiResult = docker exec $ContainerName ollama list 2>$null
  $ApiExitCode = $LASTEXITCODE

  try {
    $WebResult = Invoke-WebRequest `
      -UseBasicParsing `
      -TimeoutSec 2 `
      -Uri 'http://127.0.0.1:3000'
  }
  catch {
    $WebResult = $null
  }

  if (
    $ApiExitCode -eq 0 -and
    $ApiResult -and
    $WebResult -and
    $WebResult.StatusCode -ge 200 -and
    $WebResult.StatusCode -lt 500
  ) {
    $Ready = $true
    break
  }

  Start-Sleep -Seconds 2
}

if (-not $Ready) {
  docker logs --tail 100 $ContainerName
  throw '3분 안에 모델 서버와 브라우저 화면이 준비되지 않았습니다.'
}

$Ports = @(docker port $ContainerName)
if ($Ports -notmatch '8080/tcp -> 127\.0\.0\.1:3000') {
  throw "UI가 loopback 포트에만 연결되지 않았습니다: $Ports"
}

if ($Ports -match '11434') {
  throw "11434가 Windows에 공개되었습니다: $Ports"
}

docker ps `
  --filter "name=^/$ContainerName$" `
  --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

Write-Host '일상 시작 확인 완료' -ForegroundColor Green
```

4. 브라우저에서 `http://127.0.0.1:3000`을 연다.

`--restart unless-stopped` 설정 때문에 Docker Desktop 시작 시 자동으로 켜질 수 있다.
이미 `Up` 상태라면 `docker start`가 현재 이름을 표시하는 것은 정상이다.

### 14.2 끄기

진행 중인 답변과 문서 색인이 없는지 확인한 뒤 실행한다.

```powershell
$ErrorActionPreference = 'Stop'
$ContainerName = 'factory-ai'

$State = (
  docker inspect --format '{{.State.Status}}' $ContainerName
).Trim()

if ($LASTEXITCODE -ne 0) {
  throw 'factory-ai 상태를 확인할 수 없습니다.'
}

if ($State -eq 'running') {
  docker stop --time 30 $ContainerName | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw 'factory-ai를 정상 종료하지 못했습니다.'
  }
}

$FinalState = (
  docker inspect --format '{{.State.Status}}' $ContainerName
).Trim()

if ($FinalState -ne 'exited') {
  throw "종료되지 않았습니다: $FinalState"
}

Write-Host '정상 종료 완료' -ForegroundColor Green
```

초록색 `정상 종료 완료`가 보이면 Docker Desktop을 정상 종료할 수 있다.

### 14.3 절대 실행하지 말 것

- `docker volume rm`
- `docker compose down -v`
- 모델·볼륨 폴더 수동 삭제
- `robocopy /MIR`로 백업 복원
- 검색으로 찾은 “초기화” 또는 “강제 삭제” 명령

`factory-open-webui` 볼륨에는 계정, 대화, Knowledge와 검색 인덱스가 있다.
`factory-ollama` 볼륨에는 모델이 있다.
실제 사내 문서를 올리기 전에 IT가 두 볼륨의 백업·복원 시험을 완료해야 한다.

---

## 15. 자주 막히는 문제

| 보이는 현상 | 먼저 할 일 | 하지 말 것 |
|---|---|---|
| `docker` 명령을 찾을 수 없음 | Docker Desktop 설치와 현재 계정 권한을 IT에 요청 | 임의 설치 사이트 이용 |
| Docker Server가 표시되지 않음 | Docker Desktop을 열고 엔진 시작 확인 | 보안 프로그램 비활성화 |
| `could not select device driver` | WSL2와 Docker GPU 지원을 IT에 요청 | `--gpus all` 삭제 후 CPU 운영 |
| 3000 또는 11434 사용 중 | 포트와 프로세스 화면을 IT에 전달 | 프로세스 강제 종료 |
| 이미지 pull 실패 | 회사 프록시·GHCR 허용 여부 확인 | 개인 핫스팟·VPN 사용 |
| 모델 pull 중단 | 승인 인터넷을 확인하고 같은 pull을 다시 실행 | 출처 불명 GGUF 다운로드 |
| digest 불일치 | 즉시 중지하고 파일·출처 재검토 | 기대값 수정 또는 검사 삭제 |
| 브라우저가 열리지 않음 | `docker ps`와 `docker logs --tail 100 factory-ai` 확인 | 컨테이너·볼륨 삭제 |
| 모델이 목록에 없음 | Ollama 연결과 Model IDs Filter 확인 | 외부 모델 연결 추가 |
| 답변이 매우 느림 | 다른 GPU 앱 종료 후 `ollama ps` 확인 | 무작정 더 큰 모델 설치 |
| 문서 답이 틀림 | 최신본·OCR·검색 출처 확인 | 답변을 정답으로 간주 |
| 다른 PC에서도 접속됨 | 즉시 운영 중지, 방화벽과 포트 바인딩을 IT가 점검 | LAN 공개 지속 |

오류를 전달할 때는 다음 세 가지를 함께 보낸다.

```powershell
$ContainerName = 'factory-ai'

docker ps -a `
  --filter "name=^/$ContainerName$" `
  --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}'

docker inspect --format '{{.Image}}' $ContainerName
docker logs --tail 100 $ContainerName
```

로그를 보내기 전에 질문 내용, 사용자명, 문서명 등 민감정보가 없는지 확인한다.

---

## 16. 완료 판정

[BEGINNER-CHECKLIST.md](./BEGINNER-CHECKLIST.md)를 열고 모든 항목을 확인한다.

### 교육용 마일스톤 A~C 완료

다음 세 가지가 모두 성공하면 교육용 가상 문서 PoC가 끝난 것이다.

1. 한국어 모델이 근거 없는 수치를 거절한다.
2. 브라우저가 이 PC의 `127.0.0.1:3000`에서만 열린다.
3. 교육용 가상 문서의 `17일`과 `23 N·m`를 Knowledge 도구와 출처를 사용해 답한다.

이 결과는 설치와 교육용 검색이 동작한다는 뜻일 뿐, 실제 공장 데이터 운영 승인이 아니다.

### 저위험 실제 문서 마일스톤 D 완료

12.1의 IT 보안 전환 게이트를 모두 통과하고,
일반 User 계정으로 실제 승인 문서 질문을 원문과 대조해야 저위험 문서 PoC가 끝난다.
그래도 다중 사용자 운영, MES 연결, 품질 판정 또는 설비 제어 승인을 의미하지 않는다.

다음 중 하나라도 해당하면 **운영 전환 금지**다.

- 무권한 문서가 한 번이라도 노출됨
- MES 공식 리포트와 숫자·단위가 다름
- DB 또는 설비 쓰기 기능이 연결됨
- 11434가 다른 PC에서 접속됨
- 백업 복원 시험을 하지 않음
- 자동 업데이트 또는 `main`·`latest` 태그를 사용함
- 관리자 계정으로 일상 질문을 수행함
- 비승인 인터넷 egress 또는 OT 제어망 route가 남아 있음

---

## 17. 쉬운 용어 설명

| 용어 | 쉽게 말하면 |
|---|---|
| LLM | 사람의 문장을 이해하고 답하는 대형 언어 모델 |
| Qwen3-8B | 이번에 사용하는 약 82억 파라미터 모델 |
| Q4_K_M | 모델을 4비트로 줄여 8 GB GPU에서도 돌리게 한 형식 |
| Ollama | 모델 파일을 읽고 답변을 생성하는 실행 엔진 |
| Open WebUI | Ollama를 브라우저 채팅 화면으로 사용하는 프로그램 |
| Docker image | 프로그램과 실행 환경을 묶어 둔 설치 원본 |
| Container | Docker image를 실제로 실행한 프로그램 |
| Volume | 컨테이너를 껐다 켜도 계정·문서·모델을 보존하는 저장 공간 |
| GPU / VRAM | 모델 계산을 담당하는 그래픽카드 / 그래픽카드 전용 메모리 |
| token | 모델이 글을 읽는 작은 단위 |
| context 8K | 질문·문서·답변을 합쳐 약 8,192 token까지 다루는 설정 |
| system prompt | 모델이 항상 지켜야 할 답변 원칙 |
| RAG | 질문과 관련된 문서를 검색해 모델에게 함께 보여 주는 방식 |
| embedding | 비슷한 의미의 문장을 찾기 위한 숫자 표현 |
| chunk | 긴 문서를 검색하기 좋게 나눈 작은 조각 |
| digest / SHA-256 | 받은 파일이 승인한 원본과 같은지 확인하는 지문 |
| PoC | 실제 운영 전에 작게 가능성을 시험하는 단계 |
| ACL | 사용자마다 볼 수 있는 자료를 서버가 제한하는 규칙 |
| OT | PLC·DCS·SCADA 등 실제 공장 설비 제어 영역 |

---

## 18. 공식 참고자료

- [Ollama Qwen3 8B Q4_K_M](https://ollama.com/library/qwen3:8b-q4_K_M)
- [Open WebUI Docker Quick Start](https://docs.openwebui.com/getting-started/quick-start/)
- [Open WebUI와 Ollama 연결](https://docs.openwebui.com/getting-started/quick-start/connect-a-provider/starting-with-ollama/)
- [Open WebUI Knowledge](https://docs.openwebui.com/features/workspace/knowledge/)
- [Open WebUI 권한과 그룹](https://docs.openwebui.com/features/authentication-access/rbac/groups/)
- [Open WebUI 환경변수 v0.11.0](https://docs.openwebui.com/reference/env-configuration/)
- [Open WebUI v0.11.0 라이선스](https://github.com/open-webui/open-webui/blob/v0.11.0/LICENSE)
- [Open WebUI 보안정책](https://docs.openwebui.com/security/security-policy/)
- [Docker image digest 고정](https://docs.docker.com/reference/cli/docker/image/pull/)
- [Docker named volume](https://docs.docker.com/engine/storage/volumes/)
- [Docker Desktop 저장소 설정](https://docs.docker.com/desktop/settings-and-maintenance/settings/)
- [Docker Desktop 회사 사용 라이선스](https://docs.docker.com/subscription/desktop-license/)
- [NIST SP 800-82 Rev.3 OT 보안](https://csrc.nist.gov/pubs/sp/800/82/r3/final)

운영·폐쇄망·MES·백업·다중 사용자 상세 설계는 [전문가용 README.md](./README.md)를 사용한다.
