import React from "react";
import { UserRole } from "../../types/procurement";
import { 
  ShoppingCart, 
  PlusCircle, 
  Globe, 
  Shield, 
  GraduationCap, 
  UserCheck, 
  Sparkles,
  ExternalLink,
  RefreshCw,
  SlidersHorizontal,
  Cloud
} from "lucide-react";

interface ProcurementHeaderProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  lang: "zh" | "en";
  onToggleLang: () => void;
  onOpenCreateModal: () => void;
  authenticatedRoles: Set<UserRole>;
  onLockRole: (role: UserRole) => void;
  totalCount: number;
  pendingCount: number;
  hasGasWebhook?: boolean;
  onOpenGasModal?: () => void;
}

export default function ProcurementHeader({
  currentRole,
  onRoleChange,
  lang,
  onToggleLang,
  onOpenCreateModal,
  authenticatedRoles,
  onLockRole,
  totalCount,
  pendingCount,
  hasGasWebhook,
  onOpenGasModal
}: ProcurementHeaderProps) {
  const roleLabels: Record<UserRole, { zh: string; en: string; icon: React.ReactNode; desc: string; requiresPass: boolean }> = {
    student: {
      zh: "申請人",
      en: "Applicant",
      icon: <GraduationCap className="w-3.5 h-3.5" />,
      desc: lang === "zh" ? "填寫請購、查看進度、追蹤採購到貨" : "Submit requests & track purchases",
      requiresPass: false
    },
    assistant: {
      zh: "研究助理",
      en: "Research Assistant",
      icon: <UserCheck className="w-3.5 h-3.5" />,
      desc: lang === "zh" ? "審核品項規格與初審意見 (需密碼)" : "Verify specs & review items (Password)",
      requiresPass: true
    },
    professor: {
      zh: "教授",
      en: "Professor",
      icon: <Shield className="w-3.5 h-3.5" />,
      desc: lang === "zh" ? "終審核准、指定採購人 (需密碼)" : "Final approval & assign purchaser (Password)",
      requiresPass: true
    },
    admin: {
      zh: "Admin",
      en: "Admin",
      icon: <SlidersHorizontal className="w-3.5 h-3.5" />,
      desc: lang === "zh" ? "管理實驗室全局品項與設定 (需密碼)" : "Catalog & system settings (Password)",
      requiresPass: true
    }
  };

  return (
    <div className="bg-[#fdfdfc] border border-[#e5e5e0] rounded-sm p-5 md:p-6 shadow-xs space-y-5">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-sm bg-[#1b4372] text-white">
              <ShoppingCart className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-[#8d734a] tracking-widest uppercase font-serif italic">
              {lang === "zh" ? "EBB Lab 實驗室請購審核與採購進程管理" : "EBB Lab Procurement & Purchasing Management"}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#1a1a1a] font-serif flex items-center gap-2.5">
            {lang === "zh" ? "實驗室請購審核系統" : "Lab Procurement System"}
            <span className="text-xs font-mono font-normal bg-[#f4f1ea] text-[#1b4372] px-2 py-0.5 rounded-sm border border-[#e5e5e0]">
              v4.1.1
            </span>
          </h1>
          <p className="text-xs md:text-sm text-slate-500 max-w-2xl font-sans">
            {lang === "zh"
              ? "涵蓋藥品化學品、實驗耗材雜物、設備等請購。"
              : "Supports multi-item requisitions, shopping platforms, multi-currency pricing and official requisition form export."}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Language Toggle */}
          <button
            type="button"
            onClick={onToggleLang}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#f8f8f5] hover:bg-[#eae6dc] text-slate-700 border border-[#e5e5e0] rounded-sm text-xs font-bold transition shadow-xs"
            title={lang === "zh" ? "Switch to English" : "切換至繁體中文"}
          >
            <Globe className="w-3.5 h-3.5 text-[#1b4372]" />
            <span>{lang === "zh" ? "EN English" : "繁體中文"}</span>
          </button>

          {/* Fill New Request */}
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1b4372] hover:bg-[#122e4f] text-white rounded-sm text-xs font-bold font-sans shadow-xs transition active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{lang === "zh" ? "+ 填寫新請購單" : "+ New Requisition"}</span>
          </button>
        </div>
      </div>

      {/* Role Switcher Toolbar */}
      <div className="pt-3 border-t border-[#e5e5e0] flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#fbfbfa] p-3 rounded-sm">
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-[#1b4372]" />
            {lang === "zh" ? "身分權限切換：" : "User Role & Access:"}
          </span>
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            ({roleLabels[currentRole].desc})
          </span>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5">
          {(["student", "assistant", "professor", "admin"] as UserRole[]).map((r) => {
            const isSelected = currentRole === r;
            const info = roleLabels[r];
            const isAuthed = authenticatedRoles.has(r);

            return (
              <div key={r} className="relative inline-flex items-center">
                <button
                  type="button"
                  onClick={() => onRoleChange(r)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition border ${
                    isSelected
                      ? "bg-[#1b4372] text-white border-[#1b4372] shadow-xs font-bold"
                      : "bg-white text-slate-700 border-[#e5e5e0] hover:bg-[#f4f1ea]"
                  }`}
                >
                  {info.icon}
                  <span>{lang === "zh" ? info.zh : info.en}</span>
                  {info.requiresPass && (
                    <span 
                      className={`text-[10px] ml-0.5 px-1 rounded ${
                        isAuthed 
                          ? (isSelected ? "bg-blue-900 text-blue-100" : "bg-blue-100 text-[#1b4372]") 
                          : (isSelected ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-slate-400")
                      }`}
                      title={isAuthed ? "已解鎖此身分" : "需要輸入身分密碼"}
                    >
                      {isAuthed ? "已解鎖" : "🔒"}
                    </span>
                  )}
                </button>

                {/* If selected role has password and is unlocked, allow locking back to student */}
                {isSelected && info.requiresPass && isAuthed && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onLockRole(r);
                    }}
                    className="ml-1 p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-200 rounded text-[10px] font-mono"
                    title="鎖定並登出身分"
                  >
                    鎖定登出
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
