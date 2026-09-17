/**
 * EBB Lab 實驗室成員、會議時程與研究進度系統 - Google Apps Script 後端串接腳本
 * 檔案位置：/google-apps-script/MemberData_Code.gs
 * 
 * 功能說明：
 * 1. 【免 Git 部署】：將實驗室成員、在職生、會議時程與個人研究進度儲存於獨立的 Google 試算表。
 * 2. 【雙向同步讀寫】：
 *    - doGet(e)：網頁開啟時自動讀取試算表中的最新成員與會議資料，訪客與成員永遠看到最新內容。
 *    - doPost(e)：於 Lab Studio 或進度管理頁面修改、新增成員或會議後，一鍵直接同步回寫 Google Sheet。
 * 3. 【自動防呆建表】：首次執行時，自動建立4個專屬分頁（成員名冊、在職生名冊、會議時程、進度紀錄）與精緻欄位樣式。
 * 
 * 設定步驟：
 * 1. 新建一個獨立的 Google 試算表（例如命名為「EBB Lab 人員名冊與研究進度資料庫」）。
 * 2. 點擊頂端選單「擴充功能」->「Apps Script」。
 * 3. 刪除原有的程式碼，將本檔案內容全部複製並貼入「程式碼.gs」(Code.gs)。
 * 4. 點選右上角「部署 (Deploy)」->「新增部署作業 (New deployment)」：
 *    - 齒輪圖示選擇：「網頁應用程式 (Web app)」
 *    - 說明 (Description)：EBB Lab 人員與進度同步 API
 *    - 執行身分 (Execute as)：我 (Me / 您的 Google 帳號)
 *    - 誰可以存取 (Who has access)：任何人 (Anyone)  <--【務必選 Anyone，前端網頁才能跨網域讀寫】
 * 5. 點擊「部署」，授權權限後，複製產生的「網頁應用程式網址 (Web app URL)」。
 * 6. 回到本系統網頁「Lab Data Studio」或「人員進度追蹤」的「Google Sheet 雲端同步」設定中貼上網址即可！
 */

const MEMBER_CONFIG = {
  SHEET_MEMBERS: "成員總表",
  SHEET_IN_SERVICE: "在職生成員",
  SHEET_MEETINGS: "會議時程表",
  SHEET_PROGRESS: "研究進度紀錄",
  HEADER_BG: "#1b4372",
  HEADER_TEXT: "#ffffff"
};

