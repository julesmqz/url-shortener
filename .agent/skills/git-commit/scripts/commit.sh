#!/usr/bin/env bash
set -e

# Allowed commit types
VALID_TYPES="fix feat chore docs style refactor perf test archive proposal"

# Helper function to check if type is valid
is_valid_type() {
  local check_type="$1"
  for t in $VALID_TYPES; do
    if [ "$t" = "$check_type" ]; then
      return 0
    fi
  done
  return 1
}

# Auto-detect branch name and sanitize scope
detect_branch_scope() {
  local full_branch
  full_branch=$(git branch --show-current 2>/dev/null || git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
  
  if [ -z "$full_branch" ]; then
    echo "main"
    return
  fi

  # Strip prefix like feature/, features/, fix/, bugfix/, chore/, epic/, hotfix/
  local clean_branch="$full_branch"
  clean_branch="${clean_branch#feature/}"
  clean_branch="${clean_branch#features/}"
  clean_branch="${clean_branch#fix/}"
  clean_branch="${clean_branch#bugfix/}"
  clean_branch="${clean_branch#chore/}"
  clean_branch="${clean_branch#epic/}"
  clean_branch="${clean_branch#hotfix/}"

  echo "$clean_branch"
}

TYPE="$1"
DESCRIPTION="$2"
BRANCH_SCOPE="${3:-}"

if [ -z "$TYPE" ] || [ -z "$DESCRIPTION" ]; then
  echo "Usage: $0 <type> <description> [branchName] [files...]\"\n  echo \"\"\n  echo \"Allowed types:\"\n  echo \"  fix, feat, chore, docs, style, refactor, perf, test\"\n  echo \"  proposal  (Use when creating or updating OpenSpec proposals)\"\n  echo \"  archive   (Use after archiving a feature with OpenSpec)\"\n  echo \"\"\n  echo \"Format:\"\n  echo \"  <type>(<branchName>): <description>\"\n  echo \"\"\n  echo \"Examples:\"\n  echo \"  $0 feat \\\"Add secret helper and configure secrets\\\"\"\n  echo \"  $0 proposal \\\"Initial proposal for dbSessions\\\"\"\n  echo \"  $0 archive \\\"Finalize migration and sync specs\\\"\""
  exit 1
fi

if ! is_valid_type "$TYPE"; then
  echo "Error: Invalid commit type '$TYPE'."
  echo "Allowed types: $VALID_TYPES"
  exit 1
fi

if [ -z "$BRANCH_SCOPE" ]; then
  BRANCH_SCOPE=$(detect_branch_scope)
fi

# Shift the first 3 positional parameters if present to see if extra files were passed
if [ $# -ge 3 ]; then
  shift 3
else
  shift $#
fi

if [ $# -gt 0 ]; then
  git add "$@"
fi

# Check if anything is staged
if git diff --cached --quiet; then
  echo "Warning: No staged changes found to commit."
  echo "Please stage files using 'git add <files>' before running this script."
  exit 1
fi

COMMIT_MSG="${TYPE}(${BRANCH_SCOPE}): ${DESCRIPTION}"
echo "Committing: \"$COMMIT_MSG\""
git commit -m "$COMMIT_MSG"
