#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
# shellcheck source=scripts/macos-common.sh
source "$SCRIPT_DIR/macos-common.sh"

main() {
  parse_setup_args "$@"
  init_logging
  ensure_macos
  ensure_project_root
  ensure_network_available
  ensure_command_line_tools
  ensure_homebrew
  ensure_node_installed
  ensure_npm_available
  validate_package_scripts
  install_dependencies

  if [[ "$START_AFTER_SETUP" == true ]]; then
    start_dev_server
  fi

  success "Setup completed."
}

main "$@"
