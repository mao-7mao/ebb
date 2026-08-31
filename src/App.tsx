import React, { useState, useEffect } from "react";
import { 
  members as initialMembersData, 
  meetings as initialMeetingsData, 
  Member, 
  Meeting 
} from "./data/labData";
import BusinessCardGenerator from "./components/BusinessCardGenerator";
import LabDataGenerator from "./components/LabDataGenerator";
import InstrumentReservation from "./components/InstrumentReservation";
import ChemicalInventory from "./components/ChemicalInventory";
import FontSizeAdjuster from "./components/FontSizeAdjuster";
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
  Wrench,
  FlaskConical,
  Compass,
  ArrowRight,
  Menu,
  X,
  Layers,
  ChevronDown,
  ExternalLink
} from "lucide-react";

export type NavPage = 
  | "home" 
  | "members" 
  | "instruments" 
  | "chemicals" 
  | "card-generator" 
  | "schedule" 
  | "archive" 
  | "studio" 
  | "contact";

export default function App() {
  // Page Routing State (Multi-page nested view architecture)
  const [currentPage, setCurrentPage] = useState<NavPage>(() => {
    const hash = window.location.hash.replace("#/", "").replace("#", "");
    const validPages: NavPage[] = ["home", "members", "instruments", "chemicals", "card-generator", "schedule", "archive", "studio", "contact"];
    return validPages.includes(hash as NavPage) ? (hash as NavPage) : "home";
  });

  // Nested Tab State for Members & Topics page
  const [membersSubTab, setMembersSubTab] = useState<"directory" | "topics">("directory");

  // Member role filter for directory
  const [memberRoleFilter, setMemberRoleFilter] = useState<string>("ALL");

  // Search queries
  const [searchQuery, setSearchQuery] = useState("");
  const [calendarView, setCalendarView] = useState<"week" | "month" | "list">("week");

  // Mobile menu drawer
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Local storage keys for client-side persistence
  const MEMBERS_STORAGE_KEY = "ebblab_custom_members";
  const MEETINGS_STORAGE_KEY = "ebblab_custom_meetings";

  // Dynamic active members & meetings state (loads from localStorage if exists, else initial labData)
  const [activeMembers, setActiveMembers] = useState<Member[]>(() => {
    try {
      const saved = localStorage.getItem(MEMBERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Failed to load saved members from localStorage", e);
    }
    return initialMembersData;
  });

  const [activeMeetings, setActiveMeetings] = useState<Meeting[]>(() => {
    try {
      const saved = localStorage.getItem(MEETINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Failed to load saved meetings from localStorage", e);
    }
    return initialMeetingsData;
  });

  // Site Access Gate & Admin Auth Modal States
  const [isSiteUnlocked, setIsSiteUnlocked] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Collapse status for meeting archive groups
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setIsSiteUnlocked(checkIsSiteUnlocked());
    setIsAuthenticated(checkIsAuthenticated());

    // Listen to hash changes for browser forward/back navigation
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#/", "").replace("#", "");
      const validPages: NavPage[] = ["home", "members", "instruments", "chemicals", "card-generator", "schedule", "archive", "studio", "contact"];
      if (validPages.includes(hash as NavPage)) {
        setCurrentPage(hash as NavPage);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Navigate helper with smooth window scroll to top
  const navigateTo = (page: NavPage, subTab?: "directory" | "topics") => {
    setCurrentPage(page);
    window.location.hash = `#/${page}`;
    if (subTab) {
      setMembersSubTab(subTab);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    setIsMobileMenuOpen(false);
  };

  const handleOpenStudio = () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
    } else {
      navigateTo("studio");
    }
  };

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    navigateTo("studio");
  };

  const handleLogout = () => {
    setAuthenticatedState(false);
    setIsAuthenticated(false);
    navigateTo("home");
  };

  // Handle auto-card generation from member cards
  const handleGenerateCardForMember = (member: Member) => {
    navigateTo("card-generator");
    setTimeout(() => {
      const searchInput = document.querySelector('input[placeholder*="輸入成員姓名"]') as HTMLInputElement;
      if (searchInput) {
        searchInput.value = member.name_zh;
        const event = new Event("input", { bubbles: true });
        searchInput.dispatchEvent(event);
      }
    }, 200);
  };

  // Helper to check if role is any type of exchange student
  const isExchangeRole = (role?: string, roleEn?: string): boolean => {
    const combined = `${role || ""} ${roleEn || ""}`.toLowerCase();
    return combined.includes("交換") || combined.includes("exchange");
  };

  // Extract unique roles for directory filter (unifying all exchange students into a single '交換學生' tag)
  const memberRoles = React.useMemo(() => {
    const categories = new Set<string>();
    let hasExchange = false;

    activeMembers.forEach((m) => {
      if (isExchangeRole(m.role, m.role_en)) {
        hasExchange = true;
      } else if (m.role) {
        categories.add(m.role);
      }
    });

    const sortedRoles = Array.from(categories).sort((a, b) => {
      const isDocA = a.includes("博");
      const isDocB = b.includes("博");
      if (isDocA && !isDocB) return -1;
      if (!isDocA && isDocB) return 1;
      return a.localeCompare(b);
    });

    if (hasExchange) {
      sortedRoles.push("交換學生");
    }

    return sortedRoles;
  }, [activeMembers]);

  // Filter members based on search bar and role filter
  const filteredMembers = activeMembers.filter((m) => {
    if (memberRoleFilter !== "ALL") {
      if (memberRoleFilter === "交換學生") {
        if (!isExchangeRole(m.role, m.role_en)) return false;
      } else {
        if (m.role !== memberRoleFilter) return false;
      }
    }
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      m.name_zh.toLowerCase().includes(query) ||
      m.name_en.toLowerCase().includes(query) ||
      m.role.toLowerCase().includes(query) ||
      (m.role_en && m.role_en.toLowerCase().includes(query)) ||
      (isExchangeRole(m.role, m.role_en) && ("交換學生 exchange student".includes(query) || query.includes("交換") || query.includes("exchange"))) ||
      m.research_topic.title_zh.toLowerCase().includes(query) ||
      m.research_topic.title_en.toLowerCase().includes(query) ||
      m.research_topic.keywords.some((k) => k.toLowerCase().includes(query))
    );
  });

  // Sort meetings by date descending
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

  const sortedGroupNames = Object.keys(meetingsGrouped).sort((a, b) => {
    const latestA = meetingsGrouped[a][0]?.date.replace(/\//g, "-") || "";
    const latestB = meetingsGrouped[b][0]?.date.replace(/\//g, "-") || "";
    return latestB.localeCompare(latestA);
  });

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  return (
    <div className="min-h-screen bg-[#f4f1ea] text-[#1a1a1a] font-sans selection:bg-[#004b3a]/15 selection:text-[#004b3a] pb-24 xl:pb-0">
      
      {/* -------------------- HEADER / NAVBAR (Simplified: Brand + Font Adjuster & Expand Button) -------------------- */}
      <header className="fixed top-0 right-0 left-0 h-16 z-50 flex items-center justify-between px-4 lg:px-8 glass-nav border-b border-[#e5e5e0]">
        
        {/* Brand Logo - Click to return to Home */}
        <button 
          type="button"
          onClick={() => navigateTo("home")}
          className="flex items-center gap-3 shrink-0 cursor-pointer select-none text-left group focus:outline-none"
          title="Return to Home (EBB Lab)"
        >
          <div className="h-10 w-10 rounded-sm bg-[#004b3a] group-hover:bg-[#003328] flex items-center justify-center font-serif italic text-white shadow-sm border border-[#8d734a]/30 transition">
            E
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif italic font-bold tracking-tight text-[#004b3a] group-hover:text-[#003328] block text-base sm:text-lg transition">
                EBB Lab
              </span>
              <span className="text-[9px] bg-[#004b3a]/10 text-[#004b3a] px-1.5 py-0.2 rounded font-mono font-bold tracking-wider uppercase">
                Home
              </span>
            </div>
            <span className="text-[10px] text-[#8d734a] block -mt-0.5 font-mono tracking-tight hidden sm:block">
              Environmental Biotechnology & Biorefinery
            </span>
          </div>
        </button>

        {/* Right Tools: ONLY Font Size Adjuster and Expand / Menu Toggle Button */}
        <div className="flex items-center gap-2.5">
          {/* 1. Font Size Adjuster */}
          <FontSizeAdjuster compact />

          {/* 2. Expand / Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-slate-700 hover:text-[#004b3a] hover:bg-white/80 rounded-sm border border-[#e5e5e0] transition text-xs font-bold font-sans shadow-2xs"
            aria-label="Expand Navigation Menu"
            title="Expand Navigation Menu"
          >
            {isMobileMenuOpen ? (
              <>
                <X className="w-4 h-4 text-[#004b3a]" />
                <span className="hidden sm:inline">Close</span>
              </>
            ) : (
              <>
                <Menu className="w-4 h-4 text-[#004b3a]" />
                <span className="hidden sm:inline">Expand Menu</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* -------------------- EXPANDED / MOBILE DRAWER MENU -------------------- */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 top-16 z-40 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#fdfdfc] border-b border-[#e5e5e0] p-6 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto max-w-2xl mx-auto rounded-b-md">
            <div className="flex items-center justify-between border-b border-[#e5e5e0] pb-3">
              <span className="text-xs font-bold text-[#8d734a] font-serif uppercase tracking-widest italic">
                Navigation Menu & Portals
              </span>
              <FontSizeAdjuster />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button 
                onClick={() => { navigateTo("home"); setIsMobileMenuOpen(false); }}
                className={`flex items-center gap-3 p-3 rounded-sm text-sm font-semibold transition ${
                  currentPage === "home" ? "bg-[#004b3a] text-white" : "bg-[#f8f8f5] text-slate-700 hover:bg-[#eae6dc]"
                }`}
              >
                <Home className="w-4 h-4" />
                <span>Home</span>
              </button>

              <button 
                onClick={() => { navigateTo("members", "directory"); setIsMobileMenuOpen(false); }}
                className={`flex items-center gap-3 p-3 rounded-sm text-sm font-semibold transition ${
                  currentPage === "members" ? "bg-[#004b3a] text-white" : "bg-[#f8f8f5] text-slate-700 hover:bg-[#eae6dc]"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Members & Topics</span>
              </button>

              <button 
                onClick={() => { navigateTo("instruments"); setIsMobileMenuOpen(false); }}
                className={`flex items-center gap-3 p-3 rounded-sm text-sm font-semibold transition ${
                  currentPage === "instruments" ? "bg-[#004b3a] text-white" : "bg-[#f8f8f5] text-slate-700 hover:bg-[#eae6dc]"
                }`}
              >
                <Wrench className="w-4 h-4" />
                <span>Instrument Booking</span>
              </button>

              <button 
                onClick={() => { navigateTo("chemicals"); setIsMobileMenuOpen(false); }}
                className={`flex items-center gap-3 p-3 rounded-sm text-sm font-semibold transition ${
                  currentPage === "chemicals" ? "bg-[#004b3a] text-white" : "bg-[#f8f8f5] text-slate-700 hover:bg-[#eae6dc]"
                }`}
              >
                <FlaskConical className="w-4 h-4" />
                <span>Chemical Inventory</span>
              </button>

              <button 
                onClick={() => { navigateTo("card-generator"); setIsMobileMenuOpen(false); }}
                className={`flex items-center gap-3 p-3 rounded-sm text-sm font-semibold transition ${
                  currentPage === "card-generator" ? "bg-[#004b3a] text-white" : "bg-[#f8f8f5] text-slate-700 hover:bg-[#eae6dc]"
                }`}
              >
                <IdCard className="w-4 h-4" />
                <span>Card Generator</span>
              </button>

              <button 
                onClick={() => { navigateTo("schedule"); setIsMobileMenuOpen(false); }}
                className={`flex items-center gap-3 p-3 rounded-sm text-sm font-semibold transition ${
                  currentPage === "schedule" ? "bg-[#004b3a] text-white" : "bg-[#f8f8f5] text-slate-700 hover:bg-[#eae6dc]"
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Meeting Schedule</span>
              </button>

              <button 
                onClick={() => { navigateTo("archive"); setIsMobileMenuOpen(false); }}
                className={`flex items-center gap-3 p-3 rounded-sm text-sm font-semibold transition ${
                  currentPage === "archive" ? "bg-[#004b3a] text-white" : "bg-[#f8f8f5] text-slate-700 hover:bg-[#eae6dc]"
                }`}
              >
                <Archive className="w-4 h-4" />
                <span>Journal Archive</span>
              </button>

              <button 
                onClick={() => { handleOpenStudio(); setIsMobileMenuOpen(false); }}
                className={`flex items-center gap-3 p-3 rounded-sm text-sm font-semibold transition ${
                  currentPage === "studio" ? "bg-[#004b3a] text-white" : "bg-[#f8f8f5] text-slate-700 hover:bg-[#eae6dc]"
                }`}
              >
                <Database className="w-4 h-4" />
                <span>Lab Data Studio</span>
              </button>

              <button 
                onClick={() => { navigateTo("contact"); setIsMobileMenuOpen(false); }}
                className={`flex items-center gap-3 p-3 rounded-sm text-sm font-semibold transition ${
                  currentPage === "contact" ? "bg-[#004b3a] text-white" : "bg-[#f8f8f5] text-slate-700 hover:bg-[#eae6dc]"
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>Contact & Location</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- DESKTOP SIDEBAR (All English) -------------------- */}
      <aside className="fixed top-16 left-0 bottom-0 w-64 hidden xl:flex flex-col justify-between p-6 z-40 border-r border-[#e5e5e0] bg-[#fdfdfc]">
        <div className="space-y-6">
          <div>
            <p className="text-[10px] font-bold text-[#8d734a] tracking-[0.2em] uppercase pl-3 mb-3 font-serif italic">
              Lab Navigation
            </p>
            <nav className="space-y-1 font-sans">
              <button 
                onClick={() => navigateTo("home")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-semibold transition-all ${
                  currentPage === "home" ? "text-[#004b3a] bg-[#f4f1ea] border border-[#e5e5e0]" : "text-slate-600 hover:text-slate-900 hover:bg-[#fafafa]"
                }`}
              >
                <Home className="w-4 h-4 text-[#004b3a]" /> 
                <span>Home</span>
              </button>
              
              <button 
                onClick={() => navigateTo("members", "directory")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-semibold transition-all ${
                  currentPage === "members" ? "text-[#004b3a] bg-[#f4f1ea] border border-[#e5e5e0]" : "text-slate-600 hover:text-slate-900 hover:bg-[#fafafa]"
                }`}
              >
                <Users className="w-4 h-4 text-[#004b3a]" /> 
                <span>Members & Topics</span>
              </button>

              <button 
                onClick={() => navigateTo("instruments")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-semibold transition-all ${
                  currentPage === "instruments" ? "text-[#004b3a] bg-[#f4f1ea] border border-[#e5e5e0]" : "text-slate-600 hover:text-slate-900 hover:bg-[#fafafa]"
                }`}
              >
                <Wrench className="w-4 h-4 text-[#004b3a]" /> 
                <span>Instrument Booking</span>
              </button>

              <button 
                onClick={() => navigateTo("chemicals")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-semibold transition-all ${
                  currentPage === "chemicals" ? "text-[#004b3a] bg-[#f4f1ea] border border-[#e5e5e0]" : "text-slate-600 hover:text-slate-900 hover:bg-[#fafafa]"
                }`}
              >
                <FlaskConical className="w-4 h-4 text-[#004b3a]" /> 
                <span>Chemical Inventory</span>
              </button>

              <button 
                onClick={() => navigateTo("card-generator")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-semibold transition-all ${
                  currentPage === "card-generator" ? "text-[#004b3a] bg-[#f4f1ea] border border-[#e5e5e0]" : "text-slate-600 hover:text-slate-900 hover:bg-[#fafafa]"
                }`}
              >
                <IdCard className="w-4 h-4 text-[#8d734a]" /> 
                <span>Card Generator</span>
              </button>

              <button 
                onClick={() => navigateTo("schedule")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-semibold transition-all ${
                  currentPage === "schedule" ? "text-[#004b3a] bg-[#f4f1ea] border border-[#e5e5e0]" : "text-slate-600 hover:text-slate-900 hover:bg-[#fafafa]"
                }`}
              >
                <Calendar className="w-4 h-4 text-[#004b3a]" /> 
                <span>Meeting Schedule</span>
              </button>

              <button 
                onClick={() => navigateTo("archive")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-semibold transition-all ${
                  currentPage === "archive" ? "text-[#004b3a] bg-[#f4f1ea] border border-[#e5e5e0]" : "text-slate-600 hover:text-slate-900 hover:bg-[#fafafa]"
                }`}
              >
                <Archive className="w-4 h-4 text-[#004b3a]" /> 
                <span>Journal Archive</span>
              </button>

              <button 
                onClick={handleOpenStudio}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-semibold transition-all ${
                  currentPage === "studio" ? "text-[#004b3a] bg-[#f4f1ea] border border-[#e5e5e0]" : "text-slate-600 hover:text-slate-900 hover:bg-[#fafafa]"
                }`}
              >
                <Database className="w-4 h-4 text-[#004b3a]" /> 
                <span className="flex-1 text-left">Lab Data Studio</span>
                {isAuthenticated ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                )}
              </button>

              <button 
                onClick={() => navigateTo("contact")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-sm text-sm font-semibold transition-all ${
                  currentPage === "contact" ? "text-[#004b3a] bg-[#f4f1ea] border border-[#e5e5e0]" : "text-slate-600 hover:text-slate-900 hover:bg-[#fafafa]"
                }`}
              >
                <MapPin className="w-4 h-4 text-[#004b3a]" /> 
                <span>Contact & Location</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-4 border-t border-[#e5e5e0] space-y-3">
          <FontSizeAdjuster />
          <div className="text-[11px] text-slate-400 font-mono">
            Copyright © Miao. All rights reserved.
          </div>
        </div>
      </aside>

      {/* -------------------- MOBILE STICKY BOTTOM NAV -------------------- */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-lg bg-[#fdfdfc]/95 backdrop-blur-lg border border-[#e5e5e0] rounded-sm shadow-md flex items-center justify-around py-1.5 px-1 xl:hidden">
        <button 
          onClick={() => navigateTo("members", "directory")}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-sm transition-all ${
            currentPage === "members" ? "text-[#004b3a] bg-[#f4f1ea] font-bold" : "text-slate-600"
          }`}
        >
          <Users className="w-4 h-4" />
          <span className="text-[9px] font-bold">Members</span>
        </button>
        
        <button 
          onClick={() => navigateTo("instruments")}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-sm transition-all ${
            currentPage === "instruments" ? "text-[#004b3a] bg-[#f4f1ea] font-bold" : "text-slate-600"
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span className="text-[9px] font-bold">Booking</span>
        </button>
        
        <button 
          onClick={() => navigateTo("chemicals")}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-sm transition-all ${
            currentPage === "chemicals" ? "text-[#004b3a] bg-[#f4f1ea] font-bold" : "text-slate-600"
          }`}
        >
          <FlaskConical className="w-4 h-4" />
          <span className="text-[9px] font-bold">Chemicals</span>
        </button>
        
        <button 
          onClick={() => navigateTo("schedule")}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-sm transition-all ${
            currentPage === "schedule" ? "text-[#004b3a] bg-[#f4f1ea] font-bold" : "text-slate-600"
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span className="text-[9px] font-bold">Schedule</span>
        </button>

        {/* Journal Club Archive shortcut button in bottom navigation */}
        <button 
          onClick={() => navigateTo("archive")}
          className={`flex flex-col items-center gap-0.5 p-1 rounded-sm transition-all ${
            currentPage === "archive" ? "text-[#004b3a] bg-[#f4f1ea] font-bold" : "text-slate-600"
          }`}
        >
          <Archive className="w-4 h-4" />
          <span className="text-[9px] font-bold">Archive</span>
        </button>

        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex flex-col items-center gap-0.5 p-1 rounded-sm text-slate-600 hover:text-[#004b3a]"
        >
          <Layers className="w-4 h-4" />
          <span className="text-[9px] font-bold">More</span>
        </button>
      </div>

      {/* -------------------- MAIN MULTI-PAGE CONTAINER -------------------- */}
      <main className="pt-16 xl:pl-64 min-h-screen">

        {/* ================= PAGE 1: HOME ================= */}
        {currentPage === "home" && (
          <div className="space-y-16 animate-in fade-in duration-200">
            {/* Hero Banner */}
            <section className="relative min-h-[60vh] flex items-center justify-center px-6 lg:px-16 overflow-hidden border-b border-[#e5e5e0]">
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#004b3a]/5 rounded-full blur-[120px] pointer-events-none"></div>
              
              <div className="max-w-4xl text-center z-10 space-y-6 py-12">
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#e5e5e0] bg-[#fdfdfc]/80 text-[10px] uppercase tracking-[0.15em] font-bold text-[#8d734a] shadow-xs backdrop-blur-xs">
                  <Sparkles className="w-3.5 h-3.5 text-[#004b3a]" />
                  國立中山大學 · 環境生物技術與生物精煉實驗室
                </span>
                
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif text-[#1a1a1a] tracking-tight">
                  Environmental Biotechnology &<br/>
                  <span className="font-serif italic text-[#004b3a]">
                    Biorefinery Laboratory
                  </span>
                </h1>
                
                <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed font-sans">
                  Advancing sustainable solutions in green catalysis, biomass valorization, bio-based polyesters (PEF), circular bioeconomy, and VOC biological treatment.
                </p>

                {/* Launchpad Navigation Buttons (6 Balanced Buttons with only Schedule Highlighted) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 max-w-3xl mx-auto gap-3 pt-4">
                  {/* 1. Members */}
                  <button 
                    onClick={() => navigateTo("members", "directory")}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#fdfdfc] text-[#1a1a1a] border border-[#e5e5e0] rounded-sm text-xs sm:text-sm font-bold uppercase tracking-wider shadow-xs hover:bg-[#f8f8f5] active:scale-95 transition-all group"
                  >
                    <Users className="w-4 h-4 text-[#004b3a]" />
                    <span>Members</span>
                  </button>
                  
                  {/* 2. Instrument Booking */}
                  <button 
                    onClick={() => navigateTo("instruments")}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#fdfdfc] text-[#1a1a1a] border border-[#e5e5e0] rounded-sm text-xs sm:text-sm font-bold uppercase tracking-wider shadow-xs hover:bg-[#f8f8f5] active:scale-95 transition-all group"
                  >
                    <Wrench className="w-4 h-4 text-[#004b3a]" />
                    <span>Instrument Booking</span>
                  </button>

                  {/* 3. Chemical Inventory */}
                  <button 
                    onClick={() => navigateTo("chemicals")}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#fdfdfc] text-[#1a1a1a] border border-[#e5e5e0] rounded-sm text-xs sm:text-sm font-bold uppercase tracking-wider shadow-xs hover:bg-[#f8f8f5] active:scale-95 transition-all group"
                  >
                    <FlaskConical className="w-4 h-4 text-[#004b3a]" />
                    <span>Chemical Inventory</span>
                  </button>

                  {/* 4. Card Generator */}
                  <button 
                    onClick={() => navigateTo("card-generator")}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#fdfdfc] text-[#1a1a1a] border border-[#e5e5e0] rounded-sm text-xs sm:text-sm font-bold uppercase tracking-wider shadow-xs hover:bg-[#f8f8f5] active:scale-95 transition-all group"
                  >
                    <IdCard className="w-4 h-4 text-[#8d734a]" />
                    <span>Card Generator</span>
                  </button>

                  {/* 5. Schedule (ONLY this button is highlighted) */}
                  <button 
                    onClick={() => navigateTo("schedule")}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#004b3a] text-white border border-[#00382b] rounded-sm text-xs sm:text-sm font-bold uppercase tracking-wider shadow-md hover:bg-[#003328] active:scale-95 transition-all group ring-2 ring-[#004b3a]/25"
                  >
                    <Calendar className="w-4 h-4 text-emerald-300 animate-pulse" />
                    <span>Schedule</span>
                  </button>

                  {/* 6. Journal Club Archive */}
                  <button 
                    onClick={() => navigateTo("archive")}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-[#fdfdfc] text-[#1a1a1a] border border-[#e5e5e0] rounded-sm text-xs sm:text-sm font-bold uppercase tracking-wider shadow-xs hover:bg-[#f8f8f5] active:scale-95 transition-all group"
                  >
                    <Archive className="w-4 h-4 text-[#004b3a]" />
                    <span>Journal Archive</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Quick Feature Launchpad Cards */}
            <section className="max-w-7xl mx-auto px-6 lg:px-16 space-y-8 pb-16">
              <div className="border-b border-[#e5e5e0] pb-4">
                <h2 className="text-xs font-bold text-[#8d734a] tracking-[0.2em] uppercase font-serif italic mb-1">
                  Explore Portals
                </h2>
                <p className="text-2xl sm:text-3xl font-bold text-[#1a1a1a] font-serif">
                  Laboratory Systems & Resources
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Portal 1: Instrument Reservation */}
                <div 
                  onClick={() => navigateTo("instruments")}
                  className="bg-[#fdfdfc] border border-[#e5e5e0] hover:border-[#004b3a] rounded-sm p-6 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-sm bg-[#004b3a] text-white flex items-center justify-center">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 font-serif group-hover:text-[#004b3a] transition">
                      Instrument Reservation System
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Instant online booking for high-precision analytical equipment, spectrophotometers, bioreactors, and ovens.
                    </p>
                  </div>
                  <div className="pt-4 mt-4 border-t border-[#e5e5e0] flex items-center text-xs font-bold text-[#004b3a] gap-1">
                    <span>Access Booking System</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Portal 2: Chemical Inventory */}
                <div 
                  onClick={() => navigateTo("chemicals")}
                  className="bg-[#fdfdfc] border border-[#e5e5e0] hover:border-[#004b3a] rounded-sm p-6 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-sm bg-[#8d734a] text-white flex items-center justify-center">
                      <FlaskConical className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 font-serif group-hover:text-[#004b3a] transition">
                      Chemical & Reagent Inventory
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Query laboratory chemicals with Item ID, Chinese/English nomenclature, chemical formulas, and CAS numbers.
                    </p>
                  </div>
                  <div className="pt-4 mt-4 border-t border-[#e5e5e0] flex items-center text-xs font-bold text-[#8d734a] gap-1">
                    <span>Query Chemical Database</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Portal 3: Research Topics */}
                <div 
                  onClick={() => navigateTo("members", "topics")}
                  className="bg-[#fdfdfc] border border-[#e5e5e0] hover:border-[#004b3a] rounded-sm p-6 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-sm bg-[#004b3a]/15 text-[#004b3a] border border-[#004b3a]/30 flex items-center justify-center">
                      <Network className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 font-serif group-hover:text-[#004b3a] transition">
                      Research Pillars & Topics
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Explore our active research clusters: coastal restoration materials, PEF biopolyesters, VOC biofilters, and green composites.
                    </p>
                  </div>
                  <div className="pt-4 mt-4 border-t border-[#e5e5e0] flex items-center text-xs font-bold text-[#004b3a] gap-1">
                    <span>View Research Topics</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Portal 4: Journal Club Archive */}
                <div 
                  onClick={() => navigateTo("archive")}
                  className="bg-[#fdfdfc] border border-[#e5e5e0] hover:border-[#004b3a] rounded-sm p-6 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-sm bg-[#8d734a]/15 text-[#8d734a] border border-[#8d734a]/30 flex items-center justify-center">
                      <Archive className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 font-serif group-hover:text-[#004b3a] transition">
                      Journal Club Archive
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Browse literature presentation slides, past journal review recordings, and shared academic files.
                    </p>
                  </div>
                  <div className="pt-4 mt-4 border-t border-[#e5e5e0] flex items-center text-xs font-bold text-[#8d734a] gap-1">
                    <span>Explore Journal Archive</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ================= PAGE 2: MEMBERS & TOPICS ================= */}
        {currentPage === "members" && (
          <div className="py-12 px-6 lg:px-16 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
            {/* Header & Sub-tab switcher */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#e5e5e0] pb-6">
              <div>
                <h2 className="text-xs font-bold text-[#8d734a] tracking-[0.2em] uppercase mb-1 font-serif italic">
                  Research Team & Topics
                </h2>
                <p className="text-3xl font-bold text-[#1a1a1a] tracking-tight font-serif">
                  Members & Research Overview
                </p>
              </div>

              {/* Nested Sub-Tab Switcher (English) */}
              <div className="flex items-center bg-[#f8f8f5] border border-[#e5e5e0] rounded-sm p-1 shadow-xs text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setMembersSubTab("directory")}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-sm transition ${
                    membersSubTab === "directory"
                      ? "bg-[#004b3a] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Member Directory</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMembersSubTab("topics")}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-sm transition ${
                    membersSubTab === "topics"
                      ? "bg-[#004b3a] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>Topic Overview</span>
                </button>
              </div>
            </div>

            {/* NESTED VIEW A: Member Directory */}
            {membersSubTab === "directory" ? (
              <div className="space-y-6">
                {/* Search & Role Filter Toolbar */}
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-[#004b3a] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search member name, role, research topic, keywords..."
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#e5e5e0] rounded-sm text-xs md:text-sm font-sans focus:outline-none focus:border-[#004b3a] focus:ring-1 focus:ring-[#004b3a]"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Role filter buttons */}
                  <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setMemberRoleFilter("ALL")}
                      className={`px-3 py-1.5 rounded-sm text-xs font-bold transition ${
                        memberRoleFilter === "ALL"
                          ? "bg-[#004b3a] text-white shadow-xs"
                          : "bg-white text-slate-600 border border-[#e5e5e0] hover:bg-[#f8f8f5]"
                      }`}
                    >
                      All Roles
                    </button>
                    {memberRoles.map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setMemberRoleFilter(role)}
                        className={`px-3 py-1.5 rounded-sm text-xs font-bold transition ${
                          memberRoleFilter === role
                            ? "bg-[#004b3a] text-white shadow-xs"
                            : "bg-white text-slate-600 border border-[#e5e5e0] hover:bg-[#f8f8f5]"
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Member Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredMembers.length > 0 ? (
                    filteredMembers.map((m) => (
                      <div 
                        key={m.id} 
                        className="border border-[#e5e5e0] bg-[#fdfdfc] hover:border-[#004b3a] hover:shadow-md rounded-sm p-6 flex flex-col justify-between transition-all duration-300 group"
                      >
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="text-lg font-bold text-[#1a1a1a] font-serif flex items-baseline gap-2">
                                {m.name_zh}
                                {m.name_en && m.name_zh !== m.name_en && (
                                  <span className="text-xs font-normal text-[#666] font-mono">{m.name_en}</span>
                                )}
                              </h4>
                              <p className="text-[11px] text-[#8d734a] font-bold font-serif italic mt-0.5">
                                {isExchangeRole(m.role, m.role_en)
                                  ? (m.role_en && m.role_en !== m.role ? `${m.role || "交換學生"} · ${m.role_en}` : (m.role || "交換學生"))
                                  : m.role}
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

                        {/* Card bottom action: 1-click Generate ID Card */}
                        <div className="pt-4 mt-4 border-t border-[#e5e5e0] flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => handleGenerateCardForMember(m)}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#8d734a] hover:text-[#004b3a] transition"
                          >
                            <IdCard className="w-3.5 h-3.5" />
                            <span>Generate Card</span>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full py-12 text-center bg-[#fdfdfc] border border-dashed border-[#e5e5e0] rounded-sm">
                      <HelpCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-[#666] font-medium">No matching laboratory members found.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* NESTED VIEW B: Topic Bento Network */
              <div className="space-y-8">
                <div className="relative w-full rounded-sm border border-[#e5e5e0] bg-[#fdfdfc] p-6 md:p-10 overflow-hidden shadow-xs">
                  <div className="absolute w-72 h-72 bg-[#004b3a]/5 rounded-full blur-3xl -top-10 -left-10 pointer-events-none"></div>
                  <div className="absolute w-72 h-72 bg-[#8d734a]/5 rounded-full blur-3xl -bottom-10 -right-10 pointer-events-none"></div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-center relative z-10">
                    {/* Left Columns: Topics 1-3 */}
                    <div className="md:col-span-2 space-y-6 flex flex-col items-center w-full">
                      {/* Topic A */}
                      <div className="group relative bg-[#f8f8f5] border border-[#e5e5e0] hover:border-[#004b3a] p-4 rounded-sm shadow-xs hover:shadow-md transition-all duration-300 w-full flex gap-4 items-start">
                        <div className="w-24 sm:w-28 aspect-[4/3] rounded-sm bg-white border border-[#e5e5e0] overflow-hidden shrink-0 shadow-xs mt-1">
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
                            <span className="text-[9px] bg-white border border-[#e5e5e0] text-[#004b3a] px-2 py-0.5 rounded-sm font-medium">Kevin</span>
                            <span className="text-[9px] bg-white border border-[#e5e5e0] text-[#004b3a] px-2 py-0.5 rounded-sm font-medium">Peter</span>
                          </div>
                        </div>
                      </div>

                      {/* Topic B */}
                      <div className="group relative bg-[#f8f8f5] border border-[#e5e5e0] hover:border-[#004b3a] p-4 rounded-sm shadow-xs hover:shadow-md transition-all duration-300 w-full flex gap-4 items-start">
                        <div className="w-24 sm:w-28 aspect-[4/3] rounded-sm bg-white border border-[#e5e5e0] overflow-hidden shrink-0 shadow-xs mt-1">
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
                            <span className="text-[9px] bg-white border border-[#e5e5e0] text-[#004b3a] px-2 py-0.5 rounded-sm font-medium">Kalin</span>
                            <span className="text-[9px] bg-white border border-[#e5e5e0] text-[#004b3a] px-2 py-0.5 rounded-sm font-medium">Fanny</span>
                          </div>
                        </div>
                      </div>

                      {/* Topic C */}
                      <div className="group relative bg-[#f8f8f5] border border-[#e5e5e0] hover:border-[#004b3a] p-4 rounded-sm shadow-xs hover:shadow-md transition-all duration-300 w-full flex gap-4 items-start">
                        <div className="w-24 sm:w-28 aspect-[4/3] rounded-sm bg-white border border-[#e5e5e0] overflow-hidden shrink-0 shadow-xs mt-1">
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
                            <span className="text-[9px] bg-white border border-[#e5e5e0] text-[#004b3a] px-2 py-0.5 rounded-sm font-medium">Fanny</span>
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

                    {/* Right Columns: Topics 4-6 */}
                    <div className="md:col-span-2 space-y-6 flex flex-col items-center w-full">
                      {/* Topic D */}
                      <div className="group relative bg-[#f8f8f5] border border-[#e5e5e0] hover:border-[#004b3a] p-4 rounded-sm shadow-xs hover:shadow-md transition-all duration-300 w-full flex gap-4 items-start md:flex-row-reverse md:text-right">
                        <div className="w-24 sm:w-28 aspect-[4/3] rounded-sm bg-white border border-[#e5e5e0] overflow-hidden shrink-0 shadow-xs mt-1">
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
                            <span className="text-[9px] bg-white border border-[#e5e5e0] text-[#004b3a] px-2 py-0.5 rounded-sm font-medium">Fanny</span>
                          </div>
                        </div>
                      </div>

                      {/* Topic E */}
                      <div className="group relative bg-[#f8f8f5] border border-[#e5e5e0] hover:border-[#004b3a] p-4 rounded-sm shadow-xs hover:shadow-md transition-all duration-300 w-full flex gap-4 items-start md:flex-row-reverse md:text-right">
                        <div className="w-24 sm:w-28 aspect-[4/3] rounded-sm bg-white border border-[#e5e5e0] overflow-hidden shrink-0 shadow-xs mt-1">
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
                            <span className="text-[9px] bg-white border border-[#e5e5e0] text-[#004b3a] px-2 py-0.5 rounded-sm font-medium">Tina</span>
                            <span className="text-[9px] bg-white border border-[#e5e5e0] text-[#004b3a] px-2 py-0.5 rounded-sm font-medium">Martin</span>
                            <span className="text-[9px] bg-white border border-[#e5e5e0] text-[#004b3a] px-2 py-0.5 rounded-sm font-medium">Nina</span>
                          </div>
                        </div>
                      </div>

                      {/* Topic F */}
                      <div className="group relative bg-[#f8f8f5] border border-[#e5e5e0] hover:border-[#004b3a] p-4 rounded-sm shadow-xs hover:shadow-md transition-all duration-300 w-full flex gap-4 items-start md:flex-row-reverse md:text-right">
                        <div className="w-24 sm:w-28 aspect-[4/3] rounded-sm bg-white border border-[#e5e5e0] overflow-hidden shrink-0 shadow-xs mt-1">
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
                            <span className="text-[9px] bg-white border border-[#e5e5e0] text-[#004b3a] px-2 py-0.5 rounded-sm font-medium">Chris</span>
                            <span className="text-[9px] bg-white border border-[#e5e5e0] text-[#004b3a] px-2 py-0.5 rounded-sm font-medium">Eko</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= PAGE 3: INSTRUMENTS ================= */}
        {currentPage === "instruments" && (
          <div className="py-12 px-6 lg:px-16 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
            <InstrumentReservation onBackToHome={() => navigateTo("home")} />
          </div>
        )}

        {/* ================= PAGE 4: CHEMICALS ================= */}
        {currentPage === "chemicals" && (
          <div className="py-12 px-6 lg:px-16 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
            <ChemicalInventory onBackToHome={() => navigateTo("home")} />
          </div>
        )}

        {/* ================= PAGE 5: CARD GENERATOR ================= */}
        {currentPage === "card-generator" && (
          <div className="py-12 px-6 lg:px-16 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-[#e5e5e0] pb-4">
              <h2 className="text-xs font-bold text-[#8d734a] tracking-[0.2em] uppercase font-serif italic mb-1">
                Visual Identity
              </h2>
              <p className="text-3xl font-bold text-[#1a1a1a] font-serif">
                Academic Card Generator
              </p>
            </div>
            <BusinessCardGenerator />
          </div>
        )}

        {/* ================= PAGE 6: SCHEDULE ================= */}
        {currentPage === "schedule" && (
          <div className="py-12 px-6 lg:px-16 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e5e5e0] pb-6">
              <div>
                <h2 className="text-xs font-bold text-[#8d734a] tracking-[0.2em] uppercase mb-1 font-serif italic">
                  Calendar & Events
                </h2>
                <p className="text-3xl font-bold text-[#1a1a1a] font-serif">
                  Group Meeting Schedule
                </p>
              </div>
              
              {/* Calendar tab toggler with Week View, Month View, Agenda View */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center bg-[#f8f8f5] border border-[#e5e5e0] rounded-sm p-1 shadow-xs text-xs font-bold">
                  <button 
                    onClick={() => setCalendarView("week")}
                    className={`px-3.5 py-1.5 rounded-sm transition-all ${
                      calendarView === "week" 
                        ? "bg-[#004b3a] text-white shadow-xs" 
                        : "text-slate-700 hover:bg-[#fafafa]"
                    }`}
                  >
                    Week View (週視圖)
                  </button>
                  <button 
                    onClick={() => setCalendarView("month")}
                    className={`px-3.5 py-1.5 rounded-sm transition-all ${
                      calendarView === "month" 
                        ? "bg-[#004b3a] text-white shadow-xs" 
                        : "text-slate-700 hover:bg-[#fafafa]"
                    }`}
                  >
                    Month View (月視圖)
                  </button>
                  <button 
                    onClick={() => setCalendarView("list")}
                    className={`px-3.5 py-1.5 rounded-sm transition-all ${
                      calendarView === "list" 
                        ? "bg-[#004b3a] text-white shadow-xs" 
                        : "text-slate-700 hover:bg-[#fafafa]"
                    }`}
                  >
                    Agenda View (清單)
                  </button>
                </div>

                <a 
                  href="https://calendar.google.com/calendar/u/0/r" 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#fdfdfc] hover:bg-[#f8f8f5] text-slate-700 border border-[#e5e5e0] rounded-sm text-xs font-bold shadow-xs transition"
                  title="Open Google Calendar in new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#8d734a]" />
                  <span className="hidden sm:inline">Google Calendar</span>
                </a>
              </div>
            </div>

            <div className="relative w-full h-[720px] rounded-sm overflow-hidden border border-[#e5e5e0] bg-[#fdfdfc] shadow-xs p-4 flex flex-col">
              {/* Calendar Category legends */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4 text-xs font-semibold px-2">
                <div className="flex flex-wrap items-center gap-4">
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

                <span className="text-[11px] text-slate-500 font-mono hidden md:inline">
                  Current View: {calendarView === "week" ? "Week View (Less Crowded)" : calendarView === "month" ? "Month View" : "Agenda View"}
                </span>
              </div>

              {/* Google Calendar Iframe Render */}
              <iframe 
                src={`https://calendar.google.com/calendar/embed?mode=${
                  calendarView === "week" ? "WEEK" : calendarView === "month" ? "MONTH" : "AGENDA"
                }&showNav=1&showTitle=0&showTabs=0&src=ebblab115%40gmail.com&color=%23F09300&src=4576ed913eb7922183266a6a8b02606c412a539451ccc8ac5bbd427701d6fe97%40group.calendar.google.com&color=%230B8043&src=zh-tw.taiwan%23holiday%40group.v.calendar.google.com&color=%23039BE5&ctz=Asia%2FTaipei`}
                style={{ border: 0 }} 
                className="w-full flex-1 rounded-sm border border-[#e5e5e0]/60 block" 
                frameBorder="0" 
                scrolling="no"
                title="EBB Lab Schedule"
              />
            </div>
          </div>
        )}

        {/* ================= PAGE 7: ARCHIVE ================= */}
        {currentPage === "archive" && (
          <div className="py-12 px-6 lg:px-16 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-200">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#e5e5e0] pb-6">
              <div>
                <h2 className="text-xs font-bold text-[#8d734a] tracking-[0.2em] uppercase mb-1 font-serif italic">
                  Literature Review
                </h2>
                <p className="text-3xl font-bold text-[#1a1a1a] font-serif">
                  Journal Club Archive
                </p>
              </div>
              
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-[#004b3a] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter papers or speaker..."
                  className="w-full pl-9 pr-4 py-2 bg-white border border-[#e5e5e0] rounded-sm text-xs font-sans focus:outline-none focus:border-[#004b3a]"
                />
              </div>
            </div>

            <div className="border border-[#e5e5e0] rounded-sm overflow-hidden bg-[#fdfdfc] shadow-xs">
              {sortedGroupNames.length > 0 ? (
                sortedGroupNames.map((groupName, index) => {
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
                          {groupMeetings.length} Papers
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
                                      setSearchQuery(m.speaker);
                                      navigateTo("members", "directory");
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
                  <p className="text-sm text-[#666] font-medium">No journal presentation found matching query.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= PAGE 8: DATA STUDIO ================= */}
        {currentPage === "studio" && (
          <div className="py-12 px-6 lg:px-16 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
            <div className="border-b border-[#e5e5e0] pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-[#8d734a] tracking-[0.2em] uppercase font-serif italic mb-1">
                  Administrative CMS
                </h2>
                <p className="text-3xl font-bold text-[#1a1a1a] font-serif">
                  Lab Data Studio
                </p>
              </div>

              {isAuthenticated && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-sm text-xs font-bold hover:bg-rose-100 transition"
                >
                  Logout
                </button>
              )}
            </div>

            {isAuthenticated ? (
              <LabDataGenerator
                initialMembers={activeMembers}
                initialMeetings={activeMeetings}
                onApplyData={(updatedMembers, updatedMeetings) => {
                  setActiveMembers(updatedMembers);
                  setActiveMeetings(updatedMeetings);
                  setCollapsedGroups({});
                  try {
                    localStorage.setItem(MEMBERS_STORAGE_KEY, JSON.stringify(updatedMembers));
                    localStorage.setItem(MEETINGS_STORAGE_KEY, JSON.stringify(updatedMeetings));
                  } catch (e) {
                    console.error("Failed to save to localStorage:", e);
                  }
                }}
                onResetToDefault={() => {
                  if (confirm("確定要重置並還原為代碼庫預設的原始資料 (labData.ts) 嗎？")) {
                    localStorage.removeItem(MEMBERS_STORAGE_KEY);
                    localStorage.removeItem(MEETINGS_STORAGE_KEY);
                    setActiveMembers(initialMembersData);
                    setActiveMeetings(initialMeetingsData);
                    setCollapsedGroups({});
                  }
                }}
                onLogout={handleLogout}
              />
            ) : (
              <div className="p-12 text-center bg-white border border-[#e5e5e0] rounded-sm space-y-4 shadow-xs">
                <Lock className="w-10 h-10 text-[#8d734a] mx-auto" />
                <h3 className="text-lg font-bold text-slate-900 font-serif">
                  Access Restricted
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Please authenticate with laboratory administrator credentials to access the data generator studio.
                </p>
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-5 py-2.5 bg-[#004b3a] hover:bg-[#003328] text-white rounded-sm text-xs font-bold uppercase tracking-wider transition"
                >
                  Unlock Lab Data Studio
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= PAGE 9: CONTACT & LOCATION ================= */}
        {currentPage === "contact" && (
          <div className="py-12 px-6 lg:px-16 max-w-7xl mx-auto space-y-12 animate-in fade-in duration-200">
            <div className="border-b border-[#e5e5e0] pb-4">
              <h2 className="text-xs font-bold text-[#8d734a] tracking-[0.2em] uppercase font-serif italic mb-1">
                Get in Touch
              </h2>
              <p className="text-3xl font-bold text-[#1a1a1a] font-serif">
                Contact & Location
              </p>
            </div>

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

                <div className="space-y-4 text-sm text-[#555] font-sans leading-relaxed">
                  <div className="flex items-start gap-3 bg-white p-4 rounded-sm border border-[#e5e5e0]">
                    <MapPin className="w-5 h-5 text-[#004b3a] shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-[#1a1a1a] font-bold">Lab Address:</span>
                      <span className="text-xs text-[#666] block mt-0.5 italic">
                        Room EC-6012, No. 70, Lianhai Rd., Gushan Dist., Kaohsiung City 80424, Taiwan
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-white p-4 rounded-sm border border-[#e5e5e0]">
                    <Mail className="w-5 h-5 text-[#004b3a] shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-[#1a1a1a] font-bold">Email:</span>
                      <a href="mailto:ebblab115@gmail.com" className="text-xs text-[#004b3a] font-mono hover:underline block mt-0.5">
                        ebblab115@gmail.com
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Map Column */}
              <div className="lg:col-span-7 h-80 sm:h-96 rounded-sm overflow-hidden border border-[#e5e5e0] p-1 bg-[#fdfdfc] shadow-xs relative">
                <iframe 
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3682.7235084920436!2d120.26359567584555!3d22.626829730310243!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x346e047710b7849d%3A0xc6fc1da710777fa6!2sNo.%2070%2C%20Lianhai%20Rd%2C%20Gushan%20District%2C%20Kaohsiung%20City%2C%20804!5e0!3m2!1sen!2stw!4v1700000000000!5m2!1sen!2stw" 
                  className="w-full h-full rounded-sm opacity-95" 
                  style={{ border: 0 }} 
                  allowFullScreen={true} 
                  loading="lazy"
                  title="NSYSU Map Location"
                />
              </div>
            </div>

            <footer className="pt-8 border-t border-[#e5e5e0] flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#888] font-mono">
              <p>Copyright © 2026 EBB Lab. All Rights Reserved.</p>
              <p className="flex items-center gap-1">
                <Code className="w-3.5 h-3.5 text-[#004b3a]" />
                <span>Environmental Biotechnology & Biorefinery</span>
              </p>
            </footer>
          </div>
        )}

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
