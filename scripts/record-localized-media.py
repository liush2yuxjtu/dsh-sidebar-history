import argparse
import datetime
import json
import os
import platform
import shutil
import subprocess
from pathlib import Path

p = argparse.ArgumentParser()
p.add_argument('--mode', choices=['rehearse', 'record'], required=True)
p.add_argument('--output', required=True)
p.add_argument('--locale', action='append')
a = p.parse_args()
root = Path(__file__).resolve().parent.parent
assert platform.system() == 'Darwin', 'Record and render only on Mac mini'
assert shutil.disk_usage('/System/Volumes/Data').free >= 10 * 1024**3, 'At least 10 GiB free is required'
for command in ['node', 'npm', 'ffmpeg', 'ffprobe']:
    assert shutil.which(command), 'Missing dependency: ' + command
manifest = json.loads((root / 'docs/media/locales.json').read_text())
locales = a.locale or list(manifest['locales'])
assert all(locale in manifest['locales'] for locale in locales)
output = Path(a.output).resolve()
assert not output.exists(), 'Use a new output directory for each run'
output.mkdir(parents=True)
report = {'mode': a.mode, 'startedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'locales': {}, 'status': 'RUNNING'}
try:
    for locale in locales:
        take = output / locale
        env = {**os.environ, 'DSH_LIVE_LOCALE': locale, 'DSH_LIVE_OUTPUT': str(take)}
        command = ['npm', 'run', 'record:live' if a.mode == 'record' else 'verify:live']
        with (output / (locale + '.log')).open('w') as log:
            result = subprocess.run(command, cwd=root, env=env, stdout=log, stderr=subprocess.STDOUT, timeout=360)
        report['locales'][locale] = {'exitCode': result.returncode, 'take': str(take)}
        assert result.returncode == 0, 'Language run failed: ' + locale
        evidence = json.loads((take / 'evidence/result.json').read_text())
        assert evidence['mediaLocale'] == locale and evidence['languageChecks']['status'] == 'PASS'
        if a.mode == 'record':
            subprocess.run(['python3', 'scripts/assemble-live-media.py', '--take', str(take), '--output', str(output / (locale + '-assembled'))], cwd=root, check=True, timeout=300)
        print(locale + ': PASS (' + str(len(evidence['calls'])) + ' actual API responses)', flush=True)
        (output / 'result.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    report['status'] = 'PASS'
except BaseException as error:
    report['status'] = 'FAIL'
    report['error'] = str(error)
    raise
finally:
    (output / 'result.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
