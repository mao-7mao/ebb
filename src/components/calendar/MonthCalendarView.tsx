import React, { useState } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Calendar as CalendarIcon, 
  Filter,
  Tag
} from "lucide-react";
import { CalendarEntry, TAG_COLORS } from "../../types/calendarLog";

interface MonthCalendarViewProps {
  entries: CalendarEntry[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onOpenEntryForm: (entry?: CalendarEntry, defaultDate?: string) => void;
  onToggleStatus: (id: string) => void;
  selectedProject: string;
  selectedTag: string;
}

export default function MonthCalendarView({
  entries,
  currentDate,
  onDateChange,
  onOpenEntryForm,
  onToggleStatus,
  selectedProject,
  selectedTag
}: MonthCalendarViewProps) {
  const [selectedDayEntries, setSelectedDayEntries] = useState<{ date: string; items: CalendarEntry[] } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11

  const prevMonth = () => {
    onDateChange(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    onDateChange(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    onDateChange(new Date());
  };

  // Calendar calculations
  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const todayStr = new Date().toISOString().split("T")[0];

  // Build 35 or 42 grid cells
  const calendarCells: Array<{
    dateStr: string;
    dayNum: number;
    isCurrentMonth: boolean;
    isToday: boolean;
  }> = [];

  // 1. Previous month trailing days
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const m = month === 0 ? 12 : month;
    const y = month === 0 ? year - 1 : year;
    const dStr = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    calendarCells.push({
      dateStr: dStr,
      dayNum: day,
      isCurrentMonth: false,
      isToday: dStr === todayStr
    });
  }

  // 2. Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    calendarCells.push({
      dateStr: dStr,
      dayNum: day,
      isCurrentMonth: true,
      isToday: dStr === todayStr
    });
  }

  // 3. Next month leading days to complete full weeks
  const remainingCells = 42 - calendarCells.length;
  for (let day = 1; day <= remainingCells && calendarCells.length < 42; day++) {
    const m = month === 11 ? 1 : month + 2;
    const y = month === 11 ? year + 1 : year;
    const dStr = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    calendarCells.push({
      dateStr: dStr,
      dayNum: day,
      isCurrentMonth: false,
      isToday: dStr === todayStr
    });
  }

  // Filter entries
  const filteredEntries = entries.filter((e) => {
    if (selectedProject !== "ALL" && e.project_name !== selectedProject) return false;
    if (selectedTag !== "ALL" && !e.tags?.includes(selectedTag)) return false;
    return true;
  });

  // Map entries by date
  const entriesByDate: Record<string, CalendarEntry[]> = {};
  filteredEntries.forEach((entry) => {
    const d = entry.date;
    if (!entriesByDate[d]) entriesByDate[d] = [];
    entriesByDate[d].push(entry);

    // Multi-day events handling
    if (entry.end_date && entry.end_date !== entry.date) {
      let cur = new Date(entry.date);
      const endD = new Date(entry.end_date);
      cur.setDate(cur.getDate() + 1);
      while (cur <= endD) {
        const curStr = cur.toISOString().split("T")[0];
        if (!entriesByDate[curStr]) entriesByDate[curStr] = [];
        // Avoid duplicate
        if (!entriesByDate[curStr].some((x) => x.id === entry.id)) {
          entriesByDate[curStr].push(entry);
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
  });

  const weekDayLabels = ["週日 (Sun)", "週一 (Mon)", "週二 (Tue)", "週三 (Wed)", "週四 (Thu)", "週五 (Fri)", "週六 (Sat)"];

  return (
    <div className="space-y-4">
      {/* Month Navigation Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-sm border border-[#e5e5e0] shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-sm bg-[#1b4372] text-white">
            <CalendarIcon className="w-4 h-4" />
          </span>
          <div>
            <h2 className="text-lg md:text-xl font-bold font-serif text-[#1a1a1a]">
              {year} 年 {month + 1} 月
            </h2>
            <p className="text-[11px] text-slate-500 font-sans">
              EBB Lab 每日工作成果與實驗事項紀錄 · 共 {filteredEntries.length} 筆已登錄
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1.5 bg-[#f8f8f5] hover:bg-[#eae6dc] text-slate-700 border border-[#e5e5e0] rounded-sm transition cursor-pointer"
            title="上個月"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={goToToday}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-[#e5e5e0] rounded-sm text-xs font-bold font-sans transition cursor-pointer shadow-2xs"
          >
            今天 (Today)
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1.5 bg-[#f8f8f5] hover:bg-[#eae6dc] text-slate-700 border border-[#e5e5e0] rounded-sm transition cursor-pointer"
            title="下個月"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="bg-white rounded-sm border border-[#e5e5e0] overflow-hidden shadow-xs">
        {/* Day of week header */}
        <div className="grid grid-cols-7 border-b border-[#e5e5e0] bg-[#f8f8f5] text-center text-xs font-bold text-slate-600 font-serif">
          {weekDayLabels.map((label, idx) => (
            <div 
              key={label} 
              className={`py-2.5 border-r border-[#e5e5e0] last:border-r-0 ${
                idx === 0 || idx === 6 ? "text-amber-800 bg-[#f4f1ea]/50" : ""
              }`}
            >
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{label.slice(0, 2)}</span>
            </div>
          ))}
        </div>

        {/* Calendar Day Cells */}
        <div className="grid grid-cols-7 divide-y divide-x divide-[#e5e5e0] bg-slate-100">
          {calendarCells.map((cell) => {
            const cellEntries = entriesByDate[cell.dateStr] || [];
            const doneCount = cellEntries.filter((e) => e.status === "done").length;
            const inProgCount = cellEntries.filter((e) => e.status === "in_progress").length;

            return (
              <div
                key={cell.dateStr}
                className={`min-h-[110px] md:min-h-[135px] p-1.5 md:p-2 bg-white flex flex-col transition-colors group relative ${
                  !cell.isCurrentMonth ? "bg-slate-50/70 text-slate-400" : ""
                } ${cell.isToday ? "ring-2 ring-inset ring-[#1b4372]" : ""}`}
              >
                {/* Cell Header: Day number + Add action */}
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-mono font-bold ${
                      cell.isToday
                        ? "bg-[#1b4372] text-white"
                        : cell.isCurrentMonth
                        ? "text-slate-800"
                        : "text-slate-400"
                    }`}
                  >
                    {cell.dayNum}
                  </span>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => onOpenEntryForm(undefined, cell.dateStr)}
                      className="p-1 rounded bg-[#f4f1ea] hover:bg-[#eae6dc] text-[#1b4372] text-[10px] transition cursor-pointer"
                      title="在此日期新增事項"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Day Summary Badges (Mobile / compact) */}
                {cellEntries.length > 0 && (
                  <div className="flex items-center gap-1 mb-1 md:hidden">
                    {doneCount > 0 && (
                      <span className="text-[10px] font-mono px-1 py-0.2 bg-emerald-100 text-emerald-800 rounded">
                        ✓{doneCount}
                      </span>
                    )}
                    {inProgCount > 0 && (
                      <span className="text-[10px] font-mono px-1 py-0.2 bg-amber-100 text-amber-800 rounded">
                        ⏳{inProgCount}
                      </span>
                    )}
                  </div>
                )}

                {/* Task Pills on Desktop */}
                <div className="flex-1 space-y-1 overflow-y-auto max-h-[85px] md:max-h-[95px] pr-0.5">
                  {cellEntries.slice(0, 3).map((entry) => {
                    const primaryTag = entry.tags?.[0] || "實驗";
                    const tagStyle = TAG_COLORS[primaryTag] || { bg: "bg-slate-100", text: "text-slate-800", dot: "bg-slate-400" };
                    const isDone = entry.status === "done";

                    return (
                      <div
                        key={entry.id}
                        onClick={() => onOpenEntryForm(entry)}
                        className={`group/item flex items-center justify-between gap-1 px-1.5 py-1 rounded-xs border text-[11px] font-medium leading-tight cursor-pointer transition shadow-2xs ${
                          isDone
                            ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                            : "bg-amber-50/60 border-amber-200 text-amber-950 hover:bg-amber-100/70"
                        }`}
                        title={`${entry.title} (${entry.project_name || "無專案"})`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tagStyle.dot}`} />
                          <span className={`truncate text-[10.5px] ${isDone ? "line-through text-slate-500" : ""}`}>
                            {entry.title}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleStatus(entry.id);
                          }}
                          className="shrink-0 text-slate-400 hover:text-[#1b4372] p-0.5"
                          title={isDone ? "標記為進行中" : "標記為已完成"}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Clock className="w-3 h-3 text-amber-600" />
                          )}
                        </button>
                      </div>
                    );
                  })}

                  {cellEntries.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setSelectedDayEntries({ date: cell.dateStr, items: cellEntries })}
                      className="w-full text-center text-[10px] font-bold text-[#1b4372] hover:underline bg-[#f8f8f5] py-0.5 rounded cursor-pointer"
                    >
                      + 還有 {cellEntries.length - 3} 項...
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expanded Day Details Modal */}
      {selectedDayEntries && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-lg shadow-2xl border border-[#e5e5e0] overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-[#1b4372] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-amber-200" />
                <h3 className="font-bold text-sm font-serif">
                  {selectedDayEntries.date} 當日所有工作事項 ({selectedDayEntries.items.length} 筆)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayEntries(null)}
                className="text-white/70 hover:text-white text-xs font-bold"
              >
                關閉
              </button>
            </div>

            <div className="p-6 space-y-3 overflow-y-auto flex-1">
              {selectedDayEntries.items.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => {
                    setSelectedDayEntries(null);
                    onOpenEntryForm(entry);
                  }}
                  className="p-3 bg-[#f8f8f5] hover:bg-[#eae6dc]/60 rounded-sm border border-[#e5e5e0] cursor-pointer transition space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      {entry.status === "done" ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                      )}
                      <span>{entry.title}</span>
                    </span>
                    <span className="text-[10px] font-mono font-bold text-[#1b4372] bg-white px-2 py-0.5 rounded border border-[#e5e5e0]">
                      {entry.project_name || "無專案"}
                    </span>
                  </div>
                  {entry.description && (
                    <p className="text-[11px] text-slate-600 line-clamp-2">
                      {entry.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    {(entry.tags || []).map((t) => (
                      <span key={t} className="text-[10px] bg-white text-slate-600 border border-[#e5e5e0] px-1.5 py-0.2 rounded">
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-3 bg-[#f8f8f5] border-t border-[#e5e5e0] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const d = selectedDayEntries.date;
                  setSelectedDayEntries(null);
                  onOpenEntryForm(undefined, d);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1b4372] hover:bg-[#122e4f] text-white rounded-sm text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>在此日新增事項</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedDayEntries(null)}
                className="px-4 py-1.5 bg-white text-slate-700 border border-[#e5e5e0] rounded-sm text-xs font-bold cursor-pointer"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
