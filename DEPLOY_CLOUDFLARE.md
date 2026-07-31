# Cloudflare Workers & Pages 部署與安全驗證設定說明 (Cloudflare Deployment & Security Guide)

本專案採用 **100% 伺服器端密碼驗證架構 (Server-Side Password Verification via Cloudflare Edge Worker / Pages Functions)**，前端 JavaScript 程式碼完全**不包含任何明文密碼或預設密碼**，徹底杜絕前端原始碼洩漏問題。

---

## 🔐 雙重伺服器端驗證機制 (Server-Side Verification Architecture)

本系統內建 **雙重獨立安全防護機制**，所有密碼的匹配比對均在 Cloudflare Edge 伺服器端進行：

1. **第一重：全站存取 / 登錄驗證 (`/api/verify-site-pass`)**
   - **作用**：保護整個網頁不被外部隨意訪問。訪客開啟網頁時出現「EBB Lab 網站存取驗證」視窗，前端送出 POST 請求至伺服器端驗證。
   - **後台環境變數**：`SITE_PASS` 或 `VITE_SITE_PASS` (預設為 `ebb2026`)

2. **第二重：管理員 LabData Studio 編輯權限驗證 (`/api/verify-admin-pass`)**
   - **作用**：解鎖 **LabData Studio 資料生成器**（可在裡面新增/修改實驗室成員、研究主題、Journal Club 會議紀錄等）。
   - **後台環境變數**：`ADMIN_USER` (或 `VITE_ADMIN_USER`) & `ADMIN_PASS` (或 `VITE_ADMIN_PASS`) (預設為 `ebblab` / `ebblab2026`)

---

## 🛠️ 在 Cloudflare 後台如何設置密碼環境變數？

從您提供的 Cloudflare 後台截圖中（Cloudflare Workers 介面）：

### 1. 為何之前會顯示「Variables cannot be added to a Worker that only has static assets」及「解析回應失敗」？
- **原因**：先前專案只有靜態檔案，沒有指定 Worker 執行進入點 (`src/worker.ts`)，導致 Cloudflare 將 Worker 誤判為「純靜態網頁（Static Assets Only）」，因此不開放環境變數設定，且 `/api/verify-site-pass` API 會回傳 404 HTML 網頁，導致前端解析 JSON 失敗跳出「解析回應失敗」。

### 2. 現在已完成的修復：
1. **新增 `src/worker.ts`**：已將 `/api/verify-site-pass` 與 `/api/verify-admin-pass` 驗證端點包裝成 Cloudflare Worker 伺服器端代碼。
2. **更新 `wrangler.toml`**：指定 `main = "src/worker.ts"`，將 Worker 正式升級為「靜態網頁 + API 伺服器端驗證」混合模式。
3. **刪除 `bun.lock` 衝突檔**：徹底解決 GitHub 部署時的 `InvalidLockfileVersion` 安裝失敗問題。

---

### 3. 如何在 Cloudflare Dashboard 設定環境變數？

請重新將程式碼 Git Push 到 GitHub 後，Cloudflare 會自動觸發新一輪 Deploy。Deploy 成功後：

1. 在 Cloudflare Dashboard **Workers & Pages** -> 進入專案 `ebb` -> **Settings (設定)** 頁面。
2. 找到下方 **Build (建置與部署)** 區塊中的 **Variables and secrets (變數與祕密)**。
3. 點擊右側的 **`+` (Add variable / 新增變數)** 按鈕：
   - **`SITE_PASS`** : 輸入您的全站密碼 (例如 `ebb2026`)
   - **`ADMIN_USER`** : 輸入管理員帳號 (例如 `ebblab`)
   - **`ADMIN_PASS`** : 輸入管理員密碼 (例如 `ebblab2026`)
4. 點擊 **Save and Deploy (儲存並部署)**。

---

## 🚀 推送至 GitHub 部署步驟

在 VSCode 終端機執行：
```bash
git add .
git commit -m "Fix Cloudflare Worker entrypoint and resolve lockfile issue"
git push origin main
```

推送完成後，Cloudflare 將順利進行 **Installing -> Building -> Deploying**，並且 `/api/verify-site-pass` 會正確回傳 200 驗證結果，徹底解決「解析回應失敗」問題！
