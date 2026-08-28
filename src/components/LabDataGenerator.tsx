import React, { useState } from "react";
import { Member, Meeting } from "../data/labData";
import { 
  Database, 
  UserPlus, 
  CalendarPlus, 
  Code, 
  Copy, 
  Download, 
  Upload, 
  Trash2, 
  Edit3, 
  Check, 
  RefreshCw, 
  Layers, 
  FileJson, 
  Sparkles, 
  ShieldCheck, 
  LogOut, 
  ChevronUp, 
  ChevronDown, 
  Save, 
  AlertCircle,
  Plus
} from "lucide-react";

interface LabDataGeneratorProps {
  initialMembers: Member[];
  initialMeetings: Meeting[];
  onApplyData?: (updatedMembers: Member[], updatedMeetings: Meeting[]) => void;
  onLogout?: () => void;
}

export default function LabDataGenerator({
  initialMembers,
  initialMeetings,
  onApplyData,
  onLogout
}: LabDataGeneratorProps) {
  const [activeTab, setActiveTab] = useState<"members" | "meetings" | "export">("members");
  
  // Helper: Sort meetings by date descending (newest first)
  const sortMeetingsByDateDesc = (list: Meeting[]): Meeting[] => {
    return [...list].sort((a, b) => {
      const dateA = a.date.replace(/\//g, "-");
      const dateB = b.date.replace(/\//g, "-");
      return dateB.localeCompare(dateA);
    });
  };

  // Local state for editable members and meetings
  const [membersList, setMembersList] = useState<Member[]>(initialMembers);
  const [meetingsList, setMeetingsList] = useState<Meeting[]>(() => sortMeetingsByDateDesc(initialMeetings));

  // Form state for Editing/Adding Member
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memberForm, setMemberForm] = useState<Member>({
    id: "",
    name_zh: "",
    name_en: "",
    role: "115碩班",
    role_en: "Master's Student",
    research_topic: {
      title_zh: "",
      title_en: "",
      keywords: []
    },
    description: ""
  });
  const [keywordsInput, setKeywordsInput] = useState("");

  // Form state for Editing/Adding Meeting
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);
  const [meetingForm, setMeetingForm] = useState<Meeting>({
    id: "",
    date: new Date().toISOString().split("T")[0].replace(/-/g, "/"),
    archive_group: "JULY 2026",
    title: "",
    speaker: "",
    speaker_id: "",
    status: "completed",
    status_label: "✓ Completed",
    search: ""
  });

  // UI status states
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [appliedStatus, setAppliedStatus] = useState(false);
  const [jsonImportText, setJsonImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");

  // Helper: auto generate archive group name from date (e.g. 2026/08/15 or 2026-08-15 -> "AUGUST 2026")
  const getArchiveGroupFromDate = (dateStr: string): string => {
    try {
      const parts = dateStr.replace(/-/g, "/").split("/");
      if (parts.length >= 2) {
        const year = parts[0];
        const monthNum = parseInt(parts[1], 10);
        const monthNames = [
          "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
          "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
        ];
        if (monthNum >= 1 && monthNum <= 12) {
          return `${monthNames[monthNum - 1]} ${year}`;
        }
      }
    } catch (e) {
      // fallback
    }
    return "2026 ARCHIVE";
  };

  // MEMBER HANDLERS
  const handleEditMember = (member: Member) => {
    setEditingMemberId(member.id);
    setMemberForm(member);
    setKeywordsInput(member.research_topic.keywords.join(", "));
  };

  const handleResetMemberForm = () => {
    setEditingMemberId(null);
    setMemberForm({
      id: `member_${Date.now()}`,
      name_zh: "",
      name_en: "",
      role: "115碩班",
      role_en: "Master's Student",
      research_topic: {
        title_zh: "",
        title_en: "",
        keywords: []
      },
      description: ""
    });
    setKeywordsInput("");
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberForm.name_zh || !memberForm.name_en) {
      alert("請輸入成員中文與英文姓名！");
      return;
    }

    const cleanedKeywords = keywordsInput
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    const updatedMember: Member = {
      ...memberForm,
      id: memberForm.id || memberForm.name_en.toLowerCase().replace(/\s+/g, ""),
      research_topic: {
        ...memberForm.research_topic,
        keywords: cleanedKeywords
      }
    };

    if (editingMemberId) {
      setMembersList((prev) =>
        prev.map((m) => (m.id === editingMemberId ? updatedMember : m))
      );
    } else {
      setMembersList((prev) => [...prev, updatedMember]);
    }

    handleResetMemberForm();
  };

  const handleDeleteMember = (id: string) => {
    if (confirm("確定要刪除這位實驗室成員嗎？")) {
      setMembersList((prev) => prev.filter((m) => m.id !== id));
      if (editingMemberId === id) handleResetMemberForm();
    }
  };

  const handleMoveMember = (index: number, direction: "up" | "down") => {
    const newList = [...membersList];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newList.length) {
      const temp = newList[index];
      newList[index] = newList[targetIndex];
      newList[targetIndex] = temp;
      setMembersList(newList);
    }
  };

  // MEETING HANDLERS
  const handleEditMeeting = (meeting: Meeting) => {
    setEditingMeetingId(meeting.id);
    setMeetingForm(meeting);
  };

  const handleResetMeetingForm = () => {
    setEditingMeetingId(null);
    const todayStr = new Date().toISOString().split("T")[0].replace(/-/g, "/");
    setMeetingForm({
      id: `m_${Date.now()}`,
      date: todayStr,
      archive_group: getArchiveGroupFromDate(todayStr),
      title: "",
      speaker: "",
      speaker_id: "",
      status: "completed",
      status_label: "✓ Completed",
      search: ""
    });
  };

  const handleSaveMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingForm.title || !meetingForm.speaker) {
      alert("請輸入演講題目與報告者姓名！");
      return;
    }

    const archiveGroup = getArchiveGroupFromDate(meetingForm.date);
    const searchIndex = `${meetingForm.title} ${meetingForm.speaker} ${meetingForm.date} ${archiveGroup}`;

    const updatedMeeting: Meeting = {
      ...meetingForm,
      id: meetingForm.id || `m_${Date.now()}`,
      archive_group: archiveGroup,
      search: searchIndex
    };

    let newList: Meeting[];
    if (editingMeetingId) {
      newList = meetingsList.map((m) => (m.id === editingMeetingId ? updatedMeeting : m));
    } else {
      newList = [updatedMeeting, ...meetingsList];
    }

    const sortedList = sortMeetingsByDateDesc(newList);
    setMeetingsList(sortedList);
    if (onApplyData) {
      onApplyData(membersList, sortedList);
    }

    handleResetMeetingForm();
  };

  const handleDeleteMeeting = (id: string) => {
    if (confirm("確定要刪除這筆會議/期刊導讀紀錄嗎？")) {
      const newList = meetingsList.filter((m) => m.id !== id);
      setMeetingsList(newList);
      if (onApplyData) {
        onApplyData(membersList, newList);
      }
      if (editingMeetingId === id) handleResetMeetingForm();
    }
  };

  // CODE GENERATOR OUTPUT FORMATTER
  const generateTypeScriptCode = (): string => {
    return `export interface ResearchTopic {
  title_zh: string;
  title_en: string;
  keywords: string[];
}

export interface Member {
  id: string;
  name_zh: string;
  name_en: string;
  role: string;
  role_en?: string;
  research_topic: ResearchTopic;
  description: string;
}

export interface Meeting {
  id: string;
  date: string;
  archive_group: string;
  title: string;
  speaker: string;
  speaker_id: string;
  status: string;
  status_label: string;
  search: string;
}

export const members: Member[] = ${JSON.stringify(membersList, null, 2)};

export const meetings: Meeting[] = ${JSON.stringify(meetingsList, null, 2)};
`;
  };

  const generateJsonOutput = (): string => {
    return JSON.stringify(
      {
        members: membersList,
        meetings: meetingsList
      },
      null,
      2
    );
  };

  // EXPORT ACTIONS
  const handleCopyCode = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(label);
    setTimeout(() => setCopyStatus(null), 2500);
  };

  const handleDownloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleApplyToLiveApp = () => {
    if (onApplyData) {
      onApplyData(membersList, meetingsList);
      setAppliedStatus(true);
      setTimeout(() => setAppliedStatus(false), 3000);
    }
  };

  // IMPORT JSON HANDLER
  const handleImportJson = () => {
    setImportError("");
    setImportSuccess("");
    try {
      if (!jsonImportText.trim()) {
        setImportError("請輸入 JSON 格式的數據內容！");
        return;
      }
      const parsed = JSON.parse(jsonImportText);
      if (parsed.members && Array.isArray(parsed.members) && parsed.meetings && Array.isArray(parsed.meetings)) {
        const sortedMeetings = sortMeetingsByDateDesc(parsed.meetings);
        setMembersList(parsed.members);
        setMeetingsList(sortedMeetings);
        if (onApplyData) {
          onApplyData(parsed.members, sortedMeetings);
        }
        setImportSuccess(`成功匯入 ${parsed.members.length} 位成員與 ${parsed.meetings.length} 筆會議紀錄！`);
        setJsonImportText("");
      } else {
        setImportError("JSON 格式不合規：需包含 'members' 與 'meetings' 陣列欄位。");
      }
    } catch (err: any) {
      setImportError(`JSON 解析失敗: ${err.message}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setJsonImportText(text);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="w-full bg-[#fdfdfc] border border-[#e5e5e0] rounded-sm p-6 sm:p-8 shadow-sm space-y-8 font-sans">
      
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e5e5e0] pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#004b3a] text-white rounded-sm shadow-sm shrink-0 border border-[#8d734a]/30">
            <Database className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-[#1a1a1a] font-serif">
                LabData 後端資料生成與維護 Studio
              </h2>
              <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-sm flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Admin Protected
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              方便後端/管理者輸入新增實驗室成員、修改研究課題、新增期刊導讀，並自動生成完整型別與資料檔案。
            </p>
          </div>
        </div>

        {/* Top Control Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleApplyToLiveApp}
            className={`px-4 py-2 rounded-sm text-xs font-bold transition-all flex items-center gap-2 border shadow-sm ${
              appliedStatus
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-[#004b3a] hover:bg-[#003328] text-white border-[#004b3a]"
            }`}
          >
            {appliedStatus ? <Check className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
            <span>{appliedStatus ? "已套用至當前應用!" : "即時套用至前端 (Apply Live)"}</span>
          </button>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="px-3 py-2 bg-white hover:bg-slate-50 border border-[#e5e5e0] text-slate-700 rounded-sm text-xs font-bold transition flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5 text-red-600" />
              <span>登出系統</span>
            </button>
          )}
        </div>
      </div>

      {/* STUDIO TABS */}
      <div className="flex items-center gap-2 border-b border-[#e5e5e0] pb-2 text-xs font-bold font-serif">
        <button
          onClick={() => setActiveTab("members")}
          className={`px-4 py-2 rounded-sm transition flex items-center gap-2 ${
            activeTab === "members"
              ? "bg-[#004b3a] text-white shadow-sm"
              : "bg-[#f8f8f5] text-slate-700 hover:bg-[#fafafa]"
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>成員與主題管理 ({membersList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("meetings")}
          className={`px-4 py-2 rounded-sm transition flex items-center gap-2 ${
            activeTab === "meetings"
              ? "bg-[#004b3a] text-white shadow-sm"
              : "bg-[#f8f8f5] text-slate-700 hover:bg-[#fafafa]"
          }`}
        >
          <CalendarPlus className="w-4 h-4" />
          <span>會議與期刊導讀 ({meetingsList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("export")}
          className={`px-4 py-2 rounded-sm transition flex items-center gap-2 ${
            activeTab === "export"
              ? "bg-[#004b3a] text-white shadow-sm"
              : "bg-[#f8f8f5] text-slate-700 hover:bg-[#fafafa]"
          }`}
        >
          <Code className="w-4 h-4" />
          <span>生成 labData.ts / JSON 匯出匯入</span>
        </button>
      </div>

      {/* ==================== TAB 1: MEMBERS MANAGEMENT ==================== */}
      {activeTab === "members" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Form: Add / Edit Member */}
          <div className="lg:col-span-5 bg-[#f8f8f5] border border-[#e5e5e0] rounded-sm p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#e5e5e0] pb-3">
              <span className="text-xs font-bold text-[#004b3a] font-serif uppercase tracking-wider flex items-center gap-1.5">
                <UserPlus className="w-4 h-4" />
                {editingMemberId ? "編輯成員資料" : "新增實驗室成員"}
              </span>
              {editingMemberId && (
                <button
                  onClick={handleResetMemberForm}
                  className="text-[10.5px] text-slate-500 hover:text-slate-800 underline font-mono"
                >
                  取消編輯 (新增模式)
                </button>
              )}
            </div>

            <form onSubmit={handleSaveMember} className="space-y-3 text-xs">
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">中文姓名 *</label>
                  <input
                    type="text"
                    value={memberForm.name_zh}
                    onChange={(e) => setMemberForm({ ...memberForm, name_zh: e.target.value })}
                    placeholder="例如: 林郁芳"
                    className="w-full bg-white border border-[#e5e5e0] rounded-sm py-1.5 px-2.5 text-xs focus:outline-none focus:border-[#004b3a]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">英文姓名 *</label>
                  <input
                    type="text"
                    value={memberForm.name_en}
                    onChange={(e) => setMemberForm({ ...memberForm, name_en: e.target.value })}
                    placeholder="例如: Fanny"
                    className="w-full bg-white border border-[#e5e5e0] rounded-sm py-1.5 px-2.5 text-xs focus:outline-none focus:border-[#004b3a]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">身份/年級</label>
                  <input
                    type="text"
                    value={memberForm.role}
                    onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                    placeholder="例如: 114博班"
                    className="w-full bg-white border border-[#e5e5e0] rounded-sm py-1.5 px-2.5 text-xs focus:outline-none focus:border-[#004b3a]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">English Role</label>
                  <input
                    type="text"
                    value={memberForm.role_en || ""}
                    onChange={(e) => setMemberForm({ ...memberForm, role_en: e.target.value })}
                    placeholder="Ph.D. Student / Master's Student"
                    className="w-full bg-white border border-[#e5e5e0] rounded-sm py-1.5 px-2.5 text-xs focus:outline-none focus:border-[#004b3a]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">研究題目 中文</label>
                <input
                  type="text"
                  value={memberForm.research_topic.title_zh}
                  onChange={(e) =>
                    setMemberForm({
                      ...memberForm,
                      research_topic: { ...memberForm.research_topic, title_zh: e.target.value }
                    })
                  }
                  placeholder="例如: 農業創新覆蓋膜"
                  className="w-full bg-white border border-[#e5e5e0] rounded-sm py-1.5 px-2.5 text-xs focus:outline-none focus:border-[#004b3a]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Research Topic English</label>
                <input
                  type="text"
                  value={memberForm.research_topic.title_en}
                  onChange={(e) =>
                    setMemberForm({
                      ...memberForm,
                      research_topic: { ...memberForm.research_topic, title_en: e.target.value }
                    })
                  }
                  placeholder="Innovative Agricultural Mulch Films"
                  className="w-full bg-white border border-[#e5e5e0] rounded-sm py-1.5 px-2.5 text-xs focus:outline-none focus:border-[#004b3a]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">關鍵字 (以逗號分隔)</label>
                <input
                  type="text"
                  value={keywordsInput}
                  onChange={(e) => setKeywordsInput(e.target.value)}
                  placeholder="例如: 生物質, 液體地膜, 農業剩餘物"
                  className="w-full bg-white border border-[#e5e5e0] rounded-sm py-1.5 px-2.5 text-xs focus:outline-none focus:border-[#004b3a]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">研究說明與雙語描述</label>
                <textarea
                  rows={3}
                  value={memberForm.description}
                  onChange={(e) => setMemberForm({ ...memberForm, description: e.target.value })}
                  placeholder="中文說明 / English description"
                  className="w-full bg-white border border-[#e5e5e0] rounded-sm py-1.5 px-2.5 text-xs focus:outline-none focus:border-[#004b3a]"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#004b3a] hover:bg-[#003328] text-white rounded-sm font-bold flex items-center justify-center gap-1.5 shadow-xs transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingMemberId ? "儲存更新" : "新增至成員陣列"}</span>
                </button>
                {editingMemberId && (
                  <button
                    type="button"
                    onClick={handleResetMemberForm}
                    className="py-2.5 px-3 bg-white border border-[#e5e5e0] hover:bg-slate-50 text-slate-700 rounded-sm font-bold transition"
                  >
                    重設
                  </button>
                )}
              </div>

            </form>
          </div>

          {/* Right List: Current Members */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 font-serif uppercase tracking-wider">
                實驗室成員清單 ({membersList.length} 位)
              </span>
              <button
                onClick={handleResetMemberForm}
                className="text-xs text-[#004b3a] font-bold flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新增成員</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
              {membersList.map((m, index) => (
                <div
                  key={m.id}
                  className={`p-3.5 rounded-sm border transition flex items-start justify-between gap-3 ${
                    editingMemberId === m.id
                      ? "bg-amber-50/80 border-amber-300 ring-1 ring-amber-300"
                      : "bg-[#f8f8f5] border-[#e5e5e0] hover:border-[#004b3a]"
                  }`}
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-sm text-slate-900 font-serif">{m.name_zh}</span>
                      <span className="text-xs text-slate-500 font-mono font-semibold">{m.name_en}</span>
                      <span className="text-[10px] bg-white border border-[#e5e5e0] px-1.5 py-0.2 rounded text-[#004b3a] font-bold">
                        {m.role}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-slate-800 font-serif">
                      {m.research_topic.title_zh}
                      <span className="text-[11px] font-normal text-slate-500 font-sans italic ml-1">
                        ({m.research_topic.title_en})
                      </span>
                    </p>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {m.research_topic.keywords.map((kw, i) => (
                        <span key={i} className="text-[9px] bg-white border border-[#e5e5e0] text-slate-600 px-1.5 py-0.2 rounded">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Member Action Controls */}
                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleMoveMember(index, "up")}
                      disabled={index === 0}
                      className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30"
                      title="上移"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveMember(index, "down")}
                      disabled={index === membersList.length - 1}
                      className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30"
                      title="下移"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditMember(m)}
                      className="p-1.5 bg-white border border-[#e5e5e0] hover:bg-emerald-50 text-[#004b3a] rounded-sm transition"
                      title="編輯"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteMember(m.id)}
                      className="p-1.5 bg-white border border-[#e5e5e0] hover:bg-red-50 text-red-600 rounded-sm transition"
                      title="刪除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ==================== TAB 2: MEETINGS MANAGEMENT ==================== */}
      {activeTab === "meetings" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Form: Add / Edit Meeting */}
          <div className="lg:col-span-5 bg-[#f8f8f5] border border-[#e5e5e0] rounded-sm p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#e5e5e0] pb-3">
              <span className="text-xs font-bold text-[#004b3a] font-serif uppercase tracking-wider flex items-center gap-1.5">
                <CalendarPlus className="w-4 h-4" />
                {editingMeetingId ? "編輯會議/導讀紀錄" : "新增會議/導讀紀錄"}
              </span>
              {editingMeetingId && (
                <button
                  onClick={handleResetMeetingForm}
                  className="text-[10.5px] text-slate-500 hover:text-slate-800 underline font-mono"
                >
                  取消編輯
                </button>
              )}
            </div>

            <form onSubmit={handleSaveMeeting} className="space-y-3 text-xs">
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">會議日期 (YYYY/MM/DD) *</label>
                  <input
                    type="text"
                    value={meetingForm.date}
                    onChange={(e) => setMeetingForm({ ...meetingForm, date: e.target.value })}
                    placeholder="2026/08/15"
                    className="w-full bg-white border border-[#e5e5e0] rounded-sm py-1.5 px-2.5 text-xs focus:outline-none focus:border-[#004b3a] font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">報告成員 *</label>
                  <select
                    value={meetingForm.speaker}
                    onChange={(e) => {
                      const selectedSpeaker = e.target.value;
                      const matchedMember = membersList.find((m) => m.name_en === selectedSpeaker || m.name_zh === selectedSpeaker);
                      setMeetingForm({
                        ...meetingForm,
                        speaker: selectedSpeaker,
                        speaker_id: matchedMember ? matchedMember.id : selectedSpeaker.toLowerCase()
                      });
                    }}
                    className="w-full bg-white border border-[#e5e5e0] rounded-sm py-1.5 px-2.5 text-xs focus:outline-none focus:border-[#004b3a]"
                  >
                    <option value="">-- 請選擇成員 --</option>
                    {membersList.map((m) => (
                      <option key={m.id} value={m.name_en}>
                        {m.name_zh} ({m.name_en})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">論文/報告題目 (Title) *</label>
                <textarea
                  rows={2}
                  value={meetingForm.title}
                  onChange={(e) => setMeetingForm({ ...meetingForm, title: e.target.value })}
                  placeholder="Recovery of lignin from deep eutectic solvents by liquid-liquid extraction"
                  className="w-full bg-white border border-[#e5e5e0] rounded-sm py-1.5 px-2.5 text-xs focus:outline-none focus:border-[#004b3a]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">狀態</label>
                  <select
                    value={meetingForm.status}
                    onChange={(e) => {
                      const st = e.target.value;
                      setMeetingForm({
                        ...meetingForm,
                        status: st,
                        status_label: st === "completed" ? "✓ Completed" : "⏳ Scheduled"
                      });
                    }}
                    className="w-full bg-white border border-[#e5e5e0] rounded-sm py-1.5 px-2.5 text-xs focus:outline-none focus:border-[#004b3a]"
                  >
                    <option value="completed">已完成 (Completed)</option>
                    <option value="upcoming">預定舉行 (Scheduled)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">歸檔群組 (Archive Group)</label>
                  <input
                    type="text"
                    value={meetingForm.archive_group}
                    onChange={(e) => setMeetingForm({ ...meetingForm, archive_group: e.target.value })}
                    placeholder="例如: AUGUST 2026"
                    className="w-full bg-white border border-[#e5e5e0] rounded-sm py-1.5 px-2.5 text-xs focus:outline-none focus:border-[#004b3a] font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#004b3a] hover:bg-[#003328] text-white rounded-sm font-bold flex items-center justify-center gap-1.5 shadow-xs transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingMeetingId ? "儲存更新" : "新增會議紀錄"}</span>
                </button>
                {editingMeetingId && (
                  <button
                    type="button"
                    onClick={handleResetMeetingForm}
                    className="py-2.5 px-3 bg-white border border-[#e5e5e0] hover:bg-slate-50 text-slate-700 rounded-sm font-bold transition"
                  >
                    重設
                  </button>
                )}
              </div>

            </form>
          </div>

          {/* Right List: Current Meetings */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 font-serif uppercase tracking-wider">
                會議與 Journal Club 歷史紀錄 ({meetingsList.length} 筆)
              </span>
              <button
                onClick={handleResetMeetingForm}
                className="text-xs text-[#004b3a] font-bold flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新增會議</span>
              </button>
            </div>

            <div className="space-y-2.5 max-h-[580px] overflow-y-auto pr-1">
              {meetingsList.map((m) => (
                <div
                  key={m.id}
                  className={`p-3.5 rounded-sm border transition flex items-start justify-between gap-3 ${
                    editingMeetingId === m.id
                      ? "bg-amber-50/80 border-amber-300 ring-1 ring-amber-300"
                      : "bg-[#f8f8f5] border-[#e5e5e0] hover:border-[#004b3a]"
                  }`}
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold font-mono text-[#004b3a] bg-white border border-[#e5e5e0] px-2 py-0.5 rounded">
                        {m.date}
                      </span>
                      <span className="text-[10px] font-bold font-mono text-slate-500 bg-white border border-[#e5e5e0] px-2 py-0.5 rounded">
                        {m.archive_group}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        {m.speaker}
                      </span>
                    </div>

                    <p className="text-xs font-serif font-medium text-slate-900 leading-normal">
                      "{m.title}"
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleEditMeeting(m)}
                      className="p-1.5 bg-white border border-[#e5e5e0] hover:bg-emerald-50 text-[#004b3a] rounded-sm transition"
                      title="編輯"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteMeeting(m.id)}
                      className="p-1.5 bg-white border border-[#e5e5e0] hover:bg-red-50 text-red-600 rounded-sm transition"
                      title="刪除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ==================== TAB 3: CODE GENERATOR & EXPORT / IMPORT ==================== */}
      {activeTab === "export" && (
        <div className="space-y-8">
          
          {/* Top Actions Box */}
          <div className="p-5 bg-[#f8f8f5] border border-[#e5e5e0] rounded-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#004b3a] font-serif flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  一鍵生成與匯出 labData 檔案
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  可複製 TypeScript 原始碼直接取代 <code className="bg-white px-1 border rounded text-[#004b3a]">src/data/labData.ts</code> 內容，或下載 JSON 檔作為備份。
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopyCode(generateTypeScriptCode(), "TS_CODE")}
                  className="px-3.5 py-2 bg-[#004b3a] hover:bg-[#003328] text-white rounded-sm text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copyStatus === "TS_CODE" ? "已複製 TypeScript!" : "複製 labData.ts 程式碼"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadFile(generateTypeScriptCode(), "labData.ts", "text/typescript")}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-[#e5e5e0] text-slate-800 rounded-sm text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-[#004b3a]" />
                  <span>下載 labData.ts</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadFile(generateJsonOutput(), "labData.json", "application/json")}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-[#e5e5e0] text-slate-800 rounded-sm text-xs font-bold transition flex items-center gap-1.5"
                >
                  <FileJson className="w-3.5 h-3.5 text-amber-600" />
                  <span>下載 labData.json</span>
                </button>
              </div>
            </div>
          </div>

          {/* Code Viewer Panel */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-700 font-serif uppercase tracking-wider block">
              即時生成之 TypeScript 程式碼預覽 (Generated labData.ts)
            </span>
            <div className="relative">
              <pre className="w-full h-80 bg-slate-900 text-emerald-300 p-4 rounded-sm font-mono text-[11px] leading-relaxed overflow-auto border border-slate-800 shadow-inner">
                {generateTypeScriptCode()}
              </pre>
            </div>
          </div>

          {/* Import Panel */}
          <div className="p-5 bg-white border border-[#e5e5e0] rounded-sm space-y-4">
            <h4 className="text-xs font-bold text-[#004b3a] font-serif uppercase tracking-wider flex items-center gap-2">
              <Upload className="w-4 h-4" />
              匯入外部 JSON 數據 (Import External JSON)
            </h4>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="block text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-xs file:font-bold file:bg-[#004b3a] file:text-white hover:file:bg-[#003328] cursor-pointer"
                />
                <span className="text-slate-400">或直接貼上 JSON 文本:</span>
              </div>

              <textarea
                rows={4}
                value={jsonImportText}
                onChange={(e) => setJsonImportText(e.target.value)}
                placeholder='貼上包含 {"members": [...], "meetings": [...]} 的 JSON 內容...'
                className="w-full bg-[#f8f8f5] border border-[#e5e5e0] rounded-sm p-3 text-xs font-mono focus:outline-none focus:border-[#004b3a]"
              />

              {importError && (
                <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-sm font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {importSuccess && (
                <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-sm font-medium">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{importSuccess}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleImportJson}
                className="px-4 py-2 bg-[#004b3a] hover:bg-[#003328] text-white rounded-sm font-bold flex items-center gap-1.5 transition"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>解析並匯入至 Studio</span>
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
