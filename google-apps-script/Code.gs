/**
 * EBB Lab 實驗室請購系統 - Google Apps Script 後端串接腳本 (Code.gs)
 * 
 * 檔案位置：/google-apps-script/Code.gs
 * 
 * 功能說明：
 * 1. 支援接收請購系統前端網頁的 POST 請求 (doPost)。
 * 2. 自動在 Google Sheets 中記錄請購清單與採購進程。
 * 3. 支援連動 Google 表單 (Google Forms) 自動記錄之試算表。
 * 4. 自動透過 Gmail 寄送審批通知與採購進度更新給助理、教授與申請學生。
 * 
 * 設定步驟：
 * 1. 新建 Google Sheets 試算表（例如命名為「EBB Lab 請購與採購紀錄表」）。
 * 2. 點擊試算表頂端選單「擴充功能」->「Apps Script」。
 * 3. 將本檔案全部內容覆蓋貼入「程式碼.gs」(Code.gs)。
 * 4. 修改下方 CONFIG 中的信箱與工作表名稱。
 * 5. 點選右上角「部署」->「新增部署作業」-> 齒輪圖示選「網頁應用程式」：
 *    - 執行身分：我 (您的 Google 帳號)
 *    - 誰可以存取：任何人 (Anyone)
 * 6. 複製獲得的「網頁應用程式網址」(Webhook URL)，貼回前端請購系統的 Webhook 設定欄位中。
 */

const CONFIG = {
  SHEET_NAME_REQUESTS: "請購總表",
  SHEET_NAME_PURCHASED: "已核准採購進程",
  ASSISTANT_EMAIL: "ebblab115@gmail.com",
  PROFESSOR_EMAIL: "klchang@mail.nsysu.edu.tw",
  LAB_NAME: "EBB Lab (海洋永續與生物精煉實驗室)"
};

