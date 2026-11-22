#!/usr/bin/env bash
# PostToolUse (Write|Edit|MultiEdit): static review of the written file for
# cybersecurity, NestJS, clean-code and design-pattern violations.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/_env.sh"
input="$(cat)"
file="$(printf '%s' "$input" | jq -r '.tool_response.filePath // .tool_input.file_path // ""')"
cd "$PROJECT_DIR" || exit 0
[ -f "$file" ] || exit 0
command -v node >/dev/null 2>&1 || { jq -n '{decision:"block",reason:"Post-write review could not run: node not found."}'; exit 0; }

findings="$(node scripts/review-best-practices.mjs "$file" 2>&1)"
status=$?
if [ $status -ne 0 ] && [ -n "$findings" ]; then
  jq -n --arg r "Best-practice review of $file found problems. Fix them now (see skills: cybersecurity, clean-code, nest, design-patterns):
$findings" '{decision:"block",reason:$r}'
fi
exit 0
