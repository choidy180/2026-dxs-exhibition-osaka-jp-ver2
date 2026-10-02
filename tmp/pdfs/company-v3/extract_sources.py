import pymupdf
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
ROOT=Path(__file__).parent
d=pymupdf.open(next(p for p in Path('C:/Users/USER/Downloads').glob('*.pdf') if p.name=='[회사소개서] 디엑스솔루션즈_2026.07.pdf'))
items=[]
for n in [4,5,6,8]:
    p=d[n-1]
    p.get_pixmap(matrix=pymupdf.Matrix(1.3,1.3)).save(ROOT/f'source-{n}.png')
    print(n,tuple(p.rect),[(im[0],im[2],im[3]) for im in p.get_images()])
    for im in p.get_images():
        info=d.extract_image(im[0]);f=ROOT/f"asset-p{n}-{im[0]}.{info['ext']}"
        f.write_bytes(info['image']);items.append(f)
sheet=Image.new('RGB',(1600,((len(items)+4)//5)*225),'#eee');dr=ImageDraw.Draw(sheet)
for i,p in enumerate(items):
    im=Image.open(p).convert('RGB');sheet.paste(ImageOps.contain(im,(310,190)),((i%5)*320+5,(i//5)*225+5))
    dr.text(((i%5)*320+5,(i//5)*225+199),p.name+' '+str(im.size),fill='black')
sheet.save(ROOT/'asset-contact.jpg')
