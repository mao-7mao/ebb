import React, { useState } from "react";
import { 
  ProcurementItem, 
  ProcurementItemLine, 
  ProcurementCategory, 
  CurrencyCode 
} from "../../types/procurement";
import { 
  CURRENCY_CONFIG, 
  convertToTwdEstimate,
  DEFAULT_SHOPPING_PLATFORMS,
  DEFAULT_VENDORS
} from "../../data/procurementData";
import { 
  X, 
  Save, 
  Plus, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  Building2, 
  AlertCircle, 
  CheckCircle2,
  Package,
  FlaskConical,
  Cpu
} from "lucide-react";

interface EditRequisitionModalProps {
  item: ProcurementItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedItem: ProcurementItem) => void;
  lang: "zh" | "en";
}

export default function EditRequisitionModal({
  item,
  isOpen,
  onClose,
  onSave,
  lang
}: EditRequisitionModalProps) {
  // Requisition basic fields
  const [applicantName, setApplicantName] = useState(item.applicantName || "");
  const [applicantEmail, setApplicantEmail] = useState(item.applicantEmail || "");
  const [department, setDepartment] = useState(item.department || "EBB Lab");
  const [purpose, setPurpose] = useState(item.purpose || "");
  const [description, setDescription] = useState(item.description || "");

  // Initialize lines from item.items, or fallback to single item
  const initialLines: ProcurementItemLine[] = (item.items && item.items.length > 0)
    ? JSON.parse(JSON.stringify(item.items))
    : [
        {
          id: `line_init_${Date.now()}`,
          category: item.category || "consumable",
          itemName: item.itemName || "",
          quantity: item.quantity || 1,
          unit: item.unit || "個",
          currency: item.currency || "TWD",
          estimatedUnitPrice: item.estimatedUnitPrice || 0,
          estimatedTotalPrice: item.estimatedTotalPrice || 0,
          vendorName: item.vendorName || "",
          platform: item.platform || "",
          productUrl: item.productUrl || "",
          purpose: item.purpose || "",
          status: item.status === "rejected" ? "rejected" : item.status === "approved" ? "approved" : "pending_assistant",
          chemicalDetails: item.chemicalDetails ? { ...item.chemicalDetails } : undefined,
          consumableDetails: item.consumableDetails ? { ...item.consumableDetails } : undefined,
          equipmentDetails: item.equipmentDetails ? { ...item.equipmentDetails } : undefined
        }
      ];

  const [lines, setLines] = useState<ProcurementItemLine[]>(initialLines);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle line field change
  const handleUpdateLine = (index: number, updates: Partial<ProcurementItemLine>) => {
    setLines(prev => {
      const next = [...prev];
      const target = { ...next[index], ...updates };
      // Auto recalculate total
      const unitPr = target.estimatedUnitPrice || 0;
      const qty = target.quantity || 1;
      target.estimatedTotalPrice = unitPr * qty;
      next[index] = target;
      return next;
    });
  };

  // Add new line
  const handleAddLine = () => {
    const newLine: ProcurementItemLine = {
      id: `line_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      category: "consumable",
      itemName: "",
      quantity: 1,
      unit: "個",
      currency: "TWD",
      estimatedUnitPrice: 0,
      estimatedTotalPrice: 0,
      vendorName: "",
      platform: "",
      productUrl: "",
      status: "pending_assistant"
    };
    setLines(prev => [...prev, newLine]);
  };

  // Remove line
  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) {
      alert(lang === "zh" ? "請購單至少需保留一項品項！" : "Requisition must contain at least 1 item line.");
      return;
    }
    if (confirm(lang === "zh" ? `確定要刪除第 ${index + 1} 項品項嗎？` : `Delete item line #${index + 1}?`)) {
      setLines(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Calculate grand total in TWD
  const grandTotalTwd = lines.reduce((sum, line) => {
    const rawLineTotal = (line.quantity || 1) * (line.estimatedUnitPrice || 0);
    const inTwd = convertToTwdEstimate(rawLineTotal, line.currency || "TWD");
    return sum + inTwd;
  }, 0);

  // Validate & Save
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!applicantName.trim()) {
      setValidationError(lang === "zh" ? "請填寫申請人姓名" : "Applicant name is required.");
      return;
    }
    if (!applicantEmail.trim() || !applicantEmail.includes("@")) {
      setValidationError(lang === "zh" ? "請填寫有效的申請人 Email" : "Valid email is required.");
      return;
    }
    if (!purpose.trim()) {
      setValidationError(lang === "zh" ? "請填寫請購目的與專案說明" : "Purpose is required.");
      return;
    }
    if (lines.length === 0) {
      setValidationError(lang === "zh" ? "請購單至少需有一筆品項" : "At least one item is required.");
      return;
    }

    // Check each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.itemName.trim()) {
        setValidationError(lang === "zh" ? `第 ${i + 1} 項之「品名規格」不能為空！` : `Item line #${i + 1} name is required.`);
        return;
      }
      if (line.quantity <= 0) {
        setValidationError(lang === "zh" ? `第 ${i + 1} 項之數量必須大於 0！` : `Item line #${i + 1} quantity must be > 0.`);
        return;
      }
      if (line.estimatedUnitPrice < 0) {
        setValidationError(lang === "zh" ? `第 ${i + 1} 項之單價不可為負數！` : `Item line #${i + 1} unit price cannot be negative.`);
        return;
      }
    }

    // Prepare updated item lines with refreshed totals
    const updatedLineItems: ProcurementItemLine[] = lines.map((l) => {
      const qty = Number(l.quantity) || 1;
      const unitPr = Number(l.estimatedUnitPrice) || 0;
      return {
        ...l,
        itemName: l.itemName.trim(),
        quantity: qty,
        unit: l.unit.trim() || "個",
        estimatedUnitPrice: unitPr,
        estimatedTotalPrice: qty * unitPr,
        vendorName: l.vendorName.trim(),
        platform: l.platform?.trim() || undefined,
        productUrl: l.productUrl?.trim() || undefined,
        purpose: l.purpose?.trim() || purpose.trim()
      };
    });

    const primaryLine = updatedLineItems[0];
    const summaryItemName = updatedLineItems.length === 1
      ? primaryLine.itemName
      : `${primaryLine.itemName} 等 ${updatedLineItems.length} 筆品項`;

    const requiresProfessorApproval = grandTotalTwd >= 3000 || updatedLineItems.some(
      it => convertToTwdEstimate(it.estimatedUnitPrice, it.currency || "TWD") >= 3000
    );

    const updatedItem: ProcurementItem = {
      ...item,
      applicantName: applicantName.trim(),
      applicantEmail: applicantEmail.trim(),
      department: department.trim(),
      purpose: purpose.trim(),
      description: description.trim(),
      category: primaryLine.category,
      itemName: summaryItemName,
      quantity: updatedLineItems.length === 1 ? primaryLine.quantity : updatedLineItems.length,
      unit: updatedLineItems.length === 1 ? primaryLine.unit : "項",
      estimatedUnitPrice: updatedLineItems.length === 1 ? primaryLine.estimatedUnitPrice : grandTotalTwd,
      currency: primaryLine.currency || "TWD",
      estimatedTotalPrice: grandTotalTwd,
      vendorName: primaryLine.vendorName,
      platform: primaryLine.platform,
      productUrl: primaryLine.productUrl,
      items: updatedLineItems,
      chemicalDetails: primaryLine.category === "chemical" ? primaryLine.chemicalDetails : undefined,
      consumableDetails: primaryLine.category === "consumable" ? primaryLine.consumableDetails : undefined,
      equipmentDetails: primaryLine.category === "equipment" ? primaryLine.equipmentDetails : undefined,
      requiresProfessorApproval
    };

    onSave(updatedItem);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-amber-300 rounded-sm shadow-2xl max-w-4xl w-full my-auto flex flex-col max-h-[92vh] animate-fadeIn">
        {/* Top Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-amber-50/80 border-b border-amber-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center text-amber-900 font-bold">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm sm:text-base font-serif">
                  {lang === "zh" ? "Admin 修改請購細項" : "Admin Edit Requisition Details"}
                </h3>
                <span className="font-mono text-xs font-bold bg-[#1b4372] text-white px-2 py-0.5 rounded">
                  {item.requisitionNo}
                </span>
              </div>
              <p className="text-[11px] text-amber-800 font-sans">
                {lang === "zh" 
                  ? "請購人若有文字錯誤、金額、數量、規格或商品網址誤寫，Admin 可直接訂正並同步更新" 
                  : "Correct applicant typos, specs, quantities, prices, URLs, and multi-item lines."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-amber-100 rounded-sm transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs font-sans">
          {validationError && (
            <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-medium">{validationError}</span>
            </div>
          )}

          {/* Section 1: Applicant & Requisition Info */}
          <div className="bg-[#fbfbfa] p-4 rounded-sm border border-[#e5e5e0] space-y-3">
            <div className="font-bold text-slate-800 text-xs font-serif flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#1b4372]" />
              <span>1. 申請人基本資訊 (Applicant Information)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 font-medium mb-1">申請人姓名 *</label>
                <input
                  type="text"
                  required
                  value={applicantName}
                  onChange={(e) => setApplicantName(e.target.value)}
                  className="w-full bg-white border border-[#e5e5e0] rounded-sm p-2 text-xs focus:border-[#1b4372] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">申請人信箱 *</label>
                <input
                  type="email"
                  required
                  value={applicantEmail}
                  onChange={(e) => setApplicantEmail(e.target.value)}
                  className="w-full bg-white border border-[#e5e5e0] rounded-sm p-2 text-xs focus:border-[#1b4372] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">單位 / 實驗室</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-white border border-[#e5e5e0] rounded-sm p-2 text-xs focus:border-[#1b4372] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">請購目的與用途說明 *</label>
              <textarea
                required
                rows={2}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="敘明請購目的、研究用途或必要性..."
                className="w-full bg-white border border-[#e5e5e0] rounded-sm p-2 text-xs focus:border-[#1b4372] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">補充備註 / 說明</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="例如：急件需求、交期限制等"
                className="w-full bg-white border border-[#e5e5e0] rounded-sm p-2 text-xs focus:border-[#1b4372] focus:outline-none"
              />
            </div>
          </div>

          {/* Section 2: Line Items Editor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-bold text-slate-800 text-xs font-serif flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-[#1b4372]" />
                <span>2. 請購品項明細清單 (共 {lines.length} 筆品項，可逐筆修改規格/金額/網址)</span>
              </div>
              <button
                type="button"
                onClick={handleAddLine}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-sm text-xs font-bold transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新增品項</span>
              </button>
            </div>

            {/* Render Each Line Item Box */}
            <div className="space-y-3">
              {lines.map((line, idx) => {
                const lineTotal = (line.quantity || 1) * (line.estimatedUnitPrice || 0);
                const lineTotalTwd = convertToTwdEstimate(lineTotal, line.currency || "TWD");

                return (
                  <div 
                    key={line.id || idx} 
                    className="p-3.5 bg-white border border-[#e5e5e0] rounded-sm shadow-2xs space-y-3 relative group hover:border-[#1b4372]/40 transition"
                  >
                    {/* Line Header */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>

                        {/* Category Selector */}
                        <div className="flex items-center gap-1">
                          <label className="text-slate-500 font-medium">類別:</label>
                          <select
                            value={line.category}
                            onChange={(e) => handleUpdateLine(idx, { category: e.target.value as ProcurementCategory })}
                            className="bg-slate-50 border border-slate-300 rounded px-2 py-0.5 text-xs font-bold text-slate-800"
                          >
                            <option value="chemical">🧪 藥品試劑 (Chemical)</option>
                            <option value="consumable">📦 耗材雜物 (Consumable)</option>
                            <option value="equipment">⚙️ 儀器設備 (Equipment)</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-500">
                          小計: <strong className="text-slate-900">NT$ {lineTotalTwd.toLocaleString()}</strong>
                          {line.currency && line.currency !== "TWD" && (
                            <span className="text-slate-400 ml-1">
                              ({line.currency} {lineTotal.toLocaleString()})
                            </span>
                          )}
                        </span>

                        {lines.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                            title="刪除此品項"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Basic Line Fields Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                      {/* Item Name */}
                      <div className="sm:col-span-6">
                        <label className="block text-slate-600 font-medium mb-1">
                          品名與型號規格 *
                        </label>
                        <input
                          type="text"
                          required
                          value={line.itemName}
                          onChange={(e) => handleUpdateLine(idx, { itemName: e.target.value })}
                          placeholder="例如: 氯化鈉 NaCl 500g 99.5% 或 保鮮盒 1000ml"
                          className="w-full bg-white border border-[#e5e5e0] rounded-sm p-1.5 text-xs focus:border-[#1b4372] focus:outline-none font-medium"
                        />
                      </div>

                      {/* Quantity & Unit */}
                      <div className="sm:col-span-2">
                        <label className="block text-slate-600 font-medium mb-1">數量 *</label>
                        <input
                          type="number"
                          required
                          min="1"
                          step="1"
                          value={line.quantity}
                          onChange={(e) => handleUpdateLine(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="w-full bg-white border border-[#e5e5e0] rounded-sm p-1.5 text-xs font-mono font-bold text-center"
                        />
                      </div>

                      <div className="sm:col-span-1">
                        <label className="block text-slate-600 font-medium mb-1">單位 *</label>
                        <input
                          type="text"
                          required
                          value={line.unit}
                          onChange={(e) => handleUpdateLine(idx, { unit: e.target.value })}
                          placeholder="瓶/包/個"
                          className="w-full bg-white border border-[#e5e5e0] rounded-sm p-1.5 text-xs text-center"
                        />
                      </div>

                      {/* Currency */}
                      <div className="sm:col-span-1">
                        <label className="block text-slate-600 font-medium mb-1">幣別</label>
                        <select
                          value={line.currency || "TWD"}
                          onChange={(e) => handleUpdateLine(idx, { currency: e.target.value as CurrencyCode })}
                          className="w-full bg-white border border-[#e5e5e0] rounded-sm p-1.5 text-xs font-mono"
                        >
                          <option value="TWD">TWD</option>
                          <option value="USD">USD</option>
                          <option value="CNY">CNY</option>
                        </select>
                      </div>

                      {/* Estimated Unit Price */}
                      <div className="sm:col-span-2">
                        <label className="block text-slate-600 font-medium mb-1">預估單價 *</label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="1"
                          value={line.estimatedUnitPrice}
                          onChange={(e) => handleUpdateLine(idx, { estimatedUnitPrice: Math.max(0, parseInt(e.target.value) || 0) })}
                          className="w-full bg-white border border-[#e5e5e0] rounded-sm p-1.5 text-xs font-mono font-bold text-right"
                        />
                      </div>
                    </div>

                    {/* Vendor, Platform, and Product URL */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-dashed border-slate-200">
                      <div>
                        <label className="block text-slate-600 font-medium mb-1">建議廠商 / 通路名稱</label>
                        <input
                          type="text"
                          value={line.vendorName}
                          onChange={(e) => handleUpdateLine(idx, { vendorName: e.target.value })}
                          placeholder="例如: 默克、景明化工、原廠或店家名稱"
                          className="w-full bg-white border border-[#e5e5e0] rounded-sm p-1.5 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 font-medium mb-1">採購平台 / 管道</label>
                        <input
                          type="text"
                          value={line.platform || ""}
                          onChange={(e) => handleUpdateLine(idx, { platform: e.target.value })}
                          placeholder="例如: 蝦皮、淘寶、京東、德記儀器"
                          className="w-full bg-white border border-[#e5e5e0] rounded-sm p-1.5 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-600 font-medium mb-1 flex items-center justify-between">
                          <span>商品規格 / 下單連結網址</span>
                          {line.productUrl && (
                            <a
                              href={line.productUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-0.5 text-[10px]"
                            >
                              <span>測試開啟</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </label>
                        <input
                          type="url"
                          value={line.productUrl || ""}
                          onChange={(e) => handleUpdateLine(idx, { productUrl: e.target.value })}
                          placeholder="https://..."
                          className="w-full bg-white border border-[#e5e5e0] rounded-sm p-1.5 text-xs font-mono"
                        />
                      </div>
                    </div>

                    {/* Category-specific specs */}
                    {line.category === "chemical" && (
                      <div className="p-2.5 bg-emerald-50/50 border border-emerald-200 rounded-sm space-y-2">
                        <div className="text-[11px] font-bold text-emerald-900 flex items-center gap-1">
                          <FlaskConical className="w-3 h-3 text-emerald-700" />
                          <span>化學藥品特定欄位 (Chemical Specs)</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">CAS 號碼</label>
                            <input
                              type="text"
                              value={line.chemicalDetails?.casNumber || ""}
                              onChange={(e) => handleUpdateLine(idx, {
                                chemicalDetails: { ...line.chemicalDetails, casNumber: e.target.value }
                              })}
                              placeholder="例如: 67-48-1"
                              className="w-full bg-white border border-emerald-300 rounded p-1 text-xs font-mono"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">純度 (Purity)</label>
                            <input
                              type="text"
                              value={line.chemicalDetails?.purity || ""}
                              onChange={(e) => handleUpdateLine(idx, {
                                chemicalDetails: { ...line.chemicalDetails, purity: e.target.value }
                              })}
                              placeholder=">=99% AR"
                              className="w-full bg-white border border-emerald-300 rounded p-1 text-xs"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">包裝容量 (Package Size)</label>
                            <input
                              type="text"
                              value={line.chemicalDetails?.packageSize || ""}
                              onChange={(e) => handleUpdateLine(idx, {
                                chemicalDetails: { ...line.chemicalDetails, packageSize: e.target.value }
                              })}
                              placeholder="500g / 1L"
                              className="w-full bg-white border border-emerald-300 rounded p-1 text-xs"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-500 block mb-0.5">廠牌 (Brand)</label>
                            <input
                              type="text"
                              value={line.chemicalDetails?.brand || ""}
                              onChange={(e) => handleUpdateLine(idx, {
                                chemicalDetails: { ...line.chemicalDetails, brand: e.target.value }
                              })}
                              placeholder="Sigma / Acros / 景明"
                              className="w-full bg-white border border-emerald-300 rounded p-1 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {line.category === "consumable" && (
                      <div className="p-2.5 bg-amber-50/50 border border-amber-200 rounded-sm grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5">規格型號 / 尺寸 (Spec / Model)</label>
                          <input
                            type="text"
                            value={line.consumableDetails?.specModel || ""}
                            onChange={(e) => handleUpdateLine(idx, {
                              consumableDetails: { ...line.consumableDetails, specModel: e.target.value }
                            })}
                            placeholder="例如: 1000ml 耐熱玻璃 / 6入裝"
                            className="w-full bg-white border border-amber-300 rounded p-1 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5">次分類 (Subcategory)</label>
                          <input
                            type="text"
                            value={line.consumableDetails?.subCategory || ""}
                            onChange={(e) => handleUpdateLine(idx, {
                              consumableDetails: { ...line.consumableDetails, subCategory: e.target.value }
                            })}
                            placeholder="實驗耗材 / 玻璃儀器 / 防護雜物"
                            className="w-full bg-white border border-amber-300 rounded p-1 text-xs"
                          />
                        </div>
                      </div>
                    )}

                    {line.category === "equipment" && (
                      <div className="p-2.5 bg-blue-50/50 border border-blue-200 rounded-sm grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5">機型型號 (Model Number)</label>
                          <input
                            type="text"
                            value={line.equipmentDetails?.modelNumber || ""}
                            onChange={(e) => handleUpdateLine(idx, {
                              equipmentDetails: { ...line.equipmentDetails, modelNumber: e.target.value }
                            })}
                            placeholder="例如: pH-2000 Pro"
                            className="w-full bg-white border border-blue-300 rounded p-1 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 block mb-0.5">保固年限 (Warranty)</label>
                          <input
                            type="text"
                            value={line.equipmentDetails?.warrantyPeriod || ""}
                            onChange={(e) => handleUpdateLine(idx, {
                              equipmentDetails: { ...line.equipmentDetails, warrantyPeriod: e.target.value }
                            })}
                            placeholder="原廠 1 年保固"
                            className="w-full bg-white border border-blue-300 rounded p-1 text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grand Total & Summary Policy Banner */}
          <div className="p-3 bg-slate-50 border border-slate-300 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[11px] text-slate-500 block">修正後預估請購總金額 (Grand Total)</span>
              <div className="text-xl font-mono font-bold text-[#1b4372]">
                NT$ {grandTotalTwd.toLocaleString()}
              </div>
            </div>

            <div className="text-right">
              {grandTotalTwd >= 3000 ? (
                <span className="inline-block px-2.5 py-1 rounded bg-amber-100 text-amber-900 font-bold text-[11px] border border-amber-300">
                  ★ 總額達 3,000 元以上（需附比價紀錄 · 教授終審）
                </span>
              ) : (
                <span className="inline-block px-2.5 py-1 rounded bg-blue-100 text-blue-900 font-bold text-[11px] border border-blue-300">
                  ★ 未滿 3,000 元（小額請購 · admin初審後轉呈教授）
                </span>
              )}
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-sm text-xs font-medium transition cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#1b4372] hover:bg-[#122e4f] text-white rounded-sm text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            >
              <Save className="w-3.5 h-3.5" />
              <span>確認儲存修正並同步更新</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
