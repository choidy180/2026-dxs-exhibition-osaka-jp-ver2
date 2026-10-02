from pathlib import Path
import math, json, re, io
from PIL import Image
import qrcode
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import HexColor, Color
from reportlab.lib.utils import ImageReader
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, TextStringObject, RectangleObject

ROOT=Path(__file__).resolve().parents[3]
TMP=Path(__file__).resolve().parent
MEDIA=Path('D:/dev/2026-dxs-osaka-exhibition-jp/public/media')
OUT=ROOT/'output/pdf/DX_Solutions_2026_Osaka_Brochure_JA_A4_Landscape.pdf'
W,H=landscape(A4)
INK=HexColor('#172E36'); GREEN=HexColor('#28574F'); PAPER=HexColor('#F5F3EC')
MINT=HexColor('#DDE8DF'); CORAL=HexColor('#DA6049'); LILAC=HexColor('#E8E3F2')
BLUE=HexColor('#405ACB'); MUTED=HexColor('#64736F'); RULE=HexColor('#C8D0C9')
WHITE=HexColor('#FFFFFF'); PALE=HexColor('#EDF1F3'); BLACK=HexColor('#131C21')

for name,file,index in [('JP','YuGothR.ttc',0),('JPB','YuGothB.ttc',0),('JPL','YuGothL.ttc',0),('EN','arial.ttf',0),('ENB','arialbd.ttf',0),('COND','ARIALN.TTF',0),('SERIF','georgia.ttf',0),('ITALIC','georgiai.ttf',0)]:
    pdfmetrics.registerFont(TTFont(name,'C:/Windows/Fonts/'+file,subfontIndex=index))

c=canvas.Canvas(str(OUT),pagesize=(W,H),pageCompression=1,initialFontName='EN',initialFontSize=10)
c.setTitle('DX Solutions | 製造AIを、現場の力に。 | Osaka 2026')
c.setAuthor('DX Solutions')
c.setSubject('M.O.D.E. / A.V.I.S. | Manufacturing AI brochure | 日本語版・A4横')
c.setCreator('DX Solutions editorial brochure')
c.setViewerPreference('PrintScaling','None')
records=[]; page=0; image_records=[]

def box(x,y,w,h,fill=None,stroke=None,lw=.6):
    c.setLineWidth(lw)
    if fill:c.setFillColor(fill)
    if stroke:c.setStrokeColor(stroke)
    c.rect(x,H-y-h,w,h,fill=bool(fill),stroke=bool(stroke))

def line(x1,y1,x2,y2,col=RULE,lw=.6,dash=None):
    c.saveState();c.setStrokeColor(col);c.setLineWidth(lw)
    if dash:c.setDash(dash)
    c.line(x1,H-y1,x2,H-y2);c.restoreState()

def circle(x,y,r,fill=None,stroke=None,lw=.6):
    if fill:c.setFillColor(fill)
    if stroke:c.setStrokeColor(stroke)
    c.setLineWidth(lw);c.circle(x,H-y,r,fill=bool(fill),stroke=bool(stroke))

def text(s,x,y,size=11,font='JP',col=INK,spacing=0,align='left'):
    s=str(s);width=pdfmetrics.stringWidth(s,font,size)+max(0,len(s)-1)*spacing
    if align=='right':x-=width
    if align=='center':x-=width/2
    assert x>=-1 and x+width<=W+1,(page,s,x,width)
    assert y>=-1 and y+size<=H+1,(page,s,y)
    ob=c.beginText();ob.setTextOrigin(x,H-y-pdfmetrics.getAscent(font)*size/1000)
    ob.setFont(font,size);ob.setFillColor(col);ob.setCharSpace(spacing);ob.textOut(s);c.drawText(ob)
    records.append({'page':page,'text':s,'box':[x,y,x+width,y+size]})
    return width

