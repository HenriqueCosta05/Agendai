#!/usr/bin/env bash
# Claude Code UserPromptSubmit adapter: blocks credentials via the shared scan, else asks for the prompt-gate skill.
set -u
shared="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.agents/hooks" && pwd)"
input="$(cat)"
decision="$(printf '%s' "$input" | "$shared/prompt-secret-scan.sh")"
if [ -n "$decision" ]; then
  printf '%s' "$decision"
  exit 0
fi

jq -n '{hookSpecificOutput:{hookEventName:"UserPromptSubmit",additionalContext:"MANDATORY: before doing anything else, invoke the `prompt-gate` skill with the Skill tool, follow it (understand the expectation, check for credentials/sensitive data, apply the NestJS/PostgreSQL/Docker guardrails), then proceed with the task."}}'
