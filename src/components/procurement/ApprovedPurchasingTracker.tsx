import React, { useState, useMemo } from "react";
import { 
  ProcurementItem, 
  ProcurementItemLine, 
  PurchaseProgressStatus, 
  UserRole,
  BudgetProject,
  CurrencyCode 
} from "../../types/procurement";
import { formatPriceWithCurrency, CURRENCY_CONFIG } from "../../data/procurementData";
import { 
  Search, 
  Filter, 
  Calendar, 
  CalendarRange, 
  ShoppingCart, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Edit3, 
  Receipt, 
  Download, 
  Printer, 
  FileSpreadsheet, 
  User, 
  Shield, 
  Sparkles,
  ChevronDown,
  X,
  Building,
  Tag,
  Check
} from "lucide-react";

export interface FlatApprovedItem {
  key: string; // unique identifier: requisitionId + lineId
  requisitionId: string;
  requisitionNo: string;
  createdAt: string;
  applicantName: string;
  applicantEmail: string;
  budgetProject?: string;
  lineId: string;
  itemName: string;
  category: "chemical" | "consumable" | "equipment";
  quantity: number;
  unit: string;
  currency: CurrencyCode;
  estimatedUnitPrice: number;
  estimatedTotalPrice: number;
  actualPrice?: number;
  platform?: string;
  productUrl?: string;
  vendorName?: string;
  purpose?: string;
  designatedPurchaser: "student" | "professor" | "unassigned";
  
  // Progress Info
  purchaseProgress: PurchaseProgressStatus;
  purchasedBy?: string;
  purchaseDate?: string;
  invoiceNumber?: string;
  note?: string;

  // Reference back to original requisition
  originalRequisition: ProcurementItem;
  originalLine?: ProcurementItemLine;
}

interface ApprovedPurchasingTrackerProps {
  items: ProcurementItem[];
  onUpdateItem: (updatedItem: ProcurementItem) => void;
  lang: "zh" | "en";
  currentRole: UserRole;
  budgetProjects: BudgetProject[];
  onViewRequisitionDetail: (item: ProcurementItem) => void;
  onTriggerWebhook?: (action: string, item: ProcurementItem, extra?: any) => void;
}

