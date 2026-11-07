#!/usr/bin/env bash
# Daily sync for the zh-tw edition of doggy8088/HowToLiveBetter.
#
#   scripts/zh-tw/sync.sh
#
# - main on the fork is a pure mirror of upstream
#   (eternity4719/HowToLiveBetter) main.
# - zh-tw is fully regenerated from the upstream tree by the pipeline in
#   this directory whenever upstream moves: convert (OpenCC cn->tw2 plus
#   the Taiwan vocabulary rules), regenerate the text-bearing images,
#   then the quality gate (check.mjs: script purity, vocabulary,
#   idempotence, links, and the repository's own consistency tools).
#   Only a green gate is committed and pushed.
# - With no upstream change the script prints one line and exits 0.
#
# Tools (override by environment):
#   OPENCC  opencc-cli binary   (default: the copy in the work dir)
#   CHROME  chromium binary     (default: the copy in the work dir)
set -euo pipefail
cd "$(dirname "$0")/../.."

WORK_TOOLS="$HOME/workspace/howtolivebetter-work/tools"
export OPENCC="${OPENCC:-$WORK_TOOLS/opencc-cli/opencc-cli}"
export CHROME="${CHROME:-$WORK_TOOLS/chromium/chromium}"
[ -x "$OPENCC" ] || { echo "sync: opencc-cli not found at $OPENCC" >&2; exit 1; }
[ -x "$CHROME" ] || { echo "sync: chromium not found at $CHROME" >&2; exit 1; }

if [ -n "$(git status --porcelain)" ]; then
  echo "sync: working tree is not clean; refusing to run" >&2
  exit 1
fi
[ "$(git branch --show-current)" = "zh-tw" ] || git checkout zh-tw

git fetch upstream main
git fetch origin main zh-tw 2>/dev/null || git fetch origin main
UP="$(git rev-parse upstream/main)"

# Mirror main := upstream/main on the fork (and the local ref).
if [ "$(git rev-parse origin/main)" != "$UP" ]; then
  git push origin "$UP:refs/heads/main" --force-with-lease="main:$(git rev-parse origin/main)"
  echo "sync: main mirrored to upstream ${UP:0:7}"
fi
git update-ref refs/heads/main "$UP"

BASE="$(cat scripts/zh-tw/.base-sha 2>/dev/null || echo none)"
if [ "$BASE" = "$UP" ]; then
  echo "sync: no upstream changes (${UP:0:7})"
  exit 0
fi

# Regenerate zh-tw from the upstream tree. scripts/zh-tw is the only
# content that exists solely on this branch; set it aside while the
# tree is reset to upstream.
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
# NOTE: /tmp is a tmpfs mounted with uid/gid mapping, so `cp -a` fails with
# "failed to preserve ownership: Operation not permitted" when copying back
# into the workspace. Ownership is irrelevant here (git tracks no ownership),
# so skip it; modes/timestamps are still preserved.
cp -a --no-preserve=ownership scripts/zh-tw "$TMP/zh-tw"
git read-tree --reset -u "$UP"
rm -rf scripts/zh-tw
mkdir -p scripts
cp -a --no-preserve=ownership "$TMP/zh-tw" scripts/zh-tw

node scripts/zh-tw/convert.mjs
node scripts/zh-tw/regen-images.mjs
node scripts/zh-tw/check.mjs

echo "$UP" > scripts/zh-tw/.base-sha
git add -A
if git diff --cached --quiet; then
  echo "sync: upstream changed but the zh-tw output is identical; nothing to push"
  exit 0
fi
git commit -q -m "zh-tw: 同步上游 ${UP:0:7} 並重產繁體中文版

由 scripts/zh-tw 管線自動生成：OpenCC cn→tw2＋台灣用詞校訂、檔名繁化、
圖片重出，通過 check.mjs 品質閘門與 repo 既有檢查工具。

Assisted-by: Muse"
git push origin zh-tw
echo "sync: zh-tw updated to upstream ${UP:0:7} and pushed"
