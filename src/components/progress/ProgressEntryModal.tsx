import React, { useState, useEffect } from "react";
import { 
  ProgressEntry, 
  CombinedMember, 
  ProgressCategory, 
  ProgressStatus, 
  ProgressAttachment 
} from "../../types/progress";
import { DEFAULT_TAGS, CATEGORY_CONFIG, STATUS_CONFIG } from "../../data/initialProgressData";
import { 
  X, 
  Plus, 
  Trash2, 
  Calendar, 
  Tag, 
  Paperclip, 
  Sparkles, 
  Check, 
  Flag, 
  FolderGit2, 
  Layers 
} from "lucide-react";

interface ProgressEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: ProgressEntry) => void;
  initialEntry?: ProgressEntry | null;
  targetMemberId?: string;
  members: CombinedMember[];
  availableProjects: string[];
}

export default function ProgressEntryModal({
  isOpen,
  onClose,
  onSave,
  initialEntry,
  targetMemberId,
  members,
  availableProjects
}: ProgressEntryModalProps) {
  const [memberId, setMemberId] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [projectName, setProjectName] = useState<string>("");
  const [category, setCategory] = useState<ProgressCategory>("update");
  const [isKeyEvent, setIsKeyEvent] = useState<boolean>(false);
  const [status, setStatus] = useState<ProgressStatus>("in_progress");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTags, setCustomTags] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("lab_progress_custom_tags");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [customTagInput, setCustomTagInput] = useState<string>("");
  const [attachments, setAttachments] = useState<ProgressAttachment[]>([]);
  const [newAttachName, setNewAttachName] = useState<string>("");
  const [newAttachUrl, setNewAttachUrl] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      if (initialEntry) {
        setMemberId(initialEntry.member_id);
        setDate(initialEntry.date);
        setTitle(initialEntry.title);
        setDescription(initialEntry.description);
        setProjectName(initialEntry.project_name || "");
        setCategory(initialEntry.category);
        setIsKeyEvent(initialEntry.is_key_event);
        setStatus(initialEntry.status || "in_progress");
        setSelectedTags(initialEntry.tags || []);
        setAttachments(initialEntry.attachments || []);

        // Include any non-default tags from entry into customTags
        if (initialEntry.tags && initialEntry.tags.length > 0) {
          const extra = initialEntry.tags.filter((t) => !DEFAULT_TAGS.includes(t as any));
          if (extra.length > 0) {
            setCustomTags((prev) => {
              const merged = Array.from(new Set([...prev, ...extra]));
              try {
                localStorage.setItem("lab_progress_custom_tags", JSON.stringify(merged));
              } catch {}
              return merged;
            });
          }
        }
      } else {
        const defaultMember = targetMemberId || (members.length > 0 ? members[0].id : "");
        setMemberId(defaultMember);
        const today = new Date().toISOString().split("T")[0];
        setDate(today);
        setTitle("");
        setDescription("");
        
        // Auto pick default project from selected member's research topic if available
        const currentMember = members.find((m) => m.id === defaultMember);
        setProjectName(currentMember?.research_topic?.title_zh || "");
        
        setCategory("update");
        setIsKeyEvent(false);
        setStatus("in_progress");
        setSelectedTags(["實驗"]);
        setAttachments([]);
      }
      setCustomTagInput("");
      setNewAttachName("");
      setNewAttachUrl("");
    }
  }, [isOpen, initialEntry, targetMemberId, members]);

  // When member changes in add mode, auto populate default project
  const handleMemberChange = (newId: string) => {
    setMemberId(newId);
    if (!initialEntry) {
      const selected = members.find((m) => m.id === newId);
      if (selected && selected.research_topic?.title_zh) {
        setProjectName(selected.research_topic.title_zh);
      }
    }
  };

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = () => {
    const trimmed = customTagInput.trim().replace(/^#/, "");
    if (!trimmed) return;

    // Add to custom tags pool if not existing in default tags and custom tags
    if (!DEFAULT_TAGS.includes(trimmed as any) && !customTags.includes(trimmed)) {
      const nextCustom = [...customTags, trimmed];
      setCustomTags(nextCustom);
      try {
        localStorage.setItem("lab_progress_custom_tags", JSON.stringify(nextCustom));
      } catch {}
    }

    // Always select this tag
    if (!selectedTags.includes(trimmed)) {
      setSelectedTags((prev) => [...prev, trimmed]);
    }
    setCustomTagInput("");
  };

  const handleDeleteCustomTag = (tagToDelete: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextCustom = customTags.filter((t) => t !== tagToDelete);
    setCustomTags(nextCustom);
    setSelectedTags((prev) => prev.filter((t) => t !== tagToDelete));
    try {
      localStorage.setItem("lab_progress_custom_tags", JSON.stringify(nextCustom));
    } catch {}
  };

  const handleAddAttachment = () => {
    const name = newAttachName.trim();
    const url = newAttachUrl.trim();
    if (!name || !url) {
      alert("請輸入附件名稱與連結網址");
      return;
    }
    setAttachments([...attachments, { name, url }]);
    setNewAttachName("");
    setNewAttachUrl("");
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(attachments.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("請輸入進度標題！");
      return;
    }
    if (!memberId) {
      alert("請選擇所屬成員！");
      return;
    }
    if (!date) {
      alert("請填寫紀錄日期！");
      return;
    }

    const currentMember = members.find((m) => m.id === memberId);
    const entry: ProgressEntry = {
      id: initialEntry ? initialEntry.id : `prog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      member_id: memberId,
      date,
      title: title.trim(),
      description: description.trim(),
      project_name: projectName.trim() || undefined,
      category,
      is_key_event: isKeyEvent,
      status,
      tags: selectedTags,
      attachments,
      created_by: currentMember ? currentMember.name_zh : "User",
      created_at: initialEntry?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    onSave(entry);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-[#fdfdfc] border border-[#e5e5e0] rounded-sm max-w-2xl w-full shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#f8f8f5] border-b border-[#e5e5e0]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-[#1b4372] text-white flex items-center justify-center font-bold text-sm">
              <Flag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1a1a1a] font-serif">
                {initialEntry ? "編輯進度紀錄" : "新增成員進度更新"}
              </h3>
              <p className="text-[11px] text-[#8d734a] font-mono">
                {initialEntry ? `ID: ${initialEntry.id}` : "記錄研究進程、實驗數據、投稿或口試里程碑"}
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Row 1: Member & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                所屬成員 <span className="text-rose-500">*</span>
              </label>
              <select
                value={memberId}
                onChange={(e) => handleMemberChange(e.target.value)}
                className="w-full bg-white border border-[#e5e5e0] rounded-sm py-2 px-3 text-xs focus:outline-none focus:border-[#1b4372] font-medium"
                required
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name_zh} ({m.name_en}) — {m.role} {m.is_external ? `[${m.role_type || "在職生"}]` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                進度日期 <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-white border border-[#e5e5e0] rounded-sm py-2 px-3 text-xs focus:outline-none focus:border-[#1b4372] font-mono"
                  required
                />
              </div>
            </div>
          </div>

          {/* Row 2: Title */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              進度標題 / 摘要 <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如: 完成水性液態地膜配方黏度測試、口試審查報告初稿送出"
              className="w-full bg-white border border-[#e5e5e0] rounded-sm py-2 px-3 text-xs focus:outline-none focus:border-[#1b4372] font-medium"
              required
            />
          </div>

          {/* Row 3: Associated Project & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                關聯專案 / 研究主題
              </label>
              <input
                type="text"
                list="available-projects-list"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="選取或輸入專案名稱..."
                className="w-full bg-white border border-[#e5e5e0] rounded-sm py-2 px-3 text-xs focus:outline-none focus:border-[#1b4372]"
              />
              <datalist id="available-projects-list">
                {availableProjects.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                進度狀態
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProgressStatus)}
                className="w-full bg-white border border-[#e5e5e0] rounded-sm py-2 px-3 text-xs focus:outline-none focus:border-[#1b4372]"
              >
                {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
                  <option key={k} value={k}>
                    {cfg.label} ({cfg.label_en})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 4: Category & Key Event Checkbox */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#f8f8f5] p-3 rounded-sm border border-[#e5e5e0]">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                事件類別
              </label>
              <select
                value={category}
                onChange={(e) => {
                  const newCat = e.target.value as ProgressCategory;
                  setCategory(newCat);
                  if (newCat === "milestone") {
                    setIsKeyEvent(true);
                  }
                }}
                className="w-full bg-white border border-[#e5e5e0] rounded-sm py-1.5 px-3 text-xs focus:outline-none focus:border-[#1b4372]"
              >
                {Object.entries(CATEGORY_CONFIG).map(([k, cfg]) => (
                  <option key={k} value={k}>
                    {cfg.label} ({cfg.label_en})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-5">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-800 font-bold">
                <input
                  type="checkbox"
                  checked={isKeyEvent}
                  onChange={(e) => setIsKeyEvent(e.target.checked)}
                  className="w-4 h-4 text-[#1b4372] rounded border-gray-300 focus:ring-[#1b4372]"
                />
                <span className="flex items-center gap-1.5">
                  <Sparkles className={`w-3.5 h-3.5 ${isKeyEvent ? "text-amber-500 fill-amber-400" : "text-slate-400"}`} />
                  標記為關鍵時間節點 (Key Event)
                </span>
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              詳細內容描述 (Description)
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="記錄具體實驗條件、成果數值、遭遇困難、下次預計改善方向或待辦事項..."
              className="w-full bg-white border border-[#e5e5e0] rounded-sm py-2 px-3 text-xs focus:outline-none focus:border-[#1b4372] leading-relaxed"
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-[#1b4372]" />
                標籤 (Tags)
              </label>
              <span className="text-[10px] text-slate-400 font-mono">點選切換或下方自訂</span>
            </div>

            {/* Currently Active / Selected Tags Bar */}
            {selectedTags.length > 0 && (
              <div className="p-2.5 bg-blue-50/70 border border-[#1b4372]/20 rounded-sm">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#1b4372] mb-1.5">
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    已選取的標籤 ({selectedTags.length})：
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedTags([])}
                    className="text-[10px] text-slate-400 hover:text-rose-600 font-normal transition cursor-pointer"
                  >
                    全部清除
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[11px] font-mono bg-[#1b4372] text-white shadow-2xs"
                    >
                      <span>✓ {tag}</span>
                      <button
                        type="button"
                        onClick={() => handleToggleTag(tag)}
                        className="hover:bg-white/25 rounded-full p-0.5 transition cursor-pointer"
                        title="取消勾選此標籤"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Default Preset Tags */}
            <div>
              <div className="text-[10.5px] font-bold text-slate-500 mb-1">常用推薦標籤：</div>
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className={`px-2 py-0.5 rounded-xs text-[11px] font-mono border transition flex items-center gap-1 cursor-pointer ${
                        isSelected
                          ? "bg-[#1b4372] text-white border-[#1b4372] shadow-2xs font-bold"
                          : "bg-white text-slate-600 border-[#e5e5e0] hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      <span>{isSelected ? "✓" : "+"}</span>
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* User-Added Custom Tags Pool */}
            {customTags.length > 0 && (
              <div>
                <div className="text-[10.5px] font-bold text-[#8d734a] mb-1">我的自訂標籤庫：</div>
                <div className="flex flex-wrap gap-1.5">
                  {customTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <div
                        key={tag}
                        className={`inline-flex items-center rounded-xs text-[11px] font-mono border transition ${
                          isSelected
                            ? "bg-[#8d734a] text-white border-[#8d734a] shadow-2xs font-bold"
                            : "bg-white text-slate-700 border-[#e5e5e0] hover:bg-amber-50/50 hover:border-amber-200"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleTag(tag)}
                          className="px-2 py-0.5 flex items-center gap-1 cursor-pointer"
                        >
                          <span>{isSelected ? "✓" : "+"}</span>
                          <span>{tag}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCustomTag(tag, e)}
                          className={`pr-1.5 pl-0.5 py-0.5 hover:text-rose-400 transition cursor-pointer ${
                            isSelected ? "text-white/80" : "text-slate-400"
                          }`}
                          title="從自訂標籤庫中刪除"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom Tag Input & Add Button */}
            <div className="flex items-center gap-2 pt-1">
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
                placeholder="新增自訂標籤 (例如: 水性配方、XRD分析，按 Enter 或點右側加入)..."
                className="flex-1 bg-white border border-[#e5e5e0] rounded-sm py-1.5 px-2.5 text-xs focus:outline-none focus:border-[#1b4372]"
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                className="px-3 py-1.5 bg-[#1b4372] hover:bg-[#102844] text-white rounded-sm font-bold text-xs transition flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>加入標籤</span>
              </button>
            </div>
          </div>

          {/* Attachments Section */}
          <div className="border-t border-[#e5e5e0] pt-3">
            <label className="font-bold text-slate-700 flex items-center gap-1 mb-2">
              <Paperclip className="w-3.5 h-3.5 text-[#1b4372]" />
              相關附件或雲端連結 (報告、簡報、實驗數據)
            </label>

            {attachments.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {attachments.map((att, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white border border-[#e5e5e0] p-2 rounded-sm text-xs">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="font-bold text-slate-800 truncate">{att.name}</span>
                      <span className="text-[10px] text-slate-400 truncate max-w-[200px] font-mono">({att.url})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(idx)}
                      className="text-rose-500 hover:text-rose-700 p-0.5"
                      title="移除此附件"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 bg-[#f8f8f5] p-2.5 rounded-sm border border-[#e5e5e0]">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={newAttachName}
                  onChange={(e) => setNewAttachName(e.target.value)}
                  placeholder="附件名稱 (例如: 實驗數據表.xlsx)"
                  className="w-full bg-white border border-[#e5e5e0] rounded-sm py-1.5 px-2 text-xs focus:outline-none focus:border-[#1b4372]"
                />
              </div>
              <div className="sm:col-span-2">
                <input
                  type="url"
                  value={newAttachUrl}
                  onChange={(e) => setNewAttachUrl(e.target.value)}
                  placeholder="連結網址 (https://...)"
                  className="w-full bg-white border border-[#e5e5e0] rounded-sm py-1.5 px-2 text-xs focus:outline-none focus:border-[#1b4372]"
                />
              </div>
              <div className="sm:col-span-1">
                <button
                  type="button"
                  onClick={handleAddAttachment}
                  className="w-full h-full py-1.5 bg-[#1b4372] hover:bg-[#102844] text-white rounded-sm font-bold text-xs flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  新增
                </button>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e5e5e0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-[#e5e5e0] hover:bg-slate-50 text-slate-700 rounded-sm font-medium transition"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#1b4372] hover:bg-[#102844] text-white rounded-sm font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-4 h-4" />
              {initialEntry ? "儲存更新" : "建立進度紀錄"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
