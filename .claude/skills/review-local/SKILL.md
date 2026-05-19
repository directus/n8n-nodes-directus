---
name: review-local
description: Use when reviewing uncommitted work, checking code before committing, or wanting a sanity check on local changes
allowed-tools: Bash(git diff:*), Bash(git rev-parse:*), Bash(git log:*), Bash(git blame:*), Bash(git show:*), Bash(git ls-files:*), Bash(git branch:*), Bash(git-town:*), Bash(git status:*)
---

# Review Local

Code review for local changes, output to terminal.

## Defaults

- **Depth:** Lightweight (override: ask for in-depth)
- **Scope:** Staged + unstaged changes (`git diff HEAD`)
- **Scope override:** Compare current branch to parent via `git-town config get-parent`

## Steps

1. **Determine scope:**
   - Default: `git diff HEAD` (all uncommitted changes)
   - If user requests branch comparison: `git diff $(git-town config get-parent)..HEAD`
   - If no uncommitted changes and on a feature branch, fall back to branch comparison

2. **Determine depth:**
   - Default: lightweight
   - If user asks for in-depth: use in-depth mode

3. **Read core methodology:** Read `~/.claude/skills/code-review/SKILL.md`

4. **Dispatch review:**

   **Lightweight:** Single Haiku agent with shared preamble + all review focuses combined + diff

   **In-depth:** 4 parallel Sonnet agents (a, b, c, d) each with shared preamble + agent-specific prompt + diff

5. **Collect results:** Filter issues below confidence 80, deduplicate

6. **Render to terminal** using the output format from code-review core

## Notes

- Code review only — do not run tests or linters
- Do not post anything to GitHub
- No special voice/tone requirements for terminal output
