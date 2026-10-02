"""Re-design the original sixteen-page brochure, preserving its narrative and assets.
The company reference informs colour, type weight, light surfaces, and spacing only.
Factory replacement belongs to original page 5; page 9 keeps the equipment layout.
"""
from pathlib import Path
import io, json, math, re
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

HERE=Path(__file__).resolve().parent; ROOT=HERE.parents[2]
A=HERE/'assets'; M=A/'company'; WORK=ROOT/'tmp/pdfs/refined-v4'
OUT=ROOT/'output/pdf/DX_Solutions_2026_Osaka_Brochure_JA_A4_Landscape_v4.pdf'
W,H=landscape(A4); RIGHT=W-36
V=HexColor('#4D559B'); INK=HexColor('#252B42'); GRAY=HexColor('#697188')
SOFT=HexColor('#E7EBF5'); PALE=HexColor('#F3F5FA'); LAV=HexColor('#C9CCE6')
BLUE=HexColor('#677FAE'); LINE=HexColor('#CBD2E3'); WHITE=HexColor('#FFFFFF')
for n,f in [('JP','YuGothR.ttc'),('JPB','YuGothB.ttc'),('EN','arial.ttf'),('ENB','arialbd.ttf')]:
    pdfmetrics.registerFont(TTFont(n,'C:/Windows/Fonts/'+f,subfontIndex=0))
c=canvas.Canvas(str(OUT),pagesize=(W,H),pageCompression=1,initialFontName='EN')
c.setTitle('DX Solutions | 現場から、未来を動かす。 | Osaka 2026')
c.setAuthor('DX Solutions');c.setSubject('M.O.D.E. & A.V.I.S. / 日本語 / A4横 / 16-page corporate edition')
c.setViewerPreference('PrintScaling','None')
page=0; records=[];images=[];page_manifest=[]

def box(x,y,w,h,fill,stroke=None,r=0,lw=.65):
    c.setFillColor(fill);c.setLineWidth(lw)
    if stroke:c.setStrokeColor(stroke)
    if r:c.roundRect(x,H-y-h,w,h,r,fill=1,stroke=bool(stroke))
    else:c.rect(x,H-y-h,w,h,fill=1,stroke=bool(stroke))

def line(x,y,u,v,color=LINE,lw=.65,dash=None):
    c.saveState();c.setStrokeColor(color);c.setLineWidth(lw)
    if dash:c.setDash(dash)
    c.line(x,H-y,u,H-v);c.restoreState()

def circle(x,y,r,fill,stroke=None,lw=.65):
    c.setFillColor(fill);c.setLineWidth(lw)
    if stroke:c.setStrokeColor(stroke)
    c.circle(x,H-y,r,fill=1,stroke=bool(stroke))

def text(s,x,y,size=11,font='JP',color=INK,align='left',track=0,record=True):
    s=str(s);width=pdfmetrics.stringWidth(s,font,size)+max(0,len(s)-1)*track
    if align=='center':x-=width/2
    elif align=='right':x-=width
    assert 0<=x and x+width<=W+.1,(page,s,x,width)
    assert 0<=y and y+size<=H,(page,s,y,size)
    t=c.beginText();t.setTextOrigin(x,H-y-pdfmetrics.getAscent(font)*size/1000)
    t.setFont(font,size);t.setFillColor(color);t.setCharSpace(track);t.textOut(s);c.drawText(t)
    if record:records.append({'page':page,'text':s,'box':[x,y,x+width,y+size]})
    return width

def para(s,x,y,w,size=10.5,font='JP',color=INK,leading=None,align=0):
    st=ParagraphStyle('body',fontName=font,fontSize=size,leading=leading or size*1.65,textColor=color,wordWrap='CJK',splitLongWords=0,alignment=align)
    p=Paragraph(s,st);_,hh=p.wrap(w,1000);p.drawOn(c,x,H-y-hh)
    assert y+hh<H-8,(page,s,y,hh)
    records.append({'page':page,'text':re.sub('<[^>]+>','',s),'box':[x,y,x+w,y+hh]})
    return hh