def para(s,x,y,w,size=10.3,col=INK,font='JP',leading=None):
    leading=leading or size*1.65
    st=ParagraphStyle('p',fontName=font,fontSize=size,leading=leading,textColor=col,wordWrap='CJK',splitLongWords=0,spaceAfter=0,allowWidows=0,allowOrphans=0)
    p=Paragraph(s,st);pw,ph=p.wrap(w,1000)
    assert y+ph<H-8,(page,s,y,ph)
    p.drawOn(c,x,H-y-ph)
    records.append({'page':page,'text':re.sub('<[^>]+>','',s),'box':[x,y,x+w,y+ph]})
    return ph

def label(s,x,y,col=GREEN,size=8):text(s,x,y,size,'ENB',col,1.1)

def heading(lines,x=38,y=82,size=29,col=INK,font='JPB',leading=1.37):
    for i,s in enumerate(lines.split('\n')):text(s,x,y+i*size*leading,size,font,col)

def arrow(x1,y1,x2,y2,col=GREEN,lw=.85):
    line(x1,y1,x2,y2,col,lw)
    a=math.atan2(y2-y1,x2-x1);d=5
    for b in [a+2.6,a-2.6]:line(x2,y2,x2+d*math.cos(b),y2+d*math.sin(b),col,lw)

def plus(x,y,s=5,col=GREEN):line(x-s,y,x+s,y,col,.7);line(x,y-s,x,y+s,col,.7)

def motif(x,y,w,h,col=RULE,step=30):
    for xx in range(int(x),int(x+w)+1,step):line(xx,y,xx,y+h,col,.35)
    for yy in range(int(y),int(y+h)+1,step):line(x,yy,x+w,yy,col,.35)
    for i in range(3):plus(x+w*.22+i*w*.27,y+h*.5,3,GREEN)

def photo(path,x,y,w,h,fit='cover',ax=.5,ay=.5,crop=None,border=False):
    path=Path(path); im=Image.open(path)
    if crop:
        crop=(crop[0],crop[1],min(crop[2],im.width),min(crop[3],im.height))
        im=im.crop(crop)
    if im.mode not in ('RGB','RGBA'):im=im.convert('RGB')
    iw,ih=im.size; scale=min(w/iw,h/ih) if fit=='contain' else max(w/iw,h/ih)
    dw,dh=iw*scale,ih*scale;px=x+(w-dw)*ax;py=y+(h-dh)*ay
    c.saveState();p=c.beginPath();p.rect(x,H-y-h,w,h);c.clipPath(p,stroke=0,fill=0)
    if im.mode=='RGB' and not path.name.startswith('ui-'):
        payload=io.BytesIO();im.save(payload,format='JPEG',quality=96,subsampling=0,optimize=True);payload.seek(0)
        reader=ImageReader(payload)
    else:reader=ImageReader(im)
    c.drawImage(reader,px,H-py-dh,dw,dh,mask='auto');c.restoreState()
    if border:box(x,y,w,h,stroke=RULE)
    image_records.append({'page':page,'file':str(path),'ppi':round(72/scale,1),'box':[x,y,w,h]})

def cap(s,x,y,w=600,col=MUTED):para(s,x,y,w,7.4,col,leading=11)

def footer(section,col=MUTED):
    line(38,560,W-38,560,RULE,.55)
    text('DX SOLUTIONS',38,572,7.1,'ENB',col,1.1)
    text(section,250,572,7.2,'EN',col,.7)
    text(f'{page:02d}',W-38,570,10,'EN',col,align='right')

def new(section,bg=PAPER,foot=True):
    global page
    if page:c.showPage()
    page+=1;box(0,0,W,H,bg)
    c.bookmarkPage(f'p{page}');c.addOutlineEntry(section,f'p{page}',level=0,closed=False)
    if foot:
        label(f'{page:02d}  /  {section}',38,29)
        text('MANUFACTURING INTELLIGENCE / OSAKA 2026',W-38,30,7.1,'EN',MUTED,.8,align='right')
        footer(section)

def number(n,x,y,col=CORAL,r=11):circle(x,y,r,col);text(n,x,y-5,9,'ENB',WHITE,align='center')

