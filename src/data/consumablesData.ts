import { ConsumableItem, ConsumableTransaction, StocktakeAudit } from "../types/consumables";

export const CONSUMABLE_CATEGORIES = [
  "全部類別",
  "離心管與樣品瓶",
  "滴管吸頭與針筒",
  "手套與防護用品",
  "濾膜與透析耗材",
  "擦拭與清潔耗材",
  "培養與玻璃塑膠",
  "封口標籤與滅菌",
  "其他耗材"
];

// 本地不再存放預設假資料，所有數據均自 Google 試算表（Google Apps Script Webhook）即時讀取與同步
export const INITIAL_CONSUMABLES: ConsumableItem[] = [];
export const INITIAL_TRANSACTIONS: ConsumableTransaction[] = [];
export const INITIAL_AUDIT_HISTORY: StocktakeAudit[] = [];
