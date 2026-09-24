import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Calendar as CalendarIcon, 
  CalendarRange, 
  Columns, 
  List, 
  Globe, 
  Plus, 
  FileText, 
  RefreshCw, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Tag, 
  FolderGit2, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  ChevronDown,
  RotateCcw,
  Trash2
} from "lucide-react";
import { 
  CalendarEntry, 
  LAB_PROJECT_OPTIONS, 
  DEFAULT_CALENDAR_TAGS,
  TAG_COLORS 
} from "../../types/calendarLog";
import { initialCalendarEntries } from "../../data/initialCalendarData";
import MonthCalendarView from "./MonthCalendarView";
import WeekCalendarView from "./WeekCalendarView";
import EntryFormModal from "./EntryFormModal";
import WeeklyReportModal from "./WeeklyReportModal";
import GoogleSyncModal from "./GoogleSyncModal";
import { EBB_PUBLIC_CALENDAR_ID } from "../../services/googleCalendarService";

const STORAGE_KEY = "ebblab_calendar_entries";

export default function CalendarLogModule() {
  // 1. Calendar entries state with localStorage persistence
  const [entries, setEntries] = useState<CalendarEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // If stored entries only contain the old mock IDs "cal-00", reset to empty
          const hasOldMocks = parsed.length > 0 && parsed.every((p: any) => typeof p.id === "string" && p.id.startsWith("cal-00"));
          if (hasOldMocks) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
            return [];
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error("Failed to load calendar entries", e);
    }
    return initialCalendarEntries;
  });

  // Save entries to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
      console.error("Failed to save calendar entries", e);
    }
  }, [entries]);

  // Current view date
  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 8, 17)); // Default to Sept 17, 2026

  // Active view tab: month | week | list | public
  const [activeTab, setActiveTab] = useState<"month" | "week" | "list" | "public">("month");

  // Filter states
  const [selectedProject, setSelectedProject] = useState<string>("ALL");
  const [selectedTag, setSelectedTag] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals state
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CalendarEntry | null>(null);
  const [defaultEntryDate, setDefaultEntryDate] = useState<string | undefined>(undefined);

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isGoogleSyncModalOpen, setIsGoogleSyncModalOpen] = useState(false);

  // Quick Input State
  const [quickInput, setQuickInput] = useState("");

  // Open entry form handler
  const handleOpenEntryForm = useCallback((entry?: CalendarEntry, dateStr?: string) => {
    setEditingEntry(entry || null);
    setDefaultEntryDate(dateStr || undefined);
    setIsEntryModalOpen(true);
  }, []);

  // Save entry handler (add or update)
  const handleSaveEntry = useCallback((entry: CalendarEntry) => {
    setEntries((prev) => {
      const index = prev.findIndex((e) => e.id === entry.id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = entry;
        return updated;
      } else {
        return [entry, ...prev];
      }
    });
  }, []);

  // Delete entry handler
  const handleDeleteEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // Toggle status quick action (done <-> in_progress)
  const handleToggleStatus = useCallback((id: string) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id === id) {
          const nextStatus = e.status === "done" ? "in_progress" : "done";
          return {
            ...e,
            status: nextStatus,
            google_sync_status: e.google_event_id ? "pending" : e.google_sync_status,
            updated_at: new Date().toISOString()
          };
        }
        return e;
      })
    );
  }, []);

  // Quick input parser (e.g., "9/18 完成 PEF 聚合測試 #實驗 @PEF")
  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const text = quickInput.trim();
    if (!text) return;

    let targetDate = new Date().toISOString().split("T")[0];
    let title = text;
    let tags: string[] = ["實驗"];
    let projectName = "PEF";

    // Detect project @PEF or @5-HMF
    const projMatch = text.match(/@([\w\-一-龥]+)/);
    if (projMatch) {
      const found = LAB_PROJECT_OPTIONS.find((p) => p.shortName.toLowerCase().includes(projMatch[1].toLowerCase()));
      if (found) projectName = found.shortName;
      title = title.replace(projMatch[0], "").trim();
    }

    // Detect tags #tag
    const tagMatches = text.match(/#([^\s#]+)/g);
    if (tagMatches) {
      tags = tagMatches.map((t) => t.replace("#", "").trim());
      tagMatches.forEach((tm) => {
        title = title.replace(tm, "").trim();
      });
    }

    // Detect date like 9/18 or 2026-09-18
    const dateMatch = text.match(/(\d{4}[-/])?(\d{1,2})[-/](\d{1,2})/);
    if (dateMatch) {
      const y = dateMatch[1] ? dateMatch[1].replace(/[-/]/, "") : currentDate.getFullYear();
      const m = String(dateMatch[2]).padStart(2, "0");
      const d = String(dateMatch[3]).padStart(2, "0");
      targetDate = `${y}-${m}-${d}`;
      title = title.replace(dateMatch[0], "").trim();
    }

    const newEntry: CalendarEntry = {
      id: `entry-${Date.now()}`,
      date: targetDate,
      title: title || "新建工作事項",
      tags: tags.length ? tags : ["實驗"],
      status: text.includes("完成") || text.includes("已") ? "done" : "in_progress",
      priority: "normal",
      project_name: projectName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    handleSaveEntry(newEntry);
    setQuickInput("");
  };

  // Export JSON Backup
  const handleExportBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(entries, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ebblab_calendar_backup_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          if (confirm(`確定要匯入 ${parsed.length} 筆備份事項嗎？將與現有資料合併。`)) {
            const existingIds = new Set(entries.map((it) => it.id));
            const merged = [...entries];
            parsed.forEach((it) => {
              if (!existingIds.has(it.id)) {
                merged.push(it);
              }
            });
            setEntries(merged);
            alert("✓ 備份事項匯入成功！");
          }
        }
      } catch (err: any) {
        alert("匯入失敗：檔案格式不正確。");
      }
    };
    reader.readAsText(file);
  };

  // Filtered entries for List View
  const listFilteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (selectedProject !== "ALL" && e.project_name !== selectedProject) return false;
      if (selectedTag !== "ALL" && !e.tags?.includes(selectedTag)) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = e.title.toLowerCase().includes(q);
        const matchDesc = e.description?.toLowerCase().includes(q);
        const matchProj = e.project_name?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchProj) return false;
      }
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, selectedProject, selectedTag, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Header Actions */}
      <div className="bg-white p-5 md:p-6 rounded-sm border border-[#e5e5e0] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1b4372]/10 text-[#1b4372] border border-[#1b4372]/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1b4372]"></span>
              WORK LOG & WEEKLY REPORT
            </span>
            <span className="text-xs text-slate-400 font-serif">· 成果管理與週報</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold font-serif text-[#1a1a1a] tracking-tight">
            月曆事項紀錄與週報系統
          </h1>
          <p className="text-xs text-slate-500 font-sans max-w-2xl leading-relaxed">
            記錄每日研究進度與實驗成果、與 Google 日曆雙向同步，並可一鍵自動生成符合 EBB Lab 規範的週報簡報 (PowerPoint .pptx)。
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleOpenEntryForm()}
            className="px-4 py-2.5 bg-[#1b4372] hover:bg-[#122e4f] text-white rounded-sm text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            <span>新增事項紀錄</span>
          </button>

          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="px-4 py-2.5 bg-[#8d734a] hover:bg-[#735c38] text-white rounded-sm text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-amber-200" />
            <span>生成本週週報 (PPTX)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsGoogleSyncModalOpen(true)}
            className="px-3.5 py-2.5 bg-[#f8f8f5] hover:bg-[#eae6dc] text-slate-700 border border-[#e5e5e0] rounded-sm text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-blue-600" />
            <span>Google 日曆同步</span>
          </button>
        </div>
      </div>

      {/* Quick Add Bar */}
      <div className="bg-[#f8f8f5] p-3 rounded-sm border border-[#e5e5e0]">
        <form onSubmit={handleQuickAdd} className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <Sparkles className="w-4 h-4 text-[#8d734a] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder="⚡ 快速新增事項：輸入如「9/18 完成 PEF 固相聚合高分子黏度檢測 #實驗 @PEF」後按 Enter 即可快速登錄..."
              className="w-full bg-white border border-[#e5e5e0] rounded-sm pl-9 pr-3 py-2 text-xs font-medium focus:ring-1 focus:ring-[#1b4372]"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-[#e5e5e0] rounded-sm text-xs font-bold transition cursor-pointer shadow-2xs shrink-0"
          >
            快速登錄
          </button>
        </form>
      </div>

      {/* Views Tabs & Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-sm border border-[#e5e5e0] shadow-xs">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-[#f8f8f5] p-1 rounded-sm border border-[#e5e5e0] shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("month")}
            className={`px-3 py-1.5 rounded-sm text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "month"
                ? "bg-[#1b4372] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>月曆檢視</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("week")}
            className={`px-3 py-1.5 rounded-sm text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "week"
                ? "bg-[#1b4372] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>週檢視</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("list")}
            className={`px-3 py-1.5 rounded-sm text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "list"
                ? "bg-[#1b4372] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>清單檢視 ({entries.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("public")}
            className={`px-3 py-1.5 rounded-sm text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "public"
                ? "bg-[#1b4372] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>實驗室公開日曆</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Project Filter */}
          <div className="flex items-center gap-1 text-xs">
            <FolderGit2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="bg-[#f8f8f5] border border-[#e5e5e0] rounded-sm px-2.5 py-1.5 text-xs font-medium"
            >
              <option value="ALL">全部專案</option>
              {LAB_PROJECT_OPTIONS.map((p) => (
                <option key={p.id} value={p.shortName}>
                  {p.shortName}
                </option>
              ))}
            </select>
          </div>

          {/* Tag Filter */}
          <div className="flex items-center gap-1 text-xs">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="bg-[#f8f8f5] border border-[#e5e5e0] rounded-sm px-2.5 py-1.5 text-xs font-medium"
            >
              <option value="ALL">全部標籤</option>
              {DEFAULT_CALENDAR_TAGS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Backup Action Dropdown */}
          <div className="flex items-center gap-1 pl-1 border-l border-[#e5e5e0]">
            <button
              type="button"
              onClick={handleExportBackup}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-[#f8f8f5] rounded-sm transition cursor-pointer"
              title="匯出資料庫備份 (JSON)"
            >
              <Download className="w-4 h-4" />
            </button>
            <label
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-[#f8f8f5] rounded-sm transition cursor-pointer"
              title="匯入資料庫備份 (JSON)"
            >
              <Upload className="w-4 h-4" />
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
            {entries.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("確定要清空所有事項紀錄嗎？清空後將無任何工作紀錄。建議可先匯出備份。")) {
                    setEntries([]);
                    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
                  }
                }}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-sm transition cursor-pointer"
                title="清空所有事項紀錄"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main View Display */}
      {activeTab === "month" && (
        <MonthCalendarView
          entries={entries}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onOpenEntryForm={handleOpenEntryForm}
          onToggleStatus={handleToggleStatus}
          selectedProject={selectedProject}
          selectedTag={selectedTag}
        />
      )}

      {activeTab === "week" && (
        <WeekCalendarView
          entries={entries}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onOpenEntryForm={handleOpenEntryForm}
          onToggleStatus={handleToggleStatus}
          selectedProject={selectedProject}
          selectedTag={selectedTag}
        />
      )}

      {activeTab === "list" && (
        <div className="bg-white rounded-sm border border-[#e5e5e0] shadow-xs overflow-hidden">
          {/* Search Box in List view */}
          <div className="p-4 border-b border-[#e5e5e0] bg-[#f8f8f5] flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋工作項目標題、內容描述或專案..."
              className="flex-1 bg-white border border-[#e5e5e0] rounded-sm px-3 py-1.5 text-xs font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-slate-400 hover:text-slate-700 text-xs"
              >
                清除
              </button>
            )}
          </div>

          {/* List Items */}
          <div className="divide-y divide-[#e5e5e0]">
            {listFilteredEntries.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs space-y-2">
                <p className="font-serif text-sm text-slate-600">目前尚無任何事項紀錄</p>
                <p>點擊上方「新增事項紀錄」或使用快速輸入列開始登錄每日進度與實驗成果。</p>
              </div>
            ) : (
              listFilteredEntries.map((entry) => {
                const isDone = entry.status === "done";
                const primaryTag = entry.tags?.[0] || "實驗";
                const tagStyle = TAG_COLORS[primaryTag] || { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" };

                return (
                  <div
                    key={entry.id}
                    onClick={() => handleOpenEntryForm(entry)}
                    className="p-4 hover:bg-[#f8f8f5] transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStatus(entry.id);
                          }}
                          className="text-slate-400 hover:text-[#1b4372]"
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-600" />
                          )}
                        </button>
                        <span className="font-mono text-xs font-bold text-slate-500">
                          {entry.date} {entry.end_date ? `~ ${entry.end_date}` : ""}
                        </span>
                        {entry.project_name && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded font-bold bg-[#1b4372]/10 text-[#1b4372]">
                            {entry.project_name}
                          </span>
                        )}
                        {(entry.tags || []).map((t) => (
                          <span key={t} className="text-[10px] px-1.5 py-0.2 rounded border bg-slate-50 text-slate-600 border-slate-200">
                            #{t}
                          </span>
                        ))}
                      </div>

                      <h4 className={`text-sm font-bold ${isDone ? "line-through text-slate-500" : "text-slate-800"}`}>
                        {entry.title}
                      </h4>

                      {entry.description && (
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {entry.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        isDone ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}>
                        {isDone ? "已完成" : "進行中"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === "public" && (
        <div className="bg-white rounded-sm border border-[#e5e5e0] shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-base font-serif text-[#1a1a1a]">
                實驗室公開行事曆 (EBB Lab Public Calendar)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsGoogleSyncModalOpen(true)}
              className="px-3.5 py-1.5 bg-[#1b4372] hover:bg-[#122e4f] text-white rounded-sm text-xs font-bold transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>設定同步</span>
            </button>
          </div>

          <div className="border border-[#e5e5e0] rounded-sm overflow-hidden bg-slate-50">
            <iframe
              src={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(EBB_PUBLIC_CALENDAR_ID)}&ctz=Asia%2FTaipei`}
              style={{ border: 0 }}
              width="100%"
              height="620"
              frameBorder="0"
              scrolling="no"
              title="EBB Lab Public Google Calendar"
            />
          </div>
        </div>
      )}

      {/* Modals */}
      <EntryFormModal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        onSave={handleSaveEntry}
        onDelete={handleDeleteEntry}
        initialEntry={editingEntry}
        defaultDate={defaultEntryDate}
      />

      <WeeklyReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        entries={entries}
      />

      <GoogleSyncModal
        isOpen={isGoogleSyncModalOpen}
        onClose={() => setIsGoogleSyncModalOpen(false)}
        entries={entries}
        onUpdateEntries={setEntries}
      />
    </div>
  );
}
