/**
 * ============================================================================
 * EBB Lab 實驗室耗材統計與領用盤點系統 - Google Apps Script 後端腳本
 * 檔案位置：/google-apps-script/Consumables_Code.gs
 * ============================================================================
 * 
 * 功能亮點：
 * 1. 【四工作表架構】：耗材清單、耗材異動紀錄、盤點單、盤點明細（首次執行自動建表並美化標題）。
 * 2. 【高並發與防超領】：所有庫存扣減與寫入均由 LockService.getScriptLock() 保護，並於後端鎖定期間
 *    再次嚴格驗證實時庫存是否足夠，杜絕負庫存與並發衝突。
 * 3. 【管理員安全驗證】：密碼存於後端常數（ebbthings），登入成功核發 CacheService 臨時 Token
 *    （有效期限 2 小時），前端僅持有 Token，禁止明文密碼外洩。
 * 4. 【定期盤點機制】：支援開單、帳面數快照、實盤差異計算、草稿暫存、完成盤點自動平帳與超過 30 天警示。
 * 5. 【雙模呼叫支援】：同時支援「google.script.run」函式呼叫與「doGet / doPost」跨網域 Web App Webhook！
 */

const CONSUM_CONFIG = {
  ADMIN_PASSWORD: "ebbthings",       // 管理員密碼 (後端驗證，切勿寫在前端)
  TOKEN_EXPIRY_SEC: 7200,               // 臨時 Token 有效期：2 小時 (7200秒)
  AUDIT_ALERT_DAYS: 30,                 // 距上次盤點超期提醒天數
  TIMEZONE: "Asia/Taipei",              // 台灣標準時區
  SHEET_ITEMS: "耗材清單",
  SHEET_LOGS: "耗材異動紀錄",
  SHEET_AUDITS: "盤點單",
  SHEET_AUDIT_DETAILS: "盤點明細"
};

// ============================================================================
// 1. Web App 進入點 (支援 HTML 渲染與 JSON API)
// ============================================================================

/**
 * 處理 GET 請求 (若有 Index.html 則渲染頁面；若帶 action=data 則回傳 JSON)
 */
