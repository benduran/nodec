---
name: js-package-install-healer
description: Repeatedly run `<PM> install`, detect failures, query remote versions, filter by minimumReleaseAge, downgrade offending packages to the newest qualifying version, and retry until install succeeds. Supports npm, pnpm, yarn (v4/Berry), and bun. Prefers mise-managed toolchains when available.
argument-hint: "[--skip-mise] [--aggressive] [--max-retries N]"
---

# Install Healer

Run `install` in a loop, healing version-resolution failures by stepping backward through version history — always respecting the package manager's `minimumReleaseAge` gate so you never land on a too-recent, potentially broken publish.

## When to Use

- A fresh install (`npm install`, `pnpm install`, `yarn install`, or `bun install`) fails with version-resolution, engine-constraint, or dependency-tree errors.
- You suspect a recently-published version is broken and want to pin every dependency to a version older than the `minimumReleaseAge` threshold.
- You want to regenerate a lockfile by starting from the declared ranges and stepping back to the newest version that satisfies each package manager's stability gate.

## Process

### 0. Discover the environment (one-time setup)

Before looping, determine the **package manager**, **mise availability**, and **age-gate configuration**. Do this once; reuse for every iteration.

#### 0.1 Detect the package manager

Walk the project root and look for lock/config files in this priority order:

| Evidence | Package manager |
|---|---|
| `pnpm-lock.yaml` | **pnpm** |
| `pnpm-workspace.yaml` | **pnpm** |
| `yarn.lock` **and** `.yarnrc.yml` (with `yarnPath`) | **yarn (Berry v4)** |
| `yarn.lock` (classic, no `.yarnrc.yml` `yarnPath`) | **yarn (classic v1)** — warn and suggest upgrading |
| `bun.lock` or `bun.lockb` | **bun** |
| `bunfig.toml` | **bun** |
| `package-lock.json` | **npm** |

If zero evidence exists, check `package.json` `engines` or `scripts` for clues. If still nothing, ask the user.

#### 0.2 Detect mise

```bash
command -v mise && mise --version | head -1
```

If mise is present **and** the project has a `mise.toml`, `.mise.toml`, `.tool-versions`, or `.mise/config.toml`, prefix every `<PM> install` with `mise x --`:

```
mise x -- <PM> install
```

If `--skip-mise` was passed in `$ARGUMENTS`, skip mise even if detected.

#### 0.3 Read the minimumReleaseAge

Read the age gate for the detected package manager. Convert **every value to seconds** for a unified internal representation.

| PM | Config file | Field | Native unit | Default |
|---|---|---|---|---|
| **pnpm** | `pnpm-workspace.yaml` | `minimumReleaseAge` | minutes | `1440` (v11+), `0` (v10) |
| **yarn (v4)** | `.yarnrc.yml` | `npmMinimalAgeGate` | duration string (`"1d"`, `"3h"`, `"1w"`) | disabled (`0`) |
| **bun** | `bunfig.toml` → `[install]` | `minimumReleaseAge` | seconds | disabled (`0`) |
| **npm** | _none_ | _none_ | — | fall back to `86400` (24h) |

**Parsing rules:**
- **pnpm**: integer minutes → `value * 60` seconds.
- **yarn duration string**: parse `"1d"` → `86400`, `"3h"` → `10800`, `"1w"` → `604800`, `"30m"` → `1800`. Accept composite forms like `"1d12h"` by summing components.
- **bun**: integer seconds directly.
- **npm**: always use **86400** (24 hours) as a sensible default.

Also read the exclude/allow list if present (`minimumReleaseAgeExclude` in pnpm, `npmPreapprovedPackages` in yarn, `minimumReleaseAgeExcludes` in bun). Packages matching these patterns bypass the age gate entirely.

#### 0.4 Scan for package.json files

Find **every** `package.json` in the project (including workspace members):

```bash
# For pnpm workspaces, read the packages globs from pnpm-workspace.yaml
# For yarn workspaces, read .yarnrc.yml or root package.json "workspaces"
# For npm workspaces, read root package.json "workspaces"
# Fallback: glob `**/package.json` excluding node_modules
```

