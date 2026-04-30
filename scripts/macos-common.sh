#!/usr/bin/env bash

set -Eeuo pipefail
IFS=$'\n\t'

required_node_major=20
required_node_minor=19

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
LOG_DIR="$ROOT_DIR/.logs"
LOG_FILE="${LOG_FILE:-$LOG_DIR/dev-macos.log}"
DEFAULT_HOST="0.0.0.0"
DEFAULT_PORT="5173"
CLEAN_INSTALL=false
START_AFTER_SETUP=true
INSTALL_IF_MISSING=false

on_error() {
  local exit_code=$?
  warn "Script failed on line ${BASH_LINENO[0]} with exit code $exit_code."
  warn "Log file: $LOG_FILE"
  exit "$exit_code"
}

trap on_error ERR

info() {
  printf '\033[1;34m%s\033[0m\n' "$1"
}

success() {
  printf '\033[1;32m%s\033[0m\n' "$1"
}

warn() {
  printf '\033[1;33m%s\033[0m\n' "$1"
}

fail() {
  printf '\033[1;31m%s\033[0m\n' "$1" >&2
  exit 1
}

init_logging() {
  mkdir -p "$LOG_DIR"
  touch "$LOG_FILE" || fail "Cannot write log file: $LOG_FILE"
  exec > >(tee -a "$LOG_FILE") 2>&1
  info "Logging to $LOG_FILE"
}

print_setup_help() {
  cat <<'EOF'
Usage: ./scripts/setup-macos.sh [options]

Installs everything needed on macOS and starts the Vite dev server.

Options:
  --clean       Remove node_modules before installing dependencies.
  --no-start    Install dependencies only; do not start the dev server.
  --help        Show this help.

Environment:
  HOST          Dev server host. Default: 0.0.0.0
  PORT          Preferred dev server port. Default: 5173
  LOG_FILE      Log file path. Default: .logs/dev-macos.log
EOF
}

print_dev_help() {
  cat <<'EOF'
Usage: ./scripts/dev-macos.sh [options]

Starts the Vite dev server on macOS without installing system dependencies.

Options:
  --install-if-missing   Run npm install if node_modules or Vite is missing.
  --help                 Show this help.

Environment:
  HOST          Dev server host. Default: 0.0.0.0
  PORT          Preferred dev server port. Default: 5173
  LOG_FILE      Log file path. Default: .logs/dev-macos.log
EOF
}

parse_setup_args() {
  while (($#)); do
    case "$1" in
      --clean)
        CLEAN_INSTALL=true
        ;;
      --no-start)
        START_AFTER_SETUP=false
        ;;
      --help|-h)
        print_setup_help
        exit 0
        ;;
      *)
        fail "Unknown option for setup-macos.sh: $1"
        ;;
    esac
    shift
  done
}

parse_dev_args() {
  while (($#)); do
    case "$1" in
      --install-if-missing)
        INSTALL_IF_MISSING=true
        ;;
      --help|-h)
        print_dev_help
        exit 0
        ;;
      *)
        fail "Unknown option for dev-macos.sh: $1"
        ;;
    esac
    shift
  done
}

ensure_macos() {
  [[ "$(uname -s)" == "Darwin" ]] || fail "This script is intended for macOS."
}

ensure_project_root() {
  cd "$ROOT_DIR"

  [[ -f package.json ]] || fail "package.json was not found in $ROOT_DIR."
  [[ -f vite.config.ts || -f vite.config.js || -f vite.config.mjs ]] || fail "Vite config was not found in $ROOT_DIR."
  success "Project root is ready: $ROOT_DIR"
}

ensure_command_line_tools() {
  if xcode-select -p >/dev/null 2>&1; then
    success "Xcode Command Line Tools are ready."
    return
  fi

  warn "Xcode Command Line Tools are missing."
  info "Opening the macOS installer prompt..."
  xcode-select --install || true
  fail "Install Xcode Command Line Tools, then run this script again."
}

ensure_network_available() {
  command -v curl >/dev/null 2>&1 || fail "curl is required for network checks."

  if curl -fsSL --connect-timeout 10 https://registry.npmjs.org/ >/dev/null; then
    success "Network check passed."
    return
  fi

  fail "Cannot reach npm registry. Check internet/VPN/proxy settings, then run the script again."
}

load_homebrew_path() {
  if [[ -x /opt/homebrew/bin/brew ]]; then
    eval "$(/opt/homebrew/bin/brew shellenv)"
  elif [[ -x /usr/local/bin/brew ]]; then
    eval "$(/usr/local/bin/brew shellenv)"
  fi
}

