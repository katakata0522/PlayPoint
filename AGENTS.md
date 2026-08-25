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
