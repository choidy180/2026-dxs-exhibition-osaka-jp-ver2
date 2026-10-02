from pathlib import Path
import io, json, math, re, hashlib
from PIL import Image
import qrcode
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor, Color
from reportlab.lib.utils import ImageReader
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.lib.pagesizes import A4, landscape
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, TextStringObject, RectangleObject

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
A=HERE/'assets'; M=A/'company'
WORK=ROOT/'tmp/pdfs/redesign'; WORK.mkdir(parents=True,exist_ok=True)
OUT=ROOT/'output/pdf/DX_Solutions_2026_Osaka_Editorial_Brochure_JA_v2.pdf'
W,H=landscape(A4)
PAPER=HexColor('#FAF8F2'); INK=HexColor('#252727'); RED=HexColor('#EA5535')
PINK=HexColor('#EBD4EA'); MINT=HexColor('#DDE7E1'); SAND=HexColor('#F0EACF')
SOFT=HexColor('#E6E4DB'); GRAY=HexColor('#6C716C'); WHITE=HexColor('#FFFFFF')
for n,f in [('JP','YuGothR.ttc'),('JPB','YuGothB.ttc'),('JPL','YuGothL.ttc'),('EN','arial.ttf'),('ENB','arialbd.ttf'),('COND','ARIALN.TTF'),('SERIF','GARA.TTF'),('ITALIC','GARAIT.TTF')]:
    pdfmetrics.registerFont(TTFont(n,'C:/Windows/Fonts/'+f,subfontIndex=0))
c=canvas.Canvas(str(OUT),pagesize=(W,H),pageCompression=1,initialFontName='EN')
c.setTitle('DX Solutions / 現場から、未来を動かす。 / Osaka 2026')
c.setAuthor('DX Solutions'); c.setSubject('M.O.D.E. & A.V.I.S. / 日本語 / A4横 / Editorial edition')
c.setViewerPreference('PrintScaling','None')
page=0; records=[]; images=[]

def box(x,y,w,h,fill=None,stroke=None,lw=.5):
    c.setLineWidth(lw)
    if fill is not None:c.setFillColor(fill)
    if stroke is not None:c.setStrokeColor(stroke)
    c.rect(x,H-y-h,w,h,fill=fill is not None,stroke=stroke is not None)

def line(x,y,u,v,color=INK,lw=.5,dash=None):
    c.saveState(); c.setStrokeColor(color); c.setLineWidth(lw)
    if dash:c.setDash(dash)
    c.line(x,H-y,u,H-v); c.restoreState()

def circle(x,y,r,fill=None,stroke=None,lw=.5):
    c.setLineWidth(lw)
    if fill is not None:c.setFillColor(fill)
    if stroke is not None:c.setStrokeColor(stroke)
    c.circle(x,H-y,r,stroke=stroke is not None,fill=fill is not None)

def ellipse(x,y,w,h,fill=None,stroke=None,lw=.5):
    c.setLineWidth(lw)
    if fill is not None:c.setFillColor(fill)
    if stroke is not None:c.setStrokeColor(stroke)
    c.ellipse(x,H-y-h,x+w,H-y,stroke=stroke is not None,fill=fill is not None)

def text(s,x,y,size=11,font='JP',color=INK,tracking=0,align='left',record=True):
    s=str(s); width=pdfmetrics.stringWidth(s,font,size)+max(0,len(s)-1)*tracking
    if align=='right':x-=width
    if align=='center':x-=width/2
    assert -1<=x and x+width<=W+1,(page,s,x,width)
    assert -1<=y and y+size<=H+1,(page,s,y)
    t=c.beginText(); t.setTextOrigin(x,H-y-pdfmetrics.getAscent(font)*size/1000)
    t.setFont(font,size); t.setFillColor(color); t.setCharSpace(tracking); t.textOut(s); c.drawText(t)
    if record:records.append({'page':page,'text':s,'box':[x,y,x+width,y+size]})
    return width

