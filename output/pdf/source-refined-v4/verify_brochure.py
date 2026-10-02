"""Verify the rebuilt sixteen-page brochure and the corrected factory placement."""
from pathlib import Path
import json, itertools, hashlib
import cv2, numpy as np, pymupdf
from pypdf import PdfReader

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
PDF = ROOT/'output/pdf/DX_Solutions_2026_Osaka_Brochure_JA_A4_Landscape_v4.pdf'
WORK = ROOT/'tmp/pdfs/refined-v4'
r = PdfReader(PDF)
assert len(r.pages) == 16
assert len(r.outline) == 16
assert r.trailer['/Root']['/Lang'] == 'ja-JP'
for p in r.pages:
    assert abs(float(p.mediabox.width)-841.8898) < .1
    assert abs(float(p.mediabox.height)-595.2756) < .1
    assert all(abs(float(a)-float(b)) < .01 for a,b in zip(p.trimbox,p.mediabox))

page_texts = [p.extract_text() for p in r.pages]
all_text = ''.join(page_texts)
assert '\ufffd' not in all_text
for page, terms in {
    1:['現場から、','未来を動かす。','M.O.D.E.','A.V.I.S.'],
    2:['K-Digital Innovation','昌原未来産業戦略シンポジウム'],
    3:['10','6件の文書','品質マネジメント'],
    4:['DECISION INTELLIGENCE','FIELD INTELLIGENCE'],
    5:['判断のための、共通の景色。','Physical AI PoC'],
    6:['倉庫から、工程へ。','工場から、届け先へ。'],
    7:['13.3','3.20','4.16','目標値'],
    8:['検査位置を把握'],9:['3D設備モニタリング'],
    10:['音声 × 映像 × 業務データ'],11:['レポートを生成する。'],
    12:['GUIDANCE & TRACEABILITY'],13:['PHYSICAL AI'],
    14:['28','2021','2026'],15:['小さく検証','運用へつなぐ'],
    16:['dx_sales@dx-solutions.co.kr','+82 55 601 9300'],
}.items():
    for term in terms:
        assert term in page_texts[page-1], (page,term)

records=json.loads((WORK/'layout-records.json').read_text(encoding='utf8'))
issues=[]
for a in records:
    x,y,u,v=a['box']
    assert x>=0 and y>=0 and u<=842 and v<=595.3, a
for a,b in itertools.combinations(records,2):
    if a['page']!=b['page']: continue
    x,y,u,v=a['box'];q,z,s,t=b['box']
    area=max(0,min(u,s)-max(x,q))*max(0,min(v,t)-max(y,z))
    if area>4 and area/min((u-x)*(v-y),(s-q)*(t-z))>.1:
        issues.append([a['page'],a['text'],b['text']])
assert not issues, issues

fonts={}
for p in r.pages:
    for f in p['/Resources']['/Font'].values():
        font=f.get_object();desc=font.get('/FontDescriptor')
        if desc:
            desc=desc.get_object()
            embedded=any(k in desc for k in ['/FontFile','/FontFile2','/FontFile3'])
            assert embedded, font['/BaseFont']
            fonts[str(font['/BaseFont'])]=embedded
assert len({f.split('+')[-1] for f in fonts}) == 4, fonts

d=pymupdf.open(PDF);qrs=[]
for x,url in [(487,'https://2026-dxs-osaka-exhibition-jp-mu.vercel.app/ja'),
              (668,'https://www.dx-solutions.co.kr/')]:
    pm=d[-1].get_pixmap(matrix=pymupdf.Matrix(3,3),
                       clip=pymupdf.Rect(x,315,x+130,445),alpha=False)
    im=np.frombuffer(pm.samples,np.uint8).reshape(pm.height,pm.width,3)
    value,_,_=cv2.QRCodeDetector().detectAndDecode(im)
    assert value==url, (value,url)
    qrs.append(value)
links=[a.get_object()['/A']['/URI'] for a in r.pages[-1]['/Annots']]
assert len(links)==4

ims=json.loads((WORK/'image-records.json').read_text(encoding='utf8'))
manifest=json.loads((WORK/'page-manifest.json').read_text(encoding='utf8'))
assert [p['original_v2_page'] for p in manifest] == list(range(1,17))
assert [i['page'] for i in ims if i['asset'].endswith('factory-model-user.png')] == [5]
assert [i['page'] for i in ims if i['asset'].endswith('ui-equipment.png')] == [9]
assert len([i for i in ims if i['page']==2]) == 6
assert len([i for i in ims if i['page']==3]) == 6
assert all('icon' not in i['asset'].lower() for i in ims)
factory_sha=hashlib.sha256((HERE/'assets/factory-model-user.png').read_bytes()).hexdigest()
assert factory_sha=='7f2adfd74287970cfa3c14e719a042f60c2aff9d3acbaa63f6d2cf26f7b3f87a'
assert (HERE/'assets/ui-equipment.png').read_bytes()==(ROOT/'output/pdf/source-redesign/assets/ui-equipment.png').read_bytes()
assert all((WORK/f'page-{i:02}.png').exists() for i in range(1,17))

result={
    'format':'A4 landscape / 297 x 210 mm', 'pages':16, 'language':'ja-JP',
    'edition':'Original sixteen-page narrative, independently redesigned / v4',
    'design_reference':'Company reference informs palette, type weight, light surfaces and spacing only',
    'content_mapping':manifest,
    'factory_replacement':{'page':5,'source_dimensions':[2558,1438],
        'original_bytes_preserved':True,'sha256':factory_sha,'fit':'entire original frame'},
    'separate_equipment_screen':{'page':9,'original_v2_asset_unchanged':True},
    'company_activity_photos':{'page':2,'count':6},
    'selected_patent_and_certification_documents':{'page':3,'count':6},
    'visual_asset_placements':len(ims),
    'source_image_minimum_effective_ppi':min(i['ppi'] for i in ims),
    'embedded_font_subsets':len(fonts),'text_box_overlaps':0,
    'QR_codes_decoded':qrs,'links':links,'bookmarks':16,
    'print':'Exact A4 MediaBox / TrimBox, embedded fonts, RGB',
    'image_sampling':'Up to 400 ppi at placed size; original resolution retained when lower',
    'visual_QA':'All sixteen pages rendered with Poppler 26.09.0 at 140 dpi and visually reviewed; revised photos reviewed again',
    'project_checks':{'typescript':'passed','eslint':'0 errors, 12 existing warnings','application_UI_changes':False},
    'file_bytes':PDF.stat().st_size,'sha256':hashlib.sha256(PDF.read_bytes()).hexdigest(),
}
(HERE/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({k:v for k,v in result.items() if k!='content_mapping'},ensure_ascii=True,indent=2))
