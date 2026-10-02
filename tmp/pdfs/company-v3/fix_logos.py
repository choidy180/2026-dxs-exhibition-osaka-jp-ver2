from pathlib import Path
import pymupdf
ROOT=Path(__file__).resolve().parents[3]
A=ROOT/'output/pdf/source-company-v3/assets'
d=pymupdf.open(next(p for p in Path('C:/Users/USER/Downloads').glob('*.pdf') if p.name=='[회사소개서] 디엑스솔루션즈_2026.07.pdf'))
for item in d[4].get_images():
    xr,mask=item[:2]
    if 305<=xr<=345:
        pix=pymupdf.Pixmap(d,xr)
        if mask:
            if pix.alpha:pix=pymupdf.Pixmap(pix,0)
            pix=pymupdf.Pixmap(pix,pymupdf.Pixmap(d,mask))
        pix.save(A/f'partner-{xr}.png')
print('Restored original PDF alpha masks for all 21 partner logos')