def para(s,x,y,w,size=10.5,color=INK,font='JP',leading=None):
    st=ParagraphStyle('p',fontName=font,fontSize=size,leading=leading or size*1.65,textColor=color,wordWrap='CJK',splitLongWords=0)
    p=Paragraph(s,st);_,ph=p.wrap(w,1000)
    assert y+ph<H-8,(page,s,y,ph)
    p.drawOn(c,x,H-y-ph)
    records.append({'page':page,'text':re.sub('<[^>]+>','',s),'box':[x,y,x+w,y+ph]})
    return ph

def label(s,x,y,color=INK,size=7.5):return text(s,x,y,size,'EN',color,1)
def cap(s,x,y,w=700,color=GRAY):return para(s,x,y,w,7.3,color,leading=10.5)
def headline(s,x=38,y=84,size=31,color=INK,font='JP',leading=1.3):
    for i,v in enumerate(s.split('\n')):text(v,x,y+i*size*leading,size,font,color)

def photo(path,x,y,w,h,fit='cover',crop=None,shape=None,ax=.5,ay=.5):
    path=Path(path); im=Image.open(path).convert('RGB')
    if crop:im=im.crop(crop)
    iw,ih=im.size; scale=min(w/iw,h/ih) if fit=='contain' else max(w/iw,h/ih)
    dw,dh=iw*scale,ih*scale; dx=x+(w-dw)*ax; dy=y+(h-dh)*ay
    c.saveState();p=c.beginPath()
    if shape=='oval':p.ellipse(x,H-y-h,w,h)
    elif shape=='arch':
        p.moveTo(x,H-y-h);p.lineTo(x,H-y-h*.45)
        p.curveTo(x,H-y+h*.15,x+w,H-y+h*.15,x+w,H-y-h*.45)
        p.lineTo(x+w,H-y-h);p.close()
    else:p.rect(x,H-y-h,w,h)
    c.clipPath(p,stroke=0,fill=0)
    if path.suffix.lower()=='.png':reader=ImageReader(im)
    else:
        stream=io.BytesIO();im.save(stream,format='JPEG',quality=97,subsampling=0);stream.seek(0);reader=ImageReader(stream)
    c.drawImage(reader,dx,H-dy-dh,dw,dh);c.restoreState()
    images.append({'page':page,'file':str(path.relative_to(HERE)),'ppi':round(72/scale,1),'box':[x,y,w,h]})

def arrow(x,y,u,v,color=RED,lw=.8):
    line(x,y,u,v,color,lw);a=math.atan2(v-y,u-x)
    for d in [-2.55,2.55]:line(u,v,u+6*math.cos(a+d),v+6*math.sin(a+d),color,lw)

def signal(x,y,r,color=RED,fill=None):
    # Eight folded directions: an original mark for signals becoming action.
    pts=[]
    for i in range(16):
        a=-math.pi/2+i*math.pi/8; rr=r if i%2==0 else r*.37
        pts.append((x+rr*math.cos(a),y+rr*math.sin(a)))
    p=c.beginPath();p.moveTo(pts[0][0],H-pts[0][1])
    for xx,yy in pts[1:]:p.lineTo(xx,H-yy)
    p.close();c.setStrokeColor(color);c.setLineWidth(.65)
    if fill:c.setFillColor(fill)
    c.drawPath(p,stroke=1,fill=bool(fill))
    if fill is None:
        for i in range(0,16,2):line(x,y,*pts[i],color,.4)

def grid(x,y,w,h,step=44,color=SOFT):
    for xx in range(int(x),int(x+w)+1,step):line(xx,y,xx,y+h,color,.35)
    for yy in range(int(y),int(y+h)+1,step):line(x,yy,x+w,yy,color,.35)

def stripes(x,y,w,h,color=RED,step=5):
    for xx in range(int(x),int(x+w),step):line(xx,y,xx,y+h,color,.35)

