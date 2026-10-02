from pathlib import Path
import io, json, math, re
from PIL import Image, ImageChops
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
from pypdf.generic import NameObject, RectangleObject, TextStringObject

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
A=HERE/'assets'
WORK=ROOT/'tmp/pdfs/company-v3'; WORK.mkdir(parents=True, exist_ok=True)
OUT=ROOT/'output/pdf/DX_Solutions_2026_Company_Brochure_JA_A4_Landscape_v3.pdf'
W,H=landscape(A4)
V=HexColor('#4C559D'); HEAD=HexColor('#494E94'); BG=HexColor('#E5E9F3')
LAV=HexColor('#D5D6EC'); MID=HexColor('#AEB1D4'); INK=HexColor('#25262C')
GRAY=HexColor('#737887'); RULE=HexColor('#B5BCDE'); WHITE=HexColor('#FFFFFF')
BLUE=HexColor('#5B8BC6'); LIGHT=HexColor('#EDF1F9'); MAGENTA=HexColor('#B43C97')
for name,file in [('JP','YuGothR.ttc'),('JPB','YuGothB.ttc'),('EN','arial.ttf'),('ENB','arialbd.ttf')]:
    pdfmetrics.registerFont(TTFont(name,'C:/Windows/Fonts/'+file,subfontIndex=0))
c=canvas.Canvas(str(OUT),pagesize=(W,H),pageCompression=1,initialFontName='EN')
c.setTitle('DX Solutions | AI Digital Transformation | Company Brochure 2026')
c.setAuthor('DX Solutions'); c.setSubject('日本語・A4横 / M.O.D.E.・AVIS / 会社案内')
c.setViewerPreference('PrintScaling','None')
page=0; records=[]; images=[]

def rect(x,y,w,h,fill,stroke=None,r=0,lw=.6):
    c.setFillColor(fill); c.setLineWidth(lw)
    if stroke:c.setStrokeColor(stroke)
    if r:c.roundRect(x,H-y-h,w,h,r,fill=1,stroke=bool(stroke))
    else:c.rect(x,H-y-h,w,h,fill=1,stroke=bool(stroke))

def line(x,y,u,v,color=RULE,lw=.6):
    c.setStrokeColor(color);c.setLineWidth(lw);c.line(x,H-y,u,H-v)

def circle(x,y,r,fill,stroke=None,lw=.6):
    c.setFillColor(fill);c.setLineWidth(lw)
    if stroke:c.setStrokeColor(stroke)
    c.circle(x,H-y,r,fill=1,stroke=bool(stroke))

def poly(points,fill,stroke=None,lw=.6):
    p=c.beginPath();p.moveTo(points[0][0],H-points[0][1])
    for x,y in points[1:]:p.lineTo(x,H-y)
    p.close();c.setFillColor(fill);c.setLineWidth(lw)
    if stroke:c.setStrokeColor(stroke)
    c.drawPath(p,fill=1,stroke=bool(stroke))

def text(s,x,y,size=11,font='JP',color=INK,align='left',track=0,record=True):
    s=str(s);width=pdfmetrics.stringWidth(s,font,size)+(len(s)-1)*track
    if align=='center':x-=width/2
    if align=='right':x-=width
    assert x>=-1 and x+width<W+1,(page,s,x,width)
    t=c.beginText();t.setTextOrigin(x,H-y-pdfmetrics.getAscent(font)*size/1000)
    t.setFont(font,size);t.setFillColor(color);t.setCharSpace(track);t.textOut(s);c.drawText(t)
    if record:records.append({'page':page,'text':s,'box':[x,y,x+width,y+size]})
    return width

def para(s,x,y,w,size=10,font='JP',color=INK,leading=None,align=0):
    st=ParagraphStyle('p',fontName=font,fontSize=size,leading=leading or size*1.6,textColor=color,wordWrap='CJK',splitLongWords=0,alignment=align)
    p=Paragraph(s,st);_,ph=p.wrap(w,900);p.drawOn(c,x,H-y-ph)
    assert y+ph<H-8,(page,s,y,ph)
    records.append({'page':page,'text':re.sub('<[^>]+>','',s),'box':[x,y,x+w,y+ph]})
    return ph