def tag(s,x,y,w,fill=MINT,col=GREEN):
    box(x,y,w,23,fill,stroke=RULE);text(s,x+w/2,y+6,8.2,'JPB',col,align='center')

def note_pair(n,title,copy,x,y,w=225):
    label(n,x,y,CORAL,8);text(title,x+27,y-2,12,'JPB');para(copy,x+27,y+23,w-27,9.6)

def screen(p,x,y,w,h):
    box(x-4,y-4,w+8,h+8,WHITE,RULE,.6);photo(p,x,y,w,h,'contain')

def qr(url,x,y,size,col=INK):
    q=qrcode.QRCode(version=None,error_correction=qrcode.constants.ERROR_CORRECT_M,box_size=1,border=4);q.add_data(url);q.make(fit=True)
    mat=q.get_matrix();unit=size/len(mat);box(x,y,size,size,WHITE)
    for ry,row in enumerate(mat):
        for rx,v in enumerate(row):
            if v:box(x+rx*unit,y+ry*unit,unit+.02,unit+.02,col)
    c.linkURL(url,(x,H-y-size,x+size,H-y),relative=0,thickness=0)

# 01 / Cover. A quiet typographic panel and an image-led field composition.
new('製造AIを、現場の力に。',foot=False)
photo(ROOT/'output/imagegen/dxs-brochure-factory-cover.png',354,0,W-354,H,ax=.5)
box(354,0,W-354,H,fill=None)
box(382,34,187,48,PAPER)
photo(MEDIA/'brand/logo.png',396,45,160,24,'contain')
label('DX SOLUTIONS / FIELD NOTES',38,37)
line(38,63,314,63,GREEN)
text('製造AIを、',36,120,40,'JPB')
text('現場の力に。',36,182,40,'JPB')
para('見える。つながる。動き出す。',39,265,290,12.5,GREEN,font='JPB')
para('工場のデータと、人の判断をつなぐ。<br/>製造とオフィスの意思決定に、<br/>現場で働くAIを。',39,309,273,11.2)
text('M.O.D.E.',39,414,22,'EN',INK)
text('A.V.I.S.',39,447,22,'EN',INK)
line(39,493,315,493,GREEN)
text('2026',37,512,40,'COND',GREEN)
label('OSAKA',181,526,GREEN,9)
text('製造AI ソリューションガイド',182,546,7.6,'JP',MUTED)
box(382,493,416,83,GREEN)
text('MANUFACTURING AI,',400,505,14,'EN',WHITE,.9)
text('IN OPERATION.',400,526,14,'EN',WHITE,.9)
cap('製造現場のコンセプトビジュアル（AI生成）',400,558,390,col=MINT)

# 02 / Positioning and contents.
new('FIELD FIRST')
heading('その「いま」を、\n次の一手へ。',38,89,33)
para('設備が動く。資材が届く。人が判断する。<br/>製造の価値は、現場の一つひとつの動きから生まれます。',40,207,323,11)
para('DX Solutionsは、映像・設備信号・業務データを結び、<br/>状況の把握から対応までを一つの流れに。<br/>未来の技術を、今日の工場で使えるかたちにします。',40,272,322,10.5)
photo(TMP/'avis-defect-traceback-15.jpg',400,85,403,182,crop=(0,0,960,408),ax=.5)
photo(TMP/'aivideo-15.jpg',400,279,196,120,crop=(0,42,1280,700))
photo(MEDIA/'avis/manual-review.webp',607,279,196,120)
cap('現場デモ映像・会社紹介資料から構成',401,410,390)
for x,n,t in [(40,'28','掲載AIプロジェクト'),(158,'04','連携するAI領域'),(276,'02','中核ソリューション')]:
    text(n,x,379,40,'COND',GREEN);text(t,x,429,8.5,'JP',MUTED)
line(40,465,803,465)
for x,pg,name in [(40,'03','つながる仕組み'),(235,'04-09','M.O.D.E.'),(430,'10-12','A.V.I.S.'),(625,'13-16','現場・実績・ご相談')]:
    label(pg,x,483,CORAL,9);text(name,x,510,12,'JPB')
