# Fork 維護說明

本 repo fork 自 [`doggy8088/HowToLiveBetter`](https://github.com/doggy8088/HowToLiveBetter)（原始專案源自 [`eternity4719/HowToLiveBetter`](https://github.com/eternity4719/HowToLiveBetter)），比照上游採用 **CC BY 4.0**（文字內容）與 **MIT License**（程式碼部分）雙重授權，並保留完整 Git 歷史。

## 為什麼維護 fork

- **繁體中文在地化指南維護**：持續追蹤與同步上游優質內容，維護專為台灣讀者閱讀情境適配的用詞、急難專線、法律審限及制度對照。
- **雙軸上游水位追蹤**：排程定期同時追蹤繁中在地化直接上游（`doggy8088/HowToLiveBetter`）與原作主線上游（`eternity4719/HowToLiveBetter`）。**核心原則：一切仍以台灣正確資料、台灣繁體中文用語為準**，原作主線之新條目與文獻經過濾與在地化審定後方可納入，絕不引進大陸機構、審限或簡中用語。
- **Windows-first 原生維護門禁**：專為 Windows 11 + PowerShell 7+ 環境打造可重現的一鍵驗收門禁（`tools/dev_check.ps1`），整合在地用語檢查、引用交叉校驗、通俗用語（說人話）審查、自查檢驗與 Python 測試。
- **依賴與 Actions 新鮮度監控**：建立自動化依賴比對機制（`tools/check_dependency_freshness.py`），確保 GitHub Actions 與維護依賴不悄悄過期。

**回貢判準：修的是上游的通用內容或 bug 就送回上游；本 fork 獨創的文件、Windows 維護門禁與治理骨架留在這裡。**
回貢前必須在當次對話取得維護者明確同意；「fork」「建開發環境」「開 PR」都不是同意。

## 與上游的差異

| 項目 | 說明 |
|---|---|
| `AGENTS.md` | 本 fork 的 AI 代理維護單一真相源，整合 SSOT 規則、護欄與正文寫作指引 |
| `FORK.md` / `NOTICE.md` | 來源、比照上游授權（CC BY 4.0 + MIT）與維護治理說明 |
| `ROADMAP.md` | 本 fork 維護與後續工作單一真相源路線圖 |
| `tools/dev_check.ps1` | Windows 本機一鍵驗收 gate（Node 內容檢驗 + Python 測試 + 雙上游增量檢查） |
| `tools/upstream_baseline.json` | 直接上游（`doggy8088/HowToLiveBetter`）commit / PR / Issue 已審核水位記錄 |
| `tools/upstream_root_baseline.json` | 根上游（`eternity4719/HowToLiveBetter`）commit / PR / Issue 已審核水位記錄 |
| `tools/check_upstream_updates.py` | 上游增量審查工具（canonical 實作） |
| `tools/check_dependency_freshness.py` | 依賴與 Actions 釘選新鮮度定期比對工具 |
| `tools/check_links.py` | 維護文件相對連結自動化校驗工具 |
| `.cursor/rules/no-upstream-pr.mdc` | 機械防呆規則：PR、push、release 一律指向 `SanHsien/HowToLiveBetter` |
| `.github/workflows/ci.yml` | Windows-first CI 驗收工作流程 |
| `.github/workflows/upstream-check.yml` | 每週自動排程追蹤雙上游（doggy8088 與 eternity4719）新變更 |
| `.github/workflows/dependency-freshness.yml` | 每月自動排程依賴新鮮度比對 |
| `.github/workflows/codeql.yml` | 靜態程式碼與安全掃描 |
| `docs/DECISIONS.md` | 架構與 fork 維護決策記錄（ADR） |
| `docs/DEVELOPMENT.md` | Windows 11 原生開發與 gate 驗收指引 |
| `docs/UPSTREAM.md` | 雙上游同步指引、在地化裁決原則與差異分析記錄 |

書籍核心正文（`book/`）、檢索與轉換工具（`tools/`、`scripts/`）以上游為準，但遇兩岸制度與語意分歧時，**以台灣正確資料與在地法規為唯一依歸**。

## 分支與 remote

- `origin/main`：`SanHsien/HowToLiveBetter`，主要維護分支與唯一長期分支。
- `upstream/zh-tw`：`doggy8088/HowToLiveBetter`，繁體在地化直接上游，只追蹤、不推送。
- `root-upstream/main`：`eternity4719/HowToLiveBetter`，原作主線上游，只追蹤、不推送。
- 日常修改在本機跑 gate（`pwsh -NoProfile -File tools/dev_check.ps1`）綠燈後推 `origin/main`。

嚴禁 `git push upstream` 或對上游開未經許可之 PR。同步方式見 [`docs/UPSTREAM.md`](docs/UPSTREAM.md)。

## 開發環境指引

```powershell
git clone https://github.com/SanHsien/HowToLiveBetter.git C:\GitHub\HowToLiveBetter
cd C:\GitHub\HowToLiveBetter
gh repo set-default SanHsien/HowToLiveBetter
python -m pip install -r requirements-dev.txt
pwsh -NoProfile -File tools/dev_check.ps1
```