Record the path of every `package.json` and the dependency declarations within. This becomes the "surface area" you can edit when downgrading.

### 1. Run install

Execute the install command. Use the mise prefix if available and not skipped.

| PM | Command |
|---|---|
| pnpm | `mise x -- pnpm install` or `pnpm install` |
| yarn (v4) | `mise x -- yarn install` or `yarn install` |
| bun | `mise x -- bun install` or `bun install` |
| npm | `mise x -- npm install` or `npm install` |

**Capture both stdout and stderr.** The exit code alone is not enough; you need the error text to identify which packages failed.

### 2. Analyze failures (only if install exited non-zero)

Parse the captured stderr/stdout for each package manager's error signatures:

**pnpm:**
- `ERR_PNPM_NO_MATCHING_VERSION` — no version satisfies the range (extract `package@range`)
- `ERR_PNPM_UNSUPPORTED_ENGINE` — Node engine mismatch (extract `package@version` and `wantedEngines`)
- `ERR_PNPM_PEER_DEP_ISSUES` — peer dependency conflicts (extract all named peers)
- `ERR! code E404` — package or version not in registry

**yarn:**
- `YN0001: │ <package>@npm:<version> couldn't be built`
- `YN0020: │ <package>@npm:<version> not found`
- `YN0060: │ <package> is incompatible with the node version`

**bun:**
- `error: <package>@<version> failed to resolve`
- `error: <package> not found`
- `error: could not find <package>`

**npm:**
- `npm ERR! code E404`
- `npm ERR! 404 '<package>@<version>' is not in this registry`
- `npm ERR! code ERESOLVE` — dependency tree conflict
- `npm ERR! code EBADENGINE` — unsupported engine

**De-duplicate and collect** a set of `{ name, requestedRange, errorKind }` records. Multiple errors may reference the same package; collapse them.

### 3. Heal each failing package

For each unique failing package, in order of appearance:

#### 3.1 Query all available versions

| PM | Command | Notes |
|---|---|---|
| pnpm | `pnpm view <package> versions --json` | Returns an array of version strings |
| pnpm (time) | `pnpm view <package> time --json` | Returns `{ "1.0.0": "2024-01-01T...", ... }` |
| yarn | `yarn npm info <package> --json` | Extract the `versions` array |
| yarn (time) | `yarn npm info <package> --json` | Extract the `time` map |
| bun | `npm view <package> versions --json` | Bun has no dedicated `bun view`; delegate to npm (available everywhere) |
| bun (time) | `npm view <package> time --json` | Same fallback |
| npm | `npm view <package> versions --json` | — |
| npm (time) | `npm view <package> time --json` | — |

**Always query both `versions` and `time`** responses. The `time` map provides the publish timestamp for each version.

If a package has a registry endpoint that returns more than 250 versions, use the `--json` flag and parse accordingly. Deduplicate and sort versions descending (newest first) using semver sort. Use `node -e "const semver = require('semver'); console.log(versions.sort(semver.rcompare))"` if available, or sort manually via semver parsing.

#### 3.2 Filter by minimumReleaseAge

Compute the age cutoff as: `now - minimumReleaseAgeInSeconds`.

For each version in the `time` map, skip versions where:
- `time[version]` is missing (treat as passing only if the package manager's config says to ignore missing times — pnpm's `minimumReleaseAgeIgnoreMissingTime` defaults to `true`)
- `Date.parse(time[version]) > cutoff` (the version was published too recently)

**Exclude lists**: if a package name matches a pattern in the exclude/allow list, skip the age filter entirely for that package.

**Saturation (bun only)**: bun additionally checks if multiple versions were published close together just outside the age gate (a "burst" pattern). If so, it skips them and keeps searching up to 7 days past the gate. For other package managers, just apply the cutoff directly.

#### 3.3 Pick the candidate version

From the filtered list (sorted descending), select the **newest version that passes the age gate**. If no version passes, pick the oldest available version and log a warning.

