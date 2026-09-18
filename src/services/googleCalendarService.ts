import { CalendarEntry } from "../types/calendarLog";

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
            error_callback?: (err: any) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

export const DEFAULT_CLIENT_ID = "1090379910173-dbkf2ha33n6ni0ctme1s5e1a9om6sl0d.apps.googleusercontent.com";
export const DEFAULT_CALENDAR_ID = "primary";
export const EBB_PUBLIC_CALENDAR_ID = "34f29840b0b8064c9311026742cee0e1600d7a4a990a7e4acd99e625040baee6@group.calendar.google.com";
export const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

const TOKEN_STORAGE_KEY = "ebblab_gcal_access_token";
const TOKEN_EXPIRY_KEY = "ebblab_gcal_token_expiry";

let cachedToken: string | null = null;

export function getStoredAccessToken(): string | null {
  if (cachedToken) return cachedToken;
  try {
    const token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    const expiry = sessionStorage.getItem(TOKEN_EXPIRY_KEY);
    if (token && expiry && Number(expiry) > Date.now()) {
      cachedToken = token;
      return token;
    }
  } catch (e) {}
  return null;
}

export function saveAccessToken(token: string, expiresInSeconds: number = 3600): void {
  cachedToken = token;
  try {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    sessionStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + expiresInSeconds * 1000));
  } catch (e) {}
}

export function clearAccessToken(): void {
  cachedToken = null;
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
  } catch (e) {}
}

/**
 * Request OAuth 2.0 access token via Google Identity Services (GIS)
 */
export function requestGoogleAccessToken(
  clientId: string,
  onSuccess: (token: string) => void,
  onError: (error: string) => void
): void {
  if (!window.google?.accounts?.oauth2) {
    onError("Google Identity Services script 尚未載入完成，請確認網路連線或稍後重試。");
    return;
  }

  try {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: CALENDAR_SCOPE,
      callback: (response) => {
        if (response.error) {
          onError(response.error);
        } else if (response.access_token) {
          saveAccessToken(response.access_token);
          onSuccess(response.access_token);
        } else {
          onError("未取得有效的授權存取碼 (Access Token)");
        }
      },
      error_callback: (err) => {
        console.error("GIS Token Client error:", err);
        onError(err?.message || "Google 授權登入失敗");
      }
    });

    client.requestAccessToken({ prompt: "" });
  } catch (e: any) {
    console.error("Failed to init GIS token client:", e);
    onError(e.message || "Google OAuth 初始化失敗");
  }
}

/**
 * Convert CalendarEntry to Google Calendar event payload
 */
function entryToGooglePayload(entry: CalendarEntry) {
  const tagsStr = entry.tags?.length ? `[${entry.tags.join("][")}]` : "";
  const projStr = entry.project_name ? `【${entry.project_name}】` : "";
  const statusStr = entry.status === "done" ? "✓" : entry.status === "in_progress" ? "⏳" : "✕";

  const summary = `${statusStr} ${projStr} ${tagsStr} ${entry.title}`.trim();

  // All-day event calculation
  const startDate = entry.date;
  // Google Calendar all-day event end date is exclusive, so if same day, add 1 day
  let endDate = entry.end_date || entry.date;
  const endObj = new Date(endDate);
  endObj.setDate(endObj.getDate() + 1);
  const exclusiveEndDate = endObj.toISOString().split("T")[0];

  const description = [
    `【LabStudio 工作事項紀錄】`,
    `項目 ID: ${entry.id}`,
    `狀態: ${entry.status === "done" ? "已完成" : entry.status === "in_progress" ? "進行中" : "已取消"}`,
    entry.project_name ? `所屬專案: ${entry.project_name}` : null,
    entry.tags?.length ? `分類標籤: ${entry.tags.join(", ")}` : null,
    entry.priority ? `優先權: ${entry.priority}` : null,
    entry.description ? `\n備註說明:\n${entry.description}` : null,
    `\n-- 由 EBB LabStudio 自動同步 --`
  ].filter(Boolean).join("\n");

  return {
    summary,
    description,
    start: { date: startDate, timeZone: "Asia/Taipei" },
    end: { date: exclusiveEndDate, timeZone: "Asia/Taipei" },
    extendedProperties: {
      private: {
        labstudio_entry_id: entry.id,
        labstudio_project: entry.project_name || "",
        labstudio_status: entry.status,
        labstudio_tags: (entry.tags || []).join(",")
      }
    }
  };
}

