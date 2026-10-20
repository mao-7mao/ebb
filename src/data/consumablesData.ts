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

export const INITIAL_CONSUMABLES: ConsumableItem[] = [
  {
    id: "CON-001",
    name: "1.5 mL 微量離心管 (Microcentrifuge Tubes)",
    category: "離心管與樣品瓶",
    spec: "1.5 mL / 圓底帶刻度 / 無菌高壓滅菌級",
    unit: "包 (500支/包)",
    currentStock: 18,
    safeStock: 5,
    notes: "分子生物與日常離心常用",
    status: "active",
    createdAt: "2026-08-01 10:00",
    updatedAt: "2026-10-15 14:30"
  }
];

export const INITIAL_TRANSACTIONS: ConsumableTransaction[] = [
  {
    id: "TX-20261018-001",
    timestamp: "2026-10-18 16:40",
    consumableId: "CON-003",
    consumableName: "15 mL 尖底離心管 (Falcon Tubes)",
    type: "領取",
    changeQty: -2,
    prevStock: 5,
    afterStock: 3,
    operator: "林郁芳 (Fanny)",
    isListedMember: "是",
    notes: "微藻生質萃取前處理"
  }
];

export const INITIAL_AUDIT_HISTORY: StocktakeAudit[] = [
  {
    auditId: "AUDIT-20260920",
    startTime: "2026-09-20 14:00",
    completedTime: "2026-09-20 16:30",
    status: "completed",
    operator: "林郁芳 (Fanny)",
    notes: "九月份定期盤點，耗損大致在合理範圍內。",
    details: [
      {
        consumableId: "CON-001",
        consumableName: "1.5 mL 微量離心管 (Microcentrifuge Tubes)",
        spec: "1.5 mL / 圓底帶刻度",
        unit: "包 (500支/包)",
        bookQty: 22,
        countedQty: 20,
        difference: -2,
        notes: "實盤少 2 包，已補平紀錄"
      }
    ]
  }
];
