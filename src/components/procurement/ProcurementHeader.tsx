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
    <div className="bg-[#fdfdfc] border border-[#e5e5e0] rounded-sm py-2 px-3 sm:px-4 shadow-2xs">
      {/* Top Banner & Actions in Compact Single/Two-Row Flex */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1 rounded-sm bg-[#1b4372] text-white shrink-0">
              <ShoppingCart className="w-3.5 h-3.5" />
            </span>
            <h1 className="text-base sm:text-lg font-bold text-[#1a1a1a] font-serif flex items-center gap-2">
              <span>{lang === "zh" ? "實驗室請購審核系統" : "Lab Procurement System"}</span>
              <span className="text-[10px] font-mono font-normal bg-[#f4f1ea] text-[#1b4372] px-1.5 py-0.2 rounded-sm border border-[#e5e5e0]">
                v4.2.0
              </span>
            </h1>
            <span className="hidden md:inline text-[11px] text-[#8d734a] font-serif italic border-l border-slate-300 pl-2">
              {lang === "zh" ? "EBB Lab 請購審核與採購進程" : "EBB Lab Procurement Management"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-sans truncate max-w-xl mt-0.5 hidden sm:block">
            {lang === "zh"
              ? "點選「+ 填寫請購」送出藥品試劑、實驗耗材或設備。資料雙向即時同步 Google 試算表。"
              : "Submit requisitions for chemicals, consumables, or equipment. Real-time sync with Google Sheets."}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Cloud Sync Button */}
          {onSyncNow && (
            <button
              type="button"
              onClick={onSyncNow}
              disabled={isSyncing}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-sm text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-60 whitespace-nowrap"
              title={lastSyncTime ? `上次同步：${lastSyncTime}` : "立即同步 Google 試算表最新請購資料"}
            >
              <RefreshCw className={`w-3 h-3 text-emerald-700 ${isSyncing ? "animate-spin" : ""}`} />
              <span className="hidden xs:inline">{isSyncing ? (lang === "zh" ? "同步中..." : "Syncing...") : (lang === "zh" ? "同步雲端" : "Sync Cloud")}</span>
            </button>
          )}

          {/* Language Toggle */}
          <button
            type="button"
            onClick={onToggleLang}
            className="inline-flex items-center gap-1 px-2 py-1.5 bg-[#f8f8f5] hover:bg-[#eae6dc] text-slate-700 border border-[#e5e5e0] rounded-sm text-xs font-bold transition shadow-2xs cursor-pointer whitespace-nowrap"
            title={lang === "zh" ? "Switch to English" : "切換至繁體中文"}
          >
            <Globe className="w-3 h-3 text-[#1b4372]" />
            <span>{lang === "zh" ? "EN" : "中"}</span>
          </button>

          {/* Admin Review Login / Logout Button */}
          {isAdmin ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 text-purple-900 border border-purple-200 rounded-sm text-xs font-bold font-sans shadow-2xs whitespace-nowrap">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
              <span>Admin 審批</span>
              <button
                type="button"
                onClick={onAdminLogout}
                className="inline-flex items-center gap-0.5 ml-1 text-purple-600 hover:text-purple-950 font-normal hover:underline cursor-pointer"
                title={lang === "zh" ? "登出 Admin 審批身分" : "Log out admin"}
              >
                <LogOut className="w-2.5 h-2.5" />
                <span className="text-[11px]">{lang === "zh" ? "登出" : "Exit"}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAdminLogin}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-[#e5e5e0] rounded-sm text-xs font-bold font-sans transition shadow-2xs cursor-pointer whitespace-nowrap"
              title={lang === "zh" ? "輸入密碼以 Admin 身分審批請購單" : "Enter password for Admin approval"}
            >
              <Lock className="w-3 h-3 text-slate-500" />
              <span>{lang === "zh" ? "Admin 審批" : "Admin"}</span>
            </button>
          )}

          {/* Primary Action: Fill Requisition */}
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#1b4372] hover:bg-[#122e4f] text-white rounded-sm text-xs font-bold font-sans shadow-2xs transition active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{lang === "zh" ? "+ 填寫請購" : "+ Requisition"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
