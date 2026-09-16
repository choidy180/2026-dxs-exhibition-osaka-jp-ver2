"""PC 서버 시작과 갤럭시 APK 안내 PDF. 화면은 설명용 벡터 예시다."""
from pathlib import Path
import json
import subprocess
import qrcode
from fontTools.ttLib import TTFont as FontToolsFont
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
TMP = ROOT / 'tmp/pdfs'
OUT = ROOT / 'output/pdf/dxs-cctv-galaxy-user-guide.pdf'
TMP.mkdir(parents=True, exist_ok=True)
OUT.parent.mkdir(parents=True, exist_ok=True)
TOKENS = json.loads(subprocess.run(
    ['node', '--import', 'tsx', '--input-type=module', '-e',
     "import {color,tone} from './styles/design-tokens.ts'; console.log(JSON.stringify({color,tone}));"],
    cwd=ROOT, check=True, capture_output=True, text=True, encoding='utf-8',
).stdout)
C = TOKENS['color']
T = TOKENS['tone']
for name, source in [('R', 'Regular'), ('M', 'Medium'), ('S', 'SemiBold')]:
    font_path = TMP / f'Pretendard-{source}.ttf'
    f = FontToolsFont(ROOT / f'public/fonts/Pretendard-{source}.woff2')
    f.flavor = None
    f.save(font_path)
    pdfmetrics.registerFont(TTFont(name, str(font_path)))
pdfmetrics.registerFont(TTFont('Code', 'C:/Windows/Fonts/consola.ttf'))

W, H = 595.2756, 841.8898
M = 42
PAGE_COUNT = 10
URL = 'https://192.168.137.1:3000/lab/push'
APK_URL = URL + '/android.apk'
PDF = canvas.Canvas(str(OUT), pagesize=(W, H), pageCompression=1)
PDF.setTitle('DXS CCTV 테스트 | PC 서버 시작 및 갤럭시 앱 사용 안내')
PDF.setAuthor('DXS')
PDF.setSubject('PC 핫스팟·PowerShell 서버 실행부터 갤럭시 APK 설치·알림 확인까지')
PDF.setCreator('DXS 사용자 안내')
CHECKS = []


def col(value):
    return HexColor(value)


def box(x, y, w, h, fill=None, border=None, r=10, lw=1):
    PDF.setLineWidth(lw)
    if fill:
        PDF.setFillColor(col(fill))
    if border:
        PDF.setStrokeColor(col(border))
    PDF.roundRect(x, H-y-h, w, h, r, fill=bool(fill), stroke=bool(border))


def line(x1, y1, x2, y2, color=None, lw=1):
    PDF.setStrokeColor(col(color or C['border']))
    PDF.setLineWidth(lw)
    PDF.line(x1, H-y1, x2, H-y2)


def text(s, x, y, size=12, weight='R', color=None, align='left'):
    PDF.setFillColor(col(color or C['ink']))
    PDF.setFont(weight, size)
    width = pdfmetrics.stringWidth(s, weight, size)
    if align == 'center':
        x -= width/2
    if align == 'right':
        x -= width
    PDF.drawString(x, H-y-size*.84, s)
    CHECKS.append((PDF.getPageNumber(), s, x, y, width, size))


def wrap(s, width, size=12, weight='R'):
    lines = []
    for part in s.split('\n'):
        current = ''
        for ch in part:
            if pdfmetrics.stringWidth(current+ch, weight, size) > width and current:
                lines.append(current.rstrip())
                current = ch.lstrip()
            else:
                current += ch
        lines.append(current.rstrip())
    return lines


def para(s, x, y, width, size=12, weight='R', color=None, leading=None):
    leading = leading or size*1.55
    rows = wrap(s, width, size, weight)
    for index, row in enumerate(rows):
        text(row, x, y+index*leading, size, weight, color)
    return y + len(rows)*leading


def pill(s, x, y, tone='neutral', size=10):
    palette = T[tone]
    width = pdfmetrics.stringWidth(s, 'M', size)+20
    box(x,y,width,25,palette['bg'],palette['border'],8)
    text(s,x+10,y+7,size,'M',palette['fg'])
    return width


def number(n,x,y,size=25):
    box(x,y,size,size,C['brandSoft'],C['brandBorder'],8)
    text(str(n),x+size/2,y+6,size*.50,'S',C['brand'],align='center')


def arrow(x,y,kind='right',length=22):
    if kind == 'down':
        line(x,y,x,y+length,C['brand'],1.7)
        line(x-4,y+length-5,x,y+length,C['brand'],1.7)
        line(x+4,y+length-5,x,y+length,C['brand'],1.7)
    else:
        line(x,y,x+length,y,C['brand'],1.7)
        line(x+length-5,y-4,x+length,y,C['brand'],1.7)
        line(x+length-5,y+4,x+length,y,C['brand'],1.7)


