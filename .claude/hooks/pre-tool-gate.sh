#!/usr/bin/env bash
# PreToolUse (Write|Edit|MultiEdit): nothing is written unless the codebase is healthy
# (lint, typecheck, tests, complexity, comment budget) and the incoming content
# does not add comments longer than 2 lines.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/_env.sh"
input="$(cat)"
file="$(printf '%s' "$input" | jq -r '.tool_input.file_path // ""')"
cd "$PROJECT_DIR" || deny "Gate: cannot enter project dir."
rel="${file#"$PROJECT_DIR"/}"

# Docs, tooling and config stay editable so a broken gate can always be repaired.
case "$rel" in
  docs/*|*.md|.claude/*|.gitignore|.env.example|package.json|package-lock.json|tsconfig.json|eslint.config.*|vitest.config.*|scripts/*)
    exit 0 ;;
esac

command -v node >/dev/null 2>&1 && node -v >/dev/null 2>&1 || deny "Gate: a working node was not found in PATH; lint/typecheck/tests cannot run."
[ -d node_modules ] || deny "Gate: node_modules missing; run npm install."

# Content check on what is about to be written.
if comment_out="$(printf '%s' "$input" | node scripts/check-comments.mjs --stdin "$rel" 2>&1)"; then :; else
  deny "Comment rule: $comment_out"
fi

run() { # name, command...
  local name="$1" out; shift
  if ! out="$("$@" 2>&1)"; then
    # Allow the edit when it touches a file the failure points at (that is the fix).
    if [ -n "$rel" ] && printf '%s' "$out" | grep -qF "$rel"; then return 0; fi
    deny "Quality gate failed at '$name'. Fix this before writing other files:
$(printf '%s' "$out" | tail -n 40)"
  fi
}

run lint        npx --no-install eslint .
run typecheck   npx --no-install tsc --noEmit -p tsconfig.json
run tests       npx --no-install vitest run --passWithNoTests
run complexity  node scripts/check-complexity.mjs
run comments    node scripts/check-comments.mjs
exit 0
