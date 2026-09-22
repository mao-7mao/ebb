import React, { useState, useMemo } from "react";
import { 
  Calendar, 
  CalendarRange, 
  Download, 
  X, 
  FileSpreadsheet, 
  CheckCircle2, 
  Clock, 
  Filter
} from "lucide-react";
import { ProcurementItem } from "../../types/procurement";
import { extractDateOnly, getTodayTaipeiDate } from "../../utils/dateUtils";

interface ExportDateRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ProcurementItem[];
  lang?: "zh" | "en";
  title?: string;
  defaultDatePreset?: string;
}

export default function ExportDateRangeModal({
  isOpen,
  onClose,
  items,
  lang = "zh",
  title,
  defaultDatePreset = "THIS_MONTH"
}: ExportDateRangeModalProps) {
  const [datePreset, setDatePreset] = useState<string>(defaultDatePreset);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Calculate dates based on preset
  const todayStr = getTodayTaipeiDate();

  const effectiveRange = useMemo(() => {
    let start = "";
    let end = todayStr;
    let label = "";

    if (datePreset === "TODAY") {
      start = todayStr;
      end = todayStr;
      label = `今日 (${todayStr})`;
    } else if (datePreset === "7DAYS") {
      const d7 = new Date();
      d7.setDate(d7.getDate() - 7);
      start = extractDateOnly(d7);
      label = `最近 7 天 (${start} ~ ${end})`;
    } else if (datePreset === "30DAYS") {
      const d30 = new Date();
      d30.setDate(d30.getDate() - 30);
      start = extractDateOnly(d30);
      label = `最近 30 天 (${start} ~ ${end})`;
    } else if (datePreset === "THIS_MONTH") {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      start = `${year}-${month}-01`;
      // last day of current month
      const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
      end = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
      label = `本月份 (${start} ~ ${end})`;
    } else if (datePreset === "LAST_MONTH") {
      const now = new Date();
      const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const year = prevMonthDate.getFullYear();
      const month = String(prevMonthDate.getMonth() + 1).padStart(2, "0");
      start = `${year}-${month}-01`;
      const lastDay = new Date(year, prevMonthDate.getMonth() + 1, 0).getDate();
      end = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
      label = `上個月份 (${start} ~ ${end})`;
    } else if (datePreset === "CUSTOM") {
      start = startDate;
      end = endDate;
      label = start && end ? `${start} ~ ${end}` : start ? `${start} 起` : end ? `至 ${end}` : "自訂區間";
    } else {
      label = "全部歷史時間段";
    }

    return { start, end, label };
  }, [datePreset, startDate, endDate, todayStr]);

  // Filter items based on effective range and status
  const matchedItems = useMemo(() => {
    return items.filter((item) => {
      // Status filter
      if (statusFilter !== "ALL" && item.status !== statusFilter) {
        return false;
      }

      // Date filter
      if (datePreset === "ALL") return true;

      const itemDate = extractDateOnly(item.createdAt, item.requisitionNo);
      if (!itemDate) return true;

      if (effectiveRange.start && itemDate < effectiveRange.start) return false;
      if (effectiveRange.end && itemDate > effectiveRange.end) return false;

      return true;
    });
  }, [items, statusFilter, datePreset, effectiveRange]);

  // Count total sub-items and total amount
  const { totalLineItems, totalAmount } = useMemo(() => {
    let lineCount = 0;
    let amount = 0;
    matchedItems.forEach((req) => {
      amount += req.estimatedTotalPrice || 0;
      if (req.items && req.items.length > 0) {
        lineCount += req.items.length;
      } else {
        lineCount += 1;
      }
    });
    return { totalLineItems: lineCount, totalAmount: amount };
  }, [matchedItems]);

  if (!isOpen) return null;

  const handleExecuteExport = () => {
    const headers = [
      "請購單號 (Requisition No)",
      "品項項次 (Line No)",
      "申請日期 (Date)",
      "申請人 (Applicant)",
      "聯絡信箱 (Email)",
      "品項類別 (Category)",
      "品項名稱 (Item Name)",
      "數量 (Quantity)",
      "單位 (Unit)",
      "預估單價 (Est. Unit Price)",
      "預估總額 (Est. Total Price NT$)",
      "商品/購物連結 (Product URL)",
      "請購用途 (Purpose)",
      "建議廠商/通路 (Vendor)",
      "審核狀態 (Status)",
      "審核備註 (Review Comment)",
      "指定採購人 (Purchaser)",
      "實際採購人 (Purchased By)",
      "實際採購日期 (Purchase Date)",
      "發票/收據號碼 (Invoice No)",
      "實際決標/採購總額 (Actual Total NT$)"
    ];

    const rows: (string | number)[][] = [];

    matchedItems.forEach((req) => {
      const subItems = (req.items && req.items.length > 0) ? req.items : [
        {
          id: req.id,
          category: req.category || "consumable",
          itemName: req.itemName,
          quantity: req.quantity,
          unit: req.unit,
          estimatedUnitPrice: req.estimatedUnitPrice,
          estimatedTotalPrice: req.estimatedTotalPrice,
          productUrl: req.productUrl,
          purpose: req.purpose,
          vendorName: req.vendorName,
          status: req.status,
          reviewComment: req.assistantReview?.comment || req.professorReview?.comment
        }
      ];

      subItems.forEach((item, idx) => {
        rows.push([
          `"${req.requisitionNo}"`,
          idx + 1,
          `"${extractDateOnly(req.createdAt, req.requisitionNo)}"`,
          `"${req.applicantName}"`,
          `"${req.applicantEmail}"`,
          `"${item.category || req.category}"`,
          `"${(item.itemName || req.itemName).replace(/"/g, '""')}"`,
          item.quantity,
          `"${item.unit || req.unit}"`,
          item.estimatedUnitPrice,
          item.estimatedTotalPrice,
          `"${(item.productUrl || req.productUrl || "").replace(/"/g, '""')}"`,
          `"${(item.purpose || req.purpose || "").replace(/"/g, '""')}"`,
          `"${(item.vendorName || req.vendorName || "").replace(/"/g, '""')}"`,
          `"${item.status || req.status}"`,
          `"${(item.reviewComment || "").replace(/"/g, '""')}"`,
          `"${req.purchaser || "unassigned"}"`,
          `"${req.actualPurchaseInfo?.purchasedBy || ""}"`,
          `"${req.actualPurchaseInfo?.purchaseDate || ""}"`,
          `"${req.actualPurchaseInfo?.invoiceNumber || ""}"`,
          req.actualPurchaseInfo?.actualTotalPrice !== undefined ? req.actualPurchaseInfo.actualTotalPrice : ""
        ]);
      });
    });

    // Generate CSV with UTF-8 BOM
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    const fileDateTag = effectiveRange.start && effectiveRange.end 
      ? `${effectiveRange.start}_to_${effectiveRange.end}`
      : effectiveRange.start 
      ? `from_${effectiveRange.start}`
      : `All_${todayStr}`;

    link.download = `EBB_Lab_Procurement_${fileDateTag}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-md border border-[#e5e5e0] shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-[#1b4372] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="font-serif font-bold text-base tracking-wide">
                {title || (lang === "zh" ? "依時間段匯出請購單 Excel (CSV)" : "Export Procurement by Date Range")}
              </h3>
              <p className="text-[11px] text-blue-100 font-sans mt-0.5">
                {lang === "zh" ? "支援自訂時段、月結區間與審核狀態篩選" : "Supports customizable time periods and status filtering"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-sm text-blue-200 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Preset Buttons */}
          <div>
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
              <Calendar className="w-3.5 h-3.5 text-[#1b4372]" />
              <span>{lang === "zh" ? "選擇匯出時間區段 (Time Range)" : "Select Time Range"}</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "THIS_MONTH", label: "本月", hint: "本月至今" },
                { id: "LAST_MONTH", label: "上個月份", hint: "上月完整結算" },
                { id: "30DAYS", label: "最近 30 天", hint: "前30日" },
                { id: "7DAYS", label: "最近 7 天", hint: "本週記錄" },
                { id: "ALL", label: "全部歷史時間", hint: "不限日期" },
                { id: "CUSTOM", label: "📅 自訂起訖日期", hint: "指定區間" }
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setDatePreset(p.id)}
                  className={`px-3 py-2 rounded border text-left transition flex flex-col justify-center ${
                    datePreset === p.id
                      ? "bg-[#1b4372] text-white border-[#1b4372] shadow-xs"
                      : "bg-[#fdfdfc] text-slate-700 border-[#e5e5e0] hover:bg-slate-100"
                  }`}
                >
                  <span className="text-xs font-bold">{p.label}</span>
                  <span className={`text-[10px] ${datePreset === p.id ? "text-blue-200" : "text-slate-400"}`}>
                    {p.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Range Pickers (active when CUSTOM) */}
          {datePreset === "CUSTOM" && (
            <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-sm space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <CalendarRange className="w-3.5 h-3.5" />
                <span>請指定自訂起訖日期：</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[11px] text-slate-500 font-medium block mb-1">起始日期 (From)：</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono focus:outline-none focus:border-[#1b4372]"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-medium block mb-1">截止日期 (To)：</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono focus:outline-none focus:border-[#1b4372]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Status Filter */}
          <div>
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
              <Filter className="w-3.5 h-3.5 text-[#1b4372]" />
              <span>{lang === "zh" ? "審核狀態範圍 (Status)" : "Filter by Status"}</span>
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#e5e5e0] rounded text-xs font-sans focus:outline-none focus:border-[#1b4372]"
            >
              <option value="ALL">全部審核狀態 (包含待審、已核准、已採購等所有案件)</option>
              <option value="approved">僅核准案件 (Approved - 待採購)</option>
              <option value="purchased">僅已採購完成入庫案件 (Purchased)</option>
              <option value="pending_assistant">僅待 Admin/助理初審案件</option>
              <option value="pending_professor">僅待教授終審案件</option>
              <option value="rejected">僅已退回案件 (Rejected)</option>
            </select>
          </div>

          {/* Live Preview Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">匯出時間範圍：</span>
              <span className="font-bold text-[#1b4372]">{effectiveRange.label}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">符合請購單數：</span>
              <span className="font-bold text-slate-800">{matchedItems.length} 筆單據 ({totalLineItems} 項子品項)</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">預估請購總額：</span>
              <span className="font-bold text-emerald-800 font-mono">NT$ {totalAmount.toLocaleString()}</span>
            </div>
            <div className="pt-1.5 text-[11px] text-slate-400 border-t border-slate-200">
              檔案編碼採 UTF-8 (含 BOM)，可直接使用 Microsoft Excel 或 Google 試算表完整開啟不亂碼。
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-3 bg-[#fdfdfc] border-t border-[#e5e5e0] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded transition"
          >
            {lang === "zh" ? "取消" : "Cancel"}
          </button>
          <button
            type="button"
            disabled={matchedItems.length === 0}
            onClick={handleExecuteExport}
            className="inline-flex items-center gap-2 px-5 py-2 bg-[#1b4372] hover:bg-[#122e4f] disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded text-xs font-bold transition shadow-xs active:scale-98"
          >
            <Download className="w-4 h-4" />
            <span>
              {lang === "zh" ? `確認匯出 Excel (${matchedItems.length} 筆)` : `Export CSV (${matchedItems.length})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