cap('実績件数は会社紹介資料の掲載内容に基づきます。',40,543,740)

# 03 / Editorial, vector solution map.
new('THE CONNECTED FACTORY')
heading('工場とオフィスを、一つの判断へ。',38,77,28)
para('データを集める基盤と、現場で使うエージェント。二つの役割が、製造の意思決定を支えます。',39,126,745,10.8)
for i,(en,jp) in enumerate([('VISION','カメラ・画像'),('SIGNALS','設備・センサー'),('BUSINESS','ERP・MES・SCM'),('PEOPLE','音声・現場作業')]):
    x=39+i*194
    label(en,x,183,GREEN,8);text(jp,x,204,12,'JPB');plus(x+152,207,5)
    line(x,235,x+165,235,GREEN,.9);arrow(x+82,236,x+82,273)
box(39,276,350,163,MINT);box(452,276,351,163,LILAC)
label('01 / DECISION ENGINE',56,294)
text('M.O.D.E.',55,321,39,'EN',INK)
para('資材・生産・設備・出荷を俯瞰。<br/>データを統合し、状況と変化を捉える。',57,383,314,11)
label('02 / FIELD AGENT',469,294,BLUE)
text('A.V.I.S.',468,321,39,'EN',INK)
para('声と映像で、必要な情報へ。<br/>認識・点検・対応・記録を支援する。',470,383,314,11)
arrow(394,349,447,349,GREEN,1.1);arrow(447,372,394,372,BLUE,1.1)
text('連携',420,322,9,'JPB',MUTED,align='center')
for x,s in [(57,'把握する'),(256,'理解する'),(470,'対応する'),(673,'残す')]:
    circle(x+10,486,10,None,GREEN);text(s,x+33,479,13,'JPB',GREEN)
line(161,486,249,486);line(360,486,463,486);line(574,486,666,486)
cap('概念構成図。接続するデータ・機能・運用範囲は、対象設備と導入要件により設計します。',39,534,764)

# 04 / Platform overview.
new('M.O.D.E. / OVERVIEW')
text('M.O.D.E.',37,76,55,'EN',GREEN)
text('Manufacturing & Office Decision Engine',40,143,12,'EN',MUTED)
heading('判断のための、共通の景色。',40,181,23)
photo(MEDIA/'poc/poc-1.webp',39,239,515,286,'contain',border=True)
cap('Physical AI PoC / デジタルツインの画面例',39,534,510)
para('工場とオフィスに散らばる情報を、一つの運用レイヤーへ。専門AIと業務システムを結び、エージェントによる対応につなげます。',583,83,219,10.7)
layers=[('04','AI AGENT','判断・ガイダンス・実行',GREEN,WHITE),('03','INTELLIGENCE','資材・生産・設備・品質のAI',MINT,INK),('02','INFRASTRUCTURE','画像・センサー・ERP・MES',LILAC,INK),('01','PLATFORM','工場とオフィスの統合基盤',WHITE,INK)]
for i,(n,en,jp,fill,fg) in enumerate(layers):
    yy=222+i*76;box(582,yy,220,66,fill,stroke=RULE)
    text(n,593,yy+12,14,'COND',fg);label(en,621,yy+13,fg,8)
    text(jp,594,yy+41,9,'JP',fg)

# 05 / Material flow with current Japanese UI.
new('M.O.D.E. / MATERIALS')
label('01 / MATERIAL FLOW',39,81,CORAL)
heading('資材の動きに、\n迷わない。',38,113,30)
para('入庫車両、検収待ち、現場映像。<br/>必要な情報を同じ画面で確認し、<br/>倉庫から工程への受け渡しを支援。',40,217,242,10.7)
photo(TMP/'aivideo-15.jpg',39,310,235,181,crop=(0,34,1280,700),ax=.56)
cap('工場内カメラ映像 / プロジェクト素材',39,501,243)
screen(MEDIA/'platform/materials.webp',306,88,493,275)
cap('資材モニタリング / 会社紹介サイト掲載の画面例',306,373,493)
for i,(title,desc) in enumerate([('入庫を把握','車両の到着と滞在状況を確認'),('検収を確認','資材とカメラ映像を照合'),('履歴へつなぐ','確認結果を次の業務へ共有')]):
    xx=307+i*169;number(str(i+1).zfill(2),xx+10,416);text(title,xx,441,12,'JPB');para(desc,xx,470,144,10)
    if i<2:arrow(xx+31,416,xx+150,416)
