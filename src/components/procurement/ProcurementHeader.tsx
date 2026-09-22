import React from "react";
import { 
  ShoppingCart, 
  PlusCircle, 
  Globe, 
  Lock, 
  ShieldCheck, 
  LogOut,
  SlidersHorizontal,
  RefreshCw,
  Cloud
} from "lucide-react";

interface ProcurementHeaderProps {
  isAdmin: boolean;
  onOpenAdminLogin: () => void;
  onAdminLogout: () => void;
  lang: "zh" | "en";
  onToggleLang: () => void;
  onOpenCreateModal: () => void;
  totalCount: number;
  pendingCount: number;
  onSyncNow?: () => void;
  isSyncing?: boolean;
  lastSyncTime?: string | null;
}

export default function ProcurementHeader({
  isAdmin,
  onOpenAdminLogin,
  onAdminLogout,
  lang,
  onToggleLang,
  onOpenCreateModal,
  totalCount,
  pendingCount,
  onSyncNow,
  isSyncing = false,
  lastSyncTime
}: ProcurementHeaderProps) {
  return (
    <div className="bg-[#fdfdfc] border border-[#e5e5e0] rounded-sm p-5 md:p-6 shadow-xs space-y-4">
      {/* Top Banner & Actions */}
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
              v4.2.0
            </span>
          </h1>
          <p className="text-xs md:text-sm text-slate-500 max-w-2xl font-sans">
            {lang === "zh"
              ? "點選「+ 填寫請購」送出藥品試劑、實驗耗材或設備請購。"
              : "Submit chemical, consumable, or equipment requisitions. Synchronized two-way with Google Sheets."}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Cloud Sync Button */}
          {onSyncNow && (
            <button
              type="button"
              onClick={onSyncNow}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-sm text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-60"
              title={lastSyncTime ? `上次同步：${lastSyncTime}` : "立即同步 Google 試算表最新請購資料"}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-700 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? (lang === "zh" ? "同步中..." : "Syncing...") : (lang === "zh" ? "同步雲端" : "Sync Cloud")}</span>
            </button>
          )}

          {/* Language Toggle */}
          <button
            type="button"
            onClick={onToggleLang}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#f8f8f5] hover:bg-[#eae6dc] text-slate-700 border border-[#e5e5e0] rounded-sm text-xs font-bold transition shadow-xs cursor-pointer"
            title={lang === "zh" ? "Switch to English" : "切換至繁體中文"}
          >
            <Globe className="w-3.5 h-3.5 text-[#1b4372]" />
            <span>{lang === "zh" ? "EN English" : "繁體中文"}</span>
          </button>

          {/* Admin Review Login / Logout Button */}
          {isAdmin ? (
            <div className="inline-flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-900 border border-purple-200 rounded-sm text-xs font-bold font-sans shadow-xs">
              <ShieldCheck className="w-4 h-4 text-purple-700" />
              <span>{lang === "zh" ? "Admin 審批已登入" : "Admin Logged In"}</span>
              <button
                type="button"
                onClick={onAdminLogout}
                className="inline-flex items-center gap-1 ml-1 text-purple-600 hover:text-purple-950 font-normal hover:underline cursor-pointer"
                title={lang === "zh" ? "登出 Admin 審批身分" : "Log out admin"}
              >
                <LogOut className="w-3 h-3" />
                <span>{lang === "zh" ? "登出" : "Logout"}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAdminLogin}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-[#e5e5e0] rounded-sm text-xs font-bold font-sans transition shadow-xs cursor-pointer"
              title={lang === "zh" ? "輸入密碼以 Admin 身分審批請購單" : "Enter password for Admin approval"}
            >
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>{lang === "zh" ? "Admin 審批登入" : "Admin Login"}</span>
            </button>
          )}

          {/* Primary Action: Fill Requisition */}
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1b4372] hover:bg-[#122e4f] text-white rounded-sm text-xs font-bold font-sans shadow-xs transition active:scale-95 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{lang === "zh" ? "+ 填寫請購" : "+ New Requisition"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
