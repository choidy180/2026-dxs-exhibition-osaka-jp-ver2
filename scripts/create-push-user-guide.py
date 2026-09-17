"""기존 PDF 생성 명령 호환: 최신 PC용과 갤럭시용 가이드를 함께 생성한다."""
from pathlib import Path
import runpy


if __name__ == '__main__':
    runpy.run_path(
        str(Path(__file__).with_name('create-push-field-guides.py')),
        run_name='__main__',
    )