def picture(path,x,y,w,h,fit='cover',radius=0,round_photo=False,shade=0,crop=None):
    im=Image.open(path)
    if crop:im=im.crop(crop)
    iw,ih=im.size;scale=min(w/iw,h/ih) if fit=='contain' else max(w/iw,h/ih)
    dw,dh=iw*scale,ih*scale;dx=x+(w-dw)/2;dy=y+(h-dh)/2
    c.saveState();p=c.beginPath()
    if round_photo:p.ellipse(x,H-y-h,w,h)
    elif radius:p.roundRect(x,H-y-h,w,h,radius)
    else:p.rect(x,H-y-h,w,h)
    c.clipPath(p,stroke=0,fill=0)
    # Keep ample 400 ppi detail at final print size without embedding oversized originals.
    limit=(max(1,round(dw*400/72)),max(1,round(dh*400/72)))
    if im.width>limit[0] or im.height>limit[1]:im.thumbnail(limit,Image.Resampling.LANCZOS)
    c.drawImage(ImageReader(im),dx,H-dy-dh,dw,dh,mask='auto')
    if shade:
        c.setFillColor(Color(.02,.035,.09,alpha=shade));c.rect(x,H-y-h,w,h,fill=1,stroke=0)
    c.restoreState()
    images.append({'page':page,'asset':str(Path(path).relative_to(A)) if A in Path(path).parents else str(path),'ppi':round(72/scale,1),'box':[x,y,x+w,y+h]})

def arrow(x,y,u,v,color=V):
    line(x,y,u,v,color,.9)
    ang=math.atan2(v-y,u-x);l=4.3
    poly([(u,v),(u-l*math.cos(ang)+2.4*math.sin(ang),v-l*math.sin(ang)-2.4*math.cos(ang)),(u-l*math.cos(ang)-2.4*math.sin(ang),v-l*math.sin(ang)+2.4*math.cos(ang))],color)

def iso_cube(x,y,s=17,height=15):
    poly([(x,y),(x+s,y-s*.5),(x+2*s,y),(x+s,y+s*.5)],LAV)
    poly([(x,y),(x+s,y+s*.5),(x+s,y+s*.5+height),(x,y+height)],MID)
    poly([(x+s,y+s*.5),(x+2*s,y),(x+2*s,y+height),(x+s,y+s*.5+height)],BLUE)

def icon(kind,x,y,size=58):
    # Native vector illustrations, in the lilac / blue palette of the company sheet.
    c.saveState();c.translate(x,H-y-size);c.scale(size/64,size/64)
    # Drawing helpers work in local top coordinates through this local transform.
    def P(ps,fill):
        p=c.beginPath();p.moveTo(ps[0][0],64-ps[0][1])
        for a,b in ps[1:]:p.lineTo(a,64-b)
        p.close();c.setFillColor(fill);c.drawPath(p,fill=1,stroke=0)
    def R(a,b,w,h,fill,r=0):
        c.setFillColor(fill)
        if r:c.roundRect(a,64-b-h,w,h,r,fill=1,stroke=0)
        else:c.rect(a,64-b-h,w,h,fill=1,stroke=0)
    def L(a,b,d,e,color=WHITE,lw=1.6):
        c.setStrokeColor(color);c.setLineWidth(lw);c.line(a,64-b,d,64-e)
    def C(a,b,r,fill):c.setFillColor(fill);c.circle(a,64-b,r,fill=1,stroke=0)
    def cube(a,b,s=12,hh=12):
        P([(a,b),(a+s,b-s*.5),(a+2*s,b),(a+s,b+s*.5)],LAV)
        P([(a,b),(a+s,b+s*.5),(a+s,b+s*.5+hh),(a,b+hh)],MID)
        P([(a+s,b+s*.5),(a+2*s,b),(a+2*s,b+hh),(a+s,b+s*.5+hh)],BLUE)
    P([(3,47),(32,31),(61,47),(32,63)],LIGHT)
    if kind in ('vision','automation','inventory'):
        P([(3,39),(36,21),(62,36),(30,54)],LAV);P([(3,39),(30,54),(30,59),(3,44)],MID)
        cube(10,35,8,10);cube(28,25,8,12)
        if kind=='vision':
            R(44,9,6,29,MID);P([(36,10),(46,5),(56,11),(46,17)],MID);P([(36,10),(46,17),(46,24),(36,17)],V)
            C(40,17,3,HEAD);L(40,23,28,39,BLUE,.8)
        elif kind=='automation':
            R(48,25,7,20,V);L(50,26,43,13,MID,7);L(43,13,30,17,BLUE,6);C(43,13,4,V);L(28,16,27,23,V,2)
        else:
            R(42,6,18,16,V,3);L(46,10,56,10);L(46,14,53,14);L(46,18,54,18)
    elif kind in ('analytics','dashboard','report'):
        P([(9,16),(45,6),(45,37),(9,47)],MID);P([(12,18),(42,10),(42,34),(12,42)],WHITE)
        P([(20,42),(32,39),(37,47),(23,51)],MID)
        for i,hh in enumerate([8,15,12,21]):P([(16+i*6,36-i*1.4),(20+i*6,35-i*1.4),(20+i*6,35-i*1.4-hh),(16+i*6,36-i*1.4-hh)],BLUE if i%2 else V)
        C(46,38,10,LAV);C(46,38,6,WHITE);L(53,45,60,53,V,4)
    elif kind=='bot':
        P([(12,45),(30,36),(47,45),(29,56)],MID)
        R(16,22,29,24,MID,7);R(20,25,21,14,WHITE,5);C(26,32,2,V);C(35,32,2,V)
        L(30,22,30,17,V,1.6);C(30,15,3,BLUE)
        R(38,3,23,16,BLUE,5);P([(42,17),(40,23),(48,18)],BLUE);L(43,9,56,9);L(43,13,53,13)
    elif kind=='chip':
        P([(10,26),(32,14),(54,26),(32,39)],V);P([(10,26),(32,39),(32,46),(10,33)],MID);P([(32,39),(54,26),(54,33),(32,46)],BLUE)
        for i in range(5):
            L(13+i*4,36+i*2,13+i*4,43+i*2,MID,2.5);L(36+i*4,44-i*2,36+i*4,50-i*2,MID,2.5)
        c.setFillColor(WHITE);c.setFont('ENB',10);c.drawString(22,34,'AI')
    else:
        # Worker + task screen, varied for voice / checklist / trace / downtime.
        P([(37,11),(60,17),(60,44),(37,37)],MID);P([(40,15),(57,20),(57,39),(40,34)],WHITE)
        for yy in (22,27,32):L(44,yy,54,yy+3,BLUE,1.1)
        P([(12,43),(25,35),(37,43),(26,56)],BLUE);P([(12,43),(26,50),(26,59),(12,51)],V)
        C(23,26,9,LAV);P([(13,24),(15,16),(25,12),(32,18),(32,24)],MID)
        R(15,24,18,4,V,1);L(32,27,35,32,V,1.5)
        if kind=='voice':
            for i in range(4):L(36+i*4,11-i%2*2,36+i*4,19+i%2*2,BLUE,2)
        elif kind=='downtime':
            P([(49,1),(59,18),(39,18)],V);L(49,6,49,12,WHITE,2);C(49,15,1,WHITE)
        elif kind=='trace':C(51,10,7,BLUE);L(48,10,50,13);L(50,13,55,7)
    c.restoreState()