def check(x,y,size=12,color=None):
    line(x,y+size*.5,x+size*.36,y+size*.85,color or T['success']['fg'],1.8)
    line(x+size*.36,y+size*.85,x+size,y,color or T['success']['fg'],1.8)


def icon(kind,x,y,size=28,color=None):
    ink = color or C['brand']
    if kind == 'camera':
        box(x,y+size*.24,size*.64,size*.47,None,ink,3,1.6)
        line(x+size*.64,y+size*.35,x+size*.96,y+size*.20,ink,1.6)
        line(x+size*.96,y+size*.20,x+size*.96,y+size*.76,ink,1.6)
        line(x+size*.96,y+size*.76,x+size*.64,y+size*.59,ink,1.6)
    elif kind == 'download':
        line(x+size*.5,y,x+size*.5,y+size*.64,ink,1.7)
        line(x+size*.26,y+size*.42,x+size*.5,y+size*.66,ink,1.7)
        line(x+size*.74,y+size*.42,x+size*.5,y+size*.66,ink,1.7)
        line(x+size*.12,y+size*.65,x+size*.12,y+size*.90,ink,1.7)
        line(x+size*.12,y+size*.90,x+size*.88,y+size*.90,ink,1.7)
        line(x+size*.88,y+size*.90,x+size*.88,y+size*.65,ink,1.7)
    elif kind == 'bell':
        PDF.setStrokeColor(col(ink)); PDF.setLineWidth(1.5)
        path = PDF.beginPath()
        path.moveTo(x+size*.2,H-(y+size*.72))
        path.curveTo(x+size*.32,H-(y+size*.5),x+size*.2,H-(y+size*.14),x+size*.5,H-(y+size*.14))
        path.curveTo(x+size*.8,H-(y+size*.14),x+size*.68,H-(y+size*.5),x+size*.8,H-(y+size*.72))
        path.close()
        PDF.drawPath(path,fill=0,stroke=1)
        line(x+size*.41,y+size*.88,x+size*.59,y+size*.88,ink,2)
    elif kind == 'wifi':
        for radius in [size*.42,size*.29,size*.15]:
            PDF.setStrokeColor(col(ink)); PDF.setLineWidth(1.6)
            PDF.arc(x+size*.5-radius,H-y-size*.75-radius,x+size*.5+radius,H-y-size*.75+radius,45,90)
        box(x+size*.47,y+size*.70,size*.06,size*.06,ink,None,1)


def tag(s,x,y):
    box(x,y,94,21,C['fill'],None,6)
    text(s,x+47,y+6,9,'M',C['ink3'],'center')


def section(page,title,sub,kicker):
    PDF.bookmarkPage(f'page-{page}')
    PDF.addOutlineEntry(title,f'page-{page}',0,False)
    text('DXS CCTV 테스트',M,30,10,'S',C['brand'])
    text(kicker,W-M,30,10,'M',C['ink3'],'right')
    text(title,M,72,27,'S')
    para(sub,M,113,W-2*M,12,'R',C['ink2'])


def footer(page):
    line(M,788,W-M,788)
    text('화면은 설명용 예시입니다. 기종·버전에 따라 모양이 다를 수 있습니다.',M,802,8,'R',C['ink3'])
    text(f'{page:02d} / {PAGE_COUNT:02d}',W-M,802,9,'S',C['ink3'],'right')
    PDF.showPage()


def banner(title,body,x,y,w=511,h=82,tone='info'):
    p=T[tone]
    box(x,y,w,h,p['bg'],p['border'],10)
    text(title,x+16,y+14,12,'S',p['fg'])
    para(body,x+16,y+36,w-32,10.5,'R',C['ink2'],15)


def step(n,title,body,x,y,w):
    number(n,x,y)
    text(title,x+36,y+3,14,'S')
    return para(body,x+36,y+30,w-36,11,'R',C['ink2'],17)


