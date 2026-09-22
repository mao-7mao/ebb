import React, { useState, useEffect, useMemo } from "react";
import { 
  ProcurementItem, 
  ProcurementItemLine,
  UserRole, 
  ProcurementCategory, 
  ProcurementStatus, 
  PurchaserType,
  HistoricalCatalogItem,
  PurchaseProgressStatus
} from "../../types/procurement";
import { 
  INITIAL_PROCUREMENT_ITEMS, 
  DEFAULT_HISTORICAL_CATALOG 
} from "../../data/procurementData";
import ProcurementHeader from "./ProcurementHeader";
import ProcurementFormModal from "./ProcurementFormModal";
import ProcurementDetailModal from "./ProcurementDetailModal";
import ProcurementOfficialRequisition from "./ProcurementOfficialRequisition";
import RolePasswordModal from "./RolePasswordModal";
import ApprovedPurchasingTracker from "./ApprovedPurchasingTracker";
import ExportDateRangeModal from "./ExportDateRangeModal";
import { 
  fetchItemsFromGasWebhook, 
  fetchItemsFromGoogleSheetCsv, 
  mergeProcurementItems,
  deleteRequisitionInGasWebhook
} from "../../services/procurementSyncService";
import { 
  normalizeProcurementDate, 
  extractDateOnly, 
  compareDatesDesc,
  getTodayTaipeiDate
} from "../../utils/dateUtils";
import { EXTERNAL_LINKS } from "../../config/externalLinks";
import { 
  Search, 
  Filter, 
  FileSpreadsheet, 
  Printer, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  ExternalLink, 
  PlusCircle, 
  Layers, 
  Sparkles, 
  Building2, 
  Receipt,
  Download,
  Copy,
  ChevronRight,
  Eye,
  Trash2,
  ClipboardList,
  PackageCheck,
  Cloud,
  Calendar,
  CalendarRange,
  X
} from "lucide-react";

const STORAGE_KEY_ITEMS = "ebblab_procurement_items_v2";
const STORAGE_KEY_CATALOG = "ebblab_procurement_catalog_v2";
const STORAGE_KEY_WEBHOOK = "ebblab_procurement_gas_webhook";
const STORAGE_KEY_SHEET_URL = "ebblab_procurement_sheet_url";
const STORAGE_KEY_PASSWORDS = "ebblab_procurement_role_passwords";
const STORAGE_KEY_PLATFORMS = "ebblab_procurement_saved_platforms";
const STORAGE_KEY_AUTH_ROLES = "ebblab_procurement_auth_roles";