def folio(section,color=GRAY):
    text('DX SOLUTIONS',38,572,7.3,'EN',color,1)
    label(section,219,572,color,6.7)
    text(f'{page:02d}',803,568,14,'EN',color,align='right')

def new(section,bg=PAPER,chrome=True):
    global page
    if page:c.showPage()
    page+=1;box(0,0,W,H,bg)
    c.bookmarkPage(f'p{page}');c.addOutlineEntry(section,f'p{page}',0,False)
    if chrome:
        label('MANUFACTURING / IN MOTION',38,26)
        label('OSAKA 2026',690,26)
        folio(section)

def qr(url,x,y,size):
    q=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M,box_size=1,border=4);q.add_data(url);q.make(fit=True)
    a=q.get_matrix();u=size/len(a);box(x,y,size,size,WHITE)
    for yy,row in enumerate(a):
        for xx,v in enumerate(row):
            if v:box(x+xx*u,y+yy*u,u+.01,u+.01,INK)
    c.linkURL(url,(x,H-y-size,x+size,H-y),relative=0,thickness=0)

# 01 / An open, photographic cover. No generated imagery and no card panels.
new('現場から、未来を動かす。',chrome=False)
label('DX SOLUTIONS',38,28,size=10)
label('MANUFACTURING / IN MOTION',310,30,size=7.5)
label('OSAKA 2026',696,30,size=8)
line(38,58,803,58,INK,.55)
text('現場から、',37,84,50,'JP')
text('未来を動かす。',192,151,50,'JP')
line(39,141,394,141,RED,.75);line(195,209,802,209,RED,.75)
signal(744,110,38,RED)
ellipse(333,245,440,282,PINK)
photo(A/'avis-inspection-40.jpg',312,267,491,257,crop=(0,100,874,590),shape='oval')
line(284,267,284,524,RED,.55);line(271,281,297,281,RED,.55);line(271,508,297,508,RED,.55)
text('Manufacturing,',39,302,27,'ITALIC')
text('in motion.',39,334,34,'ITALIC')
para('工場のデータと、\n人の判断をつなぐ。'.replace('\n','<br/>'),40,406,208,12)
label('M.O.D.E. + A.V.I.S.',40,481,RED,8.5)
signal(133,244,23,RED)
label('01 / FIELD NOTES',40,550,GRAY,7)
cap('作業者と設備をつなぐ / 実際の現場デモ映像から',337,548,466)

# 02 / Recognition occupies an entire opening spread-like page.
new('COMPANY / RECOGNITION')
headline('現場で築く信頼。',38,66,35)
text('People & recognition',421,79,29,'ITALIC',RED)
line(38,117,803,117,RED,.6)
photo(M/'achievements/commendation.webp',38,140,376,205)
photo(M/'achievements/future-award.webp',427,140,376,205)
label('AWARD',39,356,RED,7)
para('K-Digital Innovation受賞の記録',91,352,320,11,font='JPB')
label('2026',428,356,RED,8)
para('昌原未来産業戦略シンポジウム',480,352,322,11,font='JPB')
items=[('manufacturing-program.webp','01','製造AI事業\nプロジェクト活動'),('committee.webp','02','慶尚南道\nAI委員会への参画'),('vision-command.webp','03','AX Vision Command\n視察・技術交流'),('partnership.webp','04','企業パートナーシップ\nネットワーキング')]
for i,(p,year,title) in enumerate(items):
    x=38+i*194
    photo(M/'achievements'/p,x,392,183,101)
    label(year,x,504,RED,7)
    para(title.replace('\n','<br/>'),x+34,502,150,8.2,leading=12)
cap('会社活動・受賞写真 / 写真に写る証書・会場表示と会社紹介資料をもとに構成。',38,541,765)

