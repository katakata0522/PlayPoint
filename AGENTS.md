# AGENTS.md - Instructions for Jules & AI Agents

## 1. Project Overview
This repository is the **production source of truth** for PlayPoint by **katakata0522**.
- **Public site:** https://playpoint-sim.com/
- **GitHub:** https://github.com/katakata0522/PlayPoint
- **Local path:** `C:\Users\tomok\PlayPoint`
- **Deploy:** This repo's GitHub Actions → Xserver (NOT `cli-auto`)
- **Legacy warning:** `cli-auto/PlayPoint` is archive-only. Do not treat it as production.
- **Test design and current ownership SSOT:** See `docs/TEST_TRIAGE.md`
- **Behavior-first migration history:** See `docs/TEST_BEHAVIOR_MIGRATION_2026-08-19.md`

The goal is to create **high-quality, robust, and monetizeable** applications.

## 2. Critical Rules (Strictly Prohibited)
* **Text content changes are prohibited unless explicitly instructed by the user:**
  * Do NOT change, summarize, or omit any text, labels, messages, or article content without explicit user instructions.
  * The nuance of the Japanese text is critical.
  * Even during refactoring, keep the text exactly as it is unless the user requests changes.
* **Safety First:**
  * Prioritize **robustness** and **error prevention** over code brevity.
  * Always implement proper error handling.

## 3. Tech Stack & Architecture
* **Core:** HTML5, CSS3, JavaScript (Vanilla ES6+).
* **Structure Rule (Separation with explicit shared contracts):**
  * **Split files when it improves ownership:** keep HTML/CSS/JS responsibilities clear rather than growing monolithic files.
  * **Keep feature-local code local:** app/tool-specific behavior should stay in its feature folder unless it is genuinely shared.
  * **Share only deliberate cross-site contracts:** analytics, consent, asset versioning, content-date sources, common styles, and generators may live in shared modules when multiple surfaces intentionally depend on the same contract.
  * Do not duplicate a shared source of truth merely to keep folders independent.
  * **Responsive:** Use CSS Grid/Flexbox where appropriate.

## 4. Coding Standards
* **Language:** Comments & Commit Messages in **Japanese**.
* **Readability:** Use descriptive variable names.
* **Validation:** Always validate user inputs.

## 5. Instructions for Jules & AI Agents
* **Scope:** Make the smallest complete change that satisfies the requested goal. Do not apply unrelated improvements across all subdirectories by default.
* **Cross-cutting changes:** Expand scope only when a shared contract, generator, SSOT, or generated artifact requires coordinated updates. State that reason in the pull request.
* **Refactoring:**
  * Prefer behavior-preserving refactors with clear responsibility boundaries.
  * Do not split files or create abstractions solely to make the code look more modular.
  * Avoid duplicate helpers or parallel sources of truth.
* **Cleanup:**
  * Treat backup folders, `_old`, `ver1`, temporary migration files, diagnostic workflows, and one-off scripts as cleanup candidates.
  * Remove them only after confirming they are not referenced and their useful behavior is already owned elsewhere.
  * Do not move obsolete files into `_archive` merely to keep dead code in the repository; preserve history in Git when deletion is safe.
* **Context:** Read the relevant current docs before changing behavior. Historical audit/migration docs are evidence, not automatically current requirements.

## 6. Pull Request Safety
* Do not push implementation changes directly to `main`. Create a working branch and open a pull request.
* `main` is protected by a GitHub Ruleset. Do not bypass deletion or force-push protections.
* The required status check for pull requests is **PR Gate**. Merge only after it succeeds.
* Keep **Require branches to be up to date before merging** disabled unless the user explicitly decides to enable stricter synchronization.
* Do not add extra required checks, review approvals, signed-commit requirements, or deployment gates without an explicit need; keep the workflow safe without slowing normal development unnecessarily.
* Prefer behavior/output assertions over source-shape regex checks. Only pin an exact implementation form when it protects a deliberate architecture, security, deployment, or published-output boundary.
* Before adding a static guard, confirm the same guarantee is not already owned by a behavior/integration/browser/production check.
* Do not split one behavior-preserving refactor into multiple PRs unless the split materially improves reviewability or risk isolation. Use one decision/rollback boundary per PR rather than one file per PR.
* Keep PR descriptions explicit about **Goal / Scope / Not changed / Risk / Verification** so unrelated changes are easy to detect.
* After a pull request is merged, allow GitHub's automatic head-branch deletion to clean up the branch.

## 7. Risk-Based Human-in-the-Loop Safety
The human owner primarily operates through **vibe coding** and should not be expected to interpret raw code diffs, command syntax, or generic permission popups. AI agents must therefore make the technical safety judgment first and escalate only when human intent is genuinely needed.

Evaluate actions by **reversibility × blast radius × confidence**, not merely by whether the action is named "delete", "overwrite", or another destructive-sounding verb.

