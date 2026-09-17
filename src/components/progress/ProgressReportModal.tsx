import React, { useState } from "react";
import { ProgressEntry, CombinedMember } from "../../types/progress";
import { CATEGORY_CONFIG, STATUS_CONFIG } from "../../data/initialProgressData";
import { 
  X, 
  Printer, 
  Copy, 
  Check, 
  Download, 
  Calendar, 
  Sparkles, 
  FileSpreadsheet, 
  FileText, 
  Filter 
} from "lucide-react";

interface ProgressReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: ProgressEntry[];
  members: CombinedMember[];
}

export default function ProgressReportModal({
  isOpen,
  onClose,
  entries,
  members
}: ProgressReportModalProps) {
  const [reportPeriod, setReportPeriod] = useState<"recent_month" | "recent_quarter" | "all">("recent_month");
  const [targetMemberFilter, setTargetMemberFilter] = useState<string>("ALL");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Filter entries based on period
  const now = new Date();
  const filteredEntries = entries.filter((e) => {
    if (targetMemberFilter !== "ALL" && e.member_id !== targetMemberFilter) {
      return false;
    }
    const entryDate = new Date(e.date);
    if (reportPeriod === "recent_month") {
      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(now.getDate() - 30);
      return entryDate >= oneMonthAgo;
    } else if (reportPeriod === "recent_quarter") {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setDate(now.getDate() - 90);
      return entryDate >= threeMonthsAgo;
    }
    return true;
  });

  // Group entries by member
  const memberReportMap = new Map<string, { member: CombinedMember; entries: ProgressEntry[] }>();
  members.forEach((m) => {
    if (targetMemberFilter === "ALL" || m.id === targetMemberFilter) {
      const mEntries = filteredEntries
        .filter((e) => e.member_id === m.id)
        .sort((a, b) => b.date.localeCompare(a.date));
      if (mEntries.length > 0 || targetMemberFilter === m.id) {
        memberReportMap.set(m.id, { member: m, entries: mEntries });
      }
    }
  });

  const totalEntriesCount = filteredEntries.length;
  const keyEventsCount = filteredEntries.filter((e) => e.is_key_event).length;

  // Generate plain text report for clipboard copy
  const generateTextReport = () => {
    let text = `========================================================\n`;
    text += `【EBB Lab 實驗室研究進度定期彙整報告】\n`;
    text += `產出時間: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}\n`;
    text += `統計區間: ${reportPeriod === "recent_month" ? "近一個月 (30天)" : reportPeriod === "recent_quarter" ? "近一季 (90天)" : "完整紀錄"}\n`;
    text += `累計進度筆數: ${totalEntriesCount} 筆 (包含關鍵里程碑 ${keyEventsCount} 項)\n`;
    text += `========================================================\n\n`;

    memberReportMap.forEach(({ member, entries: mEntries }) => {
      text += `◆ 成員: ${member.name_zh} (${member.name_en}) - ${member.role} ${member.organization ? `[${member.organization}]` : ""}\n`;
      text += `  研究專案: ${member.research_topic.title_zh}\n`;
      if (mEntries.length === 0) {
        text += `  (本區間內尚無新的進度更新)\n\n`;
      } else {
        mEntries.forEach((e, idx) => {
          text += `  [${e.date}] ${e.is_key_event ? "★ [里程碑] " : ""}${e.title} (${STATUS_CONFIG[e.status]?.label || e.status})\n`;
          if (e.description) {
            text += `    說明: ${e.description.replace(/\n/g, " ")}\n`;
          }
          if (e.tags && e.tags.length > 0) {
            text += `    標籤: ${e.tags.join(", ")}\n`;
          }
        });
        text += `\n`;
      }
    });

    return text;
  };

  const handleCopyText = () => {
    const text = generateTextReport();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ["日期", "成員姓名", "成員身份", "進度標題", "專案名稱", "類別", "關鍵事件", "狀態", "標籤", "內容描述"];
    const rows = filteredEntries.map((e) => {
      const m = members.find((mem) => mem.id === e.member_id);
      return [
        e.date,
        m ? `${m.name_zh} (${m.name_en})` : e.member_id,
        m?.role || "",
        `"${(e.title || "").replace(/"/g, '""')}"`,
        `"${(e.project_name || "").replace(/"/g, '""')}"`,
        CATEGORY_CONFIG[e.category]?.label || e.category,
        e.is_key_event ? "是" : "否",
        STATUS_CONFIG[e.status]?.label || e.status,
        `"${(e.tags || []).join(";")}"`,
        `"${(e.description || "").replace(/"/g, '""')}"`
      ];
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `EBB_Lab_Progress_Report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[#fdfdfc] border border-[#e5e5e0] rounded-sm max-w-3xl w-full shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#f8f8f5] border-b border-[#e5e5e0]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-[#1b4372] text-white flex items-center justify-center font-bold text-sm">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1a1a1a] font-serif">
                實驗室成員進度彙整報告 (Progress Report)
              </h3>
              <p className="text-[11px] text-[#8d734a] font-mono">
                自動彙整個人與團隊進程，方便組會進度檢視與考核
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-sm hover:bg-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls */}
        <div className="p-4 bg-white border-b border-[#e5e5e0] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700">期間範圍:</span>
              <select
                value={reportPeriod}
                onChange={(e) => setReportPeriod(e.target.value as any)}
                className="bg-[#f8f8f5] border border-[#e5e5e0] rounded-sm py-1 px-2.5 text-xs focus:outline-none focus:border-[#1b4372] font-medium"
              >
                <option value="recent_month">近一個月 (30天)</option>
                <option value="recent_quarter">近一季度 (90天)</option>
                <option value="all">全歷史紀錄</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700">成員範圍:</span>
              <select
                value={targetMemberFilter}
                onChange={(e) => setTargetMemberFilter(e.target.value)}
                className="bg-[#f8f8f5] border border-[#e5e5e0] rounded-sm py-1 px-2.5 text-xs focus:outline-none focus:border-[#1b4372] font-medium"
              >
                <option value="ALL">全體成員 (一般生+在職生)</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name_zh} ({m.name_en})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="flex items-center gap-1 px-2.5 py-1 bg-white border border-[#e5e5e0] hover:bg-slate-50 text-slate-700 rounded-sm font-medium transition"
              title="複製文字報告內容"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#1b4372]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "已複製！" : "複製純文字"}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1 px-2.5 py-1 bg-white border border-[#e5e5e0] hover:bg-slate-50 text-slate-700 rounded-sm font-medium transition"
              title="匯出為 CSV 試算表"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>匯出 CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#1b4372] hover:bg-[#102844] text-white rounded-sm font-bold transition shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>友善列印</span>
            </button>
          </div>
        </div>

        {/* Printable Report Preview */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs bg-[#fdfdfc]" id="printable-progress-report">
          {/* Header Banner */}
          <div className="border-b-2 border-[#1b4372] pb-4 flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold text-[#8d734a] uppercase tracking-widest font-mono">
                EBB Lab · Environmental Biotechnology & Biorefinery
              </span>
              <h2 className="text-xl font-bold text-[#1a1a1a] font-serif mt-0.5">
                實驗室成員研究進度摘要報告
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                中山大學環境工程研究所 · 統計期間:{" "}
                <span className="font-bold text-[#1b4372]">
                  {reportPeriod === "recent_month" ? "近 30 天" : reportPeriod === "recent_quarter" ? "近 90 天" : "全期"}
                </span>
              </p>
            </div>

            <div className="text-right font-mono text-[11px] text-slate-500">
              <p>製表日期: {now.toLocaleDateString()}</p>
              <p className="text-[#1b4372] font-bold mt-1">
                共 {totalEntriesCount} 筆進度 / {keyEventsCount} 項關鍵里程碑
              </p>
            </div>
          </div>

          {/* Members Sections */}
          {Array.from(memberReportMap.values()).map(({ member, entries: mEntries }) => (
            <div key={member.id} className="border border-[#e5e5e0] rounded-sm bg-white p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#e5e5e0] pb-2">
                <div>
                  <h4 className="text-sm font-bold text-[#1a1a1a] font-serif flex items-center gap-2">
                    <span>{member.name_zh}</span>
                    <span className="text-xs text-slate-500 font-sans font-normal">({member.name_en})</span>
                    <span className="text-[10px] bg-[#1b4372]/10 text-[#1b4372] px-2 py-0.5 rounded-xs font-mono font-bold">
                      {member.role}
                    </span>
                    {member.is_external && (
                      <span className="text-[10px] bg-blue-100 text-blue-900 border border-blue-300 px-1.5 py-0.2 rounded-xs font-mono font-bold">
                        {member.role_type || "在職生"}
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-[#8d734a] font-medium mt-0.5">
                    主研題目: {member.research_topic.title_zh}
                  </p>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {mEntries.length} 筆紀錄
                </span>
              </div>

              {mEntries.length === 0 ? (
                <p className="text-slate-400 italic py-2 text-xs">
                  此成員在選取區間內暫無新增進度紀錄。
                </p>
              ) : (
                <div className="divide-y divide-slate-100 space-y-2 pt-1">
                  {mEntries.map((entry) => (
                    <div key={entry.id} className="pt-2 text-xs space-y-1">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[#1b4372] font-bold">
                            {entry.date}
                          </span>
                          <span className="font-bold text-slate-900 font-serif">
                            {entry.title}
                          </span>
                          {entry.is_key_event && (
                            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 border border-amber-300 rounded-xs text-[10px] font-bold flex items-center gap-0.5">
                              <Sparkles className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                              里程碑
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.2 rounded-xs text-[10px] font-bold border ${STATUS_CONFIG[entry.status]?.badgeClass}`}>
                            {STATUS_CONFIG[entry.status]?.label}
                          </span>
                        </div>
                      </div>

                      {entry.description && (
                        <p className="text-slate-600 leading-relaxed pl-2 border-l-2 border-slate-200">
                          {entry.description}
                        </p>
                      )}

                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 text-[10.5px] font-mono text-slate-400 pl-2">
                          {entry.tags.map((t) => (
                            <span key={t}>#{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#f8f8f5] border-t border-[#e5e5e0] flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>EBB Lab Management System · 自動進度報表模組</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-[#e5e5e0] hover:bg-slate-50 text-slate-700 rounded-sm font-medium transition"
          >
            關閉視窗
          </button>
        </div>
      </div>
    </div>
  );
}
