# EBB Lab 實驗室 Google Apps Script 後端串接腳本指南

本目錄提供三個相互獨立、各司其職的 Google Apps Script 後端腳本，分別對應不同的 Google 試算表（Google Sheets），實現全雲端自動化與免 Git 部署維護：

---

## 腳本清單與對應系統

| 腳本檔案名稱 | HTML 網頁介面 | 對應試算表目的 | 對應前端系統功能 | 支援請求方法 |
| :--- | :--- | :--- | :--- | :--- |
| **`Consumables_Code.gs`** | **`Consumables_Pickup.html`** / `Index.html` | 耗材清單、異動紀錄、盤點單、明細 | 實驗室耗材庫存統計、線上領取、QR Code 掃碼、定期盤點 | `doGet` (渲染網頁或回傳 JSON)<br>`doPost` (扣庫、補貨、盤點) |
| **`Code.gs`** | 無 | 請購與採購紀錄總表 | 請購系統 (Procurement System) | `doPost` (請購送審、核准同步、進程追蹤) |
| **`MemberData_Code.gs`** | 無 | 人員名冊與研究進度資料庫 | Lab Data Studio & 人員進度追蹤 | `doGet` (開啟網頁自動讀取最新名冊與會議)<br>`doPost` (網頁修改一鍵回寫試算表) |

---

## 腳本一：`Consumables_Code.gs` 與 `Consumables_Pickup.html` (耗材統計、領用與 QR Code 系統)

> 💡 **核心優勢**：
> 1. 提供專屬行動網頁 `Consumables_Pickup.html`，佈置後可直接產生獨立 Web App 連結。
> 2. 可於主系統中直接**內嵌**，亦可一鍵生成全系統或**各品項專屬置物架 QR Code**，貼於實驗室各耗材箱，手機相機一掃即可快速完成領用登記！
> 3. 後端具備 `LockService` 併發鎖定機制，防止同學多人同時領取時超領或庫存衝突。

### 第一步：新建 Google 試算表
1. 前往 [Google 試算表 (Google Sheets)](https://sheets.new)。
2. 新增一個空白試算表，命名為：`EBB Lab 耗材統計與領用盤點總表`。
3. （無需手動建立工作表，首次執行任何動作時腳本會自動建立「耗材清單」、「耗材異動紀錄」、「盤點單」、「盤點明細」四個工作表並自動設定標題欄位）。

### 第二步：開啟 Apps Script 編輯器
1. 在該試算表中，點擊上方選單 **「擴充功能 (Extensions)」** -> **「Apps Script」**。

### 第三步：新增與貼入腳本程式碼
1. **處理後端代碼 (`程式碼.gs`)**：
   - 清空預設的 `myFunction()`。
   - 將本專案 `/google-apps-script/Consumables_Code.gs` 的全部內容複製並貼入編輯器中。
2. **新增前端 HTML 介面 (`Consumables_Pickup.html`)**：
   - 點擊左側檔案列表頂部的 **「+」** 號 -> 選擇 **「HTML」**。
   - 將檔案名稱命名為：`Consumables_Pickup`（或 `Index`）。
   - 將本專案 `/google-apps-script/Consumables_Pickup.html` 的全部內容複製並覆蓋貼入該檔案中。
3. 點擊頂部 **「儲存 (Save 磁碟圖示)」** (Ctrl+S / Cmd+S)。

### 第四步：部署為網頁應用程式 (Web App)
1. 點擊右上角藍色 **「部署 (Deploy)」** -> **「新增部署作業 (New deployment)」**。
2. 點擊左側齒輪圖示，選擇 **「網頁應用程式 (Web App)」**。
3. 填寫設定：
   - **說明 (Description)**：`EBB Lab 耗材領用與統計 Web App`
   - **執行身分 (Execute as)**：`我 (Me / 您的 Google 帳號)`
   - **誰可以存取 (Who has access)**：`任何人 (Anyone)`  <-- **【關鍵：務必選 Anyone，才能免登入直接掃碼領取與嵌入】**
4. 點擊 **「部署 (Deploy)」**，點選「核准存取權」完成 Google 帳號權限授權。
5. 複製產生的 **「網頁應用程式網址 (Web App URL)」**（結尾為 `/exec`）。

### 第五步：內嵌回本系統並生成 QR Code
1. 開啟本系統網頁，進入 **「耗材統計與管理 (Consumables)」**。
2. 切換至 **「行動領用與 QR Code」** 頁籤（或點擊頂部「⚡ 設定 GAS 連結 / 行動條碼」）。
3. 貼上剛複製的 Web App URL 並儲存。
4. 系統將立即完成內嵌！
   - 點擊 **「行動條碼」**：即可查看全實驗室領用專屬 QR Code。
   - 點擊任何單一耗材的 **「QR」** 按鈕：即可產生該耗材專屬之帶參連結（`?item=CON-001`）與置物架標籤，可直接列印貼在實驗耗材盒上！

---

## 腳本二：`MemberData_Code.gs` (人員、會議與研究進度)

### 設定步驟教學
1. 前往 [Google 試算表](https://sheets.new)，建立 `EBB Lab 人員名冊與研究進度資料庫`。
2. 點擊上方「擴充功能」->「Apps Script」。
3. 貼入 `/google-apps-script/MemberData_Code.gs` 全部代碼並儲存。
4. 點擊「部署」->「新增部署作業」->「網頁應用程式」：
   - 執行身分：`我 (Me)`
   - 誰可以存取：`任何人 (Anyone)`
5. 複製 Web App URL，至本系統 **「Lab Data Studio」** 點選「☁️ Google Sheet 雲端同步」貼入即可。

---

## 腳本三：`Code.gs` (請購與採購系統)

### 設定步驟教學
1. 前往 [Google 試算表](https://sheets.new)，建立 `EBB Lab 請購與採購紀錄總表`。
2. 點擊「擴充功能」->「Apps Script」。
3. 貼入 `/google-apps-script/Code.gs` 代碼並儲存。
4. 點選「部署」->「新增部署作業」->「網頁應用程式 (Web App)」：
   - 執行身分：`我 (Me)`
   - 誰可以存取：`任何人 (Anyone)`
5. 複製 Web App URL，至請購系統右上角「⚡ Apps Script 連動」中儲存即可。
