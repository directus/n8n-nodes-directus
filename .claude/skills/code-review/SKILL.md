---
name: code-review
description: Core review methodology shared by review-local and review-pr. Not for direct use.
---

# Code Review — Core

Shared methodology for review-local and review-pr. Do not invoke directly.

## Modes

**Lightweight:** Single Haiku agent scans the diff for obvious issues.

**In-depth:** Parallel Sonnet agents covering different review angles.

## In-Depth Agents

| ID | Focus | Local | PR |
|----|-------|-------|----|
| a | Convention compliance (CLAUDE.md/AGENTS.md) | yes | yes |
| b | Bug scan with git blame context | yes | yes |
| c | Pattern consistency (neighboring code) | yes | yes |
| d | Test adequacy | yes | yes |
| e | Historical PR comments | — | yes |

## Confidence Scoring

Each agent self-scores every issue:

| Score | Meaning |
|-------|---------|
| 0 | False positive or pre-existing |
| 25 | Might be real, couldn't verify |
| 50 | Real but nitpick or unlikely in practice |
| 75 | Likely real, important, directly impacts functionality |
| 100 | Confirmed, frequent, evidence-backed |

**Filter threshold: 80.** Discard everything below.

## Shared Agent Preamble

Include verbatim in every agent prompt:

```
You are reviewing code changes for quality and correctness.

For each issue:
1. File path and line number(s)
2. What's wrong and why it matters
3. Confidence score (0-100):
   - 0: False positive or pre-existing
   - 25: Might be real, couldn't verify
   - 50: Real but nitpick/rare in practice
   - 75: Double-checked, likely real, important
   - 100: Confirmed, frequent, evidence-backed
4. Suggested fix (if not obvious)

NOT issues (skip these):
- Pre-existing problems not introduced by this change
- Things linter/typechecker/compiler would catch
- Nitpicks a senior engineer wouldn't flag
- Intentional functionality changes
- Issues on unmodified lines
- General quality concerns not specific to the diff
```

## Agent-Specific Prompts

### (a) Convention Compliance

```
Find and read CLAUDE.md/AGENTS.md in the repo root and in directories containing modified files.
Check changes against conventions defined there. Only flag issues explicitly called out.
Skip conventions silenced in code (lint ignore comments etc).
```

### (b) Bug Scan

```
Scan diff for bugs. Run git blame on modified files for historical context.
Focus: logic errors, off-by-one, null handling, race conditions, resource leaks,
security issues (injection, auth, data exposure), error handling gaps.
Large bugs only — skip small issues and nitpicks.
```

### (c) Pattern Consistency

```
For each modified file, explore neighboring files and similar code in the codebase.
Flag where changes diverge from established patterns: module structure, naming conventions,
error handling approach, reuse of existing utilities/helpers.
```

### (d) Test Adequacy

```
Review test changes relative to code changes.
Check: tests exist for new/modified functionality, edge cases and error paths covered,
tests verify real logic (not just mocks), integration tests where needed,
existing tests updated when behavior changed.
Do NOT run tests — just review coverage.
```

### (e) Historical PR Comments (review-pr only)

```
Find previous PRs touching the same files using gh.
Read their review comments. Flag recurring feedback that applies to this change:
past issues that may have regressed, patterns of feedback on these files,
known problem areas from previous reviews.
```

## Output Format

Each agent returns issues as:

```
### [file:line] Brief title
- **Confidence:** [score]
- **Why:** [explanation]
- **Fix:** [suggestion]
```

After collecting all results, filter below 80, deduplicate, then produce:

```
### Strengths
[Specific things done well with file:line references]

### Issues
[Surviving issues grouped by file, confidence descending]

### Assessment
**Ready?** [Yes / With fixes]
**Reasoning:** [1-2 sentences]
```
