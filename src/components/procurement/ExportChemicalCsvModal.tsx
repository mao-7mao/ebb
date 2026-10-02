import React, { useState, useMemo } from "react";
import { 
  Calendar, 
  CalendarRange, 
  Download, 
  X, 
  FileSpreadsheet, 
  CheckCircle2, 
  FlaskConical, 
  Copy, 
  Check, 
  Filter,
  Search,
  AlertCircle,
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import { ProcurementItem } from "../../types/procurement";
import { extractDateOnly, getTodayTaipeiDate } from "../../utils/dateUtils";
import { 
  extractChemicalLines, 
  exportChemicalsToCsv, 
  generateBatchChemicalsTxt,
  FlatChemicalItem 
} from "../../utils/chemicalExportUtils";

interface ExportChemicalCsvModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: ProcurementItem[];
  lang?: "zh" | "en";
}

export default function ExportChemicalCsvModal({
  isOpen,
  onClose,
  items,
  lang = "zh"
}: ExportChemicalCsvModalProps) {
  const [datePreset, setDatePreset] = useState<string>("THIS_MONTH");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [keywordSearch, setKeywordSearch] = useState<string>("");
  const [hasCopiedTxt, setHasCopiedTxt] = useState(false);

  const todayStr = getTodayTaipeiDate();

  // Calculate effective date range
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

  // Extract all chemicals from requisitions
  const allChemicalLines = useMemo(() => {
    return extractChemicalLines(items);
  }, [items]);

  // Filter chemicals based on date range, status, and optional keyword
  const filteredChemicals = useMemo(() => {
    return allChemicalLines.filter((chem) => {
      // Status filter
      if (statusFilter === "APPROVED_ONLY") {
        if (chem.status !== "approved" && chem.status !== "purchased") return false;
      } else if (statusFilter === "PURCHASED_ONLY") {
        if (chem.status !== "purchased") return false;
      } else if (statusFilter !== "ALL" && chem.status !== statusFilter) {
        return false;
      }

      // Date range filter
      if (datePreset !== "ALL") {
        if (effectiveRange.start && chem.createdAt < effectiveRange.start) return false;
        if (effectiveRange.end && chem.createdAt > effectiveRange.end) return false;
      }

      // Keyword filter
      if (keywordSearch.trim()) {
        const q = keywordSearch.trim().toLowerCase();
        const match = 
          chem.itemName.toLowerCase().includes(q) ||
          chem.chemicalEnglishName.toLowerCase().includes(q) ||
          chem.casNumber.toLowerCase().includes(q) ||
          chem.applicantName.toLowerCase().includes(q) ||
          chem.requisitionNo.toLowerCase().includes(q) ||
          chem.vendorName.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [allChemicalLines, statusFilter, datePreset, effectiveRange, keywordSearch]);

  // Total statistics
  const { totalQty, totalAmount } = useMemo(() => {
    let qty = 0;
    let amt = 0;
    filteredChemicals.forEach((c) => {
      qty += c.quantity || 1;
      amt += c.estimatedTotalPrice || 0;
    });
    return { totalQty: qty, totalAmount: amt };
  }, [filteredChemicals]);

  if (!isOpen) return null;

  // Execute CSV download
  const handleDownloadCsv = () => {
    // Map filtered chemicals back to synthetic ProcurementItem format for export function
    const matchedRequisitionIds = new Set(filteredChemicals.map(c => c.requisitionId));
    const matchingReqs = items.filter(req => matchedRequisitionIds.has(req.id));
    
    // We can directly call exportChemicalsToCsv
    exportChemicalsToCsv(matchingReqs, effectiveRange.label);
  };

  // Copy batch TXT
  const handleCopyBatchTxt = () => {
    const matchedRequisitionIds = new Set(filteredChemicals.map(c => c.requisitionId));
    const matchingReqs = items.filter(req => matchedRequisitionIds.has(req.id));
    
    const txt = generateBatchChemicalsTxt(matchingReqs, effectiveRange.label);
    navigator.clipboard.writeText(txt);
    setHasCopiedTxt(true);
    setTimeout(() => setHasCopiedTxt(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-white rounded-md border border-[#e5e5e0] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-emerald-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-700 rounded-sm">
              <FlaskConical className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-base sm:text-lg tracking-wide">
                  {lang === "zh" ? "藥品入庫專用 CSV 匯出與 TXT 同步" : "Chemical Inventory CSV Export & TXT Sync"}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-900 text-emerald-200 border border-emerald-600">
                  {lang === "zh" ? "免管理員權限 " : "Open Access "}
                </span>
              </div>
              <p className="text-[11px] text-emerald-100 font-sans mt-0.5">
                {lang === "zh" 
                  ? "自訂時間段篩選藥品、產生標準入庫 CSV 或一鍵複製登記文字" 
                  : "Filter chemical items by custom date range, export standard CSV, or copy inventory TXT"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-sm text-emerald-200 hover:text-white hover:bg-emerald-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs font-sans">
          {/* Top Notice Box */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-sm flex items-start gap-2.5 text-emerald-900">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>入庫管理說明：</strong>請購階段已填寫 CAS 號碼、中英文品名、純度與規格。可於下方選擇時間範圍（如本月或指定日期），匯出含有完整 CAS 與規格之 CSV，或一鍵複製 TXT 傳送給藥品管理同學進行實體驗收與櫃位建檔。
            </div>
          </div>

          {/* Section 1: Date Range Presets */}
          <div className="bg-[#fbfbfa] p-3.5 rounded-sm border border-[#e5e5e0] space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-serif">
                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                <span>{lang === "zh" ? "1. 選擇入庫統計時段 (Date Range)" : "1. Select Date Range"}</span>
              </label>
              <span className="text-[11px] font-mono text-emerald-800 font-bold">
                當前區間: {effectiveRange.label}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
              {[
                { id: "THIS_MONTH", label: "本月份 (當月)", hint: "本月入庫" },
                { id: "LAST_MONTH", label: "上個月份", hint: "上月請購" },
                { id: "30DAYS", label: "最近 30 天", hint: "前30日" },
                { id: "7DAYS", label: "最近 7 天", hint: "一週內" },
                { id: "ALL", label: "全部歷史時間", hint: "不限日期" },
                { id: "CUSTOM", label: "📅 自訂起訖日期", hint: "指定區間" }
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setDatePreset(p.id)}
                  className={`p-2 rounded-sm border text-left transition flex flex-col justify-between cursor-pointer ${
                    datePreset === p.id
                      ? "bg-emerald-700 text-white border-emerald-700 font-bold shadow-xs"
                      : "bg-white text-slate-700 border-[#e5e5e0] hover:bg-emerald-50 hover:border-emerald-300"
                  }`}
                >
                  <span className="text-xs leading-snug">{p.label}</span>
                  <span className={`text-[10px] block mt-0.5 font-mono ${datePreset === p.id ? "text-emerald-100" : "text-slate-400"}`}>
                    {p.hint}
                  </span>
                </button>
              ))}
            </div>

            {/* Custom Date Inputs if CUSTOM selected */}
            {datePreset === "CUSTOM" && (
              <div className="pt-2 border-t border-[#e5e5e0] grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
                <div>
                  <span className="block text-[11px] text-slate-600 font-medium mb-1">起始日期 (From)</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-white border border-[#e5e5e0] rounded-sm p-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <span className="block text-[11px] text-slate-600 font-medium mb-1">結束日期 (To)</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-white border border-[#e5e5e0] rounded-sm p-1.5 text-xs font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Filter Toolbar (Status & Keywords) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Status Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-500 text-xs font-medium flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-emerald-700" />
                <span>狀態：</span>
              </span>
              {[
                { id: "ALL", label: "全部狀態" },
                { id: "APPROVED_ONLY", label: "核准待採購 & 已採購" },
                { id: "approved", label: "僅已核准" },
                { id: "purchased", label: "僅已到貨採購" },
                { id: "pending_assistant", label: "審核中" }
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-2.5 py-1 rounded-sm text-xs font-medium border transition cursor-pointer ${
                    statusFilter === st.id
                      ? "bg-emerald-700 text-white border-emerald-700 font-bold"
                      : "bg-white text-slate-600 border-[#e5e5e0] hover:bg-slate-50"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Keyword Search */}
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={keywordSearch}
                onChange={(e) => setKeywordSearch(e.target.value)}
                placeholder="搜尋品名、CAS、申請人..."
                className="w-full pl-8 pr-2.5 py-1 bg-white border border-[#e5e5e0] rounded-sm text-xs focus:border-emerald-700 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 3: Summary Banner & Live Preview */}
          <div className="border border-[#e5e5e0] rounded-sm bg-white overflow-hidden shadow-2xs">
            <div className="px-4 py-2.5 bg-[#f8f8f5] border-b border-[#e5e5e0] flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 font-serif">
                  篩選結果預覽 (Preview)
                </span>
                <span className="text-xs bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-mono font-bold">
                  {filteredChemicals.length} 筆藥品品項
                </span>
              </div>
              <div className="text-slate-600 font-mono text-xs">
                預估金額總計：<strong className="text-emerald-800 text-sm">NT$ {totalAmount.toLocaleString()}</strong>
              </div>
            </div>

            {/* Table */}
            <div className="max-h-60 overflow-y-auto">
              {filteredChemicals.length > 0 ? (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#fafaf8] text-slate-600 sticky top-0 border-b border-[#e5e5e0]">
                    <tr>
                      <th className="py-2 px-3 font-semibold">CAS 號碼</th>
                      <th className="py-2 px-3 font-semibold">中文化學品名</th>
                      <th className="py-2 px-3 font-semibold">英文化學品名</th>
                      <th className="py-2 px-3 font-semibold">純度 / 規格</th>
                      <th className="py-2 px-3 font-semibold">數量</th>
                      <th className="py-2 px-3 font-semibold">預估金額</th>
                      <th className="py-2 px-3 font-semibold">申請人</th>
                      <th className="py-2 px-3 font-semibold">請購單號</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e5e0]">
                    {filteredChemicals.map((chem, idx) => (
                      <tr key={chem.lineId || idx} className="hover:bg-emerald-50/40 transition">
                        <td className="py-2 px-3 font-mono font-bold text-emerald-900 whitespace-nowrap">
                          {chem.casNumber}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-800 max-w-[140px] truncate" title={chem.itemName}>
                          {chem.itemName}
                        </td>
                        <td className="py-2 px-3 text-slate-500 font-mono italic max-w-[140px] truncate" title={chem.chemicalEnglishName}>
                          {chem.chemicalEnglishName || "—"}
                        </td>
                        <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                          <span className="font-medium">{chem.purity}</span>
                          {chem.packageSize && <span className="text-slate-400 font-mono ml-1">({chem.packageSize})</span>}
                        </td>
                        <td className="py-2 px-3 text-slate-800 font-mono whitespace-nowrap">
                          {chem.quantity} {chem.unit}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-[#1b4372] whitespace-nowrap">
                          NT$ {chem.estimatedTotalPrice.toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                          {chem.applicantName}
                        </td>
                        <td className="py-2 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                          {chem.requisitionNo}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-10 text-center text-slate-400 space-y-1">
                  <AlertCircle className="w-6 h-6 mx-auto text-slate-300" />
                  <p>所選時間範圍或條件下，無任何藥品請購記錄。</p>
                  <p className="text-[11px]">可切換至「全部歷史時間」或調整審核狀態篩選條件。</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-[#f8f8f5] border-t border-[#e5e5e0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600 block"></span>
            <span>匯出檔案含 UTF-8 BOM</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy TXT Button */}
            <button
              type="button"
              onClick={handleCopyBatchTxt}
              disabled={filteredChemicals.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 disabled:opacity-50 text-slate-800 border border-[#e5e5e0] rounded-sm font-bold text-xs transition shadow-2xs cursor-pointer"
              title="一鍵複製篩選範圍內所有藥品入庫資訊文字，方便貼至通訊軟體或備忘錄"
            >
              {hasCopiedTxt ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">✓ 已複製 TXT</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-emerald-700" />
                  <span>一鍵複製入庫 TXT ({filteredChemicals.length})</span>
                </>
              )}
            </button>

            {/* Download CSV Button */}
            <button
              type="button"
              onClick={handleDownloadCsv}
              disabled={filteredChemicals.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-sm font-bold text-xs transition shadow-xs cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下載藥品入庫 CSV ({filteredChemicals.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
