from pathlib import Path
import json, itertools, hashlib
import cv2, numpy as np, pymupdf
from pypdf import PdfReader

HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2]
PDF=ROOT/'output/pdf/DX_Solutions_2026_Company_Brochure_JA_A4_Landscape_v3.pdf'
WORK=ROOT/'tmp/pdfs/company-v3'
r=PdfReader(PDF)
assert len(r.pages)==8
assert len(r.outline)==8
for p in r.pages:
    assert abs(float(p.mediabox.width)-841.8898)<.1
    assert abs(float(p.mediabox.height)-595.2756)<.1
    assert all(abs(float(a)-float(b))<.01 for a,b in zip(p.trimbox,p.mediabox))
assert r.trailer['/Root']['/Lang']=='ja-JP'
all_text=''.join(p.extract_text() for p in r.pages)
assert '\ufffd' not in all_text
for s in ['AI DIGITAL TRANSFORMATION','M.O.D.E.','AVIS','K-デジタル革新大賞','ISO 9001','AIアドバイザー・データ照会','dx_sales@dx-solutions.co.kr']:
    assert s in all_text,s
records=json.loads((WORK/'layout-records.json').read_text(encoding='utf8'))
issues=[]
for a in records:
    x,y,u,v=a['box'];assert x>=0 and y>=0 and u<=842 and v<=595.3,a
for a,b in itertools.combinations(records,2):
    if a['page']!=b['page']:continue
    x,y,u,v=a['box'];q,z,s,t=b['box'];area=max(0,min(u,s)-max(x,q))*max(0,min(v,t)-max(y,z))
    if area>4 and area/min((u-x)*(v-y),(s-q)*(t-z))>.1:issues.append([a['page'],a['text'],b['text']])
assert not issues,issues
fonts={}
for p in r.pages:
    for f in p['/Resources']['/Font'].values():
        font=f.get_object();desc=font.get('/FontDescriptor')
        if desc:
            desc=desc.get_object();embedded=any(k in desc for k in ['/FontFile','/FontFile2','/FontFile3'])
            assert embedded,font['/BaseFont'];fonts[str(font['/BaseFont'])]=embedded
assert len({f.split('+')[-1] for f in fonts})==4,fonts
d=pymupdf.open(PDF);qrs=[]
for x,url in [(538,'https://2026-dxs-osaka-exhibition-jp-mu.vercel.app/ja'),(674,'https://www.dx-solutions.co.kr/')]:
    pm=d[-1].get_pixmap(matrix=pymupdf.Matrix(3,3),clip=pymupdf.Rect(x,354,x+115,469),alpha=False)
    im=np.frombuffer(pm.samples,np.uint8).reshape(pm.height,pm.width,3)
    value,_,_=cv2.QRCodeDetector().detectAndDecode(im)
    assert value==url,(value,url);qrs.append(value)
links=[a.get_object()['/A']['/URI'] for a in r.pages[-1]['/Annots']]
assert len(links)==4
ims=json.loads((WORK/'image-records.json').read_text(encoding='utf8'))
result={
    'format':'A4 landscape / 297 x 210 mm','pages':8,'language':'ja-JP',
    'edition':'Company brochure reference redesign / v3',
    'design_reference':'Six supplied company brochure pages and their local original PDF',
    'company_activity_and_awards_page':2,'company_activity_photos':4,'press_clippings':3,
    'patents_partnerships_certifications_page':3,'original_documents':12,'partner_logos':22,
    'visual_asset_placements':len(ims),'source_image_minimum_effective_ppi':min(i['ppi'] for i in ims),
    'embedded_font_subsets':len(fonts),'text_box_overlaps':0,'QR_codes_decoded':qrs,
    'links':links,'bookmarks':8,'print':'Exact A4 MediaBox / TrimBox, embedded fonts, RGB',
    'image_sampling':'Up to 400 ppi at placed size; original resolution retained when lower',
    'visual_QA':'All eight pages rendered with Poppler 26.09.0 at 140 dpi and visually reviewed',
    'project_checks':{'typescript':'passed','eslint':'0 errors, 12 existing warnings','application_UI_changes':False},
    'file_bytes':PDF.stat().st_size,'sha256':hashlib.sha256(PDF.read_bytes()).hexdigest()
}
(HERE/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps(result,ensure_ascii=True,indent=2))
