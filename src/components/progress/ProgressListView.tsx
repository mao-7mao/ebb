import React, { useState } from "react";
import { 
  ProgressEntry, 
  CombinedMember, 
  ProgressFilterState 
} from "../../types/progress";
import { CATEGORY_CONFIG, STATUS_CONFIG } from "../../data/initialProgressData";
import { 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Calendar, 
  Sparkles, 
  Tag, 
  Paperclip, 
  ExternalLink, 
  Edit3, 
  Trash2, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  FolderGit2, 
  Send, 
  Check, 
  User, 
  Layers 
} from "lucide-react";

interface ProgressListViewProps {
  members: CombinedMember[];
  entries: ProgressEntry[];
  filterState: ProgressFilterState;
  onAddEntry: (memberId: string) => void;
  onEditEntry: (entry: ProgressEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  onViewEntryDetail: (entry: ProgressEntry) => void;
}

export default function ProgressListView({
  members,
  entries,
  filterState,
  onAddEntry,
  onEditEntry,
  onDeleteEntry,
  onViewEntryDetail
}: ProgressListViewProps) {
  // Set of expanded member IDs
  const [expandedMemberIds, setExpandedMemberIds] = useState<Set<string>>(new Set());
  const [remindedMemberId, setRemindedMemberId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    const next = new Set(expandedMemberIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedMemberIds(next);
  };

  const expandAll = () => {
    setExpandedMemberIds(new Set(members.map((m) => m.id)));
  };

  const collapseAll = () => {
    setExpandedMemberIds(new Set());
  };

  const handleSendReminder = (member: CombinedMember, daysStale: number) => {
    const text = `【EBB Lab 進度更新提醒】 ${member.name_zh} (${member.name_en})，您已有 ${daysStale} 天尚未更新研究進度，請至 LabData Studio 填寫最新進展或實驗數據，以利組會研討與進度彙整！謝謝！`;
    navigator.clipboard.writeText(text);
    setRemindedMemberId(member.id);
    setTimeout(() => setRemindedMemberId(null), 2500);
  };

  // Helper to calculate days since last update
  const getDaysSinceLastUpdate = (lastDateStr?: string) => {
    if (!lastDateStr) return 999;
    const lastDate = new Date(lastDateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastDate.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // Prepare each member's filtered entries, projects, and latest update
  const memberDataList = members.map((member) => {
    // All entries for this member
    let mEntries = entries.filter((e) => e.member_id === member.id);

    // Apply Project Filter
    if (filterState.selectedProject !== "ALL") {
      mEntries = mEntries.filter(
        (e) => e.project_name === filterState.selectedProject || 
               member.research_topic.title_zh === filterState.selectedProject
      );
    }

    // Apply Status Filter
    if (filterState.selectedStatus !== "ALL") {
      mEntries = mEntries.filter((e) => e.status === filterState.selectedStatus);
    }

    // Apply Category Filter
    if (filterState.categoryFilter !== "ALL") {
      mEntries = mEntries.filter((e) => e.category === filterState.categoryFilter);
    }

    // Apply Key Events Only
    if (filterState.onlyKeyEvents) {
      mEntries = mEntries.filter((e) => e.is_key_event);
    }

    // Apply Time Range Filter
    const now = new Date();
    if (filterState.timeRange === "this_month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      mEntries = mEntries.filter((e) => new Date(e.date) >= startOfMonth);
    } else if (filterState.timeRange === "last_3_months") {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setDate(now.getDate() - 90);
      mEntries = mEntries.filter((e) => new Date(e.date) >= threeMonthsAgo);
    } else if (filterState.timeRange === "last_6_months") {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setDate(now.getDate() - 180);
      mEntries = mEntries.filter((e) => new Date(e.date) >= sixMonthsAgo);
    } else if (filterState.timeRange === "last_year") {
      const oneYearAgo = new Date();
      oneYearAgo.setDate(now.getDate() - 365);
      mEntries = mEntries.filter((e) => new Date(e.date) >= oneYearAgo);
    } else if (filterState.timeRange === "custom") {
      if (filterState.customStartDate) {
        mEntries = mEntries.filter((e) => e.date >= filterState.customStartDate!);
      }
      if (filterState.customEndDate) {
        mEntries = mEntries.filter((e) => e.date <= filterState.customEndDate!);
      }
    }

    // Apply Search Query
    if (filterState.searchQuery.trim()) {
      const q = filterState.searchQuery.toLowerCase();
      const matchMember = 
        member.name_zh.toLowerCase().includes(q) ||
        member.name_en.toLowerCase().includes(q) ||
        member.role.toLowerCase().includes(q) ||
        member.research_topic.title_zh.toLowerCase().includes(q);
      
      if (!matchMember) {
        mEntries = mEntries.filter(
          (e) => 
            e.title.toLowerCase().includes(q) ||
            e.description.toLowerCase().includes(q) ||
            (e.project_name && e.project_name.toLowerCase().includes(q)) ||
            (e.tags && e.tags.some((t) => t.toLowerCase().includes(q)))
        );
      }
    }

    // Sort entries descending by date
    mEntries.sort((a, b) => b.date.localeCompare(a.date));

    // Derive associated projects from entries + member's topic
    const projectSet = new Set<string>();
    if (member.research_topic.title_zh) {
      projectSet.add(member.research_topic.title_zh);
    }
    mEntries.forEach((e) => {
      if (e.project_name) projectSet.add(e.project_name);
    });

    const latestEntry = mEntries[0];
    const latestDate = latestEntry?.date;
    const latestStatus = latestEntry?.status || "in_progress";
    const daysStale = getDaysSinceLastUpdate(latestDate);
    const isStale = daysStale >= 21;

    return {
      member,
      entries: mEntries,
      projects: Array.from(projectSet),
      latestEntry,
      latestDate,
      latestStatus,
      daysStale,
      isStale
    };
  });

  // Filter out members if search or filter matches no entries and filter active
  const filteredMemberDataList = memberDataList.filter((item) => {
    // If user filtered by specific status, category, or project, only show members who have matching entries or matching topic
    if (
      filterState.selectedStatus !== "ALL" ||
      filterState.categoryFilter !== "ALL" ||
      filterState.onlyKeyEvents
    ) {
      return item.entries.length > 0;
    }
    if (filterState.selectedProject !== "ALL") {
      return item.projects.includes(filterState.selectedProject) || item.entries.length > 0;
    }
    if (filterState.searchQuery.trim()) {
      const q = filterState.searchQuery.toLowerCase();
      const nameMatch = 
        item.member.name_zh.toLowerCase().includes(q) ||
        item.member.name_en.toLowerCase().includes(q) ||
        item.member.role.toLowerCase().includes(q);
      return nameMatch || item.entries.length > 0;
    }
    return true;
  });

  // Sort members list
  filteredMemberDataList.sort((a, b) => {
    let comparison = 0;
    if (filterState.sortBy === "latest_update") {
      const dateA = a.latestDate || "1970-01-01";
      const dateB = b.latestDate || "1970-01-01";
      comparison = dateB.localeCompare(dateA);
    } else if (filterState.sortBy === "name") {
      comparison = a.member.name_zh.localeCompare(b.member.name_zh, "zh-Hant");
    } else if (filterState.sortBy === "project") {
      const pA = a.projects[0] || "";
      const pB = b.projects[0] || "";
      comparison = pA.localeCompare(pB, "zh-Hant");
    } else if (filterState.sortBy === "entries_count") {
      comparison = b.entries.length - a.entries.length;
    }

    return filterState.sortOrder === "asc" ? -comparison : comparison;
  });

  return (
    <div className="space-y-4">
      {/* List Action Bar */}
      <div className="flex items-center justify-between bg-white border border-[#e5e5e0] px-4 py-2.5 rounded-sm text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <span className="font-bold text-[#1b4372] font-serif">
            顯示 {filteredMemberDataList.length} 位成員
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500">
            共計 {filteredMemberDataList.reduce((acc, m) => acc + m.entries.length, 0)} 筆進度紀錄
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-[#f8f8f5] hover:bg-slate-100 rounded-sm font-mono text-[11px] transition"
          >
            全部展開
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="px-2.5 py-1 text-slate-600 hover:text-slate-900 bg-[#f8f8f5] hover:bg-slate-100 rounded-sm font-mono text-[11px] transition"
          >
            全部摺疊
          </button>
        </div>
      </div>

      {/* Members Rows */}
      {filteredMemberDataList.length === 0 ? (
        <div className="p-12 text-center bg-white border border-[#e5e5e0] rounded-sm space-y-2">
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="font-serif font-bold text-slate-700">查無符合條件之成員進度紀錄</p>
          <p className="text-xs text-slate-500">請嘗試調整篩選條件、搜尋字詞或專案名稱。</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMemberDataList.map(({
            member,
            entries: mEntries,
            projects,
            latestEntry,
            latestDate,
            latestStatus,
            daysStale,
            isStale
          }) => {
            const isExpanded = expandedMemberIds.has(member.id);
            const statusCfg = STATUS_CONFIG[latestStatus] || STATUS_CONFIG.in_progress;

            return (
              <div
                key={member.id}
                className="bg-white border border-[#e5e5e0] rounded-sm hover:border-slate-300 transition-shadow shadow-2xs overflow-hidden"
              >
                {/* Main Member Summary Row */}
                <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: Avatar + Name + Role + Projects */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleExpand(member.id)}
                      className="mt-0.5 p-1 text-slate-400 hover:text-slate-700 hover:bg-[#f8f8f5] rounded-sm transition"
                      aria-label={isExpanded ? "摺疊成員進度" : "展開成員進度"}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-[#1b4372]" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </button>

                    {/* Member Avatar Circle */}
                    <div className="w-10 h-10 rounded-sm bg-[#1b4372]/10 text-[#1b4372] border border-[#1b4372]/25 flex items-center justify-center font-bold font-serif text-sm shrink-0">
                      {member.name_zh.slice(0, 1)}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-bold text-[#1a1a1a] font-serif">
                          {member.name_zh}
                        </span>
                        <span className="text-xs text-slate-500 font-sans">
                          {member.name_en}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-[#f8f8f5] text-slate-700 border border-[#e5e5e0] rounded-xs font-mono font-medium">
                          {member.role}
                        </span>
                        {member.is_external && (
                          <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-900 border border-blue-300 rounded-xs font-mono font-bold">
                            {member.role_type || "在職生"}
                          </span>
                        )}
                        {member.organization && (
                          <span className="text-[10.5px] text-slate-400 font-mono">
                            @{member.organization}
                          </span>
                        )}
                      </div>

                      {/* Associated Projects Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <FolderGit2 className="w-3.5 h-3.5 text-[#8d734a] shrink-0" />
                        {projects.map((proj) => (
                          <span
                            key={proj}
                            className="text-[11px] font-serif text-[#1b4372] bg-[#1b4372]/5 px-2 py-0.5 rounded-xs border border-[#1b4372]/15 truncate max-w-[280px]"
                            title={proj}
                          >
                            {proj}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Latest Update Summary */}
                  <div className="lg:w-80 border-t lg:border-t-0 lg:border-l border-[#e5e5e0] pt-2 lg:pt-0 lg:pl-4 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-bold text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        最近更新
                      </span>
                      {latestDate ? (
                        <span className="font-mono text-[11px] font-bold text-slate-700">
                          {latestDate}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-mono">尚未記錄</span>
                      )}
                    </div>

                    {latestEntry ? (
                      <p
                        onClick={() => onViewEntryDetail(latestEntry)}
                        className="text-slate-800 line-clamp-1 font-medium hover:text-[#1b4372] cursor-pointer"
                        title={latestEntry.title}
                      >
                        {latestEntry.is_key_event && "★ "}
                        {latestEntry.title}
                      </p>
                    ) : (
                      <p className="text-slate-400 italic text-[11px]">
                        尚無任何進度紀錄，可點右側立即新增
                      </p>
                    )}

                    {/* Stale Warning & Reminder */}
                    <div className="flex items-center gap-2 pt-0.5">
                      {isStale && (
                        <span className="text-[10.5px] text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.2 rounded-xs font-mono font-bold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          已 {daysStale} 天未更新
                        </span>
                      )}
                      {latestEntry && !isStale && (
                        <span className="text-[10.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-xs font-mono font-medium">
                          {daysStale === 0 ? "今天剛更新" : `${daysStale} 天前更新`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Status Badge & Action Buttons */}
                  <div className="flex items-center justify-between lg:justify-end gap-2 shrink-0 border-t lg:border-t-0 pt-2 lg:pt-0">
                    <span className={`px-2.5 py-1 rounded-xs text-xs font-bold border ${statusCfg.badgeClass}`}>
                      {statusCfg.label}
                    </span>

                    {isStale && (
                      <button
                        type="button"
                        onClick={() => handleSendReminder(member, daysStale)}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-sm text-[11px] font-bold flex items-center gap-1 transition"
                        title="複製催辦提醒訊息"
                      >
                        {remindedMemberId === member.id ? (
                          <>
                            <Check className="w-3 h-3 text-[#1b4372]" />
                            <span>已複製提醒！</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3 h-3" />
                            <span>提醒催辦</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onAddEntry(member.id)}
                      className="px-3 py-1.5 bg-[#1b4372] hover:bg-[#102844] text-white rounded-sm font-bold text-xs flex items-center gap-1 transition shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>新增紀錄</span>
                    </button>
                  </div>
                </div>

                {/* Expandable History Drawer (Striped chronological entries list) */}
                {isExpanded && (
                  <div className="border-t border-[#e5e5e0] bg-[#f8f8f5]/60 p-4 sm:p-5 space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-[#e5e5e0]">
                      <span className="text-xs font-bold font-serif text-[#1b4372] flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" />
                        {member.name_zh} 的進度紀錄歷史 ({mEntries.length} 筆)
                      </span>
                      <button
                        type="button"
                        onClick={() => onAddEntry(member.id)}
                        className="text-xs text-[#1b4372] hover:underline font-bold flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        在此成員名下建立新紀錄
                      </button>
                    </div>

                    {mEntries.length === 0 ? (
                      <div className="py-6 text-center text-slate-400 text-xs italic bg-white rounded-sm border border-dashed border-[#e5e5e0]">
                        此成員目前無符合篩選條件的進度紀錄。
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {mEntries.map((entry) => {
                          const catCfg = CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG.other;
                          const eStatusCfg = STATUS_CONFIG[entry.status] || STATUS_CONFIG.in_progress;

                          return (
                            <div
                              key={entry.id}
                              className={`p-3.5 bg-white border rounded-sm transition hover:shadow-2xs ${
                                entry.is_key_event
                                  ? "border-amber-300 bg-amber-50/20"
                                  : "border-[#e5e5e0]"
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                <div className="space-y-1.5 flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap text-xs">
                                    <span className="font-mono font-bold text-[#1b4372]">
                                      {entry.date}
                                    </span>
                                    <span className={`px-2 py-0.2 rounded-xs text-[10.5px] font-bold border ${catCfg.badgeBg}`}>
                                      {catCfg.label}
                                    </span>
                                    <span className={`px-2 py-0.2 rounded-xs text-[10px] font-bold border ${eStatusCfg.badgeClass}`}>
                                      {eStatusCfg.label}
                                    </span>
                                    {entry.is_key_event && (
                                      <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-xs text-[10px] font-bold flex items-center gap-0.5">
                                        <Sparkles className="w-2.5 h-2.5 fill-white" />
                                        關鍵里程碑
                                      </span>
                                    )}
                                    {entry.project_name && (
                                      <span className="text-[11px] text-[#8d734a] font-serif font-medium flex items-center gap-1">
                                        <FolderGit2 className="w-3 h-3" />
                                        {entry.project_name}
                                      </span>
                                    )}
                                  </div>

                                  <h4
                                    onClick={() => onViewEntryDetail(entry)}
                                    className="text-sm font-bold text-slate-900 font-serif hover:text-[#1b4372] cursor-pointer"
                                  >
                                    {entry.title}
                                  </h4>

                                  {entry.description && (
                                    <p className="text-xs text-slate-600 leading-relaxed font-sans line-clamp-3">
                                      {entry.description}
                                    </p>
                                  )}

                                  {/* Tags & Attachments */}
                                  <div className="flex items-center gap-3 flex-wrap pt-1 text-xs">
                                    {entry.tags && entry.tags.length > 0 && (
                                      <div className="flex items-center gap-1 flex-wrap">
                                        <Tag className="w-3 h-3 text-slate-400" />
                                        {entry.tags.map((t) => (
                                          <span
                                            key={t}
                                            className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.2 rounded-xs"
                                          >
                                            #{t}
                                          </span>
                                        ))}
                                      </div>
                                    )}

                                    {entry.attachments && entry.attachments.length > 0 && (
                                      <div className="flex items-center gap-1.5">
                                        <Paperclip className="w-3 h-3 text-[#1b4372]" />
                                        {entry.attachments.map((att, idx) => (
                                          <a
                                            key={idx}
                                            href={att.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[11px] text-[#1b4372] hover:underline font-medium flex items-center gap-0.5"
                                          >
                                            <span>{att.name}</span>
                                            <ExternalLink className="w-2.5 h-2.5" />
                                          </a>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Item Actions */}
                                <div className="flex items-center gap-1 self-end sm:self-start shrink-0 pt-1">
                                  <button
                                    type="button"
                                    onClick={() => onEditEntry(entry)}
                                    className="p-1.5 text-slate-400 hover:text-[#1b4372] hover:bg-slate-100 rounded-sm transition"
                                    title="編輯此紀錄"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(`確定要刪除「${entry.title}」這筆進度紀錄嗎？`)) {
                                        onDeleteEntry(entry.id);
                                      }
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-sm transition"
                                    title="刪除此紀錄"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
