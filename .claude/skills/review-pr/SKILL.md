---
name: review-pr
description: Use when reviewing a GitHub pull request, posting review comments on a PR, or code reviewing someone's PR
allowed-tools: Bash(gh pr view:*), Bash(gh pr diff:*), Bash(gh pr list:*), Bash(gh api:*), Bash(gh search:*), Bash(git log:*), Bash(git blame:*), Bash(git show:*), Bash(git diff:*), Bash(git rev-parse:*), Bash(git ls-files:*), Bash(git branch:*)
---

# Review PR

Code review for GitHub pull requests. Posts pending review comments.

## Input

Requires a GitHub PR URL or number.

## Defaults

- **Depth:** In-depth (override: ask for lightweight)

## Steps

1. **Fetch PR context:**
   ```bash
   gh pr view {number} --json number,title,body,headRefOid,baseRefName,headRefName
   gh pr diff {number}
   ```

2. **Determine depth:**
   - Default: in-depth
   - If user asks for lightweight: use lightweight mode

3. **Read core methodology:** Read `~/.claude/skills/code-review/SKILL.md`

4. **Dispatch review:**

   **Lightweight:** Single Haiku agent with shared preamble + all review focuses combined + diff

   **In-depth:** 5 parallel Sonnet agents (a, b, c, d, e) each with shared preamble + agent-specific prompt + diff. Agent (e) uses `gh` to find historical PRs.

5. **Collect results:** Filter issues below confidence 80, deduplicate

6. **Determine action:**
   - Issues survived filtering: **Request Changes**
   - No issues survived: **Approve**

7. **Rewrite in user's voice:** Read `~/.claude/skills/ghostwriter/SKILL.md` and apply the tone/voice guidelines when writing review comments and the review body. Each inline comment should:
   - Clearly describe the issue and why it matters
   - Link to relevant source (CLAUDE.md, prior PR, code) when applicable
   - Ask questions or present alternatives rather than dictate
   - Stay concise — a sentence or two is usually enough

8. **Post pending GitHub review:**
   a. Get head SHA: `gh pr view {number} --json headRefOid --jq '.headRefOid'`
   b. Get repo owner/name from PR
   c. Build inline comment objects: `path` (relative), `line` (in new file), `side: "RIGHT"`, `body`
   d. Write review body — conversational, natural. Include recommended action without formal labels.
   e. Create pending review (omit `event` so it stays PENDING):
      ```bash
      gh api repos/{owner}/{repo}/pulls/{number}/reviews --input - <<'PAYLOAD'
      {
        "commit_id": "<head_sha>",
        "body": "<review body>",
        "comments": [
          { "path": "file.rs", "line": 42, "side": "RIGHT", "body": "comment" }
        ]
      }
      PAYLOAD
      ```
   f. If 422 (line not in diff): retry without `line`/`side`, add `"subject_type": "file"`. Create review first, then add file-level comment via `POST /repos/{owner}/{repo}/pulls/{number}/comments`.

9. **Terminal summary:** Number of comments posted, recommended action, PR URL. Remind user review is **pending** and must be published from GitHub UI. End with the PR URL on its own line.

## Notes

- Do NOT build, typecheck, or run tests — these run in CI
- Use `gh` for all GitHub interaction, not web fetch
- When linking to code in comments, use full SHA format:
  `https://github.com/{owner}/{repo}/blob/{full_sha}/{path}#L{start}-L{end}`
  - Full git SHA required (not abbreviated, not shell interpolation)
  - `#` after filename, line range as `L{start}-L{end}`
  - Include at least 1 line of context before and after