def label(s,x,y,size=8,color=V):return text(s,x,y,size,'ENB',color,track=.8)
def cap(s,x,y,w=770):return para(s,x,y,w,7.5,color=GRAY,leading=11)
def title(s,x=36,y=72,size=31,color=V):
    for i,t in enumerate(s.split('\n')):text(t,x,y+i*size*1.32,size,'JPB',color)

def image(path,x,y,w,h,fit='cover',crop=None,r=8,ax=.5,ay=.5):
    path=Path(path);im=Image.open(path)
    if crop:im=im.crop(crop)
    iw,ih=im.size;scale=min(w/iw,h/ih) if fit=='contain' else max(w/iw,h/ih)
    dw,dh=iw*scale,ih*scale;dx=x+(w-dw)*ax;dy=y+(h-dh)*ay
    ppi=72/scale
    lim=(round(dw*400/72),round(dh*400/72))
    if im.width>lim[0] or im.height>lim[1]:im.thumbnail(lim,Image.Resampling.LANCZOS)
    c.saveState();p=c.beginPath()
    if r:p.roundRect(x,H-y-h,w,h,r)
    else:p.rect(x,H-y-h,w,h)
    c.clipPath(p,stroke=0,fill=0)
    if im.mode in ('RGBA','LA') or path.suffix.lower()=='.png':reader=ImageReader(im)
    else:
        stream=io.BytesIO();im.convert('RGB').save(stream,'JPEG',quality=96,subsampling=0);stream.seek(0);reader=ImageReader(stream)
    c.drawImage(reader,dx,H-dy-dh,dw,dh,mask='auto');c.restoreState()
    images.append({'page':page,'asset':str(path.relative_to(HERE)),'ppi':round(min(ppi,400),1),'box':[x,y,x+w,y+h]})

def arrow(x,y,u,v,color=V,lw=.9):
    line(x,y,u,v,color,lw);a=math.atan2(v-y,u-x)
    for d in (-2.6,2.6):line(u,v,u+5*math.cos(a+d),v+5*math.sin(a+d),color,lw)

def badge(n,x,y,large=False):
    r=18 if large else 13;circle(x,y,r,SOFT)
    text(n,x,y-(7 if large else 5),15 if large else 10,'ENB',V,align='center')

def chip(s,x,y,w):
    box(x,y,w,25,SOFT,r=12);text(s,x+w/2,y+6,8.5,'JPB',V,align='center')

def footer(section):
    line(36,559,RIGHT,559,LINE,.55)
    label('DX SOLUTIONS',36,572,6.8,GRAY)
    text(section,221,571,7.3,'JP',GRAY)
    text(f'{page:02}',RIGHT,568,12,'ENB',V,align='right')

def new(section,headline='',bg=WHITE,chapter=''):
    global page
    if page:c.showPage()
    page+=1;box(0,0,W,H,bg);c.bookmarkPage(f'p{page}');c.addOutlineEntry(section,f'p{page}',0)
    page_manifest.append({'page':page,'section':section,'original_v2_page':page})
    label(chapter or 'DX SOLUTIONS  /  OSAKA 2026',36,27,7.2,V)
    text('製造AIソリューション',RIGHT,26,7.7,'JP',GRAY,align='right')
    if headline:title(headline)
    footer(section)

def qr(url,x,y,size):
    q=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M,box_size=1,border=4);q.add_data(url);q.make(fit=True)
    data=q.get_matrix();unit=size/len(data);box(x,y,size,size,WHITE)
    for yy,row in enumerate(data):
        for xx,value in enumerate(row):
            if value:box(x+xx*unit,y+yy*unit,unit+.01,unit+.01,V)
    c.linkURL(url,(x,H-y-size,x+size,H-y),relative=0,thickness=0)

