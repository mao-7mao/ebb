import React from "react";
import { 
  ProgressEntry, 
  CombinedMember, 
  ProgressStatus, 
  ProgressFilterState 
} from "../../types/progress";
import { STATUS_CONFIG, CATEGORY_CONFIG } from "../../data/initialProgressData";
import { 
  Sparkles, 
  Plus, 
  Calendar, 
  FolderGit2, 
  Tag, 
  Paperclip, 
  User, 
  Edit3, 
  Trash2 
} from "lucide-react";

interface ProgressKanbanViewProps {
  members: CombinedMember[];
  entries: ProgressEntry[];
  filterState: ProgressFilterState;
  onAddEntry: (memberId?: string) => void;
  onEditEntry: (entry: ProgressEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  onViewEntryDetail: (entry: ProgressEntry) => void;
  onUpdateStatus: (entryId: string, newStatus: ProgressStatus) => void;
}

const COLUMNS: { status: ProgressStatus; title: string; subtitle: string; color: string }[] = [
  { status: "in_progress", title: "進行中 In Progress", subtitle: "當前實驗與論文進行項目", color: "border-[#1b4372] text-[#1b4372]" },
  { status: "review", title: "待審查 Under Review", subtitle: "送交教授/期刊審核修改中", color: "border-amber-500 text-amber-800" },
  { status: "stalled", title: "遭遇困難/停滯 Stalled", subtitle: "儀器待修或配方瓶頸待討論", color: "border-rose-500 text-rose-800" },
  { status: "completed", title: "已結案/完成 Completed", subtitle: "已通過審查或階段性成果收尾", color: "border-slate-500 text-slate-700" }
];

export default function ProgressKanbanView({
  members,
  entries,
  filterState,
  onAddEntry,
  onEditEntry,
  onDeleteEntry,
  onViewEntryDetail,
  onUpdateStatus
}: ProgressKanbanViewProps) {
  // Member lookup
  const memberMap = new Map<string, CombinedMember>();
  members.forEach((m) => memberMap.set(m.id, m));

  // Filter entries
  const filtered = entries.filter((e) => {
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
      const m = memberMap.get(e.member_id);
      const match =
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        (e.project_name && e.project_name.toLowerCase().includes(q)) ||
        (m && (m.name_zh.toLowerCase().includes(q) || m.name_en.toLowerCase().includes(q)));
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {COLUMNS.map((col) => {
          const colEntries = filtered
            .filter((e) => e.status === col.status)
            .sort((a, b) => b.date.localeCompare(a.date));

          return (
            <div
              key={col.status}
              className="bg-[#f8f8f5] border border-[#e5e5e0] rounded-sm flex flex-col max-h-[85vh] overflow-hidden shadow-2xs"
            >
              {/* Column Header */}
              <div className={`p-3.5 bg-white border-b-2 ${col.color} flex items-center justify-between`}>
                <div>
                  <h4 className="font-serif font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <span>{col.title}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-xs bg-slate-100 text-slate-600 font-normal">
                      {colEntries.length}
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {col.subtitle}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onAddEntry()}
                  className="p-1 text-slate-400 hover:text-[#1b4372] hover:bg-slate-100 rounded-sm transition"
                  title="在此狀態新增紀錄"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Cards List */}
              <div className="p-3 space-y-2.5 overflow-y-auto flex-1">
                {colEntries.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs italic border border-dashed border-slate-200 rounded-sm bg-white/50">
                    目前無此狀態之進度
                  </div>
                ) : (
                  colEntries.map((entry) => {
                    const member = memberMap.get(entry.member_id);
                    const catCfg = CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG.other;

                    return (
                      <div
                        key={entry.id}
                        className={`bg-white border rounded-sm p-3 hover:shadow-sm transition space-y-2 group cursor-pointer ${
                          entry.is_key_event ? "border-amber-300 ring-1 ring-amber-200/50" : "border-[#e5e5e0]"
                        }`}
                        onClick={() => onViewEntryDetail(entry)}
                      >
                        {/* Card Top: Member + Date */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-5 h-5 rounded-xs bg-[#1b4372]/10 text-[#1b4372] flex items-center justify-center text-[10px] font-bold font-serif shrink-0">
                              {member ? member.name_zh.slice(0, 1) : "?"}
                            </span>
                            <span className="font-bold text-slate-800 font-serif truncate text-[11px]">
                              {member ? member.name_zh : entry.member_id}
                            </span>
                          </div>

                          <span className="font-mono text-[10.5px] text-slate-400">
                            {entry.date}
                          </span>
                        </div>

                        {/* Title */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-1.5 py-0.2 rounded-xs text-[9.5px] font-bold border ${catCfg.badgeBg}`}>
                              {catCfg.label}
                            </span>
                            {entry.is_key_event && (
                              <span className="px-1.5 py-0.2 rounded-xs text-[9.5px] font-bold bg-amber-500 text-white flex items-center gap-0.5">
                                <Sparkles className="w-2.5 h-2.5 fill-white" />
                                里程碑
                              </span>
                            )}
                          </div>
                          <h5 className="font-bold text-slate-900 text-xs font-serif leading-snug group-hover:text-[#1b4372] transition">
                            {entry.title}
                          </h5>
                        </div>

                        {/* Project */}
                        {entry.project_name && (
                          <div className="text-[10px] text-[#8d734a] font-serif truncate flex items-center gap-1">
                            <FolderGit2 className="w-3 h-3 shrink-0" />
                            <span className="truncate">{entry.project_name}</span>
                          </div>
                        )}

                        {/* Description excerpt */}
                        {entry.description && (
                          <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                            {entry.description}
                          </p>
                        )}

                        {/* Bottom: quick status switcher */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span className="truncate">
                            {entry.attachments?.length ? `📎 ${entry.attachments.length} 附件` : ""}
                          </span>

                          <div 
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1"
                          >
                            <select
                              value={entry.status}
                              onChange={(e) => onUpdateStatus(entry.id, e.target.value as ProgressStatus)}
                              className="bg-[#f8f8f5] border border-[#e5e5e0] rounded-xs px-1.5 py-0.5 text-[10px] font-mono text-slate-700 focus:outline-none"
                            >
                              <option value="in_progress">進行中</option>
                              <option value="review">待審查</option>
                              <option value="stalled">停滯</option>
                              <option value="completed">完成</option>
                            </select>
                          </div>
                        </div>
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
