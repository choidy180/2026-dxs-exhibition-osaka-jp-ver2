from PIL import Image, ImageDraw
from pathlib import Path
p=Path('tmp/pdfs/brochure');files=sorted(p.glob('page-*.png'));out=Image.new('RGB',(1680,4*315),'#d0d0d0');dr=ImageDraw.Draw(out)
for i,f in enumerate(files):
 im=Image.open(f);im.thumbnail((404,286));x=i%4*420+8;y=i//4*315+6;out.paste(im,(x,y));dr.text((x,y+289),str(i+1).zfill(2),fill='black')
out.save(p/'brochure-contact.jpg')
