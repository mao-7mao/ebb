import pptxgen from "pptxgenjs";
import { CalendarEntry, WeeklyReportConfig } from "../types/calendarLog";

// EBB Lab Presentation Theme Palette
const PALETTE = {
  navy: "1B4372",      // Primary EBB Navy
  navyDark: "122E4F",  // Darker Navy
  gold: "8D734A",      // Academic Brass / Gold
  goldLight: "D4AF37", // Bright Gold
  bgLight: "F8F8F5",   // Warm Lab Background
  white: "FFFFFF",
  slateDark: "1A1A1A", // Body Headings
  slateMuted: "475569",// Muted Text
  border: "E2E8F0",
  // Status & Category accents
  emerald: "059669",
  blue: "2563EB",
  purple: "7C3AED",
  amber: "D97706"
};

/**
 * Generate and download a structured Weekly Report PowerPoint presentation (.pptx)
 */
export async function generateWeeklyReportPptx(
  config: WeeklyReportConfig,
  currentWeekEntries: CalendarEntry[]
): Promise<string> {
  const pptx = new pptxgen();

  // Set widescreen 16:9 layout
  pptx.layout = "LAYOUT_16x9";
  pptx.author = config.authorName || "EBB Lab Member";
  pptx.company = config.labName || "EBB Lab, National Taiwan University";
  pptx.title = `${config.reportTitle} (${config.weekStartDate} ~ ${config.weekEndDate})`;

  const dateRangeStr = `${config.weekStartDate} – ${config.weekEndDate}`;
  const completedEntries = currentWeekEntries.filter((e) => e.status === "done");
  const inProgressEntries = currentWeekEntries.filter((e) => e.status === "in_progress");

  // ==========================================
  // SLIDE 1: COVER SLIDE (封面頁)
  // ==========================================
  const slideCover = pptx.addSlide();
  slideCover.background = { color: PALETTE.navyDark };

  // Decorative header bar
  slideCover.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: "100%",
    h: 0.15,
    fill: { color: PALETTE.gold }
  });

  // Lab Eyebrow
  slideCover.addText("NATIONAL TAIWAN UNIVERSITY  •  EBB LAB", {
    x: 1.0,
    y: 1.8,
    w: 8.0,
    h: 0.4,
    fontSize: 12,
    fontFace: "Calibri",
    color: PALETTE.gold,
    bold: true,
    charSpacing: 2
  });

  // Main Title
  slideCover.addText(config.reportTitle || "研究生每週工作進度週報", {
    x: 1.0,
    y: 2.3,
    w: 11.0,
    h: 1.2,
    fontSize: 34,
    fontFace: "Microsoft JhengHei",
    color: PALETTE.white,
    bold: true
  });

  // Subtitle / English Title
  slideCover.addText("Weekly Research Progress & Action Plan", {
    x: 1.0,
    y: 3.5,
    w: 10.0,
    h: 0.5,
    fontSize: 16,
    fontFace: "Calibri",
    color: "94A3B8",
    italic: true
  });

  // White Card for Meta Info
  slideCover.addShape(pptx.ShapeType.roundRect, {
    x: 1.0,
    y: 4.5,
    w: 11.3,
    h: 1.8,
    rectRadius: 0.1,
    fill: { color: "1B3B60" },
    line: { color: PALETTE.gold, width: 1 }
  });

  // Meta details inside card
  slideCover.addText([
    { text: "報告週期 (Week Range)： ", options: { bold: true, color: "CBD5E1" } },
    { text: `${dateRangeStr}\n\n`, options: { color: PALETTE.white, bold: true } },
    { text: "報告人 (Presenter)： ", options: { bold: true, color: "CBD5E1" } },
    { text: `${config.authorName || "實驗室研究生"}\n\n`, options: { color: PALETTE.white, bold: true } },
    { text: "指導單位 (Affiliation)： ", options: { bold: true, color: "CBD5E1" } },
    { text: `${config.labName || "國立臺灣大學 綠色生質生物精煉實驗室 (EBB Lab)"}`, options: { color: PALETTE.white } }
  ], {
    x: 1.3,
    y: 4.7,
    w: 10.5,
    h: 1.4,
    fontSize: 13,
    fontFace: "Microsoft JhengHei"
  });

  // ==========================================
  // SLIDE 2: WEEKLY SUMMARY (本週工作摘要與分佈)
  // ==========================================
  const slideSummary = pptx.addSlide();
  slideSummary.background = { color: PALETTE.bgLight };
  addSlideHeader(pptx, slideSummary, "本週工作摘要與分佈", "Weekly Summary & Workload Distribution", dateRangeStr);

  // Stats Card 1: Completed
  slideSummary.addShape(pptx.ShapeType.roundRect, {
    x: 0.8,
    y: 1.4,
    w: 3.6,
    h: 1.3,
    rectRadius: 0.08,
    fill: { color: PALETTE.white },
    line: { color: PALETTE.border, width: 1 }
  });
  slideSummary.addText("已完成事項 (Completed)", {
    x: 1.0,
    y: 1.55,
    w: 3.2,
    h: 0.3,
    fontSize: 11,
    fontFace: "Microsoft JhengHei",
    color: PALETTE.slateMuted,
    bold: true
  });
  slideSummary.addText(`${completedEntries.length} 項`, {
    x: 1.0,
    y: 1.85,
    w: 3.2,
    h: 0.7,
    fontSize: 26,
    fontFace: "Calibri",
    color: PALETTE.emerald,
    bold: true
  });

  // Stats Card 2: In Progress
  slideSummary.addShape(pptx.ShapeType.roundRect, {
    x: 4.8,
    y: 1.4,
    w: 3.6,
    h: 1.3,
    rectRadius: 0.08,
    fill: { color: PALETTE.white },
    line: { color: PALETTE.border, width: 1 }
  });
  slideSummary.addText("進行中事項 (In Progress)", {
    x: 5.0,
    y: 1.55,
    w: 3.2,
    h: 0.3,
    fontSize: 11,
    fontFace: "Microsoft JhengHei",
    color: PALETTE.slateMuted,
    bold: true
  });
  slideSummary.addText(`${inProgressEntries.length} 項`, {
    x: 5.0,
    y: 1.85,
    w: 3.2,
    h: 0.7,
    fontSize: 26,
    fontFace: "Calibri",
    color: PALETTE.amber,
    bold: true
  });

  // Stats Card 3: Total Recorded
  slideSummary.addShape(pptx.ShapeType.roundRect, {
    x: 8.8,
    y: 1.4,
    w: 3.6,
    h: 1.3,
    rectRadius: 0.08,
    fill: { color: PALETTE.white },
    line: { color: PALETTE.border, width: 1 }
  });
  slideSummary.addText("累計工作記錄 (Total Recorded)", {
    x: 9.0,
    y: 1.55,
    w: 3.2,
    h: 0.3,
    fontSize: 11,
    fontFace: "Microsoft JhengHei",
    color: PALETTE.slateMuted,
    bold: true
  });
  slideSummary.addText(`${currentWeekEntries.length} 項`, {
    x: 9.0,
    y: 1.85,
    w: 3.2,
    h: 0.7,
    fontSize: 26,
    fontFace: "Calibri",
    color: PALETTE.navy,
    bold: true
  });

  // Category Tag Breakdown
  const tagCounts: Record<string, number> = {};
  currentWeekEntries.forEach((e) => {
    (e.tags || ["其他"]).forEach((t) => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });

  // Project Breakdown
  const projectCounts: Record<string, number> = {};
  currentWeekEntries.forEach((e) => {
    const p = e.project_name || "未分類專案";
    projectCounts[p] = (projectCounts[p] || 0) + 1;
  });

  // Left Panel: Work Distribution by Tag
  slideSummary.addShape(pptx.ShapeType.roundRect, {
    x: 0.8,
    y: 3.0,
    w: 5.6,
    h: 3.8,
    rectRadius: 0.08,
    fill: { color: PALETTE.white },
    line: { color: PALETTE.border, width: 1 }
  });

  slideSummary.addText("工作類別分佈 (Workload by Category)", {
    x: 1.1,
    y: 3.2,
    w: 5.0,
    h: 0.4,
    fontSize: 13,
    fontFace: "Microsoft JhengHei",
    color: PALETTE.navy,
    bold: true
  });

  const tagRows = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const tagTableData: any[][] = [
    [
      { text: "類別標籤", options: { bold: true, fill: { color: "F1F5F9" }, color: PALETTE.navy } },
      { text: "事項數量", options: { bold: true, fill: { color: "F1F5F9" }, color: PALETTE.navy } },
      { text: "佔比", options: { bold: true, fill: { color: "F1F5F9" }, color: PALETTE.navy } }
    ]
  ];

  const totalTags = Object.values(tagCounts).reduce((a, b) => a + b, 0) || 1;
  tagRows.forEach(([tag, count]) => {
    const pct = Math.round((count / totalTags) * 100);
    tagTableData.push([
      { text: `🏷️ ${tag}` },
      { text: `${count} 項` },
      { text: `${pct}%` }
    ]);
  });

  slideSummary.addTable(tagTableData, {
    x: 1.1,
    y: 3.7,
    w: 5.0,
    colW: [2.2, 1.4, 1.4],
    rowH: 0.38,
    fontSize: 11,
    fontFace: "Microsoft JhengHei",
    color: PALETTE.slateDark,
    align: "center",
    border: { pt: 0.5, color: PALETTE.border }
  });

  // Right Panel: Distribution by Project
  slideSummary.addShape(pptx.ShapeType.roundRect, {
    x: 6.8,
    y: 3.0,
    w: 5.6,
    h: 3.8,
    rectRadius: 0.08,
    fill: { color: PALETTE.white },
    line: { color: PALETTE.border, width: 1 }
  });

  slideSummary.addText("專案投入分佈 (Project Allocation)", {
    x: 7.1,
    y: 3.2,
    w: 5.0,
    h: 0.4,
    fontSize: 13,
    fontFace: "Microsoft JhengHei",
    color: PALETTE.navy,
    bold: true
  });

  const projRows = Object.entries(projectCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const projTableData: any[][] = [
    [
      { text: "所屬專案名稱", options: { bold: true, fill: { color: "F1F5F9" }, color: PALETTE.navy } },
      { text: "項目數", options: { bold: true, fill: { color: "F1F5F9" }, color: PALETTE.navy } },
      { text: "比重", options: { bold: true, fill: { color: "F1F5F9" }, color: PALETTE.navy } }
    ]
  ];

  const totalProj = Object.values(projectCounts).reduce((a, b) => a + b, 0) || 1;
  projRows.forEach(([proj, count]) => {
    const pct = Math.round((count / totalProj) * 100);
    projTableData.push([
      { text: `🔬 ${proj}` },
      { text: `${count} 筆` },
      { text: `${pct}%` }
    ]);
  });

  slideSummary.addTable(projTableData, {
    x: 7.1,
    y: 3.7,
    w: 5.0,
    colW: [2.5, 1.2, 1.3],
    rowH: 0.38,
    fontSize: 11,
    fontFace: "Microsoft JhengHei",
    color: PALETTE.slateDark,
    align: "center",
    border: { pt: 0.5, color: PALETTE.border }
  });

  // ==========================================
  // SLIDE 3+: DAILY COMPLETED TASKS (逐日紀錄頁，自動分頁)
  // ==========================================
  // Sort entries chronologically
  const sortedEntries = [...currentWeekEntries].sort((a, b) => a.date.localeCompare(b.date));
  const ITEMS_PER_SLIDE = 6;
  const chunks: CalendarEntry[][] = [];

  for (let i = 0; i < sortedEntries.length; i += ITEMS_PER_SLIDE) {
    chunks.push(sortedEntries.slice(i, i + ITEMS_PER_SLIDE));
  }

  if (chunks.length === 0) {
    // Empty state slide
    const slideEmpty = pptx.addSlide();
    slideEmpty.background = { color: PALETTE.bgLight };
    addSlideHeader(pptx, slideEmpty, "本週工作事項明細", "Weekly Task Records", dateRangeStr);
    slideEmpty.addText("本週尚無登錄之工作項目紀錄。", {
      x: 2.0,
      y: 3.5,
      w: 9.0,
      h: 1.0,
      fontSize: 16,
      fontFace: "Microsoft JhengHei",
      color: PALETTE.slateMuted,
      align: "center"
    });
  } else {
    chunks.forEach((chunk, pageIndex) => {
      const slideDetail = pptx.addSlide();
      slideDetail.background = { color: PALETTE.bgLight };
      const subTitle = chunks.length > 1 ? `第 ${pageIndex + 1} / ${chunks.length} 頁` : "完整事項列表";
      addSlideHeader(pptx, slideDetail, `本週工作事項明細 (${subTitle})`, "Detailed Task Log", dateRangeStr);

      const tableRows: any[][] = [
        [
          { text: "日期", options: { bold: true, fill: { color: PALETTE.navy }, color: PALETTE.white } },
          { text: "專案", options: { bold: true, fill: { color: PALETTE.navy }, color: PALETTE.white } },
          { text: "分類標籤", options: { bold: true, fill: { color: PALETTE.navy }, color: PALETTE.white } },
          { text: "工作項目標題與產出說明", options: { bold: true, fill: { color: PALETTE.navy }, color: PALETTE.white } },
          { text: "狀態", options: { bold: true, fill: { color: PALETTE.navy }, color: PALETTE.white } }
        ]
      ];

      chunk.forEach((entry, idx) => {
        const rowBg = idx % 2 === 0 ? "FFFFFF" : "F8FAFC";
        const statusLabel = entry.status === "done" ? "✓ 已完成" : entry.status === "in_progress" ? "⏳ 進行中" : "✕ 取消";
        const statusColor = entry.status === "done" ? PALETTE.emerald : entry.status === "in_progress" ? PALETTE.amber : PALETTE.slateMuted;

        const dateParts = entry.date.split("-");
        const shortDate = `${dateParts[1]}/${dateParts[2]}`;

        tableRows.push([
          { text: shortDate, options: { fill: { color: rowBg }, align: "center", bold: true, color: PALETTE.navy } },
          { text: entry.project_name || "—", options: { fill: { color: rowBg }, align: "center", bold: true } },
          { text: (entry.tags || []).join(", ") || "未分類", options: { fill: { color: rowBg }, align: "center", color: PALETTE.slateMuted } },
          { 
            text: [
              { text: `${entry.title}\n`, options: { bold: true, color: PALETTE.slateDark } },
              { text: entry.description ? entry.description.slice(0, 100) : "無詳細說明", options: { fontSize: 9, color: PALETTE.slateMuted } }
            ],
            options: { fill: { color: rowBg }, align: "left" }
          },
          { text: statusLabel, options: { fill: { color: rowBg }, align: "center", bold: true, color: statusColor } }
        ]);
      });

      slideDetail.addTable(tableRows, {
        x: 0.8,
        y: 1.4,
        w: 11.6,
        colW: [1.0, 1.8, 1.8, 5.6, 1.4],
        rowH: 0.72,
        fontSize: 10.5,
        fontFace: "Microsoft JhengHei",
        border: { pt: 0.5, color: PALETTE.border },
        margin: 0.08
      });
    });
  }

  // ==========================================
  // SLIDE: NEXT WEEK ACTION PLAN (下週待辦規劃)
  // ==========================================
  if (config.includeNextWeek) {
    const slideNext = pptx.addSlide();
    slideNext.background = { color: PALETTE.bgLight };
    addSlideHeader(pptx, slideNext, "下週預定工作與待辦規劃", "Next Week Action Plan & Upcoming Objectives", `預定執行週`);

    const nextTasks = config.nextWeekTasks || [];

    if (nextTasks.length === 0) {
      slideNext.addText("目前下週尚無排程待辦項目。", {
        x: 2.0,
        y: 3.5,
        w: 9.0,
        h: 1.0,
        fontSize: 16,
        fontFace: "Microsoft JhengHei",
        color: PALETTE.slateMuted,
        align: "center"
      });
    } else {
      const nextTableRows: any[][] = [
        [
          { text: "優先級", options: { bold: true, fill: { color: PALETTE.gold }, color: PALETTE.white } },
          { text: "關聯專案", options: { bold: true, fill: { color: PALETTE.gold }, color: PALETTE.white } },
          { text: "預計執行事項 / 目標產出", options: { bold: true, fill: { color: PALETTE.gold }, color: PALETTE.white } },
          { text: "備註與預計時程", options: { bold: true, fill: { color: PALETTE.gold }, color: PALETTE.white } }
        ]
      ];

      nextTasks.forEach((task, idx) => {
        const rowBg = idx % 2 === 0 ? "FFFFFF" : "FDFBF7";
        const prioLabel = task.priority === "high" ? "🔴 高 (High)" : task.priority === "normal" ? "🟡 中 (Normal)" : "🟢 低 (Low)";
        const prioColor = task.priority === "high" ? "DC2626" : task.priority === "normal" ? "D97706" : "059669";

        nextTableRows.push([
          { text: prioLabel, options: { fill: { color: rowBg }, align: "center", bold: true, color: prioColor } },
          { text: task.project_name || "核心研究", options: { fill: { color: rowBg }, align: "center", bold: true } },
          { text: task.title, options: { fill: { color: rowBg }, align: "left", bold: true, color: PALETTE.slateDark } },
          { text: task.note || "按預定進度推進", options: { fill: { color: rowBg }, align: "left", color: PALETTE.slateMuted } }
        ]);
      });

      slideNext.addTable(nextTableRows, {
        x: 0.8,
        y: 1.4,
        w: 11.6,
        colW: [1.8, 2.2, 5.0, 2.6],
        rowH: 0.65,
        fontSize: 11,
        fontFace: "Microsoft JhengHei",
        border: { pt: 0.5, color: PALETTE.border },
        margin: 0.1
      });
    }
  }

  // ==========================================
  // SLIDE: NOTES & REFLECTION (心得反思與討論議題)
  // ==========================================
  if (config.includeReflection) {
    const slideNotes = pptx.addSlide();
    slideNotes.background = { color: PALETTE.bgLight };
    addSlideHeader(pptx, slideNotes, "本週心得反思與討論議題", "Weekly Reflection & Discussion Points", dateRangeStr);

    slideNotes.addShape(pptx.ShapeType.roundRect, {
      x: 0.8,
      y: 1.4,
      w: 11.6,
      h: 5.2,
      rectRadius: 0.1,
      fill: { color: PALETTE.white },
      line: { color: PALETTE.border, width: 1 }
    });

    const noteContent = config.reflectionNote || 
      "1. 本週實驗進度符合預期，高分子熱分析與層析定量結果具備高重複性。\n2. 遭遇問題：高溫固相聚合過程中真空幫浦油氣微量回吸，已安排更換濾芯。\n3. 組會待討論事項：建議與指導教授討論下階段投稿 SCI 期刊目標與圖表配色風格。\n4. 文獻研讀心得：最新發表於 Nature Sustainability 之生物聚酯催化論文值得借鏡。";

    slideNotes.addText(noteContent, {
      x: 1.2,
      y: 1.8,
      w: 10.8,
      h: 4.4,
      fontSize: 13,
      fontFace: "Microsoft JhengHei",
      color: PALETTE.slateDark,
      lineSpacingMultiple: 1.4,
      valign: "top"
    });
  }

  // Generate clean filename
  const cleanStart = config.weekStartDate.replace(/-/g, "");
  const cleanEnd = config.weekEndDate.replace(/-/g, "");
  const fileName = `週報_${cleanStart}-${cleanEnd}.pptx`;

  // Write and trigger download
  await pptx.writeFile({ fileName });
  return fileName;
}

/**
 * Helper to render standard header with EBB Lab branding
 */
function addSlideHeader(pptx: any, slide: any, titleZh: string, titleEn: string, dateRange: string) {
  // Top accent bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: "100%",
    h: 0.08,
    fill: { color: PALETTE.navy }
  });

  // Category eyebrow
  slide.addText("EBB LAB  •  RESEARCH PROGRESS REPORT", {
    x: 0.8,
    y: 0.35,
    w: 7.0,
    h: 0.25,
    fontSize: 9,
    fontFace: "Calibri",
    color: PALETTE.gold,
    bold: true,
    charSpacing: 1.5
  });

  // Chinese & English Title
  slide.addText([
    { text: `${titleZh}  `, options: { bold: true, fontSize: 18, color: PALETTE.navy } },
    { text: `|  ${titleEn}`, options: { fontSize: 12, color: PALETTE.slateMuted, italic: true } }
  ], {
    x: 0.8,
    y: 0.6,
    w: 8.5,
    h: 0.5,
    fontFace: "Microsoft JhengHei"
  });

  // Date badge right
  slide.addText(`週期: ${dateRange}`, {
    x: 9.0,
    y: 0.55,
    w: 3.4,
    h: 0.4,
    fontSize: 11,
    fontFace: "Calibri",
    color: PALETTE.slateMuted,
    bold: true,
    align: "right"
  });

  // Divider line
  slide.addShape(pptx.ShapeType.line, {
    x: 0.8,
    y: 1.15,
    w: 11.6,
    h: 0,
    line: { color: PALETTE.border, width: 1 }
  });
}
