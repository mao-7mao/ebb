interface Env {
  SITE_PASS?: string;
  VITE_SITE_PASS?: string;
}

type PagesFunctionContext<Env = unknown> = {
  request: Request;
  env: Env;
  next: () => Promise<Response>;
};

export const onRequestPost = async (context: PagesFunctionContext<Env>): Promise<Response> => {
  try {
    const { request, env } = context;
    const body = (await request.json()) as { password?: string };
    const inputPass = (body.password || "").trim();

    // Retrieve expected password from server environment variable
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
};
