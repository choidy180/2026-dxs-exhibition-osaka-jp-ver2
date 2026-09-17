"""현재 회사 PC 환경용 안내서. 주소는 확인일 기준이며 화면 그림은 설명용이다."""
from pathlib import Path
import json
import subprocess
from xml.sax.saxutils import escape

from fontTools.ttLib import TTFont as FontSource
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph, Table, TableStyle
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / 'tmp/pdfs/field-guides'
OUT = ROOT / 'output/pdf'
TMP.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
tokens = json.loads(subprocess.run(
    ['node', '--require', 'tsx/cjs', '-e',
     "const {color,tone} = require('./styles/design-tokens.ts'); console.log(JSON.stringify({color,tone}));"],
    cwd=ROOT, check=True, capture_output=True, text=True, encoding='utf-8').stdout)
C, T = tokens['color'], tokens['tone']
for weight, source in [('R', 'Regular'), ('M', 'Medium'), ('S', 'SemiBold')]:
    dest = TMP / f'Pretendard-{source}.ttf'
    f = FontSource(ROOT / f'public/fonts/Pretendard-{source}.woff2')
    f.flavor = None
    f.save(dest)
    pdfmetrics.registerFont(TTFont(weight, str(dest)))
pdfmetrics.registerFont(TTFont('Code', 'C:/Windows/Fonts/consola.ttf'))

W, H, M = 595.276, 841.89, 42
BW = W - M * 2
DATE = '2026.09.17'
HOST = '192.168.22.211'
PC_DIR = r'C:\dev\2026-mode-dxs'
ORIGIN = f'https://{HOST}:3000'
APP_URL = f'{ORIGIN}/lab/push'
CERT_URL = f'http://{HOST}:3001/lab/push/test-ca.crt'
RUN_COMMAND = f'npm.cmd run push:phone -- --host={HOST}'
SETUP_COMMAND = f'npm.cmd run push:setup -- --phone --host={HOST}'
SOURCES = {
    'node': ('Node.js 공식 다운로드', 'https://nodejs.org/en/download'),
    'ca': ('Android: CA 인증서는 설정에서 설치', 'https://developer.android.com/reference/android/security/KeyChain#createInstallIntent()'),
    'samsung': ('삼성 담당자: 갤럭시 CA 설치 경로', 'https://r1.community.samsung.com/t5/갤럭시-s/내파일인증서설치질문/td-p/17052607'),
    'chrome': ('Google Chrome: Android 웹앱 설치', 'https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=ko'),
    'mkcert': ('mkcert: 휴대폰 신뢰 인증서 안내', 'https://github.com/FiloSottile/mkcert#mobile-devices'),
    'knox': ('Samsung Knox: 인증서 설치 정책', 'https://docs.samsungknox.com/dev/knox-sdk/features/mdm-providers/security/trust-anchors/'),
    'install': ('Google: 웹앱 설치와 WebAPK', 'https://web.dev/learn/pwa/installation'),
}


def note(title, body, tone='info'):
    return ('note', title, body, tone)


def step(title, body):
    return ('step', title, body)


def code(title, commands, body=''):
    return ('code', title, commands, body)


def table(headers, rows, widths=None):
    return ('table', headers, rows, widths)


def bullets(title, items):
    return ('bullets', title, items)


def refs(keys):
    return ('refs', keys)


