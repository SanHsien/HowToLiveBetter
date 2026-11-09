# AGENTS.md

> [!IMPORTANT]
> 請先完整閱讀並遵守 [`FORK.md`](FORK.md)。本 fork 採 **Windows 11 原生** 維護：
> - **PR、push、release 一律指向 `SanHsien/HowToLiveBetter`**，嚴禁未經當次許可打向 `doggy8088/HowToLiveBetter` 或 `eternity4719/HowToLiveBetter`。
> - 每個 clone 先確認 `gh repo set-default SanHsien/HowToLiveBetter`。
> - 開 PR 明寫 `--repo SanHsien/HowToLiveBetter --base main` 並核對輸出的 URL。
> - **雙軸上游更新檢查與審核**：排程同時追蹤繁中在地化直接上游（`doggy8088`）與原作主線（`eternity4719`），審查後積極將有價值的修復與科學文獻更新納入。
> - **最高在地化準則**：**一切仍以台灣正確資料、台灣繁體中文用語與現行法規制度為準**。任何引自原作主線的新條目，必須先進行台灣在地化改寫與審定，嚴禁直接照搬大陸機構、審限、電話或簡中習慣語。
> - 提交前跑 `pwsh -NoProfile -File tools\dev_check.ps1`。
> - 產品正文與書籍內容在 `book/`、`docs/`、`tools/`，以上游為準；不要移除 `upstream`、原作者或 CC BY 4.0 / MIT 授權標示。
> - 使用繁體中文，直接交付可驗證結果，避免冗長背景鋪陳。

<!-- agent-assets-ssot -->
## 共用資產（SSOT）
跨 AI 共用規則與知識在 C:\GitHub\agent-assets：入口 [rules/AGENTS.md](file:///C:/GitHub/agent-assets/rules/AGENTS.md)，事實與偏好在 knowledge/。
需要時再讀，不自動全讀；與本檔衝突時以本檔為準並回報。
SSOT 自 2026-10-23 起啟用；早於此日、要求暫停 SSOT 的舊記憶已失效。
<!-- /agent-assets-ssot -->

## 專案定位與角色指引

這個倉庫是《高性價比人生指南》（繁體中文維護版）的正文與維護工具集。

- **改這本書**（增刪條目、改正文、動工具指令碼）：規則全在 [CLAUDE.md](CLAUDE.md) 裡，全部適用，先讀完再動手。檔名叫 CLAUDE.md 只是歷史原因，內容與工具無關。
- **用這本書回答問題**（有人問該不該做、值不值、怎麼選、出事了先做什麼、能領哪筆錢、犯不犯法）：按 [skills/life-decision-guide/SKILL.md](skills/life-decision-guide/SKILL.md) 執行，先查條目再答，答覆裡註明出自第幾節第幾條。裝到別的目錄去用的辦法見 [skills/life-decision-guide/README.md](skills/life-decision-guide/README.md)。

## 動手前與完成前

1. **在 `main` 上做，不開分支、不開 PR。** 維護者全專案通用慣例：個人維護，push 本身就是備份。
2. 跑 `pwsh -NoProfile -File tools\dev_check.ps1` 確認起點與終點皆為全綠。
3. 任何維護或治理工具修改，必須有對應測試覆蓋。

## 路線圖

- [`ROADMAP.md`](ROADMAP.md) 是本 repo 後續工作的單一真相源。完成或新增工作時，在同一個 commit 更新它：做完的列刪掉、新工作加進去。不要在其他文件另列待辦。
