export type ConsumableCategory = 
  | "離心管與樣品瓶"
  | "滴管吸頭與針筒"
  | "手套與防護用品"
  | "濾膜與透析耗材"
  | "擦拭與清潔耗材"
  | "培養與玻璃塑膠"
  | "封口標籤與滅菌"
  | "其他耗材";

export interface ConsumableItem {
  id: string;
  name: string;
  category: ConsumableCategory | string;
  spec: string;
  unit: string;
  currentStock: number;
  safeStock: number;
  notes?: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export type ConsumableTransactionType = "領取" | "補貨入庫" | "盤點調整" | "手動修正";

export interface ConsumableTransaction {
  id: string;
  timestamp: string;
  consumableId: string;
  consumableName: string;
  type: ConsumableTransactionType;
  changeQty: number; // 負數代表領取扣減，正數代表入庫或調增
  prevStock: number;
  afterStock: number;
  operator: string;
  isListedMember: "是" | "否";
  notes?: string;
}

export interface StocktakeAuditDetail {
  consumableId: string;
  consumableName: string;
  spec: string;
  unit: string;
  bookQty: number;      // 帳面數
  countedQty: number;   // 實盤數
  difference: number;   // 實盤數 - 帳面數
  notes?: string;
}

export interface StocktakeAudit {
  auditId: string;
  startTime: string;
  completedTime?: string;
  status: "in_progress" | "completed";
  operator: string;
  notes?: string;
  details: StocktakeAuditDetail[];
}
