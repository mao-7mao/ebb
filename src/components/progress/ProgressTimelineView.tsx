import React, { useState, useRef, useMemo } from "react";
import { 
  ProgressEntry, 
  CombinedMember, 
  ProgressFilterState 
} from "../../types/progress";
import { CATEGORY_CONFIG, STATUS_CONFIG } from "../../data/initialProgressData";
import { 
  Sparkles, 
  Plus, 
  ZoomIn, 
  ZoomOut, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Tag, 
  FolderGit2, 
  Layers, 
  GraduationCap, 
  Send, 
  FileText, 
  AlertCircle 
} from "lucide-react";

interface ProgressTimelineViewProps {
  members: CombinedMember[];
  entries: ProgressEntry[];
  filterState: ProgressFilterState;
  onFilterStateChange?: (newState: ProgressFilterState) => void;
  onAddEntry: (memberId: string, initialDate?: string) => void;
  onViewEntryDetail: (entry: ProgressEntry) => void;
}

type TimelineSpan = "3m" | "6m" | "1y" | "full" | "custom";

export default function ProgressTimelineView({
  members,
  entries,
  filterState,
  onFilterStateChange,
  onAddEntry,
  onViewEntryDetail
}: ProgressTimelineViewProps) {
  // If filterState.timeRange is custom, default to custom; else default to 6m or match filterState
  const [internalSpan, setInternalSpan] = useState<TimelineSpan>(() => {
    if (filterState.timeRange === "custom") return "custom";
    if (filterState.timeRange === "last_3_months") return "3m";
    if (filterState.timeRange === "last_6_months") return "6m";
    if (filterState.timeRange === "last_year") return "1y";
    if (filterState.timeRange === "all") return "6m";
    return "6m";
  });

  // Time direction: "forward" = start from today into future (default); "backward" = end at today looking back
  const [timeDirection, setTimeDirection] = useState<"forward" | "backward">("forward");

  // Effective time span priority: filterState if custom, otherwise internalSpan
  const effectiveSpan = filterState.timeRange === "custom" ? "custom" : internalSpan;

  const [hoveredEntry, setHoveredEntry] = useState<{
    entry: ProgressEntry;
    x: number;
    y: number;
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Filter entries according to active filterState
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (filterState.selectedProject !== "ALL" && e.project_name !== filterState.selectedProject) {
        return false;
      }
      if (filterState.selectedStatus !== "ALL" && e.status !== filterState.selectedStatus) {
        return false;
      }
      if (filterState.categoryFilter !== "ALL" && e.category !== filterState.categoryFilter) {
        return false;
      }
      if (filterState.onlyKeyEvents && !e.is_key_event) {
        return false;
      }
      if (filterState.searchQuery.trim()) {
        const q = filterState.searchQuery.toLowerCase();
        const match = 
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          (e.project_name && e.project_name.toLowerCase().includes(q)) ||
          e.tags.some((t) => t.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [entries, filterState]);

  // Determine timeline boundary dates (Default start is TODAY)
  const { startDate, endDate, totalDays, monthsList } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let start = new Date(today);
    let end = new Date(today);

    if (effectiveSpan === "custom") {
      if (filterState.customStartDate) {
        const parsedStart = new Date(filterState.customStartDate + "T00:00:00");
        if (!isNaN(parsedStart.getTime())) {
          start = parsedStart;
        }
      } else {
        start = new Date(today);
      }

      if (filterState.customEndDate) {
        const parsedEnd = new Date(filterState.customEndDate + "T23:59:59");
        if (!isNaN(parsedEnd.getTime())) {
          end = parsedEnd;
        }
      } else {
        end = new Date(start);
        end.setMonth(start.getMonth() + 3);
        end.setHours(23, 59, 59, 999);
      }
    } else if (effectiveSpan === "3m") {
      if (timeDirection === "forward") {
        start = new Date(today);
        end = new Date(today);
        end.setMonth(today.getMonth() + 3);
        end.setHours(23, 59, 59, 999);
      } else {
        start = new Date(today);
        start.setMonth(today.getMonth() - 3);
        end = new Date(today);
        end.setHours(23, 59, 59, 999);
      }
    } else if (effectiveSpan === "6m") {
      if (timeDirection === "forward") {
        start = new Date(today);
        end = new Date(today);
        end.setMonth(today.getMonth() + 6);
        end.setHours(23, 59, 59, 999);
      } else {
        start = new Date(today);
        start.setMonth(today.getMonth() - 6);
        end = new Date(today);
        end.setHours(23, 59, 59, 999);
      }
    } else if (effectiveSpan === "1y") {
      if (timeDirection === "forward") {
        start = new Date(today);
        end = new Date(today);
        end.setFullYear(today.getFullYear() + 1);
        end.setHours(23, 59, 59, 999);
      } else {
        start = new Date(today);
        start.setFullYear(today.getFullYear() - 1);
        end = new Date(today);
        end.setHours(23, 59, 59, 999);
      }
    } else if (effectiveSpan === "full") {
      // Find oldest entry date and latest entry date
      let oldest = new Date(today);
      let latest = new Date(today);
      latest.setMonth(today.getMonth() + 6);

      entries.forEach((e) => {
        const d = new Date(e.date + "T00:00:00");
        if (!isNaN(d.getTime())) {
          if (d < oldest) oldest = d;
          if (d > latest) latest = d;
        }
      });

      oldest.setDate(oldest.getDate() - 3);
      latest.setDate(latest.getDate() + 14);
      start = oldest;
      end = latest;
    }

    // If end is before or equal to start, ensure at least 30 days window
    if (end <= start) {
      end = new Date(start);
      end.setDate(start.getDate() + 30);
    }

    const diffTime = Math.max(end.getTime() - start.getTime(), 86400000);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Generate monthly markers
    const months: { label: string; yearMonth: string; offsetPct: number; widthPct: number }[] = [];
    const cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= end) {
      const year = cur.getFullYear();
      const month = cur.getMonth();
      const monthStart = new Date(year, month, 1);
      const nextMonth = new Date(year, month + 1, 1);
      
      const startDayOffset = Math.max(0, Math.floor((monthStart.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      const endDayOffset = Math.min(diffDays, Math.floor((nextMonth.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      
      const offsetPct = (startDayOffset / diffDays) * 100;
      const widthPct = Math.max(0, ((endDayOffset - startDayOffset) / diffDays) * 100);

      const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
      
      if (widthPct > 0.5) {
        const isStartMonth = cur.getFullYear() === start.getFullYear() && cur.getMonth() === start.getMonth() && start.getDate() > 1;
        months.push({
          label: isStartMonth ? `${year}年 ${monthNames[month]} (${start.getDate()}日起)` : `${year}年 ${monthNames[month]}`,
          yearMonth: `${year}-${String(month + 1).padStart(2, "0")}`,
          offsetPct,
          widthPct
        });
      }

      cur.setMonth(cur.getMonth() + 1);
    }

    return {
      startDate: start,
      endDate: end,
      totalDays: diffDays,
      monthsList: months
    };
  }, [effectiveSpan, timeDirection, filterState.customStartDate, filterState.customEndDate, entries]);

  // Convert date string YYYY-MM-DD into horizontal percentage (0% - 100%)
  const getDatePercentage = (dateStr: string): number => {
    const d = new Date(dateStr + "T00:00:00");
    const offsetTime = d.getTime() - startDate.getTime();
    const totalTime = endDate.getTime() - startDate.getTime();
    if (totalTime <= 0) return 0;
    const pct = (offsetTime / totalTime) * 100;
    return Math.max(1.2, Math.min(98.8, pct));
  };

  // Helper to determine specific icon for key event
  const getKeyEventIcon = (entry: ProgressEntry) => {
    const title = entry.title.toLowerCase();
    const tags = entry.tags.map((t) => t.toLowerCase());

    if (title.includes("口試") || tags.includes("口試") || title.includes("畢業") || title.includes("defense")) {
      return <GraduationCap className="w-3.5 h-3.5 text-white" />;
    }
    if (title.includes("投稿") || tags.includes("投稿") || title.includes("論文") || title.includes("paper")) {
      return <FileText className="w-3.5 h-3.5 text-white" />;
    }
    return <Sparkles className="w-3.5 h-3.5 text-white fill-white" />;
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-4">
      {/* Timeline Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#e5e5e0] p-4 rounded-sm text-xs">
        {/* Left: View Span Selector & Direction */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-bold text-slate-700 flex items-center gap-1">
            <Calendar className="w-4 h-4 text-[#004b3a]" />
            時間跨度 (Time Horizon):
          </span>
          <div className="inline-flex rounded-sm bg-[#f8f8f5] p-0.5 border border-[#e5e5e0]">
            {(
              [
                { id: "3m", label: "3 個月" },
                { id: "6m", label: "6 個月 (預設)" },
                { id: "1y", label: "1 年" },
                { id: "full", label: "完整歷程" },
                { id: "custom", label: "自訂區間" }
              ] as { id: TimelineSpan; label: string }[]
            ).map((span) => (
              <button
                key={span.id}
                type="button"
                onClick={() => {
                  setInternalSpan(span.id);
                  if (onFilterStateChange) {
                    if (span.id === "3m") onFilterStateChange({ ...filterState, timeRange: "last_3_months" });
                    else if (span.id === "6m") onFilterStateChange({ ...filterState, timeRange: "last_6_months" });
                    else if (span.id === "1y") onFilterStateChange({ ...filterState, timeRange: "last_year" });
                    else if (span.id === "full") onFilterStateChange({ ...filterState, timeRange: "all" });
                    else if (span.id === "custom") onFilterStateChange({ ...filterState, timeRange: "custom" });
                  }
                }}
                className={`px-3 py-1 rounded-xs font-mono font-medium transition cursor-pointer ${
                  effectiveSpan === span.id
                    ? "bg-[#004b3a] text-white shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {span.label}
              </button>
            ))}
          </div>

          {/* Time Direction Toggle (when not in full history or custom mode) */}
          {effectiveSpan !== "full" && effectiveSpan !== "custom" && (
            <div className="inline-flex rounded-sm bg-[#f8f8f5] p-0.5 border border-[#e5e5e0] items-center text-[11px]">
              <button
                type="button"
                onClick={() => setTimeDirection("forward")}
                className={`px-2 py-0.5 rounded-xs transition font-mono cursor-pointer ${
                  timeDirection === "forward"
                    ? "bg-[#004b3a] text-white font-bold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="起始點默認為當日，往後規劃與追蹤進度"
              >
                從當日起 (預設)
              </button>
              <button
                type="button"
                onClick={() => setTimeDirection("backward")}
                className={`px-2 py-0.5 rounded-xs transition font-mono cursor-pointer ${
                  timeDirection === "backward"
                    ? "bg-[#004b3a] text-white font-bold shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="回溯過去的進度紀錄"
              >
                回溯過去
              </button>
            </div>
          )}

          {/* Today Indicator Tag */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200/80 text-emerald-800 rounded-sm font-mono text-[11px] shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold">
              {effectiveSpan === "full"
                ? "涵蓋全部歷程"
                : timeDirection === "forward"
                ? `起點：當日 (${todayStr})`
                : `終點：當日 (${todayStr})`}
            </span>
          </div>

          {/* Custom Date Range Pickers if custom span selected */}
          {effectiveSpan === "custom" && (
            <div className="flex items-center gap-1 bg-[#f8f8f5] px-2 py-1 rounded-sm border border-[#e5e5e0]">
              <input
                type="date"
                value={filterState.customStartDate || todayStr}
                onChange={(e) => {
                  if (onFilterStateChange) {
                    onFilterStateChange({ ...filterState, timeRange: "custom", customStartDate: e.target.value });
                  }
                }}
                className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700 font-mono focus:outline-none focus:border-[#004b3a]"
                placeholder="開始日期"
              />
              <span className="text-slate-400 text-xs">至</span>
              <input
                type="date"
                value={filterState.customEndDate || ""}
                onChange={(e) => {
                  if (onFilterStateChange) {
                    onFilterStateChange({ ...filterState, timeRange: "custom", customEndDate: e.target.value });
                  }
                }}
                className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs text-slate-700 font-mono focus:outline-none focus:border-[#004b3a]"
                placeholder="結束日期"
              />
              {(filterState.customStartDate || filterState.customEndDate) && (
                <button
                  type="button"
                  onClick={() => {
                    if (onFilterStateChange) {
                      onFilterStateChange({ ...filterState, customStartDate: undefined, customEndDate: undefined });
                    }
                  }}
                  className="text-[10px] text-slate-400 hover:text-slate-600 ml-0.5 px-1 py-0.5 cursor-pointer"
                  title="清除自訂日期"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 flex-wrap text-xs text-slate-600 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-amber-500 ring-4 ring-amber-100 flex items-center justify-center text-white text-[10px]">
              ★
            </span>
            <span className="font-bold text-slate-800 font-sans">關鍵里程碑 (Key Event)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-[#004b3a] ring-2 ring-[#004b3a]/20"></span>
            <span>一般進度更新</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-rose-500 ring-2 ring-rose-100"></span>
            <span>遭遇問題</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 ring-2 ring-emerald-100"></span>
            <span>進度會議</span>
          </div>
        </div>
      </div>

      {/* Timeline Stage */}
      <div 
        ref={containerRef}
        className="bg-white border border-[#e5e5e0] rounded-sm shadow-2xs overflow-x-auto relative"
      >
        <div className="min-w-[960px] relative pb-6 select-none">
          {/* Header Row: Members Column + Date Header Track */}
          <div className="flex border-b border-[#e5e5e0] bg-[#f8f8f5] sticky top-0 z-20">
            {/* Sticky Left: Member Column Title */}
            <div className="w-64 p-3.5 border-r border-[#e5e5e0] font-serif font-bold text-slate-700 text-xs shrink-0 flex items-center justify-between">
              <span>實驗室成員軌道 ({members.length})</span>
              <span className="text-[10px] text-slate-400 font-mono">按行排列</span>
            </div>

            {/* Time Scales */}
            <div className="flex-1 relative h-12">
              {monthsList.map((m, idx) => (
                <div
                  key={idx}
                  style={{ left: `${m.offsetPct}%`, width: `${m.widthPct}%` }}
                  className="absolute top-0 bottom-0 border-l border-[#e5e5e0] px-2 py-1.5 flex flex-col justify-center"
                >
                  <span className="font-serif font-bold text-slate-800 text-xs truncate">
                    {m.label}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {m.yearMonth}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Today's Vertical Marker Line */}
          {(() => {
            const todayD = new Date(todayStr + "T00:00:00");
            const totalTime = endDate.getTime() - startDate.getTime();
            if (totalTime <= 0) return null;
            const todayOffset = todayD.getTime() - startDate.getTime();
            const todayPct = (todayOffset / totalTime) * 100;

            if (todayPct < -1 || todayPct > 101) return null;
            const clampedPct = Math.max(0, Math.min(100, todayPct));

            return (
              <div
                style={{ left: `calc(16rem + (100% - 16rem) * ${clampedPct / 100})` }}
                className="absolute top-0 bottom-0 w-px bg-rose-500/90 z-20 pointer-events-none"
              >
                <div className={`sticky top-12 ${clampedPct < 6 ? "ml-1" : "-ml-6"} px-1.5 py-0.5 bg-rose-500 text-white rounded-xs text-[9.5px] font-mono font-bold shadow-xs whitespace-nowrap`}>
                  今日 TODAY ({todayStr.slice(5)})
                </div>
              </div>
            );
          })()}

          {/* Rows: One track per member */}
          <div className="divide-y divide-[#e5e5e0]">
            {members.map((member) => {
              const memberEntries = filteredEntries.filter((e) => {
                if (e.member_id !== member.id) return false;
                const d = new Date(e.date + "T00:00:00");
                return d >= startDate && d <= endDate;
              });
              const keyCount = memberEntries.filter((e) => e.is_key_event).length;

              return (
                <div
                  key={member.id}
                  className="flex items-stretch hover:bg-slate-50/50 transition-colors group min-h-[72px]"
                >
                  {/* Left Column: Member Card */}
                  <div className="w-64 p-3.5 border-r border-[#e5e5e0] bg-[#fdfdfc] shrink-0 flex items-center justify-between gap-2 z-10 shadow-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-sm bg-[#004b3a]/10 text-[#004b3a] border border-[#004b3a]/25 flex items-center justify-center font-bold text-xs shrink-0 font-serif">
                        {member.name_zh.slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1 truncate">
                          <span className="font-bold text-slate-800 text-xs font-serif truncate">
                            {member.name_zh}
                          </span>
                          <span className="text-[10px] text-slate-400 font-sans truncate">
                            ({member.name_en})
                          </span>
                        </div>
                        <p className="text-[10px] text-[#8d734a] font-mono truncate">
                          {member.role} {member.is_external ? `[${member.role_type || "在職生"}]` : ""}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onAddEntry(member.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 bg-[#004b3a] hover:bg-[#003328] text-white rounded-sm transition shrink-0"
                      title={`為 ${member.name_zh} 新增進度`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Right Track: Horizontal timeline bar */}
                  <div
                    onClick={(e) => {
                      // Clicking blank track prompts add entry
                      if (e.target === e.currentTarget) {
                        onAddEntry(member.id);
                      }
                    }}
                    className="flex-1 relative py-4 px-2 flex items-center cursor-crosshair"
                    title="點擊時間軸任意空白處可為此成員新增進度紀錄"
                  >
                    {/* Background Month Grid Lines */}
                    {monthsList.map((m, idx) => (
                      <div
                        key={idx}
                        style={{ left: `${m.offsetPct}%` }}
                        className="absolute top-0 bottom-0 border-l border-dashed border-[#e5e5e0]/70 pointer-events-none"
                      />
                    ))}

                    {/* Central Member Track Line */}
                    <div className="absolute left-0 right-0 h-0.5 bg-[#e5e5e0] pointer-events-none" />

                    {/* Empty placeholder if no entries */}
                    {memberEntries.length === 0 && (
                      <span className="text-[10.5px] text-slate-400 font-mono italic pl-4 pointer-events-none">
                        （此區間無紀錄，點選軌道以新增）
                      </span>
                    )}

                    {/* Markers for each entry on this member's row */}
                    {memberEntries.map((entry) => {
                      const pct = getDatePercentage(entry.date);
                      const isKey = entry.is_key_event;
                      const catCfg = CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG.other;

                      return (
                        <div
                          key={entry.id}
                          style={{ left: `${pct}%` }}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredEntry({
                              entry,
                              x: rect.left + rect.width / 2,
                              y: rect.top
                            });
                          }}
                          onMouseLeave={() => setHoveredEntry(null)}
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewEntryDetail(entry);
                          }}
                          className={`absolute -translate-x-1/2 cursor-pointer transition-transform hover:scale-125 z-10 flex items-center justify-center ${
                            isKey ? "-translate-y-1/2" : "-translate-y-1/2"
                          }`}
                        >
                          {isKey ? (
                            /* Prominent Key Milestone Marker */
                            <div className="relative group/marker">
                              <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md ring-4 ring-amber-200/80 animate-pulse">
                                {getKeyEventIcon(entry)}
                              </div>
                              {/* Date label pinned below */}
                              <span className="absolute top-8 -translate-x-1/2 left-1/2 text-[9.5px] font-bold font-mono text-amber-900 bg-amber-50 px-1 py-0.2 rounded-xs border border-amber-300 shadow-2xs whitespace-nowrap pointer-events-none">
                                {entry.date.slice(5)}
                              </span>
                            </div>
                          ) : (
                            /* Refined Regular Update Dot */
                            <div className="relative group/marker">
                              <div
                                className={`w-3.5 h-3.5 rounded-full ${catCfg.dotBg} border-2 border-white shadow-xs transition-colors`}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Hover Tooltip */}
      {hoveredEntry && (
        <div
          style={{
            position: "fixed",
            left: `${hoveredEntry.x}px`,
            top: `${hoveredEntry.y - 12}px`,
            transform: "translate(-50%, -100%)",
            zIndex: 9999
          }}
          className="pointer-events-none animate-in fade-in zoom-in-95 duration-100 w-72 bg-[#1a1a1a] text-white p-3 rounded-sm shadow-xl text-xs space-y-1.5"
        >
          <div className="flex items-center justify-between border-b border-white/20 pb-1.5">
            <span className="font-mono text-amber-300 font-bold text-[11px]">
              {hoveredEntry.entry.date}
            </span>
            <span className="px-1.5 py-0.2 rounded-xs bg-white/20 text-[10px] font-mono">
              {CATEGORY_CONFIG[hoveredEntry.entry.category]?.label || hoveredEntry.entry.category}
            </span>
          </div>

          <p className="font-serif font-bold text-sm leading-snug">
            {hoveredEntry.entry.title}
          </p>

          {hoveredEntry.entry.description && (
            <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
              {hoveredEntry.entry.description}
            </p>
          )}

          <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 font-mono">
            {hoveredEntry.entry.project_name && (
              <span className="truncate text-amber-200">
                📁 {hoveredEntry.entry.project_name}
              </span>
            )}
            <span className="text-right shrink-0">點擊檢視完整細節</span>
          </div>
        </div>
      )}
    </div>
  );
}
