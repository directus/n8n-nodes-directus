# Maintainer notes

## Dependabot PRs (lockfile / transitive updates)

Direct dependencies in `package.json` are often already current; many Dependabot pull requests only bump **transitive** versions in `package-lock.json`. After merging a single maintenance branch that runs `npm audit fix` (and `npm audit fix --force` only when required for the tooling chain, e.g. Vitest/Vite/esbuild), you can **close superseded Dependabot PRs** and post one comment such as:

> Closing in favor of lockfile refresh on `<branch-or-commit>`. Direct deps were already up to date; remaining changes were transitive/security-driven via `npm audit`. Please reopen if anything still reports vulnerable after rebasing on main.

## Dynamic Directus URL / token (credential expressions)

**Request:** Allow n8n expressions in the Directus credential fields (`url`, `token`) so workflows can switch dev/staging/prod without separate credential records.

**Feasibility:** Credential values are loaded as static secrets and used in ways that do not match per-item or per-execution expression evaluation. The main Directus node calls `getCredentials('directusApi')` **once** before the item loop, so even if the UI accepted expressions inside the credential object, **per-item** environment switching would not work without restructuring execution to resolve credentials per batch or per item.

The **Directus Trigger** path is worse for expression-based credentials: webhook lifecycle (`checkExists`, `create`, `delete`) runs at **activation** time, not once per incoming event, so “dynamic URL per run” is not aligned with how triggers register webhooks in Directus.

**Recommendation (short term):** Keep credentials static. Use **one credential per environment** and select the right credential on the node (or duplicate workflow branches), which matches n8n’s security model.

**If dynamic values are required later:** Prefer **optional node parameters** (expression-capable) for override URL/token with clear UX that values are not stored as credential secrets, or document using the HTTP Request node for fully dynamic endpoints. Any design should explicitly address trigger activation vs. execute-node runtime semantics and masking in logs.

**Security / hygiene:** Reported `npm audit` issues in this package are largely **devDependencies** (build, test, lint). Published runtime is `dist/` only; calibrate urgency for end users accordingly unless a finding affects code shipped in `dist/`.
