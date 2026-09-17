import React, { useState } from "react";
import { UserRole } from "../../types/procurement";
import { Lock, Eye, EyeOff, AlertCircle, X, ShieldAlert } from "lucide-react";

interface RolePasswordModalProps {
  isOpen: boolean;
  targetRole: UserRole | null;
  onClose: () => void;
  onVerifySuccess: (role: UserRole) => void;
  rolePasswords: Record<"assistant" | "professor" | "admin", string>;
  onUpdatePassword?: (role: "assistant" | "professor" | "admin", newPass: string) => void;
  lang: "zh" | "en";
}

export default function RolePasswordModal({
  isOpen,
  targetRole,
  onClose,
  onVerifySuccess,
  rolePasswords,
  lang
}: RolePasswordModalProps) {
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !targetRole || targetRole === "student") return null;

  const getRoleMeta = (role: UserRole) => {
    switch (role) {
      case "assistant":
        return {
          title: "研究助理 (Research Assistant)",
          duty: "具備初審權限、品項審查、規格核准與退回意見撰寫",
          color: "border-amber-500 bg-amber-50 text-amber-900",
          badgeBg: "bg-amber-100 text-amber-800"
        };
      case "professor":
        return {
          title: "教授 / 計畫主持人 (PI / Professor)",
          duty: "具備最終終審權限、核可動支、新增經費計畫、指定採購負責人",
          color: "border-[#1b4372] bg-blue-50 text-blue-950",
          badgeBg: "bg-blue-100 text-[#1b4372]"
        };
      case "admin":
        return {
          title: "系統管理者 (System Admin)",
          duty: "具備所有操作權限、數據導出、全局計畫與品項配置",
          color: "border-purple-600 bg-purple-50 text-purple-950",
          badgeBg: "bg-purple-100 text-purple-800"
        };
      default:
        return {
          title: "身分驗證",
          duty: "操作權限驗證",
          color: "border-slate-400 bg-slate-50 text-slate-900",
          badgeBg: "bg-slate-100 text-slate-800"
        };
    }
  };

  const meta = getRoleMeta(targetRole);
  const currentExpectedPass = rolePasswords[targetRole as "assistant" | "professor" | "admin"];

  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (passwordInput.trim() === currentExpectedPass) {
      setPasswordInput("");
      onVerifySuccess(targetRole);
      onClose();
    } else {
      setErrorMessage(
        lang === "zh"
          ? "密碼錯誤！此身分密碼由實驗室負責人統一配置，請重新確認或洽詢管理員。"
          : "Invalid password! Passwords are managed centrally by the lab administrator."
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
              <h3 className="font-bold text-sm leading-tight font-serif">身分權限密碼驗證</h3>
              <p className="text-[11px] text-slate-400 font-mono">實驗室安全管控 · 統一密碼分發</p>
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
          {/* Target Role Card */}
          <div className={`p-3.5 rounded-sm border ${meta.color} space-y-1`}>
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs">{meta.title}</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-xs font-semibold ${meta.badgeBg}`}>
                權限管制
              </span>
            </div>
            <p className="text-[11px] opacity-80 leading-relaxed">{meta.duty}</p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                請輸入此身分之通行密碼：
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder={lang === "zh" ? "請輸入密碼" : "Enter password"}
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
              <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-amber-600 shrink-0" />
                <span>密碼由實驗室負責人統一配發，非個人自行修改。</span>
              </p>
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
                取消
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-[#1b4372] hover:bg-[#122e4f] rounded-sm shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>驗證身分並切換</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
