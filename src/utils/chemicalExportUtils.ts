import { ProcurementItem, ProcurementItemLine } from "../types/procurement";
import { extractDateOnly, getTodayTaipeiDate } from "./dateUtils";

export interface FlatChemicalItem {
  requisitionId: string;
  requisitionNo: string;
  createdAt: string;
  applicantName: string;
  applicantEmail: string;
  status: string;
  vendorName: string;
  platform?: string;
  productUrl?: string;
  purpose: string;
  itemName: string;            // 中文化學品名
  chemicalEnglishName: string; // 英文化學品名
  casNumber: string;           // CAS Number
  purity: string;              // 純度
  packageSize: string;         // 包裝規格
  brand: string;               // 原廠廠牌
  quantity: number;
  unit: string;
  estimatedUnitPrice: number;
  estimatedTotalPrice: number;
  currency: string;
  lineId: string;
}

/**
 * Extracts all chemical lines from a list of requisitions
 */
export function extractChemicalLines(items: ProcurementItem[]): FlatChemicalItem[] {
  const result: FlatChemicalItem[] = [];

  items.forEach((req) => {
    const subLines: ProcurementItemLine[] = (req.items && req.items.length > 0)
      ? req.items
      : [
          {
            id: req.id,
            category: req.category || "consumable",
            itemName: req.itemName || "",
            quantity: req.quantity || 1,
            unit: req.unit || "瓶",
            estimatedUnitPrice: req.estimatedUnitPrice || 0,
            estimatedTotalPrice: req.estimatedTotalPrice || 0,
            currency: req.currency || "TWD",
            vendorName: req.vendorName || "",
            platform: req.platform,
            productUrl: req.productUrl,
            purpose: req.purpose,
            status: req.status === "rejected" ? "rejected" : req.status === "approved" ? "approved" : "pending_assistant",
            chemicalDetails: req.chemicalDetails
          }
        ];

    subLines.forEach((line) => {
      // Check if this line is a chemical
      if (line.category === "chemical" || req.category === "chemical") {
        const chemDetails = line.chemicalDetails || req.chemicalDetails;
        
        // Extract English name if embedded in itemName like "中文名(English Name)"
        let enName = chemDetails?.chemicalEnglishName || "";
        let zhName = line.itemName || req.itemName || "";

        if (!enName && zhName.includes("(") && zhName.includes(")")) {
          const match = zhName.match(/\(([^)]+)\)/);
          if (match && match[1]) {
            enName = match[1].trim();
          }
        }

        result.push({
          requisitionId: req.id,
          requisitionNo: req.requisitionNo,
          createdAt: extractDateOnly(req.createdAt, req.requisitionNo),
          applicantName: req.applicantName,
          applicantEmail: req.applicantEmail,
          status: line.status || req.status,
          vendorName: line.vendorName || req.vendorName || "未指定",
          platform: line.platform || req.platform,
          productUrl: line.productUrl || req.productUrl,
          purpose: line.purpose || req.purpose || "實驗研究使用",
          itemName: zhName,
          chemicalEnglishName: enName,
          casNumber: chemDetails?.casNumber || "未提供",
          purity: chemDetails?.purity || "未註明",
          packageSize: chemDetails?.packageSize || "未註明",
          brand: chemDetails?.brand || line.vendorName || req.vendorName || "未註明",
          quantity: line.quantity || 1,
          unit: line.unit || "瓶",
          estimatedUnitPrice: line.estimatedUnitPrice || 0,
          estimatedTotalPrice: line.estimatedTotalPrice || (line.quantity * line.estimatedUnitPrice) || 0,
          currency: line.currency || req.currency || "TWD",
          lineId: line.id
        });
      }
    });
  });

  return result;
}

/**
 * Generates formatted text for a single requisition to send to the student managing chemical inventory
 */
