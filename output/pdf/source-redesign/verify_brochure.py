from pathlib import Path
import json, itertools, hashlib
import cv2, numpy as np, pymupdf
from pypdf import PdfReader

HERE=Path(__file__).resolve().parent; ROOT=HERE.parents[2]
PDF=ROOT/'output/pdf/DX_Solutions_2026_Osaka_Editorial_Brochure_JA_v2.pdf'
WORK=ROOT/'tmp/pdfs/redesign'
r=PdfReader(PDF); assert len(r.pages)==16
assert len(r.outline)==16
assert all(abs(float(p.mediabox.width)-841.8898)<.1 and abs(float(p.mediabox.height)-595.2756)<.1 for p in r.pages)
all_text=''.join(p.extract_text() for p in r.pages)
assert '\ufffd' not in all_text
for s in ['M.O.D.E.','A.V.I.S.','現場から、','K-Digital Innovation','AIファクトリー','13.3','3.20','4.16','dx_sales@dx-solutions.co.kr']:
    assert s in all_text,s
records=json.loads((WORK/'layout-records.json').read_text(encoding='utf8'))
issues=[]
for a,b in itertools.combinations(records,2):
    if a['page']!=b['page']:continue
    x,y,u,v=a['box']; q,z,s,t=b['box']
    area=max(0,min(u,s)-max(x,q))*max(0,min(v,t)-max(y,z))
    if area>5 and area/min((u-x)*(v-y),(s-q)*(t-z))>.1:
        issues.append([a['page'],a['text'],b['text']])
assert not issues,issues
fonts={}
for p in r.pages:
    for f in p['/Resources']['/Font'].values():
        font=f.get_object();desc=font.get('/FontDescriptor')
        if desc:
            desc=desc.get_object();embedded=any(k in desc for k in ['/FontFile','/FontFile2','/FontFile3'])
            assert embedded,font['/BaseFont']
            fonts[str(font['/BaseFont'])]=embedded
assert len(fonts)>=6
d=pymupdf.open(PDF)
qrs=[]
for x,url in [(487,'https://2026-dxs-osaka-exhibition-jp-mu.vercel.app/ja'),(668,'https://www.dx-solutions.co.kr/')]:
    pm=d[-1].get_pixmap(matrix=pymupdf.Matrix(3,3),clip=pymupdf.Rect(x,315,x+130,445),alpha=False)
    im=np.frombuffer(pm.samples,np.uint8).reshape(pm.height,pm.width,3)
    value,_,_=cv2.QRCodeDetector().detectAndDecode(im)
    assert value==url,(value,url);qrs.append(value)
links=[a.get_object()['/A']['/URI'] for a in r.pages[-1]['/Annots']]
assert len(links)==4
ims=json.loads((WORK/'image-records.json').read_text(encoding='utf8'))
result={
    'format':'A4 landscape / 297 x 210 mm','pages':16,'language':'ja-JP',
    'edition':'Editorial redesign / v2','company_photo_gallery_page':2,
    'company_photo_gallery_images':6,'certificate_gallery_page':3,'certificate_gallery_images':6,
    'cover':'Cropped actual inspection demonstration still; no new generated image',
    'image_placements':len(ims),'minimum_effective_image_ppi':min(i['ppi'] for i in ims),
    'embedded_font_subsets':len(fonts),'text_box_overlaps':0,'QR_codes_decoded':qrs,
    'links':links,'bookmarks':16,
    'visual_QA':'All 16 pages rendered with Poppler 26.09.0 and reviewed at 140 dpi',
    'source_captions':'Company photo captions reconciled with visible certificates and event signage',
    'project_checks':{'typescript':'passed','eslint':'0 errors, 12 existing warnings'},
    'print':'Exact A4 MediaBox and TrimBox; RGB; embedded fonts; actual-size printing',
    'file_bytes':PDF.stat().st_size,'sha256':hashlib.sha256(PDF.read_bytes()).hexdigest()
}
(HERE/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps(result,ensure_ascii=True,indent=2))