def glyph(kind,x,y,size=36):
    # Simple original line diagrams, not the reference's illustrated icon family.
    col=V;sw=1.25
    if kind=='camera':
        box(x+3,y+9,size-6,size*.51,WHITE,col,r=4,lw=sw);circle(x+size/2,y+size*.51,size*.12,WHITE,col,sw)
        box(x+9,y+5,10,5,col,r=2)
    elif kind=='database':
        for v in (0,8,16):box(x+5,y+5+v,size-10,8,WHITE,col,r=4,lw=sw)
    elif kind=='sensor':
        circle(x+18,y+18,11,WHITE,col,sw);circle(x+18,y+18,4,col)
        for a in (0,90,180,270):
            rad=math.radians(a);line(x+18+12*math.cos(rad),y+18+12*math.sin(rad),x+18+17*math.cos(rad),y+18+17*math.sin(rad),col,sw)
    elif kind=='voice':
        for i,h in enumerate((9,20,29,17,8)):line(x+6+i*6,y+18-h/2,x+6+i*6,y+18+h/2,col,2)
    elif kind=='screen':
        box(x+2,y+4,size-4,24,WHITE,col,r=3,lw=sw);line(x+18,y+28,x+18,y+34,col,sw);line(x+10,y+34,x+26,y+34,col,sw)
        line(x+7,y+22,x+13,y+15,col,sw);line(x+13,y+15,x+20,y+18,col,sw);line(x+20,y+18,x+28,y+10,col,sw)

# 01 / Original sixteen-page opening, with documentary photography.
new('現場から、未来を動かす。',bg=PALE)
box(0,51,383,498,WHITE)
image(M/'brand/logo.png',36,72,169,41,'contain',r=0)
label('MANUFACTURING, IN MOTION',36,143,8.2)
title('現場から、\n未来を動かす。',36,188,34)
para('工場のデータと、人の判断をつなぐ。<br/>現場の「見える」を、次の「動ける」へ。',38,299,304,12,leading=21)
line(38,369,326,369,LINE,.8)
text('M.O.D.E.',38,390,22,'ENB',V)
text('A.V.I.S.',210,390,22,'ENB',V)
text('製造の意思決定基盤',38,425,9.3,'JP',GRAY)
text('現場のAIアシスタント',210,425,9.3,'JP',GRAY)
para('製造AI・業務自動化・現場支援を、<br/>一つの運用へ。',38,484,300,10.2,color=GRAY,leading=16)
image(A/'onsite-wearable.png',407,72,399,441,crop=(0,0,1050,1080),r=14)
cap('実際の現場デモ / 作業者と設備をつなぐ',408,528,395)

# 02 / Company photography keeps the full-page emphasis from v2.
new('会社活動・受賞','現場で築く信頼。',chapter='COMPANY  /  RECOGNITION')
para('導入の現場、技術交流、受賞。人と企業のつながりから、製造AIの実装を進めます。',36,120,768,10.5,color=GRAY)
for path,x,tag,copy in [(A/'award-innovation.png',36,'AWARD','K-Digital Innovation受賞の記録'),(A/'award-mayor.png',431,'2026','昌原未来産業戦略シンポジウム')]:
    image(path,x,160,375,194,r=8,ay=.12)
    label(tag,x,367,7.4);text(copy,x+64,362,11,'JPB',INK)
acts=[(M/'achievements/manufacturing-program.webp','製造AI事業','プロジェクト活動'),(A/'company-committee.png','慶尚南道','AI委員会への参画'),(A/'company-vision.png','AX Vision Command','視察・技術交流'),(M/'achievements/partnership.webp','企業パートナーシップ','ネットワーキング')]
for i,(path,t1,t2) in enumerate(acts):
    xx=36+i*197.5;image(path,xx,407,177.5,98,r=6)
    text(t1,xx,516,8.6,'JPB',V);text(t2,xx,531,8,'JP',GRAY)

