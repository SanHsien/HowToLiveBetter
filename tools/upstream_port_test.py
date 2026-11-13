"""Guard the filename conversion and offline skill package imported from upstream."""

import subprocess
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def node_eval(source: str) -> None:
    subprocess.run(["node", "--input-type=module", "-e", source], cwd=ROOT, check=True)


def test_filename_protection_normalizes_both_spellings_without_second_pass_drift() -> None:
    node_eval(r"""
import assert from 'node:assert/strict';
import {protect, restore} from './scripts/zh-tw/vocab.mjs';
for (const input of ['中文文件名', '中文檔名']) {
  assert.equal(protect(input), '中文\u0001FILENAME\u0001');
  const output = restore(protect(input));
  assert.equal(output, '中文檔名');
  assert.equal(restore(protect(output)), output);
}
""")


def test_zip_unix_metadata_preserves_utf8_names_and_default_epub_compatibility() -> None:
    node_eval(r"""
import assert from 'node:assert/strict';
import {zip} from './tools/lib/zip.mjs';
const files = [{name:'中文檔名.md', data:Buffer.from('正文'), store:true}];
for (const unix of [false, true]) {
  const buf = zip(files, new Date(2026, 0, 1), {unix});
  const central = buf.readUInt32LE(buf.length - 6);
  assert.equal(buf.readUInt16LE(central + 4), unix ? 788 : 20);
  assert.equal(buf.readUInt16LE(central + 8), 0x0800);
  assert.equal(buf.readUInt32LE(central + 38), unix ? (0o100644 << 16) >>> 0 : 0);
  assert.equal(buf.subarray(30, 30 + buf.readUInt16LE(26)).toString(), '中文檔名.md');
  assert.equal(buf.readUInt16LE(8), 0);
}
""")


def test_conversion_rules_keep_revised_questions_and_localize_updated_legal_input() -> None:
    node_eval(r"""
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source = readFileSync('scripts/zh-tw/convert.mjs', 'utf8');
const rules = [];
const context = vm.createContext({sub:(file, pairs) => rules.push([file, pairs])});
for (const block of source.matchAll(/^sub\('selfcheck.html', \[[\s\S]*?^\]\);/gm)) {
  vm.runInContext(block[0], context);
}
for (const key of ['濃煙關門', '綜合所得稅結算申報', '眷屬依附加保']) {
  const input = `key:'${key}', text:`;
  const convert = value => rules.flatMap(([, pairs]) => pairs)
    .reduce((text, [before, after]) => text.split(before).join(after), value);
  assert.equal(convert(input), `key:'${key}', rev:2, text:`);
  assert.equal(convert(convert(input)), convert(input));
}
const legal = source.split('\n')
  .find(line => line.includes('一審普通程序按規定 6 個月內審完、可以延長'));
assert.ok(legal, '上游更新過的審限文字仍必須命中台灣校訂');
vm.runInContext(`sub('skill', [${legal}]);`, context);
const [, pairs] = rules.at(-1);
assert.ok(pairs[0][1].includes('台灣民事訴訟法沒有'));
""")


def test_skill_archive_contains_current_localized_corpus_and_usable_index(tmp_path: Path) -> None:
    for flat in (False, True):
        output = tmp_path / ("flat.zip" if flat else "skill.zip")
        subprocess.run(
            ["node", "tools/skill/build.mjs", str(output), *(["--flat"] if flat else [])],
            cwd=ROOT,
            check=True,
        )
        prefix = "" if flat else "life-decision-guide/"
        with zipfile.ZipFile(output) as archive:
            skill = archive.read(prefix + "SKILL.md").decode()
            assert skill == (ROOT / "skills/life-decision-guide/SKILL.md").read_text(
                encoding="utf-8"
            )
            assert "references/book/" in skill
            assert "中風降 14%" in skill
            assert "台灣民事訴訟法沒有" in skill
            assert "SanHsien/HowToLiveBetter" in skill
            assert "台灣時間" in archive.read(prefix + "references/VERSION.txt").decode()
            rows = archive.read(prefix + "references/index.tsv").decode().splitlines()
            titles = []
            for file in sorted((ROOT / "book").glob("*.md")):
                packed = archive.read(prefix + "references/book/" + file.name).decode()
                assert packed == file.read_text(encoding="utf-8")
                titles.extend(line for line in packed.splitlines() if line.startswith("### "))
            assert len(rows) == len(titles) + 1
            for row in rows[1:]:
                columns = row.split("\t")
                assert len(columns) == 13
                assert columns[3] in {"極高", "高", "一般"}
                assert prefix + "references/" + columns[-1] in archive.namelist()
            assert all(info.create_system == 3 for info in archive.infolist())
            assert all(info.flag_bits & 0x800 for info in archive.infolist())
            readme = archive.read(prefix + "README.md").decode()
            for old in ("聯網", "會話", "壓縮包", "MIT 許可"):
                assert old not in readme, f"封裝說明不得帶入大陸用語：{old}"
                assert old not in skill, f"封裝規則不得帶入大陸用語：{old}"
            assert "eternity4719" in readme
            assert "CC BY 4.0" in readme
            assert "SanHsien/HowToLiveBetter" in readme


def test_selfcheck_conversion_keeps_taiwan_insurance_and_salary_hints_on_rerun() -> None:
    node_eval(r"""
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source = readFileSync('scripts/zh-tw/convert.mjs', 'utf8');
const pairs = [];
const context = vm.createContext({sub:(_file, rules) => pairs.push(...rules)});
for (const block of source.matchAll(/^sub\('selfcheck.html', \[[\s\S]*?^\]\);/gm)) {
  vm.runInContext(block[0], context);
}
const convert = value => pairs.reduce(
  (text, [before, after]) => text.split(before).join(after), value);
for (const [before, after] of [
  ['沒有職工醫保可以跳過', '沒有需要依附加保的家人可以跳過'],
  ['沒有工資收入可以跳過', '沒有薪資收入可以跳過'],
]) {
  assert.equal(convert(before), after, `轉換流程必須在地化：${before}`);
  assert.equal(convert(after), after, '重跑不得改回上游提示');
  assert.ok(readFileSync('selfcheck.html', 'utf8').includes(`hint:'${after}'`));
}
""")