export function generateOrderChemicalTxt(req: ProcurementItem): string {
  const chemicals = extractChemicalLines([req]);

  const statusLabel = 
    req.status === "approved" ? "審核通過 · 待採購 (Approved)" :
    req.status === "purchased" ? "已採購完成 (Purchased)" :
    req.status === "pending_assistant" ? "待助理初審中" :
    req.status === "pending_professor" ? "待教授終審中" :
    req.status === "rejected" ? "已退回" : req.status;

  if (chemicals.length === 0) {
    // Fallback if requisition has no chemicals
    return [
      `【EBB Lab 請購單資訊】`,
      `請購單號：${req.requisitionNo}`,
      `申請人員：${req.applicantName}`,
      `申請日期：${extractDateOnly(req.createdAt, req.requisitionNo)}`,
      `品項名稱：${req.itemName}`,
      `採購數量：${req.quantity} ${req.unit}`,
      `預估總價：NT$ ${req.estimatedTotalPrice.toLocaleString()}`,
      `建議通路：${req.vendorName}`,
      `審核狀態：${statusLabel}`,
      `請購用途：${req.purpose}`,
      `（註：本單無標記為藥品之品項）`
    ].join("\n");
  }

  const lines: string[] = [
    `════════════════════════════════════════`,
    `【EBB Lab 藥品入庫登記單】`,
    `請購單號：${req.requisitionNo}`,
    `申請人員：${req.applicantName} (${req.applicantEmail})`,
    `申請日期：${extractDateOnly(req.createdAt, req.requisitionNo)}`,
    `審核狀態：${statusLabel}`,
    `建議廠商：${req.vendorName}`,
    `整體用途：${req.purpose}`,
    `════════════════════════════════════════`,
    `【藥品明細清單 (共 ${chemicals.length} 筆)】`
  ];

  chemicals.forEach((chem, idx) => {
    lines.push(
      `----------------------------------------`,
      `[品項 #${idx + 1}]`,
      `• 中文品名：${chem.itemName}`,
      `• 英文品名：${chem.chemicalEnglishName || "未提供"}`,
      `• CAS 號碼：${chem.casNumber}`,
      `• 純度規格：${chem.purity}`,
      `• 包裝容量：${chem.packageSize}`,
      `• 原廠廠牌：${chem.brand}`,
      `• 採購數量：${chem.quantity} ${chem.unit}`,
      `• 預估單價：${chem.currency} ${chem.estimatedUnitPrice.toLocaleString()}`,
      `• 小計金額：${chem.currency} ${chem.estimatedTotalPrice.toLocaleString()}`,
      chem.productUrl ? `• 購買連結：${chem.productUrl}` : null,
      chem.purpose && chem.purpose !== req.purpose ? `• 品項用途：${chem.purpose}` : null
    );
  });

  lines.push(
    `----------------------------------------`,
    `【入庫指引與備忘】`,
    `1. 請負責藥品管理的同學於到貨時核對 CAS 號碼、品名與純度。`,
    `2. 於瓶身張貼 GHS 危害分類標示與實驗室專屬入庫編號標籤。`,
    `3. 登錄至 EBB Lab 化學品清冊 (Chemical Inventory) 指定櫃位 (A~E 櫃 / 毒化物專櫃 / 冰箱)。`,
    `════════════════════════════════════════`
  );

  return lines.filter(Boolean).join("\n");
}

/**
 * Generates formatted text for multiple chemical items across multiple orders
 */
