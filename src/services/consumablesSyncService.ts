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

export const CONSUMABLES_ADMIN_PASSWORD = "ebbthings";
export const ADMIN_GAS_TOKEN_KEY = "ebblab_consumables_admin_gas_token_v4";

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
export async function sendConsumablesWebhook(
  payload: Record<string, any>, 
  customUrl?: string
): Promise<{ success: boolean; data?: any; message?: string; error?: string; itemId?: string; token?: string; [key: string]: any }> {
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
    return { success: false, message: `雲端連線異常：${err.message || err}`, error: String(err.message || err) };
  }
}

/**
 * 取得或自動刷新管理員驗證 Token (向 GAS admin_login 申請有效 token_xxx)
 */
export async function getValidAdminToken(forceRefresh = false): Promise<string> {
  if (typeof window === "undefined") return "authorized_ebbthings";

  if (!forceRefresh) {
    const cachedToken = localStorage.getItem(ADMIN_GAS_TOKEN_KEY);
    if (cachedToken && cachedToken.startsWith("token_")) {
      return cachedToken;
    }
  }

  try {
    const res = await sendConsumablesWebhook({
      action: "admin_login",
      password: CONSUMABLES_ADMIN_PASSWORD
    });

    if (res && res.success && res.token) {
      localStorage.setItem(ADMIN_GAS_TOKEN_KEY, res.token);
      return res.token;
    }
  } catch (e) {
    console.warn("getValidAdminToken login failed:", e);
  }

  return "authorized_ebbthings";
}

/**
 * 發送需管理員授權的請求，若憑證過期自動換發 Token 並重試一次
 */
export async function sendConsumablesAdminAction(
  action: string,
  payload: Record<string, any>,
  customUrl?: string
): Promise<{ success: boolean; data?: any; message?: string; error?: string; itemId?: string; [key: string]: any }> {
  let token = await getValidAdminToken(false);

  const fullPayload = {
    action,
    token,
    password: CONSUMABLES_ADMIN_PASSWORD,
    ...payload
  };

  let res = await sendConsumablesWebhook(fullPayload, customUrl);

  // 若回傳憑證無效或過期，強制重新登入取得新 Token 並重試一次
  const errorMsg = String(res.error || res.message || "");
  const isAuthError = !res.success && (
    errorMsg.includes("憑證") || 
    errorMsg.includes("凭證") || 
    errorMsg.includes("失效") || 
    errorMsg.includes("過期") || 
    errorMsg.includes("Token") || 
    errorMsg.includes("token") || 
    errorMsg.includes("登入") ||
    errorMsg.includes("unauthorized")
  );

  if (isAuthError) {
    token = await getValidAdminToken(true);
    fullPayload.token = token;
    res = await sendConsumablesWebhook(fullPayload, customUrl);
  }

  return res;
}
