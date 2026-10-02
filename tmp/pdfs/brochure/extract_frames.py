import cv2,pathlib
from PIL import Image,ImageDraw
root=pathlib.Path('tmp/pdfs/brochure'); files=list(pathlib.Path('public/videos').glob('*.mp4'))+list(pathlib.Path('public/videos/takttime/web-v1').glob('*.mp4'))+list(pathlib.Path('D:/dev/2026-dxs-osaka-exhibition-jp/public/media/videos').glob('*.mp4'))
frames=[]
for p in files:
 c=cv2.VideoCapture(str(p)); fps=c.get(cv2.CAP_PROP_FPS);n=c.get(cv2.CAP_PROP_FRAME_COUNT)
 for t in [.15,.4,.65]:
  c.set(cv2.CAP_PROP_POS_FRAMES,int(n*t)); ok,a=c.read()
  if ok:
   out=root/(p.stem+'-'+str(int(t*100))+'.jpg'); cv2.imwrite(str(out),a,[cv2.IMWRITE_JPEG_QUALITY,96]); frames.append(out)
 c.release()
canvas=Image.new('RGB',(1500,((len(frames)+4)//5)*180),'white');dr=ImageDraw.Draw(canvas)
for i,p in enumerate(frames):
 im=Image.open(p);im.thumbnail((290,154));x=i%5*300;y=i//5*180;canvas.paste(im,(x,y));dr.text((x+2,y+157),p.name,fill='black')
canvas.save(root/'video-contact.jpg'); print('frames',len(frames))
