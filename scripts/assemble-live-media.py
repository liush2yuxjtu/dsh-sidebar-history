import argparse
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--take', required=True)
p.add_argument('--output', required=True)
a = p.parse_args()
take, output = Path(a.take).resolve(), Path(a.output).resolve()
evidence = json.loads((take / 'evidence/result.json').read_text())
assert evidence['status'] == 'PASS' and evidence['liveModel'] is True
assert not any(evidence[key] for key in ['mockedService', 'scriptedModel', 'seededAssistantMessages', 'seededTodoEvents'])
assert not output.exists(), 'Use a new output directory.'
sha = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
assert sha(take / 'raw/gt.mp4') == evidence['raw_sha256']
probe = lambda path: json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)]))
raw_probe = probe(take / 'raw/gt.mp4')
duration = float(raw_probe['format']['duration'])
video = next(s for s in raw_probe['streams'] if s['codec_type'] == 'video')
assert video['codec_name'] == 'h264' and video['pix_fmt'] == 'yuv420p'
assert abs(duration - evidence['video']['duration_s']) < 0.25
proof = evidence['proof_interval_s']
start = max(0, proof[0] - 3.5)
assert proof[1] - proof[0] >= 5 and start + 8 <= duration + 0.1 and start + 8 - proof[0] >= 4.0
(output / 'raw').mkdir(parents=True)
(output / 'evidence').mkdir()
shutil.copyfile(take / 'raw/gt.mp4', output / 'raw/gt.mp4')
shutil.copyfile(take / 'raw/gt.mp4', output / 'demo.mp4')
for name in ['result.json', 'native-events.json', 'markers.jsonl', 'preflight.png', 'progress.png', 'final.png', 'reloaded.png']:
    shutil.copyfile(take / 'evidence' / name, output / 'evidence' / name)
for name in ['snapshot.png', 'poster.png']:
    shutil.copyfile(take / 'evidence/final.png', output / name)

def ffmpeg(arguments):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-n', *arguments], check=True, timeout=180)

ffmpeg(['-ss', str(start), '-t', '8', '-i', str(output / 'raw/gt.mp4'), '-filter_complex',
        'fps=12,scale=1040:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=256:stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a:diff_mode=rectangle',
        '-an', '-loop', '0', '-final_delay', '8', str(output / 'feature-8s.gif')])
ffmpeg(['-i', str(output / 'raw/gt.mp4'), '-vf', f'fps=8/{duration},scale=480:-2,tile=4x2', '-frames:v', '1', str(output / 'contact-sheet.png')])
ffmpeg(['-ss', str(start), '-t', '8', '-i', str(output / 'raw/gt.mp4'), '-vf', 'fps=2,scale=320:-2,tile=4x4', '-frames:v', '1', str(output / 'interaction-strip.png')])
gif = probe(output / 'feature-8s.gif')
assert abs(float(gif['format']['duration']) - 8) < 0.15
assert (output / 'feature-8s.gif').stat().st_size < 3 * 1024 * 1024
assert b'NETSCAPE2.0\x03\x01\x00\x00' in (output / 'feature-8s.gif').read_bytes()
markers = [json.loads(line) for line in (output / 'evidence/markers.jsonl').read_text().splitlines()]
(output / 'chapters.json').write_text(json.dumps([{'label':m['label'], 'time_s':m['elapsed_ms']/1000} for m in markers if m['elapsed_ms']/1000 <= duration], indent=2)+'\n')
(output / 'probe.json').write_text(json.dumps({'video':raw_probe, 'gif':gif}, indent=2)+'\n')
artifacts = ['demo.mp4', 'feature-8s.gif', 'snapshot.png', 'poster.png', 'raw/gt.mp4', 'contact-sheet.png', 'interaction-strip.png', 'evidence/progress.png', 'evidence/result.json', 'evidence/native-events.json']
manifest = {'mediaLocale':evidence['mediaLocale'], 'hostLocale':evidence['hostLocale'], 'htmlLang':evidence['htmlLang'], 'runId':evidence['runId'], 'provider':evidence['provider'], 'model':evidence['model'], 'liveModel':True,
            'mockedService':False, 'scriptedModel':False, 'duration_s':duration, 'gif_source_window_s':[start,start+8],
            'proof_interval_s':proof, 'video_is_exact_original_recording':True,
            'artifacts':{name:sha(output/name) for name in artifacts}}
(output / 'provenance.json').write_text(json.dumps(manifest, indent=2)+'\n')
(output / 'qa.json').write_text(json.dumps({'status':'needs-visual-review', 'metadata_pass':True, 'api_provenance':'PASS', 'liveModel':True,
             'runId':evidence['runId'], 'visual_review':None, 'limits':'Isolated real DSH profile and official API. This does not monitor ongoing production health.'}, indent=2)+'\n')
print(json.dumps({'output':str(output), 'duration_s':duration, 'gif_bytes':(output/'feature-8s.gif').stat().st_size, 'liveModel':True, 'runId':evidence['runId']}))
