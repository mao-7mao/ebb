import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Member } from "../../data/labData";
import { 
  ProgressEntry, 
  ExternalMember, 
  CombinedMember, 
  ProgressFilterState, 
  ProgressStatus, 
  ProgressCategory 
} from "../../types/progress";
import { 
  initialProgressEntries, 
  initialExternalMembers, 
  DEFAULT_TAGS, 
  STATUS_CONFIG, 
  CATEGORY_CONFIG 
} from "../../data/initialProgressData";
import ProgressListView from "./ProgressListView";
import ProgressTimelineView from "./ProgressTimelineView";
import ProgressKanbanView from "./ProgressKanbanView";
import ProgressEntryModal from "./ProgressEntryModal";
import ProgressDetailModal from "./ProgressDetailModal";
import ExternalMemberModal from "./ExternalMemberModal";
import ProgressReportModal from "./ProgressReportModal";
import { 
  List, 
  CalendarRange, 
  Columns, 
  Plus, 
  UserPlus, 
  FileText, 
  Search, 
  Filter, 
  RotateCcw, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  FolderGit2, 
  Users, 
  TrendingUp, 
  Clock, 
  SlidersHorizontal,
  RefreshCw
} from "lucide-react";
import { 
  getSavedMemberWebhookUrl, 
  syncMemberDataToGoogle, 
  fetchMemberDataFromGoogle, 
  parseGasDate 
} from "../../services/googleMemberSyncService";

interface MemberProgressTrackingProps {
  systemMembers: Member[];
  onBackToHome?: () => void;
}

const STORAGE_KEY_ENTRIES = "ebblab_progress_entries";
const STORAGE_KEY_EXTERNAL_MEMBERS = "ebblab_external_members";

