#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

REPO_URL="${REPO_URL:-https://github.com/mvappshub/employee-time-and-payroll-system.git}"
BRANCH="${BRANCH:-main}"
TARGET_DIR="${TARGET_DIR:-$HOME/employee-time-and-payroll-system}"
SETUP_ARGS=()

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

print_help() {
  cat <<'EOF'
Usage: ./scripts/install-from-github-macos.sh [options] [-- setup-options]

Downloads this project from GitHub, installs macOS dependencies, installs npm
dependencies, and starts the Vite dev server.

Options:
  --dir <path>       Target directory. Default: ~/employee-time-and-payroll-system
  --branch <name>    Git branch/tag to download. Default: main
  --repo <url>       Git repository URL.
  --no-start         Pass --no-start to setup-macos.sh.
  --setup-clean      Pass --clean to setup-macos.sh.
  --help             Show this help.

Anything after -- is passed directly to scripts/setup-macos.sh.

Examples:
  ./scripts/install-from-github-macos.sh
  ./scripts/install-from-github-macos.sh --dir ~/Projects/payroll
  ./scripts/install-from-github-macos.sh --no-start
  ./scripts/install-from-github-macos.sh -- --clean

One-line install:
  curl -fsSL https://raw.githubusercontent.com/mvappshub/employee-time-and-payroll-system/main/scripts/install-from-github-macos.sh | bash
EOF
}

parse_args() {
  while (($#)); do
    case "$1" in
      --dir)
        [[ $# -ge 2 ]] || fail "--dir requires a path."
        TARGET_DIR="$2"
        shift
        ;;
      --branch)
        [[ $# -ge 2 ]] || fail "--branch requires a name."
        BRANCH="$2"
        shift
        ;;
      --repo)
        [[ $# -ge 2 ]] || fail "--repo requires a URL."
        REPO_URL="$2"
        shift
        ;;
      --no-start)
        SETUP_ARGS+=("--no-start")
        ;;
      --setup-clean)
        SETUP_ARGS+=("--clean")
        ;;
      --help|-h)
        print_help
        exit 0
        ;;
      --)
        shift
        SETUP_ARGS+=("$@")
        break
        ;;
      *)
        fail "Unknown option: $1"
        ;;
    esac
    shift
  done
}

ensure_macos() {
  [[ "$(uname -s)" == "Darwin" ]] || fail "This installer is intended for macOS."
}

ensure_network_available() {
  command -v curl >/dev/null 2>&1 || fail "curl is required to download the project."

  curl -fsSL --connect-timeout 10 https://github.com/ >/dev/null \
    || fail "Cannot reach GitHub. Check internet/VPN/proxy settings, then run this installer again."

  curl -fsSL --connect-timeout 10 https://raw.githubusercontent.com/ >/dev/null \
    || fail "Cannot reach raw.githubusercontent.com. The one-line installer or Homebrew download may be blocked."

  success "Network check passed."
}

normalize_target_dir() {
  local parent_dir

  case "$TARGET_DIR" in
    "~")
      TARGET_DIR="$HOME"
      ;;
    "~/"*)
      TARGET_DIR="$HOME/${TARGET_DIR#"~/"}"
      ;;
  esac

  parent_dir="$(dirname "$TARGET_DIR")"
  mkdir -p "$parent_dir"
  TARGET_DIR="$(cd "$parent_dir" && pwd -P)/$(basename "$TARGET_DIR")"
}

git_is_usable() {
  command -v git >/dev/null 2>&1 && git --version >/dev/null 2>&1
}

project_exists() {
  [[ -f "$TARGET_DIR/package.json" && -x "$TARGET_DIR/scripts/setup-macos.sh" ]]
}

update_existing_project() {
  info "Project already exists at $TARGET_DIR."

  if [[ ! -d "$TARGET_DIR/.git" ]]; then
    warn "Existing project is not a Git checkout. Leaving files as-is."
    return
  fi

  if ! git_is_usable; then
    warn "Git is not usable, so the existing checkout cannot be updated automatically."
    return
  fi

  (
    cd "$TARGET_DIR"

    local remote_url
    remote_url="$(git remote get-url origin 2>/dev/null || true)"
    if [[ "$remote_url" != "$REPO_URL" ]]; then
      warn "Existing checkout origin differs from installer repo. Leaving files as-is."
      warn "Origin: ${remote_url:-none}"
      return
    fi

    if [[ -n "$(git status --porcelain)" ]]; then
      warn "Existing checkout has local changes. Skipping git pull to avoid overwriting work."
      return
    fi

    info "Updating existing checkout from origin/$BRANCH..."
    git fetch origin "$BRANCH"
    git checkout "$BRANCH"
    git pull --ff-only origin "$BRANCH"
  )
}

clone_with_git() {
  info "Cloning project with Git into $TARGET_DIR..."
  git clone --branch "$BRANCH" --single-branch "$REPO_URL" "$TARGET_DIR"
}

github_archive_url() {
  local repo_path
  repo_path="${REPO_URL#https://github.com/}"
  repo_path="${repo_path%.git}"
  printf 'https://github.com/%s/archive/refs/heads/%s.zip' "$repo_path" "$BRANCH"
}

download_with_zip() {
  local tmp_dir archive extracted_dir archive_url

  command -v unzip >/dev/null 2>&1 || fail "unzip is required when Git is unavailable."

  tmp_dir="$(mktemp -d)"
  archive="$tmp_dir/project.zip"
  archive_url="$(github_archive_url)"

  info "Git is not usable. Downloading project ZIP instead..."
  info "URL: $archive_url"
  curl -fL --retry 3 --connect-timeout 15 "$archive_url" -o "$archive"
  unzip -q "$archive" -d "$tmp_dir"

  extracted_dir="$(find "$tmp_dir" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
  [[ -n "$extracted_dir" ]] || fail "Downloaded ZIP did not contain a project directory."

  mv "$extracted_dir" "$TARGET_DIR"
}

download_project() {
  mkdir -p "$(dirname "$TARGET_DIR")"

  if [[ -e "$TARGET_DIR" ]]; then
    project_exists || fail "Target path exists but does not look like this project: $TARGET_DIR"
    update_existing_project
    return
  fi

  if git_is_usable; then
    clone_with_git
  else
    download_with_zip
  fi

  chmod +x "$TARGET_DIR"/scripts/*.sh
  success "Project is ready at $TARGET_DIR."
}

run_project_setup() {
  local setup_script="$TARGET_DIR/scripts/setup-macos.sh"

  [[ -x "$setup_script" ]] || fail "Setup script is missing or not executable: $setup_script"

  info "Running project setup..."
  exec "$setup_script" "${SETUP_ARGS[@]}"
}

main() {
  parse_args "$@"
  ensure_macos
  ensure_network_available
  normalize_target_dir
  download_project
  run_project_setup
}

main "$@"
