import { ProcurementItem, ProcurementCategory, ProcurementStatus, PurchaseProgressStatus, PurchaserType } from "../types/procurement";
import { normalizeProcurementDate, compareDatesDesc } from "../utils/dateUtils";

/**
 * 試算表狀態字串映射為 ProcurementStatus
 */
export function mapStatusFromSheet(statusStr: string): ProcurementStatus {
  if (!statusStr) return "pending_assistant";
  const s = String(statusStr).toLowerCase();
  if (s.includes("pending_professor") || s.includes("待教授")) return "pending_professor";
  if (s.includes("partially_approved") || s.includes("部分通過")) return "partially_approved";
  if (s.includes("approved") || s.includes("已核准") || s.includes("通過")) return "approved";
  if (s.includes("rejected") || s.includes("退回") || s.includes("不予通過")) return "rejected";
  if (s.includes("purchased") || s.includes("已採購") || s.includes("入庫")) return "purchased";
  return "pending_assistant";
}

/**
 * 採購進程字串映射為 PurchaseProgressStatus
 */
export function mapProgressFromSheet(progStr: string): PurchaseProgressStatus {
  if (!progStr) return "pending_purchase";
  const s = String(progStr).toLowerCase();
  if (s.includes("completed") || s.includes("入庫") || s.includes("完成")) return "completed";
  if (s.includes("arrived") || s.includes("到貨") || s.includes("delivered")) return "delivered";
  if (s.includes("student_purchased") || s.includes("請購人已買") || s.includes("學生已買")) return "student_purchased";
  if (s.includes("professor_purchased") || s.includes("教授已買")) return "professor_purchased";
  if (s.includes("postpayment") || s.includes("貨到")) return "postpayment";
  return "pending_purchase";
}

/**
 * 解析品項文字（如 "1. NaOH (1 瓶)\n2. HCl (2 瓶)" 或 "NaOH (1 瓶)"）
 */
export function parseItemSummaryText(
  summary: string, 
  category: ProcurementCategory, 
  totalPrice: number, 
  purpose: string, 
  vendor: string
) {
  if (!summary || !summary.trim()) {
    return [{
      id: "line_1",
      category,
      itemName: "請購品項",
      quantity: 1,
      unit: "件",
      estimatedUnitPrice: totalPrice,
      estimatedTotalPrice: totalPrice,
      purpose,
      vendorName: vendor,
      status: "pending_assistant" as ProcurementStatus
    }];
  }

  const lines = summary.split("\n").map(l => l.trim()).filter(Boolean);
  const result: any[] = [];

  lines.forEach((line, idx) => {
    let cleanLine = line.replace(/^\d+[\.\、\)]\s*/, "");
    let qty = 1;
    let unit = "件";
    const match = cleanLine.match(/\(([^)]+)\)$/);
    if (match) {
      const inner = match[1].trim();
      cleanLine = cleanLine.replace(/\(([^)]+)\)$/, "").trim();
      const qtyMatch = inner.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
      if (qtyMatch) {
        qty = parseFloat(qtyMatch[1]) || 1;
        unit = qtyMatch[2] || "件";
      } else {
        unit = inner;
      }
    }

    const unitPrice = lines.length === 1 ? Math.round(totalPrice / (qty || 1)) : 0;
    const lineTotal = lines.length === 1 ? totalPrice : 0;

    result.push({
      id: `line_${idx + 1}`,
      category,
      itemName: cleanLine || "品項",
      quantity: qty,
      unit,
      estimatedUnitPrice: unitPrice,
      estimatedTotalPrice: lineTotal,
      purpose,
      vendorName: vendor,
      status: "pending_assistant" as ProcurementStatus
    });
  });

  if (result.length === 0) {
    result.push({
      id: "line_1",
      category,
      itemName: summary,
      quantity: 1,
      unit: "件",
      estimatedUnitPrice: totalPrice,
      estimatedTotalPrice: totalPrice,
      purpose,
      vendorName: vendor,
      status: "pending_assistant" as ProcurementStatus
    });
  }

  return result;
}

/**
 * 健壯的 CSV 行解析器（支援引號與多行內容）
 */