export default function ApprovedPurchasingTracker({
  items,
  onUpdateItem,
  lang,
  currentRole,
  budgetProjects,
  onViewRequisitionDetail,
  onTriggerWebhook
}: ApprovedPurchasingTrackerProps) {
  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [progressFilter, setProgressFilter] = useState<"ALL" | PurchaseProgressStatus>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | "chemical" | "consumable" | "equipment">("ALL");
  const [projectFilter, setProjectFilter] = useState<string>("ALL");

  // Date Range Filtering
  // Presets: "ALL" | "TODAY" | "7DAYS" | "30DAYS" | "THIS_MONTH" | "CUSTOM"
  const [datePreset, setDatePreset] = useState<string>("ALL");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Selected item keys for bulk operations
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // Quick Edit Purchase Modal State
  const [editingEntry, setEditingEntry] = useState<FlatApprovedItem | null>(null);
  const [editStatus, setEditStatus] = useState<PurchaseProgressStatus>("student_purchased");
  const [editPurchasedBy, setEditPurchasedBy] = useState("");
  const [editPurchaseDate, setEditPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [editActualPrice, setEditActualPrice] = useState<number | "">("");
  const [editInvoiceNumber, setEditInvoiceNumber] = useState("");
  const [editNote, setEditNote] = useState("");

  // Print Checklist View Modal
  const [isPrintChecklistOpen, setIsPrintChecklistOpen] = useState(false);

  // 1. Flatten all approved items from requisitions
  const allApprovedEntries: FlatApprovedItem[] = useMemo(() => {
    const list: FlatApprovedItem[] = [];

    items.forEach((req) => {
      // Must be approved, partially_approved, or purchased
      if (req.status !== "approved" && req.status !== "partially_approved" && req.status !== "purchased") {
        return;
      }

      // Default overall progress helper
      const deriveReqProgress = (): PurchaseProgressStatus => {
        if (req.purchaseProgress) return req.purchaseProgress;
        if (req.status === "purchased") return "completed";
        if (req.actualPurchaseInfo?.purchasedBy) {
          if (req.actualPurchaseInfo.purchasedBy.includes("教授")) return "professor_purchased";
          return "student_purchased";
        }
        return "pending_purchase";
      };

      const overallProgress = deriveReqProgress();

      if (req.items && req.items.length > 0) {
        req.items.forEach((sub, idx) => {
          // If partially approved, only show approved or purchased sub-items
          if (req.status === "partially_approved" && sub.status !== "approved" && sub.status !== "purchased") {
            return;
          }
          if (req.status === "rejected" || sub.status === "rejected") {
            return;
          }

          const lineProgress: PurchaseProgressStatus = 
            sub.purchaseProgress || 
            (sub.status === "purchased" ? "completed" : overallProgress);

          list.push({
            key: `${req.id}_${sub.id || idx}`,
            requisitionId: req.id,
            requisitionNo: req.requisitionNo,
            createdAt: req.createdAt,
            applicantName: req.applicantName,
            applicantEmail: req.applicantEmail,
            budgetProject: req.budgetProject,
            lineId: sub.id || `${req.id}_line_${idx}`,
            itemName: sub.itemName,
            category: sub.category || req.category || "consumable",
            quantity: sub.quantity,
            unit: sub.unit || "件",
            currency: sub.currency || "TWD",
            estimatedUnitPrice: sub.estimatedUnitPrice,
            estimatedTotalPrice: sub.estimatedTotalPrice,
            actualPrice: sub.purchasedInfo?.actualTotalPrice || req.actualPurchaseInfo?.actualTotalPrice,
            platform: sub.platform || req.platform,
            productUrl: sub.productUrl || req.productUrl,
            vendorName: sub.vendorName || req.vendorName,
            purpose: sub.purpose || req.purpose,
            designatedPurchaser: req.purchaser || "student",
            purchaseProgress: lineProgress,
            purchasedBy: sub.purchasedInfo ? "已採購" : req.actualPurchaseInfo?.purchasedBy,
            purchaseDate: sub.purchasedInfo?.purchaseDate || req.actualPurchaseInfo?.purchaseDate,
            invoiceNumber: sub.purchasedInfo?.invoiceNumber || req.actualPurchaseInfo?.invoiceNumber,
            note: req.actualPurchaseInfo?.note,
            originalRequisition: req,
            originalLine: sub
          });
        });
      } else {
        // Single item fallback
        list.push({
          key: `${req.id}_main`,
          requisitionId: req.id,
          requisitionNo: req.requisitionNo,
          createdAt: req.createdAt,
          applicantName: req.applicantName,
          applicantEmail: req.applicantEmail,
          budgetProject: req.budgetProject,
          lineId: `${req.id}_main`,
          itemName: req.itemName || "未命名品項",
          category: req.category || "consumable",
          quantity: req.quantity || 1,
          unit: req.unit || "件",
          currency: req.currency || "TWD",
          estimatedUnitPrice: req.estimatedUnitPrice || 0,
          estimatedTotalPrice: req.estimatedTotalPrice || 0,
          actualPrice: req.actualPurchaseInfo?.actualTotalPrice,
          platform: req.platform,
          productUrl: req.productUrl,
          vendorName: req.vendorName,
          purpose: req.purpose,
          designatedPurchaser: req.purchaser || "student",
          purchaseProgress: overallProgress,
          purchasedBy: req.actualPurchaseInfo?.purchasedBy,
          purchaseDate: req.actualPurchaseInfo?.purchaseDate,
          invoiceNumber: req.actualPurchaseInfo?.invoiceNumber,
          note: req.actualPurchaseInfo?.note,
          originalRequisition: req
        });
      }
    });

    return list;
  }, [items]);

  // 2. Apply Filters (Date Range + Keywords + Category + Progress + Project)
  const filteredEntries = useMemo(() => {
    return allApprovedEntries.filter((entry) => {
      // Keyword filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match = 
          entry.itemName.toLowerCase().includes(q) ||
          entry.requisitionNo.toLowerCase().includes(q) ||
          entry.applicantName.toLowerCase().includes(q) ||
          (entry.vendorName && entry.vendorName.toLowerCase().includes(q)) ||
          (entry.platform && entry.platform.toLowerCase().includes(q)) ||
          (entry.budgetProject && entry.budgetProject.toLowerCase().includes(q)) ||
          (entry.invoiceNumber && entry.invoiceNumber.toLowerCase().includes(q));
        if (!match) return false;
      }

      // Progress Filter
      if (progressFilter !== "ALL" && entry.purchaseProgress !== progressFilter) {
        return false;
      }

      // Category Filter
      if (categoryFilter !== "ALL" && entry.category !== categoryFilter) {
        return false;
      }

      // Project Filter
      if (projectFilter !== "ALL" && entry.budgetProject !== projectFilter) {
        return false;
      }

      // Date Range Filter (checking entry.createdAt date or purchaseDate)
      const entryDateStr = entry.createdAt.split(" ")[0]; // YYYY-MM-DD
      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];

      if (datePreset === "TODAY") {
        if (entryDateStr !== todayStr) return false;
      } else if (datePreset === "7DAYS") {
        const d7 = new Date();
        d7.setDate(d7.getDate() - 7);
        const d7Str = d7.toISOString().split("T")[0];
        if (entryDateStr < d7Str) return false;
      } else if (datePreset === "30DAYS") {
        const d30 = new Date();
        d30.setDate(d30.getDate() - 30);
        const d30Str = d30.toISOString().split("T")[0];
        if (entryDateStr < d30Str) return false;
      } else if (datePreset === "THIS_MONTH") {
        const currentYearMonth = todayStr.substring(0, 7); // YYYY-MM
        if (!entryDateStr.startsWith(currentYearMonth)) return false;
      } else if (datePreset === "CUSTOM") {
        if (customStartDate && entryDateStr < customStartDate) return false;
        if (customEndDate && entryDateStr > customEndDate) return false;
      }

      return true;
    });
  }, [allApprovedEntries, searchQuery, progressFilter, categoryFilter, projectFilter, datePreset, customStartDate, customEndDate]);

  // Statistics
  const stats = useMemo(() => {
    let pendingCount = 0;
    let studentPurchasedCount = 0;
    let profPurchasedCount = 0;
    let completedCount = 0;
    let totalEstPrice = 0;

    allApprovedEntries.forEach((e) => {
      totalEstPrice += e.estimatedTotalPrice || 0;
      if (e.purchaseProgress === "pending_purchase") pendingCount++;
      else if (e.purchaseProgress === "student_purchased") studentPurchasedCount++;
      else if (e.purchaseProgress === "professor_purchased") profPurchasedCount++;
      else if (e.purchaseProgress === "completed" || e.purchaseProgress === "delivered") completedCount++;
    });

    return {
      totalCount: allApprovedEntries.length,
      pendingCount,
      studentPurchasedCount,
      profPurchasedCount,
      completedCount,
      totalEstPrice
    };
  }, [allApprovedEntries]);

  // Handle Opening Quick Edit Modal
  const openEditModal = (entry: FlatApprovedItem) => {
    setEditingEntry(entry);
    setEditStatus(entry.purchaseProgress || "student_purchased");
    setEditPurchasedBy(entry.purchasedBy || (entry.designatedPurchaser === "student" ? entry.applicantName : "Prof. K.L. Chang"));
    setEditPurchaseDate(entry.purchaseDate || new Date().toISOString().split("T")[0]);
    setEditActualPrice(entry.actualPrice !== undefined ? entry.actualPrice : entry.estimatedTotalPrice);
    setEditInvoiceNumber(entry.invoiceNumber || "");
    setEditNote(entry.note || "");
  };

  // Save Quick Edit
  const handleSaveEdit = () => {
    if (!editingEntry) return;

    const req = { ...editingEntry.originalRequisition };

    // Update line item if multi-item requisition
    if (req.items && req.items.length > 0 && editingEntry.originalLine) {
      req.items = req.items.map((sub) => {
        if (sub.id === editingEntry.lineId || sub.itemName === editingEntry.itemName) {
          return {
            ...sub,
            purchaseProgress: editStatus,
            purchasedInfo: {
              ...sub.purchasedInfo,
              actualTotalPrice: typeof editActualPrice === "number" ? editActualPrice : sub.estimatedTotalPrice,
              invoiceNumber: editInvoiceNumber,
              purchaseDate: editPurchaseDate
            }
          };
        }
        return sub;
      });
    }

    // Update main requisition purchase info
    req.purchaseProgress = editStatus;
    req.actualPurchaseInfo = {
      purchasedBy: editPurchasedBy || req.applicantName,
      purchaseDate: editPurchaseDate,
      actualTotalPrice: typeof editActualPrice === "number" ? editActualPrice : req.estimatedTotalPrice,
      invoiceNumber: editInvoiceNumber,
      note: editNote
    };

    // If marked as completed or delivered with invoice, set overall status to purchased
    if (editStatus === "completed") {
      req.status = "purchased";
    }

    onUpdateItem(req);

    // Optional webhook notify
    if (onTriggerWebhook) {
      onTriggerWebhook("update_purchase_progress", req, {
        progressStatus: editStatus,
        purchaser: editPurchasedBy,
        invoiceNo: editInvoiceNumber,
        note: editNote
      });
    }

    setEditingEntry(null);
  };

  // Batch update progress for selected items
  const handleBatchUpdateProgress = (newProgress: PurchaseProgressStatus, defaultPurchaser?: string) => {
    if (selectedKeys.size === 0) return;

    // Collect requisitions to update
    const reqMap = new Map<string, ProcurementItem>();

    filteredEntries.forEach((entry) => {
      if (selectedKeys.has(entry.key)) {
        const req = reqMap.get(entry.requisitionId) || { ...entry.originalRequisition };
        
        req.purchaseProgress = newProgress;
        if (req.items && req.items.length > 0) {
          req.items = req.items.map(sub => {
            if (sub.id === entry.lineId || sub.itemName === entry.itemName) {
              return { ...sub, purchaseProgress: newProgress };
            }
            return sub;
          });
        }

        req.actualPurchaseInfo = {
          ...req.actualPurchaseInfo,
          purchasedBy: defaultPurchaser || req.actualPurchaseInfo?.purchasedBy || req.applicantName,
          purchaseDate: req.actualPurchaseInfo?.purchaseDate || new Date().toISOString().split("T")[0],
          actualTotalPrice: req.actualPurchaseInfo?.actualTotalPrice || req.estimatedTotalPrice,
          invoiceNumber: req.actualPurchaseInfo?.invoiceNumber || ""
        };

        if (newProgress === "completed") {
          req.status = "purchased";
        }

        reqMap.set(entry.requisitionId, req);
      }
    });

    // Dispatch updates
    reqMap.forEach((req) => {
      onUpdateItem(req);
      if (onTriggerWebhook) {
        onTriggerWebhook("update_purchase_progress", req, { progressStatus: newProgress });
      }
    });

    setSelectedKeys(new Set());
  };

  // Selection helpers
  const handleSelectAll = () => {
    if (selectedKeys.size === filteredEntries.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(filteredEntries.map(e => e.key)));
    }
  };

  const toggleSelectKey = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Export to CSV
  const handleExportApprovedCSV = () => {
    const headers = [
      "請購單號",
      "核准日期",
      "品項名稱",
      "類別",
      "數量",
      "單位",
      "幣別",
      "預估單價",
      "預估總額 (NT$)",
      "購買進程狀態",
      "實際採購人",
      "採購日期",
      "購物平台/廠商",
      "商品規格連結",
      "申請人",
      "請購用途"
    ];

    const rows = filteredEntries.map(e => [
      `"${e.requisitionNo}"`,
      `"${e.createdAt.split(" ")[0]}"`,
      `"${e.itemName.replace(/"/g, '""')}"`,
      `"${e.category === "chemical" ? "藥品化學品" : e.category === "equipment" ? "儀器設備" : "耗材雜物"}"`,
      e.quantity,
      `"${e.unit}"`,
      `"${e.currency}"`,
      e.estimatedUnitPrice,
      e.estimatedTotalPrice,
      `"${getProgressLabel(e.purchaseProgress).label}"`,
      `"${e.purchasedBy || ""}"`,
      `"${e.purchaseDate || ""}"`,
      `"${(e.platform || e.vendorName || "").replace(/"/g, '""')}"`,
      `"${(e.productUrl || "").replace(/"/g, '""')}"`,
      `"${e.applicantName}"`,
      `"${(e.purpose || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `EBB_Lab_Approved_Purchasing_List_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Helper for progress pills
  const getProgressLabel = (progress: PurchaseProgressStatus) => {
    switch (progress) {
      case "pending_purchase":
        return {
          label: "⏳ 尚未購買 (待採購)",
          badgeClass: "bg-amber-50 text-amber-900 border-amber-300 font-bold",
          dotColor: "bg-amber-500"
        };
      case "student_purchased":
        return {
          label: "🛒 請購人已購買",
          badgeClass: "bg-emerald-50 text-emerald-900 border-emerald-300 font-bold",
          dotColor: "bg-emerald-600"
        };
      case "professor_purchased":
        return {
          label: "🎓 教授已購買",
          badgeClass: "bg-purple-50 text-purple-900 border-purple-300 font-bold",
          dotColor: "bg-purple-600"
        };
      case "postpayment":
        return {
          label: "🏢 貨到後計畫付款",
          badgeClass: "bg-blue-50 text-blue-900 border-blue-300 font-bold",
          dotColor: "bg-blue-600"
        };
      case "delivered":
        return {
          label: "📦 已到貨 / 已收訖",
          badgeClass: "bg-teal-50 text-teal-900 border-teal-300 font-bold",
          dotColor: "bg-teal-600"
        };
      case "completed":
        return {
          label: "✅ 採購驗收完成",
          badgeClass: "bg-slate-100 text-slate-900 border-slate-300 font-bold",
          dotColor: "bg-slate-600"
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <div className="bg-[#fdfdfc] border border-[#e5e5e0] p-3 rounded-sm shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block">已核准品項總數</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold font-serif text-slate-800">{stats.totalCount} 項</span>
            <span className="text-[10px] text-slate-400 font-mono">
              NT$ {stats.totalEstPrice.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-sm shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-900">⏳ 尚未購買 (待採購)</span>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold font-serif text-amber-900">{stats.pendingCount} 項</span>
            <span className="text-[10px] text-amber-700 font-medium">需儘速下單</span>
          </div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200/80 p-3 rounded-sm shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-900 block">🛒 請購人已購買</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold font-serif text-emerald-900">{stats.studentPurchasedCount} 項</span>
            <span className="text-[10px] text-emerald-700 font-medium">學生已自購/下訂</span>
          </div>
        </div>

        <div className="bg-purple-50/70 border border-purple-200/80 p-3 rounded-sm shadow-2xs">
          <span className="text-[11px] font-bold text-purple-900 block">🎓 教授已購買</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold font-serif text-purple-900">{stats.profPurchasedCount} 項</span>
            <span className="text-[10px] text-purple-700 font-medium">老師已統購</span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-3 rounded-sm shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-slate-700 block">📦 已到貨 / 已驗收</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold font-serif text-slate-800">{stats.completedCount} 項</span>
            <span className="text-[10px] text-slate-500 font-medium">採購完成</span>
          </div>
        </div>
      </div>

      {/* 2. Filter & Date Range Bar */}
      <div className="bg-[#fdfdfc] border border-[#e5e5e0] p-4 rounded-sm space-y-3 shadow-xs">
        
        {/* Top search & export line */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Keyword Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#1b4372] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋已核准品項名稱、單號、申請人、購物平台、廠商通路..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#e5e5e0] rounded-sm text-xs font-sans focus:outline-none focus:border-[#1b4372]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Batch actions if items selected */}
            {selectedKeys.size > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-sm border border-slate-300">
                <span className="text-[11px] font-bold text-slate-700 px-1.5">
                  已選 {selectedKeys.size} 項：
                </span>
                <button
                  type="button"
                  onClick={() => handleBatchUpdateProgress("student_purchased")}
                  className="px-2 py-1 bg-emerald-700 text-white rounded text-[11px] font-bold hover:bg-emerald-800"
                  title="標記為請購人已購買"
                >
                  🛒 請購人已買
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchUpdateProgress("professor_purchased", "Prof. K.L. Chang")}
                  className="px-2 py-1 bg-purple-700 text-white rounded text-[11px] font-bold hover:bg-purple-800"
                  title="標記為教授已購買"
                >
                  🎓 教授已買
                </button>
                <button
                  type="button"
                  onClick={() => handleBatchUpdateProgress("delivered")}
                  className="px-2 py-1 bg-teal-700 text-white rounded text-[11px] font-bold hover:bg-teal-800"
                  title="標記為已到貨"
                >
                  📦 已到貨
                </button>
              </div>
            )}

            {/* Print shopping list */}
            <button
              type="button"
              onClick={() => setIsPrintChecklistOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-[#e5e5e0] hover:bg-slate-50 text-slate-700 rounded-sm text-xs font-bold transition shadow-2xs"
              title="列印或檢視採購採買清單"
            >
              <Printer className="w-3.5 h-3.5 text-[#8d734a]" />
              <span>採購待購清單 ({filteredEntries.filter(e => e.purchaseProgress === "pending_purchase").length})</span>
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportApprovedCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#1b4372] hover:bg-[#122e4f] text-white rounded-sm text-xs font-bold transition shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>匯出 Excel (CSV)</span>
            </button>
          </div>
        </div>

        {/* Date Filtering Section with Range Picker */}
        <div className="pt-2.5 border-t border-[#e5e5e0] flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs">
          {/* Quick Date Presets */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 font-bold flex items-center gap-1 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-[#1b4372]" />
              時間篩選：
            </span>

            {[
              { id: "ALL", label: "全部時間" },
              { id: "TODAY", label: "今日" },
              { id: "7DAYS", label: "最近 7 天" },
              { id: "30DAYS", label: "最近 30 天" },
              { id: "THIS_MONTH", label: "本月份" },
              { id: "CUSTOM", label: "📅 自訂日期範圍 (Range)" }
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setDatePreset(p.id)}
                className={`px-2.5 py-1 rounded-sm text-xs font-medium transition border ${
                  datePreset === p.id
                    ? "bg-[#1b4372] text-white border-[#1b4372] font-bold"
                    : "bg-white text-slate-700 border-[#e5e5e0] hover:bg-slate-100"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range Pickers (Shows if CUSTOM is selected, or always inline) */}
          {datePreset === "CUSTOM" && (
            <div className="flex items-center gap-1.5 bg-emerald-50/60 p-1.5 rounded border border-emerald-200">
              <CalendarRange className="w-3.5 h-3.5 text-[#1b4372] shrink-0" />
              <span className="text-[11px] font-bold text-[#1b4372]">起：</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-mono focus:outline-none"
              />
              <span className="text-[11px] font-bold text-[#1b4372]">至：</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-mono focus:outline-none"
              />
              {(customStartDate || customEndDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomStartDate("");
                    setCustomEndDate("");
                  }}
                  className="text-slate-400 hover:text-slate-700 p-0.5"
                  title="清除自訂日期"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Dropdown Filters (Progress, Category, Project) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#e5e5e0] text-xs">
          {/* Progress Filter */}
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-bold">購買進程：</span>
            <select
              value={progressFilter}
              onChange={(e) => setProgressFilter(e.target.value as any)}
              className="bg-white border border-[#e5e5e0] rounded-sm py-1 px-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#1b4372]"
            >
              <option value="ALL">全部進程 (全部已審核品項)</option>
              <option value="pending_purchase">⏳ 尚未購買 (待採購)</option>
              <option value="student_purchased">🛒 請購人已購買 (學生自購)</option>
              <option value="professor_purchased">🎓 教授已購買 (老師統購)</option>
              <option value="postpayment">🏢 貨到後計畫付款</option>
              <option value="delivered">📦 已到貨 / 已收訖</option>
              <option value="completed">✅ 採購驗收完成</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium">類別：</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="bg-white border border-[#e5e5e0] rounded-sm py-1 px-2 text-xs font-medium focus:outline-none"
            >
              <option value="ALL">全部類別</option>
              <option value="chemical">藥品化學品</option>
              <option value="consumable">雜物耗材</option>
              <option value="equipment">儀器設備</option>
            </select>
          </div>

          <div className="ml-auto text-slate-400 text-[11px] font-mono">
            顯示 {filteredEntries.length} 筆已核准品項
          </div>
        </div>

      </div>

      {/* 3. Approved Items Table */}
      <div className="border border-[#e5e5e0] rounded-sm overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-sans">
            <thead className="bg-[#f8f8f5] text-slate-700 font-bold border-b border-[#e5e5e0]">
              <tr>
                <th className="p-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={selectedKeys.size > 0 && selectedKeys.size === filteredEntries.length}
                    onChange={handleSelectAll}
                    className="rounded text-[#1b4372]"
                  />
                </th>
                <th className="p-3 text-left w-32">請購單號 / 申請日</th>
                <th className="p-3 text-left min-w-[220px]">核准品項規格與購物連結</th>
                <th className="p-3 text-left w-20">類別</th>
                <th className="p-3 text-right w-24">數量金額 (NT$)</th>
                <th className="p-3 text-left w-32">建議廠商 / 通路</th>
                <th className="p-3 text-left w-24">請購人</th>
                <th className="p-3 text-center min-w-[180px]">購買進程 (點擊更新)</th>
                <th className="p-3 text-center w-28">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e5e0]">
              {filteredEntries.length > 0 ? (
                filteredEntries.map((entry) => {
                  const isChecked = selectedKeys.has(entry.key);
                  const progressInfo = getProgressLabel(entry.purchaseProgress);

                  return (
                    <tr
                      key={entry.key}
                      className={`hover:bg-[#fbfbfa] transition ${isChecked ? "bg-blue-50/30" : ""}`}
                    >
                      {/* Checkbox */}
                      <td className="p-3 text-center" onClick={(e) => toggleSelectKey(entry.key, e)}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded text-[#1b4372]"
                        />
                      </td>

                      {/* Requisition No & Date */}
                      <td className="p-3 font-mono">
                        <button
                          type="button"
                          onClick={() => onViewRequisitionDetail(entry.originalRequisition)}
                          className="font-bold text-[#1b4372] hover:underline text-left block"
                          title="查看原請購單"
                        >
                          {entry.requisitionNo}
                        </button>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {entry.createdAt.split(" ")[0]}
                        </span>
                      </td>

                      {/* Item Name, Specs & Product URL */}
                      <td className="p-3">
                        <div className="font-bold text-slate-900 font-serif text-sm flex items-center flex-wrap gap-1.5">
                          <span>{entry.itemName}</span>

                          {/* Shopping Platform badge */}
                          {entry.platform && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-mono bg-orange-50 text-orange-800 border border-orange-200">
                              <Building className="w-2.5 h-2.5" />
                              {entry.platform}
                            </span>
                          )}

                          {/* Product URL direct button */}
                          {entry.productUrl && (
                            <a
                              href={entry.productUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200 font-medium transition"
                              title="前往購物平台 / 商品連結"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                              <span>下單連結</span>
                            </a>
                          )}
                        </div>

                        {/* Purpose note */}
                        {entry.purpose && (
                          <div className="text-[11px] text-slate-500 font-sans line-clamp-1 mt-0.5">
                            {entry.purpose}
                          </div>
                        )}

                        {/* Vendor name */}
                        {entry.vendorName && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            建議廠商/通路：{entry.vendorName}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-xs bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200 whitespace-nowrap">
                          {entry.category === "chemical" ? "藥品試劑" : entry.category === "equipment" ? "儀器設備" : "耗材雜物"}
                        </span>
                      </td>

                      {/* Quantity & Estimated / Actual Total */}
                      <td className="p-3 text-right font-mono">
                        <span className="font-bold text-slate-900 block">
                          NT$ {(entry.actualPrice || entry.estimatedTotalPrice).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {entry.quantity} {entry.unit}
                        </span>
                        {entry.actualPrice && entry.actualPrice !== entry.estimatedTotalPrice && (
                          <span className="text-[9px] text-emerald-700 block">
                            (預估 NT$ {entry.estimatedTotalPrice.toLocaleString()})
                          </span>
                        )}
                      </td>

                      {/* Vendor / Platform */}
                      <td className="p-3 text-[11px] text-slate-700 truncate max-w-[140px]" title={entry.vendorName || entry.platform || "—"}>
                        {entry.vendorName || entry.platform || <span className="text-slate-400 italic">—</span>}
                      </td>

                      {/* Applicant */}
                      <td className="p-3">
                        <span className="font-bold text-slate-800 block">{entry.applicantName}</span>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[90px]">{entry.applicantEmail}</span>
                      </td>

                      {/* Purchase Progress (Click to Update) */}
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => openEditModal(entry)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border text-[11px] transition shadow-2xs hover:scale-102 ${progressInfo.badgeClass}`}
                          title="點擊切換或更新購買進程（包含請購人已購買、教授已購買等）"
                        >
                          <span className={`w-2 h-2 rounded-full ${progressInfo.dotColor}`}></span>
                          <span>{progressInfo.label}</span>
                          <Edit3 className="w-3 h-3 ml-0.5 opacity-60" />
                        </button>

                        {/* Display purchaser detail below badge */}
                        {entry.purchasedBy && (
                          <div className="text-[10px] text-slate-500 font-mono mt-1">
                            買受人：{entry.purchasedBy}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(entry)}
                            className="p-1.5 hover:bg-blue-50 text-[#1b4372] rounded-sm transition"
                            title="更新購買進程"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onViewRequisitionDetail(entry.originalRequisition)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-sm transition"
                            title="查看原單完整審批資訊"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-400 font-sans">
                    <div className="max-w-sm mx-auto space-y-2">
                      <ShoppingCart className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="text-xs font-bold text-slate-600">查無符合條件之已核准品項</p>
                      <p className="text-[11px] text-slate-400">
                        請嘗試清除篩選條件，或在請購總表中進行審核通過。
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Quick Edit Purchase Progress Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 rounded-sm shadow-2xl max-w-lg w-full my-auto p-5 sm:p-6 space-y-4 font-sans text-xs">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-sm bg-[#1b4372] text-white">
                  <ShoppingCart className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm font-serif">
                    更新品項購買進程
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    單號：{editingEntry.requisitionNo} · {editingEntry.itemName}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="text-slate-400 hover:text-slate-700 text-base font-bold"
              >
                ✕
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-3.5">
              {/* Status Radio / Select */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 block">
                  購買進程狀態 (Purchase Progress)：
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: "pending_purchase", label: "⏳ 尚未購買 (待採購)", desc: "尚未下單" },
                    { id: "student_purchased", label: "🛒 請購人已購買", desc: "申請學生已下訂自購" },
                    { id: "professor_purchased", label: "🎓 教授已購買", desc: "教授/PI 統一採購" },
                    { id: "postpayment", label: "🏢 貨到後計畫付款", desc: "廠商先行寄送" },
                    { id: "delivered", label: "📦 已到貨 / 已收訖", desc: "物品送達實驗室" },
                    { id: "completed", label: "✅ 採購驗收完成", desc: "物品驗收完成結案" }
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-start gap-2 p-2.5 rounded border cursor-pointer transition ${
                        editStatus === opt.id
                          ? "bg-blue-50/80 border-[#1b4372] text-[#1b4372] font-bold"
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="purchaseStatus"
                        value={opt.id}
                        checked={editStatus === opt.id}
                        onChange={() => setEditStatus(opt.id as any)}
                        className="mt-0.5 text-[#1b4372]"
                      />
                      <div>
                        <div className="text-xs">{opt.label}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Purchaser Name & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    實際採購人姓名：
                  </label>
                  <input
                    type="text"
                    value={editPurchasedBy}
                    onChange={(e) => setEditPurchasedBy(e.target.value)}
                    placeholder="請購人姓名 / 教授姓名"
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:outline-none focus:border-[#1b4372]"
                  />
                  <div className="flex gap-1 mt-1">
                    <button
                      type="button"
                      onClick={() => setEditPurchasedBy(editingEntry.applicantName)}
                      className="text-[10px] text-[#1b4372] underline hover:text-[#122e4f]"
                    >
                      帶入請購人 ({editingEntry.applicantName})
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={() => setEditPurchasedBy("Prof. K.L. Chang")}
                      className="text-[10px] text-purple-700 underline hover:text-purple-900"
                    >
                      帶入教授
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    採購/下單日期：
                  </label>
                  <input
                    type="date"
                    value={editPurchaseDate}
                    onChange={(e) => setEditPurchaseDate(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded p-2 font-mono text-xs focus:outline-none focus:border-[#1b4372]"
                  />
                </div>
              </div>

              {/* Actual Price */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  實際總採購金額 (NT$)：
                </label>
                <input
                  type="number"
                  value={editActualPrice}
                  onChange={(e) => setEditActualPrice(e.target.value ? Number(e.target.value) : "")}
                  placeholder={`預估金額 NT$ ${editingEntry.estimatedTotalPrice.toLocaleString()}`}
                  className="w-full bg-white border border-slate-300 rounded p-2 font-mono text-xs focus:outline-none focus:border-[#1b4372]"
                />
              </div>

              {/* Note / Logistics tracking */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  採購備註 / 物流追蹤號碼：
                </label>
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  rows={2}
                  placeholder="例：運單號：xxx，預計週五前抵達實驗室..."
                  className="w-full bg-white border border-slate-300 rounded p-2 text-xs focus:outline-none focus:border-[#1b4372]"
                />
              </div>

            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingEntry(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-[#1b4372] hover:bg-[#122e4f] text-white rounded text-xs font-bold transition shadow-xs"
              >
                確認儲存進程
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 5. Printable Shopping Checklist Modal */}
      {isPrintChecklistOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 rounded-sm shadow-2xl max-w-4xl w-full my-auto p-6 space-y-4 font-sans text-xs max-h-[92vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#1b4372]" />
                <h3 className="font-bold text-slate-800 text-sm font-serif">
                  EBB Lab 待採購清單 (Shopping Checklist)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-[#1b4372] text-white rounded text-xs font-bold hover:bg-[#122e4f]"
                >
                  列印此清單 (Print)
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintChecklistOpen(false)}
                  className="text-slate-400 hover:text-slate-700 text-base font-bold p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Checklist Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-slate-500 font-mono text-[11px]">
                <span>列印時間：{new Date().toLocaleString("zh-TW")}</span>
                <span>國立中山大學 環境生物技術與生物精煉實驗室</span>
              </div>

              <table className="w-full border-collapse border border-slate-300 text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="border border-slate-300 p-2 w-10 text-center">購買</th>
                    <th className="border border-slate-300 p-2 text-left">品項名稱與規格</th>
                    <th className="border border-slate-300 p-2 w-20 text-center">數量/單位</th>
                    <th className="border border-slate-300 p-2 w-24 text-right">預估金額</th>
                    <th className="border border-slate-300 p-2 w-32 text-left">購物平台/連結</th>
                    <th className="border border-slate-300 p-2 w-24 text-left">指定採購</th>
                    <th className="border border-slate-300 p-2 text-left">請購用途</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries
                    .filter(e => e.purchaseProgress === "pending_purchase")
                    .map((item, idx) => (
                      <tr key={item.key} className="hover:bg-slate-50">
                        <td className="border border-slate-300 p-2 text-center">
                          <span className="inline-block w-4 h-4 border border-slate-400 rounded-xs"></span>
                        </td>
                        <td className="border border-slate-300 p-2 font-medium">
                          <div>{item.itemName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">單號: {item.requisitionNo} · 申請人: {item.applicantName}</div>
                        </td>
                        <td className="border border-slate-300 p-2 text-center font-mono">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="border border-slate-300 p-2 text-right font-mono">
                          NT$ {item.estimatedTotalPrice.toLocaleString()}
                        </td>
                        <td className="border border-slate-300 p-2">
                          {item.platform || item.vendorName || "自購"}
                          {item.productUrl && (
                            <div className="text-[9px] text-blue-600 truncate max-w-[120px]">
                              {item.productUrl}
                            </div>
                          )}
                        </td>
                        <td className="border border-slate-300 p-2">
                          {item.designatedPurchaser === "student" ? "學生自購" : "教授統籌"}
                        </td>
                        <td className="border border-slate-300 p-2 text-[10px] text-slate-600">
                          {item.purpose || "實驗研究使用"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