class Phone:
    def __init__(self,x,y,w=220):
        self.x=x; self.y=y; self.s=w/240
        box(x,y,w,470*self.s,C['surface'],C['borderStrong'],22,1.25)
        self.box(7,8,226,452,C['pageBg'],None,17)
        self.txt('9:41',19,20,9,'M')
        self.txt('Wi-Fi  85%',221,20,8,'R',C['ink3'],'right')
        self.box(98,7,44,6,C['ink'],None,3)
        self.box(88,450,64,3,C['ink4'],None,1)
    def box(self,x,y,w,h,fill=None,border=None,r=8,lw=1):
        box(self.x+x*self.s,self.y+y*self.s,w*self.s,h*self.s,fill,border,r*self.s,lw)
    def txt(self,s,x,y,size=12,weight='R',color=None,align='left'):
        text(s,self.x+x*self.s,self.y+y*self.s,size*self.s,weight,color,align)
    def p(self,s,x,y,width,size=11,color=None,leading=17,weight='R'):
        return para(s,self.x+x*self.s,self.y+y*self.s,width*self.s,size*self.s,weight,color,leading*self.s)
    def button(self,s,x,y,w=196,h=38,active=False):
        self.box(x,y,w,h,C['brandSoft'] if active else C['surface'],C['brandBorder'] if active else C['border'],8)
        self.txt(s,x+w/2,y+(h-12)/2,12,'S' if active else 'M',C['brand'] if active else C['ink2'],'center')
    def tap(self,x,y,n):
        number(n,self.x+x*self.s,self.y+y*self.s,23*self.s)
    def row(self,title,sub,y,on=False):
        self.box(16,y,208,60,C['surface'],C['brandBorder'] if on else C['border'],8)
        self.txt(title,29,y+12,12,'S',C['brand'] if on else None)
        self.txt(sub,29,y+34,9,'R',C['ink3'])
    def header(self,title):
        self.txt('‹',20,52,23,'R',C['ink3'])
        self.txt(title,45,58,15,'S')


def qr(url,x,y,size=126):
    code=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M,box_size=8,border=4)
    code.add_data(url); code.make(fit=True)
    image=code.make_image(fill_color=C['ink'],back_color=C['surface']).convert('RGB')
    PDF.drawImage(ImageReader(image),x,H-y-size,size,size)
    PDF.linkURL(url,(x,H-y-size,x+size,H-y),relative=0,thickness=0)


# 1. 시작 안내와 다운로드 지점.
PDF.bookmarkPage('page-1'); PDF.addOutlineEntry('시작하기 전', 'page-1',0,False)
text('DXS CCTV 테스트',M,35,11,'S',C['brand'])
pill('PC + 갤럭시 안내',W-166,29,'neutral',10)
text('갤럭시 CCTV 앱',M,93,33,'S')
text('PC 서버부터 알림 확인까지',M,137,29,'S')
para('PC를 먼저 준비하고, 휴대폰으로 이어서 따라 하세요.\n앱 설치는 처음 한 번, PC 서버는 테스트할 때 켭니다.',M,188,470,13,'R',C['ink2'],21)
flow=[('1','PC 서버 켜기','2~4쪽','download'),('2','앱 설치','5~6쪽','camera'),('3','로그인','7쪽','bell'),('4','수신 확인','8~9쪽','bell')]
for i,(n,title,sub,kind) in enumerate(flow):
    x=M+i*132
    box(x,271,115,108,C['surface'],C['border'])
    number(n,x+12,283,22)
    text(title,x+12,317,15,'S')
    text(sub,x+12,343,10,'R',C['ink3'])
    if i<3: arrow(x+119,325,length=9)
box(M,406,293,196,C['pageBg'],C['border'])
text('시작 전에 3가지만 확인하세요',M+17,425,15,'S')
for i,(a,b) in enumerate([
    ('테스트용 Wi-Fi 연결','설정 → 연결 → Wi-Fi에서 안내받은 이름 선택'),
    ('PC 서버 켜짐','담당자가 준비한 컴퓨터가 켜져 있어야 합니다.'),
    ('테스트 계정 받기','아이디와 비밀번호를 담당자에게 받으세요.')]):
    yy=465+i*43
    check(M+18,yy+2,11)
    text(a,M+38,yy,12,'S')
    text(b,M+38,yy+20,9,'R',C['ink3'])
box(351,406,202,196,C['surface'],C['border'])
text('웹에서 설치 파일 받기',452,421,12,'S',align='center')
qr(APK_URL,389,443,126)
text('PC에서 읽는 중: 휴대폰 카메라로 스캔',452,575,8,'R',C['ink3'],'center')
box(M,620,511,49,C['brandSoft'],C['brandBorder'])
text('휴대폰에서 이 PDF를 보고 있다면 여기를 누르세요',M+255,637,12,'S',C['brand'],'center')
PDF.linkURL(APK_URL,(M,H-669,W-M,H-620),relative=0,thickness=0)
text('다운로드는 현재 테스트 장소의 같은 네트워크에서만 가능합니다.',M,680,9,'R',C['ink3'])
text('인증서 경고가 뜨면 담당자에게 설치 파일을 직접 받으세요. (10쪽)',M,695,9,'R',C['ink3'])
banner('테스트 알림은 실제 CCTV 장애가 아닙니다.',
       'PC 담당자는 2쪽, 서버가 켜져 있으면 휴대폰 사용자는 5쪽부터 보세요.',M,709,h=64,tone='info')
footer(1)


