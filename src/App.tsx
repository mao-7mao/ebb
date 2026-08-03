import React, { useState, useEffect } from "react";
import { 
  members as initialMembersData, 
  meetings as initialMeetingsData, 
  Member, 
  Meeting 
} from "./data/labData";
import BusinessCardGenerator from "./components/BusinessCardGenerator";
import LabDataGenerator from "./components/LabDataGenerator";
import AuthModal, { checkIsAuthenticated, setAuthenticatedState } from "./components/AuthModal";
import SiteGateModal, { checkIsSiteUnlocked } from "./components/SiteGateModal";
import { 
  Users, 
  Network, 
  Calendar, 
  Archive, 
  Search, 
  Home, 
  BookOpen, 
  Leaf, 
  MapPin, 
  Mail, 
  ChevronRight, 
  Sparkles,
  Phone,
  Clock,
  IdCard,
  CheckCircle,
  HelpCircle,
  Code,
  Database,
  Lock,
  ShieldCheck,
  KeyRound,
  Wrench
} from "lucide-react";

export default function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [calendarView, setCalendarView] = useState<"month" | "list">("month");
  
  // Collage / active navigation items
  const [activeSection, setActiveSection] = useState("hero");

  // Dynamic active members & meetings state (allows live generator updates)
  const [activeMembers, setActiveMembers] = useState<Member[]>(initialMembersData);
  const [activeMeetings, setActiveMeetings] = useState<Meeting[]>(initialMeetingsData);

  // Site Access Gate & Admin Auth Modal States
  const [isSiteUnlocked, setIsSiteUnlocked] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLabDataGeneratorExpanded, setIsLabDataGeneratorExpanded] = useState(false);

  useEffect(() => {
    setIsSiteUnlocked(checkIsSiteUnlocked());
    setIsAuthenticated(checkIsAuthenticated());
  }, []);

  const handleOpenLabDataGenerator = () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
    } else {
      setIsLabDataGeneratorExpanded(true);
      setTimeout(() => {
        scrollToId("labdata-generator");
      }, 150);
    }
  };

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setIsLabDataGeneratorExpanded(true);
    setTimeout(() => {
      scrollToId("labdata-generator");
    }, 150);
  };

  const handleLogout = () => {
    setAuthenticatedState(false);
    setIsAuthenticated(false);
    setIsLabDataGeneratorExpanded(false);
  };

  // Collapse status for meeting groups
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // State to trigger autofill in the BusinessCardGenerator
  const [selectedMemberName, setSelectedMemberName] = useState("");
  const [isCardGeneratorExpanded, setIsCardGeneratorExpanded] = useState(false);

  const handleOpenCardGenerator = () => {
    setIsCardGeneratorExpanded(true);
    setTimeout(() => {
      scrollToId("card-generator");
    }, 150);
  };

  // Smooth scroll helper
  const scrollToId = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  // Listen to scrolling to set active menu states
  useEffect(() => {
    const handleScroll = () => {
      const sections = ["hero", "members", "overview", "card-generator", "labdata-generator", "schedule", "archive", "contact"];
      let current = "hero";
      const scrollPos = window.scrollY + 150;

      for (const section of sections) {
        const el = document.getElementById(section);
        if (el && scrollPos >= el.offsetTop) {
          current = section;
        }
      }
      setActiveSection(current);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Filter members based on search bar
  const filteredMembers = activeMembers.filter((m) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      m.name_zh.toLowerCase().includes(query) ||
      m.name_en.toLowerCase().includes(query) ||
      m.role.toLowerCase().includes(query) ||
      m.research_topic.title_zh.toLowerCase().includes(query) ||
      m.research_topic.title_en.toLowerCase().includes(query) ||
      m.research_topic.keywords.some((k) => k.toLowerCase().includes(query))
    );
  });

  // Sort meetings by date descending (chronological order, newest first)
  const sortedActiveMeetings = [...activeMeetings].sort((a, b) => {
    const dateA = a.date.replace(/\//g, "-");
    const dateB = b.date.replace(/\//g, "-");
    return dateB.localeCompare(dateA);
  });

  // Filter meetings based on search bar
  const filteredMeetings = sortedActiveMeetings.filter((m) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      m.title.toLowerCase().includes(query) ||
      m.speaker.toLowerCase().includes(query) ||
      m.date.toLowerCase().includes(query) ||
      m.archive_group.toLowerCase().includes(query) ||
      m.search.toLowerCase().includes(query)
    );
  });

  // Group meetings by archive group
  const meetingsGrouped: Record<string, Meeting[]> = {};
  filteredMeetings.forEach((m) => {
    if (!meetingsGrouped[m.archive_group]) {
      meetingsGrouped[m.archive_group] = [];
    }
    meetingsGrouped[m.archive_group].push(m);
  });

  // Sort archive groups by their latest meeting date descending (newest archive_group at top)
  const sortedGroupNames = Object.keys(meetingsGrouped).sort((a, b) => {
    const latestA = meetingsGrouped[a][0]?.date.replace(/\//g, "-") || "";
    const latestB = meetingsGrouped[b][0]?.date.replace(/\//g, "-") || "";
    return latestB.localeCompare(latestA);
  });

  // Toggle group collapse
  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  // Handle auto-generation from member cards
  const handleGenerateCard = (member: Member) => {
    setIsCardGeneratorExpanded(true);
    setTimeout(() => {
      scrollToId("card-generator");
      
      // Find search input inside Card Generator and populate it
      const searchInput = document.querySelector('input[placeholder*="輸入成員姓名"]') as HTMLInputElement;
      if (searchInput) {
        searchInput.value = member.name_zh;
        // Dispatch input event to trigger reactive state updates
        const event = new Event('input', { bubbles: true });
        searchInput.dispatchEvent(event);
      }
    }, 150);
  };

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-[#1a1a1a] font-sans selection:bg-[#004b3a]/15 selection:text-[#004b3a] pb-20 xl:pb-0">
      
      {/* -------------------- HEADER / NAVBAR -------------------- */}
      <header className="fixed top-0 right-0 left-0 h-16 z-50 flex items-center justify-between px-4 lg:px-12 glass-nav border-b border-[#e5e5e0]">
        <div className="flex items-center gap-3 shrink-0 cursor-pointer" onClick={() => scrollToId("hero")}>
          <div className="h-10 w-10 rounded-sm bg-[#004b3a] flex items-center justify-center font-serif italic text-white shadow-sm border border-[#8d734a]/30">
            E
          </div>
          <div>
            <span className="font-serif italic font-bold tracking-tight text-[#004b3a] block text-sm sm:text-base">
              EBB Lab
            </span>
            <span className="text-[10px] text-[#8d734a] block -mt-1 font-mono tracking-tight hidden md:block">
              Environmental Biotechnology & Biorefinery
            </span>
          </div>
        </div>

        {/* Desktop Central Navigation Links最上層導航欄目 */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2 mx-4">
          <button 
            onClick={() => scrollToId("members")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs lg:text-sm font-medium transition-all ${
              activeSection === "members" ? "text-[#004b3a] bg-white border border-[#e5e5e0] shadow-sm font-semibold" : "text-[#666] hover:text-[#1a1a1a] hover:bg-white/40"
            }`}
          >
            <Users className="w-4 h-4 text-[#004b3a]" />
            Members & Topics
          </button>
          
          <button 
            onClick={() => scrollToId("overview")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs lg:text-sm font-medium transition-all ${
              activeSection === "overview" ? "text-[#004b3a] bg-white border border-[#e5e5e0] shadow-sm font-semibold" : "text-[#666] hover:text-[#1a1a1a] hover:bg-white/40"
            }`}
          >
            <Network className="w-4 h-4 text-[#004b3a]" />
            Topic Overview
          </button>

          <button 
            onClick={handleOpenCardGenerator}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs lg:text-sm font-medium transition-all ${
              activeSection === "card-generator" ? "text-[#004b3a] bg-white border border-[#e5e5e0] shadow-sm font-semibold" : "text-[#666] hover:text-[#1a1a1a] hover:bg-white/40"
            }`}
          >
            <IdCard className="w-4 h-4 text-[#8d734a] animate-pulse" />
            IdCard Generator
          </button>


          <button 
            onClick={() => scrollToId("schedule")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs lg:text-sm font-medium transition-all ${
              activeSection === "schedule" ? "text-[#004b3a] bg-white border border-[#e5e5e0] shadow-sm font-semibold" : "text-[#666] hover:text-[#1a1a1a] hover:bg-white/40"
            }`}
          >
            <Calendar className="w-4 h-4 text-[#004b3a]" />
          Meeting Schedule
          </button>

          <button 
            onClick={() => scrollToId("archive")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs lg:text-sm font-medium transition-all ${
              activeSection === "archive" ? "text-[#004b3a] bg-white border border-[#e5e5e0] shadow-sm font-semibold" : "text-[#666] hover:text-[#1a1a1a] hover:bg-white/40"
            }`}
          >
            <Archive className="w-4 h-4 text-[#004b3a]" />
            Journal Club
          </button>
        </nav>

        {/* Global Search Box in Nav */}
        <div className="flex items-center gap-3 justify-end max-w-sm shrink-0">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#004b3a]">
              <Search className="w-4 h-4" />
            </span>
            <input 
              type="text" 
              placeholder="搜尋成員或主題..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-32 sm:w-48 lg:w-56 bg-[#fdfdfc] border border-[#e5e5e0] rounded-sm py-1.5 pl-9 pr-4 text-xs text-[#1a1a1a] placeholder-[#999] focus:outline-none focus:border-[#004b3a] focus:ring-1 focus:ring-[#004b3a] transition-all duration-300 font-sans"
            />
          </div>

          <button 
            onClick={() => scrollToId("schedule")}
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-[#004b3a] hover:bg-[#003328] text-white rounded-sm text-xs font-bold uppercase tracking-widest shadow-sm active:scale-95 transition-all group"
          >
            <Calendar className="w-3.5 h-3.5 text-white/90 group-hover:rotate-12 transition-transform" />
            <span>Meeting Schedule</span>
          </button>
        </div>
      </header>

      {/* -------------------- DESKTOP SIDEBAR 側邊導航欄-------------------- */}
      <aside className="fixed top-16 left-0 bottom-0 w-64 hidden xl:flex flex-col justify-between p-6 z-40 border-r border-[#e5e5e0] bg-[#fdfdfc]">
        <nav className="space-y-1 font-sans">
          <p className="text-[10px] font-bold text-[#8d734a] tracking-[0.2em] uppercase pl-3 mb-3 font-serif italic">
            Laboratory Tool
          </p>
          <button 
            onClick={() => scrollToId("hero")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-all group ${
              activeSection === "hero" ? "text-[#004b3a] bg-[#f4f1ea] border border-[#e5e5e0]" : "text-[#666] hover:text-[#1a1a1a] hover:bg-[#fafafa]"
            }`}
          >
            <Home className="w-4 h-4 text-[#004b3a]" /> 
            Home
          </button>
          
          <button 
            onClick={() => scrollToId("members")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-all group ${
              activeSection === "members" ? "text-[#004b3a] bg-[#f4f1ea] border border-[#e5e5e0]" : "text-[#666] hover:text-[#1a1a1a] hover:bg-[#fafafa]"
            }`}
          >
            <Users className="w-4 h-4 text-[#004b3a]" /> 
            Members and Topics
          </button>
          
          <button 
            onClick={() => scrollToId("overview")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-all group ${
              activeSection === "overview" ? "text-[#004b3a] bg-[#f4f1ea] border border-[#e5e5e0]" : "text-[#666] hover:text-[#1a1a1a] hover:bg-[#fafafa]"
            }`}
          >
            <Network className="w-4 h-4 text-[#004b3a]" /> 
            Topic Overview
          </button>

          <button 
            onClick={handleOpenCardGenerator}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-all group ${
              activeSection === "card-generator" ? "text-[#004b3a] bg-[#f4f1ea] border border-[#e5e5e0]" : "text-[#666] hover:text-[#1a1a1a] hover:bg-[#fafafa]"
            }`}
          >
            <IdCard className="w-4 h-4 text-[#8d734a]" /> 
            IdCard Generator
          </button>

          <button 
            onClick={handleOpenLabDataGenerator}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-all group ${
              activeSection === "labdata-generator" ? "text-[#004b3a] bg-[#f4f1ea] border border-[#e5e5e0]" : "text-[#666] hover:text-[#1a1a1a] hover:bg-[#fafafa]"
            }`}
          >
            <Database className="w-4 h-4 text-[#004b3a]" /> 
            <span className="flex-1 text-left">LabData Studio</span>
            {isAuthenticated ? (
              <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono font-bold">Admin</span>
            ) : (
              <Lock className="w-3.5 h-3.5 text-amber-600" />
            )}
          </button>

          <button 
            onClick={() => scrollToId("schedule")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-all group ${
              activeSection === "schedule" ? "text-[#004b3a] bg-[#f4f1ea] border border-[#e5e5e0]" : "text-[#666] hover:text-[#1a1a1a] hover:bg-[#fafafa]"
            }`}
          >
            <Calendar className="w-4 h-4 text-[#004b3a]" /> 
            Meeting Schedule
          </button>

          <button 
            onClick={() => scrollToId("archive")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-all group ${
              activeSection === "archive" ? "text-[#004b3a] bg-[#f4f1ea] border border-[#e5e5e0]" : "text-[#666] hover:text-[#1a1a1a] hover:bg-[#fafafa]"
            }`}
          >
            <Archive className="w-4 h-4 text-[#004b3a]" /> 
            Journal Club
          </button>
        </nav>
        
        <div className="border border-[#e5e5e0] bg-[#f8f8f5] p-4 rounded-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-[#004b3a] mb-1">
            <Leaf className="w-4 h-4 text-[#004b3a]" />
            <span className="font-serif italic font-bold">EBB</span>
          </div>
          <p className="text-[10px] text-[#666] font-mono leading-relaxed">
            Active: 2026
          </p>
        </div>
      </aside>

      {/* -------------------- MOBILE STICKY BOTTOM NAV -------------------- */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-[#fdfdfc]/95 backdrop-blur-lg border border-[#e5e5e0] rounded-sm shadow-md flex items-center justify-around py-2 px-1 xl:hidden">
        <button 
          onClick={() => scrollToId("hero")}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-sm transition-all ${
            activeSection === "hero" ? "text-[#004b3a] bg-[#f4f1ea]" : "text-slate-600"
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[9px] font-bold">Home</span>
        </button>
        <button 
          onClick={() => scrollToId("members")}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-sm transition-all ${
            activeSection === "members" ? "text-[#004b3a] bg-[#f4f1ea]" : "text-slate-600"
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[9px] font-bold">Members & Topics</span>
        </button>
        <button 
          onClick={handleOpenCardGenerator}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-sm transition-all ${
            activeSection === "card-generator" ? "text-[#004b3a] bg-[#f4f1ea]" : "text-slate-600"
          }`}
        >
          <IdCard className="w-5 h-5" />
          <span className="text-[9px] font-bold">IdCard</span>
        </button>
        <button 
          onClick={() => scrollToId("schedule")}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-sm transition-all ${
            activeSection === "schedule" ? "text-[#004b3a] bg-[#f4f1ea]" : "text-slate-600"
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[9px] font-bold">Meeting Schedule</span>
        </button>
        <button 
          onClick={() => scrollToId("archive")}
          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-sm transition-all ${
            activeSection === "archive" ? "text-[#004b3a] bg-[#f4f1ea]" : "text-slate-600"
          }`}
        >
          <Archive className="w-5 h-5" />
          <span className="text-[9px] font-bold">Journal Club</span>
        </button>
      </div>

      {/* -------------------- MAIN CONTAINER -------------------- */}
      <main className="pt-16 xl:pl-64 min-h-screen">

        {/* 1. HERO SECTION */}
        <section id="hero" className="relative min-h-[65vh] flex items-center justify-center px-6 lg:px-16 overflow-hidden border-b border-[#e5e5e0]">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#004b3a]/5 rounded-full blur-[120px] pointer-events-none"></div>
          
          <div className="max-w-4xl text-center z-10 space-y-6">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#e5e5e0] bg-[#fdfdfc]/80 text-[10px] uppercase tracking-[0.15em] font-bold text-[#8d734a] shadow-sm backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#004b3a]" />
              環境生物技術與生物精煉實驗室
            </span>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#1a1a1a] tracking-tight">
              Environmental Biotechnology &<br/>
              <span className="font-serif italic text-[#004b3a]">
                Biorefinery Laboratory
              </span>
            </h1>
            
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
               EBB lab
            </p>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center justify-center gap-3 pt-4">
              <button 
                onClick={() => scrollToId("members")}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#fdfdfc] text-[#1a1a1a] border border-[#e5e5e0] rounded-sm text-xs sm:text-sm font-bold uppercase tracking-widest shadow-sm hover:bg-[#f8f8f5] active:scale-95 transition-all group"
              >
                <Users className="w-4 h-4 text-[#004b3a]" />
                <span>Members and Research Topics</span>
              </button>
              
              <button 
                onClick={() => scrollToId("overview")}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#fdfdfc] text-[#1a1a1a] border border-[#e5e5e0] rounded-sm text-xs sm:text-sm font-bold uppercase tracking-widest shadow-sm hover:bg-[#f8f8f5] active:scale-95 transition-all group"
              >
                <Network className="w-4 h-4 text-[#004b3a]" />
                <span>Topic Overview</span>
              </button>

              <button 
                onClick={handleOpenCardGenerator}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#fdfdfc] text-[#1a1a1a] border border-[#e5e5e0] rounded-sm text-xs sm:text-sm font-bold uppercase tracking-widest shadow-sm hover:bg-[#f8f8f5] active:scale-95 transition-all group"
              >
                <IdCard className="w-4 h-4 text-[#004b3a]" />
                <span>IdCard Generator</span>
              </button>


              <button 
                onClick={() => scrollToId("schedule")}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#004b3a] text-white rounded-sm text-xs sm:text-sm font-bold uppercase tracking-widest shadow-sm hover:bg-[#003328] active:scale-95 transition-all group"
              >
                <Calendar className="w-4 h-4 text-white/90" />
                <span>Meeting</span>
              </button>
            </div>
          </div>
        </section>

        {/* 2. MEMBERS SECTION */}
        <section id="members" className="py-24 px-6 lg:px-16 max-w-7xl mx-auto space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#e5e5e0] pb-6">
            <div className="max-w-2xl">
              <h2 className="text-xs font-bold text-[#8d734a] tracking-[0.2em] uppercase mb-2 font-serif italic">
                Our Team
              </h2>
              <p className="text-3xl font-bold text-[#1a1a1a] tracking-tight sm:text-4xl font-serif">
                Members and Research Topics
              </p>
            </div>
            {searchQuery && (
              <p className="text-xs text-[#666] font-mono bg-[#fdfdfc] border border-[#e5e5e0] px-3 py-1.5 rounded-sm">
                符合「{searchQuery}」的成員：{filteredMembers.length} 位
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMembers.length > 0 ? (
              filteredMembers.map((m) => (
                <div 
                  key={m.id} 
                  className="border border-[#e5e5e0] bg-[#fdfdfc] hover:border-[#004b3a] hover:shadow-md rounded-sm p-6 flex flex-col justify-between transition-all duration-300 group relative"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-lg font-bold text-[#1a1a1a] font-serif flex items-baseline gap-2">
                          {m.name_zh}
                          <span className="text-xs font-normal text-[#666] font-mono">{m.name_en}</span>
                        </h4>
                        <p className="text-[11px] text-[#8d734a] font-bold font-serif italic mt-0.5">
                          {m.role}
                        </p>
                      </div>
                      <span className="p-2 rounded-sm bg-[#f8f8f5] border border-[#e5e5e0] text-[#004b3a] shrink-0 group-hover:bg-[#fafafa] transition-colors">
                        <BookOpen className="w-4 h-4" />
                      </span>
                    </div>

                    <div className="bg-[#f8f8f5] border border-[#e5e5e0]/60 rounded-sm p-4 space-y-3">
                      <div>
                        <span className="text-[#004b3a] font-bold text-[9px] tracking-widest uppercase block mb-0.5">
                          Research Topic
                        </span>
                        <span className="block text-[#1a1a1a] font-bold text-xs leading-normal font-serif">
                          {m.research_topic.title_zh}
                        </span>
                        <span className="block text-[11px] text-[#8d734a] font-medium leading-normal mt-0.5 italic">
                          {m.research_topic.title_en}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {m.research_topic.keywords.map((k, idx) => (
                          <span 
                            key={idx} 
                            className="text-[9px] bg-white border border-[#e5e5e0] text-[#8d734a] font-medium px-2 py-0.5 rounded-sm"
                          >
                            {k}
                          </span>
                        ))}
                      </div>

                      <div className="pt-3 border-t border-dashed border-[#e5e5e0] leading-relaxed text-xs text-[#555] space-y-1">
                        <p className="font-light">{m.description.split(" / ")[0]}</p>
                        {m.description.split(" / ")[1] && (
                          <p className="text-[10.5px] text-[#666] italic font-light">
                            {m.description.split(" / ")[1]}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center bg-[#fdfdfc] border border-dashed border-[#e5e5e0] rounded-sm">
                <HelpCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-[#666] font-medium">找不到相符的實驗室成員。</p>
              </div>
            )}
          </div>
        </section>

        {/* 3. RESEARCH BENTO GRID / TOPIC OVERVIEW */}
        <section id="overview" className="py-20 px-6 lg:px-16 max-w-7xl mx-auto border-t border-[#e5e5e0]">
          <div className="space-y-8">
            <div className="max-w-xl">
              <span className="flex items-center gap-2 text-xs font-bold text-[#8d734a] tracking-widest uppercase font-serif italic mb-2">
                <Network className="w-4 h-4 text-[#004b3a] animate-pulse" />
                Research Overview
              </span>
              <h2 className="text-3xl font-bold text-[#1a1a1a] font-serif">

              </h2>
            </div>

            <div className="relative w-full rounded-sm border border-[#e5e5e0] bg-[#fdfdfc] p-6 md:p-10 overflow-hidden shadow-sm">
              <div className="absolute w-72 h-72 bg-[#004b3a]/5 rounded-full blur-3xl -top-10 -left-10 pointer-events-none"></div>
              <div className="absolute w-72 h-72 bg-[#8d734a]/5 rounded-full blur-3xl -bottom-10 -right-10 pointer-events-none"></div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-center relative z-10">
                
                {/* Left Columns: Topics 1-3 */}
                <div className="md:col-span-2 space-y-6 flex flex-col items-center w-full">
                  
                  {/* Topic A */}
                  <div className="group relative bg-[#f8f8f5] border border-[#e5e5e0] hover:border-[#004b3a] p-4 rounded-sm shadow-sm hover:shadow-md transition-all duration-300 w-full flex gap-4 items-start">
                    <div className="w-24 sm:w-28 aspect-[4/3] rounded-sm bg-white border border-[#e5e5e0] overflow-hidden shrink-0 shadow-sm mt-1">
                      <img 
                        src="https://pub-d24fef14c0074c2db6319d6319645f22.r2.dev/0701/07015.webp" 
                        alt="Sustainable Coastal Materials" 
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
                        onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/200x150?text=Coastal+Materials"; }}
                      />
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-[#1a1a1a] font-serif break-words">低碳海岸修復材料</h4>
                      <span className="block text-[10.5px] text-[#8d734a] font-medium break-words -mt-0.5 font-serif italic">Sustainable Coastal Materials</span>
                      <p className="text-[11px] text-[#555] font-light leading-relaxed mt-1">
                        利用農業剩餘物與高鈣貝殼廢棄物，開發零水泥綠色低碳生態海岸建材。
                      </p>
                      <div className="pt-2 flex flex-wrap gap-1">
                        <span className="text-[9px] bg-white border border-[#e5e5e0] text-[#004b3a] px-2 py-0.5 rounded-sm font-medium">游家御 (Kevin)</span>
                        <span className="text-[9px] bg-white border border-[#e5e5e0] text-[#004b3a] px-2 py-0.5 rounded-sm font-medium">花翊軒 (Peter)</span>
                      </div>
                    </div>
                  </div>

                  {/* Topic B */}
                  <div className="group relative bg-[#f8f8f5] border border-[#e5e5e0] hover:border-[#004b3a] p-4 rounded-sm shadow-sm hover:shadow-md transition-all duration-300 w-full flex gap-4 items-start">
                    <div className="w-24 sm:w-28 aspect-[4/3] rounded-sm bg-white border border-[#e5e5e0] overflow-hidden shrink-0 shadow-sm mt-1">
                      <img 
                        src="https://pub-d24fef14c0074c2db6319d6319645f22.r2.dev/0701/07014.webp" 
                        alt="Bio-Based Polyesters" 
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
                        onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/200x150?text=PEF+Polyester"; }}
                      />
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-[#1a1a1a] font-serif break-words">生物基聚酯材料 (PEF)</h4>
                      <span className="block text-[10.5px] text-[#8d734a] font-medium break-words -mt-0.5 font-serif italic">Bio-Based Polyesters</span>
                      <p className="text-[11px] text-[#555] font-light leading-relaxed mt-1">
                        專注於次世代高阻隔生物基聚酯（PEF）的合成製程優化與包裝應用。
                      </p>
                      <div className="pt-2 flex flex-wrap gap-1">
                        <span className="text-[9px] bg-white border border-[#e5e5e0] text-[#004b3a] px-2 py-0.5 rounded-sm font-medium">陳采翎 (Kalin)</span>
                        <span className="text-[9px] bg-white border border-[#e5e5e0] text-[#004b3a] px-2 py-0.5 rounded-sm font-medium">林郁芳 (Fanny)</span>
                      </div>
                    </div>
                  </div>

                  {/* Topic C */}
                  <div className="group relative bg-[#f8f8f5] border border-[#e5e5e0] hover:border-[#004b3a] p-4 rounded-sm shadow-sm hover:shadow-md transition-all duration-300 w-full flex gap-4 items-start">
                    <div className="w-24 sm:w-28 aspect-[4/3] rounded-sm bg-white border border-[#e5e5e0] overflow-hidden shrink-0 shadow-sm mt-1">
                      <img 
                        src="https://pub-d24fef14c0074c2db6319d6319645f22.r2.dev/0701/07016.webp" 
                        alt="Green Plasma Carbon Reduction" 
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
                        onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/200x150?text=Plasma+Tech"; }}
                      />
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-[#1a1a1a] font-serif break-words">綠能電漿減碳</h4>
                      <span className="block text-[10.5px] text-[#8d734a] font-medium break-words -mt-0.5 font-serif italic">Green Plasma Carbon Reduction</span>
                      <p className="text-[11px] text-[#555] font-light leading-relaxed mt-1">
                        研發先進低能耗綠能電漿技術，達成高效溫室氣體降解與綠色碳排轉化。
                      </p>
                      <div className="pt-2 flex flex-wrap gap-1">
                        <span className="text-[9px] bg-white border border-[#e5e5e0] text-[#004b3a] px-2 py-0.5 rounded-sm font-medium">林郁芳 (Fanny)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Central Emblem Core Node */}
                <div className="md:col-span-1 flex flex-col justify-center items-center py-6 md:py-0">
                  <div className="w-36 h-36 rounded-sm bg-[#004b3a] text-white flex flex-col items-center justify-center text-center p-4 shadow-md border-2 border-[#8d734a]/30 ring-4 ring-[#f4f1ea] relative">
                    <Leaf className="w-6 h-6 mb-1 text-[#8d734a] animate-bounce" />
                    <span className="font-bold text-sm tracking-tight font-serif italic">EBB Lab</span>
                    <span className="text-[8px] uppercase tracking-widest font-mono opacity-80 mt-1">
                      Research Hub
                    </span>
                  </div>
                </div>

                {/* Right Columns: Topics 4-7 */}
                <div className="md:col-span-2 space-y-6 flex flex-col items-center w-full">
                  
                  {/* Topic D */}
                  <div className="group relative bg-[#f8f8f5] border border-[#e5e5e0] hover:border-[#004b3a] p-4 rounded-sm shadow-sm hover:shadow-md transition-all duration-300 w-full flex gap-4 items-start md:flex-row-reverse md:text-right">
                    <div className="w-24 sm:w-28 aspect-[4/3] rounded-sm bg-white border border-[#e5e5e0] overflow-hidden shrink-0 shadow-sm mt-1">
                      <img 
                        src="https://pub-d24fef14c0074c2db6319d6319645f22.r2.dev/0701/07012.webp" 
                        alt="Biomass Liquid Mulch" 
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
                        onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/200x150?text=Liquid+Mulch"; }}
                      />
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-[#1a1a1a] font-serif break-words">生物質液體地膜</h4>
                      <span className="block text-[10.5px] text-[#8d734a] font-medium break-words -mt-0.5 font-serif italic">Biomass Liquid Mulch Films</span>
                      <p className="text-[11px] text-[#555] font-light leading-relaxed mt-1">
                        首創可完全降解之液態生質覆蓋地膜，消除傳統塑膠膜微塑膠污染。
                      </p>
                      <div className="pt-2 flex flex-wrap gap-1 md:justify-end">
                        <span className="text-[9px] bg-white border border-[#e5e5e0] text-[#004b3a] px-2 py-0.5 rounded-sm font-medium">林郁芳 (Fanny)</span>
                      </div>
                    </div>
                  </div>

                  {/* Topic E */}
                  <div className="group relative bg-[#f8f8f5] border border-[#e5e5e0] hover:border-[#004b3a] p-4 rounded-sm shadow-sm hover:shadow-md transition-all duration-300 w-full flex gap-4 items-start md:flex-row-reverse md:text-right">
                    <div className="w-24 sm:w-28 aspect-[4/3] rounded-sm bg-white border border-[#e5e5e0] overflow-hidden shrink-0 shadow-sm mt-1">
                      <img 
                        src="https://pub-d24fef14c0074c2db6319d6319645f22.r2.dev/0701/07011.webp" 
                        alt="Green Composites" 
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
                        onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/200x150?text=Composites"; }}
                      />
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-[#1a1a1a] font-serif break-words">綠色複合與生質材料</h4>
                      <span className="block text-[10.5px] text-[#8d734a] font-medium break-words -mt-0.5 font-serif italic">Green Composites & Bio-Materials</span>
                      <p className="text-[11px] text-[#555] font-light leading-relaxed mt-1">
                        研發快速木質/竹材高溫液化技術，開發高強度綠色種子生質建材。
                      </p>
                      <div className="pt-2 flex flex-wrap gap-1 md:justify-end">
                        <span className="text-[9px] bg-white border border-[#e5e5e0] text-[#004b3a] px-2 py-0.5 rounded-sm font-medium">吳羿葶 (Tina)</span>
                        <span className="text-[9px] bg-white border border-[#e5e5e0] text-[#004b3a] px-2 py-0.5 rounded-sm font-medium">陳泯熏 (Martin)</span>
                        <span className="text-[9px] bg-white border border-[#e5e5e0] text-[#004b3a] px-2 py-0.5 rounded-sm font-medium">陳采蘋 (Nina)</span>
                      </div>
                    </div>
                  </div>

                  {/* Topic F */}
                  <div className="group relative bg-[#f8f8f5] border border-[#e5e5e0] hover:border-[#004b3a] p-4 rounded-sm shadow-sm hover:shadow-md transition-all duration-300 w-full flex gap-4 items-start md:flex-row-reverse md:text-right">
                    <div className="w-24 sm:w-28 aspect-[4/3] rounded-sm bg-white border border-[#e5e5e0] overflow-hidden shrink-0 shadow-sm mt-1">
                      <img 
                        src="https://pub-d24fef14c0074c2db6319d6319645f22.r2.dev/0701/07013.webp" 
                        alt="VOC Treatment" 
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
                        onError={(e) => { (e.target as HTMLImageElement).src = "https://placehold.co/200x150?text=VOC+Treatment"; }}
                      />
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-[#1a1a1a] font-serif break-words">VOC 生物處理與異味控制</h4>
                      <span className="block text-[10.5px] text-[#8d734a] font-medium break-words -mt-0.5 font-serif italic">VOC Biological Treatment & Odor Control</span>
                      <p className="text-[11px] text-[#555] font-light leading-relaxed mt-1">
                        建置高效生物滌慮塔技術，輔以強效微生物降解揮發性有機物與養豬場臭氣。
                      </p>
                      <div className="pt-2 flex flex-wrap gap-1 md:justify-end">
                        <span className="text-[9px] bg-white border border-[#e5e5e0] text-[#004b3a] px-2 py-0.5 rounded-sm font-medium">黃科錡 (Chris)</span>
                        <span className="text-[9px] bg-white border border-[#e5e5e0] text-[#004b3a] px-2 py-0.5 rounded-sm font-medium">唐瑜陽 (Eko)</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </section>

        {/* 4. BUSINESS CARD GENERATOR SECTION (STAR UTILITY) */}
        <div id="card-generator" className="scroll-mt-20 py-12 border-t border-[#e5e5e0]">
          <div className="max-w-7xl mx-auto px-6 lg:px-16">
            <button
              onClick={() => setIsCardGeneratorExpanded(!isCardGeneratorExpanded)}
              className="w-full text-left bg-[#fdfdfc] border border-[#e5e5e0] hover:border-[#004b3a] p-6 rounded-sm shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between select-none group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-sm bg-[#f8f8f5] text-[#004b3a] border border-[#e5e5e0] group-hover:bg-[#004b3a] group-hover:text-white group-hover:border-[#004b3a] transition-all shrink-0">
                  <IdCard className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#1a1a1a] font-serif flex flex-wrap items-center gap-2">
                    IdCard Generator
                    <span className="text-[10px] font-mono font-bold text-[#8d734a] italic bg-[#f8f8f5] border border-[#e5e5e0] px-2 py-0.5 rounded-sm">
                      EBB Academic Card Generator
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Click to expand/collapse the IdCard editor, supporting custom contact information, selection of eco-friendly color schemes, and high-resolution UV printing specifications.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#004b3a] group-hover:text-[#003328] shrink-0">
                <span>{isCardGeneratorExpanded ? "Collapse Editor" : "Expand Editor"}</span>
                <ChevronRight 
                  className={`w-5 h-5 transition-transform duration-300 ${
                    isCardGeneratorExpanded ? "rotate-90 text-[#8d734a]" : "text-slate-400 group-hover:translate-x-1"
                  }`} 
                />
              </div>
            </button>

            {isCardGeneratorExpanded && (
              <div className="mt-8 pt-4 border-t border-dashed border-[#e5e5e0]/60">
                <BusinessCardGenerator />
              </div>
            )}
          </div>
        </div>

        {/* LABDATA GENERATOR SECTION (BACKEND / ADMIN DATA STUDIO) */}
        <div id="labdata-generator" className="scroll-mt-20 py-12 border-t border-[#e5e5e0]">
          <div className="max-w-7xl mx-auto px-6 lg:px-16">
            <button
              onClick={() => {
                if (!isAuthenticated) {
                  setIsAuthModalOpen(true);
                } else {
                  setIsLabDataGeneratorExpanded(!isLabDataGeneratorExpanded);
                }
              }}
              className="w-full text-left bg-[#fdfdfc] border border-[#e5e5e0] hover:border-[#004b3a] p-6 rounded-sm shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-between select-none group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-sm bg-[#004b3a] text-amber-300 border border-[#8d734a]/30 shrink-0">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[#1a1a1a] font-serif flex flex-wrap items-center gap-2">
                    LabData (Backend Data Editor Studio)
                    {isAuthenticated ? (
                      <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-sm flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> 已通過固定帳密驗證
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-sm flex items-center gap-1">
                        <Lock className="w-3 h-3" /> 需要輸入固定帳密解鎖
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    This is the backend data editor studio for EBB Lab. 
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#004b3a] group-hover:text-[#003328] shrink-0">
                <span>
                  {!isAuthenticated
                    ? "解鎖存取 (Unlock)"
                    : isLabDataGeneratorExpanded
                    ? "收合 Studio"
                    : "展開 Studio"}
                </span>
                <ChevronRight 
                  className={`w-5 h-5 transition-transform duration-300 ${
                    isLabDataGeneratorExpanded && isAuthenticated ? "rotate-90 text-[#8d734a]" : "text-slate-400 group-hover:translate-x-1"
                  }`} 
                />
              </div>
            </button>

            {isAuthenticated && isLabDataGeneratorExpanded && (
              <div className="mt-8 pt-4 border-t border-dashed border-[#e5e5e0]/60">
                <LabDataGenerator
                  initialMembers={activeMembers}
                  initialMeetings={activeMeetings}
                  onApplyData={(updatedMembers, updatedMeetings) => {
                    setActiveMembers(updatedMembers);
                    setActiveMeetings(updatedMeetings);
                    setCollapsedGroups({});
                  }}
                  onLogout={handleLogout}
                />
              </div>
            )}
          </div>
        </div>

        {/* 5. MEETING SCHEDULE SECTION */}
        <section id="schedule" className="py-24 px-6 lg:px-16 max-w-7xl mx-auto space-y-12 border-t border-[#e5e5e0]">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e5e5e0] pb-6">
            <div className="max-w-xl">
              <h2 className="text-xs font-bold text-[#8d734a] tracking-[0.2em] uppercase mb-2 font-serif italic">
                Lab Calendar
              </h2>
              <p className="text-3xl font-bold text-[#1a1a1a] font-serif">
                Meeting Schedule
              </p>
            </div>
            
            {/* Calendar tab toggler */}
            <div className="flex items-center bg-[#f8f8f5] border border-[#e5e5e0] rounded-sm p-1 shadow-sm text-xs font-medium">
              <button 
                onClick={() => setCalendarView("month")}
                className={`px-4 py-2 rounded-sm transition-all ${
                  calendarView === "month" 
                    ? "bg-[#004b3a] text-white shadow-sm" 
                    : "text-slate-700 hover:bg-[#fafafa]"
                }`}
              >
                月視圖 (Month)
              </button>
              <button 
                onClick={() => setCalendarView("list")}
                className={`px-4 py-2 rounded-sm transition-all ${
                  calendarView === "list" 
                    ? "bg-[#004b3a] text-white shadow-sm" 
                    : "text-slate-700 hover:bg-[#fafafa]"
                }`}
              >
                活動清單 (Agenda)
              </button>
            </div>
          </div>

          <div className="relative w-full h-[650px] rounded-sm overflow-hidden border border-[#e5e5e0] bg-[#fdfdfc] shadow-sm p-4">
            
            {/* Calendar Category legends */}
            <div className="flex flex-wrap gap-4 mb-4 text-xs font-semibold px-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 block"></span>
                <span className="text-[#555]">Progress Report</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#004b3a] block"></span>
                <span className="text-[#555]">Journal Club</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500 block"></span>
                <span className="text-[#555]">Public Holidays</span>
              </div>
            </div>

            {/* Google Calendar Iframe Render */}
            <iframe 
              src={`https://calendar.google.com/calendar/embed?mode=${
                calendarView === "month" ? "MONTH" : "AGENDA"
              }&showNav=1&showTitle=0&showTabs=0&src=ebblab115%40gmail.com&color=%23F09300&src=4576ed913eb7922183266a6a8b02606c412a539451ccc8ac5bbd427701d6fe97%40group.calendar.google.com&color=%230B8043&src=zh-tw.taiwan%23holiday%40group.v.calendar.google.com&color=%23039BE5&ctz=Asia%2FTaipei`}
              style={{ border: 0 }} 
              className="w-full h-[calc(100%-2.5rem)] rounded-sm border border-[#e5e5e0]/60 block" 
              frameBorder="0" 
              scrolling="no"
              title="EBB Lab Schedule"
            ></iframe>

          </div>
        </section>

        {/* 6. JOURNAL CLUB COLLAPSIBLE ARCHIVE */}
        <section id="archive" className="py-20 px-6 lg:px-16 max-w-7xl mx-auto border-t border-[#e5e5e0] space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="max-w-xl">
              <span className="flex items-center gap-2 text-xs font-bold text-[#8d734a] tracking-widest uppercase font-serif italic mb-2">
                <Archive className="w-4 h-4 text-[#004b3a] animate-pulse" />
                Journal Club Directory
              </span>
              <h2 className="text-3xl font-bold text-[#1a1a1a] font-serif">
              
              </h2>
            </div>
            
            {searchQuery && (
              <span className="text-xs text-[#666] font-mono bg-[#fdfdfc] border border-[#e5e5e0] px-3 py-1.5 rounded-sm">
                符合「{searchQuery}」的文獻：{filteredMeetings.length} 篇
              </span>
            )}
          </div>

          <div className="border border-[#e5e5e0] rounded-sm overflow-hidden bg-[#fdfdfc] shadow-sm">
            {sortedGroupNames.length > 0 ? (
              sortedGroupNames.map((groupName, index) => {
                // Top 2 archive_groups are expanded by default (index < 2), remaining automatically collapsed (index >= 2)
                const isCollapsed = groupName in collapsedGroups
                  ? collapsedGroups[groupName]
                  : index >= 2;
                const groupMeetings = meetingsGrouped[groupName];

                return (
                  <div key={groupName} className="border-b border-[#e5e5e0] last:border-b-0">
                    <button 
                      onClick={() => toggleGroup(groupName)}
                      className="w-full flex items-center justify-between px-6 py-4 bg-[#f8f8f5] hover:bg-[#fafafa] transition-colors select-none text-left"
                    >
                      <div className="flex items-center gap-2 text-sm font-bold text-[#1a1a1a] font-serif">
                        <ChevronRight 
                          className={`w-4 h-4 text-[#004b3a] transition-transform ${
                            !isCollapsed ? "rotate-90" : ""
                          }`} 
                        />
                        <span>{groupName}</span>
                      </div>
                      <span className="text-[10px] text-[#004b3a] font-bold font-mono bg-white px-2.5 py-1 rounded-sm border border-[#e5e5e0]">
                        {groupMeetings.length} 篇 Journal 歸檔
                      </span>
                    </button>

                    {!isCollapsed && (
                      <div className="px-6 py-2 bg-white divide-y divide-[#e5e5e0]/60">
                        {groupMeetings.map((m) => (
                          <div 
                            key={m.id} 
                            className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-[#f8f8f5]/40 rounded-sm px-2 transition-colors"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1 min-w-0">
                              <span className="text-[10px] font-bold font-mono text-[#004b3a] bg-[#f8f8f5] px-2 py-0.5 rounded-sm border border-[#e5e5e0] self-start sm:self-auto">
                                {m.date}
                              </span>
                              <span className="text-[#1a1a1a] font-serif font-medium break-words leading-normal text-sm">
                                "{m.title}"
                              </span>
                            </div>

                            <div className="text-xs text-[#555] flex flex-wrap items-center gap-2 md:text-right shrink-0 pt-1 md:pt-0 font-sans border-t border-dashed border-[#e5e5e0]/60 md:border-0 justify-between sm:justify-start">
                              <span className="font-light">
                                Speaker:{" "}
                                <button
                                  onClick={() => {
                                    scrollToId("members");
                                    // Highlight name search
                                    setSearchQuery(m.speaker);
                                  }}
                                  className="text-[#004b3a] hover:underline font-bold"
                                >
                                  {m.speaker}
                                </button>
                              </span>
                              <span className="text-slate-300 md:inline hidden">·</span>
                              <span className="text-[10px] text-[#004b3a] bg-[#f8f8f5] border border-[#e5e5e0] px-2 py-0.5 rounded-sm font-mono font-bold">
                                {m.status_label}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center bg-[#fdfdfc]">
                <HelpCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-[#666] font-medium">查無此關鍵字的報告文獻。</p>
              </div>
            )}
          </div>
        </section>

        {/* 7. CONTACT & MAPS SECTION */}
        <section id="contact" className="py-24 px-6 lg:px-16 max-w-7xl mx-auto border-t border-[#e5e5e0]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Info Column */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-[#1a1a1a] font-serif">
                  EBB Lab
                </h3>
                <p className="text-sm text-[#8d734a] font-bold font-serif italic">
                  環境生物技術與生物精煉實驗室
                </p>
              </div>

              <div className="space-y-3 text-sm text-[#555] font-sans leading-relaxed">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#004b3a] shrink-0 mt-0.5" />
                  <p>
                    <span className="block text-[#1a1a1a] font-bold">Lab Address:</span>
                    <br/>
                    <span className="text-xs text-[#666] block mt-0.5 italic">
                      Room EC-6012, No. 70, Lianhai Rd., Gushan Dist., Kaohsiung City 80424, Taiwan
                    </span>
                  </p>
                </div>



              </div>

            </div>

            {/* Right Map Column (English version map pin) */}
            <div className="lg:col-span-7 h-80 rounded-sm overflow-hidden border border-[#e5e5e0] p-1 bg-[#fdfdfc] shadow-sm relative">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3682.7235084920436!2d120.26359567584555!3d22.626829730310243!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x346e047710b7849d%3A0xc6fc1da710777fa6!2sNo.%2070%2C%20Lianhai%20Rd%2C%20Gushan%20District%2C%20Kaohsiung%20City%2C%20804!5e0!3m2!1sen!2stw!4v1700000000000!5m2!1sen!2stw" 
                className="w-full h-full rounded-sm opacity-90" 
                style={{ border: 0 }} 
                allowFullScreen={true} 
                loading="lazy"
                title="NSYSU Map Location"
              ></iframe>
            </div>

          </div>

          <footer className="mt-16 pt-8 border-t border-[#e5e5e0] flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#888] font-mono">
            <p>Copyright © 2026 Miao All Rights Reserved.</p>
            <p className="flex items-center gap-1">
              <Code className="w-3.5 h-3.5 text-[#004b3a]" />
              <span>Developed with Craftsmanship</span>
            </p>
          </footer>
        </section>

      </main>

      {/* SITE ACCESS GATE MODAL (Layer 1 Security) */}
      {!isSiteUnlocked && (
        <SiteGateModal onUnlocked={() => setIsSiteUnlocked(true)} />
      )}

      {/* AUTHENTICATION MODAL (Layer 2 Admin Security) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthenticated={handleAuthSuccess}
      />

    </div>
  );
}
