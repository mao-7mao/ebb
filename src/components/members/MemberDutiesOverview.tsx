import React, { useState } from "react";
import { Member } from "../../data/labData";
import { 
  ClipboardList, 
  Search, 
  CheckCircle2, 
  Tag, 
  Users, 
  FileText, 
  AlertCircle,
  ShieldCheck,
  Fish,
  FlaskConical,
  Trash2,
  ShoppingCart,
  HardDrive,
  CalendarCheck,
  Sparkles
} from "lucide-react";

interface MemberDutiesOverviewProps {
  members: Member[];
  onOpenStudio?: () => void;
}

export default function MemberDutiesOverview({ members, onOpenStudio }: MemberDutiesOverviewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Filter members that have duties defined
  const membersWithDuties = members.filter((m) => m.duties && m.duties.length > 0);

  // Common category filters based on laboratory duties
  const categories = [
    { id: "ALL", label: "All Duties" },
    { id: "藥品", label: "Chemicals & Reagents" },
    { id: "魚缸", label: "Aquarium" },
    { id: "能資源", label: "Safety & Energy" },
    { id: "耗材", label: "Consumables" },
    { id: "詢價", label: "Procurement" },
    { id: "廢液", label: "Waste Disposal" },
    { id: "會議", label: "Meeting Records" }
  ];

  // Filter logic
  const filteredList = membersWithDuties.filter((member) => {
    const searchLower = searchTerm.toLowerCase();
    const nameMatch = 
      member.name_zh.toLowerCase().includes(searchLower) ||
      member.name_en.toLowerCase().includes(searchLower) ||
      (member.role && member.role.toLowerCase().includes(searchLower));
    
    const dutiesMatch = member.duties?.some((duty) => 
      duty.toLowerCase().includes(searchLower)
    );

    const matchSearch = !searchTerm || nameMatch || dutiesMatch;

    if (!matchSearch) return false;

    if (selectedCategory === "ALL") return true;

    return member.duties?.some((duty) => duty.includes(selectedCategory));
  });

  // Calculate duty counts
  const totalDutiesCount = membersWithDuties.reduce((acc, curr) => acc + (curr.duties?.length || 0), 0);

  // Helper to get duty category badge
  const getDutyHighlightBadge = (dutyText: string) => {
    if (dutyText.includes("魚缸")) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
          <Fish className="w-3 h-3 text-cyan-600" />
          魚缸
        </span>
      );
    }
    if (dutyText.includes("藥品") || dutyText.includes("化學品") || dutyText.includes("藥瓶")) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
          <FlaskConical className="w-3 h-3 text-amber-600" />
          藥品管理
        </span>
      );
    }
    if (dutyText.includes("廢液")) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
          <Trash2 className="w-3 h-3 text-rose-600" />
          廢液處理
        </span>
      );
    }
    if (dutyText.includes("能資源") || dutyText.includes("安全衛生")) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          能資源/安衛
        </span>
      );
    }
    if (dutyText.includes("詢價") || dutyText.includes("訂購")) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
          <ShoppingCart className="w-3 h-3 text-blue-600" />
          採購詢價
        </span>
      );
    }
    if (dutyText.includes("會議")) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
          <CalendarCheck className="w-3 h-3 text-indigo-600" />
          會議紀錄
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Overview Top Info Banner */}
      <div className="bg-white border border-[#e5e5e0] rounded-sm p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#1b4372]/10 text-[#1b4372] rounded-sm">
              <ClipboardList className="w-4 h-4" />
            </span>
            <h3 className="text-lg font-bold text-[#1b4372] font-serif tracking-tight">
              實驗室人員負責項目表 (Lab Duties & Responsibilities)
            </h3>
          </div>
          <p className="text-xs text-[#666]">
            EBB 實驗室全體成員之安全衛生、藥品管理、魚缸維護、耗材採購與環境檢查之專責分工清單。
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="px-3.5 py-1.5 bg-[#f8f8f5] border border-[#e5e5e0] rounded-sm text-center">
            <span className="block text-[10px] text-slate-500 font-mono uppercase">已分配成員</span>
            <span className="text-base font-bold text-[#1b4372] font-serif">{membersWithDuties.length} 位</span>
          </div>
          <div className="px-3.5 py-1.5 bg-[#f8f8f5] border border-[#e5e5e0] rounded-sm text-center">
            <span className="block text-[10px] text-slate-500 font-mono uppercase">負責事項總數</span>
            <span className="text-base font-bold text-[#8d734a] font-serif">{totalDutiesCount} 項</span>
          </div>
          {onOpenStudio && (
            <button
              type="button"
              onClick={onOpenStudio}
              className="px-3 py-2 bg-[#1b4372] hover:bg-[#102844] text-white rounded-sm text-xs font-bold transition shadow-xs flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Manage in Studio</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-[#1b4372] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search member name or duty keywords (e.g. aquarium, chemicals, waste, safety, procurement)..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#e5e5e0] rounded-sm text-xs md:text-sm font-sans focus:outline-none focus:border-[#1b4372] focus:ring-1 focus:ring-[#1b4372]"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1.5 rounded-sm text-xs font-bold transition ${
                selectedCategory === cat.id
                  ? "bg-[#1b4372] text-white shadow-xs"
                  : "bg-white text-slate-600 border border-[#e5e5e0] hover:bg-[#f8f8f5]"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Formal Academic Duties Table (Matches the Lab Document) */}
      <div className="bg-white border border-[#e5e5e0] rounded-sm shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f8f8f5] border-b border-[#e5e5e0] text-[#1b4372]">
                <th className="py-3 px-6 text-xs font-bold font-serif uppercase tracking-wider w-48 sm:w-56 border-r border-[#e5e5e0]">
                  Member
                </th>
                <th className="py-3 px-6 text-xs font-bold font-serif uppercase tracking-wider">
                  Assigned Duties & Responsibilities
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e5e5e0] text-sm">
              {filteredList.length > 0 ? (
                filteredList.map((member, idx) => (
                  <tr 
                    key={member.id || idx}
                    className="hover:bg-[#fdfdfc] transition-colors group"
                  >
                    {/* Member Column */}
                    <td className="py-4 px-6 align-top border-r border-[#e5e5e0] bg-[#fafaf8]/50 group-hover:bg-[#fafaf8]">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-[#1b4372] text-white text-xs font-serif font-bold flex items-center justify-center shrink-0">
                            {member.name_zh.slice(0, 1)}
                          </span>
                          <div>
                            <span className="font-bold text-base text-[#1a1a1a] font-serif block">
                              {member.name_zh}
                            </span>
                            {member.name_en && (
                              <span className="text-xs text-slate-500 font-mono block">
                                {member.name_en}
                              </span>
                            )}
                          </div>
                        </div>
                        {member.role && (
                          <div className="pt-1">
                            <span className="inline-block text-[10.5px] font-bold text-[#8d734a] bg-amber-50/80 border border-amber-200/80 px-2 py-0.5 rounded-sm">
                              {member.role}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Duties Column */}
                    <td className="py-4 px-6 align-top">
                      <ul className="space-y-2.5">
                        {member.duties?.map((duty, dIdx) => (
                          <li 
                            key={dIdx} 
                            className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-800 leading-relaxed"
                          >
                            <span className="text-[#1b4372] font-black text-sm select-none shrink-0 mt-0.5">
                              •
                            </span>
                            <div className="flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-slate-900">{duty}</span>
                                {getDutyHighlightBadge(duty)}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="py-12 text-center text-slate-500">
                    <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-medium">沒有找到符合條件的人員負責項目紀錄。</p>
                    <p className="text-xs text-slate-400 mt-1">請嘗試調整搜尋關鍵字或分類篩選條件。</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Note */}
        <div className="bg-[#f8f8f5] border-t border-[#e5e5e0] px-6 py-3 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#1b4372]">備註：</span>
            <span>所有項目依實驗室管理規章定期由成員分工維護，如有輪調變更可於 Lab Data Studio 內隨時更新與匯出。</span>
          </div>
          <div className="text-slate-400 font-mono text-[11px]">
            EBB Laboratory Duty Assignment Registry
          </div>
        </div>
      </div>
    </div>
  );
}
