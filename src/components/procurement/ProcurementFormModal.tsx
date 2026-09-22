import React, { useState, useEffect } from "react";
import { 
  ProcurementCategory, 
  ProcurementItem, 
  ProcurementItemLine,
  VendorQuote, 
  HistoricalCatalogItem, 
  CurrencyCode
} from "../../types/procurement";
import { 
  DEFAULT_VENDORS, 
  DEFAULT_HISTORICAL_CATALOG,
  DEFAULT_SHOPPING_PLATFORMS,
  CURRENCY_CONFIG,
  convertToTwdEstimate,
  formatPriceWithCurrency
} from "../../data/procurementData";
import { 
  X, 
  FlaskConical, 
  Package, 
  Cpu, 
  Plus, 
  Trash2, 
  Sparkles, 
  History, 
  Check, 
  AlertCircle,
  Building2,
  DollarSign,
  ExternalLink,
  Layers,
  ChevronDown,
  ChevronUp,
  Store,
  Coins
} from "lucide-react";

interface FormItemLine {
  id: string;
  category: ProcurementCategory;
  itemName: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice: number;
  currency: CurrencyCode;
  platform: string;
  productUrl: string;
  purpose: string;
  vendorName: string;
  // Specific fields
  casNumber: string;
  purity: string;
  packageSize: string;
  chemicalEnglishName: string;
  brand: string;
  ghsHazard: string;
  msdsUrl: string;
  specModel: string;
  subCategory: string;
  eqModelNumber: string;
  warrantyPeriod: string;
  requiresInstallation: boolean;
  requiresTraining: boolean;
  quotes: VendorQuote[];
}

interface ProcurementFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: Omit<ProcurementItem, "id" | "requisitionNo" | "createdAt" | "status" | "purchaser">) => void;
  lang: "zh" | "en";
  historicalCatalog?: HistoricalCatalogItem[];
  defaultApplicantName?: string;
  defaultApplicantEmail?: string;
  savedPlatforms?: string[];
  onSaveNewPlatform?: (platform: string) => void;
}