cap('画面内の数量・時刻・車両情報は展示用サンプルです。',306,525,494)

# 06 / Vector cycle chart and carefully scoped target.
new('M.O.D.E. / PRODUCTION')
heading('ラインのペースを、読み解く。',38,78,28)
para('計画と実績、工程イベントを重ね、ボトルネックの所在から改善検討へ。',40,126,762,11)
label('CYCLE TIME / ANALYSIS EXAMPLE',40,188)
vals=[8.8,11.2,12.3,15.9,14.3,22.2,13.3,17.8]
names=['投入','締結1','締結2','自動1','組立1','組立2','自動2','組立3']
chart_x=74;base=466;hh=228;cw=477
for val in [0,5,10,15,20,25]:
    yy=base-val/25*hh;line(chart_x,yy,chart_x+cw,yy,RULE,.5);text(str(val),chart_x-12,yy-4,8,'EN',MUTED,align='right')
text('秒',40,226,8,'JP',MUTED)
target=base-13.3/25*hh
line(chart_x,target,chart_x+cw,target,GREEN,1,[3,3]);text('破線：目標 13.3秒',chart_x+cw,211,8.5,'JPB',GREEN,align='right')
for i,(v,n) in enumerate(zip(vals,names)):
    xx=chart_x+12+i*59.5;bh=v/25*hh
    box(xx,base-bh,33,bh,CORAL if v>13.3 else GREEN)
    text(f'{v:.1f}',xx+16.5,base-bh-20,12,'ENB',CORAL if v>13.3 else GREEN,align='center')
    text(n,xx+16.5,base+13,9,'JP',INK,align='center')
box(590,188,212,321,MINT)
photo(TMP/'avis-time-check-40.jpg',604,202,184,106,'cover')
label('IMPROVEMENT TARGET',605,327,GREEN,7.5)
text('3.20',604,354,32,'COND',GREEN);arrow(681,375,705,375);text('4.16',717,354,32,'COND',GREEN)
text('UPPH / 改善目標 +30%',605,401,10,'JPB',GREEN)
para('人時生産性の目標例。<br/>工程ごとの時間を捉え、<br/>作業配分を検討します。',605,432,179,10)
cap('会社紹介サイト掲載の分析例を再作図。数値は導入効果を保証するものではなく、+30%は目標値です。',40,529,761)

# 07 / Quality. The Japanese inspection view is the main visual.
new('M.O.D.E. / QUALITY')
heading('見逃したくない差を、見える判断に。',38,77,26)
para('検査位置と画像を対応づけ、正常・不良の判定と検査履歴の確認を支援します。',39,122,761,10.7)
screen(TMP/'ui-quality.png',40,177,760,360)
cap('ガラス隙間検査 / 日本語展示デモ。画像・判定・数量は機能説明用のサンプルです。',40,543,762)

# 08 / Equipment.
new('M.O.D.E. / EQUIPMENT')
heading('設備の状態を、\n現場の配置で捉える。',39,84,28)
para('センサー、点検、工程データを組み合わせ、<br/>異常の把握と設備履歴の参照を支援。<br/>デジタルツインが、設備の位置と状況を結びます。',423,89,373,10.7)
screen(TMP/'ui-equipment.png',40,203,545,260)
cap('3D設備モニタリング / 日本語展示デモ',40,476,545)
for yy,n,title,desc in [(211,'01','全体を見る','設備の配置と状態を俯瞰する。'),(311,'02','対象を絞る','注意が必要な設備を確認する。'),(411,'03','履歴をつなぐ','点検・対応の情報を参照する。')]:
    number(n,620,yy+10);text(title,644,yy+1,13,'JPB');para(desc,609,yy+39,190,10)
