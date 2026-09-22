export type ProcurementCategory = "chemical" | "consumable" | "equipment";

export type CurrencyCode = "TWD" | "USD" | "CNY";

export type ProcurementStatus = 
  | "pending_assistant"  // 待助理初審
  | "pending_professor"  // 待教授終審
  | "partially_approved" // 部分通過 (部分品項核准、部分品項退回)
  | "approved"           // 全部核准 (待採購)
  | "rejected"           // 全部退回
  | "purchased";         // 已採購 (已完成實際購買)

export type UserRole = "student" | "assistant" | "professor" | "admin";

export type PurchaserType = "student" | "professor" | "postpayment" | "unassigned";

export type PurchaseProgressStatus = 
  | "pending_purchase"     // 待採購 (尚未購買)
  | "student_purchased"    // 請購人已購買 (學生自購)
  | "professor_purchased"  // 教授已購買 (老師統購)
  | "postpayment"          // 貨到後付款 (廠商送貨後報帳請款)
  | "delivered"            // 已到貨 / 已收訖
  | "completed";           // 採購完成 / 已結案

export interface VendorQuote {
  id: string;
  vendorName: string;
  unitPrice: number;
  currency: string;
  note?: string;
  isRecommended?: boolean;
}

// 單筆請購品項明細 (支援一張請購單包含多筆品項)
export interface ProcurementItemLine {
  id: string;
  category: ProcurementCategory;
  itemName: string;
  quantity: number;
  unit: string;
  currency?: CurrencyCode; // 台幣 TWD, 美元 USD, 人民幣 CNY
  estimatedUnitPrice: number;
  estimatedTotalPrice: number;
  platform?: string;    // 購物平台 (選填：淘寶、天貓、蝦皮、PChome、Amazon、原廠等，支援自訂與記憶)
  productUrl?: string;  // 購物平台 / 商品規格連結 (選填)
  purpose?: string;       // 品項用途說明
  description?: string;
  vendorName: string;
  quotes?: VendorQuote[];
  status: "pending_assistant" | "pending_professor" | "approved" | "rejected" | "purchased";
  reviewComment?: string; // 個別品項審批備註 (例如：核准或退回原因)
  purchaseProgress?: PurchaseProgressStatus; // 購買進程 (尚未購買、請購人已購買、教授已購買等)
  
  // 實際採購回填資訊 (個別品項)
  purchasedInfo?: {
    actualUnitPrice?: number;
    actualTotalPrice?: number;
    actualCurrency?: CurrencyCode;
    invoiceNumber?: string;
    purchaseDate?: string;
  };

  // Category Specific Details
  chemicalDetails?: {
    casNumber?: string;
    purity?: string;
    packageSize?: string;
    chemicalEnglishName?: string;
    brand?: string;
    ghsHazard?: string[];
    msdsUrl?: string;
  };

  consumableDetails?: {
    specModel?: string;
    subCategory?: string; // 實驗耗材, 玻璃儀器, 防護用品, 辦公文具, 清潔雜物
  };

  equipmentDetails?: {
    modelNumber?: string;
    warrantyPeriod?: string;
    requiresInstallation?: boolean;
    requiresTraining?: boolean;
  };
}

export interface ProcurementItem {
  id: string;
  requisitionNo: string; // e.g. EBB-2026-001
  createdAt: string;     // YYYY-MM-DD HH:mm
  applicantName: string;
  applicantEmail: string;
  department: string;
  purpose: string;       // 請購總體目的 / 專案說明
  description?: string;  // 詳細用途/說明
  budgetProject?: string;
  status: ProcurementStatus;
  
  // 多品項清單 (一張請購單可含多筆樣品、耗材或設備)
  items?: ProcurementItemLine[];

  // 常見捷徑欄位 (相容舊版與單品項顯示)
  category?: ProcurementCategory;
  itemName?: string;
  quantity?: number;
  unit?: string;
  currency?: CurrencyCode;
  estimatedUnitPrice?: number;
  estimatedTotalPrice: number;
  platform?: string;
  productUrl?: string;
  vendorName?: string;
  quotes?: VendorQuote[];
  chemicalDetails?: ProcurementItemLine["chemicalDetails"];
  consumableDetails?: ProcurementItemLine["consumableDetails"];
  equipmentDetails?: ProcurementItemLine["equipmentDetails"];

  // Approval Threshold & Routing: 不論金額皆須助理初審後送教授終審；≥ 3000 TWD 需附比價紀錄，< 3000 TWD 免比價
  requiresProfessorApproval?: boolean;
  notifyProfessor?: boolean;

  // Workflow Review Records
  assistantReview?: {
    reviewerName: string;
    reviewedAt: string;
    approved: boolean;
    comment: string;
  };
  professorReview?: {
    reviewerName: string;
    reviewedAt: string;
    approved: boolean;
    comment: string;
    designatedPurchaser: PurchaserType;
  };

  // Execution / Purchase Information
  purchaser: PurchaserType;
  purchaseProgress?: PurchaseProgressStatus; // 總體購買進程 (尚未購買、請購人已購買、教授已購買等)
  actualPurchaseInfo?: {
    purchasedBy: string;
    purchaseDate: string;
    actualUnitPrice?: number;
    actualTotalPrice: number;
    invoiceNumber?: string;
    vendor?: string;
    note?: string;
    receiptFile?: string;
  };
}

export interface HistoricalCatalogItem {
  id: string;
  category: ProcurementCategory;
  itemName: string;
  englishName?: string;
  casNumber?: string;
  purity?: string;
  packageSize?: string;
  vendorName: string;
  lastUnitPrice: number;
  currency: string;
  brand?: string;
  specModel?: string;
  productUrl?: string; // 常用購買連結
}