def tiny_icon(kind,x,y,r=17):
    circle(x,y,r,V)
    if kind=='data':
        for yy in (-6,0,6):
            c.setStrokeColor(WHITE);c.setLineWidth(1.5);c.ellipse(x-7,H-y-yy-3,x+7,H-y-yy+3,stroke=1,fill=0)
        line(x-7,y-6,x-7,y+6,WHITE,1.5);line(x+7,y-6,x+7,y+6,WHITE,1.5)
    elif kind=='analysis':
        for i,h in enumerate((6,12,9)):rect(x-9+i*5,y+6-h,3,h,WHITE)
        circle(x+5,y+3,4,V,WHITE,1.2);line(x+8,y+6,x+12,y+10,WHITE,1.5)
    elif kind=='world':
        circle(x,y,9,V,WHITE,1.2);line(x-9,y,x+9,y,WHITE,1);line(x,y-9,x,y+9,WHITE,1)
        line(x-7,y-5,x+7,y-5,WHITE,.7);line(x-7,y+5,x+7,y+5,WHITE,.7)
    elif kind=='worker':
        circle(x,y-4,5,WHITE);rect(x-7,y+3,14,7,WHITE,r=3);line(x-7,y-4,x+7,y-4,WHITE,2)
    else:
        rect(x-6,y-9,12,18,WHITE,r=2)
        for yy in (-4,0,4):line(x-3,y+yy,x+3,y+yy,V,1)
        circle(x+6,y+6,5,V,WHITE,1);line(x+3,y+6,x+5,y+8,WHITE,1);line(x+5,y+8,x+9,y+3,WHITE,1)

def footer(label,white=False):
    col=WHITE if white else GRAY
    text('DX SOLUTIONS  /  COMPANY PROFILE 2026',36,568,7,'EN',col,track=.5)
    text(label,W-64,568,7.4,'JP',col,align='right');text(f'{page:02}',W-36,566,10,'ENB',WHITE if white else V,align='right')

def start(label,pale=False):
    global page
    page+=1;rect(0,0,W,H,BG if pale else WHITE)
    c.bookmarkPage(f'p{page}');c.addOutlineEntry(label,f'p{page}',level=0)

