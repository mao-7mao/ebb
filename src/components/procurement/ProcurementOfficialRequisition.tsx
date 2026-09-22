import React, { useRef, useEffect } from "react";
import { ProcurementItem, ProcurementItemLine, CurrencyCode } from "../../types/procurement";
import { 
  Printer, 
  Download, 
  X, 
  FileSpreadsheet, 
  FileText, 
  Check, 
  ExternalLink 
} from "lucide-react";
import NsysuEmblem from "./NsysuEmblem";
import { CURRENCY_CONFIG, formatPriceWithCurrency } from "../../data/procurementData";
import { extractDateOnly } from "../../utils/dateUtils";

interface ProcurementOfficialRequisitionProps {
  isOpen?: boolean;
  onClose: () => void;
  items: ProcurementItem[]; // Supports one or multiple requisition items
  lang: "zh" | "en";
  isAdmin?: boolean;
  onExportCSV?: (items: ProcurementItem[]) => void;
}

export default function ProcurementOfficialRequisition({
  isOpen = true,
  onClose,
  items,
  lang,
  isAdmin = false,
  onExportCSV
}: ProcurementOfficialRequisitionProps) {
  const printRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: Press Escape to close preview modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!isOpen || !items || items.length === 0) return null;

  // Primary requisition info
  const primaryReq = items[0];
  const applicant = primaryReq.applicantName || "";
  const assistantReviewer = primaryReq.assistantReview?.reviewerName || "助理";
  const professorReviewer = primaryReq.professorReview?.reviewerName || "教授";

  // Requisition Date formatted as YYYY.MM.DD (matches screenshot: 2025.08.06)
  const formatRequisitionDate = (dateStr?: string) => {
    return extractDateOnly(dateStr, primaryReq.requisitionNo).replace(/-/g, ".");
  };

  const requisitionDate = formatRequisitionDate(primaryReq.createdAt);

  // Flatten all sub-items from all selected requisitions
  const flattenedLines: {
    lineId: string;
    parentReq: ProcurementItem;
    nameWithSpec: string;
    unitPrice: number;
    currency: CurrencyCode;
    quantity: number;
    unit: string;
    subtotal: number;
    purpose: string;
    vendorAndPlatform: string;
    productUrl?: string;
  }[] = [];

  items.forEach((req) => {
    const subItems: ProcurementItemLine[] = (req.items && req.items.length > 0)
      ? req.items
      : [
          {
            id: req.id,
            category: req.category || "consumable",
            itemName: req.itemName || "生質基 PVA",
            quantity: req.quantity || 1,
            unit: req.unit || "瓶",
            currency: req.currency || "TWD",
            estimatedUnitPrice: req.estimatedUnitPrice || req.estimatedTotalPrice || 850,
            estimatedTotalPrice: req.estimatedTotalPrice || 850,
            platform: req.platform,
            productUrl: req.productUrl,
            purpose: req.purpose || "生質塑膠添加劑",
            vendorName: req.vendorName || "",
            status: req.status === "rejected" ? "rejected" : "approved"
          }
        ];

    subItems.forEach((line) => {
      // Exclude completely rejected items from the official order sheet
      if (line.status === "rejected") return;

      // Compose full name and specification
      let specParts: string[] = [];
      if (line.chemicalDetails?.packageSize) specParts.push(line.chemicalDetails.packageSize);
      if (line.chemicalDetails?.purity) specParts.push(line.chemicalDetails.purity);
      if (line.consumableDetails?.specModel) specParts.push(line.consumableDetails.specModel);
      if (line.equipmentDetails?.modelNumber) specParts.push(line.equipmentDetails.modelNumber);

      const specSuffix = specParts.length > 0 ? `（${specParts.join(", ")}）` : "";
      const fullName = `${line.itemName}${specSuffix}`;

      // Compose vendor and platform info
      let vendorInfo = line.vendorName || primaryReq.vendorName || "";
      if (line.platform && !vendorInfo.includes(line.platform)) {
        vendorInfo = `${vendorInfo} (${line.platform})`;
      } else if (primaryReq.platform && !vendorInfo.includes(primaryReq.platform)) {
        vendorInfo = `${vendorInfo} (${primaryReq.platform})`;
      }

      const cur: CurrencyCode = line.currency || primaryReq.currency || "TWD";
      const uPrice = line.purchasedInfo?.actualUnitPrice || line.estimatedUnitPrice || 0;
      const subTot = line.purchasedInfo?.actualTotalPrice || line.estimatedTotalPrice || (uPrice * (line.quantity || 1));

      flattenedLines.push({
        lineId: line.id,
        parentReq: req,
        nameWithSpec: fullName,
        unitPrice: uPrice,
        currency: cur,
        quantity: line.quantity || 1,
        unit: line.unit || "個",
        subtotal: subTot,
        purpose: line.purpose || req.purpose || "生質塑膠添加劑",
        vendorAndPlatform: vendorInfo,
        productUrl: line.productUrl || req.productUrl
      });
    });
  });

  // Calculate grand totals (categorized by currency)
  const currencyTotals: Record<CurrencyCode, number> = { TWD: 0, USD: 0, CNY: 0 };
  let grandTotalTwdEstimate = 0;

  flattenedLines.forEach((l) => {
    const cur = l.currency || "TWD";
    currencyTotals[cur] = (currencyTotals[cur] || 0) + l.subtotal;
    if (cur === "TWD") grandTotalTwdEstimate += l.subtotal;
    else if (cur === "USD") grandTotalTwdEstimate += Math.round(l.subtotal * 32.5);
    else if (cur === "CNY") grandTotalTwdEstimate += Math.round(l.subtotal * 4.5);
  });

  // Target minimum rows to match Word layout aesthetic (at least 4-5 rows)
  const totalDisplayRows = Math.max(5, flattenedLines.length);
  const emptyRowsCount = Math.max(0, totalDisplayRows - flattenedLines.length);

  // Format currency text for unit price and subtotal
  const renderCellAmount = (amount: number, cur: CurrencyCode) => {
    if (cur === "TWD") return amount.toLocaleString();
    if (cur === "CNY") return `¥ ${amount.toLocaleString()}`;
    if (cur === "USD") return `$ ${amount.toLocaleString()}`;
    return amount.toLocaleString();
  };

  // Determine primary currency for Grand Total row
  const activeCurrencies = (Object.keys(currencyTotals) as CurrencyCode[]).filter(c => currencyTotals[c] > 0);
  const primaryCurrency: CurrencyCode = activeCurrencies.length === 1 ? activeCurrencies[0] : "TWD";
  const primaryTotalAmount = currencyTotals[primaryCurrency] || grandTotalTwdEstimate;

  const getCurrencyUnitLabel = () => {
    if (activeCurrencies.length <= 1) {
      if (primaryCurrency === "CNY") return "元 (人民幣 ¥)";
      if (primaryCurrency === "USD") return "元 (美元 $)";
      return "元";
    }
    // Mixed currency display
    return "元 (各幣種合計)";
  };

  // Print Action
  const handlePrint = () => {
    window.print();
  };

  // Export to Word (.doc / HTML template)
  const handleExportWord = () => {
    const tableRowsHtml = flattenedLines.map(l => `
      <tr>
        <td style="border:1px solid #000; padding:8px; text-align:center; font-family:'標楷體','DFKai-SB','Times New Roman'; font-size:12pt;">
          ${l.nameWithSpec}
          ${l.productUrl ? `<br/><span style="font-size:9pt; color:#1a56db;">連結: ${l.productUrl}</span>` : ""}
        </td>
        <td style="border:1px solid #000; padding:8px; text-align:center; font-family:'標楷體','DFKai-SB','Times New Roman'; font-size:12pt;">
          ${renderCellAmount(l.unitPrice, l.currency)}
        </td>
        <td style="border:1px solid #000; padding:8px; text-align:center; font-family:'標楷體','DFKai-SB','Times New Roman'; font-size:12pt;">
          ${l.quantity}
        </td>
        <td style="border:1px solid #000; padding:8px; text-align:center; font-family:'標楷體','DFKai-SB','Times New Roman'; font-size:12pt;">
          ${renderCellAmount(l.subtotal, l.currency)}
        </td>
        <td style="border:1px solid #000; padding:8px; text-align:center; font-family:'標楷體','DFKai-SB','Times New Roman'; font-size:12pt;">
          ${l.purpose}
        </td>
        <td style="border:1px solid #000; padding:8px; text-align:center; font-family:'標楷體','DFKai-SB','Times New Roman'; font-size:12pt;">
          ${l.vendorAndPlatform}
        </td>
      </tr>
    `).join("");

    const emptyRowsHtml = Array(emptyRowsCount).fill(0).map(() => `
      <tr>
        <td style="border:1px solid #000; padding:16px;">&nbsp;</td>
        <td style="border:1px solid #000; padding:16px;">&nbsp;</td>
        <td style="border:1px solid #000; padding:16px;">&nbsp;</td>
        <td style="border:1px solid #000; padding:16px;">&nbsp;</td>
        <td style="border:1px solid #000; padding:16px;">&nbsp;</td>
        <td style="border:1px solid #000; padding:16px;">&nbsp;</td>
      </tr>
    `).join("");

    const wordContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" 
            xmlns:w="urn:schemas-microsoft-com:office:word" 
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>環境生物技術暨生物煉製實驗室請購單</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page {
            size: A4 portrait;
            margin: 2cm 2cm 2cm 2cm;
          }
          body {
            font-family: '標楷體', 'DFKai-SB', '新細明體', 'PMingLiU', serif;
            font-size: 12pt;
            color: #000;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            margin-bottom: 12px;
          }
          th, td {
            border: 1px solid #000;
            padding: 8px 6px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <table style="border:none; margin-bottom: 10px;">
          <tr style="border:none;">
            <td style="border:none; text-align:left; vertical-align:middle;">
              <h2 style="margin:0; font-family:'標楷體','DFKai-SB'; font-size:20pt; font-weight:bold; letter-spacing:1px;">
                環境生物技術暨生物煉製實驗室請購單
              </h2>
            </td>
            <td style="border:none; text-align:right; width:90px; vertical-align:middle;">
              <img src="https://www.nsysu.edu.tw/var/file/0/1000/msys_1000_5682857_38476.png" width="75" height="75" alt="國立中山大學校徽" />
            </td>
          </tr>
        </table>

        <div style="text-align:left; font-size:12pt; margin-bottom:8px; font-weight:bold;">
          申請日期：${requisitionDate}
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:28%; font-size:12pt;">產品名稱及規格</th>
              <th style="width:12%; font-size:12pt;">單價</th>
              <th style="width:10%; font-size:12pt;">數量</th>
              <th style="width:12%; font-size:12pt;">小計</th>
              <th style="width:20%; font-size:12pt;">用途</th>
              <th style="width:18%; font-size:12pt;">備註(廠商)</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
            ${emptyRowsHtml}
            <tr>
              <td style="font-weight:bold; font-size:12pt; letter-spacing:4px;">總　計</td>
              <td style="font-size:11pt; font-weight:bold;">${getCurrencyUnitLabel()}</td>
              <td>&nbsp;</td>
              <td style="font-size:12pt; font-weight:bold;">${primaryTotalAmount.toLocaleString()}</td>
              <td>&nbsp;</td>
              <td>&nbsp;</td>
            </tr>
            <tr>
              <td style="font-weight:bold; font-size:12pt;">老師核准</td>
              <td style="font-size:12pt;">${primaryReq.status === "approved" || primaryReq.status === "purchased" ? professorReviewer : ""}</td>
              <td style="font-weight:bold; font-size:12pt;">審核人</td>
              <td style="font-size:12pt;">${assistantReviewer}</td>
              <td style="font-weight:bold; font-size:12pt;">申請人</td>
              <td style="font-size:12pt;">${applicant}</td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top:14px; font-size:10pt; line-height:1.7; font-family:'標楷體','DFKai-SB';">
          1. 凡購買物品者，請先填寫請購單，經審核人與老師同意後，始可購買。單價或總價金額超過 3,000 元，需事先詢價三家廠商並徵得老師同意簽可後，始可購買。<br/>
          2. 耗材類、藥品類由子瑩負責審核，其他類由老師直接審核。<br/>
          3. 審核人需確定物品是否還有庫存、是否需要增購，也要參考過去購買紀錄，審核本次請購價錢與數量是否合理。
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([wordContent], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `EBB_實驗室請購單_${primaryReq.requisitionNo || requisitionDate}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export to CSV
  const handleExportCsv = () => {
    const headers = ["產品名稱及規格", "單價", "幣種", "數量", "小計", "用途", "備註(廠商與平台)", "商品連結", "申請日期", "申請人", "審核人", "老師核准"];
    const rows = flattenedLines.map(l => [
      `"${l.nameWithSpec.replace(/"/g, '""')}"`,
      l.unitPrice,
      l.currency,
      l.quantity,
      l.subtotal,
      `"${l.purpose.replace(/"/g, '""')}"`,
      `"${l.vendorAndPlatform.replace(/"/g, '""')}"`,
      `"${(l.productUrl || "").replace(/"/g, '""')}"`,
      requisitionDate,
      applicant,
      assistantReviewer,
      primaryReq.status === "approved" ? professorReviewer : "審核中"
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `EBB_請購清冊_${primaryReq.requisitionNo || requisitionDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div 
      className="fixed inset-0 z-[70] flex flex-col items-center justify-start bg-slate-950/80 backdrop-blur-sm overflow-y-auto p-3 sm:p-6 print:p-0 print:bg-white print:static"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Floating Quick Close Button (Top-Right, always accessible anywhere on page) */}
      <button
        type="button"
        onClick={onClose}
        className="fixed top-4 right-4 z-[80] print:hidden px-3.5 py-2 bg-rose-600/90 hover:bg-rose-600 text-white rounded-full text-xs font-bold transition shadow-2xl border border-rose-400 flex items-center gap-1.5 cursor-pointer backdrop-blur-sm active:scale-95"
        title="關閉請購單預覽 (ESC)"
      >
        <X className="w-4 h-4" />
        <span>關閉預覽 (ESC)</span>
      </button>

      <div 
        id="official-requisition-modal"
        className="w-full max-w-4xl bg-slate-100 rounded-2xl shadow-2xl border border-slate-300 overflow-hidden my-2 sm:my-4 print:border-none print:shadow-none print:w-full print:max-w-none print:bg-white flex flex-col"
      >
        {/* Action Toolbar (Sticky Top, Hidden during browser printing) */}
        <div className="sticky top-0 z-30 px-3 sm:px-6 py-2.5 sm:py-3.5 bg-slate-900/95 backdrop-blur-sm text-white flex flex-wrap items-center justify-between gap-2 print:hidden shadow-md">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-xs sm:text-sm tracking-wide">
                實驗室請購單
              </span>
              <span className="ml-1 sm:ml-2 text-[10px] sm:text-xs text-slate-400 font-mono">
                {primaryReq.requisitionNo || `DATE-${requisitionDate}`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              type="button"
              onClick={handlePrint}
              className="px-2.5 sm:px-3.5 py-1.5 bg-[#1b4372] hover:bg-[#122e4f] text-white rounded-lg text-xs font-bold transition flex items-center gap-1 sm:gap-1.5 shadow whitespace-nowrap cursor-pointer"
              title="列印或另存為 PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">列印 / 存為 PDF</span>
              <span className="inline sm:hidden">列印</span>
            </button>

            <button
              type="button"
              onClick={handleExportWord}
              className="px-2.5 sm:px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 sm:gap-1.5 shadow whitespace-nowrap cursor-pointer"
              title="匯出為標準 Word (.doc) 格式"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">匯出 Word (.doc)</span>
              <span className="inline sm:hidden">Word</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={handleExportCsv}
                className="px-2.5 sm:px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-medium transition flex items-center gap-1 sm:gap-1.5 whitespace-nowrap cursor-pointer"
                title="匯出 Excel / CSV 表格"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">匯出 Excel</span>
                <span className="inline sm:hidden">Excel</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-2.5 sm:px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 sm:gap-1.5 shadow active:scale-95 cursor-pointer whitespace-nowrap"
              title="關閉請購單預覽 (ESC)"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">關閉預覽</span>
              <span className="inline sm:hidden">關閉</span>
            </button>
          </div>
        </div>

        {/* Paper Container - 1:1 Matching User's Word Document Template */}
        <div className="p-2 sm:p-4 md:p-8 flex justify-center bg-slate-200/80 print:p-0 print:bg-white overflow-x-auto">
          <div 
            ref={printRef}
            id="requisition-paper-sheet"
            className="w-full max-w-[794px] min-w-[620px] min-h-[1123px] bg-white p-6 sm:p-10 md:p-12 shadow-lg border border-slate-300 print:shadow-none print:border-none print:p-8 text-black"
            style={{
              fontFamily: "'標楷體', 'DFKai-SB', 'BiauKai', 'Noto Serif TC', 'PMingLiU', serif"
            }}
          >
            {/* Header: Title on Left, Circular NSYSU Logo on Right (Matches Screenshot) */}
            <div className="flex items-center justify-between pb-2 mb-4 border-b border-transparent">
              <div className="pr-4">
                <h1 className="text-2xl md:text-[26px] font-bold tracking-wider text-black leading-tight">
                  環境生物技術暨生物煉製實驗室請購單
                </h1>
              </div>
              <div className="flex-shrink-0">
                <NsysuEmblem size={78} />
              </div>
            </div>

            {/* Date line: 申請日期：2025.08.06 (Exact match to screenshot) */}
            <div className="text-left text-base font-bold text-black mb-3">
              申請日期：{requisitionDate}
            </div>

            {/* Main Requisition Table (Exact 6 Columns with crisp black borders) */}
            <table className="w-full border-collapse border border-black text-center text-[13px] leading-snug">
              <thead>
                <tr className="bg-white text-black font-bold">
                  <th className="border border-black py-1.5 px-2 w-[29%] text-center">產品名稱及規格</th>
                  <th className="border border-black py-1.5 px-2 w-[12%] text-center">單價</th>
                  <th className="border border-black py-1.5 px-2 w-[9%] text-center">數量</th>
                  <th className="border border-black py-1.5 px-2 w-[12%] text-center">小計</th>
                  <th className="border border-black py-1.5 px-2 w-[20%] text-center">用途</th>
                  <th className="border border-black py-1.5 px-2 w-[18%] text-center">備註(廠商)</th>
                </tr>
              </thead>
              <tbody>
                {/* Requisition Line Items */}
                {flattenedLines.map((line, idx) => (
                  <tr key={line.lineId || idx} className="hover:bg-slate-50/50">
                    <td className="border border-black py-1.5 px-2 text-center align-middle">
                      <div className="font-medium text-black">
                        {line.nameWithSpec}
                      </div>
                      {line.productUrl && (
                        <div className="text-[10px] text-blue-800 truncate max-w-[210px] mx-auto mt-0.5 print:text-black">
                          連結: {line.productUrl}
                        </div>
                      )}
                    </td>
                    <td className="border border-black py-1.5 px-2 text-center font-mono align-middle font-medium">
                      {renderCellAmount(line.unitPrice, line.currency)}
                    </td>
                    <td className="border border-black py-1.5 px-2 text-center font-mono align-middle">
                      {line.quantity}
                    </td>
                    <td className="border border-black py-1.5 px-2 text-center font-mono align-middle font-medium">
                      {renderCellAmount(line.subtotal, line.currency)}
                    </td>
                    <td className="border border-black py-1.5 px-2 text-center align-middle">
                      {line.purpose}
                    </td>
                    <td className="border border-black py-1.5 px-2 text-center align-middle">
                      {line.vendorAndPlatform}
                    </td>
                  </tr>
                ))}

                {/* Empty Rows to match Word document visual proportions */}
                {Array(emptyRowsCount).fill(0).map((_, eIdx) => (
                  <tr key={`empty-row-${eIdx}`} className="h-7">
                    <td className="border border-black py-1 px-2">&nbsp;</td>
                    <td className="border border-black py-1 px-2">&nbsp;</td>
                    <td className="border border-black py-1 px-2">&nbsp;</td>
                    <td className="border border-black py-1 px-2">&nbsp;</td>
                    <td className="border border-black py-1 px-2">&nbsp;</td>
                    <td className="border border-black py-1 px-2">&nbsp;</td>
                  </tr>
                ))}

                {/* Summary Row (總計列) - Matches Screenshot */}
                <tr className="h-9 font-bold">
                  <td className="border border-black py-1.5 px-2 text-center text-[14px] tracking-[6px]">
                    總　計
                  </td>
                  <td className="border border-black py-1.5 px-2 text-center text-[12px]">
                    {getCurrencyUnitLabel()}
                  </td>
                  <td className="border border-black py-1.5 px-2"></td>
                  <td className="border border-black py-1.5 px-2 text-center font-mono text-[13.5px]">
                    {primaryTotalAmount.toLocaleString()}
                  </td>
                  <td className="border border-black py-1.5 px-2"></td>
                  <td className="border border-black py-1.5 px-2"></td>
                </tr>

                {/* Signatures Row (核准列) - Matches Screenshot */}
                <tr className="h-10 font-bold">
                  <td className="border border-black py-1.5 px-2 text-center text-[13.5px]">
                    老師核准
                  </td>
                  <td className="border border-black p-2 text-center font-normal">
                    {/* Clean formal text without pseudo stamp */}
                    {primaryReq.status === "approved" || primaryReq.status === "purchased" ? (
                      <span className="text-black font-semibold">{professorReviewer}</span>
                    ) : (
                      <span className="text-slate-300 print:text-transparent">待簽核</span>
                    )}
                  </td>
                  <td className="border border-black p-2 text-center text-[14px]">
                    審核人
                  </td>
                  <td className="border border-black p-2 text-center font-normal">
                    <span className="text-black">{assistantReviewer}</span>
                  </td>
                  <td className="border border-black p-2 text-center text-[14px]">
                    申請人
                  </td>
                  <td className="border border-black p-2 text-center font-normal">
                    <span className="text-black">{applicant}</span>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Footnotes Below Table (100% Exact text from User's Screenshot) */}
            <div className="mt-5 text-[12.5px] leading-relaxed text-black space-y-1.5 text-left font-medium">
              <p>
                1. 凡購買物品者，請先填寫請購單，經審核人與老師同意後，始可購買。單價或總價金額超過 3,000 元，需事先詢價三家廠商並徵得老師同意簽可後，始可購買。
              </p>
              <p>
                2. 耗材類、藥品類由子瑩負責審核，其他類由老師直接審核。
              </p>
              <p>
                3. 審核人需確定物品是否還有庫存、是否需要增購，也要參考過去購買紀錄，審核本次請購價錢與數量是否合理。
              </p>
            </div>

            {/* Requisition Reference & Currency Notice */}
            {activeCurrencies.some(c => c !== "TWD") && (
              <div className="mt-4 pt-2 border-t border-dashed border-slate-300 text-[11px] text-slate-500 flex justify-between print:text-slate-600">
                <span>
                  * 本單據包含外幣品項（換算參考：人民幣 CNY ≈ 4.5、美元 USD ≈ 32.5）。預估折合新台幣總計：NT$ {grandTotalTwdEstimate.toLocaleString()}。
                </span>
                <span className="font-mono">
                  {primaryReq.requisitionNo}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Action Footer (Hidden during printing) */}
        <div className="sticky bottom-0 z-30 px-4 sm:px-6 py-3.5 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 text-white flex flex-wrap items-center justify-between gap-3 print:hidden shadow-lg">
          <div className="text-xs text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="font-medium">國立中山大學 EBB Lab 請購單預覽</span>
            <span className="font-mono text-slate-400 hidden sm:inline">({primaryReq.requisitionNo})</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>列印 / 存為 PDF</span>
            </button>
            <button
              type="button"
              onClick={handleExportWord}
              className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow"
            >
              <Download className="w-3.5 h-3.5" />
              <span>匯出 Word</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>關閉預覽 (ESC)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