export function parseCSVToRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentCell += '"';
        i++; // skip escaped quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell.trim());
        currentCell = "";
      } else if (char === '\r') {
        // ignore CR
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        if (currentRow.some(c => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = "";
      } else {
        currentCell += char;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(c => c.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * 從 Google Apps Script Webhook (doGet) 讀取請購清單
 */
export async function fetchItemsFromGasWebhook(url: string): Promise<{
  success: boolean;
  items?: ProcurementItem[];
  needsCodeUpdate?: boolean;
  message?: string;
}> {
  if (!url || !url.trim()) {
    return { success: false, message: "未設定 Google Apps Script Webhook 網址" };
  }

  try {
    const cleanUrl = url.trim();
    const res = await fetch(cleanUrl, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });

    if (!res.ok) {
      return { success: false, message: `伺服器回應錯誤 (${res.status} ${res.statusText})` };
    }

    const data = await res.json();

    // 判斷是否為舊版 Code.gs 回傳的預設 status: ok 訊息 (沒有 items)
    if (data && data.status === "ok" && !Array.isArray(data.items)) {
      return {
        success: false,
        needsCodeUpdate: true,
        message: "已連線至 Google Apps Script，但您目前部署的 Code.gs 尚未支援 doGet 資料讀取。請至 Apps Script 更新腳本。"
      };
    }

    if (data && Array.isArray(data.items)) {
      const normalizedItems: ProcurementItem[] = data.items.map((it: any) => ({
        ...it,
        createdAt: normalizeProcurementDate(it.createdAt, it.requisitionNo || it.id)
      }));
      normalizedItems.sort((a, b) => compareDatesDesc(a.createdAt, b.createdAt, a.requisitionNo, b.requisitionNo));
      return {
        success: true,
        items: normalizedItems,
        message: `成功從 Google Apps Script 同步 ${normalizedItems.length} 筆請購資料！`
      };
    }

    return { success: false, message: "回傳格式不符合預期 (缺少 items 清單)" };
  } catch (err: any) {
    console.warn("fetchItemsFromGasWebhook error", err);
    return { success: false, message: `無法讀取 Webhook: ${err.message || err}` };
  }
}

/**
 * 從 Google Sheet CSV Export 網址讀取請購清單
 */
export async function fetchItemsFromGoogleSheetCsv(sheetUrl: string): Promise<{
  success: boolean;
  items?: ProcurementItem[];
  message?: string;
}> {
  if (!sheetUrl || !sheetUrl.trim()) {
    return { success: false, message: "未設定 Google Sheet 試算表網址" };
  }

  try {
    let csvUrl = sheetUrl.trim();
    // 檢查是否為一般的 Google Sheets 網址，並轉為 CSV export 網址
    const match = csvUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      const spreadsheetId = match[1];
      const gidMatch = csvUrl.match(/gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : "0";
      csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
    }

    const res = await fetch(csvUrl);
    if (!res.ok) {
      return { success: false, message: `無法從 Google 試算表下載 CSV (HTTP ${res.status})，請確認該試算表已開啟「知道連結的任何人都可以檢視」。` };
    }

    const csvText = await res.text();
    const rows = parseCSVToRows(csvText);

    if (rows.length <= 1) {
      return { success: true, items: [], message: "試算表為空或僅有標題列。" };
    }

    const items: ProcurementItem[] = [];

    // 從第二列開始
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0] && !row[2] && !row[5]) continue;

      // 若第 14 欄有 JSON
      if (row[13] && row[13].startsWith("{")) {
        try {
          const parsed = JSON.parse(row[13]);
          if (parsed && (parsed.requisitionNo || parsed.id)) {
            if (row[10]) parsed.status = mapStatusFromSheet(row[10]);
            if (row[11]) parsed.purchaseProgress = mapProgressFromSheet(row[11]);
            items.push(parsed);
            continue;
          }
        } catch (e) {}
      }

      const reqNo = row[0] || `EBB-${i}`;
      const createdAt = normalizeProcurementDate(row[1], reqNo);
      const applicantName = row[2] || "未具名";
      const applicantEmail = row[3] || "";
      const rawCategory = (row[4] || "consumable").toLowerCase();
      const category: ProcurementCategory = rawCategory === "chemical" ? "chemical" : rawCategory === "equipment" ? "equipment" : "consumable";
      const itemSummary = row[5] || "";
      const estimatedTotalPrice = parseFloat((row[6] || "0").replace(/[^0-9.]/g, "")) || 0;
      const budgetProject = row[7] || "待指定";
      const purpose = row[8] || "";
      const vendorName = row[9] || "";
      const status = mapStatusFromSheet(row[10] || "pending_assistant");
      const purchaseProgress = mapProgressFromSheet(row[11] || "pending_purchase");

      const parsedLines = parseItemSummaryText(itemSummary, category, estimatedTotalPrice, purpose, vendorName);

      items.push({
        id: `req_csv_${reqNo.replace(/[^a-zA-Z0-9_-]/g, "")}_${i}`,
        requisitionNo: reqNo,
        createdAt,
        applicantName,
        applicantEmail,
        department: "EBB Lab",
        category,
        itemName: parsedLines[0]?.itemName || itemSummary || "請購品項",
        quantity: parsedLines[0]?.quantity || 1,
        unit: parsedLines[0]?.unit || "件",
        estimatedUnitPrice: parsedLines[0]?.estimatedUnitPrice || estimatedTotalPrice,
        estimatedTotalPrice,
        budgetProject,
        purpose,
        vendorName,
        status,
        purchaseProgress,
        purchaser: (row[11] && row[11].includes("postpayment") ? "postpayment" : "unassigned") as PurchaserType,
        items: parsedLines
      });
    }

    items.sort((a, b) => compareDatesDesc(a.createdAt, b.createdAt, a.requisitionNo, b.requisitionNo));

    return {
      success: true,
      items,
      message: `成功從 Google 試算表 CSV 解析出 ${items.length} 筆請購資料！`
    };
  } catch (err: any) {
    console.warn("fetchItemsFromGoogleSheetCsv error", err);
    return { success: false, message: `讀取試算表 CSV 失敗: ${err.message || err}` };
  }
}

/**
 * 合併雲端最新項目與本地暫存項目
 */
export function mergeProcurementItems(
  localItems: ProcurementItem[],
  remoteItems: ProcurementItem[]
): ProcurementItem[] {
  const map = new Map<string, ProcurementItem>();

  // 1. 先加入遠端最新資料（以遠端雲端紀錄為主，並確保日期已標準化）
  remoteItems.forEach(item => {
    const key = item.requisitionNo || item.id;
    map.set(key, {
      ...item,
      createdAt: normalizeProcurementDate(item.createdAt, item.requisitionNo || item.id)
    });
  });

  // 2. 本地若有尚未同步之新資料（例如剛送出尚未上傳），補入
  localItems.forEach(item => {
    const key = item.requisitionNo || item.id;
    if (!map.has(key)) {
      map.set(key, {
        ...item,
        createdAt: normalizeProcurementDate(item.createdAt, item.requisitionNo || item.id)
      });
    }
  });

  const merged = Array.from(map.values());
  merged.sort((a, b) => compareDatesDesc(a.createdAt, b.createdAt, a.requisitionNo, b.requisitionNo));
  return merged;
}
