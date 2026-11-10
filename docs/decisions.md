# Design decisions

The work targets an independently installable plugin, real session TODO state and the latest committed assistant reply. Completion requires unit/package checks and real DSH browser evidence for isolation, reload, streaming, keyboard operation, long history and narrow screens.

| Decision | Evidence and consequence |
|---|---|
| Replace `sidebar.workspaces` with priority -10 | The official row seats allow a 16px leading cell, inline trailing icons or hover content. They cannot hold persistent task and reply lines. The original outer sidebar remains in charge of geometry and collapse. |
| Keep a reversible Workspaces & archives toggle | The original workspace browser owns workspace management, archive filters and context actions. The toggle restores that entire official browser. An apply-lifetime navigation snapshot preserves query, scroll position, and focus across the supported slot unmount. |
| Register a new summary projection | DSH's `todos` projection is excluded from summaries. A bounded `sidebarHistory` summary avoids fetching and retaining every historical session. |
| Reset TODO on `turn/start` | This matches the official TODO projection. Old completed tasks must not appear as the new turn's current work. |
| Exclude interrupted assistant messages | An interrupted message contains a committed partial prefix. It does not satisfy this feature's complete-reply requirement. |
| Keep only three task samples and 360 reply characters | Task counts cover the full actual list. The wire payload remains bounded regardless of log size. Full content stays in the conversation. |
| Derive compact row heights from visible content | One layout definition supplies both CSS dimensions and virtual positions. No-task and short-task cards avoid blank task rows. Titles and previews keep two lines, tasks stay capped at three, and overflow counts remain visible. |
| Use controlled data for UI transport tests | The feature changes data presentation, not model behavior. Deterministic chunks exercise the real loop, TODO tool, projection publication and browser without an external model dependency. Reports identify this limit. |
| Keep text-bearing replies with their native turn | Official turn IDs distinguish earlier replies from the current turn. This follows DSH's native turn-outline rule that a tool-only message does not replace useful text. Native end reasons are preserved; the official session list remains the only source of running status. |
| Bundle the same GFM grammar with a read-only presentation | DSH's complete Markdown component creates links, remote images, and code-copy controls. History options need only formatted text. A small AST-to-React renderer preserves formatting without nested controls, URL loading, or raw HTML. |
| Use static character-reference decoding | The grammar's browser entry decodes entities through a DOM HTML sink. A platform-neutral build selects its static character table. The generated bundle must continue to pass the existing no-innerHTML check. |
| Require a fresh staged real API check | Mock and replay data serve fast debugging. The final video and snapshots come from unscripted official API responses, and every commit reruns actual DSH E2E from the staged tree. |

The private repository and current release verification use the existing Mac mini checkout and built pinned DSH installation. Recording and media assembly run on that Mac mini. The plugin does not change upstream source.

Runtime acceptance exposed two product defects. The expanded browser region's parent has no definite height, so a percentage flex basis grew the list to content. A fixed viewport cap with `flex: none` restores virtualization. Home and End initially tried to focus their target before React mounted its virtual row; focus now runs after the target render commits. Both paths remain in the executable browser acceptance.
