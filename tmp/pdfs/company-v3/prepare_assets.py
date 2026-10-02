from pathlib import Path
import pymupdf,io,shutil,json
from PIL import Image,ImageOps,ImageDraw
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'output/pdf/source-company-v3/assets'
OUT.mkdir(parents=True,exist_ok=True)
old=ROOT/'output/pdf/source-redesign/assets'
for name in ['avis-inspection-40.jpg','avis-inspection-15.jpg','avis-defect-traceback-15.jpg','avis-defect-traceback-40.jpg','avis-defect-traceback-65.jpg','avis-idle-time-65.jpg','avis-time-check-40.jpg','ui-equipment.png','ui-quality.png']:
    shutil.copy2(old/name,OUT/name)
media=Path('D:/dev/2026-dxs-osaka-exhibition-jp/public/media')
for kind in ['achievements','platform','avis','brand','poc']:
    target=OUT/kind;target.mkdir(exist_ok=True)
    for p in (media/kind).glob('*'):
        if p.is_file() and p.suffix in ['.png','.webp','.jpg']:shutil.copy2(p,target/p.name)
src=Path('C:/Users/USER/Documents/카카오톡 받은 파일/DXS.pdf')
d=pymupdf.open(src);im=Image.open(io.BytesIO(d.extract_image(d[0].get_images()[0][0])['image']))
for name,col in [('patent',0),('agreement',1),('certificate',2)]:
    xs=[40,270] if col==0 else [534,759] if col==1 else [1018,1247]
    for row,y in enumerate([73,464]):
        for j,x in enumerate(xs):
            im.crop((x+130,y+1010,x+130+212,y+1010+279)).save(OUT/f'{name}-{row*2+j+1}.png')
d=pymupdf.open(next(p for p in Path('C:/Users/USER/Downloads').glob('*.pdf') if p.name=='[회사소개서] 디엑스솔루션즈_2026.07.pdf'))
for xref in [371,372,373]:
    inf=d.extract_image(xref);(OUT/f'press-{xref}.{inf["ext"]}').write_bytes(inf['image'])
logos=[]
for item in d[4].get_images():
    xr,mask=item[:2]
    if 305<=xr<=345:
        pix=pymupdf.Pixmap(d,xr)
        if mask and not pix.alpha:pix=pymupdf.Pixmap(pix,pymupdf.Pixmap(d,mask))
        pix.save(OUT/f'partner-{xr}.png');logos.append(f'partner-{xr}.png')
for n in [18,21,23]:
    for item in d[n-1].get_images():
        if item[2]<500:continue
        inf=d.extract_image(item[0]);p=OUT/f'screen-p{n}-{item[0]}.{inf["ext"]}';p.write_bytes(inf['image'])
(OUT/'partner-order.json').write_text(json.dumps(logos),encoding='utf8')
ps=list((OUT/'platform').glob('*'))+list(OUT.glob('screen-*'))
sheet=Image.new('RGB',(1400,((len(ps)+3)//4)*240),'#eee');dr=ImageDraw.Draw(sheet)
for i,p in enumerate(ps):
    im=Image.open(p).convert('RGB');sheet.paste(ImageOps.contain(im,(335,202)),((i%4)*350+5,(i//4)*240+5));dr.text(((i%4)*350+5,(i//4)*240+215),p.name+' '+str(im.size),fill='black')
sheet.save(Path(__file__).parent/'screens-contact.jpg')
print('Assets prepared',len(list(OUT.rglob('*'))))