#### 3.4 Downgrade in package.json

Find the `package.json` file that declares this dependency and change its version specifier to a **pinned exact version**:

```json
// Before
"some-package": "^3.4.1"

// After
"some-package": "3.3.0"
```

If the package appears in multiple `package.json` files (workspace members), update **all** of them. Use a precise string replacement in the JSON — do not reorder keys or reformat.

#### 3.5 Delete the lockfile

After modifying any `package.json`, delete the lockfile to force a clean resolve on the next run:

| PM | Lock file to delete |
|---|---|
| pnpm | `pnpm-lock.yaml` |
| yarn (v4) | `yarn.lock` |
| bun | `bun.lock` or `bun.lockb` |
| npm | `package-lock.json` |

Also delete `node_modules` **only on the final successful run**, or leave it to the next install. During the loop, deleting the lockfile is sufficient; the package manager will re-resolve.

### 4. Repeat

Go back to step 1 (`Run install`). The loop continues until:

- **Success** (`exit code 0`): stop and report.
- **No more packages to heal** (all failing packages are already at their oldest age-passing version): report the residual failures and stop.
- **`--max-retries N`** was passed and the loop has run N times: stop and report.

### 5. Report

When the loop ends, print a concise summary:

```markdown
## Install Healer Summary

**Package manager:** pnpm (via mise)
**Age gate:** 7200s (2h) from `pnpm-workspace.yaml`
**Retries:** 3

### Healed packages
| Package | Original | Downgraded to | Published |
|---------|----------|---------------|-----------|
| foo-lib | ^2.1.0 | 2.0.9 | 2026-06-14 |

### Residual failures (if any)
- `bar-utils` — no version passes age gate (newest is 1.0.0, published 30m ago)
```

## Edge Cases and Safety Guards

- **Never downgrade to a version that is disallowed by the original range**, unless the range uses `^`/`~`/`*`/`latest` and no range-satisfying version passes the age gate. In that case, widen to the next compatible range as a last resort.
- **Do not edit transitive dependencies** in `package.json` — they don't live there. Instead, use the package manager's override/resolutions mechanism (`pnpm.overrides`, `resolutions` in yarn/npm, or bunfig.toml overrides) to pin them.
- **Do not touch `packageManager`** field in `package.json`. Let the detected toolchain handle versioning.
- **If mise `exec_auto_install` is disabled**, the install will fail immediately. Check `mise settings get exec_auto_install` and suggest enabling it.
- **Safeguard count:** after 10 iterations without making forward progress (i.e., no versions changed), stop and ask the user whether to continue with more aggressive strategies.

## Strategies (progressive)

The loop uses three strategies in order. Start with strategy 0; advance to the next only when the current strategy produces no new version changes in an iteration.

0. **Downgrade direct dependencies only** — pin the top-level dependency in `package.json` to the newest age-passing version.
1. **Downgrade transitive dependencies** — use the package manager's `overrides` / `resolutions` field to pin transitive dependents that fail to resolve.
2. **Widen ranges** — if a range like `^2.0.0` has zero age-passing versions, widen to `>=1.0.0` and retry from the filtered candidate list.
3. **Global fallback** — if all packages are pinned to the oldest age-passing version and install still fails, report the failure as likely non-version-related (build script failure, native module compile error, etc.).

## Package-Manager-Specific Override Formats

### pnpm (`pnpm.overrides` in root `package.json`)
```json
{
  "pnpm": {
    "overrides": {
      "transitive-broken-lib": "2.3.1"
    }
  }
}
```

### yarn (`resolutions` in root `package.json`)
```json
{
  "resolutions": {
    "transitive-broken-lib": "2.3.1"
  }
}
```

### npm (`overrides` in root `package.json`)
```json
{
  "overrides": {
    "transitive-broken-lib": "2.3.1"
  }
}
```

### bun (`patchedDependencies` or `overrides` via `bunfig.toml`)
```toml
# bunfig.toml
[install.overrides]
"transitive-broken-lib" = "2.3.1"
```
