---
name: review-fix
description: Use when wanting to review and fix local changes until they are merge-ready, or when asked to make uncommitted code ready to merge
---

# Review Fix

Iterative review-and-fix loop, then lint/test verification.

## Defaults

- **Depth:** in-depth (always)
- **Scope:** Uncommitted changes only
- **Max iterations:** 10 (override via args, e.g. `review-fix --max 5`)

## Phase 1 — Review Loop

1. Invoke `review-local` via the Skill tool with in-depth depth. Do NOT manually replicate review-local — delegate to it.
2. Check the Assessment in the review output:
   - **Ready? Yes** → proceed to Phase 2
   - **Ready? With fixes** → fix the reported issues, go to step 1
   - Iteration >= max → STOP. Report remaining issues. Do NOT proceed to Phase 2.

## Phase 2 — Verification

1. Read AGENTS.md files to determine lint/test commands for affected crates/packages
2. Run lint with auto-fix, then check for remaining errors
3. Run tests for affected crates/packages
4. If failures: fix and re-run (do NOT re-review)

## Phase 3 — Report

Present the last review-local output (Strengths, Issues, Assessment) so the user sees the final state of the code.

## Rules

- Do NOT run lint/tests during Phase 1 — only in Phase 2
- Each review iteration is a fresh in-depth review of the full uncommitted diff
- Fixes from one iteration get caught by the next review iteration
