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
  Info,
  Globe,
  QrCode,
  ExternalLink,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  Printer,
  Settings,
  Smartphone,
  Share2
} from "lucide-react";
import QRCodeLib from "qrcode";
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
  sendConsumablesAdminAction,
  getValidAdminToken,
  getConsumablesWebhookUrl,
  getConsumablesScriptUrl,
  saveConsumablesScriptUrl,
  CONSUMABLES_ADMIN_PASSWORD,
  ADMIN_GAS_TOKEN_KEY
} from "../services/consumablesSyncService";

const STORAGE_KEY_ITEMS = "ebblab_consumables_items_sheet_v4";
const STORAGE_KEY_LOGS = "ebblab_consumables_logs_sheet_v4";
const STORAGE_KEY_AUDITS = "ebblab_consumables_audits_sheet_v4";
const STORAGE_KEY_ADMIN_LOGGED_IN = "ebblab_consumables_admin_logged_in_v4";
const STORAGE_KEY_LANG = "ebblab_consumables_lang";

export const CATEGORY_TRANSLATIONS: Record<string, { zh: string; en: string }> = {
  "全部類別": { zh: "全部類別", en: "All Categories" },
  "離心管與樣品瓶": { zh: "離心管與樣品瓶", en: "Centrifuge Tubes & Vials" },
  "滴管吸頭與針筒": { zh: "滴管吸頭與針筒", en: "Pipette Tips & Syringes" },
  "手套與防護用品": { zh: "手套與防護用品", en: "Gloves & PPE" },
  "濾膜與透析耗材": { zh: "濾膜與透析耗材", en: "Filters & Membranes" },
  "擦拭與清潔耗材": { zh: "擦拭與清潔耗材", en: "Wipes & Cleaning" },
  "培養與玻璃塑膠": { zh: "培養與玻璃塑膠", en: "Culture & Labware" },
  "封口標籤與滅菌": { zh: "封口標籤與滅菌", en: "Films, Labels & Sterilization" },
  "其他耗材": { zh: "其他耗材", en: "Other Consumables" }
};

