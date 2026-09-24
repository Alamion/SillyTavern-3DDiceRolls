#!/usr/bin/env sh
# Populates the git-ignored context/ folder with read-only reference sources.
# Shallow clones; re-running refreshes existing clones to the latest upstream commit.
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/context"
cd "$ROOT/context"

clone_or_update() {
    dir="$1"
    url="$2"
    branch="$3"
    if [ -d "$dir/.git" ]; then
        echo "Updating $dir"
        git -C "$dir" fetch --depth 1 origin "$branch"
        git -C "$dir" reset --hard FETCH_HEAD
    else
        echo "Cloning $dir"
        git clone --depth 1 --branch "$branch" "$url" "$dir"
    fi
}

clone_or_update SillyTavern https://github.com/SillyTavern/SillyTavern release
clone_or_update dice-box-threejs https://github.com/3d-dice/dice-box-threejs main
clone_or_update dice-roller https://github.com/javalent/dice-roller main
clone_or_update Extension-Dice https://github.com/SillyTavern/Extension-Dice main