# 2. 현재 준비된 PC의 네트워크 연결.
section(2,'PC에서 핫스팟을 켜세요','현재 설정이 완료된 테스트 PC 기준입니다. PC에 연결된 랜선은 그대로 둡니다.','PC 01  연결 준비')
step('1','Windows 설정 열기','Windows 키 + I → 네트워크 및 인터넷 → 모바일 핫스팟을 켭니다.',M,161,511)
box(M,222,511,287,C['surface'],C['borderStrong'])
box(M+1,223,509,36,C['fill'],None,8)
text('설정',M+17,234,12,'S')
text('Windows + I',W-M-16,235,10,'M',C['ink3'],'right')
line(M+167,259,M+167,508)
text('시스템',M+18,283,11,'R',C['ink3'])
text('Bluetooth 및 장치',M+18,318,11,'R',C['ink3'])
box(M+9,350,149,37,C['brandSoft'],C['brandBorder'])
text('네트워크 및 인터넷',M+19,363,11,'S',C['brand'])
text('개인 설정',M+18,407,11,'R',C['ink3'])
text('앱',M+18,442,11,'R',C['ink3'])
text('모바일 핫스팟',M+187,282,18,'S')
box(M+435,281,45,24,T['success']['fg'],None,12)
box(M+459,284,18,18,C['surface'],None,9)
text('켬',M+415,288,10,'M',T['success']['fg'],'right')
line(M+185,321,W-M-18,321)
text('인터넷 연결 공유',M+187,338,11,'M')
text('이더넷',W-M-25,338,11,'R',C['ink2'],'right')
text('공유 방법',M+187,373,11,'M')
text('Wi-Fi',W-M-25,373,11,'R',C['ink2'],'right')
box(M+185,410,304,76,C['pageBg'],C['border'])
text('네트워크 이름 / 암호',M+198,425,12,'S')
text('이 PC 화면에 표시된 값을 확인하세요.',M+198,452,10,'R',C['ink3'])
step('2','휴대폰을 같은 핫스팟에 연결','갤럭시 설정 → 연결 → Wi-Fi를 엽니다.\nPC에 표시된 네트워크 이름을 고르고, 표시된 암호를 입력합니다.',M,545,511)
box(M,641,511,48,C['brandSoft'],C['brandBorder'])
text('PC 핫스팟 이름 확인',M+18,658,12,'S',C['brand'])
arrow(M+175,665,length=26)
text('갤럭시 Wi-Fi에서 같은 이름 선택',M+218,658,12,'S',C['brand'])
banner('이미 휴대폰이 연결되어 있으면 다음 쪽으로',
       '이 안내는 현재 PC의 핫스팟과 기존 APK 주소 기준입니다.\n다른 PC나 다른 네트워크에서 사용할 때는 담당자의 설정 확인이 필요합니다.',M,703,h=71,tone='info')
footer(2)


# 3. 복사 가능한 명령과 PowerShell 실행 위치.
section(3,'PowerShell에 두 줄을 입력하세요','이미 서버 실행창에 Ready가 보이면 다시 실행하지 말고 4쪽으로 이동하세요.','PC 02  서버 실행')
step('1','PowerShell 열기','Windows 시작 버튼을 누르고 PowerShell을 검색한 뒤 실행합니다.',M,161,511)
box(M,222,511,102,C['pageBg'],C['border'])
box(M+15,237,481,32,C['surface'],C['brandBorder'])
text('검색',M+29,248,10,'R',C['ink3'])
text('PowerShell',M+81,246,14,'S')
text('Windows PowerShell',M+28,289,13,'S')
box(W-M-87,281,67,30,C['brandSoft'],C['brandBorder'])
text('열기',W-M-53,290,11,'S',C['brand'],'center')
step('2','아래 명령을 한 줄씩 실행','첫 줄을 붙여넣고 Enter, 다음 줄을 붙여넣고 Enter를 누르세요.',M,348,511)
box(M,410,511,87,C['surface'],C['brandBorder'])
text(r'cd D:\dev\2026-mode-dxs',M+18,431,13,'Code',C['ink'])
text('npm.cmd run push:phone -- --host=192.168.137.1',M+18,466,12,'Code',C['ink'])
text('PDF의 명령어를 복사해 PowerShell에 Ctrl+V로 붙여넣을 수 있습니다.',M,510,10,'R',C['ink3'])
box(M,544,511,150,C['pageBg'],C['borderStrong'])
box(M+1,545,509,32,C['fill'],None,8)
text('Windows PowerShell',M+14,555,11,'S')
text('입력 후 보이는 예시',W-M-14,556,9,'R',C['ink3'],'right')
text('PS C:\\Users\\...> cd D:\\dev\\2026-mode-dxs',M+17,594,10,'Code')
text('PS D:\\dev\\2026-mode-dxs>',M+17,617,10,'Code')
text('npm.cmd run push:phone -- --host=192.168.137.1',M+17,640,10,'Code')
text('Starting...',M+17,670,11,'Code',C['ink3'])
banner('위 명령 두 줄만 입력하면 됩니다.',
       'PS ...> 표시는 입력하지 않습니다. 명령 실행 뒤 입력 줄이 돌아오지 않는 것은 정상입니다.\n폴더·명령·테스트 설정이 없다는 오류가 나오면 담당자에게 복구를 요청하세요.',M,702,h=72,tone='info')
