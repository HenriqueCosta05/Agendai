#!/usr/bin/env bash
# OpenCode adapter: runs the shared pre-write gate in .agents/hooks.
exec "$(dirname "${BASH_SOURCE[0]}")/../../.agents/hooks/pre-tool-gate.sh"
