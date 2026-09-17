import React, { useState } from "react";
import { BudgetProject } from "../../types/procurement";
import { FolderPlus, X, Check, Building2, Calendar, FileText, User } from "lucide-react";

interface AddBudgetProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProject: (project: BudgetProject) => void;
  lang: "zh" | "en";
}

export default function AddBudgetProjectModal({
  isOpen,
  onClose,
  onAddProject,
  lang
}: AddBudgetProjectModalProps) {
  const [code, setCode] = useState("");
  const [nameZh, setNameZh] = useState("");
  const [fundingAgency, setFundingAgency] = useState("國科會");
  const [pi, setPi] = useState("Prof. Chang");
  const [validPeriod, setValidPeriod] = useState("2025/08/01 - 2028/07/31");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError(lang === "zh" ? "請輸入計畫代碼 / 計畫編號" : "Project code is required");
      return;
    }
    if (!nameZh.trim()) {
      setError(lang === "zh" ? "請輸入計畫中文名稱" : "Project name is required");
      return;
    }

    const newProject: BudgetProject = {
      code: code.trim(),
      nameZh: `${fundingAgency}：${nameZh.trim()}`,
      nameEn: nameZh.trim(),
      pi: pi.trim() || "Prof. K.L. Chang",
      validPeriod: validPeriod.trim() || "2025/08/01 - 2028/07/31"
    };

    onAddProject(newProject);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center text-emerald-200">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">教授新增經費來源計畫</h3>
              <p className="text-xs text-emerald-200/80">新增後將即時儲存，日後請購皆可直接選用</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white p-1 rounded-lg transition"
            title="關閉"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              計畫代碼 / 計畫編號 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder=""
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
              autoFocus
            />
            <span className="text-[11px] text-slate-500 mt-0.5 block">學校主計室核定之經費代碼</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              補助單位 / 經費屬性
            </label>
            <select
              value={fundingAgency}
              onChange={(e) => setFundingAgency(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              <option value="國科會 (NSTC)">國科會專題研究計畫</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              計畫中文名稱 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={nameZh}
              onChange={(e) => setNameZh(e.target.value)}
              placeholder=""
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                計畫主持人 (PI)
              </label>
              <input
                type="text"
                value={pi}
                onChange={(e) => setPi(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                執行起訖期限
              </label>
              <input
                type="text"
                value={validPeriod}
                onChange={(e) => setValidPeriod(e.target.value)}
                placeholder="2026/08/01 - 2027/07/31"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>儲存並啟用計畫</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
