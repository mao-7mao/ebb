import React, { useState, useEffect, useRef } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { members, Member } from "../data/labData";
import { 
  Check, 
  Download, 
  RotateCw, 
  Upload, 
  User, 
  Mail, 
  Phone, 
  Layers, 
  FileText, 
  MapPin, 
  QrCode, 
  Globe, 
  RefreshCw,
  Sparkles,
  Search,
  Eye,
  Trash2
} from "lucide-react";

// Theme presets for the business card
type GreenShade = "classic" | "jade" | "moss";
type CardTexture = "none" | "leaf" | "hex" | "wave" | "biotech";

interface GreenShadeColors {
  name: string;
  desc?: string;
  frontGradient: string; // Tailwind gradient classes
  backLeftBg: string;    // Tailwind bg color
  primaryBg: string;     // Tailwind color class
  accentText: string;    // Accent text class
  primaryHex: string;    // Hex color representation
}

const GREEN_SHADES: Record<GreenShade, GreenShadeColors> = {
  classic: {
    name: "經典翠綠 (Classic Emerald)",
    frontGradient: "from-[#00382b] via-[#004b3a] to-[#043329]",
    backLeftBg: "bg-[#004b3a]",
    primaryBg: "bg-[#004b3a]",
    accentText: "text-[#ebdcb9]",
    primaryHex: "#05795e"
  },
  jade: {
    name: "山海翡翠 (Teal Jade)",
    frontGradient: "from-[#012d2e] via-[#055c50] to-[#033f38]",
    backLeftBg: "bg-[#055c50]",
    primaryBg: "bg-[#055c50]",
    accentText: "text-[#ebdcb9]",
    primaryHex: "#055c50"
  },
  moss: {
    name: "墨荷雅緻 (Deep Moss)",
    frontGradient: "from-[#111c16] via-[#1c2e24] to-[#15241b]",
    backLeftBg: "bg-[#1c2e24]",
    primaryBg: "bg-[#1c2e24]",
    accentText: "text-[#e3d1ae]",
    primaryHex: "#1c2e24"
  }
};

const TextureOverlay = ({ color = "#8d734a" }: { color?: string }) => {
  return (
    <div className="absolute inset-0 pointer-events-none opacity-[0.14] select-none rounded-sm overflow-hidden">
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 550 330" fill="none">
        {/* Organic Leaf Veins Background */}
        <g opacity="0.85">
          <path d="M-20,350 Q150,200 300,280 T580,240" stroke={color} strokeWidth="1.5" />
          <path d="M120,240 Q180,160 140,110" stroke={color} strokeWidth="1" />
          <path d="M180,215 Q240,140 220,90" stroke={color} strokeWidth="1" />
          <path d="M240,248 Q320,180 340,130" stroke={color} strokeWidth="1" />
          <path d="M380,265 Q450,210 430,150" stroke={color} strokeWidth="1" />
          <path d="M140,110 Q110,80 80,90" stroke={color} strokeWidth="0.8" />
          <path d="M180,215 Q150,190 120,200" stroke={color} strokeWidth="0.8" />
          <path d="M220,90 Q190,60 160,70" stroke={color} strokeWidth="0.8" />
          <path d="M340,130 Q300,100 270,110" stroke={color} strokeWidth="0.8" />
          <path d="M400,50 C480,120 420,220 500,290" stroke={color} strokeWidth="1.2" />
          <path d="M440,110 Q410,130 380,120" stroke={color} strokeWidth="0.8" />
          <path d="M460,180 Q430,200 400,190" stroke={color} strokeWidth="0.8" />
        </g>

        {/* DNA Double Helix - Top Right */}
        <g transform="translate(425, 12) scale(0.65)" opacity="0.9">
          <path d="M10,10 Q30,50 50,90 T90,170" stroke={color} strokeWidth="1.8" strokeDasharray="4 4" />
          <path d="M50,10 Q30,50 10,90 T-30,170" stroke={color} strokeWidth="1.8" />
          <line x1="28" y1="40" x2="32" y2="40" stroke={color} strokeWidth="1.5" />
          <line x1="18" y1="65" x2="42" y2="65" stroke={color} strokeWidth="1.5" />
          <line x1="12" y1="90" x2="48" y2="90" stroke={color} strokeWidth="1.5" />
          <line x1="16" y1="115" x2="44" y2="115" stroke={color} strokeWidth="1.5" />
          <line x1="26" y1="140" x2="34" y2="140" stroke={color} strokeWidth="1.5" />
        </g>

        {/* Molecular Structure / Benzene/Glucose Ring - Bottom Left */}
        <g transform="translate(25, 195) scale(0.72)" opacity="0.95">
          <polygon points="50,30 90,10 130,30 130,70 90,90 50,70" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
          <line x1="88" y1="18" x2="122" y2="35" stroke={color} strokeWidth="1" />
          <line x1="58" y1="65" x2="58" y2="35" stroke={color} strokeWidth="1" />
          <line x1="122" y1="65" x2="94" y2="81" stroke={color} strokeWidth="1" />
          <line x1="130" y1="30" x2="155" y2="15" stroke={color} strokeWidth="1.5" />
          <text x="160" y="18" fill={color} fontSize="11" fontFamily="monospace" fontWeight="bold">OH</text>
          <line x1="50" y1="30" x2="25" y2="15" stroke={color} strokeWidth="1.5" />
          <text x="2" y="18" fill={color} fontSize="11" fontFamily="monospace" fontWeight="bold">HO</text>
          <line x1="90" y1="90" x2="90" y2="115" stroke={color} strokeWidth="1.5" />
          <text x="84" y="128" fill={color} fontSize="11" fontFamily="monospace" fontWeight="bold">O</text>
          <polygon points="130,70 170,90 210,70 210,30 170,10 130,30" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeDasharray="3 3" />
        </g>

        {/* Erlenmeyer Flask & Sprout Leaf - Center Right / Back Center */}
        <g transform="translate(345, 140) scale(0.78)" opacity="0.9">
          <path d="M40,20 L60,20 M50,20 L50,45 L15,95 C10,103 16,110 25,110 L105,110 C114,110 120,103 115,95 L80,45 L80,20 M70,20 L90,20" stroke={color} strokeWidth="2" strokeLinejoin="round" />
          <path d="M22,85 C45,88 75,82 108,85 L105,100 C103,105 98,105 95,105 L35,105 C32,105 27,105 25,100 Z" fill={color} opacity="0.2" />
          <circle cx="55" cy="70" r="3.5" stroke={color} strokeWidth="1" />
          <circle cx="75" cy="60" r="2" stroke={color} strokeWidth="1" />
          <circle cx="48" cy="45" r="1.5" fill={color} />
          <circle cx="68" cy="38" r="2.5" stroke={color} strokeWidth="0.8" />
          <path d="M65,30 Q78,5 105,10 Q88,35 65,30 Z" fill={color} opacity="0.45" />
          <path d="M65,30 C75,20 90,15 105,10" stroke={color} strokeWidth="1.2" />
        </g>

        {/* Microbes / Cell Cultures / Concentric rings - Scattered */}
        <circle cx="150" cy="50" r="6" stroke={color} strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
        <circle cx="150" cy="50" r="2" fill={color} opacity="0.5" />
        <circle cx="280" cy="40" r="4" stroke={color} strokeWidth="1.2" opacity="0.6" />
        <circle cx="283" cy="37" r="1" fill={color} opacity="0.6" />

        {/* Plant Stem / Curving Bio-Energy stream connecting it all */}
        <path d="M120,130 C190,140 250,70 330,85 C390,95 440,50 490,65" stroke={color} strokeWidth="1" strokeDasharray="5 5" opacity="0.5" />
      </svg>
    </div>
  );
};