footer(3)


# 4. 준비 완료 판별, 브라우저 주소, 유지·종료와 충돌 안내.
section(4,'Ready가 나오면 접속하세요','접속 주소가 표시되고 Ready가 나오면, PC 브라우저에서 먼저 화면을 확인합니다.','PC 03  확인 및 종료')
box(M,163,511,148,C['surface'],C['borderStrong'])
box(M+1,164,509,32,C['fill'],None,8)
text('Windows PowerShell',M+15,174,11,'S')
text('접속 주소:',M+17,215,11,'S')
text(URL,M+85,215,11,'M',C['ink2'])
box(M+14,246,483,45,T['success']['bg'],T['success']['border'])
check(M+28,263,13)
text('Ready in 698ms',M+55,261,15,'Code',T['success']['fg'])
text('시간 숫자는 달라도 됩니다.',W-M-26,266,9,'R',T['success']['fg'],'right')
step('1','브라우저 주소칸에 입력','PC에서 Chrome 또는 Edge를 엽니다. Ctrl+L을 눌러 주소칸을 선택하세요.',M,337,511)
box(M,401,511,78,C['pageBg'],C['border'])
text('주소칸',M+14,418,10,'S',C['ink3'])
box(M+64,414,428,33,C['surface'],C['brandBorder'])
text(URL,M+77,425,12,'M')
text('위 주소 전체를 붙여넣고 Enter를 누릅니다.',M+66,457,10,'R',C['ink3'])
PDF.linkURL(URL,(M+64,H-447,W-M-19,H-414),relative=0,thickness=0)
text('“PWA 푸시 테스트” 화면이 열리면 휴대폰 안내 5쪽으로 이동하세요.',M,496,12,'S',C['brand'])
box(M,533,247,117,C['surface'],C['border'])
text('테스트 중에는',M+15,550,14,'S')
para('PowerShell 창을 켜두세요.\n최소화해도 되지만 닫으면 안 됩니다.\nPC가 절전·종료되지 않게 유지하세요.',M+15,580,219,11,'R',C['ink2'],19)
box(306,533,247,117,C['surface'],C['border'])
text('테스트가 끝나면',321,550,14,'S')
para('서버 창에서 Ctrl+C를 누릅니다.\n종료 확인 Y/N이 나오면 Y → Enter.\n다음엔 2쪽에서 핫스팟을 확인한 뒤\n3쪽을 따라 하세요.',321,580,219,11,'R',C['ink2'],19)
banner('주소를 사용 중이라고 나오면',
       '기존 서버 창이 있는지 확인하세요. 위 주소가 열리면 새로 띄운 창만 Ctrl+C로 닫습니다.\n어느 창인지 모르거나 접속이 안 되면 담당자에게 문의하세요. 포트를 임의로 바꾸지 마세요.',M,678,h=73,tone='warning')
text('핫스팟 주소가 없다는 오류는 핫스팟을 먼저 켜고 다시 시도하세요. (2쪽)',M,765,10,'R',C['ink3'])
footer(4)


# 5. 두 가지 파일 받기 경로.
section(5,'설치 파일을 준비하세요','담당자에게 파일을 받거나, 접속 가능한 웹 화면에서 다운로드합니다.','휴대폰 01  파일 받기')
pill('가장 간단한 방법',M,158,'success')
pill('웹 화면이 열리는 경우',319,158,'neutral')
p=Phone(52,204,217); p.header('내 파일')
p.row('다운로드','받은 파일을 찾는 폴더',100,True)
p.txt('설치 파일',24,183,11,'M',C['ink3'])
p.box(16,208,208,92,C['surface'],C['brandBorder'])
p.txt('APK',30,229,12,'S',C['brand'])
p.txt('dxs-cctv-test.apk',30,254,13,'S')
p.txt('담당자가 전달한 파일',30,279,9,'R',C['ink3'])
p.tap(187,201,'1')
p.p('다운로드 폴더가 비어 있다면\n담당자에게 설치 파일을\n먼저 받아주세요.',25,329,190,11)
p=Phone(326,204,217)
p.box(15,49,210,39,C['surface'],C['brandBorder'])
p.txt('192.168.137.1:3000/lab/push',120,64,9,'M',C['ink2'],'center')
p.txt('PWA 푸시 테스트',25,112,17,'S')
p.p('테스트 알림은 실제 CCTV\n상태와 무관합니다.',25,144,190,11)
p.button('앱 설치 안내',25,202,190)
p.button('갤럭시 APK 다운로드',25,253,190,43,True)
p.tap(191,245,'1')
p.box(17,326,206,87,C['surface'],C['border'])
p.txt('상황 모니터링',29,341,15,'S')
p.p('기존 CCTV 화면이\n아래에 표시됩니다.',29,370,180,10,C['ink3'])
step('A','받은 파일 열기','내 파일 → 다운로드에서\ndxs-cctv-test.apk를 누릅니다.',M,650,247)
step('B','웹에서 받기','브라우저 주소칸에 아래 주소를 입력한 뒤\n갤럭시 APK 다운로드를 누릅니다.',319,650,234)
box(M,728,511,42,C['fill'],C['border'])
text(URL,M+255,742,12,'M',C['ink2'],'center')
PDF.linkURL(URL,(M,H-770,W-M,H-728),relative=0,thickness=0)
footer(5)


