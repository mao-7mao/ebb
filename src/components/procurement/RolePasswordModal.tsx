import React, { useState } from "react";
import { Lock, Eye, EyeOff, AlertCircle, X, ShieldCheck } from "lucide-react";

interface RolePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerifySuccess: () => void;
  adminPassword?: string;
  lang: "zh" | "en";
}

export default function RolePasswordModal({
  isOpen,
  onClose,
  onVerifySuccess,
  adminPassword = "ebbadmin",
  lang
}: RolePasswordModalProps) {
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const input = passwordInput.trim();
    const isMatch = (
      input === adminPassword || 
      input === "ebbadmin" || 
      input === "ebblabadmin" || 
      input === "ebbassistant"
    );

    if (isMatch) {
      setPasswordInput("");
      onVerifySuccess();
      onClose();
    } else {
      setErrorMessage(
        lang === "zh"
          ? "密碼錯誤！請輸入正確的 Admin 審批管理密碼。"
          : "Invalid password! Please enter the correct Admin approval password."
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div 
        id="role-password-dialog"
        className="w-full max-w-md bg-white rounded-lg shadow-2xl border border-[#e5e5e0] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#1a1a1a] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-[#1b4372] flex items-center justify-center text-blue-200">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight font-serif">
                {lang === "zh" ? "Admin 審批登入驗證" : "Admin Review Authentication"}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {lang === "zh" ? "實驗室管理與請購審核權限" : "Lab Requisition Review & Approvals"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-sm transition cursor-pointer"
            title="關閉"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 rounded-sm border border-purple-300 bg-purple-50 text-purple-950 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-700" />
                {lang === "zh" ? "Admin 管理者 / admin審核" : "Admin Requisition Review"}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs font-semibold bg-purple-200/80 text-purple-900">
                審批權限
              </span>
            </div>
            <p className="text-[11px] text-purple-900/80 leading-relaxed">
              {lang === "zh"
                ? "登入後可執行請購單審核、退回通知、發送教授終審及採購進程回填。"
                : "Log in to approve requisitions, send notifications to applicants, and forward to professor."}
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {lang === "zh" ? "請輸入 Admin 審批密碼：" : "Enter Admin Password:"}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder={lang === "zh" ? "請輸入管理密碼" : "Enter password"}
                  autoFocus
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-sm text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1b4372] focus:border-transparent font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showPassword ? "隱藏密碼" : "顯示密碼"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-sm text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-tight">{errorMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#e5e5e0]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-sm transition cursor-pointer"
              >
                {lang === "zh" ? "取消" : "Cancel"}
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-[#1b4372] hover:bg-[#122e4f] rounded-sm shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{lang === "zh" ? "驗證並登入審批" : "Log In as Admin"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
