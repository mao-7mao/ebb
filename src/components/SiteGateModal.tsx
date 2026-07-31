import React, { useState } from "react";
import { Lock, KeyRound, Eye, EyeOff, AlertCircle, CheckCircle, Sparkles } from "lucide-react";

export function checkIsSiteUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("ebb_site_unlocked") === "true";
}

export function setSiteUnlockedState(unlocked: boolean) {
  if (typeof window === "undefined") return;
  if (unlocked) {
    localStorage.setItem("ebb_site_unlocked", "true");
  } else {
    localStorage.removeItem("ebb_site_unlocked");
  }
}

interface SiteGateModalProps {
  onUnlocked: () => void;
}

export default function SiteGateModal({ onUnlocked }: SiteGateModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const trimmedPass = password.trim();

    if (!trimmedPass) {
      setErrorMsg("請輸入全站存取密碼！");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/verify-site-pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: trimmedPass }),
      });

      if (res.status === 404) {
        setErrorMsg("伺服器驗證端點未找到 (HTTP 404)。請將最新 functions 資料夾推送到 GitHub，以在 Cloudflare 啟用 Pages Functions。");
        return;
      }

      const contentType = res.headers.get("content-type") || "";
      let data: { success?: boolean; message?: string } = {};

      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          setErrorMsg("伺服器回應格式異常 (非 JSON)。請確認 Cloudflare Pages Functions 已正常構建。");
          return;
        }
      }

      if (res.ok && data.success) {
        setSuccessMsg("驗證成功！正在進入 EBB Lab 系統...");
        setSiteUnlockedState(true);
        setTimeout(() => {
          onUnlocked();
        }, 400);
      } else {
        setErrorMsg(data.message || "全站存取密碼錯誤，請重新輸入。");
      }
    } catch {
      setErrorMsg("伺服器連線失敗，請檢查網路或稍後再試。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-[#1a1a1a]/90 backdrop-blur-xl animate-fadeIn">
      <div 
        className="w-full max-w-md bg-[#fdfdfc] border border-[#e5e5e0] rounded-sm p-8 shadow-2xl relative space-y-6"
      >
        {/* Header Branding */}
        <div className="text-center space-y-3 border-b border-[#e5e5e0] pb-6">
          <div className="w-14 h-14 rounded-sm bg-[#004b3a] text-white flex items-center justify-center mx-auto shadow-md border border-[#8d734a]/40 font-serif italic font-bold text-2xl">
            E
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[#e5e5e0] bg-[#f8f8f5] text-[10px] uppercase tracking-widest font-bold text-[#8d734a]">
              <Sparkles className="w-3 h-3 text-[#004b3a]" />
              EBB Lab Private Access
            </span>
            <h2 className="text-xl font-bold text-[#1a1a1a] font-serif mt-2">
              網站存取身分驗證
            </h2>
            <p className="text-xs text-[#666] font-sans mt-1">
              本網站為私人實驗室系統，請輸入全站存取密碼以查看內容。
            </p>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800 font-serif">
              全站存取密碼 (Site Password)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4 text-[#004b3a]" />
              </span>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="請輸入全站存取密碼"
                disabled={isLoading}
                className="w-full bg-white border border-[#e5e5e0] rounded-sm py-2.5 pl-9 pr-10 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#004b3a] focus:ring-1 focus:ring-[#004b3a] font-mono font-medium disabled:opacity-50"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-sm font-medium leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-sm font-medium">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#004b3a] hover:bg-[#003328] text-white rounded-sm text-xs font-bold uppercase tracking-wider shadow-sm transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Lock className="w-4 h-4 text-amber-300" />
              <span>{isLoading ? "驗證中..." : "進入 EBB Lab 系統"}</span>
            </button>
          </div>
        </form>

        <div className="pt-3 border-t border-[#e5e5e0] text-center">
          <p className="text-[10.5px] text-[#8d734a] font-mono">
            Environmental Biotechnology & Biorefinery Laboratory
          </p>
        </div>
      </div>
    </div>
  );
}
