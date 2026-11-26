#!/usr/bin/env bash
# Claude Code PreToolUse adapter for the shared gate in .agents/hooks.
set -u
shared="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.agents/hooks" && pwd)"
decision="$(cat | "$shared/pre-tool-gate.sh")"
if [ -n "$decision" ]; then
  jq -n --arg r "$(printf '%s' "$decision" | jq -r '.reason')" '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
fi
exit 0
