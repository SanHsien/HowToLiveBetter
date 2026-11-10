# 路線圖

> 本 repo 後續工作的單一真相源。做完一項，就在同一個 commit 刪掉那一列；新工作只加在這裡。
> 現況段的數字是 2026-11-08 依 `main` 查的快照，開工前先重查 GitHub。

## 現況
`doggy8088/HowToLiveBetter`（繁中在地化）與 `eternity4719/HowToLiveBetter`（原作主線）之雙軸追蹤維護 fork。
- 直接上游審到：commit `4353179`、PR #14、Issue #11（見 `tools/upstream_baseline.json`）。
- 根原作上游審到：commit `dff814d`、PR #174、Issue #171（見 `tools/upstream_root_baseline.json`）。
- 授權比照上游：內容 CC BY 4.0，程式碼 MIT License。
- 維護門禁已建立 Windows-first 雙軸驗收管線（`tools/dev_check.ps1`），一切以台灣正確資料、台灣繁體中文用語與現行法規為最高準則。
- 發布只保留自動同步的 `epub-latest`（含 EPUB、PDF、離線 HTML、Anki 產物）；`v1.0.0` 已於 2026-11-10 依維護者指示刪除。

## 近期：可以直接動手
| 項目 | 為什麼 | 驗收方式 | 建議執行者 | 證據 |
| --- | --- | --- | --- | --- |
| README 術語表收尾：正文已統一為台灣用語，刪掉詞欄的舊詞別名（「統合分析、薈萃分析」「世代研究、佇列」），並改 `index.html` 的「薈萃/RCT」「殘疾之後怎麼活」說明文字、`skills/life-decision-guide/SKILL.md` 的「腦卒中」 | 2026-11-10 正文改完；README 與檢索頁、skill 不在該輪範圍，還留著舊詞 | `node tools/check-zh-tw-locale.mjs` 加掃這三處仍全綠；`tools/sync-stats.mjs --check` 無過時數字 | Claude Sonnet | `docs/DECISIONS.md` 2026-11-10 正文用語統一 |
| 評估向直接上游 (doggy8088) 回貢在地化成果 | 本庫已修復 34§9 乙醯胺酚詞彙回退，並完成孩子出生長文之台灣法規改寫 | 開立 Issue 或送出聚焦之 PR | 維護者 | `docs/孩子出生前後要辦的事.md` |

## 中期：等條件成立再做
| 項目 | 觸發條件 | 驗收方式 | 建議執行者 | 證據 |
| --- | --- | --- | --- | --- |
| 累積回貢 doggy8088 的修正，一次送出。目前 1 項：《孩子出生前後要辦的事》第二節第 2 條托育補助「向市政府申報」應為「向直轄市、縣（市）政府申報」（本 fork `1f6e135` 已改） | 候選累積到一批，且維護者在當次對話同意回貢 | 上游 issue 開出並列出每一處；本列清空 | 維護者 | `docs/DECISIONS.md` 2026-11-10〈Issue #15、#16 回貢已被上游接受〉 |
| 評估引進 eternity4719 釋出之新章節內容 | 原作釋出新條目且具備期刊論文支撐 | 經台灣法規對照、急難專線替換與繁中在地化審定後引入 | 維護者 | `tools/upstream_root_baseline.json` |

## 刻意不做
| 不做什麼 | 理由 | 什麼情況下重新考慮 |
| --- | --- | --- |
| 未經當次許可對上游開 PR 或推 push | 遵守 [`AGENTS.md`](AGENTS.md) 硬性邊界與 [`FORK.md`](FORK.md) 規定，防呆機制鎖定 | 維護者在當次對話明確授權回貢 |
| 照搬原作主線之大陸制度、審限與用語 | 最高原則：一切仍以台灣正確資料、台灣繁體中文用語為準 | 不重新考慮（本 fork 定位為台灣讀者） |
| 引進上游的上游中國當地資料 | 如果上游的上游只是中國當地的法規政策資料，台灣用不到，不予引進 | 除非直接上游（doggy8088）已引進 |
| README 保留 Star 走勢 | 本 fork 為個人獨立維護與在地化版本，無須展示上游 Star 歷史走勢圖 | 不重新考慮 |
| 維護繁體中文以外的書籍正文與電子書多語言版本 | 門戶維持雙語，但書籍正文與電子書專注台灣繁體中文，不維護外語譯本與外部多語言列表 | 永不 |

## 維護方式
日常維護直推 `main` 分支，推前務必通過 `pwsh -NoProfile -File tools\dev_check.ps1`；排程每週自動檢查雙上游（doggy8088 與 eternity4719）水位更新；每月自動檢查 GitHub Actions 與依賴新鮮度。
