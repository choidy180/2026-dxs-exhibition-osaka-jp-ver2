"""사내 도메인(gmt.dxsplatform.com) 접속용 안내서. 주소·상태는 확인일 기준이며 화면 그림은 설명용이다."""
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
DATE = '2026.09.21'
VERSION = 'v3.0'
DOMAIN = 'gmt.dxsplatform.com'
PROJECT = '2026-mode-dxs'
CERT_EXPIRES = '2026.12.02'
ORIGIN = f'https://{DOMAIN}'
APP_URL = f'{ORIGIN}/lab/push'
MANIFEST_URL = f'{ORIGIN}/lab/push/manifest.webmanifest'
ENV_LINE = f'PUSH_TEST_ORIGIN={ORIGIN}'
INSTALL_COMMAND = 'npm.cmd install'
SETUP_COMMAND = 'npm.cmd run push:setup'
DEV_COMMAND = 'npm.cmd run push:dev'
BUILD_COMMAND = 'npm.cmd run build'
START_COMMAND = 'npm.cmd run push:start'
SOURCES = {
    'node': ('Node.js 공식 다운로드', 'https://nodejs.org/en/download'),
    'chrome': ('Google Chrome: Android 웹앱 설치', 'https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=ko'),
    'notify': ('Google Chrome: 사이트 알림 허용·차단', 'https://support.google.com/chrome/answer/3220216?hl=ko'),
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


def refs(keys):
    return ('refs', keys)


PC = [
    ('서버 담당자용 설정·운영 가이드', '사내 도메인 '+DOMAIN+'으로 접속하는 구성입니다. 확인일: '+DATE, [
        note('휴대폰 인증서 설치 단계가 없어졌습니다', '도메인은 공인 인증서(Let\'s Encrypt, *.dxsplatform.com)를 사용합니다. 갤럭시는 주소 하나만 열면 되고, PC 핫스팟·CA 파일·3001 포트는 더 이상 필요하지 않습니다.'),
        ('route', ['패키지 설치', '설정 파일', '서버 실행', '접속 확인', '전달·시연']),
        table(['현재 환경', '확인된 값'], [
            ['접속 도메인', DOMAIN+' (Cloudflare 경유, 공인 인증서 만료 '+CERT_EXPIRES+')'],
            ['앱 주소', APP_URL],
            ['서버', '도메인이 연결된 Windows PC의 '+PROJECT+' 프로젝트, 웹 3000번 포트'],
            ['확인일 상태', '/lab/push 404, 푸시 API 500 → 아직 활성화 전. 2·3·4쪽을 진행하세요.'],
        ], [120, BW-120]),
        note('이 구성의 범위', '테스트 페이지가 인터넷에서 열립니다. 로그인 계정으로만 보호되므로 계정을 공용 문서에 적지 마세요. CCTV 목록·영상은 여전히 사내망에서만 연결됩니다. Push는 실제 장애와 무관한 시험 알림입니다.', 'warning'),
        ('index', [('패키지 설치와 기존 서버 정리', 2), ('설정 파일 만들기·수정', 3), ('서버 실행과 접속 확인', 4), ('갤럭시 사용자에게 전달·시연', 5), ('오류 해결', 6), ('운영 순서와 확인표', 7)]),
        ('small', '이 문서는 확인일의 실제 응답을 기준으로 작성했습니다. 도메인·터널 연결은 기존 배포를 그대로 사용하며 이 문서에서 변경하지 않습니다.'),
    ]),
    ('패키지 설치와 기존 서버 정리', '도메인이 연결된 서버 PC에서 한 번만 진행합니다. 이미 마쳤다면 3쪽으로 이동하세요.', [
        note('푸시 API 500 오류의 원인은 better-sqlite3 미설치입니다', '확인일 기준 푸시 API가 “Can\'t resolve better-sqlite3” 오류로 500을 반환했습니다. 아래 설치 명령으로 저장소 패키지를 설치하면 해결됩니다. 서버 코드 수정은 필요하지 않습니다.', 'warning'),
        code('01  프로젝트 폴더에서 패키지 설치', [INSTALL_COMMAND], PROJECT+' 프로젝트 폴더에서 PowerShell을 열고 실행합니다. Windows x64·Node.js 22 이상 기준이며 better-sqlite3 12.11.1 사전 빌드 파일을 내려받으므로 GitHub 연결이 필요합니다.'),
        step('02  기존 npm run dev 창 종료', '현재 도메인은 같은 폴더의 개발 서버(npm run dev)로 서비스 중입니다. 푸시 실행 명령이 그 서버와 잠금 충돌을 일으키므로 해당 창에서 Ctrl+C로 종료합니다. 도메인 연결(터널·프록시) 프로그램은 그대로 둡니다.'),
        step('03  도메인 연결이 3000번 포트로 향하는지 확인', '기존 배포는 이 PC의 localhost:3000을 도메인으로 내보내고 있습니다. 푸시 실행 명령도 같은 127.0.0.1:3000에서 열리므로 연결 설정을 바꾸지 않습니다. 다른 포트를 쓰고 있었다면 PORT 환경변수를 같은 값으로 맞춥니다.'),
        ('checks', ['node --version 이 22 이상', INSTALL_COMMAND+' 이 오류 없이 종료', '같은 폴더의 npm run dev 실행 창이 없음', 'https://'+DOMAIN+'/ 이 이 PC의 3000번 포트로 전달됨']),
        refs(['node']),
    ]),
    ('설정 파일 만들기·수정', '.env.push-test.local의 접속 주소를 도메인으로 맞춥니다. 계정·키는 한 번 만들면 유지됩니다.', [
        code('설정 파일이 없을 때: 한 번만 실행', [SETUP_COMMAND], '--phone 옵션을 붙이지 않습니다. 붙이면 PC의 사설 IP 주소를 강제로 사용합니다.'),
        table(['질문', '입력할 내용'], [
            ['내부 HTTPS 주소', ORIGIN+' 를 그대로 입력합니다. 뒤에 /lab/push나 /를 붙이지 않습니다.'],
            ['테스트 계정 ID', '영문·숫자·밑줄(_)·하이픈(-), 1~64자. 휴대폰 로그인 ID입니다.'],
            ['테스트 비밀번호', '비어 있지 않은 비밀번호. 입력 내용은 화면에 보이지 않습니다.'],
            ['VAPID 연락처', 'mailto: 뒤에 담당자 이메일. 메일 로그인·인증 절차가 아닙니다.'],
        ], [120, BW-120]),
        code('설정 파일이 이미 있을 때: 이 줄만 수정', [ENV_LINE], '예전 IP 주소(https://192.168.x.x:3000)가 적혀 있으면 위 값으로 바꾸고 저장합니다. 다른 줄(계정·키·DB 경로)은 그대로 둡니다. 저장 후 4쪽처럼 서버를 다시 실행해야 적용됩니다.'),
        note('주소가 다르면 로그인부터 실패합니다', '서버는 브라우저 주소와 PUSH_TEST_ORIGIN이 정확히 같을 때만 요청을 받습니다. 값이 다르면 “같은 테스트 앱에서 다시 시도해주세요”(403)가 나옵니다. http://, 포트 번호, 끝의 /를 붙이지 않습니다.'),
        ('small', 'setup은 기존 파일이 있으면 “설정 파일이 이미 있습니다”로 멈춥니다. 정상 안내이며 파일을 삭제할 필요가 없습니다. 비밀키·세션 비밀값·계정 해시는 서버 파일에만 두고 문서에 옮기지 않습니다.'),
    ]),
    ('서버 실행과 접속 확인', '서버가 꺼져 있거나 설정을 바꿨을 때 실행합니다. 웹 서버와 푸시 워커가 함께 켜집니다.', [
        code('개발 모드로 실행 (지금 테스트 권장)', [DEV_COMMAND], '현재 배포와 같은 개발 서버에 푸시 워커를 붙여 실행합니다. Ready 표시 후 창을 계속 켜 둡니다. 종료는 Ctrl+C입니다.'),
        code('운영 빌드로 실행 (상시 운영 시)', [BUILD_COMMAND, START_COMMAND], '빌드 후 실행합니다. 개발 모드보다 빠르고 오류 상세(파일 경로 등)가 인터넷에 노출되지 않습니다. 코드가 바뀌면 다시 빌드합니다.'),
        ('endpoints',),
        step('PC Chrome에서 확인', '앱 주소에서 고모텍 CCTV 로그인 화면이 열려야 합니다(404가 아니어야 함). 활성화 확인 주소는 JSON 문서로 열려야 하며, 404면 설정 파일의 APP_ENV=test, PUSH_TEST_ENABLED=true를 확인합니다. 로그인까지 되면 준비 완료입니다.'),
        note('실행 중 지켜야 할 것', '이 창을 닫으면 발송이 멈춥니다. 같은 폴더에서 npm run dev를 추가로 실행하지 않습니다. 재시작이 필요하면 Ctrl+C 후 같은 명령을 다시 실행합니다.'),
    ]),
    ('갤럭시 사용자에게 전달·시연', '먼저 휴대폰 한 대로 끝까지 확인한 다음 같은 순서로 다른 사용자에게 안내하세요.', [
        code('사용자에게 전달할 주소는 하나입니다', [APP_URL], '인증서 다운로드 주소·핫스팟 Wi-Fi 전달 단계가 없습니다. 로그인 ID·비밀번호는 별도로 전달하고 공용 문서·사진에 적지 않습니다.'),
        table(['하려는 것', '필요한 연결'], [
            ['앱 화면·로그인·알림', 'LTE/5G, 집·회사 Wi-Fi 모두 가능합니다. 인터넷만 있으면 됩니다.'],
            ['CCTV 목록·영상', '회사 사내망(Wi-Fi)에서만 연결됩니다. 외부에서 목록·영상 오류가 나는 것은 정상입니다.'],
        ], [130, BW-130]),
        step('01  주소 접속과 앱 설치', '갤럭시 Chrome에서 위 주소를 열어 보안 경고 없이 로그인 화면이 보이는지 확인합니다. Chrome 메뉴의 앱 설치로 홈 화면에 추가합니다.'),
        step('02  로그인·CCTV 목록 확인', '설정한 계정으로 로그인하고 목록·검색을 확인합니다. 사내 Wi-Fi라면 카메라 한 대의 실제 영상까지 확인합니다.'),
        step('03  Push ON 후 잠금 화면에서 수신 확인', 'CCTV Push를 ON으로 바꾸고 알림 권한을 허용합니다. 첫 알림과 이후 10초 간격 반복 수신을 확인합니다. 번호는 1~200 중 무작위이며 본문 끝에 (test)가 붙습니다.'),
        step('04  OFF로 종료 확인', '휴대폰에서 OFF를 누르고 추가 반복이 멈추는지 확인합니다. 이미 전송된 알림은 늦게 도착할 수 있습니다.'),
        ('small', '예전 IP 주소(https://192.168.x.x:3000)로 설치한 앱이 남아 있으면 그 앱에서 OFF 후 삭제하도록 안내합니다. 예전 CA 인증서는 갤럭시 설정에서 삭제해도 됩니다.'),
    ]),
    ('오류 해결', '도메인 방식에서 나올 수 있는 증상을 서버·주소·계정 순서로 확인합니다.', [
        table(['이렇게 보이면', '이렇게 확인하세요'], [
            ['/lab/push 가 404', '푸시 서버가 꺼져 있거나 설정 파일의 APP_ENV=test, PUSH_TEST_ENABLED=true가 빠졌습니다. 일반 npm run dev만 켜져 있는지 확인하고 4쪽 명령으로 실행합니다.'],
            ['로그인 시 오류 / 서버 창에 better-sqlite3', '서버 PC에 패키지가 없습니다. 2쪽의 '+INSTALL_COMMAND+' 후 서버를 다시 실행합니다.'],
            ['“같은 테스트 앱에서\n다시 시도” (403)', 'PUSH_TEST_ORIGIN이 '+ORIGIN+' 와 다릅니다. 3쪽처럼 수정하고 재시작합니다.'],
            ['Unable to acquire lock\n/ 3초 후 재시작','같은 폴더의 개발 서버가 두 개입니다. 모든 창에서 Ctrl+C 후 한 번만 실행합니다.'],
            ['휴대폰에 보안 경고', '주소가 '+ORIGIN+' 인지, 휴대폰 날짜·시간이 맞는지 확인합니다. 공인 인증서 만료('+CERT_EXPIRES+') 이후라면 도메인 인증서 담당자에게 갱신을 요청합니다.'],
            ['웹앱을 설치할 수 없음', 'Chrome 최신 버전·인터넷·회사 설치 정책을 확인합니다. 설치 없이 Chrome 탭에서도 로그인·Push ON 확인은 가능합니다.'],
            ['ON인데 알림 없음', '서버 창의 Ready와 워커 실행, 휴대폰의 알림 허용·방해 금지·인터넷을 확인합니다. 화면의 상태 재확인 후 필요하면 OFF → ON.'],
            ['목록·영상만 실패', '휴대폰이 사내망 밖에 있으면 정상입니다. 회사 Wi-Fi에서 다시 확인합니다.'],
        ], [150, BW-150]),
        ('small', '개발 모드 서버는 오류 상세(파일 경로 등)를 인터넷에 그대로 보여줍니다. 테스트가 끝나면 4쪽의 운영 빌드 실행으로 전환하는 것을 권장합니다.'),
        refs(['chrome', 'install', 'notify']),
    ]),
    ('운영 순서와 현장 확인표', '시연은 실제 갤럭시에서 아래 항목을 확인한 뒤 시작하세요.', [
        table(['때', '운영 방법'], [
            ['매일 시작', '서버 PC에서 4쪽 명령 실행 → Ready 확인 → PC Chrome에서 앱 주소의 로그인 화면 확인. 이미 실행 중이면 유지합니다.'],
            ['사용 중', '서버 PC의 인터넷을 유지합니다. 갤럭시 앱을 닫거나 잠가도 서버가 실행 중이면 반복 발송합니다.'],
            ['시연 종료', '휴대폰별 CCTV Push OFF → 서버 창 Ctrl+C. 창만 닫으면 반복 설정이 남아 다음 실행 때 발송이 재개될 수 있습니다.'],
        ], [100, BW-100]),
        ('checks', ['PC Chrome에서 앱 주소가 경고 없이 로그인 화면으로 열림', '활성화 확인 주소가 JSON으로 열림(404 아님)', '갤럭시에서 인증서 설치 없이 같은 주소가 열림', '홈 화면 앱으로 로그인되고 CCTV 목록이 보임', '사내 Wi-Fi에서 카메라 한 대의 실제 영상 확인', 'ON 첫 알림 + 이후 10초 간격 반복 수신 확인', '화면 잠금·앱 닫기 후 수신과 알림 클릭 확인', 'OFF 후 반복 중단 확인 및 참가자 종료 안내']),
        note('알림은 현재 시험 기능입니다', '고모텍 CCTV / 번호번 CCTV 영상 수신 오류가 발생했습니다. (test) 형식입니다. 1~200 무작위 번호는 실제 장애 카메라를 뜻하지 않습니다.', 'warning'),
        ('small', '기술 기준: 프로젝트의 push-test 실행·설정·예약 코드와 '+DATE+' 도메인 응답 확인. 도메인 인증서 갱신·터널 설정은 기존 배포 담당자의 범위입니다.'),
    ]),
]

MOBILE = [
    ('갤럭시 설치·사용 가이드', '사내 도메인 주소로 바로 접속합니다. 확인일: '+DATE, [
        note('인증서 설치 단계가 없어졌습니다', '주소가 공인 인증서를 사용하는 도메인으로 바뀌어 CA 파일 다운로드·설치가 필요 없습니다. Chrome에서 아래 주소를 열고 앱을 설치하면 됩니다.'),
        ('route', ['주소 열기', '앱 설치', '로그인', 'Push ON', 'OFF로 종료']),
        code('CCTV 앱 접속 주소', [APP_URL], 'https://로 시작하고 포트 번호는 없습니다. /lab/push까지 모두 입력합니다.'),
        step('로그인 계정', 'CCTV 로그인 ID·비밀번호는 담당자에게 받습니다. 개인 Google·삼성 계정으로 로그인하는 화면이 아닙니다.'),
        table(['하려는 것', '필요한 연결'], [
            ['앱 열기·로그인·알림 받기', 'LTE/5G 또는 어떤 Wi-Fi든 인터넷만 되면 됩니다.'],
            ['CCTV 목록·영상 보기', '회사 Wi-Fi(사내망)에 연결되어 있어야 합니다.'],
        ], [150, BW-150]),
        ('index', [('주소 열기와 앱 설치', 2), ('로그인·알림 ON/OFF', 3), ('오류 해결', 4), ('완료 확인과 예전 앱 정리', 5)]),
        ('small', '갤럭시 Chrome 웹앱(PWA) 기준입니다. CCTV Push는 실제 장애와 무관한 시험 알림이며 별도 APK 설치는 이 문서의 대상이 아닙니다.'),
    ]),
    ('주소 열기와 앱 설치', 'Chrome 주소창에 도메인 주소를 입력하고 홈 화면에 앱을 추가합니다.', [
        step('01  Chrome 주소창에 전체 주소 입력', 'Chrome을 열고 화면 위의 주소 입력칸을 누릅니다. 아래 주소를 끝까지 입력하고 이동을 누릅니다. Google 검색창이 아닌 주소창에 입력하세요.'),
        code('CCTV 앱 접속 주소', [APP_URL], '보안 경고 없이 고모텍 CCTV 로그인 화면이 보여야 합니다. 예전 192.168 주소나 3000 포트는 더 이상 사용하지 않습니다.'),
        step('02  앱 설치 누르기', '화면 위의 앱 설치를 누릅니다. 또는 Chrome 오른쪽 위 더보기(점 세 개) → 설치 및 바로가기 만들기 → 설치를 선택합니다. 버전에 따라 앱 설치/홈 화면에 추가처럼 보일 수 있습니다.'),
        step('03  홈 화면의 고모텍 CCTV 열기', '설치된 앱을 열면 로그인 화면 또는 CCTV 목록이 보입니다. 이후에는 Chrome 대신 이 앱으로 사용합니다.'),
        note('“웹앱을 설치할 수 없음”이 나올 때', 'Chrome 업데이트·인터넷 연결·회사 설치 정책을 담당자와 점검합니다. 설치가 안 되어도 Chrome 탭에서 로그인과 Push ON 확인은 할 수 있습니다.', 'warning'),
        note('보안 경고가 보이면 진행하지 마세요', '이 주소는 정상이라면 경고가 없습니다. 주소 오타, 휴대폰 날짜·시간, 도메인 인증서 만료 여부를 담당자와 확인합니다. 경고를 건너뛰어 접속하지 않습니다.', 'warning'),
        refs(['chrome', 'install']),
    ]),
    ('로그인·CCTV 보기·알림 ON/OFF', '목록의 실제 CCTV 상태와 시험 푸시 알림은 서로 별개입니다.', [
        ('app-demo',),
        step('로그인', '담당자가 준 아이디·비밀번호를 입력하고 로그인을 누릅니다. 로그인만으로 새 알림이 시작되지는 않습니다.'),
        step('CCTV 목록에서 카메라 선택', '이름·번호·위치로 검색하거나 전체/확인 필요 필터를 누릅니다. 카메라를 누르면 영상 하나가 열리고 닫기(×)로 종료합니다. 영상은 회사 Wi-Fi에서만 나옵니다.'),
        step('CCTV Push ON → 알림 허용', 'ON을 누르면 첫 알림을 즉시 발송하고 이후 10초 간격으로 반복합니다. 홈으로 나가거나 화면을 잠근 뒤에도 수신되는지 확인하세요.'),
        note('시험이 끝나면 반드시 OFF', 'OFF는 현재 기기의 서버 반복 발송을 중단합니다. 앱을 닫거나 아이콘을 지우는 것만으로 OFF를 대신하지 마세요.', 'warning'),
    ]),
    ('막히면 이 순서로 확인하세요', '해결되지 않으면 오류 화면과 현재 주소를 담당자에게 보여주세요. 비밀번호는 공유 화면에 넣지 않습니다.', [
        table(['증상', '해결 방법'], [
            ['페이지를 찾을 수 없음\n(404)','주소가 /lab/push까지 정확한지 확인합니다. 맞다면 서버의 푸시 기능이 꺼진 상태이므로 담당자에게 서버 실행을 요청합니다.'],
            ['보안 경고 /\n연결이 비공개가 아님','주소 오타와 휴대폰 날짜·시간을 확인합니다. 그래도 같으면 담당자에게 도메인 인증서 상태를 확인 요청하고 경고를 건너뛰지 않습니다.'],
            ['웹앱을 설치할 수 없음', 'Chrome 최신 버전·인터넷 연결·회사 설치 제한을 확인합니다. 설치 없이 Chrome 탭에서 로그인·Push ON은 가능합니다.'],
            ['로그인 실패 /\n“같은 테스트 앱에서\n다시 시도”','아이디·비밀번호를 담당자에게 확인합니다. 두 번째 메시지는 서버 주소 설정 문제이므로 담당자에게 알립니다.'],
            ['목록·영상 오류', '회사 Wi-Fi에 연결되어 있는지 확인합니다. 외부에서는 알림만 받을 수 있고 목록·영상은 열리지 않는 것이 정상입니다.'],
            ['ON인데 알림 안 옴', '갤럭시 설정 → 알림에서 고모텍 CCTV(또는 Chrome) 허용, 방해 금지 해제, 인터넷 연결을 확인합니다. 화면에서 상태 재확인 후 필요하면 OFF → ON.'],
            ['예전 앱에서도 알림이 옴', '예전 IP 주소로 설치한 앱을 열어 CCTV Push OFF로 끄고 삭제합니다. 열리지 않으면 담당자에게 예전 발송 중단을 요청합니다.'],
        ], [150, BW-150]),
        note('“알림 상태 확인 필요”가 보이면', '상태 재확인을 누르세요. 발송 중인지 알 수 없는 경우 알림 중단으로 서버 중단을 요청합니다.'),
        refs(['notify']),
    ]),
    ('완료 확인과 예전 앱 정리', 'IP 주소 방식으로 설치했던 앱과 인증서는 정리하고 새 주소만 사용합니다.', [
        ('checks', ['도메인 주소가 보안 경고 없이 열림', '홈 화면의 고모텍 CCTV로 로그인됨', '회사 Wi-Fi에서 CCTV 목록과 선택한 카메라 영상이 열림', 'ON 후 고모텍 CCTV 제목과 (test) 알림을 받음', '잠금·앱 닫기 후 수신, 알림 누르면 앱이 열림', '시험 종료 후 OFF로 반복 중단 확인']),
        table(['예전에 사용한 것', '지금 할 일'], [
            ['192.168… 주소로 설치한 앱', '그 앱을 열어 CCTV Push OFF → 홈 화면에서 삭제. 열리지 않으면 담당자에게 발송 중단을 요청합니다.'],
            ['push-test-ca.crt (CA 인증서)', '설정 → 보안 및 개인정보 보호 → 기타 보안 설정 → 사용자 인증서에서 삭제해도 됩니다. 새 주소에는 필요 없습니다.'],
            ['PC 핫스팟 Wi-Fi', '앱·알림에는 더 이상 필요 없습니다. CCTV 영상만 회사 Wi-Fi가 필요합니다.'],
        ], [150, BW-150]),
        note('화면은 어디서나, 영상은 회사 안에서', '알림과 로그인은 인터넷만 있으면 되지만 CCTV 목록·영상은 사내망에서만 연결됩니다. 알림 번호는 실제 장애를 뜻하지 않는 시험 값입니다.'),
        ('small', '이 문서는 '+DATE+' 기준입니다. 메뉴와 알림 로고의 위치·형태는 갤럭시·Android·Chrome 버전에 따라 달라집니다. 공식 설치 자료는 2쪽의 링크를 참고하세요.'),
    ]),
]


class Guide:
    def __init__(self, filename, audience, pages):
        self.path = OUT / filename
        self.pages = pages
        self.audience = audience
        self.pdf = canvas.Canvas(str(self.path), pagesize=(W, H), pageCompression=1)
        self.pdf.setTitle('고모텍 CCTV | '+audience+' 설치·사용 가이드 (도메인 접속판)')
        self.pdf.setAuthor('고모텍 CCTV')
        self.pdf.setSubject(DOMAIN+' 접속 주소, 서버 설정·실행, 앱 설치와 오류 해결')
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
        elif kind == 'endpoints':
            self.box(M,y,BW,112,C['surfaceSubtle'],C['border'])
            self.txt('실행 후 PC Chrome에서 확인할 주소',M+14,y+13,11,'S')
            for i,(label,value) in enumerate([
                ('앱 접속 주소',APP_URL),
                ('활성화 확인',MANIFEST_URL)]):
                yy=y+37+i*31
                self.txt(label,M+14,yy,9,'M',C['ink3'])
                self.txt(value,M+120,yy,9,'Code')
                self.pdf.linkURL(value,(M+120,H-yy-12,W-M-14,H-yy+2),relative=0,thickness=0)
            self.txt('로그인 화면 + JSON 문서  →  준비 완료. 이 실행 창을 계속 켜 두세요',M+14,y+90,10,'S',T['success']['fg'])
            self.y+=126
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
            self.txt(self.audience+'  |  도메인 접속판',W-M-161,31,9,'M',C['ink3'])
            self.txt(title,M,75,25 if len(title)<21 else 22,'S')
            self.para(subtitle,M,113,BW,11.2,C['ink3'])
            self.y=153
            for block in blocks:
                self.block(block)
            print(f'{self.audience} page {number}: content ends at {self.y:.1f}')
            self.pdf.setStrokeColor(HexColor(C['border']))
            self.pdf.setLineWidth(.6)
            self.pdf.line(M,H-790,W-M,H-790)
            self.txt(DOMAIN+'  |  '+DATE+'  '+VERSION,M,802,8,'R',C['ink3'])
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
    results=[Guide('dxs-cctv-pc-operator-guide.pdf','서버 담당자',PC).build(),
             Guide('dxs-cctv-galaxy-user-guide.pdf','갤럭시 사용자',MOBILE).build()]
    (TMP/'qa-summary.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),'utf-8')
    print(json.dumps(results,ensure_ascii=False,indent=2))
