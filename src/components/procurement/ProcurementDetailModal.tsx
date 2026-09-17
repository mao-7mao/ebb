import React, { useState, useEffect } from "react";
import { 
  ProcurementItem, 
  UserRole, 
  PurchaserType 
} from "../../types/procurement";
import { BudgetProjectOption, DEFAULT_BUDGET_PROJECTS } from "../../data/procurementData";
import AddBudgetProjectModal from "./AddBudgetProjectModal";
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShoppingBag, 
  Mail, 
  FileText, 
  Building2, 
  FlaskConical, 
  Package, 
  Cpu, 
  User, 
  DollarSign, 
  Calendar,
  AlertTriangle,
  Receipt,
  Copy,
  ExternalLink,
  ShieldCheck,
  Send
} from "lucide-react";

interface ProcurementDetailModalProps {
  item: ProcurementItem;
  currentRole: UserRole;
  lang: "zh" | "en";
  onClose: () => void;
  onAssistantReview: (id: string, approved: boolean, comment: string) => void;
  onProfessorReview: (id: string, approved: boolean, comment: string, purchaser: PurchaserType) => void;
  onMarkPurchased: (id: string, purchaseInfo: NonNullable<ProcurementItem["actualPurchaseInfo"]>) => void;
  onOpenPrintView: (item: ProcurementItem) => void;
  onSendEmailNotification: (type: "created" | "approved" | "purchased", item: ProcurementItem) => void;
  onUpdateItem?: (updatedItem: ProcurementItem) => void;
  budgetProjects?: BudgetProjectOption[];
  onAddBudgetProject?: (project: BudgetProjectOption) => void;
}

