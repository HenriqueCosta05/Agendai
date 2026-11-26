#!/usr/bin/env bash
# OpenCode adapter: runs the shared prompt secret scan in .agents/hooks.
exec "$(dirname "${BASH_SOURCE[0]}")/../../.agents/hooks/prompt-secret-scan.sh"
