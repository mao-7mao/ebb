import React, { useState, useEffect, useMemo } from "react";
import { Member, members as defaultLabMembers } from "../../data/labData";
import { 
  ClipboardList, 
  Search, 
  CheckCircle2, 
  Users, 
  AlertCircle,
  ShieldCheck,
  Fish,
  FlaskConical,
  Trash2,
  ShoppingCart,
  CalendarCheck,
  Sparkles,
  Code,
  Copy,
  Check,
  Download,
  RotateCcw,
  Plus,
  X,
  Edit3,
  FileCode,
  CheckCheck
} from "lucide-react";

interface MemberDutiesOverviewProps {
  members: Member[];
  onUpdateMembers?: (updated: Member[]) => void;
  onOpenStudio?: () => void;
}

export default function MemberDutiesOverview({ 
  members, 
  onUpdateMembers, 
  onOpenStudio 
}: MemberDutiesOverviewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // State for JSON Module panel visibility
  const [isJsonModuleOpen, setIsJsonModuleOpen] = useState(false);
  const [jsonActiveTab, setJsonActiveTab] = useState<"json_sync" | "visual_editor">("json_sync");

  // Visual editor selected member
  const [selectedMemberId, setSelectedMemberId] = useState<string>(() => {
    return members.find(m => m.duties && m.duties.length > 0)?.id || members[0]?.id || "";
  });
  const [newDutyInput, setNewDutyInput] = useState("");

  // JSON input & sync state
  const [jsonInputValue, setJsonInputValue] = useState("");
  const [jsonStatusMessage, setJsonStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  // Generate the formatted JSON representing current member duties
  const currentDutiesJson = useMemo(() => {
    const dutyMap: Record<string, string[]> = {};
    members.forEach((m) => {
      if (m.duties && m.duties.length > 0) {
        dutyMap[m.name_zh] = m.duties;
      }
    });
    return JSON.stringify(dutyMap, null, 2);
  }, [members]);

  // Keep JSON input field synchronized with current duties
  useEffect(() => {
    setJsonInputValue(currentDutiesJson);
  }, [currentDutiesJson]);

  // Filter members that have duties defined
  const membersWithDuties = useMemo(() => {
    return members.filter((m) => m.duties && m.duties.length > 0);
  }, [members]);

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

  // Filter logic for main duties table
  const filteredList = useMemo(() => {
    return membersWithDuties.filter((member) => {
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
  }, [membersWithDuties, searchTerm, selectedCategory]);

  // Calculate duty counts
  const totalDutiesCount = useMemo(() => {
    return membersWithDuties.reduce((acc, curr) => acc + (curr.duties?.length || 0), 0);
  }, [membersWithDuties]);

  // Helper to get duty category badge
  const getDutyHighlightBadge = (dutyText: string) => {
    if (dutyText.includes("魚缸")) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
          <Fish className="w-3 h-3 text-cyan-600" />
          魚缸維護
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
    if (dutyText.includes("詢價") || dutyText.includes("訂購") || dutyText.includes("採購")) {
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

  // ===================== JSON PARSER & APPLIER =====================
  const handleApplyJson = () => {
    try {
      const parsed = JSON.parse(jsonInputValue);
      const updatedMembers = [...members];
      let matchCount = 0;

      if (typeof parsed === "object" && !Array.isArray(parsed) && parsed !== null) {
        // Format A: { "林郁芳": ["duty1", "duty2"], "陳采翎": [...] }
        Object.entries(parsed).forEach(([key, val]) => {
          if (Array.isArray(val)) {
            const member = updatedMembers.find(
              (m) => m.name_zh === key || m.id === key || m.name_en?.toLowerCase() === key.toLowerCase()
            );
            if (member) {
              member.duties = val.map((item) => String(item).trim()).filter(Boolean);
              matchCount++;
            }
          }
        });
      } else if (Array.isArray(parsed)) {
        // Format B: [ { "name": "林郁芳", "duties": [...] } ] or [ { "id": "fanny", "duties": [...] } ]
        parsed.forEach((item) => {
          if (item && typeof item === "object") {
            const identifier = item.name_zh || item.name || item.id || item.name_en;
            if (identifier && Array.isArray(item.duties)) {
              const member = updatedMembers.find(
                (m) => m.name_zh === identifier || m.id === identifier || m.name_en?.toLowerCase() === String(identifier).toLowerCase()
              );
              if (member) {
                member.duties = item.duties.map((d: any) => String(d).trim()).filter(Boolean);
                matchCount++;
              }
            }
          }
        });
      } else {
        throw new Error("JSON 格式不支援。請輸入物件對應表 (例如 {\"姓名\": [\"項目1\"]}) 或陣列物件。");
      }

      if (matchCount === 0) {
        setJsonStatusMessage({
          type: "error",
          text: "未找到對應的實驗室成員姓名或 ID，請檢查 JSON 鍵值是否符合成員名單。"
        });
        return;
      }

      if (onUpdateMembers) {
        onUpdateMembers(updatedMembers);
      }

      setJsonStatusMessage({
        type: "success",
        text: `成功套用並同步更新！共更新 ${matchCount} 位成員的職責項目。`
      });

      setTimeout(() => {
        setJsonStatusMessage(null);
      }, 5000);
    } catch (err: any) {
      setJsonStatusMessage({
        type: "error",
        text: `JSON 解析失敗: ${err.message || "語法錯誤，請檢查括號與逗號"}`
      });
    }
  };

  // Copy JSON to clipboard
  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonInputValue);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  // Download JSON file
  const handleDownloadJson = () => {
    const blob = new Blob([jsonInputValue], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ebb-lab-member-duties-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Prettify JSON
  const handlePrettifyJson = () => {
    try {
      const parsed = JSON.parse(jsonInputValue);
      setJsonInputValue(JSON.stringify(parsed, null, 2));
      setJsonStatusMessage({ type: "info", text: "JSON 格式已重新排版美化。" });
      setTimeout(() => setJsonStatusMessage(null), 3000);
    } catch (err: any) {
      setJsonStatusMessage({ type: "error", text: "無法排版：無效的 JSON 語法。" });
    }
  };

  // Load standard template
  const handleLoadTemplate = () => {
    const template: Record<string, string[]> = {
      "林郁芳": [
        "耗材使用登記管理",
        "能資源及環境管理系統-安全衛生含輻射防護檢查員（安全衛生防護自主檢查表、作業環境暨危險機械及設備調查）"
      ],
      "陳采翎": [
        "能資源及環境管理系統-毒性及關注化學物質檢查員",
        "能資源及環境管理系統-事業廢棄物檢查員",
        "能資源及環境管理系統-廢棄物減量檢查員",
        "化學品使用登記管理",
        "新進人員實驗室安全教育訓練及指引",
        "各實驗室毒性及關注化學物質清冊及化學品清單管理"
      ],
      "張佑平": [
        "能資源及環境管理系統-事業廢水檢查員",
        "能資源及環境管理系統-水資源檢查員",
        "能資源及環境管理系統-空氣污染防制檢查員",
        "魚缸水質檢測與魚隻照護維護",
        "高壓氣瓶存量巡檢與安全固定"
      ],
      "陳致宇": [
        "組會會議記錄登錄與彙整",
        "實驗室儀器校正與基礎耗材採購估價",
        "廢液桶分類標籤管理與定期申報清運"
      ]
    };
    setJsonInputValue(JSON.stringify(template, null, 2));
    setJsonStatusMessage({
      type: "info",
      text: "已載入標準範本 JSON。確認無誤後點擊「套用並更新」即可生效。"
    });
  };

  // Reset to default labData duties
  const handleResetToDefault = () => {
    if (confirm("確定要重置所有成員負責項目為原始 labData.ts 預設值嗎？")) {
      const updatedMembers = members.map((m) => {
        const defaultMember = defaultLabMembers.find((dm) => dm.id === m.id || dm.name_zh === m.name_zh);
        return {
          ...m,
          duties: defaultMember?.duties ? [...defaultMember.duties] : []
        };
      });

      if (onUpdateMembers) {
        onUpdateMembers(updatedMembers);
      }

      setJsonStatusMessage({
        type: "success",
        text: "已還原所有成員的預設負責項目。"
      });
      setTimeout(() => setJsonStatusMessage(null), 4000);
    }
  };

  // ===================== VISUAL EDITOR ACTIONS =====================
  const currentSelectedMember = members.find((m) => m.id === selectedMemberId);

  const handleAddDutyToSelectedMember = () => {
    if (!newDutyInput.trim() || !selectedMemberId) return;

    const updatedMembers = members.map((m) => {
      if (m.id === selectedMemberId) {
        const existingDuties = m.duties ? [...m.duties] : [];
        if (!existingDuties.includes(newDutyInput.trim())) {
          return { ...m, duties: [...existingDuties, newDutyInput.trim()] };
        }
      }
      return m;
    });

    if (onUpdateMembers) {
      onUpdateMembers(updatedMembers);
    }
    setNewDutyInput("");
  };

  const handleRemoveDutyFromSelectedMember = (dutyToRemove: string) => {
    if (!selectedMemberId) return;

    const updatedMembers = members.map((m) => {
      if (m.id === selectedMemberId) {
        return {
          ...m,
          duties: (m.duties || []).filter((d) => d !== dutyToRemove)
        };
      }
      return m;
    });

    if (onUpdateMembers) {
      onUpdateMembers(updatedMembers);
    }
  };

  // Quick edit a specific member from the table row
  const handleQuickEditMember = (memberId: string) => {
    setSelectedMemberId(memberId);
    setIsJsonModuleOpen(true);
    setJsonActiveTab("visual_editor");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* ----------------- TOP OVERVIEW & ACTIONS BANNER ----------------- */}
      <div className="bg-white border border-[#e5e5e0] rounded-sm p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#1b4372]/10 text-[#1b4372] rounded-sm">
              <ClipboardList className="w-4 h-4" />
            </span>
            <h3 className="text-lg font-bold text-[#1b4372] font-serif tracking-tight">
              Lab Member Duties & Responsibilities (人員負責項目管理)
            </h3>
          </div>
          <p className="text-xs text-[#666]">
            EBB 實驗室全體成員之安全衛生、藥品管理、魚缸維護、耗材採購與環境檢查之專責分工清單。
          </p>
        </div>

        {/* Quick Stats & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="px-3 py-1.5 bg-[#f8f8f5] border border-[#e5e5e0] rounded-sm text-center">
            <span className="block text-[9.5px] text-slate-500 font-mono uppercase">Assigned Members</span>
            <span className="text-sm sm:text-base font-bold text-[#1b4372] font-serif">{membersWithDuties.length} 位</span>
          </div>
          <div className="px-3 py-1.5 bg-[#f8f8f5] border border-[#e5e5e0] rounded-sm text-center">
            <span className="block text-[9.5px] text-slate-500 font-mono uppercase">Total Duties</span>
            <span className="text-sm sm:text-base font-bold text-[#8d734a] font-serif">{totalDutiesCount} 項</span>
          </div>

          {/* JSON Module Toggle Button */}
          <button
            type="button"
            onClick={() => setIsJsonModuleOpen(!isJsonModuleOpen)}
            className={`px-3 py-2 rounded-sm text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer ${
              isJsonModuleOpen 
                ? "bg-[#8d734a] text-white hover:bg-[#725c38]" 
                : "bg-[#1b4372] text-white hover:bg-[#102844]"
            }`}
            title="開啟 JSON 即時編輯與輸入模組"
          >
            <Code className="w-3.5 h-3.5" />
            <span>{isJsonModuleOpen ? "Close JSON Module" : "JSON Editor & Sync (同步與輸入)"}</span>
          </button>

          {onOpenStudio && (
            <button
              type="button"
              onClick={onOpenStudio}
              className="px-3 py-2 bg-[#f8f8f5] hover:bg-[#e5e5e0] text-slate-700 border border-[#e5e5e0] rounded-sm text-xs font-bold transition shadow-xs flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#8d734a]" />
              <span className="hidden sm:inline">Studio</span>
            </button>
          )}
        </div>
      </div>

      {/* ----------------- INTERACTIVE JSON MODULE & EDITOR ----------------- */}
      {isJsonModuleOpen && (
        <div className="bg-[#fdfdfc] border-2 border-[#1b4372]/30 rounded-sm p-5 shadow-sm space-y-4 animate-in slide-in-from-top-3 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#e5e5e0] pb-3 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-[#1b4372]" />
                <h4 className="text-sm font-bold text-[#1b4372] font-serif uppercase tracking-wider">
                  Duties JSON Sync & Input Module (人員負責項目 JSON 同時更新與輸入模塊)
                </h4>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                在此即時檢視、修改或貼上 JSON 批次匯入人員負責項目，修改後全站各頁面即刻同步更新。
              </p>
            </div>

            {/* Sub-tab Switcher for JSON Module */}
            <div className="flex items-center bg-[#f0ede6] rounded-sm p-0.5 text-xs font-bold shrink-0">
              <button
                type="button"
                onClick={() => setJsonActiveTab("json_sync")}
                className={`px-3 py-1.5 rounded-sm transition ${
                  jsonActiveTab === "json_sync"
                    ? "bg-[#1b4372] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                JSON Input & Live Sync
              </button>
              <button
                type="button"
                onClick={() => setJsonActiveTab("visual_editor")}
                className={`px-3 py-1.5 rounded-sm transition ${
                  jsonActiveTab === "visual_editor"
                    ? "bg-[#1b4372] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Visual Duty Editor
              </button>
            </div>
          </div>

          {/* Feedback message banner */}
          {jsonStatusMessage && (
            <div className={`p-3 rounded-sm text-xs font-medium flex items-center justify-between gap-2 ${
              jsonStatusMessage.type === "success" 
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                : jsonStatusMessage.type === "error"
                ? "bg-rose-50 text-rose-800 border border-rose-200"
                : "bg-blue-50 text-blue-800 border border-blue-200"
            }`}>
              <div className="flex items-center gap-2">
                {jsonStatusMessage.type === "success" && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />}
                {jsonStatusMessage.type === "error" && <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
                {jsonStatusMessage.type === "info" && <Sparkles className="w-4 h-4 shrink-0 text-blue-600" />}
                <span>{jsonStatusMessage.text}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setJsonStatusMessage(null)}
                className="text-xs hover:opacity-75 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* PANEL 1: JSON Input & Live Sync */}
          {jsonActiveTab === "json_sync" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-mono text-slate-500 text-[11px]">
                  Format: &#123; "成員姓名": ["職責項目1", "職責項目2"] &#125;
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrettifyJson}
                    className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-[#e5e5e0] text-slate-700 rounded-sm font-semibold transition"
                    title="重新排版美化"
                  >
                    Format
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-[#e5e5e0] text-slate-700 rounded-sm font-semibold transition flex items-center gap-1"
                    title="複製 JSON 內容"
                  >
                    {hasCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{hasCopied ? "Copied!" : "Copy"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadJson}
                    className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-[#e5e5e0] text-slate-700 rounded-sm font-semibold transition flex items-center gap-1"
                    title="下載 JSON 檔案"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLoadTemplate}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-sm font-semibold transition"
                    title="載入標準範本 JSON"
                  >
                    Load Template
                  </button>
                  <button
                    type="button"
                    onClick={handleResetToDefault}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 rounded-sm font-semibold transition flex items-center gap-1"
                    title="還原為原始代碼預設值"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* JSON Textarea with syntax appearance */}
              <div className="relative">
                <textarea
                  value={jsonInputValue}
                  onChange={(e) => setJsonInputValue(e.target.value)}
                  rows={14}
                  spellCheck={false}
                  placeholder='請在此貼上或輸入人員負責項目 JSON，例如：&#10;{&#10;  "林郁芳": [&#10;    "耗材使用登記管理",&#10;    "安全衛生防護檢查員"&#10;  ]&#10;}'
                  className="w-full font-mono text-xs sm:text-[12.5px] p-3.5 bg-[#1e2430] text-emerald-300 rounded-sm border border-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-400 focus:border-emerald-400 leading-relaxed shadow-inner"
                />
              </div>

              {/* Action bar for applying JSON */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="text-xs text-slate-500 font-sans">
                  提示：可直接於上方編輯區修改文字或由剪貼簿貼上外部 JSON，點擊右方按鈕即刻生效並儲存。
                </div>
                <button
                  type="button"
                  onClick={handleApplyJson}
                  className="px-5 py-2.5 bg-[#1b4372] hover:bg-[#102844] text-white font-bold text-xs sm:text-sm rounded-sm transition shadow-sm flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <CheckCheck className="w-4 h-4 text-emerald-400" />
                  <span>Parse & Apply JSON (套用並更新)</span>
                </button>
              </div>
            </div>
          )}

          {/* PANEL 2: Visual Member Duty Editor */}
          {jsonActiveTab === "visual_editor" && (
            <div className="space-y-4">
              {/* Member Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-[#f8f8f5] p-3.5 rounded-sm border border-[#e5e5e0]">
                <label className="text-xs font-bold text-[#1b4372] font-serif uppercase tracking-wider shrink-0">
                  Select Member:
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="flex-1 bg-white border border-[#e5e5e0] rounded-sm px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#1b4372]"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name_zh} {m.name_en ? `(${m.name_en})` : ""} - {m.role || "Member"} [{m.duties?.length || 0} 項職責]
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Member Duties Manager */}
              {currentSelectedMember ? (
                <div className="border border-[#e5e5e0] bg-white rounded-sm p-4 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-[#e5e5e0] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-[#1b4372] text-white text-xs font-serif font-bold flex items-center justify-center">
                        {currentSelectedMember.name_zh.slice(0, 1)}
                      </span>
                      <div>
                        <span className="font-bold text-sm text-slate-900 font-serif">
                          {currentSelectedMember.name_zh}
                        </span>
                        <span className="text-xs text-slate-500 font-mono ml-2">
                          {currentSelectedMember.name_en} · {currentSelectedMember.role}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#8d734a] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {currentSelectedMember.duties?.length || 0} Duties
                    </span>
                  </div>

                  {/* Duties list */}
                  <div className="space-y-2">
                    {currentSelectedMember.duties && currentSelectedMember.duties.length > 0 ? (
                      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                        {currentSelectedMember.duties.map((duty, idx) => (
                          <div 
                            key={idx}
                            className="flex items-center justify-between gap-2 p-2 bg-[#fafaf8] border border-[#e5e5e0] rounded-sm text-xs group hover:border-[#1b4372]/40"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="text-[#1b4372] font-bold">•</span>
                              <span className="text-slate-800 font-medium truncate">{duty}</span>
                              {getDutyHighlightBadge(duty)}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveDutyFromSelectedMember(duty)}
                              className="text-slate-400 hover:text-rose-600 p-1 transition"
                              title="刪除此項目"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 py-3 text-center italic">
                        該成員目前尚未分配任何負責項目，請於下方新增。
                      </p>
                    )}
                  </div>

                  {/* Add New Duty Input */}
                  <div className="flex gap-2 pt-2 border-t border-[#e5e5e0]">
                    <input
                      type="text"
                      value={newDutyInput}
                      onChange={(e) => setNewDutyInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddDutyToSelectedMember();
                        }
                      }}
                      placeholder="輸入新職責項目名稱 (例如：耗材盤點、能資源防護檢查員...)"
                      className="flex-1 px-3 py-2 bg-white border border-[#e5e5e0] rounded-sm text-xs font-sans focus:outline-none focus:border-[#1b4372]"
                    />
                    <button
                      type="button"
                      onClick={handleAddDutyToSelectedMember}
                      disabled={!newDutyInput.trim()}
                      className="px-4 py-2 bg-[#1b4372] hover:bg-[#102844] disabled:opacity-50 text-white rounded-sm text-xs font-bold transition flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>新增項目</span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* ----------------- SEARCH & CATEGORY FILTER ----------------- */}
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

      {/* ----------------- FORMAL ACADEMIC DUTIES TABLE ----------------- */}
      <div className="bg-white border border-[#e5e5e0] rounded-sm shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f8f8f5] border-b border-[#e5e5e0] text-[#1b4372]">
                <th className="py-3 px-6 text-xs font-bold font-serif uppercase tracking-wider w-52 sm:w-60 border-r border-[#e5e5e0]">
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
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
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

                          {/* Quick Edit Icon */}
                          <button
                            type="button"
                            onClick={() => handleQuickEditMember(member.id)}
                            className="text-slate-400 hover:text-[#1b4372] p-1 rounded transition opacity-0 group-hover:opacity-100"
                            title={`編輯 ${member.name_zh} 的負責項目`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {member.role && (
                          <div className="pt-0.5">
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
            <span>所有項目依實驗室管理規章定期由成員分工維護，可透過上方「JSON Editor & Sync」即時更新並匯出。</span>
          </div>
          <div className="text-slate-400 font-mono text-[11px]">
            EBB Laboratory Duty Assignment Registry
          </div>
        </div>
      </div>
    </div>
  );
}
