#!/usr/bin/env bash
# Backward-compatible launcher. The old 3.21.0 deploy helper is intentionally
# redirected to the version-agnostic stable-alias deploy flow.
set -euo pipefail
exec bash "$(dirname "$0")/DEPLOY-PWA-STABLE.sh"
