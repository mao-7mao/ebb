import { HistoricalCatalogItem, ProcurementItem } from "../types/procurement";

export const DEFAULT_VENDORS = [
  "Sigma-Aldrich (Merck)",
  "Echo Chemical 景明化工",
  "Acros Organics (賽默飛 Thermo Fisher)",
  "科研市集",
  "Alfa Aesar",
  "友和生技 Uni-Onward",
  "伯昂興業 Ber-An",
  "巨研科技 Advantech",
  "德記儀器 Teki Lab Supply",
  "三洋精密儀器 Sanyo Scientific",
  "淘寶 / 天貓商家"
];

// 常用與預設購物平台清單 (支援使用者即時新增與本地記憶)
export const DEFAULT_SHOPPING_PLATFORMS: string[] = [
  "蝦皮購物 (Shopee)",
  "淘寶 (Taobao)",
  "京東 (JD)",
  "1688",
  "Sigma-Aldrich (默克)",
  "TCI 梯希愛",
  "景明化工",
  "德記儀器",
  "原廠直接訂購"
];

// 角色安全權限密碼 (預設密碼，支援修改與各端獨立驗證)
export const DEFAULT_ROLE_PASSWORDS = {
  admin: "ebbadmin"          // 系統管理者
};

// 幣種符號與換算匯率參考 (提供台幣、美元、人民幣即時對照)
export const CURRENCY_CONFIG: Record<"TWD" | "USD" | "CNY", { label: string; nameZh: string; symbol: string; approxRateToTwd: number }> = {
  TWD: { label: "新台幣 (TWD)", nameZh: "台幣 TWD", symbol: "NT$", approxRateToTwd: 1 },
  USD: { label: "美元 (USD)", nameZh: "美元 USD", symbol: "$", approxRateToTwd: 32.5 },
  CNY: { label: "人民幣 (CNY)", nameZh: "人民幣 CNY", symbol: "¥", approxRateToTwd: 4.6 }
};

export function formatPriceWithCurrency(price: number, currency: "TWD" | "USD" | "CNY" = "TWD"): string {
  const cfg = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.TWD;
  return `${cfg.symbol} ${price.toLocaleString()}`;
}

export function convertToTwdEstimate(price: number, currency: "TWD" | "USD" | "CNY" = "TWD"): number {
  const rate = CURRENCY_CONFIG[currency]?.approxRateToTwd || 1;
  return Math.round(price * rate);
}

export const DEFAULT_HISTORICAL_CATALOG: HistoricalCatalogItem[] = [
  {
    id: "hist-1",
    category: "chemical",
    itemName: "氯化膽鹼 (Choline Chloride)",
    englishName: "Choline Chloride, >=98%",
    casNumber: "67-48-1",
    purity: "98.0% AR grade",
    packageSize: "500 g",
    vendorName: "Echo Chemical 景明化工",
    lastUnitPrice: 1450,
    currency: "NTD",
    brand: "Acros Organics",
    productUrl: "https://www.echo-chem.com.tw"
  }
];

export const INITIAL_PROCUREMENT_ITEMS: ProcurementItem[] = [];