interface CardData {
  nameZh: string;
  nameEn: string;
  titleEn: string;
  topicEn: string;
  email: string;
  tel: string;
  line: string;
  qrCodeUrl: string; // Dynamic URL or base64 of uploaded QR code
  logoUrl: string;   // Dynamic URL or base64 of uploaded logo
  addressEn: string;
}

export default function BusinessCardGenerator() {
  // Available members list for autocomplete lookup
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Custom Green Shades state
  const [greenShade, setGreenShade] = useState<GreenShade>("classic");
  
  // Card front/back flipping state
  const [isFlipped, setIsFlipped] = useState(false);

  // Card layout mode: double-sided or single-sided (optimized for translucent biomass cards)
  const [layoutMode, setLayoutMode] = useState<"double" | "single">("double");

  // NSYSU default logo (loads from public SVG url)
  const defaultNsysuLogo = "https://www.nsysu.edu.tw/var/file/0/1000/img/80/213315840.svg";
  
  // Default dynamic QR Code API placeholder
  const defaultQrCodePlaceholder = "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https://ebblab-nsysu.github.io";

  // Card form fields
  const [formData, setFormData] = useState<CardData>({
    nameZh: "林郁芳",
    nameEn: "Fanny Lin",
    titleEn: "Ph.D. Student",
    topicEn: "Innovative Agricultural Mulch Films from Biomass",
    email: "ebblab115@gmail.com",
    tel: "+886-7-525-2000 ext. 4408",
    line: "ebb_lab_nsysu",
    qrCodeUrl: "", // Defaults to API if empty
    logoUrl: "",   // Defaults to Wikimedia NSYSU logo if empty
    addressEn: "No. 70, Lianhai Rd., Gushan Dist., Kaohsiung City 80424, Taiwan "
  });

  // Reference hooks to DOM elements for canvas export
  const frontCardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  // Is printing/exporting state to show spinner
  const [isExporting, setIsExporting] = useState(false);
  const [isPngExporting, setIsPngExporting] = useState(false);
  const [exportTransparent, setExportTransparent] = useState(false);

  // Trigger search / autofill if the name matches a member
  useEffect(() => {
    if (!formData.nameZh) return;
    
    // Find exact match in members database
    const matched = members.find(
      m => m.name_zh === formData.nameZh.trim() || 
           m.name_en.toLowerCase() === formData.nameZh.trim().toLowerCase()
    );

    if (matched) {
      // Auto-populate associated academic values
      setFormData(prev => ({
        ...prev,
        nameZh: matched.name_zh,
        nameEn: `${matched.name_en} ${matched.name_en === "Fanny" ? "Lin" : matched.name_en === "Kevin" ? "Yu" : matched.name_en === "Kalin" ? "Chen" : matched.name_en === "Eko" ? "Tang" : matched.name_en === "Martin" ? "Chen" : matched.name_en === "Peter" ? "Hua" : matched.name_en === "Nina" ? "Chen" : matched.name_en === "Chris" ? "Huang" : matched.name_en === "Tina" ? "Wu" : "Scholar"}`,
        titleEn: matched.role_en || (matched.role.includes("博") ? "Ph.D. Student" : "Master's Student"),
        topicEn: matched.research_topic.title_en,
        // Keep existing contact details unless empty
        email: prev.email || "klchang@mail.nsysu.edu.tw",
        tel: prev.tel || "+886-7-525-2000 ext. 4400"
      }));
    }
  }, [formData.nameZh]);

  // Handle autocomplete selection
  const handleSelectMember = (member: Member) => {
    setFormData({
      nameZh: member.name_zh,
      nameEn: `${member.name_en} ${member.name_en === "Fanny" ? "Lin" : member.name_en === "Kevin" ? "Yu" : member.name_en === "Kalin" ? "Chen" : member.name_en === "Eko" ? "Tang" : member.name_en === "Martin" ? "Chen" : member.name_en === "Peter" ? "Hua" : member.name_en === "Nina" ? "Chen" : member.name_en === "Chris" ? "Huang" : member.name_en === "Tina" ? "Wu" : "Scholar"}`,
      titleEn: member.role_en || (member.role.includes("博") ? "Ph.D. Student" : "Master's Student"),
      topicEn: member.research_topic.title_en,
      email: member.id === "fanny" ? "ebblab115@gmail.com" : `${member.id}@mail.nsysu.edu.tw`,
      tel: "+886-7-525-2000 ext. 4400",
      line: member.id === "fanny" ? "ebb_lab_nsysu" : "",
      qrCodeUrl: "",
      logoUrl: "",
      addressEn: "No. 70, Lianhai Rd., Gushan Dist., Kaohsiung City 80424, Taiwan "
    });
    setSearchTerm(member.name_zh);
    setShowSuggestions(false);
  };

  // Custom Logo upload handler
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormData(prev => ({ ...prev, logoUrl: event.target!.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Custom QR Code upload handler
  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormData(prev => ({ ...prev, qrCodeUrl: event.target!.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Clear uploaded logo
  const clearLogo = () => {
    setFormData(prev => ({ ...prev, logoUrl: "" }));
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  // Clear uploaded QR Code
  const clearQrCode = () => {
    setFormData(prev => ({ ...prev, qrCodeUrl: "" }));
    if (qrInputRef.current) qrInputRef.current.value = "";
  };

  // Filter members based on search box input
  const filteredSuggestions = members.filter(
    m => m.name_zh.includes(searchTerm) || 
         m.name_en.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Render dynamic QR URL based on email/contact or custom upload
  const getQrCodeSource = () => {
    if (formData.qrCodeUrl) return formData.qrCodeUrl;
    // Generate functional QR leading to mailto
    const qrData = formData.email ? `mailto:${formData.email}` : "https://ebblab-nsysu.github.io";
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}`;
  };

  // Helper to obtain sanitized html2canvas capture options (converting oklch/oklab to rgb)
  const getCaptureOptions = () => {
    return {
      scale: 4,               // Scale factor of 4 produces razor sharp outputs
      useCORS: true,          // Allow fetching external images like Wikimedia logos
      allowTaint: true,       // Prevent cross-origin security issues from spoiling render
      backgroundColor: null,  // Render background colors accurately
      logging: false,
      onclone: (clonedDoc: Document) => {
        try {
          // Ensure that both cards are fully visible in the cloned document for html2canvas to render them properly
          const clonedFront = clonedDoc.getElementById("card-front");
          const clonedBack = clonedDoc.getElementById("card-back");
          if (clonedFront) {
            clonedFront.style.opacity = "1";
            clonedFront.style.visibility = "visible";
            clonedFront.classList.remove("opacity-0", "pointer-events-none");
          }
          if (clonedBack) {
            clonedBack.style.opacity = "1";
            clonedBack.style.visibility = "visible";
            clonedBack.classList.remove("opacity-0", "pointer-events-none");
          }

          // 1. Create a helper to resolve oklch/oklab colors using the browser's built-in CSS parsing engine
          const tempElement = clonedDoc.createElement("div");
          clonedDoc.body.appendChild(tempElement);
          
          const resolveColorToRgb = (colorStr: string): string => {
            try {
              tempElement.style.color = colorStr;
              return clonedDoc.defaultView?.getComputedStyle(tempElement).color || colorStr;
            } catch (e) {
              return colorStr;
            }
          };

          // 2. Read all CSS rules from the original document's stylesheets
          let combinedCss = "";
          const styleSheets = Array.from(document.styleSheets);
          
          for (const sheet of styleSheets) {
            try {
              // Skip cross-origin sheets to avoid security exceptions
              if (sheet.href && !sheet.href.startsWith(window.location.origin)) {
                continue;
              }
              
              const rules = Array.from(sheet.cssRules || sheet.rules || []);
              for (const rule of rules) {
                combinedCss += rule.cssText + "\n";
              }
            } catch (e) {
              // Ignore errors reading stylesheet rules (e.g. cross-origin sheets)
            }
          }

          // 3. If we successfully gathered local styles, sanitize them and replace local style nodes
          if (combinedCss) {
            // Replace oklch/oklab color functions with their equivalent rgb/rgba values
            const sanitizedCss = combinedCss.replace(/(oklch|oklab)\([^)]+\)/g, (match) => {
              return resolveColorToRgb(match);
            });

            // Remove original same-origin style elements from the cloned iframe document
            const existingStyles = clonedDoc.querySelectorAll("style, link[rel='stylesheet']");
            existingStyles.forEach(el => {
              if (el.tagName === "STYLE") {
                el.remove();
              } else if (el.tagName === "LINK") {
                const href = el.getAttribute("href");
                if (!href || href.startsWith(window.location.origin) || href.startsWith("/")) {
                  el.remove();
                }
              }
            });

            // Inject the sanitized styles
            const newStyle = clonedDoc.createElement("style");
            newStyle.textContent = sanitizedCss;
            clonedDoc.head.appendChild(newStyle);
          }
          
          // Clean up temporary element
          tempElement.remove();
        } catch (err) {
          console.error("onclone CSS sanitization failed:", err);
        }
      }
    };
  };

  // Export Front & Back as separate High-Res PNG images
  const exportAsPng = async () => {
    try {
      setIsPngExporting(true);
      setIsExporting(true);
      
      // Allow React state to flush and render transparency classes before capturing
      await new Promise((resolve) => setTimeout(resolve, 150));
      
      const cardFront = frontCardRef.current;
      const cardBack = backCardRef.current;
      
      if (!cardFront || (layoutMode === "double" && !cardBack)) {
        alert("名片預覽載入失敗，無法生成。");
        setIsPngExporting(false);
        setIsExporting(false);
        return;
      }

      // Front Export (or Single side)
      const frontCanvas = await html2canvas(cardFront, getCaptureOptions());
      const frontDataUrl = frontCanvas.toDataURL("image/png");
      const frontLink = document.createElement("a");
      const filenameSuffix = layoutMode === "single" ? "Single_Side" : "Front";
      frontLink.download = `${formData.nameEn.replace(/\s+/g, "_")}_Academic_Card_${filenameSuffix}.png`;
      frontLink.href = frontDataUrl;
      frontLink.click();

      // Back Export (Only if layoutMode is double)
      if (layoutMode === "double" && cardBack) {
        const backCanvas = await html2canvas(cardBack, getCaptureOptions());
        const backDataUrl = backCanvas.toDataURL("image/png");
        const backLink = document.createElement("a");
        backLink.download = `${formData.nameEn.replace(/\s+/g, "_")}_Academic_Card_Back.png`;
        backLink.href = backDataUrl;
        backLink.click();
      }

    } catch (error) {
      console.error("Export PNG Failed:", error);
      alert("PNG 檔案生成失敗，請確認上傳的圖片連結正確。");
    } finally {
      setIsPngExporting(false);
      setIsExporting(false);
    }
  };

  // Export Double-Sided card as a single print-ready PDF (Landscape, exact 90mm x 54mm dimensions)
  const exportAsPdf = async () => {
    try {
      setIsExporting(true);
      
      const cardFront = frontCardRef.current;
      const cardBack = backCardRef.current;
      
      if (!cardFront || (layoutMode === "double" && !cardBack)) {
        alert("名片預覽載入失敗，無法生成。");
        return;
      }

      // Render Front/Single canvas
      const frontCanvas = await html2canvas(cardFront, getCaptureOptions());
      const frontDataUrl = frontCanvas.toDataURL("image/png");

      // Initialize jsPDF with standard landscape business card dimensions (90mm x 54mm)
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [90, 54]
      });

      // Page 1: Card Front or Single side
      pdf.addImage(frontDataUrl, "PNG", 0, 0, 90, 54);
      
      // Page 2: Card Back (Only if layoutMode is double)
      if (layoutMode === "double" && cardBack) {
        const backCanvas = await html2canvas(cardBack, getCaptureOptions());
        const backDataUrl = backCanvas.toDataURL("image/png");
        pdf.addPage([90, 54], "landscape");
        pdf.addImage(backDataUrl, "PNG", 0, 0, 90, 54);
      }

      const filenameSuffix = layoutMode === "single" ? "_SingleSide" : "";
      pdf.save(`${formData.nameEn.replace(/\s+/g, "_")}_Academic_Card${filenameSuffix}.pdf`);

    } catch (error) {
      console.error("Export PDF Failed:", error);
      alert("PDF 檔案生成失敗，請稍後再試。");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <section id="card-generator" className="py-24 px-4 md:px-8 max-w-7xl mx-auto border-t border-[#e5e5e0]">
      {/* Dynamic chroma key SVG filter: converts white and near-white pixels into perfect transparency while preserving logo detail */}
      <svg className="absolute w-0 h-0 invisible" aria-hidden="true">
        <defs>
          <filter id="remove-white" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values="
              1    0    0    0    0
              0    1    0    0    0
              0    0    1    0    0
              -1.5 -1.5 -1.5  4.5  0
            " />
          </filter>
        </defs>
      </svg>

      <div className="text-center mb-12">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#f8f8f5] border border-[#e5e5e0] rounded-sm text-xs font-bold text-[#8d734a] uppercase tracking-widest font-serif italic mb-3">
          <Sparkles className="w-3.5 h-3.5 text-[#004b3a]" />
          NSYSU Academic Utility
        </span>
        <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a1a] tracking-tight font-serif">
          EBB Lab Academic Business Card Generator
        </h2>
        <p className="text-sm text-[#555] mt-2 max-w-2xl mx-auto leading-relaxed font-light">
          輸入實驗室成員自動帶入其碩博學位及英文研究方向，亦支援自訂姓名文字、上傳Line 聯絡資訊等。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: CONTROL & INPUT FORMS */}
        <div className="lg:col-span-5 bg-[#fdfdfc] rounded-sm border border-[#e5e5e0] p-6 shadow-sm space-y-6">
          
          {/* Autocomplete Finder */}
          <div className="relative">
            <label className="block text-xs font-bold text-[#004b3a] uppercase tracking-widest mb-2 flex items-center gap-1 font-serif italic">
              <Search className="w-3.5 h-3.5 text-[#004b3a]" />
              快速載入成員 (EBB Lab Database)
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="輸入成員姓名，例如：林郁芳, Fanny..."
                className="w-full bg-white border border-[#e5e5e0] rounded-sm py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:border-[#004b3a] focus:ring-1 focus:ring-[#004b3a] transition-all font-sans text-slate-800"
              />
              <Search className="w-4 h-4 text-[#8d734a] absolute left-3 top-3.5" />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setShowSuggestions(false);
                  }}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 hover:font-bold font-sans py-1"
                >
                  清除
                </button>
              )}
            </div>

            {/* Suggestions dropdown list */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-[#e5e5e0] rounded-sm shadow-md max-h-56 overflow-y-auto divide-y divide-[#e5e5e0]/60">
                {filteredSuggestions.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleSelectMember(m)}
                    className="w-full text-left px-4 py-2.5 text-xs hover:bg-[#f8f8f5] transition-colors flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-[#1a1a1a] text-sm font-serif">{m.name_zh}</span>{" "}
                      <span className="text-slate-400">({m.name_en})</span>
                    </div>
                    <div className="text-[9px] bg-white border border-[#e5e5e0] text-[#8d734a] px-2 py-0.5 rounded-sm font-serif italic font-bold">
                      {m.role}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-[#e5e5e0] pt-4 space-y-4 font-sans">
            <h3 className="text-sm font-bold text-[#004b3a] border-l-2 border-[#8d734a] pl-2 font-serif">名片文字資訊 (英文版)</h3>
            
            {/* Double Name Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#666] mb-1">中文姓名</label>
                <input
                  type="text"
                  value={formData.nameZh}
                  onChange={(e) => setFormData({ ...formData, nameZh: e.target.value })}
                  className="w-full bg-white border border-[#e5e5e0] rounded-sm p-2 text-xs text-slate-800 focus:outline-none focus:border-[#004b3a]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#666] mb-1">English Name</label>
                <input
                  type="text"
                  value={formData.nameEn}
                  onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                  className="w-full bg-white border border-[#e5e5e0] rounded-sm p-2 text-xs text-slate-800 focus:outline-none focus:border-[#004b3a]"
                />
              </div>
            </div>

            {/* Academic Title */}
            <div>
              <label className="block text-[11px] font-semibold text-[#666] mb-1">Academic Title / Job Role</label>
              <input
                type="text"
                value={formData.titleEn}
                onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                placeholder="e.g. Ph.D. Student / Master's Student"
                className="w-full bg-white border border-[#e5e5e0] rounded-sm p-2 text-xs text-slate-800 focus:outline-none focus:border-[#004b3a]"
              />
            </div>

            {/* Research Topic */}
            <div>
              <label className="block text-[11px] font-semibold text-[#666] mb-1">Research Direction / Topic (English)</label>
              <textarea
                value={formData.topicEn}
                onChange={(e) => setFormData({ ...formData, topicEn: e.target.value })}
                rows={2}
                placeholder="e.g. Next-Generation Bio-Based Polyester Materials"
                className="w-full bg-white border border-[#e5e5e0] rounded-sm p-2 text-xs text-slate-800 focus:outline-none focus:border-[#004b3a] resize-none leading-normal"
              />
            </div>

            <h3 className="text-sm font-bold text-[#004b3a] border-l-2 border-[#8d734a] pl-2 pt-2 font-serif">聯絡方式 (若留空則名片不顯示)</h3>

            {/* Email & Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#666] mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. abc@mail.nsysu.edu.tw"
                  className="w-full bg-white border border-[#e5e5e0] rounded-sm p-2 text-xs text-slate-800 focus:outline-none focus:border-[#004b3a]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#666] mb-1">Tel</label>
                <input
                  type="text"
                  value={formData.tel}
                  onChange={(e) => setFormData({ ...formData, tel: e.target.value })}
                  placeholder="e.g. +886-7-525-2000"
                  className="w-full bg-white border border-[#e5e5e0] rounded-sm p-2 text-xs text-slate-800 focus:outline-none focus:border-[#004b3a]"
                />
              </div>
            </div>

            {/* Line ID */}
            <div>
              <label className="block text-[11px] font-semibold text-[#666] mb-1">Line ID / Contact ID</label>
              <input
                type="text"
                value={formData.line}
                onChange={(e) => setFormData({ ...formData, line: e.target.value })}
                placeholder="e.g. Line帳號"
                className="w-full bg-white border border-[#e5e5e0] rounded-sm p-2 text-xs text-slate-800 focus:outline-none focus:border-[#004b3a]"
              />
            </div>

            <h3 className="text-sm font-bold text-[#004b3a] border-l-2 border-[#8d734a] pl-2 pt-2 font-serif">聯絡 QR Code 上傳</h3>

            {/* Upload fields */}
            <div className="grid grid-cols-1 gap-3">
              
              {/* QR Code Upload */}
              <div className="border border-dashed border-[#e5e5e0] rounded-sm p-3 bg-[#f8f8f5] text-center">
                <p className="text-[10px] font-bold text-[#666] mb-1">自訂聯絡 QR Code</p>
                <div className="flex justify-center gap-2 items-center">
                  {formData.qrCodeUrl ? (
                    <div className="flex items-center gap-1 bg-white border border-[#e5e5e0] rounded-sm px-2 py-1">
                      <span className="text-[10px] text-[#004b3a] truncate max-w-[120px]">已上傳 QR 碼</span>
                      <button onClick={clearQrCode} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => qrInputRef.current?.click()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-[#fafafa] border border-[#e5e5e0] text-[10px] font-bold uppercase tracking-wider text-slate-700 rounded-sm transition shadow-sm"
                    >
                      <Upload className="w-3 h-3 text-[#004b3a]" />
                      上傳圖片
                    </button>
                  )}
                  <input
                    ref={qrInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleQrUpload}
                    className="hidden"
                  />
                </div>
              </div>

            </div>

            {/* Address Input */}
            <div>
              <label className="block text-[11px] font-semibold text-[#666] mb-1">English Address (Editable)</label>
              <input
                type="text"
                value={formData.addressEn}
                onChange={(e) => setFormData({ ...formData, addressEn: e.target.value })}
                className="w-full bg-white border border-[#e5e5e0] rounded-sm p-2 text-xs text-slate-800 focus:outline-none focus:border-[#004b3a]"
              />
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: PREVIEW AND EXPORT SYSTEM */}
        <div className="lg:col-span-7 space-y-8 flex flex-col items-center">
          
          {/* Card Layout Mode Selector */}
          <div className="w-full bg-[#fdfdfc] border border-[#e5e5e0] rounded-sm p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#004b3a] uppercase tracking-widest font-serif flex items-center gap-1.5">
                <Layers className="w-4 h-4" style={{ color: GREEN_SHADES[greenShade].primaryHex }} />
                名片版面配置 (Card Layout Mode)
              </span>
              <span className="text-[10px] font-mono text-[#8d734a] font-bold italic bg-[#f8f8f5] px-2 py-0.5 border border-[#e5e5e0] rounded-sm">
                Biomass Optimized
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setLayoutMode("double");
                  setIsFlipped(false);
                }}
                className={`px-4 py-3 rounded-sm text-xs font-bold tracking-wider transition flex flex-col items-center justify-center gap-1.5 border ${
                  layoutMode === "double"
                    ? "bg-[#004b3a] text-white border-[#004b3a]"
                    : "bg-white hover:bg-[#fafafa] border-[#e5e5e0] text-slate-700"
                }`}
                style={layoutMode === "double" ? { backgroundColor: GREEN_SHADES[greenShade].primaryHex, borderColor: GREEN_SHADES[greenShade].primaryHex } : undefined}
              >
                <span className="font-semibold text-[11px]">雙面名片 (Double-Sided)</span>
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setLayoutMode("single");
                  setIsFlipped(false);
                }}
                className={`px-4 py-3 rounded-sm text-xs font-bold tracking-wider transition flex flex-col items-center justify-center gap-1.5 border ${
                  layoutMode === "single"
                    ? "bg-[#004b3a] text-white border-[#004b3a]"
                    : "bg-white hover:bg-[#fafafa] border-[#e5e5e0] text-slate-700"
                }`}
                style={layoutMode === "single" ? { backgroundColor: GREEN_SHADES[greenShade].primaryHex, borderColor: GREEN_SHADES[greenShade].primaryHex } : undefined}
              >
                <span className="font-semibold text-[11px]">單面整合 (All-in-One Page)</span>
              </button>
            </div>
            <p className="text-[10.5px] text-slate-500 font-light leading-normal">
              {layoutMode === "double" 
                ? "傳統雙面款式：正面印製姓名及研究領域，背面印製詳細聯絡與 QR 碼。"
                : "一頁式整合款：適合半透明或透光生物質基材，完美整合所有學校、學人、研究領域、聯絡資訊與 QR 碼在同一面上，避免雙面印刷透光重疊與干擾。"}
            </p>
          </div>

          {/* Preset Theme & Texture Selector */}
          <div className="w-full bg-[#fdfdfc] border border-[#e5e5e0] rounded-sm p-5 shadow-sm space-y-5">
            {/* 3 Shades of Green Selectors */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#004b3a] uppercase tracking-widest font-serif flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#8d734a]"></span>
                  綠能雅緻色調 (Green Shade Accent)
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(GREEN_SHADES) as GreenShade[]).map((shade) => {
                  const isSelected = greenShade === shade;
                  return (
                    <button
                      key={shade}
                      onClick={() => setGreenShade(shade)}
                      className={`px-3 py-2 rounded-sm text-[10.5px] tracking-wide font-bold transition flex flex-col items-center gap-1.5 border ${
                        isSelected
                          ? "bg-[#004b3a] text-white shadow-sm"
                          : "bg-white hover:bg-[#fafafa] border-[#e5e5e0] text-slate-700"
                      }`}
                      style={isSelected ? { backgroundColor: GREEN_SHADES[shade].primaryHex, borderColor: GREEN_SHADES[shade].primaryHex } : undefined}
                    >
                      <span 
                        className="w-4 h-4 rounded-full border border-white/20 shadow-sm" 
                        style={{ backgroundColor: GREEN_SHADES[shade].primaryHex }}
                      />
                      <span className="text-[10px] truncate">{shade === "classic" ? "經典翠綠" : shade === "jade" ? "山海翡翠" : "墨荷雅緻"}</span>
                    </button>
                  );
                })}
              </div>

            </div>
          </div>
          {/* FLIP CONTROLLER DESCRIPTION */}
          <div className="flex items-center gap-2 text-xs font-bold font-serif italic text-[#8d734a] bg-[#f8f8f5] px-4 py-2 rounded-sm border border-[#e5e5e0] shadow-sm">
            <Eye className="w-4 h-4" style={{ color: GREEN_SHADES[greenShade].primaryHex }} />
            <span>
              {layoutMode === "double" 
                ? "點選 3D 名片預覽進行翻面，或直接在卡面上進行視覺檢視" 
                : "單面整合名片為一頁式佈局，適合半透明生質基材，無需翻面"}
            </span>
          </div>

          {/* THE 3D CARD CONTAINER */}
          <div className="w-full flex justify-center py-4">
            <div 
              onClick={() => {
                if (layoutMode === "double") {
                  setIsFlipped(!isFlipped);
                }
              }}
              className={`perspective-1000 w-[550px] h-[330px] rounded-sm ${layoutMode === "double" ? "cursor-pointer" : "cursor-default"}`}
              style={exportTransparent ? {
                backgroundColor: "#ffffff",
                backgroundImage: "conic-gradient(#e5e7eb 25%, transparent 25% 50%, #e5e7eb 50% 75%, transparent 75%)",
                backgroundSize: "16px 16px"
              } : undefined}
            >
              <div 
                className={`relative w-full h-full transition-all duration-700 transform-style-3d ${
                  layoutMode === "double" && isFlipped ? "rotate-y-180" : ""
                }`}
              >
                
                {layoutMode === "single" ? (
                  /* -------------------- SINGLE-SIDED (ALL-IN-ONE) -------------------- */
                  <div 
                    ref={frontCardRef}
                    id="card-front"
                    className={`absolute w-full h-full rounded-sm p-6 border shadow-md flex flex-col justify-between font-sans border-[#8d734a]/30 overflow-hidden transition-all duration-500 ${
                      exportTransparent ? "bg-transparent text-slate-800" : "bg-[#fdfdfc] text-slate-800"
                    }`}
                    style={{
                      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
                      boxSizing: "border-box"
                    }}
                  >
                    {/* Unified Bio-Tech & Organic Leaf Vein Background Texture Overlay */}
                    <TextureOverlay color={GREEN_SHADES[greenShade].primaryHex} />

                    {/* Header section (Logo and University titles) */}
                    <div className="flex items-center gap-3.5 z-10 border-b border-[#e5e5e0]/60 pb-2.5">
                      <div className="flex items-center justify-center max-w-[100px] h-9 shrink-0">
                        <img
                          src="https://www.nsysu.edu.tw/var/file/0/1000/img/80/logo03.jpg"
                          onError={(e) => {
                            e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/e/e5/National_Sun_Yat-sen_University_logo.svg";
                          }}
                          alt="NSYSU Plum Blossom Logo"
                          referrerPolicy="no-referrer"
                          className="max-h-9 w-auto object-contain mix-blend-multiply"
                          style={{ filter: "url(#remove-white)" }}
                        />
                      </div>
                      <div>
                        <h4 className="text-[11px] tracking-wide font-bold uppercase font-serif leading-none" style={{ color: GREEN_SHADES[greenShade].primaryHex }}>
                          National Sun Yat-sen University
                        </h4>
                        <p className="text-[9px] tracking-wide font-bold text-slate-800 mt-0.5 leading-none">
                          Institute of Environmental Engineering
                        </p>
                        <p className="text-[7.5px] tracking-wider uppercase font-semibold text-slate-400 mt-0.5 leading-none">
                          Environmental Biotechnology & Biorefinery Laboratory (EBB Lab)
                        </p>
                      </div>
                    </div>

                    {/* Body Section: 2 Columns */}
                    <div className="flex justify-between items-stretch gap-4.5 z-10 h-[190px] mt-2.5">
                      
                      {/* Left Column (58% width): Scholar Info & Research Topic */}
                      <div className="w-[58%] flex flex-col justify-between py-1">
                        
                        {/* Scholar Info */}
                        <div className="space-y-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xl font-bold tracking-wide font-serif text-slate-950">
                              {formData.nameZh}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500 font-sans">
                              {formData.nameEn}
                            </span>
                          </div>
                          <p className="text-[10.5px] font-bold font-serif italic" style={{ color: GREEN_SHADES[greenShade].primaryHex }}>
                            {formData.titleEn}
                          </p>
                        </div>

                        {/* Research Topic */}
                        <div className={`p-2.5 rounded-sm border border-[#8d734a]/20 leading-tight ${
                          exportTransparent ? "bg-white/10" : "bg-[#fafaf9]/85"
                        }`}>
                          <span className="block text-[7.5px] uppercase tracking-widest mb-1 font-bold font-serif italic text-[#8d734a]">
                            Research Field
                          </span>
                          <p className="text-[9.5px] font-sans font-semibold text-slate-800 line-clamp-3">
                            {formData.topicEn}
                          </p>
                        </div>
                      </div>

                      {/* Vertical Divider */}
                      <div className="w-[1px] bg-[#e5e5e0]/60 self-stretch"></div>

                      {/* Right Column (42% width): Contact Info & QR Code */}
                      <div className="w-[42%] flex flex-col justify-between pl-1 py-1">
                        
                        {/* Contact details */}
                        <div className="space-y-1.5 font-mono text-[8.5px]">
                          {/* Email */}
                          {formData.email && (
                            <div className="flex items-center gap-1.5 text-slate-700 font-mono">
                              <Mail className="w-3 h-3 shrink-0" style={{ color: GREEN_SHADES[greenShade].primaryHex }} />
                              <span className="truncate max-w-[155px] font-bold">{formData.email}</span>
                            </div>
                          )}

                          {/* Phone */}
                          {formData.tel && (
                            <div className="flex items-center gap-1.5 text-slate-700 font-mono">
                              <Phone className="w-3 h-3 shrink-0" style={{ color: GREEN_SHADES[greenShade].primaryHex }} />
                              <span className="font-bold">{formData.tel}</span>
                            </div>
                          )}

                          {/* Line ID */}
                          {formData.line && (
                            <div className="flex items-center gap-1.5 text-slate-700">
                              <span className="text-[7px] font-bold text-white rounded-[2px] px-0.5 py-0.2 select-none shrink-0 font-sans tracking-wide" style={{ backgroundColor: GREEN_SHADES[greenShade].primaryHex }}>LINE</span>
                              <span className="font-mono font-bold">{formData.line}</span>
                            </div>
                          )}

                          {/* Address */}
                          {formData.addressEn && (
                            <div className="flex items-start gap-1 text-[#555] leading-normal font-sans">
                              <MapPin className="w-3 h-3 shrink-0 mt-0.5" style={{ color: GREEN_SHADES[greenShade].primaryHex }} />
                              <span className="text-[7px] leading-tight line-clamp-2">
                                {formData.addressEn}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* QR Code and Scan hint */}
                        <div className="flex items-center gap-2.5 mt-1 border-t border-[#e5e5e0]/60 pt-2">
                          <img
                            src={getQrCodeSource()}
                            alt="Contact QR Code"
                            className="w-[45px] h-[45px] object-contain rounded-sm border border-[#8d734a]/25 bg-white p-0.5 shadow-xs shrink-0"
                          />
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold font-serif leading-none" style={{ color: GREEN_SHADES[greenShade].primaryHex }}>EBB Lab</span>
                            <span className="text-[6.5px] font-mono text-slate-400 font-bold tracking-wide uppercase leading-tight mt-0.5">SCAN<br/>CONTACT</span>
                          </div>
                        </div>

                      </div>

                    </div>

                    {/* Golden Elegant Stripe at bottom */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#8d734a]/30 via-[#8d734a] to-[#8d734a]/30 rounded-b-sm"></div>

                  </div>
                ) : (
                  /* -------------------- ORIGINAL DOUBLE-SIDED -------------------- */
                  <>
                    {/* -------------------- FRONT SIDE -------------------- */}
                    <div 
                      ref={frontCardRef}
                      id="card-front"
                      className={`absolute w-full h-full rounded-sm p-7 border shadow-md flex flex-col justify-between backface-hidden font-sans border-[#8d734a]/30 overflow-hidden transition-all duration-500 ${
                        exportTransparent ? "bg-transparent text-slate-800" : "bg-[#fdfdfc] text-slate-800"
                      } ${isFlipped ? "opacity-0 pointer-events-none" : "opacity-100 z-10"}`}
                      style={{
                        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
                        boxSizing: "border-box"
                      }}
                    >
                      {/* Unified Bio-Tech & Organic Leaf Vein Background Texture Overlay */}
                      <TextureOverlay color={GREEN_SHADES[greenShade].primaryHex} />

                      {/* Header: University seal and departments (Clean layout optimized for UV printing on biomass plastic) */}
                      <div className="flex items-start gap-4 z-10">
                        <div className="flex items-center justify-center max-w-[150px] h-12 shrink-0">
                          <img
                            src="https://www.nsysu.edu.tw/var/file/0/1000/img/80/logo03.jpg"
                            onError={(e) => {
                              e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/e/e5/National_Sun_Yat-sen_University_logo.svg";
                            }}
                            alt="NSYSU Plum Blossom Logo"
                            referrerPolicy="no-referrer"
                            className="max-h-12 w-auto object-contain mix-blend-multiply"
                            style={{ filter: "url(#remove-white)" }}
                          />
                        </div>
                        <div>
                          <h4 className="text-sm tracking-wide font-bold uppercase font-serif" style={{ color: GREEN_SHADES[greenShade].primaryHex }}>
                            National Sun Yat-sen University
                          </h4>
                          <p className="text-[11px] tracking-wider mt-0.5 font-bold text-slate-800">
                            Institute of Environmental Engineering
                          </p>
                          <p className="text-[9px] tracking-wide uppercase font-semibold text-slate-500">
                            Environmental Biotechnology & Biorefinery Laboratory
                          </p>
                        </div>
                      </div>

                      {/* Body: Scholar Name & Research Directions */}
                      <div className="flex justify-between items-end z-10">
                        
                        {/* Left: Names & Title */}
                        <div className="space-y-1 max-w-[65%]">
                          <div className="flex items-baseline gap-2.5">
                            <span className="text-2xl font-bold tracking-wide font-serif text-slate-950">
                              {formData.nameZh}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">
                              {formData.nameEn}
                            </span>
                          </div>
                          
                          <p className="text-xs font-bold font-serif italic" style={{ color: GREEN_SHADES[greenShade].primaryHex }}>
                            {formData.titleEn}
                          </p>
                        </div>

                        {/* Right: Detailed Research (High focus, in English) */}
                        <div className={`max-w-[45%] text-right p-2.5 rounded-sm border border-[#8d734a]/30 leading-tight ${
                          exportTransparent ? "bg-white/10" : "bg-[#fafaf9]/85"
                        }`}>
                          <span className="block text-[8px] uppercase tracking-widest mb-1 font-bold font-serif italic text-[#8d734a]">
                            Research Field
                          </span>
                          <p className="text-[10px] font-sans font-semibold text-slate-800 line-clamp-3">
                            {formData.topicEn}
                          </p>
                        </div>

                      </div>

                      {/* Golden Elegant Stripe at bottom of Emerald card */}
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#8d734a]/30 via-[#8d734a] to-[#8d734a]/30 rounded-b-sm"></div>

                    </div>

                    {/* -------------------- BACK SIDE -------------------- */}
                    <div 
                      ref={backCardRef}
                      id="card-back"
                      className={`absolute w-full h-full rounded-sm border shadow-md flex rotate-y-180 backface-hidden font-sans overflow-hidden border-[#8d734a]/20 transition-all duration-500 ${
                        exportTransparent ? "bg-transparent text-slate-800" : "bg-[#fdfdfc] text-slate-800"
                      } ${!isFlipped ? "opacity-0 pointer-events-none" : "opacity-100 z-10"}`}
                      style={{
                        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
                        boxSizing: "border-box"
                      }}
                    >
                      
                      {/* Left branding panel: Redesigned as a clean, light, ink-saving vertical compartment */}
                      <div className={`w-[32%] p-5 flex flex-col justify-between items-center text-center border-r border-[#8d734a]/20 relative overflow-hidden transition-colors duration-300 ${
                        exportTransparent ? "bg-transparent" : "bg-[#fafaf9]"
                      }`}>
                        {/* Unified Bio-Tech & Organic Leaf Vein Background Texture Overlay */}
                        <TextureOverlay color={GREEN_SHADES[greenShade].primaryHex} />

                        <div className="w-[95%] h-11 flex items-center justify-center z-10 shrink-0">
                          <img
                            src="https://upload.wikimedia.org/wikipedia/zh/thumb/2/29/National_Sun_Yat-sen_University_logo.svg/500px-National_Sun_Yat-sen_University_logo.svg.png"
                            onError={(e) => {
                              e.currentTarget.src = "https://upload.wikimedia.org/wikipedia/commons/e/e5/National_Sun_Yat-sen_University_logo.svg";
                            }}
                            alt="NSYSU Official Seal"
                            referrerPolicy="no-referrer"
                            className="max-h-11 w-auto object-contain mix-blend-multiply"
                            style={{ filter: "url(#remove-white)" }}
                          />
                        </div>

                        {/* Centered QR Code with high scanning contrast */}
                        <div className="z-10 my-2 flex flex-col items-center">
                          <img
                            src={getQrCodeSource()}
                            alt="Contact QR Code"
                            className="w-[60px] h-[60px] object-contain rounded-sm border border-[#8d734a]/25 bg-white p-0.5 shadow-xs"
                          />
                          <span className="text-[7.5px] mt-1.5 font-mono text-slate-400 font-bold tracking-widest uppercase">SCAN CONTACT</span>
                        </div>

                        <div className="space-y-0.5 z-10">
                          <span className="text-[11px] font-bold block font-serif" style={{ color: GREEN_SHADES[greenShade].primaryHex }}>EBB Lab</span>
                          <span className="text-[7.5px] tracking-tight block font-mono leading-tight text-slate-600 font-bold">
                            ENV. BIOTECH &<br/>BIOREFINERY
                          </span>
                        </div>
                      </div>

                      {/* Right Details Panel */}
                      <div className={`w-[68%] p-6 flex flex-col justify-between relative overflow-hidden transition-colors duration-300 ${
                        exportTransparent ? "bg-transparent" : "bg-[#fdfdfc]"
                      }`}>
                        {/* Unified Bio-Tech & Organic Leaf Vein Background Texture Overlay */}
                        <TextureOverlay color={GREEN_SHADES[greenShade].primaryHex} />

                        {/* Top: Name Card reminder */}
                        <div className="z-10">
                          <h4 className="text-sm font-bold text-slate-900 font-serif">
                            {formData.nameZh}
                            <span className="text-xs font-normal text-slate-500 ml-1.5 font-sans">
                              {formData.nameEn}
                            </span>
                          </h4>
                          <p className="text-[10px] font-serif italic font-semibold -mt-0.5" style={{ color: GREEN_SHADES[greenShade].primaryHex }}>
                            {formData.titleEn}
                          </p>
                        </div>

                        {/* Middle: Conditional Fields (If empty, not displayed) */}
                        <div className="space-y-2 my-2 font-mono text-[10px] z-10">
                          
                          {/* Email */}
                          {formData.email && (
                            <div className="flex items-center gap-2 text-slate-700 font-mono">
                              <Mail className="w-3.5 h-3.5 shrink-0" style={{ color: GREEN_SHADES[greenShade].primaryHex }} />
                              <span className="truncate">{formData.email}</span>
                            </div>
                          )}

                          {/* Tel */}
                          {formData.tel && (
                            <div className="flex items-center gap-2 text-slate-700 font-mono">
                              <Phone className="w-3.5 h-3.5 shrink-0" style={{ color: GREEN_SHADES[greenShade].primaryHex }} />
                              <span>{formData.tel}</span>
                            </div>
                          )}

                          {/* Line */}
                          {formData.line && (
                            <div className="flex items-center gap-2 text-slate-700">
                              <span className="text-[8px] font-bold text-white rounded-sm px-1 py-0.2 select-none shrink-0 font-sans tracking-wider" style={{ backgroundColor: GREEN_SHADES[greenShade].primaryHex }}>LINE</span>
                              <span className="font-mono">{formData.line}</span>
                            </div>
                          )}

                          {/* Address: ALWAYS EN AS REQUESTED */}
                          <div className="flex items-start gap-2 text-[#555] leading-normal">
                            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: GREEN_SHADES[greenShade].primaryHex }} />
                            <span className="text-[8px] font-sans">
                              {formData.addressEn}
                            </span>
                          </div>

                        </div>

                      </div>

                    </div>
                  </>
                )}

              </div>
            </div>
          </div>

          {/* DUAL MODE GRAPHIC (Visual cues) */}
          {layoutMode === "double" ? (
            <div className="w-full max-w-[480px] grid grid-cols-2 gap-4 text-center">
              <button
                type="button"
                onClick={() => setIsFlipped(false)}
                className={`py-2.5 rounded-sm text-[10.5px] uppercase tracking-wider font-bold border transition ${
                  !isFlipped
                    ? "text-white shadow-sm"
                    : "bg-white border-[#e5e5e0] text-slate-500 hover:bg-[#fafafa]"
                }`}
                style={!isFlipped ? { backgroundColor: GREEN_SHADES[greenShade].primaryHex, borderColor: GREEN_SHADES[greenShade].primaryHex } : undefined}
              >
                正面預覽 (Academic Front)
              </button>
              <button
                type="button"
                onClick={() => setIsFlipped(true)}
                className={`py-2.5 rounded-sm text-[10.5px] uppercase tracking-wider font-bold border transition ${
                  isFlipped
                    ? "text-white shadow-sm"
                    : "bg-white border-[#e5e5e0] text-slate-500 hover:bg-[#fafafa]"
                }`}
                style={isFlipped ? { backgroundColor: GREEN_SHADES[greenShade].primaryHex, borderColor: GREEN_SHADES[greenShade].primaryHex } : undefined}
              >
                背面預覽 (Contact Details)
              </button>
            </div>
          ) : (
            <div className="w-full max-w-[480px] text-center">
              <div 
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#f8f8f5] border border-[#e5e5e0] rounded-sm text-xs font-bold font-serif italic text-[#8d734a] shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" style={{ color: GREEN_SHADES[greenShade].primaryHex }} />
                <span>一頁式單面整合款式：特別適合半透明生質基材，避免雙面印刷透光干擾。</span>
              </div>
            </div>
          )}

          {/* EXPORTS CARD ACTION SYSTEM */}
          <div className="w-full bg-[#f8f8f5] border border-[#e5e5e0] rounded-sm p-6 shadow-sm max-w-[480px]">
            <h4 className="text-sm font-bold font-serif mb-1.5 flex items-center justify-center gap-2 text-center" style={{ color: GREEN_SHADES[greenShade].primaryHex }}>
              <Download className="w-4 h-4 text-[#8d734a]" />
              儲存與直印輸出系統 (Export & Print System)
            </h4>
            <p className="text-[11px] text-[#555] mb-4 font-light text-center">
              支援輸出高解析度 PNG 圖檔與向量 PDF。可自由切換是否帶背景底色，以利 UV 直印生物質名片。
            </p>

            {/* PNG Export Background Mode Selector */}
            <div className="bg-white border border-[#e5e5e0] rounded-sm p-3 mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" style={{ color: GREEN_SHADES[greenShade].primaryHex }} />
                  PNG 導出背景設定 (PNG Background Mode)
                </span>
                <span className="text-[9px] font-bold font-mono text-[#8d734a] italic">
                  UV 列印專用
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setExportTransparent(false)}
                  className={`py-1.5 px-3 rounded-sm text-[10px] font-bold transition border flex items-center justify-center gap-1.5 ${
                    !exportTransparent
                      ? "text-white shadow-xs"
                      : "bg-[#fdfdfc] hover:bg-[#fafafa] border-[#e5e5e0] text-slate-600"
                  }`}
                  style={!exportTransparent ? { backgroundColor: GREEN_SHADES[greenShade].primaryHex, borderColor: GREEN_SHADES[greenShade].primaryHex } : undefined}
                >
                  <Check className={`w-3.5 h-3.5 ${!exportTransparent ? "opacity-100" : "opacity-0"}`} />
                  帶背景 (標準象牙白)
                </button>
                
                <button
                  onClick={() => setExportTransparent(true)}
                  className={`py-1.5 px-3 rounded-sm text-[10px] font-bold transition border flex items-center justify-center gap-1.5 ${
                    exportTransparent
                      ? "text-white shadow-xs"
                      : "bg-[#fdfdfc] hover:bg-[#fafafa] border-[#e5e5e0] text-slate-600"
                  }`}
                  style={exportTransparent ? { backgroundColor: GREEN_SHADES[greenShade].primaryHex, borderColor: GREEN_SHADES[greenShade].primaryHex } : undefined}
                >
                  <Check className={`w-3.5 h-3.5 ${exportTransparent ? "opacity-100" : "opacity-0"}`} />
                  透明背景 (UV 直印 PNG)
                </button>
              </div>
              
              <p className="text-[9px] text-slate-500 font-light leading-normal">
                {!exportTransparent 
                  ? "包含象牙白優雅底色與卡片外框，適合一般螢幕分享、數位傳閱或一般紙質印刷預覽。"
                  : "完全移除背景色，僅導出文字、線框與葉脈底紋。適合匯入印表機直印在半透明、透明生物質塑膠（Bioplastic）或原木片上，保留基材原色與質感！"}
              </p>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                onClick={exportAsPng}
                disabled={isExporting}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-[#e5e5e0] text-[10px] font-bold uppercase tracking-widest rounded-sm hover:bg-[#fafafa] shadow-sm active:scale-95 transition-all disabled:opacity-50 shrink-0"
                style={{ color: GREEN_SHADES[greenShade].primaryHex }}
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    正在輸出...
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    儲存為 PNG
                  </>
                )}
              </button>
              
              <button
                onClick={exportAsPdf}
                disabled={isExporting}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-white text-[10px] font-bold uppercase tracking-widest rounded-sm shadow-md active:scale-95 transition-all disabled:opacity-50 shrink-0"
                style={{ backgroundColor: GREEN_SHADES[greenShade].primaryHex }}
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    正在組裝...
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5" />
                    儲存為 PDF (雙面版)
                  </>
                )}
              </button>
            </div>
            
            <p className="text-[9px] text-[#8d734a] mt-3 italic font-serif">
              *小提醒：PDF 檔案大小與尺寸已鎖定為 90mm x 54mm 國際通用商用尺寸，可直接送件廠端印製。
            </p>
          </div>

        </div>

      </div>
    </section>
  );
}
