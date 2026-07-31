import React, { useState, useEffect } from "react";
import { Lock, KeyRound, Eye, EyeOff, AlertCircle, CheckCircle, UserCheck } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
  title?: string;
  description?: string;
}

export function checkIsAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem("ebb_admin_authenticated") === "true";
}

export function setAuthenticatedState(authenticated: boolean) {
  if (typeof window === "undefined") return;
  if (authenticated) {
    sessionStorage.setItem("ebb_admin_authenticated", "true");
  } else {
    sessionStorage.removeItem("ebb_admin_authenticated");
  }
}

export default function AuthModal({
  isOpen,
  onClose,
  onAuthenticated,
  title = "實驗室管理員身份驗證 (LabData Admin Access)",
  description
}: AuthModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      setErrorMsg("");
      setSuccessMsg("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser || !trimmedPass) {
      setErrorMsg("請輸入帳號與密碼！");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/verify-admin-pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmedUser, password: trimmedPass }),
      });

      const data = await res.json().catch(() => ({ success: false, message: "解析回應失敗" }));

      if (res.ok && data.success) {
        setSuccessMsg("驗證成功！正在登入...");
        setAuthenticatedState(true);
        setTimeout(() => {
          onAuthenticated();
          onClose();
        }, 500);
      } else {
        setErrorMsg(data.message || "帳號或密碼錯誤，請重新輸入。");
      }
    } catch {
      setErrorMsg("伺服器連線失敗，請檢查網路或稍後再試。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-md bg-[#fdfdfc] border border-[#e5e5e0] rounded-sm p-6 sm:p-8 shadow-2xl relative space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Branding */}
        <div className="flex items-center gap-3 border-b border-[#e5e5e0] pb-4">
          <div className="w-10 h-10 rounded-sm bg-[#004b3a] text-white flex items-center justify-center shrink-0 shadow-sm border border-[#8d734a]/30">
            <Lock className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#1a1a1a] font-serif leading-tight">
              {title}
            </h3>
            <p className="text-[10.5px] text-[#8d734a] font-mono tracking-wide font-bold italic mt-0.5">
              Cloudflare & In-App Security Layer
            </p>
          </div>
        </div>

        {description && (
          <p className="text-xs text-slate-600 leading-relaxed font-sans">
            {description}
          </p>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800 font-serif">
              管理者帳號 (Username)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <UserCheck className="w-4 h-4" />
              </span>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="請輸入管理者帳號"
                disabled={isLoading}
                className="w-full bg-white border border-[#e5e5e0] rounded-sm py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#004b3a] focus:ring-1 focus:ring-[#004b3a] font-mono font-medium disabled:opacity-50"
                autoFocus
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800 font-serif">
              管理者密碼 (Password)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </span>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="請輸入管理者密碼"
                disabled={isLoading}
                className="w-full bg-white border border-[#e5e5e0] rounded-sm py-2 pl-9 pr-10 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#004b3a] focus:ring-1 focus:ring-[#004b3a] font-mono font-medium disabled:opacity-50"
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
            <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-sm font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-sm font-medium">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="w-1/3 py-2.5 bg-white hover:bg-slate-50 border border-[#e5e5e0] text-slate-700 rounded-sm text-xs font-bold transition disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="w-2/3 py-2.5 bg-[#004b3a] hover:bg-[#003328] text-white rounded-sm text-xs font-bold uppercase tracking-wider shadow-sm transition active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isLoading ? "驗證中..." : "登入存取"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
