import json,pathlib
p=pathlib.Path('tmp/pdfs/brochure');items=json.loads((p/'image-records.json').read_text(encoding='utf8'));print('Low resolution placed images:');print('\n'.join(f"p{x['page']:02d} {pathlib.Path(x['file']).name} {x['ppi']} ppi" for x in items if x['ppi']<150))
from pypdf import PdfReader
r=PdfReader('output/pdf/DX_Solutions_2026_Osaka_Brochure_JA_A4_Landscape.pdf');print('Pages',len(r.pages),'outlines',len(r.outline));print('Text chars',len(''.join(p.extract_text() for p in r.pages)))
