export default {
  async fetch(request, env, ctx) {
    // ===== 密碼驗證區塊 =====
    const USERNAME = env.AUTH_USERNAME || "ebb";
    const PASSWORD = env.AUTH_PASSWORD || "ebb2026";

    const authHeader = request.headers.get("Authorization");

    if (!authHeader || !authHeader.startsWith("Basic ")) {
      return new Response("需要登入", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="請輸入帳號密碼"' },
      });
    }

    const base64Credentials = authHeader.split(" ")[1];
    const credentials = atob(base64Credentials);
    const [user, pass] = credentials.split(":");

    if (user !== USERNAME || pass !== PASSWORD) {
      return new Response("帳號或密碼錯誤", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="請輸入帳號密碼"' },
      });
    }
    // ===== 驗證通過，回傳靜態網站內容（index.html, style.css 等）=====
    return env.ASSETS.fetch(request);
  },
};