export default function ProcurementDetailModal({
  item,
  currentRole,
  lang,
  onClose,
  onAssistantReview,
  onProfessorReview,
  onMarkPurchased,
  onOpenPrintView,
  onSendEmailNotification,
  onUpdateItem,
  budgetProjects,
  onAddBudgetProject
}: ProcurementDetailModalProps) {
  // Review inputs
  const [assistantComment, setAssistantComment] = useState("");
  const [professorComment, setProfessorComment] = useState("");
  const [designatedPurchaser, setDesignatedPurchaser] = useState<PurchaserType>("student");
  const [assignedBudgetProject, setAssignedBudgetProject] = useState(item.budgetProject || "");
  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
  const [availableBudgetProjects, setAvailableBudgetProjects] = useState<BudgetProjectOption[]>(
    budgetProjects || DEFAULT_BUDGET_PROJECTS
  );

  useEffect(() => {
    if (budgetProjects && budgetProjects.length > 0) {
      setAvailableBudgetProjects(budgetProjects);
    }
  }, [budgetProjects]);

  // Purchase fulfillment form inputs
  const [isFulfilling, setIsFulfilling] = useState(false);
  const [purchasedBy, setPurchasedBy] = useState(item.applicantName);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [actualUnitPrice, setActualUnitPrice] = useState<number>(item.estimatedUnitPrice);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [actualVendor, setActualVendor] = useState(item.vendorName);
  const [purchaseNote, setPurchaseNote] = useState("");

  // Email preview modal state
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const getStatusBadge = (status: ProcurementItem["status"]) => {
    switch (status) {
      case "pending_assistant":
        return {
          bg: "bg-amber-50 text-amber-800 border-amber-300",
          label: lang === "zh" ? "待助理初審 (Stage 1)" : "Pending Assistant Review",
          icon: <Clock className="w-3.5 h-3.5" />
        };
      case "pending_professor":
        return {
          bg: "bg-blue-50 text-blue-800 border-blue-300",
          label: lang === "zh" ? "待教授終審 (Stage 2)" : "Pending PI Final Review",
          icon: <Clock className="w-3.5 h-3.5" />
        };
      case "approved":
        return {
          bg: "bg-emerald-50 text-emerald-800 border-emerald-300",
          label: lang === "zh" ? "審核通過 · 待採購" : "Approved · Awaiting Purchase",
          icon: <CheckCircle2 className="w-3.5 h-3.5" />
        };
      case "rejected":
        return {
          bg: "bg-rose-50 text-rose-800 border-rose-300",
          label: lang === "zh" ? "已退回 (Rejected)" : "Rejected / Modification Needed",
          icon: <XCircle className="w-3.5 h-3.5" />
        };
      case "purchased":
        return {
          bg: "bg-slate-100 text-slate-800 border-slate-300 font-bold",
          label: lang === "zh" ? "✓ 採購完成 (已回填發票)" : "✓ Purchased & Invoiced",
          icon: <Receipt className="w-3.5 h-3.5 text-emerald-700" />
        };
    }
  };

  const statusBadge = getStatusBadge(item.status);
  const requiresProfReview = item.requiresProfessorApproval || item.notifyProfessor || item.estimatedTotalPrice >= 3000;

  // Assistant Review Handler
  const handleAssistantAction = (approved: boolean) => {
    if (!approved && !assistantComment.trim()) {
      alert(lang === "zh" ? "退回請購單時，請務必填寫審核意見與修改說明！" : "Please provide rejection comments!");
      return;
    }
    const defaultApproveComment = requiresProfReview
      ? (item.estimatedTotalPrice >= 3000 ? "初審合格（金額超過3,000元），已轉呈教授終審。" : "初審合格（申請人勾選通知教授），已轉呈教授審核。")
      : "初審合格（總額未達3,000元），助理已核定准予採購。";
    onAssistantReview(item.id, approved, assistantComment.trim() || (approved ? defaultApproveComment : "請補充規格。"));
  };

  // Professor Review Handler
  const handleProfessorAction = (approved: boolean) => {
    if (!approved && !professorComment.trim()) {
      alert(lang === "zh" ? "退回請購單時，請填寫退回原因！" : "Please provide rejection reason!");
      return;
    }
    if (onUpdateItem && assignedBudgetProject !== item.budgetProject) {
      onUpdateItem({
        ...item,
        budgetProject: assignedBudgetProject
      });
    }
    onProfessorReview(
      item.id, 
      approved, 
      professorComment.trim() || (approved ? "核准由學生採購。" : "暫不採購。"), 
      designatedPurchaser
    );
  };

  // Mark Purchased Handler
  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber.trim()) {
      alert(lang === "zh" ? "請填寫發票號碼或收據編號！" : "Please enter invoice number!");
      return;
    }
    const actualTotalPrice = actualUnitPrice * item.quantity;
    onMarkPurchased(item.id, {
      purchasedBy: purchasedBy.trim(),
      purchaseDate,
      actualUnitPrice,
      actualTotalPrice,
      invoiceNumber: invoiceNumber.trim(),
      vendor: actualVendor.trim(),
      note: purchaseNote.trim()
    });
    setIsFulfilling(false);
  };

  // Generate Email Text for preview
  const generateEmailContent = () => {
    const isOver3000 = item.estimatedTotalPrice >= 3000 || item.requiresProfessorApproval;
    const isNotifyProf = item.notifyProfessor;

    if (item.status === "approved") {
      const isDirectAssistantApproved = !isOver3000 && !isNotifyProf;
      return {
        to: item.applicantEmail,
        subject: `[EBB Lab 請購核准通知] 單號 ${item.requisitionNo} - 已獲核准，可執行採購`,
        body: `親愛的 ${item.applicantName} 您好：\n\n您於線上請購系統申請之品項「${item.itemName}」（單號：${item.requisitionNo}，總額預估 NT$ ${item.estimatedTotalPrice.toLocaleString()}）審核通過！\n\n【審核資訊】\n• 審核狀態：已核准 (Approved)\n• 審核模式：${isDirectAssistantApproved ? "小額採購 (< 3,000 元) · 助理確認核准" : "達 3,000 元或指定通知 · 完成二階教授終審核准"}\n• 指定採購人：${item.purchaser === "student" ? "由申請學生自行採購" : "由教授本人採購"}\n• 審定意見：${item.professorReview?.comment || item.assistantReview?.comment || "准予採購"}\n• 經費來源：${item.budgetProject || "待核定"}\n\n請依照指定廠商辦理採購。採購完成並取得統一發票或收據後，請前往系統回填實際金額與發票號碼，以利經費核銷。\n\n※ 系統溫馨提示：小額請購後續購買與否不再另發 Mail 通知，請自行在請購系統查看進程。\n\nEBB Lab 實驗室請購系統\n國立中山大學 環境工程研究所`
      };
    }
    
    // Pending Status Email
    if (isOver3000 || isNotifyProf) {
      return {
        to: "ebblab115@gmail.com",
        subject: `[EBB Lab 請購待審] 單號 ${item.requisitionNo} - ${item.applicantName} 申請 ${item.itemName} (需教授終審)`,
        body: `研究助理您好：\n\n實驗室成員 ${item.applicantName} 已於系統填寫新請購單（金額：NT$ ${item.estimatedTotalPrice.toLocaleString()}，${isOver3000 ? "超過 3,000 元需三家詢價與教授核可" : "申請人希望教授知悉"}）：\n\n• 請購單號：${item.requisitionNo}\n• 申請品項：${item.itemName}\n• 類別：${item.category}\n• 數量金額：${item.quantity} ${item.unit} / 預估 NT$ ${item.estimatedTotalPrice.toLocaleString()}\n• 經費計畫：${item.budgetProject || "待指定"}\n• 請購目的：${item.purpose}\n• 建議廠商：${item.vendorName}\n\n請助理前往系統確認初審，初審通過後將自動發送 Mail 通知教授終審。\n\nEBB Lab 實驗室請購系統`
      };
    } else {
      return {
        to: "ebblab115@gmail.com",
        subject: `[EBB Lab 請購待審] 單號 ${item.requisitionNo} - ${item.applicantName} 申請 ${item.itemName} (小額免教授審核)`,
        body: `研究助理您好：\n\n實驗室成員 ${item.applicantName} 已於系統填寫新請購單（總額 NT$ ${item.estimatedTotalPrice.toLocaleString()} < 3,000 元，預設免教授審核）：\n\n• 請購單號：${item.requisitionNo}\n• 申請品項：${item.itemName}\n• 類別：${item.category}\n• 數量金額：${item.quantity} ${item.unit} / 預估 NT$ ${item.estimatedTotalPrice.toLocaleString()}\n• 請購目的：${item.purpose}\n• 建議廠商：${item.vendorName}\n\n請助理直接於系統審核確認。確認後系統將回傳 Mail 通知請購人 (${item.applicantEmail})，後續購買與否不再 Mail 通知。\n\nEBB Lab 實驗室請購系統`
      };
    }
  };

  const emailInfo = generateEmailContent();

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(`收件者: ${emailInfo.to}\n主旨: ${emailInfo.subject}\n\n${emailInfo.body}`);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-[#e5e5e0] rounded-sm shadow-2xl max-w-4xl w-full my-auto flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 bg-[#f8f8f5] border-b border-[#e5e5e0] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold bg-[#1b4372] text-white px-2.5 py-1 rounded-sm">
              {item.requisitionNo}
            </span>
            <div className={`px-2.5 py-1 rounded-sm text-xs font-bold border flex items-center gap-1.5 ${statusBadge.bg}`}>
              {statusBadge.icon}
              <span>{statusBadge.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Print Official Requisition */}
            <button
              type="button"
              onClick={() => onOpenPrintView(item)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e5e5e0] hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-sm transition shadow-xs"
              title="預覽與列印合規紙本單據"
            >
              <FileText className="w-3.5 h-3.5 text-[#1b4372]" />
              <span>{lang === "zh" ? "合規請購單" : "Official Form"}</span>
            </button>

            {/* Email Notification Preview */}
            <button
              type="button"
              onClick={() => setShowEmailPreview(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e5e5e0] hover:bg-slate-50 text-[#1b4372] text-xs font-bold rounded-sm transition shadow-xs"
              title="查看與發送通知信件"
            >
              <Mail className="w-3.5 h-3.5 text-[#8d734a]" />
              <span>{lang === "zh" ? "Email 通知" : "Email Alert"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-sm transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs font-sans">
          {/* Item Main Summary Card */}
          <div className="bg-[#fbfbfa] border border-[#e5e5e0] p-5 rounded-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[#8d734a] uppercase font-mono">
                    {item.category === "chemical" ? "藥品試劑 Chemical" : item.category === "equipment" ? "儀器設備 Equipment" : "耗材雜物 Consumable"}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    申請日期: {item.createdAt}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 font-serif">
                  {item.itemName}
                </h3>
                {item.chemicalDetails?.chemicalEnglishName && (
                  <p className="text-xs text-slate-500 font-mono italic">
                    {item.chemicalDetails.chemicalEnglishName}
                  </p>
                )}
              </div>

              <div className="text-right sm:border-l sm:pl-6 border-[#e5e5e0] shrink-0">
                <span className="text-[11px] text-slate-400 block uppercase">
                  {item.actualPurchaseInfo ? "實際決標總額" : "預估採購金額"}
                </span>
                <span className="text-2xl font-bold font-mono text-[#1b4372]">
                  NT$ {(item.actualPurchaseInfo?.actualTotalPrice || item.estimatedTotalPrice).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 block font-mono">
                  {item.quantity} {item.unit} × @ NT$ {(item.actualPurchaseInfo?.actualUnitPrice || item.estimatedUnitPrice).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Purpose & Research Justification */}
            <div className="p-3 bg-white border border-[#e5e5e0] rounded-sm space-y-1">
              <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1b4372]" />
                <span>請購目的 (Purpose / Research Usage)：</span>
              </div>
              <p className="text-slate-700 leading-relaxed pl-3 font-serif">
                {item.purpose}
              </p>
              {item.description && (
                <p className="text-[11px] text-slate-500 pl-3 pt-1 border-t border-dashed border-slate-200 mt-1">
                  補充說明: {item.description}
                </p>
              )}
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div>
                <span className="text-[10px] text-slate-400 block">申請人 / 單位</span>
                <span className="font-bold text-slate-800">{item.applicantName}</span>
                <span className="text-[10px] text-slate-500 block font-mono truncate">{item.applicantEmail}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">經費計畫代號</span>
                <span className="font-bold font-mono text-slate-800 truncate block" title={item.budgetProject}>
                  {item.budgetProject}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">推薦廠商</span>
                <span className="font-bold text-slate-800">{item.vendorName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">指定採購人</span>
                <span className="font-bold text-slate-800">
                  {item.purchaser === "student" ? "由申請學生採購" : item.purchaser === "professor" ? "由教授採購" : "未核定"}
                </span>
              </div>
            </div>

            {/* Category Extra Spec Display */}
            {item.category === "chemical" && item.chemicalDetails && (
              <div className="p-2.5 bg-emerald-50/50 border border-emerald-200 rounded-sm text-[11px] flex flex-wrap gap-x-4 gap-y-1 text-emerald-950">
                {item.chemicalDetails.casNumber && <span><strong>CAS:</strong> {item.chemicalDetails.casNumber}</span>}
                {item.chemicalDetails.purity && <span><strong>純度:</strong> {item.chemicalDetails.purity}</span>}
                {item.chemicalDetails.packageSize && <span><strong>包裝:</strong> {item.chemicalDetails.packageSize}</span>}
                {item.chemicalDetails.brand && <span><strong>廠牌:</strong> {item.chemicalDetails.brand}</span>}
              </div>
            )}
            {item.category === "consumable" && item.consumableDetails && (
              <div className="p-2.5 bg-amber-50/50 border border-amber-200 rounded-sm text-[11px] flex flex-wrap gap-x-4 gap-y-1 text-amber-950">
                {item.consumableDetails.specModel && <span><strong>規格型號:</strong> {item.consumableDetails.specModel}</span>}
                {item.consumableDetails.subCategory && <span><strong>分類:</strong> {item.consumableDetails.subCategory}</span>}
              </div>
            )}
            {item.category === "equipment" && item.equipmentDetails && (
              <div className="p-2.5 bg-blue-50/50 border border-blue-200 rounded-sm text-[11px] flex flex-wrap gap-x-4 gap-y-1 text-blue-950">
                {item.equipmentDetails.modelNumber && <span><strong>型號:</strong> {item.equipmentDetails.modelNumber}</span>}
                {item.equipmentDetails.warrantyPeriod && <span><strong>保固:</strong> {item.equipmentDetails.warrantyPeriod}</span>}
                <span><strong>需到校安裝:</strong> {item.equipmentDetails.requiresInstallation ? "是" : "否"}</span>
                <span><strong>需操作培訓:</strong> {item.equipmentDetails.requiresTraining ? "是" : "否"}</span>
              </div>
            )}

            {/* Approval Policy Status Indicator */}
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-sm text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">審批適用規則：</span>
                {item.estimatedTotalPrice >= 3000 || item.requiresProfessorApproval ? (
                  <span className="text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded text-[11px]">
                    總價/單價 ≥ 3,000 元（需三家詢價並經教授簽可）
                  </span>
                ) : item.notifyProfessor ? (
                  <span className="text-blue-800 font-bold bg-blue-100 px-2 py-0.5 rounded text-[11px]">
                    未滿 3,000 元（申請人主動勾選通知教授審核）
                  </span>
                ) : (
                  <span className="text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                    未滿 3,000 元（助理確認後核定，免教授審核）
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                {item.estimatedTotalPrice >= 3000 || item.requiresProfessorApproval || item.notifyProfessor
                  ? "流程: 提交 ➔ 助理初審 ➔ 教授終審 ➔ Mail通知"
                  : "流程: 提交 ➔ 助理確認回傳Mail ➔ 系統查看進程"}
              </span>
            </div>
          </div>

          {/* Multi-Vendor Quotes Comparison Table */}
          {item.quotes && item.quotes.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 text-xs font-serif">
                比價紀錄與廠商報價清單 (Vendor Quotes)
              </h4>
              <div className="border border-[#e5e5e0] rounded-sm overflow-hidden bg-white">
                <table className="w-full text-xs">
                  <thead className="bg-[#f8f8f5] text-slate-700 font-bold border-b border-[#e5e5e0]">
                    <tr>
                      <th className="p-2 text-left">廠商名稱</th>
                      <th className="p-2 text-right">報價單價 (NT$)</th>
                      <th className="p-2 text-right">預估總額 (NT$)</th>
                      <th className="p-2 text-left">備註說明</th>
                      <th className="p-2 text-center">推薦註記</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {item.quotes.map((q) => (
                      <tr key={q.id} className={q.isRecommended ? "bg-emerald-50/30" : ""}>
                        <td className="p-2 font-bold text-slate-800">{q.vendorName}</td>
                        <td className="p-2 text-right font-mono font-bold text-[#1b4372]">
                          {q.unitPrice.toLocaleString()}
                        </td>
                        <td className="p-2 text-right font-mono text-slate-700">
                          {(q.unitPrice * item.quantity).toLocaleString()}
                        </td>
                        <td className="p-2 text-slate-500 text-[11px]">{q.note || "-"}</td>
                        <td className="p-2 text-center">
                          {q.isRecommended ? (
                            <span className="px-2 py-0.5 rounded-xs bg-[#1b4372] text-white text-[10px] font-bold">
                              ✓ 建議採購
                            </span>
                          ) : (
                            <span className="text-slate-300 text-[10px]">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Review Trail Section (Assistant & Professor comments) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Assistant Review Box */}
            <div className={`p-4 rounded-sm border ${item.assistantReview ? "bg-emerald-50/30 border-emerald-200" : "bg-[#fbfbfa] border-[#e5e5e0]"}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs font-serif text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#1b4372]" />
                  一階審核：研究助理初審
                </span>
                {item.assistantReview && (
                  <span className="text-[10px] font-mono text-slate-400">
                    {item.assistantReview.reviewedAt}
                  </span>
                )}
              </div>
              {item.assistantReview ? (
                <div className="space-y-1">
                  <div className="text-xs font-bold text-emerald-800">
                    {item.assistantReview.approved ? "✓ 初審通過" : "✕ 已退回"}
                  </div>
                  <p className="text-xs text-slate-700 italic">
                    "{item.assistantReview.comment}"
                  </p>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    審核人: {item.assistantReview.reviewerName}
                  </span>
                </div>
              ) : (
                <p className="text-slate-400 italic text-xs">
                  尚未完成初審 (待助理確認品項規格與經費來源)
                </p>
              )}
            </div>

            {/* Professor Review Box */}
            <div className={`p-4 rounded-sm border ${item.professorReview ? "bg-blue-50/30 border-blue-200" : "bg-[#fbfbfa] border-[#e5e5e0]"}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs font-serif text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-700" />
                  二階審核：教授終審核准
                </span>
                {item.professorReview && (
                  <span className="text-[10px] font-mono text-slate-400">
                    {item.professorReview.reviewedAt}
                  </span>
                )}
              </div>
              {item.professorReview ? (
                <div className="space-y-1">
                  <div className="text-xs font-bold text-blue-800">
                    {item.professorReview.approved ? "✓ 終審核准採購" : "✕ 已退回"}
                  </div>
                  <p className="text-xs text-slate-700 italic">
                    "{item.professorReview.comment}"
                  </p>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    核准人: {item.professorReview.reviewerName} · 指定: {item.purchaser === "student" ? "學生採購" : "教授採購"}
                  </span>
                </div>
              ) : (
                <p className="text-slate-400 italic text-xs">
                  尚未完成終審 (待助理初審通過後由教授核定)
                </p>
              )}
            </div>
          </div>

          {/* Actual Purchase Information (If already purchased) */}
          {item.actualPurchaseInfo && (
            <div className="p-4 bg-slate-50 border border-slate-300 rounded-sm space-y-2">
              <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-700" />
                <span>實際購買及統一發票資訊 (Invoiced Purchase Information)</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 block">採購經辦人</span>
                  <span className="font-bold">{item.actualPurchaseInfo.purchasedBy}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">採購日期</span>
                  <span className="font-bold font-mono">{item.actualPurchaseInfo.purchaseDate}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">統一發票號碼</span>
                  <span className="font-bold font-mono text-emerald-800">{item.actualPurchaseInfo.invoiceNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">實際決標金額</span>
                  <span className="font-bold font-mono text-[#1b4372]">
                    NT$ {item.actualPurchaseInfo.actualTotalPrice.toLocaleString()}
                  </span>
                </div>
              </div>
              {item.actualPurchaseInfo.note && (
                <p className="text-[11px] text-slate-600 pt-1 border-t border-dashed border-slate-200">
                  備註: {item.actualPurchaseInfo.note}
                </p>
              )}
            </div>
          )}

          {/* ACTION SECTION 1: Assistant Review Controls */}
          {(currentRole === "assistant" || currentRole === "admin") && item.status === "pending_assistant" && (
            <div className="p-4 bg-amber-50/50 border border-amber-300 rounded-sm space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-700" />
                  <span>研究助理審核操作區 (Assistant Review Actions)</span>
                </div>
                {requiresProfReview ? (
                  <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                    {item.estimatedTotalPrice >= 3000 ? "≥ 3,000 元（初審後需轉呈教授終審）" : "申請人指定轉呈教授審核"}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                    &lt; 3,000 元小額請購（助理可直接確認核准）
                  </span>
                )}
              </div>
              <div>
                <label className="block text-slate-600 mb-1">
                  {requiresProfReview ? "初審意見或修正指示：" : "審核核准意見："}
                </label>
                <input
                  type="text"
                  value={assistantComment}
                  onChange={(e) => setAssistantComment(e.target.value)}
                  placeholder={
                    requiresProfReview
                      ? "例如: 規格及報價確認無誤，轉呈教授終審。"
                      : "例如: 總額未達3,000元，耗材規格確認無誤，核准採購。"
                  }
                  className="w-full bg-white border border-[#e5e5e0] rounded-sm p-2 text-xs"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => handleAssistantAction(false)}
                  className="px-4 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-sm text-xs font-bold transition"
                >
                  退回申請 (需填寫原因)
                </button>
                <button
                  type="button"
                  onClick={() => handleAssistantAction(true)}
                  className="px-5 py-1.5 bg-[#1b4372] hover:bg-[#122e4f] text-white rounded-sm text-xs font-bold transition shadow-xs"
                >
                  {requiresProfReview ? "初審合格，呈報教授終審 →" : "助理確認核准，回傳 Mail 給請購人 ✓"}
                </button>
              </div>
            </div>
          )}

          {/* ACTION SECTION 2: Professor Final Review Controls */}
          {(currentRole === "professor" || currentRole === "admin") && item.status === "pending_professor" && (
            <div className="p-4 bg-blue-50/50 border border-blue-300 rounded-sm space-y-3 animate-fadeIn">
              <div className="font-bold text-blue-950 text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-700" />
                <span>教授二階終審操作區 (Professor Final Approval)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 flex items-center justify-between">
                    <span>{lang === "zh" ? "核定經費計畫：" : "Assign Budget Project:"}</span>
                    <button
                      type="button"
                      onClick={() => setShowAddBudgetModal(true)}
                      className="text-[10px] text-blue-800 hover:text-blue-950 hover:underline font-bold"
                      title="教授新增計畫並儲存"
                    >
                      + 教授新增
                    </button>
                  </label>
                  <select
                    value={assignedBudgetProject}
                    onChange={(e) => setAssignedBudgetProject(e.target.value)}
                    className="w-full bg-white border border-[#e5e5e0] rounded-sm p-2 text-xs font-mono"
                  >
                    <option value="">{lang === "zh" ? "— 待依報帳核定 (暫免填) —" : "— To be assigned upon audit —"}</option>
                    {availableBudgetProjects.map((bp) => (
                      <option key={bp.code} value={bp.code}>
                        {bp.code} ({bp.nameZh.slice(0, 16)}...)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">{lang === "zh" ? "指定採購負責人：" : "Designated Purchaser:"}</label>
                  <select
                    value={designatedPurchaser}
                    onChange={(e) => setDesignatedPurchaser(e.target.value as PurchaserType)}
                    className="w-full bg-white border border-[#e5e5e0] rounded-sm p-2 text-xs font-medium"
                  >
                    <option value="student">{lang === "zh" ? "由申請學生自行採購 (追蹤進程)" : "Student Purchaser (tracks progress)"}</option>
                    <option value="professor">{lang === "zh" ? "由教授本人統籌採購" : "Professor Purchases"}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 mb-1">{lang === "zh" ? "終審核定意見或囑咐：" : "PI Review Comments:"}</label>
                  <input
                    type="text"
                    value={professorComment}
                    onChange={(e) => setProfessorComment(e.target.value)}
                    placeholder="例如: 准予採購。收貨後請妥存原裝檢驗報告與發票。"
                    className="w-full bg-white border border-[#e5e5e0] rounded-sm p-2 text-xs"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => handleProfessorAction(false)}
                  className="px-4 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-sm text-xs font-bold transition"
                >
                  退回申請 (退回給學生)
                </button>
                <button
                  type="button"
                  onClick={() => handleProfessorAction(true)}
                  className="px-5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-sm text-xs font-bold transition shadow-xs"
                >
                  終審核准，發送 Email 通知學生採購 ✓
                </button>
              </div>
            </div>
          )}

          {/* ACTION SECTION 3: Purchaser Marks As Purchased & Fills In Actual Invoice */}
          {item.status === "approved" && (
            <div className="p-4 bg-emerald-50/50 border border-emerald-300 rounded-sm space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-emerald-700" />
                    執行採購與進程回報 (Fulfill Purchase & Progress)
                  </span>
                  <p className="text-[11px] text-emerald-800">
                    單據已獲教授核准！採購完成後可填寫實際單價與進程備註以供留存記錄。
                  </p>
                </div>
                {!isFulfilling && (
                  <button
                    type="button"
                    onClick={() => setIsFulfilling(true)}
                    className="px-4 py-1.5 bg-[#1b4372] hover:bg-[#122e4f] text-white rounded-sm text-xs font-bold transition shadow-xs"
                  >
                    + 標記已採購並更新進程
                  </button>
                )}
              </div>

              {isFulfilling && (
                <form onSubmit={handleSavePurchase} className="pt-2 border-t border-emerald-200 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-600 mb-1">採購經辦人姓名 *</label>
                      <input
                        type="text"
                        required
                        value={purchasedBy}
                        onChange={(e) => setPurchasedBy(e.target.value)}
                        className="w-full bg-white border border-emerald-200 rounded-sm p-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">採購日期 *</label>
                      <input
                        type="date"
                        required
                        value={purchaseDate}
                        onChange={(e) => setPurchaseDate(e.target.value)}
                        className="w-full bg-white border border-emerald-200 rounded-sm p-1.5 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">訂單編號 / 發票號碼 (選填)</label>
                      <input
                        type="text"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        placeholder="例如: 淘寶訂單號或發票"
                        className="w-full bg-white border border-emerald-200 rounded-sm p-1.5 text-xs font-mono font-bold text-emerald-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 mb-1">實際購買單價 (NT$) *</label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={actualUnitPrice}
                        onChange={(e) => setActualUnitPrice(parseInt(e.target.value) || 0)}
                        className="w-full bg-white border border-emerald-200 rounded-sm p-1.5 text-xs font-mono font-bold"
                      />
                      <span className="text-[10px] text-slate-500">
                        實際總金額: NT$ {(actualUnitPrice * item.quantity).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">實際廠商 / 備註</label>
                      <input
                        type="text"
                        value={purchaseNote}
                        onChange={(e) => setPurchaseNote(e.target.value)}
                        placeholder="例如: 已入庫並完成驗收，附發票電子檔"
                        className="w-full bg-white border border-emerald-200 rounded-sm p-1.5 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsFulfilling(false)}
                      className="px-3 py-1 bg-white border border-slate-300 rounded-sm text-xs font-medium"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-[#1b4372] hover:bg-[#122e4f] text-white rounded-sm text-xs font-bold transition shadow-xs"
                    >
                      確認儲存並標記為已採購 ✓
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-[#f8f8f5] border-t border-[#e5e5e0] flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400 font-mono">
            EBB Requisition ID: {item.id}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-[#e5e5e0] rounded-sm text-xs font-bold transition"
          >
            {lang === "zh" ? "關閉" : "Close"}
          </button>
        </div>
      </div>

      {/* Email Notification Preview Modal */}
      {showEmailPreview && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-sm shadow-2xl max-w-xl w-full p-6 space-y-4 font-sans">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#1b4372]" />
                <h4 className="font-bold text-slate-800 text-sm font-serif">
                  自動 Email 通知內容預覽 (Notification Preview)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowEmailPreview(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2 bg-slate-50 border border-slate-200 rounded font-mono">
                <span className="text-slate-400">收件者 (To):</span> <strong className="text-slate-800">{emailInfo.to}</strong>
              </div>
              <div className="p-2 bg-slate-50 border border-slate-200 rounded font-mono">
                <span className="text-slate-400">主旨 (Subject):</span> <strong className="text-slate-800">{emailInfo.subject}</strong>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded text-slate-700 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                {emailInfo.body}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400">
                * 系統串接 Google Apps Script 後將自動以 Gmail 即時發送
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedEmail ? "已複製信件內容！" : "複製內容"}</span>
                </button>
                <a
                  href={`mailto:${emailInfo.to}?subject=${encodeURIComponent(emailInfo.subject)}&body=${encodeURIComponent(emailInfo.body)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1b4372] hover:bg-[#122e4f] text-white text-xs font-bold rounded transition shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>以本機郵件寄出</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Add Budget Project Modal for Professor */}
      <AddBudgetProjectModal
        isOpen={showAddBudgetModal}
        onClose={() => setShowAddBudgetModal(false)}
        lang={lang}
        onAddProject={(newProj) => {
          const updated = [...availableBudgetProjects, newProj];
          setAvailableBudgetProjects(updated);
          setAssignedBudgetProject(newProj.code);
          if (onAddBudgetProject) {
            onAddBudgetProject(newProj);
          }
        }}
      />
    </div>
  );
}
