#!/usr/bin/env bash

set -Eeuo pipefail
IFS=$'\n\t'

required_node_major=20
required_node_minor=19

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"

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

ensure_macos() {
  [[ "$(uname -s)" == "Darwin" ]] || fail "This script is intended for macOS."
}

ensure_project_root() {
  cd "$ROOT_DIR"

  [[ -f package.json ]] || fail "package.json was not found in $ROOT_DIR."
  [[ -f vite.config.ts || -f vite.config.js || -f vite.config.mjs ]] || fail "Vite config was not found in $ROOT_DIR."
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

  brew install node || brew upgrade node
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

install_dependencies() {
  info "Installing project dependencies in $ROOT_DIR..."

  if [[ -f package-lock.json ]]; then
    if npm ci; then
      success "Dependencies installed with npm ci."
      return
    fi

    warn "npm ci failed. Retrying with npm install to recover from lockfile/platform differences..."
  fi

  npm install
  success "Dependencies installed."
}

ensure_dependencies_present() {
  [[ -d node_modules ]] || fail "node_modules is missing. Run: bash scripts/setup-macos.sh"
  [[ -x node_modules/.bin/vite ]] || fail "Vite is missing from node_modules. Run: bash scripts/setup-macos.sh"
  success "Project dependencies are ready."
}

start_dev_server() {
  local host="${HOST:-0.0.0.0}"
  local port="${PORT:-5173}"

  info "Starting Vite dev server from $ROOT_DIR..."
  info "Host: $host"
  info "Port: $port (Vite may choose the next free port if this one is busy.)"

  exec npm run dev -- --host "$host" --port "$port"
}
