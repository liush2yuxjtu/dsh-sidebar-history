# Design decisions

The work targets an independently installable plugin, real session TODO state and the latest committed assistant reply. Completion requires unit/package checks and real DSH browser evidence for isolation, reload, streaming, keyboard operation, long history and narrow screens.

| Decision | Evidence and consequence |
|---|---|
| Replace `sidebar.workspaces` with priority -10 | The official row seats allow a 16px leading cell, inline trailing icons or hover content. They cannot hold persistent task and reply lines. The original outer sidebar remains in charge of geometry and collapse. |
| Keep a reversible Native navigation toggle | The original workspace browser owns workspace management, archive filters and context actions. The toggle restores that entire official browser without reimplementing its actions. |
| Register a new summary projection | DSH's `todos` projection is excluded from summaries. A bounded `sidebarHistory` summary avoids fetching and retaining every historical session. |
| Reset TODO on `turn/start` | This matches the official TODO projection. Old completed tasks must not appear as the new turn's current work. |
| Exclude interrupted assistant messages | An interrupted message contains a committed partial prefix. It does not satisfy this feature's complete-reply requirement. |
| Keep only three task samples and 360 reply characters | Task counts cover the full actual list. The wire payload remains bounded regardless of log size. Full content stays in the conversation. |
| Use two bounded card heights with viewport rendering | Cards without TODOs use less space. The browser mounts only visible rows and a small overscan. It does not activate the sessions displayed by cards. |
| Use controlled data for UI transport tests | The feature changes data presentation, not model behavior. Deterministic chunks exercise the real loop, TODO tool, projection publication and browser without an external model dependency. Reports identify this limit. |

The initial checkpoint found a configured local Chromium and a complete built upstream checkout. The existing GitHub plugin could read and write repository files but did not expose repository creation. The authenticated Mac mini GitHub CLI created the requested private repository. Implementation and browser acceptance run in ChatGPT Work's computer.

Runtime acceptance exposed two product defects. The expanded browser region's parent has no definite height, so a percentage flex basis grew the list to content. A fixed viewport cap with `flex: none` restores virtualization. Home and End initially tried to focus their target before React mounted its virtual row; focus now runs after the target render commits. Both paths remain in the executable browser acceptance.