# 03 / A real document gallery with generous certificate scale.
new('COMPANY / PATENTS & CERTIFICATIONS',WHITE)
box(0,52,239,505,MINT)
text('10',37,76,69,'EN',RED)
headline('技術を支える、\n確かな蓄積。',38,177,24)
para('製造AIの研究開発と、\n継続的な提供体制。\n掲載された特許・認証10件から、\n6件を紹介します。'.replace('\n','<br/>'),39,273,166,10.5)
signal(113,437,52,RED)
label('SELECTED RECORDS',39,525,GRAY,7)
certs=[('certificate-1.webp','01 / 特許'),('certificate-2.webp','02 / 特許'),('certificate-7.webp','03 / AIファクトリー専門企業'),('certificate-8.webp','04 / 品質マネジメント'),('certificate-9.webp','05 / 環境マネジメント'),('certificate-10.webp','06 / 企業研究所')]
for i,(p,title) in enumerate(certs):
    xx=266+(i%3)*186; yy=77+(i//3)*235
    photo(M/'patents'/p,xx,yy,151,204,'contain')
    cap(title,xx,yy+211,167,INK)
cap('会社紹介サイト掲載の特許・認証書から抜粋。文書は原本画像を使用しています。',266,542,535)

# 04 / Two connected ideas, expressed as an editorial diagram.
new('VISION / TWO CONNECTED IDEAS')
headline('「見える」から、\n「動ける」へ。',38,76,39)
para('設備が動く。資材が届く。人が判断する。<br/>DX Solutionsは、現場の出来事と業務データを結び、<br/>状況の把握から対応までを一つの流れにします。',425,91,370,11.4)
line(38,217,803,217,INK,.55)
ellipse(64,258,306,211,MINT)
ellipse(471,258,306,211,PINK)
text('M.O.D.E.',216,295,37,'EN',align='center')
text('A.V.I.S.',623,295,37,'EN',align='center')
para('データを統合し、\n変化を捉える意思決定基盤。'.replace('\n','<br/>'),104,361,236,12)
para('声と映像を手掛かりに、\n現場の対応と記録を支える。'.replace('\n','<br/>'),511,361,237,12)
arrow(355,352,481,352);signal(418,352,24,RED,PAPER)
for x,s in [(49,'カメラ・映像'),(244,'設備・センサー'),(447,'ERP・MES・SCM'),(659,'音声・現場作業')]:
    circle(x+4,508,2.5,RED);text(s,x+16,501,10,'JP')
cap('概念構成図 / 接続データと機能の範囲は、対象設備と導入要件に応じて設計します。',39,540,763)

# 05 / M.O.D.E. opener, led by a single large image and oversized typography.
new('01 / M.O.D.E.')
grid(521,61,282,430,47,SOFT)
text('01',36,71,66,'EN',RED)
text('M.O.D.E.',232,66,68,'EN')
line(233,142,803,142,RED,.7)
label('MANUFACTURING & OFFICE DECISION ENGINE',237,159,GRAY,8)
text('Intelligence',38,205,35,'ITALIC')
text('in context.',38,242,35,'ITALIC')
para('判断のための、\n共通の景色。'.replace('\n','<br/>'),40,308,189,22,font='JPL',leading=32)
para('工場とオフィスに散らばる情報を、\n一つの運用レイヤーへ。\n専門AIと業務システムを結び、\nエージェントによる対応へ。'.replace('\n','<br/>'),40,397,188,10.6)
photo(M/'poc/poc-1.webp',266,216,537,268,'contain')
cap('Physical AI PoC / デジタルツイン画面例',269,497,526)
for i,s in enumerate(['基盤','データ接続','専門AI','エージェント']):
    xx=267+i*140;label(f'0{i+1}',xx,535,RED,7);text(s,xx+25,531,9,'JP')
    if i<3:arrow(xx+95,538,xx+126,538,GRAY,.45)

# 06 / Material movement and shipments, arranged as a continuous journey.
new('M.O.D.E. / MATERIALS & SHIPPING')
headline('流れをつかむ。',38,76,40)
text('From warehouse to arrival.',407,86,26,'ITALIC',RED)
line(38,132,803,132,RED,.6)
label('01 / MATERIALS',38,163,RED,8)
text('倉庫から、工程へ。',38,185,20,'JPL')
photo(M/'platform/materials.webp',38,227,354,198,'contain')
cap('資材モニタリング / 掲載画面例',38,436,355)
para('入庫、検収待ち、資材の動きと現場映像を確認。<br/>工程への受け渡しに必要な情報を共有します。',38,473,356,10.8)
label('02 / SHIPPING',449,227,RED,8)
text('工場から、届け先へ。',449,249,20,'JPL')
photo(M/'platform/shipping.webp',449,291,354,198,'contain')
cap('出荷管理 / 掲載画面例',449,501,354)
para('モバイル位置情報と到着・遅延のイベントをつなぎ、<br/>配送状況の把握と対応の標準化を支援します。',449,159,353,10.8)
arrow(416,183,416,481,RED,.75);signal(416,328,20,RED,PAPER)
cap('画面内の数量・時刻・車両情報は展示用サンプルです。',38,541,765)

# 07 / A chart with open space, fine rules and distinct target annotation.
new('M.O.D.E. / PRODUCTION',WHITE)
headline('ラインのリズムを、\n読み解く。',38,76,34)
text('Measure.',531,68,39,'ITALIC',RED)
text('Understand.',531,107,39,'ITALIC',RED)
para('計画と実績、工程イベントを重ね、<br/>ボトルネックの所在から改善検討へ。',39,181,440,10.7)
label('CYCLE TIME / ANALYSIS EXAMPLE',40,243,GRAY,7.5)
vals=[8.8,11.2,12.3,15.9,14.3,22.2,13.3,17.8]
names=['投入','締結1','締結2','自動1','組立1','組立2','自動2','組立3']
base=474;ch=166;xx0=66;cw=476
for v in [0,5,10,15,20,25]:
    yy=base-v/25*ch;line(xx0,yy,xx0+cw,yy,SOFT,.5)
    text(v,52,yy-4,7.5,'EN',GRAY,align='right')
text('秒',40,276,8,'JP',GRAY)
target=base-13.3/25*ch;line(xx0,target,xx0+cw,target,RED,.6,[2,3])
label('TARGET 13.3s',414,278,RED,7.5)
for i,(v,n) in enumerate(zip(vals,names)):
    xx=86+i*62;yy=base-v/25*ch;col=RED if v>13.3 else INK
    line(xx,base,xx,yy,col,1.1);circle(xx,yy,6,col)
    text(f'{v:.1f}',xx,yy-24,12,'EN',col,align='center')
    text(n,xx,base+13,8.7,'JP',align='center')
ellipse(581,237,212,212,PINK)
text('+30',681,281,57,'EN',align='center')
text('%',758,291,25,'EN')
text('改善目標',687,360,12,'JPB',align='center')
text('UPPH 3.20 → 4.16',687,385,11,'JP',align='center')
para('人時生産性の目標例。工程ごとの時間を捉え、作業配分を検討します。',590,467,205,10.3)
cap('会社紹介資料の分析例を再作図。+30%は目標値であり、導入効果を保証する数値ではありません。',39,540,764)

# 08 / An image-first quality story, with a useful close-up and a modest UI.
new('M.O.D.E. / QUALITY')
label('QUALITY / VISION',38,80,RED,8)
headline('小さな差を、\n確かな判断へ。',37,105,35)
para('画像と検査位置を対応づけ、\n正常・不良の判定と\n検査履歴の確認を支援します。'.replace('\n','<br/>'),40,230,269,11.2)
photo(A/'ui-quality.png',341,85,462,262,crop=(563,206,1569,877),shape='oval')
signal(375,401,24,RED)
line(39,340,277,340,RED,.7)
label('LOOK CLOSER.',39,360,RED,9)
for i,(a,b) in enumerate([('01','検査位置を把握'),('02','画像と判定を確認'),('03','履歴を振り返る')]):
    yy=401+i*38;label(a,40,yy,RED,8);text(b,73,yy-3,12,'JP')
photo(A/'ui-quality.png',446,367,357,169,'contain')
cap('ガラス隙間検査 / 日本語展示デモの全体画面',446,538,357)
cap('画像・判定・数量は機能説明用のサンプルです。',39,539,386)

# 09 / Equipment as a spatial system, with one coherent large screen.
new('M.O.D.E. / EQUIPMENT',WHITE)
label('EQUIPMENT / DIGITAL TWIN',38,77,RED,8)
headline('配置と状態を、\nひとつの景色に。',38,103,33)
para('センサー、点検、工程データを組み合わせ、<br/>設備の位置と状況、過去の対応を結びます。',446,120,351,11.5)
photo(A/'ui-equipment.png',38,230,565,268,'contain')
for i,(title,copy) in enumerate([('全体を見る','設備の配置と状態を俯瞰。'),('対象を絞る','注意が必要な設備を確認。'),('履歴をつなぐ','点検と対応の情報を参照。')]):
    yy=240+i*90;circle(635,yy+11,12,None,RED)
    text(i+1,635,yy+5,10,'EN',RED,align='center')
    text(title,658,yy,13,'JPB');para(copy,624,yy+35,177,9.3)
    if i<2:line(635,yy+63,635,yy+75,RED,.65)
cap('3D設備モニタリング / 日本語展示デモ。異常表示は展示シナリオです。',39,512,750)
cap('予兆検知・予知保全の対象と評価方法は、実設備のデータで設計します。',39,539,763)

# 10 / A.V.I.S. has a human, documentary opener with curved photo windows.
new('02 / A.V.I.S.',PINK)
text('02',37,74,65,'EN',RED)
text('A.V.I.S.',233,66,75,'EN')
line(235,147,803,147,RED,.7)
headline('現場の、すぐそばへ。',235,168,31)
text('An agent',40,224,31,'ITALIC')
text('by your side.',40,260,31,'ITALIC')
para('声と映像で、現場の状況を理解する。<br/>必要な答えと対応ガイドを、<br/>作業が行われる、その場所で。',459,244,322,11.2)
photo(A/'avis-defect-traceback-15.jpg',39,338,398,172,crop=(0,0,960,408),shape='oval')
photo(A/'avis-inspection-15.jpg',512,338,291,172,crop=(160,110,880,596),shape='oval')
signal(475,424,29,RED)
cap('実際の現場デモ映像から / 音声・映像を活用した作業支援',40,539,762,INK)

# 11 / Inspection, rebuilt as a visual sequence rather than a feature grid.
new('A.V.I.S. / INSPECTION')
headline('点検は、話すことから。',38,80,35)
text('Scan. Speak. Record.',452,136,26,'ITALIC',RED)
photo(A/'avis-inspection-40.jpg',38,187,474,267,'contain')
cap('設備点検の現場デモ映像',38,466,474)
rows=[('01','識別する','QRで設備を読み取る。'),('02','開始する','音声で点検を呼び出す。'),('03','記録する','確認結果を残す。'),('04','報告する','レポートを生成する。')]
for i,(n,ttl,desc) in enumerate(rows):
    yy=193+i*72;label(n,557,yy+5,RED,9)
    text(ttl,595,yy,17,'JPL');text(desc,595,yy+31,9.5,'JP')
    if i<3:line(567,yy+26,567,yy+65,RED,.55)
para('作業中の声を、次の判断につながる情報へ。',39,507,740,14,font='JPL')
cap('掲載画面は説明用のデモです。記録項目と報告の形式は、現場の運用に合わせて設計します。',39,541,763)

# 12 / A horizontal narrative, with real video evidence kept uncropped.
new('A.V.I.S. / GUIDANCE',WHITE)
headline('見て、聞いて、\n対応を残す。',38,76,37)
para('映像と音声のコンテキストを、<br/>原因の確認・是正対応・作業履歴へ。',457,99,334,12)
signal(751,178,28,RED)
line(38,228,803,228,RED,.6)
items=[('01','認識する','avis-defect-traceback-40.jpg','不良の位置と種類を捉える。\n画像を判断の手掛かりに。'),('02','導く','avis-defect-traceback-65.jpg','想定原因と対応手順を確認。\n作業者の判断を支援。'),('03','残す','avis-idle-time-65.jpg','対応ガイドと実施内容を確認。\n記録を次の振り返りへ。')]
for i,(n,ttl,p,copy) in enumerate(items):
    xx=38+i*260;label(n,xx,244,RED,9)
    photo(A/p,xx,274,245,138,'contain')
    text(ttl,xx,428,23,'JPL')
    para(copy.replace('\n','<br/>'),xx,476,245,10.5)
cap('会社紹介サイトの現場デモ映像より。ウェアラブル表示と対応ガイドを含む説明用シーンです。',39,542,763)

# 13 / A field atlas: cameras, signals, and a real operation view.
new('PHYSICAL AI / FIELD ATLAS')
headline('現場を知るAIは、\n現場から。',38,77,35)
text('Read the field.',497,90,33,'ITALIC',RED)
para('画像認識、設備の状態、業務ダッシュボード。<br/>複数の視点から、出来事を把握し、対応へつなぎます。',427,149,374,10.6)
photo(M/'poc/poc-2.webp',38,239,464,234,'contain')
photo(M/'poc/poc-3.webp',527,239,276,137,'contain')
photo(M/'poc/poc-5.webp',527,399,276,137,'contain')
cap('01 / 作業・設備の状態を確認',39,483,463)
cap('02 / 資材・工程の状況',527,379,274)
text('From recognition to action.',39,518,23,'ITALIC')
cap('Physical AI PoC / 会社紹介資料に掲載された画面例',39,547,762)

# 14 / Company trajectory is given a complete page, not a footer strip.
new('COMPANY / OUR JOURNEY',MINT)
text('28',35,65,127,'EN',RED)
text('AIプロジェクト掲載実績',223,107,22,'JPL')
para('予知保全、工程最適化、画像検査から、<br/>フィジカルAI、ロボティクス、業務支援まで。',227,151,551,11.5)
line(38,228,803,228,INK,.6)
text('Built in the field.',38,252,35,'ITALIC')
para('現場ごとに異なる動きと制約を理解すること。<br/>その積み重ねを、次の製造AIへつなげます。',436,261,363,11)
timeline=[('2021','ルールベースAI','自動化の基盤をつくる'),('2022','機械学習','状態を捉え、変化を知る'),('2023','生成AI','業務の知識をつなぐ'),('2024','フィジカルAI','実設備・工程へ広げる'),('2025','AIエージェント','文脈を理解し、支援する'),('2026','製造AIの展開','現場の意思決定を支える')]
line(53,390,782,390,INK,.55)
for i,(year,title,copy) in enumerate(timeline):
    xx=39+i*129;circle(xx+13,390,4,RED)
    text(year,xx,348,23,'EN')
    para(title,xx,421,120,11,font='JPB')
    para(copy,xx,455,111,9.2)
label('2022-2026 / PROJECT REFERENCES',39,515,GRAY,7)
cap('掲載件数と年次は会社紹介資料に基づきます。個別案件の内容はお問い合わせください。',39,541,763)

# 15 / A route into implementation with open typographic levels.
new('START / ONE CHALLENGE')
headline('まず、一つの\n現場課題から。',38,79,38)
para('課題、データ、業務の流れを確認し、<br/>必要な範囲から検討を始めます。',39,211,329,11)
photo(A/'avis-inspection-15.jpg',38,297,319,214,crop=(160,110,880,596),shape='oval')
cap('設備識別から始まる現場点検 / デモ映像',39,524,327)
rows=[('01','課題を共有','設備停止、検収、品質、作業時間。\n現場で確かめたいことを整理します。'),('02','データを確認','映像、センサー、MES、点検履歴。\n使える情報と接続条件を確認します。'),('03','小さく検証','対象工程と評価指標を決め、\nPoCで運用上の有効性を確かめます。'),('04','運用へつなぐ','現場の手順と役割に合わせ、\n継続利用と展開の方法を検討します。')]
for i,(n,ttl,copy) in enumerate(rows):
    yy=86+i*111;text(n,426,yy,27,'EN',RED);text(ttl,486,yy+3,20,'JPL')
    para(copy.replace('\n','<br/>'),486,yy+43,313,10.5)
    if i<3:line(439,yy+35,439,yy+97,RED,.55)
cap('導入検討の進め方の一例です。実際の範囲・手順は、対象の課題とシステム構成に応じてご相談します。',39,546,763)

# 16 / A quiet typographic close and print-safe vector QR codes.
new('CONTACT',chrome=False)
grid(583,0,259,H,43,SOFT)
label('DX SOLUTIONS / OSAKA 2026',38,32)
headline('次の製造標準を、',37,89,43)
headline('ともにつくる。',219,150,43)
line(38,142,603,142,RED,.75);line(221,204,803,204,RED,.75)
signal(722,101,51,RED)
text('Let’s move forward.',40,250,34,'ITALIC',RED)
text('dx_sales@dx-solutions.co.kr',40,325,21,'EN')
c.linkURL('mailto:dx_sales@dx-solutions.co.kr',(40,H-351,397,H-320),relative=0,thickness=0)
text('+82 55 601 9300',40,371,16,'EN')
text('www.dx-solutions.co.kr',40,409,12,'EN',GRAY)
c.linkURL('https://www.dx-solutions.co.kr/',(40,H-425,267,H-405),relative=0,thickness=0)
c.drawImage(ImageReader(str(M/'brand/logo.png')),40,H-481,160,38.8,mask='auto')
images.append({'page':page,'file':'assets/company/brand/logo.png','ppi':323.1,'box':[40,442.2,160,38.8]})
qr('https://2026-dxs-osaka-exhibition-jp-mu.vercel.app/ja',487,315,130)
qr('https://www.dx-solutions.co.kr/',668,315,130)
text('日本語ソリューション',552,461,9,'JP',align='center')
text('コーポレートサイト',733,461,9,'JP',align='center')
line(39,505,803,505,INK,.5)
para('本社 / 韓国 慶尚南道昌原市城山区 仏母山路24番キル19 102号室',39,518,763,8.5)
cap('会社紹介サイトと展示プロジェクトの掲載資料をもとに構成。写真・映像は現場デモと掲載資料を使用。画面内の数値はサンプルです。掲載機能の提供範囲は導入要件により異なります。',39,543,763)
folio('JAPANESE EDITION / EDITORIAL 02')

c.save()
r=PdfReader(OUT);wr=PdfWriter();wr.clone_document_from_reader(r)
wr._root_object.update({NameObject('/Lang'):TextStringObject('ja-JP')})
for p in wr.pages:p.trimbox=RectangleObject([0,0,W,H])
with open(OUT,'wb') as f:wr.write(f)
(WORK/'layout-records.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf8')
(WORK/'image-records.json').write_text(json.dumps(images,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'pdf':str(OUT),'pages':page,'images':len(images),'bytes':OUT.stat().st_size,'min_ppi':min(v['ppi'] for v in images)},ensure_ascii=False))