def band(title,subtitle):
    rect(28,27,W-56,61,V,r=10)
    rect(49,46,4,24,MID);rect(49,56,4,14,WHITE)
    text(title,63,42,30,'ENB',WHITE)
    tw=pdfmetrics.stringWidth(title,'ENB',30)
    text(subtitle,80+tw,58,11,'JPB',WHITE)
    # Delicate circuit decoration matching the source company's title strip.
    for k in range(3):
        yy=46+k*11;pts=[(672,yy),(684,yy),(696,yy-10),(724,yy-10),(738,yy+3),(781,yy+3)]
        for p,q in zip(pts,pts[1:]):line(*p,*q,Color(.72,.63,.85,alpha=.5),.5)
        circle(672,yy,1.7,MID)
    for xx,yy in [(746,38),(755,38),(768,55),(778,55)]:rect(xx,yy,3,3,LAV)

def white_heading(title,sub=None):
    text(title,36,35,20,'JPB',HEAD)
    if sub:para(sub,36,66,W-72,9,color=GRAY,leading=14)

def pill(s,x,y,w=35):
    rect(x-w/2,y,w,15,LAV,r=7);text(s,x,y+2,9,'ENB',HEAD,align='center')

def gradient_title(s,x,y,size=30):
    width=pdfmetrics.stringWidth(s,'ENB',size)
    c.saveState();t=c.beginText();t.setTextOrigin(x,H-y-pdfmetrics.getAscent('ENB')*size/1000);t.setFont('ENB',size);t.setTextRenderMode(7);t.textOut(s);c.drawText(t)
    c.linearGradient(x,H-y,x+width,H-y,[HEAD,MAGENTA]);c.restoreState()
    records.append({'page':page,'text':s,'box':[x,y,x+width,y+size]})

def architecture(x,y,w,h):
    text('M.O.D.E.',x,y,16,'ENB',HEAD);line(x,y+23,x+w,y+23,RULE,.8)
    rect(x,y+35,78,h-35,LIGHT,RULE,r=6)
    rect(x+89,y+35,w-89,h-35,BG,V,r=6)
    rect(x+95,y+41,w-101,24,LAV,r=3);text('MODEプラットフォーム',x+95+(w-101)/2,y+45,12,'JPB',HEAD,align='center')
    text('データソース',x+39,y+44,9,'JPB',HEAD,align='center')
    for i,(name,asset) in enumerate([('PLC','p1-5.png'),('システム','p1-8.png'),('ドキュメント','p1-9.png')]):
        yy=y+77+i*46;rect(x+8,yy,62,39,WHITE,r=4);picture(A/'catalog'/asset,x+25,yy+1,26,26,fit='contain');text(name,x+39,yy+28,6.7,'JPB',INK,align='center')
        arrow(x+70,yy+20,x+105,yy+20)
        rect(x+105,yy+3,72,33,WHITE,RULE,r=4);picture(A/'catalog/p1-10.png',x+109,yy+9,21,21,fit='contain');text('コネクター',x+152,yy+15,7,'JPB',HEAD,align='center')
        line(x+177,yy+20,x+187,yy+20,V,.7);line(x+187,yy+20,x+187,y+143,V,.7)
    arrow(x+187,y+143,x+198,y+143)
    rect(x+198,y+105,67,79,WHITE,RULE,r=5);picture(A/'catalog/p1-13.png',x+207,y+112,49,49,fit='contain');text('MODEエンジン',x+231.5,y+166,7.3,'JPB',HEAD,align='center')
    line(x+265,y+143,x+277,y+143,V,.7)
    for yy,title,desc,asset in [(y+82,'MODE Ops','運用・モニタリング','p1-3.png'),(y+158,'MODE Avis','分析・可視化','p1-4.png')]:
        line(x+277,y+143,x+277,yy+28,V,.7);arrow(x+277,yy+28,x+288,yy+28)
        rect(x+288,yy,w-296,66,WHITE,RULE,r=4);picture(A/'catalog'/asset,x+307,yy+3,34,34,fit='contain')
        text(title,x+288+(w-296)/2,yy+39,8.5,'ENB',V,align='center');text(desc,x+288+(w-296)/2,yy+52,6.7,'JP',INK,align='center')

# 01 - Company overview, rebuilt from the user's current company sheet.
start('会社紹介 / AI DIGITAL TRANSFORMATION')
gradient_title('AI DIGITAL TRANSFORMATION',36,31,30)
text('株式会社DXソリューションズは、明日の技術を研究します。',36,74,14.5,'JPB',HEAD)
para('AIが自ら働く世界へ。工場ではAIエージェントが現場を支え、オフィスではAIパートナーが人とともに働く。<br/>AIを現場と日常、そして企業の本質へ。それが、私たちDXソリューションズの仕事です。',36,102,758,9.6,leading=15)
business=[('製造AX','AI工場長が支える\n次世代の製造現場','catalog/p1-6.png'),('AI AGENT','企業内データで学習した\n業務のエキスパート','catalog/p1-7.png'),('業務自動化','単純な繰り返し業務を\n事務ロボットにお任せ','catalog/p1-1.png'),('AI・SW教育','AIを使う人から、\nつくる人へ','catalog/p1-2.png')]
for i,(title,desc,path) in enumerate(business):
    xx=91+i*188;picture(A/path,xx,148,108,108,round_photo=True,shade=.31)
    text(title,xx+54,183,13.5,'JPB',WHITE,align='center')
    para(desc.replace('\n','<br/>'),xx+7,207,94,7.7,'JPB',WHITE,leading=11,align=1)
