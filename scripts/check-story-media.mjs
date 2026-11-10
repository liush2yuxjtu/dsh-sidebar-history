import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, join, dirname, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { assertRealProvenance, hash } from '../tests/live-proof.mjs';

const root = resolve(import.meta.dirname, '..');
const json = async path => JSON.parse(await readFile(join(root, path), 'utf8'));
const bytes = path => readFile(join(root, path));
const manifest = await json('docs/media/story-acceptance.json');
const registry = await json('docs/media/locales.json');
const withdrawn = await json(manifest.withdrawn_edit);
const motionMap = await json(manifest.motion_frame_map.path);
assert.equal(hash(await bytes(manifest.motion_frame_map.path)), manifest.motion_frame_map.sha256);
const recordedPackage = await json(manifest.package_version_evidence.path);
assert.equal(hash(await bytes(manifest.package_version_evidence.path)), manifest.package_version_evidence.sha256);
assert.equal(recordedPackage.version, manifest.package_version_evidence.version);
assert.equal(manifest.recording_commit, null, 'The retained snapshot is not a recording commit');
assert.equal(manifest.schemaVersion, 1);
assert.equal(withdrawn.status, 'fixture-only-withdrawn');
assert.equal(withdrawn.liveModel, false);
assert.equal(withdrawn.publish_ready, false);
assert.equal(hash(await bytes(withdrawn.original_manifest)), withdrawn.original_manifest_sha256);
assert.equal((await json('docs/media/feature.json')).source.liveModel, false);
assert.equal((await json('docs/media/qa.json')).status, 'fixture-only');
assert.deepEqual(manifest.locales.map(row => row.locale).sort(), Object.keys(registry.locales).sort());
const videos = new Set();
const results = [];

