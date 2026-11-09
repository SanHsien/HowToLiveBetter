# Windows 11 開發與驗收指引

本專案採 **Windows 11 原生（PowerShell 7+）** 作為主要維護與驗證環境。

## 1. 環境準備

- **作業系統**：Windows 11 原生（非 WSL）。
- **Node.js**：20.x 或 22.x+。
- **Python**：3.11+ 或 3.12+。
- **Git & GitHub CLI**：已登入 `SanHsien` 帳號。

### 初次設定

```powershell
# 複製並進入專案
cd C:\GitHub\HowToLiveBetter

# 設定 GitHub CLI 預設 repository 為個人 fork
gh repo set-default SanHsien/HowToLiveBetter
gh repo set-default --view

# 安裝 Python 維護工具相依套件
python -m pip install -r requirements-dev.txt
```

## 2. 本地一鍵驗收門禁

提交任何變更前，必須執行一鍵門禁：

```powershell
pwsh -NoProfile -File tools\dev_check.ps1
```

門禁流程將依序執行以下檢查：
1. **在地用語檢查** (`node tools/check-zh-tw-locale.mjs`)：確認急難電話與地域說明符合台灣在地化規範。
2. **章節交叉引用檢查** (`node tools/check-refs.mjs --check`)：確認 1900+ 處交叉引用與錨點皆完整有效。
3. **說人話通俗度檢查** (`node tools/check-plain.mjs`)：確認無超長備註、研究行話或未經證實的推論。
4. **自查邏輯檢驗** (`node tools/check-selfcheck.mjs`)：檢查自查測驗題目與選項關聯。
5. **Python 代碼品質** (`ruff check .` 與 `ruff format --check .`)：確保維護工具代碼合規。
6. **維護工具測試** (`pytest -q`)：驗證水位檢查、連結檢查與新鮮度比對合約。
7. **文件相對連結檢查** (`python tools/check_links.py`)：確保維護文檔、指引與規格文件間的相對連結完好無損。
8. **上游狀態檢查** (`python tools/check_upstream_updates.py`)：確認與上游的水位保持同步。

## 3. 推送與發布

通過 `tools\dev_check.ps1` 綠燈後，直接提交並推送到 `origin/main`：

```powershell
git add .
git commit -m "變更描述"
git push origin main
```
