import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Package, 
  Search, 
  Plus, 
  Lock, 
  Unlock, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  FileText, 
  Download, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  User, 
  Filter, 
  X, 
  Edit3, 
  EyeOff, 
  Eye, 
  ShieldCheck, 
  Layers, 
  ClipboardCheck, 
  History, 
  ArrowRight,
  Boxes,
  HelpCircle,
  Save,
  ChevronDown,
  Cloud,
  ListFilter,
  Tag,
  Info
} from "lucide-react";
import { members as initialMembers, Member } from "../data/labData";
import { 
  ConsumableItem, 
  ConsumableTransaction, 
  StocktakeAudit, 
  StocktakeAuditDetail,
  ConsumableCategory 
} from "../types/consumables";
import { 
  CONSUMABLE_CATEGORIES, 
  INITIAL_CONSUMABLES, 
  INITIAL_TRANSACTIONS, 
  INITIAL_AUDIT_HISTORY 
} from "../data/consumablesData";
import { EXTERNAL_LINKS } from "../config/externalLinks";
import { 
  fetchConsumablesFromCloud, 
  sendConsumablesWebhook, 
  getConsumablesWebhookUrl 
} from "../services/consumablesSyncService";

const STORAGE_KEY_ITEMS = "ebblab_consumables_items_v2";
const STORAGE_KEY_LOGS = "ebblab_consumables_logs_v2";
const STORAGE_KEY_AUDITS = "ebblab_consumables_audits_v2";
const STORAGE_KEY_TOKEN = "ebblab_consumables_admin_token";

