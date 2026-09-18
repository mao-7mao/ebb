import React from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Tag, 
  FolderGit2, 
  Flag 
} from "lucide-react";
import { CalendarEntry, TAG_COLORS } from "../../types/calendarLog";

interface WeekCalendarViewProps {
  entries: CalendarEntry[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onOpenEntryForm: (entry?: CalendarEntry, defaultDate?: string) => void;
  onToggleStatus: (id: string) => void;
  selectedProject: string;
  selectedTag: string;
}

export default function WeekCalendarView({
  entries,
  currentDate,
  onDateChange,
  onOpenEntryForm,
  onToggleStatus,
  selectedProject,
  selectedTag
}: WeekCalendarViewProps) {
  // Calculate Monday of current week
  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(date.setDate(diff));
  };

  const monday = getMonday(currentDate);

  const prevWeek = () => {
    const d = new Date(monday);
    d.setDate(d.getDate() - 7);
    onDateChange(d);
  };

  const nextWeek = () => {
    const d = new Date(monday);
    d.setDate(d.getDate() + 7);
    onDateChange(d);
  };

  const goToThisWeek = () => {
    onDateChange(new Date());
  };

  // Generate 7 days (Mon to Sun)
  const weekDays: Array<{
    dateStr: string;
    dayNum: number;
    monthNum: number;
    weekdayName: string;
    isToday: boolean;
  }> = [];

  const dayNames = ["週一 (Mon)", "週二 (Tue)", "週三 (Wed)", "週四 (Thu)", "週五 (Fri)", "週六 (Sat)", "週日 (Sun)"];
  const todayStr = new Date().toISOString().split("T")[0];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const dStr = d.toISOString().split("T")[0];
    weekDays.push({
      dateStr: dStr,
      dayNum: d.getDate(),
      monthNum: d.getMonth() + 1,
      weekdayName: dayNames[i],
      isToday: dStr === todayStr
    });
  }

  const weekStartStr = weekDays[0].dateStr;
  const weekEndStr = weekDays[6].dateStr;

  // Filter entries
  const filteredEntries = entries.filter((e) => {
    if (selectedProject !== "ALL" && e.project_name !== selectedProject) return false;
    if (selectedTag !== "ALL" && !e.tags?.includes(selectedTag)) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Week Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-sm border border-[#e5e5e0] shadow-xs">
        <div>
          <h2 className="text-lg md:text-xl font-bold font-serif text-[#1a1a1a]">
            週檢視：{weekStartStr} ～ {weekEndStr}
          </h2>
          <p className="text-[11px] text-slate-500 font-sans">
            單週工作與實驗排程進度一覽 · 聚焦精準排程
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={prevWeek}
            className="p-1.5 bg-[#f8f8f5] hover:bg-[#eae6dc] text-slate-700 border border-[#e5e5e0] rounded-sm transition cursor-pointer"
            title="上一週"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={goToThisWeek}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-[#e5e5e0] rounded-sm text-xs font-bold font-sans transition cursor-pointer shadow-2xs"
          >
            本週 (This Week)
          </button>
          <button
            type="button"
            onClick={nextWeek}
            className="p-1.5 bg-[#f8f8f5] hover:bg-[#eae6dc] text-slate-700 border border-[#e5e5e0] rounded-sm transition cursor-pointer"
            title="下一週"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 7 Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {weekDays.map((day) => {
          const dayEntries = filteredEntries.filter(
            (e) => e.date === day.dateStr || (e.end_date && e.date <= day.dateStr && e.end_date >= day.dateStr)
          );

          return (
            <div
              key={day.dateStr}
              className={`bg-white rounded-sm border flex flex-col min-h-[360px] shadow-xs ${
                day.isToday ? "border-[#1b4372] ring-1 ring-[#1b4372]" : "border-[#e5e5e0]"
              }`}
            >
              {/* Day Header */}
              <div
                className={`p-3 border-b flex items-center justify-between ${
                  day.isToday ? "bg-blue-50/70 border-blue-200" : "bg-[#f8f8f5] border-[#e5e5e0]"
                }`}
              >
                <div>
                  <span className="text-[11px] font-serif font-bold text-slate-600 block">
                    {day.weekdayName}
                  </span>
                  <span
                    className={`text-sm font-mono font-bold ${
                      day.isToday ? "text-[#1b4372]" : "text-slate-800"
                    }`}
                  >
                    {day.monthNum}/{day.dayNum}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenEntryForm(undefined, day.dateStr)}
                  className="p-1 rounded-sm bg-white hover:bg-[#eae6dc] text-[#1b4372] border border-[#e5e5e0] transition cursor-pointer"
                  title="新增當日事項"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Tasks List */}
              <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                {dayEntries.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center p-4">
                    <span className="text-[11px] text-slate-300">無事項</span>
                  </div>
                ) : (
                  dayEntries.map((entry) => {
                    const isDone = entry.status === "done";
                    const primaryTag = entry.tags?.[0] || "實驗";
                    const tagDef = TAG_COLORS[primaryTag] || { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200", dot: "bg-slate-400" };

                    return (
                      <div
                        key={entry.id}
                        onClick={() => onOpenEntryForm(entry)}
                        className={`p-2.5 rounded-sm border transition cursor-pointer hover:shadow-xs space-y-1.5 ${
                          isDone
                            ? "bg-slate-50/80 border-slate-200 text-slate-600"
                            : "bg-amber-50/40 border-amber-200/80 text-amber-950"
                        }`}
                      >
                        {/* Status + Title */}
                        <div className="flex items-start justify-between gap-1.5">
                          <span
                            className={`text-xs font-bold leading-snug flex-1 ${
                              isDone ? "line-through text-slate-500" : "text-slate-800"
                            }`}
                          >
                            {entry.title}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleStatus(entry.id);
                            }}
                            className="p-0.5 text-slate-400 hover:text-[#1b4372] shrink-0"
                            title={isDone ? "改為進行中" : "標記為已完成"}
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Clock className="w-4 h-4 text-amber-600" />
                            )}
                          </button>
                        </div>

                        {/* Project + Tag Badge */}
                        <div className="flex flex-wrap items-center gap-1">
                          {entry.project_name && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold bg-[#1b4372]/10 text-[#1b4372]">
                              {entry.project_name}
                            </span>
                          )}
                          <span className={`text-[10px] px-1.5 py-0.2 rounded border ${tagDef.bg} ${tagDef.text} ${tagDef.border}`}>
                            {primaryTag}
                          </span>
                        </div>

                        {/* Description snippet */}
                        {entry.description && (
                          <p className="text-[10.5px] text-slate-500 line-clamp-2 leading-relaxed">
                            {entry.description}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
