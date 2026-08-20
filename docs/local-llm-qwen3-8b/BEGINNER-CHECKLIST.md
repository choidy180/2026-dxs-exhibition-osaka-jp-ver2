# Qwen3-8B 초보자 구축 완료 체크리스트

> 이 체크리스트는 단일 PC·단일 사용자 문서 PoC용이다.  
> 완료해도 교육용 또는 저위험 승인 문서 PoC가 끝난 것이며 **운영 승인이 아니다.**  
> 하나라도 `아니요`이면 다음 마일스톤으로 넘어가지 않는다.

## 기본 기록

| 항목 | 기록 |
|---|---|
| 구축일 | |
| 구축자 | |
| PC 자산번호 | |
| IT 승인번호 | |
| 데이터 소유자 승인번호 | |
| Open WebUI 버전 | `v0.11.0` |
| Open WebUI manifest digest | `sha256:d8a4a89f198cce7fb8eef122f07d2f77c3bc22b923f2f2d479188161aa8f88f1` |
| Linux AMD64 manifest digest | `sha256:6e82f2ee8e63205e11dc605030c01bf3d218b36f04f2d9ad0f3f41f214a36dba` |
| 로컬 Docker image ID | |
| 컨테이너 내부 Ollama 버전 | |
| Docker disk image 위치·한도 | |
| SBOM·취약점 점검일 | |
| Qwen 모델 digest | `500a1f067a9f782620b40bee6f7b0c89e17ae61f686b92c24933e4ca4b2b8b41` |
| factory 모델 digest | |
| 임베딩 모델 digest | `ac6da0dfba84a81fdbfbaf330198c33cd77c4cdfc53e8bc50eb581914a15621d` |
| Modelfile SHA-256 | `88A29B4E218299802A59F61B9CD3BDA42A40CBA9ADBF5B1C40F70862F0C879AC` |
| 시스템 프롬프트 SHA-256 | `B0F0E554838050829A04FC7910D184E8A39FE0E86F7BA025C43A7C888966444A` |

## 0. 시작 승인

- [ ] 회사가 이 PC의 로컬 LLM PoC를 승인했다.
- [ ] Docker Desktop 회사 사용 조건과 Open WebUI 라이선스를 확인했다.
- [ ] 네트워크팀이 Level 0~2 PLC·DCS·SCADA·안전계장으로 가는 route가 없음을 증적으로 확인했다.
- [ ] IT망·제어망 dual-homing이 아니며 필요한 MES는 IDMZ·보고 복제본·allowlist 경로만 사용한다.
- [ ] 첫 시험 자료가 가상 문서 또는 데이터 소유자가 승인한 저위험 문서다.
- [ ] 이 초보자판의 승인된 인터넷 다운로드 방식을 IT가 승인했다.

## A. 모델 실행

- [ ] Linux/AMD64 Docker Engine, RTX 5060, RAM 32 GB를 확인했다.
- [ ] Docker disk image의 승인 위치·암호화·storage limit·실제 여유 공간 35 GB 이상을 확인했다.
- [ ] `factory-ai`가 고정된 승인 image ID로 실행된다.
- [ ] Windows에 공개된 포트는 `127.0.0.1:3000`뿐이다.
- [ ] `factory-qwen3-8b`가 `Q4_K_M`과 context `8192`로 실행된다.
- [ ] 근거 없는 공장 생산량을 묻자 숫자를 만들지 않고 거절했다.
- [ ] `ollama ps`에서 GPU 적재를 확인했다.

## B. 브라우저

- [ ] 첫 로컬 관리자 계정을 만들고 신규 가입을 껐다.
- [ ] Ollama 연결의 Model IDs Filter에 `factory-qwen3-8b:latest`만 허용했다.
- [ ] Function Calling은 Native, thinking은 Off, `num_ctx`는 8192다.
- [ ] Web Search, 외부 연결, 코드 실행, 일반 사용자의 Workspace 편집을 껐다.
- [ ] Tools, Functions, Pipelines, Plugins에 추가 항목이 0개다.
- [ ] 컨테이너 재시작 뒤 보안 설정이 유지되는지 다시 확인했다.
- [ ] 다른 PC에서는 UI와 Ollama 11434에 접속되지 않는다.

## C. 교육용 RAG

- [ ] 임베딩 모델은 `qwen3-embedding:0.6b`다.
- [ ] `KB-교육용-가상문서`를 Private으로 만들었다.
- [ ] 점검 주기 질문에 `17일`이라고 답했다.
- [ ] 체결 토크 질문에 `23 N·m`라고 답했다.
- [ ] 두 질문에서 `query_knowledge_files` 도구 호출을 확인했다.
- [ ] 답변에 교육용 가상 문서 출처가 표시됐다.
- [ ] 문서에 없는 구매 가격을 추측하지 않았다.

## D. 실제 승인 문서

- [ ] IT가 비승인 인터넷 egress 차단과 방화벽 로그를 확인했다.
- [ ] IT가 필요한 자산 준비 후 `OFFLINE_MODE=true` 적용과 재시작 검증을 완료했다.
- [ ] IT 보관 관리자와 일상 질의용 일반 User 계정을 분리했다.
- [ ] 일반 User는 승인 모델·Knowledge 읽기만 가능하고 편집·Tools·코드 권한이 없다.
- [ ] 최신 승인본 3~10개만 별도 Private Knowledge에 넣었다.
- [ ] 문서 소유자·개정·시행일·권한을 data inventory에 기록했다.
- [ ] 정답을 아는 질문 10개 이상을 사람이 원문과 대조했다.
- [ ] 문서명·개정·페이지 또는 절이 답변에 표시됐다.
- [ ] OCR의 품번·소수점·단위 오류를 표본 검수했다.
- [ ] 실제 문서 사용 전에 볼륨 백업과 복원 시험을 IT가 완료했다.
- [ ] 운영 검토 전 보안·정확도·반복·재시작을 포함한 골든셋 50개 이상을 검수했다.

## 즉시 No-Go

연결하고 실제로 시험한 항목은 “0건”이어야 한다.
아직 연결하지 않아 시험할 수 없는 항목은 합격으로 바꾸지 말고 `N/A—미연결·미검증`으로 기록한다.

| 항목 | 결과 |
|---|---|
| 무권한 문서 노출 | 0건 / N/A—단일 관리자 교육시험 |
| DB·MES 쓰기 성공 | N/A—MES 미연결·미검증 |
| PLC·DCS·SCADA 제어 경로 | 0건 / |
| 외부 PC의 11434 접속 성공 | 0건 / |
| 공식 KPI와 숫자·단위 불일치 | N/A—MES 미연결·미검증 |

## 최종 서명

| 역할 | 이름/서명 | 날짜 |
|---|---|---|
| 구축자 | | |
| IT/보안 | | |
| 데이터 소유 부서 | | |
| 생산기술/품질 | | |

이 서명은 PoC 결과 확인이며 운영·안전·품질 자동화 승인이 아니다.
상세 운영 검수는 [acceptance-test-template.csv](./acceptance-test-template.csv)를 사용한다.