rect(28,281,384,270,HexColor('#EEEEF1'))
text('HISTORY',47,295,23,'ENB',HEAD)
text('技術を磨き、現場とともに歩む。',393,306,8.5,'JP',GRAY,align='right')
timeline=[('2026','昌原市長表彰 / K-デジタル革新大賞を受賞',28),('2025','慶南フィジカルAI PoC優秀事例に選定<br/>LG EXAONEベースの製造Agentを開発<br/>LG電子 生産技術院と戦略的パートナーシップ',49),('2024','Doosan Enerbility向けLLMを構築<br/>Shin Sung Delta Techの製造AI事業が優秀事例に<br/>韓国政府のAI優秀企業に選定',49),('2023','CES出展 / 生成AIによる業務知能化',27),('2022','LG電子 BPコンテスト審査委員として活動',27),('2020','株式会社DXソリューションズ設立（2020.04）',25)]
yy=335;line(51,340,51,525,V,.6)
for year,copy,advance in timeline:
    circle(51,yy+5,3.6,LAV);circle(51,yy+5,2,V);text(year,66,yy-1,11,'ENB',HEAD)
    para(copy,109,yy-1,283,8.1,leading=12.5);yy+=advance
architecture(437,291,369,247)
footer('会社紹介');c.showPage()

