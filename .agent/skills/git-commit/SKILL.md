---
name: git-commit
description: Manage and create Git and GitHub commits following the project's commit convention (<type>(<branchName>): <description>). Supports standard conventional types (fix, feat, chore, docs, style, refactor, perf, test) as well as OpenSpec workflows (proposal, archive). Use when staging, committing changes, or writing commit messages.
---

# Git Commit Convention Skill

This skill guides the creation of Git and GitHub commits adhering to this project's commit standards and OpenSpec workflow conventions.

---

## Commit Message Format

```text
<type>(<branchName>): <description>
```

### Components

1. **`<type>`**: The category of change (in lowercase).
2. **`(<branchName>)`**: The target branch identifier enclosed in parentheses, placed immediately before the colon `:`.
3. **`: `**: Colon followed by a single space.
4. **`<description>`**: A concise summary of the change in imperative mood.

---

## Allowed Keywords / Types

| Keyword | Description & When to Use | Example |
| :--- | :--- | :--- |
| **`fix`** | Bug fixes or resolving defects in application logic. | `fix(auth): Fix token expiration handling` |
| **`feat`** | New features or functional enhancements. | `feat(secretsEnv): Add secret helper and configure secrets` |
| **`chore`** | Routine tasks, build configurations, dependency upgrades, tooling. | `chore(docker): Update base image and Dockerfile configs` |
| **`docs`** | Documentation-only updates (markdown files, docstrings, README). | `docs(readme): Update local development setup instructions` |
| **`style`** | Code style, indentation, whitespace, semicolons (no logic change). | `style(controllers): Format response formatting and spacing` |
| **`refactor`** | Code refactoring that neither fixes a bug nor adds a feature. | `refactor(db): Consolidate database connection pooling` |
| **`perf`** | Code changes specifically aimed at improving performance. | `perf(queries): Add indexes for faster invoice search` |
| **`test`** | Adding, updating, or correcting unit/integration tests. | `test(sessions): Add test suite for session storage` |
| **`proposal`** | **OpenSpec Proposal**: Used when creating a new proposal with OpenSpec (e.g. `openspec new change`). **Crucial**: If subsequent changes or updates are made to the proposal or its artifacts (`proposal.md`, `specs/`, `design.md`, `tasks.md`), **continue using `proposal`**. | `proposal(secretsEnv): Create proposal for secrets configuration`<br>`proposal(secretsEnv): Update tasks and migration steps` |
| **`archive`** | **OpenSpec Archive**: Used after archiving a completed feature using OpenSpec (e.g. after moving the change to archive and synchronizing specs). | `archive(secretsEnv): Add secret helper and configure secrets`<br>`archive(gcsStorage): Create helper and add to docker config` |

---

## Deriving `<branchName>` Scope

The scope between parentheses must match the current feature/working branch:

1. **Retrieve current branch**:
   ```bash
   git branch --show-current
   ```
2. **Sanitize prefix**:
   If the branch has a category prefix (e.g., `feature/`, `features/`, `fix/`, `bugfix/`, `chore/`, `epic/`, `hotfix/`), strip the prefix to obtain the core branch name.
   - `feature/secretsEnv` &rarr; `secretsEnv` &rarr; `feat(secretsEnv): ...`
   - `features/migrateToCloudRun` &rarr; `migrateToCloudRun` &rarr; `feat(migrateToCloudRun): ...`
   - `feature/dbSessions` &rarr; `dbSessions` &rarr; `archive(dbSessions): ...`
   - `03-gcs-storage-mount` &rarr; `gcsStorage` (or `03-gcs-storage-mount`)
   - `main` &rarr; `main` (or specific component if on main)

---

## Step-by-Step Commit Workflow

### Step 1: Review Changes & Clean Status
Check modified, untracked, and staged files:
```bash
git status -s
```
> [!CAUTION]
> Always verify that sensitive credentials or unwanted environment files (e.g., `.env`, `gcp-key.json`, database dumps, `.DS_Store`) are **never** staged or committed.

### Step 2: Determine Branch & Scope
```bash
BRANCH=$(git branch --show-current | sed -E 's/^(features?|bugfix|fix|chore|epic|hotfix)\///')
```

### Step 3: Determine Commit Type
- **OpenSpec Proposal**: Are you creating or editing proposal artifacts (`openspec/changes/...`)? &rarr; Use **`proposal`**.
- **OpenSpec Archive**: Did you just complete archiving a change (`openspec archive` or moving to `archive/` & syncing specs)? &rarr; Use **`archive`**.
- **Implementation**: Is this a feature (`feat`), fix (`fix`), chore (`chore`), refactor (`refactor`), etc.? &rarr; Choose accordingly.

### Step 4: Stage Files
Stage only intended files:
```bash
git add <path/to/files>
```

### Step 5: Execute Commit
Formulate and execute the commit command:
```bash
git commit -m "<type>(<branchName>): <description>"
```

Alternatively, use the helper script:
```bash
./.agent/skills/git-commit/scripts/commit.sh <type> "<description>" [<branchName>]
```

### Step 6: Verify Commit
Check the commit message and file diff:
```bash
git log -1 --stat
```

---

## Real Project Examples

```text
# OpenSpec Proposal Creation
proposal(secretsEnv): Create proposal for secrets configuration

# OpenSpec Proposal Update (keep using proposal keyword)
proposal(secretsEnv): Update database schema and task breakdown

# Development Commits
feat(secretsEnv): Add secret helper and configure secrets
refactor(secretsEnv): Refactor env parser to support Cloud Secret Manager
fix(secretsEnv): Fix missing secret key fallback

# OpenSpec Feature Archive
archive(secretsEnv): Add secret helper and configure secrets
archive(gcsStorage): Create helper and add to docker config
archive(dbSessions): Create db sessions and seed chunks
```