### Level 1 — Routine and Reversible: Act Autonomously
Proceed without asking when the change is normal, scoped, readily reversible, and covered by the usual verification path.
Examples include ordinary implementation/refactoring, test fixes, CI retries, PR creation, safe squash merges after required checks, and temporary working changes on a feature branch.

### Level 2 — Destructive-Looking but Proven Safe: Verify, Then Act Autonomously
Deletion or cleanup does **not** automatically require confirmation. Proceed when the agent can establish that the action is safe.
Before acting, verify the relevant evidence, such as:
* the target is unreferenced or fully superseded;
* useful behavior/data is owned elsewhere;
* tests or other appropriate checks pass;
* the change is recoverable from Git/history/backups when applicable;
* a branch being deleted contains no unique unmerged commits (for example, it is fully contained in `main`).

When those conditions are satisfied, remove stale files, temporary workflows, obsolete generated artifacts, merged branches, or equivalent clutter without burdening the user with a meaningless confirmation prompt. Record the safety evidence in the PR/report when useful.

### Level 3 — High-Risk, Irreversible, Broad, or Uncertain: Stop and Explain in Plain Japanese
Before executing an action with potentially severe consequences, low reversibility, broad production impact, or unresolved uncertainty, stop and ask the user for an explicit decision.
Do **not** rely on a raw tool permission popup as the user's meaningful approval.

Explain in natural Japanese, without requiring code knowledge:
1. **What** you are about to change or delete.
2. **Why** you believe it may be needed.
3. **What will happen** if it is executed, including the affected production/data/security scope.
4. **How reversible it is**, including available rollback or backup paths.
5. **Safer alternatives**, when they exist.
6. **Your recommendation**, then ask whether to proceed.

Typical Level 3 examples include:
* force-pushing or rewriting `main` history;
* deleting a repository or uniquely unmerged work;
* irreversible or bulk production-data deletion/overwrite;
* major DNS/domain or production deployment-destination changes;
* deleting or rotating secrets/credentials when recovery is uncertain;
* disabling security protections or other safeguards;
* stopping infrastructure/services whose current usage has not been confidently established.

If safety can be established to Level 1 or Level 2 confidence, do not escalate merely because an operation looks destructive. If material uncertainty remains, treat it as Level 3.

## 8. Remote / Local Sync Safety for Multi-AI Work
GitHub's default branch is the **shared source of truth**, but local-only work is **protected work-in-progress**, not disposable state. Never interpret “GitHub is the source of truth” as permission to overwrite unknown local changes.

### Before Local Editing
Filesystem/local agents (Codex, IDE agents, CLI agents, etc.) must run the repository preflight before starting a new edit:

`node scripts/ai-sync-preflight.cjs`

The preflight runs `git fetch --prune origin` to refresh remote refs, then reports the current branch, working-tree state, and ahead/behind relationship. It does **not** reset, clean, switch branches, merge, or rewrite the working tree.

Handle its states as follows:
* **READY:** proceed from the current default branch by creating a task branch.
* **FAST_FORWARD_AVAILABLE:** when the default branch is clean and has no local-only commits, advance it with `git merge --ff-only origin/<default>` and rerun the preflight before editing.
* **LOCAL_WORK_PRESENT:** preserve the uncommitted work. Do not use `reset --hard`, `clean`, or checkout/restore commands that overwrite it. Identify what the work belongs to and protect it in an appropriate branch/commit before integrating remote changes when safe.
* **LOCAL_COMMITS_PRESENT:** preserve the unique local commits in a task branch and share them through the normal PR path. Do not discard them merely to match remote.
* **DIVERGED:** both local and remote contain unique commits. Preserve both histories, inspect the differences, and integrate them explicitly. Do not force-push or hard-reset one side away.
* **FEATURE_BRANCH:** continuing the same task is allowed. For a separate task, prefer starting a new branch from the refreshed default branch rather than piling unrelated work onto the existing branch.
* **DETACHED_HEAD:** protect the current commit/work in a branch before editing further.

Do not use a blind `git pull` as the synchronization strategy. Prefer `fetch` plus an explicit fast-forward or explicit integration so the effect is known before the worktree changes.

### Remote-Only Agents
Agents operating directly against GitHub (for example, ChatGPT through a GitHub connector) cannot see uncommitted or unpushed work that exists only on a user's PC. They must not pretend otherwise. Work from the current remote default branch, use a dedicated branch and PR, and avoid destructive assumptions about local state so later integration remains possible.

### Same-Repository Parallelism
Multiple AIs normally work on **different repositories** in this owner's workflow, so do not create extra worktrees or coordination machinery by default. If two agents genuinely need to modify the same repository at the same time, isolate them with separate branches and, when useful, separate Git worktrees. Treat this as an exception, not the default workflow.
