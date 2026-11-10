# Story-first recording plan — record-production-feature adapted for DSH Sidebar History

Source Skill: [my-release-skills/record-production-feature](https://github.com/liush2yuxjtu/my-release-skills/tree/main/skills/record-production-feature), especially [story-research.md](https://github.com/liush2yuxjtu/my-release-skills/blob/main/skills/record-production-feature/references/story-research.md). Keep real-model provenance, legibility and cold-viewer gates. Do not inherit ChatCut-specific English-only UI, portrait-cutout stock testing or machine locking.

## Story

**A DSH user with several unfinished tasks wants to resume the right conversation without opening every session.**

- Before: separate sessions have different TODO lists; the user cannot tell progress from a plain title alone.
- Action: the enhanced sidebar shows native TODO progress and the latest committed assistant response.
- After: the user locates the unfinished task, opens that chat, and resumes with its context.

## Existing real footage, new story edit

[20-second edited English story demo](story-demo.mp4) · [Edit manifest with hashes and exact source intervals](story-demo.manifest.json) · [Original full walkthrough](demo.mp4) · [Recorded live proof](live/README.md).

The new MP4 is cut from the existing real UI recording. It contains no mock or generated frames, but has disclosed editorial cuts. It is **not a new API run**. The original per-locale real API media and 8-second GIFs are unchanged; see [language manifest](locales.json). English story preview must not be used as evidence for other languages.

QA: H.264/yuv420p, 20s, and source/output SHA256 verified; actual contact sheet inspected. Cold-viewer comprehension, fresh end-to-end story take and matching five-language long-form story cuts remain pending.

## Next recording gates

1. Research open-ended candidate stories and score A/B/C on first-second clarity, one visible user result, before/after contrast, silent comprehension, real-world context, motion purpose and 8-second fit.
2. Capture a real session with an unfinished TODO list, visibly return to that session from another and continue work. Show actual result rather than starting with 2/3 already completed.
3. Preserve an immutable raw MP4, source revision, actual DeepSeek API receipts, UI state assertions and per-locale original screenshots.
4. Produce a 15–30s edited story MP4 and a separate continuous 8s GIF with the visible change; recheck dimensions, output language and hashes.
5. Have an independent cold viewer, without filename/script/feature description, answer what changed and why it matters. Only then mark narrative PASS.
