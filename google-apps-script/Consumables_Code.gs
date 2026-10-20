/**
 * ============================================================================
 * EBB Lab 實驗室耗材統計與領用盤點系統 - Google Apps Script 後端 (修正版)
 * ============================================================================
 * 部署注意：
 * 1. 專案設定 > 啟用 V8 執行階段。
 * 2. 若為獨立 Apps Script 專案，請填入 SPREADSHEET_ID。
 * 3. 需要有 Index.html 檔案（貼上對應的前端程式碼）。
 * 4. 部署為網頁應用程式：執行身分「我」、存取「所有人」；改程式後務必選「新版本」。
 */

const CONSUM_CONFIG = {
  ADMIN_PASSWORD: "ebbthings",
  TOKEN_EXPIRY_SEC: 7200,
  AUDIT_ALERT_DAYS: 30,
  TIMEZONE: "Asia/Taipei",
  SPREADSHEET_ID: "",   // 獨立專案請填入試算表 ID
  SHEET_ITEMS: "耗材清單",
  SHEET_LOGS: "耗材異動紀錄",
  SHEET_AUDITS: "盤點單",
  SHEET_AUDIT_DETAILS: "盤點明細"
};

function consum_getSpreadsheet() {
  let ss = null;
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {}

  if (!ss && CONSUM_CONFIG.SPREADSHEET_ID) {
    try {
      ss = SpreadsheetApp.openById(CONSUM_CONFIG.SPREADSHEET_ID);
    } catch (e) {}
  }

  if (!ss) {
    throw new Error("無法取得 Google 試算表！\n請確認：\n1. 本專案是從試算表【擴充功能 > Apps Script】建立。\n2. 若為獨立專案，請在 CONSUM_CONFIG.SPREADSHEET_ID 填入試算表 ID。");
  }
  return ss;
}

/** 將 JSON 字串安全嵌入 <script>（避免 </script> 或 U+2028 破壞頁面） */
function consum_safeJson(str) {
  return String(str)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

// ============================================================================
// 1. Web App 進入點
// ============================================================================

function doGet(e) {
  try {
    const action = e && e.parameter ? e.parameter.action : "";

    if (action === "data" || action === "get_consumables_data") {
      return consum_responseJSON(Consumable_getData());
    }

    let serverDataJson = "{}";
    try {
      serverDataJson = JSON.stringify(Consumable_getData());
    } catch (dataErr) {
      serverDataJson = JSON.stringify({ success: false, error: dataErr.toString(), items: [] });
    }

    let template;
    try {
      template = HtmlService.createTemplateFromFile("Index");
    } catch (errIdx) {
      try {
        template = HtmlService.createTemplateFromFile("Consumables_Pickup");
      } catch (errPick) {
        throw new Error("找不到 HTML 模板！請在專案中新增檔案「Index.html」並貼上前端程式碼。");
      }
    }

    template.initialDataJson = consum_safeJson(serverDataJson);
    template.initialItemId = (e && e.parameter && (e.parameter.item || e.parameter.id))
      ? String(e.parameter.item || e.parameter.id).trim()
      : "";
    let webAppUrl = "";
    try { webAppUrl = ScriptApp.getService().getUrl(); } catch (urlErr) {}
    template.webAppUrl = webAppUrl;

    return template
      .evaluate()
      .setTitle("EBB Lab - 實驗室耗材自助領用系統 (Consumables Pickup)")
      .addMetaTag("viewport", "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    return HtmlService.createHtmlOutput(
      "<div style='font-family:-apple-system,sans-serif;padding:30px;max-width:640px;margin:20px auto;border:1px solid #fecaca;background:#fef2f2;border-radius:8px;color:#991b1b;'>" +
      "<h2 style='margin-top:0;'>⚠️ 耗材領用系統載入異常</h2>" +
      "<p style='font-size:14px;line-height:1.6;'><b>錯誤原因：</b>" + String(err).replace(/</g, "&lt;") + "</p>" +
      "<hr style='border:0;border-top:1px solid #fee2e2;margin:16px 0;'/>" +
      "<p style='font-size:13px;color:#7f1d1d;'><b>解決步驟：</b><br/>" +
      "1. 檢查是否已建立 <b>Index.html</b>。<br/>" +
      "2. 確認已授權存取 Google 試算表。<br/>" +
      "3. 部署時設定【執行身分：我】與【存取：所有人】，並選擇「新版本」。</p>" +
      "</div>"
    ).setTitle("系統異常 - EBB Lab 耗材系統");
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return consum_responseJSON({ success: false, error: "未接收到 POST 資料。" });
    }

    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    if (action === "ping") {
      return consum_responseJSON({ success: true, message: "EBB Lab Consumables GAS API 連線正常！" });
    }
    if (action === "get_data") {
      return consum_responseJSON(Consumable_getData());
    }
    if (action === "pickup") {
      return consum_responseJSON(Consumable_pickup(payload));
    }
    if (action === "admin_login") {
      return consum_responseJSON(Consumable_login(payload.password));
    }

    const adminToken = payload.token || (payload.password === CONSUM_CONFIG.ADMIN_PASSWORD ? "authorized_ebbthings" : "");

    if (action === "add_item") return consum_responseJSON(Consumable_addItem(adminToken, payload.item || payload));
    if (action === "update_item") return consum_responseJSON(Consumable_updateItem(adminToken, payload.item || payload));
    if (action === "toggle_status") return consum_responseJSON(Consumable_toggleStatus(adminToken, payload.itemId, payload.newStatus));
    if (action === "restock") return consum_responseJSON(Consumable_restock(adminToken, payload));
    if (action === "manual_adjust") return consum_responseJSON(Consumable_manualAdjust(adminToken, payload));
    if (action === "start_audit") return consum_responseJSON(Consumable_startAudit(adminToken, payload.operator, payload.notes));
    if (action === "save_audit_draft") return consum_responseJSON(Consumable_saveAuditDraft(adminToken, payload.auditId, payload.details, payload.notes));
    if (action === "complete_audit") return consum_responseJSON(Consumable_completeAudit(adminToken, payload.auditId, payload.details, payload.notes));

    return consum_responseJSON({ success: false, error: "未知的 action: " + action });
  } catch (err) {
    return consum_responseJSON({ success: false, error: err.toString() });
  }
}