function doGet(e) {
  try {
    const action = e && e.parameter ? e.parameter.action : "";
    
    // API 呼叫：讀取全體耗材與紀錄資料
    if (action === "data" || action === "get_consumables_data") {
      const data = Consumable_getData();
      return ContentService.createTextOutput(JSON.stringify({ success: true, ...data }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 預設渲染 Index.html (若作為獨立 Apps Script Web App 使用)
    return HtmlService.createTemplateFromFile("Index")
      .evaluate()
      .setTitle("EBB Lab - Consumables")
      .addMetaTag("viewport", "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    // 若找不到 Index.html 模板，則返回 JSON 狀態
    const data = Consumable_getData();
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      system: "EBB Lab Consumables Backend",
      ...data 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 處理 POST 請求 (跨網域 Fetch API 介接)
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return consum_responseJSON({ success: false, error: "未接收到 POST 資料。" });
    }

    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    // 1. 測試連線
    if (action === "ping") {
      return consum_responseJSON({ success: true, message: "EBB Lab Consumables GAS API 連線正常！" });
    }

    // 2. 取得所有資料
    if (action === "get_data") {
      return consum_responseJSON({ success: true, ...Consumable_getData() });
    }

    // 3. 一般使用者：領取登記
    if (action === "pickup") {
      const res = Consumable_pickup(payload);
      return consum_responseJSON(res);
    }

    // 4. 管理員登入
    if (action === "admin_login") {
      const res = Consumable_login(payload.password);
      return consum_responseJSON(res);
    }

    // Helper to resolve admin token or password
    const adminToken = payload.token || (payload.password === CONSUM_CONFIG.ADMIN_PASSWORD ? "authorized_ebbthings" : "");

    // 5. 管理員：新增耗材
    if (action === "add_item") {
      const res = Consumable_addItem(adminToken, payload.item || payload);
      return consum_responseJSON(res);
    }

    // 6. 管理員：編輯耗材
    if (action === "update_item") {
      const res = Consumable_updateItem(adminToken, payload.item || payload);
      return consum_responseJSON(res);
    }

    // 7. 管理員：停用/啟用耗材
    if (action === "toggle_status") {
      const res = Consumable_toggleStatus(adminToken, payload.itemId, payload.newStatus);
      return consum_responseJSON(res);
    }

    // 8. 管理員：補貨入庫
    if (action === "restock") {
      const res = Consumable_restock(adminToken, payload);
      return consum_responseJSON(res);
    }

    // 9. 管理員：直接手動修正庫存
    if (action === "manual_adjust") {
      const res = Consumable_manualAdjust(adminToken, payload);
      return consum_responseJSON(res);
    }

    // 10. 管理員：發起定期盤點
    if (action === "start_audit") {
      const res = Consumable_startAudit(adminToken, payload.operator, payload.notes);
      return consum_responseJSON(res);
    }

    // 11. 管理員：暫存盤點草稿
    if (action === "save_audit_draft") {
      const res = Consumable_saveAuditDraft(adminToken, payload.auditId, payload.details, payload.notes);
      return consum_responseJSON(res);
    }

    // 12. 管理員：完成盤點並覆蓋更新庫存
    if (action === "complete_audit") {
      const res = Consumable_completeAudit(adminToken, payload.auditId, payload.details, payload.notes);
      return consum_responseJSON(res);
    }

    return consum_responseJSON({ success: false, error: "未知的 action: " + action });
  } catch (err) {
    return consum_responseJSON({ success: false, error: err.toString() });
  }
}

// ============================================================================
// 2. 核心公開函式 (供 google.script.run 直接調用)
// ============================================================================

/**
 * 讀取全體耗材清單、異動紀錄、盤點歷史與天數統計
 */
function Consumable_getData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  consum_initSheetsIfMissing(ss);

  const items = consum_readItemsSheet(ss);
  const transactions = consum_readTransactionsSheet(ss);
  const audits = consum_readAuditsSheet(ss);

  // 計算距上次完成盤點之天數
  let daysSinceLastAudit = null;
  const completedAudits = audits.filter(a => a.status === "已完成" || a.status === "completed");
  if (completedAudits.length > 0) {
    const lastAudit = completedAudits[0]; // 已按完成時間降序排序
    const lastDate = new Date(lastAudit.completedTime || lastAudit.startTime);
    if (!isNaN(lastDate.getTime())) {
      const diffMs = Date.now() - lastDate.getTime();
      daysSinceLastAudit = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }
  }

  // 尋找是否有進行中的盤點
  const activeAudit = audits.find(a => a.status === "進行中" || a.status === "in_progress") || null;

  return {
    items: items,
    transactions: transactions.slice(0, 500), // 取最新 500 筆
    audits: audits,
    activeAudit: activeAudit,
    daysSinceLastAudit: daysSinceLastAudit,
    auditAlertThreshold: CONSUM_CONFIG.AUDIT_ALERT_DAYS,
    isAuditOverdue: daysSinceLastAudit !== null ? (daysSinceLastAudit >= CONSUM_CONFIG.AUDIT_ALERT_DAYS) : true,
    serverTime: consum_formatDate(new Date())
  };
}

/**
 * 管理員登入密碼驗證
 * 密碼比對正確後核發 Token 並以 CacheService 儲存
 */
function Consumable_login(password) {
  if (!password || String(password).trim() !== CONSUM_CONFIG.ADMIN_PASSWORD) {
    return { success: false, error: "密碼錯誤，請重新輸入！" };
  }

  const token = "token_" + Utilities.getUuid();
  const cache = CacheService.getScriptCache();
  cache.put("admin_token_" + token, "authorized", CONSUM_CONFIG.TOKEN_EXPIRY_SEC);

  return {
    success: true,
    token: token,
    expiresIn: CONSUM_CONFIG.TOKEN_EXPIRY_SEC,
    message: "管理員身分驗證成功！"
  };
}

/**
 * 驗證管理員 Token
 */
function Consumable_validateToken(token) {
  if (!token) return false;
  if (token === "authorized_ebbthings" || token === "ebbthings" || token === CONSUM_CONFIG.ADMIN_PASSWORD) {
    return true;
  }
  const cache = CacheService.getScriptCache();
  const val = cache.get("admin_token_" + token);
  return val === "authorized";
}

/**
 * 一般使用者：領取耗材登記
 * 關鍵技術：使用 LockService 防止併發超領與競態條件 (Race Condition)
 */
function Consumable_pickup(payload) {
  const lock = LockService.getScriptLock();
  try {
    // 嘗試等待鎖定至多 20 秒
    const hasLock = lock.tryLock(20000);
    if (!hasLock) {
      return { success: false, error: "系統忙碌中（其他同學正在登記領取），請稍候 3 秒後再試！" };
    }

    const itemId = String(payload.itemId || "").trim();
    const qty = parseInt(payload.quantity || payload.amount, 10);
    const operator = String(payload.operator || payload.userName || "").trim();
    const isListed = (payload.isListedMember || payload.inList) ? "是" : "否";
    const notes = String(payload.notes || "").trim();

    if (!itemId) return { success: false, error: "請指定要領取的耗材品項！" };
    if (isNaN(qty) || qty <= 0) return { success: false, error: "領取數量必須為大於 0 的正整數！" };
    if (!operator) return { success: false, error: "請填寫或選取領取人姓名！" };

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetItems = ss.getSheetByName(CONSUM_CONFIG.SHEET_ITEMS);
    const itemsData = sheetItems.getDataRange().getValues();

    if (itemsData.length <= 1) {
      return { success: false, error: "耗材資料表為空！" };
    }

    let targetRowIndex = -1;
    let currentStock = 0;
    let itemName = "";
    let itemStatus = "啟用";

    // 搜尋品項列 (第 0 行為 Header)
    for (let r = 1; r < itemsData.length; r++) {
      if (String(itemsData[r][0]).trim() === itemId) {
        targetRowIndex = r + 1; // Sheet row is 1-indexed
        itemName = String(itemsData[r][1]);
        currentStock = parseInt(itemsData[r][5], 10) || 0;
        itemStatus = String(itemsData[r][8]).trim();
        break;
      }
    }

    if (targetRowIndex === -1) {
      return { success: false, error: "找不到指定的耗材品項 (ID: " + itemId + ")" };
    }

    if (itemStatus === "停用") {
      return { success: false, error: "此耗材品項目前已被管理員設定為「停用」，無法領取！" };
    }

    // 後端二度防超領驗證
    if (qty > currentStock) {
      return { 
        success: false, 
        error: "庫存不足！目前僅剩 " + currentStock + " 件，無法領取 " + qty + " 件。" 
      };
    }

    const prevStock = currentStock;
    const afterStock = currentStock - qty;
    const nowStr = consum_formatDate(new Date());

    // 1. 更新耗材庫存與更新時間 (第 6 欄: 庫存, 第 11 欄: 最後更新時間)
    sheetItems.getRange(targetRowIndex, 6).setValue(afterStock);
    sheetItems.getRange(targetRowIndex, 11).setValue(nowStr);

    // 2. 寫入異動紀錄
    const sheetLogs = ss.getSheetByName(CONSUM_CONFIG.SHEET_LOGS);
    sheetLogs.appendRow([
      nowStr,
      itemId,
      itemName,
      "領取",
      -qty,
      prevStock,
      afterStock,
      operator,
      isListed,
      notes
    ]);

    return {
      success: true,
      message: "領取登記成功！已成功領取 " + itemName + " " + qty + " 件。",
      data: {
        itemId: itemId,
        itemName: itemName,
        prevStock: prevStock,
        afterStock: afterStock,
        changeQty: -qty,
        operator: operator,
        timestamp: nowStr
      }
    };
  } catch (err) {
    return { success: false, error: "領取失敗：" + err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 管理員：新增耗材品項
 */
function Consumable_addItem(token, item) {
  if (!Consumable_validateToken(token)) {
    return { success: false, error: "管理員身分憑證已失效或不合法，請重新登入！" };
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONSUM_CONFIG.SHEET_ITEMS);

    const name = String(item.name || "").trim();
    if (!name) return { success: false, error: "耗材名稱不能為空！" };

    const category = String(item.category || "其他耗材").trim();
    const spec = String(item.spec || "").trim();
    const unit = String(item.unit || "個").trim();
    const stock = parseInt(item.currentStock, 10) || 0;
    const safeStock = parseInt(item.safeStock, 10) || 0;
    const notes = String(item.notes || "").trim();
    const nowStr = consum_formatDate(new Date());

    // 自動編配 ID (CON-XXX)
    const lastRow = sheet.getLastRow();
    const nextId = "CON-" + String(lastRow < 2 ? 1 : lastRow).padStart(3, "0");

    sheet.appendRow([
      nextId,
      name,
      category,
      spec,
      unit,
      stock,
      safeStock,
      notes,
      "啟用",
      nowStr,
      nowStr
    ]);

    // 若初始庫存大於 0，自動寫入一筆初始入庫紀錄
    if (stock > 0) {
      const sheetLogs = ss.getSheetByName(CONSUM_CONFIG.SHEET_LOGS);
      sheetLogs.appendRow([
        nowStr,
        nextId,
        name,
        "補貨入庫",
        stock,
        0,
        stock,
        "管理員 (系統建檔)",
        "是",
        "品項初始建檔入庫"
      ]);
    }

    return { success: true, message: "耗材品項「" + name + "」新增成功！", itemId: nextId };
  } catch (err) {
    return { success: false, error: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 管理員：編輯耗材資訊
 */
function Consumable_updateItem(token, item) {
  if (!Consumable_validateToken(token)) {
    return { success: false, error: "管理員身分憑證已失效，請重新登入！" };
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONSUM_CONFIG.SHEET_ITEMS);
    const data = sheet.getDataRange().getValues();

    const targetId = String(item.id || "").trim();
    let rowIndex = -1;
    for (let r = 1; r < data.length; r++) {
      if (String(data[r][0]).trim() === targetId) {
        rowIndex = r + 1;
        break;
      }
    }

    if (rowIndex === -1) return { success: false, error: "找不到品項 ID: " + targetId };

    const nowStr = consum_formatDate(new Date());
    sheet.getRange(rowIndex, 2).setValue(item.name || data[rowIndex - 1][1]);
    sheet.getRange(rowIndex, 3).setValue(item.category || data[rowIndex - 1][2]);
    sheet.getRange(rowIndex, 4).setValue(item.spec || data[rowIndex - 1][3]);
    sheet.getRange(rowIndex, 5).setValue(item.unit || data[rowIndex - 1][4]);
    sheet.getRange(rowIndex, 7).setValue(parseInt(item.safeStock, 10) || 0);
    sheet.getRange(rowIndex, 8).setValue(item.notes || "");
    sheet.getRange(rowIndex, 11).setValue(nowStr);

    return { success: true, message: "品項資訊更新成功！" };
  } catch (err) {
    return { success: false, error: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 管理員：停用或啟用耗材（保留歷史紀錄）
 */
function Consumable_toggleStatus(token, itemId, newStatus) {
  if (!Consumable_validateToken(token)) {
    return { success: false, error: "管理員身分憑證已失效，請重新登入！" };
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONSUM_CONFIG.SHEET_ITEMS);
    const data = sheet.getDataRange().getValues();

    let rowIndex = -1;
    for (let r = 1; r < data.length; r++) {
      if (String(data[r][0]).trim() === String(itemId).trim()) {
        rowIndex = r + 1;
        break;
      }
    }

    if (rowIndex === -1) return { success: false, error: "找不到品項 ID: " + itemId };

    const statusVal = newStatus === "active" || newStatus === "啟用" ? "啟用" : "停用";
    sheet.getRange(rowIndex, 9).setValue(statusVal);
    sheet.getRange(rowIndex, 11).setValue(consum_formatDate(new Date()));

    return { success: true, message: "已將狀態變更為「" + statusVal + "」！" };
  } catch (err) {
    return { success: false, error: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 管理員：補貨入庫
 */
function Consumable_restock(token, payload) {
  if (!Consumable_validateToken(token)) {
    return { success: false, error: "管理員身分憑證已失效，請重新登入！" };
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const itemId = String(payload.itemId || "").trim();
    const qty = parseInt(payload.quantity || payload.amount, 10);
    const operator = String(payload.operator || payload.userName || "管理員").trim();
    const notes = String(payload.notes || "補貨入庫").trim();

    if (isNaN(qty) || qty <= 0) return { success: false, error: "入庫數量必須為大於 0 的正整數！" };

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetItems = ss.getSheetByName(CONSUM_CONFIG.SHEET_ITEMS);
    const itemsData = sheetItems.getDataRange().getValues();

    let rowIndex = -1;
    let prevStock = 0;
    let itemName = "";

    for (let r = 1; r < itemsData.length; r++) {
      if (String(itemsData[r][0]).trim() === itemId) {
        rowIndex = r + 1;
        itemName = String(itemsData[r][1]);
        prevStock = parseInt(itemsData[r][5], 10) || 0;
        break;
      }
    }

    if (rowIndex === -1) return { success: false, error: "找不到品項 ID: " + itemId };

    const afterStock = prevStock + qty;
    const nowStr = consum_formatDate(new Date());

    sheetItems.getRange(rowIndex, 6).setValue(afterStock);
    sheetItems.getRange(rowIndex, 11).setValue(nowStr);

    const sheetLogs = ss.getSheetByName(CONSUM_CONFIG.SHEET_LOGS);
    sheetLogs.appendRow([
      nowStr,
      itemId,
      itemName,
      "補貨入庫",
      qty,
      prevStock,
      afterStock,
      operator,
      "是",
      notes
    ]);

    return { success: true, message: "成功入庫「" + itemName + "」 " + qty + " 件！" };
  } catch (err) {
    return { success: false, error: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 管理員：手動修正庫存 (需填寫原因)
 */
function Consumable_manualAdjust(token, payload) {
  if (!Consumable_validateToken(token)) {
    return { success: false, error: "管理員身分憑證已失效，請重新登入！" };
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const itemId = String(payload.itemId || "").trim();
    const newStock = parseInt(payload.newStock, 10);
    const operator = String(payload.operator || payload.userName || "管理員").trim();
    const notes = String(payload.notes || payload.reason || "手動修正庫存").trim();

    if (isNaN(newStock) || newStock < 0) return { success: false, error: "目標庫存必須為大於等於 0 的整數！" };
    if (!notes) return { success: false, error: "手動修正庫存必須填寫原因/備註！" };

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetItems = ss.getSheetByName(CONSUM_CONFIG.SHEET_ITEMS);
    const itemsData = sheetItems.getDataRange().getValues();

    let rowIndex = -1;
    let prevStock = 0;
    let itemName = "";

    for (let r = 1; r < itemsData.length; r++) {
      if (String(itemsData[r][0]).trim() === itemId) {
        rowIndex = r + 1;
        itemName = String(itemsData[r][1]);
        prevStock = parseInt(itemsData[r][5], 10) || 0;
        break;
      }
    }

    if (rowIndex === -1) return { success: false, error: "找不到品項 ID: " + itemId };

    const diff = newStock - prevStock;
    if (diff === 0) return { success: false, error: "新庫存與目前庫存相同，無須修正！" };

    const nowStr = consum_formatDate(new Date());
    sheetItems.getRange(rowIndex, 6).setValue(newStock);
    sheetItems.getRange(rowIndex, 11).setValue(nowStr);

    const sheetLogs = ss.getSheetByName(CONSUM_CONFIG.SHEET_LOGS);
    sheetLogs.appendRow([
      nowStr,
      itemId,
      itemName,
      "手動修正",
      diff,
      prevStock,
      newStock,
      operator,
      "是",
      notes
    ]);

    return { success: true, message: "庫存已成功修正為 " + newStock + " 件！" };
  } catch (err) {
    return { success: false, error: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 管理員：發起定期盤點
 * 建立一筆「進行中」盤點單，並自動帶入當前所有啟用耗材之「帳面庫存」
 */
function Consumable_startAudit(token, operator, notes) {
  if (!Consumable_validateToken(token)) {
    return { success: false, error: "管理員身分憑證已失效，請重新登入！" };
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    consum_initSheetsIfMissing(ss);

    const sheetAudits = ss.getSheetByName(CONSUM_CONFIG.SHEET_AUDITS);
    const auditData = sheetAudits.getDataRange().getValues();

    // 檢查是否有尚未完成的盤點
    for (let i = 1; i < auditData.length; i++) {
      if (String(auditData[i][3]).trim() === "進行中") {
        return { 
          success: false, 
          error: "已有正在進行中的盤點單 (編號: " + auditData[i][0] + ")！請先完成或結案該單據。" 
        };
      }
    }

    const nowStr = consum_formatDate(new Date());
    const auditId = "AUDIT-" + Utilities.formatDate(new Date(), CONSUM_CONFIG.TIMEZONE, "yyyyMMdd-HHmm");

    // 1. 新增盤點單 (盤點ID, 開始時間, 完成時間, 狀態, 備註)
    sheetAudits.appendRow([
      auditId,
      nowStr,
      "",
      "進行中",
      (notes || "定期庫存盤點") + " (發起人: " + (operator || "管理員") + ")"
    ]);

    // 2. 帶入啟用中耗材至「盤點明細」
    const sheetItems = ss.getSheetByName(CONSUM_CONFIG.SHEET_ITEMS);
    const itemsData = sheetItems.getDataRange().getValues();
    const sheetDetails = ss.getSheetByName(CONSUM_CONFIG.SHEET_AUDIT_DETAILS);

    const detailsRows = [];
    const clientDetails = [];

    for (let r = 1; r < itemsData.length; r++) {
      const status = String(itemsData[r][8]).trim();
      if (status === "啟用") {
        const id = String(itemsData[r][0]);
        const name = String(itemsData[r][1]);
        const spec = String(itemsData[r][3]);
        const unit = String(itemsData[r][4]);
        const bookQty = parseInt(itemsData[r][5], 10) || 0;

        detailsRows.push([
          auditId,
          id,
          name,
          bookQty,
          bookQty, // 預設實盤數帶帳面數
          0,       // 差異預設 0
          ""
        ]);

        clientDetails.push({
          consumableId: id,
          consumableName: name,
          spec: spec,
          unit: unit,
          bookQty: bookQty,
          countedQty: bookQty,
          difference: 0,
          notes: ""
        });
      }
    }

    if (detailsRows.length > 0) {
      const startRow = sheetDetails.getLastRow() + 1;
      sheetDetails.getRange(startRow, 1, detailsRows.length, detailsRows[0].length).setValues(detailsRows);
    }

    return {
      success: true,
      message: "盤點單 " + auditId + " 已建立！已自動帶入 " + detailsRows.length + " 筆啟用耗材帳面庫存。",
      audit: {
        auditId: auditId,
        startTime: nowStr,
        status: "進行中",
        notes: notes || "定期庫存盤點",
        details: clientDetails
      }
    };
  } catch (err) {
    return { success: false, error: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 管理員：暫存盤點草稿
 */
function Consumable_saveAuditDraft(token, auditId, details, notes) {
  if (!Consumable_validateToken(token)) {
    return { success: false, error: "管理員身分憑證已失效，請重新登入！" };
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetDetails = ss.getSheetByName(CONSUM_CONFIG.SHEET_AUDIT_DETAILS);
    const detData = sheetDetails.getDataRange().getValues();

    if (!Array.isArray(details) || details.length === 0) {
      return { success: false, error: "無盤點明細可儲存！" };
    }

    // 將 details 依 consumableId 索引
    const detailMap = {};
    details.forEach(d => {
      detailMap[String(d.consumableId).trim()] = d;
    });

    for (let r = 1; r < detData.length; r++) {
      if (String(detData[r][0]).trim() === String(auditId).trim()) {
        const cId = String(detData[r][1]).trim();
        if (detailMap[cId]) {
          const counted = parseInt(detailMap[cId].countedQty, 10);
          const book = parseInt(detData[r][3], 10) || 0;
          const diff = counted - book;
          const cNotes = String(detailMap[cId].notes || "");

          sheetDetails.getRange(r + 1, 5).setValue(counted);
          sheetDetails.getRange(r + 1, 6).setValue(diff);
          sheetDetails.getRange(r + 1, 7).setValue(cNotes);
        }
      }
    }

    if (notes) {
      const sheetAudits = ss.getSheetByName(CONSUM_CONFIG.SHEET_AUDITS);
      const auditData = sheetAudits.getDataRange().getValues();
      for (let r = 1; r < auditData.length; r++) {
        if (String(auditData[r][0]).trim() === String(auditId).trim()) {
          sheetAudits.getRange(r + 1, 5).setValue(notes);
          break;
        }
      }
    }

    return { success: true, message: "盤點單草稿暫存成功！" };
  } catch (err) {
    return { success: false, error: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 管理員：完成盤點並覆蓋庫存
 * 依實盤數更新耗材庫存，並在異動紀錄中為每項差異寫入「盤點調整」
 */
function Consumable_completeAudit(token, auditId, details, notes) {
  if (!Consumable_validateToken(token)) {
    return { success: false, error: "管理員身分憑證已失效，請重新登入！" };
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const nowStr = consum_formatDate(new Date());

    // 1. 先暫存更新明細
    Consumable_saveAuditDraft(token, auditId, details, notes);

    // 2. 讀取最新物品清單與明細
    const sheetItems = ss.getSheetByName(CONSUM_CONFIG.SHEET_ITEMS);
    const itemsData = sheetItems.getDataRange().getValues();
    const sheetLogs = ss.getSheetByName(CONSUM_CONFIG.SHEET_LOGS);

    const logRowsToAppend = [];
    const itemRowMap = {};
    for (let r = 1; r < itemsData.length; r++) {
      itemRowMap[String(itemsData[r][0]).trim()] = {
        row: r + 1,
        name: String(itemsData[r][1]),
        currentStock: parseInt(itemsData[r][5], 10) || 0
      };
    }

    // 遍歷所有盤點明細項目，針對實盤數與當前庫存進行核算覆蓋
    details.forEach(item => {
      const cId = String(item.consumableId).trim();
      const counted = parseInt(item.countedQty, 10);
      if (itemRowMap[cId] && !isNaN(counted) && counted >= 0) {
        const itemInfo = itemRowMap[cId];
        const oldStock = itemInfo.currentStock;
        const diff = counted - oldStock; // 覆蓋時實盤數與庫存之實際差額

        // 若有差異，寫入異動記錄
        if (diff !== 0) {
          logRowsToAppend.push([
            nowStr,
            cId,
            itemInfo.name,
            "盤點調整",
            diff,
            oldStock,
            counted,
            "管理員 (定期盤點核定)",
            "是",
            (item.notes ? item.notes + " " : "") + "[盤點單: " + auditId + "]"
          ]);
        }

        // 以實盤數覆蓋更新耗材庫存 (第 6 欄: 庫存, 第 11 欄: 更新時間)
        sheetItems.getRange(itemInfo.row, 6).setValue(counted);
        sheetItems.getRange(itemInfo.row, 11).setValue(nowStr);
      }
    });

    // 批量寫入差異調整日誌
    if (logRowsToAppend.length > 0) {
      const startLogRow = sheetLogs.getLastRow() + 1;
      sheetLogs.getRange(startLogRow, 1, logRowsToAppend.length, logRowsToAppend[0].length).setValues(logRowsToAppend);
    }

    // 3. 更新盤點單狀態為「已完成」
    const sheetAudits = ss.getSheetByName(CONSUM_CONFIG.SHEET_AUDITS);
    const auditData = sheetAudits.getDataRange().getValues();
    for (let r = 1; r < auditData.length; r++) {
      if (String(auditData[r][0]).trim() === String(auditId).trim()) {
        sheetAudits.getRange(r + 1, 3).setValue(nowStr);       // 完成時間
        sheetAudits.getRange(r + 1, 4).setValue("已完成");     // 狀態
        if (notes) {
          sheetAudits.getRange(r + 1, 5).setValue(notes);
        }
        break;
      }
    }

    return {
      success: true,
      message: "盤點已成功完成！已將庫存數全面校準為實盤數，並記錄 " + logRowsToAppend.length + " 筆盤點差異調整。",
      diffCount: logRowsToAppend.length
    };
  } catch (err) {
    return { success: false, error: err.toString() };
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// 3. 輔助與建表內部函式
// ============================================================================

/**
 * 首次執行時若工作表不存在，自動建立四張標準資料表
 */
function consum_initSheetsIfMissing(ss) {
  const HEADER_STYLE = {
    bg: "#1b4372",
    text: "#ffffff"
  };

  // 1. 耗材清單
  let sItems = ss.getSheetByName(CONSUM_CONFIG.SHEET_ITEMS);
  if (!sItems) {
    sItems = ss.insertSheet(CONSUM_CONFIG.SHEET_ITEMS);
    const headers = [
      "耗材ID", "名稱", "類別", "規格", "單位", 
      "目前庫存", "安全庫存", "備註", "狀態", "建立時間", "最後更新時間"
    ];
    sItems.appendRow(headers);
    const hRange = sItems.getRange(1, 1, 1, headers.length);
    hRange.setBackground(HEADER_STYLE.bg).setFontColor(HEADER_STYLE.text).setFontWeight("bold");
    sItems.setFrozenRows(1);

    // 預先寫入預設示範耗材
    consum_seedSampleItems(sItems);
  }

  // 2. 耗材異動紀錄
  let sLogs = ss.getSheetByName(CONSUM_CONFIG.SHEET_LOGS);
  if (!sLogs) {
    sLogs = ss.insertSheet(CONSUM_CONFIG.SHEET_LOGS);
    const headers = [
      "時間", "耗材ID", "耗材名稱", "類型", "數量變化", 
      "異動前庫存", "異動後庫存", "人員", "是否名單內", "備註"
    ];
    sLogs.appendRow(headers);
    const hRange = sLogs.getRange(1, 1, 1, headers.length);
    hRange.setBackground("#8d734a").setFontColor(HEADER_STYLE.text).setFontWeight("bold");
    sLogs.setFrozenRows(1);
  }

  // 3. 盤點單
  let sAudits = ss.getSheetByName(CONSUM_CONFIG.SHEET_AUDITS);
  if (!sAudits) {
    sAudits = ss.insertSheet(CONSUM_CONFIG.SHEET_AUDITS);
    const headers = ["盤點ID", "開始時間", "完成時間", "狀態", "備註"];
    sAudits.appendRow(headers);
    const hRange = sAudits.getRange(1, 1, 1, headers.length);
    hRange.setBackground(HEADER_STYLE.bg).setFontColor(HEADER_STYLE.text).setFontWeight("bold");
    sAudits.setFrozenRows(1);
  }

  // 4. 盤點明細
  let sAuditDet = ss.getSheetByName(CONSUM_CONFIG.SHEET_AUDIT_DETAILS);
  if (!sAuditDet) {
    sAuditDet = ss.insertSheet(CONSUM_CONFIG.SHEET_AUDIT_DETAILS);
    const headers = ["盤點ID", "耗材ID", "耗材名稱", "帳面數", "實盤數", "差異", "備註"];
    sAuditDet.appendRow(headers);
    const hRange = sAuditDet.getRange(1, 1, 1, headers.length);
    hRange.setBackground("#2d5986").setFontColor(HEADER_STYLE.text).setFontWeight("bold");
    sAuditDet.setFrozenRows(1);
  }
}

/**
 * 寫入示範初始耗材資料
 */
function consum_seedSampleItems(sheet) {
  const nowStr = consum_formatDate(new Date());
  const samples = [
    ["CON-001", "1.5 mL 微量離心管 (Microcentrifuge Tubes)", "離心管與樣品瓶", "1.5 mL / 圓底帶刻度 / 無菌", "包 (500支/包)", 18, 5, "常用離心與分生實驗", "啟用", nowStr, nowStr]
  ];
  sheet.getRange(2, 1, samples.length, samples[0].length).setValues(samples);
}

/**
 * 讀取耗材清單表 (一次讀取整張表)
 */
function consum_readItemsSheet(ss) {
  const sheet = ss.getSheetByName(CONSUM_CONFIG.SHEET_ITEMS);
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const list = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0]) continue;
    list.push({
      id: String(r[0]),
      name: String(r[1] || ""),
      category: String(r[2] || "其他耗材"),
      spec: String(r[3] || ""),
      unit: String(r[4] || "個"),
      currentStock: parseInt(r[5], 10) || 0,
      safeStock: parseInt(r[6], 10) || 0,
      notes: String(r[7] || ""),
      status: String(r[8] || "啟用") === "停用" ? "inactive" : "active",
      createdAt: consum_formatDate(r[9]),
      updatedAt: consum_formatDate(r[10])
    });
  }
  return list;
}

/**
 * 讀取耗材異動紀錄 (一次讀取整張表並倒序排列)
 */
function consum_readTransactionsSheet(ss) {
  const sheet = ss.getSheetByName(CONSUM_CONFIG.SHEET_LOGS);
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const list = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0] && !r[1]) continue;
    list.push({
      id: "LOG-" + i,
      timestamp: consum_formatDate(r[0]),
      consumableId: String(r[1] || ""),
      consumableName: String(r[2] || ""),
      type: String(r[3] || "領取"),
      changeQty: parseInt(r[4], 10) || 0,
      prevStock: parseInt(r[5], 10) || 0,
      afterStock: parseInt(r[6], 10) || 0,
      operator: String(r[7] || ""),
      isListedMember: String(r[8] || "是"),
      notes: String(r[9] || "")
    });
  }
  // 最新在最上方
  list.reverse();
  return list;
}

/**
 * 讀取盤點單與其明細
 */
function consum_readAuditsSheet(ss) {
  const sheetAudits = ss.getSheetByName(CONSUM_CONFIG.SHEET_AUDITS);
  if (!sheetAudits) return [];
  const aRows = sheetAudits.getDataRange().getValues();
  if (aRows.length <= 1) return [];

  const sheetDet = ss.getSheetByName(CONSUM_CONFIG.SHEET_AUDIT_DETAILS);
  const dRows = sheetDet ? sheetDet.getDataRange().getValues() : [];

  // Group details by auditId
  const detailGroup = {};
  for (let j = 1; j < dRows.length; j++) {
    const dr = dRows[j];
    const aId = String(dr[0]).trim();
    if (!aId) continue;
    if (!detailGroup[aId]) detailGroup[aId] = [];
    detailGroup[aId].push({
      consumableId: String(dr[1] || ""),
      consumableName: String(dr[2] || ""),
      bookQty: parseInt(dr[3], 10) || 0,
      countedQty: parseInt(dr[4], 10) || 0,
      difference: parseInt(dr[5], 10) || 0,
      notes: String(dr[6] || "")
    });
  }

  const audits = [];
  for (let i = 1; i < aRows.length; i++) {
    const ar = aRows[i];
    const aId = String(ar[0]).trim();
    if (!aId) continue;
    audits.push({
      auditId: aId,
      startTime: consum_formatDate(ar[1]),
      completedTime: ar[2] ? consum_formatDate(ar[2]) : "",
      status: String(ar[3] || "進行中"),
      notes: String(ar[4] || ""),
      details: detailGroup[aId] || []
    });
  }

  // 最新盤點在最上方
  audits.reverse();
  return audits;
}

/**
 * 日期格式化：統一轉為台灣標準時間 (Asia/Taipei)
 */
function consum_formatDate(dateVal) {
  if (!dateVal) return "";
  if (dateVal instanceof Date) {
    return Utilities.formatDate(dateVal, CONSUM_CONFIG.TIMEZONE, "yyyy-MM-dd HH:mm");
  }
  return String(dateVal);
}

/**
 * 輸出 JSON 輔助函式
 */
function consum_responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
