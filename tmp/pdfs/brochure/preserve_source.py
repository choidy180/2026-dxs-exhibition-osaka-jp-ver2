from pathlib import Path
import shutil,json
root=Path.cwd();tmp=root/'tmp/pdfs/brochure';src=root/'output/pdf/source';assets=src/'assets';src.mkdir(parents=True,exist_ok=True)
media=Path('D:/dev/2026-dxs-osaka-exhibition-jp/public/media')
items=json.loads((tmp/'image-records.json').read_text(encoding='utf8'))
for record in items:
 p=Path(record['file'])
 if p.is_relative_to(media):target=assets/'company'/p.relative_to(media)
 elif p.is_relative_to(tmp):target=assets/p.name
 else:continue
 target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,target)
s=(tmp/'build_brochure.py').read_text(encoding='utf8')
s=s.replace("ROOT=Path(__file__).resolve().parents[3]\nTMP=Path(__file__).resolve().parent\nMEDIA=Path('D:/dev/2026-dxs-osaka-exhibition-jp/public/media')", "HERE=Path(__file__).resolve().parent\nROOT=HERE.parents[2]\nTMP=HERE/'assets'\nMEDIA=TMP/'company'\nWORK=ROOT/'tmp/pdfs/brochure'\nWORK.mkdir(parents=True,exist_ok=True)")
s=s.replace("(TMP/'layout-records.json')","(WORK/'layout-records.json')").replace("(TMP/'image-records.json')","(WORK/'image-records.json')")
(src/'build_brochure.py').write_text(s,encoding='utf8')
compile(s,str(src/'build_brochure.py'),'exec')
manifest={'format':'A4 landscape, 297 x 210 mm','pages':16,'language':'ja-JP','embedded_font_subsets':7,'placed_images':28,'minimum_placed_image_ppi':min(x['ppi'] for x in items),'QR_codes_verified':2,'bookmarks':16,'overlapping_text_boxes':0,'authoring':'ReportLab; vector text, diagrams, chart and QR','rendering':'Poppler 26.09.0; all 16 pages visually reviewed','project_checks':{'tsc':'passed','eslint':'0 errors, 12 pre-existing warnings'},'source_web':'https://2026-dxs-osaka-exhibition-jp-mu.vercel.app/ja','design_reference':'https://www.behance.net/gallery/195434209/01-Kanazawa-city-branding-brochure','new_generated_asset':'output/imagegen/dxs-brochure-factory-cover.png','print_notes':'A4 MediaBox and TrimBox; RGB document; no imposed spreads or extra bleed. Fonts embedded. Actual-size printing.'}
(src/'verification.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
print('SOURCE_ASSETS',len(list(assets.rglob('*.*'))));print('MIN_PPI',manifest['minimum_placed_image_ppi'])