// ============================================================================
// 2. 核心公開函式
// ============================================================================

function Consumable_getData() {
  try {
    const ss = consum_getSpreadsheet();
    consum_initSheetsIfMissing(ss);

    const items = consum_readItemsSheet(ss);
    const transactions = consum_readTransactionsSheet(ss);
    const audits = consum_readAuditsSheet(ss);

    let daysSinceLastAudit = null;
    const completedAudits = audits.filter(a => a.status === "已完成" || a.status === "completed");
    if (completedAudits.length > 0) {
      const lastAudit = completedAudits[0];
      const lastDate = new Date(String(lastAudit.completedTime || lastAudit.startTime).replace(" ", "T"));
      if (!isNaN(lastDate.getTime())) {
        const diffMs = Date.now() - lastDate.getTime();
        daysSinceLastAudit = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }
    }

    const activeAudit = audits.find(a => a.status === "進行中" || a.status === "in_progress") || null;

    return {
      success: true,
      items: items,
      transactions: transactions.slice(0, 500),
      audits: audits,
      activeAudit: activeAudit,
      daysSinceLastAudit: daysSinceLastAudit,
      auditAlertThreshold: CONSUM_CONFIG.AUDIT_ALERT_DAYS,
      isAuditOverdue: daysSinceLastAudit !== null ? (daysSinceLastAudit >= CONSUM_CONFIG.AUDIT_ALERT_DAYS) : true,
      serverTime: consum_formatDate(new Date())
    };
  } catch (err) {
    return {
      success: false,
      error: "讀取試算表資料失敗：" + err.toString(),
      items: [],
      transactions: [],
      audits: [],
      activeAudit: null,
      daysSinceLastAudit: null,
      auditAlertThreshold: CONSUM_CONFIG.AUDIT_ALERT_DAYS,
      isAuditOverdue: false,
      serverTime: consum_formatDate(new Date())
    };
  }
}

function Consumable_login(password) {
  if (!password || String(password).trim() !== CONSUM_CONFIG.ADMIN_PASSWORD) {
    return { success: false, error: "密碼錯誤，請重新輸入！" };
  }
  const token = "token_" + Utilities.getUuid();
  CacheService.getScriptCache().put("admin_token_" + token, "authorized", CONSUM_CONFIG.TOKEN_EXPIRY_SEC);
  return {
    success: true,
    token: token,
    expiresIn: CONSUM_CONFIG.TOKEN_EXPIRY_SEC,
    message: "管理員身分驗證成功！"
  };
}