/**
 * 處理 GET 請求 (前端讀取最新成員、在職生、會議與進度紀錄)
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    initAllSheetsIfMissing(ss);

    const members = readMembersSheet(ss);
    const externalMembers = readExternalMembersSheet(ss);
    const meetings = readMeetingsSheet(ss);
    const progressEntries = readProgressSheet(ss);

    const payload = {
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        members: members,
        externalMembers: externalMembers,
        meetings: meetings,
        progressEntries: progressEntries
      }
    };

    return ContentService.createTextOutput(JSON.stringify(payload))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 處理 POST 請求 (前端寫入/同步成員、會議或進度資料)
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseJSON({ success: false, error: "未收到 POST 內容資料。" });
    }

    const body = JSON.parse(e.postData.contents);
    const action = body.action || "sync_all";
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    initAllSheetsIfMissing(ss);

    // 1. 測試連線 (Ping)
    if (action === "ping") {
      return responseJSON({
        success: true,
        message: "EBB Lab 人員與進度 Google Apps Script 連線正常！",
        timestamp: new Date().toISOString()
      });
    }

    // 2. 全體同步 (Members, External Members, Meetings, Progress Entries)
    if (action === "sync_all") {
      if (Array.isArray(body.members)) {
        writeMembersSheet(ss, body.members);
      }
      if (Array.isArray(body.externalMembers)) {
        writeExternalMembersSheet(ss, body.externalMembers);
      }
      if (Array.isArray(body.meetings)) {
        writeMeetingsSheet(ss, body.meetings);
      }
      if (Array.isArray(body.progressEntries)) {
        writeProgressSheet(ss, body.progressEntries);
      }
      return responseJSON({
        success: true,
        message: "全體人員名冊、在職生、會議時程與進度紀錄已成功同步至 Google Sheets！"
      });
    }

    // 3. 僅同步成員與會議 (Lab Data Studio 使用)
    if (action === "sync_members_meetings") {
      if (Array.isArray(body.members)) {
        writeMembersSheet(ss, body.members);
      }
      if (Array.isArray(body.meetings)) {
        writeMeetingsSheet(ss, body.meetings);
      }
      return responseJSON({
        success: true,
        message: `成功同步 ${body.members ? body.members.length : 0} 位成員與 ${body.meetings ? body.meetings.length : 0} 筆會議紀錄！`
      });
    }

    // 4. 僅同步進度紀錄與在職生成員 (MemberProgressTracking 使用)
    if (action === "sync_progress") {
      if (Array.isArray(body.progressEntries)) {
        writeProgressSheet(ss, body.progressEntries);
      }
      if (Array.isArray(body.externalMembers)) {
        writeExternalMembersSheet(ss, body.externalMembers);
      }
      return responseJSON({
        success: true,
        message: `成功同步 ${body.progressEntries ? body.progressEntries.length : 0} 筆進度紀錄與 ${body.externalMembers ? body.externalMembers.length : 0} 位在職生成員！`
      });
    }

    // 5. 新增單筆進度紀錄 (Append single entry)
    if (action === "add_progress_entry" && body.entry) {
      appendProgressEntry(ss, body.entry);
      return responseJSON({
        success: true,
        message: "進度紀錄已即時新增至 Google 試算表！"
      });
    }

    return responseJSON({ success: false, error: "未知的操作指令: " + action });

  } catch (err) {
    return responseJSON({ success: false, error: err.toString() });
  }
}

// 輔助函式：回傳 JSON
function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// 讀取各分頁邏輯
// ==========================================

function readMembersSheet(ss) {
  const sheet = ss.getSheetByName(MEMBER_CONFIG.SHEET_MEMBERS);
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const list = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0] && !r[1]) continue;
    const keywords = r[7] ? String(r[7]).split(",").map(function(s) { return s.trim(); }).filter(Boolean) : [];
    list.push({
      id: String(r[0]),
      name_zh: String(r[1] || ""),
      name_en: String(r[2] || ""),
      role: String(r[3] || ""),
      role_en: String(r[4] || ""),
      research_topic: {
        title_zh: String(r[5] || ""),
        title_en: String(r[6] || ""),
        keywords: keywords
      },
      description: String(r[8] || "")
    });
  }
  return list;
}

function readExternalMembersSheet(ss) {
  const sheet = ss.getSheetByName(MEMBER_CONFIG.SHEET_IN_SERVICE);
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const list = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0] && !r[1]) continue;
    const keywords = r[9] ? String(r[9]).split(",").map(function(s) { return s.trim(); }).filter(Boolean) : [];
    list.push({
      id: String(r[0]),
      name_zh: String(r[1] || ""),
      name_en: String(r[2] || ""),
      role: String(r[3] || ""),
      role_en: String(r[4] || ""),
      role_type: String(r[5] || "在職生"),
      is_external: true,
      organization: String(r[6] || ""),
      research_topic: {
        title_zh: String(r[7] || ""),
        title_en: String(r[8] || ""),
        keywords: keywords
      },
      description: String(r[10] || ""),
      created_at: String(r[11] || "")
    });
  }
  return list;
}

function readMeetingsSheet(ss) {
  const sheet = ss.getSheetByName(MEMBER_CONFIG.SHEET_MEETINGS);
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const list = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0] && !r[1] && !r[3]) continue;
    list.push({
      id: String(r[0]),
      date: String(r[1] || ""),
      archive_group: String(r[2] || ""),
      title: String(r[3] || ""),
      speaker: String(r[4] || ""),
      speaker_id: String(r[5] || ""),
      status: String(r[6] || "completed"),
      status_label: String(r[7] || "✓ Completed"),
      search: String(r[8] || "")
    });
  }
  return list;
}

function readProgressSheet(ss) {
  const sheet = ss.getSheetByName(MEMBER_CONFIG.SHEET_PROGRESS);
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const list = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[0] && !r[3]) continue;
    let attachments = [];
    try {
      if (r[11]) attachments = JSON.parse(r[11]);
    } catch(e) {}

    const tags = r[10] ? String(r[10]).split(",").map(function(s) { return s.trim(); }).filter(Boolean) : [];

    list.push({
      id: String(r[0]),
      member_id: String(r[1] || ""),
      date: String(r[2] || ""),
      title: String(r[3] || ""),
      description: String(r[4] || ""),
      project_name: String(r[5] || ""),
      project_id: String(r[6] || ""),
      category: String(r[7] || "update"),
      is_key_event: r[8] === true || String(r[8]).toLowerCase() === "true" || String(r[8]) === "是",
      status: String(r[9] || "in_progress"),
      tags: tags,
      attachments: attachments,
      created_by: String(r[12] || ""),
      created_at: String(r[13] || ""),
      updated_at: String(r[14] || "")
    });
  }
  return list;
}

// ==========================================
// 寫入各分頁邏輯
// ==========================================

function writeMembersSheet(ss, members) {
  const headers = [
    "成員ID", "中文姓名", "英文姓名", "身分學級", "英文職稱",
    "主研題目(中文)", "主研題目(英文)", "關鍵字(逗號分隔)", "個人簡介/研究內容", "更新時間"
  ];
  const sheet = resetSheetWithHeaders(ss, MEMBER_CONFIG.SHEET_MEMBERS, headers);
  if (!members || members.length === 0) return;

  const nowStr = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
  const rows = members.map(function(m) {
    const keywords = (m.research_topic && m.research_topic.keywords) ? m.research_topic.keywords.join(", ") : "";
    return [
      m.id || "",
      m.name_zh || "",
      m.name_en || "",
      m.role || "",
      m.role_en || "",
      (m.research_topic && m.research_topic.title_zh) || "",
      (m.research_topic && m.research_topic.title_en) || "",
      keywords,
      m.description || "",
      nowStr
    ];
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function writeExternalMembersSheet(ss, externalMembers) {
  const headers = [
    "成員ID", "中文姓名", "英文姓名", "身分學級", "英文職稱",
    "身分類別", "所屬單位/機構", "主研題目(中文)", "主研題目(英文)", "關鍵字", "簡介", "建立時間"
  ];
  const sheet = resetSheetWithHeaders(ss, MEMBER_CONFIG.SHEET_IN_SERVICE, headers);
  if (!externalMembers || externalMembers.length === 0) return;

  const rows = externalMembers.map(function(m) {
    const keywords = (m.research_topic && m.research_topic.keywords) ? m.research_topic.keywords.join(", ") : "";
    return [
      m.id || "",
      m.name_zh || "",
      m.name_en || "",
      m.role || "",
      m.role_en || "",
      m.role_type || "在職生",
      m.organization || "",
      (m.research_topic && m.research_topic.title_zh) || "",
      (m.research_topic && m.research_topic.title_en) || "",
      keywords,
      m.description || "",
      m.created_at || new Date().toISOString()
    ];
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function writeMeetingsSheet(ss, meetings) {
  const headers = [
    "會議ID", "會議日期", "歸檔月份群組", "報告主題",
    "報告人", "報告人ID", "狀態代碼", "狀態標籤", "搜尋關鍵字", "更新時間"
  ];
  const sheet = resetSheetWithHeaders(ss, MEMBER_CONFIG.SHEET_MEETINGS, headers);
  if (!meetings || meetings.length === 0) return;

  const nowStr = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
  const rows = meetings.map(function(m) {
    return [
      m.id || "",
      m.date || "",
      m.archive_group || "",
      m.title || "",
      m.speaker || "",
      m.speaker_id || "",
      m.status || "completed",
      m.status_label || "✓ Completed",
      m.search || "",
      nowStr
    ];
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function writeProgressSheet(ss, entries) {
  const headers = [
    "紀錄ID", "成員ID", "進度日期", "進度主題", "內容詳細說明",
    "專案名稱", "專案ID", "進度類別", "是否重要里程碑", "進度狀態",
    "標籤(逗號分隔)", "附件JSON", "建立者", "建立時間", "最後更新"
  ];
  const sheet = resetSheetWithHeaders(ss, MEMBER_CONFIG.SHEET_PROGRESS, headers);
  if (!entries || entries.length === 0) return;

  const rows = entries.map(function(e) {
    return [
      e.id || "",
      e.member_id || "",
      e.date || "",
      e.title || "",
      e.description || "",
      e.project_name || "",
      e.project_id || "",
      e.category || "update",
      e.is_key_event ? "是" : "否",
      e.status || "in_progress",
      (e.tags && Array.isArray(e.tags)) ? e.tags.join(", ") : "",
      JSON.stringify(e.attachments || []),
      e.created_by || "",
      e.created_at || "",
      e.updated_at || new Date().toISOString()
    ];
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function appendProgressEntry(ss, e) {
  const sheet = ss.getSheetByName(MEMBER_CONFIG.SHEET_PROGRESS);
  if (!sheet) return;
  sheet.appendRow([
    e.id || ("entry_" + Date.now()),
    e.member_id || "",
    e.date || new Date().toISOString().split("T")[0],
    e.title || "",
    e.description || "",
    e.project_name || "",
    e.project_id || "",
    e.category || "update",
    e.is_key_event ? "是" : "否",
    e.status || "in_progress",
    (e.tags && Array.isArray(e.tags)) ? e.tags.join(", ") : "",
    JSON.stringify(e.attachments || []),
    e.created_by || "線上提交",
    e.created_at || new Date().toISOString(),
    new Date().toISOString()
  ]);
}

// 輔助函式：重設或清空工作表並建立美化標題列
function resetSheetWithHeaders(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clear();
  }

  sheet.appendRow(headers);
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange
    .setBackground(MEMBER_CONFIG.HEADER_BG)
    .setFontColor(MEMBER_CONFIG.HEADER_TEXT)
    .setFontWeight("bold")
    .setFontFamily("Arial");
  
  sheet.setFrozenRows(1);
  return sheet;
}

// 輔助函式：確保所有工作表分頁皆已存在
function initAllSheetsIfMissing(ss) {
  const sheets = [
    { name: MEMBER_CONFIG.SHEET_MEMBERS, headers: ["成員ID", "中文姓名", "英文姓名", "身分學級", "英文職稱", "主研題目(中文)", "主研題目(英文)", "關鍵字", "簡介", "更新時間"] },
    { name: MEMBER_CONFIG.SHEET_IN_SERVICE, headers: ["成員ID", "中文姓名", "英文姓名", "身分學級", "英文職稱", "身分類別", "所屬單位", "主研題目(中)", "主研題目(英)", "關鍵字", "簡介", "建立時間"] },
    { name: MEMBER_CONFIG.SHEET_MEETINGS, headers: ["會議ID", "會議日期", "歸檔月份", "主題", "報告人", "報告人ID", "狀態", "標籤", "搜尋關鍵字", "更新時間"] },
    { name: MEMBER_CONFIG.SHEET_PROGRESS, headers: ["紀錄ID", "成員ID", "進度日期", "進度主題", "內容詳細說明", "專案名稱", "專案ID", "進度類別", "是否重要里程碑", "進度狀態", "標籤", "附件JSON", "建立者", "建立時間", "最後更新"] }
  ];

  sheets.forEach(function(item) {
    let sheet = ss.getSheetByName(item.name);
    if (!sheet) {
      sheet = ss.insertSheet(item.name);
      sheet.appendRow(item.headers);
      sheet.getRange(1, 1, 1, item.headers.length)
        .setBackground(MEMBER_CONFIG.HEADER_BG)
        .setFontColor(MEMBER_CONFIG.HEADER_TEXT)
        .setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
  });
}
