/**
 * EBB Lab 實驗室耗材統計與領用盤點系統 - 雲端雙向同步服務
 * 串接 Google Apps Script Web App Webhook
 */

import { ConsumableItem, ConsumableTransaction, StocktakeAudit } from "../types/consumables";
import { EXTERNAL_LINKS } from "../config/externalLinks";

export interface ConsumablesSyncResult {
  success: boolean;
  message?: string;
  items?: ConsumableItem[];
  transactions?: ConsumableTransaction[];
  audits?: StocktakeAudit[];
  lastAuditDays?: number;
}

/**
 * 取得當前設定的耗材 Webhook 網址
 */
export function getConsumablesWebhookUrl(): string {
  if (typeof window !== "undefined") {
    const local = localStorage.getItem("ebblab_consumables_webhook_url");
    if (local && local.trim()) return local.trim();
  }
  return (EXTERNAL_LINKS.consumablesWebhookUrl || "").trim();
}

/**
 * 儲存自訂耗材 Webhook 網址
 */
export function saveConsumablesWebhookUrl(url: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("ebblab_consumables_webhook_url", url.trim());
  }
}

/**
 * 從 Google Apps Script 雲端試算表 (doGet) 讀取最新耗材清冊與歷史紀錄
 */
export async function fetchConsumablesFromCloud(customUrl?: string): Promise<ConsumablesSyncResult> {
  const url = (customUrl || getConsumablesWebhookUrl()).trim();
  if (!url) {
    return { success: false, message: "尚未配置耗材系統 Google Apps Script Webhook 網址。" };
  }

  try {
    const fetchUrl = url + (url.includes("?") ? "&action=data" : "?action=data");
    const res = await fetch(fetchUrl, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });

    if (!res.ok) {
      return { success: false, message: `雲端伺服器回應錯誤 (${res.status} ${res.statusText})` };
    }

    const data = await res.json();
    if (data && (data.success || Array.isArray(data.items))) {
      return {
        success: true,
        items: Array.isArray(data.items) ? data.items : undefined,
        transactions: Array.isArray(data.transactions) ? data.transactions : undefined,
        audits: Array.isArray(data.audits) ? data.audits : undefined,
        lastAuditDays: typeof data.lastAuditDays === "number" ? data.lastAuditDays : undefined,
        message: `成功從 Google 試算表同步 ${data.items?.length || 0} 項耗材資料！`
      };
    }

    return { success: false, message: data.error || "回傳格式不符合預期。" };
  } catch (err: any) {
    console.warn("fetchConsumablesFromCloud error:", err);
    return { success: false, message: `無法連線至雲端試算表：${err.message || err}` };
  }
}

/**
 * 發送異動至 Google Apps Script 雲端後端 (doPost)
 */
export async function sendConsumablesWebhook(payload: Record<string, any>, customUrl?: string): Promise<{ success: boolean; data?: any; message?: string; error?: string }> {
  const url = (customUrl || getConsumablesWebhookUrl()).trim();
  if (!url) {
    return { success: false, message: "未設定耗材 Webhook 網址，將僅儲存於本機瀏覽器。" };
  }

  try {
    // 依據 GAS 特性，使用 text/plain;charset=utf-8 傳遞 JSON 避免 CORS 預檢攔截
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      return { success: false, message: `伺服器回應錯誤：${res.status} ${res.statusText}` };
    }

    const json = await res.json();
    return json;
  } catch (err: any) {
    console.warn("sendConsumablesWebhook error:", err);
    // 即使後端連線受跨域限制，前端仍需告知
    return { success: false, message: `雲端連線異常：${err.message || err}` };
  }
}
