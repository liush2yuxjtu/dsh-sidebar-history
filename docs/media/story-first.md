# Watch task progress and the saved reply

An order audit is running, but the native sidebar only shows its title. The user opens **History cards**. The card shows native progress from **0/3** to **2/3** and retains the saved reply. Publishing remains pending. Each language uses its own real DSH recording and native text, preserved in repository snapshot `04f2e81cefca978a8ecb442900be90c913db065b`. Each recording receipt contains a package hash that matches 0.2.2; no recording commit was retained.

## Watch and install

| Language | Complete real recording | Duration | Install |
| --- | --- | --- | --- |
| English | [Watch](live/story-source-04f2e81-snapshot/raw/gt.mp4) | 11.03 seconds | [Install](../../README.md#install) |
| 简体中文 | [观看](localized/zh-CN/story-source-04f2e81-snapshot/raw/gt.mp4) | 10.67 秒 | [安装](../i18n/README.zh-CN.md#安装侧栏插件) |
| 繁體中文 | [觀看](localized/zh-TW/story-source-04f2e81-snapshot/raw/gt.mp4) | 10.63 秒 | [安裝](../i18n/README.zh-TW.md#安裝側欄外掛) |
| 日本語 | [動画](localized/ja/story-source-04f2e81-snapshot/raw/gt.mp4) | 11.13 秒 | [インストール](../i18n/README.ja.md#サイドバープラグインをインストールする) |
| Español | [Ver](localized/es/story-source-04f2e81-snapshot/raw/gt.mp4) | 10.20 segundos | [Instalar](../i18n/README.es.md#instala-el-plugin-de-barra-lateral) |

The complete videos show the request, native task progress and saved reply. They preserve the original bytes and real elapsed time. There are no cuts, speed changes, added captions or generated frames. The eight-second GIFs are continuous excerpts at real speed. The new 520-pixel progress previews crop the sidebar so the task labels remain readable in the README. The bottom history toggle lies outside the crop; the full videos show that action. The original full-frame GIFs remain linked. An eight-second excerpt does not mean the complete task took eight seconds.

These clips show one task. Cross-session navigation and reload recovery have separate runtime receipts; they are not visible in these clips. The recordings are reused and do not represent new model calls. README placement links the matching preview to the complete video and then the installation section. An installation-conversion effect has not been measured.

## Recorded version and current version

The reviewed story sources are retained under each language’s `story-source-04f2e81-snapshot/` directory. These selected files are exact copies from the retaining snapshot; the accompanying archive index records their original paths and hashes. Other artifacts named by the original provenance remain in that immutable repository snapshot.

Version 0.2.3 adds optional usage controls and action events. Code comparison shows no change to the card’s task/reply rendering or the history-switch labels. Its current canonical videos, provenance and Mac OCR remain separate, and the original staged-tree gate verifies the current package with fresh API sessions and Supabase receipt readback. The 0.2.2 narrative verdict does not apply to the new 0.2.3 pixels. Acceptance-generated telemetry is not installation-conversion evidence.

## Source and review

[The source registry](story-acceptance.json) records each original, video, GIF, SHA256, actual run ID, proof interval and independent narrative-review state. [The language registry](locales.json) maps each README to its own media directory. [The verification script](../../scripts/check-story-media.mjs) checks the raw/video identity, real API and native event correlation, locale-specific links and fixture rejection.

Independent agent reviewers passed all five languages for this narrow visible story: open history cards and see current-session task progress and the saved reply excerpt. This is an agent visual review, not a human user study. The [first review](story-review/cold-viewer-first.json) passed three languages and failed English and Traditional Chinese because the sparse sampling missed the pointer dwell. A fresh [dense action review](story-review/cold-viewer-motion.json) passed those two using additional frames from the unchanged source videos. Both original FAIL verdicts remain in the history. The registry records every sample timestamp and source hash.

The new cropped previews have a separate [delivery-size readability review](story-review/preview-readability.json). It confirms the counts, task labels, status indicators and presence of the reply excerpt at 520 × 612 pixels. It does not claim the full reply is visible or that the cropped preview proves the off-screen entry action. Mac Vision OCR verifies the new derivative pixels separately from the original five-language media gate.

## Withdrawn historical edit

The earlier [20-second edit](story-demo.mp4) came from `docs/media/demo.mp4`, whose SHA256 is `50f23cb9f553137273f8605db811ff6efcdd8dd2d3eb89ccb902d36ef96c9bfb`. The original [feature manifest](feature.json) identifies a controlled adapter and `liveModel: false`; its [QA](qa.json) says `fixture-only`.

The old story description incorrectly called it a real API recording. That claim is withdrawn. The MP4, [original manifest](history/story-demo.manifest.original.json) and [corrected manifest](story-demo.manifest.json) remain available for audit. The edit is excluded from release previews. Real browser pixels alone do not prove real model execution.

## Workflow

The work follows [record-production-feature](https://github.com/liush2yuxjtu/my-release-skills/tree/main/skills/record-production-feature): reuse verified footage, keep originals immutable, choose one visible user result, preserve language and timing, inspect pixels, and obtain an independent cold-viewer verdict. Product source, media provenance, silent understanding and public README access are separate checks.
