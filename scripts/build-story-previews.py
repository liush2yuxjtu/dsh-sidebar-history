import argparse
import hashlib
import json
import subprocess
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--output', required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
output = Path(args.output).resolve()
assert not output.exists(), 'Use a new output directory.'
output.mkdir(parents=True)
manifest = json.loads((root / 'docs/media/story-acceptance.json').read_text())
records = []
progress_times = {'en': 1.0, 'zh-CN': 1.0, 'zh-TW': 1.0, 'ja': 1.5, 'es': 2.5}
for entry in manifest['locales']:
    locale = entry['locale']
    media = root / entry['source_directory']
    provenance = json.loads((media / 'provenance.json').read_text())
    source = media / 'raw/gt.mp4'
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    assert provenance['liveModel'] and not provenance['mockedService'] and not provenance['scriptedModel']
    assert source_hash == provenance['artifacts']['raw/gt.mp4']
    start, end = provenance['gif_source_window_s']
    proof_start, proof_end = provenance['proof_interval_s']
    assert abs(end - start - 8) < 0.01 and min(proof_end, end) - max(proof_start, start) >= 3
    target = output / locale
    target.mkdir()
    crop = {'x': 0, 'y': 210, 'width': 280, 'height': 330}
    filters = ('crop=280:330:0:210,fps=12,scale=520:-2:flags=lanczos,split[a][b];'
               '[a]palettegen=max_colors=256:stats_mode=diff[p];'
               '[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle')
    subprocess.run(['ffmpeg', '-v', 'error', '-n', '-ss', str(start), '-t', '8', '-i', str(source),
                    '-filter_complex', filters, '-an', '-loop', '0', '-final_delay', '8',
                    str(target / 'story-preview.gif')], check=True)
    for name, time in [('before.png', 0), ('progress.png', progress_times[locale]), ('result.png', 7.3)]:
        subprocess.run(['ffmpeg', '-v', 'error', '-n', '-i', str(target / 'story-preview.gif'), '-ss', str(time),
                        '-frames:v', '1', str(target / name)], check=True)
    records.append({'locale': locale, 'source': str(source.relative_to(root)), 'source_sha256': source_hash,
                    'source_window_s': [start, end], 'crop_source_pixels': crop,
                    'width': 520, 'height': 612, 'duration_s': 8, 'fps': 12,
                    'output': str(target / 'story-preview.gif'),
                    'output_sha256': hashlib.sha256((target / 'story-preview.gif').read_bytes()).hexdigest(),
                    'scope': 'Sidebar state preview. The complete MP4 shows the control used to open it.'})
(output / 'build.json').write_text(json.dumps(records, indent=2) + '\n')
print(json.dumps({'status': 'needs-visual-review', 'output': str(output), 'locales': len(records)}))