cap('異常表示は展示シナリオです。予兆検知・予知保全の対象と評価方法は、実設備のデータで設計します。',40,529,762)

# 09 / Logistics, photographic anchor.
new('M.O.D.E. / SHIPPING')
heading('工場の外まで、つながる流れ。',38,79,28)
photo(MEDIA/'platform/driver.webp',39,155,267,216,ax=.53)
cap('モバイルを活用した物流運用イメージ',39,382,266)
label('MOBILE CONNECTED',39,421,GREEN,8)
para('出荷の進捗を、現場と共有。',39,446,266,11,INK,font='JPB')
screen(MEDIA/'platform/shipping.webp',335,155,463,261)
cap('出荷管理の画面例 / 会社紹介サイト掲載',335,429,463)
para('ドライバーのモバイル端末と画像によるイベント取得で、<br/>出荷・到着・遅延を可視化。専用GPS機器を追加せずに、<br/>配送状況の把握と対応の標準化を支援します。',336,458,460,10.8)
for i,s in enumerate(['出荷','配送中','到着','確認']):
    xx=49+i*66;circle(xx,526,4,GREEN);text(s,xx,505,9,'JP',GREEN,align='center')
    if i<3:arrow(xx+8,526,xx+55,526)

# 10 / Agent chapter opener.
new('A.V.I.S. / FIELD AGENT',foot=False)
box(0,0,355,H,GREEN)
photo(MEDIA/'avis/field-recognition.webp',355,0,W-355,H,ax=.5,ay=.35)
label('02 / FIELD AGENT',38,38,MINT,8)
text('A.V.I.S.',34,96,54,'EN',WHITE)
heading('AIを、\n作業者の\nすぐそばへ。',38,190,33,WHITE,'JPB',1.5)
para('声と映像で、現場の状況を理解する。<br/>必要な答えと対応ガイドを、<br/>作業が行われる、その場所で。',40,382,272,11,WHITE)
line(39,494,315,494,MINT)
text('VOICE / VISION / WEARABLE',39,514,8,'EN',MINT,1.4)
text('DX SOLUTIONS',39,565,8,'ENB',WHITE,1)
text('10',315,562,12,'EN',WHITE,align='right')
box(378,514,425,46,PAPER)
text('現場認識から、対応と記録へ。',393,528,14,'JPB',GREEN)
cap('ウェアラブル活用イメージ / 会社紹介サイト掲載ビジュアル',379,571,426,WHITE)

# 11 / A real inspection demonstration, with process diagram.
new('A.V.I.S. / INSPECTION')
heading('点検は、話すことから。',38,79,30)
para('QRで設備を識別し、音声で点検を開始。作業中の記録を、報告につながる情報へ整えます。',40,128,750,10.8)
photo(TMP/'avis-inspection-40.jpg',40,175,445,264,'contain')
cap('設備点検の現場デモ映像より',40,450,444)
photo(MEDIA/'avis/equipment-lookup.webp',511,175,129,264,'cover',ay=.3)
photo(MEDIA/'avis/history-detail.webp',658,175,144,264,'cover',ay=.35)
cap('設備照会・履歴参照のイメージ',511,450,291)
for i,(title,desc) in enumerate([('識別','設備のQRを読み取る'),('開始','声で点検を呼び出す'),('記録','確認結果を残す'),('報告','レポートを生成する')]):
    xx=40+i*195;number(str(i+1).zfill(2),xx+11,494);text(title,xx+33,486,13,'JPB');text(desc,xx,523,9,'JP',MUTED)
    if i<3:arrow(xx+92,494,xx+168,494)

