import { BudgetProject, HistoricalCatalogItem, ProcurementItem } from "../types/procurement";

export type BudgetProjectOption = BudgetProject;

export const DEFAULT_BUDGET_PROJECTS: BudgetProject[] = [
  {
    code: "",
    nameZh: "國科會一年期：綠色農膜",
    nameEn: "NSTC 1-Year: Green Agricultural Films",
    pi: "Prof. Chang",
    validPeriod: "2026/08/01 - 2027/07/31"
  }
];

export const DEFAULT_VENDORS = [
  "Sigma-Aldrich (默克 Merck)",
  "Echo Chemical 景明化工",
  "Acros Organics (賽默飛 Thermo Fisher)",
  "Alfa Aesar",
  "友和生技 Uni-Onward",
  "伯昂興業 Ber-An",
  "巨研科技 Advantech",
  "國祥儀器 Kuo-Hsiang",
  "德記儀器 Teki Lab Supply",
  "三洋精密儀器 Sanyo Scientific",
  "蝦皮商家",
  "淘寶 / 天貓商家"
];

// 常用與預設購物平台清單 (支援使用者即時新增與本地記憶)
export const DEFAULT_SHOPPING_PLATFORMS: string[] = [
  "蝦皮購物 (Shopee)",
  "京東 (JD)",
  "淘寶 (Taobao)",
  "PChome 24h",
  "Amazon",
  "1688 批發網",
  "景明化工",
  "德記儀器",
  "原廠直接訂購"
];

// 角色安全權限密碼 (預設密碼，支援修改與各端獨立驗證)
export const DEFAULT_ROLE_PASSWORDS = {
  assistant: "ebbassistant", // 研究助理 (初審、品項核可)
  professor: "profchang",      // 教授 (終審、新增計畫、核銷)
  admin: "miaomiao"          // 系統管理者
};

// 幣種符號與換算匯率參考 (提供台幣、美元、人民幣即時對照)
export const CURRENCY_CONFIG: Record<"TWD" | "USD" | "CNY", { label: string; nameZh: string; symbol: string; approxRateToTwd: number }> = {
  TWD: { label: "新台幣 (TWD)", nameZh: "台幣 TWD", symbol: "NT$", approxRateToTwd: 1 },
  USD: { label: "美元 (USD)", nameZh: "美元 USD", symbol: "$", approxRateToTwd: 32.5 },
  CNY: { label: "人民幣 (CNY)", nameZh: "人民幣 CNY", symbol: "¥", approxRateToTwd: 4.6 }
};

export function formatPriceWithCurrency(price: number, currency: "TWD" | "USD" | "CNY" = "TWD"): string {
  const cfg = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.TWD;
  return `${cfg.symbol} ${price.toLocaleString()}`;
}

export function convertToTwdEstimate(price: number, currency: "TWD" | "USD" | "CNY" = "TWD"): number {
  const rate = CURRENCY_CONFIG[currency]?.approxRateToTwd || 1;
  return Math.round(price * rate);
}

export const DEFAULT_HISTORICAL_CATALOG: HistoricalCatalogItem[] = [
  {
    id: "hist-1",
    category: "chemical",
    itemName: "氯化膽鹼 (Choline Chloride)",
    englishName: "Choline Chloride, >=98%",
    casNumber: "67-48-1",
    purity: "98.0% AR grade",
    packageSize: "500 g",
    vendorName: "",
    lastUnitPrice: 1450,
    currency: "NTD",
    brand: "",
    budgetProject: "",
    productUrl: ""
  }
];

export const INITIAL_PROCUREMENT_ITEMS: ProcurementItem[] = [];

export const GOOGLE_APPS_SCRIPT_SAMPLE = `/**
 * EBB Lab 實驗室請購系統 Google Apps Script 後端腳本
 * 佈署為 Web 應用程式 (Web App) 後，可自動接收請購單、寫入 Google Sheets 並自動發送 Gmail 通知信件！
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action; // "create_request", "approve_request", "mark_purchased"
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === "create_request") {
      const sheet = ss.getSheetByName("請購清單") || ss.insertSheet("請購清單");
      const item = data.item;
      
      // 寫入 Google Sheet
      sheet.appendRow([
        item.requisitionNo,
        item.createdAt,
        item.applicantName,
        item.applicantEmail,
        item.category,
        item.itemName,
        item.quantity,
        item.estimatedTotalPrice,
        item.budgetProject,
        item.purpose,
        item.vendorName,
        "待初審 (pending_assistant)"
      ]);
      
      // 觸發 Email 1: 寄給研究助理與教授
      const subject = \`[EBB Lab 請購待審] 單號 \${item.requisitionNo} - \${item.applicantName} 申請 \${item.itemName}\`;
      const htmlBody = \`
        <div style="font-family: sans-serif; padding: 20px; color: #1a1a1a;">
          <h2 style="color: #004b3a;">EBB Lab 實驗室新請購申請通知</h2>
          <p>您好，實驗室成員 <strong>\${item.applicantName}</strong> 已於線上填寫新請購單，等待審核：</p>
          <table style="border-collapse: collapse; width: 100%; margin: 15px 0;">
            <tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f8f5;"><strong>請購單號</strong></td><td style="padding: 8px; border: 1px solid #ddd;">\${item.requisitionNo}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f8f5;"><strong>品項名稱</strong></td><td style="padding: 8px; border: 1px solid #ddd;">\${item.itemName}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f8f5;"><strong>預估總額</strong></td><td style="padding: 8px; border: 1px solid #ddd;">NT$ \${item.estimatedTotalPrice.toLocaleString()}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f8f5;"><strong>經費計畫</strong></td><td style="padding: 8px; border: 1px solid #ddd;">\${item.budgetProject}</td></tr>
            <tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f8f5;"><strong>請購目的</strong></td><td style="padding: 8px; border: 1px solid #ddd;">\${item.purpose}</td></tr>
          </table>
          <p>請前往實驗室請購系統網站進行初審與終審核准。</p>
        </div>
      \`;
      
      // 請將以下信箱替換為實際助理與教授信箱
      const reviewerEmails = "ebblab115@gmail.com, klchang@mail.nsysu.edu.tw";
      MailApp.sendEmail({
        to: reviewerEmails,
        subject: subject,
        htmlBody: htmlBody
      });
      
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Request saved & notified" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "approve_request") {
      const item = data.item;
      // 觸發 Email 2: 教授核准通知原申請學生
      const subject = \`[EBB Lab 請購核准] 單號 \${item.requisitionNo} - 已審核通過，可執行採購\`;
      const htmlBody = \`
        <div style="font-family: sans-serif; padding: 20px; color: #1a1a1a;">
          <h2 style="color: #004b3a;">EBB Lab 請購單審核通過通知</h2>
          <p>親愛的 <strong>\${item.applicantName}</strong> 您好：</p>
          <p>您申請的請購單 <strong>\${item.requisitionNo} (\${item.itemName})</strong> 已獲教授核准！</p>
          <p><strong>指定採購人：</strong>\${item.purchaser === 'student' ? '由申請學生採購' : '由教授採購'}</p>
          <p><strong>教授審核意見：</strong>\${item.professorReview ? item.professorReview.comment : '無'}</p>
          <p>請於採購完成後，回到實驗室請購系統回填發票號碼與實際採購資訊以利經費核銷。</p>
        </div>
      \`;
      
      MailApp.sendEmail({
        to: item.applicantEmail,
        subject: subject,
        htmlBody: htmlBody
      });
      
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Applicant notified" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Unknown action" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
`;
