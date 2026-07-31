# Cloudflare Pages 部署與安全驗證設定說明 (Cloudflare Pages Deployment & Security Guide)

本專案支援通過 **Cloudflare Pages** 快速進行 GitHub 一鍵自動化部署，並內建 **Cloudflare Edge 邊緣全站防護 (HTTP Basic Auth)** 與 **LabData Studio 前端管理員驗證**。

---

## 🔐 帳號密碼作用說明 (Account & Password Role)

系統內含有兩組可自訂的環境變數（預設帳號: `ebblab` / 預設密碼: `ebblab2026`）：

1. **`VITE_ADMIN_USER` & `VITE_ADMIN_PASS`**：
   - **作用**：用於登入與解鎖 **LabData Studio 資料生成器**（可在此編輯實驗室成員資訊、研究主題、Journal Club 會議紀錄等）。

2. **`BASIC_AUTH_USER` & `BASIC_AUTH_PASS`**：
   - **作用**：用於 Cloudflare Edge 邊緣層級的 **全站 HTTP Basic 密碼鎖**（可視需求開啟，全站訪問前需輸入瀏覽器彈窗密碼）。

---

## 🛡️ 防護重點：為什麼修改密碼不用怕推送到 GitHub？

> 💡 **安心保護**：專案中的 `.gitignore` 檔案已經嚴格設定過濾所有 `.env` 檔案！
> 您的本地私密 `.env` 或實體密碼**絕對不會**被推送到 GitHub 公開儲存庫。GitHub 上只會保留 `.env.example` 範本檔。

### 在 Cloudflare Pages 中設置/修改密碼的標準安全流程：

1. **完全無需修改程式碼，也無需變更 GitHub 檔案**。
2. 密碼直接儲存在 **Cloudflare 官方伺服器後台 (Environment Variables / Secrets)** 中，由 Cloudflare 進行加密保護。

---

## 🚀 從 GitHub 部署至 Cloudflare Pages 的完整操作步驟

### 步驟 1：將程式碼推送到 GitHub

在 VSCode 的終端機 (Terminal) 中執行以下指令：
```bash
git add .
git commit -m "Update EBB Lab portal and Cloudflare config"
git push origin main
```

---

### 步驟 2：在 Cloudflare Pages 建立項目並連結 GitHub

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2. 在左側選單點擊 **Workers & Pages** -> **Create application** -> **Pages**。
3. 選擇 **Connect to Git**，連結您的 GitHub 帳號並選取本專案儲存庫 (Repository)。
4. 設定建置參數 (Build Settings)：
   - **Framework preset**: `Vite` (或 None)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`

---

### 步驟 3：在 Cloudflare 後台設置您的專屬密碼 (最關鍵步驟)

在同一個設定頁面下方展開 **Environment variables (advanced)**，新增以下 4 個變數：

| 變數名稱 (Variable Name) | 填寫內容 (Value) | 說明 |
| :--- | :--- | :--- |
| `VITE_ADMIN_USER` | `您的自訂管理員帳號` | 用於登入 LabData 編輯器 |
| `VITE_ADMIN_PASS` | `您的自訂管理員密碼` | 用於登入 LabData 編輯器 |
| `BASIC_AUTH_USER` | `您的自訂全站帳號` | Cloudflare 全站存取帳號 |
| `BASIC_AUTH_PASS` | `您的自訂全站密碼` | Cloudflare 全站存取密碼 |

> 🔒 **加密保護**：Cloudflare 允許點擊變數旁邊的 **Encrypt**（加密）按鈕，將密碼轉為不可見的密鑰，確保安全無虞。

5. 點擊 **Save and Deploy**，Cloudflare Pages 就會開始自動建置並發布您的網站！

---

## 🔑 未來如何在 Cloudflare 中修改密碼？

若日後需要更新密碼，**完全不需要改程式碼**，請按照以下步驟操作：

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2. 進入 **Workers & Pages** -> 點選您的 Pages 專案名稱。
3. 點選上方選單 **Settings (設定)** -> **Environment variables (環境變數)**。
4. 點擊 **Edit variables (編輯變數)**，將 `VITE_ADMIN_PASS` 或 `BASIC_AUTH_PASS` 修改為新密碼。
5. 點擊 **Save (儲存)**。
6. 點選 **Deployments (部署紀錄)** -> 點擊最上方最新紀錄右側的 `...` -> 選擇 **Retry deployment (重新部署)**，新密碼即可在 30 秒內全局生效！

---

## 💻 在本地 VSCode 中如何測試修改密碼？

若要在 VSCode 本地開發時測試自己的密碼：
1. 在專案根目錄建立一個 `.env` 檔案（此檔案會被 `.gitignore` 自動忽略，不會推送到 GitHub）。
2. 在 `.env` 檔案內寫入：
   ```env
   VITE_ADMIN_USER="my_custom_user"
   VITE_ADMIN_PASS="my_custom_password_123"
   ```
3. 重新啟動開發伺服器（`npm run dev`）即可生效。