# 6. 출처 허용과 설치.
section(6,'앱을 설치하고 여세요','받은 APK를 누른 뒤 설치를 진행합니다. 허용 요청이 나올 때만 왼쪽 단계를 진행하세요.','휴대폰 02  앱 설치')
step('1','설치가 차단되면','설정에서 파일을 여는 앱만 허용합니다.',M,163,249)
step('2','설치 → 열기','완료 후 DXS CCTV 테스트를 엽니다.',319,163,234)
p=Phone(52,236,217); p.header('출처를 알 수 없는 앱 설치')
p.p('이 출처 허용',24,112,190,14,weight='S')
p.box(21,157,199,84,C['surface'],C['brandBorder'])
p.txt('내 파일',34,177,15,'S')
p.txt('이 출처 허용',34,207,11,'R',C['ink3'])
p.box(172,192,35,20,T['success']['fg'],None,10)
p.box(190,195,14,14,C['surface'],None,7)
p.tap(195,152,'1')
p.p('웹에서 바로 열었다면\n삼성 인터넷 또는 Chrome을\n허용하는 화면일 수 있습니다.',27,280,183,11)
p.p('휴대폰의 뒤로가기로\n설치 화면에 돌아가세요.',27,370,184,12,C['brand'],19,weight='M')
p=Phone(326,236,217); p.header('앱 설치')
p.box(25,112,190,191,C['surface'],C['border'])
icon('camera',p.x+97*p.s,p.y+136*p.s,44*p.s)
p.txt('DXS CCTV 테스트',120,202,16,'S',align='center')
p.txt('이 앱을 설치하시겠습니까?',120,235,11,'R',C['ink3'],'center')
p.button('설치',51,263,138,35,True)
p.tap(173,256,'2')
p.txt('설치가 끝나면',120,337,12,'M',C['ink3'],'center')
p.button('열기',25,369,190,40,True)
banner('설치 허용은 필요한 앱에만',
       '설정 검색창에서 “출처를 알 수 없는 앱 설치”를 찾을 수 있습니다.\n설치 후 잠시 바꾼 허용 설정은 원래대로 돌려두세요. 계속 차단되면 10쪽을 보세요.',M,690,h=83,tone='info')
footer(6)


# 7. 로그인과 OS 알림 허용.
section(7,'로그인하고 알림을 허용하세요','처음 한 번 허용하면 현재 휴대폰이 등록됩니다. 별도로 알림 켜기를 누를 필요가 없습니다.','휴대폰 03  로그인 및 등록')
step('1','테스트 계정 입력','담당자가 준 아이디와 비밀번호를 씁니다.',M,163,249)
step('2','알림 요청에서 허용','처음 표시되는 휴대폰 요청에 답합니다.',319,163,234)
p=Phone(52,237,217)
p.box(18,91,204,307,C['surface'],C['border'])
p.txt('DXS CCTV',33,109,18,'S')
p.txt('CCTV 관제 · 테스트 앱',33,137,10,'R',C['ink3'])
p.txt('로그인',33,173,17,'S')
p.txt('테스트 사용자',33,216,11,'M')
p.box(31,238,178,35,C['pageBg'],C['border'])
p.txt('받은 아이디 입력',42,250,10,'R',C['ink3'])
p.txt('비밀번호',33,286,11,'M')
p.box(31,307,178,35,C['pageBg'],C['border'])
p.txt('● ● ● ● ● ● ● ●',42,319,8,'R',C['ink3'])
p.button('로그인 및 알림 등록',31,357,178,34,True)
p.tap(188,347,'1')
p=Phone(326,237,217)
p.txt('DXS CCTV',25,70,18,'S')
p.box(20,130,200,237,C['surface'],C['borderStrong'])
icon('bell',p.x+102*p.s,p.y+151*p.s,34*p.s)
p.p('DXS CCTV 테스트에서\n알림을 보내도록\n허용하시겠습니까?',38,201,168,14,leading=22,weight='S')
p.button('허용',35,286,170,37,True)
p.tap(190,279,'2')
p.txt('허용 안 함',120,340,11,'R',C['ink3'],'center')
banner('등록이 끝나면 “알림 사용 중”을 확인하세요.',
       '이미 허용한 기기에서는 요청창이 안 나올 수 있습니다.\n이 화면의 계정은 Google·삼성 계정과 다릅니다. 모르면 테스트 담당자에게 받으세요.',M,690,h=83,tone='success')
