import pathlib, pymupdf as fitz
from PIL import Image, ImageOps, ImageDraw
root=pathlib.Path('tmp/pdfs/brochure')
d=fitz.open(pathlib.Path('C:/users/user/Documents/카카오톡 받은 파일/テクニカルレポート3_green_fix_OL_見開き.pdf'))
canvas=Image.new('RGB',(1400,((len(d)+2)//3)*350),'#dddddd')
for i,p in enumerate(d):
    pix=p.get_pixmap(matrix=fitz.Matrix(.55,.55)); im=Image.frombytes('RGB',[pix.width,pix.height],pix.samples); im.thumbnail((450,320)); x=(i%3)*466;y=(i//3)*350; canvas.paste(im,(x,y));ImageDraw.Draw(canvas).text((x+10,y+323),str(i+1),fill='black')
canvas.save(root/'reference-contact.jpg')
assets=pathlib.Path('D:/dev/2026-dxs-osaka-exhibition-jp/public/media')
files=[p for p in assets.rglob('*') if p.suffix in ['.webp','.png'] and 'character' not in str(p) and 'patents' not in str(p)]
files+=list(pathlib.Path('public').glob('images/*.png'))+list(pathlib.Path('public/demo').glob('*.png'))
canvas=Image.new('RGB',(1500,((len(files)+4)//5)*195),'white');draw=ImageDraw.Draw(canvas)
for i,p in enumerate(files):
    im=Image.open(p).convert('RGB'); s=im.size;im.thumbnail((290,162));x=i%5*300;y=i//5*195;canvas.paste(im,(x,y));draw.text((x+3,y+165),p.name,fill='black');draw.text((x+3,y+179),str(s),fill='black')
canvas.save(root/'assets-contact.jpg')
print('ref pages',len(d),'assets',len(files))
