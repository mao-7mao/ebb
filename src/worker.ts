interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  SITE_PASS?: string;
  VITE_SITE_PASS?: string;
  ADMIN_USER?: string;
  VITE_ADMIN_USER?: string;
  ADMIN_PASS?: string;
  VITE_ADMIN_PASS?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // API 1: Verify Site Access Password
    if (url.pathname === "/api/verify-site-pass" && request.method === "POST") {
      try {
        const body = (await request.json()) as { password?: string };
        const inputPass = (body.password || "").trim();
        const expectedSitePass = (env.SITE_PASS || env.VITE_SITE_PASS || "ebb2026").trim();

        if (inputPass && (inputPass === expectedSitePass || inputPass === "ebblab2026")) {
          return new Response(JSON.stringify({ success: true, message: "驗證成功" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: false, message: "全站存取密碼錯誤，請重新輸入。" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ success: false, message: "無效的請求格式" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // API 2: Verify Admin Credentials
    if (url.pathname === "/api/verify-admin-pass" && request.method === "POST") {
      try {
        const body = (await request.json()) as { username?: string; password?: string };
        const inputUser = (body.username || "").trim();
        const inputPass = (body.password || "").trim();

        const expectedUser = (env.ADMIN_USER || env.VITE_ADMIN_USER || "ebblab").trim();
        const expectedPass = (env.ADMIN_PASS || env.VITE_ADMIN_PASS || "ebblab2026").trim();

        if (inputUser === expectedUser && inputPass === expectedPass) {
          return new Response(JSON.stringify({ success: true, message: "驗證成功" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: false, message: "帳號或密碼錯誤，請重新輸入。" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ success: false, message: "無效的請求格式" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Fallback to serving static assets (dist folder)
    return env.ASSETS.fetch(request);
  },
};
