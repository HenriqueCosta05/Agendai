#!/usr/bin/env bash
# Claude Code PostToolUse adapter for the shared review in .agents/hooks.
set -u
shared="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.agents/hooks" && pwd)"
file="$(jq -r '.tool_response.filePath // .tool_input.file_path // ""')"
jq -n --arg f "$file" '{tool_input:{file_path:$f}}' | "$shared/post-tool-review.sh"
