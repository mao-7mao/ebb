import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  FlaskConical, 
  ExternalLink, 
  RefreshCw, 
  QrCode, 
  Search, 
  Copy, 
  Check, 
  Table, 
  LayoutGrid,
  Eye, 
  AlertTriangle,
  Maximize2,
  Minimize2,
  Layers,
  Filter,
  Wind,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  Sliders,
  Sparkles,
  X
} from "lucide-react";
import QRCodeLib from "qrcode";
import { EXTERNAL_LINKS, CabinetConfig } from "../config/externalLinks";

interface ChemicalInventoryProps {
  onBackToHome?: () => void;
}

export interface StandardChemicalItem {
  id: string;
  cabinet: string;        // A, B, C, D, E, Gas
  cabinetName: string;
  no: string;             // 編號 (e.g. A01, B12, D1, G01)
  nameZh: string;         // 中文名稱
  nameEn: string;         // 英文名稱
  formula: string;        // 化學式
  cas: string;            // CAS 號碼
  note?: string;
  rawOriginal?: Record<string, string>;
}

type SortKey = "no" | "nameZh" | "nameEn" | "formula" | "cas" | "cabinet";
type Density = "compact" | "comfortable";

// Helper to format chemical formula subscripts (e.g. H2O -> H₂O, Fe2(SO4)3 -> Fe₂(SO₄)₃)
function formatChemicalFormula(formula: string, searchQuery?: string): React.ReactNode {
  if (!formula || formula === "—" || formula === "-") return <span className="text-slate-400">—</span>;
  
  const parts = formula.split(/(\d+)/);
  return (
    <span className="font-mono tracking-tight font-semibold text-slate-800">
      {parts.map((part, index) => {
        if (/^\d+$/.test(part)) {
          return <sub key={index} className="text-[10px] font-normal leading-none bottom-[-0.2em] relative text-slate-600">{part}</sub>;
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}

// Highlight matching search query
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || !text || text === "—") return text;
  const q = query.trim();
  if (!q) return text;

  try {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = text.split(regex);
    if (parts.length === 1) return text;

    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === q.toLowerCase() ? (
            <mark key={i} className="bg-amber-200/90 text-slate-950 font-bold px-0.5 rounded-xs">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  } catch {
    return text;
  }
}

export default function ChemicalInventory({ onBackToHome }: ChemicalInventoryProps) {
  const spreadsheetId = EXTERNAL_LINKS.chemicalSpreadsheetId;
  const cabinets = EXTERNAL_LINKS.chemicalCabinets;

  // Selected cabinet filter ("ALL" or specific cabinet ID "A", "B", "C", "D", "E", "Gas")
  const [selectedCabinetId, setSelectedCabinetId] = useState<string>("ALL");

  // Tab view: clean optimized table/cards vs raw spreadsheet embed
  const [activeTab, setActiveTab] = useState<"clean" | "embed">("clean");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [density, setDensity] = useState<Density>("compact");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [letterFilter, setLetterFilter] = useState<string>("ALL");

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>("no");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Pagination
  const [pageSize, setPageSize] = useState<number | "all">(30);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Data items for all cabinets
  const [items, setItems] = useState<StandardChemicalItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Mobile QR Code modal & CAS copy state
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [copiedCas, setCopiedCas] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Table container ref for scrolling to top on page change
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Active cabinet configuration for embed URL or links
  const currentCabinetConfig = useMemo(() => {
    return cabinets.find((c) => c.id === selectedCabinetId) || cabinets[0];
  }, [cabinets, selectedCabinetId]);

  const activeSheetUrl = useMemo(() => {
    const gid = currentCabinetConfig.gid;
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?gid=${gid}#gid=${gid}`;
  }, [spreadsheetId, currentCabinetConfig]);

  const embedUrl = useMemo(() => {
    const gid = currentCabinetConfig.gid;
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/htmlembed?gid=${gid}&widget=false&chrome=false&single=true`;
  }, [spreadsheetId, currentCabinetConfig]);

  // Generate QR code for mobile quick scan
  useEffect(() => {
    QRCodeLib.toDataURL(activeSheetUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: "#004b3a",
        light: "#ffffff",
      },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error("QR Code Error:", err));
  }, [activeSheetUrl]);

  // CSV Parser
  const parseCSV = (text: string): string[][] => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let cur = "";
      let inQuote = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuote && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuote = !inQuote;
          }
        } else if (char === "," && !inQuote) {
          result.push(cur.trim());
          cur = "";
        } else {
          cur += char;
        }
      }
      result.push(cur.trim());
      return result;
    };

    return lines.map((line) => parseLine(line));
  };

  // Helper to remove merged header prefixes if present
  const cleanPrefix = (str: string, prefixes: string[]): string => {
    if (!str) return "";
    let s = str.trim();
    for (const p of prefixes) {
      if (s.toLowerCase().startsWith(p.toLowerCase())) {
        s = s.substring(p.length).trim();
      }
    }
    return s;
  };

  // Extract standard items for specific cabinet schema
  const extractItemsForCabinet = (cab: CabinetConfig, rawRows: string[][]): StandardChemicalItem[] => {
    const cabId = cab.id;
    const parsedList: StandardChemicalItem[] = [];

    if (cabId === "A") {
      rawRows.forEach((r, idx) => {
        const no = r[0] || `A${String(idx + 1).padStart(2, "0")}`;
        const nameZh = cleanPrefix(r[1], ["中文名稱", "中文"]);
        const nameEn = cleanPrefix(r[2], ["英文名稱", "英文"]);
        const formula = cleanPrefix(r[3], ["化學式", "分子式"]);
        const cas = cleanPrefix(r[5] || r[4] || "", ["CAS 號碼", "CAS號碼", "CAS"]);
        if (!nameZh && !nameEn) return;
        parsedList.push({
          id: `A-${idx + 1}`,
          cabinet: "A",
          cabinetName: "A 櫃",
          no,
          nameZh: nameZh || "—",
          nameEn: nameEn || "—",
          formula: formula || "—",
          cas: cas || "—",
        });
      });
    } else if (cabId === "B" || cabId === "C") {
      const dataRows = rawRows.slice(1);
      dataRows.forEach((r, idx) => {
        const no = r[0] || `${cabId}${String(idx + 1).padStart(2, "0")}`;
        const nameZh = cleanPrefix(r[1], ["中文名稱", "中文"]);
        const nameEn = cleanPrefix(r[2], ["英文名稱", "英文"]);
        const formula = cleanPrefix(r[3], ["化學式", "分子式"]);
        const cas = cleanPrefix(r[4] || "", ["CAS 號碼", "CAS號碼", "CAS"]);
        if (!nameZh && !nameEn && !formula) return;
        parsedList.push({
          id: `${cabId}-${idx + 1}`,
          cabinet: cabId,
          cabinetName: `${cabId} 櫃`,
          no,
          nameZh: nameZh || "—",
          nameEn: nameEn || "—",
          formula: formula || "—",
          cas: cas || "—",
        });
      });
    } else if (cabId === "D") {
      const dataRows = rawRows.slice(1);
      dataRows.forEach((r, idx) => {
        const no = r[0] || `D${idx + 1}`;
        const nameZh = cleanPrefix(r[1], ["中文名稱", "中文"]);
        const nameEn = cleanPrefix(r[2], ["英文名稱", "英文"]);
        const formula = cleanPrefix(r[3], ["化學式", "分子式"]);
        const cas = cleanPrefix(r[4] || "", ["CAS 號碼", "CAS號碼", "CAS"]);
        if (!nameZh && !nameEn && !formula) return;
        parsedList.push({
          id: `D-${idx + 1}`,
          cabinet: "D",
          cabinetName: "D 櫃 (毒化物)",
          no,
          nameZh: nameZh || "—",
          nameEn: nameEn || "—",
          formula: formula || "—",
          cas: cas || "—",
        });
      });
    } else if (cabId === "E") {
      const dataRows = rawRows.slice(1);
      dataRows.forEach((r, idx) => {
        const no = r[0] || `E${String(idx + 1).padStart(2, "0")}`;
        const nameZh = cleanPrefix(r[1], ["中文名稱", "中文"]);
        const nameEn = cleanPrefix(r[2], ["英文名稱", "英文"]);
        const formula = cleanPrefix(r[4] || r[3] || "", ["化學式", "分子式"]);
        const cas = cleanPrefix(r[5] || "", ["CAS 號碼", "CAS號碼", "CAS"]);
        if (!nameZh && !nameEn && !formula) return;
        parsedList.push({
          id: `E-${idx + 1}`,
          cabinet: "E",
          cabinetName: "E 櫃",
          no,
          nameZh: nameZh || "—",
          nameEn: nameEn || "—",
          formula: formula || "—",
          cas: cas || "—",
        });
      });
    } else if (cabId === "Gas") {
      const dataRows = rawRows.slice(1);
      dataRows.forEach((r, idx) => {
        const no = `G${String(idx + 1).padStart(2, "0")}`;
        const gasType = r[2] || "";
        const stock = r[3] || "";
        const loc = r[4] || "";
        const status = r[5] || "";
        if (!gasType) return;
        parsedList.push({
          id: `Gas-${idx + 1}`,
          cabinet: "Gas",
          cabinetName: "氣體鋼瓶",
          no,
          nameZh: `氣體: ${gasType}`,
          nameEn: loc ? `位置: ${loc} (${status || "使用中"})` : `庫存: ${stock}`,
          formula: gasType,
          cas: "—",
        });
      });
    }

    return parsedList;
  };

  // Fetch all cabinets
  const loadAllChemicalCabinets = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setLoadingProgress("Fetching cabinets A, B, C, D, E & Gas...");

    try {
      const promises = cabinets.map(async (cab) => {
        const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${cab.gid}`;
        try {
          const res = await fetch(csvUrl);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const text = await res.text();
          const rows = parseCSV(text);
          return extractItemsForCabinet(cab, rows);
        } catch (err) {
          console.warn(`Failed to fetch cabinet ${cab.id}:`, err);
          return [];
        }
      });

      const results = await Promise.all(promises);
      const combined = results.flat();

      if (combined.length > 0) {
        setItems(combined);
      } else {
        setItems(getDefaultLabChemicals());
      }
    } catch (err: any) {
      console.error("Error loading chemical cabinets:", err);
      setErrorMsg("Could not load some cabinets from Google Sheets.");
      setItems(getDefaultLabChemicals());
    } finally {
      setIsLoading(false);
      setLoadingProgress("");
    }
  };

  useEffect(() => {
    loadAllChemicalCabinets();
  }, [spreadsheetId]);

  // Reset pagination when search query or cabinet selection or letter filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCabinetId, searchQuery, letterFilter, pageSize]);

  // Filter items by cabinet, search query, and letter
  const filteredItems = useMemo(() => {
    let result = items;

    // 1. Filter by cabinet
    if (selectedCabinetId !== "ALL") {
      result = result.filter((item) => item.cabinet === selectedCabinetId);
    }

    // 2. Filter by English name initial letter
    if (letterFilter !== "ALL") {
      result = result.filter((item) => {
        const firstLetter = item.nameEn?.trim().charAt(0).toUpperCase();
        return firstLetter === letterFilter;
      });
    }

    // 3. Filter by search query
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      result = result.filter((item) => {
        return (
          item.no.toLowerCase().includes(query) ||
          item.nameZh.toLowerCase().includes(query) ||
          item.nameEn.toLowerCase().includes(query) ||
          item.formula.toLowerCase().includes(query) ||
          item.cas.toLowerCase().includes(query) ||
          item.cabinetName.toLowerCase().includes(query)
        );
      });
    }

    // 4. Sort
    return [...result].sort((a, b) => {
      let valA = a[sortKey] || "";
      let valB = b[sortKey] || "";

      // For "no", use alphanumeric natural sorting (e.g. A01 < A02 < A10)
      if (sortKey === "no") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB, undefined, { numeric: true, sensitivity: "base" })
          : valB.localeCompare(valA, undefined, { numeric: true, sensitivity: "base" });
      }

      const cmp = valA.localeCompare(valB, "zh-Hant");
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [items, selectedCabinetId, letterFilter, searchQuery, sortKey, sortOrder]);

  // Pagination calculation
  const totalItems = filteredItems.length;
  const totalPages = pageSize === "all" ? 1 : Math.ceil(totalItems / (pageSize as number)) || 1;
  const paginatedItems = useMemo(() => {
    if (pageSize === "all") return filteredItems;
    const start = (currentPage - 1) * (pageSize as number);
    return filteredItems.slice(start, start + (pageSize as number));
  }, [filteredItems, currentPage, pageSize]);

  // Item counts per cabinet
  const cabinetCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: items.length };
    cabinets.forEach((cab) => {
      counts[cab.id] = items.filter((i) => i.cabinet === cab.id).length;
    });
    return counts;
  }, [items, cabinets]);

  // Available initial letters from currently filtered list
  const availableLetters = useMemo(() => {
    const set = new Set<string>();
    items
      .filter((i) => selectedCabinetId === "ALL" || i.cabinet === selectedCabinetId)
      .forEach((item) => {
        const char = item.nameEn?.trim().charAt(0).toUpperCase();
        if (char && char >= "A" && char <= "Z") {
          set.add(char);
        }
      });
    return Array.from(set).sort();
  }, [items, selectedCabinetId]);

  const handleCopyCas = (cas: string) => {
    if (!cas || cas === "—") return;
    navigator.clipboard.writeText(cas);
    setCopiedCas(cas);
    setTimeout(() => setCopiedCas(null), 2000);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className={`space-y-4 transition-all ${isFullscreen ? "fixed inset-0 z-50 bg-[#f4f1ea] p-4 lg:p-6 overflow-y-auto" : ""}`}>
      {/* Header section with English Controls */}
      <div className="bg-[#fdfdfc] border border-[#e5e5e0] rounded-sm p-4 md:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-sm bg-[#004b3a] text-white">
              <FlaskConical className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-[#8d734a] tracking-widest uppercase font-serif italic">
              Laboratory Reagents & Safety
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-[#1a1a1a] font-serif flex items-center gap-2">
            Chemical Inventory Database
          </h2>
          <p className="text-xs text-slate-500 max-w-xl font-sans">
            Optimized fast-lookup directory for Cabinets A–E and Gas Cylinders ({items.length} total items indexed).
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-[#f8f8f5] border border-[#e5e5e0] rounded-sm p-0.5 shadow-2xs text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("clean")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition ${
                activeTab === "clean"
                  ? "bg-[#004b3a] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Optimized View</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("embed")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm transition ${
                activeTab === "embed"
                  ? "bg-[#004b3a] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Spreadsheet Embed</span>
            </button>
          </div>

          {/* QR Code Share */}
          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f8f8f5] hover:bg-[#eae6dc] text-slate-700 border border-[#e5e5e0] rounded-sm text-xs font-bold transition shadow-2xs"
            title="Scan QR Code on Mobile"
          >
            <QrCode className="w-3.5 h-3.5 text-[#004b3a]" />
            <span className="hidden sm:inline">Mobile QR</span>
          </button>

          {/* Reload data */}
          <button
            type="button"
            onClick={loadAllChemicalCabinets}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f8f8f5] hover:bg-[#eae6dc] text-slate-700 border border-[#e5e5e0] rounded-sm text-xs font-bold transition shadow-2xs"
            title="Reload All Cabinets"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#004b3a] ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Fullscreen toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f8f8f5] hover:bg-[#eae6dc] text-slate-700 border border-[#e5e5e0] rounded-sm text-xs font-bold transition shadow-2xs"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-[#004b3a]" /> : <Maximize2 className="w-3.5 h-3.5 text-[#004b3a]" />}
          </button>

          {/* Open Original Google Spreadsheet Button */}
          <a
            href={activeSheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#004b3a] hover:bg-[#003328] text-white rounded-sm text-xs font-bold uppercase tracking-wider shadow-xs transition active:scale-95"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Sheet</span>
          </a>
        </div>
      </div>

      {/* Sticky/Pinned Navigation & Filter Bar */}
      <div className="sticky top-2 z-20 bg-[#fdfdfc] border border-[#e5e5e0] rounded-sm p-3 shadow-md space-y-3 backdrop-blur-md bg-white/95">
        {/* Cabinet Selector Tabs */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <div className="flex items-center gap-1.5 min-w-max">
            {/* ALL Cabinets Tab */}
            <button
              type="button"
              onClick={() => {
                setSelectedCabinetId("ALL");
                setLetterFilter("ALL");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-bold transition-all ${
                selectedCabinetId === "ALL"
                  ? "bg-[#004b3a] text-white shadow-xs"
                  : "bg-[#f8f8f5] text-slate-700 hover:bg-[#eae6dc] border border-[#e5e5e0]"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Cabinets (全部)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                selectedCabinetId === "ALL" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
              }`}>
                {cabinetCounts.ALL || 0}
              </span>
            </button>

            {/* Individual Cabinet Tabs: A, B, C, D, E, Gas */}
            {cabinets.map((cab) => {
              const isSelected = selectedCabinetId === cab.id;
              const count = cabinetCounts[cab.id] || 0;
              const isToxic = cab.id === "D";
              const isGas = cab.id === "Gas";

              return (
                <button
                  key={cab.id}
                  type="button"
                  onClick={() => {
                    setSelectedCabinetId(cab.id);
                    setLetterFilter("ALL");
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-bold transition-all ${
                    isSelected
                      ? isToxic 
                        ? "bg-amber-700 text-white shadow-xs"
                        : "bg-[#004b3a] text-white shadow-xs"
                      : isToxic
                        ? "bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100"
                        : "bg-[#f8f8f5] text-slate-700 hover:bg-[#eae6dc] border border-[#e5e5e0]"
                  }`}
                  title={cab.description}
                >
                  {isToxic && <AlertTriangle className="w-3 h-3 text-amber-300 animate-pulse" />}
                  {isGas && <Wind className="w-3 h-3" />}
                  <span>{cab.shortName}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="hidden xl:flex items-center text-[11px] text-slate-500 font-mono pr-2 truncate">
            {selectedCabinetId === "ALL" 
              ? "All chemical items combined" 
              : currentCabinetConfig.description
            }
          </div>
        </div>

        {/* Search, Letter Quick Jump & View Density Toolbar */}
        {activeTab === "clean" && (
          <div className="flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center justify-between pt-1 border-t border-[#e5e5e0]/60">
            {/* Search input with Clear & Count */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-[#004b3a] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  selectedCabinetId === "ALL"
                    ? "Instant Search: Name (中文/英文), Formula, CAS (e.g. 64-17-5), or No..."
                    : `Search ${currentCabinetConfig.shortName} by Name, Formula, CAS...`
                }
                className="w-full pl-9 pr-8 py-2 bg-white border border-[#e5e5e0] rounded-sm text-xs font-sans text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#004b3a] focus:ring-1 focus:ring-[#004b3a]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Letter Index Jump (A-Z) */}
            {availableLetters.length > 0 && (
              <div className="hidden sm:flex items-center gap-0.5 overflow-x-auto py-0.5 px-1 bg-[#f8f8f5] border border-[#e5e5e0] rounded-sm text-[10px] font-mono scrollbar-none">
                <button
                  type="button"
                  onClick={() => setLetterFilter("ALL")}
                  className={`px-1.5 py-0.5 rounded-xs font-bold transition ${
                    letterFilter === "ALL"
                      ? "bg-[#004b3a] text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  ALL
                </button>
                {availableLetters.slice(0, 16).map((letter) => (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => setLetterFilter(letterFilter === letter ? "ALL" : letter)}
                    className={`px-1.5 py-0.5 rounded-xs font-bold transition ${
                      letterFilter === letter
                        ? "bg-[#004b3a] text-white"
                        : "text-slate-600 hover:text-[#004b3a] hover:bg-white"
                    }`}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            )}

            {/* Layout Density & Page Size Controls */}
            <div className="flex items-center gap-2 shrink-0 justify-between sm:justify-end">
              {/* Density Toggle (Compact vs Comfortable) */}
              <div className="flex items-center bg-[#f8f8f5] border border-[#e5e5e0] rounded-sm p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setDensity("compact")}
                  className={`px-2 py-1 rounded-xs transition text-[11px] font-bold ${
                    density === "compact"
                      ? "bg-white text-[#004b3a] shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Compact Density (Less Scrolling)"
                >
                  Compact (緊湊)
                </button>
                <button
                  type="button"
                  onClick={() => setDensity("comfortable")}
                  className={`px-2 py-1 rounded-xs transition text-[11px] font-bold ${
                    density === "comfortable"
                      ? "bg-white text-[#004b3a] shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Spacious Density"
                >
                  Comfort (舒適)
                </button>
              </div>

              {/* Items per page selector */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-sans">
                <span className="text-[11px] text-slate-400 font-mono hidden md:inline">Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPageSize(val === "all" ? "all" : Number(val));
                  }}
                  className="bg-[#f8f8f5] border border-[#e5e5e0] rounded-sm px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#004b3a]"
                >
                  <option value={25}>25 / page</option>
                  <option value={30}>30 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
                  <option value="all">All ({totalItems})</option>
                </select>
              </div>

              {/* View Switch: Table vs Card */}
              <div className="flex items-center bg-[#f8f8f5] border border-[#e5e5e0] rounded-sm p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`p-1 rounded-xs transition ${viewMode === "table" ? "bg-white text-[#004b3a] shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"}`}
                  title="Table View"
                >
                  <Table className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-1 rounded-xs transition ${viewMode === "grid" ? "bg-white text-[#004b3a] shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"}`}
                  title="Card Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {activeTab === "clean" ? (
        <div className="bg-[#fdfdfc] border border-[#e5e5e0] rounded-sm p-3 md:p-4 shadow-sm space-y-3">
          {/* Results Summary & Top Pagination Info Bar */}
          <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 px-1 py-1 font-mono gap-2 border-b border-[#e5e5e0]/60">
            <div className="flex items-center gap-2 flex-wrap">
              <span>
                Found <strong className="text-[#004b3a] font-bold">{totalItems}</strong> matching chemicals
              </span>
              {selectedCabinetId !== "ALL" && (
                <span className="bg-[#004b3a]/10 text-[#004b3a] px-2 py-0.5 rounded-xs font-bold text-[10px]">
                  {currentCabinetConfig.shortName}
                </span>
              )}
              {letterFilter !== "ALL" && (
                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-xs font-bold text-[10px]">
                  Starts with: "{letterFilter}"
                </span>
              )}
              {searchQuery && (
                <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-xs font-bold text-[10px]">
                  Keyword: "{searchQuery}"
                </span>
              )}
            </div>

            {/* Quick Pagination indicator */}
            {pageSize !== "all" && totalPages > 1 && (
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-slate-400">
                  Page <strong className="text-slate-800">{currentPage}</strong> of {totalPages}
                </span>
                <div className="flex items-center gap-0.5 ml-1">
                  <button
                    type="button"
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-1 rounded-xs bg-[#f8f8f5] hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none text-slate-700"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded-xs bg-[#f8f8f5] hover:bg-slate-200 disabled:opacity-30 disabled:pointer-events-none text-slate-700"
                    title="Next Page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Loading indicator */}
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-[#004b3a]/20 border-t-[#004b3a] rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-bold text-[#004b3a] font-serif">
                {loadingProgress || "Loading chemical inventory records across all cabinets..."}
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-10 text-center bg-[#f8f8f5] border border-dashed border-[#e5e5e0] rounded-sm space-y-3">
              <FlaskConical className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">
                No chemicals found matching your filter criteria.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-xs text-[#004b3a] font-bold hover:underline"
                  >
                    Clear Search Query
                  </button>
                )}
                {letterFilter !== "ALL" && (
                  <button
                    type="button"
                    onClick={() => setLetterFilter("ALL")}
                    className="text-xs text-[#8d734a] font-bold hover:underline"
                  >
                    Clear Letter Filter
                  </button>
                )}
                {selectedCabinetId !== "ALL" && (
                  <button
                    type="button"
                    onClick={() => setSelectedCabinetId("ALL")}
                    className="text-xs text-[#004b3a] font-bold hover:underline"
                  >
                    View All Cabinets
                  </button>
                )}
              </div>
            </div>
          ) : viewMode === "table" ? (
            /* 1. TABLE VIEW: Highly readable, compact column widths, natural line wrapping */
            <div 
              ref={tableContainerRef}
              className="overflow-x-auto border border-[#e5e5e0] rounded-sm bg-white shadow-xs max-h-[640px] overflow-y-auto"
            >
              <table className="w-full text-left text-xs border-collapse font-sans table-auto md:table-fixed">
                <thead className="bg-[#f8f8f5] border-b border-[#e5e5e0] sticky top-0 z-10 shadow-2xs">
                  <tr>
                    {/* 1. Cabinet (櫃位) - Compact width */}
                    <th 
                      onClick={() => handleSort("cabinet")}
                      className="py-2 px-1.5 md:px-2 font-bold text-[#8d734a] font-serif tracking-wider w-16 sm:w-20 text-center uppercase text-[11px] cursor-pointer hover:bg-[#eae6dc]/60 transition select-none shrink-0"
                    >
                      <div className="flex items-center justify-center gap-0.5">
                        <span>櫃位</span>
                        {sortKey === "cabinet" ? (
                          sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-[#004b3a]" /> : <ArrowDown className="w-3 h-3 text-[#004b3a]" />
                        ) : (
                          <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>

                    {/* 2. No. (編號) - Compact width */}
                    <th 
                      onClick={() => handleSort("no")}
                      className="py-2 px-1.5 md:px-2 font-bold text-[#004b3a] font-serif tracking-wider w-14 sm:w-16 text-center uppercase text-[11px] cursor-pointer hover:bg-[#eae6dc]/60 transition select-none shrink-0"
                    >
                      <div className="flex items-center justify-center gap-0.5">
                        <span>編號</span>
                        {sortKey === "no" ? (
                          sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-[#004b3a]" /> : <ArrowDown className="w-3 h-3 text-[#004b3a]" />
                        ) : (
                          <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>

                    {/* 3. Chinese Name (中文名稱) - Wrap text */}
                    <th 
                      onClick={() => handleSort("nameZh")}
                      className="py-2 px-2.5 md:px-3 font-bold text-[#1a1a1a] font-serif tracking-wider uppercase text-[11px] w-[26%] min-w-[110px] cursor-pointer hover:bg-[#eae6dc]/60 transition select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>中文名稱 / 品名</span>
                        {sortKey === "nameZh" ? (
                          sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-[#004b3a]" /> : <ArrowDown className="w-3 h-3 text-[#004b3a]" />
                        ) : (
                          <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>

                    {/* 4. English Name (英文名稱) - Wrap text */}
                    <th 
                      onClick={() => handleSort("nameEn")}
                      className="py-2 px-2.5 md:px-3 font-bold text-[#1a1a1a] font-serif tracking-wider uppercase text-[11px] w-[34%] min-w-[130px] cursor-pointer hover:bg-[#eae6dc]/60 transition select-none"
                    >
                      <div className="flex items-center gap-1">
                        <span>英文名稱 (English Name)</span>
                        {sortKey === "nameEn" ? (
                          sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-[#004b3a]" /> : <ArrowDown className="w-3 h-3 text-[#004b3a]" />
                        ) : (
                          <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>

                    {/* 5. Formula (化學式) - Wrap text */}
                    <th 
                      onClick={() => handleSort("formula")}
                      className="py-2 px-2 md:px-2.5 font-bold text-[#004b3a] font-serif tracking-wider uppercase text-[11px] w-[18%] min-w-[85px] cursor-pointer hover:bg-[#eae6dc]/60 transition select-none"
                    >
                      <div className="flex items-center gap-0.5">
                        <span>化學式</span>
                        {sortKey === "formula" ? (
                          sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-[#004b3a]" /> : <ArrowDown className="w-3 h-3 text-[#004b3a]" />
                        ) : (
                          <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>

                    {/* 6. CAS No. (CAS 號碼) - Compact width */}
                    <th 
                      onClick={() => handleSort("cas")}
                      className="py-2 px-2 md:px-2.5 font-bold text-[#8d734a] font-serif tracking-wider uppercase text-[11px] w-28 sm:w-32 cursor-pointer hover:bg-[#eae6dc]/60 transition select-none shrink-0"
                    >
                      <div className="flex items-center gap-0.5">
                        <span>CAS 號碼</span>
                        {sortKey === "cas" ? (
                          sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-[#004b3a]" /> : <ArrowDown className="w-3 h-3 text-[#004b3a]" />
                        ) : (
                          <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 opacity-60" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5e0]/60">
                  {paginatedItems.map((item, idx) => {
                    const isToxic = item.cabinet === "D";
                    const isGas = item.cabinet === "Gas";

                    return (
                      <tr 
                        key={item.id || idx} 
                        className={`hover:bg-[#fcfaf7] transition-colors group ${
                          isToxic ? "bg-amber-50/20" : ""
                        }`}
                      >
                        {/* 1. Cabinet Column */}
                        <td className={`${density === "compact" ? "py-1.5 px-1.5" : "py-2.5 px-2"} text-center select-none text-xs`}>
                          <span className={`inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-xs border text-[10px] font-bold font-mono whitespace-nowrap ${
                            isToxic
                              ? "bg-amber-100 text-amber-900 border-amber-300"
                              : item.cabinet === "A"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : item.cabinet === "B"
                              ? "bg-blue-50 text-blue-800 border-blue-200"
                              : item.cabinet === "C"
                              ? "bg-indigo-50 text-indigo-800 border-indigo-200"
                              : item.cabinet === "E"
                              ? "bg-purple-50 text-purple-800 border-purple-200"
                              : "bg-slate-100 text-slate-800 border-slate-300"
                          }`}>
                            {isToxic && <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />}
                            {item.cabinetName}
                          </span>
                        </td>

                        {/* 2. 編號 */}
                        <td className={`${density === "compact" ? "py-1.5 px-1.5" : "py-2.5 px-2"} font-mono font-bold text-[#004b3a] text-center select-none text-xs`}>
                          <span className="bg-[#004b3a]/8 px-1 py-0.5 rounded-xs border border-[#004b3a]/15 text-[11px] whitespace-nowrap">
                            {highlightMatch(item.no, searchQuery)}
                          </span>
                        </td>

                        {/* 3. 中文名稱 - Multi-line wrap */}
                        <td className={`${density === "compact" ? "py-1.5 px-2.5 md:px-3" : "py-2.5 px-3"} font-bold text-slate-900 font-sans align-middle`}>
                          <div className="text-xs md:text-[12.5px] leading-snug break-words whitespace-normal">
                            {highlightMatch(item.nameZh, searchQuery)}
                          </div>
                        </td>

                        {/* 4. 英文名稱 - Multi-line wrap with hyphen/word break */}
                        <td className={`${density === "compact" ? "py-1.5 px-2.5 md:px-3" : "py-2.5 px-3"} text-slate-700 font-sans font-medium align-middle`}>
                          <div className="text-xs italic leading-snug break-words whitespace-normal [word-break:break-word]">
                            {highlightMatch(item.nameEn, searchQuery)}
                          </div>
                        </td>

                        {/* 5. 化學式 - Multi-line wrap if long */}
                        <td className={`${density === "compact" ? "py-1.5 px-2 md:px-2.5" : "py-2.5 px-2.5"} text-slate-800 align-middle`}>
                          <div className="text-xs leading-tight break-all whitespace-normal">
                            {formatChemicalFormula(item.formula)}
                          </div>
                        </td>

                        {/* 6. CAS 號碼 with Pubchem quick search link */}
                        <td className={`${density === "compact" ? "py-1.5 px-2 md:px-2.5" : "py-2.5 px-2.5"} align-middle`}>
                          {item.cas && item.cas !== "—" ? (
                            <div className="flex items-center gap-1 font-mono flex-wrap">
                              <a
                                href={`https://pubchem.ncbi.nlm.nih.gov/#query=${encodeURIComponent(item.cas)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-bold text-[#8d734a] hover:text-[#004b3a] bg-amber-50/80 hover:bg-amber-100 px-1 py-0.5 rounded-xs border border-amber-200 text-[10.5px] transition inline-flex items-center gap-0.5 whitespace-nowrap"
                                title="Look up on PubChem"
                              >
                                <span>{highlightMatch(item.cas, searchQuery)}</span>
                                <ExternalLink className="w-2 h-2 opacity-60" />
                              </a>
                              <button
                                type="button"
                                onClick={() => handleCopyCas(item.cas)}
                                className="p-0.5 text-slate-400 hover:text-[#004b3a] hover:bg-slate-100 rounded transition"
                                title="Copy CAS Number"
                              >
                                {copiedCas === item.cas ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-mono text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* 2. GRID CARD VIEW: Modern readable cards */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {paginatedItems.map((item) => {
                const isToxic = item.cabinet === "D";
                return (
                  <div
                    key={item.id}
                    className={`bg-white border hover:border-[#004b3a]/40 rounded-sm p-3.5 shadow-xs hover:shadow-md transition-all space-y-2 flex flex-col justify-between ${
                      isToxic ? "border-amber-300 bg-amber-50/10" : "border-[#e5e5e0]"
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between border-b border-[#e5e5e0]/60 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-xs border ${
                            isToxic ? "bg-amber-100 text-amber-900 border-amber-300" : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}>
                            {item.cabinetName}
                          </span>
                          <span className="text-xs font-mono font-bold text-[#004b3a] bg-[#004b3a]/10 px-1.5 py-0.5 rounded-xs border border-[#004b3a]/20">
                            #{highlightMatch(item.no, searchQuery)}
                          </span>
                        </div>

                        {item.cas && item.cas !== "—" && (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-mono font-bold text-[#8d734a] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              CAS {highlightMatch(item.cas, searchQuery)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyCas(item.cas)}
                              className="text-slate-400 hover:text-[#004b3a]"
                              title="Copy CAS"
                            >
                              {copiedCas === item.cas ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-900 font-serif leading-snug">
                          {highlightMatch(item.nameZh, searchQuery)}
                        </h4>
                        <p className="text-xs text-slate-600 italic font-sans mt-0.5 line-clamp-2">
                          {highlightMatch(item.nameEn, searchQuery)}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#e5e5e0]/60 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-sans text-[11px]">Formula:</span>
                      <span className="font-mono text-slate-800">
                        {formatChemicalFormula(item.formula)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Pagination Bar */}
          {pageSize !== "all" && totalPages > 1 && (
            <div className="pt-3 border-t border-[#e5e5e0]/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <span className="text-slate-500 font-mono text-[11px]">
                Showing {((currentPage - 1) * (pageSize as number)) + 1} to {Math.min(currentPage * (pageSize as number), totalItems)} of {totalItems} items
              </span>

              {/* Page Number Buttons */}
              <div className="flex items-center gap-1">
                {/* First Page */}
                <button
                  type="button"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1 rounded-sm bg-[#f8f8f5] hover:bg-slate-200 border border-[#e5e5e0] disabled:opacity-30 disabled:pointer-events-none text-slate-700 font-bold"
                  title="First Page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>

                {/* Prev */}
                <button
                  type="button"
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 rounded-sm bg-[#f8f8f5] hover:bg-slate-200 border border-[#e5e5e0] disabled:opacity-30 disabled:pointer-events-none text-slate-700 font-bold"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                {/* Page Numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    return (
                      p === 1 ||
                      p === totalPages ||
                      Math.abs(p - currentPage) <= 2
                    );
                  })
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    return (
                      <React.Fragment key={p}>
                        {prev && p - prev > 1 && (
                          <span className="px-1 text-slate-400">...</span>
                        )}
                        <button
                          type="button"
                          onClick={() => handlePageChange(p)}
                          className={`min-w-[28px] h-7 px-2 rounded-sm font-bold font-mono text-xs transition ${
                            currentPage === p
                              ? "bg-[#004b3a] text-white shadow-xs"
                              : "bg-[#f8f8f5] text-slate-700 hover:bg-[#eae6dc] border border-[#e5e5e0]"
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}

                {/* Next */}
                <button
                  type="button"
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 rounded-sm bg-[#f8f8f5] hover:bg-slate-200 border border-[#e5e5e0] disabled:opacity-30 disabled:pointer-events-none text-slate-700 font-bold"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {/* Last Page */}
                <button
                  type="button"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 rounded-sm bg-[#f8f8f5] hover:bg-slate-200 border border-[#e5e5e0] disabled:opacity-30 disabled:pointer-events-none text-slate-700 font-bold"
                  title="Last Page"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* EMBED VIEW: Google Spreadsheet Embed for active cabinet */
        <div className={`relative w-full rounded-sm overflow-hidden border border-[#e5e5e0] bg-[#fdfdfc] shadow-sm flex flex-col ${
          isFullscreen ? "h-[calc(100vh-130px)]" : "h-[760px] md:h-[840px]"
        }`}>
          <div className="bg-[#f8f8f5] border-b border-[#e5e5e0] px-4 py-2 flex items-center justify-between text-xs">
            <span className="font-bold text-[#004b3a] font-serif">
              Google Spreadsheet Embed: {currentCabinetConfig.name}
            </span>
            <a
              href={activeSheetUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[#8d734a] hover:text-[#004b3a] font-bold"
            >
              <span>Open in new tab</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <iframe
            src={embedUrl}
            title={`EBB Lab Chemical Inventory - ${currentCabinetConfig.name}`}
            className="w-full flex-1 border-0 rounded-b-sm"
            allowFullScreen
          />
        </div>
      )}

      {/* QR Code Modal for Mobile Quick Scan */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#fdfdfc] border border-[#e5e5e0] rounded-sm p-6 max-w-sm w-full shadow-xl space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-[#e5e5e0] pb-3">
              <h3 className="text-base font-bold text-[#004b3a] font-serif flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#8d734a]" />
                Scan to Query Chemicals
              </h3>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-white rounded-sm border border-[#e5e5e0] inline-block shadow-inner">
              {qrCodeDataUrl ? (
                <img
                  src={qrCodeDataUrl}
                  alt="Chemical Inventory QR Code"
                  className="w-48 h-48 mx-auto object-contain"
                />
              ) : (
                <div className="w-48 h-48 bg-slate-100 animate-pulse rounded-sm flex items-center justify-center text-xs text-slate-400">
                  Generating QR Code...
                </div>
              )}
            </div>

            <p className="text-xs text-slate-600 font-sans leading-relaxed">
              Scan this QR Code with your smartphone camera to quickly access {currentCabinetConfig.shortName} inventory spreadsheet on mobile.
            </p>

            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(activeSheetUrl);
                  setCopiedCas("SHEET_URL");
                  setTimeout(() => setCopiedCas(null), 2000);
                }}
                className="px-4 py-2 bg-[#f8f8f5] hover:bg-[#eae6dc] text-slate-700 border border-[#e5e5e0] rounded-sm text-xs font-bold flex items-center gap-1.5 transition"
              >
                {copiedCas === "SHEET_URL" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#004b3a]" />}
                <span>{copiedCas === "SHEET_URL" ? "Copied" : "Copy Sheet URL"}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="px-4 py-2 bg-[#004b3a] hover:bg-[#003328] text-white rounded-sm text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Fallback Standard EBB Lab chemical inventory records
function getDefaultLabChemicals(): StandardChemicalItem[] {
  return [
    { id: "c1", cabinet: "A", cabinetName: "A 櫃", no: "A01", nameZh: "乙醇 (95%)", nameEn: "Ethanol 95%", formula: "C2H5OH", cas: "64-17-5" },
    { id: "c2", cabinet: "A", cabinetName: "A 櫃", no: "A02", nameZh: "無水乙醇 (99.5%)", nameEn: "Absolute Ethanol", formula: "C2H5OH", cas: "64-17-5" },
    { id: "c3", cabinet: "B", cabinetName: "B 櫃", no: "B01", nameZh: "硫酸錳(一水合)", nameEn: "Manganese Sulfate", formula: "MnSO4‧H2O", cas: "10034-96-5" },
    { id: "c4", cabinet: "B", cabinetName: "B 櫃", no: "B02", nameZh: "聚氧乙烯山梨醇酐月桂酸酯", nameEn: "Tween 20", formula: "C58H114O26", cas: "9005-64-5" },
    { id: "c5", cabinet: "C", cabinetName: "C 櫃", no: "C01", nameZh: "聚乙烯醇", nameEn: "Poly Vinyl Alcohol", formula: "C2H4O", cas: "9002-89-5" },
    { id: "c6", cabinet: "C", cabinetName: "C 櫃", no: "C02", nameZh: "二甲基亞碸", nameEn: "Dimethyl Sulfoxide (DMSO)", formula: "(CH3)2SO", cas: "67-68-5" },
    { id: "c7", cabinet: "D", cabinetName: "D 櫃 (毒化物)", no: "D1", nameZh: "聯胺水合物", nameEn: "Hydrazine monohydrate, 98+%", formula: "H2NNH2•H2O", cas: "302-01-2" },
    { id: "c8", cabinet: "D", cabinetName: "D 櫃 (毒化物)", no: "D2", nameZh: "二甲基甲醯胺", nameEn: "N,N-Dimethyl formamide", formula: "C3H7NO", cas: "68-12-2" },
    { id: "c9", cabinet: "E", cabinetName: "E 櫃", no: "E01", nameZh: "1-正丁基-3-甲基咪唑鎓六氟磷酸鹽", nameEn: "1-butyl-3-methylimidazol-3-ium hexafluorophosphate", formula: "C8H15ClN2", cas: "79917-90-1" },
    { id: "c10", cabinet: "E", cabinetName: "E 櫃", no: "E02", nameZh: "1-乙基-3-甲基咪唑氯鹽", nameEn: "1-Ethyl-3-methylimidazolium chloride", formula: "C6H11ClN2", cas: "65039-09-0" },
    { id: "c11", cabinet: "Gas", cabinetName: "氣體鋼瓶", no: "G01", nameZh: "氣體: CO₂", nameEn: "位置: 6F (1支在小電漿旁)", formula: "CO2", cas: "—" },
  ];
}
