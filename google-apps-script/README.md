# EBB Lab 實驗室 Google Apps Script 後端串接腳本指南

本目錄提供兩個相互獨立、各司其職的 Google Apps Script 後端腳本，分別對應不同的 Google 試算表（Google Sheets），實現全雲端自動化與免 Git 部署維護：

---

## 腳本清單與對應系統

| 腳本檔案名稱 | 對應試算表目的 | 對應前端系統功能 | 支援請求方法 |
| :--- | :--- | :--- | :--- |
| **`Code.gs`** | 請購與採購紀錄總表 | 請購系統 (Procurement System) | `doPost` (請購送審、核准同步、發票到貨) |
| **`MemberData_Code.gs`** | 人員名冊與研究進度資料庫 | Lab Data Studio & 人員進度追蹤 | `doGet` (開啟網頁自動讀取最新名冊與會議)<br>`doPost` (網頁修改一鍵回寫試算表) |

---

## 腳本二：`MemberData_Code.gs` 設定步驟教學 (人員、會議與研究進度)

> 💡 **核心優勢**：日後實驗室新增成員、修改研究題目、排定期刊導讀會議或紀錄研究進度，皆直接在 Google 試算表或網頁 Studio 中更新，**不需要每次都手動修改 Git 原始碼或重新建置部署**！

### 第一步：新建第二個 Google 試算表
1. 前往 [Google 試算表](https://sheets.new)。
2. 新增一個空白試算表，命名為：`EBB Lab 人員名冊與研究進度資料庫`。

### 第二步：開啟 Apps Script
1. 在該試算表中，點擊上方選單 **「擴充功能 (Extensions)」** -> **「Apps Script」**。

### 第三步：貼入 `MemberData_Code.gs` 程式碼
1. 將編輯器內原本預設的 `myFunction()` 清空。
2. 開啟本專案 `/google-apps-script/MemberData_Code.gs`，將全部內容複製並貼入編輯器中。
3. 點擊頂部 **「儲存 (Save 磁碟圖示)」** (Ctrl+S / Cmd+S)。

### 第四步：部署為網頁應用程式 (Web App)
1. 點擊右上角藍色 **「部署 (Deploy)」** -> **「新增部署作業 (New deployment)」**。
2. 點擊左側齒輪圖示，選擇 **「網頁應用程式 (Web App)」**。
3. 欄位填寫如下：
   - **說明 (Description)**：`EBB Lab 人員與進度同步 API`
   - **執行身分 (Execute as)**：`我 (Me / 您的 Google 帳號)`
   - **誰可以存取 (Who has access)**：`任何人 (Anyone)`  <-- **【最重要：必須選擇 Anyone，前端才能免登入直接跨網域讀寫】**
4. 點擊 **「部署 (Deploy)」**，初次會跳出權限確認，請點擊「核准存取權」完成授權。
5. 複製產生的 **「網頁應用程式網址 (Web App URL)」**（結尾為 `/exec`）。

### 第五步：貼回前端系統
1. 開啟本系統網頁，進入 **「Lab Data Studio」** 或 **「人員進度追蹤 (Progress Tracking)」**。
2. 點選頂部的 **「☁️ Google Sheet 雲端同步」** 按鈕。
3. 貼上剛複製的 Webhook URL，點擊「儲存網址」。
4. 點選「測試連線」驗證連線，或點選「從雲端讀取最新資料 / 同步備份至 Google Sheet」即可無縫連通！

---

## 腳本一：`Code.gs` 設定步驟教學 (請購與採購系統)

### 設定步驟
1. 新建試算表命名為：`EBB Lab 請購與採購紀錄總表`。
2. 點擊「擴充功能」->「Apps Script」。
3. 貼入 `/google-apps-script/Code.gs` 代碼。
4. 點選「部署」->「新增部署作業」->「網頁應用程式 (Web App)」：
   - 執行身分：`我 (Me)`
   - 誰可以存取：`任何人 (Anyone)`
5. 複製 Web App URL，至本系統請購頁面右上角「⚡ Apps Script 連動」中儲存即可。
