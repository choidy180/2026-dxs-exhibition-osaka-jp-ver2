import requests,pathlib,zipfile,io
p=pathlib.Path('tmp/pdfs/brochure')
r=requests.get('https://api.github.com/repos/oschwartz10612/poppler-windows/releases/latest');r.raise_for_status();j=r.json();a=next(a for a in j['assets'] if a['name'].endswith('.zip'));print(a['name']);data=requests.get(a['browser_download_url']);data.raise_for_status();zipfile.ZipFile(io.BytesIO(data.content)).extractall(p/'poppler');print('poppler installed locally')
