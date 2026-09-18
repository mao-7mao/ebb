import React, { useState, useEffect, useMemo } from "react";
import { 
  X, 
  FileText, 
  Download, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Plus, 
  Trash2, 
  Sparkles,
  ArrowRight,
  ListTodo,
  MessageSquare
} from "lucide-react";
import { 
  CalendarEntry, 
  CalendarEntryPriority, 
  WeeklyReportConfig,
  LAB_PROJECT_OPTIONS 
} from "../../types/calendarLog";
import { generateWeeklyReportPptx } from "../../services/pptxWeeklyReportService";

interface WeeklyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: CalendarEntry[];
}

export default function WeeklyReportModal({
  isOpen,
  onClose,
  entries
}: WeeklyReportModalProps) {
  // Helper to calculate Monday of given date
  const getMondayOfDate = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };

  const today = new Date();
  const currentMonday = getMondayOfDate(today);

  // States
  const [selectedMonday, setSelectedMonday] = useState<Date>(currentMonday);
  const [authorName, setAuthorName] = useState(() => {
    return localStorage.getItem("ebblab_report_author") || "EBB Lab 研究生";
  });
  const [labName, setLabName] = useState("國立臺灣大學 綠色生質生物精煉實驗室 (EBB Lab)");
  const [reportTitle, setReportTitle] = useState("研究生每週研究進度與工作週報");
  const [includeNextWeek, setIncludeNextWeek] = useState(true);
  const [includeReflection, setIncludeReflection] = useState(true);
  const [reflectionNote, setReflectionNote] = useState(
    "1. 本週完成階段性高分子合成試驗與分析檢測，再現性高。\n2. 遭遇問題：高溫固相聚合過程中真空度微幅波動，已安排抽氣設備檢修。\n3. 下週組會討論事項：建議與指導教授確認下階段期刊投稿目標排程與核心圖表編排。"
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFileName, setGeneratedFileName] = useState<string | null>(null);

  // Custom next week tasks
  const [nextWeekTasks, setNextWeekTasks] = useState<Array<{
    title: string;
    project_name?: string;
    priority: CalendarEntryPriority;
    note?: string;
  }>>([]);

  // Compute week start & end (Monday to Sunday)
  const weekStartDate = useMemo(() => {
    return selectedMonday.toISOString().split("T")[0];
  }, [selectedMonday]);

  const weekEndDate = useMemo(() => {
    const sunday = new Date(selectedMonday);
    sunday.setDate(sunday.getDate() + 6);
    return sunday.toISOString().split("T")[0];
  }, [selectedMonday]);

  // Compute next week start & end
  const nextWeekStartDate = useMemo(() => {
    const nextMon = new Date(selectedMonday);
    nextMon.setDate(nextMon.getDate() + 7);
    return nextMon.toISOString().split("T")[0];
  }, [selectedMonday]);

  const nextWeekEndDate = useMemo(() => {
    const nextSun = new Date(selectedMonday);
    nextSun.setDate(nextSun.getDate() + 13);
    return nextSun.toISOString().split("T")[0];
  }, [selectedMonday]);

  // Entries for current selected week
  const weekEntries = useMemo(() => {
    return entries.filter((e) => {
      const d = e.date;
      return d >= weekStartDate && d <= weekEndDate;
    });
  }, [entries, weekStartDate, weekEndDate]);

  // Prepopulate next week tasks from calendar
  useEffect(() => {
    if (!isOpen) return;

    const calendarNextWeekItems = entries.filter((e) => {
      return e.date >= nextWeekStartDate && e.date <= nextWeekEndDate;
    });

    if (calendarNextWeekItems.length > 0) {
      setNextWeekTasks(
        calendarNextWeekItems.map((item) => ({
          title: item.title,
          project_name: item.project_name || "PEF",
          priority: item.priority || "normal",
          note: item.description ? item.description.slice(0, 50) : "推進排程事項"
        }))
      );
    } else {
      setNextWeekTasks([
        {
          title: "PEF 固相聚合 (SSP) 連續 24hr 製程試驗",
          project_name: "PEF",
          priority: "high",
          note: "提升高分子本徵黏度 IV > 0.85 dL/g"
        },
        {
          title: "ACS Sustainable Chemistry 期刊 Manuscript 投稿格式編排",
          project_name: "PEF",
          priority: "high",
          note: "完成 Supporting Information 補充數據圖表整理"
        },
        {
          title: "5-HMF 減壓精餾產物純化與溶劑回收試驗",
          project_name: "5-HMF",
          priority: "normal",
          note: "分析不同回流比之純度表現"
        }
      ]);
    }
  }, [isOpen, nextWeekStartDate, nextWeekEndDate, entries]);

  if (!isOpen) return null;

  const handleSelectWeek = (offsetWeeks: number) => {
    const baseMonday = getMondayOfDate(new Date());
    baseMonday.setDate(baseMonday.getDate() + offsetWeeks * 7);
    setSelectedMonday(baseMonday);
    setGeneratedFileName(null);
  };

  const handleAddTask = () => {
    setNextWeekTasks((prev) => [
      ...prev,
      {
        title: "新待辦研究工作項目",
        project_name: "PEF",
        priority: "normal",
        note: "依計畫期程推進"
      }
    ]);
  };

  const handleRemoveTask = (idx: number) => {
    setNextWeekTasks((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateTask = (idx: number, field: string, value: any) => {
    setNextWeekTasks((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      localStorage.setItem("ebblab_report_author", authorName);

      const config: WeeklyReportConfig = {
        weekStartDate,
        weekEndDate,
        authorName: authorName.trim() || "實驗室研究生",
        labName: labName.trim(),
        reportTitle: reportTitle.trim(),
        includeNextWeek,
        includeReflection,
        reflectionNote,
        nextWeekTasks
      };

      const fileName = await generateWeeklyReportPptx(config, weekEntries);
      setGeneratedFileName(fileName);
    } catch (err: any) {
      console.error("PPTX Generation error:", err);
      alert(`週報生成失敗：${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-2xl border border-[#e5e5e0] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#1b4372] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-sm bg-white/10 text-amber-200">
              <FileText className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-sm font-serif">
                每週研究進度週報生成 (PowerPoint .pptx)
              </h3>
              <p className="text-[11px] text-blue-200/80 font-mono">
                週期：{weekStartDate} ～ {weekEndDate} · EBB Lab 規範版型
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

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Quick Week Selectors */}
          <div className="bg-[#f8f8f5] p-3 rounded-sm border border-[#e5e5e0] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#1b4372]" />
                <span>週報週期選擇 (Week Range)</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                週一至週日 (Mon – Sun)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleSelectWeek(-1)}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-[#e5e5e0] rounded-sm text-xs font-bold text-slate-700 cursor-pointer shadow-2xs"
              >
                ← 上週週報
              </button>
              <button
                type="button"
                onClick={() => handleSelectWeek(0)}
                className="px-3 py-1.5 bg-[#1b4372] text-white rounded-sm text-xs font-bold cursor-pointer shadow-2xs"
              >
                ★ 本週週報 ({weekStartDate} ~ {weekEndDate})
              </button>
              <button
                type="button"
                onClick={() => handleSelectWeek(1)}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-[#e5e5e0] rounded-sm text-xs font-bold text-slate-700 cursor-pointer shadow-2xs"
              >
                下週預排 →
              </button>
            </div>
          </div>

          {/* Author and Title Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                報告人姓名 (Author / Presenter) *
              </label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="例如：林郁芳 (Fanny) / 陳采翎..."
                className="w-full bg-white border border-[#e5e5e0] rounded-sm px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-[#1b4372]"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                週報簡報標題 (Slide Title)
              </label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                className="w-full bg-white border border-[#e5e5e0] rounded-sm px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-[#1b4372]"
              />
            </div>
          </div>

          {/* Weekly Summary Preview Box */}
          <div className="border border-[#e5e5e0] rounded-sm p-3.5 bg-white space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>本週完成事項清單 (共 {weekEntries.length} 筆已登錄事項)</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                已自動匯入投影片
              </span>
            </div>

            {weekEntries.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic py-2">
                本週週期尚無任何月曆紀錄，請先在月曆上新增事項。
              </p>
            ) : (
              <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 pr-1 space-y-1">
                {weekEntries.map((e) => (
                  <div key={e.id} className="py-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {e.date.slice(5)}
                      </span>
                      <span className="font-semibold text-slate-700 truncate">
                        {e.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] bg-[#f8f8f5] text-slate-600 border border-[#e5e5e0] px-1.5 py-0.2 rounded">
                        {e.project_name || "無專案"}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-bold">
                        {e.status === "done" ? "✓ 完成" : "⏳ 進行中"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Next Week Planning Section */}
          <div className="border border-[#e5e5e0] rounded-sm p-3.5 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeNextWeek}
                  onChange={(e) => setIncludeNextWeek(e.target.checked)}
                  className="rounded-xs text-[#1b4372]"
                />
                <ListTodo className="w-3.5 h-3.5 text-[#8d734a]" />
                <span>包含「下週待辦與目標規劃」投影片頁面</span>
              </label>
              {includeNextWeek && (
                <button
                  type="button"
                  onClick={handleAddTask}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1b4372] hover:underline cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>+ 新增待辦項目</span>
                </button>
              )}
            </div>

            {includeNextWeek && (
              <div className="space-y-2">
                {nextWeekTasks.map((task, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-[#f8f8f5] rounded-sm border border-[#e5e5e0] flex items-center gap-2"
                  >
                    <select
                      value={task.priority}
                      onChange={(e) => handleUpdateTask(idx, "priority", e.target.value)}
                      className="bg-white border border-[#e5e5e0] rounded-xs px-2 py-1 text-[11px] font-bold"
                    >
                      <option value="high">🔴 高</option>
                      <option value="normal">🟡 中</option>
                      <option value="low">🟢 低</option>
                    </select>

                    <select
                      value={task.project_name}
                      onChange={(e) => handleUpdateTask(idx, "project_name", e.target.value)}
                      className="bg-white border border-[#e5e5e0] rounded-xs px-2 py-1 text-[11px]"
                    >
                      {LAB_PROJECT_OPTIONS.map((p) => (
                        <option key={p.id} value={p.shortName}>
                          {p.shortName}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      value={task.title}
                      onChange={(e) => handleUpdateTask(idx, "title", e.target.value)}
                      placeholder="待辦事項標題..."
                      className="flex-1 bg-white border border-[#e5e5e0] rounded-xs px-2 py-1 text-xs"
                    />

                    <input
                      type="text"
                      value={task.note || ""}
                      onChange={(e) => handleUpdateTask(idx, "note", e.target.value)}
                      placeholder="目標說明 / 備註..."
                      className="w-1/3 bg-white border border-[#e5e5e0] rounded-xs px-2 py-1 text-xs hidden sm:block"
                    />

                    <button
                      type="button"
                      onClick={() => handleRemoveTask(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reflection / Discussion Notes */}
          <div className="border border-[#e5e5e0] rounded-sm p-3.5 bg-white space-y-2">
            <label className="font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeReflection}
                onChange={(e) => setIncludeReflection(e.target.checked)}
                className="rounded-xs text-[#1b4372]"
              />
              <MessageSquare className="w-3.5 h-3.5 text-[#1b4372]" />
              <span>包含「心得反思與組會討論議題」投影片頁面</span>
            </label>

            {includeReflection && (
              <textarea
                value={reflectionNote}
                onChange={(e) => setReflectionNote(e.target.value)}
                rows={3}
                placeholder="記錄本週遭遇瓶頸、器材問題、文獻研讀收穫、或欲向教授請益之議題..."
                className="w-full bg-[#f8f8f5] border border-[#e5e5e0] rounded-sm p-2.5 text-xs font-sans leading-relaxed"
              />
            )}
          </div>

          {/* Success Banner if Downloaded */}
          {generatedFileName && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-sm flex items-center justify-between text-emerald-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-xs">
                  週報已成功生成並下載：{generatedFileName}
                </span>
              </div>
              <span className="text-[11px] text-emerald-600 font-mono">16:9 投影片格式</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#f8f8f5] border-t border-[#e5e5e0] flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 font-mono">
            EBB Lab 週報規範模板 · pptxgenjs
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-sm transition cursor-pointer"
            >
              關閉
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-5 py-2 text-xs font-bold text-white bg-[#1b4372] hover:bg-[#122e4f] disabled:bg-slate-400 rounded-sm shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>PPTX 生成中...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-amber-300" />
                  <span>生成並下載週報 (.pptx)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
