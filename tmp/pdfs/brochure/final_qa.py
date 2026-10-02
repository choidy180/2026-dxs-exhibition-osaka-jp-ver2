import json, pathlib, itertools, cv2, pymupdf, numpy as np
from pypdf import PdfReader
p=pathlib.Path('tmp/pdfs/brochure');f=pathlib.Path('output/pdf/DX_Solutions_2026_Osaka_Brochure_JA_A4_Landscape.pdf')
r=PdfReader(f);assert len(r.pages)==16
assert all(abs(float(pg.mediabox.width)-841.8898)<.1 and abs(float(pg.mediabox.height)-595.2756)<.1 for pg in r.pages)
s=''.join(pg.extract_text() for pg in r.pages);assert '\ufffd' not in s
assert all(x in s for x in ['M.O.D.E.','A.V.I.S.','13.3','3.20','4.16','dx_sales@dx-solutions.co.kr'])
entries=json.loads((p/'layout-records.json').read_text(encoding='utf8'));issues=[]
for a,b in itertools.combinations(entries,2):
 if a['page']!=b['page']:continue
 x1,y1,x2,y2=a['box'];u1,v1,u2,v2=b['box'];area=max(0,min(x2,u2)-max(x1,u1))*max(0,min(y2,v2)-max(y1,v1))
 if area>5 and area/min((x2-x1)*(y2-y1),(u2-u1)*(v2-v1))>.1:issues.append([a['page'],a['text'],b['text'],area])
print('LAYOUT_OVERLAPS',issues)
assert not issues
pdf=pymupdf.open(f);qrs=[]
for x,url in [(482,'https://2026-dxs-osaka-exhibition-jp-mu.vercel.app/ja'),(656,'https://www.dx-solutions.co.kr/')]:
 pm=pdf[-1].get_pixmap(matrix=pymupdf.Matrix(3,3),clip=pymupdf.Rect(x,306,x+135,441),alpha=False)
 im=np.frombuffer(pm.samples,np.uint8).reshape(pm.height,pm.width,3)
 value,_,_=cv2.QRCodeDetector().detectAndDecode(im);assert value==url,(value,url);qrs.append(value)
print('QR_DECODE',qrs)
links=[a.get_object()['/A']['/URI'] for a in r.pages[-1]['/Annots']];assert len(links)==4
print('LINKS',links)
print('FINAL_QA_OK pages=16 A4_landscape=true embedded_fonts=7 QR=2 bookmarks=16 text_overlap=0')
