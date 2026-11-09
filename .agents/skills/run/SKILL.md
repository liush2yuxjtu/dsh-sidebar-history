---
name: run
description: Launch and drive the current project's real application, CLI, API, library, or agent to observe behavior. Use for /run, running an app, trying a change, and collecting runtime evidence.
---

# Run the application

1. Read the target project's AGENTS.md and existing run-* recipes. Prefer the recipe closest to the changed package. Otherwise inspect manifests, README, executable entrypoints, and configuration. Do not invent a launch command.
2. Identify the public caller boundary and requested behavior. Use browser interaction for a UI, a terminal for a CLI/TUI, a real request for a server, a consumer process for a library, and a real session for an agent or skill.
3. Run the documented prerequisite and launch commands. Reuse credentials without printing them. Prefer temporary ports, directories, and sandbox accounts. Preserve unrelated processes and working-tree changes.
4. Drive the smallest meaningful flow through that boundary. Observe the actual result. A listening port, successful build, or internal helper call alone does not prove the requested behavior.
5. Capture commands, exit codes, logs, responses, or screenshots with the candidate revision and time. Record process handles and clean up only resources created for this run, unless the user asked to keep the app running.
6. If launch fails, diagnose and repair what is in scope. Report missing authentication or dependencies as BLOCKED. Never replace a real dependency with a mock and describe it as live.
7. Record a reusable project run-* recipe only after its commands worked. Include prerequisites, cwd, readiness signal, interaction, evidence, and cleanup. Update it only when its instructions fail or the launch changes.

Return the launch command, boundary exercised, observation, evidence, blockers, and cleanup status. Follow authorization for external writes; use a disposable target where possible.

For this repository's source checkout, follow the [DSH source recipe](references/dsh-source.md).
