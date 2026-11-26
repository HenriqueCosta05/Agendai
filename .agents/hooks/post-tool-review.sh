#!/usr/bin/env bash
# Shared post-write review: static check of the written file for security,
# NestJS, clean-code and design-pattern violations.
set -u
. "$(dirname "${BASH_SOURCE[0]}")/_env.sh"
input="$(cat)"
file="$(printf '%s' "$input" | jq -r '.tool_input.file_path // ""')"
cd "$PROJECT_DIR" || exit 0
rel="${file#"$PROJECT_DIR"/}"
case "$rel" in
  .agents/*|.claude/*|.opencode/*) exit 0 ;;
esac
[ -f "$file" ] || exit 0
command -v node >/dev/null 2>&1 || deny "Post-write review could not run: node not found."

findings="$(node scripts/review-best-practices.mjs "$file" 2>&1)"
status=$?
if [ $status -ne 0 ] && [ -n "$findings" ]; then
  deny "Best-practice review of $file found problems. Fix them now (see skills: cybersecurity, clean-code, nest, design-patterns):
$findings"
fi
exit 0