export default function ProcurementFormModal({
  isOpen,
  onClose,
  onSubmit,
  lang,
  historicalCatalog = DEFAULT_HISTORICAL_CATALOG,
  defaultApplicantName = "",
  defaultApplicantEmail = "",
  savedPlatforms = DEFAULT_SHOPPING_PLATFORMS,
  onSaveNewPlatform
}: ProcurementFormModalProps) {
  // Common requisition info
  const [applicantName, setApplicantName] = useState(defaultApplicantName);
  const [applicantEmail, setApplicantEmail] = useState(defaultApplicantEmail);
  const [department, setDepartment] = useState("EBB Lab");
  const [overallPurpose, setOverallPurpose] = useState("");
  const [description, setDescription] = useState("");
  const [notifyProfessor, setNotifyProfessor] = useState(false); // 低於3000元預設不需要，申請人可自行勾選

  // Local available platforms
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>(savedPlatforms);

  useEffect(() => {
    setAvailablePlatforms(savedPlatforms);
  }, [savedPlatforms]);

  // Items list
  const [items, setItems] = useState<FormItemLine[]>([
    createDefaultItemLine("chemical")
  ]);
  const [activeItemIndex, setActiveItemIndex] = useState<number>(0);

  // Autocomplete state for active item
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<HistoricalCatalogItem[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [autoFilledNotice, setAutoFilledNotice] = useState<string | null>(null);

  function createDefaultItemLine(initialCategory: ProcurementCategory = "chemical"): FormItemLine {
    return {
      id: `line_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      category: initialCategory,
      itemName: "",
      quantity: 1,
      unit: initialCategory === "chemical" ? "瓶" : initialCategory === "equipment" ? "台" : "盒",
      estimatedUnitPrice: 0,
      currency: "TWD",
      platform: "蝦皮",
      productUrl: "",
      purpose: "",
      vendorName: DEFAULT_VENDORS[0],
      casNumber: "",
      purity: "",
      packageSize: "",
      chemicalEnglishName: "",
      brand: "",
      ghsHazard: "",
      msdsUrl: "",
      specModel: "",
      subCategory: "實驗耗材",
      eqModelNumber: "",
      warrantyPeriod: "1 年保固",
      requiresInstallation: false,
      requiresTraining: false,
      quotes: [
        { id: `q_${Date.now()}`, vendorName: DEFAULT_VENDORS[0], unitPrice: 0, currency: "NTD", note: "建議報價", isRecommended: true }
      ]
    };
  }

  // Active item reference
  const currentItem = items[activeItemIndex] || items[0];

  // Filter autocomplete suggestions when currentItem's itemName changes
  useEffect(() => {
    if (!currentItem || !currentItem.itemName.trim() || currentItem.itemName.length < 1) {
      setAutocompleteSuggestions([]);
      return;
    }
    const q = currentItem.itemName.toLowerCase();
    const matched = historicalCatalog.filter(
      item => 
        item.itemName.toLowerCase().includes(q) ||
        (item.englishName && item.englishName.toLowerCase().includes(q)) ||
        (item.casNumber && item.casNumber.includes(q))
    );
    setAutocompleteSuggestions(matched);
  }, [currentItem?.itemName, historicalCatalog]);

  if (!isOpen) return null;

  const handleUpdateActiveItem = <K extends keyof FormItemLine>(key: K, value: FormItemLine[K]) => {
    setItems(prev => prev.map((item, idx) => idx === activeItemIndex ? { ...item, [key]: value } : item));
  };

  const handleSelectHistoricalItem = (historicalItem: HistoricalCatalogItem) => {
    setItems(prev => prev.map((item, idx) => {
      if (idx !== activeItemIndex) return item;

      return {
        ...item,
        itemName: historicalItem.itemName,
        category: historicalItem.category,
        vendorName: historicalItem.vendorName || item.vendorName,
        estimatedUnitPrice: historicalItem.lastUnitPrice || item.estimatedUnitPrice,
        unit: historicalItem.category === "chemical" ? "瓶" : historicalItem.category === "equipment" ? "台" : "盒",
        casNumber: historicalItem.casNumber || item.casNumber,
        purity: historicalItem.purity || item.purity,
        packageSize: historicalItem.packageSize || item.packageSize,
        chemicalEnglishName: historicalItem.englishName || item.chemicalEnglishName,
        brand: historicalItem.brand || item.brand,
        specModel: historicalItem.specModel || item.specModel,
        eqModelNumber: historicalItem.specModel || item.eqModelNumber,
        quotes: [
          {
            id: `q_${Date.now()}`,
            vendorName: historicalItem.vendorName || DEFAULT_VENDORS[0],
            unitPrice: historicalItem.lastUnitPrice || 0,
            currency: historicalItem.currency || "NTD",
            note: "歷史採購價格參考",
            isRecommended: true
          }
        ]
      };
    }));

    setShowSuggestions(false);
    setAutoFilledNotice(lang === "zh" ? `已成功帶入「${historicalItem.itemName}」之歷史採購規格與參考單價！` : `Auto-filled details for "${historicalItem.itemName}"!`);
    setTimeout(() => setAutoFilledNotice(null), 4000);
  };

  // Add Item Line
  const handleAddItemLine = () => {
    const newItem = createDefaultItemLine("consumable");
    setItems(prev => [...prev, newItem]);
    setActiveItemIndex(items.length);
  };

  // Remove Item Line
  const handleRemoveItemLine = (indexToRemove: number) => {
    if (items.length <= 1) {
      alert(lang === "zh" ? "請購單至少需包含一個品項！" : "Requisition must contain at least one item!");
      return;
    }
    setItems(prev => prev.filter((_, idx) => idx !== indexToRemove));
    if (activeItemIndex >= indexToRemove) {
      setActiveItemIndex(Math.max(0, activeItemIndex - 1));
    }
  };

  // Vendor Quotes handlers for active item
  const handleAddQuote = () => {
    const newQuote: VendorQuote = {
      id: `q_${Date.now()}`,
      vendorName: DEFAULT_VENDORS[0],
      unitPrice: currentItem.estimatedUnitPrice || 0,
      currency: "NTD",
      note: "",
      isRecommended: false
    };
    handleUpdateActiveItem("quotes", [...currentItem.quotes, newQuote]);
  };

  const handleUpdateQuote = (quoteId: string, field: keyof VendorQuote, value: any) => {
    const updated = currentItem.quotes.map(q => {
      if (field === "isRecommended" && value === true) {
        return q.id === quoteId ? { ...q, isRecommended: true } : { ...q, isRecommended: false };
      }
      return q.id === quoteId ? { ...q, [field]: value } : q;
    });
    handleUpdateActiveItem("quotes", updated);
    if (field === "isRecommended" && value === true) {
      const targetQuote = updated.find(q => q.id === quoteId);
      if (targetQuote) {
        handleUpdateActiveItem("vendorName", targetQuote.vendorName);
        if (targetQuote.unitPrice > 0) {
          handleUpdateActiveItem("estimatedUnitPrice", targetQuote.unitPrice);
        }
      }
    }
  };

  const handleRemoveQuote = (quoteId: string) => {
    if (currentItem.quotes.length <= 1) return;
    handleUpdateActiveItem("quotes", currentItem.quotes.filter(q => q.id !== quoteId));
  };

  // Calculated Grand Total in TWD equivalent
  const grandTotal = items.reduce((sum, item) => {
    const lineTotal = item.quantity * item.estimatedUnitPrice;
    const twdEstimate = convertToTwdEstimate(lineTotal, item.currency || "TWD");
    return sum + twdEstimate;
  }, 0);

  const handleAddCustomPlatform = (newPlatform: string) => {
    const trimmed = newPlatform.trim();
    if (!trimmed) return;
    if (!availablePlatforms.includes(trimmed)) {
      const updated = [...availablePlatforms, trimmed];
      setAvailablePlatforms(updated);
      if (onSaveNewPlatform) {
        onSaveNewPlatform(trimmed);
      }
    }
    handleUpdateActiveItem("platform", trimmed);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate overall purpose
    if (!overallPurpose.trim()) {
      alert(lang === "zh" ? "請填寫請購目的（研究用途/原因），以利經費審核與核銷！" : "Please provide overall procurement purpose for audit compliance!");
      return;
    }

    // Validate each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.itemName.trim()) {
        setActiveItemIndex(i);
        alert(lang === "zh" ? `請輸入品項 #${i + 1} 之品名！` : `Please enter item name for item #${i + 1}!`);
        return;
      }
      if (item.quantity <= 0) {
        setActiveItemIndex(i);
        alert(lang === "zh" ? `品項 #${i + 1} 數量必須大於 0！` : `Quantity for item #${i + 1} must be > 0!`);
        return;
      }
      // If platform is custom, remember it
      if (item.platform && !availablePlatforms.includes(item.platform.trim())) {
        handleAddCustomPlatform(item.platform);
      }
    }

    // Prepare line items
    const lineItems: ProcurementItemLine[] = items.map((it, idx) => ({
      id: it.id || `line_${Date.now()}_${idx}`,
      category: it.category,
      itemName: it.itemName.trim(),
      quantity: it.quantity,
      unit: it.unit,
      estimatedUnitPrice: it.estimatedUnitPrice,
      currency: it.currency || "TWD",
      estimatedTotalPrice: it.quantity * it.estimatedUnitPrice,
      platform: it.platform?.trim() || undefined,
      productUrl: it.productUrl.trim() || undefined,
      purpose: it.purpose.trim() || overallPurpose.trim(),
      vendorName: it.platform ? `${it.platform} (${it.vendorName || "直購"})` : it.vendorName,
      status: "pending_assistant",
      quotes: it.quotes,
      chemicalDetails: it.category === "chemical" ? {
        casNumber: it.casNumber.trim(),
        purity: it.purity.trim(),
        packageSize: it.packageSize.trim(),
        chemicalEnglishName: it.chemicalEnglishName.trim(),
        brand: it.brand.trim(),
        ghsHazard: it.ghsHazard ? it.ghsHazard.split(",").map(s => s.trim()) : undefined,
        msdsUrl: it.msdsUrl.trim()
      } : undefined,
      consumableDetails: it.category === "consumable" ? {
        specModel: it.specModel.trim(),
        subCategory: it.subCategory.trim()
      } : undefined,
      equipmentDetails: it.category === "equipment" ? {
        modelNumber: it.eqModelNumber.trim(),
        warrantyPeriod: it.warrantyPeriod.trim(),
        requiresInstallation: it.requiresInstallation,
        requiresTraining: it.requiresTraining
      } : undefined
    }));

    // Primary summary name
    const primaryItem = items[0];
    const requisitionItemName = items.length === 1 
      ? primaryItem.itemName.trim() 
      : `${primaryItem.itemName.trim()} 等 ${items.length} 筆品項`;

    const requiresProfessorApproval = grandTotal >= 3000 || items.some(it => convertToTwdEstimate(it.estimatedUnitPrice, it.currency || "TWD") >= 3000);

    onSubmit({
      applicantName,
      applicantEmail,
      department,
      category: primaryItem.category,
      itemName: requisitionItemName,
      quantity: items.length === 1 ? primaryItem.quantity : items.length,
      unit: items.length === 1 ? primaryItem.unit : "項",
      estimatedUnitPrice: items.length === 1 ? primaryItem.estimatedUnitPrice : grandTotal,
      currency: primaryItem.currency || "TWD",
      estimatedTotalPrice: grandTotal,
      purpose: overallPurpose.trim(),
      description: description.trim(),
      vendorName: primaryItem.platform ? `${primaryItem.platform} (${primaryItem.vendorName})` : primaryItem.vendorName,
      platform: primaryItem.platform?.trim() || undefined,
      productUrl: primaryItem.productUrl.trim() || undefined,
      quotes: primaryItem.quotes,
      items: lineItems,
      chemicalDetails: primaryItem.category === "chemical" ? lineItems[0].chemicalDetails : undefined,
      consumableDetails: primaryItem.category === "consumable" ? lineItems[0].consumableDetails : undefined,
      equipmentDetails: primaryItem.category === "equipment" ? lineItems[0].equipmentDetails : undefined,
      requiresProfessorApproval: true,
      notifyProfessor: true
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-[#e5e5e0] rounded-sm shadow-2xl max-w-4xl w-full my-auto flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#f8f8f5] border-b border-[#e5e5e0] flex items-center justify-between shrink-0">
          <div>
            <div className="text-[10px] font-bold text-[#8d734a] tracking-widest uppercase font-serif italic">
              {lang === "zh" ? "實驗室線上請購單申請 (多品項支援)" : "Lab Purchase Requisition (Multi-Item Support)"}
            </div>
            <h2 className="text-xl font-bold text-slate-800 font-serif flex items-center gap-2">
              <span>{lang === "zh" ? "填寫請購申請單" : "Submit Requisition Form"}</span>
              <span className="text-xs font-mono font-normal bg-blue-100 text-[#1b4372] px-2 py-0.5 rounded">
                {items.length} {lang === "zh" ? "個品項" : "Items"}
              </span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-sm transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 text-xs font-sans">
          {/* Notice Banner */}
          {autoFilledNotice && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-sm flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{autoFilledNotice}</span>
            </div>
          )}

          {/* Section 1: Applicant Info */}
          <div className="bg-[#fbfbfa] p-4 rounded-sm border border-[#e5e5e0] space-y-3">
            <h3 className="font-bold text-slate-800 text-xs font-serif flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#1b4372]" />
              <span>{lang === "zh" ? "1. 申請人資料 (Applicant Info)" : "1. Applicant Information"}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  {lang === "zh" ? "申請人姓名 *" : "Applicant Name *"}
                </label>
                <input
                  type="text"
                  required
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  placeholder={lang === "zh" ? "請輸入申請人姓名" : "Enter applicant name"}
                  className="w-full bg-white border border-[#e5e5e0] rounded-sm p-2 text-xs focus:border-[#1b4372] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">
                  {lang === "zh" ? "通知 Email *" : "Applicant Email *"}
                </label>
                <input
                  type="email"
                  required
                  value={applicantEmail}
                  onChange={(e) => setApplicantEmail(e.target.value)}
                  placeholder="name@mail.nsysu.edu.tw"
                  className="w-full bg-white border border-[#e5e5e0] rounded-sm p-2 text-xs focus:border-[#1b4372] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Overall Purpose */}
          <div className="space-y-1.5">
            <label className="block text-slate-800 font-bold">
              {lang === "zh" ? "2. 請購整體目的與研究專案說明 * [經費核銷必備]" : "2. Requisition Purpose & Research Justification *"}
            </label>
            <textarea
              required
              rows={2}
              value={overallPurpose}
              onChange={(e) => setOverallPurpose(e.target.value)}
              placeholder={lang === "zh" ? "請敘明本次請購品項之總體研究用途、進行之實驗主題或必要性 (作為初審與教授核定依據)..." : "State the overall research purpose and experiment justification..."}
              className="w-full bg-white border border-[#e5e5e0] rounded-sm p-2.5 text-xs focus:border-[#1b4372] focus:outline-none"
            />
          </div>

          {/* Section 3: Multi-Item Management Tabs */}
          <div className="border border-[#e5e5e0] rounded-sm bg-white overflow-hidden shadow-xs">
            <div className="p-3 bg-[#f8f8f5] border-b border-[#e5e5e0] flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#1b4372]" />
                <span className="font-bold text-slate-800 text-xs font-serif">
                  {lang === "zh" ? "3. 請購清單明細 (支援多品項一次送出)" : "3. Requisition Line Items"}
                </span>
                <span className="text-[11px] text-slate-500">
                  ({items.length} {lang === "zh" ? "項" : "items"})
                </span>
              </div>

              <button
                type="button"
                onClick={handleAddItemLine}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1b4372] hover:bg-[#122e4f] text-white rounded-sm text-xs font-bold transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === "zh" ? "+ 新增請購品項" : "+ Add Item"}</span>
              </button>
            </div>

            {/* Tab navigation for items */}
            <div className="flex items-center gap-1.5 p-2 bg-[#fbfbfa] border-b border-[#e5e5e0] overflow-x-auto">
              {items.map((item, idx) => {
                const isActive = idx === activeItemIndex;
                const itemTotal = item.quantity * item.estimatedUnitPrice;

                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveItemIndex(idx)}
                    className={`cursor-pointer px-3 py-1.5 rounded-sm border text-xs flex items-center gap-2 shrink-0 transition ${
                      isActive
                        ? "bg-white border-[#1b4372] text-[#1b4372] font-bold shadow-xs"
                        : "bg-[#f8f8f5] border-[#e5e5e0] text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-mono">
                      {idx + 1}
                    </span>
                    <span className="truncate max-w-[120px]">
                      {item.itemName || (lang === "zh" ? `品項 #${idx + 1}` : `Item #${idx + 1}`)}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      NT$ {itemTotal.toLocaleString()}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveItemLine(idx);
                        }}
                        className="p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                        title="刪除此品項"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Active Item Editing Form Area */}
            <div className="p-4 space-y-5 bg-white">
              {/* Category selector for current item */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  {lang === "zh" ? `品項 #${activeItemIndex + 1} 類別 (Category)` : `Item #${activeItemIndex + 1} Category`}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateActiveItem("category", "chemical")}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-sm border text-xs font-bold transition ${
                      currentItem.category === "chemical"
                        ? "bg-[#1b4372] text-white border-[#1b4372] shadow-xs"
                        : "bg-[#fbfbfa] text-slate-700 border-[#e5e5e0] hover:bg-[#f4f1ea]"
                    }`}
                  >
                    <FlaskConical className="w-3.5 h-3.5" />
                    <span>{lang === "zh" ? "藥品 / 化學試劑" : "Chemical Reagent"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateActiveItem("category", "consumable")}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-sm border text-xs font-bold transition ${
                      currentItem.category === "consumable"
                        ? "bg-[#1b4372] text-white border-[#1b4372] shadow-xs"
                        : "bg-[#fbfbfa] text-slate-700 border-[#e5e5e0] hover:bg-[#f4f1ea]"
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>{lang === "zh" ? "實驗耗材 / 雜物" : "Consumables & Misc"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleUpdateActiveItem("category", "equipment")}
                    className={`flex items-center justify-center gap-1.5 p-2 rounded-sm border text-xs font-bold transition ${
                      currentItem.category === "equipment"
                        ? "bg-[#1b4372] text-white border-[#1b4372] shadow-xs"
                        : "bg-[#fbfbfa] text-slate-700 border-[#e5e5e0] hover:bg-[#f4f1ea]"
                    }`}
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>{lang === "zh" ? "儀器 / 實驗設備" : "Equipment & Instrument"}</span>
                  </button>
                </div>
              </div>

              {/* Item Name with Autocomplete */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-700 font-bold">
                    {lang === "zh" ? `品項名稱 (支援歷史紀錄自動帶入) *` : `Item Name (With History Autocomplete) *`}
                  </label>
                  <span className="text-[10px] text-[#8d734a] flex items-center gap-1 font-mono">
                    <History className="w-3 h-3" />
                    {lang === "zh" ? "輸入關鍵字可一鍵套用歷史品項" : "Type to search catalog"}
                  </span>
                </div>

                <input
                  type="text"
                  required
                  value={currentItem.itemName}
                  onChange={(e) => {
                    handleUpdateActiveItem("itemName", e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder={
                    currentItem.category === "chemical" 
                      ? "例如: 氯化膽鹼 (Choline Chloride) "
                      : currentItem.category === "equipment" 
                        ? "例如: 數位控溫磁石攪拌器 / 旋轉黏度計"
                        : "例如: 0.22 μm PTFE 針筒過濾膜 "
                  }
                  className="w-full bg-white border border-[#e5e5e0] rounded-sm p-2.5 text-xs font-serif font-bold text-slate-900 focus:border-[#1b4372] focus:outline-none"
                />

                {/* Autocomplete Popup List */}
                {showSuggestions && autocompleteSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#1b4372] rounded-sm shadow-xl z-20 max-h-56 overflow-y-auto divide-y divide-slate-100">
                    <div className="p-1.5 bg-[#f4f1ea] text-[10px] font-bold text-[#1b4372] flex items-center justify-between">
                      <span>{lang === "zh" ? "實驗室歷史採購庫推薦：" : "Historical Items Matches:"}</span>
                      <button type="button" onClick={() => setShowSuggestions(false)} className="text-slate-400 hover:text-slate-700">
                        ✕
                      </button>
                    </div>
                    {autocompleteSuggestions.map((sug) => (
                      <button
                        key={sug.id}
                        type="button"
                        onClick={() => handleSelectHistoricalItem(sug)}
                        className="w-full text-left p-2.5 hover:bg-blue-50 transition flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-bold text-slate-800">{sug.itemName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {sug.englishName || sug.specModel} · {sug.vendorName}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-[#1b4372] font-mono">
                            NT$ {sug.lastUnitPrice.toLocaleString()}
                          </span>
                          <span className="block text-[9px] text-slate-400">上次單價</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Shopping Platform & Product Link */}
              <div className="p-3 bg-[#f8f8f5] border border-[#e5e5e0] rounded-sm space-y-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-800 font-bold flex items-center gap-1.5 text-xs">
                      <Store className="w-3.5 h-3.5 text-amber-700" />
                      <span>{lang === "zh" ? "購物平台 (科研市集/蝦皮/淘寶等，可自行輸入或點選歷史)" : "Shopping Platform (Custom input or click saved)"}</span>
                    </label>
                    <span className="text-[10px] text-slate-500">
                      {lang === "zh" ? "輸入新平台會自動記錄，下次可直接點選" : "New platforms will be remembered"}
                    </span>
                  </div>

                  {/* Saved Platform Clickable Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    {availablePlatforms.map((plat) => {
                      const isSelected = currentItem.platform === plat;
                      return (
                        <button
                          key={plat}
                          type="button"
                          onClick={() => handleUpdateActiveItem("platform", plat)}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium border transition ${
                            isSelected
                              ? "bg-amber-600 text-white border-amber-600 shadow-xs font-bold"
                              : "bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:border-amber-300"
                          }`}
                        >
                          {plat}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Platform Input Field */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={currentItem.platform || ""}
                      onChange={(e) => handleUpdateActiveItem("platform", e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (currentItem.platform?.trim()) {
                            handleAddCustomPlatform(currentItem.platform.trim());
                          }
                        }
                      }}
                      placeholder="自行輸入購物平台 (例如: 科研市集、蝦皮、淘寶、1688等)..."
                      className="w-full bg-white border border-[#e5e5e0] rounded-sm p-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-[#1b4372] focus:outline-none"
                    />
                    {currentItem.platform && !availablePlatforms.includes(currentItem.platform.trim()) && (
                      <button
                        type="button"
                        onClick={() => handleAddCustomPlatform(currentItem.platform.trim())}
                        className="shrink-0 px-2 py-1 bg-amber-50 border border-amber-300 text-amber-900 rounded-sm text-[11px] font-bold hover:bg-amber-100 transition flex items-center gap-1"
                        title="將此平台加入快捷按鈕，供下次直接點選"
                      >
                        <Plus className="w-3 h-3" />
                        <span>記住此平台</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Product URL */}
                <div className="pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 font-medium flex items-center gap-1 text-[11px]">
                      <ExternalLink className="w-3 h-3 text-blue-600" />
                      <span>{lang === "zh" ? "商品網址 / 規格連結 (選填)" : "Product Specs / Purchase URL (Optional)"}</span>
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={currentItem.productUrl}
                      onChange={(e) => handleUpdateActiveItem("productUrl", e.target.value)}
                      placeholder="https://item.taobao.com/... 或 https://shopee.tw/..."
                      className="w-full bg-white border border-[#e5e5e0] rounded-sm p-1.5 text-xs font-mono text-blue-700 placeholder:text-slate-400 focus:border-[#1b4372] focus:outline-none"
                    />
                    {currentItem.productUrl && (
                      <a
                        href={currentItem.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 px-2.5 py-1.5 bg-white border border-[#e5e5e0] hover:bg-slate-50 text-blue-700 rounded-sm text-xs font-bold flex items-center gap-1"
                        title="測試開啟連結"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{lang === "zh" ? "預覽" : "Open"}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Dynamic Category Specific Details */}
              {currentItem.category === "chemical" && (
                <div className="p-4 bg-emerald-50/40 border border-emerald-200 rounded-sm space-y-3 animate-fadeIn">
                  <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <FlaskConical className="w-4 h-4 text-emerald-700" />
                    <span>{lang === "zh" ? "藥品化學品專屬欄位 (Chemical Details)" : "Chemical Specific Details"}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">CAS Number</label>
                      <input
                        type="text"
                        value={currentItem.casNumber}
                        onChange={(e) => handleUpdateActiveItem("casNumber", e.target.value)}
                        placeholder="e.g. 67-48-1"
                        className="w-full bg-white border border-[#e5e5e0] rounded-sm p-1.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">純度 (Purity / Grade)</label>
                      <input
                        type="text"
                        value={currentItem.purity}
                        onChange={(e) => handleUpdateActiveItem("purity", e.target.value)}
                        placeholder="e.g. >=99% AR / HPLC Grade"
                        className="w-full bg-white border border-[#e5e5e0] rounded-sm p-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">包裝規格 (Package Size)</label>
                      <input
                        type="text"
                        value={currentItem.packageSize}
                        onChange={(e) => handleUpdateActiveItem("packageSize", e.target.value)}
                        placeholder="e.g. 500 g / 4 L / 25 kg"
                        className="w-full bg-white border border-[#e5e5e0] rounded-sm p-1.5 text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">英文化學品名 (English Name)</label>
                      <input
                        type="text"
                        value={currentItem.chemicalEnglishName}
                        onChange={(e) => handleUpdateActiveItem("chemicalEnglishName", e.target.value)}
                        placeholder="e.g. Choline Chloride, ReagentPlus"
                        className="w-full bg-white border border-[#e5e5e0] rounded-sm p-1.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">廠牌 (Brand)</label>
                      <input
                        type="text"
                        value={currentItem.brand}
                        onChange={(e) => handleUpdateActiveItem("brand", e.target.value)}
                        placeholder="e.g. Sigma-Aldrich / TCI / Acros"
                        className="w-full bg-white border border-[#e5e5e0] rounded-sm p-1.5 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentItem.category === "consumable" && (
                <div className="p-4 bg-amber-50/40 border border-amber-200 rounded-sm space-y-3 animate-fadeIn">
                  <div className="font-bold text-amber-950 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-amber-700" />
                    <span>{lang === "zh" ? "雜物耗材專屬欄位 (Consumables Details)" : "Consumable Details"}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">規格型號 (Specification)</label>
                      <input
                        type="text"
                        value={currentItem.specModel}
                        onChange={(e) => handleUpdateActiveItem("specModel", e.target.value)}
                        placeholder="e.g. 25mm 0.22um PTFE, 100 pcs/box"
                        className="w-full bg-white border border-[#e5e5e0] rounded-sm p-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">用途分類 (Sub-category)</label>
                      <select
                        value={currentItem.subCategory}
                        onChange={(e) => handleUpdateActiveItem("subCategory", e.target.value)}
                        className="w-full bg-white border border-[#e5e5e0] rounded-sm p-1.5 text-xs"
                      >
                        <option value="實驗耗材">實驗耗材 (Lab Consumables)</option>
                        <option value="玻璃量器">玻璃量器 (Glassware)</option>
                        <option value="防護用品">防護用品 (PPE / Gloves)</option>
                        <option value="辦公文具">辦公文具 (Stationery)</option>
                        <option value="清潔耗品">清潔耗品 (Cleaning)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {currentItem.category === "equipment" && (
                <div className="p-4 bg-blue-50/40 border border-blue-200 rounded-sm space-y-3 animate-fadeIn">
                  <div className="font-bold text-blue-950 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-blue-700" />
                    <span>{lang === "zh" ? "儀器設備專屬欄位 (Equipment Details)" : "Equipment Details"}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">型號與規格 (Model & Spec)</label>
                      <input
                        type="text"
                        value={currentItem.eqModelNumber}
                        onChange={(e) => handleUpdateActiveItem("eqModelNumber", e.target.value)}
                        placeholder="e.g. Corning PC-420D / NDJ-9S"
                        className="w-full bg-white border border-[#e5e5e0] rounded-sm p-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-medium mb-1">保固期限 (Warranty Period)</label>
                      <input
                        type="text"
                        value={currentItem.warrantyPeriod}
                        onChange={(e) => handleUpdateActiveItem("warrantyPeriod", e.target.value)}
                        placeholder="e.g. 原廠 1 年保固"
                        className="w-full bg-white border border-[#e5e5e0] rounded-sm p-1.5 text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex gap-6 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentItem.requiresInstallation}
                        onChange={(e) => handleUpdateActiveItem("requiresInstallation", e.target.checked)}
                        className="rounded text-[#1b4372]"
                      />
                      <span>需原廠安裝 (Requires Installation)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentItem.requiresTraining}
                        onChange={(e) => handleUpdateActiveItem("requiresTraining", e.target.checked)}
                        className="rounded text-[#1b4372]"
                      />
                      <span>需進行操作教育訓練 (Requires Training)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Quantity, Unit & Multi-Currency Pricing */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-[#fdfdfc] p-3 border border-[#e5e5e0] rounded-sm">
                <div className="sm:col-span-3">
                  <label className="block text-slate-700 font-bold mb-1">{lang === "zh" ? "數量 *" : "Quantity *"}</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={currentItem.quantity}
                    onChange={(e) => handleUpdateActiveItem("quantity", Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-white border border-[#e5e5e0] rounded-sm p-2 text-xs font-mono font-bold"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-slate-700 font-bold mb-1">{lang === "zh" ? "單位 *" : "Unit *"}</label>
                  <input
                    type="text"
                    required
                    value={currentItem.unit}
                    onChange={(e) => handleUpdateActiveItem("unit", e.target.value)}
                    placeholder="瓶 / 盒 / 台 / 支 / 包"
                    className="w-full bg-white border border-[#e5e5e0] rounded-sm p-2 text-xs"
                  />
                </div>

                <div className="sm:col-span-6 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-700 font-bold flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-amber-700" />
                      <span>{lang === "zh" ? "單價幣種 (Currency) *" : "Currency & Unit Price *"}</span>
                    </label>
                    {/* Currency selector buttons */}
                    <div className="inline-flex rounded-sm border border-slate-200 p-0.5 bg-slate-100">
                      {(["TWD", "CNY", "USD"] as CurrencyCode[]).map((c) => {
                        const isCur = (currentItem.currency || "TWD") === c;
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => handleUpdateActiveItem("currency", c)}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-xs transition ${
                              isCur
                                ? "bg-[#1b4372] text-white shadow-xs"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                          >
                            {CURRENCY_CONFIG[c].nameZh}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-stretch w-full rounded-sm border border-[#e5e5e0] bg-white focus-within:border-[#1b4372] focus-within:ring-1 focus-within:ring-[#1b4372] shadow-2xs overflow-hidden">
                      <span className="inline-flex items-center justify-center px-3 bg-slate-100/80 border-r border-[#e5e5e0] text-xs font-bold font-mono text-slate-600 select-none shrink-0 tracking-wider">
                        {CURRENCY_CONFIG[currentItem.currency || "TWD"].symbol}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        value={currentItem.estimatedUnitPrice === 0 ? "" : currentItem.estimatedUnitPrice}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleUpdateActiveItem("estimatedUnitPrice", val === "" ? 0 : Math.max(0, parseFloat(val) || 0));
                        }}
                        className="w-full bg-white px-3 py-2 text-xs font-mono font-bold text-[#1b4372] placeholder:text-slate-300 focus:outline-none"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {/* Realtime conversion hint if foreign currency */}
                  {(currentItem.currency === "CNY" || currentItem.currency === "USD") && (
                    <div className="text-[11px] text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-200 font-mono flex items-center justify-between">
                      <span>
                        換算參考：約合 NT$ {convertToTwdEstimate(currentItem.estimatedUnitPrice, currentItem.currency).toLocaleString()} / {currentItem.unit}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        (匯率: {CURRENCY_CONFIG[currentItem.currency].exchangeRateToTwd})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Multi-Vendor Quotes & Price Comparison */}
              <div className="p-3 bg-[#fbfbfa] border border-[#e5e5e0] rounded-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs font-serif">
                      {lang === "zh" ? "廠商報價與比價機制 (Vendor Quotes Comparison)" : "Multi-Vendor Quotes Comparison"}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {lang === "zh" ? "可新增多家廠商報價，並點選「推薦採購」" : "Add quotes to compare prices and tag recommended vendor"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddQuote}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#e5e5e0] hover:bg-slate-50 text-slate-700 rounded-sm text-[11px] font-bold"
                  >
                    <Plus className="w-3 h-3 text-[#1b4372]" />
                    <span>{lang === "zh" ? "新增報價廠商" : "Add Vendor Quote"}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {currentItem.quotes.map((q) => (
                    <div key={q.id} className="p-2.5 bg-white border border-[#e5e5e0] rounded-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={q.vendorName}
                          onChange={(e) => handleUpdateQuote(q.id, "vendorName", e.target.value)}
                          placeholder="廠商名稱 (如: Sigma / TCI / 景明)"
                          className="w-full border border-slate-200 rounded-sm p-1.5 text-xs font-medium"
                        />
                      </div>
                      <div className="w-32">
                        <input
                          type="number"
                          value={q.unitPrice || ""}
                          onChange={(e) => handleUpdateQuote(q.id, "unitPrice", parseInt(e.target.value) || 0)}
                          placeholder="單價 (NT$)"
                          className="w-full border border-slate-200 rounded-sm p-1.5 text-xs font-mono font-bold"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={q.note || ""}
                          onChange={(e) => handleUpdateQuote(q.id, "note", e.target.value)}
                          placeholder="交期、規格或折扣備註"
                          className="w-full border border-slate-200 rounded-sm p-1.5 text-xs text-slate-600"
                        />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuote(q.id, "isRecommended", true)}
                          className={`px-2 py-1 rounded-sm text-[10px] font-bold border transition ${
                            q.isRecommended
                              ? "bg-[#1b4372] text-white border-[#1b4372]"
                              : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {q.isRecommended ? "✓ 推薦廠商" : "設為推薦"}
                        </button>
                        {currentItem.quotes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveQuote(q.id)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded-sm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Item Subtotal Bar */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-sm flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">
                  品項 #{activeItemIndex + 1} 小計: {currentItem.quantity} {currentItem.unit} × {formatPriceWithCurrency(currentItem.estimatedUnitPrice, currentItem.currency || "TWD")}
                </span>
                <div className="text-right font-mono">
                  <span className="font-bold text-[#1b4372]">
                    {formatPriceWithCurrency(currentItem.quantity * currentItem.estimatedUnitPrice, currentItem.currency || "TWD")}
                  </span>
                  {(currentItem.currency === "CNY" || currentItem.currency === "USD") && (
                    <span className="text-[11px] text-slate-500 ml-2">
                      (約合 NT$ {convertToTwdEstimate(currentItem.quantity * currentItem.estimatedUnitPrice, currentItem.currency).toLocaleString()})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div>
            <label className="block text-slate-600 font-medium mb-1">
              {lang === "zh" ? "補充備註 / 用途詳細說明 (選填)" : "Additional Notes & Details (Optional)"}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例如: 電壓110V、電壓220V等"
              className="w-full bg-white border border-[#e5e5e0] rounded-sm p-2 text-xs focus:border-[#1b4372] focus:outline-none"
            />
          </div>

          {/* 3000 TWD Approval Threshold & Multi-vendor Comparison Policy Card */}
          {(() => {
            const hasOver3000Item = items.some(it => convertToTwdEstimate(it.estimatedUnitPrice, it.currency || "TWD") >= 3000);
            const isOverThreshold = grandTotal >= 3000 || hasOver3000Item;

            if (isOverThreshold) {
              return (
                <div className="p-3.5 bg-amber-50/70 border border-amber-300 rounded-sm space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-amber-900 text-xs flex items-center gap-1.5 font-serif">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>{lang === "zh" ? "實驗室採購規範：單價或總額達 3,000 元（含）以上 · 需附多家廠商比價" : "Policy: Unit/Total price ≥ 3,000 TWD (Requires multi-vendor quotes & PI approval)"}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                      NT$ {grandTotal.toLocaleString()} ≥ 3,000
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    {lang === "zh"
                      ? "依實驗室採購規定：單價或總額達 3,000 元以上，需事先詢價多家廠商（建議檢附 2~3 家報價比價）。由 Admin 完成初審確認後，系統將一併呈送教授審核核定。"
                      : "Items with unit or total price reaching 3,000 TWD require 2-3 vendor price comparisons. Admin will review before forwarding to PI for final approval."}
                  </p>
                  <div className="bg-white/80 p-2.5 rounded border border-amber-200 text-[11px] text-slate-700 space-y-1">
                    <div className="font-semibold text-slate-900 flex items-center gap-1">
                      <span>審核流程：</span>
                      <span className="font-mono text-amber-900">請購人提交 ➔ 初審 ➔ 發送教授審核 ➔ 教授核定通過</span>
                    </div>
                  </div>
                </div>
              );
            } else {
              return (
                <div className="p-3.5 bg-emerald-50/60 border border-emerald-300 rounded-sm space-y-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-emerald-950 text-xs flex items-center gap-1.5 font-serif">
                      <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>{lang === "zh" ? "小額採購（總額未滿 3,000 元）" : "Small Requisition (< 3,000 TWD) · Single Vendor Allowed & Forwarded to PI"}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                      NT$ {grandTotal.toLocaleString()} &lt; 3,000
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    {lang === "zh"
                      ? "總額未滿 3,000 元之小額請購，可由單一廠商直接採購，免附多家廠商比價。"
                      : "Requisitions under 3,000 TWD allow single-vendor purchase without comparison quotes. Admin will forward to PI for review and approval."}
                  </p>
                  <div className="bg-white/80 p-2.5 rounded border border-emerald-200 text-[11px] text-slate-700 space-y-1">
                    <div className="font-semibold text-slate-900 flex items-center gap-1">
                      <span>審核流程：</span>
                      <span className="font-mono text-emerald-900">請購人提交 ➔ 初審 ➔ 發送教授審核 ➔ 教授核定通過</span>
                    </div>
                  </div>
                </div>
              );
            }
          })()}

          {/* Requisition Grand Total Summary Bar */}
          <div className="p-4 bg-[#f4f1ea] border border-[#e5e5e0] rounded-sm flex items-center justify-between">
            <div className="text-xs text-slate-700 space-y-0.5">
              <div>
                <span className="font-bold">{applicantName || (lang === "zh" ? "申請人" : "Applicant")}</span> 送出請購單
                <span className="ml-2 font-mono font-bold bg-[#1b4372] text-white px-2 py-0.5 rounded text-[11px]">
                  共 {items.length} 筆品項
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 block">請購單總預估金額 (Grand Total 折合台幣)</span>
              <span className="text-xl font-bold font-mono text-[#1b4372]">
                NT$ {grandTotal.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-3 border-t border-[#e5e5e0] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-[#e5e5e0] rounded-sm text-xs font-bold transition"
            >
              {lang === "zh" ? "取消" : "Cancel"}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#1b4372] hover:bg-[#122e4f] text-white rounded-sm text-xs font-bold font-sans shadow-xs transition active:scale-95 flex items-center gap-1.5"
            >
              <span>{lang === "zh" ? `送出請購單 (含 ${items.length} 筆品項)` : `Submit Requisition (${items.length} items)`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
