# AGENTS.md - Instructions for Jules & AI Agents

## 1. Project Overview
This repository is the **production source of truth** for PlayPoint by **katakata0522**.
- **Public site:** https://playpoint-sim.com/
- **GitHub:** https://github.com/katakata0522/PlayPoint
- **Local path:** `C:\Users\tomok\PlayPoint`
- **Deploy:** This repo's GitHub Actions → Xserver (NOT `cli-auto`)
- **Legacy warning:** `cli-auto/PlayPoint` is archive-only. Do not treat it as production.
- **Test triage:** See `docs/TEST_TRIAGE.md`
- **Behavior-first migration / test ownership:** See `docs/TEST_BEHAVIOR_MIGRATION_2026-08-19.md`

The goal is to create **high-quality, robust, and monetizeable** applications.

## 2. Critical Rules (Strictly Prohibited)
*   **Text content changes are prohibited unless explicitly instructed by the user:**
    *   Do NOT change, summarize, or omit any text, labels, messages, or article content without explicit user instructions.
    *   The nuance of the Japanese text is critical.
    *   Even during refactoring, keep the text exactly as it is unless the user requests changes.
*   **Safety First:**
    *   Prioritize **robustness** and **error prevention** over code brevity.
    *   Always implement proper error handling.

## 3. Tech Stack & Architecture
*   **Core:** HTML5, CSS3, JavaScript (Vanilla ES6+).
*   **Structure Rule (Separation & Independence):**
    *   **Split Files:** Separate HTML/CSS/JS logic into dedicated files (index.html, style.css, script.js).
    *   **Keep Independent:** Each app/tool must be self-contained in its own folder. Do NOT create global dependencies that complicate deployment.
    *   **Responsive:** Use CSS Grid/Flexbox.

## 4. Coding Standards
*   **Language:** Comments & Commit Messages in **Japanese**.
*   **Readability:** Use descriptive variable names.
*   **Validation:** Always validate user inputs.

## 5. Instructions for Jules
*   **Scope:** Apply improvements to all subdirectories.
*   **Refactoring:**
    *   Split monolithic files while keeping full functionality.
    *   Organize folder structure for each app.
*   **Cleanup:**
    *   Analyze backup folders and files with _old, er1.
    *   If redundant, suggest deletion or move to an _archive folder.
*   **Context:** Read docs/IDEAS.md to understand the roadmap.
