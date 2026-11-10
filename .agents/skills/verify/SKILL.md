---
name: verify
description: Verify work through existing project checks and the real affected caller boundary. Use for /verify, confirming a fix, verifying agent work, and before every commit in this repository.
---

# Verify the work

## Scope and existing checks

Read AGENTS.md, the diff, the user's required outcome, and the exact candidate revision plus uncommitted changes. Inspect existing project verification recipes before inventing checks. Follow every applicable existing surface, test, and verification command. In this repository, read references/surfaces.md and run its repository-structure recipe first.

For another project, find the closest project verifier in .dsh/skills, .agents/skills, or .claude/skills. Do not recursively invoke this same generic skill. Use the project's specific recipes. Preserve required coverage and failing evidence. Never delete, weaken, or skip a check to obtain PASS.

## Run and observe

Use ../run/SKILL.md to launch the real affected boundary. Exercise the user's main flow and a nearby failure or edge case. For persistence, reopen or independently read back the result. For a skill or agent, invoke the actual target agent and examine its tools, outputs, and resulting state. Reading the prompt is structural evidence only.

Tests, builds, CI, HTTP 200, and another agent's success report support verification. They cannot replace observation of the claimed runtime behavior. Inspect the diff and raw evidence produced by other agents before accepting their work.

When a check fails, preserve its output, fix the in-scope cause, and rerun against the corrected candidate. Do not retry an uncertain mutating operation until its prior state is known. Do not bypass permissions or authentication.

## Real-model end-to-end gate

For every end-to-end user workflow that depends on an LLM, MUST use an authorized real model API with unscripted model responses and model-selected tool calls. For DSH, exercise the actual DSH caller, AgentLoop, tools and persisted results. A direct API ping alone does not establish product E2E.

Scripted adapters, recorded replies, mocked tool results and replay fixtures remain useful unit/integration or protocol coverage. They MUST NOT satisfy real-model E2E or be reported as autonomous diagnosis. Keep those results explicitly separate. The final commit gate applies to every commit in this repository, including documentation and media updates. Run the fresh real API browser E2E through the installed pre-commit hook. Controlled unit and browser checks are fast debugging coverage only.

Use a real observed defect or an explicitly labeled historical regression replay with its original failure evidence. Give the model the user-visible problem and access to normal bounded tools; do not supply the diagnosis, patch, canned response sequence, or a tool that silently applies a predetermined fix. Do not fabricate an open production incident.

Require model-driven failing reproduction, actual runtime evidence, a causal code change, same-condition retest, one relevant edge case, cleanup and a final independent check. Do not weaken assertions or replace a dependency with a mock to obtain PASS. Keep immutable verification rules outside the model-editable target where appropriate.

Retain the candidate SHA, provider/model IDs, timestamps, actual usage or provider response receipts, model-selected tool calls/results, file diffs, before/after exit codes and persisted outcome. Sanitize secrets, authentication URLs and reasoning content before sharing evidence. A completion-report tool or model-written success message is not independent validation.

Missing credentials, exhausted quota, API/network failure or unavailable caller means BLOCKED for real-model E2E. Complete independent preparation, preserve the actual error, and never silently fall back to scripted output. Reuse existing authorized credentials privately; do not commit keys or expose them in prompts or logs.

## Maintain verification surfaces

For every new public behavior, add a named entry to the project's verification index and a short operational recipe. In this repository use references/surfaces.md and one file under references/surfaces/ per behavior. Reuse an existing entry when it already covers that behavior. Each entry must identify the claim, caller boundary, exact prerequisites and commands, expected result, evidence, and cleanup. Record only commands that were run successfully as a working recipe. Mark unexecuted acceptance steps as pending or BLOCKED rather than inventing a successful path.

Keep checks proportional. Do not add CI or scaffolding solely for this workflow. Documentation and skill changes still require structural checks before a commit. Claim agent/runtime compatibility only after actual discovery, loading, and behavior checks in the named runtime.

## Final media and staged commit

Run `npm run setup:hooks` for this checkout. The tracked hook exports the exact staged tree into an isolated directory, then runs unit/build, controlled browser regression, live-media provenance and a new actual API E2E. The index must remain unchanged. Missing prerequisites or a nonzero check refuse the commit. Do not bypass the hook or present a cached receipt as the current run.

The final MP4 must preserve the exact real API raw recording. Its hash and the final screenshot hash must match the live recording receipt. Validate actual official response IDs, usage, native tool IDs and persisted messages. README release media references must point to the live media directory. Test rejection of an old mock screenshot before the final commit. Read `references/live-api.md` for commands and evidence.

## Verdict

Use one overall verdict, retaining per-surface results:

- PASS: all required checks and applicable runtime acceptance passed on the candidate.
- FAIL: a required check failed or observed behavior contradicts the claim.
- BLOCKED: a required check could not run because the environment or access was unavailable.
- SKIP: no executable behavior is applicable to a specifically named surface. This never exempts a commit from the other checks.

Report the claim, candidate, existing checks run, per-surface commands and observations, evidence paths, agent-work inspection, added or updated recipes, unresolved requirements, overall verdict, and cleanup. Never report partial coverage as full PASS. A BLOCKED runtime may be committed as explicitly unverified content, but not labeled working or ready.
