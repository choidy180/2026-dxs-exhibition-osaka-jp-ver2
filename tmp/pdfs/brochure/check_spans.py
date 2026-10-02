import pymupdf as f
from pathlib import Path
r=f.open('output/pdf/DX_Solutions_2026_Osaka_Brochure_JA_A4_Landscape.pdf')
for idx in [2,11]:
 print('PAGE',idx+1)
 for b in r[idx].get_text('dict')['blocks']:
  if 'lines' not in b:continue
  for l in b['lines']:
   for s in l['spans']:
    if s['bbox'][1]>430: print(s['text'],s['bbox'],s['size'])