PC = [
    ('PC 운영자용 설치·사용 가이드', '현재 회사 PC의 실제 주소와 실행 명령으로 안내합니다. 확인일: '+DATE, [
        note('현재 PC는 계정 설정과 서버 실행을 마쳤습니다', '앱이 열리면 서버 창을 그대로 유지하고 4쪽부터 진행하세요. 재시작할 때만 3쪽을 따릅니다. npm run dev를 추가 실행하면 잠금 충돌이 납니다.'),
        ('route', ['PC 연결', '서버 실행', 'CA 설치', '앱 설치', '로그인·ON']),
        table(['현재 환경', '확인된 값'], [
            ['프로젝트 폴더', PC_DIR],
            ['PC Wi-Fi IPv4', HOST+' / 앱 3000번, 인증서 3001번'],
            ['선택하지 않는 주소', '172.19.224.1은 WSL 가상 네트워크 주소입니다.'],
            ['휴대폰 연결', 'PC와 같은 Wi-Fi에 연결합니다. Wi-Fi 이름은 운영자가 안내합니다.'],
        ], [133, BW-133]),
        note('현재 현장 구성의 범위', 'push:phone이 Next 개발 서버와 푸시 워커를 함께 실행합니다. 별도 운영 빌드·공인 도메인 배포로 전환된 구성은 아닙니다. Push는 실제 장애와 무관한 시험 알림입니다.'),
        ('index', [('최초 설정이 필요할 때', 2), ('현재 PC 서버 실행', 3), ('사용자에게 전달·시연', 4), ('IP 변경·PC 교체', 5), ('CA 인증서 문제 해결', 6), ('접속·실행 오류 해결', 7), ('운영·현장 확인표', 8), ('CCTV 연동 확인', 9)]),
        ('small', '이 문서의 주소는 확인일의 실제 값입니다. 고정 IP 예약 여부는 확인하지 않았으므로 네트워크 변경 후에는 5쪽에서 주소를 다시 확인하세요.'),
    ]),
    ('최초 설정이 필요한 경우만', '현재 PC는 설정 완료 상태입니다. 평소에는 이 페이지를 건너뛰고 3쪽으로 이동하세요.', [
        note('기존 계정·키를 유지하세요', '.env.push-test.local이 있으면 다시 만들지 않습니다. “설정 파일이 이미 있습니다”도 정상 안내입니다. setup을 반복하거나 기존 파일을 삭제할 필요가 없습니다.'),
        code('설정 파일이 없는 경우에만 실행', [f'Set-Location "{PC_DIR}"', SETUP_COMMAND], '--phone과 --host를 모두 포함하세요. 주소가 자동으로 정해지면 다음 질문에 답합니다. 현재 PC에 패키지 재설치는 필요하지 않습니다.'),
        table(['질문', '입력할 내용'], [
            ['테스트 계정 ID', '영문·숫자·밑줄(_)·하이픈(-), 1~64자. 휴대폰에서 사용할 로그인 ID입니다.'],
            ['테스트 비밀번호', '비어 있지 않은 비밀번호를 정합니다. 입력 내용은 화면에 보이지 않습니다.'],
            ['VAPID 연락처', 'mailto: 뒤에 담당자의 실제 이메일을 입력합니다. 예: mailto:admin@example.com (예시 주소는 바꾸세요). 메일 로그인·인증 절차가 아닙니다.'],
        ], [138, BW-138]),
        code('“내부 HTTPS 주소”를 물으면 이 값만 입력', [ORIGIN], '--phone을 빠뜨렸을 때 나오는 질문입니다. 위 주소를 입력하고 Enter를 누르면 계속 진행할 수 있습니다. 뒤에 /lab/push는 붙이지 않습니다.'),
        step('설정 완료 후', '“.env.push-test.local 생성 완료”가 나오면 3쪽의 서버 실행 명령을 사용합니다. 휴대폰 로그인에는 여기에서 정한 ID와 비밀번호를 사용합니다.'),
    ]),
    ('현재 PC 서버 실행', '서버가 꺼져 있거나 재시작할 때만 실행하세요. 이미 앱이 열리면 기존 창을 유지합니다.', [
        step('01  휴대폰 Push OFF 후 기존 서버 종료', '휴대폰의 CCTV Push를 먼저 OFF로 끕니다. 그다음 이 프로젝트의 npm run dev 또는 이전 push:phone 실행 창이 있으면 Ctrl+C로 종료합니다.'),
        code('02  PowerShell에 한 줄씩 입력', [f'Set-Location "{PC_DIR}"', RUN_COMMAND], 'Windows 인증서 설치 확인창이 나오면 현재 실행 요청인지 확인하고 진행합니다. 아래 Ready 표시가 나올 때까지 기다리세요.'),
        ('terminal',),
        note('주소 선택 메시지는 --host 옵션으로 해결', HOST+'가 현재 Wi-Fi 주소입니다. 172.19.224.1은 WSL 가상 주소이므로 선택하지 않습니다. 위 명령을 옵션까지 통째로 복사하면 주소를 다시 고를 필요가 없습니다.'),
        step('03  PC Chrome에서 앱 주소 확인', '위 HTTPS 주소에서 로그인 화면이 열리면 4쪽으로 진행합니다. PC 전원과 실행 창을 유지하세요. 이 명령이 웹 서버와 워커를 함께 켜므로 npm run dev를 추가로 실행하지 않습니다.'),
    ]),
    ('갤럭시 사용자에게 전달·시연', '먼저 휴대폰 한 대로 끝까지 확인한 다음 같은 순서로 다른 사용자에게 안내하세요.', [
        code('인증서 다운로드: 휴대폰 Chrome 주소창에 입력', [CERT_URL]),
        code('인증서 설치 후 CCTV 앱 접속', [APP_URL]),
        step('Wi-Fi와 계정 전달', 'PC와 같은 Wi-Fi 이름과 현재 PC에 설정한 로그인 ID·비밀번호를 사용자에게 안내합니다. 계정 정보는 이 공용 PDF에 포함하지 않습니다.'),
        note('비밀번호는 별도 전달', '공용 안내문이나 사진에 비밀번호를 적지 않습니다. 갤럭시 사용자용 PDF와 함께 주소 두 개를 구분해서 전달하세요.'),
        step('01  CA 설치 후 HTTPS 접속 확인', '갤럭시 Chrome에서 HTTP 인증서 주소를 직접 입력해 파일을 받습니다. 휴대폰 설정의 CA 인증서 메뉴에서 설치하고, HTTPS 앱 주소에 경고 없이 접속되는지 확인합니다. 상세 오류는 6쪽입니다.'),
        step('02  앱 설치·로그인·CCTV 목록 확인', 'Chrome의 앱 설치 메뉴를 사용해 설치합니다. 앱에서 계정으로 로그인하고 목록·검색·카메라 한 대의 실제 영상까지 확인합니다.'),
        step('03  Push ON 후 잠금 화면에서 수신 확인', 'CCTV Push를 ON으로 바꾸고 알림 권한을 허용합니다. 첫 알림과 이후 10초 간격의 반복 수신을 확인합니다. 번호는 1~200 중 무작위이며 본문 끝에 (test)가 붙습니다.'),
        step('04  OFF로 종료 확인', '휴대폰에서 OFF를 누르고 추가 반복이 멈추는지 확인합니다. 이미 전송된 일부 알림은 늦게 도착할 수 있습니다. 필요하면 다시 ON으로 시연합니다.'),
    ]),
    ('IP 변경·PC 교체 시 할 일', '같은 이름의 인증서 파일이라도 만든 PC가 다르면 내용은 다를 수 있습니다.', [
        note('이동 전 필수: 휴대폰 OFF → PC Ctrl+C', '기존 주소의 반복 등록과 새 주소의 등록은 별개입니다. 기존 ON을 남겨 두면 예전 알림까지 함께 받을 수 있습니다. 앱 아이콘 삭제만으로 서버 반복 종료를 보장하지 않습니다.', 'warning'),
        table(['상황', 'PC 운영자', '갤럭시 사용자'], [
            ['같은 PC·같은 IP', '3쪽 명령으로 실행. 기존 계정·키 유지.', '기존 주소와 앱 사용. 상태 확인 후 ON.'],
            ['같은 PC·새 IP', 'ipconfig의 Wi-Fi IPv4를 확인하고 3쪽 --host 값을 새 주소로 바꿔 실행.', '새 주소로 접속·로그인·ON. 기존 아이콘이 옛 주소를 열면 새 주소에서 다시 설치.'],
            ['새 PC 또는 새 CA', '새 PC 설정·실행 후 새 인증서와 주소 전달.', '현재 PC의 CA 설치 후 새 주소 접속·로그인·ON.'],
        ], [100, 190, BW-290]),
        step('같은 PC에서 IP만 바뀌었다면', '같은 Windows 사용자와 기존 CA를 유지한 경우 휴대폰 CA를 다시 설치할 필요는 없습니다. 서버 실행 명령이 새 IP에 맞는 서버 인증서를 준비합니다. .env 파일의 계정·키를 삭제하거나 setup을 다시 실행하지 않습니다.'),
        step('Windows 사용자나 CA까지 바뀌었다면', '같은 물리적 PC라도 새 CA가 생성되면 휴대폰에 새 CA가 필요합니다. 판단이 어렵거나 인증서 경고가 남으면 현재 실행 창의 인증서 주소에서 다시 받아 담당자와 확인합니다.'),
        note('이미 이동해서 예전 주소가 열리지 않는 경우', '예전 서버·주소를 다시 사용할 수 있으면 기존 앱에서 OFF로 정리하세요. 어렵다면 담당 개발자에게 이전 등록의 발송 중단을 요청합니다. 새 주소에서 ON하는 것만으로 이전 등록이 정리되지는 않습니다.'),
        ('small', '별도 APK를 사용 중이라면 서버 IP·포트·CA 변경 시 APK 재빌드와 재설치가 필요합니다. 이 가이드는 현장 주소 변경에 대응하기 쉬운 Chrome 웹앱을 기준으로 합니다.'),
    ]),
    ('CA 인증서 문제 해결', '인증서 신뢰 문제와 네트워크 연결 문제를 구분해서 확인합니다.', [
        note('먼저 확인할 정상 순서', 'HTTP 주소에서 push-test-ca.crt 다운로드 → 갤럭시 설정의 CA 인증서로 설치 → HTTPS 앱 주소 접속. 다운로드만 하거나 오류창을 넘기는 것으로 설치가 끝나지 않습니다.'),
        table(['증상', '운영자가 안내할 해결 방법'], [
            ['“CA 인증서를 설치할 수 없음”', '파일을 직접 열던 창을 닫습니다. 설정에서 “인증서 설치” 검색 → CA 인증서 → Download의 방금 받은 파일을 선택합니다. Android 11 이상은 설정 앱에서 설치합니다.'],
            ['CA 메뉴에서 파일 선택 후 실패', 'VPN 및 앱 사용자 인증서/Wi-Fi 인증서가 아닌 CA 메뉴인지 확인합니다. 현재 PC의 주소에서 다시 받거나 아래 USB 방식으로 전달합니다. 같은 이름의 옛 파일과 구분합니다.'],
            ['설치했는데 HTTPS 경고가 남음', '실행 창의 현재 IP·포트인지, 현재 PC의 CA인지, PC와 휴대폰 날짜·시간이 맞는지 확인합니다. Chrome을 완전히 종료 후 다시 열고 재시도합니다. 필요하면 기기를 재시작합니다.'],
            ['메뉴가 없거나 회사 정책으로 차단', 'One UI 버전별 메뉴 이름 차이를 확인합니다. 관리 휴대폰이면 보안 담당자에게 CA 배포·설치를 요청합니다. 업무 프로필과 개인 프로필의 인증서가 다를 수 있습니다.'],
        ], [156, BW-156]),
        code('다운로드가 막힐 때: USB로 이 파일만 전달', [PC_DIR+r'\.data\push-test-ca.crt'], '휴대폰 Download 폴더에 복사한 뒤 설정에서 설치합니다. rootCA-key.pem 등 개인키 파일은 전달하지 않습니다.'),
        ('small', 'Chrome 경고를 무시해 접속하는 방법으로 대체하지 않습니다. 사설 CA 설치가 허용되지 않는 현장은 회사에서 승인한 HTTPS 인증서·접속 주소를 담당자와 준비해야 합니다.'),
        refs(['ca', 'mkcert', 'knox']),
    ]),
    ('접속·실행 오류 해결', '이번 PC에서 실제 겪은 주소 선택·입력·중복 실행 오류를 먼저 확인합니다.', [
        table(['이렇게 보이면', '이렇게 확인하세요'], [
            ['내부 주소가 여러 개입니다', '3쪽 명령의 --host='+HOST+'까지 입력합니다. 172.19.224.1은 선택하지 않습니다.'],
            ['내부 HTTPS 주소를 물음', 'setup에 --phone이 빠진 상태입니다. '+ORIGIN+'을 입력하고 계속 진행합니다. /lab/push는 붙이지 않습니다.'],
            ['Unable to acquire lock / 3초 후 재시작', '중복 개발 서버 때문에 반복됩니다. 아래 순서대로 두 실행 창을 정리한 뒤 한 번만 실행합니다.'],
            ['PC에서는 열리는데 폰은 안 열림', '같은 내부망·현재 IP·Windows 방화벽·Wi-Fi 단말 간 통신 차단을 확인합니다. 기본 TCP 3000/3001 허용은 회사 관리자에게 요청합니다. 영상 연결은 별도 네트워크 확인도 필요합니다.'],
            ['“웹앱을 설치할 수 없음”', '먼저 인증서 경고 없이 현재 HTTPS 페이지가 열리는지 확인합니다. 이후 Chrome 업데이트, 인터넷과 회사 설치 정책을 점검합니다. 내부 페이지 접속과 Google 설치 통신은 별개입니다.'],
            ['ON인데 알림이 없거나 상태 불확실', '휴대폰·Chrome 알림 허용, 방해 금지, 인터넷, PC 실행 창을 확인합니다. 화면의 재시도/상태 재확인으로 갱신하고 불확실하면 알림 중단을 누릅니다. 실패로 OFF가 됐다면 해결 후 다시 ON합니다.'],
        ], [152, BW-152]),
        step('반복 재시작을 멈추는 순서', '① 반복되는 push:phone 창에서 Ctrl+C ② 기존 npm run dev 또는 다른 push:phone 창에서도 Ctrl+C ③ 이 프로젝트 서버가 모두 종료된 뒤 아래 명령을 한 번 실행합니다. 잠금 파일은 실행 중에 삭제하지 않습니다.'),
        code('프로젝트 폴더에서 다시 실행', [RUN_COMMAND]),
        ('small', 'baseline-browser-mapping은 데이터 갱신 경고이며 잠금 충돌 원인이 아닙니다. 포트를 바꿔도 개발 잠금 충돌은 해결되지 않습니다. 기존 창을 찾기 어려우면 담당자에게 이 프로젝트 프로세스만 확인하도록 요청하세요.'),
    ]),
    ('운영 순서와 현장 확인표', '시연은 실제 갤럭시에서 아래 항목을 확인한 뒤 시작하세요.', [
        table(['때', '운영 방법'], [
            ['매일 시작', 'PC Wi-Fi 연결 → 3쪽의 --host 포함 명령 → Ready와 주소 확인. 이미 실행 중이면 유지합니다. 계정 setup이나 npm run dev는 반복하지 않습니다.'],
            ['사용 중', 'PC와 휴대폰의 인터넷을 유지합니다. 갤럭시 앱을 닫거나 잠가도 서버가 실행 중이면 반복 발송합니다. 실제 도착 간격은 통신·OS에 따라 달라질 수 있습니다.'],
            ['시연 종료·자리 이동', '휴대폰별 CCTV Push OFF → PC Ctrl+C. PC를 끄는 것만으로 반복 등록을 삭제하지 않으며 다음 실행 때 재개될 수 있습니다.'],
        ], [100, BW-100]),
        ('checks', ['PC에서 현재 HTTPS 주소에 인증서 경고 없이 접속', '갤럭시가 PC와 통신 가능한 Wi-Fi에 연결됨', '갤럭시에 현재 PC의 CA 설치 및 경고 없는 접속', '홈 화면 앱이 현재 주소를 열고 계정 로그인이 됨', 'CCTV 목록·검색·카메라 한 대의 실제 영상 확인', 'ON 첫 알림 + 이후 10초 간격 반복 수신 확인', '화면 잠금·앱 닫기 후 수신과 알림 클릭 확인', 'OFF 후 반복 중단 확인 및 참가자 종료 안내']),
        note('알림은 현재 시험 기능입니다', '고모텍 CCTV / 번호번 CCTV 영상 수신 오류가 발생했습니다. (test) 형식입니다. 1~200 무작위 번호는 실제 장애 카메라를 뜻하지 않습니다. 상시 운영 전 실제 기기 수신과 회사망 영상 연결을 확인하세요.', 'warning'),
        refs(['chrome', 'install']),
        ('small', '기술 기준: 프로젝트의 push-test 실행·인증서·예약 코드 및 현재 모바일 UI. 확인일 '+DATE+'. 갤럭시 메뉴는 Android/One UI/Chrome 버전에 따라 달라질 수 있습니다.'),
    ]),
    ('부록: CCTV 연동 확인', '앱이 열리는 것과 실제 카메라 영상이 재생되는 것은 별도로 확인합니다.', [
        note('현재 앱 PC 주소와 CCTV 서버 주소는 별개입니다', HOST+'는 갤럭시가 앱에 접속할 PC 주소입니다. 이 값을 CCTV 목록·영상 서버 주소에 그대로 넣지 마세요. 기존 CCTV 연동 설정은 유지합니다.', 'warning'),
        table(['구분', '누가 사용하는 주소인가'], [
            ['앱 접속 주소', '갤럭시 → 실행 중인 Windows PC. '+APP_URL],
            ['CCTV 목록 API', 'Windows PC → 현장 CCTV 목록 서버. CCTV_MONITORING_UPSTREAM_URL로 지정합니다.'],
            ['CCTV 영상 서버', 'CCTV_WHEP_BASE_URL로 중계 기본 주소를 지정합니다. 실제 영상은 휴대폰과 영상 서버 사이에서 흐릅니다.'],
        ], [133,BW-133]),
        step('로그인 또는 목록 조회가 실패하면', '로그인은 현재 PC에서 설정한 계정을 사용합니다. 목록의 재시도·새로고침 후에도 실패하면 담당 개발자가 PC에서 기존 CCTV 목록 API에 연결되는지 확인합니다.'),
        step('목록은 보이는데 영상만 안 나오면', '목록 조회와 영상 통신은 별개입니다. 휴대폰의 영상 서버·미디어 포트 접근을 관리자에게 확인합니다. 핫스팟에서 안 되면 승인된 회사 Wi-Fi에서 검증합니다.'),
        step('CCTV 서버가 실제로 바뀐 경우만', '담당자가 새 서버의 실제 주소를 확인해 .env.local의 해당 변수를 수정하고 3쪽 방식으로 재시작합니다. 이 문서는 CCTV 서버의 새 주소를 지정하지 않습니다. 다른 설정과 기존 계정 파일은 유지합니다.'),
        note('현재 확인된 범위', '앱 HTTPS 응답과 인증서 다운로드 HTTP 응답을 확인했습니다. 갤럭시 설치·로그인·실제 영상 재생·잠금 후 알림 수신은 8쪽 확인표로 현장에서 점검하세요.'),
    ]),
]

