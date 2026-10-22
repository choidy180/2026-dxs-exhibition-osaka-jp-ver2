"""Render Korean inspection HUDs from clean source clips (requires Pillow, Node/tsx, FFmpeg).

python scripts/render-material-camera-videos.py --source-dir <clean-clips> --ffmpeg <ffmpeg>
Name each clean clip exactly like its Japanese reference in public/videos/material-inbound/.
"""
import argparse
import json
import math
import re
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
WIDTH, HEIGHT, FPS, UI_FPS = 1280, 720, 24, 10
FONTS = {}


def load_tokens():
    result = subprocess.run([
        'node', '--import', 'tsx', '--input-type=module', '-e',
        "import { color, tone, radius } from './styles/design-tokens.ts';"
        "console.log(JSON.stringify({color,tone,radius}));",
    ], cwd=ROOT, capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def font(size, semibold=False):
    key = (size, semibold)
    if key not in FONTS:
        weight = 'SemiBold' if semibold else 'Regular'
        FONTS[key] = ImageFont.truetype(str(ROOT / f'public/fonts/Pretendard-{weight}.woff'), size)
    return FONTS[key]


def overlay(index, part, quantity, duration, time, tokens):
    color, tone, radius = (tokens[name] for name in ('color', 'tone', 'radius'))
    start, recognized, stop, saved = .7, 1.8, duration - 1.45, duration - .72
    recording, saving = start <= time < stop, stop <= time < saved
    image = Image.new('RGBA', (WIDTH, HEIGHT))
    draw = ImageDraw.Draw(image)

    def text(xy, value, size, fill=None, anchor='mm', semibold=False, shadow=False):
        chosen = font(size, semibold)
        if shadow:
            draw.text((xy[0] + 1, xy[1] + 1), value, font=chosen, anchor=anchor,
                      fill=color['ink'], stroke_width=2, stroke_fill=color['ink'])
        draw.text(xy, value, font=chosen, anchor=anchor, fill=fill or color['surface'])

    # 촬영 상태·타이머는 일본어판과 같은 위치와 시점에 표시한다.
    draw.ellipse((29, 31, 65, 67), fill=color['surface'] if saving else color['brand'])
    text((80, 51), '녹화 중' if recording else '저장 중' if saving else '대기 중',
         36, anchor='lm', semibold=True, shadow=True)
    elapsed = int(max(0, min(time, stop) - start))
    text((81, 93), f'{elapsed // 60:02d}:{elapsed % 60:02d}', 24, anchor='lm', shadow=True)

    # 품번·수량과 인식 전 빈 값은 원래 시연 데이터에 맞춘다.
    x, y, width, height = 752, 24, 501, 94
    draw.rounded_rectangle((x, y, x + width, y + height), radius=radius['card'],
                           fill=color['surface'], outline=color['border'], width=1)
    draw.rounded_rectangle((x + 1, y + 1, x + width - 1, y + 42), radius=radius['control'], fill=color['fill'])
    draw.rectangle((x + 1, y + 24, x + width - 1, y + 42), fill=color['fill'])
    draw.line((x, y + 42, x + width, y + 42), fill=color['border'], width=1)
    for split in (93, 325):
        draw.line((x + split, y + 1, x + split, y + height - 1), fill=color['border'], width=1)
    centers = (x + 47, x + 209, x + 413)
    for cx, label in zip(centers, ('번호', '품번', '입고수량')):
        text((cx, y + 22), label, 22, fill=color['ink3'], semibold=True)
    values = (f'{index:02d}', part, f'{quantity:,} 개') if time >= recognized else ('-', '-', '-')
    for cx, value in zip(centers, values):
        text((cx, y + 69), value, 25, fill=color['ink'], semibold=True)

    # 인식 순간의 초점 피드백을 유지한다.
    settle = max(0, min(1, (time - (recognized - .25)) / .25))
    size = round((260 - 28 * settle) * 2 / 3)
    left, top = (WIDTH - size) // 2, (HEIGHT - size) // 2 - 8
    right, bottom = left + size, top + size
    focus = tone['success']['fg'] if recognized <= time < recognized + .35 else color['surface']
    if time < stop:
        for cx, cy, dx, dy in ((left, top, 1, 1), (right, top, -1, 1),
                               (left, bottom, 1, -1), (right, bottom, -1, -1)):
            draw.line((cx, cy, cx + dx * 32, cy), fill=focus, width=3)
            draw.line((cx, cy, cx, cy + dy * 32), fill=focus, width=3)

    cx, cy = 1199, 619
    draw.ellipse((cx - 36, cy - 36, cx + 36, cy + 36), fill=color['surface'], outline=color['border'], width=1)
    if recording:
        draw.rounded_rectangle((cx - 15, cy - 15, cx + 15, cy + 15), radius=radius['bar'], fill=color['brand'])
    elif saving:
        angle = int(time * 360) % 360
        draw.arc((cx - 18, cy - 18, cx + 18, cy + 18), angle, angle + 270, fill=color['ink3'], width=3)
    else:
        draw.ellipse((cx - 21, cy - 21, cx + 21, cy + 21), fill=color['brand'])
    label = '녹화 중지' if recording else '저장 중' if saving else '다시 촬영' if time >= saved else '녹화 시작'
    text((cx, 677), label, 20, semibold=True, shadow=True)

    message = None
    if time < recognized:
        message = '전표를 읽는 중...'
    elif time < recognized + 1.5:
        message = '품목 정보를 불러왔습니다'
    elif stop <= time < saved:
        message = '녹화를 중지했습니다'
    elif time >= saved:
        message = '검수 영상을 저장했습니다'
    if message:
        width = max(394, math.ceil(draw.textlength(message, font=font(27))) + 64)
        left = (WIDTH - width) // 2
        draw.rounded_rectangle((left, 615, left + width, 681), radius=radius['control'],
                               fill=color['surface'], outline=color['border'], width=1)
        text((WIDTH // 2, 648), message, 27, fill=color['ink2'])
    return image


def inspect(ffmpeg, source):
    result = subprocess.run([ffmpeg, '-hide_banner', '-i', str(source)], capture_output=True,
                            text=True, encoding='utf-8', errors='replace')
    match = re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)', result.stderr)
    if not match:
        raise RuntimeError(f'Cannot inspect {source.name}: {result.stderr}')
    return int(match[1]) * 3600 + int(match[2]) * 60 + float(match[3])


def render(args, reference, tokens):
    source = args.source_dir / reference.name
    if not source.is_file():
        raise FileNotFoundError(f'Missing clean source: {source.name}')
    match = re.fullmatch(r'(\d{2})_(.+)_(\d+)_JP\.mp4', reference.name)
    index, part, quantity = int(match[1]), match[2], int(match[3])
    duration = inspect(args.ffmpeg, reference)
    output = ROOT / 'public/videos/material-inbound/web-ko-v1' / reference.name.replace('_JP.mp4', '_KO.mp4')
    output.parent.mkdir(parents=True, exist_ok=True)
    command = [args.ffmpeg, '-hide_banner', '-loglevel', 'error', '-y', '-i', str(source),
               '-thread_queue_size', '16', '-f', 'rawvideo', '-pixel_format', 'rgba',
               '-video_size', f'{WIDTH}x{HEIGHT}', '-framerate', str(UI_FPS), '-i', 'pipe:0',
               '-filter_complex_threads', '2', '-filter_complex',
               f'[0:v]scale={WIDTH}:{HEIGHT}:flags=lanczos,fps={FPS}[base];'
               f'[1:v]fps={FPS}[ui];[base][ui]overlay=0:0:format=auto,format=yuv420p[out]',
               '-map', '[out]', '-frames:v', str(round(duration * FPS)),
               '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-threads', '4',
               '-maxrate', '1200k', '-bufsize', '2400k', '-pix_fmt', 'yuv420p',
               '-profile:v', 'main', '-level:v', '3.1', '-g', '48',
               '-an', '-map_metadata', '-1', '-movflags', '+faststart', str(output)]
    process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    try:
        for frame in range(math.ceil(duration * UI_FPS) + 1):
            process.stdin.write(overlay(index, part, quantity, duration, frame / UI_FPS, tokens).tobytes())
    except BrokenPipeError:
        pass
    finally:
        try:
            process.stdin.close()
        except BrokenPipeError:
            pass
    error = process.stderr.read().decode('utf-8', errors='replace')
    if process.wait():
        raise RuntimeError(error)
    print(f'Rendered {output.name}: {output.stat().st_size:,} bytes', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path, required=True)
    parser.add_argument('--ffmpeg', default='ffmpeg')
    parser.add_argument('--index', type=int, choices=range(1, 12))
    args = parser.parse_args()
    tokens = load_tokens()
    references = sorted((ROOT / 'public/videos/material-inbound').glob('[0-9][0-9]_*.mp4'))
    if len(references) != 11:
        raise RuntimeError('Expected all 11 Japanese reference clips.')
    for reference in references:
        if args.index is None or int(reference.name[:2]) == args.index:
            render(args, reference, tokens)
