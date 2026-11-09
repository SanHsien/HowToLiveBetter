from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

TOOLS_DIR = Path(__file__).resolve().parent
if str(TOOLS_DIR) not in sys.path:
    sys.path.insert(0, str(TOOLS_DIR))

import check_links  # noqa: E402


class CheckLinksTests(unittest.TestCase):
    def test_missing_relative_link_detected(self) -> None:
        with tempfile.TemporaryDirectory(dir=TOOLS_DIR) as tmpdir:
            tmppath = Path(tmpdir)
            md_file = tmppath / "test.md"
            md_file.write_text("See [missing](non_existent_file.md)", encoding="utf-8")
            missing = check_links._missing_relative(md_file, "non_existent_file.md", root=tmppath)
            self.assertIsNotNone(missing)
            self.assertIn("找不到", missing)

    def test_existing_relative_link_passes(self) -> None:
        with tempfile.TemporaryDirectory(dir=TOOLS_DIR) as tmpdir:
            tmppath = Path(tmpdir)
            target = tmppath / "target.md"
            target.write_text("# Target", encoding="utf-8")
            md_file = tmppath / "test.md"
            md_file.write_text("See [target](target.md)", encoding="utf-8")
            missing = check_links._missing_relative(md_file, "target.md", root=tmppath)
            self.assertIsNone(missing)

    def test_escaped_repo_link_detected(self) -> None:
        with tempfile.TemporaryDirectory(dir=TOOLS_DIR) as tmpdir:
            tmppath = Path(tmpdir)
            md_file = tmppath / "test.md"
            missing = check_links._missing_relative(md_file, "../outside.md", root=tmppath)
            self.assertIsNotNone(missing)
            self.assertIn("逃出 repo 根目錄", missing)

    def test_skip_prefixes(self) -> None:
        p = Path("test.md")
        self.assertIsNone(check_links._missing_relative(p, "https://example.com"))
        self.assertIsNone(check_links._missing_relative(p, "http://example.com"))
        self.assertIsNone(check_links._missing_relative(p, "mailto:user@example.com"))
        self.assertIsNone(check_links._missing_relative(p, "#section-anchor"))
        self.assertIsNone(check_links._missing_relative(p, "file:///C:/path/file.md"))
