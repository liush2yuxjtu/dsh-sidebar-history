# Story and recording brief

Audience: developers who switch between DSH sessions. Outcome: find a session's TODO progress and latest saved assistant reply in the history sidebar.

- A, playful. A developer treats unfinished sessions as a quest list and finds the next task through History cards.
- B, direct. A developer switches from native navigation to History cards and sees TODO progress and the latest saved reply without opening every session.
- C, everyday. A developer returns to a paused project and reads its last saved reply before continuing.

Selected B, 92/100. The same visible sidebar supports the before state, action and useful result.

| Beat | Entry and action | Visible result | Hold |
|---|---|---|---|
| 1 | Real DSH native sidebar. Move to History cards and click. | Each session shows TODO progress and its latest reply. | At least 4.4 s |
| 2 | Move to Fix build error and click. | Its selected state and 2/3 tasks remain separate from the first session's 2/4. | At least 1.6 s |
| 3 | Return to Ship sidebar history and submit a bounded demo task. | Native todo_write events update progress while the previous committed reply remains visible during generation. | At least 2.4 s |
| 4 | Complete the controlled stream. | The 4/4 tasks and latest committed reply are readable in the sidebar. | At least 4.5 s |

The 8-second preview uses a continuous original interval around beat 1. It includes the native view, the visible toggle and at least three seconds of readable result. The full video preserves real elapsed time. Reload recovery is checked after capture so browser navigation flashes stay outside the video. No music, narration, captions, badges, decorative callouts or time compression.

Capture uses an isolated real DSH 0.2.2-rc.1 profile with the unmodified plugin runtime. All session text and adapter responses are controlled English demonstration data. There are no external model calls or production-health claims. No stock footage is used, so stock selection and portrait cutout checks do not apply.

The full video keeps the actual DSH window. The 1040-pixel GIF keeps the full UI so the toggle and result remain in context. No postproduction zoom is needed because the recording is already readable at native resolution. Geometry and pointer paths are retained in discovery.json. Chapters use observed runtime markers.