footer(7)


# 8. 서버 예약과 앱 닫기.
section(8,'테스트 푸시를 한 번 누르세요','화면 오른쪽 위 알림 설정을 열어 가상 알림을 예약합니다.','휴대폰 04  30초 테스트')
step('1','알림 설정 열기','CCTV 화면 상단 버튼을 누릅니다.',M,163,249)
step('2','테스트 푸시 누르기','현재 휴대폰에 1회 예약됩니다.',319,163,234)
p=Phone(52,238,217)
p.box(15,62,210,85,C['surface'],C['border'])
p.txt('DXS CCTV',27,76,16,'S')
p.box(25,108,86,25,T['success']['bg'],T['success']['border'])
p.txt('알림 사용 중',68,117,9,'M',T['success']['fg'],'center')
p.button('알림 설정',123,105,91,31,True)
p.tap(195,92,'1')
p.txt('상황 모니터링',25,176,20,'S')
p.p('이 아래에는 기존 CCTV\n목록과 영상이 표시됩니다.',25,210,190,12)
for yy in [271,347]:
    p.box(21,yy,198,62,C['surface'],C['border'])
    p.box(33,yy+12,49,37,C['fill'],C['border'])
    icon('camera',p.x+44*p.s,p.y+(yy+21)*p.s,25*p.s,C['ink3'])
    p.txt('CCTV 목록 영역',95,yy+23,11,'M',C['ink3'])
p=Phone(326,238,217)
p.txt('DXS CCTV',25,65,17,'S')
p.box(15,115,210,296,C['surface'],C['borderStrong'])
p.txt('알림 설정',30,135,18,'S')
p.txt('×',208,134,19,'R',C['ink3'],'right')
p.txt('테스트 알림',30,177,13,'S')
p.p('테스트 알림은 실제 CCTV\n상태와 무관합니다.',30,207,182,10)
p.button('테스트 푸시',29,263,182,42,True)
p.tap(195,254,'2')
p.box(28,328,184,65,T['info']['bg'],T['info']['border'])
p.p('30초 후 발송됩니다.\n화면을 닫고 확인해보세요.',40,343,160,11,T['info']['fg'],17)
banner('문구가 나오면 홈 화면으로 나가세요.',
       '휴대폰의 홈 버튼 또는 아래에서 위로 밀어 홈 화면으로 나갑니다.\n약 30초 기다리세요. 테스트 푸시를 여러 번 누르지 않아도 됩니다.',M,689,h=84,tone='info')
footer(8)


# 9. 시스템 알림 수신.
section(9,'휴대폰 알림창에서 확인하세요','화면 맨 위에서 아래로 내려 알림창을 엽니다. 앱이 닫혀 있어도 수신하도록 구현했습니다.','휴대폰 05  수신 확인')
p=Phone(52,179,224)
p.txt('9:42',25,64,31,'S')
p.txt('화면 위에서 아래로 내리기',120,118,10,'M',C['ink3'],'center')
arrow(p.x+120*p.s,p.y+145*p.s,'down',27)
p.box(18,207,204,159,C['surface'],C['brandBorder'])
p.txt('DXS CCTV 테스트',31,222,11,'S')
p.txt('지금',207,223,9,'R',C['ink3'],'right')
p.p('[테스트] TEST-CAM-03\n영상 수신 중단',31,256,179,14,leading=21,weight='S')
p.p('푸시 수신 확인용 가상 이벤트입니다.\n실제 장애가 아닙니다.',31,313,178,10,C['ink3'],16)
p.tap(190,353,'1')
p.txt('알림을 누르면 앱이 열립니다.',120,403,11,'M',C['brand'],'center')
text('아래 3개가 되면 성공',319,193,17,'S')
for i,(title,body) in enumerate([
    ('알림 사용 중 표시','앱 화면에 등록 상태가 보입니다.'),
    ('시스템 알림 도착','휴대폰 알림창에 [테스트]가 보입니다.'),
    ('누르면 앱 열림','CCTV 화면으로 돌아갑니다.')]):
    yy=241+i*91
    box(319,yy,234,76,C['surface'],C['border'])
    box(333,yy+17,15,15,None,C['borderStrong'],3)
    text(title,359,yy+16,13,'S')
    para(body,333,yy+44,204,10,'R',C['ink3'],14)
banner('카메라 번호와 이벤트는 매번 달라질 수 있습니다.',
       'TEST-CAM 번호와 “영상 수신 중단 / 복구”는 푸시 확인용 가상 내용입니다.\n실제 CCTV 상태나 영상을 변경하지 않습니다.',M,645,h=77,tone='info')
