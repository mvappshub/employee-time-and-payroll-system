#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=scripts/macos-common.sh
source "$SCRIPT_DIR/macos-common.sh"

main() {
  parse_dev_args "$@"
  init_logging
  ensure_macos
  ensure_project_root
  ensure_node_available
  ensure_npm_available
  validate_package_scripts
  ensure_dependencies_present
  start_dev_server
}

main "$@"