export function generateBatchChemicalsTxt(items: ProcurementItem[], rangeLabel: string): string {
  const chemicals = extractChemicalLines(items);

  if (chemicals.length === 0) {
    return `【EBB Lab 藥品入庫資訊】\n篩選時段：${rangeLabel}\n目前無符合條件之藥品品項。`;
  }

  const grandTotal = chemicals.reduce((acc, c) => acc + c.estimatedTotalPrice, 0);

  const lines: string[] = [
    `════════════════════════════════════════`,
    `【EBB Lab 藥品入庫批次清冊】`,
    `統計時段：${rangeLabel}`,
    `匯出日期：${getTodayTaipeiDate()}`,
    `藥品總數：共 ${chemicals.length} 筆藥品品項`,
    `預估總額：NT$ ${grandTotal.toLocaleString()}`,
    `════════════════════════════════════════`
  ];

  chemicals.forEach((chem, idx) => {
    lines.push(
      `[${idx + 1}] ${chem.itemName} (${chem.chemicalEnglishName || "—"})`,
      `    單號: ${chem.requisitionNo} | 申請人: ${chem.applicantName} | 日期: ${chem.createdAt}`,
      `    CAS: ${chem.casNumber} | 純度: ${chem.purity} | 包裝: ${chem.packageSize}`,
      `    數量: ${chem.quantity} ${chem.unit} | 金額: NT$ ${chem.estimatedTotalPrice.toLocaleString()} | 廠牌: ${chem.brand}`,
      `    狀態: ${chem.status}`
    );
  });

  lines.push(
    `════════════════════════════════════════`,
    `請藥品管理同學依此清冊進行盤點與化學品清單入庫登記。`
  );

  return lines.join("\n");
}

/**
 * Exports chemical lines to CSV with UTF-8 BOM
 */
export function exportChemicalsToCsv(
  items: ProcurementItem[], 
  rangeLabel: string, 
  filenamePrefix: string = "EBB_Lab_Chemical_Inventory"
): void {
  const chemicals = extractChemicalLines(items);

  const headers = [
    "請購單號 (Requisition No)",
    "申請日期 (Date)",
    "申請人 (Applicant)",
    "聯絡信箱 (Email)",
    "CAS號碼 (CAS Number)",
    "中文化學品名 (Chinese Name)",
    "英文化學品名 (English Name)",
    "純度等級 (Purity)",
    "包裝規格 (Package Size)",
    "數量 (Quantity)",
    "單位 (Unit)",
    "幣別 (Currency)",
    "預估單價 (Unit Price)",
    "預估總價 (Total Price NT$)",
    "原廠廠牌 (Brand)",
    "供應廠商/平台 (Vendor)",
    "審核狀態 (Status)",
    "請購用途 (Purpose)",
    "商品規格連結 (Product URL)",
    "入庫櫃位註記 (Cabinet Location [A-E櫃/冰箱])",
    "入庫驗收簽章 (Checked-in By)"
  ];

  const rows = chemicals.map((chem) => [
    `"${chem.requisitionNo}"`,
    `"${chem.createdAt}"`,
    `"${chem.applicantName}"`,
    `"${chem.applicantEmail}"`,
    `"${chem.casNumber}"`,
    `"${chem.itemName.replace(/"/g, '""')}"`,
    `"${chem.chemicalEnglishName.replace(/"/g, '""')}"`,
    `"${chem.purity.replace(/"/g, '""')}"`,
    `"${chem.packageSize.replace(/"/g, '""')}"`,
    chem.quantity,
    `"${chem.unit}"`,
    `"${chem.currency}"`,
    chem.estimatedUnitPrice,
    chem.estimatedTotalPrice,
    `"${chem.brand.replace(/"/g, '""')}"`,
    `"${chem.vendorName.replace(/"/g, '""')}"`,
    `"${chem.status}"`,
    `"${chem.purpose.replace(/"/g, '""')}"`,
    `"${(chem.productUrl || "").replace(/"/g, '""')}"`,
    `""`, // 留白供藥品管理同學手填或輸入 A/B/C/D/E 櫃
    `""`  // 留白供驗收簽名
  ]);

  // Generate CSV with UTF-8 BOM
  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;

  const sanitizedRange = rangeLabel.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/g, "_");
  link.download = `${filenamePrefix}_${sanitizedRange}_${getTodayTaipeiDate()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