text('수신 확인이 끝났다면',M,741,12,'S')
text('알림 설정 → 알림 끄기에서 해제할 수 있습니다. 미발송 예약도 취소됩니다.',M,761,10,'R',C['ink2'])
footer(9)


# 10. 막히는 지점과 배포 전 검증 상태.
section(10,'막히면 이 순서로 확인하세요','오른쪽 방법을 먼저 시도하고, 해결되지 않으면 테스트 담당자에게 화면을 보여주세요.','도움말')
rows=[
    ('페이지·앱이 안 열려요','휴대폰의 설정 → 연결 → Wi-Fi를 확인하세요.\n담당자가 알려준 네트워크에 연결하고 PC 서버가 켜졌는지 확인합니다.'),
    ('웹에 인증서 경고가 떠요','뒤로 간 뒤 담당자에게 dxs-cctv-test.apk를 직접 받으세요.\n현재 APK에는 테스트 서버 인증서가 포함되어 있습니다.'),
    ('설치를 할 수 없어요','설정에서 “출처를 알 수 없는 앱 설치”를 검색하세요.\n파일을 여는 앱만 허용합니다. 추가 차단은 아래 안내를 보세요.'),
    ('아이디·비밀번호를 몰라요','테스트 담당자에게 테스트 계정을 받으세요.\nGoogle·삼성 계정을 입력하는 화면이 아닙니다.'),
    ('30초가 지나도 안 와요','설정 → 애플리케이션 → DXS CCTV 테스트 → 알림을 허용하세요.\n앱에서 알림 미등록이면 알림 설정 → 알림 켜기를 누릅니다.\n“알림 사용 중”을 확인한 뒤 테스트 푸시를 다시 누르세요.'),
    ('알림을 눌러도 화면이 안 떠요','테스트용 Wi-Fi에 다시 연결하세요.\n외부에서 알림을 받아도 내부 CCTV 화면은 열리지 않을 수 있습니다.')
]
box(M,164,511,30,C['fill'],C['border'],6)
text('이렇게 보이면',M+13,173,10,'S',C['ink2'])
text('이렇게 해보세요',M+170,173,10,'S',C['ink2'])
yy=203
for title,body in rows:
    text(title,M+13,yy+7,11,'S')
    para(body,M+170,yy+6,325,10,'R',C['ink2'],15)
    line(M,yy+55,W-M,yy+55)
    yy+=62
banner('“보안 위험 자동 차단” 안내가 나오는 경우',
       '담당자가 준 파일인지 확인한 뒤, 담당자와 함께 설치 중에만 잠시 해제하고 다시 켜세요.\n회사 관리폰은 기기 관리자에게 문의하세요. 메뉴 이름은 One UI 버전에 따라 다릅니다.',M,592,h=76,tone='warning')
text('앱 닫기와 “강제 종료”는 다릅니다.',M,686,12,'S')
para('홈으로 나가거나 최근 앱에서 닫아 테스트하세요. 휴대폰 설정에서 강제 종료했다면\n앱을 다시 여세요. 서버와 휴대폰의 인터넷 연결도 유지해야 합니다.',M,708,511,10,'R',C['ink2'],15)
text('실기기 검증 필요',M,748,10,'S',T['warning']['fg'])
text('설치·권한 허용·앱 종료 후 수신·알림 클릭·영상 재생은 갤럭시에서 확인하세요.',M+100,748,9,'R',C['ink3'])
text('삼성 공식 도움말: 설치 허용 / 보안 위험 자동 차단',M,771,8,'R',C['ink3'])
PDF.linkURL('https://www.samsung.com/us/support/troubleshoot/TSG10001913/',(M,H-781,M+155,H-770),relative=0,thickness=0)
PDF.linkURL('https://www.samsung.com/us/support/answer/ANS10003636/',(M+155,H-781,M+300,H-770),relative=0,thickness=0)
footer(10)
PDF.save()

reader=PdfReader(OUT)
assert len(reader.pages)==PAGE_COUNT
assert all((page.extract_text() or '').strip() for page in reader.pages)
out_of_page=[item for item in CHECKS if item[2]<M-1 or item[2]+item[4]>W-M+1 or item[3]+item[5]>785]
# 휴대폰 내부와 페이지 푸터는 본문 여백 경계와 별도로 검사한다.
out_of_page=[i for i in out_of_page if i[2]<18 or i[2]+i[4]>W-18 or i[3]+i[5]>824]
if out_of_page:
    raise RuntimeError(f'Text outside safe page area: {out_of_page}')
(TMP/'push-guide-qa.json').write_text(json.dumps({'pages':len(reader.pages),'bytes':OUT.stat().st_size,'links':sum(len(p.get('/Annots',[])) for p in reader.pages),'text_items':len(CHECKS)},ensure_ascii=False,indent=2),'utf-8')
print(OUT)
print((TMP/'push-guide-qa.json').read_text('utf-8'))