MOBILE = [
    ('갤럭시 설치·사용 가이드', '현재 회사 PC에 접속하는 실제 주소입니다. 확인일: '+DATE, [
        note('현재 PC 서버는 준비되어 있습니다', '갤럭시를 PC와 같은 Wi-Fi에 연결하고 2쪽부터 진행하세요. 이 PC의 인증서를 이미 설치했다면 4쪽 앱 주소부터 열어 확인할 수 있습니다.'),
        ('route', ['Wi-Fi 연결', 'CA 설치', '앱 설치', '로그인', 'Push ON']),
        code('처음 연결할 때: 인증서 다운로드', [CERT_URL]),
        code('인증서 설치 후: CCTV 앱 접속', [APP_URL]),
        step('Wi-Fi와 로그인 계정', 'Wi-Fi 이름과 CCTV 로그인 ID·비밀번호는 PC 운영자에게 받습니다. 개인 Google·삼성 계정으로 로그인하는 화면이 아닙니다.'),
        note('두 주소는 현재 PC에서 사용하는 실제 값입니다', 'http://는 인증서 다운로드, https://는 CCTV 앱입니다. 다른 장소로 이동하거나 PC 주소가 바뀌면 7쪽에 따라 새 주소를 받으세요.', 'warning'),
        ('index', [('Wi-Fi 연결과 인증서 다운로드', 2), ('CA 인증서 설치', 3), ('앱 설치와 로그인', 4), ('CCTV 보기와 알림 ON/OFF', 5), ('오류 해결', 6), ('장소·주소 변경과 완료 확인', 7)]),
        ('small', '갤럭시 Chrome 웹앱(PWA) 기준입니다. PC 전원·서버 창을 유지해야 합니다. CCTV Push는 실제 장애와 무관한 시험 알림이며 별도 APK 설치는 이 문서의 대상이 아닙니다.'),
    ]),
    ('Wi-Fi 연결과 인증서 다운로드', '처음 접속하는 회사 PC의 인증서를 휴대폰에 받습니다.', [
        step('01  PC와 같은 Wi-Fi에 연결', '설정 → 연결 → Wi-Fi에서 PC 운영자가 안내한 네트워크를 선택합니다. 현재 PC는 Wi-Fi로 연결되어 있습니다. LTE/5G만으로는 이 내부 주소에 접속할 수 없습니다.'),
        step('02  Chrome 주소창에 아래 전체 주소 입력', 'Chrome을 열고 화면 위의 주소 입력칸을 누릅니다. 아래 주소를 끝까지 입력하고 이동을 누릅니다. Google 검색창이 아닌 주소창에 입력하세요.'),
        code('인증서 다운로드 주소', [CERT_URL], 'http://로 시작하고 포트는 3001입니다. 172.19.224.1이나 예전 집 PC 주소는 사용하지 않습니다.'),
        step('03  다운로드 완료만 확인', '파일 이름은 push-test-ca.crt입니다. Chrome 메뉴의 다운로드 또는 내 파일 → 다운로드에서 확인할 수 있습니다. 같은 이름의 파일이 여러 개라면 방금 받은 현재 PC의 파일을 구분하세요.'),
        note('파일을 바로 눌러 설치하지 마세요', '“CA 인증서를 설치할 수 없음”이 떠도 파일 다운로드 실패라고 단정하지 마세요. 오류창을 닫고 다음 쪽처럼 휴대폰 설정에서 설치합니다.', 'warning'),
        step('다운로드가 차단되거나 열리지 않는 경우', '먼저 담당자에게 서버 실행·주소·Wi-Fi를 확인합니다. 브라우저 다운로드가 차단되면 담당자가 USB로 공개 인증서 파일만 Download 폴더에 복사해 줄 수 있습니다. 이후 설치 순서는 같습니다.'),
    ]),
    ('설정에서 CA 인증서 설치', 'Android 11 이상에서는 CA 설치를 휴대폰 설정 앱에서 진행합니다.', [
        ('settings',),
        step('01  휴대폰 설정에서 메뉴 찾기', '설정 앱 검색창에 “인증서 설치”를 입력합니다. 경로 예시: 보안 및 개인정보 보호 → 기타 보안 설정 → 기기에 저장된 인증서 설치 → CA 인증서. 구형 기기는 “생체 인식 및 보안”으로 표시될 수 있습니다.'),
        step('02  CA 인증서를 선택하고 본인 인증', '“VPN 및 앱 사용자 인증서”나 “Wi-Fi 인증서”가 아니라 CA 인증서를 선택합니다. 보안 안내가 나오면 담당자가 제공한 인증서인지 확인하고 계속 설치를 진행합니다. 휴대폰 잠금번호를 요구하면 본인 인증합니다.'),
        step('03  Download에서 현재 파일 선택', 'Download/다운로드 폴더의 push-test-ca.crt를 선택합니다. 설치 완료 안내를 확인합니다. 집 PC에서 받은 같은 이름의 파일과 혼동하지 마세요.'),
        note('설치 후 해야 할 일', 'Chrome을 완전히 닫았다가 다시 열고 4쪽의 현재 HTTPS 앱 주소로 접속하세요. 인증서 경고가 없어야 다음 단계로 진행합니다. 경고가 남으면 6쪽을 확인하세요.'),
        ('small', '메뉴 위치는 기종·One UI 버전에 따라 다릅니다. 메뉴가 회색이거나 회사 정책으로 막혀 있으면 담당자에게 요청하세요. 휴대폰 보안 기능 전체를 해제하지 않습니다.'),
        refs(['ca', 'samsung']),
    ]),
    ('앱 설치와 로그인', '인증서 경고 없이 열리는 현재 HTTPS 주소에서 설치합니다.', [
        step('01  현재 앱 주소 열기', 'Chrome 주소창에 아래 주소를 끝까지 입력합니다. 고모텍 CCTV 로그인 화면이 보여야 합니다. 예전 홈 화면 아이콘이 옛 주소를 열 수 있으므로 아래 주소를 먼저 확인하세요.'),
        code('CCTV 앱 접속 주소', [APP_URL], 'https://로 시작하고 포트는 3000입니다. 여기서는 /lab/push까지 모두 입력합니다.'),
        step('02  앱 설치 누르기', '화면 위의 앱 설치를 누릅니다. 또는 Chrome 오른쪽 위 더보기(점 세 개) → 설치 및 바로가기 만들기 → 설치를 선택합니다. 버전에 따라 앱 설치/홈 화면에 추가처럼 보일 수 있습니다.'),
        step('03  홈 화면의 고모텍 CCTV 열기', '설치된 앱을 열고 담당자가 준 아이디·비밀번호를 입력한 뒤 로그인을 누릅니다. 기존 로그인이 유지되어 있으면 목록으로 바로 들어갑니다. 로그인만으로 새 알림이 시작되지는 않습니다.'),
        note('“웹앱을 설치할 수 없음”이 나올 때', '인증서 경고 유무를 먼저 확인하세요. 경고가 없다면 Chrome 업데이트·인터넷 연결·회사 설치 정책을 담당자와 점검합니다. 자세한 순서는 6쪽입니다.', 'warning'),
        note('설치만 실패하는 경우의 임시 사용', '현재 HTTPS 페이지가 경고 없이 열리면 Chrome에서 로그인하고 CCTV Push ON으로 확인할 수 있습니다. 앱 설치 성공과는 별개이며, 알림 권한과 서버·인터넷 연결이 필요합니다.'),
        refs(['chrome', 'install']),
    ]),
    ('CCTV 보기와 알림 ON/OFF', '목록의 실제 CCTV 상태와 시험 푸시 알림은 서로 별개입니다.', [
        ('app-demo',),
        step('CCTV 목록에서 보고 싶은 카메라 선택', '이름·번호·위치로 검색하거나 전체/확인 필요 필터를 누릅니다. 카메라를 누르면 영상 하나가 열리고 닫기(×)를 누르면 연결을 종료합니다. 목록 새로고침으로 최신 정보를 확인할 수 있습니다.'),
        step('CCTV Push ON → 알림 허용', 'ON을 누르면 첫 알림을 즉시 발송하고 이후 10초 간격으로 반복합니다. 카메라 번호는 1~200 중 무작위입니다. 홈으로 나가거나 화면을 잠근 뒤에도 수신되는지 확인하세요.'),
        note('시험이 끝나면 반드시 OFF', 'OFF는 현재 기기의 서버 반복 발송을 중단합니다. 이미 보낸 알림은 늦게 도착할 수 있습니다. 앱을 닫거나 아이콘을 지우는 것만으로 OFF를 대신하지 마세요.', 'warning'),
        ('small', 'PC 서버와 인터넷이 켜져 있어야 하며 실제 표시 시각은 통신·휴대폰 설정에 따라 늦어질 수 있습니다. 휴대폰 설정에서 앱/Chrome을 강제 종료했다면 다시 열어 확인하세요.'),
    ]),
    ('막히면 이 순서로 확인하세요', '해결되지 않으면 오류 화면과 현재 주소를 담당자에게 보여주세요. 비밀번호는 공유 화면에 넣지 않습니다.', [
        table(['증상', '해결 방법'], [
            ['CA 인증서를 설치할 수 없음', '파일을 직접 열던 창을 닫고 설정에서 인증서 설치 검색 → CA 인증서 → Download의 현재 파일을 선택합니다. 자세한 그림은 3쪽입니다.'],
            ['설정에서 선택해도 설치 실패', 'CA 메뉴인지, 현재 회사 PC에서 받은 파일인지 확인하고 다시 다운로드합니다. 계속 실패하면 담당자에게 공개 CA 파일을 USB로 받아 설치를 요청합니다. 관리폰의 정책 차단은 담당자에게 문의합니다.'],
            ['CA 설치 후에도 보안 경고', '집 PC 인증서와 회사 PC 인증서는 다를 수 있습니다. 현재 PC의 인증서·현재 HTTPS 주소·날짜와 시간을 확인합니다. Chrome 종료/재실행 후에도 같으면 담당자에게 확인하며 경고를 건너뛰지 않습니다.'],
            ['사이트 연결 불가 / 시간 초과', 'PC와 같은 Wi-Fi인지, 2·4쪽 전체 주소가 맞는지 확인합니다. PC 운영자에게 서버의 Ready 표시를 확인해 달라고 요청하세요. 인증서를 반복 설치해도 네트워크 차단은 해결되지 않습니다.'],
            ['웹앱을 설치할 수 없음', '① 경고 없이 현재 HTTPS 페이지가 열리는지 ② Chrome 최신 버전과 인터넷 연결 ③ 회사의 설치 제한을 확인합니다. 내부 사이트는 열려도 웹앱 설치 통신이 차단될 수 있습니다.'],
            ['로그인·목록·영상 오류', '담당자에게 이 PC의 계정을 확인합니다. 목록 재시도·새로고침 후에도 실패하거나 영상만 안 나오면 회사 CCTV 연결을 담당자에게 점검 요청합니다.'],
            ['ON인데 알림 안 옴', '갤럭시 설정의 알림/앱 알림에서 고모텍 CCTV 또는 Chrome 알림을 허용합니다. Chrome 사이트 설정의 이 주소 알림, 방해 금지, 인터넷, PC 실행도 확인합니다. 화면에서 상태를 재확인하고 필요하면 OFF 후 ON합니다.'],
        ], [144, BW-144]),
        note('“알림 상태 확인 필요”가 보이면', '상태 재확인을 누르세요. 발송 중인지 알 수 없는 경우 알림 중단으로 서버 중단을 요청합니다. 통신이 복구된 뒤 OFF 상태를 확인합니다.'),
    ]),
    ('장소·주소가 바뀌면 다시 확인', '집에서 회사로 이동하거나 서버 PC를 바꿀 때는 새 접속 정보를 받으세요.', [
        step('01  이동하기 전 기존 앱에서 OFF', '기존 주소가 열릴 때 CCTV Push를 OFF로 끕니다. 이미 주소가 바뀌어 열리지 않으면 담당자에게 예전 발송 중단을 요청하세요. 앱 삭제만으로 반복 중단이 보장되지는 않습니다.'),
        step('02  새 Wi-Fi와 현재 주소로 접속', '회사 담당자에게 새 앱 주소·인증서 주소를 받습니다. Chrome에서 새 주소를 직접 열고 로그인합니다. IP 또는 포트가 바뀌면 예전 로그인·알림 권한이 그대로 이어지지 않을 수 있습니다.'),
        table(['변경 상황', '휴대폰에서 할 일'], [
            ['같은 PC에서 IP만 바뀜', '기존 CA가 유지되면 CA 재설치는 보통 필요 없습니다. 새 주소 접속 → 로그인 → ON으로 다시 확인합니다.'],
            ['다른 PC 또는 새 CA', '그 PC의 현재 CA를 설치하고 새 주소로 접속합니다. 파일 이름이 같아도 예전 인증서를 쓰면 안 됩니다.'],
            ['기존 아이콘이 옛 주소를 엶', '새 주소에서 앱을 다시 설치합니다. 이전 알림 OFF를 확인한 뒤 불필요한 예전 아이콘·앱을 정리합니다.'],
        ], [158, BW-158]),
        ('checks', ['현재 주소에서 인증서 경고 없이 로그인됨', 'CCTV 목록과 선택한 카메라 영상이 열림', 'ON 후 고모텍 CCTV 제목과 (test) 알림을 받음', '잠금·앱 닫기 후 수신, 알림 누르면 앱이 열림', '시험 종료 후 OFF로 반복 중단 확인']),
        note('화면은 내부망에서, 알림은 인터넷 연결도 필요', '회사 밖에서 알림을 받아도 내부 CCTV 화면은 열리지 않을 수 있습니다. 알림 번호는 실제 장애를 뜻하지 않는 시험 값입니다.'),
        ('small', '이 문서는 '+DATE+' 기준입니다. 메뉴와 알림 로고의 위치·형태는 갤럭시·Android·Chrome 버전에 따라 달라집니다. 공식 설치 자료는 3~4쪽의 링크를 참고하세요.'),
    ]),
]


