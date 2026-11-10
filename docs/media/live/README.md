# Real API sidebar demonstration

The accepted recording uses the official DeepSeek API through the shipped DSH adapter. [result.json](evidence/result.json) contains response IDs, token usage, native tool IDs, exact source hashes and the independent browser assertions. [native-events.json](evidence/native-events.json) contains the corresponding durable event subset. Reasoning and credentials are excluded.

The MP4 is an exact copy of the immutable raw capture. The PNG is the actual browser screenshot whose hash appears in the live run receipt. The GIF is a continuous eight-second interval, without speed changes. The business inputs are generated demo orders; all model replies and tool choices come from real inference.

Rehearse with `npm run verify:live`, then run `npm run record:live` under the existing Mac mini recording lock with a new DSH_LIVE_OUTPUT. Assemble a new edits directory with scripts/assemble-live-media.py, review its actual pixels and playback, then update the canonical media files. Preserve every original raw capture.

Every final commit runs the tracked pre-commit gate against exported staged files. The hook independently checks current API behavior and the final media provenance. It rejects an old controlled screenshot or stale README media references.

This evidence covers the isolated DSH profile and actual API flow. It does not monitor continuous production uptime.