export default function ConsumablesStatistics({ onBackToHome }: { onBackToHome?: () => void }) {
  // --------------------------------------------------------------------------
  // Language State: 'zh' (繁體中文) or 'en' (English) - 一鍵切換
  // --------------------------------------------------------------------------
  const [lang, setLang] = useState<"zh" | "en">(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LANG);
      if (saved === "en" || saved === "zh") return saved;
    } catch (e) {}
    return "zh";
  });

  const toggleLanguage = () => {
    const nextLang = lang === "zh" ? "en" : "zh";
    setLang(nextLang);
    try {
      localStorage.setItem(STORAGE_KEY_LANG, nextLang);
    } catch (e) {}
  };

  const getCategoryLabel = (cat: string) => {
    if (lang === "en") {
      return CATEGORY_TRANSLATIONS[cat]?.en || cat;
    }
    return CATEGORY_TRANSLATIONS[cat]?.zh || cat;
  };

  // --------------------------------------------------------------------------
  // 1. Data State (Items, Logs, Audits) - 數據均自 Google 試算表動態同步
  // --------------------------------------------------------------------------
  const [items, setItems] = useState<ConsumableItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_CONSUMABLES;
  });

  const [transactions, setTransactions] = useState<ConsumableTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LOGS);
      if (saved) return JSON.parse(saved);
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

  // 清除舊版本包含假資料的快取
  useEffect(() => {
    try {
      localStorage.removeItem("ebblab_consumables_items_v3");
      localStorage.removeItem("ebblab_consumables_logs_v3");
      localStorage.removeItem("ebblab_consumables_audits_v3");
      localStorage.removeItem("ebblab_consumables_items_v2");
      localStorage.removeItem("ebblab_consumables_logs_v2");
      localStorage.removeItem("ebblab_consumables_audits_v2");
      localStorage.removeItem("ebblab_consumables_items");
      localStorage.removeItem("ebblab_consumables_logs");
      localStorage.removeItem("ebblab_consumables_audits");
    } catch (e) {}
  }, []);

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
        if (Array.isArray(res.items)) {
          setItems(res.items);
        }
        if (Array.isArray(res.transactions)) {
          setTransactions(res.transactions);
        }
        if (Array.isArray(res.audits)) {
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
      return localStorage.getItem(STORAGE_KEY_ADMIN_LOGGED_IN) === "true";
    } catch (e) {
      return false;
    }
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginPasswordInput, setLoginPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const inputPass = loginPasswordInput.trim();
    if (inputPass === "ebbthings" || inputPass === CONSUMABLES_ADMIN_PASSWORD) {
      setIsAdmin(true);
      try {
        localStorage.setItem(STORAGE_KEY_ADMIN_LOGGED_IN, "true");
      } catch (e) {}

      // 背景向 Google Apps Script 取得正式 token_xxx 存入本地
      try {
        await getValidAdminToken(true);
      } catch (err) {
        console.warn("GAS admin_login background error:", err);
      }

      setIsLoginModalOpen(false);
      setLoginPasswordInput("");
      setLoginError("");
      showToast(lang === "en" ? "Administrator authenticated successfully!" : "管理員身分已驗證成功！", "success");
    } else {
      setLoginError(lang === "en" ? "Incorrect password. (Contact lab PI/manager)" : "密碼錯誤，請確認後重試 (提示: 密碼由實驗室負責人分發)");
    }
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    try {
      localStorage.removeItem(STORAGE_KEY_ADMIN_LOGGED_IN);
      localStorage.removeItem(ADMIN_GAS_TOKEN_KEY);
    } catch (e) {}
    showToast(lang === "en" ? "Logged out from administrator" : "已登出管理員身分", "info");
  };

  // --------------------------------------------------------------------------
  // 3. UI Navigation & Filters
  // --------------------------------------------------------------------------
  const [currentTab, setCurrentTab] = useState<"catalog" | "history" | "low_stock" | "audit" | "manage" | "embed_pickup">("catalog");
  const [selectedCategory, setSelectedCategory] = useState<string>("全部類別");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // --------------------------------------------------------------------------
  // 3.0 行動領用內嵌 (Google Apps Script Web App) 與 QR Code 生成狀態
  // --------------------------------------------------------------------------
  const [consumablesScriptUrl, setConsumablesScriptUrl] = useState<string>(() => {
    return getConsumablesScriptUrl();
  });
  const [iframeKey, setIframeKey] = useState<number>(Date.now());
  const [isIframeLoading, setIsIframeLoading] = useState<boolean>(true);
  const [isEmbedFullscreen, setIsEmbedFullscreen] = useState<boolean>(false);

  // Settings Modal (設定 GAS 部署網址)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [customScriptUrlInput, setCustomScriptUrlInput] = useState<string>("");
  const [isTestingUrl, setIsTestingUrl] = useState<boolean>(false);
  const [testResultMsg, setTestResultMsg] = useState<{ success: boolean; text: string } | null>(null);

  // QR Code Modal (全館領用碼 & 各品項專屬置物架標籤)
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [qrModalTab, setQrModalTab] = useState<"general" | "item">("general");
  const [selectedQrItemId, setSelectedQrItemId] = useState<string>("");
  const [generalQrDataUrl, setGeneralQrDataUrl] = useState<string>("");
  const [itemQrDataUrl, setItemQrDataUrl] = useState<string>("");
  const [isCopiedQrUrl, setIsCopiedQrUrl] = useState<boolean>(false);

  // Selected QR Item
  const activeQrItem = useMemo(() => {
    if (selectedQrItemId) {
      const found = items.find(it => it.id === selectedQrItemId);
      if (found) return found;
    }
    return items.length > 0 ? items[0] : null;
  }, [items, selectedQrItemId]);

  // Generate General QR Code
  useEffect(() => {
    if (!consumablesScriptUrl) return;
    QRCodeLib.toDataURL(consumablesScriptUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: "#1b4372",
        light: "#ffffff",
      },
    })
      .then(url => setGeneralQrDataUrl(url))
      .catch(err => console.error("QR Code Gen Error:", err));
  }, [consumablesScriptUrl]);

  // Generate Item-specific Shelf QR Code
  useEffect(() => {
    if (!consumablesScriptUrl || !activeQrItem) {
      setItemQrDataUrl("");
      return;
    }
    const itemUrl = consumablesScriptUrl + (consumablesScriptUrl.includes("?") ? "&" : "?") + "item=" + encodeURIComponent(activeQrItem.id);
    QRCodeLib.toDataURL(itemUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: "#1b4372",
        light: "#ffffff",
      },
    })
      .then(url => setItemQrDataUrl(url))
      .catch(err => console.error("Item QR Code Gen Error:", err));
  }, [consumablesScriptUrl, activeQrItem]);

  const openItemSpecificQrModal = (item: ConsumableItem) => {
    setSelectedQrItemId(item.id);
    setQrModalTab("item");
    setIsQrModalOpen(true);
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopiedQrUrl(true);
    setTimeout(() => setIsCopiedQrUrl(false), 2000);
  };

  const handleDownloadQrImage = (dataUrl: string, filename: string) => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSaveCustomScriptUrl = () => {
    const trimmed = customScriptUrlInput.trim();
    if (!trimmed) {
      showToast("請輸入有效的 Google Apps Script 網頁應用程式網址！", "error");
      return;
    }
    saveConsumablesScriptUrl(trimmed);
    setConsumablesScriptUrl(trimmed);
    setIsIframeLoading(true);
    setIframeKey(Date.now());
    setIsSettingsModalOpen(false);
    showToast("已更新耗材 Web App 網址並重新載入！", "success");
  };

  const handleTestCustomScriptUrl = async () => {
    const trimmed = customScriptUrlInput.trim();
    if (!trimmed) return;
    setIsTestingUrl(true);
    setTestResultMsg(null);
    try {
      const res = await fetchConsumablesFromCloud(trimmed);
      if (res.success) {
        setTestResultMsg({ success: true, text: `連線成功！讀取到 ${(res.items || []).length} 項耗材資料。` });
      } else {
        setTestResultMsg({ success: false, text: res.message || "連線測試失敗" });
      }
    } catch (e: any) {
      setTestResultMsg({ success: false, text: `連線異常: ${e.message || e}` });
    } finally {
      setIsTestingUrl(false);
    }
  };

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
      .filter(t => t.type === "領取" || t.type === "pickup")
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
      if (tx.type === "領取" || tx.type === "pickup") {
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

  const handleConfirmPickup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPickupItem) return;

    if (pickupQty <= 0) {
      alert(lang === "en" ? "Pickup quantity must be greater than 0!" : "領取數量必須為大於 0 的正整數！");
      return;
    }

    if (pickupQty > selectedPickupItem.currentStock) {
      alert(lang === "en" 
        ? `Pickup quantity cannot exceed current in-stock (${selectedPickupItem.currentStock} ${selectedPickupItem.unit})!` 
        : `領取數量不可超過目前庫存 (${selectedPickupItem.currentStock} ${selectedPickupItem.unit})！`);
      return;
    }

    const finalOperator = isOtherOperator ? otherOperatorName.trim() : pickupOperator.trim();
    if (!finalOperator) {
      alert(lang === "en" ? "Please select or enter the user name!" : "請選擇領取人姓名或填寫自訂姓名！");
      return;
    }

    setIsSubmittingPickup(true);

    try {
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

      // 1. Update item stock locally for immediate visual response
      setItems(prevItems => 
        prevItems.map(it => 
          it.id === selectedPickupItem.id 
            ? { ...it, currentStock: afterStock, updatedAt: nowStr }
            : it
        )
      );

      // 2. Append transaction record locally
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
      const cloudRes = await sendConsumablesWebhook({
        action: "pickup",
        itemId: selectedPickupItem.id,
        itemName: selectedPickupItem.name,
        quantity: pickupQty,
        amount: pickupQty,
        operator: finalOperator,
        userName: finalOperator,
        isListedMember: !isOtherOperator,
        inList: isOtherOperator ? "否" : "是",
        notes: pickupNotes.trim()
      });

      if (cloudRes && cloudRes.success) {
        // 成功後立即同步雲端資料，確保即時性與單一數據來源
        await syncWithCloud(true);
        showToast(
          lang === "en"
            ? `Pickup logged! Retrieved ${pickupQty} ${selectedPickupItem.unit} of "${selectedPickupItem.name}". Synced with Google Sheets!`
            : `登記成功！已領取「${selectedPickupItem.name}」${pickupQty} ${selectedPickupItem.unit}，已即時同步至 Google 試算表！`,
          "success"
        );
        setSelectedPickupItem(null);
      } else {
        showToast(
          lang === "en"
            ? `Pickup sync warning: ${cloudRes?.error || cloudRes?.message || "Failed to write to Google Sheets"}`
            : `領取登記雲端同步提醒：${cloudRes?.error || cloudRes?.message || "未寫入 Google 試算表"}`,
          "error"
        );
      }
    } catch (e: any) {
      console.warn("Cloud pickup sync error:", e);
      showToast(lang === "en" ? "Connection error: saved locally only" : "領取已登記於本機，雲端連線失敗", "error");
    } finally {
      setIsSubmittingPickup(false);
    }
  };

  // --------------------------------------------------------------------------
  // 5. Restock Modal & Manual Adjust (管理員功能)
  // --------------------------------------------------------------------------
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [restockItemId, setRestockItemId] = useState("");
  const [restockQty, setRestockQty] = useState<number>(5);
  const [restockNotes, setRestockNotes] = useState("常態採購到貨入庫");
  const [isSubmittingRestock, setIsSubmittingRestock] = useState(false);

  const handleConfirmRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    const item = items.find(i => i.id === restockItemId);
    if (!item) {
      alert(lang === "en" ? "Please select a consumable to restock!" : "請選擇要補貨的耗材！");
      return;
    }
    if (restockQty <= 0) {
      alert(lang === "en" ? "Restock quantity must be greater than 0!" : "入庫數量需大於 0！");
      return;
    }

    setIsSubmittingRestock(true);
    try {
      const cloudRes = await sendConsumablesAdminAction("restock", {
        itemId: item.id,
        quantity: restockQty,
        amount: restockQty,
        operator: "管理員 (Admin)",
        notes: restockNotes.trim()
      });

      if (cloudRes && cloudRes.success) {
        showToast(
          lang === "en"
            ? `Restock successful! "${item.name}" added ${restockQty} ${item.unit}. Synced to Google Sheets!`
            : `入庫成功！「${item.name}」已增加 ${restockQty} ${item.unit}，已即時同步至 Google 試算表！`,
          "success"
        );
        await syncWithCloud(true);
        setIsRestockModalOpen(false);
      } else {
        showToast(
          lang === "en"
            ? `Restock failed: ${cloudRes?.error || cloudRes?.message || "Failed to write to Google Sheets"}`
            : `入庫同步失敗：${cloudRes?.error || cloudRes?.message || "未成功寫入試算表"}`,
          "error"
        );
      }
    } catch (e: any) {
      console.warn("Restock sync error:", e);
      showToast(lang === "en" ? "Cloud restock connection error" : "入庫雲端連線失敗", "error");
    } finally {
      setIsSubmittingRestock(false);
    }
  };

  // Manual Adjust Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState<ConsumableItem | null>(null);
  const [adjustNewStock, setAdjustNewStock] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState("");
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  const openAdjustModal = (item: ConsumableItem) => {
    setAdjustItem(item);
    setAdjustNewStock(item.currentStock);
    setAdjustReason("");
    setIsAdjustModalOpen(true);
  };

  const handleConfirmAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustItem) return;
    if (adjustNewStock < 0) {
      alert(lang === "en" ? "Stock cannot be negative!" : "庫存不可為負數！");
      return;
    }
    if (!adjustReason.trim()) {
      alert(lang === "en" ? "Adjustment reason is required!" : "手動修正庫存必須填寫修正原因！");
      return;
    }

    const prevStock = adjustItem.currentStock;
    const diff = adjustNewStock - prevStock;

    if (diff === 0) {
      alert(lang === "en" ? "New stock is identical to current stock!" : "新庫存與當前庫存相同，無須修正！");
      return;
    }

    setIsSubmittingAdjust(true);
    try {
      const cloudRes = await sendConsumablesAdminAction("manual_adjust", {
        itemId: adjustItem.id,
        newStock: adjustNewStock,
        operator: "管理員 (Admin)",
        notes: adjustReason.trim(),
        reason: adjustReason.trim()
      });

      if (cloudRes && cloudRes.success) {
        showToast(
          lang === "en"
            ? `Stock adjusted! "${adjustItem.name}" updated to ${adjustNewStock} ${adjustItem.unit}. Synced to Google Sheets!`
            : `庫存已修正！「${adjustItem.name}」校正為 ${adjustNewStock} ${adjustItem.unit}，已同步至 Google 試算表。`,
          "success"
        );
        await syncWithCloud(true);
        setIsAdjustModalOpen(false);
      } else {
        showToast(
          lang === "en"
            ? `Adjustment failed: ${cloudRes?.error || cloudRes?.message || "Failed to write to Google Sheets"}`
            : `庫存校正同步失敗：${cloudRes?.error || cloudRes?.message || "未成功寫入試算表"}`,
          "error"
        );
      }
    } catch (e: any) {
      console.warn("Manual adjust sync error:", e);
      showToast(lang === "en" ? "Adjustment cloud connection error" : "校正雲端連線失敗", "error");
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  // --------------------------------------------------------------------------
  // 6. Add & Edit Item Modal (管理員)
  // --------------------------------------------------------------------------
  const [isItemFormModalOpen, setIsItemFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ConsumableItem | null>(null);
  const [isSubmittingItem, setIsSubmittingItem] = useState(false);
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

  const handleSaveItemForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert(lang === "en" ? "Consumable name cannot be empty!" : "耗材名稱不可為空！");
      return;
    }

    setIsSubmittingItem(true);
    try {
      if (editingItem) {
        // Edit existing item
        const updatedItem = {
          id: editingItem.id,
          name: formData.name.trim(),
          category: formData.category,
          spec: formData.spec.trim(),
          unit: formData.unit.trim(),
          safeStock: Number(formData.safeStock) || 0,
          notes: formData.notes.trim()
        };

        const cloudRes = await sendConsumablesAdminAction("update_item", {
          item: updatedItem
        });

        if (cloudRes && cloudRes.success) {
          showToast(
            lang === "en" 
              ? `Item "${updatedItem.name}" updated and synced to Google Sheets!` 
              : `品項資訊已更新並同步至 Google 試算表！`, 
            "success"
          );
          await syncWithCloud(true);
          setIsItemFormModalOpen(false);
        } else {
          showToast(
            lang === "en" 
              ? `Update failed: ${cloudRes?.error || cloudRes?.message || "Failed to update Google Sheets"}` 
              : `更新同步失敗：${cloudRes?.error || cloudRes?.message || "未寫入試算表"}`, 
            "error"
          );
        }
      } else {
        // Add new item directly to Google Sheets
        const cloudRes = await sendConsumablesAdminAction("add_item", {
          item: {
            name: formData.name.trim(),
            category: formData.category,
            spec: formData.spec.trim(),
            unit: formData.unit.trim(),
            currentStock: Number(formData.currentStock) || 0,
            safeStock: Number(formData.safeStock) || 0,
            notes: formData.notes.trim()
          }
        });

        if (cloudRes && cloudRes.success) {
          showToast(
            lang === "en" 
              ? `Consumable "${formData.name.trim()}" successfully created and saved to Google Sheets!` 
              : `耗材品項「${formData.name.trim()}」已成功新增並寫入 Google 試算表！`, 
            "success"
          );
          // 重新從 Google 試算表載入官方資料與 ID
          await syncWithCloud(true);
          setIsItemFormModalOpen(false);
        } else {
          showToast(
            lang === "en" 
              ? `Cloud save failed: ${cloudRes?.error || cloudRes?.message || "Failed to write to Google Sheets"}` 
              : `品項雲端新增失敗：${cloudRes?.error || cloudRes?.message || "未能寫入 Google 試算表"}`, 
            "error"
          );
        }
      }
    } catch (err: any) {
      console.warn("Item save error:", err);
      showToast(lang === "en" ? `Cloud error: ${err.message || err}` : `雲端同步異常：${err.message || err}`, "error");
    } finally {
      setIsSubmittingItem(false);
    }
  };

  // Toggle Active/Inactive
  const handleToggleStatus = async (item: ConsumableItem) => {
    const nextStatus = item.status === "active" ? "inactive" : "active";
    const statusText = nextStatus === "active" 
      ? (lang === "en" ? "Activate" : "啟用") 
      : (lang === "en" ? "Deactivate" : "停用");

    const confirmMsg = lang === "en" 
      ? `Are you sure you want to change "${item.name}" to [${statusText}]?` 
      : `確定要將「${item.name}」變更為【${statusText}】嗎？`;

    if (!confirm(confirmMsg)) return;

    try {
      const cloudRes = await sendConsumablesAdminAction("toggle_status", {
        itemId: item.id,
        newStatus: nextStatus
      });

      if (cloudRes && cloudRes.success) {
        showToast(
          lang === "en" 
            ? `"${item.name}" is now set to ${statusText} and synced to Google Sheets!` 
            : `已將「${item.name}」設定為${statusText}並同步至 Google 試算表！`, 
          "info"
        );
        await syncWithCloud(true);
      } else {
        showToast(
          lang === "en" 
            ? `Status sync warning: ${cloudRes?.error || cloudRes?.message}` 
            : `狀態變更同步提醒：${cloudRes?.error || cloudRes?.message}`, 
          "error"
        );
      }
    } catch (e: any) {
      console.warn(e);
      showToast(lang === "en" ? "Connection error" : "連線異常", "error");
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

    // 雲端同步發起盤點
    sendConsumablesAdminAction("start_audit", {
      operator: "管理員 (Admin)",
      notes: "定期庫存盤點 (進行中)"
    }).catch(e => console.warn("Start audit sync error:", e));
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

    // 雲端同步暫存草稿
    sendConsumablesAdminAction("save_audit_draft", {
      auditId: activeAudit.auditId,
      details: activeAuditDetails,
      notes: auditNotes
    }).catch(e => console.warn("Save audit draft sync error:", e));
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
    sendConsumablesAdminAction("complete_audit", {
      auditId: activeAudit.auditId,
      details: activeAuditDetails,
      notes: auditNotes
    }).then(cloudRes => {
      if (cloudRes && cloudRes.success) {
        syncWithCloud(true);
      } else {
        showToast(`盤點同步提醒：${cloudRes?.error || cloudRes?.message || "未同步"}`, "error");
      }
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
  const [isExportingCsv, setIsExportingCsv] = useState(false);

const downloadCsvFile = (filename: string, csv: string) => {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

const handleCloudExport = async (types: Array<"items" | "audits" | "logs">) => {
  setIsExportingCsv(true);
  try {
    const done: string[] = [];
    for (const type of types) {
      const res: any = await sendConsumablesAdminAction("export_csv", { type });
      if (!res || !res.success || !res.csv) {
        throw new Error(res?.error || res?.message || "匯出失敗");
      }
      downloadCsvFile(res.filename, res.csv);
      done.push(`${res.filename}（${res.count} 筆）`);
      if (types.length > 1) await new Promise(r => setTimeout(r, 500)); // 避免瀏覽器擋多檔下載
    }
    showToast(
      lang === "en" ? `Exported ${done.length} CSV file(s)` : `已匯出 ${done.length} 個 CSV：${done.join("、")}`,
      "success"
    );
  } catch (e: any) {
    showToast(
      lang === "en" ? `Export failed: ${e.message || e}` : `匯出失敗：${e.message || e}`,
      "error"
    );
  } finally {
    setIsExportingCsv(false);
  }
};
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
            <span>{lang === "en" ? "Lab Consumables & Stock Inventory" : "Lab Consumables 耗材統計與領用"}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            {lang === "en" 
              ? "Real-time Laboratory Consumables Stock Tracking · Self-service Online Pickup · Regular Stocktake"
              : "實驗室耗材種類與數量實時統計 · 線上自助領用登記 · 低庫存預警與定期盤點系統"}
          </p>
        </div>

        {/* Action Buttons: Language Toggle, Mobile QR, Sync, Admin, Back */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Mobile QR Code Button */}
          <button
            type="button"
            onClick={() => setIsQrModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#f0f4f9] hover:bg-[#e2ebf7] border border-[#1b4372]/30 text-[#1b4372] rounded-sm text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
            title={lang === "en" ? "Generate Mobile Pickup QR Code & Shelf Labels" : "生成手機領用 QR Code 與置物架條碼標籤"}
          >
            <QrCode className="w-3.5 h-3.5 text-[#1b4372]" />
            <span>{lang === "en" ? "Mobile QR" : "行動條碼"}</span>
          </button>

          {/* One-Click Language Toggle Button */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-[#1b4372]/30 hover:border-[#1b4372] text-[#1b4372] rounded-sm text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
            title={lang === "zh" ? "切換至英文介面 (Switch to English)" : "切換至繁體中文 (Switch to Traditional Chinese)"}
          >
            <Globe className="w-3.5 h-3.5 text-[#1b4372]" />
            <span>{lang === "zh" ? "English" : "繁體中文"}</span>
          </button>

          {/* Cloud Sync Button */}
          <button
            type="button"
            onClick={() => syncWithCloud(false)}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-sm text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-60 whitespace-nowrap active:scale-95"
            title={lastSyncTime 
              ? (lang === "en" ? `Last synced: ${lastSyncTime} (Click to re-sync Google Sheet)` : `上次同步：${lastSyncTime}（點擊重新同步 Google 試算表最新庫存）`)
              : (lang === "en" ? "Sync with Google Sheet immediately" : "立即與 Google 試算表雙向同步最新耗材與領用資料")}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-700 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? (lang === "en" ? "Syncing..." : "同步中...") : (lang === "en" ? "Sync Cloud" : "同步雲端")}</span>
          </button>

          {isAdmin ? (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <div className="text-left text-xs">
                <span className="text-emerald-900 font-bold block">{lang === "en" ? "Admin Mode" : "耗材管理員已解鎖"}</span>
                <span className="text-emerald-700 text-[10px] font-mono">Token Active (2h)</span>
              </div>
              <button
                type="button"
                onClick={handleAdminLogout}
                className="ml-2 px-2 py-1 bg-white hover:bg-slate-50 border border-emerald-300 text-emerald-800 rounded text-xs font-bold transition shadow-2xs"
              >
                {lang === "en" ? "Logout" : "登出"}
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
              <span>{lang === "en" ? "Admin Login" : "管理員登入"}</span>
            </button>
          )}

          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-sm text-xs font-medium transition cursor-pointer"
            >
              {lang === "en" ? "Home" : "返回首頁"}
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
              <strong>{lang === "en" ? "Audit Reminder: " : "定期盤點提醒："}</strong>
              {lang === "en" 
                ? `Last stocktake was ${daysSinceLastAudit} days ago (Alert threshold: 30 days). A comprehensive stocktake is recommended this week!`
                : `距上次完成盤點已逾 ${daysSinceLastAudit} 天（設定警戒為 30 天）。建議管理員於本週排定全面盤點，以確保帳實相符！`}
            </span>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setCurrentTab("audit")}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-bold shrink-0 transition"
            >
              {lang === "en" ? "Go to Stocktake" : "前往盤點"}
            </button>
          )}
        </div>
      )}

      {/* -------------------- Top Overview Metric Cards -------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-3.5 bg-white border border-[#e5e5e0] rounded-sm shadow-2xs space-y-1">
          <span className="text-[11px] text-slate-500 font-medium block">
            {lang === "en" ? "Active Consumables" : "啟用中耗材品項"}
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-[#1b4372]">{stats.activeCount}</span>
            <span className="text-[11px] text-slate-400">{lang === "en" ? "Items" : "種品項"}</span>
          </div>
        </div>

        <div className="p-3.5 bg-white border border-[#e5e5e0] rounded-sm shadow-2xs space-y-1">
          <span className="text-[11px] text-slate-500 font-medium block">
            {lang === "en" ? "Total In-Stock Units" : "在庫總量統計"}
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-slate-800">{stats.totalUnits.toLocaleString()}</span>
            <span className="text-[11px] text-slate-400">{lang === "en" ? "Units" : "件/單位"}</span>
          </div>
        </div>

        <div className={`p-3.5 rounded-sm border shadow-2xs space-y-1 transition ${
          stats.lowStockCount > 0 ? "bg-rose-50/70 border-rose-300" : "bg-white border-[#e5e5e0]"
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-medium block ${stats.lowStockCount > 0 ? "text-rose-700" : "text-slate-500"}`}>
              {lang === "en" ? "Low Stock Alerts" : "庫存偏低警示"}
            </span>
            {stats.lowStockCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            )}
          </div>
          <div className="flex items-baseline justify-between">
            <span className={`text-2xl font-bold font-mono ${stats.lowStockCount > 0 ? "text-rose-700" : "text-slate-800"}`}>
              {stats.lowStockCount}
            </span>
            <span className="text-[11px] text-rose-600 font-medium">
              {lang === "en" ? "Restock Needed" : "需補貨"}
            </span>
          </div>
        </div>

        <div 
          onClick={() => setIsAllPickupsModalOpen(true)}
          className="p-3.5 bg-white hover:bg-slate-50 border border-[#e5e5e0] hover:border-[#1b4372]/40 rounded-sm shadow-2xs space-y-1 cursor-pointer transition group"
          title={lang === "en" ? "Click to view all lab pickup registration records" : "點擊查看實驗室全部耗材領用登記明細"}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 font-medium block group-hover:text-[#1b4372] transition">
              {lang === "en" ? "Monthly Pickups" : "本月累計領用"}
            </span>
            <History className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#1b4372] transition" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-emerald-700">{stats.monthlyPickupCount}</span>
            <span className="text-[11px] text-slate-400 group-hover:text-[#1b4372] transition">
              {lang === "en" ? "Logs ↗" : "次登記 ↗"}
            </span>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-2 lg:col-span-1 p-3.5 bg-white border border-[#e5e5e0] rounded-sm shadow-2xs space-y-1">
          <span className="text-[11px] text-slate-500 font-medium block">
            {lang === "en" ? "Days Since Audit" : "距上次盤點"}
          </span>
          <div className="flex items-baseline justify-between">
            <span className={`text-2xl font-bold font-mono ${isAuditOverdue ? "text-amber-700" : "text-[#1b4372]"}`}>
              {daysSinceLastAudit !== null ? daysSinceLastAudit : "-"}
            </span>
            <span className="text-[11px] text-slate-400">
              {lang === "en" ? "days ago" : "天前"}
            </span>
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
            {lang === "en" ? "Consumables & Pickup" : "耗材清單與線上領取"}
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab("embed_pickup")}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition whitespace-nowrap flex items-center gap-1.5 ${
              currentTab === "embed_pickup"
                ? "border-[#1b4372] text-[#1b4372] bg-white/60"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-[#1b4372]" />
            <span>{lang === "en" ? "Mobile Pickup & QR" : "行動領用與 QR Code"}</span>
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
            <span>{lang === "en" ? "Low Stock List" : "低庫存清單"}</span>
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
            {lang === "en" ? "All Activity Logs" : "全部異動紀錄"}
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
                <span>{lang === "en" ? "Regular Stocktake" : "定期盤點系統"}</span>
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
                <span>{lang === "en" ? "Item Catalog & Stock" : "品項入庫與管理"}</span>
              </button>
            </>
          )}
        </div>

        {/* Toolbar Quick Action Buttons */}
        <div className="flex items-center gap-2 pb-1">
          <button
            type="button"
            onClick={() => setIsQrModalOpen(true)}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#f8f8f5] hover:bg-slate-200 text-slate-700 border border-[#e5e5e0] rounded-sm text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
            title={lang === "en" ? "Generate Mobile QR Codes & Shelf Tags" : "產生手機領用 QR Code 與置物架條碼標籤"}
          >
            <QrCode className="w-3.5 h-3.5 text-[#1b4372]" />
            <span>{lang === "en" ? "Mobile QR" : "行動條碼"}</span>
          </button>

          {/* Admin Quick Action Buttons */}
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={openAddItemModal}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1b4372] hover:bg-[#15345a] text-white rounded-sm text-xs font-bold transition shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === "en" ? "New Item" : "新增耗材"}</span>
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
                <span>{lang === "en" ? "Restock" : "補貨入庫"}</span>
              </button>
            </>
          )}
        </div>
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
                placeholder={lang === "en" 
                  ? "Search consumable name, spec, ID or category (e.g., tube, tips, gloves)..." 
                  : "搜尋耗材品名、規格型號、編號或類別 (如: 離心管、Tips、手套)..."}
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
                  <span>{lang === "en" ? "Category:" : "類別:"}</span>
                </span>
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="bg-[#fcfcfc] border border-slate-200 rounded-sm px-2 py-1 text-xs text-slate-700 font-medium focus:border-[#1b4372] focus:outline-none"
                >
                  {CONSUMABLE_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>
                  ))}
                </select>
              </div>

              {/* View All Pickups Button */}
              <button
                type="button"
                onClick={() => setIsAllPickupsModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f0f4f9] hover:bg-[#e2ebf7] border border-[#1b4372]/30 text-[#1b4372] rounded-sm text-xs font-bold transition shadow-2xs whitespace-nowrap cursor-pointer active:scale-95"
                title={lang === "en" ? "View all laboratory pickup records" : "點擊彈窗檢視全實驗室所有領用登記紀錄明細"}
              >
                <History className="w-3.5 h-3.5 text-[#1b4372]" />
                <span>{lang === "en" ? "View All Pickups" : "查看全部領用紀錄"}</span>
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
                    <th className="p-3 w-20">{lang === "en" ? "ID" : "編號"}</th>
                    <th className="p-3">{lang === "en" ? "Name & Specification" : "耗材名稱與型號規格"}</th>
                    <th className="p-3 w-28">{lang === "en" ? "Category" : "分類"}</th>
                    <th className="p-3 text-right w-24">{lang === "en" ? "Current Stock" : "目前庫存"}</th>
                    <th className="p-3 text-right w-20">{lang === "en" ? "Safety Stock" : "安全庫存"}</th>
                    <th className="p-3 w-24 text-center">{lang === "en" ? "Stock Status" : "庫存狀態"}</th>
                    <th className="p-3 w-48">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{lang === "en" ? "Last Pickup (User / Time)" : "上次領用人 / 時間"}</span>
                      </span>
                    </th>
                    <th className="p-3 text-right w-44">{lang === "en" ? "Actions" : "操作"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-slate-400 text-xs">
                        {isSyncing ? (
                          <div className="flex flex-col items-center justify-center gap-2 py-4">
                            <RefreshCw className="w-5 h-5 text-[#1b4372] animate-spin" />
                            <span className="text-slate-600 font-medium">
                              {lang === "en" ? "Syncing consumables from Google Sheet, please wait..." : "正在從 Google 試算表同步耗材資料中，請稍候..."}
                            </span>
                          </div>
                        ) : items.length === 0 ? (
                          <div className="flex flex-col items-center justify-center gap-2 py-6">
                            <Boxes className="w-8 h-8 text-slate-300" />
                            <span className="text-slate-700 font-medium text-sm">
                              {lang === "en" ? "No consumables found in Google Sheet" : "Google 試算表中目前尚無耗材品項"}
                            </span>
                            <span className="text-slate-400 text-xs">
                              {lang === "en" ? "Click 'Sync Cloud' or login as Admin to add items" : "可點擊右上角「同步雲端」重新整理，或登入管理員新增品項"}
                            </span>
                          </div>
                        ) : (
                          <span>
                            {lang === "en" ? "No matching consumables found. Try clearing filters or search query." : "查無符合篩選條件的耗材品項。請嘗試清除搜尋字詞或切換類別！"}
                          </span>
                        )}
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
                                  {lang === "en" ? "Inactive" : "已停用"}
                                </span>
                              )}
                            </div>
                            <div className="text-slate-500 text-xs mt-0.5">
                              {item.spec}
                            </div>
                            {item.notes && (
                              <div className="text-slate-400 text-[11px] mt-0.5 italic">
                                {lang === "en" ? "Notes" : "備註"}: {item.notes}
                              </div>
                            )}
                          </td>

                          {/* Category */}
                          <td className="p-3 text-slate-600">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px]">
                              {getCategoryLabel(item.category)}
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
                                {lang === "en" ? "Out of Stock" : "已無庫存"}
                              </span>
                            ) : isLowStock ? (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded text-[10px] font-bold">
                                {lang === "en" ? "Low Stock" : "庫存偏低"}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-medium">
                                {lang === "en" ? "In Stock" : "充裕正常"}
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
                                title={lang === "en" ? "Click to view pickup history for this item" : "點擊查看該品項所有歷史領用紀錄"}
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
                                  {lang === "en" ? "Took" : "領取"} {Math.abs(lastPickup.changeQty)} {item.unit}
                                  {lastPickup.notes ? ` · ${lastPickup.notes}` : ""}
                                </div>
                              </div>
                            ) : (
                              <div className="text-slate-400 text-xs italic flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-300" />
                                <span>{lang === "en" ? "No pickup record" : "尚無領用紀錄"}</span>
                              </div>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                            {/* Item QR Code Tag Button */}
                            <button
                              type="button"
                              onClick={() => openItemSpecificQrModal(item)}
                              title={lang === "en" ? "Generate item shelf QR code label" : "生成此品項專屬置物架 QR Code 標籤"}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#f8f8f5] hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-sm text-xs font-medium transition cursor-pointer active:scale-95 shadow-2xs"
                            >
                              <QrCode className="w-3.5 h-3.5 text-[#1b4372]" />
                              <span>{lang === "en" ? "QR Tag" : "條碼標籤"}</span>
                            </button>

                            {/* View History Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedHistoryItem(item);
                                setHistoryScope("pickup_only");
                                setItemHistorySearch("");
                              }}
                              title={lang === "en" ? "View all pickup history for this item" : "查看此品項的所有歷史領用紀錄"}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-sm text-xs font-medium transition cursor-pointer active:scale-95 shadow-2xs"
                            >
                              <History className="w-3.5 h-3.5 text-slate-500" />
                              <span>{lang === "en" ? "History" : "領用紀錄"}</span>
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
                              {isOutOfStock ? (lang === "en" ? "Out of Stock" : "已無庫存") : (lang === "en" ? "Pickup" : "領取登記")}
                            </button>

                            {/* Admin Quick Adjust Button */}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => openAdjustModal(item)}
                                title={lang === "en" ? "Adjust stock" : "修正庫存"}
                                className="px-2 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-sm text-xs transition cursor-pointer"
                              >
                                {lang === "en" ? "Adjust" : "校正"}
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

      {/* -------------------- TAB: EMBEDDED PICKUP WEB APP & QR CODE -------------------- */}
      {currentTab === "embed_pickup" && (
        <div className={`space-y-4 animate-in fade-in duration-200 ${
          isEmbedFullscreen ? "fixed inset-0 z-50 bg-[#f4f1ea] p-4 lg:p-6 overflow-y-auto" : ""
        }`}>
          {/* Top Banner / Control Panel */}
          <div className="bg-[#fdfdfc] border border-[#e5e5e0] rounded-sm p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 bg-[#1b4372] text-white rounded-sm">
                  <Smartphone className="w-4 h-4" />
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#1b4372] font-serif tracking-tight">
                 {lang === "en" ? "Mobile Pickup Page (Embedded)" : "手機領用頁面（嵌入檢視）"}
                </h3>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {lang === "en" ? "Embedded" : "嵌入中"}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-sans">
                {lang === "en" 
                  ? "Live embedded Google Apps Script mobile web app. Students can scan QR codes in the lab to register consumables in real-time."
                  : "Google Apps Script 雲端原生領用介面。支援相機掃碼、品項搜尋、即時防超領扣庫與自動記錄試算表。"}
              </p>
            </div>

            {/* Action Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* QR Code Share button */}
              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f8f8f5] hover:bg-slate-200 text-slate-700 border border-[#e5e5e0] rounded-sm text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                title="生成或檢視行動條碼"
              >
                <QrCode className="w-3.5 h-3.5 text-[#1b4372]" />
                <span>{lang === "en" ? "Mobile QR" : "行動條碼"}</span>
              </button>

              {/* Refresh button */}
              <button
                type="button"
                onClick={() => {
                  setIsIframeLoading(true);
                  setIframeKey(Date.now());
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f8f8f5] hover:bg-slate-200 text-slate-700 border border-[#e5e5e0] rounded-sm text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                title="重新整理雲端頁面"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#1b4372] ${isIframeLoading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">{lang === "en" ? "Refresh" : "重新整理"}</span>
              </button>

              {/* Fullscreen button */}
              <button
                type="button"
                onClick={() => setIsEmbedFullscreen(!isEmbedFullscreen)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f8f8f5] hover:bg-slate-200 text-slate-700 border border-[#e5e5e0] rounded-sm text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                title={isEmbedFullscreen ? "離開全螢幕" : "全螢幕檢視"}
              >
                {isEmbedFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-[#1b4372]" /> : <Maximize2 className="w-3.5 h-3.5 text-[#1b4372]" />}
                <span className="hidden sm:inline">{isEmbedFullscreen ? (lang === "en" ? "Exit" : "離開全螢幕") : (lang === "en" ? "Fullscreen" : "全螢幕")}</span>
              </button>

              {/* Settings button */}
              <button
                type="button"
                onClick={() => {
                  setCustomScriptUrlInput(consumablesScriptUrl);
                  setTestResultMsg(null);
                  setIsSettingsModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f8f8f5] hover:bg-slate-200 text-slate-700 border border-[#e5e5e0] rounded-sm text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                title="設定 Google Apps Script Web App 網址"
              >
                <Settings className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">{lang === "en" ? "Settings" : "設定連結"}</span>
              </button>

              {/* Open in New Tab */}
              <a
                href={consumablesScriptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1b4372] hover:bg-[#122e4f] text-white rounded-sm text-xs font-bold tracking-wide shadow-xs transition active:scale-95"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{lang === "en" ? "Open in New Tab" : "在新分頁開啟"}</span>
              </a>
            </div>
          </div>

          {/* Embedded iframe container */}
          <div className={`relative w-full rounded-sm overflow-hidden border border-[#e5e5e0] bg-[#fdfdfc] shadow-sm flex flex-col ${
            isEmbedFullscreen ? "h-[calc(100vh-140px)]" : "h-[760px] md:h-[840px]"
          }`}>
            {isIframeLoading && (
              <div className="absolute inset-0 bg-[#fdfdfc]/90 z-20 flex flex-col items-center justify-center gap-3 backdrop-blur-xs">
                <RefreshCw className="w-8 h-8 text-[#1b4372] animate-spin" />
                <p className="text-sm font-bold text-[#1b4372] font-serif">
                  {lang === "en" ? "Loading Consumables Pickup Web App..." : "載入耗材自助領用系統中..."}
                </p>
                <p className="text-xs text-slate-500">
                  {lang === "en" ? "Connecting to Google Apps Script cloud service..." : "正在連接 Google Apps Script 雲端伺服器..."}
                </p>
              </div>
            )}

            <iframe
              key={iframeKey}
              src={consumablesScriptUrl}
              title="EBB Lab Consumables Pickup System"
              className="w-full h-full border-0"
              onLoad={() => setIsIframeLoading(false)}
              allow="camera; microphone; clipboard-write;"
 sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
            />
          </div>
        </div>
      )}
{isAdmin && (
  <div className="bg-[#fbf7ee] border border-[#e6d9b8] rounded-sm p-3 space-y-2">
    <div className="flex items-center gap-1.5 text-xs font-bold text-[#6b5530]">
      <Download className="w-3.5 h-3.5" />
      <span>{lang === "en" ? "Admin CSV Export (Google Sheet)" : "管理員資料匯出 (CSV，來自 Google 試算表)"}</span>
    </div>
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <button type="button" disabled={isExportingCsv} onClick={() => handleCloudExport(["items"])}
        className="px-2 py-2 bg-white hover:bg-slate-50 border border-[#e6d9b8] text-slate-700 text-xs font-bold rounded-sm disabled:opacity-50 cursor-pointer">
        {lang === "en" ? "Inventory" : "庫存"}
      </button>
      <button type="button" disabled={isExportingCsv} onClick={() => handleCloudExport(["audits"])}
        className="px-2 py-2 bg-white hover:bg-slate-50 border border-[#e6d9b8] text-slate-700 text-xs font-bold rounded-sm disabled:opacity-50 cursor-pointer">
        {lang === "en" ? "Stocktake Records" : "盤點紀錄"}
      </button>
      <button type="button" disabled={isExportingCsv} onClick={() => handleCloudExport(["logs"])}
        className="px-2 py-2 bg-white hover:bg-slate-50 border border-[#e6d9b8] text-slate-700 text-xs font-bold rounded-sm disabled:opacity-50 cursor-pointer">
        {lang === "en" ? "Pickup Logs" : "領用紀錄"}
      </button>
      <button type="button" disabled={isExportingCsv} onClick={() => handleCloudExport(["items", "audits", "logs"])}
        className="px-2 py-2 bg-[#1b4372] hover:bg-[#122e4f] text-white text-xs font-bold rounded-sm disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer">
        {isExportingCsv ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        <span>{lang === "en" ? "Export All" : "一鍵全部匯出"}</span>
      </button>
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
       <span className="text-[10px] text-amber-600 font-mono">(名單外訪客)</span>
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
<span className="text-[10px] text-amber-600 font-mono">(名單外訪客)</span>
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
                                  <span className="text-[10px] text-amber-600 font-mono">(名單外訪客)</span>
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
                  {lang === "en" ? "Consumable Pickup Registration" : "耗材領取登記"}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {/* One-Click Language Switch inside Modal */}
                <button
                  type="button"
                  onClick={toggleLanguage}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold border border-[#1b4372]/30 rounded bg-blue-50/50 hover:bg-blue-50 text-[#1b4372] transition shadow-2xs cursor-pointer active:scale-95"
                  title={lang === "zh" ? "切換至英文 (Switch to English)" : "切換至中文 (Switch to Chinese)"}
                >
                  <Globe className="w-3.5 h-3.5 text-[#1b4372]" />
                  <span>{lang === "zh" ? "English" : "繁體中文"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPickupItem(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Target Item Info */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm space-y-1 text-xs">
              <div className="font-bold text-sm text-slate-900">{selectedPickupItem.name}</div>
              <div className="text-slate-500">{selectedPickupItem.spec}</div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-slate-600">
                <span>{lang === "en" ? "Current In-Stock:" : "目前在席庫存："}</span>
                <span className="font-mono font-bold text-sm text-[#1b4372]">
                  {selectedPickupItem.currentStock} {selectedPickupItem.unit}
                </span>
              </div>
            </div>

            <form onSubmit={handleConfirmPickup} className="space-y-4 text-xs">
              {/* Quantity Stepper */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  {lang === "en" ? `Pickup Quantity (${selectedPickupItem.unit}) *` : `領取數量 (${selectedPickupItem.unit}) *`}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPickupQty(Math.max(1, pickupQty - 1))}
                    className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded font-bold text-slate-700 cursor-pointer"
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
                    className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded font-bold text-slate-700 cursor-pointer"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickupQty(selectedPickupItem.currentStock)}
                    className="px-2 py-1 text-[11px] text-[#1b4372] border border-slate-200 hover:bg-slate-50 rounded cursor-pointer"
                  >
                    {lang === "en" ? `Take All (${selectedPickupItem.currentStock})` : `全領 (${selectedPickupItem.currentStock})`}
                  </button>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {lang === "en" ? "Remaining after pickup: " : "領取後剩餘庫存："}
                  <strong>{selectedPickupItem.currentStock - pickupQty}</strong> {selectedPickupItem.unit}
                </div>
              </div>

              {/* Picker Dropdown (from Lab Members List) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {lang === "en" ? "User / Collector Name *" : "領取人姓名 *"}
                </label>
                {!isOtherOperator ? (
                  <div className="space-y-1.5">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={lang === "en" ? "Search or select member name..." : "搜尋或輸入姓名..."}
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
                          <div className="p-2 text-slate-400 text-center">
                            {lang === "en" ? "No matching name" : "無符合姓名"}
                          </div>
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
                        className="text-[11px] text-[#1b4372] hover:underline cursor-pointer"
                      >
                        {lang === "en" ? "Not on list? Enter visitor/custom name manually" : "不在名單內？切換至「其他（手動輸入姓名）」"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={otherOperatorName}
                      onChange={e => setOtherOperatorName(e.target.value)}
                      placeholder={lang === "en" ? "Enter collector name (e.g., visitor, student)..." : "請輸入領取人姓名 (如: 訪客學者、協同實驗室同學)..."}
                      className="w-full p-2 border border-slate-300 rounded-sm text-xs focus:border-[#1b4372] focus:outline-none"
                    />
                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => setIsOtherOperator(false)}
                        className="text-[11px] text-[#1b4372] hover:underline cursor-pointer"
                      >
                        {lang === "en" ? "Back to member selection list" : "返回選擇實驗室固定名冊"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block font-medium text-slate-600 mb-1">
                  {lang === "en" ? "Purpose / Experiment Notes (Optional):" : "實驗用途或備註 (選填):"}
                </label>
                <input
                  type="text"
                  value={pickupNotes}
                  onChange={e => setPickupNotes(e.target.value)}
                  placeholder={lang === "en" ? "e.g., Cell culture, PCR assay, western blot..." : ""}
                  className="w-full p-2 border border-slate-200 rounded-sm text-xs focus:border-[#1b4372] focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedPickupItem(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-sm text-xs font-medium cursor-pointer"
                >
                  {lang === "en" ? "Cancel" : "取消"}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPickup}
                  className="px-4 py-1.5 bg-[#1b4372] hover:bg-[#122e4f] text-white rounded-sm text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingPickup && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {isSubmittingPickup 
                      ? (lang === "en" ? "Saving to Cloud..." : "寫入中...") 
                      : (lang === "en" ? "Confirm Pickup" : "確認登記領取")}
                  </span>
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
                  耗材管理員驗證
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
                請輸入耗材管理員專屬密碼，驗證通過後即可進行新增品項、補貨入庫、手動校正與定期盤點作業。
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
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-sm text-xs cursor-pointer"
                >
                  {lang === "en" ? "Cancel" : "取消"}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRestock}
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-sm text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingRestock && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmittingRestock ? (lang === "en" ? "Saving to Sheet..." : "寫入中...") : (lang === "en" ? "Confirm Restock" : "確認入庫")}</span>
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
                  {lang === "en" ? "Direct Stock Adjustment" : "手動庫存直接修正"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded text-xs space-y-1">
              <div className="font-bold text-slate-900">{adjustItem.name}</div>
              <div className="text-slate-500">
                {lang === "en" ? "Current In-Stock: " : "目前庫存："}
                {adjustItem.currentStock} {adjustItem.unit}
              </div>
            </div>

            <form onSubmit={handleConfirmAdjust} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {lang === "en" ? `Target Adjusted Stock (${adjustItem.unit}) *` : `目標修正後庫存 (${adjustItem.unit}) *`}
                </label>
                <input
                  type="number"
                  min={0}
                  value={adjustNewStock}
                  onChange={e => setAdjustNewStock(parseInt(e.target.value, 10) || 0)}
                  className="w-full p-2 border border-slate-300 rounded-sm text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {lang === "en" ? "Adjustment Reason (Required) *" : "修正原因/說明 (必填) *"}
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder={lang === "en" ? "e.g., Damaged package, inventory recount correction" : "例: 發現破損報廢 2 盒、遺失尋回"}
                  required
                  className="w-full p-2 border border-slate-300 rounded-sm text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-sm text-xs cursor-pointer"
                >
                  {lang === "en" ? "Cancel" : "取消"}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdjust}
                  className="px-4 py-1.5 bg-[#1b4372] hover:bg-[#122e4f] text-white rounded-sm text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingAdjust && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmittingAdjust ? (lang === "en" ? "Saving to Sheet..." : "寫入中...") : (lang === "en" ? "Confirm Adjust" : "確認修正")}</span>
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
                  {editingItem 
                    ? (lang === "en" ? "Edit Consumable Item" : "編輯耗材品項") 
                    : (lang === "en" ? "Add New Consumable Item" : "新增耗材品項")}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsItemFormModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItemForm} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {lang === "en" ? "Consumable Name *" : "耗材名稱 *"}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder={lang === "en" ? "e.g., 1.5 mL Microcentrifuge Tubes" : "如: 1.5 mL 微量離心管 (Microcentrifuge Tubes)"}
                  required
                  className="w-full p-2 border border-slate-300 rounded-sm text-xs focus:border-[#1b4372] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {lang === "en" ? "Category *" : "所屬類別 *"}
                  </label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-sm text-xs"
                  >
                    {CONSUMABLE_CATEGORIES.filter(c => c !== "全部類別").map(c => (
                      <option key={c} value={c}>{getCategoryLabel(c)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {lang === "en" ? "Unit *" : "計量單位 *"}
                  </label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    placeholder={lang === "en" ? "e.g., box, pack, roll, pcs" : "如: 盒、包、捲、個"}
                    required
                    className="w-full p-2 border border-slate-300 rounded-sm text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  {lang === "en" ? "Specification & Model:" : "規格與型號說明:"}
                </label>
                <input
                  type="text"
                  value={formData.spec}
                  onChange={e => setFormData({ ...formData, spec: e.target.value })}
                  placeholder={lang === "en" ? "e.g., 500 pcs/pack, sterile, non-slip" : "如: 500支/包、已滅菌、麻面防滑"}
                  className="w-full p-2 border border-slate-300 rounded-sm text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {!editingItem && (
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      {lang === "en" ? "Initial Stock Quantity *" : "初始入庫數量 *"}
                    </label>
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
                  <label className="block font-bold text-slate-700 mb-1">
                    {lang === "en" ? "Safety Stock Threshold *" : "安全庫存警戒值 *"}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.safeStock}
                    onChange={e => setFormData({ ...formData, safeStock: parseInt(e.target.value, 10) || 0 })}
                    className="w-full p-2 border border-slate-300 rounded-sm text-xs font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {lang === "en" ? "Alert triggers when stock falls at or below this level" : "庫存小於或等於此值時將出現紅色警戒"}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">
                  {lang === "en" ? "Additional Notes:" : "補充備註說明:"}
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={lang === "en" ? "e.g., Molecular bio only, stored in Cabinet B" : "如: 分子生物專用、放置於 B 櫃"}
                  className="w-full p-2 border border-slate-200 rounded-sm text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsItemFormModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-sm text-xs font-medium cursor-pointer"
                >
                  {lang === "en" ? "Cancel" : "取消"}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingItem}
                  className="px-4 py-1.5 bg-[#1b4372] hover:bg-[#122e4f] text-white rounded-sm text-xs font-bold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmittingItem && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {isSubmittingItem 
                      ? (lang === "en" ? "Saving to Google Sheet..." : "正在寫入 Google 試算表...") 
                      : (editingItem 
                          ? (lang === "en" ? "Save Changes" : "儲存修改") 
                          : (lang === "en" ? "Confirm Add Item" : "確認新增"))}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL: MOBILE PICKUP QR CODE & SHELF LABELS GENERATOR                   */}
      {/* ---------------------------------------------------------------------- */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-[#e5e5e0] rounded-sm max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-[#1b4372] text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-amber-300" />
                <div>
                  <h3 className="text-sm font-bold font-serif tracking-wide">
                    {lang === "en" ? "Consumables Mobile QR Code & Shelf Labels" : "行動領用 QR Code 與置物架標籤生成"}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    {lang === "en" ? "Scan with phone camera for instant pickup" : "手機相機直接掃碼即可免登入立即登記領取"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="text-white/80 hover:text-white p-1 text-lg font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-tabs: General vs Item Specific */}
            <div className="flex items-center border-b border-slate-200 bg-slate-50 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setQrModalTab("general")}
                className={`flex-1 py-2.5 font-bold text-center border-b-2 transition ${
                  qrModalTab === "general"
                    ? "border-[#1b4372] text-[#1b4372] bg-white"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                {lang === "en" ? "General Lab Pickup QR" : "① 實驗室通用領用條碼"}
              </button>
              <button
                type="button"
                onClick={() => setQrModalTab("item")}
                className={`flex-1 py-2.5 font-bold text-center border-b-2 transition ${
                  qrModalTab === "item"
                    ? "border-[#1b4372] text-[#1b4372] bg-white"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                {lang === "en" ? "Item Shelf Tag QR" : "② 品項專屬置物架標籤"}
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
              {qrModalTab === "general" ? (
                /* Tab 1: General Lab Pickup QR */
                <div className="space-y-4 text-center">
                  <div className="border border-slate-200 bg-[#fbfbfa] p-4 rounded-sm flex flex-col items-center">
                    <span className="text-[10px] uppercase font-bold text-[#8d734a] font-serif tracking-widest mb-1">
                      EBB Lab · Consumables Self-Service Pickup
                    </span>
                    <h4 className="font-bold text-base text-slate-900 mb-1">
                      實驗室耗材線上自助領用系統
                    </h4>
                    <p className="text-[11px] text-slate-500 max-w-sm mb-3">
                      
                    </p>

                    {/* QR Image */}
                    <div className="w-52 h-52 bg-white p-2.5 border border-slate-300 rounded shadow-xs flex items-center justify-center">
                      {generalQrDataUrl ? (
                        <img src={generalQrDataUrl} alt="General Pickup QR Code" className="w-full h-full object-contain" />
                      ) : (
                        <div className="text-slate-400 flex flex-col items-center gap-1">
                          <RefreshCw className="w-6 h-6 animate-spin text-[#1b4372]" />
                          <span className="text-[11px]">正在產生條碼...</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 text-[11px] text-slate-500 font-mono break-all px-2 py-1 bg-white border border-slate-200 rounded max-w-md">
                      {consumablesScriptUrl}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleCopyText(consumablesScriptUrl)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-sm font-bold transition active:scale-95 shadow-2xs"
                    >
                      {isCopiedQrUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                      <span>{isCopiedQrUrl ? "已複製網址！" : "複製直連網址"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadQrImage(generalQrDataUrl, "EBB_Lab_耗材通用領用_QR.png")}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1b4372] hover:bg-[#122e4f] text-white rounded-sm font-bold shadow-xs transition active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>下載 QR 圖片</span>
                    </button>

                    <a
                      href={consumablesScriptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-sm font-bold transition active:scale-95"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>在新分頁測試</span>
                    </a>
                  </div>
                </div>
              ) : (
                /* Tab 2: Item Specific Shelf Tag QR */
                <div className="space-y-4">
                  {/* Select Item */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      選擇耗材品項 (Select Consumable Item):
                    </label>
                    <select
                      value={activeQrItem?.id || ""}
                      onChange={e => setSelectedQrItemId(e.target.value)}
                      className="w-full p-2 bg-[#fcfcfc] border border-slate-300 rounded-sm text-xs font-medium focus:border-[#1b4372] focus:outline-none"
                    >
                      {items.map(it => (
                        <option key={it.id} value={it.id}>
                          [{it.id}] {it.name} ({it.category}) - 現存: {it.currentStock} {it.unit}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Physical Shelf Label Preview */}
                  {activeQrItem && (
                    <div className="border-2 border-dashed border-[#1b4372]/40 bg-[#fbfbfa] p-4 rounded-sm text-center flex flex-col items-center">
                      <div className="text-[10px] uppercase font-bold text-[#8d734a] font-serif tracking-widest mb-0.5">
                        EBB Lab · Consumable Shelf Tag
                      </div>
                      <h4 className="font-bold text-base text-slate-900">
                        {activeQrItem.name}
                      </h4>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        {activeQrItem.specification ? `規格: ${activeQrItem.specification} · ` : ""}
                        位置: <strong className="text-slate-800">{activeQrItem.location || "耗材存放架"}</strong>
                      </div>

                      {/* QR Code */}
                      <div className="my-3 w-48 h-48 bg-white p-2 border border-slate-200 rounded shadow-xs flex items-center justify-center">
                        {itemQrDataUrl ? (
                          <img src={itemQrDataUrl} alt={`${activeQrItem.name} QR Tag`} className="w-full h-full object-contain" />
                        ) : (
                          <RefreshCw className="w-6 h-6 animate-spin text-[#1b4372]" />
                        )}
                      </div>

                      <div className="inline-flex items-center gap-2 bg-[#1b4372]/10 text-[#1b4372] px-2.5 py-1 rounded text-xs font-mono font-bold">
                        <span>品項編號: {activeQrItem.id}</span>
                        <span>·</span>
                        <span>掃碼直接跳出此品項領用</span>
                      </div>

                      <p className="text-[11px] text-slate-400 mt-2 max-w-sm">
                        手機相機掃描此條碼後，會自動開啟 Web App 並預先選定本品項，只需填寫數量與姓名即可一鍵完成領用！
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {activeQrItem && (
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const itemUrl = consumablesScriptUrl + (consumablesScriptUrl.includes("?") ? "&" : "?") + "item=" + encodeURIComponent(activeQrItem.id);
                          handleCopyText(itemUrl);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-sm font-bold transition active:scale-95 shadow-2xs"
                      >
                        {isCopiedQrUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
                        <span>{isCopiedQrUrl ? "已複製專屬連結！" : "複製專屬連結"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadQrImage(itemQrDataUrl, `EBB_Lab_${activeQrItem.id}_置物架標籤_QR.png`)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1b4372] hover:bg-[#122e4f] text-white rounded-sm font-bold shadow-xs transition active:scale-95"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>下載標籤圖片</span>
                      </button>

                      <a
                        href={consumablesScriptUrl + (consumablesScriptUrl.includes("?") ? "&" : "?") + "item=" + encodeURIComponent(activeQrItem.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-sm font-bold transition active:scale-95"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>在新分頁測試此品項</span>
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 p-3 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-sm font-bold text-xs"
              >
                關閉視窗
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL: SETTINGS FOR GOOGLE APPS SCRIPT WEB APP URL                     */}
      {/* ---------------------------------------------------------------------- */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-[#e5e5e0] rounded-sm max-w-md w-full shadow-2xl p-5 space-y-4 animate-in fade-in duration-150 text-xs">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#1b4372]" />
                <h3 className="text-sm font-bold text-slate-900 font-serif">
                  {lang === "en" ? "Configure Google Apps Script URL" : "設定 Google Apps Script Web App 網址"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-slate-600">
              <p>
              若您在 Google 試算表中重新部署了 <code>Code.gs</code> 與 <code>Index.html</code>，請在此貼入最新產生的「網頁應用程式網址 (Web App URL)」。
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  網頁應用程式網址 (結尾需為 /exec):
                </label>
                <input
                  type="url"
                  value={customScriptUrlInput}
                  onChange={e => setCustomScriptUrlInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycby.../exec"
                  className="w-full p-2 border border-slate-300 rounded-sm text-xs font-mono focus:border-[#1b4372] focus:outline-none"
                />
              </div>

              {testResultMsg && (
                <div className={`p-2.5 rounded text-xs border font-medium ${
                  testResultMsg.success 
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300" 
                    : "bg-rose-50 text-rose-800 border-rose-300"
                }`}>
                  {testResultMsg.text}
                </div>
              )}

              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900">
                <strong>💡 部署關鍵提示：</strong><br />
                在 Apps Script 點擊「部署」→「網頁應用程式」時，「誰可以存取 (Who has access)」務必選擇<strong>「任何人 (Anyone)」</strong>，前端才能免登入直接嵌入與掃碼領取。
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleTestCustomScriptUrl}
                disabled={isTestingUrl || !customScriptUrlInput.trim()}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-sm font-bold transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isTestingUrl && <RefreshCw className="w-3 h-3 animate-spin text-[#1b4372]" />}
                <span>{isTestingUrl ? "測試連線中..." : "測試連線"}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-sm font-medium"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomScriptUrl}
                  className="px-4 py-1.5 bg-[#1b4372] hover:bg-[#122e4f] text-white rounded-sm font-bold shadow-xs transition"
                >
                  儲存並更新
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