ensure_homebrew() {
  load_homebrew_path

  if command -v brew >/dev/null 2>&1; then
    success "Homebrew is ready: $(brew --version | head -n 1)"
    return
  fi

  command -v curl >/dev/null 2>&1 || fail "curl is required to install Homebrew."

  info "Homebrew is not installed. Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  load_homebrew_path

  command -v brew >/dev/null 2>&1 || fail "Homebrew installation finished, but brew is still not available in PATH. Open a new terminal and run the script again."
  success "Homebrew is ready: $(brew --version | head -n 1)"
}

node_version_ok() {
  local version major minor

  command -v node >/dev/null 2>&1 || return 1

  version="$(node -p "process.versions.node")"
  major="${version%%.*}"
  minor="${version#*.}"
  minor="${minor%%.*}"

  if (( major > required_node_major )); then
    return 0
  fi

  if (( major == required_node_major && minor >= required_node_minor )); then
    return 0
  fi

  return 1
}

node_required_text() {
  printf 'Node.js %s.%s+' "$required_node_major" "$required_node_minor"
}

ensure_node_installed() {
  if node_version_ok; then
    success "Node is ready: $(node -v)"
    return
  fi

  warn "$(node_required_text) is required for this Vite project."
  info "Installing/upgrading Node.js with Homebrew..."

  brew update
  brew upgrade node || brew install node
  brew link --overwrite node >/dev/null 2>&1 || true

  if ! node_version_ok; then
    fail "Node.js is installed, but the active version is still too old. Open a new terminal and run the script again."
  fi

  success "Node is ready: $(node -v)"
}

ensure_node_available() {
  load_homebrew_path

  if ! command -v node >/dev/null 2>&1; then
    fail "Node.js is not installed. Run: bash scripts/setup-macos.sh"
  fi

  if ! node_version_ok; then
    fail "Found Node $(node -v), but $(node_required_text) is required. Run: bash scripts/setup-macos.sh"
  fi

  success "Node is ready: $(node -v)"
}

ensure_npm_available() {
  command -v npm >/dev/null 2>&1 || fail "npm is not available. Reinstall Node.js with: bash scripts/setup-macos.sh"
  success "npm is ready: $(npm -v)"
}

validate_package_scripts() {
  node -e "const p=require('./package.json'); if (!p.scripts || !p.scripts.dev) process.exit(1)" \
    || fail "package.json does not define scripts.dev."
  success "package.json scripts are ready."
}

install_dependencies() {
  info "Installing project dependencies in $ROOT_DIR..."

  if [[ "$CLEAN_INSTALL" == true && -d node_modules ]]; then
    warn "Removing node_modules because --clean was provided."
    rm -rf node_modules
  fi

  npm cache verify || warn "npm cache verification failed; continuing."

  if [[ -f package-lock.json ]]; then
    if npm ci; then
      success "Dependencies installed with npm ci."
      return
    fi

    warn "npm ci failed. Retrying with npm install to recover from lockfile/platform differences..."
    rm -rf node_modules
  fi

  npm install
  success "Dependencies installed."
}

ensure_dependencies_present() {
  if [[ -d node_modules && -x node_modules/.bin/vite ]]; then
    success "Project dependencies are ready."
    return
  fi

  if [[ "$INSTALL_IF_MISSING" == true ]]; then
    warn "Dependencies are missing. Installing because --install-if-missing was provided."
    install_dependencies
    return
  fi

  [[ -d node_modules ]] || fail "node_modules is missing. Run: bash scripts/setup-macos.sh"
  [[ -x node_modules/.bin/vite ]] || fail "Vite is missing from node_modules. Run: bash scripts/setup-macos.sh"
  success "Project dependencies are ready."
}

port_is_free() {
  local port="$1"

  if command -v lsof >/dev/null 2>&1; then
    ! lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
    return
  fi

  if command -v nc >/dev/null 2>&1; then
    ! nc -z 127.0.0.1 "$port" >/dev/null 2>&1
    return
  fi

  return 0
}

choose_port() {
  local preferred="$1"
  local port="$preferred"
  local max_port=$((preferred + 20))

  while (( port <= max_port )); do
    if port_is_free "$port"; then
      printf '%s' "$port"
      return
    fi
    port=$((port + 1))
  done

  fail "No free port found between $preferred and $max_port."
}

start_dev_server() {
  local host="${HOST:-$DEFAULT_HOST}"
  local requested_port="${PORT:-$DEFAULT_PORT}"
  local port

  [[ "$requested_port" =~ ^[0-9]+$ ]] || fail "PORT must be a number, got: $requested_port"
  port="$(choose_port "$requested_port")"

  info "Starting Vite dev server from $ROOT_DIR..."
  info "Host: $host"
  info "Port: $port"

  exec npm run dev -- --host "$host" --port "$port"
}
