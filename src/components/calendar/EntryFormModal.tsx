import React, { useState, useEffect } from "react";
import { 
  X, 
  Calendar, 
  Tag, 
  FolderGit2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Trash2, 
  Plus, 
  Sparkles,
  Layers,
  Flag
} from "lucide-react";
import { 
  CalendarEntry, 
  CalendarEntryStatus, 
  CalendarEntryPriority, 
  LAB_PROJECT_OPTIONS, 
  DEFAULT_CALENDAR_TAGS,
  TAG_COLORS 
} from "../../types/calendarLog";

interface EntryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: CalendarEntry) => void;
  onDelete?: (id: string) => void;
  initialEntry?: CalendarEntry | null;
  defaultDate?: string;
}

export default function EntryFormModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialEntry,
  defaultDate
}: EntryFormModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split("T")[0]);
  const [isRange, setIsRange] = useState(false);
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<CalendarEntryStatus>("done");
  const [priority, setPriority] = useState<CalendarEntryPriority>("normal");
  const [projectName, setProjectName] = useState("PEF");
  const [selectedTags, setSelectedTags] = useState<string[]>(["實驗"]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [availableTags, setAvailableTags] = useState<string[]>(DEFAULT_CALENDAR_TAGS);

  useEffect(() => {
    if (initialEntry) {
      setTitle(initialEntry.title);
      setDescription(initialEntry.description || "");
      setDate(initialEntry.date);
      if (initialEntry.end_date && initialEntry.end_date !== initialEntry.date) {
        setIsRange(true);
        setEndDate(initialEntry.end_date);
      } else {
        setIsRange(false);
        setEndDate("");
      }
      setStatus(initialEntry.status);
      setPriority(initialEntry.priority || "normal");
      setProjectName(initialEntry.project_name || "PEF");
      setSelectedTags(initialEntry.tags && initialEntry.tags.length ? initialEntry.tags : ["實驗"]);
    } else {
      setTitle("");
      setDescription("");
      setDate(defaultDate || new Date().toISOString().split("T")[0]);
      setIsRange(false);
      setEndDate("");
      setStatus("done");
      setPriority("normal");
      setProjectName("PEF");
      setSelectedTags(["實驗"]);
    }
  }, [initialEntry, defaultDate, isOpen]);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => 
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = () => {
    const trimmed = customTagInput.trim();
    if (trimmed && !availableTags.includes(trimmed)) {
      setAvailableTags((prev) => [...prev, trimmed]);
      setSelectedTags((prev) => [...prev, trimmed]);
      setCustomTagInput("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("請填寫工作事項標題！");
      return;
    }

    const nowStr = new Date().toISOString();
    const entry: CalendarEntry = {
      id: initialEntry ? initialEntry.id : `entry-${Date.now()}`,
      date,
      end_date: isRange && endDate ? endDate : undefined,
      title: title.trim(),
      description: description.trim() || undefined,
      tags: selectedTags.length ? selectedTags : ["其他"],
      status,
      priority,
      project_name: projectName,
      google_event_id: initialEntry?.google_event_id,
      google_sync_status: initialEntry?.google_event_id ? "pending" : "local_only",
      created_at: initialEntry?.created_at || nowStr,
      updated_at: nowStr
    };

    onSave(entry);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white rounded-lg shadow-2xl border border-[#e5e5e0] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#1b4372] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-sm bg-white/10 text-amber-200">
              <Calendar className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-sm font-serif">
                {initialEntry ? "編輯月曆事項紀錄" : "新增月曆事項紀錄"}
              </h3>
              <p className="text-[11px] text-blue-200/80 font-mono">
                {date} {isRange && endDate ? `至 ${endDate}` : ""} · EBB Lab
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-sm transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Date & Range Toggle */}
          <div className="space-y-2 bg-[#f8f8f5] p-3 rounded-sm border border-[#e5e5e0]">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#1b4372]" />
                <span>事項日期 (Date) *</span>
              </label>
              <label className="inline-flex items-center gap-1.5 text-slate-600 text-[11px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRange}
                  onChange={(e) => setIsRange(e.target.checked)}
                  className="rounded-xs text-[#1b4372]"
                />
                <span>跨日/區間事件</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full bg-white border border-[#e5e5e0] rounded-sm px-3 py-2 text-xs font-mono focus:ring-1 focus:ring-[#1b4372]"
                />
              </div>
              {isRange && (
                <div>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={date}
                    placeholder="結束日期"
                    className="w-full bg-white border border-[#e5e5e0] rounded-sm px-3 py-2 text-xs font-mono focus:ring-1 focus:ring-[#1b4372]"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              事項標題 (Title) *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：PEF 聚合製程熱穩定性測試、5-HMF 溶劑回收率評估..."
              required
              className="w-full bg-white border border-[#e5e5e0] rounded-sm px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-[#1b4372] focus:border-transparent"
            />
          </div>

          {/* Status & Priority & Project */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>執行狀態 (Status)</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CalendarEntryStatus)}
                className="w-full bg-white border border-[#e5e5e0] rounded-sm px-2.5 py-2 text-xs font-medium"
              >
                <option value="done">✓ 已完成 (Done)</option>
                <option value="in_progress">⏳ 進行中 (In Progress)</option>
                <option value="cancelled">✕ 已取消 (Cancelled)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Flag className="w-3.5 h-3.5 text-amber-600" />
                <span>優先權 (Priority)</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as CalendarEntryPriority)}
                className="w-full bg-white border border-[#e5e5e0] rounded-sm px-2.5 py-2 text-xs font-medium"
              >
                <option value="high">🔴 高優先 (High)</option>
                <option value="normal">🟡 一般 (Normal)</option>
                <option value="low">🟢 低 (Low)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                <FolderGit2 className="w-3.5 h-3.5 text-[#1b4372]" />
                <span>所屬專案 (Project)</span>
              </label>
              <select
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full bg-white border border-[#e5e5e0] rounded-sm px-2.5 py-2 text-xs font-medium"
              >
                {LAB_PROJECT_OPTIONS.map((proj) => (
                  <option key={proj.id} value={proj.shortName}>
                    {proj.shortName} ({proj.name.slice(0, 12)}...)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category Tags */}
          <div>
            <label className="block font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#8d734a]" />
              <span>分類標籤 (Tags) — 可複選</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {availableTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                const colorDef = TAG_COLORS[tag] || { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", dot: "bg-slate-400" };
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-sm text-[11px] font-medium transition cursor-pointer border ${
                      isSelected
                        ? `${colorDef.bg} ${colorDef.text} ${colorDef.border} font-bold ring-1 ring-offset-1 ring-[#1b4372]/30`
                        : "bg-white text-slate-600 border-[#e5e5e0] hover:bg-slate-50"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${colorDef.dot}`} />
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Tag Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomTag();
                  }
                }}
                placeholder="+ 自訂新標籤 (例如：口試、專利申請)..."
                className="flex-1 bg-white border border-[#e5e5e0] rounded-sm px-2.5 py-1.5 text-xs"
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                className="px-3 py-1.5 bg-[#f8f8f5] hover:bg-[#eae6dc] text-slate-700 border border-[#e5e5e0] rounded-sm text-xs font-bold transition cursor-pointer"
              >
                新增標籤
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              內容描述與工作成果產出 (Description / Key Output)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="詳細記錄此項工作之實驗條件、分析數值、產出成果、遭遇困難或後續行動..."
              className="w-full bg-white border border-[#e5e5e0] rounded-sm p-2.5 text-xs font-sans leading-relaxed focus:ring-1 focus:ring-[#1b4372]"
            />
          </div>

          {/* Google Sync Info Notice */}
          {initialEntry?.google_event_id && (
            <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-sm text-[11px] text-blue-900 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>此項目已與 Google 日曆連結 (ID: {initialEntry.google_event_id.slice(0, 14)}...)</span>
              </span>
              <span className="font-mono text-[10px] text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                雙向同步中
              </span>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-[#e5e5e0]">
            {initialEntry && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (confirm("確定要刪除這筆事項紀錄嗎？")) {
                    onDelete(initialEntry.id);
                    onClose();
                  }
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-sm text-xs font-bold transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>刪除此項</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
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
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>儲存事項紀錄</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