# 02 - Company activity and awards occupy the full spread.
start('導入実績・受賞 / 実際の会社活動')
white_heading('現場で積み重ねた経験を、実績と技術で証明します。','製造現場での導入実績、産業連携、受賞を通じて、製造AIの可能性を広げています。')
awards=[('p2-2.png','2026','フィジカルAI PoC優秀事例に選定'),('p2-13.png','2026','昌原市長表彰を受賞'),('p2-24.png','2026','K-デジタル革新大賞を受賞'),('p2-35.png','2025','慶尚南道 初代AI委員に選任')]
for i,(f,year,title) in enumerate(awards):
    xx=36+(i%2)*273;yy=105+(i//2)*214
    picture(A/'catalog'/f,xx,yy,255,144)
    pill(year,xx+127.5,yy+138,41)
    para(title,xx,yy+161,255,11,'JPB',INK,leading=16,align=1)
line(566,105,566,532,RULE,.7)
text('MEDIA & RECOGNITION',587,105,10.5,'ENB',HEAD)
picture(A/'press-371.jpeg',587,129,219,164,fit='contain')
picture(A/'press-373.jpeg',587,307,127,170,fit='contain')
picture(A/'press-372.jpeg',726,307,80,192,fit='contain')
para('韓国科学技術情報通信部長官が訪問<br/>製造AIの導入・活用事例を紹介',587,512,219,9.1,'JPB',HEAD,leading=14,align=1)
footer('実績・受賞');c.showPage()

# 03 - Original documents, organized into the same three families as the source sheet.
start('特許・業務提携・認証')
white_heading('技術の裏付けと、共創のネットワーク。','技術特許、業務提携、認証を基盤に、企業のAI活用を支援します。')
docsets=[('特許','patent',[('2024','AIベース環境配慮型','射出成形の運用最適化'),('2023','多品種生産向け','統合AIビジョン検査'),('2023','AIベース工具の','破損予知・寿命予測'),('2022','AI・RPA連携による','製造モニタリング')]),('業務提携','agreement',[('2025','LG電子 AIディストリビューター','契約を締結'),('2025','ポリテク大学との','教育協定を締結'),('2024','「超巨大製造AI」に関する','業務協定'),('2024','強小研究開発特区との','業務協定')]),('認証','certificate',[('2025','品質マネジメントシステム','ISO 9001'),('2025','環境マネジメントシステム','ISO 14001'),('2025','AIファクトリー専門企業','確認書'),('2023','ベンチャー企業','確認書')])]
for col,(heading,prefix,docs) in enumerate(docsets):
    xx=36+col*263;text(heading,xx,97,15,'JPB',HEAD);line(xx,119,xx+245,119,RULE,.8)
    for i,(year,a,b) in enumerate(docs):
        dx=xx+(i%2)*126;dy=130+(i//2)*176
        catalog_documents={'patent':[43,3,4,5],'agreement':[1,30,32,33],'certificate':[39,41,40,42]}
        picture(A/f'catalog/p2-{catalog_documents[prefix][i]}.png',dx+17,dy,85,112,fit='contain')
        rect(dx+17,dy,85,112,Color(1,1,1,alpha=0),RULE,lw=.5)
        pill(year,dx+59.5,dy+107,37)
        para(a+'<br/>'+b,dx-1,dy+127,122,7.5,leading=11.5,align=1)
rect(28,487,W-56,67,BG)
text('DXソリューションズは、多くの企業とともに取り組んでいます。',W/2,496,10.4,'JPB',HEAD,align='center')
logos=[25,28,27,26,10,7,6,8,9,29,11,14,15,12,16,19,18,17,20,22,21,23]
for i,index in enumerate(logos):
    p=A/f'catalog/p2-{index}.png';im=Image.open(p).convert('RGBA')
    flat=Image.new('RGBA',im.size,'white');flat.alpha_composite(im)
    diff=ImageChops.difference(flat.convert('RGB'),Image.new('RGB',im.size,'white')).convert('L')
    bounds=diff.point(lambda v:255 if v>15 else 0).getbbox()
    xx=69+(i%11)*66;yy=516+(i//11)*19;picture(p,xx,yy,54,13,fit='contain',crop=bounds)
footer('特許・提携・認証');c.showPage()

MODE_FEATURES=[
('vision','ビジョンAI・工程別の自動品質検査','製品画像をディープラーニングで分析。ガラスの隙間、発泡液漏れ、ガスケット、フィルムの検査を自動化します。'),
('analytics','予測AI・品質リスクと最適条件の分析','温度・圧力・流量・重量と品質の関係を分析。不良リスクを把握し、品質改善に向けた最適条件を導き出します。'),
('inventory','映像解析AI・在庫と作業時間の自動把握','物体検出・追跡とOCRで台車の位置・番号・使用状況を認識。作業時間の分析から遅延やボトルネックを把握します。'),
('bot','AIアドバイザー・現場データに質問','画面上の指標を要約し、MESデータに関する質問に回答。クイック質問や会話履歴から必要な情報を確認できます。'),
('automation','業務自動化・検査から出荷管理まで','書類認識やタブレット検査、MES入力の自動化を連携。車両位置・到着予定時刻・自車在庫を一元管理します。')]
AVIS_FEATURES=[
('voice','音声AI・音声で指示し、結果を記録','騒音環境での音声認識・記録に対応。多言語や方言にもリアルタイムで対応し、指示内容の理解と記録を支援します。'),
('check','AI巡回検査・製品モデルに応じた点検','音声・QRコードで対象を確認し、部品や設備条件を案内。チェックリストに沿った点検・記録で確認漏れを減らします。'),
('trace','AI不良トレーサビリティ・現場対応と記録','製品・作業履歴と現場状況を連携し、不良対応を支援。必要な処置を確認し、写真・映像を含めて結果を記録します。'),
('downtime','AI非稼働管理・設備異常への対応','設備状態・アラーム・工程履歴から非稼働の状況を把握。AIガイドに沿って処置し、原因・所要時間・結果を記録します。'),
('report','AI業務支援・モニタリング・レポート','不良・点検・非稼働の状況や対応履歴を一目で確認。点検・対応結果をレポートにまとめ、現場運営や改善に活用します。')]

def overview(title,subtitle,hero,headline,body,features,question,flow):
    start(title+' / 製品概要',True);band(title,subtitle)
    rect(36,108,266,439,WHITE,r=10);rect(318,108,488,439,WHITE,r=10)
    picture(A/hero,54,128,230,130,fit='contain',radius=4)
    para(headline,55,280,228,16,'JPB',HEAD,leading=23)
    para(body,55,343,228,10,leading=17)
    line(55,425,283,425,RULE,.6)
    for i,(word,desc) in enumerate(flow):
        xx=55+i*79;circle(xx+31,457,18,LIGHT);text(f'{i+1:02}',xx+31,451,12,'ENB',V,align='center')
        text(word,xx+31,484,9.3,'JPB',HEAD,align='center');text(desc,xx+31,502,7.5,'JP',GRAY,align='center')
        if i<2:arrow(xx+53,457,xx+69,457,RULE)
    line(337,131,787,131,V,.8);circle(350,153,14,V);text('?',350,141,24,'ENB',WHITE,align='center')
    text(question,373,143,13.6,'JPB',HEAD);text('画像・音声・現場データから、日々の業務を支援します。',373,165,8.2,'JP',GRAY)
    line(337,186,787,186,V,.8)
    for i,(kind,name,desc) in enumerate(features):
        yy=199+i*68;picture(A/f'catalog/p{3 if title=="M.O.D.E." else 5}-{i+2}.png',337,yy+2,57,57,fit='contain')
        text(f'{i+1:02}',407,yy+1,17,'ENB',MID)
        text(name,438,yy+2,10.9,'JPB',INK)
        para(desc,438,yy+23,346,8.35,leading=13)
    footer(subtitle);c.showPage()

overview('M.O.D.E.','AI製造統合プラットフォーム','factory-model-user.png','現場を見て、品質を予測する。<br/>AI製造統合プラットフォーム','MODEは、ビジョンAI・予測分析・AIアドバイザーにより、受入から出荷までを一貫してつなぎます。現場データを検査や運用判断に活用します。',MODE_FEATURES,'MODEのAIは、何ができるのか？',[('つなぐ','現場データ'),('わかる','品質・稼働'),('動かす','業務・判断')])

def benefit_strip(y,items,h=91):
    rect(36,y,W-72,h,WHITE,r=10)
    for i,(kind,title,desc) in enumerate(items):
        xx=48+i*254
        if i:line(xx-5,y+15,xx-5,y+h-15,RULE,.65)
        tiny_icon(kind,xx+25,y+31,16)
        para(title,xx+51,y+15,182,10.2,'JPB',HEAD,leading=15)
        para(desc,xx+51,y+50,182,7.5,color=GRAY,leading=11)

# 05 - MODE use cases, large actual screens.
start('M.O.D.E. / 活用シーン',True);band('M.O.D.E.','現場をつなぐ、6つの活用シーン')
mode_cases=[
('catalog/p4-1.png','受入検査・入力自動化','検査記録をデジタル化し、<br/>MESへの入力を自動化します。'),
('catalog/p4-2.png','ビジョンAIによる工程在庫認識','台車の占有状況から在庫を把握。<br/>待機や遅延をダッシュボードで通知します。'),
('catalog/p4-5.png','ディープラーニング品質検査','画像解析でガラスの隙間・漏れや、<br/>部品の欠品・取付状態を検査します。'),
('catalog/p4-3.png','AI品質予測・工程分析','品質リスクを予測し、画像分析から<br/>遅延やボトルネックを検出します。'),
('catalog/p4-6.png','AI在庫認識・出荷管理','車両位置・到着予定時刻と<br/>自車在庫を一つの画面で確認します。'),
('catalog/p4-4.png','AIアドバイザー・データ照会','画面上の指標を要約し、MESに関する<br/>情報を対話形式で確認できます。')]
for i,(f,title,desc) in enumerate(mode_cases):
    xx=36+(i%3)*261;yy=106+(i//3)*174
    rect(xx,yy,248,161,WHITE,r=9);rect(xx+8,yy+8,25,23,LAV,r=7);text(f'{i+1:02}',xx+20.5,yy+13,10,'ENB',HEAD,align='center')
    picture(A/f,xx+37,yy+12,198,99,fit='contain')
    text(title,xx+124,yy+115,10.3,'JPB',HEAD,align='center')
    para(desc,xx+14,yy+132,220,7.65,color=GRAY,leading=10.8,align=1)
benefit_strip(458,[('check','検査・入力の負担を減らし、<br/>現場業務に集中','繰り返し確認や手入力を削減し、<br/>人が担うべき業務に集中できます。'),('analysis','品質問題への対応に、<br/>必要な根拠を把握','品質予測と作業時間の分析で、<br/>改善すべき条件や工程を特定します。'),('data','蓄積したデータを、<br/>必要なタイミングで活用','MESデータの照会と指標の要約で、<br/>日々の運用判断を支援します。')])
footer('画面は導入・デモ環境の一例です。');c.showPage()

overview('AVIS','ウェアラブルAIアシスタント','catalog/p5-1.png','作業を理解し、実行を支援。<br/>ウェアラブルAIアシスタント','AVISは、音声・映像と現場データを連携するマルチモーダルAI業務支援サービスです。スマートグラスで作業状況を確認し、音声で指示しながら結果を記録します。',AVIS_FEATURES,'AVISは、どのような業務を支援する？',[('理解する','音声・映像'),('支援する','点検・対応'),('記録する','履歴・報告')])

# 07 - AVIS practical scenes.
start('AVIS / 活用シーン',True);band('AVIS','現場対応から記録・報告まで')
avis_cases=[
    ('catalog/p6-2.png','音声で指示し、<br/>作業に集中','多言語や方言に対応し、現場での指示や作業記録を支援します。'),
    ('catalog/p6-3.png','作業に合わせて<br/>点検・記録','モデル別のチェックリストに沿って、点検結果をその場で記録します。'),
    ('catalog/p6-4.png','設備異常に<br/>現場で対応','設備の状態と履歴を確認。ガイドに沿った対応を履歴として管理します。'),
    ('catalog/p6-1.png','状況確認から<br/>レポートまで','現場の指標や対応状況を確認。履歴管理とレポート作成に活用します。')]
for i,(f,title,desc) in enumerate(avis_cases):
    xx=36+(i%2)*392;yy=107+(i//2)*172
    rect(xx,yy,378,158,WHITE,r=9);rect(xx+9,yy+9,26,24,LAV,r=7);text(f'{i+1:02}',xx+22,yy+14,10,'ENB',HEAD,align='center')
    picture(A/f,xx+41,yy+18,192,108,fit='contain')
    para(title,xx+246,yy+30,118,11.6,'JPB',HEAD,leading=17)
    para(desc,xx+246,yy+81,118,8.2,color=GRAY,leading=12.4)
benefit_strip(454,[('worker','作業の流れを止めない<br/>ハンズフリーAI','両手を使ったまま、音声で指示。<br/>必要な情報をすぐに確認できます。'),('world','言語・熟練度の差を補う<br/>AI支援','多言語や方言に対応し、<br/>状況に応じた点検・対応を案内します。'),('check','現場対応から記録・報告まで<br/>一気通貫で支援','作業結果を履歴やレポートに変換し、<br/>手作業と繰り返し入力を軽減します。')],95)
footer('写真は実際の現場デモ映像から抜粋。');c.showPage()

# 08 - Contact / connected product architecture.
start('ご相談・お問い合わせ',True);band('DX SOLUTIONS','現場から始める、AIトランスフォーメーション')
rect(36,109,770,173,WHITE,r=10)
text('製造現場とAIをつなぎ、次の一歩をともに。',59,128,21,'JPB',HEAD)
para('課題の整理からPoC、導入、運用改善まで。現場に合わせたAI活用をご提案します。',59,163,700,10,leading=16)
for i,(title,sub,kind) in enumerate([('現場データ','設備・画像・音声・文書','inventory'),('M.O.D.E.','可視化・予測・業務自動化','chip'),('AVIS','点検・現場対応・記録','voice')]):
    xx=62+i*246;picture(A/['catalog/p1-5.png','catalog/p1-13.png','catalog/p5-2.png'][i],xx,199,52,52,fit='contain');text(title,xx+64,206,15,'ENB' if i else 'JPB',HEAD);text(sub,xx+64,232,8.6,'JP',GRAY)
    if i<2:arrow(xx+211,228,xx+230,228,RULE)
rect(36,299,466,248,WHITE,r=10);rect(520,299,286,248,WHITE,r=10)
picture(A/'brand/logo.png',60,321,168,41,fit='contain')
text('株式会社DXソリューションズ',60,380,17,'JPB',HEAD)
text('DX SOLUTIONS CO., LTD.',60,408,9.5,'ENB',GRAY)
text('dx_sales@dx-solutions.co.kr',60,440,13,'ENB',HEAD)
text('+82 55 601 9300',60,465,12,'EN',INK)
para('韓国 慶尚南道昌原市城山区<br/>仏母山路24番キル19 102号室',60,493,401,9.2,color=GRAY,leading=15)
c.linkURL('mailto:dx_sales@dx-solutions.co.kr',(60,H-455,321,H-436),relative=0,thickness=0)
c.linkURL('tel:+82556019300',(60,H-481,208,H-461),relative=0,thickness=0)
text('詳しい製品情報・デモはこちら',663,322,12,'JPB',HEAD,align='center')
qr_defs=[('展示会サイト','https://2026-dxs-osaka-exhibition-jp-mu.vercel.app/ja',538),('コーポレートサイト','https://www.dx-solutions.co.kr/',674)]
for title,url,xx in qr_defs:
    qr=qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M,box_size=12,border=4);qr.add_data(url);qr.make(fit=True)
    im=qr.make_image(fill_color='#303764',back_color='white').convert('RGB');p=A/('qr-exhibition.png' if 'vercel' in url else 'qr-company.png');im.save(p)
    picture(p,xx,354,115,115,fit='contain');text(title,xx+57.5,480,8.7,'JPB',HEAD,align='center')
    c.linkURL(url,(xx,H-473,xx+115,H-352),relative=0,thickness=0)
para('スマートフォンで読み取ってご覧ください。',539,515,248,8.2,color=GRAY,align=1)
footer('お問い合わせ');c.showPage();c.save()

# Explicit trim and language metadata; no crop marks inside the A4 artwork.
r=PdfReader(OUT);wr=PdfWriter();wr.clone_document_from_reader(r)
wr._root_object[NameObject('/Lang')]=TextStringObject('ja-JP')
for p in wr.pages:p[NameObject('/TrimBox')]=RectangleObject([0,0,W,H])
with open(OUT,'wb') as f:wr.write(f)
(WORK/'layout-records.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf8')
(WORK/'image-records.json').write_text(json.dumps(images,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'file':str(OUT),'pages':page,'images':len(images)},ensure_ascii=True))
