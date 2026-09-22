/**
 * EBB Lab 請購系統
 * 支援處理 Google Sheet 輸出之原生日期字串、民國年、縮寫日期、缺少年度之殘缺日期、及以單號反推日期等多種極端情況
 */

const MONTH_NAME_MAP: Record<string, string> = {
  jan: "01", january: "01",
  feb: "02", february: "02",
  mar: "03", march: "03",
  apr: "04", april: "04",
  may: "05",
  jun: "06", june: "06",
  jul: "07", july: "07",
  aug: "08", august: "08",
  sep: "09", september: "09",
  oct: "10", october: "10",
  nov: "11", november: "11",
  dec: "12", december: "12"
};

/**
 * 寬容解析任何日期輸入，並統一輸出標準格式：
 * - 僅日期: "YYYY-MM-DD"
 * - 含有非零時分: "YYYY-MM-DD HH:mm"
 */
export function normalizeProcurementDate(input: any, fallbackReqNo: string = ""): string {
  if (input === null || input === undefined) {
    return recoverDateFromRequisitionNo(fallbackReqNo);
  }

  // 若傳入 Date 物件
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return recoverDateFromRequisitionNo(fallbackReqNo);
    return formatDateFromDateObject(input);
  }

  let str = String(input).trim();

  // 若為無效字串文字
  if (
    !str ||
    str === "NaN" ||
    str === "undefined" ||
    str === "null" ||
    str === "Invalid Date" ||
    str === "-"
  ) {
    return recoverDateFromRequisitionNo(fallbackReqNo);
  }

  // 1. 處理 Google Apps Script 導出之帶有時區說明的英文原生日期字串
  // 範例: "Wed Sep 25 2024 00:00:00 GMT+0800 (台湾標準時)" 或 "Sep 25 2024"
  const engMonthFirst = str.match(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2})[,\s]+(20\d{2})/i);
  if (engMonthFirst) {
    const mon = MONTH_NAME_MAP[engMonthFirst[1].toLowerCase()];
    const day = String(parseInt(engMonthFirst[2], 10)).padStart(2, "0");
    const year = engMonthFirst[3];
    const timeMatch = str.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (timeMatch && (timeMatch[1] !== "00" && timeMatch[1] !== "0" || timeMatch[2] !== "00")) {
      const hh = String(parseInt(timeMatch[1], 10)).padStart(2, "0");
      const mm = timeMatch[2];
      return `${year}-${mon}-${day} ${hh}:${mm}`;
    }
    return `${year}-${mon}-${day}`;
  }

  // 2. 日 月 年 英文格式: "25 Sep 2024", "25-Sep-2024"
  const engDayFirst = str.match(/\b(\d{1,2})[,\s-]+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[,\s-]+(20\d{2})/i);
  if (engDayFirst) {
    const day = String(parseInt(engDayFirst[1], 10)).padStart(2, "0");
    const mon = MONTH_NAME_MAP[engDayFirst[2].toLowerCase()];
    const year = engDayFirst[3];
    return `${year}-${mon}-${day}`;
  }

  // 3. 處理台灣民國年格式 (例如: "113/09/25", "113-9-25", "113.9.25", "民國113年9月25日", "113年9月25日")
  const rocMatch = str.match(/^(?:民國)?\s*(\d{2,3})[./年\-_](\d{1,2})[./月\-_](\d{1,2})/);
  if (rocMatch) {
    let year = parseInt(rocMatch[1], 10);
    if (year < 1900) year += 1911; // 113 -> 2024
    const month = String(parseInt(rocMatch[2], 10)).padStart(2, "0");
    const day = String(parseInt(rocMatch[3], 10)).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // 4. 標準西元四位數年份格式 (支援 -, /, ., 年月日分隔)
  // 範例: "2024-09-25", "2024/9/25", "2024.09.25", "2024年9月25日 14:30"
  const ymdMatch = str.match(/(20\d{2})[./年\-_](\d{1,2})[./月\-_](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = String(parseInt(ymdMatch[2], 10)).padStart(2, "0");
    const day = String(parseInt(ymdMatch[3], 10)).padStart(2, "0");
    const timeMatch = str.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (timeMatch) {
      const hh = String(parseInt(timeMatch[1], 10)).padStart(2, "0");
      const mm = timeMatch[2];
      return `${year}-${month}-${day} ${hh}:${mm}`;
    }
    return `${year}-${month}-${day}`;
  }

  // 5. 連續 8 位數字 (例如: "20240925")
  const compactMatch = str.match(/\b(20\d{2})([01]\d)([0-3]\d)\b/);
  if (compactMatch) {
    return `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`;
  }

  // 6. 殘缺日期：僅有月份與日期 (例如: "9/25", "09-25", "9月25日", "9.25")
  const mdMatch = str.match(/^([01]?\d)[./月\-_]([0-3]?\d)日?$/);
  if (mdMatch) {
    const monthNum = parseInt(mdMatch[1], 10);
    const dayNum = parseInt(mdMatch[2], 10);
    if (monthNum >= 1 && monthNum <= 12 && dayNum >= 1 && dayNum <= 31) {
      let year = extractYearFromRequisitionNo(fallbackReqNo) || String(new Date().getFullYear());
      return `${year}-${String(monthNum).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
    }
  }

  // 7. 殘缺日期：僅有年份與月份 (例如: "2024-09", "2024/9", "2024年9月")
  const ymMatch = str.match(/^(20\d{2})[./年\-_]([01]?\d)月?$/);
  if (ymMatch) {
    const monthNum = parseInt(ymMatch[2], 10);
    if (monthNum >= 1 && monthNum <= 12) {
      return `${ymMatch[1]}-${String(monthNum).padStart(2, "0")}-01`;
    }
  }

  // 8. Excel / Google Sheets 序號日期 (例如: 45560)
  if (/^\d{5}$/.test(str)) {
    const serial = parseInt(str, 10);
    // Excel base date offset: 1899-12-30
    const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) {
      return formatDateFromDateObject(d);
    }
  }

  // 9. 從請購單號 (requisitionNo) 反推日期
  // 很多歷史單號本身即包含日期，例如 "EBB-HIST-20240925-01" 或 "EBB-20240925-001"
  const dateFromReq = recoverDateFromRequisitionNo(fallbackReqNo);
  if (dateFromReq !== getTodayTaipeiDate()) {
    return dateFromReq;
  }

  // 10. 嘗試 JavaScript 原生 Date 解析（去除括弧內的本地時區文字以防解析失敗）
  const cleanedStr = str.replace(/\s*\([^)]*\)/g, "");
  const nativeDate = new Date(cleanedStr);
  if (!isNaN(nativeDate.getTime())) {
    return formatDateFromDateObject(nativeDate);
  }

  // 最終備援：當天日期
  return dateFromReq;
}

/**
 * 保證輸出純 "YYYY-MM-DD"（10 個字元），無時分秒
 * 適用於各篩選器、標籤顯示、比對計算與日期區間匯出
 */
export function extractDateOnly(input: any, fallbackReqNo: string = ""): string {
  const norm = normalizeProcurementDate(input, fallbackReqNo);
  const match = norm.match(/^(20\d{2}-\d{2}-\d{2})/);
  if (match) {
    return match[1];
  }
  return getTodayTaipeiDate();
}

/**
 * 比較兩日期大小（由新到舊降序排列，新資料排在最前面）
 */
export function compareDatesDesc(
  dateA: any,
  dateB: any,
  fallbackReqNoA: string = "",
  fallbackReqNoB: string = ""
): number {
  const da = normalizeProcurementDate(dateA, fallbackReqNoA);
  const db = normalizeProcurementDate(dateB, fallbackReqNoB);
  return db.localeCompare(da);
}

/**
 * 從請購單號中辨識 YYYYMMDD 或 YYYY-MM-DD
 */
export function recoverDateFromRequisitionNo(requisitionNo: string): string {
  if (!requisitionNo) return getTodayTaipeiDate();
  const match = requisitionNo.match(/(20\d{2})[-_]?([01]\d)[-_]?([0-3]\d)/);
  if (match) {
    const y = match[1];
    const m = match[2];
    const d = match[3];
    return `${y}-${m}-${d}`;
  }
  return getTodayTaipeiDate();
}

/**
 * 從單號中抽取年份
 */
function extractYearFromRequisitionNo(requisitionNo: string): string | null {
  if (!requisitionNo) return null;
  const match = requisitionNo.match(/(20\d{2})/);
  return match ? match[1] : null;
}

/**
 * 將 JavaScript Date 物件在 Asia/Taipei 台北時區中格式化為 YYYY-MM-DD 或 YYYY-MM-DD HH:mm
 */
function formatDateFromDateObject(date: Date): string {
  try {
    const taipeiDate = date.toLocaleDateString("sv-SE", { timeZone: "Asia/Taipei" });
    if (/^\d{4}-\d{2}-\d{2}$/.test(taipeiDate)) {
      // 檢查台北時區下是否有非 00:00 的具體時間
      const parts = new Intl.DateTimeFormat("zh-TW", {
        timeZone: "Asia/Taipei",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }).formatToParts(date);
      const hourPart = parts.find(p => p.type === "hour")?.value || "00";
      const minutePart = parts.find(p => p.type === "minute")?.value || "00";
      if (hourPart !== "00" || minutePart !== "00") {
        return `${taipeiDate} ${hourPart}:${minutePart}`;
      }
      return taipeiDate;
    }
  } catch (e) {}

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 取得台北時區當日 YYYY-MM-DD
 */
export function getTodayTaipeiDate(): string {
  try {
    return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Taipei" });
  } catch (e) {
    return new Date().toISOString().split("T")[0];
  }
}