/**
 * 處理 POST 請求
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseJSON({ success: false, error: "No post data received" });
    }

    const data = JSON.parse(e.postData.contents);
    const action = data.action; // "create_request", "approve_request", "update_purchase_progress", "ping"
    const item = data.item;

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. 測試連線 (Ping)
    if (action === "ping") {
      return responseJSON({ 
        success: true, 
        message: "EBB Lab Apps Script Webhook is active and connected!", 
        timestamp: new Date().toISOString() 
      });
    }

    // 2. 新請購單提交
    if (action === "create_request") {
      const sheet = getOrCreateSheet(ss, CONFIG.SHEET_NAME_REQUESTS, [
        "請購單號", "申請時間", "申請人", "聯絡信箱", "類別", 
        "品項清單與規格", "預估總額 (NT$)", "經費計畫", "請購目的", 
        "建議廠商/平台", "審核狀態", "採購進程", "教授審核模式"
      ]);

      const itemSummary = item.items && item.items.length > 0
        ? item.items.map((it, idx) => `${idx + 1}. ${it.itemName} (${it.quantity} ${it.unit})`).join("\n")
        : `${item.itemName} (${item.quantity} ${item.unit})`;

      const isOver3000 = (item.estimatedTotalPrice >= 3000) || item.requiresProfessorApproval;
      const notifyProf = item.notifyProfessor;
      const modeLabel = isOver3000 
        ? "超過3000元(需三家詢價與教授簽可)" 
        : (notifyProf ? "未滿3000元(申請人勾選通知教授)" : "未滿3000元(助理確認即可)");

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
        "待初審 (pending_assistant)",
        "待審核 (未購買)",
        modeLabel
      ]);

      // 依規範：請購人提交一律發 Mail 通知助理（不論金額高低）
      sendMailToAssistantOnSubmit(item, itemSummary, isOver3000, notifyProf);

      return responseJSON({ success: true, message: "Request logged to Google Sheets and assistant notified." });
    }

    // 2.1 助理初審確認 (未滿 3000 元直接核定，或轉呈教授終審)
    if (action === "assistant_approved_direct") {
      updateSheetRowStatus(ss, CONFIG.SHEET_NAME_REQUESTS, item.requisitionNo, "已核准待採購", "待請購人採購");
      logApprovedItemToProgressSheet(ss, item);
      // 低於 3000 元：助理確認回傳 mail 給請購人（後續購買與否不再 mail 通知，自行在系統查看）
      sendDirectApprovalEmailToApplicant(item);
      return responseJSON({ success: true, message: "Direct assistant approval logged and email returned to applicant." });
    }

    if (action === "assistant_approved_forward_professor") {
      updateSheetRowStatus(ss, CONFIG.SHEET_NAME_REQUESTS, item.requisitionNo, "待教授終審 (pending_professor)", "待審核 (未購買)");
      // 助理確認 -> mail 通知教授
      sendMailToProfessorOnForward(item);
      return responseJSON({ success: true, message: "Assistant confirmed and forwarded email to professor." });
    }

    // 3. 教授終審核准
    if (action === "approve_request") {
      updateSheetRowStatus(ss, CONFIG.SHEET_NAME_REQUESTS, item.requisitionNo, "已核准待採購", item.purchaser === "student" ? "待請購人採購" : "待教授採購");

      // 同步寫入「已核准採購進程」分頁
      logApprovedItemToProgressSheet(ss, item);

      // 教授確認 mail 回傳請購人
      sendApprovalEmailToApplicant(item);

      return responseJSON({ success: true, message: "Approval updated and applicant notified." });
    }

    // 4. 更新購買進程 (包含：請購人已購買、教授已購買、已到貨、已填寫發票)
    if (action === "update_purchase_progress") {
      const progressStatus = data.progressStatus || item.purchaseProgress || "已購買";
      const purchaser = data.purchaser || item.purchaser || "";
      const note = data.note || (item.actualPurchaseInfo ? item.actualPurchaseInfo.note : "") || "";
      const invoiceNo = data.invoiceNo || (item.actualPurchaseInfo ? item.actualPurchaseInfo.invoiceNumber : "") || "";

      // 更新進程表
      updateProgressSheet(ss, item.requisitionNo, progressStatus, purchaser, invoiceNo, note);

      return responseJSON({ success: true, message: `Purchase progress updated to ${progressStatus}` });
    }

    return responseJSON({ success: false, error: `Unknown action: ${action}` });

  } catch (err) {
    return responseJSON({ success: false, error: err.toString() });
  }
}

/**
 * 處理 GET 請求 (提供網頁瀏覽檢查或表單讀取)
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    service: "EBB Lab Procurement Google Apps Script Webhook",
    timestamp: new Date().toISOString(),
    guide: "This endpoint receives POST requests from the EBB Lab Procurement System."
  })).setMimeType(ContentService.MimeType.JSON);
}

// 輔助函式：回傳 JSON
function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// 輔助函式：取得或建立工作表
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

// 輔助函式：更新請購單狀態
function updateSheetRowStatus(ss, sheetName, reqNo, newStatus, newProgress) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === reqNo) {
      sheet.getRange(i + 1, 11).setValue(newStatus); // 審核狀態
      if (newProgress) sheet.getRange(i + 1, 12).setValue(newProgress); // 採購進程
      break;
    }
  }
}

// 輔助函式：寫入已核准進程表
function logApprovedItemToProgressSheet(ss, item) {
  const sheet = getOrCreateSheet(ss, CONFIG.SHEET_NAME_PURCHASED, [
    "請購單號", "核准日期", "品項名稱", "數量/單位", "經費計畫", 
    "指定採購人", "購買進程", "實際金額 (NT$)", "發票/收據號碼", "備註"
  ]);

  const purchaserLabel = item.purchaser === "student" ? "請購人 (學生)" : "教授本人";
  const dateStr = new Date().toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" });

  if (item.items && item.items.length > 0) {
    item.items.forEach(sub => {
      sheet.appendRow([
        item.requisitionNo,
        dateStr,
        sub.itemName,
        `${sub.quantity} ${sub.unit}`,
        item.budgetProject || "待指定",
        purchaserLabel,
        "待採購 (尚未購買)",
        sub.estimatedTotalPrice || 0,
        "",
        sub.productUrl || ""
      ]);
    });
  } else {
    sheet.appendRow([
      item.requisitionNo,
      dateStr,
      item.itemName,
      `${item.quantity} ${item.unit}`,
      item.budgetProject || "待指定",
      purchaserLabel,
      "待採購 (尚未購買)",
      item.estimatedTotalPrice || 0,
      "",
      item.productUrl || ""
    ]);
  }
}

// 輔助函式：更新採購進程工作表
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

// 輔助函式：1. 請購人提交 -> 發信通知助理初審 (依金額標註審批路徑)
function sendMailToAssistantOnSubmit(item, itemSummary, isOver3000, notifyProf) {
  try {
    const routeDesc = isOver3000
      ? "金額超過 3,000 元（依規範需三家詢價，助理確認後需轉呈教授審核）"
      : (notifyProf ? "總額未達 3,000 元，但請購人選擇知會教授審核" : "總額未達 3,000 元（小額請購：助理初審確認即可核定回傳請購人）");

    const subject = `[${CONFIG.LAB_NAME}] 新請購單待審：${item.requisitionNo} - ${item.applicantName} (${isOver3000 ? "需教授終審" : "小額"})`;
    const body = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #1b4372;">EBB Lab 新請購申請通知 (助理待初審)</h2>
        <p>實驗室成員 <strong>${item.applicantName}</strong> (${item.applicantEmail}) 已提交請購申請：</p>
        <div style="background-color: #f8f9fa; border-left: 4px solid #1b4372; padding: 10px 14px; margin: 12px 0;">
          <strong>審批規則路徑：</strong> ${routeDesc}
        </div>
        <table style="border-collapse: collapse; width: 100%; max-width: 600px; margin: 16px 0;">
          <tr style="background-color: #f5f5f5;"><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">請購單號</td><td style="padding: 8px; border: 1px solid #ddd;">${item.requisitionNo}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">申請品項</td><td style="padding: 8px; border: 1px solid #ddd; white-space: pre-wrap;">${itemSummary}</td></tr>
          <tr style="background-color: #f5f5f5;"><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">預估總額</td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #1b4372;">NT$ ${Number(item.estimatedTotalPrice).toLocaleString()}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">建議廠商/平台</td><td style="padding: 8px; border: 1px solid #ddd;">${item.vendorName || item.platform || "無"}</td></tr>
          <tr style="background-color: #f5f5f5;"><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">請購目的</td><td style="padding: 8px; border: 1px solid #ddd;">${item.purpose || "無"}</td></tr>
        </table>
        <p>請助理至請購系統進行審查核可。</p>
      </div>
    `;
    MailApp.sendEmail({
      to: CONFIG.ASSISTANT_EMAIL,
      subject: subject,
      htmlBody: body
    });
  } catch (err) {
    Logger.log("Failed to send assistant submit email: " + err);
  }
}

// 輔助函式：2. 低於 3000 元（未勾選教授）助理確認後直接回傳 Mail 給請購人
function sendDirectApprovalEmailToApplicant(item) {
  if (!item.applicantEmail) return;
  try {
    const subject = `[${CONFIG.LAB_NAME}] 請購核准通知：${item.requisitionNo} 助理審核通過可採購`;
    const body = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #1b4372;">EBB Lab 請購核准通知 (小額採購)</h2>
        <p>親愛的 <strong>${item.applicantName}</strong> 您好：</p>
        <p>您所申請之請購單 <strong>${item.requisitionNo}（${item.itemName}）</strong> 總額為 NT$ ${Number(item.estimatedTotalPrice).toLocaleString()}，經研究助理審核確認無誤，已准予採購！</p>
        <div style="background-color: #e8f5e9; border-left: 4px solid #2e7d32; padding: 10px 14px; margin: 12px 0;">
          <strong>採購指派：</strong> 由申請人 (${item.applicantName}) 自行採購。<br/>
          <strong>助理意見：</strong> ${item.assistantReview?.comment || "初審合格，准予採購。"}
        </div>
        <p style="color: #666; font-size: 13px;">※ 依實驗室規範：總額低於 3,000 元之小額採購，後續購買與否不再另發 Mail 通知，請自行至實驗室請購系統查看進程與回填發票。</p>
      </div>
    `;
    MailApp.sendEmail({
      to: item.applicantEmail,
      subject: subject,
      htmlBody: body
    });
  } catch (err) {
    Logger.log("Failed to send direct approval email: " + err);
  }
}

// 輔助函式：3. 助理確認 -> 發送 Mail 給教授審核 (>3000元 或 請購人主動勾選通知教授)
function sendMailToProfessorOnForward(item) {
  try {
    const isOver3000 = (item.estimatedTotalPrice >= 3000) || item.requiresProfessorApproval;
    const reason = isOver3000 ? "單價或總額達 3,000 元（需三家詢價並經教授簽可）" : "請購人主動勾選知會教授審核";
    const subject = `[${CONFIG.LAB_NAME}] 請購待核定：${item.requisitionNo} - ${item.applicantName} (助理已初審合格)`;
    const body = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #1b4372;">EBB Lab 請購終審簽可通知</h2>
        <p>張教授您好：</p>
        <p>實驗室成員 <strong>${item.applicantName}</strong> 之請購單（${item.requisitionNo}）研究助理已初審合格，轉呈教授終審簽可：</p>
        <div style="background-color: #fff3e0; border-left: 4px solid #e65100; padding: 10px 14px; margin: 12px 0;">
          <strong>轉呈原因：</strong> ${reason}<br/>
          <strong>助理初審意見：</strong> ${item.assistantReview?.comment || "無"}
        </div>
        <table style="border-collapse: collapse; width: 100%; max-width: 600px; margin: 16px 0;">
          <tr style="background-color: #f5f5f5;"><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">請購單號</td><td style="padding: 8px; border: 1px solid #ddd;">${item.requisitionNo}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">品項清單</td><td style="padding: 8px; border: 1px solid #ddd;">${item.itemName}</td></tr>
          <tr style="background-color: #f5f5f5;"><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">預估總額</td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #1b4372;">NT$ ${Number(item.estimatedTotalPrice).toLocaleString()}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">推薦廠商</td><td style="padding: 8px; border: 1px solid #ddd;">${item.vendorName || "無"}</td></tr>
          <tr style="background-color: #f5f5f5;"><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">請購用途</td><td style="padding: 8px; border: 1px solid #ddd;">${item.purpose || "無"}</td></tr>
        </table>
        <p>請教授至請購系統進行終審核定、核定經費來源計畫與指定採購人。</p>
      </div>
    `;
    MailApp.sendEmail({
      to: CONFIG.PROFESSOR_EMAIL,
      subject: subject,
      htmlBody: body
    });
  } catch (err) {
    Logger.log("Failed to send professor forward email: " + err);
  }
}

// 輔助函式：4. 教授終審核准 -> 回傳 Mail 給請購人
function sendApprovalEmailToApplicant(item) {
  if (!item.applicantEmail) return;
  try {
    const purchaserText = item.purchaser === "student" ? "由申請人 (學生) 自行採購並回填發票" : "由教授統籌採購";
    const subject = `[${CONFIG.LAB_NAME}] 請購核准通知：${item.requisitionNo} 教授終審簽可通過`;
    const body = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #1b4372;">EBB Lab 請購單審批通過</h2>
        <p>親愛的 <strong>${item.applicantName}</strong> 您好：</p>
        <p>您的請購單 <strong>${item.requisitionNo} (${item.itemName})</strong> 已獲教授終審簽可通過！</p>
        <div style="background-color: #e8f5e9; border-left: 4px solid #2e7d32; padding: 10px 14px; margin: 12px 0;">
          <strong>採購指派：</strong> ${purchaserText}<br/>
          <strong>核定經費計畫：</strong> ${item.budgetProject || "尚未指定"}<br/>
          ${item.professorReview?.comment ? `<strong>教授指示備註：</strong> ${item.professorReview.comment}` : ""}
        </div>
        <p style="margin-top: 16px;">請依照指定廠商或規範辦理採購。採購完成並取得統一發票或收據後，請前往系統回填實際金額與發票號碼，以利經費核銷。</p>
      </div>
    `;
    MailApp.sendEmail({
      to: item.applicantEmail,
      subject: subject,
      htmlBody: body
    });
  } catch (err) {
    Logger.log("Failed to send applicant approval email: " + err);
  }
}