# 12 / Three visual examples of wearable-assisted work.
new('A.V.I.S. / GUIDANCE')
heading('見て、聞いて、対応を残す。',38,79,29)
para('映像と音声のコンテキストを、原因の確認・是正対応・作業履歴へつなぎます。',40,128,760,10.8)
cards=[('01','認識する','avis-defect-traceback-40.jpg','不良の位置と種類を捉える。<br/>現場の画像を、判断の手掛かりに。'),('02','導く','avis-defect-traceback-65.jpg','想定原因と対応手順を確認。<br/>作業者の判断をエージェントが支援。'),('03','記録する','avis-idle-time-65.jpg','実施内容を履歴として保存。<br/>次の点検と振り返りに活用。')]
for i,(n,title,p,copy) in enumerate(cards):
    xx=39+i*260
    photo(TMP/p,xx,185,243,137,'contain')
    label(n+' / FIELD WORKFLOW',xx,344,CORAL,8)
    text(title,xx,376,21,'JPB');para(copy,xx,420,240,10.4)
    line(xx,480,xx+243,480)
    tag(['画像認識','対応ガイド','作業履歴'][i],xx,495,116)
cap('会社紹介サイトの現場デモ映像より。ウェアラブル表示と対応ガイドを含む説明用シーンです。',39,532,763)

# 13 / PoC visual gallery, fully intentional unequal image sizes.
new('PHYSICAL AI / IN THE FIELD')
heading('現場を知るAIは、現場から。',38,78,29)
para('デジタルツイン、画像認識、業務ダッシュボードを組み合わせ、出来事の把握から対応へ。',40,126,760,10.8)
photo(MEDIA/'poc/poc-2.webp',39,178,445,222,'contain')
cap('01 / カメラ映像から作業・設備の状態を確認',39,409,444)
photo(MEDIA/'poc/poc-3.webp',507,178,295,145,'contain')
cap('02 / 資材と工程の状況を俯瞰',507,332,295)
photo(MEDIA/'poc/poc-5.webp',507,367,295,146,'contain')
cap('03 / 複数の視点を一つの運用画面へ',507,522,295)
label('FROM RECOGNITION TO ACTION',40,453,GREEN,8)
para('現場ごとに異なる動きと制約を理解すること。<br/>その積み重ねが、使い続けられる製造AIを育てます。',40,478,434,11)
cap('Physical AI PoCの画面例 / 会社紹介サイト掲載資料',39,540,763)

# 14 / Company evidence, not performance promises.
new('EXPERIENCE / COMPANY')
heading('積み重ねてきた、製造AIの実践。',38,78,28)
text('28',37,144,80,'COND',GREEN)
text('AIプロジェクト掲載実績',145,177,13,'JPB',GREEN)
text('2022-2026 / 会社紹介資料より',146,205,9,'JP',MUTED)
para('予知保全、工程最適化、画像検査から、<br/>フィジカルAI、ロボティクス、業務支援まで。',422,160,377,11)
timeline=[('2021','ルールベースAI'),('2022','機械学習'),('2023','生成AI'),('2024','フィジカルAI'),('2025','AIエージェント'),('2026','製造AIの展開')]
line(50,286,787,286,GREEN,.9)
for i,(year,tit) in enumerate(timeline):
    xx=49+i*142;circle(xx,286,4,GREEN);text(year,xx-11,251,15,'COND',GREEN);text(tit,xx-9,303,9,'JPB',INK)
for x,p,year,title in [(39,'vision-command.webp','2024','Doosan Enerbility\nベストプラクティス選定'),(299,'committee.webp','2025','慶尚南道\nAI委員会への参画'),(559,'future-award.webp','2026','K-Digital Innovation\n大賞受賞')]:
    photo(MEDIA/'achievements'/p,x,355,244,128,'cover')
    label(year,x,495,CORAL,8)
    para(title.replace('\n','<br/>'),x+42,492,204,9.4)
cap('実績・年次・表彰名称は会社紹介サイトの記載に基づきます。個別案件の内容はお問い合わせください。',39,540,763)

