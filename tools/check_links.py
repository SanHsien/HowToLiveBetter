#!/usr/bin/env python3
"""檢查維護文件之間的相對連結。

本 fork 的公開入口與維護文件互相連來連去：README、FORK、NOTICE、AGENTS、ROADMAP、
SECURITY、CONTRIBUTING 與 docs/{DECISIONS,DEVELOPMENT,UPSTREAM}.md。
文件被重新定位或改名時，這些連結會靜靜斷掉。只驗相對連結；外部網址交給人看。
不掃 book/、docs/核實記錄/、tools/、scripts/：那些是上游產品書籍內容。

    python tools/check_links.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parent.parent
LINK_PATTERN = re.compile(r"\[[^\]]*\]\(([^)]+)\)")
IMAGE_PATTERN = re.compile(r"!\[[^\]]*\]\(([^)]+)\)")
HTML_SRC_PATTERN = re.compile(r"""(?is)<img[^>]+src=["']([^"']+)["']""")
SKIP_PREFIXES = ("http://", "https://", "mailto:", "tel:", "#", "file://")

SKIP_NAMES = {
    "CLAUDE.md",
    "upstream-review-report.md",
    "upstream-root-review-report.md",
    "dependency-freshness-report.md",
}

FORK_MAINTENANCE_DOCS = {
    "DECISIONS.md",
    "DEVELOPMENT.md",
    "UPSTREAM.md",
}


def iter_documents() -> list[Path]:
    documents = []
    # 根目錄所有維護 md
    documents.extend(ROOT.glob("*.md"))
    # docs 下專屬於 fork 維護的文件
    for name in FORK_MAINTENANCE_DOCS:
        p = ROOT / "docs" / name
        if p.is_file():
            documents.append(p)
    # .github 與 .cursor 下的維護文件
    github = ROOT / ".github"
    if github.is_dir():
        documents.extend(github.rglob("*.md"))
    cursor = ROOT / ".cursor"
    if cursor.is_dir():
        documents.extend(cursor.rglob("*.mdc"))
    return sorted(path for path in documents if path.is_file() and path.name not in SKIP_NAMES)


def _missing_relative(path: Path, target: str, root: Path = ROOT) -> str | None:
    target = target.strip()
    if target.startswith("<"):
        target = target[1:].split(">", 1)[0]
    else:
        # `[text](path "title")`: the title is not part of the target.
        target = target.split(None, 1)[0] if target else ""
    if not target or target.startswith(SKIP_PREFIXES):
        return None
    file_part = unquote(target.split("#", 1)[0])
    if not file_part:
        return None
    resolved = (path.parent / file_part).resolve()
    root_resolved = root.resolve()
    try:
        resolved.relative_to(root_resolved)
    except ValueError:
        return f"{target} → 連結逃出 repo 根目錄"
    if resolved.exists():
        return None
    try:
        shown = resolved.relative_to(root_resolved)
    except ValueError:
        shown = resolved
    return f"{target} → 找不到 {shown}"


def check_document(path: Path) -> list[str]:
    problems: list[str] = []
    text = path.read_text(encoding="utf-8")
    for pattern in (LINK_PATTERN, IMAGE_PATTERN, HTML_SRC_PATTERN):
        for match in pattern.finditer(text):
            missing = _missing_relative(path, match.group(1))
            if missing:
                problems.append(missing)
    return problems


def main() -> int:
    documents = iter_documents()
    if not documents:
        print("找不到任何維護用 Markdown 檔")
        return 1

    failures = 0
    for path in documents:
        problems = check_document(path)
        rel = path.relative_to(ROOT)
        if problems:
            failures += 1
            for problem in problems:
                print(f"FAIL {rel}: {problem}")
        else:
            print(f"OK   {rel}")

    print(f"\n共 {len(documents)} 份維護文件，{failures} 份有缺檔。")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
