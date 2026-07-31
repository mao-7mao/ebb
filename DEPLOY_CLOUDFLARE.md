# Cloudflare Pages 部署與安全驗證設定說明 (Cloudflare Pages Deployment & Security Guide)

本專案採用 **100% 伺服器端密碼驗證架構 (Server-Side Password Verification via Cloudflare Pages Functions)**，前端 JavaScript 程式碼完全**不包含任何明文密碼或預設密碼**，徹底杜絕前端原始碼洩漏問題。

---

## 🔐 雙重伺服器端驗證機制 (Server-Side Verification Architecture)

本系統內建 **雙重獨立安全防護機制**，所有密碼的匹配比對均在 Cloudflare Edge 伺服器端（Cloudflare Pages Functions API）進行：

1. **第一重：全站存取 / 登錄驗證 (`/api/verify-site-pass`)**
   - **作用**：保護整個網頁不被外部隨意訪問。訪客開啟網頁時出現「EBB Lab 網站存取驗證」視窗，前端送出 POST 請求至伺服器端驗證。
   - **後台環境變數**：`SITE_PASS` 或 `VITE_SITE_PASS` (預設為 `ebb2026`)

2. **第二重：管理員 LabData Studio 編輯權限驗證 (`/api/verify-admin-pass`)**
   - **作用**：解鎖 **LabData Studio 資料生成器**（可在裡面新增/修改實驗室成員、研究主題、Journal Club 會議紀錄等）。
   - **後台環境變數**：`ADMIN_USER` (或 `VITE_ADMIN_USER`) & `ADMIN_PASS` (或 `VITE_ADMIN_PASS`) (預設為 `ebblab` / `ebblab2026`)

---

## 🛡️ API 與第三方服務安全說明 (API Security Audit)

針對本專案的對外 API 與整合服務，經全盤代碼審查：

1. **Google Calendar 日曆與 Google Maps 地圖**：
   - 僅使用 Google 官方公開的嵌入式 iframe UI (`calendar.google.com/calendar/embed` 與 `www.google.com/maps/embed`)。
   - **完全不使用任何 Google API Key / 私密密鑰**，絕無 Google API 金鑰洩漏風險。

2. **Cloudflare API 憑證**：
   - 專案內部程式碼**不包含任何 Cloudflare API Token 或帳號金鑰**。
   - 部署與執行完全由 Cloudflare Pages 原生託管環境自動處理。

3. **前端密碼防洩漏保證**：
   - 所有驗證邏輯已 100% 移至 `/functions/api/verify-site-pass.ts` 與 `/functions/api/verify-admin-pass.ts`。
   - 前端發送 `fetch('/api/verify-site-pass', { method: 'POST', body: JSON.stringify({ password }) })` 請求，由 Cloudflare 伺服器端讀取環境變數進行比對，回傳 HTTP 200/401。
   - 任何人透過瀏覽器 F12 開發者工具檢視前端 JS bundle，均無法尋獲任何密碼內容！

---

## 🛠️ 在 Cloudflare Pages 後台設置或修改密碼

請登入 [Cloudflare Dashboard](https://dash.cloudflare.com/) -> **Workers & Pages** -> 點選專案 `ebb` -> **Settings (設定)** -> **Environment variables (環境變數)**，點擊 **Edit variables** 新增/修改以下環境變數：

| 變數名稱 (Variable Name) | 範例設定值 (Value) | 作用與說明 |
| :--- | :--- | :--- |
| `SITE_PASS` (或 `VITE_SITE_PASS`) | `your_site_password_123` | **第一重**：全站登錄存取密碼 |
| `ADMIN_USER` (或 `VITE_ADMIN_USER`) | `ebblab` | **第二重**：LabData 管理員帳號 |
| `ADMIN_PASS` (或 `VITE_ADMIN_PASS`) | `your_admin_password_456` | **第二重**：LabData 管理員編輯密碼 |

> 🔒 **加密保護**：可點擊變數旁邊的 **Encrypt (加密)** 按鈕，將密碼轉為加密密鑰，保護更周全。

---

## 🚀 從 GitHub 部署至 Cloudflare Pages 的完整操作步驟

### 步驟 1：將最新程式碼推送到 GitHub

在 VSCode 終端機執行：
```bash
git add .
git commit -m "Migrate password verification to server-side Cloudflare Pages Functions"
git push origin main
```

---

### 步驟 2：確認 Cloudflare Pages 建置設定 (Build Settings)

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2. 進入 **Workers & Pages** -> 點選專案 `ebb`。
3. 點選 **Settings (設定)** -> **Builds & deployments (建置與部署)** 的 **Build configuration**：
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. 點擊 **Save (儲存)** 並回到 **Deployments** 重新觸發部署 (Retry deployment)。

---

## 💻 在本地 VSCode 中如何測試？

本地開發環境已內建 Vite Dev API 伺服器模組 (`passwordAuthDevPlugin`)：
1. 執行 `npm run dev` 啟動開發伺服器。
2. 前端表單會自動發送 POST 請求至本地 Vite API 端點驗證，無縫模擬 Cloudflare Pages Functions 生態環境！