export default function ConsumablesStatistics({ onBackToHome }: { onBackToHome?: () => void }) {
  // --------------------------------------------------------------------------
  // 1. Data State (Items, Logs, Audits)
  // --------------------------------------------------------------------------
  const [items, setItems] = useState<ConsumableItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 1) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_CONSUMABLES;
  });

  const [transactions, setTransactions] = useState<ConsumableTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LOGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 1) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_TRANSACTIONS;
  });

  const [audits, setAudits] = useState<StocktakeAudit[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AUDITS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_AUDIT_HISTORY;
  });

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
    } catch (e) {}
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(transactions));
    } catch (e) {}
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_AUDITS, JSON.stringify(audits));
    } catch (e) {}
  }, [audits]);

  // --------------------------------------------------------------------------
  // Cloud Sync State (Google Apps Script Webhook 雙向同步)
  // --------------------------------------------------------------------------
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const syncWithCloud = async (isAuto = false) => {
    setIsSyncing(true);
    try {
      const res = await fetchConsumablesFromCloud();
      if (res.success) {
        if (res.items && res.items.length > 0) {
          setItems(res.items);
        }
        if (res.transactions && res.transactions.length > 0) {
          setTransactions(res.transactions);
        }
        if (res.audits && res.audits.length > 0) {
          setAudits(res.audits);
        }
        const timeStr = new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
        setLastSyncTime(timeStr);
        if (!isAuto) showToast(res.message || "雲端耗材資料同步成功！", "success");
      } else {
        if (!isAuto) showToast(res.message || "無法自雲端讀取耗材資料，維持本地記錄。", "error");
      }
    } catch (err: any) {
      if (!isAuto) showToast(`同步失敗：${err.message || err}`, "error");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    syncWithCloud(true);
  }, []);

  // --------------------------------------------------------------------------
  // 2. Admin Auth State (Password: ebbthings)
  // --------------------------------------------------------------------------
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_TOKEN) === "authorized_ebbthings";
    } catch (e) {
      return false;
    }
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginPasswordInput, setLoginPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPasswordInput.trim() === "ebbthings") {
      setIsAdmin(true);
      try {
        localStorage.setItem(STORAGE_KEY_TOKEN, "authorized_ebbthings");
      } catch (e) {}
      setIsLoginModalOpen(false);
      setLoginPasswordInput("");
      setLoginError("");
      showToast("管理員身分已驗證成功！", "success");
    } else {
      setLoginError("密碼錯誤，請確認後重試 (提示: 密碼由實驗室負責人分發)");
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    try {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
    } catch (e) {}
    showToast("已登出管理員身分", "info");
  };

  // --------------------------------------------------------------------------
  // 3. UI Navigation & Filters
  // --------------------------------------------------------------------------
  const [currentTab, setCurrentTab] = useState<"catalog" | "history" | "low_stock" | "audit" | "manage">("catalog");
  const [selectedCategory, setSelectedCategory] = useState<string>("全部類別");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // --------------------------------------------------------------------------
  // 3.1 耗材領用紀錄快速檢視與彈窗狀態
  // --------------------------------------------------------------------------
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<ConsumableItem | null>(null);
  const [isAllPickupsModalOpen, setIsAllPickupsModalOpen] = useState(false);
  const [itemHistorySearch, setItemHistorySearch] = useState("");
  const [allPickupsSearch, setAllPickupsSearch] = useState("");
  const [allPickupsCategoryFilter, setAllPickupsCategoryFilter] = useState("全部類別");
  const [historyScope, setHistoryScope] = useState<"pickup_only" | "all">("pickup_only");
  const [historyTabTypeFilter, setHistoryTabTypeFilter] = useState<string>("全部類型");

  // 取得每一項耗材最近一次「領取」紀錄 (包含上次領用人、上次領用時間、領用數量)
  const lastPickupMap = useMemo(() => {
    const map = new Map<string, ConsumableTransaction>();
    const pickupTxs = transactions
      .filter(t => t.type === "領取")
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    for (const tx of pickupTxs) {
      if (!map.has(tx.consumableId)) {
        map.set(tx.consumableId, tx);
      }
    }
    return map;
  }, [transactions]);

  // 取得每一項耗材領用累計統計 (次數、總數量)
  const itemPickupStatsMap = useMemo(() => {
    const map = new Map<string, { count: number; totalQty: number }>();
    for (const tx of transactions) {
      if (tx.type === "領取") {
        const prev = map.get(tx.consumableId) || { count: 0, totalQty: 0 };
        map.set(tx.consumableId, {
          count: prev.count + 1,
          totalQty: prev.totalQty + Math.abs(tx.changeQty)
        });
      }
    }
    return map;
  }, [transactions]);

  // 全實驗室累計領用總次數
  const totalPickupCount = useMemo(() => {
    return transactions.filter(t => t.type === "領取").length;
  }, [transactions]);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const showToast = (text: string, type: "success" | "error" | "info" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // --------------------------------------------------------------------------
  // 4. Pickup Modal State (領取登記 - 一般使用者)
  // --------------------------------------------------------------------------
  const [selectedPickupItem, setSelectedPickupItem] = useState<ConsumableItem | null>(null);
  const [pickupQty, setPickupQty] = useState<number>(1);
  const [pickupOperator, setPickupOperator] = useState<string>("");
  const [isOtherOperator, setIsOtherOperator] = useState<boolean>(false);
  const [otherOperatorName, setOtherOperatorName] = useState<string>("");
  const [pickupNotes, setPickupNotes] = useState<string>("");
  const [isSubmittingPickup, setIsSubmittingPickup] = useState(false);

  // Search in member dropdown
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);

  // Filter lab members from initialMembers
  const filteredMemberList = useMemo(() => {
    const list = initialMembers.map(m => `${m.name_zh} (${m.name_en || m.role})`);
    if (!memberSearchTerm.trim()) return list;
    const q = memberSearchTerm.toLowerCase();
    return list.filter(name => name.toLowerCase().includes(q));
  }, [memberSearchTerm]);

  const openPickupModal = (item: ConsumableItem) => {
    if (item.currentStock <= 0) {
      showToast("此耗材目前庫存為 0，暫無法領取！", "error");
      return;
    }
    setSelectedPickupItem(item);
    setPickupQty(1);
    setPickupNotes("");
    setIsOtherOperator(false);
    setOtherOperatorName("");
    setMemberSearchTerm("");
    setIsMemberDropdownOpen(false);
  };

  const handleConfirmPickup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPickupItem) return;

    if (pickupQty <= 0) {
      alert("領取數量必須為大於 0 的正整數！");
      return;
    }

    if (pickupQty > selectedPickupItem.currentStock) {
      alert(`領取數量不可超過目前庫存 (${selectedPickupItem.currentStock} ${selectedPickupItem.unit})！`);
      return;
    }

    const finalOperator = isOtherOperator ? otherOperatorName.trim() : pickupOperator.trim();
    if (!finalOperator) {
      alert("請選擇領取人姓名或填寫自訂姓名！");
      return;
    }

    setIsSubmittingPickup(true);

    setTimeout(() => {
      const nowStr = new Date().toLocaleString("zh-TW", {
        timeZone: "Asia/Taipei",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }).replace(/\//g, "-");

      const prevStock = selectedPickupItem.currentStock;
      const afterStock = prevStock - pickupQty;

      // 1. Update item stock
      setItems(prevItems => 
        prevItems.map(it => 
          it.id === selectedPickupItem.id 
            ? { ...it, currentStock: afterStock, updatedAt: nowStr }
            : it
        )
      );

      // 2. Append transaction record
      const newTx: ConsumableTransaction = {
        id: `TX-${Date.now()}`,
        timestamp: nowStr,
        consumableId: selectedPickupItem.id,
        consumableName: selectedPickupItem.name,
        type: "領取",
        changeQty: -pickupQty,
        prevStock: prevStock,
        afterStock: afterStock,
        operator: finalOperator,
        isListedMember: isOtherOperator ? "否" : "是",
        notes: pickupNotes.trim()
      };

      setTransactions(prev => [newTx, ...prev]);

      // 3. 雲端 Google Sheet 同步
      sendConsumablesWebhook({
        action: "pickup",
        itemId: selectedPickupItem.id,
        itemName: selectedPickupItem.name,
        amount: pickupQty,
        userName: finalOperator,
        inList: isOtherOperator ? "否" : "是",
        notes: pickupNotes.trim()
      }).then(cloudRes => {
        if (cloudRes && cloudRes.success) {
          console.log("Cloud pickup sync success:", cloudRes);
        }
      }).catch(e => console.warn("Cloud pickup sync error:", e));

      setIsSubmittingPickup(false);
      setSelectedPickupItem(null);
      showToast(`登記成功！已領取「${selectedPickupItem.name}」${pickupQty} ${selectedPickupItem.unit}。`, "success");
    }, 300);
  };

  // --------------------------------------------------------------------------
  // 5. Restock Modal & Manual Adjust (管理員功能)
  // --------------------------------------------------------------------------
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [restockItemId, setRestockItemId] = useState("");
  const [restockQty, setRestockQty] = useState<number>(5);
  const [restockNotes, setRestockNotes] = useState("常態採購到貨入庫");

  const handleConfirmRestock = (e: React.FormEvent) => {
    e.preventDefault();
    const item = items.find(i => i.id === restockItemId);
    if (!item) {
      alert("請選擇要補貨的耗材！");
      return;
    }
    if (restockQty <= 0) {
      alert("入庫數量需大於 0！");
      return;
    }

    const nowStr = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false }).replace(/\//g, "-");
    const prevStock = item.currentStock;
    const afterStock = prevStock + restockQty;

    setItems(prev => prev.map(it => it.id === item.id ? { ...it, currentStock: afterStock, updatedAt: nowStr } : it));

    const newTx: ConsumableTransaction = {
      id: `TX-${Date.now()}`,
      timestamp: nowStr,
      consumableId: item.id,
      consumableName: item.name,
      type: "補貨入庫",
      changeQty: restockQty,
      prevStock,
      afterStock,
      operator: "管理員 (Admin)",
      isListedMember: "是",
      notes: restockNotes.trim()
    };

    setTransactions(prev => [newTx, ...prev]);

    // 雲端同步
    sendConsumablesWebhook({
      action: "restock",
      token: "authorized_ebbthings",
      itemId: item.id,
      amount: restockQty,
      operator: "管理員 (Admin)",
      notes: restockNotes.trim()
    }).catch(e => console.warn(e));

    setIsRestockModalOpen(false);
    showToast(`入庫成功！「${item.name}」已增加 ${restockQty} ${item.unit}。`, "success");
  };

  // Manual Adjust Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<ConsumableItem | null>(null);
  const [adjustNewStock, setAdjustNewStock] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState("");

  const openAdjustModal = (item: ConsumableItem) => {
    setAdjustItem(item);
    setAdjustNewStock(item.currentStock);
    setAdjustReason("");
    setIsAdjustModalOpen(true);
  };

  const handleConfirmAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustItem) return;
    if (adjustNewStock < 0) {
      alert("庫存不可為負數！");
      return;
    }
    if (!adjustReason.trim()) {
      alert("手動修正庫存必須填寫修正原因！");
      return;
    }

    const nowStr = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false }).replace(/\//g, "-");
    const prevStock = adjustItem.currentStock;
    const diff = adjustNewStock - prevStock;

    if (diff === 0) {
      alert("新庫存與當前庫存相同，無須修正！");
      return;
    }

    setItems(prev => prev.map(it => it.id === adjustItem.id ? { ...it, currentStock: adjustNewStock, updatedAt: nowStr } : it));

    const newTx: ConsumableTransaction = {
      id: `TX-${Date.now()}`,
      timestamp: nowStr,
      consumableId: adjustItem.id,
      consumableName: adjustItem.name,
      type: "手動修正",
      changeQty: diff,
      prevStock,
      afterStock: adjustNewStock,
      operator: "管理員 (Admin)",
      isListedMember: "是",
      notes: adjustReason.trim()
    };

    setTransactions(prev => [newTx, ...prev]);

    // 雲端同步
    sendConsumablesWebhook({
      action: "manual_adjust",
      token: "authorized_ebbthings",
      itemId: adjustItem.id,
      newStock: adjustNewStock,
      operator: "管理員 (Admin)",
      reason: adjustReason.trim()
    }).catch(e => console.warn(e));

    setIsAdjustModalOpen(false);
    showToast(`庫存已修正！「${adjustItem.name}」校正為 ${adjustNewStock} ${adjustItem.unit}。`, "success");
  };

  // --------------------------------------------------------------------------
  // 6. Add & Edit Item Modal (管理員)
  // --------------------------------------------------------------------------
  const [isItemFormModalOpen, setIsItemFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ConsumableItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    category: "離心管與樣品瓶",
    spec: "",
    unit: "盒",
    currentStock: 10,
    safeStock: 5,
    notes: ""
  });

  const openAddItemModal = () => {
    setEditingItem(null);
    setFormData({
      name: "",
      category: "離心管與樣品瓶",
      spec: "",
      unit: "盒",
      currentStock: 10,
      safeStock: 5,
      notes: ""
    });
    setIsItemFormModalOpen(true);
  };

  const openEditItemModal = (item: ConsumableItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      spec: item.spec,
      unit: item.unit,
      currentStock: item.currentStock,
      safeStock: item.safeStock,
      notes: item.notes || ""
    });
    setIsItemFormModalOpen(true);
  };

  const handleSaveItemForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("耗材名稱不可為空！");
      return;
    }

    const nowStr = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false }).replace(/\//g, "-");

    if (editingItem) {
      // Edit
      const updatedItem = {
        id: editingItem.id,
        name: formData.name.trim(),
        category: formData.category,
        spec: formData.spec.trim(),
        unit: formData.unit.trim(),
        safeStock: Number(formData.safeStock) || 0,
        notes: formData.notes.trim()
      };

      setItems(prev => prev.map(it => it.id === editingItem.id ? {
        ...it,
        ...updatedItem,
        updatedAt: nowStr
      } : it));

      // 雲端同步
      sendConsumablesWebhook({
        action: "update_item",
        token: "authorized_ebbthings",
        item: updatedItem
      }).catch(e => console.warn(e));

      showToast("耗材資料已更新！", "success");
    } else {
      // Add
      const nextId = `CON-${String(items.length + 1).padStart(3, "0")}`;
      const newItem: ConsumableItem = {
        id: nextId,
        name: formData.name.trim(),
        category: formData.category,
        spec: formData.spec.trim(),
        unit: formData.unit.trim(),
        currentStock: Number(formData.currentStock) || 0,
        safeStock: Number(formData.safeStock) || 0,
        notes: formData.notes.trim(),
        status: "active",
        createdAt: nowStr,
        updatedAt: nowStr
      };

      setItems(prev => [...prev, newItem]);

      // 雲端同步
      sendConsumablesWebhook({
        action: "add_item",
        token: "authorized_ebbthings",
        item: newItem
      }).catch(e => console.warn(e));

      // If initial stock > 0, log an initial entry
      if (newItem.currentStock > 0) {
        const initTx: ConsumableTransaction = {
          id: `TX-${Date.now()}`,
          timestamp: nowStr,
          consumableId: nextId,
          consumableName: newItem.name,
          type: "補貨入庫",
          changeQty: newItem.currentStock,
          prevStock: 0,
          afterStock: newItem.currentStock,
          operator: "管理員 (建檔)",
          isListedMember: "是",
          notes: "新品項初始建檔入庫"
        };
        setTransactions(prev => [initTx, ...prev]);
      }
      showToast("耗材品項新增成功！", "success");
    }

    setIsItemFormModalOpen(false);
  };

  // Toggle Active/Inactive
  const handleToggleStatus = (item: ConsumableItem) => {
    const nextStatus = item.status === "active" ? "inactive" : "active";
    const statusText = nextStatus === "active" ? "啟用" : "停用";
    if (confirm(`確定要將「${item.name}」變更為【${statusText}】嗎？`)) {
      setItems(prev => prev.map(it => it.id === item.id ? { ...it, status: nextStatus } : it));

      // 雲端同步
      sendConsumablesWebhook({
        action: "toggle_status",
        token: "authorized_ebbthings",
        itemId: item.id,
        newStatus: nextStatus
      }).catch(e => console.warn(e));

      showToast(`已將「${item.name}」設定為${statusText}！`, "info");
    }
  };

  // --------------------------------------------------------------------------
  // 7. Stocktake Audit System (定期盤點功能 - 管理員)
  // --------------------------------------------------------------------------
  const activeAudit = useMemo(() => {
    return audits.find(a => a.status === "in_progress") || null;
  }, [audits]);

  const [activeAuditDetails, setActiveAuditDetails] = useState<StocktakeAuditDetail[]>([]);
  const [auditNotes, setAuditNotes] = useState("");

  // Sync active audit details to local state when opening active audit
  useEffect(() => {
    if (activeAudit) {
      setActiveAuditDetails(activeAudit.details);
      setAuditNotes(activeAudit.notes || "");
    }
  }, [activeAudit]);

  // Calculate days since last completed audit
  const daysSinceLastAudit = useMemo(() => {
    const completed = audits.filter(a => a.status === "completed");
    if (completed.length === 0) return null;
    const lastDate = new Date(completed[0].completedTime || completed[0].startTime);
    if (isNaN(lastDate.getTime())) return null;
    const diffMs = Date.now() - lastDate.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }, [audits]);

  const isAuditOverdue = daysSinceLastAudit !== null && daysSinceLastAudit >= 30;

  // Start new stocktake
  const handleStartAudit = () => {
    if (activeAudit) {
      alert("目前已有進行中的盤點單，請先完成或結案！");
      return;
    }

    const nowStr = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false }).replace(/\//g, "-");
    const auditId = `AUDIT-${nowStr.slice(0, 10).replace(/-/g, "")}`;

    // Snapshot book stock of all active consumables
    const activeItems = items.filter(it => it.status === "active");
    const details: StocktakeAuditDetail[] = activeItems.map(it => ({
      consumableId: it.id,
      consumableName: it.name,
      spec: it.spec,
      unit: it.unit,
      bookQty: it.currentStock,
      countedQty: it.currentStock, // 預設實盤帶入帳面
      difference: 0,
      notes: ""
    }));

    const newAudit: StocktakeAudit = {
      auditId,
      startTime: nowStr,
      status: "in_progress",
      operator: "管理員 (Admin)",
      notes: "定期庫存盤點 (進行中)",
      details
    };

    setAudits(prev => [newAudit, ...prev]);
    setActiveAuditDetails(details);
    showToast(`盤點單 ${auditId} 已發起！已鎖定帳面庫存快照。`, "success");
  };

  // Update a single item's counted qty in active audit
  const handleUpdateAuditCount = (consumableId: string, counted: number, notes?: string) => {
    setActiveAuditDetails(prev => prev.map(d => {
      if (d.consumableId === consumableId) {
        const validCount = Math.max(0, isNaN(counted) ? 0 : counted);
        const diff = validCount - d.bookQty;
        return {
          ...d,
          countedQty: validCount,
          difference: diff,
          notes: notes !== undefined ? notes : d.notes
        };
      }
      return d;
    }));
  };

  // Quick fill all with book qty
  const handleFillAllWithBookQty = () => {
    setActiveAuditDetails(prev => prev.map(d => ({
      ...d,
      countedQty: d.bookQty,
      difference: 0
    })));
    showToast("已將所有耗材實盤數快速代入帳面數", "info");
  };

  // Save audit draft
  const handleSaveAuditDraft = () => {
    if (!activeAudit) return;
    setAudits(prev => prev.map(a => a.auditId === activeAudit.auditId ? {
      ...a,
      notes: auditNotes,
      details: activeAuditDetails
    } : a));
    showToast("盤點草稿已暫存！可隨時返回繼續填寫。", "success");
  };

  // Complete Audit (Finalize and overwrite inventory)
  const handleCompleteAudit = () => {
    if (!activeAudit) return;

    const diffCount = activeAuditDetails.filter(d => d.difference !== 0).length;
    const confirmMsg = `即將完成盤點！\n• 共有 ${diffCount} 項耗材存在盤盈/盤虧差異。\n• 系統將以「實盤數」為準覆蓋更新庫存，並自動寫入盤點差異調整紀錄。\n\n確定完成盤點嗎？`;

    if (!confirm(confirmMsg)) return;

    const nowStr = new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false }).replace(/\//g, "-");

    // 1. Overwrite inventory & generate adjustment logs
    const newLogs: ConsumableTransaction[] = [];
    const updatedItems = items.map(it => {
      const matchAudit = activeAuditDetails.find(d => d.consumableId === it.id);
      if (matchAudit) {
        const oldStock = it.currentStock;
        const counted = matchAudit.countedQty;
        const diff = counted - oldStock; // real diff between current and counted

        if (diff !== 0) {
          newLogs.push({
            id: `TX-${Date.now()}-${it.id}`,
            timestamp: nowStr,
            consumableId: it.id,
            consumableName: it.name,
            type: "盤點調整",
            changeQty: diff,
            prevStock: oldStock,
            afterStock: counted,
            operator: "管理員 (定期盤點)",
            isListedMember: "是",
            notes: (matchAudit.notes ? matchAudit.notes + " " : "") + `[盤點單: ${activeAudit.auditId}]`
          });
        }

        return {
          ...it,
          currentStock: counted,
          updatedAt: nowStr
        };
      }
      return it;
    });

    setItems(updatedItems);
    if (newLogs.length > 0) {
      setTransactions(prev => [...newLogs, ...prev]);
    }

    // 2. Mark audit as completed
    setAudits(prev => prev.map(a => a.auditId === activeAudit.auditId ? {
      ...a,
      completedTime: nowStr,
      status: "completed",
      notes: auditNotes,
      details: activeAuditDetails
    } : a));

    // 3. 雲端同步
    sendConsumablesWebhook({
      action: "complete_audit",
      token: "authorized_ebbthings",
      auditId: activeAudit.auditId,
      details: activeAuditDetails,
      notes: auditNotes
    }).catch(e => console.warn(e));

    showToast(`盤點已圓滿完成！共校正 ${diffCount} 項庫存差異。`, "success");
  };

  // --------------------------------------------------------------------------
  // 8. Filters & Computed Data
  // --------------------------------------------------------------------------
  const filteredItems = useMemo(() => {
    return items.filter(it => {
      // Category filter
      if (selectedCategory !== "全部類別" && it.category !== selectedCategory) {
        return false;
      }
      // Low stock tab
      if (currentTab === "low_stock" && it.currentStock > it.safeStock) {
        return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          it.name.toLowerCase().includes(q) ||
          it.spec.toLowerCase().includes(q) ||
          it.id.toLowerCase().includes(q) ||
          it.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, selectedCategory, currentTab, searchQuery]);

  // Overall Statistics
  const stats = useMemo(() => {
    const activeCount = items.filter(i => i.status === "active").length;
    const totalUnits = items.reduce((sum, i) => sum + i.currentStock, 0);
    const lowStockCount = items.filter(i => i.status === "active" && i.currentStock <= i.safeStock).length;
    
    // Pickups this month
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyPickupCount = transactions.filter(t => t.type === "領取" && t.timestamp.startsWith(currentMonth)).length;

    return {
      activeCount,
      totalUnits,
      lowStockCount,
      monthlyPickupCount
    };
  }, [items, transactions]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ["異動時間", "耗材ID", "耗材名稱", "異動類型", "數量變化", "前庫存", "後庫存", "領取/操作人員", "是否名單內", "備註說明"];
    const rows = transactions.map(t => [
      t.timestamp,
      t.consumableId,
      `"${t.consumableName.replace(/"/g, '""')}"`,
      t.type,
      t.changeQty,
      t.prevStock,
      t.afterStock,
      `"${t.operator.replace(/"/g, '""')}"`,
      t.isListedMember,
      `"${(t.notes || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `EBB_Lab_Consumables_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    showToast("異動紀錄 CSV 匯出成功！", "success");
  };

  // 異動紀錄分頁篩選後的資料
  const filteredHistoryTransactions = useMemo(() => {
    if (historyTabTypeFilter === "全部類型") return transactions;
    return transactions.filter(t => t.type === historyTabTypeFilter);
  }, [transactions, historyTabTypeFilter]);

  // 單一品項異動紀錄匯出 CSV
  const handleExportItemCSV = (item: ConsumableItem) => {
    const itemTxs = transactions.filter(t => t.consumableId === item.id);
    const headers = ["異動時間", "耗材ID", "耗材名稱", "異動類型", "數量變化", "前庫存", "後庫存", "領取/經手人員", "是否名單內", "備註說明"];
    const rows = itemTxs.map(t => [
      t.timestamp,
      t.consumableId,
      `"${t.consumableName.replace(/"/g, '""')}"`,
      t.type,
      t.changeQty,
      t.prevStock,
      t.afterStock,
      `"${t.operator.replace(/"/g, '""')}"`,
      t.isListedMember,
      `"${(t.notes || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `耗材領用歷程_${item.id}_${item.name.slice(0, 15)}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`【${item.name}】歷史領用紀錄 CSV 匯出成功！`, "success");
  };

  // 全實驗室所有領用紀錄匯出 CSV
  const handleExportAllPickupsCSV = () => {
    const pickupTxs = transactions.filter(t => t.type === "領取");
    const headers = ["領用時間", "耗材ID", "耗材名稱", "領用數量", "前庫存", "後庫存", "領用人員", "是否名單內", "實驗備註/用途"];
    const rows = pickupTxs.map(t => [
      t.timestamp,
      t.consumableId,
      `"${t.consumableName.replace(/"/g, '""')}"`,
      Math.abs(t.changeQty),
      t.prevStock,
      t.afterStock,
      `"${t.operator.replace(/"/g, '""')}"`,
      t.isListedMember,
      `"${(t.notes || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `EBB_Lab_全部耗材領用登記總表_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("全實驗室耗材領用紀錄 CSV 匯出成功！", "success");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-16">
      {/* -------------------- Top Notification Toast -------------------- */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className={`px-4 py-3 rounded-md shadow-lg border text-sm font-medium flex items-center gap-2 ${
            toastMessage.type === "success" 
              ? "bg-emerald-50 border-emerald-300 text-emerald-900" 
              : toastMessage.type === "error"
              ? "bg-rose-50 border-rose-300 text-rose-900"
              : "bg-blue-50 border-blue-300 text-blue-900"
          }`}>
            {toastMessage.type === "success" && <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />}
            {toastMessage.type === "error" && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
            {toastMessage.type === "info" && <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* -------------------- Page Header Banner -------------------- */}
      <div className="p-6 bg-[#fbfbfa] border border-[#e5e5e0] rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold text-[#8d734a] tracking-[0.2em] uppercase font-serif italic">
              Lab Consumables & Stocktake Management
            </span>
            <span className="px-2 py-0.5 bg-[#1b4372]/10 text-[#1b4372] rounded text-[10px] font-mono font-bold">
              Google Sheet Sync
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-serif flex items-center gap-2">
            <Boxes className="w-7 h-7 text-[#1b4372]" />
            <span>Lab Consumables Statistics</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            實驗室耗材種類與數量實時統計 · 線上自助領用登記 · 低庫存預警與定期盤點系統
          </p>
        </div>

        {/* Admin Login / Logout & Cloud Sync Section */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Cloud Sync Button */}
          <button
            type="button"
            onClick={() => syncWithCloud(false)}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-sm text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-60 whitespace-nowrap"
            title={lastSyncTime ? `上次同步：${lastSyncTime}（點擊重新同步 Google 試算表最新庫存）` : "立即與 Google 試算表雙向同步最新耗材與領用資料"}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-700 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "同步中..." : "同步雲端"}</span>
          </button>
          {isAdmin ? (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <div className="text-left text-xs">
                <span className="text-emerald-900 font-bold block">耗材管理已解鎖</span>
                <span className="text-emerald-700 text-[10px] font-mono">Token Active (2h)</span>
              </div>
              <button
                type="button"
                onClick={handleAdminLogout}
                className="ml-2 px-2 py-1 bg-white hover:bg-slate-50 border border-emerald-300 text-emerald-800 rounded text-xs font-bold transition shadow-2xs"
              >
                登出
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setLoginPasswordInput("");
                setLoginError("");
                setIsLoginModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-[#e5e5e0] text-slate-700 hover:text-[#1b4372] rounded-sm text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>管理員登入</span>
            </button>
          )}

          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-sm text-xs font-medium transition"
            >
              返回首頁
            </button>
          )}
        </div>
      </div>

      {/* -------------------- Stocktake Overdue Alert Banner -------------------- */}
      {isAuditOverdue && (
        <div className="p-3.5 bg-amber-50 border-l-4 border-amber-500 rounded-r-sm flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>定期盤點提醒：</strong>
              距上次完成盤點已逾 <strong>{daysSinceLastAudit} 天</strong>（設定警戒為 30 天）。建議管理員於本週排定全面盤點，以確保帳實相符！
            </span>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setCurrentTab("audit")}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold shrink-0 transition"
            >
              前往盤點
            </button>
          )}
        </div>
      )}

      {/* -------------------- Top Overview Metric Cards -------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-3.5 bg-white border border-[#e5e5e0] rounded-sm shadow-2xs space-y-1">
          <span className="text-[11px] text-slate-500 font-medium block">啟用中耗材品項</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-[#1b4372]">{stats.activeCount}</span>
            <span className="text-[11px] text-slate-400">種品項</span>
          </div>
        </div>

        <div className="p-3.5 bg-white border border-[#e5e5e0] rounded-sm shadow-2xs space-y-1">
          <span className="text-[11px] text-slate-500 font-medium block">在庫總量統計</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-800">{stats.totalUnits.toLocaleString()}</span>
            <span className="text-[11px] text-slate-400">件/單位</span>
          </div>
        </div>

        <div className={`p-3.5 rounded-sm border shadow-2xs space-y-1 transition ${
          stats.lowStockCount > 0 ? "bg-rose-50/70 border-rose-300" : "bg-white border-[#e5e5e0]"
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-medium block ${stats.lowStockCount > 0 ? "text-rose-700" : "text-slate-500"}`}>
              庫存偏低警示
            </span>
            {stats.lowStockCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            )}
          </div>
          <div className="flex items-baseline justify-between">
            <span className={`text-2xl font-bold font-mono ${stats.lowStockCount > 0 ? "text-rose-700" : "text-slate-800"}`}>
              {stats.lowStockCount}
            </span>
            <span className="text-[11px] text-rose-600 font-medium">需補貨</span>
          </div>
        </div>

        <div 
          onClick={() => setIsAllPickupsModalOpen(true)}
          className="p-3.5 bg-white hover:bg-slate-50 border border-[#e5e5e0] hover:border-[#1b4372]/40 rounded-sm shadow-2xs space-y-1 cursor-pointer transition group"
          title="點擊查看實驗室全部耗材領用登記明細"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-medium block group-hover:text-[#1b4372] transition">
              本月累計領用
            </span>
            <History className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#1b4372] transition" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-emerald-700">{stats.monthlyPickupCount}</span>
            <span className="text-[11px] text-slate-400 group-hover:text-[#1b4372] transition">次登記 ↗</span>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-2 lg:col-span-1 p-3.5 bg-white border border-[#e5e5e0] rounded-sm shadow-2xs space-y-1">
          <span className="text-[11px] text-slate-500 font-medium block">距上次盤點</span>
          <div className="flex items-baseline justify-between">
            <span className={`text-2xl font-bold font-mono ${isAuditOverdue ? "text-amber-700" : "text-[#1b4372]"}`}>
              {daysSinceLastAudit !== null ? daysSinceLastAudit : "-"}
            </span>
            <span className="text-[11px] text-slate-400">天前</span>
          </div>
        </div>
      </div>

      {/* -------------------- Navigation Tabs & Toolbar -------------------- */}
      <div className="border-b border-[#e5e5e0] flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setCurrentTab("catalog")}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              currentTab === "catalog"
                ? "border-[#1b4372] text-[#1b4372] bg-white/60"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            耗材清單與線上領取
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab("low_stock")}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              currentTab === "low_stock"
                ? "border-[#1b4372] text-[#1b4372] bg-white/60"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>低庫存清單</span>
            {stats.lowStockCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 text-[10px] font-mono font-bold">
                {stats.lowStockCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab("history")}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              currentTab === "history"
                ? "border-[#1b4372] text-[#1b4372] bg-white/60"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            全部異動紀錄
          </button>

          {/* Admin Tabs */}
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => setCurrentTab("audit")}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                  currentTab === "audit"
                    ? "border-[#8d734a] text-[#8d734a] bg-amber-50/50"
                    : "border-transparent text-amber-800 hover:text-amber-900"
                }`}
              >
                <ClipboardCheck className="w-3.5 h-3.5 text-[#8d734a]" />
                <span>定期盤點系統</span>
                {activeAudit && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setCurrentTab("manage")}
                className={`px-3 py-2 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
                  currentTab === "manage"
                    ? "border-[#1b4372] text-[#1b4372] bg-white/60"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-[#1b4372]" />
                <span>品項入庫與管理</span>
              </button>
            </>
          )}
        </div>

        {/* Admin Quick Action Buttons */}
        {isAdmin && (
          <div className="flex items-center gap-2 pb-1">
            <button
              type="button"
              onClick={openAddItemModal}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1b4372] hover:bg-[#15345a] text-white rounded-sm text-xs font-bold transition shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增耗材</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (items.length > 0) {
                  setRestockItemId(items[0].id);
                  setIsRestockModalOpen(true);
                }
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-sm text-xs font-bold transition shadow-2xs"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>補貨入庫</span>
            </button>
          </div>
        )}
      </div>

      {/* -------------------- TAB 1 & 2: CATALOG & LOW STOCK -------------------- */}
      {(currentTab === "catalog" || currentTab === "low_stock") && (
        <div className="space-y-4">
          {/* Search & Category Filter Toolbar */}
          <div className="p-3 bg-white border border-[#e5e5e0] rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜尋耗材品名、規格型號、編號或類別 (如: 離心管、Tips、手套)..."
                className="w-full pl-9 pr-8 py-1.5 bg-[#fcfcfc] border border-slate-200 rounded-sm text-xs focus:border-[#1b4372] focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Selector & View All Pickups Button */}
            <div className="flex items-center gap-2 overflow-x-auto flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 shrink-0 flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  <span>類別:</span>
                </span>
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="bg-[#fcfcfc] border border-slate-200 rounded-sm px-2 py-1 text-xs text-slate-700 font-medium focus:border-[#1b4372] focus:outline-none"
                >
                  {CONSUMABLE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* View All Pickups Button */}
              <button
                type="button"
                onClick={() => setIsAllPickupsModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f0f4f9] hover:bg-[#e2ebf7] border border-[#1b4372]/30 text-[#1b4372] rounded-sm text-xs font-bold transition shadow-2xs whitespace-nowrap cursor-pointer active:scale-95"
                title="點擊彈窗檢視全實驗室所有領用登記紀錄明細"
              >
                <History className="w-3.5 h-3.5 text-[#1b4372]" />
                <span>查看全部領用紀錄</span>
                <span className="px-1.5 py-0.2 bg-[#1b4372] text-white text-[10px] rounded-full font-mono">
                  {totalPickupCount}
                </span>
              </button>
            </div>
          </div>

          {/* Consumables List Cards / Table */}
          <div className="bg-white border border-[#e5e5e0] rounded-sm overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8f8f5] text-slate-700 font-bold border-b border-[#e5e5e0] select-none">
                  <tr>
                    <th className="p-3 w-20">編號</th>
                    <th className="p-3">耗材名稱與型號規格</th>
                    <th className="p-3 w-28">分類</th>
                    <th className="p-3 text-right w-24">目前庫存</th>
                    <th className="p-3 text-right w-20">安全庫存</th>
                    <th className="p-3 w-24 text-center">庫存狀態</th>
                    <th className="p-3 w-48">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>上次領用人 / 時間</span>
                      </span>
                    </th>
                    <th className="p-3 text-right w-44">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                        查無符合篩選條件的耗材品項。請嘗試清除搜尋字詞或切換類別！
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map(item => {
                      const isLowStock = item.currentStock <= item.safeStock;
                      const isOutOfStock = item.currentStock <= 0;
                      const isInactive = item.status === "inactive";
                      const lastPickup = lastPickupMap.get(item.id);

                      return (
                        <tr 
                          key={item.id}
                          className={`hover:bg-slate-50/70 transition ${
                            isInactive ? "opacity-50 bg-slate-50/50" : isLowStock ? "bg-amber-50/20" : ""
                          }`}
                        >
                          {/* ID */}
                          <td className="p-3 font-mono font-bold text-slate-500">
                            {item.id}
                          </td>

                          {/* Name & Spec */}
                          <td className="p-3">
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                              <span>{item.name}</span>
                              {isInactive && (
                                <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-600 text-[10px] font-normal">
                                  已停用
                                </span>
                              )}
                            </div>
                            <div className="text-slate-500 text-xs mt-0.5">
                              {item.spec}
                            </div>
                            {item.notes && (
                              <div className="text-slate-400 text-[11px] mt-0.5 italic">
                                備註: {item.notes}
                              </div>
                            )}
                          </td>

                          {/* Category */}
                          <td className="p-3 text-slate-600">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px]">
                              {item.category}
                            </span>
                          </td>

                          {/* Current Stock */}
                          <td className="p-3 text-right font-mono font-bold text-base">
                            <span className={
                              isOutOfStock 
                                ? "text-rose-600" 
                                : isLowStock 
                                ? "text-amber-600" 
                                : "text-[#1b4372]"
                            }>
                              {item.currentStock}
                            </span>
                            <span className="text-[11px] text-slate-400 font-sans ml-1">
                              {item.unit}
                            </span>
                          </td>

                          {/* Safe Stock */}
                          <td className="p-3 text-right font-mono text-slate-500">
                            {item.safeStock} {item.unit}
                          </td>

                          {/* Stock Status Badge */}
                          <td className="p-3 text-center">
                            {isOutOfStock ? (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded text-[10px] font-bold">
                                已無庫存
                              </span>
                            ) : isLowStock ? (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded text-[10px] font-bold">
                                庫存偏低
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-medium">
                                充裕正常
                              </span>
                            )}
                          </td>

                          {/* Last Pickup Info (上次領用人與時間) */}
                          <td className="p-3">
                            {lastPickup ? (
                              <div 
                                onClick={() => {
                                  setSelectedHistoryItem(item);
                                  setHistoryScope("pickup_only");
                                  setItemHistorySearch("");
                                }}
                                className="group cursor-pointer p-1.5 -m-1 rounded hover:bg-slate-100 transition"
                                title="點擊查看該品項所有歷史領用紀錄"
                              >
                                <div className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 text-[#1b4372] shrink-0" />
                                  <span className="truncate group-hover:text-[#1b4372] transition font-medium">
                                    {lastPickup.operator}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono mt-0.5">
                                  <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>{lastPickup.timestamp}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 truncate max-w-[170px] mt-0.5">
                                  領取 {Math.abs(lastPickup.changeQty)} {item.unit}
                                  {lastPickup.notes ? ` · ${lastPickup.notes}` : ""}
                                </div>
                              </div>
                            ) : (
                              <div className="text-slate-400 text-xs italic flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-300" />
                                <span>尚無領用紀錄</span>
                              </div>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                            {/* View History Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedHistoryItem(item);
                                setHistoryScope("pickup_only");
                                setItemHistorySearch("");
                              }}
                              title="查看此品項的所有歷史領用紀錄"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-sm text-xs font-medium transition cursor-pointer active:scale-95 shadow-2xs"
                            >
                              <History className="w-3.5 h-3.5 text-slate-500" />
                              <span>領用紀錄</span>
                            </button>

                            {/* General Pickup Button */}
                            <button
                              type="button"
                              onClick={() => openPickupModal(item)}
                              disabled={isOutOfStock || isInactive}
                              className={`px-3 py-1.5 rounded-sm font-bold text-xs transition shadow-2xs ${
                                isOutOfStock || isInactive
                                  ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                                  : "bg-[#1b4372] hover:bg-[#122e4f] text-white cursor-pointer active:scale-95"
                              }`}
                            >
                              {isOutOfStock ? "已無庫存" : "領取登記"}
                            </button>

                            {/* Admin Quick Adjust Button */}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => openAdjustModal(item)}
                                title="修正庫存"
                                className="px-2 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-sm text-xs transition cursor-pointer"
                              >
                                校正
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB 3: TRANSACTION LOGS -------------------- */}
      {currentTab === "history" && (
        <div className="space-y-4">
          <div className="p-3 bg-white border border-[#e5e5e0] rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-slate-500 font-medium shrink-0 flex items-center gap-1">
                <ListFilter className="w-3.5 h-3.5 text-slate-400" />
                <span>篩選類型:</span>
              </span>
              {[
                { label: "全部異動", val: "全部類型", count: transactions.length },
                { label: "僅看領取紀錄", val: "領取", count: totalPickupCount },
                { label: "補貨入庫", val: "補貨入庫", count: transactions.filter(t => t.type === "補貨入庫").length },
                { label: "盤點調整", val: "盤點調整", count: transactions.filter(t => t.type === "盤點調整").length },
                { label: "手動修正", val: "手動修正", count: transactions.filter(t => t.type === "手動修正").length }
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setHistoryTabTypeFilter(opt.val)}
                  className={`px-2.5 py-1 rounded-sm text-xs font-medium transition cursor-pointer flex items-center gap-1 ${
                    historyTabTypeFilter === opt.val
                      ? "bg-[#1b4372] text-white font-bold shadow-2xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  <span>{opt.label}</span>
                  <span className={`px-1 rounded-full text-[10px] font-mono ${
                    historyTabTypeFilter === opt.val ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                  }`}>
                    {opt.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-sm text-xs font-bold transition shadow-2xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#1b4372]" />
                <span>匯出 CSV 檔</span>
              </button>
            </div>
          </div>

          <div className="bg-white border border-[#e5e5e0] rounded-sm overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f8f8f5] text-slate-700 font-bold border-b border-[#e5e5e0]">
                  <tr>
                    <th className="p-3 w-36">時間</th>
                    <th className="p-3 w-28">類型</th>
                    <th className="p-3">耗材名稱</th>
                    <th className="p-3 text-right w-24">數量變化</th>
                    <th className="p-3 text-right w-28">前庫存 ➔ 後庫存</th>
                    <th className="p-3 w-36">領取 / 經手人</th>
                    <th className="p-3">備註說明</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistoryTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                        目前分類篩選下尚無相關紀錄。
                      </td>
                    </tr>
                  ) : (
                    filteredHistoryTransactions.map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50/70 transition">
                        <td className="p-3 text-slate-500 font-mono">
                          {tx.timestamp}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            tx.type === "領取"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : tx.type === "補貨入庫"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : tx.type === "盤點調整"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-slate-900">
                          {tx.consumableName}
                        </td>
                        <td className="p-3 text-right font-mono font-bold">
                          <span className={tx.changeQty < 0 ? "text-rose-600" : "text-emerald-600"}>
                            {tx.changeQty > 0 ? `+${tx.changeQty}` : tx.changeQty}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-slate-500 text-[11px]">
                          {tx.prevStock} ➔ <span className="font-bold text-slate-800">{tx.afterStock}</span>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-slate-800">{tx.operator}</div>
                          {tx.isListedMember === "否" && (
                            <span className="text-[10px] text-amber-600 font-mono">(非名單外訪客)</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-500 text-xs">
                          {tx.notes || "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB 4: STOCKTAKE AUDIT (管理員專用) -------------------- */}
      {isAdmin && currentTab === "audit" && (
        <div className="space-y-6">
          {/* Active Audit Session */}
          {activeAudit ? (
            <div className="p-5 bg-white border border-[#8d734a]/40 rounded-sm shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                      盤點進行中 (Active)
                    </span>
                    <h3 className="text-base font-bold text-slate-900 font-serif">
                      盤點單號：{activeAudit.auditId}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    發起時間：{activeAudit.startTime} · 發起人：{activeAudit.operator}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleFillAllWithBookQty}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition"
                  >
                    全填帳面數
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAuditDraft}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded text-xs font-bold transition shadow-2xs"
                  >
                    <Save className="w-3.5 h-3.5 text-slate-500" />
                    <span>暫存草稿</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCompleteAudit}
                    className="inline-flex items-center gap-1 px-3.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold transition shadow-2xs"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>完成盤點並覆蓋庫存</span>
                  </button>
                </div>
              </div>

              {/* Behavior Note */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 leading-relaxed">
                <strong>💡 盤點作業須知：</strong>
                盤點進行中時，一般同學仍可正常登記領用。完成盤點時，系統將以您在此表所填寫的「<strong>實盤數</strong>」全面校準覆蓋庫存，並將差額自動記入異動紀錄（類型為盤點調整）。
              </div>

              {/* Stocktake Table */}
              <div className="border border-[#e5e5e0] rounded-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#f8f8f5] text-slate-700 font-bold border-b border-[#e5e5e0]">
                    <tr>
                      <th className="p-2.5 w-20">編號</th>
                      <th className="p-2.5">耗材品名與規格</th>
                      <th className="p-2.5 text-right w-24">帳面庫存</th>
                      <th className="p-2.5 text-right w-32">實盤數 (輸入)</th>
                      <th className="p-2.5 text-right w-24">差異 (實-帳)</th>
                      <th className="p-2.5">盤點備註</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeAuditDetails.map(item => {
                      const isDiff = item.difference !== 0;
                      return (
                        <tr key={item.consumableId} className={isDiff ? "bg-amber-50/30" : ""}>
                          <td className="p-2.5 font-mono text-slate-500">{item.consumableId}</td>
                          <td className="p-2.5">
                            <span className="font-bold text-slate-800 block">{item.consumableName}</span>
                            <span className="text-[11px] text-slate-500">{item.spec} ({item.unit})</span>
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-700">
                            {item.bookQty}
                          </td>
                          <td className="p-2.5 text-right">
                            <input
                              type="number"
                              min={0}
                              value={item.countedQty}
                              onChange={e => handleUpdateAuditCount(item.consumableId, parseInt(e.target.value, 10) || 0)}
                              className="w-24 p-1 text-right font-mono font-bold border border-slate-300 rounded focus:border-[#1b4372] focus:outline-none"
                            />
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold">
                            <span className={
                              item.difference > 0 
                                ? "text-emerald-600" 
                                : item.difference < 0 
                                ? "text-rose-600" 
                                : "text-slate-400"
                            }>
                              {item.difference > 0 ? `+${item.difference}` : item.difference}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={item.notes || ""}
                              onChange={e => handleUpdateAuditCount(item.consumableId, item.countedQty, e.target.value)}
                              placeholder="例: 損耗/過期報廢"
                              className="w-full p-1 text-xs border border-slate-200 rounded text-slate-600"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Audit Summary Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">本次盤點總體說明/備註 (選填):</label>
                <input
                  type="text"
                  value={auditNotes}
                  onChange={e => setAuditNotes(e.target.value)}
                  placeholder="如: 定期年度耗材大盤點，已全面核對"
                  className="w-full p-2 border border-slate-200 rounded-sm text-xs"
                />
              </div>
            </div>
          ) : (
            <div className="p-6 bg-white border border-[#e5e5e0] rounded-sm text-center space-y-3">
              <Boxes className="w-12 h-12 text-[#8d734a] mx-auto opacity-80" />
              <h3 className="text-lg font-bold text-slate-900 font-serif">目前沒有正在進行中的盤點單</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                點擊「開始定期盤點」即可自動快照所有啟用耗材之帳面數，產生盤點清單以供現場實盤核對。
              </p>
              <button
                type="button"
                onClick={handleStartAudit}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#8d734a] hover:bg-[#78613e] text-white rounded-sm text-xs font-bold transition shadow-sm"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>發起新一輪定期盤點</span>
              </button>
            </div>
          )}

          {/* Past Audits History */}
          <div className="bg-white border border-[#e5e5e0] rounded-sm p-4 space-y-3">
            <h4 className="font-bold text-sm text-slate-900 font-serif flex items-center gap-1.5">
              <History className="w-4 h-4 text-[#1b4372]" />
              <span>過往盤點歷史紀錄 (Audit History)</span>
            </h4>
            <div className="divide-y divide-slate-100">
              {audits.filter(a => a.status === "completed").length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400">尚無過往完成的盤點紀錄。</div>
              ) : (
                audits.filter(a => a.status === "completed").map(audit => (
                  <div key={audit.auditId} className="py-3 flex items-start justify-between gap-4 text-xs">
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{audit.auditId}</span>
                        <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px]">
                          已完成
                        </span>
                      </div>
                      <div className="text-slate-500 mt-0.5">
                        完成時間：{audit.completedTime} · 盤點負責人：{audit.operator}
                      </div>
                      {audit.notes && (
                        <div className="text-slate-600 mt-1 italic">說明: {audit.notes}</div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[11px] text-slate-400 block">盤點品項數</span>
                      <span className="font-mono font-bold text-slate-700">
                        {audit.details.length} 項
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB 5: MANAGE (管理員品項管理) -------------------- */}
      {isAdmin && currentTab === "manage" && (
        <div className="space-y-4">
          <div className="p-4 bg-white border border-[#e5e5e0] rounded-sm flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900 font-serif">耗材品項維護與狀態設定</h3>
              <p className="text-xs text-slate-500">可新增、編輯耗材規格或停用/啟用耗材（保留所有歷史紀錄，不實體刪除）</p>
            </div>
            <button
              type="button"
              onClick={openAddItemModal}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1b4372] text-white rounded-sm text-xs font-bold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增品項</span>
            </button>
          </div>

          <div className="bg-white border border-[#e5e5e0] rounded-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8f8f5] text-slate-700 font-bold border-b border-[#e5e5e0]">
                <tr>
                  <th className="p-3 w-20">編號</th>
                  <th className="p-3">名稱與規格</th>
                  <th className="p-3 w-32">分類</th>
                  <th className="p-3 text-right w-24">目前庫存</th>
                  <th className="p-3 text-right w-24">安全庫存</th>
                  <th className="p-3 w-20 text-center">狀態</th>
                  <th className="p-3 text-right w-36">管理操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(item => (
                  <tr key={item.id} className={item.status === "inactive" ? "opacity-50 bg-slate-50" : ""}>
                    <td className="p-3 font-mono font-bold text-slate-500">{item.id}</td>
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <div className="text-slate-500 text-xs">{item.spec} ({item.unit})</div>
                    </td>
                    <td className="p-3 text-slate-600">{item.category}</td>
                    <td className="p-3 text-right font-mono font-bold text-[#1b4372]">{item.currentStock}</td>
                    <td className="p-3 text-right font-mono text-slate-500">{item.safeStock}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"
                      }`}>
                        {item.status === "active" ? "啟用中" : "已停用"}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => openEditItemModal(item)}
                        className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded text-xs text-slate-700 font-medium"
                      >
                        編輯
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(item)}
                        className={`px-2 py-1 rounded text-xs font-medium border ${
                          item.status === "active" 
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300" 
                            : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300"
                        }`}
                      >
                        {item.status === "active" ? "停用" : "重新啟用"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL 0.1: ITEM PICKUP HISTORY MODAL (特定耗材領用紀錄歷程彈窗)          */}
      {/* ---------------------------------------------------------------------- */}
      {selectedHistoryItem && (() => {
        const itemAllTxs = transactions.filter(t => t.consumableId === selectedHistoryItem.id);
        const itemPickups = itemAllTxs.filter(t => t.type === "領取");
        const lastPickup = lastPickupMap.get(selectedHistoryItem.id);
        const itemPickupStats = itemPickupStatsMap.get(selectedHistoryItem.id) || { count: 0, totalQty: 0 };
        const displayedItemTxs = (historyScope === "pickup_only" ? itemPickups : itemAllTxs)
          .filter(t => {
            if (!itemHistorySearch.trim()) return true;
            const q = itemHistorySearch.toLowerCase();
            return (
              t.operator.toLowerCase().includes(q) ||
              (t.notes || "").toLowerCase().includes(q) ||
              t.timestamp.includes(q)
            );
          })
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

        const isLow = selectedHistoryItem.currentStock <= selectedHistoryItem.safeStock;
        const isOut = selectedHistoryItem.currentStock <= 0;

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white border border-[#e5e5e0] rounded-sm max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in duration-150">
              {/* Header */}
              <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-3 bg-[#fbfbfa]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-[#8d734a] tracking-widest uppercase font-serif italic">
                      Usage History & Logs
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono text-[10px]">
                      {selectedHistoryItem.id}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px]">
                      {selectedHistoryItem.category}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 font-serif flex items-center gap-2">
                    <History className="w-5 h-5 text-[#1b4372]" />
                    <span>{selectedHistoryItem.name}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    型號規格：{selectedHistoryItem.spec}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedHistoryItem(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-sm hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Key Metrics Summary Cards */}
              <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50/60 border-b border-slate-200 text-xs">
                {/* 1. Current Stock */}
                <div className="p-3 bg-white border border-slate-200 rounded-sm">
                  <span className="text-slate-500 block text-[11px] mb-1">目前在席庫存</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-xl font-bold font-mono ${
                      isOut ? "text-rose-600" : isLow ? "text-amber-600" : "text-[#1b4372]"
                    }`}>
                      {selectedHistoryItem.currentStock}
                    </span>
                    <span className="text-slate-500">{selectedHistoryItem.unit}</span>
                  </div>
                  <div className="mt-1">
                    {isOut ? (
                      <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded text-[10px] font-bold">已無庫存</span>
                    ) : isLow ? (
                      <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded text-[10px] font-bold">庫存偏低需補貨</span>
                    ) : (
                      <span className="px-1.5 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px]">安全充裕</span>
                    )}
                  </div>
                </div>

                {/* 2. Last Pickup */}
                <div className="p-3 bg-white border border-slate-200 rounded-sm">
                  <span className="text-slate-500 block text-[11px] mb-1">上次領用紀錄</span>
                  {lastPickup ? (
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-[#1b4372]" />
                        <span>{lastPickup.operator}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{lastPickup.timestamp}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        領取 {Math.abs(lastPickup.changeQty)} {selectedHistoryItem.unit}
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400 italic text-[11px] mt-1">尚無任何領用紀錄</div>
                  )}
                </div>

                {/* 3. Total Pickups */}
                <div className="p-3 bg-white border border-slate-200 rounded-sm">
                  <span className="text-slate-500 block text-[11px] mb-1">累計領用統計</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold font-mono text-slate-800">
                      {itemPickupStats.count}
                    </span>
                    <span className="text-slate-500">次登記</span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    共領取 <strong className="text-slate-900 font-mono">{itemPickupStats.totalQty}</strong> {selectedHistoryItem.unit}
                  </div>
                </div>
              </div>

              {/* Toolbar: Scope Filter & Search & CSV */}
              <div className="p-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs bg-white">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setHistoryScope("pickup_only")}
                    className={`px-3 py-1.5 rounded-sm font-medium transition cursor-pointer ${
                      historyScope === "pickup_only"
                        ? "bg-[#1b4372] text-white font-bold shadow-2xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    僅看領用紀錄 ({itemPickups.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryScope("all")}
                    className={`px-3 py-1.5 rounded-sm font-medium transition cursor-pointer ${
                      historyScope === "all"
                        ? "bg-[#1b4372] text-white font-bold shadow-2xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                    }`}
                  >
                    全部異動明細 ({itemAllTxs.length})
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-52">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="搜尋領用人姓名或用途備註..."
                      value={itemHistorySearch}
                      onChange={e => setItemHistorySearch(e.target.value)}
                      className="w-full pl-8 pr-7 py-1 text-xs bg-slate-50 border border-slate-200 rounded-sm focus:border-[#1b4372] focus:outline-none"
                    />
                    {itemHistorySearch && (
                      <button
                        type="button"
                        onClick={() => setItemHistorySearch("")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExportItemCSV(selectedHistoryItem)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-sm text-xs font-medium transition cursor-pointer whitespace-nowrap shadow-2xs"
                    title="匯出此品項專屬紀錄 CSV"
                  >
                    <Download className="w-3 h-3 text-[#1b4372]" />
                    <span>匯出</span>
                  </button>
                </div>
              </div>

              {/* Transactions List */}
              <div className="flex-1 overflow-y-auto p-4 max-h-[50vh]">
                {displayedItemTxs.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 space-y-2">
                    <History className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs">
                      {itemHistorySearch ? "查無符合搜尋條件的紀錄。" : "此耗材品項目前尚無相關登記紀錄。"}
                    </p>
                    {!isOut && selectedHistoryItem.status === "active" && (
                      <button
                        type="button"
                        onClick={() => {
                          const item = selectedHistoryItem;
                          setSelectedHistoryItem(null);
                          openPickupModal(item);
                        }}
                        className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-[#1b4372] hover:bg-[#122e4f] text-white rounded-sm text-xs font-bold transition shadow-2xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>立即登記領取此耗材</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-sm overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#f8f8f5] text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5 w-36">領用/異動時間</th>
                          <th className="p-2.5 w-24">類型</th>
                          <th className="p-2.5 text-right w-20">數量變化</th>
                          <th className="p-2.5 text-right w-24">前 ➔ 後庫存</th>
                          <th className="p-2.5 w-32">領取 / 經手人</th>
                          <th className="p-2.5">實驗用途 / 備註</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {displayedItemTxs.map(tx => (
                          <tr key={tx.id} className="hover:bg-slate-50 transition">
                            <td className="p-2.5 font-mono text-slate-600 text-[11px]">
                              {tx.timestamp}
                            </td>
                            <td className="p-2.5">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                tx.type === "領取"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : tx.type === "補貨入庫"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : tx.type === "盤點調整"
                                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}>
                                {tx.type}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold">
                              <span className={tx.changeQty < 0 ? "text-rose-600" : "text-emerald-600"}>
                                {tx.changeQty > 0 ? `+${tx.changeQty}` : tx.changeQty} {selectedHistoryItem.unit}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-mono text-slate-500 text-[11px]">
                              {tx.prevStock} ➔ <span className="font-bold text-slate-800">{tx.afterStock}</span>
                            </td>
                            <td className="p-2.5">
                              <div className="font-medium text-slate-800">{tx.operator}</div>
                              {tx.isListedMember === "否" && (
                                <span className="text-[10px] text-amber-600 font-mono">(非名單外訪客)</span>
                              )}
                            </td>
                            <td className="p-2.5 text-slate-600 text-[11px]">
                              {tx.notes || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-200 bg-[#fbfbfa] flex items-center justify-between gap-3 text-xs">
                <div>
                  {!isOut && selectedHistoryItem.status === "active" && (
                    <button
                      type="button"
                      onClick={() => {
                        const item = selectedHistoryItem;
                        setSelectedHistoryItem(null);
                        openPickupModal(item);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1b4372] hover:bg-[#122e4f] text-white rounded-sm font-bold transition shadow-2xs cursor-pointer active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>領取此耗材登記</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedHistoryItem(null);
                      setIsAllPickupsModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-sm font-medium transition cursor-pointer"
                  >
                    查看全實驗室總表
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedHistoryItem(null)}
                    className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-sm font-bold transition cursor-pointer"
                  >
                    關閉
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL 0.2: ALL PICKUPS MODAL (全實驗室耗材領用紀錄總覽彈窗)              */}
      {/* ---------------------------------------------------------------------- */}
      {isAllPickupsModalOpen && (() => {
        const allPickups = transactions
          .filter(t => t.type === "領取")
          .filter(t => {
            if (allPickupsCategoryFilter !== "全部類別") {
              const it = items.find(i => i.id === t.consumableId);
              if (it && it.category !== allPickupsCategoryFilter) return false;
            }
            if (allPickupsSearch.trim()) {
              const q = allPickupsSearch.toLowerCase();
              return (
                t.consumableName.toLowerCase().includes(q) ||
                t.consumableId.toLowerCase().includes(q) ||
                t.operator.toLowerCase().includes(q) ||
                (t.notes || "").toLowerCase().includes(q) ||
                t.timestamp.includes(q)
              );
            }
            return true;
          })
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp));

        const uniquePickedItemsCount = new Set(transactions.filter(t => t.type === "領取").map(t => t.consumableId)).size;
        const totalQtySum = transactions
          .filter(t => t.type === "領取")
          .reduce((sum, t) => sum + Math.abs(t.changeQty), 0);

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white border border-[#e5e5e0] rounded-sm max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in duration-150">
              {/* Header */}
              <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-3 bg-[#fbfbfa]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-[#8d734a] tracking-widest uppercase font-serif italic">
                      Laboratory Consumables Registry
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#1b4372]/10 text-[#1b4372] font-mono text-[10px] font-bold">
                      All Pickups Overview
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 font-serif flex items-center gap-2">
                    <History className="w-6 h-6 text-[#1b4372]" />
                    <span>實驗室全部耗材領用紀錄</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    即時統整全實驗室成員、專題生與訪客之所有線上耗材領用登記歷史明細
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAllPickupsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-sm hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Overview Metrics Cards */}
              <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/70 border-b border-slate-200 text-xs">
                <div className="p-3 bg-white border border-slate-200 rounded-sm">
                  <span className="text-slate-500 block text-[11px] mb-0.5">累計領取登記</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-[#1b4372]">{totalPickupCount}</span>
                    <span className="text-slate-500 text-[11px]">筆紀錄</span>
                  </div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-sm">
                  <span className="text-slate-500 block text-[11px] mb-0.5">本月累計領用</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-emerald-700">{stats.monthlyPickupCount}</span>
                    <span className="text-slate-500 text-[11px]">次登記</span>
                  </div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-sm">
                  <span className="text-slate-500 block text-[11px] mb-0.5">曾領用品項涵蓋</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-slate-800">{uniquePickedItemsCount}</span>
                    <span className="text-slate-500 text-[11px]">種耗材</span>
                  </div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-sm">
                  <span className="text-slate-500 block text-[11px] mb-0.5">累計消耗總件數</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-slate-800">{totalQtySum}</span>
                    <span className="text-slate-500 text-[11px]">單位/包/盒</span>
                  </div>
                </div>
              </div>

              {/* Toolbar: Search & Category Filter & CSV */}
              <div className="p-3 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs bg-white">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="搜尋耗材品名、型號、編號、領用人姓名或實驗用途..."
                    value={allPickupsSearch}
                    onChange={e => setAllPickupsSearch(e.target.value)}
                    className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-sm focus:border-[#1b4372] focus:outline-none"
                  />
                  {allPickupsSearch && (
                    <button
                      type="button"
                      onClick={() => setAllPickupsSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Filter className="w-3 h-3" />
                      <span>類別:</span>
                    </span>
                    <select
                      value={allPickupsCategoryFilter}
                      onChange={e => setAllPickupsCategoryFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-sm px-2 py-1 text-xs text-slate-700 font-medium focus:border-[#1b4372] focus:outline-none"
                    >
                      {CONSUMABLE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportAllPickupsCSV}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-sm text-xs font-bold transition shadow-2xs cursor-pointer whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5 text-[#1b4372]" />
                    <span>匯出總表 CSV</span>
                  </button>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="flex-1 overflow-y-auto p-4 max-h-[52vh]">
                {allPickups.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 space-y-2">
                    <History className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs">查無符合搜尋或類別篩選條件的領用紀錄。</p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-sm overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#f8f8f5] text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="p-2.5 w-36">領用時間</th>
                          <th className="p-2.5">耗材品名與規格</th>
                          <th className="p-2.5 text-right w-24">領取數量</th>
                          <th className="p-2.5 text-right w-24">前 ➔ 後庫存</th>
                          <th className="p-2.5 w-36">領用人員</th>
                          <th className="p-2.5">實驗備註 / 用途說明</th>
                          <th className="p-2.5 w-20 text-center">品項歷程</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {allPickups.map(tx => {
                          const matchedItem = items.find(i => i.id === tx.consumableId);
                          return (
                            <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                              <td className="p-2.5 font-mono text-slate-600 text-[11px] whitespace-nowrap">
                                {tx.timestamp}
                              </td>
                              <td className="p-2.5">
                                <div className="font-bold text-slate-900">{tx.consumableName}</div>
                                {matchedItem && (
                                  <div className="text-[11px] text-slate-500 mt-0.5">
                                    {matchedItem.spec} · <span className="text-slate-400 font-mono">{matchedItem.id}</span>
                                  </div>
                                )}
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-rose-600">
                                {tx.changeQty} {matchedItem?.unit || "單位"}
                              </td>
                              <td className="p-2.5 text-right font-mono text-slate-500 text-[11px]">
                                {tx.prevStock} ➔ <span className="font-bold text-slate-800">{tx.afterStock}</span>
                              </td>
                              <td className="p-2.5">
                                <div className="font-semibold text-slate-800 flex items-center gap-1">
                                  <User className="w-3.5 h-3.5 text-[#1b4372] shrink-0" />
                                  <span>{tx.operator}</span>
                                </div>
                                {tx.isListedMember === "否" && (
                                  <span className="text-[10px] text-amber-600 font-mono">(非名單外訪客)</span>
                                )}
                              </td>
                              <td className="p-2.5 text-slate-600 text-[11px]">
                                {tx.notes || "-"}
                              </td>
                              <td className="p-2.5 text-center">
                                {matchedItem && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsAllPickupsModalOpen(false);
                                      setSelectedHistoryItem(matchedItem);
                                      setHistoryScope("pickup_only");
                                      setItemHistorySearch("");
                                    }}
                                    className="p-1 hover:bg-slate-200 text-slate-500 hover:text-[#1b4372] rounded text-[11px] font-medium transition cursor-pointer"
                                    title="查看此品項個別歷程"
                                  >
                                    歷程 ↗
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-200 bg-[#fbfbfa] flex items-center justify-between gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsAllPickupsModalOpen(false);
                    setHistoryTabTypeFilter("領取");
                    setCurrentTab("history");
                  }}
                  className="text-[#1b4372] hover:underline font-medium cursor-pointer"
                >
                  前往異動紀錄專頁檢視完整大表 ➔
                </button>

                <button
                  type="button"
                  onClick={() => setIsAllPickupsModalOpen(false)}
                  className="px-5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-sm font-bold transition cursor-pointer"
                >
                  關閉
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL 1: PICKUP REGISTRATION MODAL (一般使用者領取登記)                 */}
      {/* ---------------------------------------------------------------------- */}
      {selectedPickupItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#e5e5e0] rounded-sm max-w-lg w-full p-5 shadow-2xl space-y-4 animate-in fade-in duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#8d734a] tracking-widest uppercase font-serif italic">
                  Consumables Checkout
                </span>
                <h3 className="text-lg font-bold text-slate-900 font-serif">
                  耗材領取登記
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPickupItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Item Info */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm space-y-1 text-xs">
              <div className="font-bold text-sm text-slate-900">{selectedPickupItem.name}</div>
              <div className="text-slate-500">{selectedPickupItem.spec}</div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-slate-600">
                <span>目前在席庫存：</span>
                <span className="font-mono font-bold text-sm text-[#1b4372]">
                  {selectedPickupItem.currentStock} {selectedPickupItem.unit}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmPickup} className="space-y-4 text-xs">
              {/* Quantity Stepper */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  領取數量 ({selectedPickupItem.unit}) *
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPickupQty(Math.max(1, pickupQty - 1))}
                    className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded font-bold text-slate-700"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={selectedPickupItem.currentStock}
                    value={pickupQty}
                    onChange={e => setPickupQty(Math.min(selectedPickupItem.currentStock, Math.max(1, parseInt(e.target.value, 10) || 1)))}
                    className="w-24 text-center font-mono font-bold text-base py-1 border border-slate-300 rounded focus:border-[#1b4372] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setPickupQty(Math.min(selectedPickupItem.currentStock, pickupQty + 1))}
                    className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded font-bold text-slate-700"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickupQty(selectedPickupItem.currentStock)}
                    className="px-2 py-1 text-[11px] text-[#1b4372] border border-slate-200 hover:bg-slate-50 rounded"
                  >
                    全領 ({selectedPickupItem.currentStock})
                  </button>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  領取後剩餘庫存：<strong>{selectedPickupItem.currentStock - pickupQty}</strong> {selectedPickupItem.unit}
                </div>
              </div>

              {/* Picker Dropdown (from Lab Members List) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  領取人姓名 *
                </label>
                {!isOtherOperator ? (
                  <div className="space-y-1.5">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="搜尋或輸入學生姓名..."
                        value={memberSearchTerm}
                        onChange={e => {
                          setMemberSearchTerm(e.target.value);
                          setIsMemberDropdownOpen(true);
                        }}
                        onFocus={() => setIsMemberDropdownOpen(true)}
                        className="w-full p-2 border border-slate-300 rounded-sm text-xs focus:border-[#1b4372] focus:outline-none"
                      />
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Member Dropdown list */}
                    {isMemberDropdownOpen && (
                      <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-sm bg-white shadow-md divide-y divide-slate-100">
                        {filteredMemberList.map((mName, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setPickupOperator(mName);
                              setMemberSearchTerm(mName);
                              setIsMemberDropdownOpen(false);
                            }}
                            className="p-2 hover:bg-blue-50 cursor-pointer text-slate-700 flex items-center justify-between"
                          >
                            <span>{mName}</span>
                            {pickupOperator === mName && <CheckCircle className="w-3.5 h-3.5 text-[#1b4372]" />}
                          </div>
                        ))}
                        {filteredMemberList.length === 0 && (
                          <div className="p-2 text-slate-400 text-center">無符合姓名</div>
                        )}
                      </div>
                    )}

                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setIsOtherOperator(true);
                          setIsMemberDropdownOpen(false);
                        }}
                        className="text-[11px] text-[#1b4372] hover:underline"
                      >
                        不在名單內？切換至「其他（手動輸入姓名）」
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={otherOperatorName}
                      onChange={e => setOtherOperatorName(e.target.value)}
                      placeholder="請輸入領取人姓名 (如: 訪客學者、協同實驗室同學)..."
                      className="w-full p-2 border border-slate-300 rounded-sm text-xs focus:border-[#1b4372] focus:outline-none"
                    />
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => setIsOtherOperator(false)}
                        className="text-[11px] text-[#1b4372] hover:underline"
                      >
                        返回選擇實驗室固定名冊
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block font-medium text-slate-600 mb-1">
                  用途 / 實驗名稱備註 (選填):
                </label>
                <input
                  type="text"
                  value={pickupNotes}
                  onChange={e => setPickupNotes(e.target.value)}
                  placeholder=""
                  className="w-full p-2 border border-slate-200 rounded-sm text-xs focus:border-[#1b4372] focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedPickupItem(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-sm text-xs font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPickup}
                  className="px-4 py-1.5 bg-[#1b4372] hover:bg-[#122e4f] text-white rounded-sm text-xs font-bold transition shadow-sm disabled:opacity-50"
                >
                  {isSubmittingPickup ? "寫入中..." : "確認登記領取"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL 2: ADMIN LOGIN MODAL (密碼: ebbthings)                       */}
      {/* ---------------------------------------------------------------------- */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#e5e5e0] rounded-sm max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in fade-in duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#8d734a] tracking-widest uppercase font-serif italic">
                  Administrator Portal
                </span>
                <h3 className="text-base font-bold text-slate-900 font-serif">
                  耗材管理驗證
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-3 text-xs">
              <p className="text-slate-600">
                請輸入耗材管理專屬密碼，驗證通過後即可進行新增品項、補貨入庫、手動校正與定期盤點作業。
              </p>

              <div>
                <input
                  type="password"
                  value={loginPasswordInput}
                  onChange={e => setLoginPasswordInput(e.target.value)}
                  placeholder="請輸入密碼"
                  autoFocus
                  className="w-full p-2 border border-slate-300 rounded-sm text-xs focus:border-[#1b4372] focus:outline-none"
                />
                {loginError && (
                  <p className="text-rose-600 text-[11px] mt-1">{loginError}</p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-sm text-xs font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1b4372] hover:bg-[#122e4f] text-white rounded-sm text-xs font-bold transition shadow-sm"
                >
                  驗證並登入
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL 3: RESTOCK MODAL (補貨入庫 - 管理員)                             */}
      {/* ---------------------------------------------------------------------- */}
      {isRestockModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#e5e5e0] rounded-sm max-w-md w-full p-5 shadow-2xl space-y-4 animate-in fade-in duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#8d734a] tracking-widest uppercase font-serif italic">
                  Inventory Restock
                </span>
                <h3 className="text-base font-bold text-slate-900 font-serif">
                  耗材補貨入庫
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRestockModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmRestock} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">選擇補貨耗材 *</label>
                <select
                  value={restockItemId}
                  onChange={e => setRestockItemId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-sm text-xs focus:border-[#1b4372] focus:outline-none"
                >
                  {items.map(it => (
                    <option key={it.id} value={it.id}>
                      {it.name} (目前: {it.currentStock} {it.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">入庫數量 *</label>
                <input
                  type="number"
                  min={1}
                  value={restockQty}
                  onChange={e => setRestockQty(parseInt(e.target.value, 10) || 1)}
                  className="w-full p-2 border border-slate-300 rounded-sm text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">入庫備註/採購單號:</label>
                <input
                  type="text"
                  value={restockNotes}
                  onChange={e => setRestockNotes(e.target.value)}
                  placeholder="如: 請購批次到貨、廠牌 Sigma"
                  className="w-full p-2 border border-slate-200 rounded-sm text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRestockModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-sm text-xs"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-sm text-xs font-bold transition shadow-sm"
                >
                  確認入庫
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL 4: DIRECT ADJUST MODAL (手動修正庫存 - 管理員)                   */}
      {/* ---------------------------------------------------------------------- */}
      {isAdjustModalOpen && adjustItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#e5e5e0] rounded-sm max-w-md w-full p-5 shadow-2xl space-y-4 animate-in fade-in duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#8d734a] tracking-widest uppercase font-serif italic">
                  Direct Stock Correction
                </span>
                <h3 className="text-base font-bold text-slate-900 font-serif">
                  手動庫存直接修正
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded text-xs space-y-1">
              <div className="font-bold text-slate-900">{adjustItem.name}</div>
              <div className="text-slate-500">目前庫存：{adjustItem.currentStock} {adjustItem.unit}</div>
            </div>

            <form onSubmit={handleConfirmAdjust} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">目標修正後庫存 ({adjustItem.unit}) *</label>
                <input
                  type="number"
                  min={0}
                  value={adjustNewStock}
                  onChange={e => setAdjustNewStock(parseInt(e.target.value, 10) || 0)}
                  className="w-full p-2 border border-slate-300 rounded-sm text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">修正原因/說明 (必填) *</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder="例: 發現破損報廢 2 盒、遺失尋回"
                  required
                  className="w-full p-2 border border-slate-300 rounded-sm text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-sm text-xs"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1b4372] hover:bg-[#122e4f] text-white rounded-sm text-xs font-bold transition shadow-sm"
                >
                  確認修正
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL 5: ADD / EDIT ITEM MODAL (管理員新增與編輯耗材)                 */}
      {/* ---------------------------------------------------------------------- */}
      {isItemFormModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#e5e5e0] rounded-sm max-w-lg w-full p-5 shadow-2xl space-y-4 animate-in fade-in duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#8d734a] tracking-widest uppercase font-serif italic">
                  {editingItem ? "Edit Consumable Item" : "Create New Consumable Item"}
                </span>
                <h3 className="text-base font-bold text-slate-900 font-serif">
                  {editingItem ? "編輯耗材品項" : "新增耗材品項"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsItemFormModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItemForm} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">耗材名稱 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="如: 1.5 mL 微量離心管 (Microcentrifuge Tubes)"
                  required
                  className="w-full p-2 border border-slate-300 rounded-sm text-xs focus:border-[#1b4372] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">所屬類別 *</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-sm text-xs"
                  >
                    {CONSUMABLE_CATEGORIES.filter(c => c !== "全部類別").map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">計量單位 *</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="如: 盒、包、捲、個"
                    required
                    className="w-full p-2 border border-slate-300 rounded-sm text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">規格與型號說明:</label>
                <input
                  type="text"
                  value={formData.spec}
                  onChange={e => setFormData({ ...formData, spec: e.target.value })}
                  placeholder="如: 500支/包"
                  className="w-full p-2 border border-slate-300 rounded-sm text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {!editingItem && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">初始入庫數量 *</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.currentStock}
                      onChange={e => setFormData({ ...formData, currentStock: parseInt(e.target.value, 10) || 0 })}
                      className="w-full p-2 border border-slate-300 rounded-sm text-xs font-mono font-bold"
                    />
                  </div>
                )}

                <div className={editingItem ? "col-span-2" : ""}>
                  <label className="block font-bold text-slate-700 mb-1">安全庫存警戒值 *</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.safeStock}
                    onChange={e => setFormData({ ...formData, safeStock: parseInt(e.target.value, 10) || 0 })}
                    className="w-full p-2 border border-slate-300 rounded-sm text-xs font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">庫存小於或等於此值時將出現紅色警戒</span>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">補充備註說明:</label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="如: 需定期補貨、採購廠牌、使用注意事項"
                  className="w-full p-2 border border-slate-200 rounded-sm text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsItemFormModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-sm text-xs font-medium"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1b4372] hover:bg-[#122e4f] text-white rounded-sm text-xs font-bold transition shadow-sm"
                >
                  {editingItem ? "儲存修改" : "確認新增"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