# 15 / Practical conversation guide.
new('START WITH ONE CHALLENGE')
heading('まず、一つの現場課題から。',38,78,29)
para('課題、データ、業務の流れを確認し、必要な範囲から検討を始めます。',40,126,760,11)
photo(TMP/'avis-inspection-15.jpg',39,179,319,250,crop=(230,70,935,596),ax=.88)
cap('設備識別から始まる現場点検 / デモ映像',39,441,319)
label('FIELD-DRIVEN IMPLEMENTATION',39,477,GREEN,8)
para('現場の制約を知り、使い続けられる運用へ。',39,499,319,11)
rows=[('01','課題を共有','設備停止、検収、品質、作業時間。<br/>現場で確かめたいことを整理します。'),('02','データを確認','映像、センサー、MES、点検履歴。<br/>使える情報と接続条件を確認します。'),('03','小さく検証','対象工程と評価指標を決め、<br/>PoCで運用上の有効性を確かめます。'),('04','運用へつなぐ','現場の手順と役割に合わせ、<br/>継続利用と展開の方法を検討します。')]
for i,(n,title,copy) in enumerate(rows):
    yy=181+i*84;number(n,398,yy+12);text(title,423,yy+1,14,'JPB');para(copy,564,yy,235,9.8)
    if i<3:line(386,yy+66,802,yy+66)
cap('導入検討の進め方の一例です。実際の範囲・手順は、対象の課題とシステム構成に応じてご相談します。',39,535,763)

# 16 / Closing and contact. Vector QR codes, clickable links.
new('CONTACT',foot=False)
box(0,0,W,230,GREEN)
motif(571,0,270,230,HexColor('#4F7469'),45)
text('次の製造標準を、',38,51,34,'JPB',WHITE)
text('ともにつくる。',38,107,34,'JPB',WHITE)
label('BUILD THE NEXT MANUFACTURING STANDARD.',40,185,MINT,8.6)
photo(MEDIA/'brand/logo.png',39,263,201,49,'contain')
text('dx_sales@dx-solutions.co.kr',40,339,19,'EN',GREEN)
c.linkURL('mailto:dx_sales@dx-solutions.co.kr',(40,H-365,350,H-335),relative=0,thickness=0)
text('+82 55 601 9300',41,376,15,'EN',INK)
text('www.dx-solutions.co.kr',41,407,11,'EN',MUTED)
c.linkURL('https://www.dx-solutions.co.kr/',(40,H-425,255,H-405),relative=0,thickness=0)
text('本社',41,454,8.5,'JPB',GREEN)
para('韓国 慶尚南道昌原市城山区<br/>仏母山路24番キル19 102号室',41,475,350,8.7)
label('EXPLORE ONLINE',490,277,GREEN,8)
qr('https://2026-dxs-osaka-exhibition-jp-mu.vercel.app/ja',482,306,135)
qr('https://www.dx-solutions.co.kr/',656,306,135)
text('日本語ソリューション・デモ',550,449,9,'JPB',GREEN,align='center')
text('コーポレートサイト',724,449,9,'JPB',GREEN,align='center')
para('製品デモ・画面例・導入実績は、<br/>QRコードからご覧いただけます。',490,479,302,9.5,MUTED)
line(39,528,802,528)
para('資料について：会社紹介サイトおよび展示プロジェクトの掲載資料をもとに構成。写真・映像は現場デモと掲載イメージを含み、画面内の数値はサンプルです。掲載機能の提供範囲は導入要件により異なります。',39,539,763,7.5,MUTED,leading=11)
label('DX SOLUTIONS / OSAKA 2026 / JAPANESE EDITION',40,577,MUTED,6.7)
text('16',802,574,10,'EN',MUTED,align='right')

c.save()

# Preserve an A4 MediaBox and explicit trim area; do not advertise PDF/X or add fake bleed.
r=PdfReader(OUT);wr=PdfWriter();wr.clone_document_from_reader(r)
wr._root_object.update({NameObject('/Lang'):TextStringObject('ja-JP')})
for p in wr.pages:p.trimbox=RectangleObject([0,0,W,H])
with open(OUT,'wb') as f:wr.write(f)
(TMP/'layout-records.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf8')
(TMP/'image-records.json').write_text(json.dumps(image_records,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'pdf':str(OUT),'pages':page,'text_items':len(records),'images':len(image_records),'bytes':OUT.stat().st_size},ensure_ascii=False))