export const GOOGLE_APPS_SCRIPT_SAMPLE = `/**
 * EBB Lab 實驗室請購系統 - Google Apps Script 後端串接腳本 (Code.gs)
 * 
 * 檔案位置：/google-apps-script/Code.gs
 * 
 * 功能說明：
 * 1. 支援接收請購系統前端網頁的 POST 請求 (doPost)。
 * 2. 支援前端 (Admin 或 任何使用者) GET 請求 (doGet)，即時回傳試算表中的請購資料清單。
 * 3. 自動在 Google Sheets 中記錄請購清單與採購進程。
 * 4. 自動透過 Gmail 寄送審批通知與採購進度更新給助理、教授與申請學生。
 * 
 * 設定步驟：
 * 1. 開啟您的 Google 試算表（例如「EBB Lab 請購與採購紀錄表」）。
 * 2. 點擊頂端選單「擴充功能」->「Apps Script」。
 * 3. 將本檔案全部內容覆蓋貼入「程式碼.gs」(Code.gs)。
 * 4. 點選右上角「部署」->「管理部署作業」-> 點擊鉛筆圖示 -> 版本選「新版本」-> 點擊「部署」。
 */

const CONFIG = {
  SHEET_NAME_REQUESTS: "請購總表",
  SHEET_NAME_PURCHASED: "已核准採購進程",
  ADMIN_EMAIL: "ebblab115@gmail.com",
  PROFESSOR_EMAIL: "klchang@mail.nsysu.edu.tw",
  LAB_NAME: "EBB Lab",
  WEB_APP_URL: "https://ai.studio/build"
};

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseJSON({ success: false, error: "No post data received" });
    }

    const data = JSON.parse(e.postData.contents);
    const action = data.action; 
    const item = data.item;
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "ping") {
      return responseJSON({ success: true, message: "EBB Lab Apps Script Webhook is active and connected!" });
    }
    
    if (action === "create_request") {
      const sheet = getOrCreateSheet(ss, CONFIG.SHEET_NAME_REQUESTS, [
        "請購單號", "申請時間", "申請人", "聯絡信箱", "類別", 
        "品項清單與規格", "預估總額 (NT$)", "經費計畫", "請購目的", 
        "建議廠商/平台", "審核狀態", "採購進程", "採購規範說明", "資料細節(JSON)"
      ]);

      const itemSummary = item.items && item.items.length > 0
        ? item.items.map((it, idx) => \`\${idx + 1}. \${it.itemName} (\${it.quantity} \${it.unit})\`).join("\\n")
        : \`\${item.itemName} (\${item.quantity} \${item.unit})\`;

      const isOver3000 = (item.estimatedTotalPrice >= 3000);
      const modeLabel = isOver3000 
        ? "達3,000元(需附多家比價，Admin初審後送教授終審)" 
        : "未滿3,000元小額(免比價，Admin初審後送教授終審)";

      sheet.appendRow([
        item.requisitionNo || "",
        item.createdAt || new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }),
        item.applicantName || "",
        item.applicantEmail || "",
        item.category || "",
        itemSummary,
        item.estimatedTotalPrice || 0,
        item.budgetProject || "待指定",
        item.purpose || "",
        item.vendorName || item.platform || "",
        "待Admin初審 (pending_assistant)",
        "待審核 (未購買)",
        modeLabel,
        JSON.stringify(item)
      ]);

      sendMailToAdminOnSubmit(item, itemSummary, isOver3000);
      return responseJSON({ success: true, message: "Request logged to Google Sheets and Admin notified." });
    }

    if (action === "admin_rejected" || action === "assistant_rejected") {
      updateSheetRowStatus(ss, CONFIG.SHEET_NAME_REQUESTS, item.requisitionNo, "已退回 (rejected)", "退回修正", item);
      sendRejectionEmailToApplicant(item, item.assistantReview?.comment || "請補充詳細規格後重新送出。");
      return responseJSON({ success: true, message: "Admin rejected request." });
    }

    if (action === "admin_approved_forward_professor" || action === "assistant_approved_forward_professor") {
      updateSheetRowStatus(ss, CONFIG.SHEET_NAME_REQUESTS, item.requisitionNo, "待教授終審 (pending_professor)", "待審核 (未購買)", item);
      sendMailToProfessorOnForward(item);
      return responseJSON({ success: true, message: "Forwarded to professor." });
    }

    if (action === "approve_request" || action === "professor_approved") {
      updateSheetRowStatus(ss, CONFIG.SHEET_NAME_REQUESTS, item.requisitionNo, "已核准待採購", item.purchaser === "student" ? "待請購人採購" : item.purchaser === "postpayment" ? "貨到後付款" : "待教授採購", item);
      logApprovedItemToProgressSheet(ss, item);
      sendApprovalEmailToApplicantAndAdmin(item);
      return responseJSON({ success: true, message: "Professor approved." });
    }

    if (action === "professor_rejected") {
      updateSheetRowStatus(ss, CONFIG.SHEET_NAME_REQUESTS, item.requisitionNo, "教授退回 (rejected)", "退回暫不採購", item);
      sendProfessorRejectionEmail(item);
      return responseJSON({ success: true, message: "Professor rejected." });
    }

    if (action === "update_request" && item && item.requisitionNo) {
      updateSheetRowStatus(ss, CONFIG.SHEET_NAME_REQUESTS, item.requisitionNo, item.status || "待審核", item.purchaseProgress || "", item);
      return responseJSON({ success: true, message: \`Requisition \${item.requisitionNo} updated.\` });
    }

    if (action === "update_purchase_progress") {
      const progressStatus = data.progressStatus || item.purchaseProgress || "已購買";
      const purchaser = data.purchaser || item.purchaser || "";
      const note = data.note || (item.actualPurchaseInfo ? item.actualPurchaseInfo.note : "") || "";
      const invoiceNo = data.invoiceNo || (item.actualPurchaseInfo ? item.actualPurchaseInfo.invoiceNumber : "") || "";
      updateProgressSheet(ss, item.requisitionNo, progressStatus, purchaser, invoiceNo, note);
      if (item && item.requisitionNo) {
        updateSheetRowStatus(ss, CONFIG.SHEET_NAME_REQUESTS, item.requisitionNo, item.status, progressStatus, item);
      }
      return responseJSON({ success: true, message: "Progress updated." });
    }

    return responseJSON({ success: false, error: "Unknown action" });
  } catch (err) {
    return responseJSON({ success: false, error: err.toString() });
  }
}

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(CONFIG.SHEET_NAME_REQUESTS);
    if (!sheet) {
      const sheets = ss.getSheets();
      if (sheets && sheets.length > 0) sheet = sheets[0];
    }
    if (!sheet) return responseJSON({ success: true, count: 0, items: [] });

    const data = sheet.getDataRange().getValues();
    if (!data || data.length <= 1) return responseJSON({ success: true, count: 0, items: [] });

    const items = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row[0] && !row[2] && !row[5]) continue;

      if (row[13] && typeof row[13] === "string" && row[13].trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(row[13]);
          if (parsed && (parsed.requisitionNo || parsed.id)) {
            if (row[10]) parsed.status = mapStatus(row[10]);
            if (row[11]) parsed.purchaseProgress = mapProgress(row[11]);
            items.push(parsed);
            continue;
          }
        } catch (err) {}
      }

      const reqNo = String(row[0] || \`EBB-\${i}\`).trim();
      let createdAt = "";
      if (row[1] instanceof Date) {
        createdAt = Utilities.formatDate(row[1], "GMT+8", "yyyy-MM-dd");
      } else {
        createdAt = String(row[1] || "").trim();
      }
      const applicantName = String(row[2] || "未具名").trim();
      const applicantEmail = String(row[3] || "").trim();
      const rawCategory = String(row[4] || "consumable").trim().toLowerCase();
      const category = rawCategory === "chemical" ? "chemical" : rawCategory === "equipment" ? "equipment" : "consumable";
      const itemSummary = String(row[5] || "").trim();
      const estimatedTotalPrice = Number(row[6]) || 0;
      const budgetProject = String(row[7] || "待指定").trim();
      const purpose = String(row[8] || "").trim();
      const vendorName = String(row[9] || "").trim();
      const status = mapStatus(String(row[10] || "pending_assistant"));
      const purchaseProgress = mapProgress(String(row[11] || "pending_purchase"));

      const parsedSubItems = parseItemSummary(itemSummary, category, estimatedTotalPrice, purpose, vendorName);

      items.push({
        id: \`req_sheet_\${reqNo.replace(/[^a-zA-Z0-9_-]/g, "")}_\${i}\`,
        requisitionNo: reqNo,
        createdAt: createdAt || new Date().toISOString().split("T")[0],
        applicantName: applicantName,
        applicantEmail: applicantEmail,
        category: category,
        itemName: parsedSubItems[0]?.itemName || itemSummary || "請購品項",
        quantity: parsedSubItems[0]?.quantity || 1,
        unit: parsedSubItems[0]?.unit || "件",
        estimatedUnitPrice: parsedSubItems[0]?.estimatedUnitPrice || estimatedTotalPrice,
        estimatedTotalPrice: estimatedTotalPrice,
        budgetProject: budgetProject,
        purpose: purpose,
        vendorName: vendorName,
        status: status,
        purchaseProgress: purchaseProgress,
        purchaser: "unassigned",
        items: parsedSubItems
      });
    }
    
    items.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    return responseJSON({ success: true, timestamp: new Date().toISOString(), count: items.length, items: items });
  } catch (err) {
    return responseJSON({ success: false, error: err.toString() });
  }
}

function mapStatus(statusStr) {
  if (!statusStr) return "pending_assistant";
  const s = String(statusStr).toLowerCase();
  if (s.includes("pending_professor") || s.includes("待教授")) return "pending_professor";
  if (s.includes("partially_approved") || s.includes("部分通過")) return "partially_approved";
  if (s.includes("approved") || s.includes("已核准") || s.includes("通過")) return "approved";
  if (s.includes("rejected") || s.includes("退回") || s.includes("不予通過")) return "rejected";
  if (s.includes("purchased") || s.includes("已採購") || s.includes("入庫")) return "purchased";
  return "pending_assistant";
}

function mapProgress(progStr) {
  if (!progStr) return "pending_purchase";
  const s = String(progStr).toLowerCase();
  if (s.includes("completed") || s.includes("入庫") || s.includes("完成")) return "completed";
  if (s.includes("arrived") || s.includes("到貨")) return "arrived";
  if (s.includes("student_purchased") || s.includes("請購人已買")) return "student_purchased";
  if (s.includes("professor_purchased") || s.includes("教授已買")) return "professor_purchased";
  if (s.includes("postpayment") || s.includes("貨到")) return "postpayment";
  return "pending_purchase";
}

function parseItemSummary(summary, category, totalPrice, purpose, vendor) {
  if (!summary) return [{ id: "line_1", category, itemName: "請購品項", quantity: 1, unit: "件", estimatedUnitPrice: totalPrice, estimatedTotalPrice: totalPrice, purpose, vendorName: vendor, status: "pending_assistant" }];
  const lines = summary.split("\\n").map(l => l.trim()).filter(Boolean);
  const result = [];
  lines.forEach((line, idx) => {
    let cleanLine = line.replace(/^\\d+[\\.\\、\\)]\\s*/, "");
    let qty = 1;
    let unit = "件";
    const match = cleanLine.match(/\\(([^)]+)\\)$/);
    if (match) {
      const inner = match[1].trim();
      cleanLine = cleanLine.replace(/\\(([^)]+)\\)$/, "").trim();
      const qtyMatch = inner.match(/^(\\d+(?:\\.\\d+)?)\\s*(.*)$/);
      if (qtyMatch) {
        qty = parseFloat(qtyMatch[1]) || 1;
        unit = qtyMatch[2] || "件";
      } else {
        unit = inner;
      }
    }
    const unitPrice = lines.length === 1 ? Math.round(totalPrice / (qty || 1)) : 0;
    result.push({ id: \`line_\${idx + 1}\`, category, itemName: cleanLine || "品項", quantity: qty, unit, estimatedUnitPrice: unitPrice, estimatedTotalPrice: lines.length === 1 ? totalPrice : 0, purpose, vendorName: vendor, status: "pending_assistant" });
  });
  return result.length > 0 ? result : [{ id: "line_1", category, itemName: summary, quantity: 1, unit: "件", estimatedUnitPrice: totalPrice, estimatedTotalPrice: totalPrice, purpose, vendorName: vendor, status: "pending_assistant" }];
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(ss, name, defaultHeaders) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (defaultHeaders && defaultHeaders.length > 0) {
      sheet.appendRow(defaultHeaders);
      sheet.getRange(1, 1, 1, defaultHeaders.length).setBackground("#e8f0fe").setFontWeight("bold");
    }
  }
  return sheet;
}

function updateSheetRowStatus(ss, sheetName, reqNo, newStatus, newProgress, updatedItem) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    const sheets = ss.getSheets();
    if (sheets && sheets.length > 0) sheet = sheets[0];
  }
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(reqNo).trim()) {
      sheet.getRange(i + 1, 11).setValue(newStatus);
      if (newProgress) sheet.getRange(i + 1, 12).setValue(newProgress);
      if (updatedItem) sheet.getRange(i + 1, 14).setValue(JSON.stringify(updatedItem));
      break;
    }
  }
}

function logApprovedItemToProgressSheet(ss, item) {
  const sheet = getOrCreateSheet(ss, CONFIG.SHEET_NAME_PURCHASED, ["請購單號", "核准日期", "品項名稱", "數量/單位", "經費計畫", "指定採購人", "購買進程", "實際金額 (NT$)", "發票/收據號碼", "備註"]);
  const purchaserLabel = item.purchaser === "student" ? "請購人 (學生)" : item.purchaser === "postpayment" ? "貨到後計畫付款" : "教授本人";
  const dateStr = new Date().toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" });
  const itemsList = item.items && item.items.length > 0 ? item.items : [item];
  itemsList.forEach(sub => {
    sheet.appendRow([item.requisitionNo, dateStr, sub.itemName, \`\${sub.quantity} \${sub.unit}\`, item.budgetProject || "待指定", purchaserLabel, "待採購 (尚未購買)", sub.estimatedTotalPrice || 0, "", sub.productUrl || ""]);
  });
}

function updateProgressSheet(ss, reqNo, progress, purchaser, invoiceNo, note) {
  const sheet = getOrCreateSheet(ss, CONFIG.SHEET_NAME_PURCHASED);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === reqNo) {
      if (purchaser) sheet.getRange(i + 1, 6).setValue(purchaser);
      if (progress) sheet.getRange(i + 1, 7).setValue(progress);
      if (invoiceNo) sheet.getRange(i + 1, 9).setValue(invoiceNo);
      if (note) sheet.getRange(i + 1, 10).setValue(note);
    }
  }
}

function sendMailToAdminOnSubmit(item, itemSummary, isOver3000) {
  try {
    const subject = \`[\${CONFIG.LAB_NAME}] 新請購單待審：\${item.requisitionNo} - \${item.applicantName}\`;
    const body = \`新請購單 \${item.requisitionNo} 已提交：\\n申請人：\${item.applicantName} (\${item.applicantEmail})\\n品項：\${itemSummary}\\n預估總額：NT$ \${Number(item.estimatedTotalPrice).toLocaleString()}\`;
    MailApp.sendEmail({ to: CONFIG.ADMIN_EMAIL, subject: subject, body: body });
  } catch (err) {}
}

function sendRejectionEmailToApplicant(item, reason) {
  if (!item.applicantEmail) return;
  try {
    MailApp.sendEmail({ to: item.applicantEmail, subject: \`[\${CONFIG.LAB_NAME}] 請購退回通知：單號 \${item.requisitionNo}\`, body: \`請購單 \${item.requisitionNo} 初審未通過：\${reason}\` });
  } catch (err) {}
}

function sendMailToProfessorOnForward(item) {
  try {
    MailApp.sendEmail({ to: CONFIG.PROFESSOR_EMAIL, cc: \`\${CONFIG.ADMIN_EMAIL},\${item.applicantEmail || ""}\`, subject: \`[\${CONFIG.LAB_NAME}] 請購簽核：單號 \${item.requisitionNo} - \${item.applicantName}\`, body: \`請購單 \${item.requisitionNo} 經 Admin 初審合格轉呈核定。\` });
  } catch (err) {}
}

function sendApprovalEmailToApplicantAndAdmin(item) {
  if (!item.applicantEmail) return;
  try {
    MailApp.sendEmail({ to: item.applicantEmail, cc: CONFIG.ADMIN_EMAIL, subject: \`[\${CONFIG.LAB_NAME}] 請購核准通知：單號 \${item.requisitionNo} 已獲教授簽可通過\`, body: \`請購單 \${item.requisitionNo} 已獲教授簽可通過，可辦理採購。\` });
  } catch (err) {}
}

function sendProfessorRejectionEmail(item) {
  if (!item.applicantEmail) return;
  try {
    MailApp.sendEmail({ to: item.applicantEmail, cc: CONFIG.ADMIN_EMAIL, subject: \`[\${CONFIG.LAB_NAME}] 請購退回通知：單號 \${item.requisitionNo}\`, body: \`請購單 \${item.requisitionNo} 經教授審核暫不通過。\` });
  } catch (err) {}
}
`;

