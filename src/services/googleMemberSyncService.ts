import { Member, Meeting } from "../data/labData";
import { ProgressEntry, ExternalMember } from "../types/progress";
import { EXTERNAL_LINKS } from "../config/externalLinks";

export const STORAGE_KEY_MEMBER_WEBHOOK = "ebblab_member_gas_webhook";
export const STORAGE_KEY_LAST_SYNC_TIME = "ebblab_member_gas_last_sync";

export interface GoogleSyncDataPayload {
  members?: Member[];
  externalMembers?: ExternalMember[];
  meetings?: Meeting[];
  progressEntries?: ProgressEntry[];
}

export interface GoogleSyncFetchResult {
  success: boolean;
  timestamp?: string;
  data?: {
    members: Member[];
    externalMembers: ExternalMember[];
    meetings: Meeting[];
    progressEntries: ProgressEntry[];
  };
  error?: string;
}

/**
 * 取得儲存的 Google Apps Script Webhook 網址 (優先讀取後端設定檔)
 */
export function getSavedMemberWebhookUrl(): string {
  // 1. 優先由後端配置檔讀取 (src/config/externalLinks.ts)
  if (EXTERNAL_LINKS.progressReportWebhookUrl && EXTERNAL_LINKS.progressReportWebhookUrl.trim()) {
    return EXTERNAL_LINKS.progressReportWebhookUrl.trim();
  }
  // 2. 次之由環境變數讀取
  const envUrl = typeof import.meta !== "undefined" ? (import.meta as any).env?.VITE_PROGRESS_GAS_WEBHOOK_URL : "";
  if (envUrl && typeof envUrl === "string" && envUrl.trim()) {
    return envUrl.trim();
  }
  // 3. 備援本機儲存 (LocalStorage)
  try {
    return localStorage.getItem(STORAGE_KEY_MEMBER_WEBHOOK) || "";
  } catch (e) {
    return "";
  }
}

/**
 * 儲存 Google Apps Script Webhook 網址
 */
export function saveMemberWebhookUrl(url: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_MEMBER_WEBHOOK, url.trim());
  } catch (e) {
    console.error("Failed to save member webhook url", e);
  }
}

/**
 * 測試連線 (Ping)
 */
export async function pingMemberWebhook(webhookUrl: string): Promise<{ success: boolean; message: string }> {
  const url = webhookUrl.trim();
  if (!url) {
    return { success: false, message: "尚未輸入 Webhook 網址" };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action: "ping" })
    });
    const data = await res.json().catch(() => null);
    if (res.ok || (data && data.success)) {
      return {
        success: true,
        message: data?.message || "連線成功！Google Apps Script 回應正常。"
      };
    }
    return {
      success: true,
      message: "請求已送達 Google Apps Script (因跨網域安全機制可能為無狀態傳送，但連線已建立)。"
    };
  } catch (err: any) {
    return {
      success: false,
      message: `連線失敗: ${err?.message || "請檢查網址與部署權限 (需設為 Anyone)"}`
    };
  }
}

/**
 * 從 Google Apps Script 讀取最新人員、會議與進度紀錄 (doGet)
 */
export async function fetchMemberDataFromGoogle(webhookUrl?: string): Promise<GoogleSyncFetchResult> {
  const url = (webhookUrl || getSavedMemberWebhookUrl()).trim();
  if (!url) {
    return { success: false, error: "未配置 Google Apps Script Webhook 網址" };
  }

  try {
    const fetchUrl = url.includes("?") ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`;
    const res = await fetch(fetchUrl, {
      method: "GET",
      headers: { "Accept": "application/json" }
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    const json = await res.json();
    if (json && json.success && json.data) {
      try {
        localStorage.setItem(STORAGE_KEY_LAST_SYNC_TIME, new Date().toISOString());
      } catch (e) {}
      return {
        success: true,
        timestamp: json.timestamp || new Date().toISOString(),
        data: json.data
      };
    } else {
      return {
        success: false,
        error: json?.error || "回傳格式無效或試算表尚未初始化"
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "網路讀取失敗，請確認 Apps Script 部署身分為 Anyone"
    };
  }
}

/**
 * 將當前人員、會議或進度資料同步儲存回 Google Sheets (doPost)
 */
export async function syncMemberDataToGoogle(
  payload: GoogleSyncDataPayload,
  action: "sync_all" | "sync_members_meetings" | "sync_progress" = "sync_all",
  webhookUrl?: string
): Promise<{ success: boolean; message: string }> {
  const url = (webhookUrl || getSavedMemberWebhookUrl()).trim();
  if (!url) {
    return { success: false, message: "尚未配置 Google Apps Script Webhook 網址，請先至設定中填寫。" };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: action,
        timestamp: new Date().toISOString(),
        ...payload
      })
    });

    const data = await res.json().catch(() => null);
    try {
      localStorage.setItem(STORAGE_KEY_LAST_SYNC_TIME, new Date().toISOString());
    } catch (e) {}

    if (data && data.success) {
      return {
        success: true,
        message: data.message || "成功同步至 Google Sheets 試算表！"
      };
    }

    return {
      success: true,
      message: "同步請求已送出至 Google Apps Script 試算表！"
    };
  } catch (err: any) {
    return {
      success: false,
      message: `同步失敗: ${err?.message || "請檢查網路與 Apps Script 權限"}`
    };
  }
}