class Guide:
    def __init__(self, filename, audience, pages):
        self.path = OUT / filename
        self.pages = pages
        self.audience = audience
        self.pdf = canvas.Canvas(str(self.path), pagesize=(W, H), pageCompression=1)
        self.pdf.setTitle('고모텍 CCTV | '+audience+' 설치·사용 가이드')
        self.pdf.setAuthor('고모텍 CCTV')
        self.pdf.setSubject('현재 PC '+HOST+'의 접속 주소, 서버 실행, 인증서 설치와 오류 해결')
        self.checks = []
        self.y = 0

    def box(self, x, y, w, h, fill, border=None, r=10):
        self.pdf.setFillColor(HexColor(fill))
        self.pdf.setStrokeColor(HexColor(border or fill))
        self.pdf.setLineWidth(.7)
        self.pdf.roundRect(x, H-y-h, w, h, r, fill=1, stroke=bool(border))

    def txt(self, s, x, y, size=11, weight='R', color=None):
        self.pdf.setFont(weight, size)
        self.pdf.setFillColor(HexColor(color or C['ink']))
        self.pdf.drawString(x, H-y-size*.85, s)
        self.checks.append((self.pdf.getPageNumber(), x, y, pdfmetrics.stringWidth(s, weight, size), size, s))

    def paragraph(self, text, width, size=11.2, color=None, weight='R', leading=None):
        return Paragraph(escape(text).replace('\n', '<br/>'), ParagraphStyle(
            'p', fontName=weight, fontSize=size, leading=leading or size*1.48,
            textColor=HexColor(color or C['ink2']), wordWrap='CJK', splitLongWords=True,
            spaceBefore=0, spaceAfter=0))

    def para(self, text, x, y, width, size=11.2, color=None, weight='R', leading=None):
        p = self.paragraph(text, width, size, color, weight, leading)
        _, height = p.wrap(width, 999)
        p.drawOn(self.pdf, x, H-y-height)
        self.checks.append((self.pdf.getPageNumber(), x, y, width, height, text))
        return height

    def logo(self, x, y, width=62):
        self.pdf.drawImage(str(ROOT/'public/logo/gmt_logo.png'), x, H-y-width*.278,
                           width=width, height=width*.278, mask='auto')

    def block(self, item):
        kind, *args = item
        y = self.y
        if kind == 'note':
            title, body, tone = args
            p = self.paragraph(body, BW-28, 10.8)
            _, h = p.wrap(BW-28, 999)
            total = h+44
            self.box(M, y, BW, total, T[tone]['bg'], T[tone]['border'])
            self.txt(title, M+14, y+12, 12, 'S', T[tone]['fg'])
            self.para(body, M+14, y+33, BW-28, 10.8)
            self.y += total+13
        elif kind == 'step':
            title, body = args
            self.txt(title, M, y, 13, 'S')
            self.y += 22 + self.para(body, M, y+22, BW, 11.1) + 13
        elif kind == 'code':
            title, commands, body = args
            self.txt(title, M, y, 11.5, 'S')
            h = len(commands)*19+20
            self.box(M, y+22, BW, h, C['surfaceSubtle'], C['border'])
            for i, cmd in enumerate(commands):
                self.txt(cmd, M+13, y+33+i*19, 10.5, 'Code')
                if cmd.startswith(('http://', 'https://')):
                    yy = y+33+i*19
                    self.pdf.linkURL(cmd, (M+13, H-yy-13, W-M-13, H-yy+2), relative=0, thickness=0)
            self.y += 22+h+8
            if body:
                self.y += self.para(body, M, self.y, BW, 10.2, C['ink3'])+8
            self.y += 5
        elif kind == 'table':
            headers, rows, widths = args
            widths = widths or [BW/len(headers)]*len(headers)
            cells = [[self.paragraph(h, widths[i]-20, 10.4, weight='S') for i,h in enumerate(headers)]]
            cells += [[self.paragraph(c, widths[i]-20, 10.4) for i,c in enumerate(row)] for row in rows]
            t = Table(cells, colWidths=widths)
            t.setStyle(TableStyle([
                ('BACKGROUND',(0,0),(-1,0),HexColor(C['fill'])),
                ('ROWBACKGROUNDS',(0,1),(-1,-1),[HexColor(C['surface']),HexColor(C['surfaceSubtle'])]),
                ('BOX',(0,0),(-1,-1),.6,HexColor(C['border'])),
                ('INNERGRID',(0,0),(-1,-1),.45,HexColor(C['borderSoft'])),
                ('VALIGN',(0,0),(-1,-1),'TOP'),
                ('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),
                ('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),10),
            ]))
            _, h = t.wrap(BW,999)
            t.drawOn(self.pdf, M, H-y-h)
            self.y += h+16
        elif kind == 'small':
            self.y += self.para(args[0], M, y, BW, 9.6, C['ink3'])+13
        elif kind == 'refs':
            self.txt('공식 참고  |  제목을 누르면 열립니다',M,y,8.8,'S',C['ink3'])
            self.y += 15
            for key in args[0]:
                title, url = SOURCES[key]
                self.txt(title, M, self.y, 8.7, 'R', T['info']['fg'])
                self.pdf.linkURL(url,(M,H-self.y-12,W-M,H-self.y+2),relative=0,thickness=0)
                self.y += 14
            self.y += 4
        elif kind == 'index':
            rows=args[0]
            self.txt('필요한 페이지 바로 찾기',M,y,11.5,'S')
            self.y+=23
            for i,(label,page) in enumerate(rows):
                x=M+(i%3)*(BW/3)
                yy=self.y+(i//3)*23
                self.txt(f'{page:02d}  {label}',x,yy,10.5,'M',C['ink2'])
                self.pdf.linkAbsolute(label,f'page-{page}',(x,H-yy-15,x+BW/3-8,H-yy+1),thickness=0)
            self.y += ((len(rows)+2)//3)*23+10
        elif kind == 'checks':
            for label in args[0]:
                self.box(M, self.y+2, 11, 11, C['surface'], C['borderStrong'],2)
                h=self.para(label,M+22,self.y,BW-22,10.7)
                self.y+=max(h,15)+10
            self.y+=5
        elif kind == 'route':
            labels=args[0]
            gap=10
            width=(BW-gap*(len(labels)-1))/len(labels)
            for i,label in enumerate(labels):
                x=M+i*(width+gap)
                self.box(x,y,width,48,C['surface'],C['border'])
                self.txt(f'{i+1:02d}',x+10,y+9,9,'S',C['brand'])
                self.txt(label,x+10,y+26,10.2,'M')
            self.y+=63
        elif kind == 'terminal':
            self.box(M,y,BW,112,C['surfaceSubtle'],C['border'])
            self.txt('현재 PC의 실행 창에서 확인할 주소',M+14,y+13,11,'S')
            for i,(label,value) in enumerate([
                ('접속 주소',APP_URL),
                ('휴대폰 인증서 다운로드',CERT_URL)]):
                yy=y+37+i*31
                self.txt(label,M+14,yy,9,'M',C['ink3'])
                self.txt(value,M+147,yy,9,'Code')
            self.txt('Ready  →  이 실행 창을 계속 켜 두세요',M+14,y+90,10,'S',T['success']['fg'])
            self.y+=126
        elif kind == 'settings':
            self.box(M,y,BW,123,C['surfaceSubtle'],C['border'])
            self.txt('설정 검색',M+16,y+15,10,'M',C['ink3'])
            self.box(M+100,y+9,BW-116,30,C['surface'],C['border'])
            self.txt('인증서 설치',M+114,y+17,11,'M')
            self.txt('기기에 저장된 인증서 설치',M+16,y+55,12,'S')
            self.box(M+16,y+80,BW-32,29,T['info']['bg'],T['info']['border'])
            self.txt('CA 인증서  →  계속 설치  →  본인 인증  →  파일 선택',M+28,y+87,10.5,'S',T['info']['fg'])
            self.y+=139
        elif kind == 'app-demo':
            self.app_demo(y)
            self.y+=269
        else:
            raise ValueError(kind)
        if self.y > 773:
            raise ValueError(f'{self.audience} page {self.pdf.getPageNumber()} overflow at {kind}: {self.y:.1f}')

    def app_demo(self,y):
        left=M; right=M+BW/2+8; w=BW/2-8
        self.box(left,y,w,216,C['pageBg'],C['borderStrong'],12)
        self.box(right,y,w,216,C['pageBg'],C['borderStrong'],12)
        for x in [left,right]:
            self.logo(x+14,y+13,43)
            self.txt('CCTV',x+66,y+15,10,'S')
        self.box(left+10,y+45,w-20,156,C['surface'],C['borderSoft'])
        self.txt('우리 현장의 CCTV,',left+23,y+60,12,'S')
        self.txt('한눈에 확인하세요.',left+23,y+79,12,'S')
        for i,label in enumerate(['아이디','비밀번호']):
            yy=y+108+i*32
            self.box(left+23,yy,w-46,25,C['surfaceSubtle'],C['border'])
            self.txt(label,left+33,yy+7,9,'R',C['ink3'])
        self.box(left+23,y+172,w-46,20,C['brandSoft'],C['brandBorder'])
        self.txt('로그인',left+96,y+177,9,'S',C['brand'])
        self.box(right+10,y+45,w-20,69,C['surface'],C['borderSoft'])
        self.txt('CCTV Push',right+23,y+57,12,'S')
        self.txt('ON · 알림이 켜져 있어요',right+23,y+79,8.3,'R',C['ink3'])
        self.box(right+w-65,y+56,38,21,T['success']['bg'],T['success']['border'],10)
        self.box(right+w-47,y+60,13,13,T['success']['fg'],None,6)
        self.txt('ON 즉시 · 이후 10초 간격',right+23,y+99,8.3,'M')
        self.txt('CCTV 목록',right+16,y+126,10.5,'S')
        self.box(right+10,y+147,w-20,54,C['surface'],C['borderSoft'])
        self.txt('생산라인 입구',right+23,y+158,10,'S')
        self.txt('CCTV 001 · 연결됨',right+23,y+179,8.5,'R',T['success']['fg'])
        self.para('설명용 화면 예시입니다. 실제 카메라 이름·대수는 현장에 따라 다릅니다.',M,y+227,BW,9.3,C['ink3'])
        self.para('알림 예: 고모텍 CCTV / 123번 CCTV 영상 수신 오류가 발생했습니다. (test)',M,y+244,BW,9.5,weight='M')

    def build(self):
        for number,(title,subtitle,blocks) in enumerate(self.pages,1):
            self.pdf.bookmarkPage(f'page-{number}')
            self.pdf.addOutlineEntry(title,f'page-{number}',0,False)
            self.logo(M,29,55)
            self.txt('고모텍 CCTV',M+68,31,10,'S')
            self.txt(self.audience+'  |  현재 PC 환경',W-M-161,31,9,'M',C['ink3'])
            self.txt(title,M,75,25 if len(title)<21 else 22,'S')
            self.para(subtitle,M,113,BW,11.2,C['ink3'])
            self.y=153
            for block in blocks:
                self.block(block)
            print(f'{self.audience} page {number}: content ends at {self.y:.1f}')
            self.pdf.setStrokeColor(HexColor(C['border']))
            self.pdf.setLineWidth(.6)
            self.pdf.line(M,H-790,W-M,H-790)
            self.txt('현재 PC '+HOST+'  |  '+DATE+'  v2.1',M,802,8,'R',C['ink3'])
            self.txt(f'{number:02d} / {len(self.pages):02d}',W-M-38,801,9,'S',C['ink3'])
            self.pdf.showPage()
        self.pdf.save()
        reader=PdfReader(self.path)
        assert len(reader.pages)==len(self.pages)
        assert all((page.extract_text() or '').strip() for page in reader.pages)
        overflow=[row for row in self.checks if row[1]<20 or row[1]+row[3]>W-20 or row[2]+row[4]>826]
        if overflow:
            raise ValueError(f'Text outside page: {overflow}')
        return {'file':self.path.name,'pages':len(reader.pages),'bytes':self.path.stat().st_size,
                'links':sum(len(p.get('/Annots',[])) for p in reader.pages)}


if __name__ == '__main__':
    results=[Guide('dxs-cctv-pc-operator-guide.pdf','PC 운영자',PC).build(),
             Guide('dxs-cctv-galaxy-user-guide.pdf','갤럭시 사용자',MOBILE).build()]
    (TMP/'qa-summary.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),'utf-8')
    print(json.dumps(results,ensure_ascii=False,indent=2))
