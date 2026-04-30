#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=scripts/macos-common.sh
source "$SCRIPT_DIR/macos-common.sh"

main() {
  ensure_macos
  ensure_project_root
  ensure_homebrew
  ensure_node_installed
  ensure_npm_available
  install_dependencies
  start_dev_server
}

main "$@"