# 03 / Preserve the selected six documents and the original published count.
new('特許・認証','技術を支える、確かな蓄積。',chapter='COMPANY  /  PATENTS & CERTIFICATIONS')
para('製造AIの研究開発と、継続的な提供体制。会社紹介資料に掲載された特許・認証から。',36,120,770,10.5,color=GRAY)
box(36,167,178,371,SOFT,r=12)
text('10',58,190,83,'ENB',V)
text('特許・認証 掲載',58,290,14,'JPB',V)
para('掲載された10件から、<br/>技術と提供体制を支える<br/>6件の文書を紹介します。',58,339,136,10.3,leading=18)
line(58,422,191,422,WHITE,1)
para('独自技術の蓄積<br/>品質・環境の管理<br/>研究開発の体制',58,446,138,10,'JPB',V,leading=24)
certs=[('certificate-1.webp','特許 / 製造AI'),('certificate-2.webp','特許 / 製造AI'),('certificate-7.webp','AIファクトリー専門企業'),('certificate-8.webp','品質マネジメント'),('certificate-9.webp','環境マネジメント'),('certificate-10.webp','企業研究所')]
for i,(name,caption) in enumerate(certs):
    xx=242+(i%3)*190;yy=163+(i//3)*197
    image(M/'patents'/name,xx+20,yy,128,168,'contain',r=0)
    cap(caption,xx,yy+176,170)

# 04 / A new product relationship diagram, keeping v2's message.
new('二つの製造AIプラットフォーム','「見える」から、「動ける」へ。',bg=PALE,chapter='VISION  /  TWO CONNECTED IDEAS')
para('設備が動く。資材が届く。人が判断する。現場の出来事と業務データを結び、<br/>状況の把握から対応までを一つの流れにします。',36,124,740,11,leading=19)
for x,name,en,copy,kind in [(36,'M.O.D.E.','DECISION INTELLIGENCE','データを統合し、変化を捉える。<br/>工場とオフィスの意思決定基盤。','screen'),(444,'A.V.I.S.','FIELD INTELLIGENCE','声と映像で、現場の状況を理解。<br/>対応ガイドと記録を、作業のそばへ。','voice')]:
    box(x,209,362,241,WHITE,LINE,r=13)
    glyph(kind,x+24,231,38);label(en,x+80,245,8)
    text(name,x+24,285,36,'ENB',V)
    para(copy,x+25,352,309,12,leading=21)
    line(x+25,416,x+337,416,LINE,.65)
arrow(398,330,440,330,V,1.2)
for i,(kind,copy) in enumerate([('camera','カメラ・映像'),('sensor','設備・センサー'),('database','ERP・MES・SCM'),('voice','音声・現場作業')]):
    xx=43+i*194;glyph(kind,xx,477,34);text(copy,xx+47,489,10,'JPB',V)
cap('概念構成図 / 接続データと機能の範囲は、対象設備と導入要件に応じて設計します。',36,539)

# 05 / Correct replacement: the whole-factory digital twin from original v2 page 5.
new('M.O.D.E. / プラットフォーム','',bg=PALE,chapter='01  /  M.O.D.E.')
text('M.O.D.E.',36,69,49,'ENB',V)
title('判断のための、共通の景色。',332,85,23)
label('MANUFACTURING & OFFICE DECISION ENGINE',38,139,7.7,GRAY)
para('工場とオフィスに散らばる情報を、一つの運用レイヤーへ。<br/>専門AIと業務システムを結び、エージェントによる対応へ。',332,128,472,10.5,leading=18)
image(A/'factory-model-user.png',249,196,557,313,'contain',r=11)
for i,(a,b) in enumerate([('基盤','現場の状態を俯瞰'),('データ接続','設備と業務を接続'),('専門AI','目的に応じて分析'),('エージェント','判断と対応を支援')]):
    yy=211+i*79;badge(f'{i+1:02}',54,yy+16)
    text(a,81,yy+2,13,'JPB',V);text(b,81,yy+30,9.5,'JP',GRAY)
    if i<3:line(54,yy+35,54,yy+63,LINE,1)
cap('Physical AI PoC / 工場全体のデジタルツイン。画面内の異常表示はデモシナリオです。',249,525,557)

# 06 / End-to-end material and shipping content, with a more legible balanced grid.
new('M.O.D.E. / 資材・出荷','流れをつかむ。',chapter='M.O.D.E.  /  MATERIALS & SHIPPING')
para('倉庫から工程へ。工場から届け先へ。資材と配送の動きを、現場映像と業務データでつなぎます。',36,119,770,10.8,color=GRAY)
stages=['受入','検収','工程供給','出荷','到着']
for i,s in enumerate(stages):
    xx=36+i*157;box(xx,165,142,30,SOFT,r=7);text(s,xx+71,173,10,'JPB',V,align='center')
    if i<4:arrow(xx+144,180,xx+153,180,BLUE,.75)
for x,path,n,ttl,body in [(36,M/'platform/materials.webp','01','倉庫から、工程へ。','入庫、検収待ち、資材の動きと現場映像を確認。<br/>工程への受け渡しに必要な情報を共有します。'),(431,M/'platform/shipping.webp','02','工場から、届け先へ。','モバイル位置情報と到着・遅延イベントを連携。<br/>配送状況の把握と対応の標準化を支援します。')]:
    image(path,x,224,375,210,'contain',r=6)
    badge(n,x+13,464);text(ttl,x+39,451,18,'JPB',V)
    para(body,x,493,375,10.2,leading=17)
cap('資材モニタリング・出荷管理の掲載画面例 / 数量・時刻・車両情報は展示用サンプルです。',36,540)

# 07 / Preserve the actual analysis example and distinguish its target from results.
new('M.O.D.E. / 生産分析','ラインのリズムを、読み解く。',chapter='M.O.D.E.  /  PRODUCTION')
para('計画と実績、工程イベントを重ね、ボトルネックの所在から改善検討へ。',36,124,750,11,color=GRAY)
box(36,183,509,334,PALE,r=12);box(565,183,241,334,SOFT,r=12)
label('CYCLE TIME / ANALYSIS EXAMPLE',57,205,7.7)
text('秒',58,245,8,'JP',GRAY)
vals=[8.8,11.2,12.3,15.9,14.3,22.2,13.3,17.8]
names=['投入','締結1','締結2','自動1','組立1','組立2','自動2','組立3']
base=465;ch=175
for v in [0,5,10,15,20,25]:
    yy=base-v/25*ch;line(79,yy,525,yy,LINE,.55);text(v,69,yy-4,7.6,'EN',GRAY,align='right')
target=base-13.3/25*ch
line(79,target,525,target,V,.9,[3,3]);label('TARGET 13.3s',414,260,7.2)
for i,(v,n) in enumerate(zip(vals,names)):
    xx=91+i*55;bh=v/25*ch;col=V if v>13.3 else LAV
    box(xx,base-bh,25,bh,col,r=3);text(f'{v:.1f}',xx+12.5,base-bh-20,11,'ENB',V,align='center');text(n,xx+12.5,485,8.1,'JP',INK,align='center')
label('PRODUCTIVITY / TARGET',587,207,7.4)
text('+30',584,253,65,'ENB',V);text('%',754,273,28,'ENB',V)
text('人時生産性の改善目標',587,341,14,'JPB',V)
box(586,379,198,39,WHITE,r=7);text('UPPH  3.20 → 4.16',685,391,12,'JPB',V,align='center')
para('工程ごとの時間を捉え、<br/>作業配分と改善条件を検討します。',587,449,197,10.2,leading=18)
cap('会社紹介資料の分析例を再作図。+30%は目標値であり、導入効果を保証する数値ではありません。',36,539)

# 08 / Quality story, keeping the original Japanese demo screen and close-up.
new('M.O.D.E. / 品質検査','小さな差を、確かな判断へ。',chapter='M.O.D.E.  /  QUALITY & VISION')
para('画像と検査位置を対応づけ、正常・不良の判定と検査履歴の確認を支援します。',36,124,755,11,color=GRAY)
image(A/'ui-quality.png',36,182,471,313,crop=(563,206,1569,877),r=12)
for i,copy in enumerate(['検査位置を把握','画像と判定を確認','履歴を振り返る']):
    yy=197+i*56;badge(f'{i+1:02}',545,yy+7);text(copy,569,yy-1,13.5,'JPB',V)
    if i<2:line(545,yy+24,545,yy+42,LINE,1)
image(A/'ui-quality.png',531,378,275,130,'contain',r=4)
cap('ガラス隙間検査 / 日本語展示デモの全体画面',531,521,275)
cap('検査画像の拡大 / 画像・判定・数量は機能説明用のサンプルです。',36,514,471)

# 09 / Separate equipment layout. Deliberately retained, not the whole-factory model.
new('M.O.D.E. / 設備モニタリング','配置と状態を、\nひとつの景色に。',chapter='M.O.D.E.  /  EQUIPMENT & DIGITAL TWIN')
para('センサー、点検、工程データを組み合わせ、<br/>設備の位置と状況、過去の対応を結びます。',484,99,322,11.2,leading=20)
box(36,215,564,290,PALE,r=10);image(A/'ui-equipment.png',45,222,546,274,'contain',r=5)
for i,(name,copy) in enumerate([('全体を見る','設備の配置と状態を俯瞰。'),('対象を絞る','注意が必要な設備を確認。'),('履歴をつなぐ','点検と対応の情報を参照。')]):
    yy=226+i*91;badge(f'{i+1:02}',632,yy+12);text(name,656,yy+2,13.8,'JPB',V)
    para(copy,619,yy+41,187,9.8,color=GRAY,leading=16)
cap('3D設備モニタリング / 日本語展示デモ。異常表示は展示シナリオです。',36,521)
cap('予兆検知・予知保全の対象と評価方法は、実設備のデータで設計します。',36,540)

# 10 / AVIS chapter opening uses a documentary two-scale photo composition.
new('A.V.I.S. / 現場支援','',bg=SOFT,chapter='02  /  A.V.I.S.')
text('A.V.I.S.',36,69,51,'ENB',V)
title('現場の、すぐそばへ。',353,82,28)
para('声と映像で、現場の状況を理解する。必要な答えと対応ガイドを、<br/>作業が行われる、その場所で。',353,130,447,10.8,leading=19)
image(A/'onsite-glasses.png',36,206,500,282,crop=(0,0,1944,800),r=12,ax=.12)
image(A/'avis-inspection-15.jpg',556,206,250,167,crop=(160,110,880,596),r=10)
box(556,389,250,99,WHITE,r=10)
glyph('voice',575,409,34);glyph('camera',623,409,34);glyph('database',671,409,34)
text('音声 × 映像 × 業務データ',576,457,11,'JPB',V)
label('AN AGENT BY YOUR SIDE',37,512,8.5)
cap('実際の現場デモ映像から / 音声・映像を活用した作業支援',37,539,765)

# 11 / Keep the inspection sequence and full demonstration frame.
new('A.V.I.S. / 点検','点検は、話すことから。',chapter='A.V.I.S.  /  INSPECTION')
para('設備を識別し、声で確認し、結果を残す。現場の点検を、一つの自然な流れに。',36,124,770,11,color=GRAY)
image(A/'avis-inspection-40.jpg',36,185,493,277,'contain',r=10)
for i,(name,copy) in enumerate([('識別する','QRで設備を読み取る。'),('開始する','音声で点検を呼び出す。'),('記録する','確認結果を残す。'),('報告する','レポートを生成する。')]):
    yy=195+i*76;badge(f'{i+1:02}',571,yy+14,True);text(name,606,yy,17,'JPB',V);text(copy,606,yy+34,9.7,'JP',GRAY)
    if i<3:line(571,yy+36,571,yy+55,LINE,1)
text('作業中の声を、次の判断につながる情報へ。',37,493,17,'JPB',V)
cap('掲載画面は説明用のデモです。記録項目と報告の形式は、現場の運用に合わせて設計します。',36,539)

# 12 / Recognition -> corrective action -> recorded result, same original three scenes.
new('A.V.I.S. / 対応ガイド','見て、聞いて、対応を残す。',chapter='A.V.I.S.  /  GUIDANCE & TRACEABILITY')
para('映像と音声のコンテキストを、原因の確認・是正対応・作業履歴へつなぎます。',36,124,755,11,color=GRAY)
scenes=[('認識する','avis-defect-traceback-40.jpg','不良の位置と種類を捉える。<br/>画像を判断の手掛かりに。'),('導く','avis-defect-traceback-65.jpg','想定原因と対応手順を確認。<br/>作業者の判断を支援。'),('残す','avis-idle-time-65.jpg','対応ガイドと実施内容を確認。<br/>記録を次の振り返りへ。')]
for i,(name,path,copy) in enumerate(scenes):
    xx=36+i*262.5;box(xx,186,245,323,PALE,r=12)
    badge(f'{i+1:02}',xx+28,213);text(name,xx+54,200,19,'JPB',V)
    image(A/path,xx+10,253,225,127,'contain',r=4)
    para(copy,xx+19,415,207,11,leading=20)
    if i<2:arrow(xx+246,341,xx+258,341,V,.9)
cap('会社紹介サイトの現場デモ映像より。ウェアラブル表示と対応ガイドを含む説明用シーンです。',36,539)

# 13 / Physical AI proof gallery preserved from the original narrative.
new('Physical AI / 現場認識','現場を知るAIは、現場から。',chapter='PHYSICAL AI  /  FIELD ATLAS')
para('画像認識、設備の状態、業務ダッシュボード。複数の視点から、出来事を把握し、対応へつなぎます。',36,124,764,10.8,color=GRAY)
image(M/'poc/poc-2.webp',36,198,489,247,'contain',r=8)
image(M/'poc/poc-3.webp',547,198,259,130,'contain',r=6)
image(M/'poc/poc-5.webp',547,384,259,130,'contain',r=6)
label('01',37,462,8);text('作業・設備の状態を確認',67,457,12,'JPB',V)
label('02',548,342,7.5);text('資材・工程の状況',577,337,10,'JPB',V)
label('03',548,525,7.5);text('業務データを現場判断へ',577,520,10,'JPB',V)
para('認識から、行動へ。<br/>現場の文脈を、AIの判断につなぐ。',37,497,488,12,'JPB',V,leading=20)

# 14 / Published project count and six-year technical trajectory retained.
new('会社紹介 / 技術の歩み','',bg=PALE,chapter='COMPANY  /  OUR JOURNEY')
text('28',35,72,109,'ENB',V)
title('AIプロジェクト掲載実績',213,98,24)
para('予知保全、工程最適化、画像検査から、<br/>フィジカルAI、ロボティクス、業務支援まで。',215,151,567,11.5,leading=20)
line(36,238,806,238,LINE,.9)
title('現場で培い、次の製造AIへ。',36,269,25)
para('現場ごとに異なる動きと制約を理解すること。<br/>その積み重ねを、次の製造AIへつなげます。',453,266,353,10.5,leading=19)
timeline=[('2021','ルールベースAI','自動化の基盤をつくる'),('2022','機械学習','状態を捉え、変化を知る'),('2023','生成AI','業務の知識をつなぐ'),('2024','フィジカルAI','実設備・工程へ広げる'),('2025','AIエージェント','文脈を理解し、支援する'),('2026','製造AIの展開','現場の意思決定を支える')]
line(51,402,790,402,LINE,1.2)
for i,(year,name,copy) in enumerate(timeline):
    xx=36+i*130;text(year,xx,358,23,'ENB',V);circle(xx+14,402,5.5,V)
    para(name,xx,433,117,11,'JPB',V,leading=16)
    para(copy,xx,475,113,9.2,color=GRAY,leading=16)
cap('掲載件数と年次は会社紹介資料に基づきます。2022-2026年の掲載プロジェクト / 個別案件はお問い合わせください。',36,539)

# 15 / Original implementation path, with an independent vertical process layout.
new('導入の進め方','まず、一つの\n現場課題から。',chapter='START  /  ONE CHALLENGE')
para('課題、データ、業務の流れを確認し、<br/>必要な範囲から検討を始めます。',36,171,326,11,leading=19)
image(A/'avis-inspection-15.jpg',36,266,322,238,crop=(160,110,880,596),r=12)
cap('設備識別から始まる現場点検 / デモ映像',36,519,322)
steps=[('課題を共有','設備停止、検収、品質、作業時間。<br/>現場で確かめたいことを整理します。'),('データを確認','映像、センサー、MES、点検履歴。<br/>使える情報と接続条件を確認します。'),('小さく検証','対象工程と評価指標を決め、<br/>PoCで運用上の有効性を確かめます。'),('運用へつなぐ','現場の手順と役割に合わせ、<br/>継続利用と展開の方法を検討します。')]
for i,(name,body) in enumerate(steps):
    yy=91+i*108;badge(f'{i+1:02}',428,yy+17,True)
    text(name,468,yy+1,19,'JPB',V);para(body,468,yy+39,338,10.5,leading=18)
    if i<3:line(428,yy+40,428,yy+88,LINE,1)
cap('導入検討の進め方の一例です。実際の範囲・手順は、対象の課題とシステム構成に応じてご相談します。',36,540)

# 16 / Contact closes the original full brochure, with vector QR codes.
new('お問い合わせ','',bg=SOFT,chapter='DX SOLUTIONS  /  CONTACT')
image(M/'brand/logo.png',36,65,163,40,'contain',r=0)
title('次の製造標準を、\nともにつくる。',36,145,37)
para('製造現場の次の一歩を、DX Solutionsと。',466,199,340,13,'JPB',V,leading=21)
line(36,274,806,274,WHITE,1)
text('dx_sales@dx-solutions.co.kr',36,330,19,'ENB',V)
c.linkURL('mailto:dx_sales@dx-solutions.co.kr',(36,H-353,386,H-325),relative=0,thickness=0)
text('+82 55 601 9300',36,377,16,'EN',INK)
text('www.dx-solutions.co.kr',36,414,12,'EN',GRAY)
c.linkURL('https://www.dx-solutions.co.kr/',(36,H-431,270,H-409),relative=0,thickness=0)
qr('https://2026-dxs-osaka-exhibition-jp-mu.vercel.app/ja',487,315,130)
qr('https://www.dx-solutions.co.kr/',668,315,130)
text('日本語ソリューション',552,459,9,'JPB',V,align='center')
text('コーポレートサイト',733,459,9,'JPB',V,align='center')
para('本社 / 韓国 慶尚南道昌原市城山区<br/>仏母山路24番キル19 102号室',36,476,427,9.1,color=GRAY,leading=16)
cap('写真・映像は現場デモと会社掲載資料を使用。画面内の数値はサンプルです。掲載機能の提供範囲は導入要件により異なります。',36,534,767)

c.save()
reader=PdfReader(OUT);writer=PdfWriter();writer.clone_document_from_reader(reader)
writer._root_object[NameObject('/Lang')]=TextStringObject('ja-JP')
for p in writer.pages:p.trimbox=RectangleObject([0,0,W,H])
with open(OUT,'wb') as f:writer.write(f)
for name,data in [('layout-records',records),('image-records',images),('page-manifest',page_manifest)]:
    (WORK/f'{name}.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'file':str(OUT),'pages':page,'images':len(images),'bytes':OUT.stat().st_size},ensure_ascii=True))