export default function MemberProgressTracking({
  systemMembers,
  onBackToHome
}: MemberProgressTrackingProps) {
  // 1. Load entries state with localStorage persistence
  const [entries, setEntries] = useState<ProgressEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ENTRIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((it: any) => ({
            ...it,
            date: parseGasDate(it.date)
          }));
        }
      }
    } catch (e) {
      console.error("Failed to load progress entries from localStorage", e);
    }
    return initialProgressEntries;
  });

  // 2. Load external non-system members with localStorage persistence
  const [externalMembers, setExternalMembers] = useState<ExternalMember[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EXTERNAL_MEMBERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Failed to load external members from localStorage", e);
    }
    return initialExternalMembers;
  });

  // Cloud Sync State
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<string>("");

  // Auto-fetch latest progress records and external members from Google Sheets
  const refreshFromGoogle = useCallback(async (isManual = false) => {
    const webhookUrl = getSavedMemberWebhookUrl();
    if (!webhookUrl) return;
    setIsSyncing(true);
    try {
      const res = await fetchMemberDataFromGoogle(webhookUrl);
      if (res.success && res.data) {
        if (Array.isArray(res.data.progressEntries)) {
          setEntries(res.data.progressEntries);
          try {
            localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(res.data.progressEntries));
          } catch (e) {}
        }
        if (Array.isArray(res.data.externalMembers) && res.data.externalMembers.length > 0) {
          setExternalMembers(res.data.externalMembers);
          try {
            localStorage.setItem(STORAGE_KEY_EXTERNAL_MEMBERS, JSON.stringify(res.data.externalMembers));
          } catch (e) {}
        }
        const timeStr = new Date().toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
        setLastSyncStatus(`已自雲端試算表同步 (${timeStr})`);
      } else if (res.error) {
        setLastSyncStatus(`雲端提示: ${res.error}`);
      }
    } catch (err: any) {
      console.error("Failed to fetch data from Google Apps Script", err);
      setLastSyncStatus(`同步失敗: ${err?.message || "請檢查網路"}`);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    refreshFromGoogle(false);
  }, [refreshFromGoogle]);

  // Persist entries
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(entries));
    } catch (e) {
      console.error("Failed to persist progress entries", e);
    }
  }, [entries]);

  // Persist external members
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_EXTERNAL_MEMBERS, JSON.stringify(externalMembers));
    } catch (e) {
      console.error("Failed to persist external members", e);
    }
  }, [externalMembers]);

  // View state: 'list' | 'timeline' | 'kanban'
  const [viewMode, setViewMode] = useState<"list" | "timeline" | "kanban">("list");

  // Filter state
  const [filterState, setFilterState] = useState<ProgressFilterState>({
    searchQuery: "",
    selectedProject: "ALL",
    selectedStatus: "ALL",
    timeRange: "all",
    memberTypeFilter: "all",
    categoryFilter: "ALL",
    onlyKeyEvents: false,
    sortBy: "latest_update",
    sortOrder: "desc"
  });

  // Modals state
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ProgressEntry | null>(null);
  const [targetMemberForNewEntry, setTargetMemberForNewEntry] = useState<string | undefined>(undefined);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDetailEntry, setSelectedDetailEntry] = useState<ProgressEntry | null>(null);

  const [isExternalModalOpen, setIsExternalModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Combine system members and external members into a unified interface
  const combinedMembers: CombinedMember[] = useMemo(() => {
    const sys: CombinedMember[] = systemMembers.map((m) => ({
      id: m.id,
      name_zh: m.name_zh,
      name_en: m.name_en,
      role: m.role,
      role_en: m.role_en,
      is_external: false,
      research_topic: m.research_topic,
      description: m.description
    }));

    const ext: CombinedMember[] = externalMembers.map((m) => ({
      id: m.id,
      name_zh: m.name_zh,
      name_en: m.name_en,
      role: m.role,
      role_en: m.role_en,
      is_external: true,
      role_type: m.role_type,
      organization: m.organization,
      research_topic: m.research_topic || {
        title_zh: "合作研究專案",
        title_en: "Collaborative Project",
        keywords: []
      },
      description: m.description || ""
    }));

    return [...sys, ...ext];
  }, [systemMembers, externalMembers]);

  // Filter members based on memberTypeFilter
  const displayMembers: CombinedMember[] = useMemo(() => {
    if (filterState.memberTypeFilter === "system") {
      return combinedMembers.filter((m) => !m.is_external);
    }
    if (filterState.memberTypeFilter === "external") {
      return combinedMembers.filter((m) => m.is_external);
    }
    return combinedMembers;
  }, [combinedMembers, filterState.memberTypeFilter]);

  // Collect all available project names from entries + member topics
  const availableProjects: string[] = useMemo(() => {
    const set = new Set<string>();
    combinedMembers.forEach((m) => {
      if (m.research_topic.title_zh) set.add(m.research_topic.title_zh);
    });
    entries.forEach((e) => {
      if (e.project_name) set.add(e.project_name);
    });
    return Array.from(set).sort();
  }, [combinedMembers, entries]);

  // Top Metrics Calculation
  const metrics = useMemo(() => {
    const totalMembers = combinedMembers.length;
    const systemCount = combinedMembers.filter((m) => !m.is_external).length;
    const externalCount = combinedMembers.filter((m) => m.is_external).length;
    const totalEntries = entries.length;
    const keyMilestones = entries.filter((e) => e.is_key_event).length;
    const inProgressCount = entries.filter((e) => e.status === "in_progress").length;
    
    // Stale count: members whose last update is >= 21 days ago or never
    const now = new Date();
    let staleCount = 0;
    combinedMembers.forEach((m) => {
      const mEntries = entries.filter((e) => e.member_id === m.id);
      if (mEntries.length === 0) {
        staleCount++;
      } else {
        const dates = mEntries.map((e) => new Date(e.date).getTime());
        const maxDate = Math.max(...dates);
        const days = Math.floor((now.getTime() - maxDate) / (1000 * 60 * 60 * 24));
        if (days >= 21) staleCount++;
      }
    });

    return {
      totalMembers,
      systemCount,
      externalCount,
      totalEntries,
      keyMilestones,
      inProgressCount,
      staleCount
    };
  }, [combinedMembers, entries]);

  // Handlers for Progress Entries
  const handleOpenAddEntry = (memberId?: string) => {
    setEditingEntry(null);
    setTargetMemberForNewEntry(memberId);
    setIsEntryModalOpen(true);
  };

  const handleOpenEditEntry = (entry: ProgressEntry) => {
    setEditingEntry(entry);
    setIsEntryModalOpen(true);
  };

  const handleSaveEntry = (entry: ProgressEntry) => {
    setEntries((prev) => {
      const exists = prev.some((e) => e.id === entry.id);
      const updated = exists ? prev.map((e) => (e.id === entry.id ? entry : e)) : [entry, ...prev];
      
      // Auto-sync to Google Sheet if webhook is configured
      const webhookUrl = getSavedMemberWebhookUrl();
      if (webhookUrl) {
        syncMemberDataToGoogle(
          { progressEntries: updated, externalMembers },
          "sync_progress",
          webhookUrl
        ).catch(() => {});
      }
      return updated;
    });
  };

  const handleDeleteEntry = (id: string) => {
    setEntries((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      const webhookUrl = getSavedMemberWebhookUrl();
      if (webhookUrl) {
        syncMemberDataToGoogle(
          { progressEntries: updated, externalMembers },
          "sync_progress",
          webhookUrl
        ).catch(() => {});
      }
      return updated;
    });
  };

  const handleUpdateStatus = (id: string, newStatus: ProgressStatus) => {
    setEntries((prev) => {
      const updated = prev.map((e) =>
        e.id === id ? { ...e, status: newStatus, updated_at: new Date().toISOString() } : e
      );
      const webhookUrl = getSavedMemberWebhookUrl();
      if (webhookUrl) {
        syncMemberDataToGoogle(
          { progressEntries: updated, externalMembers },
          "sync_progress",
          webhookUrl
        ).catch(() => {});
      }
      return updated;
    });
  };

  const handleViewDetail = (entry: ProgressEntry) => {
    setSelectedDetailEntry(entry);
    setIsDetailModalOpen(true);
  };

  // Handlers for External Members
  const handleSaveExternalMember = (newMember: ExternalMember) => {
    setExternalMembers((prev) => {
      const updated = [...prev, newMember];
      const webhookUrl = getSavedMemberWebhookUrl();
      if (webhookUrl) {
        syncMemberDataToGoogle(
          { progressEntries: entries, externalMembers: updated },
          "sync_all",
          webhookUrl
        ).catch(() => {});
      }
      return updated;
    });
  };

  // Clear data handler
  const handleClearAllProgress = () => {
    if (confirm("確定要清空所有進度紀錄與在職生成員資料嗎？已儲存的內容將會被清除。")) {
      setEntries([]);
      setExternalMembers([]);
      localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEY_EXTERNAL_MEMBERS, JSON.stringify([]));
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#e5e5e0] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-bold text-[#8d734a] tracking-[0.2em] uppercase font-serif italic">
              Lab Progress Tracking
            </span>
            <span className="text-[10.5px] px-2 py-0.2 bg-[#1b4372]/10 text-[#1b4372] font-mono font-bold rounded-xs border border-[#1b4372]/20">
              即時追蹤
            </span>
            {lastSyncStatus && (
              <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-800 font-mono rounded-xs border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {lastSyncStatus}
              </span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1a1a1a] font-serif tracking-tight">
            實驗室成員進度追蹤
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-sans mt-1">
            整合實驗室一般生與在職生名單、研究題目、論文發表、口試與實驗關鍵里程碑，提供清單、時間軸與看板全景追蹤。
          </p>
        </div>

        {/* Top Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Cloud Sync / Refresh Button */}
          <button
            type="button"
            onClick={() => refreshFromGoogle(true)}
            disabled={isSyncing}
            className="px-3.5 py-2 bg-white border border-[#e5e5e0] hover:bg-slate-50 text-slate-700 rounded-sm font-bold text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer disabled:opacity-60"
            title="從 Google 試算表立即同步最新進度紀錄"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#1b4372] ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "同步中..." : "重新整理 / 雲端同步"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="px-3.5 py-2 bg-white border border-[#e5e5e0] hover:bg-slate-50 text-slate-700 rounded-sm font-bold text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
            title="產出彙整簡報與列印"
          >
            <FileText className="w-3.5 h-3.5 text-[#1b4372]" />
            <span>進度報表 (Report)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExternalModalOpen(true)}
            className="px-3.5 py-2 bg-white border border-[#e5e5e0] hover:bg-slate-50 text-slate-700 rounded-sm font-bold text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
            title="新增在職專班生、在職研究生名錄"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#1b4372]" />
            <span>+ 在職生</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenAddEntry()}
            className="px-4 py-2 bg-[#1b4372] hover:bg-[#102844] text-white rounded-sm font-bold text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>新增進度紀錄</span>
          </button>
        </div>
      </div>

      {/* Top 4 Metrics Dashboard Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-[#e5e5e0] p-4 rounded-sm shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">追蹤成員總數</span>
            <Users className="w-4 h-4 text-[#1b4372]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-serif text-slate-900">
              {metrics.totalMembers}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              ({metrics.systemCount} 一般生 / {metrics.externalCount} 在職生)
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#e5e5e0] p-4 rounded-sm shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">累積進度筆數</span>
            <TrendingUp className="w-4 h-4 text-[#1b4372]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-serif text-slate-900">
              {metrics.totalEntries}
            </span>
            <span className="text-[11px] text-[#1b4372] font-mono font-medium">
              {metrics.inProgressCount} 項進行中
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#e5e5e0] p-4 rounded-sm shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">關鍵里程碑</span>
            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-serif text-amber-600">
              {metrics.keyMilestones}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              論文·專利·口試
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#e5e5e0] p-4 rounded-sm shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider font-mono">逾 21 天未更新</span>
            <AlertCircle className={`w-4 h-4 ${metrics.staleCount > 0 ? "text-rose-500" : "text-emerald-500"}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-serif ${metrics.staleCount > 0 ? "text-rose-600" : "text-emerald-700"}`}>
              {metrics.staleCount}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {metrics.staleCount > 0 ? "需發送提醒" : "全員維持更新"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Filter & View Toggle Bar */}
      <div className="bg-[#f8f8f5] border border-[#e5e5e0] rounded-sm p-4 space-y-3 shadow-2xs">
        {/* Row 1: Search + View Toggles */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterState.searchQuery}
              onChange={(e) => setFilterState({ ...filterState, searchQuery: e.target.value })}
              placeholder="搜尋成員姓名、英文代稱、專案、標籤或進度內容..."
              className="w-full bg-white border border-[#e5e5e0] rounded-sm pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-[#1b4372]"
            />
            {filterState.searchQuery && (
              <button
                type="button"
                onClick={() => setFilterState({ ...filterState, searchQuery: "" })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-600 font-mono"
              >
                ✕ 清除
              </button>
            )}
          </div>

          {/* View Toggles (Same-tab toggle preserving filter state) */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="inline-flex rounded-sm bg-white p-1 border border-[#e5e5e0] shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`px-3 py-1.5 rounded-xs text-xs font-serif font-bold flex items-center gap-1.5 transition ${
                  viewMode === "list"
                    ? "bg-[#1b4372] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("timeline")}
                className={`px-3 py-1.5 rounded-xs text-xs font-serif font-bold flex items-center gap-1.5 transition ${
                  viewMode === "timeline"
                    ? "bg-[#1b4372] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5" />
                <span>Timeline</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("kanban")}
                className={`px-3 py-1.5 rounded-xs text-xs font-serif font-bold flex items-center gap-1.5 transition ${
                  viewMode === "kanban"
                    ? "bg-[#1b4372] text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>看板</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleClearAllProgress}
              className="p-1.5 text-slate-400 hover:text-rose-600 bg-white border border-[#e5e5e0] hover:bg-rose-50 rounded-sm transition cursor-pointer"
              title="清空所有進度紀錄與在職生資料"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Row 2: Secondary Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs pt-1 border-t border-[#e5e5e0]/60">
          {/* Project Filter */}
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-bold">專案:</span>
            <select
              value={filterState.selectedProject}
              onChange={(e) => setFilterState({ ...filterState, selectedProject: e.target.value })}
              className="bg-white border border-[#e5e5e0] rounded-sm py-1 px-2 text-xs focus:outline-none focus:border-[#1b4372] max-w-[180px] truncate"
            >
              <option value="ALL">全部專案 / 主題</option>
              {availableProjects.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-bold">狀態:</span>
            <select
              value={filterState.selectedStatus}
              onChange={(e) => setFilterState({ ...filterState, selectedStatus: e.target.value })}
              className="bg-white border border-[#e5e5e0] rounded-sm py-1 px-2 text-xs focus:outline-none focus:border-[#1b4372]"
            >
              <option value="ALL">全部狀態</option>
              {Object.entries(STATUS_CONFIG).map(([k, cfg]) => (
                <option key={k} value={k}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-bold">類別:</span>
            <select
              value={filterState.categoryFilter}
              onChange={(e) => setFilterState({ ...filterState, categoryFilter: e.target.value as any })}
              className="bg-white border border-[#e5e5e0] rounded-sm py-1 px-2 text-xs focus:outline-none focus:border-[#1b4372]"
            >
              <option value="ALL">全部類別</option>
              {Object.entries(CATEGORY_CONFIG).map(([k, cfg]) => (
                <option key={k} value={k}>
                  {cfg.label}
                </option>
              ))}
            </select>
          </div>

          {/* Member Type Filter */}
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-bold">成員類別:</span>
            <select
              value={filterState.memberTypeFilter}
              onChange={(e) => setFilterState({ ...filterState, memberTypeFilter: e.target.value as any })}
              className="bg-white border border-[#e5e5e0] rounded-sm py-1 px-2 text-xs focus:outline-none focus:border-[#1b4372]"
            >
              <option value="all">全體成員 (一般生+在職生)</option>
              <option value="system">僅一般生</option>
              <option value="external">僅在職生</option>
            </select>
          </div>

          {/* Time Range */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-slate-500 font-bold">時間:</span>
            <select
              value={filterState.timeRange}
              onChange={(e) => setFilterState({ ...filterState, timeRange: e.target.value as any })}
              className="bg-white border border-[#e5e5e0] rounded-sm py-1 px-2 text-xs focus:outline-none focus:border-[#1b4372]"
            >
              <option value="all">全部時間</option>
              <option value="this_month">本月</option>
              <option value="last_3_months">近 3 個月</option>
              <option value="last_6_months">近 6 個月</option>
              <option value="last_year">近 1 年</option>
              <option value="custom">自訂時間段...</option>
            </select>

            {filterState.timeRange === "custom" && (
              <div className="flex items-center gap-1 bg-[#f8f8f5] px-2 py-0.5 rounded-sm border border-[#e5e5e0]">
                <input
                  type="date"
                  value={filterState.customStartDate || ""}
                  onChange={(e) => setFilterState({ ...filterState, customStartDate: e.target.value })}
                  className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700 font-mono focus:outline-none focus:border-[#1b4372]"
                  placeholder="開始日期"
                />
                <span className="text-slate-400 text-xs">至</span>
                <input
                  type="date"
                  value={filterState.customEndDate || ""}
                  onChange={(e) => setFilterState({ ...filterState, customEndDate: e.target.value })}
                  className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700 font-mono focus:outline-none focus:border-[#1b4372]"
                  placeholder="結束日期"
                />
                {(filterState.customStartDate || filterState.customEndDate) && (
                  <button
                    type="button"
                    onClick={() => setFilterState({ ...filterState, customStartDate: undefined, customEndDate: undefined })}
                    className="text-[10px] text-slate-400 hover:text-slate-600 ml-0.5 px-1 py-0.5"
                    title="清除自訂日期"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sort By (primarily for List view) */}
          {viewMode === "list" && (
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-bold">排序:</span>
              <select
                value={filterState.sortBy}
                onChange={(e) => setFilterState({ ...filterState, sortBy: e.target.value as any })}
                className="bg-white border border-[#e5e5e0] rounded-sm py-1 px-2 text-xs focus:outline-none focus:border-[#1b4372]"
              >
                <option value="latest_update">最近更新日期</option>
                <option value="name">成員姓名</option>
                <option value="project">專案名稱</option>
                <option value="entries_count">進度紀錄筆數</option>
              </select>
            </div>
          )}

          {/* Only Key Events Checkbox */}
          <label className="flex items-center gap-1.5 cursor-pointer ml-auto text-slate-700 font-bold select-none">
            <input
              type="checkbox"
              checked={filterState.onlyKeyEvents}
              onChange={(e) => setFilterState({ ...filterState, onlyKeyEvents: e.target.checked })}
              className="w-3.5 h-3.5 text-[#1b4372] rounded border-gray-300 focus:ring-[#1b4372]"
            />
            <span className="flex items-center gap-1 text-[11px]">
              <Sparkles className="w-3 h-3 text-amber-500 fill-amber-400" />
              只看關鍵里程碑
            </span>
          </label>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === "list" && (
        <ProgressListView
          members={displayMembers}
          entries={entries}
          filterState={filterState}
          onAddEntry={handleOpenAddEntry}
          onEditEntry={handleOpenEditEntry}
          onDeleteEntry={handleDeleteEntry}
          onViewEntryDetail={handleViewDetail}
        />
      )}

      {viewMode === "timeline" && (
        <ProgressTimelineView
          members={displayMembers}
          entries={entries}
          filterState={filterState}
          onFilterStateChange={setFilterState}
          onAddEntry={handleOpenAddEntry}
          onViewEntryDetail={handleViewDetail}
        />
      )}

      {viewMode === "kanban" && (
        <ProgressKanbanView
          members={displayMembers}
          entries={entries}
          filterState={filterState}
          onAddEntry={handleOpenAddEntry}
          onEditEntry={handleOpenEditEntry}
          onDeleteEntry={handleDeleteEntry}
          onViewEntryDetail={handleViewDetail}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {/* Entry Add / Edit Modal */}
      <ProgressEntryModal
        isOpen={isEntryModalOpen}
        onClose={() => setIsEntryModalOpen(false)}
        onSave={handleSaveEntry}
        initialEntry={editingEntry}
        targetMemberId={targetMemberForNewEntry}
        members={combinedMembers}
        availableProjects={availableProjects}
      />

      {/* Entry Detail Preview Modal */}
      <ProgressDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        entry={selectedDetailEntry}
        member={combinedMembers.find((m) => m.id === selectedDetailEntry?.member_id)}
        onEdit={handleOpenEditEntry}
        onDelete={handleDeleteEntry}
      />

      {/* Non-System External Member Modal */}
      <ExternalMemberModal
        isOpen={isExternalModalOpen}
        onClose={() => setIsExternalModalOpen(false)}
        onSave={handleSaveExternalMember}
        existingExternalMembers={externalMembers}
      />

      {/* Periodic Progress Report Modal */}
      <ProgressReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        entries={entries}
        members={combinedMembers}
      />
    </div>
  );
}