for (const row of manifest.locales) {
  const locale = registry.locales[row.locale];
  assert.equal(row.directory, locale.directory);
  assert.equal(row.readme, locale.readme);
  assert.equal(row.source_snapshot_revision, manifest.source_snapshot_revision);
  assert.equal(row.recorded_package_version, manifest.package_version_evidence.version);
  assert.equal(row.recording_commit, null);
  assert.equal(row.source_directory, row.directory + '/story-source-04f2e81-snapshot');
  assert.equal(row.liveModel, true);
  for (const flag of ['mockedService', 'scriptedModel', 'seededAssistantMessages', 'seededTodoEvents', 'editorial_cuts', 'speed_changes', 'generated_frames']) assert.equal(row[flag], false);
  assert.equal(row.new_api_requests_for_media, 0);
  const evidence = await json(row.evidence);
  assert.equal(evidence.candidateSources['package.json'], manifest.package_version_evidence.sha256);
  const events = await json(row.source_directory + '/evidence/native-events.json');
  assertRealProvenance(evidence.calls, events, evidence.primarySession);
  assert.equal(evidence.liveModel, true);
  assert.equal(row.recorded_run_id, evidence.runId);
  for (const flag of ['mockedService', 'scriptedModel', 'seededAssistantMessages', 'seededTodoEvents']) assert.equal(evidence[flag], false);
  assert.equal(evidence.mediaLocale, row.locale);
  assert.equal(evidence.languageChecks.status, 'PASS');
  for (const kind of ['raw', 'video', 'gif', 'evidence']) {
    assert.ok(row[kind].startsWith(row.directory + '/'));
    assert.equal(hash(await bytes(row[kind])), row[kind + '_sha256']);
  }
  assert.equal(row.video_sha256, row.raw_sha256);
  assert.equal(row.raw_sha256, evidence.raw_sha256);
  assert.notEqual(row.video_sha256, withdrawn.source_sha256);
  assert.ok(!videos.has(row.video_sha256), 'Each locale needs its own recorded pixels');
  videos.add(row.video_sha256);
  const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,pix_fmt', '-of', 'json', join(root, row.video)], { encoding: 'utf8' }));
  const stream = probe.streams.find(value => value.codec_type === 'video');
  assert.equal(stream.codec_name, 'h264');
  assert.equal(stream.pix_fmt, 'yuv420p');
  assert.ok(Math.abs(Number(probe.format.duration) - row.duration_s) < 0.05);
  const [proofStart, proofEnd] = row.proof_interval_s;
  assert.ok(proofStart >= 0 && proofEnd <= row.duration_s + 0.05 && proofEnd - proofStart >= 3);
  const provenance = await json(row.provenance);
  assert.deepEqual(row.proof_interval_s, provenance.proof_interval_s);
  assert.deepEqual(row.gif_source_window_s, provenance.gif_source_window_s);
  const preview = row.preview;
  assert.equal(preview.source, row.raw);
  assert.equal(preview.source_sha256, row.raw_sha256);
  assert.deepEqual(preview.source_window_s, row.gif_source_window_s);
  assert.deepEqual(preview.crop_source_pixels, { x: 0, y: 210, width: 280, height: 330 });
  const [start, end] = preview.source_window_s;
  assert.ok(Math.abs(end - start - 8) < 0.01);
  assert.ok(Math.min(proofEnd, end) - Math.max(proofStart, start) >= 3);
  for (const flag of ['speed_changes', 'editorial_cuts', 'generated_frames', 'overlay_text']) assert.equal(preview[flag], false);
  const previewBytes = await bytes(preview.path);
  assert.equal(hash(previewBytes), preview.sha256);
  assert.ok(previewBytes.includes(Buffer.from('NETSCAPE2.0\x03\x01\x00\x00\x00', 'binary')), 'Preview must loop continuously');
  const previewProbe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_name,width,height,r_frame_rate', '-of', 'json', join(root, preview.path)], { encoding: 'utf8' }));
  assert.equal(previewProbe.streams[0].codec_name, 'gif');
  assert.deepEqual([previewProbe.streams[0].width, previewProbe.streams[0].height], [520, 612]);
  assert.equal(previewProbe.streams[0].r_frame_rate, '12/1');
  assert.ok(Math.abs(Number(previewProbe.format.duration) - 8) < 0.01);
  const readability = await json(preview.delivery_readability_review);
  assert.equal(hash(await bytes(preview.delivery_readability_review)), preview.delivery_readability_review_sha256);
  assert.equal(readability.status, 'PASS');
  const deliveryFrame = readability.frames.find(value => value.locale === row.locale);
  assert.ok(deliveryFrame);
  for (const frame of preview.proof_frames) {
    assert.equal(hash(await bytes(frame.path)), frame.sha256);
    assert.ok(frame.requested_preview_time_s >= 0 && frame.requested_preview_time_s < 8);
    assert.ok(Math.abs(frame.requested_source_time_s - start - frame.requested_preview_time_s) < 0.000001);
  }
  assert.equal(deliveryFrame.sha256, preview.proof_frames.find(value => value.path.endsWith('/result.png')).sha256);
  assert.equal(preview.ocr_status, 'PASS');
  const ocr = await json(preview.ocr_report);
  assert.equal(hash(await bytes(preview.ocr_report)), preview.ocr_report_sha256);
  assert.equal(ocr.status, 'PASS');
  const ocrLocale = ocr.locales.find(value => value.locale === row.locale);
  assert.equal(ocrLocale.preview_sha256, preview.sha256);
  for (const receipt of preview.ocr_receipts) assert.equal(hash(await bytes(receipt.path)), receipt.sha256);
  for (const frame of ocrLocale.images) assert.equal(frame.sha256, preview.proof_frames.find(value => value.path === frame.asset).sha256);
  const readme = await readFile(join(root, row.readme), 'utf8');
  const videoLink = relative(dirname(join(root, row.readme)), join(root, row.video)).replaceAll('\\', '/');
  const gifLink = relative(dirname(join(root, row.readme)), join(root, row.gif)).replaceAll('\\', '/');
  assert.ok(readme.includes('(' + gifLink + ')') && readme.includes('(' + videoLink + ')'));
  const previewLink = relative(dirname(join(root, row.readme)), join(root, preview.path)).replaceAll('\\', '/');
  const lines = readme.split('\n');
  const previewLine = lines.findIndex(line => line.includes('(' + previewLink + ')'));
  assert.ok(previewLine >= 0);
  assert.match(lines[previewLine + 2], /^\[[^\]]+\]\(#[^)]+\)$/, 'Install CTA must immediately follow the preview');
  assert.ok(!readme.includes('(docs/media/story-demo.mp4)'));
  const review = row.narrative_review;
  assert.equal(review.status, 'PASS');
  assert.equal(review.status, review.history.at(-1).status);
  for (const round of review.history) {
    assert.equal(hash(await bytes(round.contact_sheet)), round.contact_sheet_sha256);
    assert.equal(round.sample_times_s.length, 16);
    assert.equal(hash(await bytes(round.review_report)), round.review_report_sha256);
    const report = await json(round.review_report);
    assert.equal(report.clips.find(value => value.clip === round.review_clip_id).verdict, round.status);
    if (round.stage === 'dense-local-motion-review') {
      const mapping = motionMap.find(value => value.clip === round.review_motion_id);
      assert.equal(mapping.source_sha256, row.video_sha256);
      assert.equal(mapping.contact_sheet_sha256, round.contact_sheet_sha256);
      assert.deepEqual(mapping.frames.map(frame => frame.requested_time_s), round.sample_times_s);
      assert.ok(mapping.frames.every(frame => frame.source_frame_pts_s >= frame.requested_time_s - 0.000001 && frame.source_frame_pts_s - frame.requested_time_s <= 1 / 30 + 0.001));
    }
  }
  results.push({ locale: row.locale, source: 'PASS', video_sha256: row.video_sha256, duration_s: row.duration_s, narrative_review: review.status, initial_review: review.history[0].status, preview_readability: readability.status, preview_ocr: preview.ocr_status });
}

console.log(JSON.stringify({ source_and_readme_status: 'PASS', withdrawn_fixture_rejected: true, install_conversion_effect: 'UNMEASURED', locales: results }, null, 2));