export default function ProcurementSystem() {
  // Global Language: zh (繁中) or en (English)
  const [lang, setLang] = useState<"zh" | "en">("zh");

  // Active Role State: default to applicant (student). If admin logs in with password, switches to admin.
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem("ebblab_procurement_is_admin") === "true";
    } catch (e) {
      return false;
    }
  });

  const currentRole: UserRole = isAdmin ? "admin" : "student";

  // Active Navigation Tab: "requisitions" (審核單據總表) or "approved_purchasing" (已核准採購進程追蹤)
  const [activeTab, setActiveTab] = useState<"requisitions" | "approved_purchasing">("requisitions");

  // Migration helper: Convert legacy single-item records to multi-item structure & ensure purchase progress
  const normalizeProcurementItem = (item: any): ProcurementItem => {
    const deriveProg = (it: any): PurchaseProgressStatus => {
      if (it.purchaseProgress) return it.purchaseProgress;
      if (it.status === "purchased") return "completed";
      if (it.actualPurchaseInfo?.purchasedBy) {
        if (typeof it.actualPurchaseInfo.purchasedBy === "string" && it.actualPurchaseInfo.purchasedBy.includes("教授")) {
          return "professor_purchased";
        }
        return "student_purchased";
      }
      return "pending_purchase";
    };

    const overallProg = deriveProg(item);

    const normalizedCreatedAt = normalizeProcurementDate(item.createdAt, item.requisitionNo || item.id);

    if (Array.isArray(item.items) && item.items.length > 0) {
      return {
        ...item,
        createdAt: normalizedCreatedAt,
        purchaseProgress: item.purchaseProgress || overallProg,
        items: item.items.map((sub: any) => ({
          ...sub,
          purchaseProgress: sub.purchaseProgress || (sub.status === "purchased" ? "completed" : overallProg)
        }))
      } as ProcurementItem;
    }
    const legacyLine: ProcurementItemLine = {
      id: `${item.id}_line_1`,
      category: item.category || "consumable",
      itemName: item.itemName || "未命名品項",
      quantity: item.quantity || 1,
      unit: item.unit || "件",
      estimatedUnitPrice: item.estimatedUnitPrice || item.estimatedTotalPrice || 0,
      estimatedTotalPrice: item.estimatedTotalPrice || (item.quantity ? item.quantity * (item.estimatedUnitPrice || 0) : 0),
      productUrl: item.productUrl,
      purpose: item.purpose || "",
      vendorName: item.vendorName,
      quotes: item.quotes,
      status: item.status,
      purchaseProgress: overallProg,
      chemicalDetails: item.chemicalDetails,
      consumableDetails: item.consumableDetails,
      equipmentDetails: item.equipmentDetails
    };
    return {
      ...item,
      createdAt: normalizedCreatedAt,
      purchaseProgress: item.purchaseProgress || overallProg,
      items: [legacyLine]
    };
  };

  // Requisitions List State (sample items removed)
  const [items, setItems] = useState<ProcurementItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out legacy sample demonstration items
          const cleaned = parsed.filter((it: any) => !it.id?.startsWith("req-2026-00"));
          if (cleaned.length !== parsed.length) {
            localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(cleaned));
          }
          return cleaned.map(normalizeProcurementItem);
        }
      }
    } catch (e) {
      console.warn("Failed to load saved procurement items", e);
    }
    return INITIAL_PROCUREMENT_ITEMS.map(normalizeProcurementItem);
  });

  // Historical Catalog for Autocomplete
  const [historicalCatalog, setHistoricalCatalog] = useState<HistoricalCatalogItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CATALOG);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Failed to load saved catalog", e);
    }
    return DEFAULT_HISTORICAL_CATALOG;
  });

  // Google Apps Script Webhook URL (優先讀取後端設定檔 EXTERNAL_LINKS)
  const [gasWebhookUrl, setGasWebhookUrl] = useState<string>(() => {
    if (EXTERNAL_LINKS.procurementWebhookUrl && EXTERNAL_LINKS.procurementWebhookUrl.trim()) {
      return EXTERNAL_LINKS.procurementWebhookUrl.trim();
    }
    if (EXTERNAL_LINKS.procurementSheetUrl && (EXTERNAL_LINKS.procurementSheetUrl.includes("script.google.com") || EXTERNAL_LINKS.procurementSheetUrl.includes("/exec"))) {
      return EXTERNAL_LINKS.procurementSheetUrl.trim();
    }
    const envUrl = typeof import.meta !== "undefined" ? (import.meta as any).env?.VITE_PROCUREMENT_GAS_WEBHOOK_URL : "";
    if (envUrl && typeof envUrl === "string" && envUrl.trim()) {
      return envUrl.trim();
    }
    return localStorage.getItem(STORAGE_KEY_WEBHOOK) || "";
  });

  // Google 試算表共用網址 (供備援 CSV 直接解析讀取)
  const [gasSheetUrl, setGasSheetUrl] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SHEET_URL);
    if (saved && saved.trim()) return saved.trim();
    if (EXTERNAL_LINKS.procurementSheetUrl && EXTERNAL_LINKS.procurementSheetUrl.includes("spreadsheets/d")) {
      return EXTERNAL_LINKS.procurementSheetUrl.trim();
    }
    return "";
  });

  // 雲端同步狀態
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // 雲端資料同步核心函數 (向 Webhook doGet 或 Google Sheet CSV 請求最新資料)
  const syncWithCloud = async (isAuto = false): Promise<{ success: boolean; count?: number; message?: string }> => {
    setIsSyncing(true);
    let allFetchedItems: ProcurementItem[] = [];
    let fetchSource = "";

    try {
      // 1. 優先嘗試從 Google Apps Script Webhook (doGet) 讀取試算表資料
      if (gasWebhookUrl && gasWebhookUrl.trim()) {
        const gasRes = await fetchItemsFromGasWebhook(gasWebhookUrl);
        if (gasRes.success && gasRes.items && gasRes.items.length > 0) {
          allFetchedItems = gasRes.items.map(normalizeProcurementItem);
          fetchSource = "Google Apps Script 雲端試算表";
        }
      }

      // 2. 若 Webhook 未能讀取到項目，且有設定 Google 試算表共用連結，則嘗試 CSV 模式直接下載
      if (allFetchedItems.length === 0 && gasSheetUrl && gasSheetUrl.trim()) {
        const sheetRes = await fetchItemsFromGoogleSheetCsv(gasSheetUrl);
        if (sheetRes.success && sheetRes.items && sheetRes.items.length > 0) {
          allFetchedItems = sheetRes.items.map(normalizeProcurementItem);
          fetchSource = "Google 試算表 (CSV 模式)";
        }
      }

      if (allFetchedItems.length > 0) {
        setItems(prevItems => {
          const merged = mergeProcurementItems(prevItems, allFetchedItems);
          try {
            localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(merged));
          } catch (e) {}
          return merged;
        });

        const timeStr = new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
        setLastSyncTime(timeStr);

        const msg = `已成功從 ${fetchSource} 同步 ${allFetchedItems.length} 筆請購資料！`;
        if (!isAuto) showToast(msg);
        return { success: true, count: allFetchedItems.length, message: msg };
      }

      const msg = "已成功連線至雲端試算表，目前表內暫無新請購記錄。";
      if (!isAuto) showToast(msg);
      return { success: true, count: 0, message: msg };
    } catch (err: any) {
      const errMsg = `同步雲端資料失敗：${err.message || err}`;
      if (!isAuto) showToast(errMsg);
      return { success: false, message: errMsg };
    } finally {
      setIsSyncing(false);
    }
  };

  // 組件載入或網址設定變更時，自動從雲端同步一次，確保 Admin 與所有成員皆看到最新請購清單
  useEffect(() => {
    if ((gasWebhookUrl && gasWebhookUrl.trim()) || (gasSheetUrl && gasSheetUrl.trim())) {
      syncWithCloud(true);
    }
  }, [gasWebhookUrl, gasSheetUrl]);

  // Save to localStorage whenever items change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
    } catch (e) {
      console.error("Failed to save procurement items", e);
    }
  }, [items]);

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | ProcurementCategory>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | ProcurementStatus>("ALL");
  const [dateFilterPreset, setDateFilterPreset] = useState<string>("ALL");
  const [customFilterStartDate, setCustomFilterStartDate] = useState<string>("");
  const [customFilterEndDate, setCustomFilterEndDate] = useState<string>("");

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ProcurementItem | null>(null);
  const [printItems, setPrintItems] = useState<ProcurementItem[] | null>(null);
  const [isExportDateRangeModalOpen, setIsExportDateRangeModalOpen] = useState(false);

  // Bulk selection for batch export / print
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Admin Password Management
  const [rolePasswords, setRolePasswords] = useState<Record<"assistant" | "professor" | "admin", string>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PASSWORDS);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      assistant: "ebbassistant",
      professor: "ebbprof",
      admin: "ebbadmin"
    };
  });

  const [isRolePasswordModalOpen, setIsRolePasswordModalOpen] = useState(false);

  // Saved Shopping Platforms (editable, additions saved for future reuse)
  const [savedPlatforms, setSavedPlatforms] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PLATFORMS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return ["蝦皮", "淘寶", "科研市集"];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PLATFORMS, JSON.stringify(savedPlatforms));
    } catch (e) {}
  }, [savedPlatforms]);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Admin Login / Logout Handlers
  const handleAdminLoginSuccess = () => {
    setIsAdmin(true);
    try {
      sessionStorage.setItem("ebblab_procurement_is_admin", "true");
    } catch (e) {}
    showToast(
      lang === "zh"
        ? "Admin 密碼驗證成功！已開啟審批與請購管理權限。"
        : "Admin verified successfully! Review actions unlocked."
    );
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    try {
      sessionStorage.removeItem("ebblab_procurement_is_admin");
    } catch (e) {}
    showToast(
      lang === "zh"
        ? "已登出 Admin 審批身分，切換回一般請購申請模式。"
        : "Logged out from Admin. Returned to applicant view."
    );
  };

  const handleSaveNewPlatform = (newPlatform: string) => {
    const trimmed = newPlatform.trim();
    if (!trimmed) return;
    setSavedPlatforms(prev => {
      if (prev.includes(trimmed)) return prev;
      return [...prev, trimmed];
    });
  };

  // Webhook sender
  const triggerGasWebhook = async (action: string, item: ProcurementItem, extra?: any) => {
    if (!gasWebhookUrl.trim()) return;
    try {
      await fetch(gasWebhookUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, item, ...extra })
      });
      showToast(lang === "zh" ? `已同步發送至 Google Apps Script Webhook！` : `Synced with Google Apps Script Webhook!`);
    } catch (e) {
      console.warn("Webhook fetch failed", e);
    }
  };

  // Handle New Item Submission
  const handleCreateItem = (data: Omit<ProcurementItem, "id" | "requisitionNo" | "createdAt" | "status" | "purchaser">) => {
    const nextSeq = items.length + 1;
    const requisitionNo = `EBB-2026-${String(nextSeq).padStart(3, "0")}`;
    const now = new Date();
    const createdAt = normalizeProcurementDate(now);

    const newItem: ProcurementItem = {
      ...data,
      id: `req_${Date.now()}`,
      requisitionNo,
      createdAt,
      status: "pending_assistant",
      purchaser: "unassigned"
    };

    setItems([newItem, ...items]);

    // Also update historical catalog for future autocomplete
    const newCatalogItem: HistoricalCatalogItem = {
      id: `hist_${Date.now()}`,
      category: data.category,
      itemName: data.itemName,
      englishName: data.chemicalDetails?.chemicalEnglishName,
      casNumber: data.chemicalDetails?.casNumber,
      purity: data.chemicalDetails?.purity,
      packageSize: data.chemicalDetails?.packageSize,
      vendorName: data.vendorName,
      lastUnitPrice: data.estimatedUnitPrice,
      currency: "NTD",
      brand: data.chemicalDetails?.brand,
      specModel: data.consumableDetails?.specModel || data.equipmentDetails?.modelNumber
    };

    const updatedCatalog = [newCatalogItem, ...historicalCatalog.filter(h => h.itemName !== data.itemName)];
    setHistoricalCatalog(updatedCatalog);
    try {
      localStorage.setItem(STORAGE_KEY_CATALOG, JSON.stringify(updatedCatalog));
    } catch (e) {}

    triggerGasWebhook("create_request", newItem);
    const isOver3000 = newItem.estimatedTotalPrice >= 3000;
    showToast(
      lang === "zh" 
        ? (isOver3000 
            ? `請購單 ${requisitionNo} 已建立！總額達 3,000 元（需附比價紀錄），將由 初審後呈送教授終審。`
            : `請購單 ${requisitionNo} 已建立！未滿 3,000 元小額請購（免附比價），將由 初審後呈送教授終審。`)
        : `Requisition ${requisitionNo} submitted!`
    );
  };

  // Admin Initial Review Handler (merged Assistant & Admin)
  const handleAssistantReview = (id: string, approved: boolean, comment: string) => {
    const now = new Date().toISOString().split("T")[0];
    const targetItem = items.find(i => i.id === id);
    if (!targetItem) return;

    const updated = items.map(item => {
      if (item.id === id) {
        // When Admin approves: forward to professor for all amounts (<3000 and >=3000)
        // When Admin rejects: status becomes rejected directly
        const nextStatus: ProcurementStatus = approved ? "pending_professor" : "rejected";

        return {
          ...item,
          status: nextStatus,
          assistantReview: {
            reviewerName: "Lab Admin (系統管理者/admin)",
            reviewedAt: now,
            approved,
            comment
          }
        };
      }
      return item;
    });

    setItems(updated);
    const updatedTarget = updated.find(i => i.id === id);
    if (selectedItem?.id === id) {
      setSelectedItem(updatedTarget || null);
    }

    if (!approved) {
      if (updatedTarget) triggerGasWebhook("admin_rejected", updatedTarget);
      showToast(lang === "zh" ? `初審未通過：已直接寄發退件說明通知給請購人 (${updatedTarget?.applicantEmail})。` : "Requisition returned to applicant with comments.");
    } else {
      // Send webhook for professor notification with standard doc & checkbox reply
      if (updatedTarget) triggerGasWebhook("admin_approved_forward_professor", updatedTarget);
      showToast(lang === "zh" ? "初審合格！已發送附標準文檔與核簽複選模板之簽呈信給教授終審。" : "Admin review passed. Forwarded to PI with standard requisition doc & reply options.");
    }
  };

  // Professor Review Handler
  const handleProfessorReview = (id: string, approved: boolean, comment: string, purchaser: PurchaserType) => {
    const now = new Date().toISOString().split("T")[0];
    const targetItem = items.find(i => i.id === id);

    const updated = items.map(item => {
      if (item.id === id) {
        const nextStatus: ProcurementStatus = approved ? "approved" : "rejected";
        return {
          ...item,
          status: nextStatus,
          purchaser: approved ? purchaser : "unassigned",
          professorReview: {
            reviewerName: "Prof. K.L. Chang",
            reviewedAt: now,
            approved,
            comment,
            designatedPurchaser: purchaser
          }
        };
      }
      return item;
    });

    setItems(updated);
    const updatedTarget = updated.find(i => i.id === id);
    if (selectedItem?.id === id) {
      setSelectedItem(updatedTarget || null);
    }

    if (approved && updatedTarget) {
      triggerGasWebhook("approve_request", updatedTarget);
      showToast(lang === "zh" ? `教授核定准予採購！回覆通知信已寄達請購人 (${updatedTarget.applicantEmail})，並同步抄送admin。` : `Final approval granted! Notified applicant with CC to Admin.`);
    } else if (updatedTarget) {
      triggerGasWebhook("professor_rejected", updatedTarget);
      showToast(lang === "zh" ? `教授已退回請購單，說明已寄送至請購人 (${updatedTarget.applicantEmail}) 並抄送admin。` : "Request rejected by PI; applicant and Admin notified.");
    }
  };

  // Mark Purchased Handler
  const handleMarkPurchased = (id: string, purchaseInfo: NonNullable<ProcurementItem["actualPurchaseInfo"]>) => {
    const updated = items.map(item => {
      if (item.id === id) {
        return {
          ...item,
          status: "purchased" as ProcurementStatus,
          actualPurchaseInfo: purchaseInfo
        };
      }
      return item;
    });

    setItems(updated);
    const updatedTarget = updated.find(i => i.id === id);
    if (selectedItem?.id === id) {
      setSelectedItem(updatedTarget || null);
    }
    if (updatedTarget) {
      triggerGasWebhook("mark_purchased", updatedTarget);
    }
    showToast(lang === "zh" ? "已標記採購完成！購買進程已更新。" : "Marked as purchased! Purchase progress updated.");
  };

  // Delete Request (Admin only) with bi-directional sync to Google Sheet
  const handleDeleteRequest = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = items.find(i => i.id === id);
    if (!target) return;

    if (confirm(lang === "zh" ? `確定要刪除請購單【${target.requisitionNo}】嗎？\n此操作將同步自系統及 Google 試算表中徹底刪除。` : `Are you sure you want to delete requisition ${target.requisitionNo}?`)) {
      const updated = items.filter(i => i.id !== id);
      setItems(updated);
      try {
        localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(updated));
      } catch (err) {}
      if (selectedItem?.id === id) setSelectedItem(null);

      // 雙向同步刪除 Google Sheet 後端記錄
      if (gasWebhookUrl && gasWebhookUrl.trim()) {
        try {
          await deleteRequisitionInGasWebhook(gasWebhookUrl, target.requisitionNo, target.id);
        } catch (err) {
          console.warn("GAS webhook delete error", err);
        }
      }

      showToast(lang === "zh" ? `請購單【${target.requisitionNo}】已雙向同步刪除。` : `Requisition ${target.requisitionNo} deleted.`);
    }
  };

  // Filter Items
  const filteredItems = items.filter(item => {
    if (categoryFilter !== "ALL" && item.category !== categoryFilter) return false;
    if (statusFilter !== "ALL" && item.status !== statusFilter) return false;

    // Date range filter
    const itemDate = extractDateOnly(item.createdAt, item.requisitionNo);
    const todayStr = getTodayTaipeiDate();

    if (dateFilterPreset === "TODAY") {
      if (itemDate !== todayStr) return false;
    } else if (dateFilterPreset === "7DAYS") {
      const d7 = new Date();
      d7.setDate(d7.getDate() - 7);
      const d7Str = extractDateOnly(d7);
      if (itemDate < d7Str) return false;
    } else if (dateFilterPreset === "30DAYS") {
      const d30 = new Date();
      d30.setDate(d30.getDate() - 30);
      const d30Str = extractDateOnly(d30);
      if (itemDate < d30Str) return false;
    } else if (dateFilterPreset === "THIS_MONTH") {
      const ym = todayStr.substring(0, 7);
      if (!itemDate.startsWith(ym)) return false;
    } else if (dateFilterPreset === "CUSTOM") {
      if (customFilterStartDate && itemDate < customFilterStartDate) return false;
      if (customFilterEndDate && itemDate > customFilterEndDate) return false;
    }

    // In student mode, users can view all lab items or focus on their own
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      item.requisitionNo.toLowerCase().includes(q) ||
      item.itemName.toLowerCase().includes(q) ||
      item.applicantName.toLowerCase().includes(q) ||
      item.vendorName.toLowerCase().includes(q) ||
      item.purpose.toLowerCase().includes(q) ||
      (item.chemicalDetails?.casNumber && item.chemicalDetails.casNumber.includes(q))
    );
  });

  // Toggle Bulk selection
  const toggleSelectId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.id)));
    }
  };

  // Update Requisition Item (including partial approval of item lines)
  const handleUpdateItem = (updatedItem: ProcurementItem) => {
    setItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
    setSelectedItem(updatedItem);
    triggerGasWebhook("update_request", updatedItem);
    showToast(lang === "zh" ? `請購單 ${updatedItem.requisitionNo} 資料與審核狀態已更新！` : `Requisition ${updatedItem.requisitionNo} updated!`);
  };

  // Export CSV (Excel Compliant UTF-8 with BOM)
  const handleExportCSV = (exportItemsList: ProcurementItem[]) => {
    const headers = [
      "請購單號 (Requisition No)",
      "品項編號 (Line No)",
      "申請日期 (Date)",
      "申請人 (Applicant)",
      "聯絡信箱 (Email)",
      "類別 (Category)",
      "品項名稱 (Item Name)",
      "數量 (Quantity)",
      "單位 (Unit)",
      "預估單價 (Est. Unit Price)",
      "預估總額 (Est. Total Price)",
      "商品/購物連結 (Product URL)",
      "請購目的 (Purpose)",
      "建議廠商 (Vendor)",
      "審核狀態 (Status)",
      "品項審核註記 (Item Review Comment)",
      "指定採購人 (Purchaser)",
      "實際決標總額 (Actual Total)"
    ];

    const rows: (string | number)[][] = [];

    exportItemsList.forEach(req => {
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
          `"${req.purchaser}"`,
          req.actualPurchaseInfo ? req.actualPurchaseInfo.actualTotalPrice : ""
        ]);
      });
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `EBB_Lab_Procurement_Export_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast(lang === "zh" ? `已成功匯出 ${exportItemsList.length} 筆請購單為 Excel (CSV) 格式！` : `Exported ${exportItemsList.length} items to CSV!`);
  };

  const getStatusBadge = (status: ProcurementStatus) => {
    switch (status) {
      case "pending_assistant":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold"><Clock className="w-3 h-3" />待初審</span>;
      case "pending_professor":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold"><Clock className="w-3 h-3" />待教授終審</span>;
      case "approved":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold"><CheckCircle2 className="w-3 h-3" />審核通過 (待採購)</span>;
      case "partially_approved":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10px] font-bold"><AlertCircle className="w-3 h-3 text-indigo-600" />部分審核通過</span>;
      case "rejected":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-rose-50 text-rose-800 border border-rose-200 text-[10px] font-bold"><XCircle className="w-3 h-3" />已退回</span>;
      case "purchased":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-slate-100 text-slate-800 border border-slate-300 text-[10px] font-bold"><Receipt className="w-3 h-3 text-emerald-700" />已採購入庫</span>;
    }
  };

  // Compute pending reviews count for Requisitions Tab
  const pendingReviewsCount = useMemo(() => {
    return items.filter(i => i.status.startsWith("pending")).length;
  }, [items]);

  // Compute approved items count & pending purchase count for Purchasing Tracker Tab
  const approvedItemsStats = useMemo(() => {
    let totalApprovedCount = 0;
    let pendingBuyCount = 0;

    items.forEach(req => {
      if (req.status === "approved" || req.status === "partially_approved" || req.status === "purchased") {
        if (req.items && req.items.length > 0) {
          req.items.forEach(sub => {
            if (req.status === "partially_approved" && sub.status !== "approved" && sub.status !== "purchased") return;
            if (req.status === "rejected" || sub.status === "rejected") return;
            totalApprovedCount++;
            const p = sub.purchaseProgress || (sub.status === "purchased" ? "completed" : (req.purchaseProgress || "pending_purchase"));
            if (p === "pending_purchase") pendingBuyCount++;
          });
        } else {
          totalApprovedCount++;
          const p = req.purchaseProgress || (req.status === "purchased" ? "completed" : "pending_purchase");
          if (p === "pending_purchase") pendingBuyCount++;
        }
      }
    });

    return { totalApprovedCount, pendingBuyCount };
  }, [items]);

  return (
    <div className="space-y-6">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#1b4372] text-white px-4 py-3 rounded-sm shadow-xl flex items-center gap-2.5 animate-fadeIn font-sans text-xs">
          <Sparkles className="w-4 h-4 text-blue-200 shrink-0" />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header with Role Switcher & Lang Toggle */}
      {/* Header with Admin Review Login & Fill Requisition Action */}
      <ProcurementHeader
        isAdmin={isAdmin}
        onOpenAdminLogin={() => setIsRolePasswordModalOpen(true)}
        onAdminLogout={handleAdminLogout}
        lang={lang}
        onToggleLang={() => setLang(lang === "zh" ? "en" : "zh")}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        totalCount={items.length}
        pendingCount={pendingReviewsCount}
        onSyncNow={() => syncWithCloud(false)}
        isSyncing={isSyncing}
        lastSyncTime={lastSyncTime}
      />

      {/* Navigation View Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#e5e5e0] bg-white rounded-t-sm px-2 pt-1 gap-2 shadow-2xs">
        <div className="flex items-center gap-1 overflow-x-auto">
          {/* Tab 1: Requisitions & Approvals */}
          <button
            type="button"
            onClick={() => setActiveTab("requisitions")}
            className={`inline-flex items-center gap-2 px-4 py-3 border-b-2 font-serif text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === "requisitions"
                ? "border-[#1b4372] text-[#1b4372] bg-blue-50/40"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            <ClipboardList className="w-4 h-4 text-[#1b4372]" />
            <span>{lang === "zh" ? "1. 請購審核單據總表" : "1. Requisitions & Approvals"}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {items.length} 筆
            </span>
            {pendingReviewsCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                {pendingReviewsCount} 待審
              </span>
            )}
          </button>

          {/* Tab 2: Approved Purchasing Tracker */}
          <button
            type="button"
            onClick={() => setActiveTab("approved_purchasing")}
            className={`inline-flex items-center gap-2 px-4 py-3 border-b-2 font-serif text-xs sm:text-sm font-bold transition whitespace-nowrap cursor-pointer ${
              activeTab === "approved_purchasing"
                ? "border-[#1b4372] text-[#1b4372] bg-blue-50/40"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            <PackageCheck className="w-4 h-4 text-[#1b4372]" />
            <span>{lang === "zh" ? "2. 已核准品項與採購進程追蹤" : "2. Approved Items & Purchase Tracking"}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {approvedItemsStats.totalApprovedCount} 項
            </span>
            {approvedItemsStats.pendingBuyCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 text-white shadow-2xs">
                {approvedItemsStats.pendingBuyCount} 待採購
              </span>
            )}
          </button>
        </div>
      </div>

      {/* VIEW 1: Requisitions & Approvals Tab */}
      {activeTab === "requisitions" && (
        <div className="space-y-6">
          {/* Filter Toolbar & Actions */}
          <div className="bg-[#fdfdfc] border border-[#e5e5e0] p-4 rounded-sm space-y-3 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#1b4372] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={lang === "zh" ? "搜尋請購單號、品項名稱、申請人、CAS No、發票號碼..." : "Search requisitions, items, CAS No..."}
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#e5e5e0] rounded-sm text-xs font-sans focus:outline-none focus:border-[#1b4372]"
            />
          </div>

          {/* Batch Actions & Order Exports (Admin Only) */}
          {isAdmin && (
            <div className="flex items-center gap-2 shrink-0">
              {selectedIds.size > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => setPrintItems(items.filter(i => selectedIds.has(i.id)))}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#1b4372] text-white rounded-sm text-xs font-bold transition shadow-xs active:scale-95"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>{lang === "zh" ? `批次列印單據 (${selectedIds.size})` : `Batch Print (${selectedIds.size})`}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportCSV(items.filter(i => selectedIds.has(i.id)))}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-[#e5e5e0] hover:bg-slate-50 text-slate-700 rounded-sm text-xs font-bold transition shadow-xs"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{lang === "zh" ? `匯出 Excel (${selectedIds.size})` : `Export CSV (${selectedIds.size})`}</span>
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setIsExportDateRangeModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#1b4372] hover:bg-[#122e4f] text-white rounded-sm text-xs font-bold transition shadow-xs active:scale-95"
                title="依時間段或自訂日期範圍匯出 Excel (CSV)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-300" />
                <span>{lang === "zh" ? "依時間段匯出 Excel" : "Export by Date Range"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportCSV(filteredItems)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-[#e5e5e0] hover:bg-slate-50 text-slate-700 rounded-sm text-xs font-bold transition shadow-xs"
                title="匯出目前列表篩選後之資料"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">{lang === "zh" ? "匯出當前視圖" : "Export View"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Filter Pills & Date Range */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-2.5 border-t border-[#e5e5e0] text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <div className="flex items-center gap-1">
              <span className="text-slate-400 font-medium">{lang === "zh" ? "類別:" : "Category:"}</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
                className="bg-white border border-[#e5e5e0] rounded-sm py-1 px-2 text-xs font-medium focus:outline-none"
              >
                <option value="ALL">{lang === "zh" ? "全部類別" : "All Categories"}</option>
                <option value="chemical">{lang === "zh" ? "藥品試劑" : "Chemicals"}</option>
                <option value="consumable">{lang === "zh" ? "雜物耗材" : "Consumables"}</option>
                <option value="equipment">{lang === "zh" ? "儀器設備" : "Equipment"}</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1">
              <span className="text-slate-400 font-medium">{lang === "zh" ? "狀態:" : "Status:"}</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-white border border-[#e5e5e0] rounded-sm py-1 px-2 text-xs font-medium focus:outline-none"
              >
                <option value="ALL">{lang === "zh" ? "全部狀態" : "All Status"}</option>
                <option value="pending_assistant">{lang === "zh" ? "待 Admin/初審" : "Pending Admin"}</option>
                <option value="pending_professor">{lang === "zh" ? "待教授終審" : "Pending PI"}</option>
                <option value="approved">{lang === "zh" ? "已核准 (待採購)" : "Approved"}</option>
                <option value="partially_approved">{lang === "zh" ? "部分審核通過" : "Partially Approved"}</option>
                <option value="purchased">{lang === "zh" ? "已採購完成" : "Purchased"}</option>
                <option value="rejected">{lang === "zh" ? "已退回" : "Rejected"}</option>
              </select>
            </div>

            {/* Date Presets */}
            <div className="flex flex-wrap items-center gap-1 border-l border-slate-200 pl-2">
              <span className="text-slate-400 font-medium flex items-center gap-1">
                <Calendar className="w-3 h-3 text-[#1b4372]" />
                {lang === "zh" ? "時間:" : "Time:"}
              </span>
              {[
                { id: "TODAY", label: lang === "zh" ? "今日" : "Today" },
                { id: "7DAYS", label: lang === "zh" ? "近7天" : "7 Days" },
                { id: "30DAYS", label: lang === "zh" ? "近30天" : "30 Days" },
                { id: "THIS_MONTH", label: lang === "zh" ? "本月" : "Month" },
                { id: "ALL", label: lang === "zh" ? "全部" : "All" },
                { id: "CUSTOM", label: lang === "zh" ? "自訂" : "Custom" }
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setDateFilterPreset(p.id)}
                  className={`px-2 py-0.5 rounded-xs text-[11px] font-medium transition border ${
                    dateFilterPreset === p.id
                      ? "bg-[#1b4372] text-white border-[#1b4372]"
                      : "bg-white text-slate-600 border-[#e5e5e0] hover:bg-slate-50"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom Range Picker */}
            {dateFilterPreset === "CUSTOM" && (
              <div className="flex items-center gap-1 bg-amber-50/70 p-1 rounded border border-amber-200 text-[11px]">
                <CalendarRange className="w-3 h-3 text-[#1b4372]" />
                <input
                  type="date"
                  value={customFilterStartDate}
                  onChange={(e) => setCustomFilterStartDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-1 py-0.5 text-[10px] font-mono"
                />
                <span>~</span>
                <input
                  type="date"
                  value={customFilterEndDate}
                  onChange={(e) => setCustomFilterEndDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded px-1 py-0.5 text-[10px] font-mono"
                />
                {(customFilterStartDate || customFilterEndDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomFilterStartDate("");
                      setCustomFilterEndDate("");
                    }}
                    className="text-slate-400 hover:text-slate-700 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="text-slate-400 text-[11px] font-mono shrink-0">
            {lang === "zh" ? `共 ${filteredItems.length} 筆請購單` : `${filteredItems.length} Requisitions`}
          </div>
        </div>
      </div>

      {/* Main Table View */}
      <div className="border border-[#e5e5e0] rounded-sm overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-sans">
            <thead className="bg-[#f8f8f5] text-slate-700 font-bold border-b border-[#e5e5e0]">
              <tr>
                {isAdmin && (
                  <th className="p-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size > 0 && selectedIds.size === filteredItems.length}
                      onChange={handleSelectAll}
                      className="rounded text-[#1b4372]"
                    />
                  </th>
                )}
                <th className="p-3 text-left w-32">請購單號 / 申請日</th>
                <th className="p-3 text-left">品項名稱與規格規格</th>
                <th className="p-3 text-left w-24">類別</th>
                <th className="p-3 text-right w-24">數量金額 (NT$)</th>
                <th className="p-3 text-left w-36">建議廠商 / 平台</th>
                <th className="p-3 text-left w-28">申請人</th>
                <th className="p-3 text-center w-36">審核狀態</th>
                <th className="p-3 text-center w-28">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e5e0]">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  const isChecked = selectedIds.has(item.id);
                  const displayTotal = item.actualPurchaseInfo?.actualTotalPrice || item.estimatedTotalPrice;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={`hover:bg-[#fbfbfa] transition cursor-pointer ${isChecked ? "bg-blue-50/30" : ""}`}
                    >
                      {isAdmin && (
                        <td className="p-3 text-center" onClick={(e) => toggleSelectId(item.id, e)}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded text-[#1b4372]"
                          />
                        </td>
                      )}
                      <td className="p-3 font-mono">
                        <span className="font-bold text-[#1b4372] block">{item.requisitionNo}</span>
                        <span className="text-[10px] text-slate-400 block">{extractDateOnly(item.createdAt, item.requisitionNo)}</span>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900 font-serif text-sm flex items-center flex-wrap gap-1">
                          <span>{item.itemName}</span>
                          {item.items && item.items.length > 1 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                              共 {item.items.length} 品項
                            </span>
                          )}
                          {(item.productUrl || (item.items && item.items.some(sub => sub.productUrl))) && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-700 bg-blue-50/80 px-1 py-0.2 rounded border border-blue-200" title="包含購物平台/商品連結">
                              <ExternalLink className="w-2.5 h-2.5" />
                              連結
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-sans line-clamp-1 mt-0.5">
                          {item.purpose}
                        </div>
                        {item.chemicalDetails?.casNumber && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            CAS: {item.chemicalDetails.casNumber} · {item.vendorName}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-xs bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200">
                          {item.category === "chemical" ? "藥品試劑" : item.category === "equipment" ? "儀器設備" : "耗材雜物"}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono">
                        <span className="font-bold text-slate-900 block">
                          NT$ {displayTotal.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {item.quantity} {item.unit}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-slate-700 truncate max-w-[150px]" title={item.vendorName || item.platform || "—"}>
                        {item.vendorName || item.platform || <span className="text-slate-400 italic">—</span>}
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-slate-800 block">{item.applicantName}</span>
                        <span className="text-[10px] text-slate-400 block truncate max-w-[100px]">{item.applicantEmail}</span>
                      </td>
                      <td className="p-3 text-center">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedItem(item)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-sm"
                            title="查看詳細與審核"
                          >
                            <Eye className="w-4 h-4 text-[#1b4372]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPrintItems([item])}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-sm"
                            title="產生請購單"
                          >
                            <Printer className="w-4 h-4 text-[#8d734a]" />
                          </button>
                          {currentRole === "admin" && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteRequest(item.id, e)}
                              className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-sm"
                              title="刪除單據 (管理員權限)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="p-10 text-center text-slate-400 bg-[#fdfdfc]">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-medium">查無符合條件的請購單</p>
                    <p className="text-xs text-slate-400 mt-1">請調整篩選條件或點擊上方「+ 填寫新請購單」</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}

  {/* VIEW 2: Approved Purchasing Tracker Tab */}
  {activeTab === "approved_purchasing" && (
    <ApprovedPurchasingTracker
      items={items}
      onUpdateItem={(updatedItem) => {
        setItems(prev => prev.map(it => it.id === updatedItem.id ? updatedItem : it));
        showToast(lang === "zh" ? "品項購買進程已成功更新！" : "Purchase progress updated!");
      }}
      lang={lang}
      currentRole={currentRole}
      isAdmin={isAdmin}
      onViewRequisitionDetail={(item) => setSelectedItem(item)}
      onTriggerWebhook={triggerGasWebhook}
    />
  )}

  {/* Detail Modal */}
  {selectedItem && (
    <ProcurementDetailModal
      item={selectedItem}
      currentRole={currentRole}
      lang={lang}
      isAdmin={isAdmin}
      onClose={() => setSelectedItem(null)}
      onAssistantReview={handleAssistantReview}
      onProfessorReview={handleProfessorReview}
      onMarkPurchased={handleMarkPurchased}
      onUpdateItem={handleUpdateItem}
      onOpenPrintView={(item) => setPrintItems([item])}
      onSendEmailNotification={(type, item) => triggerGasWebhook(type === "approved" ? "approve_request" : "create_request", item)}
      onOpenAdminLogin={() => setIsRolePasswordModalOpen(true)}
    />
  )}

  {/* Create New Requisition Form Modal */}
  <ProcurementFormModal
    isOpen={isCreateModalOpen}
    onClose={() => setIsCreateModalOpen(false)}
    onSubmit={handleCreateItem}
    lang={lang}
    historicalCatalog={historicalCatalog}
    savedPlatforms={savedPlatforms}
    onSaveNewPlatform={handleSaveNewPlatform}
  />

  {/* Official Print Requisition Modal */}
  {printItems && printItems.length > 0 && (
    <ProcurementOfficialRequisition
      items={printItems}
      lang={lang}
      isAdmin={isAdmin}
      onClose={() => setPrintItems(null)}
      onExportCSV={handleExportCSV}
    />
  )}

  {/* Export CSV by Date Range Modal */}
  <ExportDateRangeModal
    isOpen={isExportDateRangeModalOpen}
    onClose={() => setIsExportDateRangeModalOpen(false)}
    items={items}
    lang={lang}
  />

  {/* Admin Review Password Modal */}
  <RolePasswordModal
    isOpen={isRolePasswordModalOpen}
    onClose={() => setIsRolePasswordModalOpen(false)}
    onVerifySuccess={handleAdminLoginSuccess}
    adminPassword={rolePasswords.admin}
    lang={lang}
  />
</div>
);
}
