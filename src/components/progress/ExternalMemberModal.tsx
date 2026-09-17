import React, { useState } from "react";
import { ExternalMember, ExternalRoleType } from "../../types/progress";
import { X, UserPlus, Building, BookOpen, Check } from "lucide-react";

interface ExternalMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (member: ExternalMember) => void;
  existingExternalMembers: ExternalMember[];
}

export default function ExternalMemberModal({
  isOpen,
  onClose,
  onSave
}: ExternalMemberModalProps) {
  const [nameZh, setNameZh] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [roleType, setRoleType] = useState<ExternalRoleType>("在職生");
  const [roleTitle, setRoleTitle] = useState("碩士在職專班生");
  const [organization, setOrganization] = useState("");
  const [researchTopicZh, setResearchTopicZh] = useState("");
  const [keywords, setKeywords] = useState("");
  const [description, setDescription] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameZh.trim() || !nameEn.trim()) {
      alert("請輸入成員中英文姓名！");
      return;
    }

    const newMember: ExternalMember = {
      id: `parttime_${Date.now()}_${nameEn.toLowerCase().replace(/\s+/g, "")}`,
      name_zh: nameZh.trim(),
      name_en: nameEn.trim(),
      role: roleTitle.trim() || roleType,
      role_type: roleType,
      is_external: true,
      organization: organization.trim() || undefined,
      research_topic: {
        title_zh: researchTopicZh.trim() || "在職專班研究課題",
        title_en: "In-service Research Topic",
        keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean)
      },
      description: description.trim(),
      created_at: new Date().toISOString().split("T")[0]
    };

    onSave(newMember);
    onClose();
    // reset
    setNameZh("");
    setNameEn("");
    setOrganization("");
    setResearchTopicZh("");
    setKeywords("");
    setDescription("");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[#fdfdfc] border border-[#e5e5e0] rounded-sm max-w-lg w-full shadow-2xl overflow-hidden my-6">
        <div className="flex items-center justify-between px-6 py-4 bg-[#f8f8f5] border-b border-[#e5e5e0]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-[#1b4372] text-white flex items-center justify-center font-bold text-sm">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1a1a1a] font-serif">
                新增「在職生」成員
              </h3>
              <p className="text-[11px] text-[#1b4372] font-mono">
                建檔在職專班生、在職碩博士生之研究課題與論文進度
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-sm hover:bg-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Identity category */}
          <div className="bg-[#f8f8f5] p-3 rounded-sm border border-[#e5e5e0] space-y-2">
            <label className="block font-bold text-slate-800">
              身分類別 (在職專班 / 在職研究生) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {(["在職生", "在職專班生", "在職碩士生", "在職博士生"] as ExternalRoleType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setRoleType(type);
                    if (type === "在職生") setRoleTitle("在職研究生");
                    if (type === "在職專班生") setRoleTitle("碩士在職專班生");
                    if (type === "在職碩士生") setRoleTitle("在職碩士研究生");
                    if (type === "在職博士生") setRoleTitle("在職博士生");
                  }}
                  className={`py-1.5 px-2 text-[11px] font-bold rounded-xs border text-center transition cursor-pointer ${
                    roleType === type
                      ? "bg-[#1b4372] text-white border-[#1b4372] shadow-xs"
                      : "bg-white text-slate-600 border-[#e5e5e0] hover:bg-slate-50"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                中文姓名 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={nameZh}
                onChange={(e) => setNameZh(e.target.value)}
                placeholder="例如: 陳育仁"
                className="w-full bg-white border border-[#e5e5e0] rounded-sm py-2 px-3 text-xs focus:outline-none focus:border-[#1b4372]"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                英文姓名 / 稱謂 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="例如: Yu-Jen Chen"
                className="w-full bg-white border border-[#e5e5e0] rounded-sm py-2 px-3 text-xs focus:outline-none focus:border-[#1b4372]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                職稱 / 身份標籤
              </label>
              <input
                type="text"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="例如: 碩士在職專班生 (114級)"
                className="w-full bg-white border border-[#e5e5e0] rounded-sm py-2 px-3 text-xs focus:outline-none focus:border-[#1b4372]"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Building className="w-3 h-3 text-slate-400" />
                <span>現職機構 / 任職單位</span>
              </label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="例如: 中油煉製研究所 / 環工所"
                className="w-full bg-white border border-[#e5e5e0] rounded-sm py-2 px-3 text-xs focus:outline-none focus:border-[#1b4372]"
              />
            </div>
          </div>

          <div className="space-y-3 pt-1 border-t border-[#e5e5e0]">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-[#1b4372]" />
                <span>論文 / 研究題目</span>
              </label>
              <input
                type="text"
                value={researchTopicZh}
                onChange={(e) => setResearchTopicZh(e.target.value)}
                placeholder="例如: 石化製程揮發性有機物 (VOC) 生物濾床去除效率評估"
                className="w-full bg-white border border-[#e5e5e0] rounded-sm py-2 px-3 text-xs focus:outline-none focus:border-[#1b4372]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                關鍵字 (以逗號分隔)
              </label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="例如: VOC去除, 生物濾床, 在職研究"
                className="w-full bg-white border border-[#e5e5e0] rounded-sm py-2 px-3 text-xs focus:outline-none focus:border-[#1b4372]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                備註說明 (論文進度規劃、實場試驗規劃等)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="例如: 結合工廠實場廢氣進行中試生物濾床除臭與連續進氣監測..."
                className="w-full bg-white border border-[#e5e5e0] rounded-sm py-2 px-3 text-xs focus:outline-none focus:border-[#1b4372]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e5e5e0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-[#e5e5e0] hover:bg-slate-50 text-slate-700 rounded-sm font-medium transition cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#1b4372] hover:bg-[#122e4f] text-white rounded-sm font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Check className="w-4 h-4" />
              儲存並加入在職生成員名單
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
