> **本線 PR 必須打到 `SanHsien/HowToLiveBetter`（分支 `main`）。** 對上游開 PR 需要維護者在當次對話明確同意回貢。本地驗收：`pwsh -NoProfile -File tools\dev_check.ps1`。見 [`FORK.md`](../FORK.md)。

## 變更摘要

<!-- 簡述變更內容與原因 -->

## 驗收門禁

- [ ] 本地執行 `pwsh -NoProfile -File tools\dev_check.ps1` 全數通過
- [ ] 台灣在地用語檢查無誤 (`tools/check-zh-tw-locale.mjs`)
- [ ] 交叉引用校驗通過 (`tools/check-refs.mjs --check`)
- [ ] 說人話通俗度檢查通過 (`tools/check-plain.mjs`)
- [ ] 維護工具測試全數綠燈 (`pytest -q`)
- [ ] 維護文檔相對連結校驗通過 (`tools/check_links.py`)

## 相關 Issue

<!-- 如有相關 Issue 請標註，例如 Closes #1 -->