/**
 * Create event on Google Calendar
 */
export async function createGoogleEvent(
  entry: CalendarEntry,
  token: string,
  calendarId: string = DEFAULT_CALENDAR_ID
): Promise<string> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
  const body = entryToGooglePayload(entry);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Calendar API Error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data.id;
}

/**
 * Update event on Google Calendar
 */
export async function updateGoogleEvent(
  entry: CalendarEntry,
  token: string,
  calendarId: string = DEFAULT_CALENDAR_ID
): Promise<void> {
  if (!entry.google_event_id) {
    throw new Error("Missing google_event_id for update");
  }

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(entry.google_event_id)}`;
  const body = entryToGooglePayload(entry);

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Calendar API Error (${res.status}): ${errorText}`);
  }
}

/**
 * Delete event on Google Calendar
 */
export async function deleteGoogleEvent(
  googleEventId: string,
  token: string,
  calendarId: string = DEFAULT_CALENDAR_ID
): Promise<void> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`;

  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  // 204 No Content is normal for DELETE, 404/410 means already deleted
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const errorText = await res.text();
    throw new Error(`Google Calendar API Error (${res.status}): ${errorText}`);
  }
}

/**
 * Fetch events from Google Calendar within a time window
 */
export async function fetchGoogleEvents(
  token: string,
  calendarId: string = DEFAULT_CALENDAR_ID,
  timeMin?: string,
  timeMax?: string
): Promise<any[]> {
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250"
  });

  if (timeMin) params.set("timeMin", new Date(timeMin).toISOString());
  if (timeMax) params.set("timeMax", new Date(timeMax).toISOString());

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Calendar API Error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  return data.items || [];
}

/**
 * Two-way sync engine
 */
export interface SyncResult {
  pushedCount: number;
  pulledCount: number;
  updatedCount: number;
  mergedEntries: CalendarEntry[];
  error?: string;
}

export async function syncTwoWayWithGoogleCalendar(
  localEntries: CalendarEntry[],
  token: string,
  calendarId: string = DEFAULT_CALENDAR_ID,
  direction: "bidirectional" | "to_google" | "from_google" = "bidirectional"
): Promise<SyncResult> {
  let pushedCount = 0;
  let pulledCount = 0;
  let updatedCount = 0;

  const nowStr = new Date().toISOString();
  let workingEntries = [...localEntries];

  // 1. If to_google or bidirectional: Push local entries to Google Calendar
  if (direction === "bidirectional" || direction === "to_google") {
    for (let i = 0; i < workingEntries.length; i++) {
      const entry = workingEntries[i];
      try {
        if (!entry.google_event_id) {
          // Create new Google event
          const gId = await createGoogleEvent(entry, token, calendarId);
          workingEntries[i] = {
            ...entry,
            google_event_id: gId,
            google_sync_status: "synced",
            google_sync_time: nowStr
          };
          pushedCount++;
        } else if (entry.google_sync_status !== "synced") {
          // Update existing Google event
          await updateGoogleEvent(entry, token, calendarId);
          workingEntries[i] = {
            ...entry,
            google_sync_status: "synced",
            google_sync_time: nowStr
          };
          updatedCount++;
        }
      } catch (err: any) {
        console.warn(`Failed to push entry ${entry.id} to Google:`, err);
        workingEntries[i] = {
          ...entry,
          google_sync_status: "error"
        };
      }
    }
  }

  // 2. If from_google or bidirectional: Pull events from Google Calendar
  if (direction === "bidirectional" || direction === "from_google") {
    try {
      // Pull current month +/- 30 days window
      const now = new Date();
      const past = new Date(now);
      past.setDate(past.getDate() - 45);
      const future = new Date(now);
      future.setDate(future.getDate() + 60);

      const gEvents = await fetchGoogleEvents(token, calendarId, past.toISOString(), future.toISOString());

      // Map google events by ID
      const existingGIds = new Set(
        workingEntries.map((e) => e.google_event_id).filter(Boolean)
      );

      for (const gev of gEvents) {
        if (gev.status === "cancelled") continue;
        const gId = gev.id;

        // Check if event already exists locally
        const existingIndex = workingEntries.findIndex(
          (e) => e.google_event_id === gId || (gev.extendedProperties?.private?.labstudio_entry_id && e.id === gev.extendedProperties.private.labstudio_entry_id)
        );

        const startDate = gev.start?.date || (gev.start?.dateTime ? gev.start.dateTime.split("T")[0] : nowStr.split("T")[0]);
        let endDate = gev.end?.date;
        if (endDate) {
          // Google all-day end date is exclusive, subtract 1 day if necessary
          const endD = new Date(endDate);
          endD.setDate(endD.getDate() - 1);
          const inclusiveEnd = endD.toISOString().split("T")[0];
          endDate = inclusiveEnd >= startDate ? inclusiveEnd : startDate;
        }

        const summary = gev.summary || "未命名 Google 日曆事項";
        const description = gev.description || "";

        // Extract tags and project from summary or description
        let tags: string[] = [];
        let project_name: string | undefined = undefined;

        if (gev.extendedProperties?.private?.labstudio_tags) {
          tags = gev.extendedProperties.private.labstudio_tags.split(",").filter(Boolean);
        } else {
          // Parse brackets like [實驗][寫作]
          const tagMatches = summary.match(/\[([^\]]+)\]/g);
          if (tagMatches) {
            tags = tagMatches.map((t: string) => t.replace(/\[|\]/g, "").trim());
          }
        }

        if (gev.extendedProperties?.private?.labstudio_project) {
          project_name = gev.extendedProperties.private.labstudio_project;
        } else {
          const projMatch = summary.match(/【([^】]+)】/);
          if (projMatch) {
            project_name = projMatch[1];
          }
        }

        const cleanTitle = summary
          .replace(/^[✓⏳✕]\s*/, "")
          .replace(/【[^】]+】\s*/, "")
          .replace(/\[[^\]]+\]\s*/g, "")
          .trim();

        if (existingIndex >= 0) {
          // Already linked, update sync timestamp
          workingEntries[existingIndex] = {
            ...workingEntries[existingIndex],
            google_event_id: gId,
            google_sync_status: "synced",
            google_sync_time: nowStr
          };
        } else if (!existingGIds.has(gId)) {
          // New event created in Google Calendar, import to LabStudio!
          const newEntry: CalendarEntry = {
            id: gev.extendedProperties?.private?.labstudio_entry_id || `gcal-${gId.slice(0, 12)}`,
            date: startDate,
            end_date: endDate !== startDate ? endDate : undefined,
            title: cleanTitle || summary,
            description: description,
            tags: tags.length ? tags : ["開會"],
            status: summary.startsWith("✓") ? "done" : "in_progress",
            priority: "normal",
            project_name: project_name,
            google_event_id: gId,
            google_sync_status: "synced",
            google_sync_time: nowStr,
            created_at: gev.created || nowStr,
            updated_at: gev.updated || nowStr
          };
          workingEntries.push(newEntry);
          pulledCount++;
        }
      }
    } catch (err: any) {
      console.error("Failed to pull events from Google:", err);
      return {
        pushedCount,
        pulledCount,
        updatedCount,
        mergedEntries: workingEntries,
        error: `Google 日曆拉取失敗: ${err.message}`
      };
    }
  }

  return {
    pushedCount,
    pulledCount,
    updatedCount,
    mergedEntries: workingEntries
  };
}