function Consumable_validateToken(token) {
  if (!token) return false;
  if (token === "authorized_ebbthings" || token === CONSUM_CONFIG.ADMIN_PASSWORD) return true;
  return CacheService.getScriptCache().get("admin_token_" + token) === "authorized";
}

/** 一般使用者：領取登記（LockService 防併發超領） */
function Consumable_pickup(payload) {
  const lock = LockService.getScriptLock();
  let hasLock = false;
  try {
    hasLock = lock.tryLock(20000);
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

    const ss = consum_getSpreadsheet();
    consum_initSheetsIfMissing(ss);
    const sheetItems = ss.getSheetByName(CONSUM_CONFIG.SHEET_ITEMS);
    const itemsData = sheetItems.getDataRange().getValues();

    if (itemsData.length <= 1) return { success: false, error: "耗材資料表為空！" };

    let targetRowIndex = -1;
    let currentStock = 0;
    let itemName = "";
    let itemStatus = "啟用";

    for (let r = 1; r < itemsData.length; r++) {
      if (String(itemsData[r][0]).trim() === itemId) {
        targetRowIndex = r + 1;
        itemName = String(itemsData[r][1]);
        currentStock = parseInt(itemsData[r][5], 10) || 0;
        itemStatus = String(itemsData[r][8]).trim();
        break;
      }
    }

    if (targetRowIndex === -1) return { success: false, error: "找不到指定的耗材品項 (ID: " + itemId + ")" };
    if (itemStatus === "停用") return { success: false, error: "此耗材品項目前已被管理員設定為「停用」，無法領取！" };
    if (qty > currentStock) {
      return { success: false, error: "庫存不足！目前僅剩 " + currentStock + " 件，無法領取 " + qty + " 件。" };
    }

    const prevStock = currentStock;
    const afterStock = currentStock - qty;
    const nowStr = consum_formatDate(new Date());

    sheetItems.getRange(targetRowIndex, 6).setValue(afterStock);
    sheetItems.getRange(targetRowIndex, 11).setValue(nowStr);

    ss.getSheetByName(CONSUM_CONFIG.SHEET_LOGS).appendRow([
      nowStr, itemId, itemName, "領取", -qty, prevStock, afterStock, operator, isListed, notes
    ]);

    return {
      success: true,
      message: "領取登記成功！已成功領取 " + itemName + " " + qty + " 件。",
      remainingStock: afterStock,
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
    if (hasLock) lock.releaseLock();
  }
}

function Consumable_addItem(token, item) {
  if (!Consumable_validateToken(token)) {
    return { success: false, error: "管理員身分憑證已失效或不合法，請重新登入！" };
  }

  const lock = LockService.getScriptLock();
  let hasLock = false;
  try {
    lock.waitLock(15000);
    hasLock = true;
    const ss = consum_getSpreadsheet();
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

    // 取目前最大編號 + 1，避免刪列後 ID 重複
    const ids = sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues() : [];
    let maxNum = 0;
    ids.forEach(row => {
      const m = String(row[0]).match(/(\d+)$/);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    });
    const nextId = "CON-" + String(maxNum + 1).padStart(3, "0");

    sheet.appendRow([nextId, name, category, spec, unit, stock, safeStock, notes, "啟用", nowStr, nowStr]);

    if (stock > 0) {
      ss.getSheetByName(CONSUM_CONFIG.SHEET_LOGS).appendRow([
        nowStr, nextId, name, "補貨入庫", stock, 0, stock, "管理員 (系統建檔)", "是", "品項初始建檔入庫"
      ]);
    }

    return { success: true, message: "耗材品項「" + name + "」新增成功！", itemId: nextId };
  } catch (err) {
    return { success: false, error: err.toString() };
  } finally {
    if (hasLock) lock.releaseLock();
  }
}

function Consumable_updateItem(token, item) {
  if (!Consumable_validateToken(token)) {
    return { success: false, error: "管理員身分憑證已失效，請重新登入！" };
  }

  const lock = LockService.getScriptLock();
  let hasLock = false;
  try {
    lock.waitLock(15000);
    hasLock = true;
    const ss = consum_getSpreadsheet();
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
    if (hasLock) lock.releaseLock();
  }
}

function Consumable_toggleStatus(token, itemId, newStatus) {
  if (!Consumable_validateToken(token)) {
    return { success: false, error: "管理員身分憑證已失效，請重新登入！" };
  }

  const lock = LockService.getScriptLock();
  let hasLock = false;
  try {
    lock.waitLock(15000);
    hasLock = true;
    const ss = consum_getSpreadsheet();
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
    if (hasLock) lock.releaseLock();
  }
}

function Consumable_restock(token, payload) {
  if (!Consumable_validateToken(token)) {
    return { success: false, error: "管理員身分憑證已失效，請重新登入！" };
  }

  const lock = LockService.getScriptLock();
  let hasLock = false;
  try {
    lock.waitLock(20000);
    hasLock = true;
    const itemId = String(payload.itemId || "").trim();
    const qty = parseInt(payload.quantity || payload.amount, 10);
    const operator = String(payload.operator || payload.userName || "管理員").trim();
    const notes = String(payload.notes || "補貨入庫").trim();

    if (isNaN(qty) || qty <= 0) return { success: false, error: "入庫數量必須為大於 0 的正整數！" };

    const ss = consum_getSpreadsheet();
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

    ss.getSheetByName(CONSUM_CONFIG.SHEET_LOGS).appendRow([
      nowStr, itemId, itemName, "補貨入庫", qty, prevStock, afterStock, operator, "是", notes
    ]);

    return { success: true, message: "成功入庫「" + itemName + "」 " + qty + " 件！" };
  } catch (err) {
    return { success: false, error: err.toString() };
  } finally {
    if (hasLock) lock.releaseLock();
  }
}

function Consumable_manualAdjust(token, payload) {
  if (!Consumable_validateToken(token)) {
    return { success: false, error: "管理員身分憑證已失效，請重新登入！" };
  }

  const lock = LockService.getScriptLock();
  let hasLock = false;
  try {
    lock.waitLock(20000);
    hasLock = true;
    const itemId = String(payload.itemId || "").trim();
    const newStock = parseInt(payload.newStock, 10);
    const operator = String(payload.operator || payload.userName || "管理員").trim();
    const notes = String(payload.notes || payload.reason || "手動修正庫存").trim();

    if (isNaN(newStock) || newStock < 0) return { success: false, error: "目標庫存必須為大於等於 0 的整數！" };
    if (!notes) return { success: false, error: "手動修正庫存必須填寫原因/備註！" };

    const ss = consum_getSpreadsheet();
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

    ss.getSheetByName(CONSUM_CONFIG.SHEET_LOGS).appendRow([
      nowStr, itemId, itemName, "手動修正", diff, prevStock, newStock, operator, "是", notes
    ]);

    return { success: true, message: "庫存已成功修正為 " + newStock + " 件！" };
  } catch (err) {
    return { success: false, error: err.toString() };
  } finally {
    if (hasLock) lock.releaseLock();
  }
}

function Consumable_startAudit(token, operator, notes) {
  if (!Consumable_validateToken(token)) {
    return { success: false, error: "管理員身分憑證已失效，請重新登入！" };
  }

  const lock = LockService.getScriptLock();
  let hasLock = false;
  try {
    lock.waitLock(20000);
    hasLock = true;
    const ss = consum_getSpreadsheet();
    consum_initSheetsIfMissing(ss);

    const sheetAudits = ss.getSheetByName(CONSUM_CONFIG.SHEET_AUDITS);
    const auditData = sheetAudits.getDataRange().getValues();

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

    sheetAudits.appendRow([
      auditId,
      nowStr,
      "",
      "進行中",
      (notes || "定期庫存盤點") + " (發起人: " + (operator || "管理員") + ")"
    ]);

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

        detailsRows.push([auditId, id, name, bookQty, bookQty, 0, ""]);
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
    if (hasLock) lock.releaseLock();
  }
}

/** 內部：寫入盤點明細（不取鎖，由呼叫端負責） */
function consum_saveAuditDetails(ss, auditId, details, notes) {
  const sheetDetails = ss.getSheetByName(CONSUM_CONFIG.SHEET_AUDIT_DETAILS);
  const detData = sheetDetails.getDataRange().getValues();

  if (!Array.isArray(details) || details.length === 0) {
    return { success: false, error: "無盤點明細可儲存！" };
  }

  const detailMap = {};
  details.forEach(d => {
    detailMap[String(d.consumableId).trim()] = d;
  });

  for (let r = 1; r < detData.length; r++) {
    if (String(detData[r][0]).trim() === String(auditId).trim()) {
      const cId = String(detData[r][1]).trim();
      if (detailMap[cId]) {
        const counted = parseInt(detailMap[cId].countedQty, 10);
        if (isNaN(counted)) continue;
        const book = parseInt(detData[r][3], 10) || 0;
        sheetDetails.getRange(r + 1, 5).setValue(counted);
        sheetDetails.getRange(r + 1, 6).setValue(counted - book);
        sheetDetails.getRange(r + 1, 7).setValue(String(detailMap[cId].notes || ""));
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
  return { success: true };
}

function Consumable_saveAuditDraft(token, auditId, details, notes) {
  if (!Consumable_validateToken(token)) {
    return { success: false, error: "管理員身分憑證已失效，請重新登入！" };
  }

  const lock = LockService.getScriptLock();
  let hasLock = false;
  try {
    lock.waitLock(20000);
    hasLock = true;
    const ss = consum_getSpreadsheet();
    const res = consum_saveAuditDetails(ss, auditId, details, notes);
    if (!res.success) return res;
    return { success: true, message: "盤點單草稿暫存成功！" };
  } catch (err) {
    return { success: false, error: err.toString() };
  } finally {
    if (hasLock) lock.releaseLock();
  }
}

function Consumable_completeAudit(token, auditId, details, notes) {
  if (!Consumable_validateToken(token)) {
    return { success: false, error: "管理員身分憑證已失效，請重新登入！" };
  }

  const lock = LockService.getScriptLock();
  let hasLock = false;
  try {
    lock.waitLock(30000);
    hasLock = true;
    const ss = consum_getSpreadsheet();
    const nowStr = consum_formatDate(new Date());

    // 1. 先寫入明細（內部函式，不重複取鎖）
    const saved = consum_saveAuditDetails(ss, auditId, details, notes);
    if (!saved.success) return saved;

    // 2. 依實盤數覆蓋庫存
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

    details.forEach(item => {
      const cId = String(item.consumableId).trim();
      const counted = parseInt(item.countedQty, 10);
      if (itemRowMap[cId] && !isNaN(counted) && counted >= 0) {
        const itemInfo = itemRowMap[cId];
        const oldStock = itemInfo.currentStock;
        const diff = counted - oldStock;

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

        sheetItems.getRange(itemInfo.row, 6).setValue(counted);
        sheetItems.getRange(itemInfo.row, 11).setValue(nowStr);
      }
    });

    if (logRowsToAppend.length > 0) {
      const startLogRow = sheetLogs.getLastRow() + 1;
      sheetLogs.getRange(startLogRow, 1, logRowsToAppend.length, logRowsToAppend[0].length).setValues(logRowsToAppend);
    }

    // 3. 盤點單狀態改為已完成
    const sheetAudits = ss.getSheetByName(CONSUM_CONFIG.SHEET_AUDITS);
    const auditData = sheetAudits.getDataRange().getValues();
    for (let r = 1; r < auditData.length; r++) {
      if (String(auditData[r][0]).trim() === String(auditId).trim()) {
        sheetAudits.getRange(r + 1, 3).setValue(nowStr);
        sheetAudits.getRange(r + 1, 4).setValue("已完成");
        if (notes) sheetAudits.getRange(r + 1, 5).setValue(notes);
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
    if (hasLock) lock.releaseLock();
  }
}

// ============================================================================
// 3. 輔助與建表函式
// ============================================================================

function consum_initSheetsIfMissing(ss) {
  const HEADER_STYLE = { bg: "#1b4372", text: "#ffffff" };

  let sItems = ss.getSheetByName(CONSUM_CONFIG.SHEET_ITEMS);
  if (!sItems) {
    sItems = ss.insertSheet(CONSUM_CONFIG.SHEET_ITEMS);
    const headers = ["耗材ID", "名稱", "類別", "規格", "單位", "目前庫存", "安全庫存", "備註", "狀態", "建立時間", "最後更新時間"];
    sItems.appendRow(headers);
    sItems.getRange(1, 1, 1, headers.length).setBackground(HEADER_STYLE.bg).setFontColor(HEADER_STYLE.text).setFontWeight("bold");
    sItems.setFrozenRows(1);
    consum_seedSampleItems(sItems);
  }

  let sLogs = ss.getSheetByName(CONSUM_CONFIG.SHEET_LOGS);
  if (!sLogs) {
    sLogs = ss.insertSheet(CONSUM_CONFIG.SHEET_LOGS);
    const headers = ["時間", "耗材ID", "耗材名稱", "類型", "數量變化", "異動前庫存", "異動後庫存", "人員", "是否名單內", "備註"];
    sLogs.appendRow(headers);
    sLogs.getRange(1, 1, 1, headers.length).setBackground("#8d734a").setFontColor(HEADER_STYLE.text).setFontWeight("bold");
    sLogs.setFrozenRows(1);
  }

  let sAudits = ss.getSheetByName(CONSUM_CONFIG.SHEET_AUDITS);
  if (!sAudits) {
    sAudits = ss.insertSheet(CONSUM_CONFIG.SHEET_AUDITS);
    const headers = ["盤點ID", "開始時間", "完成時間", "狀態", "備註"];
    sAudits.appendRow(headers);
    sAudits.getRange(1, 1, 1, headers.length).setBackground(HEADER_STYLE.bg).setFontColor(HEADER_STYLE.text).setFontWeight("bold");
    sAudits.setFrozenRows(1);
  }

  let sAuditDet = ss.getSheetByName(CONSUM_CONFIG.SHEET_AUDIT_DETAILS);
  if (!sAuditDet) {
    sAuditDet = ss.insertSheet(CONSUM_CONFIG.SHEET_AUDIT_DETAILS);
    const headers = ["盤點ID", "耗材ID", "耗材名稱", "帳面數", "實盤數", "差異", "備註"];
    sAuditDet.appendRow(headers);
    sAuditDet.getRange(1, 1, 1, headers.length).setBackground("#2d5986").setFontColor(HEADER_STYLE.text).setFontWeight("bold");
    sAuditDet.setFrozenRows(1);
  }
}

function consum_seedSampleItems(sheet) {
  const nowStr = consum_formatDate(new Date());
  const samples = [
    ["CON-001", "1.5 mL 微量離心管 (Microcentrifuge Tubes)", "離心管與樣品瓶", "1.5 mL / 圓底帶刻度 / 無菌", "包 (500支/包)", 18, 5, "常用離心與分生實驗", "啟用", nowStr, nowStr]
  ];
  sheet.getRange(2, 1, samples.length, samples[0].length).setValues(samples);
}

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
      id: String(r[0]).trim(),
      name: String(r[1] || ""),
      category: String(r[2] || "其他耗材"),
      spec: String(r[3] || ""),
      specification: String(r[3] || ""),
      unit: String(r[4] || "個"),
      currentStock: parseInt(r[5], 10) || 0,
      safeStock: parseInt(r[6], 10) || 0,
      safetyStock: parseInt(r[6], 10) || 0,
      notes: String(r[7] || ""),
      location: String(r[7] || ""),
      status: String(r[8] || "啟用").trim() === "停用" ? "inactive" : "active",
      createdAt: consum_formatDate(r[9]),
      updatedAt: consum_formatDate(r[10])
    });
  }
  return list;
}

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
  list.reverse();
  return list;
}

function consum_readAuditsSheet(ss) {
  const sheetAudits = ss.getSheetByName(CONSUM_CONFIG.SHEET_AUDITS);
  if (!sheetAudits) return [];
  const aRows = sheetAudits.getDataRange().getValues();
  if (aRows.length <= 1) return [];

  const sheetDet = ss.getSheetByName(CONSUM_CONFIG.SHEET_AUDIT_DETAILS);
  const dRows = sheetDet ? sheetDet.getDataRange().getValues() : [];

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
  audits.reverse();
  return audits;
}

function consum_formatDate(dateVal) {
  if (!dateVal) return "";
  if (dateVal instanceof Date) {
    return Utilities.formatDate(dateVal, CONSUM_CONFIG.TIMEZONE, "yyyy-MM-dd HH:mm");
  }
  return String(dateVal);
}

function consum_responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}