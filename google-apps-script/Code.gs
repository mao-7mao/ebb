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
  ADMIN_EMAIL: "ebblab115@gmail.com", // 系統管理員 / 助理
  PROFESSOR_EMAIL: "advise1874@gmail.com", // 教授
  LAB_NAME: "EBB Lab (海洋永續與生物精煉實驗室)",
  WEB_APP_URL: "https://ai.studio/build" // 線上請購系統網址
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
    const action = data.action; 
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
        "建議廠商/平台", "審核狀態", "採購進程", "採購規範說明"
      ]);

      const itemSummary = item.items && item.items.length > 0
        ? item.items.map((it, idx) => `${idx + 1}. ${it.itemName} (${it.quantity} ${it.unit})`).join("\n")
        : `${item.itemName} (${item.quantity} ${item.unit})`;

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
        modeLabel
      ]);

      // 請購人提交一律發 Mail 通知 Admin 初審
      sendMailToAdminOnSubmit(item, itemSummary, isOver3000);

      return responseJSON({ success: true, message: "Request logged to Google Sheets and Admin notified." });
    }

    // 2.1 Admin 退回請購單 (直接通知請購人，不通知教授)
    if (action === "admin_rejected" || action === "assistant_rejected") {
      updateSheetRowStatus(ss, CONFIG.SHEET_NAME_REQUESTS, item.requisitionNo, "已退回 (rejected)", "退回修正");
      sendRejectionEmailToApplicant(item, item.assistantReview?.comment || "請補充詳細規格後重新送出。");
      return responseJSON({ success: true, message: "Admin rejected request and notified applicant directly." });
    }

    // 2.2 Admin 初審通過 -> 轉呈教授終審 (附標準文檔與核簽複選模板)
    if (action === "admin_approved_forward_professor" || action === "assistant_approved_forward_professor") {
      updateSheetRowStatus(ss, CONFIG.SHEET_NAME_REQUESTS, item.requisitionNo, "待教授終審 (pending_professor)", "待審核 (未購買)");
      sendMailToProfessorOnForward(item);
      return responseJSON({ success: true, message: "Admin approved and forwarded requisition with standard document to professor." });
    }

    // 3. 教授終審 (核准或退回，回覆同時抄送助理與請購人)
    if (action === "approve_request" || action === "professor_approved") {
      updateSheetRowStatus(ss, CONFIG.SHEET_NAME_REQUESTS, item.requisitionNo, "已核准待採購", item.purchaser === "student" ? "待請購人採購" : "待教授採購");

      // 同步寫入「已核准採購進程」分頁
      logApprovedItemToProgressSheet(ss, item);

      // 教授核准回覆：同時發送給請購人並抄送助理 (CC)
      sendApprovalEmailToApplicantAndAdmin(item);

      return responseJSON({ success: true, message: "Professor approved; applicant and admin notified." });
    }

    if (action === "professor_rejected") {
      updateSheetRowStatus(ss, CONFIG.SHEET_NAME_REQUESTS, item.requisitionNo, "教授退回 (rejected)", "退回暫不採購");
      sendProfessorRejectionEmail(item);
      return responseJSON({ success: true, message: "Professor rejected; applicant and admin notified." });
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
 * 處理 GET 請求
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

// 輔助函式：1. 請購人提交 -> 發信通知 Admin 初審
function sendMailToAdminOnSubmit(item, itemSummary, isOver3000) {
  try {
    const policyDesc = isOver3000
      ? "★ 單價或總額達 3,000 元以上（依規定需檢附多家廠商詢價比價，初審後呈送教授審核）"
      : "★ 小額請購（總額未滿 3,000 元，單一廠商免比價，初審後呈送教授審核）";

    const subject = `[${CONFIG.LAB_NAME}] 新請購單待審：${item.requisitionNo} - ${item.applicantName} (${isOver3000 ? "≥3000元" : "小額"})`;
    const body = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #1b4372;">EBB Lab 新請購申請通知 (Admin 初審)</h2>
        <p>實驗室成員 <strong>${item.applicantName}</strong> (${item.applicantEmail}) 已提交請購申請：</p>
        <div style="background-color: #f8f9fa; border-left: 4px solid #1b4372; padding: 10px 14px; margin: 12px 0;">
          <strong>採購規範路徑：</strong> ${policyDesc}
        </div>
        <table style="border-collapse: collapse; width: 100%; max-width: 600px; margin: 16px 0;">
          <tr style="background-color: #f5f5f5;"><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">請購單號</td><td style="padding: 8px; border: 1px solid #ddd;">${item.requisitionNo}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">申請品項</td><td style="padding: 8px; border: 1px solid #ddd; white-space: pre-wrap;">${itemSummary}</td></tr>
          <tr style="background-color: #f5f5f5;"><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">預估總額</td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #1b4372;">NT$ ${Number(item.estimatedTotalPrice).toLocaleString()}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">建議廠商/平台</td><td style="padding: 8px; border: 1px solid #ddd;">${item.vendorName || item.platform || "無"}</td></tr>
          <tr style="background-color: #f5f5f5;"><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">請購目的</td><td style="padding: 8px; border: 1px solid #ddd;">${item.purpose || "無"}</td></tr>
        </table>
        <p>請 Admin 登入系統進行初審；初審合格後系統將自動發送標準文檔與核簽複選單給教授終審。</p>
      </div>
    `;
    MailApp.sendEmail({
      to: CONFIG.ADMIN_EMAIL,
      subject: subject,
      htmlBody: body
    });
  } catch (err) {
    Logger.log("Failed to send admin submit email: " + err);
  }
}

// 輔助函式：2. Admin 退回請購單 -> 直接發信通知請購人（不通知教授）
function sendRejectionEmailToApplicant(item, reason) {
  if (!item.applicantEmail) return;
  try {
    const subject = `[${CONFIG.LAB_NAME}] 請購退回通知：單號 ${item.requisitionNo} 初審未通過說明`;
    const body = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #b91c1c;">EBB Lab 請購單初審退回通知</h2>
        <p> <strong>${item.applicantName}</strong> 您好：</p>
        <p>您於系統申請之請購單 <strong>${item.requisitionNo} (${item.itemName})</strong> 經 Admin 初審未通過，原因說明如下：</p>
        <div style="background-color: #fef2f2; border-left: 4px solid #b91c1c; padding: 10px 14px; margin: 12px 0;">
          <strong>退回原因：</strong> ${reason}
        </div>
        <p>請根據審核意見調整品項規格、比價證明或相關資訊後，重新至系統提交申請。</p>
      </div>
    `;
    MailApp.sendEmail({
      to: item.applicantEmail,
      cc: CONFIG.ADMIN_EMAIL,
      subject: subject,
      htmlBody: body
    });
  } catch (err) {
    Logger.log("Failed to send rejection email: " + err);
  }
}

// 輔助函式：3. Admin 初審通過 -> 發送 Mail 給教授終審 (含標準文檔 + 複選框模式 + 同時抄送助理與請購人)
function sendMailToProfessorOnForward(item) {
  try {
    const isOver3000 = (item.estimatedTotalPrice >= 3000);
    const policyDesc = isOver3000
      ? "★ 單價或總額達 3,000 元以上（已依規定檢附詢價/比價資訊）"
      : "★ 小額請購（總額未滿 3,000 元，單一廠商免附多家比價）";

    const itemsList = item.items && item.items.length > 0 ? item.items : [item];
    const itemsTableRows = itemsList.map((it, idx) => `
      <tr style="${idx % 2 === 1 ? 'background-color: #f9fafb;' : ''}">
        <td style="padding: 6px 8px; border: 1px solid #e5e7eb;">${idx + 1}</td>
        <td style="padding: 6px 8px; border: 1px solid #e5e7eb; font-weight: bold;">${it.itemName}</td>
        <td style="padding: 6px 8px; border: 1px solid #e5e7eb;">${it.specModel || "標準規格"}</td>
        <td style="padding: 6px 8px; border: 1px solid #e5e7eb; text-align: center;">${it.quantity} ${it.unit}</td>
        <td style="padding: 6px 8px; border: 1px solid #e5e7eb; text-align: right; font-family: monospace;">NT$ ${(it.estimatedTotalPrice || 0).toLocaleString()}</td>
        <td style="padding: 6px 8px; border: 1px solid #e5e7eb;">${it.vendorName || "自選"}</td>
      </tr>
    `).join("");

    const approvalReplySubject = encodeURIComponent(`Re: [EBB Lab 請購簽核回覆] 單號 ${item.requisitionNo} - 教授核准通過`);
    const rejectionReplySubject = encodeURIComponent(`Re: [EBB Lab 請購簽核回覆] 單號 ${item.requisitionNo} - 教授不予通過`);

    const approvalReplyBody = encodeURIComponent(
      `【教授請購審核回覆 - 核准通過】\n請購單號：${item.requisitionNo}\n申請人：${item.applicantName}\n預估總額：NT$ ${Number(item.estimatedTotalPrice).toLocaleString()}\n\n■ 教授核定決策：\n[x] 【核准通過】 (Approved)\n    指定採購人：[x] 請購人自購   [ ] 貨到後由計畫付款   [ ] 教授統購\n    核定經費計畫：${item.budgetProject || "由助理依案號辦理"}\n    簽核意見：准予採購\n\n[ ] 【不予通過 / 退回修正】 (Rejected)\n    退回原因：\n\n※ 本回信自動同時抄送實驗室 Admin (${CONFIG.ADMIN_EMAIL}) 與請購人 (${item.applicantEmail})。`
    );

    const rejectionReplyBody = encodeURIComponent(
      `【教授請購審核回覆 - 不予通過】\n請購單號：${item.requisitionNo}\n申請人：${item.applicantName}\n預估總額：NT$ ${Number(item.estimatedTotalPrice).toLocaleString()}\n\n■ 教授核定決策：\n[ ] 【核准通過】 (Approved)\n\n[x] 【不予通過 / 退回修正】 (Rejected)\n    退回原因：規格不符或經費考量暫不採購\n\n※ 本回信自動同時抄送實驗室 Admin (${CONFIG.ADMIN_EMAIL}) 與請購人 (${item.applicantEmail})。`
    );

    const approvalMailtoUrl = `mailto:${CONFIG.ADMIN_EMAIL}?cc=${encodeURIComponent(item.applicantEmail || "")}&subject=${approvalReplySubject}&body=${approvalReplyBody}`;
    const rejectionMailtoUrl = `mailto:${CONFIG.ADMIN_EMAIL}?cc=${encodeURIComponent(item.applicantEmail || "")}&subject=${rejectionReplySubject}&body=${rejectionReplyBody}`;

    const subject = `[${CONFIG.LAB_NAME}] 請購簽核：單號 ${item.requisitionNo} - ${item.applicantName} 申請 (預估 NT$ ${Number(item.estimatedTotalPrice).toLocaleString()})`;
    const htmlBody = `
      <div style="font-family: Arial, 'Microsoft JhengHei', sans-serif; line-height: 1.6; color: #1e293b; max-width: 700px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden;">
        <!-- Header -->
        <div style="background-color: #1b4372; color: #ffffff; padding: 16px 20px;">
          <h2 style="margin: 0; font-size: 18px; letter-spacing: 0.5px;">國立中山大學 EBB Lab 請購審核簽呈</h2>
          <div style="font-size: 12px; color: #cbd5e1; margin-top: 4px;">請購單號：<strong>${item.requisitionNo}</strong> ｜ 申請人：${item.applicantName} ｜ 總額：NT$ ${Number(item.estimatedTotalPrice).toLocaleString()}</div>
        </div>

        <!-- Content -->
        <div style="padding: 20px;">
          <p style="margin-top: 0;">張教授您好：</p>
          <p>實驗室成員 <strong>${item.applicantName}</strong> (${item.applicantEmail}) 已提交請購單，經 Admin 初審合格轉呈您終審核定：</p>
          
          <div style="background-color: #f8fafc; border-left: 4px solid #1b4372; padding: 10px 14px; margin: 14px 0; font-size: 13px;">
            <strong>採購規範：</strong> ${policyDesc}<br/>
            <strong>請購目的：</strong> ${item.purpose || "無"}<br/>
            <strong>建議經費計畫：</strong> ${item.budgetProject || "待教授指定"}<br/>
            <strong>Admin 初審意見：</strong> ${item.assistantReview?.comment || "初審合格，轉呈教授終審。"}
          </div>

          <!-- Standard Document Items Table -->
          <h3 style="font-size: 14px; color: #1b4372; margin-top: 18px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
            【標準請購單品項清單明細】
          </h3>
          <table style="border-collapse: collapse; width: 100%; font-size: 12px; margin-bottom: 18px;">
            <thead>
              <tr style="background-color: #f1f5f9; text-align: left;">
                <th style="padding: 6px 8px; border: 1px solid #cbd5e1; width: 30px;">#</th>
                <th style="padding: 6px 8px; border: 1px solid #cbd5e1;">品項名稱</th>
                <th style="padding: 6px 8px; border: 1px solid #cbd5e1;">規格/型號</th>
                <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center;">數量</th>
                <th style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: right;">預估金額</th>
                <th style="padding: 6px 8px; border: 1px solid #cbd5e1;">廠商/平台</th>
              </tr>
            </thead>
            <tbody>
              ${itemsTableRows}
            </tbody>
          </table>

          <!-- Checkbox Approval Mode -->
          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 16px; margin: 18px 0;">
            <h3 style="margin-top: 0; font-size: 14px; color: #1e40af; border-bottom: 1px solid #bfdbfe; padding-bottom: 6px;">
              【教授請購審核核定表 (複選框回覆模式)】
            </h3>
            <p style="font-size: 12px; color: #1e3a8a; margin-bottom: 10px;">
              為提高簽核效率，您可直接點擊下方按鈕一鍵回覆（將自動同時抄送助理與請購人）：
            </p>

            <div style="display: flex; gap: 12px; margin: 14px 0;">
              <a href="${approvalMailtoUrl}" style="display: inline-block; background-color: #15803d; color: #ffffff; padding: 10px 18px; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 13px;">
                ☑️ 一鍵以【核准通過】回覆 (CC 請購人與助理)
              </a>
              <a href="${rejectionMailtoUrl}" style="display: inline-block; background-color: #b91c1c; color: #ffffff; padding: 10px 18px; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 13px;">
                ❌ 一鍵以【不通過/退回】回覆 (CC 請購人與助理)
              </a>
            </div>

            <div style="background-color: #ffffff; border: 1px solid #e2e8f0; padding: 10px; font-family: monospace; font-size: 11px; line-height: 1.5; color: #334155; margin-top: 10px;">
              [x] 【核准通過】 (Approved)<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;指定採購人：[x] 請購人自購 &nbsp;&nbsp; [ ] 貨到後由計畫付款 &nbsp;&nbsp; [ ] 教授統購<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;核定經費計畫：${item.budgetProject || "_________________（由助理依案號辦理）"}<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;教授意見：准予採購<br/><br/>
              [ ] 【不予通過 / 退回修正】 (Rejected)<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;退回原因：________________________________________
            </div>
          </div>

          <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">
            ※ 教授亦可直接開啟 <a href="${CONFIG.WEB_APP_URL}" style="color: #1b4372; font-weight: bold;">EBB Lab 請購系統</a> 進行網頁上一鍵審批。
          </p>
        </div>
      </div>
    `;

    MailApp.sendEmail({
      to: CONFIG.PROFESSOR_EMAIL,
      cc: `${CONFIG.ADMIN_EMAIL},${item.applicantEmail || ""}`,
      subject: subject,
      htmlBody: htmlBody
    });
  } catch (err) {
    Logger.log("Failed to send professor forward email: " + err);
  }
}

// 輔助函式：4. 教授核准回覆 -> 發信給請購人，同時抄送助理 (CC)
function sendApprovalEmailToApplicantAndAdmin(item) {
  if (!item.applicantEmail) return;
  try {
    const purchaserText = item.purchaser === "student" ? "由申請人 (學生) 自行採購並回填發票" : "由教授統籌採購";
    const subject = `[${CONFIG.LAB_NAME}] 請購核准通知：單號 ${item.requisitionNo} 已獲教授簽可通過`;
    const body = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #1b4372;">EBB Lab 請購單審批通過</h2>
        <p> <strong>${item.applicantName}</strong> 您好：</p>
        <p>您的請購單 <strong>${item.requisitionNo} (${item.itemName})</strong> 已獲教授終審簽可通過！</p>
        <div style="background-color: #e8f5e9; border-left: 4px solid #2e7d32; padding: 10px 14px; margin: 12px 0;">
          <strong>採購指派：</strong> ${purchaserText}<br/>
          <strong>核定經費計畫：</strong> ${item.budgetProject || "尚未指定"}<br/>
          ${item.professorReview?.comment ? `<strong>教授簽核意見：</strong> ${item.professorReview.comment}` : ""}
        </div>
        <p style="margin-top: 16px;">請依照指定廠商或規範辦理採購。採購完成並取得統一發票或收據後，請前往系統回填實際金額與發票號碼，以利經費核銷。</p>
        <p style="color: #64748b; font-size: 12px;">※ 本通知信已同步抄送實驗室 Admin (${CONFIG.ADMIN_EMAIL})。</p>
      </div>
    `;
    MailApp.sendEmail({
      to: item.applicantEmail,
      cc: CONFIG.ADMIN_EMAIL,
      subject: subject,
      htmlBody: body
    });
  } catch (err) {
    Logger.log("Failed to send applicant approval email: " + err);
  }
}

// 輔助函式：5. 教授退回回覆 -> 發信給請購人，同時抄送助理 (CC)
function sendProfessorRejectionEmail(item) {
  if (!item.applicantEmail) return;
  try {
    const subject = `[${CONFIG.LAB_NAME}] 請購退回通知：單號 ${item.requisitionNo} 教授退回說明`;
    const body = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #b91c1c;">EBB Lab 請購單退回通知</h2>
        <p> <strong>${item.applicantName}</strong> 您好：</p>
        <p>您的請購單 <strong>${item.requisitionNo} (${item.itemName})</strong> 經教授審核暫不通過，退回原因說明如下：</p>
        <div style="background-color: #fef2f2; border-left: 4px solid #b91c1c; padding: 10px 14px; margin: 12px 0;">
          <strong>退回原因：</strong> ${item.professorReview?.comment || "經費考量或規格不符暫不採購。"}
        </div>
        <p>如有任何疑問，請與助理或教授進一步討論。</p>
      </div>
    `;
    MailApp.sendEmail({
      to: item.applicantEmail,
      cc: CONFIG.ADMIN_EMAIL,
      subject: subject,
      htmlBody: body
    });
  } catch (err) {
    Logger.log("Failed to send professor rejection email: " + err);
  }
}
